// Conexão com o Firestore para logs agregados e contadores de uso.
// Se a variável de ambiente FIREBASE_SERVICE_ACCOUNT não estiver definida,
// getDb() retorna null e o resto da aplicação segue funcionando
// normalmente (só sem persistir logs) — isso evita que o proxy do HIBP
// fique fora do ar por causa de uma credencial de banco não configurada.

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

let cachedDb = null;
let attempted = false;

export function getDb() {
  if (cachedDb) return cachedDb;
  if (attempted) return null;
  attempted = true;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.warn(
      "[firestore] FIREBASE_SERVICE_ACCOUNT não definida — logs de segurança não serão persistidos, apenas exibidos no console."
    );
    return null;
  }

  try {
    const serviceAccount = JSON.parse(raw);
    if (getApps().length === 0) {
      initializeApp({ credential: cert(serviceAccount) });
    }
    cachedDb = getFirestore();
    return cachedDb;
  } catch (err) {
    console.error("[firestore] Falha ao inicializar Firestore:", err.message);
    return null;
  }
}

export { FieldValue };
