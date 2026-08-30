// Proteção por CONTA, não só por IP — rate limiting por IP (que também
// existe, na rota) é fácil de contornar trocando de rede/proxy. Bloquear a
// conta específica depois de tentativas seguidas fracassadas defende
// mesmo contra um atacante distribuído mirando um único e-mail.
//
// Atraso progressivo: 5 tentativas → 1 min de bloqueio, 10 → 5 min, 15+ →
// 30 min. Isso torna um ataque de força bruta impraticavelmente lento sem
// travar permanentemente a conta de um usuário legítimo que errou a senha
// algumas vezes.

const LOCKOUT_TIERS = [
  { attempts: 15, lockMs: 30 * 60 * 1000 },
  { attempts: 10, lockMs: 5 * 60 * 1000 },
  { attempts: 5, lockMs: 60 * 1000 },
];

export function computeLockout(failedAttempts) {
  const tier = LOCKOUT_TIERS.find((t) => failedAttempts >= t.attempts);
  if (!tier) return null;
  return Date.now() + tier.lockMs;
}

export function isLocked(lockedUntil) {
  return Boolean(lockedUntil) && lockedUntil > Date.now();
}
