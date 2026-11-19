# Loadings de Sanaka

Em 13/11/2026, Śabala passou a usar o protótipo **Hysteria** recuperado: nove
linhas FFT, duas ornamentais, nove notas e LOADING dançante, com os gráficos
originais preservados. A integração e a comparação com a referência estão em
[sabala-hysteria-loading.md](sabala-hysteria-loading.md).

Os oito ativos foram publicados pela autora no commit
[`2e72191`](https://github.com/brublurryface/sanaka/commit/2e72191b45dee334e30459eb091e6b8fea7aa86c),
na branch `loading-creatures`. A integração reutiliza esses objetos Git sem
redesenhar, converter, redimensionar ou reenviar imagens.

| Rota           | Estado                                  | Variante                      |
| -------------- | --------------------------------------- | ----------------------------- |
| `/posts`       | Requisição inicial da listagem          | Vāsuki V3                     |
| `/posts/:slug` | `state().status === 'loading'`          | Maṇināga com piscada revisada |
| `/sanaka-loka` | Requisição inicial e paginação compacta | Śabala Hysteria               |
| `/sobre`       | Requisição dos ciclos do quebra-cabeças | Saṃvit V17                    |

`src/app/shared/loading-indicator/loading-artwork.ts` centraliza os caminhos e as
proporções. `PageLoading` registra a requisição inicial em `PageLoadingState`;
a raiz da aplicação apresenta uma única arte sobre todo o viewport. Cabeçalho,
conteúdo parcial e rodapé ficam invisíveis, inertes e fora da árvore acessível
até o término. O registro pertence à página e é liberado no sucesso, erro ou
navegação para outro destino; uma requisição antiga não libera outra atual.

Nas rotas com espera inicial, a raiz oculta a estrutura desde a primeira
renderização no cliente e o início da navegação, antes de carregar o módulo da
página. O bloqueio passa para a requisição de dados depois da renderização do
destino, sem expor o rodapé entre as etapas. Navegações canceladas, falhas e
páginas imediatamente prontas também liberam esse bloqueio.

Em `/posts`, a primeira apresentação aguarda publicações **e categorias**.
Buscas, filtros e paginação posteriores não reiniciam o bloqueio da tela inteira.
O conteúdo já carregado continua disponível durante solicitações adicionais.
As mensagens de carregamento ficam exclusivamente disponíveis a leitores de
tela; a palavra LOADING que integra as composições permanece decorativa.

O palco das serpentes pode ocupar até 1120 px; o de Śabala, 896 px; e o de Saṃvit,
1200 px. O viewport disponível limita ambos os eixos, preservando os arquivos
inteiros em desktop, mobile e orientação horizontal. As notas, as camadas e os
tempos das composições permanecem os mesmos. Saṃvit não recebe a palavra LOADING.

Nas variantes de serpentes e Saṃvit, o `<picture>` usa a animação somente com
`prefers-reduced-motion: no-preference`; no modo reduzido, usa o poster e desativa
os movimentos CSS. Śabala aplica essa preferência dentro do documento recuperado.
A revisão de Maṇināga usa o APNG e o pôster publicados pela autora no commit
[`2591241`](https://github.com/brublurryface/sanaka/commit/25912418278b28f05cdf16def4b2bb673afcf25e).
O palco acompanha a proporção de 734 × 188 da animação ou de 730 × 243 do pôster
quando o navegador pede movimento reduzido.
A mensagem externa de status usa Transloco em português e inglês.
Não há espera mínima, timer artificial ou dependência de novas bibliotecas.

A categoria editorial passa a usar o slug **sanaka-loka**, resolvendo seu ID no
CMS. Em 12/11/2026, a leitura autenticada confirmou quatro volumes publicados:
Mors, Nandinī, Nemi e Ākāśa. Não há IDs de categoria fixos no código. Categoria
ausente resulta em erro recuperável; coleção realmente vazia tem mensagem própria.
O campo de capa `sanakaverse_cover` e os nomes internos existentes permanecem
compatíveis com o contrato do WordPress.

## Integridade dos ativos

Os ativos da integração inicial foram conferidos contra o manifesto da autora.
Os valores de Maṇināga abaixo correspondem aos arquivos da revisão da piscada.
As quatro animações têm alfa real e repetição contínua (`loop = 0`).

| Arquivo em `public/loadings/` | Dimensões  |     Bytes | Quadros |    Ciclo |
| ----------------------------- | ---------- | --------: | ------: | -------: |
| `vasuki/animated.apng`        | 734 × 188  | 4.121.085 |      96 | 4.000 ms |
| `vasuki/poster.png`           | 734 × 188  |    46.152 |       1 |        — |
| `maninaga/animated.apng`      | 734 × 188  | 4.343.878 |      92 | 4.000 ms |
| `maninaga/poster.png`         | 730 × 243  |   160.567 |       1 |        — |
| `sabala/animated.webp`        | 460 × 460  |   620.768 |      28 | 3.000 ms |
| `sabala/poster.png`           | 460 × 460  |   242.173 |       1 |        — |
| `samvit/animated.webp`        | 1500 × 760 | 2.411.260 |      86 | 5.400 ms |
| `samvit/poster.png`           | 1500 × 760 |   397.081 |       1 |        — |

| Arquivo                  | SHA-256                                                            |
| ------------------------ | ------------------------------------------------------------------ |
| `vasuki/animated.apng`   | `b5210cfe02847bae0676e31095d7d276278c2fbc5810bc515791cb4057fa4bbb` |
| `vasuki/poster.png`      | `9fa04d282b98789f8bef7a8eb20d55d5232a726adece4bdbb16a31c0cbab9910` |
| `maninaga/animated.apng` | `1a4fc9ceed947efff1ef1c5fd6f343342d18a8a3ffb1fb731e5930deb22740ef` |
| `maninaga/poster.png`    | `360a0ca0ae558bc3c7c8a229cf0e2d8c05bf75138035b779f93ead8a76d894e6` |
| `sabala/animated.webp`   | `5579b08e6642614ef08a8747dcf2fa5aa255147227f9365eb5d781355b4b851e` |
| `sabala/poster.png`      | `88aa2359d49cc6e354aeb37d5069c59bb7bb96b1fb8c61d7933383f27bb2bac8` |
| `samvit/animated.webp`   | `4d2d845cb5dab93cd995f86f44e783ce54847ffa1af1e3fa74d89dd2644ccb95` |
| `samvit/poster.png`      | `aeb374a7036e06db741f2e84821ef6672c2473d4fe587923b8d35cf19734307e` |

O APNG de Vāsuki continua com 4,12 MB. Esta integração preserva o arquivo
aprovado; uma futura otimização exige aprovação visual própria.

## Validação

Os testes cobrem a seleção das artes e dos posters, a mensagem acessível,
a espera conjunta por publicações e categorias, proteção antes do módulo lazy,
liberação com dados em cache e cancelamento ao navegar,
liberação no erro, conservação dos livros na paginação, categoria editorial
renomeada e distinção entre coleção vazia e configuração ausente.

Executar `npm run check` e conferir as quatro rotas em desktop e mobile, com
serviços HTTP reais na aplicação e respostas controladas na fixture. A consulta
ao CMS também deve confirmar os quatro volumes atuais. Registrar os resultados
e as capturas atualizadas na PR; as capturas da PR #94 mostram a composição
anterior, com indicadores dentro de seções pequenas.

O teste de navegador de Maṇināga emula movimento reduzido. Ele verifica o
arquivo selecionado, as dimensões reais da imagem e o encaixe no viewport
durante a requisição do artigo.

A entrega de correção usa a branch **fix/loading-experience**, baseada na `main`
atual, que já inclui os oito ativos publicados pela autora na PR #93. A nova PR
substitui a #94 e contém somente código e documentação. A autora revisa e faz
o merge. Não fazer deploy como parte desta entrega.
