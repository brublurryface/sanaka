# Matrix — ajustes visuais de 15/10/2026

Branch: `feature/matrix-learning-labs-v1`.

Links dos arquivos com dourado do tema, tipografia compartilhada, sublinhado pontilhado
e foco visível. Caminhos longos quebram dentro da largura disponível. Os rótulos usam
o papel editorial de 0,8rem.

As janelas da etapa e da biblioteca usam o mesmo componente de código e as classes
de cor de Components. Comentários têm uma cor própria no Sass compartilhado.
O gerador usa o TypeScript já instalado para produzir faixas de cor a partir do código
real. O navegador não recebe um compilador/editor, e o Angular renderiza texto sem
injetar HTML. Os recortes e seus comentários permanecem íntegros e selecionáveis.

As três artes fornecidas foram aplicadas aos Óbolos, Entregas e Jogo. O arquivo anterior
de Mors foi substituído, mantendo um único asset ativo. As imagens foram convertidas
para WebP sem alterar suas dimensões. Tamanhos e origens constam no
[manifesto](./manifesto-de-artes.md). A Padaria mantém seu fallback.

## Validações

- `npm run check`: aprovado.
- 380 testes em 51 arquivos.
- Cobertura: statements 95,80%; branches 92,72%; functions 96,38%; lines 95,89%.
- Duplicação: 1,26% das linhas / 1,83% dos tokens, abaixo do gate de 3%.
  Dez dos 14 clones são prefixos de metadados de cor gerados automaticamente;
  quatro já existiam. Não houve alteração do gate nem exclusão de arquivos.
- Build: dez rotas prerenderizadas; inicial 417,76 KB / transferência estimada 109,56 KB.
- Testes verificam o texto completo após colorir, atualização do recorte ativo,
  renderização segura de exemplos com tags HTML e existência dos três assets.
- Inspeção do HTML prerenderizado dos quatro laboratórios: um `main`, duas janelas
  com marcações de sintaxe e cinco links de arquivos por página.
- `git diff --check`: sem erros.

A conferência visual em navegador continua pendente: o download do Chromium neste
ambiente retornou um arquivo inválido e a instalação falhou. Não foi produzido screenshot.
O mobile usa o mesmo recorte responsivo dos outros Headers, sem nova arte vertical.

## Arquivos da entrega

26 arquivos novos/alterados, incluindo a atualização da referência das fontes:

```text
docs/matrix/ajustes-visuais-2026-10-15.md
docs/matrix/guia-de-estudos.md
docs/matrix/manifesto-de-artes.md
public/i18n/en.json
public/i18n/pt-BR.json
public/images/matrix/entregas/entregas-atmosphere-desktop.webp
public/images/matrix/jogo/jogo-atmosphere-desktop.webp
public/images/matrix/obolos/obolos-atmosphere-desktop.webp
scripts/matrix-study-source.mjs
src/app/pages/matrix/studies/entregas/entregas-lab.ts
src/app/pages/matrix/studies/entregas/entregas-source.generated.ts
src/app/pages/matrix/studies/jogo/jogo-lab.ts
src/app/pages/matrix/studies/jogo/jogo-source.generated.ts
src/app/pages/matrix/studies/obolos/obolos-source.generated.ts
src/app/pages/matrix/studies/padaria/padaria-source.generated.ts
src/app/pages/matrix/studies/shared/matrix-study-content.spec.ts
src/app/pages/matrix/studies/shared/matrix-study-definition.ts
src/app/pages/matrix/studies/shared/matrix-study-files.ts
src/app/pages/matrix/studies/shared/matrix-study-frame.html
src/app/pages/matrix/studies/shared/matrix-study-frame.ts
src/app/pages/matrix/studies/shared/matrix-study-ui.spec.ts
src/app/pages/matrix/studies/shared/study-source-code.ts
src/app/pages/matrix/studies/shared/study-step-viewer.html
src/app/pages/matrix/studies/shared/study-step-viewer.ts
src/styles/_matrix-code-explorer.scss
src/styles/_matrix-studies.scss
```
