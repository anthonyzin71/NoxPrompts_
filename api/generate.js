// api/generate.js

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const {
      niche,
      objective,
      audience,
      tone,
      offer,
      slides,
      briefing,
      visualStyle,
      proportion
    } = req.body;

    const totalSlides = Number(slides) || 5;

    const prompt = `
Crie um carrossel viral para Instagram.

Nicho: ${niche}
Objetivo: ${objective}
Público: ${audience}
Tom de voz: ${tone}
Oferta: ${offer}
Quantidade de slides: ${totalSlides}
Estilo visual: ${visualStyle}
Proporção: ${proportion}
Briefing adicional: ${briefing}

REGRAS:
- Gere EXATAMENTE ${totalSlides} slides.
- Cada slide deve possuir:
  - title
  - content
- Não repita ideias.
- O slide 1 deve ter um hook forte.
- O último slide deve ter CTA.
- Responda SOMENTE em JSON.

Formato obrigatório:
{
  "slides": [
    {
      "title": "Título",
      "content": "Conteúdo"
    }
  ]
}
`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OPENROUTER ERROR:', data);

      return res.status(500).json({
        error: 'Erro OpenRouter',
        details: data
      });
    }

    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
      return res.status(500).json({
        error: 'Resposta vazia da IA'
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch {
      const cleaned = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      parsed = JSON.parse(cleaned);
    }

    if (!parsed.slides || !Array.isArray(parsed.slides)) {
      return res.status(500).json({
        error: 'Formato inválido da IA',
        raw: parsed
      });
    }

    const finalSlides = parsed.slides.slice(0, totalSlides).map((slide, index) => ({
      id: index + 1,
      title: slide.title || `Slide ${index + 1}`,
      content: slide.content || ''
    }));

    return res.status(200).json({
      success: true,
      slides: finalSlides
    });
  } catch (error) {
    console.error('SERVER ERROR:', error);

    return res.status(500).json({
      error: error.message
    });
  }
}
