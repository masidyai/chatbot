import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { ChatbotError } from "@/lib/errors";

// AI Gateway has no speechModel() routing yet, and @ai-sdk/deepinfra
// doesn't expose a speech model either — so this route calls DeepInfra's
// REST API directly, the same way the rest of this app would call any
// provider the Gateway hasn't wrapped yet.
const DEEPINFRA_TTS_URL = "https://api.deepinfra.com/v1/inference/Qwen/Qwen3-TTS";

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

const requestSchema = z.object({
  text: z.string().min(1).max(4000),
  voice: z.enum(VOICES).default("Vivian"),
  instructions: z.string().max(300).optional(),
  outputFormat: z.enum(["wav", "mp3", "flac", "pcm"]).default("mp3"),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:studio").toResponse();
  }

  if (!process.env.DEEPINFRA_API_KEY) {
    return new ChatbotError(
      "bad_request:studio",
      "Voice Studio isn't configured yet. Add DEEPINFRA_API_KEY to your environment."
    ).toResponse();
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

  try {
    const response = await fetch(DEEPINFRA_TTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DEEPINFRA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: body.text,
        voice_id: body.voice,
        instructions: body.instructions,
        output_format: body.outputFormat,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error({
        surface: "studio:voice",
        status: response.status,
        errorText,
      });
      return new ChatbotError(
        "bad_request:studio",
        "Speech generation failed. The model or provider may be unavailable."
      ).toResponse();
    }

    const contentType = response.headers.get("content-type") ?? "";

    // Qwen3-TTS returns raw audio bytes on success. If DeepInfra ever
    // returns JSON instead (e.g. an async job reference), surface that
    // distinctly rather than silently treating it as audio.
    if (contentType.includes("application/json")) {
      const json = await response.json();
      return Response.json({
        unexpectedJson: json,
        note: "DeepInfra returned JSON instead of audio bytes — the response shape may have changed.",
      });
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");
    const mediaType = contentType || `audio/${body.outputFormat}`;

    return Response.json({
      audioBase64,
      mediaType,
      voice: body.voice,
    });
  } catch (error) {
    console.error({ surface: "studio:voice", error });
    return new ChatbotError(
      "bad_request:studio",
      "Speech generation failed. The model or provider may be unavailable."
    ).toResponse();
  }
}
