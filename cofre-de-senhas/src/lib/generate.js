// Gerador de senhas usando crypto.getRandomValues (CSPRNG do navegador),
// nunca Math.random(). Rejection sampling evita módulo bias.

const CHARSETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?/",
};

const AMBIGUOUS = "il1Lo0OI";

export function secureRandomInt(maxExclusive) {
  const range = maxExclusive;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8) || 1;
  const maxValid = Math.floor(256 ** bytesNeeded / range) * range;
  const arr = new Uint8Array(bytesNeeded);

  let value;
  do {
    crypto.getRandomValues(arr);
    value = arr.reduce((acc, byte, i) => acc + byte * 256 ** i, 0);
  } while (value >= maxValid);

  return value % range;
}

export function generatePassword({
  length = 16,
  useLower = true,
  useUpper = true,
  useDigits = true,
  useSymbols = true,
  excludeAmbiguous = true,
} = {}) {
  let pool = "";
  if (useLower) pool += CHARSETS.lower;
  if (useUpper) pool += CHARSETS.upper;
  if (useDigits) pool += CHARSETS.digits;
  if (useSymbols) pool += CHARSETS.symbols;

  if (excludeAmbiguous) {
    pool = [...pool].filter((c) => !AMBIGUOUS.includes(c)).join("");
  }

  if (!pool) {
    throw new Error("Selecione ao menos um conjunto de caracteres.");
  }

  // Garante ao menos um caractere de cada conjunto ativo, depois preenche o resto.
  const requiredSets = [
    useLower && CHARSETS.lower,
    useUpper && CHARSETS.upper,
    useDigits && CHARSETS.digits,
    useSymbols && CHARSETS.symbols,
  ]
    .filter(Boolean)
    .map((set) => (excludeAmbiguous ? [...set].filter((c) => !AMBIGUOUS.includes(c)).join("") : set));

  const chars = requiredSets.map((set) => set[secureRandomInt(set.length)]);

  while (chars.length < length) {
    chars.push(pool[secureRandomInt(pool.length)]);
  }

  // Embaralha (Fisher-Yates com CSPRNG) para não deixar os "obrigatórios" no início.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.slice(0, length).join("");
}
