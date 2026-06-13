import "server-only";
import { SchemaType } from "@google/generative-ai";
import { z } from "zod";
import {
  generateImageViaFlow,
  type ImageGenProgress,
} from "@/lib/image-generator";
import type { ToolDefinition } from "./types";

const ImageArgsSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(3, "Prompt gambar terlalu pendek")
    .max(1000, "Prompt gambar terlalu panjang"),
});

/**
 * `generate_image` — text-to-image via the existing Google Flow automation.
 * The model calls this whenever the user wants an image; the route runs it,
 * streams progress, and appends the resulting image markdown to the reply.
 */
export const imageTool: ToolDefinition = {
  name: "generate_image",
  description:
    "Generate an image from a text prompt (text-to-image) via Google Flow.",
  settingKey: "imageToolEnabled",
  sensitive: false,
  schema: ImageArgsSchema,
  declaration: {
    name: "generate_image",
    description:
      "Generate an image from a text description (text-to-image). Call this WHENEVER the user asks to create, draw, make, design, or generate any image, illustration, picture, photo, artwork, or logo. Provide a detailed visual description in English.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        prompt: {
          type: SchemaType.STRING,
          description:
            "Detailed visual description of the image to generate, written in English. Include subject, style, colors, composition and mood.",
        },
      },
      required: ["prompt"],
    },
  },
  async execute(rawArgs, ctx) {
    const args = ImageArgsSchema.parse(rawArgs);

    const { imagePath, fileName } = await generateImageViaFlow(
      args.prompt,
      (p: ImageGenProgress) => {
        ctx.emit?.("progress", { stage: p.stage, message: p.message });
      }
    );

    const artifactMarkdown = `![Generated Image](${imagePath})\n\n*Gambar digenerate berdasarkan prompt: "${args.prompt}"*`;

    return {
      response: {
        success: true,
        imagePath,
        fileName,
        note: "The image was generated and is ALREADY shown to the user. Just briefly confirm in your reply. Do NOT output the image markdown or the file path yourself.",
      },
      artifactMarkdown,
    };
  },
};
