"use client";

import { ImageIcon, SparklesIcon } from "lucide-react";
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

const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"] as const;
const models = getStudioModelsByKind("image");

type GeneratedImage = {
  imageBase64: string;
  mediaType: string;
  modelId: string;
};

export function ImageStudio() {
  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState(models[0]?.id ?? "");
  const [aspectRatio, setAspectRatio] =
    useState<(typeof ASPECT_RATIOS)[number]>("1:1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedImage | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Write a prompt first");
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      const response = await fetch("/api/studio/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, modelId, aspectRatio }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message ?? "Image generation failed");
        return;
      }

      setResult(data);
    } catch {
      toast.error("Image generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 md:p-8">
      <StudioHeader
        icon={<ImageIcon className="size-4" />}
        title="Image Studio"
      />

      <div className="flex flex-col gap-4">
        <Textarea
          className="min-h-28 resize-none"
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the image you want to generate…"
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
            <SelectTrigger className="w-32">
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
      </div>

      <div className="flex flex-1 items-center justify-center rounded-xl border border-border/50 bg-muted/30 p-4">
        {isGenerating && (
          <div className="flex flex-col items-center gap-2 text-muted-foreground text-sm">
            <Spinner className="size-5" />
            Generating with {models.find((m) => m.id === modelId)?.name}…
          </div>
        )}

        {!isGenerating && result && (
          <img
            alt={prompt}
            className="max-h-[60vh] rounded-lg object-contain"
            src={`data:${result.mediaType};base64,${result.imageBase64}`}
          />
        )}

        {!(isGenerating || result) && (
          <div className="text-center text-muted-foreground text-sm">
            Your generated image will appear here
          </div>
        )}
      </div>
    </div>
  );
}
