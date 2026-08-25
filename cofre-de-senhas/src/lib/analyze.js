// Análise de força de senha usando zxcvbn-ts — o mesmo algoritmo (mantido
// e modernizado a partir do zxcvbn original do Dropbox) usado por produtos
// reais de segurança. Isso substitui a heurística de entropia caseira que
// este projeto usava antes: zxcvbn modela ataques de dicionário, padrões
// de teclado, datas, l33tspeak e variações de maiúsculas de forma muito
// mais realista do que um cálculo de entropia por conjunto de caracteres.
//
// Os dicionários do zxcvbn são grandes (milhares de palavras), então o
// carregamento é feito sob demanda via import() dinâmico — o código só é
// baixado quando alguém de fato analisa uma senha, não no carregamento
// inicial da página. Isso evita inflar o bundle principal em ~1MB à toa.

const BR_SPECIFIC_TERMS = [
  "vasco", "flamengo", "corinthians", "palmeiras", "gremio", "internacional",
  "saopaulo", "santos", "cruzeiro", "atletico", "brasil123", "brasil2024",
  "brasil2025", "brasil2026",
];

function hasBrSpecificTerm(passwordLower) {
  return BR_SPECIFIC_TERMS.some((term) => passwordLower.includes(term));
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
  if (!Number.isFinite(seconds) || seconds < 1) return seconds >= 1e12 ? "mais de um século" : "instantâneo";
  for (const [label, unitSeconds] of units) {
    if (seconds >= unitSeconds) {
      const value = seconds / unitSeconds;
      const rounded = value >= 100 ? Math.round(value).toLocaleString("pt-BR") : value.toFixed(1);
      return `${rounded} ${label}`;
    }
  }
  return "instantâneo";
}

function scoreToLabel(score) {
  if (score <= 1) return "FRACA";
  if (score === 2) return "REGULAR";
  if (score === 3) return "FORTE";
  return "BLINDADA";
}

let zxcvbnInstancePromise = null;

function getZxcvbnInstance() {
  if (!zxcvbnInstancePromise) {
    zxcvbnInstancePromise = Promise.all([
      import("@zxcvbn-ts/core"),
      import("@zxcvbn-ts/language-common"),
      import("@zxcvbn-ts/language-pt-br"),
    ]).then(([core, common, ptBr]) => {
      return new core.ZxcvbnFactory({
        dictionary: {
          ...common.dictionary,
          ...ptBr.dictionary,
        },
        graphs: common.adjacencyGraphs,
        translations: ptBr.translations,
      });
    });
  }
  return zxcvbnInstancePromise;
}

/**
 * Analisa uma senha usando zxcvbn-ts. Assíncrona de propósito: carrega o
 * motor de análise sob demanda (ver comentário no topo do arquivo).
 */
export async function analyzePassword(password) {
  if (!password) {
    return {
      score: 0,
      label: "VAZIA",
      entropyBits: 0,
      crackTime: "—",
      reasons: [],
    };
  }

  const instance = await getZxcvbnInstance();
  const result = instance.check(password);
  const entropyBits = Math.round(result.guessesLog10 * Math.log2(10) * 10) / 10;
  const crackSeconds = result.crackTimes.offlineFastHashingXPerSecond.seconds;

  const reasons = [];
  if (result.feedback.warning) reasons.push(result.feedback.warning);
  for (const suggestion of result.feedback.suggestions) {
    if (!reasons.includes(suggestion)) reasons.push(suggestion);
  }

  if (hasBrSpecificTerm(password.toLowerCase())) {
    reasons.push("Contém termo popular no Brasil (ex: time de futebol) — fácil de adivinhar em ataques direcionados a usuários brasileiros");
  }

  if (reasons.length === 0) {
    reasons.push("Nenhum padrão óbvio identificado pela análise");
  }

  return {
    score: result.score,
    label: scoreToLabel(result.score),
    entropyBits,
    crackTime: formatCrackTime(crackSeconds),
    reasons,
  };
}
