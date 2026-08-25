// Verifica a senha contra a base de vazamentos do Have I Been Pwned usando
// o modelo de k-anonimato: só enviamos os 5 primeiros caracteres do hash
// SHA-1 da senha. A senha em si NUNCA sai do navegador do usuário.
// Documentação: https://haveibeenpwned.com/API/v3#PwnedPasswords

async function sha1Hex(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

/**
 * Retorna { pwned: boolean, count: number } ou lança erro em caso de falha
 * de rede (o chamador deve tratar isso como "não foi possível verificar").
 */
export async function checkPwned(password) {
  if (!password) return { pwned: false, count: 0 };

  const hash = await sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { "Add-Padding": "true" },
  });

  if (!response.ok) {
    throw new Error(`Falha ao consultar HIBP: ${response.status}`);
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
