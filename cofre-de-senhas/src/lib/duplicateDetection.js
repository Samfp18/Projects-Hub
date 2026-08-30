/**
 * Recebe a lista de itens JÁ DECIFRADOS (nunca chame isto com dados
 * cifrados) e devolve um Set com os IDs dos itens que reutilizam uma
 * senha usada em outro item do cofre.
 */
export function findDuplicatePasswordIds(decryptedItems) {
  const countByPassword = new Map();
  for (const item of decryptedItems) {
    if (!item.password) continue;
    countByPassword.set(item.password, (countByPassword.get(item.password) || 0) + 1);
  }

  const duplicateIds = new Set();
  for (const item of decryptedItems) {
    if (item.password && countByPassword.get(item.password) > 1) {
      duplicateIds.add(item.id);
    }
  }
  return duplicateIds;
}
