# Política de Privacidade — Cofre de Senhas

Última atualização: 2026.

Este documento explica, de forma direta, o que este projeto coleta, por
quê, e por quanto tempo — em conformidade com os princípios da Lei Geral
de Proteção de Dados (LGPD).

## O que NUNCA é coletado

- A senha que você digita ou gera nunca sai do seu navegador em texto
  puro, e nunca é armazenada em lugar nenhum, por ninguém.
- O hash completo da sua senha nunca é enviado à rede nem armazenado.
- Seu endereço IP nunca é armazenado em texto puro.
- Não usamos cookies, não usamos ferramentas de analytics de terceiros, não
  fazemos rastreamento entre sites.

## O que é coletado, e por quê

Quando você usa a verificação de vazamento (aba "Analisar"), o backend
deste projeto registra, para fins de segurança operacional (detecção de
abuso e observabilidade):

| Dado | O que é | Por quê |
|---|---|---|
| Prefixo de hash (5 caracteres) | Já é insuficiente, por design, para identificar sua senha — é a mesma informação que sempre foi enviada ao Have I Been Pwned | Necessário para repassar a consulta |
| Quantidade de resultados retornados | Um número (ex: "43 correspondências") | Estatística de uso agregada |
| Hash do seu IP (SHA-256 com salt) | Não é o IP em si — é irreversível na prática | Detectar picos de abuso e aplicar rate limiting |
| Timestamp da consulta | Data e hora | Análise de padrões de uso ao longo do tempo |

Nenhum desses dados, isolado ou combinado, permite identificar quem você é
ou qual senha você digitou.

## Por quanto tempo isso fica guardado

Os registros de consulta (`pwned_checks`) e de bloqueio por excesso de
requisições (`rate_limit_events`) têm expiração automática configurada em
90 dias — depois disso, o próprio banco de dados (Firestore) os remove
automaticamente via política de TTL (Time To Live). Contadores agregados
(total de consultas, total de bloqueios) não têm dado individual associado
e por isso não seguem essa expiração — são só números.

## Base legal e contato

O tratamento descrito acima se baseia no legítimo interesse em manter o
serviço operacional e seguro (Art. 7º, IX da LGPD), com o mínimo de dado
necessário para esse fim. Este é um projeto de portfólio/estudo, sem fins
comerciais e sem venda ou compartilhamento de dados com terceiros. Dúvidas
sobre este documento podem ser abertas como issue no repositório do
projeto.
