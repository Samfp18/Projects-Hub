// Nunca gravamos o IP em texto puro nos logs. Guardamos um hash (com salt),
// suficiente para detectar padrões de abuso (mesmo IP batendo muitas vezes)
// sem manter um registro identificável e reversível do visitante.
//
// IMPORTANTE: defina IP_HASH_SALT como variável de ambiente em produção.
// O valor padrão abaixo é só para desenvolvimento local.

import crypto from "node:crypto";

export function hashIp(ip, salt = process.env.IP_HASH_SALT || "dev-salt-troque-em-producao") {
  if (!ip) return "unknown";
  return crypto.createHash("sha256").update(`${ip}:${salt}`).digest("hex").slice(0, 16);
}
