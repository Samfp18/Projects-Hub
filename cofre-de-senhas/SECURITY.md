# Política de Segurança

## Reportando uma vulnerabilidade

Se você encontrar uma vulnerabilidade de segurança neste projeto, por favor
**não abra uma issue pública**. Isso exporia o problema antes de haver
tempo de corrigi-lo.

Em vez disso:

1. Envie um e-mail descrevendo o problema, incluindo passos para
   reproduzir, se possível.
2. Você pode esperar uma resposta inicial em até 7 dias.
3. Peço um prazo razoável para corrigir antes de qualquer divulgação
   pública — normalmente 90 dias é o padrão da indústria, mas para um
   projeto pessoal como este, entro em contato assim que a correção
   estiver pronta, o que costuma ser bem mais rápido.

## Escopo

Este é um projeto de portfólio/estudo. Áreas de maior interesse para
report:

- Qualquer forma de a senha do usuário ser exposta, logada ou armazenada
  (o design inteiro do projeto assume que isso nunca acontece — é a
  premissa mais importante a ser preservada)
- Bypass do rate limiting
- Injeção (XSS, injeção de cabeçalho HTTP, etc.)
- Vazamento de dados através dos logs do backend (ex: IP em texto puro
  aparecendo em algum lugar que não deveria)
- Configuração incorreta de CORS ou CSP que amplie a superfície de ataque

Fora de escopo: relatos sobre dependências de terceiros já reportadas
publicamente em bancos de dados de CVE (nesse caso, uma issue comum
apontando a versão já é suficiente, já que não há necessidade de sigilo).

## Reconhecimento

Relatos válidos e responsáveis são creditados no changelog do projeto
(com sua permissão), como forma de agradecimento.
