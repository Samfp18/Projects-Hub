// Gera uma senha A PARTIR de uma frase escolhida pelo usuário, em vez de uma
// senha totalmente aleatória. Objetivo: memorabilidade com menos previsibilidade
// do que a frase "crua" teria sozinha.
//
// IMPORTANTE (honestidade sobre segurança): a estimativa de entropia em
// analyze.js é calculada a partir do TAMANHO e do CONJUNTO de caracteres do
// resultado — ela não sabe que esses caracteres vieram de uma frase real.
// Uma senha derivada de frase é, na prática, mais fraca do que uma senha
// puramente aleatória do mesmo tamanho, porque um atacante que tenta listas
// de frases/citações conhecidas e substituições leetspeak comuns (a→4, s→$
// etc.) reduz bastante o espaço de busca. Por isso este módulo sempre permite
// (e recomenda) completar a senha com caracteres aleatórios extras — é o
// `padding` que realmente garante segurança adicional.

import { secureRandomInt } from "./generate.js";

const CHARSETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?/",
};

// Substituições estilo leetspeak. `symbol` tem prioridade sobre `digit`
// quando ambos os modos estão ativos, porque também contribui para o
// requisito de "tem símbolo" na análise de força.
const LEET_MAP = {
  a: { digit: "4", symbol: "@" },
  e: { digit: "3", symbol: null },
  i: { digit: "1", symbol: "!" },
  o: { digit: "0", symbol: "*" },
  s: { digit: "5", symbol: "$" },
  t: { digit: "7", symbol: "+" },
  l: { digit: "1", symbol: null },
  g: { digit: "9", symbol: null },
};

export function substituteChar(char, useDigits, useSymbols) {
  const rule = LEET_MAP[char];
  if (!rule) return char;
  if (useSymbols && rule.symbol) return rule.symbol;
  if (useDigits && rule.digit) return rule.digit;
  return char;
}

function stripAccents(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Gera uma senha a partir de uma frase.
 *
 * @param {string} phrase - frase digitada pelo usuário
 * @param {object} options
 * @param {number} options.length - comprimento MÍNIMO desejado; se a frase
 *   transformada já for maior, o resultado fica maior que isso (a frase
 *   nunca é cortada no meio)
 * @param {boolean} options.useUpper - capitaliza letras aleatoriamente
 * @param {boolean} options.useDigits - troca letras por números (leetspeak)
 * @param {boolean} options.useSymbols - troca letras por símbolos (leetspeak)
 * @param {boolean} options.removeSpaces - remove espaços (true) ou troca por "-" (false)
 * @param {boolean} options.pad - completa até `length` com caracteres aleatórios do CSPRNG
 */
export function generatePasswordFromPhrase(
  phrase,
  {
    length = 20,
    useUpper = true,
    useDigits = true,
    useSymbols = true,
    removeSpaces = true,
    pad = true,
  } = {}
) {
  if (!phrase || !phrase.trim()) {
    throw new Error("Digite uma frase para transformar em senha.");
  }

  let base = stripAccents(phrase.trim().toLowerCase());
  base = removeSpaces ? base.replace(/\s+/g, "") : base.replace(/\s+/g, "-");

  let chars = [...base].map((c) => substituteChar(c, useDigits, useSymbols));

  if (useUpper) {
    chars = chars.map((c) => {
      if (!/[a-z]/.test(c)) return c;
      return secureRandomInt(2) === 1 ? c.toUpperCase() : c;
    });
  }

  if (pad && chars.length < length) {
    let pool = CHARSETS.lower;
    if (useUpper) pool += CHARSETS.upper;
    if (useDigits) pool += CHARSETS.digits;
    if (useSymbols) pool += CHARSETS.symbols;

    while (chars.length < length) {
      const randomChar = pool[secureRandomInt(pool.length)];
      const insertAt = secureRandomInt(chars.length + 1);
      chars.splice(insertAt, 0, randomChar);
    }
  }

  return chars.join("");
}
