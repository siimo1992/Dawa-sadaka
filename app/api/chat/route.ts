// app/api/chat/route.ts
import OpenAI from "openai";
import { routeQuestion } from "@/lib/smart-routing.ts";

export const runtime = "nodejs";
export const maxDuration = 45;

const ai = new OpenAI({
  apiKey: process.env.AI_API_KEY || process.env.OPENAI_API_KEY || "dummy-key-for-init", // على الخادم فقط، وليس NEXT_PUBLIC_*
  baseURL: process.env.AI_BASE_URL || undefined,
  timeout: 20_000,
  maxRetries: 0, // تجنب إعادة المحاولة المخفية التي تضيف تأخيرًا
});

export async function POST(req: Request) {
  const startedAt = Date.now();

  try {
    const body = await req.json();
    const messages = body?.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "رسالة غير صالحة" }, { status: 400 });
    }

    const latest = messages.at(-1);
    if (
      latest?.role !== "user" ||
      typeof latest?.content !== "string" ||
      latest.content.length > 4_000
    ) {
      return Response.json({ error: "تحقق من نص السؤال" }, { status: 400 });
    }

    const route = routeQuestion(latest.content);
    const model = process.env.AI_MODEL || "gpt-4o-mini";

    const stream = await ai.chat.completions.create(
      {
        model,
        messages,
        stream: true,
        max_tokens: 450,
      },
      { signal: req.signal }
    );

    const encoder = new TextEncoder();
    let firstTokenAt: number | null = null;

    const output = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          // إذا كان السؤال يحتاج بحثًا، اجعل الخادم يرسل حدث "searching"
          // عند بداية البحث الحقيقي، لا لمجرد أن الطلب بدأ.
          if (route.mode === "web" || route.mode === "local") {
            controller.enqueue(
              encoder.encode(
                `event: status\ndata: ${JSON.stringify({ status: "searching", reason: route.reason })}\n\n`
              )
            );
          }

          const stream = await ai.chat.completions.create(
            {
              model,
              messages,
              stream: true,
              max_tokens: 450,
            },
            { signal: req.signal }
          );

          controller.enqueue(
            encoder.encode(
              `event: status\ndata: ${JSON.stringify({ status: "writing" })}\n\n`
            )
          );

          for await (const part of stream) {
            const text = part.choices[0]?.delta?.content;
            if (!text) continue;

            firstTokenAt ??= Date.now();

            // أرسل كل جزء فور وصوله ليظهر الرد تدريجيًا في الواجهة
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
            );
          }

          controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"));
          controller.close();

          // سجّل الأزمنة فقط؛ لا تضع نص السؤال أو بيانات المستخدم في السجل
          console.info({
            event: "ai_latency",
            route: route.mode,
            ttftMs: firstTokenAt ? firstTokenAt - startedAt : null,
            totalMs: Date.now() - startedAt,
          });
        } catch {
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({
                message: "تعذر إكمال الرد. حاول مرة أخرى.",
              })}\n\n`
            )
          );
          controller.close();

          console.error({
            event: "ai_stream_error",
            totalMs: Date.now() - startedAt,
          });
        }
      },
    });

    return new Response(output, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return Response.json(
      { error: "خدمة الذكاء الاصطناعي غير متاحة مؤقتًا" },
      { status: 503 }
    );
  }
}
