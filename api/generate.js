export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Método não permitido'
    });
  }

  try {
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-v4-flash:free',
          messages: [
            {
              role: 'system',
              content:
                'Você é um especialista em criar carrosséis virais extremamente persuasivos para Instagram.'
            },
            {
              role: 'user',
              content: req.body.prompt
            }
          ]
        })
      }
    );

    const data = await response.json();

    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao gerar conteúdo',
      details: error.message
    });
  }
}
