# Loadings de Sanaka

Os oito ativos foram publicados pela autora no commit
[`2e72191`](https://github.com/brublurryface/sanaka/commit/2e72191b45dee334e30459eb091e6b8fea7aa86c),
na branch `loading-creatures`. A integração reutiliza esses objetos Git sem
redesenhar, converter, redimensionar ou reenviar imagens.

| Rota           | Estado                                  | Variante       |
| -------------- | --------------------------------------- | -------------- |
| `/posts`       | Requisição inicial da listagem          | Vāsuki V3      |
| `/posts/:slug` | `state().status === 'loading'`          | Maṇināga V3    |
| `/sanaka-loka` | Requisição inicial e paginação compacta | Śabala Rock V4 |
| `/sobre`       | Requisição dos ciclos do quebra-cabeças | Saṃvit V17     |

`src/app/shared/loading-indicator/loading-artwork.ts` concentra os caminhos,
dimensões e composição de cada variante. As páginas fornecem somente a variante
e a mensagem Transloco já existente em português e inglês. Stores, serviços,
rotas, SEO e configuração de hidratação permanecem com o comportamento anterior.

O componente apresenta uma única região `role="status"`. Imagem, palavra
decorativa e elementos musicais ficam sob `aria-hidden="true"`. Um `<picture>`
seleciona a animação apenas para `prefers-reduced-motion: no-preference`; o
`poster.png` é a fonte estática padrão. Não há pré-carregamento das quatro artes,
temporizador de espera ou duração mínima do estado de loading. Uma falha na
imagem mantém a mensagem acessível, sem afetar a requisição dos dados.

As serpentes usam um palco de até 367 × 94 px e revelação de texto em 4 s, abaixo
da imagem. A decoração começa no evento de carga da imagem. Śabala usa palco
896:520, palavra inteira atravessando em 12 s, letras oscilando em 1,5 s, duas
linhas e nove notas de cores distintas. O movimento da personagem vem apenas
do WebP. Saṃvit usa a proporção original 1500:760, sem palavra LOADING ou
reconstrução das pegadas. A opção de movimento reduzido também desativa os
movimentos CSS e mantém as composições estáticas.

A paginação de Sanaka-loka mantém os livros visíveis e oferece Śabala compacto.
Enquanto isso, a região de progresso deixa de ser uma segunda região de status.
Erros, vazio e retry continuam separados do loading. A paginação dos posts
preserva seus indicadores e conteúdo anteriores.

## Integridade dos ativos

Conferidos localmente contra `sanaka-loadings-manifest.json` fornecido pela autora:
todos os tamanhos, hashes SHA-256, dimensões e quantidades de quadros coincidem.
As quatro animações têm alfa real e repetição contínua (`loop = 0`).

| Arquivo em `public/loadings/` | Dimensões  |     Bytes | Quadros |    Ciclo |
| ----------------------------- | ---------- | --------: | ------: | -------: |
| `vasuki/animated.apng`        | 734 × 188  | 4.121.085 |      96 | 4.000 ms |
| `vasuki/poster.png`           | 734 × 188  |    46.152 |       1 |        — |
| `maninaga/animated.webp`      | 734 × 188  | 1.091.650 |      92 | 4.000 ms |
| `maninaga/poster.png`         | 734 × 188  |    53.213 |       1 |        — |
| `sabala/animated.webp`        | 460 × 460  |   620.768 |      28 | 3.000 ms |
| `sabala/poster.png`           | 460 × 460  |   242.173 |       1 |        — |
| `samvit/animated.webp`        | 1500 × 760 | 2.411.260 |      86 | 5.400 ms |
| `samvit/poster.png`           | 1500 × 760 |   397.081 |       1 |        — |

| Arquivo                  | SHA-256                                                            |
| ------------------------ | ------------------------------------------------------------------ |
| `vasuki/animated.apng`   | `b5210cfe02847bae0676e31095d7d276278c2fbc5810bc515791cb4057fa4bbb` |
| `vasuki/poster.png`      | `9fa04d282b98789f8bef7a8eb20d55d5232a726adece4bdbb16a31c0cbab9910` |
| `maninaga/animated.webp` | `969124ce0a7d40c2fd47b8ee9f276e5a2446eeed873fcc25f4b78180de0f2038` |
| `maninaga/poster.png`    | `c94d2d385f34de46876997ae1fcf7efba117c6bdfed4e4bf22475bf1f394ef2b` |
| `sabala/animated.webp`   | `5579b08e6642614ef08a8747dcf2fa5aa255147227f9365eb5d781355b4b851e` |
| `sabala/poster.png`      | `88aa2359d49cc6e354aeb37d5069c59bb7bb96b1fb8c61d7933383f27bb2bac8` |
| `samvit/animated.webp`   | `4d2d845cb5dab93cd995f86f44e783ce54847ffa1af1e3fa74d89dd2644ccb95` |
| `samvit/poster.png`      | `aeb374a7036e06db741f2e84821ef6672c2473d4fe587923b8d35cf19734307e` |

O APNG de Vāsuki continua com 4,12 MB. Esta integração preserva o arquivo
aprovado; uma futura otimização exige aprovação visual própria.

## Validação

Os testes Angular cobrem a seleção de uma única arte, a fonte estática de
movimento reduzido, a região acessível, as nove notas, falha de imagem,
carregamento/sucesso/erro nas quatro páginas e a preservação dos livros durante
a paginação. `npm run check` passou com 636 testes Angular e 133 testes do
servidor, cobertura de linhas de 97,69% no frontend, nenhuma vulnerabilidade
apontada pelo audit e build de produção concluído. O build contém os oito
arquivos com os mesmos bytes da origem; o servidor reconhece `.apng` como
`image/apng`.

Revisão visual em Chromium, com fixtures locais e estados controlados sem
alterar os serviços de produção:

| Verificação                                  | Resultado observado                                                                                         |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Quatro rotas em desktop                      | Proporções preservadas; texto abaixo da camada das artes                                                    |
| Quatro rotas em viewport de iframe de 390 px | Sem cortes nem rolagem horizontal; largura útil de 375 px com a barra de rolagem do navegador               |
| Śabala                                       | Duas linhas, nove notas de cores distintas e palavra inteira em movimento atrás da personagem               |
| Paginação compacta                           | Palco de 288 px; 12 livros mantidos durante a espera e após falha; retry chegou a 24 livros sem duplicação  |
| Quebra-cabeças mobile                        | O loading saiu ao concluir a resposta e os nove seletores ficaram disponíveis                               |
| Movimento reduzido                           | Contrato de seleção do poster e desativação CSS conferidos no código e nos testes; emulação visual pendente |

O navegador gerenciado bloqueou o acesso ao DevTools, impedindo a emulação
visual de `prefers-reduced-motion: reduce` nesta sessão. Não houve mudança
nas permissões do navegador. A conferência visual com essa preferência deve
ser feita antes da aprovação final. A revisão com fixtures não substitui a
verificação da aplicação publicada após uma implantação autorizada.

A PR de código deve ter `loading-creatures` como base, para que os oito binários
publicados pela autora não apareçam como novos arquivos na revisão de código.
Não fazer merge nem deploy como parte desta entrega.
