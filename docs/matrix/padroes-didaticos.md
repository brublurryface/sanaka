# Matrix — padrões didáticos

## Fonte de verdade e composição

O catálogo tipado guarda número, rota, tradução, conceitos, dificuldade, personagem e
pré-requisitos. A página coordena entradas. O domínio decide e produz snapshots. O
Frame apresenta história, três níveis de explicação, experimento, código, cenários e
investigação. O History só armazena e percorre passos; não conhece as regras dos jogos.

Foram reutilizados `CodeExplorerController`, os estilos `.matrix-code-explorer`,
`.matrix-experiment-node`, Header cinematográfico, shell, degradês, títulos/rótulos e
`.sanaka-section-heading`. Os experimentos antigos não foram convertidos para a nova
estrutura nem refatorados para caber nela.

Não há serviço global dos laboratórios, timer permanente ou dependência nova.
Uma abstração só entra quando há uma responsabilidade real compartilhada.

## Comentários em português

A densidade maior é restrita aos arquivos didáticos. Identificadores continuam em inglês.
Comente propósito, importações importantes, contratos, entrada/retorno, operadores,
Signal, transição, custo e motivo dos testes. Explique o mecanismo, não repita o nome.

Distinga `readonly` de imutabilidade profunda; `private` TypeScript de campos `#`;
`null` de `undefined`; posição zero de ausência. Explique por que a decisão existe.
Nos testes, explique a expectativa, não apenas que “o teste deve passar”.

Os comentários dos recortes ficam em PT-BR também na interface em inglês: a autoria
quer estudar o código dessa forma. Textos da interface pertencem ao i18n.

## Sincronização de código e explicações

O gerador extrai os marcadores dos arquivos de domínio. Não há strings escritas à mão
imitando o algoritmo, nem execução arbitrária de código. `matrix:source:check` faz parte
de `npm run check`. É preciso sincronizar depois da formatação, pois os recortes incluem
os comentários e a formatação reais.

Sincronizar um recorte não garante que a narrativa continua correta. Ao mudar uma regra,
revise explicações, mini exemplos, testes, modos e traduções. A suíte verifica completude
dos conceitos e paridade de chaves/variáveis, não equivalência literária entre idiomas.

O painel de cenários executa casos fixos do domínio. A suíte Vitest é outra camada,
mais extensa, com cobertura e testes de interface. Nunca confunda esses dois mecanismos.

## Precisão das simplificações

| Simulação    | Limite que precisa ficar claro                                                       |
| ------------ | ------------------------------------------------------------------------------------ |
| Óbolos       | Inventário abstrato, sem relação com oferta/contador WordPress por personagem        |
| Big-O        | Contagens instrumentadas não são tempo; snapshots e ordenação têm custo extra        |
| Fila         | Índice `head` evita shift, mas cópias, prefixos e relatórios ainda consomem memória  |
| Mensageria   | Passos manuais locais, sem broker, persistência, garantia de entrega ou exactly-once |
| Jogo         | Classes não vencem funções por princípio; ordem das regras influencia a decisão      |
| Padaria      | HTTP/BFF e créditos fictícios, sem servidor novo, conta bancária ou pagamento real   |
| Idempotência | Memória local sequencial, sem concorrência, transação durável ou garantia financeira |

Loops aninhados comparam todos os pares: n(n−1)/2 comparações. O resultado usa Set para
listar cada duplicata uma vez. Esse núcleo tem espaço de resultados O(n); snapshots
podem acumular até O(n³) referências em entradas grandes. O núcleo do percurso com Set
usa O(n) chaves; suas cópias podem acumular O(n²) referências. Por isso a bancada limita
entradas a 16 e não se apresenta como benchmark.

Set/Map podem ter operações médias esperadas O(1) em implementações por hash. O padrão
ECMAScript exige média sublinear, não hash específico nem pior caso constante.
Na fila, deslocamentos do modelo denso são uma estimativa conceitual: não afirmam como
o motor JavaScript implementa `shift` internamente.

## História e personagens

Apresente problema, escolha, consequência e solução. A história conduz ao mecanismo,
não o substitui. Nomes sânscritos recebem IAST, devanágari e glosa contextual na primeira
apresentação; não invente etimologias. Preserve anatomia, idade aparente, proporções,
roupas e identidade mangá das referências. Ausência de arte não autoriza inventar cânone.

## Histórico e limites

Navegar não reexecuta operações. Uma ação no passado descarta o futuro, criando outra
investigação local. `record` guarda até 100 ações. `replace` conserva um percurso completo
gerado por entrada limitada; o máximo dos pares de 16 posições é 121 snapshots contando
o inicial. O estado inicial é válido e seu “antes” coincide com ele.

A fila admite 16 pendentes e 64 chegadas; retry conserva o ID e pode tentar duas vezes.
A padaria limita a sessão a 20 pedidos e 40 pagamentos. Reiniciar limpa o domínio.
Esses limites protegem a demonstração, não são recomendações para sistemas de produção.

## Aparência, acessibilidade e SSR

Uma folha compartilhada estiliza os quatro estudos. Rótulos usam o token de 0.8rem;
metadados e código usam seus papéis existentes. Não crie uma paleta ou Header por estudo.
O Frame usa imagens somente quando configuradas; fallback não tem URL fictícia.

Há controles nativos, labels, foco, estados desabilitados e mensagens textuais.
Inspeção e seleção não dependem só de cor; resultados não dependem de animação.
Os códigos e tabelas longas rolam em suas próprias regiões. Não há movimento novo
obrigatório; o explorador existente respeita redução de movimento.

As novas páginas são prerenderizadas. Nenhum domínio toca `window`, armazenamento do
navegador ou rede. O `main` continua pertencendo ao shell da aplicação; páginas internas
não criam outro `main`. Âncoras usam a rota completa para não voltar à Home por causa do
`base href`.

Testes de DOM verificam contratos e eventos. Não provam layout em 360px, contraste real,
leitor de tela ou uso por toque. Essa conferência em navegador deve ser registrada como
realizada ou pendente, nunca inferida de um build bem-sucedido.
