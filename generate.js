// api/generate.js — Proxy serverless Vercel para a API da Anthropic
// A ANTHROPIC_API_KEY fica em variáveis de ambiente da Vercel, nunca no frontend.

// Rate limiting simples em memória (reseta a cada cold start)
// Para produção com tráfego alto, substituir por Upstash Redis ou KV da Vercel
const rateMap = new Map();
const RATE_LIMIT = 10;        // máx requisições por IP
const RATE_WINDOW = 60_000;   // janela de 1 minuto (ms)

function checkRate(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, start: now };

  if (now - entry.start > RATE_WINDOW) {
    // janela expirou, reseta
    rateMap.set(ip, { count: 1, start: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;

  entry.count++;
  rateMap.set(ip, entry);
  return true;
}

export default async function handler(req, res) {
  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // CORS — ajuste o origin para o seu domínio em produção
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:5500',
    process.env.ALLOWED_ORIGIN, // ex: https://maestrocarrosseis.com.br
  ].filter(Boolean);

  const origin = req.headers.origin || '';
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Rate limiting por IP
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  if (!checkRate(ip)) {
    return res.status(429).json({
      error: 'Muitas requisições. Aguarde 1 minuto e tente novamente.',
    });
  }

  // Valida body
  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Campo "prompt" obrigatório.' });
  }
  if (prompt.length > 8000) {
    return res.status(400).json({ error: 'Prompt muito longo.' });
  }

  // Chama a API da Anthropic com a chave de ambiente
  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 5000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      console.error('Anthropic error:', data);
      return res.status(anthropicRes.status).json({
        error: data?.error?.message || 'Erro na API da Anthropic.',
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}
