import { useState } from "react";
import Checker from "./components/Checker";
import Generator from "./components/Generator";
import PhraseGenerator from "./components/PhraseGenerator";

const TABS = [
  { id: "checker", label: "Analisar" },
  { id: "generator", label: "Gerar" },
  { id: "phrase", label: "A partir de frase" },
];

export default function App() {
  const [tab, setTab] = useState("checker");

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10 md:py-16">
      <header className="w-full max-w-3xl mb-8 md:mb-12">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-2 rounded-full bg-hazard" aria-hidden="true" />
          <p className="font-mono text-xs tracking-[0.3em] text-paper-dim uppercase">
            Dossiê de segurança de senhas
          </p>
        </div>
        <h1 className="font-body text-4xl md:text-5xl font-bold text-paper leading-tight">
          Cofre de Senhas
        </h1>
        <p className="font-body text-paper-dim mt-3 max-w-xl">
          Avalie a resistência de uma senha ou emita uma nova, criptograficamente
          segura. Tudo processado localmente no seu navegador — nada é enviado
          a servidor algum.
        </p>
      </header>

      <nav className="w-full max-w-3xl flex gap-1 mb-[-1px] relative z-10" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`font-mono text-xs tracking-[0.2em] uppercase px-5 py-3 rounded-t-md border border-b-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-hazard ${
              tab === t.id
                ? "bg-panel text-paper border-hairline"
                : "bg-transparent text-paper-dim border-transparent hover:text-paper"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="w-full max-w-3xl">
        {tab === "checker" && <Checker />}
        {tab === "generator" && <Generator />}
        {tab === "phrase" && <PhraseGenerator />}
      </main>

      <footer className="w-full max-w-3xl mt-10 font-mono text-xs text-paper-dim/70 flex flex-col gap-1">
        <p>
          Processamento 100% local · verificação de vazamentos via modelo de
          k-anonimato (Have I Been Pwned).
        </p>
        <p>Projeto educacional de código aberto — sem garantias, use por sua conta e risco.</p>
      </footer>
    </div>
  );
}
