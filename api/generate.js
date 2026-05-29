export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  try {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({
        error: 'OPENROUTER_API_KEY não encontrada',
      });
    }

    const body =
      typeof req.body === 'string'
        ? JSON.parse(req.body)
        : req.body;

    const {
      niche,
      objective,
      audience,
      tone,
      offer,
      briefing,
    } = body;

    const prompt = `
Você é um especialista em criação de carrosséis virais para Instagram.

Crie um carrossel altamente persuasivo.

Nicho: ${niche}
Objetivo: ${objective}
Público: ${audience}
Tom de voz: ${tone}
Oferta: ${offer}
Briefing adicional: ${briefing}

Estrutura:
1. Hook extremamente forte
2. Desenvolvimento emocional
3. Quebra de crença
4. Autoridade
5. CTA forte

Retorne em JSON:
{
  "slides": [
    {
      "title": "Título",
      "content": "Conteúdo"
    }
  ]
}
`;

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: data,
      });
    }

    const content =
      data.choices?.[0]?.message?.content || '';

    return res.status(200).json({
      result: content,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
    });
  }
}
