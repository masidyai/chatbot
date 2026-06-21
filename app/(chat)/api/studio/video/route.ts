import { gateway, experimental_generateVideo as generateVideo } from "ai";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { allowedStudioModelIds } from "@/lib/ai/models";
import { ChatbotError } from "@/lib/errors";

const requestSchema = z.object({
  prompt: z.string().min(1).max(2000),
  modelId: z.string(),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
  durationSeconds: z.number().int().min(1).max(8).default(5),
  withSound: z.boolean().default(false),
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
    const result = await generateVideo({
      model: gateway.videoModel(body.modelId),
      prompt: body.prompt,
      aspectRatio: body.aspectRatio as `${number}:${number}`,
      duration: body.durationSeconds,
      providerOptions: {
        deepinfra: {
          output_type: "video",
          duration_seconds: body.durationSeconds,
          // Cosmos3's video-with-sound mode bakes a soundtrack into the
          // clip itself — there is no separate narration/TTS output here.
          generate_audio: body.withSound,
        },
      },
    });

    return Response.json({
      videoBase64: result.video.base64,
      mediaType: result.video.mediaType,
      modelId: body.modelId,
      withSound: body.withSound,
    });
  } catch (error) {
    console.error({ surface: "studio:video", error });
    return new ChatbotError(
      "bad_request:studio",
      "Video generation failed. The model or provider may be unavailable."
    ).toResponse();
  }
}
