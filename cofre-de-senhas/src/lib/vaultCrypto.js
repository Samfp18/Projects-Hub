// Este é o arquivo mais importante do projeto inteiro. Tudo aqui roda no
// navegador, usando a Web Crypto API nativa (crypto.subtle) — nenhuma
// biblioteca de terceiros para a criptografia em si, o que significa que
// não há dependência externa entre você e "confiar que uma lib de npm
// implementou isso direito".
//
// ARQUITETURA (duas chaves independentes, uma senha mestra):
//
//   senha mestra
//        │
//        ▼ PBKDF2-SHA256 (600.000 iterações, salt único por usuário)
//   masterKeyBits (256 bits) ── nunca sai do navegador, nunca é enviado
//        │
//        ├─► HMAC-SHA256(masterKeyBits, "vault-encryption-key")
//        │        → encryptionKey (AES-GCM) — embrulha/desembrulha a
//        │          chave do cofre. Nunca sai do navegador.
//        │
//        └─► HMAC-SHA256(masterKeyBits, "vault-auth-proof")
//                 → authProof — ESSE sim é enviado ao servidor para
//                   login. Por ser derivado via HMAC (função de mão
//                   única), é computacionalmente inviável reconstruir
//                   masterKeyBits ou encryptionKey a partir dele, mesmo
//                   que o servidor inteiro seja comprometido.
//
//   vaultKey (chave aleatória de 256 bits, gerada uma vez no cadastro)
//        │
//        ├─► criptografa cada item do cofre individualmente (AES-GCM)
//        └─► fica guardada no servidor "embrulhada" pela encryptionKey
//            — trocar a senha mestra só exige reembrulhar ESTA chave,
//            não recriptografar item por item.

const PBKDF2_ITERATIONS_DEFAULT = 600000;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// ---------- utilidades de codificação ----------

export function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function generateSaltBase64() {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return bufferToBase64(salt);
}

// ---------- derivação da chave mestra ----------

async function importPasswordKey(masterPassword) {
  return crypto.subtle.importKey("raw", textEncoder.encode(masterPassword), "PBKDF2", false, ["deriveBits"]);
}

/** Deriva os 256 bits da chave mestra a partir da senha + salt do usuário. */
export async function deriveMasterKeyBits(masterPassword, saltBase64, iterations = PBKDF2_ITERATIONS_DEFAULT) {
  const passwordKey = await importPasswordKey(masterPassword);
  const salt = base64ToBuffer(saltBase64);
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    passwordKey,
    256
  );
}

async function hmacDerive(masterKeyBits, info) {
  const hmacKey = await crypto.subtle.importKey("raw", masterKeyBits, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return crypto.subtle.sign("HMAC", hmacKey, textEncoder.encode(info));
}

/** A chave AES-GCM que embrulha/desembrulha a chave do cofre. Nunca sai do navegador. */
export async function deriveEncryptionKey(masterKeyBits) {
  const bits = await hmacDerive(masterKeyBits, "vault-encryption-key");
  return crypto.subtle.importKey("raw", bits, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

/** O valor enviado ao servidor para autenticação — nunca a senha em si. */
export async function deriveAuthProof(masterKeyBits) {
  const bits = await hmacDerive(masterKeyBits, "vault-auth-proof");
  return bufferToBase64(bits);
}

// ---------- chave do cofre (vault key) ----------

export async function generateVaultKey() {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

/** Embrulha a chave do cofre com a chave de criptografia derivada da senha mestra. */
export async function wrapVaultKey(vaultKey, encryptionKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const rawVaultKey = await crypto.subtle.exportKey("raw", vaultKey);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, encryptionKey, rawVaultKey);

  // Empacota iv + ciphertext num único valor base64, já que o servidor
  // guarda "wrapped_vault_key" como uma coluna de string só.
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);
  return bufferToBase64(combined.buffer);
}

/** Desembrulha a chave do cofre de volta, usando a chave derivada da senha mestra digitada agora. */
export async function unwrapVaultKey(wrappedVaultKeyBase64, encryptionKey) {
  const combined = new Uint8Array(base64ToBuffer(wrappedVaultKeyBase64));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const rawVaultKey = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, encryptionKey, ciphertext);
  return crypto.subtle.importKey("raw", rawVaultKey, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
}

// ---------- criptografia de itens individuais ----------

/** Criptografa um item do cofre (objeto JS) com a chave do cofre. */
export async function encryptItem(item, vaultKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = textEncoder.encode(JSON.stringify(item));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, vaultKey, plaintext);
  return {
    ciphertext: bufferToBase64(ciphertext),
    iv: bufferToBase64(iv),
  };
}

/** Decifra um item do cofre de volta ao objeto JS original. */
export async function decryptItem(ciphertextBase64, ivBase64, vaultKey) {
  const iv = new Uint8Array(base64ToBuffer(ivBase64));
  const ciphertext = base64ToBuffer(ciphertextBase64);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, vaultKey, ciphertext);
  return JSON.parse(textDecoder.decode(plaintext));
}

export { PBKDF2_ITERATIONS_DEFAULT };
