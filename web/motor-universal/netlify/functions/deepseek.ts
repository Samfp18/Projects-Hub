// Proxy server-side para a API da DeepSeek.
// A chave fica só aqui (variável de ambiente no Netlify), nunca no código do navegador.
export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ erro: 'Método não permitido' }), { status: 405 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ erro: 'DEEPSEEK_API_KEY não configurada no servidor.' }), { status: 500 });
  }

  const body = await req.text();

  const upstream = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body,
  });

  const data = await upstream.text();
  return new Response(data, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });
};
