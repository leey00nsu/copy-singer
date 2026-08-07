"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { FileAudio, Music2, RotateCcw, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioWaveformPlayer } from "@/components/audio/audio-waveform-player";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const MAX_AUDIO_UPLOAD_BYTES = {
  reference: 128 * 1024 * 1024,
  target: 256 * 1024 * 1024,
} as const;

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AudioDropzone({
  kind,
  file,
  onFile,
  disabled,
}: {
  kind: "reference" | "target";
  file: File | null;
  onFile: (file: File | null) => void;
  disabled?: boolean;
}) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const audioUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const acceptFile = useCallback(
    (candidate?: File) => {
      if (!candidate) return;
      if (!(candidate.type.startsWith("audio/") || candidate.name.match(/\.(wav|mp3|flac|m4a|ogg|aac|webm)$/i))) {
        toast.error("Choose a supported audio file.");
        return;
      }
      if (candidate.size > MAX_AUDIO_UPLOAD_BYTES[kind]) {
        toast.error(`${kind === "reference" ? "Reference" : "Target"} audio must be ${formatBytes(MAX_AUDIO_UPLOAD_BYTES[kind])} or smaller.`);
        return;
      }
      onFile(candidate);
    },
    [kind, onFile],
  );

  const isReference = kind === "reference";

  return (
    <Card className="audio-card overflow-hidden gap-0 py-0">
      <CardHeader className="border-b border-border/70 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn("audio-card-icon", isReference ? "bg-violet-100 text-violet-700" : "bg-orange-100 text-orange-700")}>
              {isReference ? <FileAudio className="size-4" /> : <Music2 className="size-4" />}
            </div>
            <div>
              <CardTitle className="text-[15px]">
                {isReference ? "Reference voice" : "Target performance"}
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
                {isReference ? "Clean singing voice · up to 30 seconds" : "Vocal or full mix · up to 5 minutes"}
              </CardDescription>
            </div>
          </div>
          {file ? (
            <Button
              aria-label={`Remove ${kind} audio`}
              disabled={disabled}
              onClick={() => onFile(null)}
              size="icon-sm"
              variant="ghost"
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {file && audioUrl ? (
          <div className="px-5 py-5">
            <AudioWaveformPlayer label={isReference ? "Reference voice" : "Target performance"} src={audioUrl} />
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  aria-label={`Replace ${kind} audio`}
                  disabled={disabled}
                  onClick={() => document.getElementById(inputId)?.click()}
                  size="icon-sm"
                  variant="outline"
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <label
            className={cn("dropzone", dragging && "dropzone-active", disabled && "pointer-events-none opacity-60")}
            htmlFor={inputId}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragging(false);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              acceptFile(event.dataTransfer.files[0]);
            }}
          >
            <span className="dropzone-icon"><UploadCloud className="size-5" /></span>
            <span className="text-sm font-medium">Drop audio here or browse</span>
            <span className="text-xs text-muted-foreground">
              WAV, MP3, FLAC, M4A · max {isReference ? "128 MB" : "256 MB"}
            </span>
          </label>
        )}
        <input
          accept="audio/*,.wav,.mp3,.flac,.m4a,.ogg,.aac,.webm"
          className="sr-only"
          disabled={disabled}
          id={inputId}
          onChange={(event) => acceptFile(event.target.files?.[0])}
          type="file"
        />
      </CardContent>
    </Card>
  );
}
