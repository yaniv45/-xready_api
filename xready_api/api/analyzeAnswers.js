export default async function handler(req, res) {
  const { answers } = req.body;

  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: "Missing answers" });
  }

  try {
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
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}