import { InfoScreen } from './InfoScreen';

interface SobreScreenProps { active: boolean; onVoltar: () => void; }

export function SobreScreen({ active, onVoltar }: SobreScreenProps) {
  return (
    <InfoScreen active={active} titulo="Sobre o Motor" subtitulo="SOBRE" onVoltar={onVoltar}>
      <p className="info-lead">
        O Motor Universal é um motor de simulação narrativa: você descreve um mundo em texto livre,
        uma IA extrai cenário, protagonista, NPCs e facções, e a partir daí a história é narrada
        turno a turno, reagindo às suas ordens.
      </p>

      <div className="info-section">
        <h2>Como funciona</h2>
        <p className="info-p">
          O motor não é um roteiro fixo — é um narrador que reage. A cada turno, ele escreve uma
          vinheta de prosa levando em conta o mundo configurado, o que já aconteceu antes e a
          diretriz que você acabou de dar. Não existe um "final" pré-determinado: a história se
          constrói conforme você joga.
        </p>
        <ul className="info-list">
          <li>Narração literária imersiva — sem menus, listas ou números expostos na prosa.</li>
          <li>Cada ação tem consequência rastreável; nada acontece isolado do resto do mundo.</li>
          <li>Relações evoluem em etapas: Conhecimento → Confiança → Intimidade → Dependência → Ruptura.</li>
          <li>NPCs têm graus de autonomia (0 a V) — de totalmente dependentes a plenamente autônomos.</li>
          <li>Por trás da prosa existem números (recursos, saúde, moral) que ficam ocultos por padrão — o <strong>Modo Mestre</strong> revela esses bastidores.</li>
          <li>A narrativa nunca quebra a quarta parede: nunca menciona regras, turnos ou o ato de narrar.</li>
        </ul>
      </div>

      <div className="info-section">
        <h2>Como usar</h2>
        <div className="info-steps">
          <div className="info-step"><span className="info-step-num">01</span><div><strong>Nova Simulação</strong> — no menu principal, clique aqui para abrir o assistente de configuração.</div></div>
          <div className="info-step"><span className="info-step-num">02</span><div><strong>Roteiro</strong> — cole um texto livre descrevendo seu mundo (pode ser um parágrafo ou várias páginas). Depois clique em <strong>"Preencher com IA"</strong> para que ela extraia automaticamente cenário, protagonista, tom, ritmo, NPCs e facções.</div></div>
          <div className="info-step"><span className="info-step-num">03</span><div><strong>Mundo</strong> — confira ou ajuste o nome do cenário e clique no mapa para definir o local inicial (a IA já posiciona um marcador se identificar uma cidade real no roteiro).</div></div>
          <div className="info-step"><span className="info-step-num">04</span><div><strong>Protagonista e Estilo</strong> — revise nome, papel e background, e escolha o tom narrativo (Frio, Noir, Épico) e o ritmo das vinhetas.</div></div>
          <div className="info-step"><span className="info-step-num">05</span><div><strong>Revisão</strong> — confira tudo e clique em <strong>"Iniciar Simulação"</strong> para entrar no HUD.</div></div>
          <div className="info-step"><span className="info-step-num">06</span><div><strong>Jogando</strong> — escreva uma ordem no campo de texto do rodapé e clique em <strong>Continuar</strong> (ou deixe em branco e clique direto) para gerar a próxima vinheta. Use <strong>Regenerar</strong> se não gostar do resultado.</div></div>
          <div className="info-step"><span className="info-step-num">07</span><div><strong>Abas</strong> — explore Mapa, Personagens e Facções para acompanhar o estado do mundo além da prosa.</div></div>
          <div className="info-step"><span className="info-step-num">08</span><div><strong>Modo Mestre</strong> — ative no topo do HUD para revelar os números ocultos (recursos, status, autonomia dos NPCs).</div></div>
          <div className="info-step"><span className="info-step-num">09</span><div><strong>Salvar e continuar depois</strong> — clique em <strong>Save</strong> no rodapé a qualquer momento. Para retomar, volte ao menu e use <strong>Carregar Save</strong>.</div></div>
          <div className="info-step"><span className="info-step-num">10</span><div><strong>IABUG</strong> — botão no topo do HUD (pede senha) para discutir ideias, bugs ou sugestões sobre o próprio motor com uma IA à parte da narrativa.</div></div>
        </div>
      </div>

      <div className="info-section">
        <h2>Tecnologia</h2>
        <p className="info-p">React + TypeScript + Vite. Mapa via Leaflet/OpenStreetMap. Narração via DeepSeek.</p>
      </div>

      <div className="info-version">MOTOR UNIVERSAL · V 0.1</div>
    </InfoScreen>
  );
}
