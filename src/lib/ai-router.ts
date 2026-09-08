/**
 * Smart AI Router: tries Google Gemini (gemini-3.5-flash) directly with a tight timeout,
 * and automatically falls back instantly to OpenAI (gpt-4.1-mini) when rate-limited or unavailable.
 */

export interface AiRequest {
  prompt: string;
  systemPrompt?: string;
  jsonMode?: boolean;
  maxTokens?: number;
}

export async function callAi(req: AiRequest): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const maxTokens = req.maxTokens || 50;

  // 1. Try Gemini (gemini-3.5-flash) directly with a tight timeout (2.5s)
  if (geminiKey) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: req.systemPrompt
                      ? `${req.systemPrompt}\n\n${req.prompt}`
                      : req.prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              ...(req.jsonMode ? { responseMimeType: "application/json" } : {}),
              maxOutputTokens: maxTokens,
            },
          }),
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (res.ok && text) {
        return text.trim();
      }
    } catch {
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
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
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
