"use client";

import { FolderCodeIcon, SparklesIcon } from "lucide-react";
import type { BundledLanguage } from "shiki";
import { useState } from "react";
import { toast } from "sonner";
import {
  CodeBlock,
  CodeBlockCopyButton,
  CodeBlockHeader,
} from "@/components/ai-elements/code-block";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { StudioHeader } from "./studio-header";

type StudioFile = {
  path: string;
  language: string;
  content: string;
};

type AppPlan = {
  appName: string;
  summary: string;
  stack: string[];
  files: StudioFile[];
  nextSteps: string[];
};

// CodeBlock requires a Shiki-supported language; fall back to plaintext
// for anything the model returns that Shiki doesn't recognize.
const SUPPORTED_LANGUAGES = new Set([
  "javascript",
  "typescript",
  "jsx",
  "tsx",
  "json",
  "css",
  "html",
  "markdown",
  "bash",
  "python",
  "yaml",
]);

function toShikiLanguage(language: string): BundledLanguage {
  const normalized = language.toLowerCase().trim();
  return (
    SUPPORTED_LANGUAGES.has(normalized) ? normalized : "plaintext"
  ) as BundledLanguage;
}

export function AppBuilderStudio() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState<AppPlan | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Describe the app you want to build");
      return;
    }

    setIsGenerating(true);
    setPlan(null);

    try {
      const response = await fetch("/api/studio/app-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message ?? "App Builder failed");
        return;
      }

      setPlan(data.plan);
    } catch {
      toast.error("App Builder failed");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 md:p-8">
      <StudioHeader
        icon={<FolderCodeIcon className="size-4" />}
        title="App Builder"
      />

      <div className="flex flex-col gap-4">
        <Textarea
          className="min-h-28 resize-none"
          onChange={(e) => setPrompt(e.target.value)}
          placeholder='Describe the app you want to scaffold, e.g. "a habit tracker with a streak counter"…'
          value={prompt}
        />

        <Button
          className="self-end"
          disabled={isGenerating}
          onClick={handleGenerate}
        >
          {isGenerating ? (
            <Spinner className="size-4" />
          ) : (
            <SparklesIcon className="size-4" />
          )}
          Scaffold app
        </Button>
      </div>

      {isGenerating && (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-border/50 bg-muted/30 p-4">
          <div className="flex flex-col items-center gap-2 text-muted-foreground text-sm">
            <Spinner className="size-5" />
            Scaffolding your app…
          </div>
        </div>
      )}

      {!isGenerating && plan && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="font-semibold text-lg">{plan.appName}</h2>
            <p className="text-muted-foreground text-sm">{plan.summary}</p>
            <div className="flex flex-wrap gap-1.5">
              {plan.stack.map((tech) => (
                <Badge key={tech} variant="secondary">
                  {tech}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {plan.files.map((file) => (
              <CodeBlock
                code={file.content}
                key={file.path}
                language={toShikiLanguage(file.language)}
              >
                <CodeBlockHeader>
                  <span className="font-mono text-xs">{file.path}</span>
                  <CodeBlockCopyButton />
                </CodeBlockHeader>
              </CodeBlock>
            ))}
          </div>

          {plan.nextSteps.length > 0 && (
            <div className="flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/30 p-4">
              <h3 className="font-medium text-sm">Next steps</h3>
              <ol className="list-inside list-decimal space-y-1 text-muted-foreground text-sm">
                {plan.nextSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {!(isGenerating || plan) && (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-border/50 bg-muted/30 p-4 text-center text-muted-foreground text-sm">
          Your scaffolded app will appear here
        </div>
      )}
    </div>
  );
}
