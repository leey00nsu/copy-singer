from __future__ import annotations

import gc
import random
import sys
import threading
from pathlib import Path
from types import SimpleNamespace

import librosa
import numpy as np
import soundfile as sf
import torch

from api.config import Settings


class SoulXEngine:
    """A single-process, single-GPU SoulX-Singer SVC runtime."""

    sample_rate = 44_100

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.root = settings.soulx_root
        if not (self.root / "soulxsinger").is_dir():
            raise RuntimeError(
                f"SoulX-Singer source was not found at {self.root}. "
                "Build the deployment image before starting the engine."
            )
        if not torch.cuda.is_available():
            raise RuntimeError("A CUDA GPU is required for this deployment")

        root_string = str(self.root)
        if root_string not in sys.path:
            sys.path.insert(0, root_string)

        # SoulX uses relative model paths internally.
        import os

        os.chdir(self.root)
        from cli.inference_svc import build_model, process
        from preprocess.tools.f0_extraction import F0Extractor
        from preprocess.tools.vocal_separation.model import VocalSeparator
        from soulxsinger.utils.file_utils import load_config

        self._process = process
        self._separator_class = VocalSeparator
        self._separator = None
        self._separator_lock = threading.Lock()
        self.device = "cuda:0"
        self.use_fp16 = settings.fp16
        self.config = load_config("soulxsinger/config/soulxsinger.yaml")
        self.f0_extractor = F0Extractor(
            model_path="pretrained_models/SoulX-Singer-Preprocess/rmvpe/rmvpe.pt",
            device=self.device,
        )
        self.model = build_model(
            model_path="pretrained_models/SoulX-Singer/model-svc.pt",
            config=self.config,
            device=self.device,
            use_fp16=self.use_fp16,
        )

    def _get_separator(self):
        if self._separator is None:
            with self._separator_lock:
                if self._separator is None:
                    self._separator = self._separator_class(
                        sep_model_path="pretrained_models/SoulX-Singer-Preprocess/mel-band-roformer-karaoke/mel_band_roformer_karaoke_becruily.ckpt",
                        sep_config_path="pretrained_models/SoulX-Singer-Preprocess/mel-band-roformer-karaoke/config_karaoke_becruily.yaml",
                        der_model_path="pretrained_models/SoulX-Singer-Preprocess/dereverb_mel_band_roformer/dereverb_mel_band_roformer_anvuew_sdr_19.1729.ckpt",
                        der_config_path="pretrained_models/SoulX-Singer-Preprocess/dereverb_mel_band_roformer/dereverb_mel_band_roformer_anvuew.yaml",
                        device=self.device,
                    )
        return self._separator

    def _normalize(self, source: Path, destination: Path, max_seconds: int) -> None:
        audio, _ = librosa.load(source, sr=self.sample_rate, mono=True)
        if audio.size == 0:
            raise ValueError(f"Audio is empty: {source.name}")
        audio = audio[: max_seconds * self.sample_rate]
        destination.parent.mkdir(parents=True, exist_ok=True)
        sf.write(destination, audio, self.sample_rate)

    def _preprocess(self, source: Path, output_dir: Path, separate: bool) -> tuple[Path, Path, Path | None]:
        output_dir.mkdir(parents=True, exist_ok=True)
        vocal_path = output_dir / "vocal.wav"
        accompaniment_path: Path | None = None
        if separate:
            separated = self._get_separator().process(str(source))
            sf.write(vocal_path, separated.vocals_dereverbed.T, separated.sample_rate)
            accompaniment_path = output_dir / "acc.wav"
            sf.write(accompaniment_path, separated.accompaniment.T, separated.sample_rate)
        else:
            audio, sample_rate = librosa.load(source, sr=None, mono=True)
            sf.write(vocal_path, audio, sample_rate)

        f0_path = output_dir / "vocal_f0.npy"
        self.f0_extractor.process(str(vocal_path), f0_path=str(f0_path))
        return vocal_path, f0_path, accompaniment_path

    def convert(
        self,
        *,
        prompt_input: Path,
        target_input: Path,
        work_dir: Path,
        prompt_vocal_separation: bool,
        target_vocal_separation: bool,
        auto_pitch_shift: bool,
        auto_mix_accompaniment: bool,
        pitch_shift: int,
        steps: int,
        cfg: float,
        seed: int,
    ) -> Path:
        prompt_wav = work_dir / "normalized" / "prompt.wav"
        target_wav = work_dir / "normalized" / "target.wav"
        self._normalize(prompt_input, prompt_wav, self.settings.prompt_max_seconds)
        self._normalize(target_input, target_wav, self.settings.target_max_seconds)

        prompt_vocal, prompt_f0, _ = self._preprocess(
            prompt_wav, work_dir / "preprocessed" / "prompt", prompt_vocal_separation
        )
        target_vocal, target_f0, accompaniment = self._preprocess(
            target_wav, work_dir / "preprocessed" / "target", target_vocal_separation
        )

        random.seed(seed)
        np.random.seed(seed)
        torch.manual_seed(seed)
        generated_dir = work_dir / "generated"
        args = SimpleNamespace(
            device=self.device,
            prompt_wav_path=str(prompt_vocal),
            target_wav_path=str(target_vocal),
            prompt_f0_path=str(prompt_f0),
            target_f0_path=str(target_f0),
            save_dir=str(generated_dir),
            auto_shift=auto_pitch_shift,
            pitch_shift=pitch_shift,
            n_steps=steps,
            cfg=cfg,
            use_fp16=self.use_fp16,
        )
        self._process(args, self.config, self.model)
        generated = generated_dir / "generated.wav"
        if not generated.exists():
            raise RuntimeError("SoulX-Singer finished without producing generated.wav")

        if auto_mix_accompaniment and accompaniment is not None:
            vocal, _ = librosa.load(generated, sr=self.config.audio.sample_rate, mono=True)
            acc, _ = librosa.load(accompaniment, sr=self.config.audio.sample_rate, mono=True)
            acc_shift = int(args.pitch_shift) % 12
            if acc_shift > 6:
                acc_shift -= 12
            if acc_shift:
                acc = librosa.effects.pitch_shift(
                    acc, sr=self.config.audio.sample_rate, n_steps=acc_shift
                )
            length = min(len(vocal), len(acc))
            mixed = vocal[:length] + acc[:length]
            peak = float(np.max(np.abs(mixed))) if mixed.size else 1.0
            if peak > 1.0:
                mixed /= peak
            generated = generated_dir / "generated_mixed.wav"
            sf.write(generated, mixed, self.config.audio.sample_rate)

        gc.collect()
        torch.cuda.empty_cache()
        return generated
