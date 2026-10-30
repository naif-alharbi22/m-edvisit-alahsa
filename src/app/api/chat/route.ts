import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, parseJson, withErrorHandling } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { CHAT_MODEL, chatSystemPrompt, getOpenAI } from "@/lib/openai";
import { getCurrentUser, requireApiUser } from "@/lib/session";
import { logger } from "@/lib/logger";
import { clearChatHistory, getCatalogContext, getChatHistory, saveChatExchange } from "@/server/services/chat";

export const maxDuration = 60;

const chatRequestSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(40)
    .refine((m) => m[m.length - 1]!.role === "user", "The last message must come from the user"),
});

export const GET = withErrorHandling(async () => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ messages: [] });
  return NextResponse.json({ messages: await getChatHistory(user.id) });
});

export const DELETE = withErrorHandling(async () => {
  const user = await requireApiUser();
  await clearChatHistory(user.id);
  return new NextResponse(null, { status: 204 });
});

export const POST = withErrorHandling(async (req) => {
  const user = await getCurrentUser();
  enforceRateLimit("chat", user?.id ?? clientIp(req));
  const { messages } = await parseJson(req, chatRequestSchema);
  const openai = getOpenAI();

  // Keep the most recent turns to bound prompt size.
  const recent = messages.slice(-20);
  const context = await getCatalogContext();
  const completion = await openai.chat.completions.create(
    {
      model: CHAT_MODEL(),
      messages: [{ role: "system", content: chatSystemPrompt(context) }, ...recent],
      max_tokens: 1000,
      temperature: 0.6,
      stream: true,
    },
    { signal: req.signal }
  );

  const encoder = new TextEncoder();
  const lastUserMessage = recent[recent.length - 1]!.content;
  const stream = new ReadableStream({
    async start(controller) {
      let full = "";
      try {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            full += content;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        if (user && full) {
          await saveChatExchange(user.id, lastUserMessage, full).catch((err) =>
            logger.error("Failed to persist chat exchange", { err })
          );
        }
      } catch (err) {
        logger.error("Chat stream error", { err });
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "stream_failed" })}\n\n`));
        controller.close();
      }
    },
    cancel() {
      completion.controller.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
