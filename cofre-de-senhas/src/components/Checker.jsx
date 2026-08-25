import { useMemo, useState } from "react";
import { analyzePassword } from "../lib/analyze";
import { checkPwned } from "../lib/pwnedCheck";
import Stamp from "./Stamp";

export default function Checker() {
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [pwnedState, setPwnedState] = useState({ status: "idle" }); // idle | loading | done | error

  const analysis = useMemo(() => analyzePassword(password), [password]);

  async function handlePwnedCheck() {
    if (!password) return;
    setPwnedState({ status: "loading" });
    try {
      const result = await checkPwned(password);
      setPwnedState({ status: "done", ...result });
    } catch (err) {
      setPwnedState({ status: "error" });
    }
  }

  return (
    <div className="grain bg-panel rounded-lg border border-hairline p-6 md:p-8 flex flex-col gap-6">
      <div>
        <p className="font-display text-xs tracking-[0.3em] text-hazard mb-2">CASO Nº 01 — ANÁLISE</p>
        <h2 className="font-body text-2xl md:text-3xl font-semibold text-paper">
          Avaliar senha
        </h2>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="pw-input" className="font-mono text-xs text-paper-dim uppercase tracking-wider">
          Evidência (senha)
        </label>
        <div className="flex gap-2">
          <input
            id="pw-input"
            type={reveal ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPwnedState({ status: "idle" });
            }}
            placeholder="Digite a senha a analisar"
            autoComplete="off"
            spellCheck="false"
            className="flex-1 bg-ink border border-hairline rounded-sm px-4 py-3 font-mono text-paper placeholder:text-paper-dim/50 focus:outline-none focus:ring-2 focus:ring-hazard"
          />
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            className="px-4 rounded-sm border border-hairline text-paper-dim hover:text-paper hover:border-paper-dim transition-colors font-mono text-sm"
            aria-pressed={reveal}
          >
            {reveal ? "ocultar" : "revelar"}
          </button>
        </div>
      </div>

      {password && (
        <>
          <div className="flex flex-wrap items-center gap-6">
            <Stamp label={analysis.label} />
            <dl className="font-mono text-sm text-paper-dim grid grid-cols-2 gap-x-6 gap-y-1">
              <dt>Entropia estimada</dt>
              <dd className="text-paper">{analysis.entropyBits} bits</dd>
              <dt>Tempo p/ quebrar</dt>
              <dd className="text-paper">{analysis.crackTime}</dd>
              <dt>Comprimento</dt>
              <dd className="text-paper">{password.length} caracteres</dd>
            </dl>
          </div>

          <div>
            <p className="font-mono text-xs text-paper-dim uppercase tracking-wider mb-2">Observações do laudo</p>
            <ul className="flex flex-col gap-1">
              {analysis.reasons.map((reason, i) => (
                <li key={i} className="font-body text-paper/90 text-sm before:content-['—_'] before:text-hazard">
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-hairline pt-5">
            <p className="font-mono text-xs text-paper-dim uppercase tracking-wider mb-3">
              Consulta a vazamentos conhecidos (Have I Been Pwned)
            </p>
            {pwnedState.status === "idle" && (
              <button
                type="button"
                onClick={handlePwnedCheck}
                className="font-mono text-sm border border-hazard text-hazard px-4 py-2 rounded-sm hover:bg-hazard hover:text-ink transition-colors"
              >
                Consultar base de vazamentos
              </button>
            )}
            {pwnedState.status === "loading" && (
              <p className="font-mono text-sm text-paper-dim">consultando…</p>
            )}
            {pwnedState.status === "error" && (
              <p className="font-mono text-sm text-danger">
                Não foi possível consultar agora. Tente novamente mais tarde.
              </p>
            )}
            {pwnedState.status === "done" && pwnedState.pwned && (
              <p className="font-mono text-sm text-danger">
                ⚠ Encontrada em {pwnedState.count.toLocaleString("pt-BR")} vazamento(s) conhecido(s). Troque esta senha.
              </p>
            )}
            {pwnedState.status === "done" && !pwnedState.pwned && (
              <p className="font-mono text-sm text-safe">
                ✓ Não encontrada nos vazamentos consultados.
              </p>
            )}
            <p className="font-body text-xs text-paper-dim mt-3">
              Apenas os 5 primeiros caracteres do hash SHA-1 da senha são enviados
              (k-anonimato). A senha em si nunca sai do seu navegador.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
