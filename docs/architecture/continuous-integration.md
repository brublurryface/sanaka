# Validação de pull requests

O workflow `Validate Sanaka` executa em toda PR, inclusive entre branches da pilha, e por acionamento manual. Usa Node 24.22.1, npm 11.12.1 (a versão declarada em `package.json`), instalação pelo lockfile, cache do npm e `npm run check`. As ações são fixadas pelos SHAs dos tags oficiais consultados em 04/11/2026.

O job tem permissão de leitura do repositório, não preserva credenciais no checkout e não recebe segredos de SMTP, Brevo, WordPress ou Render. Não há etapa de implantação. Execuções anteriores da mesma PR são canceladas quando surge um commit novo.

`npm run check` verifica, em sequência, os exemplos didáticos sincronizados com o código, formatação, testes do servidor, cobertura da aplicação, duplicação e build de produção. A formatação de `docs/render-deployment.md`, já divergente na base, foi normalizada para permitir o comando agregado.

## Proteção da main

Regra proposta `Protect main`, ativa, aplicada à branch padrão, sem bypass: bloquear exclusão e force push e exigir PR, com zero aprovações externas obrigatórias para não inviabilizar o repositório individual. Não restringir atualizações genericamente nem exigir implantação.

A gravação dessa regra pediu confirmação de acesso por e-mail no GitHub em 04/11/2026. O formulário seguro expirou sem resultado; até a confirmação e a verificação da regra salva, não afirmar que a proteção está ativa.

O check obrigatório deve ser `Validate Sanaka`. Ativá-lo após o workflow estar na main e existir uma execução verde. As PRs anteriores não contêm esse arquivo: exigir o check antes disso pode bloquear sua entrada. Após integrá-las em ordem, abrir uma PR simples de validação, conferir o job verde e adicionar o check à regra. Não substituir checks reais por status manuais.
