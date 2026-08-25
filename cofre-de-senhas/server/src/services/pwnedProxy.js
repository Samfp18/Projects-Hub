// Encaminha a consulta de k-anonimato para a API do Have I Been Pwned.
// O servidor só vê o prefixo de 5 caracteres do hash SHA-1 — o mesmo dado
// que o navegador já enviaria diretamente ao HIBP antes desta mudança.
// Nunca recebemos a senha nem o hash completo: é matematicamente impossível
// descobrir qual senha foi consultada a partir de um prefixo de 5 caracteres,
// que corresponde, em média, a centenas de hashes diferentes.

const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range";

export async function queryPwnedRange(prefix) {
  if (!/^[0-9A-Fa-f]{5}$/.test(prefix)) {
    throw new InvalidPrefixError("Prefixo de hash inválido — esperado 5 caracteres hexadecimais.");
  }

  const response = await fetch(`${HIBP_RANGE_URL}/${prefix.toUpperCase()}`, {
    headers: {
      "Add-Padding": "true",
      "User-Agent": "cofre-de-senhas-proxy",
    },
  });

  if (!response.ok) {
    throw new UpstreamError(`Have I Been Pwned respondeu com status ${response.status}`);
  }

  return response.text();
}

export class InvalidPrefixError extends Error {}
export class UpstreamError extends Error {}
