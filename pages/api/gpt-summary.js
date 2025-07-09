import { createClient } from '@supabase/supabase-js';
import { Configuration, OpenAIApi } from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY
}));

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

  const { data, error } = await supabase
    .from('answers')
    .select('*')
    .eq('user_id', user_id);

  if (error || !data) {
    console.error('Supabase error:', error);
    return res.status(500).json({ error: 'Failed to fetch answers' });
  }

  const baseInstructions = `
אתה מנתח שאלון מוכנות לחירום של רשות מקומית בישראל.

התחומים הם:
1. מידע לציבור
2. לוגיסטיקה ושינוע
3. תקשורת וחירום
4. צוותים ונהלים
5. תשתיות וביטחון

לכל שאלה התשובות האפשריות הן:
- כן = הרשות מוכנה
- חלקית = קיימת פעילות מסוימת אך נדרשים שיפורים
- לא = הרשות אינה מוכנה כלל

עליך:
- לסכם כל תחום בקצרה (2–3 שורות)
- לציין במה הרשות חזקה
- להצביע על נקודות חולשה
- להציע 2 צעדים קונקרטיים לשיפור בכל תחום

ענה בעברית פשוטה, מקצועית, בלי כותרות מיותרות.
  `;

  const answersFormatted = data.map((row) => {
    return `תחום: ${row.category}\nשאלה: ${row.question_text}\nתשובה: ${row.answer}`;
  }).join('\n\n');

  const fullPrompt = `${baseInstructions}\n\n${answersFormatted}`;

  try {
    const gptResponse = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: [{ role: 'user', content: fullPrompt }],
    });

    const summary = gptResponse?.data?.choices?.[0]?.message?.content || 'אין ניתוח זמין';
    res.status(200).json({ summary });

  } catch (err) {
    console.error('GPT error:', err);
    res.status(500).json({ error: 'GPT failed' });
  }
}
