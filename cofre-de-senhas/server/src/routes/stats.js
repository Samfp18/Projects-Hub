import { Router } from "express";
import { getDb } from "../services/firestore.js";

const router = Router();

router.get("/stats", async (req, res) => {
  const db = getDb();
  if (!db) {
    return res.json({
      available: false,
      message: "Estatísticas indisponíveis (Firestore não configurado neste ambiente).",
    });
  }

  try {
    const doc = await db.collection("stats").doc("summary").get();
    const data = doc.exists ? doc.data() : {};
    res.json({
      available: true,
      totalChecks: data.totalChecks || 0,
      totalRateLimited: data.totalRateLimited || 0,
    });
  } catch (err) {
    console.error("[stats] erro ao ler Firestore:", err.message);
    res.status(500).json({ available: false, message: "Erro ao ler estatísticas." });
  }
});

export default router;
