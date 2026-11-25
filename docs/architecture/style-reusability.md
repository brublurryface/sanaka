# Auditoria de reutilização de estilos

## Linha de base

Revisão da main: `b54b64e`. O relatório local de 24/11/2026 registrou 39 clones SCSS,
332 linhas duplicadas (4,10%) e 2604 tokens duplicados (5,70%) em 28 arquivos de `src/app`.
O total combinado de TypeScript, HTML e SCSS ficou em 2,08% de linhas duplicadas. O limite
combinado de 3% não garante o mesmo limite por linguagem. Os estilos globais em `src/styles`
não participam desse relatório; a medição futura precisa explicitar o escopo.

## Primeira intervenção

- `src/styles/_editorial-typography.scss`: contratos tipográficos de títulos de página,
  introduções e rótulos editoriais. Os valores continuam nos tokens de `src/styles.scss`.
  About e Sanaka-loka preservam a família definida no seletor agrupado; Contact conserva
  seu peso explícito e PostDetail conserva sua escala editorial particular. Matrix, Catalog,
  REST, Posts e NotFound reutilizam o papel completo do título. Home, Sanctuary Paths e
  o estilo global reutilizam o rótulo editorial, preservando o token alternativo da Home.
- `src/app/pages/matrix/rest-api/_portal-controls.scss`: aparência comum da ação de busca
  e dos botões do Arcane Portal. Não compartilha eventos, estados de foco, dimensões ou
  comportamento, que continuam sob responsabilidade de seus componentes.

Os mixins foram escolhidos para preservar os seletores encapsulados, a ordem das declarações
e a especificidade. Eles centralizam a manutenção do código-fonte, mas não prometem reduzir
o CSS compilado. Cada substituição foi conferida por expansão textual reversível contra o
arquivo original. O CI do commit `b51e49f` aprovou a compilação Sass e os fluxos de navegador.

## Evidência da primeira intervenção

No commit `b51e49f`, o [Validate Sanaka](https://github.com/brublurryface/sanaka/actions/runs/45649432781)
registrou 18 clones SCSS, 155 linhas duplicadas (1,92%) e 1072 tokens duplicados (2,40%)
em 29 arquivos de `src/app`. A cobertura e o bundle inicial de 448,67 kB foram preservados.
Windows e Linux aprovaram 880 testes Angular e 368 de servidor. Os
[fluxos de navegador](https://github.com/brublurryface/sanaka/actions/runs/45649432700)
(175 testes) e o [experimento SSR](https://github.com/brublurryface/sanaka/actions/runs/45649432762)
também passaram.

## Segunda intervenção

- A escala dos títulos de seção, assinatura e rótulos editoriais compartilha os valores
  existentes. Peso, família e espaçamento continuam distintos quando o papel exige.
- O módulo `src/styles/_focus-indicator.scss` concentra os contornos de foco dourados e
  marfim. Cada consumidor conserva a largura, o deslocamento, a cor e os seletores.
  O realce Matrix/Flow Guide mantém os seletores de hover e foco existentes.
- NotFound e Saṃvit compartilham a largura e o espaçamento da cena em
  `src/styles/_editorial-layout.scss`. Matrix e Catalog compartilham a superfície em
  `src/app/pages/matrix/_exhibit-surface.scss`. A regra repetida de largura em About foi removida.
- `duplication:report:styles` mede todos os SCSS de `src`, incluindo globais e mixins.
  O relatório é executado no preflight sem limite adicional até conhecer a linha de base
  ampliada. As duas verificações de duplicação existentes permanecem obrigatórias.

A nova revisão mantém as propriedades e os seletores existentes; a ordem do peso tipográfico
em Matrix e Catalog muda apenas entre declarações independentes. Não há mudança intencional
de comportamento ou aparência. A equivalência do build precisa ser conferida no CI.

## Inventário de investigação restante

- Os contornos translúcidos de Posts (alfa 0,12 e 0,16) exigem uma auditoria de contraste
  nos estados reais de foco; não são equivalentes ao contorno dourado sólido.
- Rótulos de Saṃvit e controles de Flow Guide/REST apresentam variações de função, cor,
  espaçamento e estados. Não unificar apenas pela semelhança lexical.
- As ocorrências de progresso responsivo e movimento reduzido de Home/App/Posts incluem
  comentários, delimitadores de regras e animações independentes. Não extrair essas
  coincidências como responsabilidades compartilhadas.
- Templates de óbolos e arquivos TypeScript gerados: investigar em entregas próprias.
- Conferir a nova lista de ocorrências e o escopo global; estabelecer limites individuais
  com base no relatório completo. Revisão visual e de teclado em desktop/mobile pendente.

Não relaxar o limite global nem criar exclusões para obter aprovação artificial. O próximo
relatório deverá comparar os resultados por linguagem, revisar o escopo dos estilos globais
e distinguir semelhanças textuais de duplicações de responsabilidades.

## Evidência da segunda intervenção e política de regressão

O commit `b0324ac` passou nos três workflows:
[Validate Sanaka](https://github.com/brublurryface/sanaka/actions/runs/45669706224),
[Browser critical flows](https://github.com/brublurryface/sanaka/actions/runs/45669706399)
e [Article SSR experiment](https://github.com/brublurryface/sanaka/actions/runs/45669706312).
Não houve novos avisos inesperados. A cobertura e o tamanho bruto do bundle inicial foram
preservados; a transferência estimada foi de 116,93 kB.

Contadores de referência (linhas duplicadas/total; tokens duplicados/total; clones):

- TypeScript em src/app: 106/9445; 936/65603; 14 clones.
- HTML em src/app: 11/4004; 66/26166; 1 clone.
- SCSS em src/app: 72/8020; 507/43936; 8 clones.
- SCSS em src: 85/9246; 562/52252; 9 clones.

A política em `scripts/duplication-policy.mjs` impede aumento dos números absolutos
de linhas duplicadas, tokens duplicados e clones em cada formato. O limite agregado
anterior de 3% continua no comando combinado. Uma regressão não pode ser compensada
por outro formato, pelo crescimento do código ou pelo arredondamento. Os percentuais
são informativos: reduzir código não duplicado pode elevar uma proporção sem criar
duplicação. Relatórios vazios ou sem o formato esperado são falhas. O contrato JSON
é o de jscpd 5.4.2, fixado no lockfile
([documentação](https://jscpd.dev/reference/reporters/json)).

O preflight executa uma varredura combinada em src/app e outra de SCSS em src. A varredura
TypeScript isolada permanece disponível, mas não repete o trabalho no check:build.
Os relatórios JSON são gravados em .jscpd (já ignorado pelo Git) e preservados no CI.
Nove testes da política exercitam regressão isolada, tokens, clones, relatório inválido
e variação do denominador. Alterações legítimas na medição precisam de revisão explícita;
não aumentar a linha de base automaticamente.

A nova extração `src/styles/_accessible-announcement.scss` centraliza o conjunto idêntico
de declarações de ocultação visual das regiões de anúncio do Arcane Portal e do explorador
de código. Preserva os seletores, o DOM e as regiões acessíveis. A classe global
`.visually-hidden` possui outras declarações e não foi substituída.

Os demais registros incluem três coincidências de comentários, limites de media queries e
animações independentes, além de contratos com variações intencionais. A revisão do contraste
dos controles de Posts e a comparação visual continuam necessárias. O progresso de leitura
foi registrado separadamente na [issue #126](https://github.com/brublurryface/sanaka/issues/126).
