// Access token: JWT curto (15 min), assinado, contém só o id do usuário —
// nunca senha, nunca segredo de 2FA. Verificado sem consultar o banco
// (é a vantagem de JWT: stateless).
//
// Refresh token: string aleatória opaca (não é JWT), de vida longa (7
// dias), armazenada no banco APENAS como hash SHA-256 — se o banco vazar,
// os refresh tokens não podem ser usados diretamente. A cada uso, o token
// antigo é revogado e um novo é emitido (rotação), então um token roubado
// e reutilizado é detectável (o dono legítimo veria o próprio token parar
// de funcionar).

import jwt from "jsonwebtoken";
import crypto from "node:crypto";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET não configurada. Defina uma variável de ambiente antes de emitir tokens.");
  }
  return secret;
}

export function signAccessToken(userId) {
  return jwt.sign({ sub: userId }, getSecret(), { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, getSecret());
}

export function generateRefreshToken() {
  const token = crypto.randomBytes(48).toString("hex");
  const tokenHash = hashRefreshToken(token);
  const expiresAt = Date.now() + REFRESH_TOKEN_TTL_MS;
  return { token, tokenHash, expiresAt };
}

export function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
