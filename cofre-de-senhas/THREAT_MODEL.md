# Modelo de Ameaças — Cofre de Senhas

Este documento descreve, de forma estruturada, o que este sistema protege,
contra quem, e o que fica deliberadamente fora do escopo. O objetivo não é
listar toda ameaça teoricamente possível, e sim mostrar o raciocínio por
trás das decisões de design já tomadas.

## O que o sistema protege

- **A senha digitada ou gerada pelo usuário** — nunca deve sair do
  navegador em texto puro, nunca deve ser armazenada em lugar nenhum.
- **O hash completo da senha** — mesmo sendo um hash, não deve trafegar
  pela rede nem ser armazenado (só o prefixo de k-anonimato, por design).
- **O IP dos visitantes** — não deve ser armazenado em texto puro nos
  logs, para não criar um registro identificável de quem consultou o quê.
- **Disponibilidade do serviço** — não deve cair por abuso de um único
  visitante malicioso.

## Atacantes considerados

| Atacante | Capacidade assumida | O que ele quer |
|---|---|---|
| Visitante malicioso automatizado | Consegue fazer muitas requisições rápidas | Abusar da API para outro fim (ex: usar nosso proxy pra varrer o HIBP em massa) |
| Alguém com acesso à rede entre o navegador e o servidor | Consegue interceptar tráfego não criptografado | Capturar dados sensíveis em trânsito |
| Alguém com acesso ao banco de dados (Firestore) | Consegue ler todos os documentos armazenados | Identificar quem consultou o quê, a partir dos logs |
| Alguém que encontra o repositório no GitHub | Lê todo o código-fonte e histórico de commits | Encontrar credenciais commitadas por engano, ou entender a lógica para burlar proteções |

## Ameaças mitigadas, e como

- **Vazamento de senha em trânsito ou em repouso** → nunca existe: a senha
  não sai do navegador, e o servidor nunca a recebe. Não há o que
  interceptar ou vazar porque o dado simplesmente não trafega.
- **Identificação de usuário a partir dos logs** → IP é hasheado com salt
  (SHA-256) antes de ser armazenado; o prefixo de hash de senha registrado
  é insuficiente, por design do k-anonimato, para reconstruir a senha
  original.
- **Abuso/negação de serviço via requisições em massa** → rate limiting
  (30 requisições/15min por IP), com log do evento para detecção de
  padrões.
- **Credenciais commitadas por engano** → escaneamento automático de
  segredos no CI (gitleaks) a cada push.
- **Dependência com vulnerabilidade conhecida** → `npm audit` no CI +
  Dependabot com atualização semanal.
- **Clickjacking / injeção de conteúdo no frontend** → cabeçalhos de
  segurança HTTP (CSP, X-Frame-Options) configurados via `netlify.toml`.
- **Retenção indefinida de dados** → TTL automático de 90 dias nos logs do
  Firestore.

## Explicitamente fora de escopo (e por quê)

- **Ataques físicos ao dispositivo do usuário** (ex: alguém olhando por
  cima do ombro, malware já instalado no computador) — fora do controle
  de qualquer aplicação web.
- **Comprometimento da conta do HIBP ou de infraestrutura de terceiros** —
  o projeto confia na disponibilidade e integridade dessas APIs externas;
  não há forma de mitigar isso do nosso lado além de tratar falhas
  graciosamente (o que já é feito).
- **Ataques de força bruta que já quebraram a senha original** — o projeto
  ajuda a escolher e avaliar senhas antes do fato, não defende contas já
  comprometidas.
- **Rate limiting resistente a um atacante com muitos IPs diferentes**
  (ex: uma botnet) — o limite é por IP; um ataque distribuído o
  contornaria. Mitigação completa disso exigiria infraestrutura adicional
  (ex: Cloudflare, CAPTCHA) fora do escopo atual do projeto.
- **Confidencialidade perfeita do prefixo de hash consultado** — por
  design do próprio modelo de k-anonimato, o servidor SABE qual prefixo de
  5 caracteres foi consultado (isso é inerente ao protocolo, não uma falha
  nossa) — só não sabe qual dos hashes completos correspondentes a esse
  prefixo é a senha real do usuário.

## Limitações conhecidas, já documentadas

- Rate limiting em memória não escala horizontalmente sem Redis
  configurado (ver `server/README.md`).
- O ambiente de hospedagem gratuito (Render free tier) hiberna após
  inatividade, criando uma janela onde o serviço está temporariamente
  indisponível até "acordar".
