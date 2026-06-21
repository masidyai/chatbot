"use client";

import { SparklesIcon, VideoIcon, Volume2Icon, VolumeXIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { getStudioModelsByKind } from "@/lib/ai/models";
import { StudioHeader } from "./studio-header";

const ASPECT_RATIOS = ["16:9", "9:16", "1:1"] as const;
const DURATIONS = [3, 5, 8] as const;
const models = getStudioModelsByKind("image"); // Cosmos3 variants serve image + video

type GeneratedVideo = {
  videoBase64: string;
  mediaType: string;
  modelId: string;
  withSound: boolean;
};

export function VideoStudio() {
  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState(models[0]?.id ?? "");
  const [aspectRatio, setAspectRatio] =
    useState<(typeof ASPECT_RATIOS)[number]>("16:9");
  const [durationSeconds, setDurationSeconds] =
    useState<(typeof DURATIONS)[number]>(5);
  const [withSound, setWithSound] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedVideo | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Write a prompt first");
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      const response = await fetch("/api/studio/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          modelId,
          aspectRatio,
          durationSeconds,
          withSound,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message ?? "Video generation failed");
        return;
      }

      setResult(data);
    } catch {
      toast.error("Video generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 md:p-8">
      <StudioHeader
        icon={<VideoIcon className="size-4" />}
        title="Video Studio"
      />

      <div className="flex flex-col gap-4">
        <Textarea
          className="min-h-28 resize-none"
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the video you want to generate — narrative paragraphs work best…"
          value={prompt}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Select onValueChange={setModelId} value={modelId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            onValueChange={(v) =>
              setAspectRatio(v as (typeof ASPECT_RATIOS)[number])
            }
            value={aspectRatio}
          >
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Aspect ratio" />
            </SelectTrigger>
            <SelectContent>
              {ASPECT_RATIOS.map((ratio) => (
                <SelectItem key={ratio} value={ratio}>
                  {ratio}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            onValueChange={(v) =>
              setDurationSeconds(Number(v) as (typeof DURATIONS)[number])
            }
            value={String(durationSeconds)}
          >
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Duration" />
            </SelectTrigger>
            <SelectContent>
              {DURATIONS.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d}s
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => setWithSound((v) => !v)}
            size="icon"
            title={withSound ? "Sound on" : "Sound off"}
            type="button"
            variant={withSound ? "secondary" : "outline"}
          >
            {withSound ? (
              <Volume2Icon className="size-4" />
            ) : (
              <VolumeXIcon className="size-4" />
            )}
          </Button>

          <Button
            className="ml-auto"
            disabled={isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating ? (
              <Spinner className="size-4" />
            ) : (
              <SparklesIcon className="size-4" />
            )}
            Generate
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Sound generates a soundtrack baked into the clip — Cosmos3 doesn't
          do separate narration. For voiceover, use Voice Studio.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center rounded-xl border border-border/50 bg-muted/30 p-4">
        {isGenerating && (
          <div className="flex flex-col items-center gap-2 text-muted-foreground text-sm">
            <Spinner className="size-5" />
            Generating with {models.find((m) => m.id === modelId)?.name}…
            This can take a while.
          </div>
        )}

        {!isGenerating && result && (
          // biome-ignore lint/a11y/useMediaCaption: generated content has no caption track yet
          <video
            className="max-h-[60vh] rounded-lg"
            controls
            src={`data:${result.mediaType};base64,${result.videoBase64}`}
          >
            <track kind="captions" />
          </video>
        )}

        {!(isGenerating || result) && (
          <div className="text-center text-muted-foreground text-sm">
            Your generated video will appear here
          </div>
        )}
      </div>
    </div>
  );
}
