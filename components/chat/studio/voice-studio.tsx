"use client";

import { MicIcon, SparklesIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { StudioHeader } from "./studio-header";

const VOICES = [
  "Vivian",
  "Serena",
  "Uncle_Fu",
  "Dylan",
  "Eric",
  "Ryan",
  "Aiden",
  "Ono_Anna",
  "Sohee",
] as const;

type GeneratedSpeech = {
  audioBase64: string;
  mediaType: string;
  voice: string;
};

export function VoiceStudio() {
  const [text, setText] = useState("");
  const [voice, setVoice] = useState<(typeof VOICES)[number]>("Vivian");
  const [instructions, setInstructions] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedSpeech | null>(null);

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error("Write some text first");
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      const response = await fetch("/api/studio/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice,
          instructions: instructions.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message ?? "Speech generation failed");
        return;
      }

      if (data.unexpectedJson) {
        toast.error(data.note ?? "Unexpected response from the provider");
        return;
      }

      setResult(data);
    } catch {
      toast.error("Speech generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 md:p-8">
      <StudioHeader icon={<MicIcon className="size-4" />} title="Voice Studio" />

      <div className="flex flex-col gap-4">
        <Textarea
          className="min-h-28 resize-none"
          maxLength={4000}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type the text you want narrated…"
          value={text}
        />

        <Input
          onChange={(e) => setInstructions(e.target.value)}
          placeholder='Optional: speaking style, e.g. "speak slowly and calmly"'
          value={instructions}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Select
            onValueChange={(v) => setVoice(v as (typeof VOICES)[number])}
            value={voice}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Voice" />
            </SelectTrigger>
            <SelectContent>
              {VOICES.map((v) => (
                <SelectItem key={v} value={v}>
                  {v.replace("_", " ")}
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
        <p className="text-muted-foreground text-xs">
          Powered by Qwen3-TTS on DeepInfra — not Cosmos3, which doesn't have
          a standalone narration mode.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center rounded-xl border border-border/50 bg-muted/30 p-4">
        {isGenerating && (
          <div className="flex flex-col items-center gap-2 text-muted-foreground text-sm">
            <Spinner className="size-5" />
            Generating with {voice}…
          </div>
        )}

        {!isGenerating && result && (
          // biome-ignore lint/a11y/useMediaCaption: generated narration has no separate transcript track
          <audio
            className="w-full"
            controls
            src={`data:${result.mediaType};base64,${result.audioBase64}`}
          />
        )}

        {!(isGenerating || result) && (
          <div className="text-center text-muted-foreground text-sm">
            Your generated audio will appear here
          </div>
        )}
      </div>
    </div>
  );
}
