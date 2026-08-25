// Verifica a senha contra a base de vazamentos do Have I Been Pwned usando
// o modelo de k-anonimato: só enviamos os 5 primeiros caracteres do hash
// SHA-1 da senha. A senha em si NUNCA sai do navegador do usuário.
//
// A consulta passa pelo nosso próprio backend (server/) em vez de ir direto
// para o HIBP. O backend funciona só como um repassador (proxy): ele recebe
// o mesmo prefixo de 5 caracteres que o navegador enviaria de qualquer
// forma, encaminha para o HIBP e devolve a resposta — nunca vê a senha nem
// o hash completo. Isso existe para aplicar rate limiting e observabilidade
// do lado do servidor, não para aumentar o acesso a dados sensíveis.
// Documentação HIBP: https://haveibeenpwned.com/API/v3#PwnedPasswords

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

async function sha1Hex(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

/**
 * Retorna { pwned: boolean, count: number } ou lança erro em caso de falha
 * de rede / limite de requisições (o chamador deve tratar isso como "não
 * foi possível verificar agora"). Erros de rate limit lançam um Error com
 * a mensagem especial "RATE_LIMITED" para a UI mostrar um aviso específico.
 */
export async function checkPwned(password) {
  if (!password) return { pwned: false, count: 0 };

  const hash = await sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const response = await fetch(`${API_BASE_URL}/api/check-pwned/${prefix}`);

  if (response.status === 429) {
    throw new Error("RATE_LIMITED");
  }

  if (!response.ok) {
    throw new Error(`Falha ao consultar vazamentos: ${response.status}`);
  }

  const text = await response.text();
  const lines = text.split("\n");

  for (const line of lines) {
    const [lineSuffix, countStr] = line.trim().split(":");
    if (lineSuffix === suffix) {
      return { pwned: true, count: parseInt(countStr, 10) || 0 };
    }
  }

  return { pwned: false, count: 0 };
}
