/**
 * Smart AI Router: tries Google Gemini first (free daily tier), and automatically
 * falls back to OpenAI when rate-limited or unavailable.
 */

export interface AiRequest {
  prompt: string;
  systemPrompt?: string;
  jsonMode?: boolean;
}

export async function callAi(req: AiRequest): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  // 1. Try Gemini (Free daily tier)
  if (geminiKey) {
    for (const model of ["gemini-3.5-flash", "gemini-1.5-flash", "gemini-flash-latest"]) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
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
              generationConfig: req.jsonMode ? { responseMimeType: "application/json" } : undefined,
            }),
          },
        );
        const json = await res.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (res.ok && text) {
          return text.trim();
        }
      } catch {
        // try next model or fallback to OpenAI
      }
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
          response_format: req.jsonMode ? { type: "json_object" } : undefined,
        }),
      });
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
