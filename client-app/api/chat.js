export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) return res.status(500).json({ error: 'API key not configured' });

  const { messages = [] } = req.body || {};

  const systemPrompt = `You are the Billy Living Concierge — a sophisticated, warm AI assistant for a luxury interior design studio based in Nigeria. Your name is Billy AI.

You assist clients with:
- Interior design advice, style direction, and room planning
- Color palettes, textures, and material recommendations
- Furniture curation and spatial arrangement
- Booking design consultations with the Billy Living team
- Information about Billy Living's services, packages, and portfolio
- Project scoping and budget conversations

Tone guidelines:
- Warm but refined — never cold or overly formal
- Concise and thoughtful — keep replies under 3 short paragraphs
- Use "we" when referring to Billy Living as a studio
- If a client wants to speak to a human, direct them to WhatsApp or book a consultation
- Never make up specific pricing — say pricing is discussed during consultation`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Groq error:', JSON.stringify(data));
      return res.status(502).json({ error: 'AI service error', detail: data?.error?.message || '' });
    }

    const reply = data.choices?.[0]?.message?.content || 'One moment please.';
    return res.status(200).json({ reply });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
