// Este contexto guarda, EM MEMÓRIA e nunca em localStorage:
// - accessToken / refreshToken (mesmo raciocínio do Guardião de Acessos)
// - a vaultKey desembrulhada (CryptoKey não-extraível — nem o próprio
//   código consegue puxar os bytes dela pra fora)
// - a senha mestra NUNCA fica guardada em lugar nenhum, nem em memória,
//   além do instante em que é digitada e usada para derivar as chaves.
//
// Auto-bloqueio: depois de X minutos sem interação (mouse/teclado), a
// vaultKey é apagada da memória — os itens do cofre ficam inacessíveis
// até a pessoa digitar a senha mestra de novo. Isso não desloga a sessão
// (o accessToken continua válido), só tranca a parte sensível.

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { vaultApi } from "../lib/vaultApi";
import {
  generateSaltBase64,
  deriveMasterKeyBits,
  deriveEncryptionKey,
  deriveAuthProof,
  generateVaultKey,
  wrapVaultKey,
  unwrapVaultKey,
  PBKDF2_ITERATIONS_DEFAULT,
} from "../lib/vaultCrypto";

const AUTO_LOCK_MS = 5 * 60 * 1000; // 5 minutos de inatividade

const VaultContext = createContext(null);

export function VaultProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [user, setUser] = useState(null);
  const [vaultKey, setVaultKey] = useState(null); // CryptoKey, null = trancado
  const [isLocked, setIsLocked] = useState(true);
  const inactivityTimer = useRef(null);

  const lock = useCallback(() => {
    setVaultKey(null);
    setIsLocked(true);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(lock, AUTO_LOCK_MS);
  }, [lock]);

  useEffect(() => {
    if (isLocked) return undefined;
    resetInactivityTimer();
    const events = ["mousedown", "keydown", "touchstart"];
    events.forEach((evt) => window.addEventListener(evt, resetInactivityTimer));
    return () => {
      events.forEach((evt) => window.removeEventListener(evt, resetInactivityTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [isLocked, resetInactivityTimer]);

  const register = useCallback(async (email, masterPassword) => {
    const kdfSalt = generateSaltBase64();
    const kdfIterations = PBKDF2_ITERATIONS_DEFAULT;
    const masterKeyBits = await deriveMasterKeyBits(masterPassword, kdfSalt, kdfIterations);
    const encryptionKey = await deriveEncryptionKey(masterKeyBits);
    const authProof = await deriveAuthProof(masterKeyBits);

    const newVaultKey = await generateVaultKey();
    const wrappedVaultKey = await wrapVaultKey(newVaultKey, encryptionKey);

    await vaultApi.register(email, authProof, kdfSalt, kdfIterations, wrappedVaultKey);
  }, []);

  // Login real: primeiro busca os parâmetros de derivação de chave
  // REAIS do servidor para este e-mail (rota pública /kdf-params — ver
  // server/src/routes/auth.js), depois deriva o authProof certo com
  // eles, e só então tenta autenticar.
  const loginWithMasterPassword = useCallback(async (email, masterPassword, totpCode) => {
    const { kdfSalt, kdfIterations } = await vaultApi.getKdfParams(email);
    const masterKeyBits = await deriveMasterKeyBits(masterPassword, kdfSalt, kdfIterations);
    const authProof = await deriveAuthProof(masterKeyBits);

    const result = await vaultApi.login(email, authProof, totpCode);
    if (result.totpRequired) {
      return { totpRequired: true };
    }

    const encryptionKey = await deriveEncryptionKey(masterKeyBits);
    const unwrappedVaultKey = await unwrapVaultKey(result.wrappedVaultKey, encryptionKey);

    setAccessToken(result.accessToken);
    setRefreshToken(result.refreshToken);
    setVaultKey(unwrappedVaultKey);
    setIsLocked(false);

    const me = await vaultApi.me(result.accessToken);
    setUser(me);

    return { totpRequired: false };
  }, []);

  // Desbloqueio: usado quando a sessão já existe (accessToken válido) mas
  // o cofre foi trancado por inatividade. Reautentica no servidor também
  // (não só localmente), então mesmo um token roubado não desbloquearia
  // o cofre sem a senha mestra de novo.
  const unlock = useCallback(
    async (masterPassword) => {
      if (!user) throw new Error("Não há sessão ativa para desbloquear.");
      const { kdfSalt, kdfIterations } = await vaultApi.getKdfParams(user.email);
      const masterKeyBits = await deriveMasterKeyBits(masterPassword, kdfSalt, kdfIterations);
      const encryptionKey = await deriveEncryptionKey(masterKeyBits);

      const authProof = await deriveAuthProof(masterKeyBits);
      const result = await vaultApi.login(user.email, authProof);
      if (result.totpRequired) {
        throw new Error("2FA necessário — faça login novamente.");
      }

      const unwrappedVaultKey = await unwrapVaultKey(result.wrappedVaultKey, encryptionKey);
      setVaultKey(unwrappedVaultKey);
      setIsLocked(false);
      // O login de desbloqueio emite um par de tokens novo — atualizamos
      // o estado com eles (em vez de descartá-los), senão ficaria um
      // refresh token válido gerado no servidor mas nunca usado pelo
      // cliente, o que não é um furo de segurança grave, mas é
      // desnecessário e vale evitar.
      setAccessToken(result.accessToken);
      setRefreshToken(result.refreshToken);
    },
    [user]
  );

  const logout = useCallback(async () => {
    if (refreshToken) {
      await vaultApi.logout(refreshToken).catch(() => {});
    }
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    lock();
  }, [refreshToken, lock]);

  return (
    <VaultContext.Provider
      value={{
        accessToken,
        refreshToken,
        user,
        vaultKey,
        isLocked,
        register,
        loginWithMasterPassword,
        unlock,
        lock,
        logout,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error("useVault precisa ser usado dentro de um VaultProvider");
  }
  return context;
}
