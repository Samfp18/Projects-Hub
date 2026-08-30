import { describe, it, expect } from "vitest";
import {
  generateSaltBase64,
  deriveMasterKeyBits,
  deriveEncryptionKey,
  deriveAuthProof,
  generateVaultKey,
  wrapVaultKey,
  unwrapVaultKey,
  encryptItem,
  decryptItem,
  bufferToBase64,
  base64ToBuffer,
} from "../vaultCrypto.js";

describe("codificação base64", () => {
  it("bufferToBase64 e base64ToBuffer são inversos um do outro", () => {
    const original = crypto.getRandomValues(new Uint8Array(32));
    const base64 = bufferToBase64(original.buffer);
    const roundTrip = new Uint8Array(base64ToBuffer(base64));
    expect(roundTrip).toEqual(original);
  });
});

describe("derivação da chave mestra", () => {
  it("a mesma senha e o mesmo salt sempre produzem a mesma chave (determinístico)", async () => {
    const salt = generateSaltBase64();
    const a = await deriveMasterKeyBits("minhaSenhaMestra123", salt, 100000);
    const b = await deriveMasterKeyBits("minhaSenhaMestra123", salt, 100000);
    expect(bufferToBase64(a)).toBe(bufferToBase64(b));
  });

  it("senhas diferentes produzem chaves diferentes", async () => {
    const salt = generateSaltBase64();
    const a = await deriveMasterKeyBits("senhaA123456", salt, 100000);
    const b = await deriveMasterKeyBits("senhaB123456", salt, 100000);
    expect(bufferToBase64(a)).not.toBe(bufferToBase64(b));
  });

  it("o mesmo salt gerado duas vezes é diferente (aleatório)", () => {
    expect(generateSaltBase64()).not.toBe(generateSaltBase64());
  });

  it("salts diferentes para a mesma senha produzem chaves diferentes", async () => {
    const a = await deriveMasterKeyBits("mesmaSenha123", generateSaltBase64(), 100000);
    const b = await deriveMasterKeyBits("mesmaSenha123", generateSaltBase64(), 100000);
    expect(bufferToBase64(a)).not.toBe(bufferToBase64(b));
  });
});

describe("authProof — nunca deve vazar a chave de criptografia", () => {
  it("a chave de criptografia é gerada como NÃO-EXTRAÍVEL — propriedade de segurança verificável", async () => {
    const salt = generateSaltBase64();
    const masterKeyBits = await deriveMasterKeyBits("senha123456", salt, 100000);
    const encryptionKey = await deriveEncryptionKey(masterKeyBits);

    // Mesmo com controle total do código rodando no navegador, não é
    // possível extrair os bytes brutos desta chave — o navegador recusa.
    // Isso é uma camada de defesa adicional (não a única: o design com
    // HMAC de contextos diferentes já impede isso matematicamente).
    await expect(crypto.subtle.exportKey("raw", encryptionKey)).rejects.toThrow();
  });

  it("authProof não é, ele mesmo, reversível para masterKeyBits (HMAC é função de mão única)", async () => {
    const salt = generateSaltBase64();
    const masterKeyBits = await deriveMasterKeyBits("senha123456", salt, 100000);
    const authProof = await deriveAuthProof(masterKeyBits);

    // Não há como isso ser igual ao material bruto da chave mestra —
    // authProof é um HMAC (32 bytes), masterKeyBits é outro valor de 32
    // bytes, mas derivados por caminhos diferentes e não invertíveis
    // entre si. Uma checagem básica de sanidade: não são a mesma string.
    expect(authProof).not.toBe(bufferToBase64(masterKeyBits));
  });

  it("authProof é determinístico para a mesma senha mestra", async () => {
    const salt = generateSaltBase64();
    const masterKeyBits = await deriveMasterKeyBits("senha123456", salt, 100000);

    const proof1 = await deriveAuthProof(masterKeyBits);
    const proof2 = await deriveAuthProof(masterKeyBits);
    expect(proof1).toBe(proof2);
  });
});

describe("embrulho e desembrulho da chave do cofre", () => {
  it("desembrulha corretamente com a senha certa", async () => {
    const salt = generateSaltBase64();
    const masterKeyBits = await deriveMasterKeyBits("senhaCorreta123", salt, 100000);
    const encryptionKey = await deriveEncryptionKey(masterKeyBits);

    const vaultKey = await generateVaultKey();
    const wrapped = await wrapVaultKey(vaultKey, encryptionKey);

    // Simula o login de novo: re-deriva tudo do zero a partir da senha certa.
    const masterKeyBits2 = await deriveMasterKeyBits("senhaCorreta123", salt, 100000);
    const encryptionKey2 = await deriveEncryptionKey(masterKeyBits2);
    const unwrapped = await unwrapVaultKey(wrapped, encryptionKey2);

    const originalRaw = await crypto.subtle.exportKey("raw", vaultKey);
    const unwrappedRaw = await crypto.subtle.exportKey("raw", unwrapped);
    expect(bufferToBase64(unwrappedRaw)).toBe(bufferToBase64(originalRaw));
  });

  it("FALHA ao desembrulhar com a senha errada — é o teste de segurança mais importante do módulo", async () => {
    const salt = generateSaltBase64();
    const masterKeyBits = await deriveMasterKeyBits("senhaCorreta123", salt, 100000);
    const encryptionKey = await deriveEncryptionKey(masterKeyBits);

    const vaultKey = await generateVaultKey();
    const wrapped = await wrapVaultKey(vaultKey, encryptionKey);

    const wrongMasterKeyBits = await deriveMasterKeyBits("senhaErrada456", salt, 100000);
    const wrongEncryptionKey = await deriveEncryptionKey(wrongMasterKeyBits);

    await expect(unwrapVaultKey(wrapped, wrongEncryptionKey)).rejects.toThrow();
  });
});

describe("criptografia de itens do cofre", () => {
  it("decifra corretamente um item que foi cifrado com a mesma vaultKey", async () => {
    const vaultKey = await generateVaultKey();
    const item = { title: "GitHub", username: "samuel@example.com", password: "s3nh4-muito-forte!" };

    const { ciphertext, iv } = await encryptItem(item, vaultKey);
    const decrypted = await decryptItem(ciphertext, iv, vaultKey);

    expect(decrypted).toEqual(item);
  });

  it("o ciphertext não contém o texto original em nenhuma forma reconhecível", async () => {
    const vaultKey = await generateVaultKey();
    const item = { title: "MeuBancoSecreto", password: "senha-super-secreta-12345" };

    const { ciphertext } = await encryptItem(item, vaultKey);

    expect(ciphertext).not.toContain("MeuBancoSecreto");
    expect(ciphertext).not.toContain("senha-super-secreta-12345");
  });

  it("FALHA ao decifrar com a vaultKey errada", async () => {
    const vaultKeyA = await generateVaultKey();
    const vaultKeyB = await generateVaultKey();
    const item = { title: "Teste" };

    const { ciphertext, iv } = await encryptItem(item, vaultKeyA);

    await expect(decryptItem(ciphertext, iv, vaultKeyB)).rejects.toThrow();
  });

  it("cada criptografia do MESMO item produz ciphertext diferente (IV único)", async () => {
    const vaultKey = await generateVaultKey();
    const item = { title: "Repetido" };

    const first = await encryptItem(item, vaultKey);
    const second = await encryptItem(item, vaultKey);

    expect(first.ciphertext).not.toBe(second.ciphertext);
    expect(first.iv).not.toBe(second.iv);
  });
});

describe("fluxo completo: cadastro → login em outro momento → acesso ao item", () => {
  it("simula o ciclo de vida real de ponta a ponta", async () => {
    const masterPassword = "minha-senha-mestra-super-segura";

    // --- Cadastro ---
    const kdfSalt = generateSaltBase64();
    const kdfIterations = 100000;
    const masterKeyBits = await deriveMasterKeyBits(masterPassword, kdfSalt, kdfIterations);
    const encryptionKey = await deriveEncryptionKey(masterKeyBits);
    const authProof = await deriveAuthProof(masterKeyBits);

    const vaultKey = await generateVaultKey();
    const wrappedVaultKey = await wrapVaultKey(vaultKey, encryptionKey);

    const item = { title: "E-mail pessoal", username: "samuel@example.com", password: "correcthorsebatterystaple" };
    const encryptedItem = await encryptItem(item, vaultKey);

    // Isto é o que seria enviado ao servidor — nenhum campo aqui é
    // reversível para a senha mestra ou para o conteúdo do item.
    const serverSideData = { authProof, kdfSalt, kdfIterations, wrappedVaultKey, ...encryptedItem };
    expect(JSON.stringify(serverSideData)).not.toContain(masterPassword);
    expect(JSON.stringify(serverSideData)).not.toContain("correcthorsebatterystaple");

    // --- "Outro momento" — login de novo, do zero, só com a senha e o
    // que o servidor devolveria ---
    const loginMasterKeyBits = await deriveMasterKeyBits(masterPassword, serverSideData.kdfSalt, serverSideData.kdfIterations);
    const loginEncryptionKey = await deriveEncryptionKey(loginMasterKeyBits);
    const recoveredVaultKey = await unwrapVaultKey(serverSideData.wrappedVaultKey, loginEncryptionKey);

    const recoveredItem = await decryptItem(serverSideData.ciphertext, serverSideData.iv, recoveredVaultKey);
    expect(recoveredItem).toEqual(item);
  });
});
