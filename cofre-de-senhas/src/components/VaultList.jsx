import { useCallback, useEffect, useState } from "react";
import { useVault } from "../context/VaultContext";
import { vaultApi } from "../lib/vaultApi";
import { encryptItem, decryptItem } from "../lib/vaultCrypto";
import { findDuplicatePasswordIds } from "../lib/duplicateDetection";
import { copyWithAutoClear } from "../lib/clipboard";
import { checkPwned } from "../lib/pwnedCheck";
import ItemEditor from "./ItemEditor";

export default function VaultList() {
  const { accessToken, vaultKey } = useVault();
  const [items, setItems] = useState([]); // itens JÁ DECIFRADOS, em memória
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingItem, setEditingItem] = useState(null); // null | "new" | item
  const [copiedId, setCopiedId] = useState(null);
  const [pwnedResults, setPwnedResults] = useState({}); // id -> {pwned, count}

  const loadItems = useCallback(async () => {
    setLoading(true);
    const { items: rawItems } = await vaultApi.listItems(accessToken);
    const decrypted = await Promise.all(
      rawItems.map(async (raw) => ({
        ...(await decryptItem(raw.ciphertext, raw.iv, vaultKey)),
        id: raw.id,
        isFavorite: raw.isFavorite,
      }))
    );
    setItems(decrypted);
    setLoading(false);
  }, [accessToken, vaultKey]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function handleSaveNew(itemData) {
    const { ciphertext, iv } = await encryptItem(itemData, vaultKey);
    await vaultApi.createItem(accessToken, ciphertext, iv);
    setEditingItem(null);
    await loadItems();
  }

  async function handleSaveEdit(id, itemData) {
    const { ciphertext, iv } = await encryptItem(itemData, vaultKey);
    await vaultApi.updateItem(accessToken, id, ciphertext, iv);
    setEditingItem(null);
    await loadItems();
  }

  async function handleDelete(id) {
    if (!confirm("Apagar este item? Essa ação não pode ser desfeita.")) return;
    await vaultApi.deleteItem(accessToken, id);
    await loadItems();
  }

  async function handleToggleFavorite(item) {
    const { ciphertext, iv } = await encryptItem(item, vaultKey);
    await vaultApi.updateItem(accessToken, item.id, ciphertext, iv, !item.isFavorite);
    await loadItems();
  }

  async function handleCopyPassword(item) {
    await copyWithAutoClear(item.password);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleCheckBreach(item) {
    try {
      const result = await checkPwned(item.password);
      setPwnedResults((prev) => ({ ...prev, [item.id]: result }));
    } catch {
      setPwnedResults((prev) => ({ ...prev, [item.id]: { error: true } }));
    }
  }

  const duplicateIds = findDuplicatePasswordIds(items);
  const filtered = items
    .filter((item) => item.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite));

  if (editingItem === "new") {
    return <ItemEditor onSave={handleSaveNew} onCancel={() => setEditingItem(null)} />;
  }
  if (editingItem) {
    return (
      <ItemEditor
        initialItem={editingItem}
        onSave={(data) => handleSaveEdit(editingItem.id, data)}
        onCancel={() => setEditingItem(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar no cofre…"
          className="flex-1 bg-panel border border-hairline rounded-full px-5 py-3 text-paper focus:outline-none focus:ring-2 focus:ring-hazard"
        />
        <button
          type="button"
          onClick={() => setEditingItem("new")}
          className="bg-hazard text-ink font-mono font-semibold px-5 rounded-full hover:brightness-110 transition-all shrink-0"
        >
          + Novo
        </button>
      </div>

      {loading && <p className="font-body text-sm text-paper-dim text-center py-8">Decifrando seu cofre…</p>}

      {!loading && filtered.length === 0 && (
        <p className="font-body text-sm text-paper-dim text-center py-8">
          {items.length === 0 ? "Seu cofre está vazio. Crie o primeiro item." : "Nada encontrado."}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {filtered.map((item) => (
          <li key={item.id} className="bg-panel rounded-2xl border border-hairline p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-mono text-lg font-semibold text-paper truncate">{item.title}</h3>
                  {item.isFavorite && <span className="text-hazard" aria-label="Favorito">★</span>}
                  {duplicateIds.has(item.id) && (
                    <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-danger text-danger">
                      senha repetida
                    </span>
                  )}
                  {pwnedResults[item.id]?.pwned && (
                    <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-danger text-danger">
                      vazada
                    </span>
                  )}
                </div>
                {item.username && <p className="font-body text-sm text-paper-dim">{item.username}</p>}
              </div>
              <button
                type="button"
                onClick={() => handleToggleFavorite(item)}
                className="text-paper-dim hover:text-hazard shrink-0"
                aria-label={item.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              >
                ★
              </button>
            </div>

            <div className="flex gap-2 mt-3 flex-wrap">
              <button
                type="button"
                onClick={() => handleCopyPassword(item)}
                className="font-mono text-xs uppercase tracking-wider border border-hairline text-paper-dim hover:text-paper px-3 py-2 rounded-full transition-colors"
              >
                {copiedId === item.id ? "copiado ✓" : "copiar senha"}
              </button>
              <button
                type="button"
                onClick={() => handleCheckBreach(item)}
                className="font-mono text-xs uppercase tracking-wider border border-hairline text-paper-dim hover:text-paper px-3 py-2 rounded-full transition-colors"
              >
                checar vazamento
              </button>
              <button
                type="button"
                onClick={() => setEditingItem(item)}
                className="font-mono text-xs uppercase tracking-wider border border-hairline text-paper-dim hover:text-paper px-3 py-2 rounded-full transition-colors"
              >
                editar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="font-mono text-xs uppercase tracking-wider border border-hairline text-danger hover:bg-danger hover:text-ink px-3 py-2 rounded-full transition-colors"
              >
                apagar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
