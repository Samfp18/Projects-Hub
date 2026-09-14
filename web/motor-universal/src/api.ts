import type { ConfigMemoria } from './types';

/* =====================================================
   CONFIGURAÇÃO DA IA (DEEPSEEK)
   A chamada passa pela Netlify Function /.netlify/functions/deepseek,
   que injeta a chave no servidor. O navegador nunca vê a chave.
   ===================================================== */
export const DEEPSEEK_URL = '/.netlify/functions/deepseek';
export const DEEPSEEK_MODEL_CONFIG = 'deepseek-chat';
export const DEEPSEEK_MODEL_VINHETA = 'deepseek-chat';
export const DEEPSEEK_MODEL_IABUG = 'deepseek-chat';
export const IABUG_SENHA = '31072007';

export function buildPromptVinheta(
  ctx: Partial<ConfigMemoria>,
  historicoVinhetas: string[],
  turnoAtual: number,
  vinhetaAtual: number,
  diretriz: string = ''
): string {
  const contextoAnterior = historicoVinhetas.length
    ? `\nÚLTIMAS VINHETAS (para dar continuidade):\n${historicoVinhetas.slice(-3).map((v, i) => `--- Vinheta anterior ${i + 1} ---\n${v}`).join('\n\n')}\n`
    : '';

  return `Você é o narrador de uma simulação narrativa. Escreva a próxima vinheta em prosa literária.

CONFIGURAÇÃO DO MUNDO:
- Cenário: ${ctx.cenario || 'Não definido'}
- Protagonista: ${ctx.protagonista?.nome || 'Não definido'} (${ctx.protagonista?.papel || ''})
- Background: ${ctx.protagonista?.bio || 'Não definido'}
- Tom narrativo: ${ctx.tom || 'NOIR'}
- Ritmo: ${ctx.ritmo || 'PADRÃO'}
- Roteiro base: ${ctx.roteiro ? ctx.roteiro.substring(0, 1200) : 'Não fornecido'}

POSIÇÃO ATUAL: Turno ${turnoAtual} — Vinheta ${vinhetaAtual}
${contextoAnterior}
${diretriz ? `DIRETRIZ DO JOGADOR PARA ESTA VINHETA: "${diretriz}"\n` : ''}
INSTRUÇÕES:
- Escreva em português do Brasil.
- Prosa literária, imersiva, sem menus, sem listas, sem números entre parênteses.
- Extensão: 300 a 500 palavras.
- Se for a primeira vinheta, estabeleça o mundo, o protagonista e a situação inicial.
- Se houver vinhetas anteriores, dê continuidade natural — não repita o que já foi dito.
- Se houver diretriz do jogador, incorpore-a como se fosse o próprio curso do mundo reagindo à decisão do protagonista.
- Termine sempre com um gancho: uma tensão, uma pergunta implícita, uma decisão pendente.
- NUNCA quebre a quarta parede. NUNCA mencione regras, sistemas, turnos, IA ou o próprio ato de narrar.
- NUNCA use markdown. Apenas parágrafos de prosa.`;
}

export function buildPromptExtracao(roteiro: string): string {
  return `Você extrai dados estruturados de um roteiro de simulação narrativa.

Devolva APENAS JSON válido, sem markdown, sem texto em volta, seguindo EXATAMENTE este formato:

{
  "cenario": "nome curto do cenário/mundo",
  "tom": "FRIO" | "NOIR" | "ÉPICO",
  "ritmo": "COMPASSADO" | "PADRÃO" | "DENSO",
  "protagonista": {
    "nome": "nome completo",
    "papel": "função no mundo",
    "bio": "background em 2-4 frases"
  },
  "localInicial": {
    "cidade": "cidade e país reais onde começa",
    "zoom": 5
  },
  "npcs": [
    {
      "nome": "nome do personagem",
      "papel": "função no mundo",
      "relacao": "conhecimento" | "confianca" | "intimidade" | "dependencia" | "ruptura",
      "autonomia": 0,
      "nota": "1 frase curta sobre o personagem"
    }
  ],
  "faccoes": [
    {
      "nome": "nome da facção",
      "relacao": "aliada" | "neutra" | "hostil" | "guerra" | "propria",
      "cor": "#3498db",
      "nota": "1 frase curta sobre a facção"
    }
  ]
}

Regras:
- Se não houver tom no roteiro, escolha o mais coerente com o cenário.
- Se não houver protagonista, invente um coerente com o mundo.
- Para localInicial.cidade, use cidade real onde o cenário faria sentido.
- zoom entre 3 (país) e 10 (bairro).
- npcs: extraia do roteiro os personagens citados. Se não houver, invente 3 a 5 coerentes com o mundo. autonomia de 0 (dependente) a 5 (autônomo).
- faccoes: extraia do roteiro. Se não houver, invente 2 a 4 coerentes. Use cores hexadecimais distintas (ex: #3498db azul, #e74c3c vermelho, #f39c12 laranja, #95a5a6 cinza, #2ecc71 verde).
- Responda SOMENTE com o JSON.

ROTEIRO:
"""
${roteiro}
"""`;
}

export const MOTOR_CONTEXT = `MOTOR UNIVERSAL V0.1 — resumo das 47 regras:

1. Voz e exposição: narração literária imersiva, sem menus ou números. Anti-meta absoluto.
2-6. Vinhetas (2-4 por turno), ritmo (180-340 linhas), cabeçalho, cena-espelho, narração coral.
7-10. Comandos: Avaliação, Regenerar, Modo Ação, Salto Temporal.
11-13. Tom (FRIO/NOIR/ÉPICO), Ativação Adaptativa de Módulos, Contagem de Turnos.
14. Lei de Murphy Estrutural (falhas em cascata: Técnica, Humana, Ambiental, Sistêmica).
15. Consequência Moral (ações egoístas geram repercussões rastreáveis).
16. Mecânica da Mentira (Omissão, Falsificação, Blefe, Falsa Identidade).
17. Agendas e Iniciativas (relógio 0-10 por entidade; antagonistas agem a cada poucos turnos).
18-19. Irradiação de Consequências, Motor de Causalidade (1 evento por turno).
20. Hierarquia Narrativa (Tier 1: arco ativo; Tier 2: nomeados; Tier 3: anônimos).
21. Vida Relacional (Conhecimento -> Confiança -> Intimidade -> Dependência -> Ruptura).
22-23. Necessidade Humana, NPCs com Ambições e Medos.
24. Sistema de Autonomia Humana (Grau 0-V: Dependente -> Autônomo).
25-27. Atrito de Realidade (violência letal real), Diretrizes de Ferro, Nêmesis Dinâmicos (Nível I-V).
28. Módulo de Combate Tático (mapa em grid com colunas letras e linhas números).
29-31. Protocolos de Negociação, Diplomacia e Comércio (moedas de barganha, tipos de acordo).
32-36. Governança, Recursos, Moral da Organização, Sucessão, Cadeia de Suprimentos.
37-39. Evolução de IA (Ferramenta -> Assistente -> Parceira -> Individualidade -> Divergência -> Autonomia), Dinâmica entre IAs, Tendências Globais.
40-41. Prestígio (Temor, Respeito, Admiração, Desprezo), Marcos Globais.
42. Persistência (save a cada 5 turnos).
43-44. Doenças e Ferimentos, Clima e Ambiente.
45-46. Facções Externas, Exploração e Descoberta.
47. Configuração de Cenário.

Implementação atual: HUD único em HTML/CSS/JS, com abas (Narrativa, Painel, Mapa, Personagens, Facções, Agendas, Ativos, Save), mapa interativo via Leaflet, geração de vinhetas via DeepSeek.`;
