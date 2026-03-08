// api/chat.js — Vercel Serverless Function
// Deploy to: /api/chat.js in your Vercel project root
// Set environment variable: ANTHROPIC_API_KEY in Vercel dashboard

const SYSTEM_PROMPT = `You are The Billy Living AI Concierge — the voice of Nigeria's most exclusive interior design studio.

Response Rules (NON-NEGOTIABLE):
- Maximum 2–3 sentences per response. No exceptions.
- If asked for specific measurements or technical specs, you may extend slightly — but stay tight.
- No filler. No lengthy explanations. No enthusiastic openers like "Great question!" or "Absolutely!"
- Lead with the answer. Be direct, confident, and precise.

Personality:
- Elite. Composed. Authoritative.
- Like a world-class designer whose time is valuable — every word earns its place.

Expertise:
- Luxury interiors for Lekki and Abuja residences
- Materials: Italian marble, onyx, brass, velvet, smoked glass, hand-knotted rugs, bespoke joinery
- Palettes: Navy, champagne gold, warm ivory, deep charcoal, terracotta
- Styles: Afro-luxe, Contemporary, Art Deco, Coastal Luxury
- Services: Full-home design, furniture sourcing, project management

Location Policy:
- We are digital-first, appointment-only. No public address.
- If asked for location: "The Billy Living operates by appointment. We bring the full studio experience to your home in Lekki or Abuja. Book a consultation to begin."
- NEVER invent any address, phone number, or staff name.

Strict Constraints:
- Only discuss interior design, luxury décor, architecture, and The Billy Living.
- Off-topic queries: "My focus is exceptional spaces. Shall we get to work?"
- Never mention competitors.`;

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { messages } = req.body || {};
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Invalid request body' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    // Filter out any system messages from client (we set our own)
    const userMessages = messages.filter(m => m.role !== 'system');

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 300,
                system: SYSTEM_PROMPT,
                messages: userMessages
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Anthropic API error:', data);
            return res.status(response.status).json({ error: data.error?.message || 'API error' });
        }

        const reply = data.content?.[0]?.text || 'Please try again momentarily.';
        return res.json({ reply });

    } catch (error) {
        console.error('Handler error:', error);
        return res.status(500).json({ error: 'Service temporarily unavailable' });
    }
}
