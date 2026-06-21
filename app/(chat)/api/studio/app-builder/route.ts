import { gateway, generateObject } from "ai";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { allowedStudioChatModelIds } from "@/lib/ai/models";
import { ChatbotError } from "@/lib/errors";

const APP_BUILDER_MODEL = "google/gemma-4-31b-it";

const requestSchema = z.object({
  prompt: z.string().min(1).max(4000),
});

const fileSchema = z.object({
  path: z.string(),
  language: z.string(),
  content: z.string(),
});

const planSchema = z.object({
  appName: z.string(),
  summary: z.string(),
  stack: z.array(z.string()),
  files: z.array(fileSchema).max(12),
  nextSteps: z.array(z.string()).max(6),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:studio").toResponse();
  }

  let body: z.infer<typeof requestSchema>;

  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return new ChatbotError(
      "bad_request:studio",
      "Invalid request body."
    ).toResponse();
  }

  if (!allowedStudioChatModelIds.has(APP_BUILDER_MODEL)) {
    return new ChatbotError(
      "bad_request:studio",
      "App Builder model is not configured."
    ).toResponse();
  }

  try {
    const result = await generateObject({
      model: gateway.languageModel(APP_BUILDER_MODEL),
      schema: planSchema,
      system:
        "You are an app-scaffolding assistant. Given a short description, " +
        "produce a minimal, runnable starting point: a short app name, a " +
        "one-paragraph summary, the tech stack as a list, up to 12 small " +
        "starter files with real working code (favor a single-file React " +
        "or Next.js component unless the request clearly needs more), and " +
        "up to 6 concrete next steps the user should take after scaffolding.",
      prompt: body.prompt,
    });

    return Response.json({ plan: result.object, modelId: APP_BUILDER_MODEL });
  } catch (error) {
    console.error({ surface: "studio:app-builder", error });
    return new ChatbotError(
      "bad_request:studio",
      "App Builder generation failed. The model or provider may be unavailable."
    ).toResponse();
  }
}
