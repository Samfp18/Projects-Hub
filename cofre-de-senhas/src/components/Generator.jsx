import { useEffect, useState } from "react";
import { generatePassword } from "../lib/generate";
import { analyzePassword } from "../lib/analyze";
import { useLanguage } from "../i18n/LanguageContext";
import Stamp from "./Stamp";

const initialOptions = {
  length: 16,
  useLower: true,
  useUpper: true,
  useDigits: true,
  useSymbols: true,
  excludeAmbiguous: true,
};

export default function Generator() {
  const { t } = useLanguage();
  const [options, setOptions] = useState(initialOptions);
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [reveal, setReveal] = useState(false);

  function regenerate(opts = options) {
    try {
      setPassword(generatePassword(opts));
    } catch {
      setPassword("");
    }
  }

  useEffect(() => {
    regenerate(initialOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateOption(key, value) {
    const next = { ...options, [key]: value };
    setOptions(next);
    regenerate(next);
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
        <p className="font-display text-xs tracking-[0.3em] text-hazard mb-2">{t("generatorCaseLabel")}</p>
        <h2 className="font-body text-2xl md:text-3xl font-semibold text-paper">
          {t("generatorTitle")}
        </h2>
      </div>

      <div className="bg-ink border border-hairline rounded-sm px-4 py-4 flex items-center justify-between gap-3">
        <code className="font-mono text-lg md:text-xl text-paper break-all">
          {!password ? "—" : reveal ? password : "•".repeat(password.length)}
        </code>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            className="px-3 py-2 rounded-sm border border-hairline text-paper-dim hover:text-paper hover:border-paper-dim transition-colors font-mono text-sm"
            aria-pressed={reveal}
            aria-label={reveal ? t("hide") : t("reveal")}
            title={reveal ? t("hide") : t("reveal")}
          >
            {reveal ? t("hide") : t("reveal")}
          </button>
          <button
            type="button"
            onClick={() => regenerate()}
            className="px-3 py-2 rounded-sm border border-hairline text-paper-dim hover:text-paper hover:border-paper-dim transition-colors font-mono text-sm"
            aria-label={t("regenerate")}
            title={t("regenerate")}
          >
            ↻
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-2 rounded-sm border border-hazard text-hazard hover:bg-hazard hover:text-ink transition-colors font-mono text-sm"
          >
            {copied ? t("copied") : t("copy")}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <div className="flex justify-between font-mono text-xs text-paper-dim uppercase tracking-wider mb-2">
            <label htmlFor="length-range">{t("lengthLabel")}</label>
            <span className="text-paper">{options.length}</span>
          </div>
          <input
            id="length-range"
            type="range"
            min={8}
            max={64}
            value={options.length}
            onChange={(e) => updateOption("length", Number(e.target.value))}
            className="w-full accent-[var(--color-hazard)]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 font-mono text-sm">
          <Checkbox label={t("optionLower")} checked={options.useLower} onChange={(v) => updateOption("useLower", v)} />
          <Checkbox label={t("optionUpper")} checked={options.useUpper} onChange={(v) => updateOption("useUpper", v)} />
          <Checkbox label={t("optionDigits")} checked={options.useDigits} onChange={(v) => updateOption("useDigits", v)} />
          <Checkbox label={t("optionSymbols")} checked={options.useSymbols} onChange={(v) => updateOption("useSymbols", v)} />
          <Checkbox
            label={t("optionExcludeAmbiguous")}
            checked={options.excludeAmbiguous}
            onChange={(v) => updateOption("excludeAmbiguous", v)}
          />
        </div>
      </div>

      {analysis && (
        <div className="flex items-center gap-6 border-t border-hairline pt-5">
          <Stamp label={analysis.label} />
          <p className="font-mono text-sm text-paper-dim">
            {analysis.entropyBits} bits · {analysis.crackTime}
          </p>
        </div>
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
