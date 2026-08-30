import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { generate } from "otplib";
import { createApp } from "../app.js";

beforeAll(() => {
  process.env.JWT_SECRET = "segredo-de-teste-cofre-pessoal";
});

function freshApp() {
  return createApp({ dbPath: ":memory:" });
}

// Como o backend nunca vê a senha mestra, simulamos aqui só o formato
// esperado dos campos derivados no navegador — os valores em si não
// precisam ser criptograficamente reais para testar a API do servidor,
// só precisam ter o formato que os schemas de validação exigem.
function fakeAuthMaterial(seed = "a") {
  return {
    authProof: seed.repeat(32),
    kdfSalt: seed.repeat(16),
    kdfIterations: 600000,
    wrappedVaultKey: seed.repeat(16),
  };
}

async function registerAndLogin(app, email, seed = "a") {
  const material = fakeAuthMaterial(seed);
  await request(app).post("/api/auth/register").send({ email, ...material });
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email, authProof: material.authProof });
  return loginRes.body;
}

describe("POST /api/auth/register", () => {
  it("cria uma conta com o material de derivação de chave", async () => {
    const { app } = freshApp();
    const res = await request(app).post("/api/auth/register").send({
      email: "ana@example.com",
      ...fakeAuthMaterial(),
    });
    expect(res.status).toBe(201);
  });

  it("rejeita e-mail duplicado", async () => {
    const { app } = freshApp();
    const material = fakeAuthMaterial();
    await request(app).post("/api/auth/register").send({ email: "ana@example.com", ...material });
    const res = await request(app).post("/api/auth/register").send({ email: "ana@example.com", ...material });
    expect(res.status).toBe(409);
  });

  it("rejeita iterações de KDF abaixo do mínimo seguro", async () => {
    const { app } = freshApp();
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "b@example.com", ...fakeAuthMaterial(), kdfIterations: 100 });
    expect(res.status).toBe(400);
  });

  it("nunca retorna o auth_hash na resposta", async () => {
    const { app } = freshApp();
    const res = await request(app).post("/api/auth/register").send({
      email: "c@example.com",
      ...fakeAuthMaterial(),
    });
    expect(JSON.stringify(res.body)).not.toMatch(/\$2b\$/);
  });
});

describe("POST /api/auth/login", () => {
  it("devolve o material de derivação de chave após login bem-sucedido", async () => {
    const { app } = freshApp();
    const material = fakeAuthMaterial();
    await request(app).post("/api/auth/register").send({ email: "d@example.com", ...material });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "d@example.com", authProof: material.authProof });

    expect(res.status).toBe(200);
    expect(res.body.kdfSalt).toBe(material.kdfSalt);
    expect(res.body.kdfIterations).toBe(material.kdfIterations);
    expect(res.body.wrappedVaultKey).toBe(material.wrappedVaultKey);
  });

  it("não devolve material de chave se o authProof estiver errado", async () => {
    const { app } = freshApp();
    await request(app).post("/api/auth/register").send({ email: "e@example.com", ...fakeAuthMaterial() });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "e@example.com", authProof: "z".repeat(32) });

    expect(res.status).toBe(401);
    expect(res.body.wrappedVaultKey).toBeUndefined();
  });

  it("com 2FA ativo, não devolve nada sensível antes do código ser confirmado", async () => {
    const { app } = freshApp();
    const material = fakeAuthMaterial();
    await request(app).post("/api/auth/register").send({ email: "f@example.com", ...material });
    const first = await request(app)
      .post("/api/auth/login")
      .send({ email: "f@example.com", authProof: material.authProof });

    const setupRes = await request(app)
      .post("/api/auth/2fa/setup")
      .set("Authorization", `Bearer ${first.body.accessToken}`);
    const validCode = await generate({ secret: setupRes.body.secret });
    await request(app)
      .post("/api/auth/2fa/verify")
      .set("Authorization", `Bearer ${first.body.accessToken}`)
      .send({ code: validCode });

    const loginWithout2fa = await request(app)
      .post("/api/auth/login")
      .send({ email: "f@example.com", authProof: material.authProof });

    expect(loginWithout2fa.body.totpRequired).toBe(true);
    expect(loginWithout2fa.body.wrappedVaultKey).toBeUndefined();
    expect(loginWithout2fa.body.kdfSalt).toBeUndefined();
  });
});

describe("CRUD do cofre", () => {
  it("cria, lista, atualiza e apaga um item", async () => {
    const { app } = freshApp();
    const { accessToken } = await registerAndLogin(app, "g@example.com");

    const createRes = await request(app)
      .post("/api/vault/items")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ciphertext: "cifra-inicial", iv: "iv-1" });
    expect(createRes.status).toBe(201);
    const itemId = createRes.body.id;

    const listRes = await request(app).get("/api/vault/items").set("Authorization", `Bearer ${accessToken}`);
    expect(listRes.body.items).toHaveLength(1);

    const updateRes = await request(app)
      .put(`/api/vault/items/${itemId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ciphertext: "cifra-atualizada", iv: "iv-2" });
    expect(updateRes.body.ciphertext).toBe("cifra-atualizada");

    const deleteRes = await request(app)
      .delete(`/api/vault/items/${itemId}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(deleteRes.status).toBe(200);

    const listAfterDelete = await request(app)
      .get("/api/vault/items")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(listAfterDelete.body.items).toHaveLength(0);
  });

  it("arquiva a versão anterior do item ao atualizar (histórico)", async () => {
    const { app } = freshApp();
    const { accessToken } = await registerAndLogin(app, "h@example.com");

    const createRes = await request(app)
      .post("/api/vault/items")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ciphertext: "versao-1", iv: "iv-1" });
    const itemId = createRes.body.id;

    await request(app)
      .put(`/api/vault/items/${itemId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ciphertext: "versao-2", iv: "iv-2" });

    const historyRes = await request(app)
      .get(`/api/vault/items/${itemId}/history`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(historyRes.body.history).toHaveLength(1);
    expect(historyRes.body.history[0].ciphertext).toBe("versao-1");
  });

  it("nunca expõe o cofre de um usuário para outro (isolamento)", async () => {
    const { app } = freshApp();
    const userA = await registerAndLogin(app, "isolamento-a@example.com", "a");
    const userB = await registerAndLogin(app, "isolamento-b@example.com", "b");

    const createRes = await request(app)
      .post("/api/vault/items")
      .set("Authorization", `Bearer ${userA.accessToken}`)
      .send({ ciphertext: "segredo-do-usuario-a", iv: "iv-1" });
    const itemId = createRes.body.id;

    // Usuário B não vê o item nem na listagem...
    const listAsB = await request(app).get("/api/vault/items").set("Authorization", `Bearer ${userB.accessToken}`);
    expect(listAsB.body.items).toHaveLength(0);

    // ...nem consegue acessar diretamente pelo ID, mesmo adivinhando-o.
    const updateAsB = await request(app)
      .put(`/api/vault/items/${itemId}`)
      .set("Authorization", `Bearer ${userB.accessToken}`)
      .send({ ciphertext: "tentativa-de-sobrescrever", iv: "iv-x" });
    expect(updateAsB.status).toBe(404);

    const deleteAsB = await request(app)
      .delete(`/api/vault/items/${itemId}`)
      .set("Authorization", `Bearer ${userB.accessToken}`);
    expect(deleteAsB.status).toBe(404);

    // ...e nem consegue ver o histórico de versões do item alheio.
    const historyAsB = await request(app)
      .get(`/api/vault/items/${itemId}/history`)
      .set("Authorization", `Bearer ${userB.accessToken}`);
    expect(historyAsB.status).toBe(404);
  });

  it("exige autenticação para todas as rotas do cofre", async () => {
    const { app } = freshApp();
    const res = await request(app).get("/api/vault/items");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/kdf-params", () => {
  it("devolve os parâmetros reais de derivação para um e-mail cadastrado", async () => {
    const { app } = freshApp();
    const material = fakeAuthMaterial();
    await request(app).post("/api/auth/register").send({ email: "kdf@example.com", ...material });

    const res = await request(app).get("/api/auth/kdf-params").query({ email: "kdf@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.kdfSalt).toBe(material.kdfSalt);
    expect(res.body.kdfIterations).toBe(material.kdfIterations);
  });

  it("devolve parâmetros plausíveis (não um erro) para e-mail inexistente, sem revelar que a conta não existe", async () => {
    const { app } = freshApp();
    const res = await request(app).get("/api/auth/kdf-params").query({ email: "nao-existe@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.kdfSalt).toBeDefined();
    expect(res.body.kdfIterations).toBeDefined();
  });

  it("os parâmetros falsos são determinísticos para o mesmo e-mail (mesma resposta sempre)", async () => {
    const { app } = freshApp();
    const res1 = await request(app).get("/api/auth/kdf-params").query({ email: "fantasma@example.com" });
    const res2 = await request(app).get("/api/auth/kdf-params").query({ email: "fantasma@example.com" });
    expect(res1.body.kdfSalt).toBe(res2.body.kdfSalt);
  });
});

describe("POST /api/auth/verify-current-password", () => {
  it("confirma a senha correta sem emitir nenhum token novo", async () => {
    const { app } = freshApp();
    const material = fakeAuthMaterial();
    await request(app).post("/api/auth/register").send({ email: "verify@example.com", ...material });
    const { accessToken } = await request(app)
      .post("/api/auth/login")
      .send({ email: "verify@example.com", authProof: material.authProof })
      .then((r) => r.body);

    const res = await request(app)
      .post("/api/auth/verify-current-password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ authProof: material.authProof });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    // O ponto central deste teste: a resposta nunca contém token nenhum —
    // essa rota existe justamente para NÃO emitir refresh tokens à toa.
    expect(res.body.accessToken).toBeUndefined();
    expect(res.body.refreshToken).toBeUndefined();
  });

  it("rejeita a senha errada", async () => {
    const { app } = freshApp();
    const material = fakeAuthMaterial();
    await request(app).post("/api/auth/register").send({ email: "verify2@example.com", ...material });
    const { accessToken } = await request(app)
      .post("/api/auth/login")
      .send({ email: "verify2@example.com", authProof: material.authProof })
      .then((r) => r.body);

    const res = await request(app)
      .post("/api/auth/verify-current-password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ authProof: "z".repeat(32) });

    expect(res.status).toBe(401);
  });

  it("exige autenticação", async () => {
    const { app } = freshApp();
    const res = await request(app).post("/api/auth/verify-current-password").send({ authProof: "qualquer" });
    expect(res.status).toBe(401);
  });

  it("REGRESSÃO: não cria nenhum refresh token novo no banco (a brecha corrigida)", async () => {
    const { app, vaultDb } = freshApp();
    const material = fakeAuthMaterial();
    await request(app).post("/api/auth/register").send({ email: "regressao@example.com", ...material });
    const { accessToken } = await request(app)
      .post("/api/auth/login")
      .send({ email: "regressao@example.com", authProof: material.authProof })
      .then((r) => r.body);

    const countBefore = vaultDb.prepare("SELECT COUNT(*) as n FROM refresh_tokens").get().n;

    await request(app)
      .post("/api/auth/verify-current-password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ authProof: material.authProof });

    const countAfter = vaultDb.prepare("SELECT COUNT(*) as n FROM refresh_tokens").get().n;
    expect(countAfter).toBe(countBefore);
  });
});

describe("POST /api/auth/change-master-password", () => {
  it("atualiza o material de chave e revoga todas as sessões existentes", async () => {
    const { app } = freshApp();
    const { accessToken, refreshToken } = await registerAndLogin(app, "i@example.com");

    const newMaterial = {
      newAuthProof: "z".repeat(32),
      newKdfSalt: "z".repeat(16),
      newKdfIterations: 600000,
      newWrappedVaultKey: "z".repeat(16),
    };

    const changeRes = await request(app)
      .post("/api/auth/change-master-password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(newMaterial);
    expect(changeRes.status).toBe(200);

    // O refresh token antigo deve ter sido revogado junto.
    const refreshRes = await request(app).post("/api/auth/refresh").send({ refreshToken });
    expect(refreshRes.status).toBe(401);

    // Login com a senha ANTIGA não funciona mais.
    const oldLoginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "i@example.com", authProof: fakeAuthMaterial().authProof });
    expect(oldLoginRes.status).toBe(401);

    // Login com a senha NOVA funciona e devolve o material atualizado.
    const newLoginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "i@example.com", authProof: newMaterial.newAuthProof });
    expect(newLoginRes.status).toBe(200);
    expect(newLoginRes.body.wrappedVaultKey).toBe(newMaterial.newWrappedVaultKey);
  });
});
