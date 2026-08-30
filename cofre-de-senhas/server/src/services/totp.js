// TOTP (Time-based One-Time Password, RFC 6238) — o mesmo padrão usado por
// Google Authenticator, Authy, etc. O segredo nunca é exposto depois do
// setup inicial: fica salvo no banco e é usado só para verificar códigos,
// nunca devolvido em nenhuma resposta da API depois disso.

import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";

const ISSUER = "Guardião de Acessos";

export function createTotpSecret() {
  return generateSecret();
}

export async function generateQrCodeDataUrl(secret, email) {
  const uri = generateURI({
    issuer: ISSUER,
    label: email,
    secret,
  });
  return QRCode.toDataURL(uri);
}

export async function verifyTotpCode(secret, code) {
  if (!/^\d{6}$/.test(code || "")) return false;
  const result = await verify({ secret, token: code });
  return result.valid;
}
