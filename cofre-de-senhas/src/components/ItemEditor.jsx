import { useState } from "react";
import { generatePassword } from "../lib/generate";
import { analyzePassword } from "../lib/analyze";

const emptyItem = { title: "", username: "", password: "", url: "", notes: "" };

export default function ItemEditor({ initialItem, onSave, onCancel }) {
  const [item, setItem] = useState(initialItem || emptyItem);
  const [showPassword, setShowPassword] = useState(false);
  const [strength, setStrength] = useState(null);
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setItem((prev) => ({ ...prev, [field]: value }));
    if (field === "password" && value) {
      analyzePassword(value).then(setStrength);
    }
  }

  function handleGenerate() {
    const generated = generatePassword({ length: 20 });
    update("password", generated);
    setShowPassword(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!item.title.trim()) return;
    setSaving(true);
    try {
      await onSave(item);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-panel rounded-2xl border border-hairline p-6 flex flex-col gap-4">
      <h3 className="font-mono text-xl font-semibold text-paper">
        {initialItem ? "Editar item" : "Novo item"}
      </h3>

      <div className="flex flex-col gap-1.5">
        <label className="font-mono text-xs text-paper-dim uppercase tracking-wider">Título</label>
        <input
          type="text"
          required
          value={item.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="ex: GitHub, Netflix, Wi-Fi de casa"
          className="bg-ink border border-hairline rounded-lg px-4 py-3 text-paper focus:outline-none focus:ring-2 focus:ring-hazard"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-mono text-xs text-paper-dim uppercase tracking-wider">Usuário / e-mail</label>
        <input
          type="text"
          value={item.username}
          onChange={(e) => update("username", e.target.value)}
          className="bg-ink border border-hairline rounded-lg px-4 py-3 text-paper focus:outline-none focus:ring-2 focus:ring-hazard"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-mono text-xs text-paper-dim uppercase tracking-wider">Senha</label>
        <div className="flex gap-2">
          <input
            type={showPassword ? "text" : "password"}
            value={item.password}
            onChange={(e) => update("password", e.target.value)}
            className="flex-1 bg-ink border border-hairline rounded-lg px-4 py-3 text-paper font-mono focus:outline-none focus:ring-2 focus:ring-hazard"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="px-3 rounded-lg border border-hairline text-paper-dim hover:text-paper text-sm"
          >
            {showPassword ? "ocultar" : "ver"}
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            className="px-3 rounded-lg border border-hazard text-hazard hover:bg-hazard hover:text-ink transition-colors text-sm"
          >
            gerar
          </button>
        </div>
        {strength && (
          <p className="font-mono text-xs text-paper-dim">
            Força: <span className="text-hazard">{strength.label}</span>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-mono text-xs text-paper-dim uppercase tracking-wider">URL do site</label>
        <input
          type="url"
          value={item.url}
          onChange={(e) => update("url", e.target.value)}
          placeholder="https://"
          className="bg-ink border border-hairline rounded-lg px-4 py-3 text-paper focus:outline-none focus:ring-2 focus:ring-hazard"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-mono text-xs text-paper-dim uppercase tracking-wider">Notas</label>
        <textarea
          value={item.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={3}
          className="bg-ink border border-hairline rounded-lg px-4 py-3 text-paper focus:outline-none focus:ring-2 focus:ring-hazard resize-none"
        />
      </div>

      <div className="flex gap-3 mt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-hazard text-ink font-mono font-semibold py-3 rounded-full hover:brightness-110 transition-all disabled:opacity-60"
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 rounded-full border border-hairline text-paper-dim hover:text-paper"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
