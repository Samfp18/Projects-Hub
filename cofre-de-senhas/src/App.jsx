import { useState } from "react";
import Checker from "./components/Checker";
import Generator from "./components/Generator";
import PhraseGenerator from "./components/PhraseGenerator";
import { LanguageProvider, useLanguage } from "./i18n/LanguageContext";

function AppContent() {
  const [tab, setTab] = useState("checker");
  const { lang, setLang, t } = useLanguage();

  const TABS = [
    { id: "checker", label: t("tabChecker") },
    { id: "generator", label: t("tabGenerator") },
    { id: "phrase", label: t("tabPhrase") },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10 md:py-16">
      <header className="w-full max-w-3xl mb-8 md:mb-12">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-hazard" aria-hidden="true" />
            <p className="font-mono text-xs tracking-[0.3em] text-paper-dim uppercase">
              {t("eyebrow")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLang(lang === "pt" ? "en" : "pt")}
            className="font-mono text-xs tracking-wider uppercase px-3 py-1.5 rounded-sm border border-hairline text-paper-dim hover:text-paper hover:border-paper-dim transition-colors"
            aria-label="Alternar idioma / Switch language"
          >
            {lang === "pt" ? "EN" : "PT"}
          </button>
        </div>
        <h1 className="font-body text-4xl md:text-5xl font-bold text-paper leading-tight">
          {t("appTitle")}
        </h1>
        <p className="font-body text-paper-dim mt-3 max-w-xl">{t("appSubtitle")}</p>
      </header>

      <nav className="w-full max-w-3xl flex gap-1 mb-[-1px] relative z-10" role="tablist">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            role="tab"
            aria-selected={tab === tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={`font-mono text-xs tracking-[0.2em] uppercase px-5 py-3 rounded-t-md border border-b-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-hazard ${
              tab === tabItem.id
                ? "bg-panel text-paper border-hairline"
                : "bg-transparent text-paper-dim border-transparent hover:text-paper"
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </nav>

      <main className="w-full max-w-3xl">
        {tab === "checker" && <Checker />}
        {tab === "generator" && <Generator />}
        {tab === "phrase" && <PhraseGenerator />}
      </main>

      <footer className="w-full max-w-3xl mt-10 font-mono text-xs text-paper-dim/70 flex flex-col gap-1">
        <p>{t("footerLine1")}</p>
        <p>{t("footerLine2")}</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
