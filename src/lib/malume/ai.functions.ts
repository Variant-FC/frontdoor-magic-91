/**
 * Malume's voice, served from the model.
 *
 * Runs on the server so the API key never reaches the browser. If a Django
 * deployment is configured (DJANGO_API_URL) the request is proxied there so
 * both halves of the system speak with the same voice; otherwise we call the
 * Hugging Face router directly.
 *
 * The model only ever writes prose — every figure in `facts` was already
 * computed in code, and nothing numeric is parsed back out of the reply.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  facts: z.string().min(1).max(4000),
  fallback: z.string().default(""),
});

const SYSTEM =
  "You are Malume, a warm, plain-spoken South African uncle who explains small-business " +
  "money to the owner. Two or three short sentences, second person, practical, never " +
  "condescending. A little local flavour ('eish', 'my friend', 'né') is fine but do not " +
  "overdo it. Never invent, restate incorrectly, or calculate any figure: use only the " +
  "numbers given to you, exactly as given. No markdown, no lists, no headings.";

export type MalumeTake = { malume_take: string; source: "django" | "huggingface" | "local" };

export const getMalumeTake = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<MalumeTake> => {
    const djangoUrl = process.env["DJANGO_API_URL"];
    const djangoToken = process.env["DJANGO_API_TOKEN"];

    if (djangoUrl) {
      try {
        const res = await fetch(`${djangoUrl.replace(/\/+$/, "")}/api/v1/insights/malume-take/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(djangoToken ? { Authorization: `Token ${djangoToken}` } : {}),
          },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const body = (await res.json()) as { malume_take?: string };
          if (body.malume_take) return { malume_take: body.malume_take, source: "django" };
        }
      } catch {
        /* fall through to the direct model call */
      }
    }

    const key = process.env["HUGGINGFACE_API_KEY"];
    if (!key) return { malume_take: data.fallback, source: "local" };

    try {
      const res = await fetch("https://router.huggingface.co/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: process.env["HUGGINGFACE_MODEL"] ?? "meta-llama/Llama-3.1-8B-Instruct",
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: data.facts },
          ],
          max_tokens: 180,
          temperature: 0.7,
        }),
      });
      if (!res.ok) return { malume_take: data.fallback, source: "local" };
      const body = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = body.choices?.[0]?.message?.content?.trim();
      return text
        ? { malume_take: text, source: "huggingface" }
        : { malume_take: data.fallback, source: "local" };
    } catch {
      return { malume_take: data.fallback, source: "local" };
    }
  });
