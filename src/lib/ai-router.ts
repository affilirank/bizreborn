/**
 * Smart AI Router: tries Google Gemini (gemini-3.5-flash) directly with search grounding and a robust timeout,
 * and automatically falls back instantly to OpenAI (gpt-5.4-mini) when rate-limited or unavailable.
 */

export interface AiRequest {
  prompt: string;
  systemPrompt?: string;
  jsonMode?: boolean;
  maxTokens?: number;
  useSearchGrounding?: boolean;
  /** Overall budget per provider attempt in ms (defaults to 8000). */
  timeoutMs?: number;
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

export async function callAi(req: AiRequest): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  const openAiModel = process.env.CHAT_OPENAI_MODEL || "gpt-5.4-mini";
  const maxTokens = req.maxTokens || 1000;
  const timeoutMs = req.timeoutMs || 8000;

  // 1. Try Gemini directly with search grounding and robust timeout
  if (geminiKey) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const bodyPayload: any = {
        contents: [
          {
            parts: [
              {
                text: req.systemPrompt
                  ? `${req.systemPrompt}

${req.prompt}`
                  : req.prompt,
              },
            ],
          },
        ],
        generationConfig: {
          ...(req.jsonMode ? { responseMimeType: "application/json" } : {}),
          maxOutputTokens: maxTokens,
        },
      };

      if (req.useSearchGrounding) {
        bodyPayload.tools = [{ googleSearch: {} }];
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload),
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (res.ok && text) {
        return text.trim();
      }
    } catch (err) {
      clearTimeout(timeoutId);
      // Fall back instantly to OpenAI
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
