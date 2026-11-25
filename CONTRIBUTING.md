# Contribuindo com Sanaka

As [instruções do repositório](.github/copilot-instructions.md) definem os limites arquiteturais,
as responsabilidades, a reutilização, os comentários e a validação. Este documento formaliza
a contribuição e a nomenclatura de branches e commits.

## Branches e commits

Crie uma branch a partir da `main` atualizada. Use nomes curtos, em inglês, com o prefixo que
representa a finalidade principal da entrega. Os prefixos são uma convenção do Sanaka,
inspirada em Conventional Commits; não são uma exigência do Git.

| Prefixo     | Finalidade                                           |
| ----------- | ---------------------------------------------------- |
| `feat/`     | Nova funcionalidade                                  |
| `fix/`      | Correção de defeito                                  |
| `refactor/` | Reestruturação sem mudança de comportamento          |
| `test/`     | Criação, correção ou melhoria de testes              |
| `perf/`     | Melhoria de desempenho                               |
| `docs/`     | Documentação                                         |
| `style/`    | Formatação de código, sem mudança de comportamento   |
| `ci/`       | Pipeline de integração contínua                      |
| `build/`    | Build, ferramentas de compilação e suas dependências |
| `chore/`    | Manutenção geral                                     |
| `revert/`   | Reversão de alteração                                |

Exemplos: `feat/nandini-home-loading`, `test/testing-excellence`,
`ci/playwright-environment`.

Nos commits, utilize `tipo(escopo): descrição` ou `tipo: descrição`, com descrição curta e
identificadores em inglês. Exemplo: `test(coverage): reject a coverage regression`.
Separe mudanças com responsabilidades independentes. Uma correção de funcionalidade que
inclui seu teste de regressão continua sendo uma entrega `fix/`.

## Validação antes do push

Use a versão de Node registrada em `.node-version` e a versão de npm de `package.json`.
Após `npm ci`, execute `npm run hooks:install` uma vez em cada clone local.

O pre-commit verifica a formatação dos arquivos preparados, sem reescrever o índice.
O commit-msg verifica a convenção de mensagens. O pre-push verifica a revisão que será
enviada, exige um checkout limpo e executa `npm run check` antes do envio de branches.

O comando `npm run check` reutiliza as mesmas fases de formatação, análise estática,
auditoria, testes e build executadas no CI. Para corrigir a formatação, use
`npm exec -- prettier --write caminho/do/arquivo` e prepare novamente a alteração.

Hooks locais não são executados por commits criados pela API do GitHub. Nesse caso,
execute as verificações equivalentes antes de publicar, quando houver ambiente compatível.
Se não houver, mantenha a PR em rascunho e declare a validação pendente. Em falhas de
formatação, consulte o artefato `formatting-diagnostics` antes de tentar outra correção.

## Revisão e integração

- Use o [modelo de pull request](.github/pull_request_template.md) e descreva o comportamento,
  os consumidores afetados, as responsabilidades e as evidências de validação.
- Execute `npm ci`, `npm run check` e `npm run test:e2e:types`. Para fluxos de navegador,
  execute `npm run test:e2e` com o build e os navegadores correspondentes à versão do lockfile.
- Investigue warnings com a mesma prioridade dos errors, mesmo sem impacto funcional.
  Não silencie avisos nem aceite defeitos de implementação porque a aplicação funciona.
- Verifique todos os workflows no commit efetivamente revisado. Um check cancelado não é uma
  aprovação. Registre testes não executados e limitações de ambiente.
- Não reduza limites de cobertura, desabilite testes, introduza retentativas ou aumente
  timeouts apenas para obter um check verde. Justifique mudanças de escopo e de estratégia.
- Preserve os assets, os tokens visuais e o comportamento aprovado quando o objetivo for testar.
- A autora revisa e realiza o merge. A aprovação dos workflows não substitui a revisão.

Consulte a [estratégia de excelência em testes](docs/testing-quality.md) para conhecer os
critérios de qualidade, as evidências e as pendências.
