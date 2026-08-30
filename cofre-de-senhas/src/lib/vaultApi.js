const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3003";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `Erro ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return data;
}

function authHeader(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
}

export const vaultApi = {
  getKdfParams: (email) => request(`/api/auth/kdf-params?email=${encodeURIComponent(email)}`),

  register: (email, authProof, kdfSalt, kdfIterations, wrappedVaultKey) =>
    request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, authProof, kdfSalt, kdfIterations, wrappedVaultKey }),
    }),

  login: (email, authProof, totpCode) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, authProof, totpCode }) }),

  verifyCurrentPassword: (accessToken, authProof) =>
    request("/api/auth/verify-current-password", {
      method: "POST",
      headers: authHeader(accessToken),
      body: JSON.stringify({ authProof }),
    }),

  refresh: (refreshToken) =>
    request("/api/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken }) }),

  logout: (refreshToken) =>
    request("/api/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }),

  me: (accessToken) => request("/api/auth/me", { headers: authHeader(accessToken) }),

  setup2fa: (accessToken) =>
    request("/api/auth/2fa/setup", { method: "POST", headers: authHeader(accessToken) }),

  verify2fa: (accessToken, code) =>
    request("/api/auth/2fa/verify", {
      method: "POST",
      headers: authHeader(accessToken),
      body: JSON.stringify({ code }),
    }),

  changeMasterPassword: (accessToken, payload) =>
    request("/api/auth/change-master-password", {
      method: "POST",
      headers: authHeader(accessToken),
      body: JSON.stringify(payload),
    }),

  listItems: (accessToken) => request("/api/vault/items", { headers: authHeader(accessToken) }),

  createItem: (accessToken, ciphertext, iv) =>
    request("/api/vault/items", {
      method: "POST",
      headers: authHeader(accessToken),
      body: JSON.stringify({ ciphertext, iv }),
    }),

  updateItem: (accessToken, id, ciphertext, iv, isFavorite) =>
    request(`/api/vault/items/${id}`, {
      method: "PUT",
      headers: authHeader(accessToken),
      body: JSON.stringify({ ciphertext, iv, isFavorite }),
    }),

  deleteItem: (accessToken, id) =>
    request(`/api/vault/items/${id}`, { method: "DELETE", headers: authHeader(accessToken) }),

  getItemHistory: (accessToken, id) =>
    request(`/api/vault/items/${id}/history`, { headers: authHeader(accessToken) }),
};
