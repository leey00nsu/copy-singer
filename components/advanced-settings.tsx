"use client";

import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

export type ConversionSettings = {
  promptVocalSeparation: boolean;
  targetVocalSeparation: boolean;
  autoPitchShift: boolean;
  autoMixAccompaniment: boolean;
  pitchShift: number;
  steps: number;
  cfg: number;
  seed: number;
};

export const DEFAULT_SETTINGS: ConversionSettings = {
  promptVocalSeparation: false,
  targetVocalSeparation: true,
  autoPitchShift: true,
  autoMixAccompaniment: true,
  pitchShift: 0,
  steps: 32,
  cfg: 1,
  seed: 42,
};

function SettingSwitch({
  checked,
  description,
  disabled,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <div className="setting-switch">
      <div className="pr-4">
        <Label className="text-sm font-medium" htmlFor={id}>{label}</Label>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} disabled={disabled} id={id} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function SettingSlider({
  disabled,
  label,
  max,
  min,
  onValueChange,
  step,
  value,
}: {
  disabled?: boolean;
  label: string;
  max: number;
  min: number;
  onValueChange: (value: number) => void;
  step: number;
  value: number;
}) {
  return (
    <div className="setting-slider">
      <div className="mb-3 flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <span className="setting-value">{value}</span>
      </div>
      <Slider
        disabled={disabled}
        max={max}
        min={min}
        onValueChange={(next) => onValueChange(typeof next === "number" ? next : next[0])}
        step={step}
        value={[value]}
      />
      <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

export function AdvancedSettings({
  disabled,
  settings,
  onChange,
}: {
  disabled?: boolean;
  settings: ConversionSettings;
  onChange: (settings: ConversionSettings) => void;
}) {
  const update = <Key extends keyof ConversionSettings>(key: Key, value: ConversionSettings[Key]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <Collapsible className="settings-shell" defaultOpen>
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <CollapsibleTrigger className="group flex flex-1 items-center gap-3 text-left">
          <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <SlidersHorizontal className="size-4" />
          </span>
          <span>
            <span className="block text-sm font-semibold">Advanced settings</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">Tune source preparation and generation</span>
          </span>
          <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180" />
        </CollapsibleTrigger>
        <Button
          disabled={disabled}
          onClick={() => onChange(DEFAULT_SETTINGS)}
          size="sm"
          variant="ghost"
        >
          <RotateCcw className="size-3.5" /> Reset
        </Button>
      </div>
      <CollapsibleContent className="border-t border-border/70">
        <div className="grid gap-px bg-border/60 md:grid-cols-2">
          <SettingSwitch
            checked={settings.promptVocalSeparation}
            description="Enable if the reference includes instruments."
            disabled={disabled}
            label="Reference vocal separation"
            onCheckedChange={(value) => update("promptVocalSeparation", value)}
          />
          <SettingSwitch
            checked={settings.targetVocalSeparation}
            description="Separate vocals before converting a full song."
            disabled={disabled}
            label="Target vocal separation"
            onCheckedChange={(value) => update("targetVocalSeparation", value)}
          />
          <SettingSwitch
            checked={settings.autoPitchShift}
            description="Match the target range to the reference voice."
            disabled={disabled}
            label="Automatic pitch shift"
            onCheckedChange={(value) => update("autoPitchShift", value)}
          />
          <SettingSwitch
            checked={settings.autoMixAccompaniment}
            description="Mix the separated instrumental into the result."
            disabled={disabled}
            label="Mix accompaniment"
            onCheckedChange={(value) => update("autoMixAccompaniment", value)}
          />
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <SettingSlider disabled={disabled} label="Pitch shift · semitones" max={36} min={-36} onValueChange={(value) => update("pitchShift", value)} step={1} value={settings.pitchShift} />
          <SettingSlider disabled={disabled} label="Diffusion steps" max={100} min={1} onValueChange={(value) => update("steps", value)} step={1} value={settings.steps} />
          <SettingSlider disabled={disabled} label="CFG scale" max={10} min={0} onValueChange={(value) => update("cfg", value)} step={0.1} value={settings.cfg} />
          <SettingSlider disabled={disabled} label="Seed" max={10000} min={0} onValueChange={(value) => update("seed", value)} step={1} value={settings.seed} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
