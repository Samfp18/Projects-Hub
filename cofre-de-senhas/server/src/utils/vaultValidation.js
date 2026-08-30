import { z } from "zod";

// O registro recebe os parâmetros de derivação de chave (não a senha
// mestra em si) e a chave do cofre já embrulhada — tudo calculado no
// navegador antes de chegar aqui.
export const registerSchema = z.object({
  email: z.string().email("E-mail inválido."),
  authProof: z.string().min(20, "authProof inválido."),
  kdfSalt: z.string().min(16, "kdfSalt inválido."),
  kdfIterations: z.number().int().min(100000, "Número de iterações muito baixo."),
  wrappedVaultKey: z.string().min(16, "wrappedVaultKey inválido."),
});

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido."),
  authProof: z.string().min(1, "authProof obrigatório."),
  totpCode: z.string().optional(),
});

export const totpVerifySchema = z.object({
  code: z.string().length(6, "O código deve ter 6 dígitos."),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token obrigatório."),
});

export const changeMasterPasswordSchema = z.object({
  newAuthProof: z.string().min(20, "authProof inválido."),
  newKdfSalt: z.string().min(16, "kdfSalt inválido."),
  newKdfIterations: z.number().int().min(100000, "Número de iterações muito baixo."),
  newWrappedVaultKey: z.string().min(16, "wrappedVaultKey inválido."),
});

export const vaultItemSchema = z.object({
  ciphertext: z.string().min(1, "ciphertext obrigatório."),
  iv: z.string().min(1, "iv obrigatório."),
  isFavorite: z.boolean().optional(),
});
