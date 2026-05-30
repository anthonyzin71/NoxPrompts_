// api/generate.js — Proxy serverless Vercel para OpenRouter

const rateMap = new Map();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60_000;

function checkRate(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, start: now };

  if (now - entry.start > RATE_WINDOW) {
    rateMap.set(ip, { count: 1, start: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;

  entry.count++;
  rateMap.set(ip, entry);
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const ip =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  if (!checkRate(ip)) {
    return res.status(429).json({
      error: 'Muitas requisições. Aguarde 1 minuto e tente novamente.',
    });
  }

  const { prompt } = req.body || {};

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({
      error: 'Campo "prompt" obrigatório.',
    });
  }

  try {
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://nox-prompts.vercel.app',
          'X-Title': 'NoxPrompts',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 4000,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenRouter Error:', data);

      return res.status(response.status).json({
        error: data?.error?.message || 'Erro na OpenRouter.',
      });
    }

    return res.status(200).json({
      success: true,
      content: data?.choices?.[0]?.message?.content || ''
    });

  } catch (err) {
    console.error('Server Error:', err);

    return res.status(500).json({
      error: err.message || 'Erro interno do servidor.',
    });
  }
        }
