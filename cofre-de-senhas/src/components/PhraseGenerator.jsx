import { useEffect, useState } from "react";
import { generatePasswordFromPhrase } from "../lib/generateFromPhrase";
import { analyzePassword } from "../lib/analyze";
import Stamp from "./Stamp";

const initialOptions = {
  length: 20,
  useUpper: true,
  useDigits: true,
  useSymbols: true,
  removeSpaces: true,
  pad: true,
};

export default function PhraseGenerator() {
  const [phrase, setPhrase] = useState("");
  const [options, setOptions] = useState(initialOptions);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [reveal, setReveal] = useState(false);

  function regenerate(currentPhrase = phrase, opts = options) {
    if (!currentPhrase.trim()) {
      setPassword("");
      setError("");
      return;
    }
    try {
      setPassword(generatePasswordFromPhrase(currentPhrase, opts));
      setError("");
    } catch (err) {
      setPassword("");
      setError(err.message);
    }
  }

  useEffect(() => {
    regenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateOption(key, value) {
    const next = { ...options, [key]: value };
    setOptions(next);
    regenerate(phrase, next);
  }

  function handlePhraseChange(value) {
    setPhrase(value);
    regenerate(value, options);
  }

  async function handleCopy() {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    if (!password) {
      setAnalysis(null);
      return;
    }
    let cancelled = false;
    analyzePassword(password).then((result) => {
      if (!cancelled) setAnalysis(result);
    });
    return () => {
      cancelled = true;
    };
  }, [password]);

  return (
    <div className="grain bg-panel rounded-lg border border-hairline p-6 md:p-8 flex flex-col gap-6">
      <div>
        <p className="font-display text-xs tracking-[0.3em] text-hazard mb-2">CASO Nº 03 — TRANSFORMAÇÃO</p>
        <h2 className="font-body text-2xl md:text-3xl font-semibold text-paper">
          Gerar a partir de uma frase
        </h2>
        <p className="font-body text-sm text-paper-dim mt-2">
          Digite algo que você lembra facilmente. Nós transformamos em algo
          bem menos óbvio para quem tenta adivinhar.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="phrase-input" className="font-mono text-xs text-paper-dim uppercase tracking-wider">
          Frase base
        </label>
        <input
          id="phrase-input"
          type="text"
          value={phrase}
          onChange={(e) => handlePhraseChange(e.target.value)}
          placeholder="ex: meu cachorro adora praia no verão"
          autoComplete="off"
          spellCheck="false"
          className="bg-ink border border-hairline rounded-sm px-4 py-3 font-mono text-paper placeholder:text-paper-dim/50 focus:outline-none focus:ring-2 focus:ring-hazard"
        />
        <p className="font-body text-xs text-paper-dim">
          Evite frases públicas ou fáceis de associar a você (letra de música,
          citação famosa, seu próprio nome). Quanto mais pessoal e sem
          sentido para os outros, melhor.
        </p>
      </div>

      {error && <p className="font-mono text-sm text-danger">{error}</p>}

      {password && (
        <>
          <div className="bg-ink border border-hairline rounded-sm px-4 py-4 flex items-center justify-between gap-3">
            <code className="font-mono text-lg md:text-xl text-paper break-all">
              {reveal ? password : "•".repeat(password.length)}
            </code>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                className="px-3 py-2 rounded-sm border border-hairline text-paper-dim hover:text-paper hover:border-paper-dim transition-colors font-mono text-sm"
                aria-pressed={reveal}
                aria-label={reveal ? "Ocultar senha" : "Revelar senha"}
                title={reveal ? "Ocultar" : "Revelar"}
              >
                {reveal ? "ocultar" : "revelar"}
              </button>
              <button
                type="button"
                onClick={() => regenerate()}
                className="px-3 py-2 rounded-sm border border-hairline text-paper-dim hover:text-paper hover:border-paper-dim transition-colors font-mono text-sm"
                aria-label="Gerar variação nova"
                title="Gerar variação nova"
              >
                ↻
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-2 rounded-sm border border-hazard text-hazard hover:bg-hazard hover:text-ink transition-colors font-mono text-sm"
              >
                {copied ? "copiado ✓" : "copiar"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <div className="flex justify-between font-mono text-xs text-paper-dim uppercase tracking-wider mb-2">
                <label htmlFor="min-length-range">Comprimento mínimo</label>
                <span className="text-paper">{options.length}</span>
              </div>
              <input
                id="min-length-range"
                type="range"
                min={8}
                max={48}
                value={options.length}
                onChange={(e) => updateOption("length", Number(e.target.value))}
                className="w-full accent-[var(--color-hazard)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-sm">
              <Checkbox
                label="Maiúsculas aleatórias"
                checked={options.useUpper}
                onChange={(v) => updateOption("useUpper", v)}
              />
              <Checkbox
                label="Trocar por números (a→4, e→3…)"
                checked={options.useDigits}
                onChange={(v) => updateOption("useDigits", v)}
              />
              <Checkbox
                label="Trocar por símbolos (a→@, s→$…)"
                checked={options.useSymbols}
                onChange={(v) => updateOption("useSymbols", v)}
              />
              <Checkbox
                label="Remover espaços (senão viram '-')"
                checked={options.removeSpaces}
                onChange={(v) => updateOption("removeSpaces", v)}
              />
              <Checkbox
                label="Completar com caracteres aleatórios"
                checked={options.pad}
                onChange={(v) => updateOption("pad", v)}
              />
            </div>
          </div>

          {analysis && (
            <div className="flex items-center gap-6 border-t border-hairline pt-5">
              <Stamp label={analysis.label} />
              <p className="font-mono text-sm text-paper-dim">
                {analysis.entropyBits} bits · quebra estimada em {analysis.crackTime}
              </p>
            </div>
          )}

          {!options.pad && (
            <p className="font-body text-xs text-hazard">
              ⚠ Sem preenchimento aleatório, esta senha depende inteiramente
              da frase escolhida — se alguém souber ou adivinhar a frase, a
              senha cai junto. A estimativa de bits acima assume caracteres
              aleatórios, não uma frase real, e por isso é otimista demais
              para este caso.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-paper-dim hover:text-paper transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-[var(--color-hazard)] w-4 h-4"
      />
      {label}
    </label>
  );
}
