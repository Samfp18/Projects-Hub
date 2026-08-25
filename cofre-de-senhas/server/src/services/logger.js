// O que é registrado aqui NUNCA inclui senha, hash completo, ou IP em texto
// puro. Só: prefixo de 5 caracteres (já anonimizado por design), quantos
// candidatos o HIBP retornou para aquele prefixo, hash do IP (ver hashIp.js)
// e timestamp. Suficiente para monitorar uso e abuso, insuficiente para
// identificar quem consultou o quê.

import { getDb, FieldValue } from "./firestore.js";

export async function logCheck({ ipHash, prefix, candidatesReturned }) {
  const db = getDb();
  if (!db) {
    console.log(`[log] consulta prefix=${prefix} candidatos=${candidatesReturned} ip=${ipHash}`);
    return;
  }

  try {
    await db.collection("pwned_checks").add({
      ipHash,
      prefix,
      candidatesReturned,
      timestamp: FieldValue.serverTimestamp(),
    });

    // Contador agregado num único documento — lemos ele em /api/stats sem
    // precisar varrer a coleção inteira (isso é o que faz a leitura de
    // estatísticas continuar rápida e barata mesmo com milhões de registros
    // acumulados: complexidade O(1) de leitura, não O(n)).
    await db.collection("stats").doc("summary").set(
      { totalChecks: FieldValue.increment(1) },
      { merge: true }
    );
  } catch (err) {
    console.error("[log] Falha ao registrar consulta no Firestore:", err.message);
  }
}

export async function logRateLimitHit({ ipHash }) {
  const db = getDb();
  if (!db) {
    console.log(`[log] rate limit atingido ip=${ipHash}`);
    return;
  }

  try {
    await db.collection("rate_limit_events").add({
      ipHash,
      timestamp: FieldValue.serverTimestamp(),
    });
    await db.collection("stats").doc("summary").set(
      { totalRateLimited: FieldValue.increment(1) },
      { merge: true }
    );
  } catch (err) {
    console.error("[log] Falha ao registrar rate-limit no Firestore:", err.message);
  }
}
