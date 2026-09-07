import { NextResponse } from "next/server";
import {
  chatWithAssistant,
  canAnswerLocally,
  kbContextForRag,
} from "@/lib/chat";

const OPENAI_MODEL = process.env.CHAT_OPENAI_MODEL ?? "gpt-4.1-mini";

// Best-effort in-memory rate limit (per warm instance). Protects spend from
// casual abuse; the hybrid router still answers locally even when limited.
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT = 20;
const hits = new Map<string, number[]>();

function hitLimit(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > RATE_LIMIT;
}

interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = String(body?.message ?? "").trim().slice(0, 1000);
    const history: ChatHistoryItem[] = Array.isArray(body?.history)
      ? body.history.slice(-4).filter(
          (h: ChatHistoryItem) =>
            (h.role === "user" || h.role === "assistant") &&
            typeof h.content === "string",
        )
      : [];

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const local = chatWithAssistant(message);

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const useOpenAI =
      !!process.env.OPENAI_API_KEY &&
      !hitLimit(ip) &&
      !canAnswerLocally(message);

    // Only spend on an LLM call for novel questions the free engine can't
    // answer confidently.
    if (useOpenAI) {
      const context = kbContextForRag(message);
      const system = [
        "You are the Biz Reborn Marketing growth assistant — an active AI marketing consultant for local businesses.",
        "Answer marketing questions directly from your own expertise: local SEO, Google Business Profile, short-form video, websites & funnels, reviews, SMS retention, paid ads, social branding, content, pricing, and strategy.",
        "The knowledge base below is the source of truth for Biz Reborn's specific services, modules, pillars, and prices. Ground Biz Reborn-specific claims in it and never invent Biz Reborn facts or prices. If a Biz Reborn detail isn't in the KB, say you don't have that detail rather than guessing.",
        "Be concise and persuasive. Use short bullet lines when it helps.",
        "Only add a one-line next-step call to action (free audit, service builder, pricing, contact) when it genuinely fits the user's question — never force a redirect.",
        "",
        "KNOWLEDGE BASE:",
        context,
      ].join("\n");

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            { role: "system", content: system },
            ...history,
            { role: "user", content: message },
          ],
          temperature: 0.6,
          max_tokens: 400,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content?.trim();
        if (text) {
          return NextResponse.json({
            reply: text,
            suggestions: local.suggestions,
            mode: "live",
          });
        }
      }
    }

    return NextResponse.json({
      reply: local.text,
      suggestions: local.suggestions,
      mode: "demo",
    });
  } catch {
    return NextResponse.json({ error: "Chat failed." }, { status: 500 });
  }
}
