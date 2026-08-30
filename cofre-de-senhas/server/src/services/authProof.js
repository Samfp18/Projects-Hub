// O servidor NUNCA recebe a senha mestra. O que chega aqui é o
// "authProof" — um valor já derivado no navegador a partir da senha
// mestra (via PBKDF2 + HMAC, ver o módulo de criptografia do frontend),
// especificamente para fins de autenticação, separado da chave que
// criptografa o cofre. Ainda assim, aplicamos bcrypt sobre esse valor
// antes de guardar — defesa em profundidade: mesmo se alguém copiar o
// banco inteiro, não tem o authProof em texto puro, só o hash dele.
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export async function hashAuthProof(authProof) {
  return bcrypt.hash(authProof, SALT_ROUNDS);
}

export async function verifyAuthProof(authProof, hash) {
  return bcrypt.compare(authProof, hash);
}
