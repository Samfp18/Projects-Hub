import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { LanguageProvider, useLanguage } from "../LanguageContext.jsx";

afterEach(() => {
  cleanup();
});

function Probe() {
  const { lang, setLang, t } = useLanguage();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="title">{t("appTitle")}</span>
      <span data-testid="missing">{t("chave-que-nao-existe")}</span>
      <button onClick={() => setLang("en")}>switch</button>
    </div>
  );
}

describe("LanguageContext", () => {
  it("começa em português por padrão", () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );
    expect(screen.getByTestId("lang").textContent).toBe("pt");
    expect(screen.getByTestId("title").textContent).toBe("Cofre de Senhas");
  });

  it("troca para inglês e atualiza as traduções", () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );
    fireEvent.click(screen.getByText("switch"));
    expect(screen.getByTestId("lang").textContent).toBe("en");
    expect(screen.getByTestId("title").textContent).toBe("Password Vault");
  });

  it("cai de volta para a chave literal se a tradução não existir em nenhum idioma", () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );
    expect(screen.getByTestId("missing").textContent).toBe("chave-que-nao-existe");
  });

  it("lança erro claro se usado fora do provider", () => {
    // Suprime o log de erro esperado do React no console durante este teste.
    const consoleError = console.error;
    console.error = () => {};

    expect(() => render(<Probe />)).toThrow(/useLanguage precisa ser usado dentro/);

    console.error = consoleError;
  });
});
