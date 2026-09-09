/**
 * Smart AI Router: tries Google Gemini (gemini-3.6-flash) directly with search grounding and a robust timeout,
 * and automatically falls back instantly to OpenAI (gpt-5.4-mini) when rate-limited or unavailable.
 *
 * Search grounding degrades gracefully: if the grounding call is rejected (no
 * Google Search quota on the key, or a transient 429/503), the same prompt is
 * retried once WITHOUT the grounding tool before falling through to OpenAI, so
 * the scraper still returns real results instead of canned data.
 */

export interface AiRequest {
  prompt: string;
  systemPrompt?: string;
  jsonMode?: boolean;
  maxTokens?: number;
  useSearchGrounding?: boolean;
  /** Overall budget per provider attempt in ms (defaults to 15000). */
  timeoutMs?: number;
  /** Gemini thinking level (default "low"). Use "minimal" for ultra-low-latency voice paths. */
  thinkingLevel?: "minimal" | "low" | "medium" | "high";
}

/**
 * Safely parses JSON from AI text output, handling markdown code fences
 * (```json ... ``` or ``` ... ```) and conversational filler text.
 */
export function parseAiJson<T = any>(text: string | null): T | null {
  if (!text) return null;
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    try {
      const firstObj = cleaned.indexOf("{");
      const firstArr = cleaned.indexOf("[");
      let start = -1;
      if (firstObj !== -1 && firstArr !== -1) {
        start = Math.min(firstObj, firstArr);
      } else {
        start = firstObj !== -1 ? firstObj : firstArr;
      }

      const lastObj = cleaned.lastIndexOf("}");
      const lastArr = cleaned.lastIndexOf("]");
      let end = Math.max(lastObj, lastArr);

      if (start !== -1 && end !== -1 && end > start) {
        const jsonSlice = cleaned.slice(start, end + 1);
        return JSON.parse(jsonSlice) as T;
      }
    } catch {
      // Failed all parsing strategies
    }
  }
  return null;
}

async function geminiGenerate(opts: {
  key: string;
  model: string;
  prompt: string;
  systemPrompt?: string;
  jsonMode?: boolean;
  maxTokens: number;
  timeoutMs: number;
  thinkingLevel: "minimal" | "low" | "medium" | "high";
  withGrounding: boolean;
}): Promise<string | null> {
  const bodyPayload: any = {
    contents: [
      {
        parts: [
          {
            text: opts.systemPrompt
              ? `${opts.systemPrompt}

${opts.prompt}`
              : opts.prompt,
          },
        ],
      },
    ],
    generationConfig: {
      ...(opts.jsonMode ? { responseMimeType: "application/json" } : {}),
      maxOutputTokens: opts.maxTokens,
      thinkingConfig: { thinkingLevel: opts.thinkingLevel },
    },
  };

  if (opts.withGrounding) {
    bodyPayload.tools = [{ googleSearch: {} }];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:generateContent?key=${opts.key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      },
    );
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (res.ok && text) {
      return text.trim();
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function callAi(req: AiRequest): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const openAiModel = process.env.CHAT_OPENAI_MODEL || "gpt-5.4-mini";
  const maxTokens = req.maxTokens || 1000;
  const timeoutMs = req.timeoutMs || 15000;
  const thinkingLevel = req.thinkingLevel || "low";

  // 1. Try Gemini. Grounding is best-effort: retry without it on failure so a
  //    missing Google Search quota never takes down the whole pipeline.
  if (geminiKey) {
    let text: string | null = null;
    if (req.useSearchGrounding) {
      text = await geminiGenerate({
        key: geminiKey,
        model: geminiModel,
        prompt: req.prompt,
        systemPrompt: req.systemPrompt,
        jsonMode: req.jsonMode,
        maxTokens,
        timeoutMs,
        thinkingLevel,
        withGrounding: true,
      });
      if (!text) {
        text = await geminiGenerate({
          key: geminiKey,
          model: geminiModel,
          prompt: req.prompt,
          systemPrompt: req.systemPrompt,
          jsonMode: req.jsonMode,
          maxTokens,
          timeoutMs,
          thinkingLevel,
          withGrounding: false,
        });
      }
    } else {
      text = await geminiGenerate({
        key: geminiKey,
        model: geminiModel,
        prompt: req.prompt,
        systemPrompt: req.systemPrompt,
        jsonMode: req.jsonMode,
        maxTokens,
        timeoutMs,
        thinkingLevel,
        withGrounding: false,
      });
    }
    if (text) {
      return text;
    }
  }

  // 2. Fall back to OpenAI
  if (openAiKey) {
    try {
      const messages: Array<{ role: "system" | "user"; content: string }> = [];
      if (req.systemPrompt) {
        messages.push({ role: "system", content: req.systemPrompt });
      }
      messages.push({ role: "user", content: req.prompt });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: openAiModel,
          messages,
          temperature: 0.4,
          max_tokens: maxTokens,
          response_format: req.jsonMode ? { type: "json_object" } : undefined,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const json = await res.json();
      const text = json?.choices?.[0]?.message?.content;
      if (res.ok && text) {
        return text.trim();
      }
    } catch {
      // fallback
    }
  }

  return null;
}