type HandlerEvent = {
  httpMethod: string;
  body: string | null;
};

type HandlerResponse = {
  statusCode: number;
  body: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

export const handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const openaiApiKey = process.env['OPENAI_API_KEY'];
  const groqApiKey = process.env['GROQ_API_KEY'];
  const xaiApiKey = process.env['XAI_API_KEY'] || process.env['GROK_API_KEY'];

  if (!openaiApiKey && !groqApiKey && !xaiApiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Missing API key. Set OPENAI_API_KEY, GROQ_API_KEY, or XAI_API_KEY.'
      })
    };
  }

  const body = event.body ? JSON.parse(event.body) : {};
  const prompt = body.prompt;

  if (!prompt || typeof prompt !== 'string') {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing prompt' })
    };
  }

  try {
    const provider = xaiApiKey ? 'xai' : groqApiKey ? 'groq' : 'openai';
    const apiKey = xaiApiKey || groqApiKey || openaiApiKey!;
    const endpoint =
      provider === 'xai'
        ? 'https://api.x.ai/v1/chat/completions'
        : provider === 'groq'
          ? 'https://api.groq.com/openai/v1/chat/completions'
          : 'https://api.openai.com/v1/chat/completions';
    const model =
      provider === 'xai'
        ? process.env['XAI_MODEL'] || 'grok-2-latest'
        : provider === 'groq'
          ? process.env['GROQ_MODEL'] || 'llama-3.1-8b-instant'
          : process.env['OPENAI_MODEL'] || 'gpt-4o-mini';

    const providerResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3
      })
    });

    const data = (await providerResponse.json()) as ChatCompletionResponse;

    if (!providerResponse.ok) {
      return {
        statusCode: providerResponse.status,
        body: JSON.stringify({
          error: data.error?.message || `${provider.toUpperCase()} API error`
        })
      };
    }

    const text = data.choices?.[0]?.message?.content || 'No response generated.';

    return {
      statusCode: 200,
      body: JSON.stringify({ text })
    };
  } catch {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Unable to connect to AI provider API' })
    };
  }
};
