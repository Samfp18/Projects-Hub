import { Router } from "express";
import { requireAuth } from "../middleware/requireVaultAuth.js";
import { vaultItemSchema } from "../utils/vaultValidation.js";

// Nenhuma rota aqui jamais vê o conteúdo do item — só recebe e devolve
// `ciphertext`/`iv` como strings opacas. A decisão de "qual campo é o
// título, qual é a senha" é feita inteiramente no navegador, depois de
// decifrar. O servidor só sabe QUEM é o dono do item (user_id) e QUANDO
// ele mudou — nunca O QUE tem dentro.
export function createVaultRouter({ db }) {
  const router = Router();

  const insertItem = db.prepare(
    `INSERT INTO vault_items (user_id, ciphertext, iv, is_favorite, updated_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const getItemById = db.prepare("SELECT * FROM vault_items WHERE id = ? AND user_id = ?");
  const listItems = db.prepare(
    "SELECT * FROM vault_items WHERE user_id = ? ORDER BY updated_at DESC"
  );
  const updateItem = db.prepare(
    `UPDATE vault_items SET ciphertext = ?, iv = ?, is_favorite = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`
  );
  const deleteItem = db.prepare("DELETE FROM vault_items WHERE id = ? AND user_id = ?");
  const archiveVersion = db.prepare(
    "INSERT INTO vault_item_history (item_id, ciphertext, iv, archived_at) VALUES (?, ?, ?, ?)"
  );
  const listHistory = db.prepare(
    "SELECT id, ciphertext, iv, archived_at FROM vault_item_history WHERE item_id = ? ORDER BY archived_at DESC"
  );

  function serializeItem(row) {
    return {
      id: row.id,
      ciphertext: row.ciphertext,
      iv: row.iv,
      isFavorite: Boolean(row.is_favorite),
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    };
  }

  router.use(requireAuth);

  router.get("/items", (req, res) => {
    const rows = listItems.all(req.userId);
    res.json({ items: rows.map(serializeItem) });
  });

  router.post("/items", (req, res) => {
    const parsed = vaultItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { ciphertext, iv, isFavorite = false } = parsed.data;
    const now = Date.now();
    const result = insertItem.run(req.userId, ciphertext, iv, isFavorite ? 1 : 0, now, now);

    res.status(201).json(serializeItem(getItemById.get(result.lastInsertRowid, req.userId)));
  });

  router.put("/items/:id", (req, res) => {
    const item = getItemById.get(req.params.id, req.userId);
    if (!item) return res.status(404).json({ error: "Item não encontrado." });

    const parsed = vaultItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { ciphertext, iv, isFavorite = item.is_favorite === 1 } = parsed.data;

    // Arquiva a versão ANTERIOR antes de sobrescrever — é o que dá o
    // histórico (ex: "qual era a senha antes de eu trocar").
    archiveVersion.run(item.id, item.ciphertext, item.iv, Date.now());

    updateItem.run(ciphertext, iv, isFavorite ? 1 : 0, Date.now(), item.id, req.userId);
    res.json(serializeItem(getItemById.get(item.id, req.userId)));
  });

  router.delete("/items/:id", (req, res) => {
    const item = getItemById.get(req.params.id, req.userId);
    if (!item) return res.status(404).json({ error: "Item não encontrado." });

    deleteItem.run(item.id, req.userId);
    res.json({ message: "Item removido." });
  });

  router.get("/items/:id/history", (req, res) => {
    const item = getItemById.get(req.params.id, req.userId);
    if (!item) return res.status(404).json({ error: "Item não encontrado." });

    const history = listHistory.all(item.id);
    res.json({
      history: history.map((h) => ({
        id: h.id,
        ciphertext: h.ciphertext,
        iv: h.iv,
        archivedAt: h.archived_at,
      })),
    });
  });

  return router;
}
