import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { user_id, answers } = req.body;

  if (!user_id || !answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: "Missing user_id or answers" });
  }

  try {
    // 1. Save to Supabase
    const records = answers.map((answer, i) => ({
      user_id,
      question_id: i + 1,
      answer
    }));

    const { error } = await supabase
      .from("answers")
      .insert(records);

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ error: "Failed to save answers" });
    }

    // 2. Send answers only to GPT
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "אתה יועץ מומחה לתחום מוכנות לחירום ברשויות מקומיות. עבור על תשובות השאלון והצע תוכנית שיפור מותאמת אישית."
          },
          {
            role: "user",
            content: `תשובות השאלון:\n${answers.map((a, i) => \`\${i + 1}. \${a}\`).join('\n')}`
          }
        ]
      })
    });

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content;

    res.status(200).json({ plan: result });
  } catch (err) {
    console.error("General error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}