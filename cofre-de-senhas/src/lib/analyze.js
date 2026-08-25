// Análise de força de senha sem depender de bibliotecas pesadas (tipo zxcvbn).
// Tudo roda no navegador do usuário — nenhuma senha é enviada para lugar nenhum
// além do endpoint k-anonimato do Have I Been Pwned (ver pwnedCheck.js).

const COMMON_PASSWORDS = new Set([
  "123456", "123456789", "password", "senha", "senha123", "12345678",
  "qwerty", "abc123", "111111", "123123", "admin", "letmein", "welcome",
  "iloveyou", "monkey", "dragon", "football", "master", "brasil", "brasil123",
  "vasco", "flamengo", "corinthians", "palmeiras", "amor", "12345",
]);

const KEYBOARD_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890"];

function hasSequentialRun(pwLower, minRun = 4) {
  const seqSources = [...KEYBOARD_ROWS, "abcdefghijklmnopqrstuvwxyz"];
  for (const row of seqSources) {
    for (let i = 0; i <= row.length - minRun; i++) {
      const chunk = row.slice(i, i + minRun);
      const chunkRev = [...chunk].reverse().join("");
      if (pwLower.includes(chunk) || pwLower.includes(chunkRev)) return true;
    }
  }
  return false;
}

function hasRepeatedChars(pw, minRun = 4) {
  return new RegExp(`(.)\\1{${minRun - 1},}`).test(pw);
}

function charsetSize(pw) {
  let size = 0;
  if (/[a-z]/.test(pw)) size += 26;
  if (/[A-Z]/.test(pw)) size += 26;
  if (/[0-9]/.test(pw)) size += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) size += 33;
  return size || 1;
}

function formatCrackTime(seconds) {
  const units = [
    ["século(s)", 60 * 60 * 24 * 365 * 100],
    ["ano(s)", 60 * 60 * 24 * 365],
    ["dia(s)", 60 * 60 * 24],
    ["hora(s)", 60 * 60],
    ["minuto(s)", 60],
    ["segundo(s)", 1],
  ];
  if (seconds < 1) return "instantâneo";
  for (const [label, unitSeconds] of units) {
    if (seconds >= unitSeconds) {
      const value = seconds / unitSeconds;
      const rounded = value >= 100 ? Math.round(value).toLocaleString("pt-BR") : value.toFixed(1);
      return `${rounded} ${label}`;
    }
  }
  return "instantâneo";
}

/**
 * Analisa uma senha e retorna entropia estimada, veredito, tempo de quebra
 * estimado (offline, GPU moderna ~10^10 tentativas/s) e uma lista de motivos.
 */
export function analyzePassword(password) {
  if (!password) {
    return {
      score: 0,
      label: "VAZIA",
      entropyBits: 0,
      crackTime: "—",
      reasons: [],
    };
  }

  const pwLower = password.toLowerCase();
  const reasons = [];
  let penaltyBits = 0;

  const size = charsetSize(password);
  let entropyBits = password.length * Math.log2(size);

  if (COMMON_PASSWORDS.has(pwLower)) {
    reasons.push("Está entre as senhas mais usadas do mundo");
    entropyBits = Math.min(entropyBits, 8);
  }

  if (hasSequentialRun(pwLower)) {
    reasons.push("Contém sequência previsível (teclado ou alfabeto)");
    penaltyBits += 12;
  }

  if (hasRepeatedChars(password)) {
    reasons.push("Contém caracteres repetidos em excesso");
    penaltyBits += 10;
  }

  if (/^\d+$/.test(password)) {
    reasons.push("Usa apenas números");
    penaltyBits += 6;
  }

  if (/(19|20)\d{2}/.test(password)) {
    reasons.push("Parece conter um ano (datas são fáceis de adivinhar)");
    penaltyBits += 6;
  }

  entropyBits = Math.max(0, entropyBits - penaltyBits);

  // GPU offline moderna: ~10^10 tentativas/segundo (estimativa conservadora
  // para hashes rápidos; hashes lentos como bcrypt seriam muito mais resistentes).
  const guessesPerSecond = 1e10;
  const crackSeconds = Math.pow(2, entropyBits) / guessesPerSecond;

  let score, label;
  if (password.length < 8 || entropyBits < 28) {
    score = 1; label = "FRACA";
  } else if (entropyBits < 45) {
    score = 2; label = "REGULAR";
  } else if (entropyBits < 65) {
    score = 3; label = "FORTE";
  } else {
    score = 4; label = "BLINDADA";
  }

  if (reasons.length === 0) {
    reasons.push("Nenhum padrão óbvio identificado");
  }

  return {
    score,
    label,
    entropyBits: Math.round(entropyBits * 10) / 10,
    crackTime: formatCrackTime(crackSeconds),
    reasons,
  };
}
