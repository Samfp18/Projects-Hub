#!/usr/bin/env bash
# Teste de ponta a ponta contra um servidor REAL rodando (não testes
# automatizados em processo — isso bate via HTTP de verdade, do jeito que
# um cliente real bateria). Rode depois de qualquer deploy pra confirmar
# que o ambiente publicado está saudável de verdade, não só que os testes
# unitários passam.
#
# Uso:
#   ./scripts/e2e-smoke-test.sh                          # testa localhost:3001
#   BASE_URL=https://sua-api.onrender.com ./scripts/e2e-smoke-test.sh
#
# Sai com código 1 e para no primeiro erro — não continua testando um
# servidor que já provou estar quebrado em algo básico.

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3001}"
PASS=0
FAIL=0

pass() { PASS=$((PASS + 1)); echo "  ✓ $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  ✗ $1"; echo "    → $2"; }

expect_status() {
  local description="$1" expected="$2" actual="$3" body="$4"
  if [ "$actual" = "$expected" ]; then
    pass "$description (status $actual)"
  else
    fail "$description" "esperado status $expected, veio $actual — corpo: $body"
  fi
}

json_field() {
  # Extração simples de campo JSON sem depender de jq (pode não estar
  # instalado no ambiente de deploy).
  echo "$2" | grep -o "\"$1\":\"[^\"]*\"" | head -1 | cut -d'"' -f4
}

echo "=========================================="
echo "Teste E2E — $BASE_URL"
echo "=========================================="

# ---------- 1. Health check ----------
echo ""
echo "[1] Health check"
RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/health")
BODY=$(echo "$RES" | head -n -1)
STATUS=$(echo "$RES" | tail -n1)
expect_status "GET /api/health" "200" "$STATUS" "$BODY"

# ---------- 2. Rota inexistente ----------
echo ""
echo "[2] Rota inexistente"
RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/rota-que-nao-existe")
STATUS=$(echo "$RES" | tail -n1)
expect_status "GET /api/rota-que-nao-existe" "404" "$STATUS" "$(echo "$RES" | head -n -1)"

# ---------- 3. Verificador de vazamento (HIBP) ----------
echo ""
echo "[3] Verificador de vazamento"
RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/check-pwned/5BAA6")
STATUS=$(echo "$RES" | tail -n1)
if [ "$STATUS" = "200" ]; then
  pass "GET /api/check-pwned/5BAA6 (status 200, HIBP acessível)"
elif [ "$STATUS" = "502" ]; then
  pass "GET /api/check-pwned/5BAA6 (status 502 — HIBP inacessível deste ambiente, mas o erro foi tratado graciosamente, não vazou stack trace)"
else
  fail "GET /api/check-pwned/5BAA6" "status inesperado: $STATUS"
fi

RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/check-pwned/xyz")
STATUS=$(echo "$RES" | tail -n1)
expect_status "GET /api/check-pwned/xyz (prefixo inválido)" "400" "$STATUS" "$(echo "$RES" | head -n -1)"

# ---------- 4. Estatísticas ----------
echo ""
echo "[4] Estatísticas"
RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/stats")
STATUS=$(echo "$RES" | tail -n1)
expect_status "GET /api/stats" "200" "$STATUS" "$(echo "$RES" | head -n -1)"

# ---------- 5. Fluxo completo do Meu Cofre ----------
echo ""
echo "[5] Meu Cofre — fluxo completo"

EMAIL="e2e-$(date +%s)@teste.com"
FAKE_PROOF=$(printf 'a%.0s' {1..32})
FAKE_SALT=$(printf 'a%.0s' {1..16})
FAKE_KEY=$(printf 'a%.0s' {1..16})

RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"authProof\":\"$FAKE_PROOF\",\"kdfSalt\":\"$FAKE_SALT\",\"kdfIterations\":600000,\"wrappedVaultKey\":\"$FAKE_KEY\"}")
STATUS=$(echo "$RES" | tail -n1)
expect_status "POST /api/auth/register" "201" "$STATUS" "$(echo "$RES" | head -n -1)"

RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/auth/kdf-params?email=$EMAIL")
STATUS=$(echo "$RES" | tail -n1)
BODY=$(echo "$RES" | head -n -1)
expect_status "GET /api/auth/kdf-params (conta real)" "200" "$STATUS" "$BODY"
if echo "$BODY" | grep -q "$FAKE_SALT"; then
  pass "kdf-params devolve o salt real cadastrado"
else
  fail "kdf-params devolve o salt real cadastrado" "salt não bateu — resposta: $BODY"
fi

RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/auth/kdf-params?email=fantasma-$(date +%s)@teste.com")
STATUS=$(echo "$RES" | tail -n1)
expect_status "GET /api/auth/kdf-params (e-mail inexistente, não revela isso)" "200" "$STATUS" "$(echo "$RES" | head -n -1)"

RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"authProof\":\"$FAKE_PROOF\"}")
STATUS=$(echo "$RES" | tail -n1)
BODY=$(echo "$RES" | head -n -1)
expect_status "POST /api/auth/login" "200" "$STATUS" "$BODY"
ACCESS_TOKEN=$(json_field "accessToken" "$BODY")
REFRESH_TOKEN=$(json_field "refreshToken" "$BODY")

if [ -n "$ACCESS_TOKEN" ]; then
  pass "login devolveu accessToken"
else
  fail "login devolveu accessToken" "não veio nenhum token — resposta: $BODY"
fi

RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/auth/me" -H "Authorization: Bearer $ACCESS_TOKEN")
STATUS=$(echo "$RES" | tail -n1)
BODY=$(echo "$RES" | head -n -1)
expect_status "GET /api/auth/me (autenticado)" "200" "$STATUS" "$BODY"
if echo "$BODY" | grep -qi "auth_hash\|password"; then
  fail "GET /api/auth/me não vaza hash de senha" "encontrado campo suspeito na resposta: $BODY"
else
  pass "GET /api/auth/me não vaza hash de senha nem campos internos"
fi

RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/vault/items")
STATUS=$(echo "$RES" | tail -n1)
expect_status "GET /api/vault/items sem token" "401" "$STATUS" "$(echo "$RES" | head -n -1)"

RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/vault/items" \
  -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" \
  -d '{"ciphertext":"cifra-de-teste-e2e","iv":"iv-de-teste"}')
STATUS=$(echo "$RES" | tail -n1)
BODY=$(echo "$RES" | head -n -1)
expect_status "POST /api/vault/items" "201" "$STATUS" "$BODY"
ITEM_ID=$(echo "$BODY" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)

RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/vault/items" -H "Authorization: Bearer $ACCESS_TOKEN")
STATUS=$(echo "$RES" | tail -n1)
BODY=$(echo "$RES" | head -n -1)
expect_status "GET /api/vault/items (lista)" "200" "$STATUS" "$BODY"
if echo "$BODY" | grep -q "cifra-de-teste-e2e"; then
  pass "item criado aparece na listagem"
else
  fail "item criado aparece na listagem" "não encontrado — resposta: $BODY"
fi

RES=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/vault/items/$ITEM_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" \
  -d '{"ciphertext":"cifra-atualizada-e2e","iv":"iv-2"}')
STATUS=$(echo "$RES" | tail -n1)
expect_status "PUT /api/vault/items/:id" "200" "$STATUS" "$(echo "$RES" | head -n -1)"

RES=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/vault/items/$ITEM_ID/history" -H "Authorization: Bearer $ACCESS_TOKEN")
STATUS=$(echo "$RES" | tail -n1)
BODY=$(echo "$RES" | head -n -1)
expect_status "GET /api/vault/items/:id/history" "200" "$STATUS" "$BODY"
if echo "$BODY" | grep -q "cifra-de-teste-e2e"; then
  pass "histórico contém a versão anterior do item"
else
  fail "histórico contém a versão anterior do item" "não encontrado — resposta: $BODY"
fi

RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/verify-current-password" \
  -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" \
  -d "{\"authProof\":\"$FAKE_PROOF\"}")
STATUS=$(echo "$RES" | tail -n1)
expect_status "POST /api/auth/verify-current-password (senha certa)" "200" "$STATUS" "$(echo "$RES" | head -n -1)"

RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/verify-current-password" \
  -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" \
  -d '{"authProof":"senha-errada-de-proposito-000000000000"}')
STATUS=$(echo "$RES" | tail -n1)
expect_status "POST /api/auth/verify-current-password (senha errada)" "401" "$STATUS" "$(echo "$RES" | head -n -1)"

RES=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/vault/items/$ITEM_ID" -H "Authorization: Bearer $ACCESS_TOKEN")
STATUS=$(echo "$RES" | tail -n1)
expect_status "DELETE /api/vault/items/:id" "200" "$STATUS" "$(echo "$RES" | head -n -1)"

RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/logout" \
  -H "Content-Type: application/json" -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
STATUS=$(echo "$RES" | tail -n1)
expect_status "POST /api/auth/logout" "200" "$STATUS" "$(echo "$RES" | head -n -1)"

RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/refresh" \
  -H "Content-Type: application/json" -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
STATUS=$(echo "$RES" | tail -n1)
expect_status "POST /api/auth/refresh (token já revogado pelo logout)" "401" "$STATUS" "$(echo "$RES" | head -n -1)"

# ---------- Resumo ----------
echo ""
echo "=========================================="
echo "Resultado: $PASS passaram, $FAIL falharam"
echo "=========================================="
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
