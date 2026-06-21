import { gateway, generateImage } from "ai";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { allowedStudioModelIds } from "@/lib/ai/models";
import { ChatbotError } from "@/lib/errors";

const requestSchema = z.object({
  prompt: z.string().min(1).max(2000),
  modelId: z.string(),
  aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).default("1:1"),
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

  if (!allowedStudioModelIds.has(body.modelId)) {
    return new ChatbotError(
      "bad_request:studio",
      "Unknown or unsupported model."
    ).toResponse();
  }

  try {
    const result = await generateImage({
      model: gateway.imageModel(body.modelId),
      prompt: body.prompt,
      aspectRatio: body.aspectRatio as `${number}:${number}`,
    });

    return Response.json({
      imageBase64: result.image.base64,
      mediaType: result.image.mediaType,
      modelId: body.modelId,
    });
  } catch (error) {
    console.error({ surface: "studio:image", error });
    return new ChatbotError(
      "bad_request:studio",
      "Image generation failed. The model or provider may be unavailable."
    ).toResponse();
  }
}

