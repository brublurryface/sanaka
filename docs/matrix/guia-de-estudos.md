# Matrix — guia de estudos

Esta entrega acrescenta quatro laboratórios locais ao Angular existente. Components e
NASA continuam disponíveis. As novas páginas não alteram WordPress nem o contador real
de óbolos. Não há pagamentos reais, broker implantado ou execução de código do visitante.

## 1. Iniciar e navegar

Para obter a entrega após o merge da PR #57, confira a árvore de trabalho e crie a
branch local a partir da branch publicada:

```powershell
git status -sb
git fetch origin
git switch --track origin/feature/matrix-learning-labs-v1
```

Se essa branch já existir localmente, use `git switch feature/matrix-learning-labs-v1`
e `git pull --ff-only` em vez de criá-la novamente. As alterações da Matrix permanecem
nessa branch até a revisão e o merge da própria PR; atualizar apenas `main` ainda não
traz os novos laboratórios.

Na raiz do repositório, com as dependências instaladas:

```powershell
npx ng serve --watch
```

Abra `http://localhost:4200/matrix`. Caso falte instalar dependências, utilize `npm ci`
com a versão de Node compatível com o projeto. Não é preciso instalar bibliotecas novas.

| Ordem | Rota               | Estudo                                                                |
| ----- | ------------------ | --------------------------------------------------------------------- |
| 1     | `/matrix/obolos`   | Array, índices, duplicatas, Set, Map e crescimento do trabalho        |
| 2     | `/matrix/entregas` | FIFO/LIFO, custos de remoção, processamento, ACK, retry e dead-letter |
| 3     | `/matrix/jogo`     | Função pura, condições, interfaces, composição e extensão de regras   |
| 4     | `/matrix/padaria`  | Contratos HTTP, erros, BFF opcional e idempotência fictícia           |

Components (`/matrix/components`) oferece uma revisão de comunicação Angular. Depois
da Padaria, visite `/matrix/rest-api` para comparar a simulação com uma chamada real à
NASA. Não copie o serviço NASA para o simulador.

## 2. Uma sessão de estudo

Comece pela primeira ação. Cada etapa mostra o objetivo e a função de seus controles.
Depois do clique, leia **O que aconteceu?** junto da experiência. Se quiser estudar o
mecanismo, abra **Ver explicação técnica e código desta passagem** no mesmo local.

Use **Continuar** depois de experimentar a etapa, ou escolha outra pela navegação.
O foco acompanha a nova orientação. Conceitos, funções completas, JSON, comparações e
verificações prontas ficam como consultas opcionais; não são pré-requisitos de leitura.

### Óbolos de Mors

1. **Encontrar uma moeda:** clique em uma posição ou use **Consultar posição**.
2. **Organizar a caixa:** adicione ao final ou retire a posição escolhida.
3. **Encontrar repetições:** use **Procurar nomes repetidos** e depois
   **Examinar próximo óbolo**. A primeira inspeção já acontece no clique inicial.
4. **Contar por nome:** veja quantidades em vez de apenas presença/repetição.

Os outros percursos e cenários são opcionais. Os relatórios comparativos só aparecem
depois da conclusão de uma busca; não antecipam seu resultado durante a inspeção.

O inventário tem no máximo 16 posições. As contagens representam operações do núcleo,
não milissegundos. Cópias, ordenação e armazenamento dos snapshots têm custos adicionais.

### Entregas de Ākāśa

1. **Quem chegou primeiro:** retire a próxima encomenda e observe a ordem.
2. **Quem chegou por último:** a mesma cena recomeça; compare a retirada da pilha.
3. **Entregar ou tentar de novo:** leve uma encomenda, depois confirme a chegada ou
   simule uma falha. ACK, retry e dead-letter são explicados nessa passagem, não antes.

Adicionar uma encomenda e comparar estratégias ficam em áreas opcionais. A falha preserva
a identidade, devolve ao final e, após duas tentativas, separa a encomenda para investigar.

Há até 16 encomendas pendentes, incluindo processamento, e 64 chegadas por sessão.
Os prefixos consumidos ficam disponíveis até reiniciar. Nomes iguais podem ter IDs
diferentes: não existe deduplicação distribuída neste exemplo.

### Jogo impossível de Kālikā

1. **Jogar uma rodada:** escolha os gestos e jogue; a função simples mostra a decisão.
2. **Acompanhar a decisão:** jogue e use **Examinar próxima regra**. O código acompanha
   validação, empate e dominância. O resultado só aparece quando uma regra decide.
3. **Acrescentar dois gestos:** experimente lagarto e Spock com o mesmo motor de regras.

Situações prontas e comparação de estratégias são opcionais. Mudar um gesto limpa o
resultado anterior para não atribuir uma decisão antiga à entrada nova.

Uma função pura não é inferior a classes. A composição se justifica pela possibilidade
de trocar políticas. A primeira regra que decide encerra a rodada: a ordem é parte do
contrato. As regras clássicas precisam continuar passando nos testes após a extensão.

### Padaria de Māyā

1. **Consultar cardápio:** consulte e use **Receber resposta**. A espera é manual e explicada.
2. **Criar um pedido:** envie produto/quantidade e receba a resposta `201`.
3. **Encontrar o pedido:** o campo recebe o ID realmente criado; consulte e receba `200`.
4. **Repetir com cuidado:** simule o pagamento, receba, repita o mesmo envio e receba
   novamente. Com a mesma chave, o número de pagamentos permanece um.

Requisição e resposta JSON ficam no detalhe técnico da passagem. Erros de entrada,
estoque, servidor e rede, resumo BFF e mudança da chave ficam em exploração opcional.
Cada controle explica seu efeito. **Recomeçar do cardápio** limpa pedidos e pagamentos.

Só há créditos imaginários e `demo-token`. Nenhum campo pede informações bancárias.
Limites da demonstração: 20 pedidos e 40 pagamentos em memória por sessão. POST de pedido
não tem chave de idempotência; se repetido, cria outro recurso enquanto houver estoque.

## 3. Onde estudar no VS Code

Todos os caminhos abaixo são relativos à raiz do repositório.

| Responsabilidade              | Caminho                                                      |
| ----------------------------- | ------------------------------------------------------------ |
| Catálogo único                | `src/app/pages/matrix/matrix-experiments.ts`                 |
| Rotas lazy-loaded             | `src/app/pages/matrix/matrix.routes.ts`                      |
| Componentes e templates       | `src/app/pages/matrix/studies/<id>/<id>-lab.ts` e `.html`    |
| Inventário                    | `studies/obolos/obolo-inventory.ts`                          |
| Fila e processamento          | `studies/entregas/delivery-queue.ts`                         |
| Função e regras do jogo       | `studies/jogo/kalika-game.ts`                                |
| Contratos e servidor fictício | `studies/padaria/bakery-api.ts`                              |
| Estrutura editorial comum     | `studies/shared/matrix-study-frame.ts` e `.html`             |
| Histórico e visualizador      | `studies/shared/study-history.ts` e `study-step-viewer.*`    |
| Estilos dos quatro estudos    | `src/styles/_matrix-studies.scss`                            |
| Tokens e Header existentes    | `src/styles.scss`                                            |
| Código exibido                | `studies/<id>/<id>-source.generated.ts`                      |
| Gerador/verificador           | `scripts/matrix-study-source.mjs`                            |
| Textos                        | `public/i18n/pt-BR.json` e `en.json`, seção `matrix.studies` |

Os caminhos abreviados `studies/` partem de `src/app/pages/matrix/`.
Cada domínio tem seu `.spec.ts`. Cada página tem testes de coordenação. Em `shared/`,
os testes de DOM verificam ações, labels, estados desabilitados, âncoras e código real.
Os testes de conteúdo conferem paridade de chaves/variáveis dos dois idiomas.

## 4. Executar testes e manter o código exibido correto

```powershell
npx ng test --watch=false --include='src/app/pages/matrix/studies/obolos/**/*.spec.ts'
npx ng test --watch=false --include='src/app/pages/matrix/studies/entregas/**/*.spec.ts'
npx ng test --watch=false --include='src/app/pages/matrix/studies/jogo/**/*.spec.ts'
npx ng test --watch=false --include='src/app/pages/matrix/studies/padaria/**/*.spec.ts'
```

Após alterar um algoritmo, formate os arquivos alterados e sincronize os recortes:

```powershell
npm run matrix:source:sync
npm run matrix:source:check
npm run check
```

Não edite os arquivos `.generated.ts` manualmente. Os marcadores `@study-start` e
`@study-end` no domínio delimitam trechos realmente executados. O verificador reprova
marcadores repetidos/ausentes e recortes desatualizados. Não usa `eval` nem `new Function`.

**Testar exemplos prontos**, na página, roda funções locais predefinidas com resultados
esperados. Não executa Vitest, não mede cobertura e não interpreta código digitado.

## 5. Modificar uma regra com segurança

Faça a mudança em uma branch de estudo, após `git status -sb`. Escreva um teste para o
novo requisito antes de editar o domínio. Preserve os testes anteriores; depois confira
interface, narrativa, exemplos e ambos os idiomas. Sincronize o código exibido e execute
os controles da página. O domínio decide; o HTML apresenta.

Para desfazer uma tentativa, prefira Undo/Timeline do VS Code. Confira `git diff --`
seguido do **arquivo específico** antes de restaurar qualquer coisa. Faça uma cópia da
tentativa se quiser preservá-la. Não utilize `git restore -- .`, `reset --hard` ou limpeza
recursiva como procedimento de estudo. Arquivos novos ainda não rastreados não aparecem
no diff comum: confira também `git status --short --untracked-files=all`.

Voltar um passo na página inspeciona memória local. Uma ação após voltar inicia outra
linha de investigação e descarta o futuro antigo. Isso nunca desfaz requisições reais.

## 6. Adicionar outro estudo

Só quando existir um requisito novo: acrescente ID/metadados ao catálogo e contrato de
estudo, crie domínio testável, componente fino e template. Reutilize Frame e History,
registre traduções nos dois idiomas, declare seus arquivos em `matrix-study-files.ts`,
adicione os marcadores e a configuração do gerador. Registre rota lazy e sua política SSR.
Atualize testes de catálogo/rotas e esta documentação.

Não copie Header, código do explorador nem uma folha SCSS por laboratório. Estilos de
um controle exclusivo podem ser locais quando houver necessidade real; os papéis comuns
continuam compartilhados. Signals, Observables e Lifecycle permanecem planejados.

## 7. Fornecer artes sem refazer o layout

Veja [manifesto de artes](./manifesto-de-artes.md). Sem imagem, o Header usa fallback
neutro e não cria um `<img>` quebrado. Com os arquivos aprovados, informe `desktopImage`
e `mobileImage` no `study` da página. O mesmo Frame escolhe o `<source>` mobile e mantém
Header, degradês e tipografia comuns. Atualize o texto `imageAlt` nos dois idiomas.

`MATRIX_STUDY_SOURCE_REF`, em `shared/matrix-study-files.ts`, aponta ao commit
`b039823` da revisão guiada. Os links por componente, template, Sass, domínio e
testes correspondem ao código desta experiência e continuam úteis depois de remover
a branch. Os recortes exibidos são gerados dos arquivos reais.
Depois de alterar os estudos, atualize essa referência para um commit publicado
que contenha as novas fontes; não use o nome de uma branch temporária.

## 8. Referências para conferir conceitos

- [Guia de estilo Angular](https://angular.dev/style-guide) e [Signals](https://angular.dev/guide/signals).
- [Handbook de classes TypeScript](https://www.typescriptlang.org/docs/handbook/2/classes.html).
- [ECMAScript — Map e Set](https://tc39.es/ecma262/multipage/keyed-collections.html): a exigência é acesso sublinear médio, não hash ou O(1) obrigatório.
- [HTTP — RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html): métodos, status e idempotência.
