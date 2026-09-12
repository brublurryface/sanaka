<div align="center">
  <img
    src="./public/images/maya/maya-sanaka.png"
    width="300"
    alt="MÄyÄ, personagem do projeto Sanaka"
  />

# Sanaka

**Entre devagar. Aqui, cÃ³digo tambÃ©m Ã© linguagem.**<br>
**Enter slowly. Here, code is also a language.**

Um santuÃ¡rio digital onde textos, personagens e experimentos de programaÃ§Ã£o compartilham o mesmo espaÃ§o.<br>
A digital sanctuary where writings, characters, and programming experiments share the same space.

![Angular 22](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)
![TypeScript 6](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Vitest 4](https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest&logoColor=white)
![WordPress REST API](https://img.shields.io/badge/WordPress-REST_API-21759B?logo=wordpress&logoColor=white)
![Status](https://img.shields.io/badge/status-em_evolucao-D4A94D)

[PortuguÃªs](#portuguÃªs) Â· [English](#english)
</div>

---

<a id="portuguÃªs"></a>

## PortuguÃªs

### O que Ã© este lugar?

O que acontece quando um arquivo deixa de ser apenas uma coleÃ§Ã£o de pÃ¡ginas e comeÃ§a a responder a quem o atravessa?

Sanaka Ã© a reconstruÃ§Ã£o tÃ©cnica e editorial de um acervo mantido no WordPress. O conteÃºdo preserva sua histÃ³ria; o Angular lhe oferece uma nova forma, novas rotas e novas maneiras de ser explorado.

Por trÃ¡s do santuÃ¡rio existe um experimento concreto: reunir identidade visual, conteÃºdo autoral e engenharia front-end em uma aplicaÃ§Ã£o que tambÃ©m funciona como espaÃ§o de estudo.

Essa separaÃ§Ã£o permite evoluir a interface sem perder o histÃ³rico jÃ¡ publicado e cria uma base para diferentes nÃºcleos editoriais:

- **Sanaka:** pensamentos, estudos e conteÃºdos ligados ao santuÃ¡rio;
- **acervo de ficÃ§Ã£o:** contos, romances e personagens preservados da publicaÃ§Ã£o anterior;
- **conteÃºdo compartilhado:** publicaÃ§Ãµes que podem atravessar mais de um nÃºcleo sem serem duplicadas no WordPress.

### O que jÃ¡ ganhou forma

- pÃ¡gina inicial responsiva com identidade visual prÃ³pria;
- interface disponÃ­vel em portuguÃªs e inglÃªs;
- arquivo de publicaÃ§Ãµes consumido pela WordPress REST API;
- busca com espera de 300 ms entre a digitaÃ§Ã£o e a requisiÃ§Ã£o;
- leitura contÃ­nua com carregamento incremental;
- leitura paginada com URLs navegÃ¡veis;
- capas, categorias, tÃ­tulos, resumos e datas vindos do WordPress;
- estados visuais de carregamento, erro, nova tentativa e ausÃªncia de resultados;
- carregamento tardio das rotas de publicaÃ§Ãµes e de MÄyÄ;
- renderizaÃ§Ã£o hÃ­brida, combinando prerenderizaÃ§Ã£o e execuÃ§Ã£o no navegador;
- testes unitÃ¡rios com Vitest.

### Como uma publicaÃ§Ã£o atravessa o sistema

```mermaid
flowchart LR
    UI[Interface Angular] --> Store[Estado das publicaÃ§Ãµes]
    Store --> Service[ServiÃ§o HTTP]
    Service --> API[WordPress REST API]
    API --> Service --> Store --> UI
```

Quando uma publicaÃ§Ã£o aparece na tela, ela jÃ¡ atravessou algumas camadas. Cada uma guarda uma responsabilidade:

- o **componente** recebe interaÃ§Ãµes e apresenta o estado;
- a **store** concentra paginaÃ§Ã£o, busca, carregamento, erro e transiÃ§Ãµes de estado;
- o **service** monta as requisiÃ§Ãµes HTTP e converte a resposta do WordPress para o modelo usado pela aplicaÃ§Ã£o;
- a **WordPress REST API** fornece o conteÃºdo editorial.

### O que existe por trÃ¡s do vÃ©u

#### Portas abertas somente quando visitadas â€” Angular standalone e lazy loading

Os componentes sÃ£o standalone e as Ã¡reas de publicaÃ§Ãµes e de MÄyÄ usam imports dinÃ¢micos. Com isso, o cÃ³digo dessas rotas fica em chunks separados e sÃ³ Ã© baixado quando a pessoa navega atÃ© elas, reduzindo o trabalho necessÃ¡rio no carregamento inicial.

#### Pulso e corrente â€” Signals e RxJS

Os **Signals** expÃµem o estado atual de forma sÃ­ncrona e reativa para a interface: lista de posts, pÃ¡gina atual, modo de leitura e indicadores de carregamento ou erro.

O **RxJS** organiza operaÃ§Ãµes assÃ­ncronas, como requisiÃ§Ãµes HTTP, busca com debounce e cancelamento de uma consulta anterior quando uma nova pesquisa comeÃ§a. Signals e RxJS cumprem papÃ©is complementares: um apresenta o estado atual; o outro coordena o fluxo de eventos no tempo.

#### Um arquivo sem a antiga moldura â€” WordPress como CMS headless

O WordPress administra posts, categorias e mÃ­dias, mas nÃ£o controla a interface do projeto. O Angular consulta a API pÃºblica, normaliza os dados e decide como apresentÃ¡-los. Essa abordagem preserva o acervo e desacopla o conteÃºdo do antigo tema WordPress.

#### Entre servidor e navegador â€” renderizaÃ§Ã£o hÃ­brida

As pÃ¡ginas estÃ¡veis podem ser prerenderizadas durante o build. O arquivo de publicaÃ§Ãµes, que depende de dados externos e interaÃ§Ãµes como busca e paginaÃ§Ã£o, Ã© renderizado no navegador. A estratÃ©gia pode ser revista quando uma camada de backend prÃ³pria for introduzida.

#### A mesma casa, duas lÃ­nguas â€” internacionalizaÃ§Ã£o

Os textos da interface usam Transloco e podem ser alternados entre portuguÃªs e inglÃªs. O idioma da interface nÃ£o modifica automaticamente o idioma do conteÃºdo editorial vindo do WordPress.

### Caminhos disponÃ­veis

| Rota                 | Finalidade                                  |
| -------------------- | ------------------------------------------- |
| `/`                  | Entrada do santuÃ¡rio                       |
| `/posts`             | Arquivo em leitura contÃ­nua                |
| `/posts/paged`       | Primeira pÃ¡gina do modo paginado           |
| `/posts/paged/:page` | PÃ¡gina especÃ­fica do arquivo              |
| `/maya`              | EspaÃ§o reservado para a evoluÃ§Ã£o de MÄyÄ |

### Ferramentas do santuÃ¡rio

| Tecnologia         | Uso no projeto                                                           |
| ------------------ | ------------------------------------------------------------------------ |
| Angular 22         | Componentes, rotas, injeÃ§Ã£o de dependÃªncias, Signals e renderizaÃ§Ã£o |
| TypeScript 6       | Tipagem e implementaÃ§Ã£o da aplicaÃ§Ã£o                                 |
| RxJS 7             | Fluxos assÃ­ncronos e requisiÃ§Ãµes reativas                             |
| Transloco          | InternacionalizaÃ§Ã£o da interface                                       |
| WordPress REST API | Fonte do conteÃºdo editorial                                             |
| Angular SSR        | RenderizaÃ§Ã£o no servidor e prerenderizaÃ§Ã£o                           |
| Vitest             | Testes unitÃ¡rios                                                        |
| SCSS               | Estilos, responsividade e identidade visual                              |

### Abrindo o santuÃ¡rio localmente

#### PrÃ©-requisitos

- Node.js compatÃ­vel com Angular 22;
- npm 11 ou versÃ£o compatÃ­vel.

#### InstalaÃ§Ã£o e desenvolvimento

```bash
git clone https://github.com/brublurryface/sanaka.git
cd sanaka
npm install
npm start
```

A aplicaÃ§Ã£o ficarÃ¡ disponÃ­vel em `http://localhost:4200/`.

#### Testes e build

```bash
npx ng test --watch=false
npm run build
```

Os artefatos de produÃ§Ã£o sÃ£o gerados em `dist/sanaka/`.

### Mapa do acervo

O repositÃ³rio inclui uma auditoria reproduzÃ­vel do conteÃºdo pÃºblico do WordPress. Ela documenta categorias, destinos editoriais e uso de imagens destacadas sem modificar o CMS.

- [ConclusÃµes da auditoria](./docs/wordpress-content-audit.md)
- [Script de auditoria](./scripts/audit-wordpress-content.ps1)
- [Dados gerados](./docs/data)

### O que ainda estÃ¡ germinando

- definir a taxonomia que distribuirÃ¡ conteÃºdos entre diferentes experiÃªncias editoriais;
- criar a experiÃªncia editorial de leitura de cada publicaÃ§Ã£o;
- avaliar uma camada de backend entre o Angular e o WordPress;
- desenvolver MÄyÄ como companheira com estado, memÃ³ria e permissÃµes controladas;
- criar a **Matrix Online**, um portfÃ³lio tÃ©cnico interativo com experimentos executÃ¡veis e demonstraÃ§Ãµes visuais de conceitos de programaÃ§Ã£o;
- investigar separadamente personagens, sliders e mÃ­dias legadas do antigo site.

---

<a id="english"></a>

## English

### What is this place?

What happens when an archive stops being just a collection of pages and begins to respond to those who cross it?

Sanaka is the technical and editorial reconstruction of an archive maintained in WordPress. Its content preserves its history; Angular gives it a new form, new routes, and new ways to be explored.

Behind the sanctuary is a concrete experiment: bringing visual identity, original content, and front-end engineering into an application that also works as a place of study.

This separation makes it possible to evolve the interface without losing the published history and provides a foundation for different editorial collections:

- **Sanaka:** reflections, studies, and content connected to the sanctuary;
- **fiction archive:** short stories, novels, and characters preserved from the previous publication;
- **shared content:** publications that can cross more than one collection without being duplicated in WordPress.

### What has taken shape

- responsive home page with its own visual identity;
- user interface available in Portuguese and English;
- publication archive powered by the WordPress REST API;
- search with a 300 ms debounce between typing and requesting data;
- continuous reading with incremental loading;
- paginated reading with navigable URLs;
- covers, categories, titles, excerpts, and dates supplied by WordPress;
- loading, error, retry, and empty states;
- lazy-loaded publication and MÄyÄ routes;
- hybrid rendering combining prerendering and client-side execution;
- unit tests with Vitest.

### How a publication crosses the system

```mermaid
flowchart LR
    UI[Angular interface] --> Store[Publication state]
    Store --> Service[HTTP service]
    Service --> API[WordPress REST API]
    API --> Service --> Store --> UI
```

By the time a publication reaches the screen, it has already crossed several layers. Each one guards a distinct responsibility:

- the **component** receives interactions and presents state;
- the **store** centralizes pagination, search, loading, errors, and state transitions;
- the **service** builds HTTP requests and maps WordPress responses to the application's model;
- the **WordPress REST API** provides the editorial content.

### Behind the veil

#### Doors opened only when visited â€” standalone Angular and lazy loading

The project uses standalone components, while the publication and MÄyÄ areas use dynamic imports. Their code is emitted into separate chunks and downloaded only when someone navigates to the corresponding route, reducing the work required during the initial load.

#### Pulse and current â€” Signals and RxJS

**Signals** expose the current state synchronously and reactively to the interface, including the post list, current page, reading mode, and loading or error indicators.

**RxJS** coordinates asynchronous operations such as HTTP requests, debounced search, and cancellation of a previous query when a new search begins. Signals and RxJS have complementary roles: one exposes current state, while the other coordinates events over time.

#### An archive without its former frame â€” WordPress as a headless CMS

WordPress manages posts, categories, and media without controlling the project's interface. Angular queries the public API, normalizes the data, and decides how to present it. This approach preserves the archive while decoupling its content from the former WordPress theme.

#### Between server and browser â€” hybrid rendering

Stable pages can be prerendered during the build. The publication archive, which depends on external data and interactions such as search and pagination, currently runs in the browser. This strategy may be revisited when a dedicated backend layer is introduced.

#### One home, two interface languages â€” internationalization

Interface text is managed with Transloco and can be switched between Portuguese and English. Changing the interface language does not automatically translate editorial content received from WordPress.

### Available paths

| Route                | Purpose                             |
| -------------------- | ----------------------------------- |
| `/`                  | Sanctuary entrance                  |
| `/posts`             | Archive in continuous reading mode  |
| `/posts/paged`       | First page in paginated mode        |
| `/posts/paged/:page` | Specific archive page               |
| `/maya`              | Space reserved for MÄyÄ's evolution |

### Tools behind the sanctuary

| Technology         | Role in the project                                               |
| ------------------ | ----------------------------------------------------------------- |
| Angular 22         | Components, routing, dependency injection, Signals, and rendering |
| TypeScript 6       | Application implementation and type safety                        |
| RxJS 7             | Asynchronous flows and reactive requests                          |
| Transloco          | Interface internationalization                                    |
| WordPress REST API | Editorial content source                                          |
| Angular SSR        | Server-side rendering and prerendering                            |
| Vitest             | Unit testing                                                      |
| SCSS               | Styling, responsiveness, and visual identity                      |

### Opening the sanctuary locally

#### Requirements

- a Node.js version compatible with Angular 22;
- npm 11 or a compatible version.

#### Installation and development

```bash
git clone https://github.com/brublurryface/sanaka.git
cd sanaka
npm install
npm start
```

The application will be available at `http://localhost:4200/`.

#### Tests and production build

```bash
npx ng test --watch=false
npm run build
```

Production artifacts are generated in `dist/sanaka/`.

### Archive map

The repository includes a reproducible audit of the public WordPress content. It documents categories, editorial destinations, and featured-media usage without modifying the CMS.

- [Audit findings](./docs/wordpress-content-audit.md)
- [Audit script](./scripts/audit-wordpress-content.ps1)
- [Generated data](./docs/data)

### What is still taking shape

- define the taxonomy used to distribute content across different editorial experiences;
- build the editorial reading experience for individual publications;
- evaluate a backend layer between Angular and WordPress;
- develop MÄyÄ as a companion with state, memory, and controlled permissions;
- create **Matrix Online**, an interactive technical portfolio with executable experiments and visual programming demonstrations;
- investigate legacy characters, sliders, and media separately.

---

## Autoria Â· Author

Concebido e desenvolvido por / Conceived and developed by [Bruna LourenÃ§o](https://github.com/brublurryface).
