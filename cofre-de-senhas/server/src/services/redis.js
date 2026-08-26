// Conexão opcional com Redis, usada para tornar o rate limiting escalável
// horizontalmente. Sem isso, o rate limiter guarda a contagem em memória
// DENTRO DE CADA PROCESSO — funciona bem com uma única instância do
// backend (o cenário atual no Render free tier), mas quebra a garantia de
// limite se um dia houver mais de uma instância rodando: cada uma teria
// seu próprio contador, e alguém poderia burlar o limite alternando entre
// elas (ex: atrás de um load balancer).
//
// Se REDIS_URL não estiver definida, getRedisClient() retorna null e o
// rate limiter cai automaticamente para armazenamento em memória — o app
// continua funcionando normalmente, só sem a garantia de limite entre
// múltiplas instâncias.

import Redis from "ioredis";

let cachedClient = null;
let attempted = false;

export function getRedisClient() {
  if (cachedClient) return cachedClient;
  if (attempted) return null;
  attempted = true;

  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn(
      "[redis] REDIS_URL não definida — rate limiting usará armazenamento em memória (não escalável entre múltiplas instâncias)."
    );
    return null;
  }

  try {
    cachedClient = new Redis(url, {
      maxRetriesPerRequest: 1,
      lazyConnect: false,
    });
    cachedClient.on("error", (err) => {
      console.error("[redis] erro de conexão:", err.message);
    });
    return cachedClient;
  } catch (err) {
    console.error("[redis] falha ao inicializar cliente:", err.message);
    return null;
  }
}
