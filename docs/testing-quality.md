# Excelência em testes do Sanaka

## Linha de base verificada

A PR #123, no commit `c386702`, registrou a seguinte linha de base:

- Angular / Vitest: 880 testes aprovados.
- Servidor / Vitest: 281 testes aprovados.
- Playwright: 175 testes aprovados.
- Hidratação de artigos SSR: 10 verificações aprovadas.
- Segurança em Chromium: 16 testes aprovados.

Cobertura Angular (instruções, ramificações, funções e linhas): 2452/2603 (94,19%),
1705/1839 (92,71%), 673/711 (94,65%) e 2050/2174 (94,29%).

Cobertura do servidor, na mesma ordem: 400/401 (99,75%), 368/373 (98,65%), 67/67
(100%) e 370/371 (99,73%).

Evidências: [Validate Sanaka](https://github.com/brublurryface/sanaka/actions/runs/45255856396),
[Browser critical flows](https://github.com/brublurryface/sanaka/actions/runs/45255853047)
e [Article SSR experiment](https://github.com/brublurryface/sanaka/actions/runs/45255856731).

A cobertura Angular mede TypeScript de produção no escopo configurado pelo comando
`test:coverage`; as rotas declarativas são excluídas. A cobertura do servidor considera
os módulos explicitamente incluídos em `vitest.server.config.mts`. Esses números não
representam cobertura de todos os arquivos, templates, estilos ou do código WordPress.

## Contratos de qualidade

A política de cobertura em `scripts/coverage-policy.mjs` usa os contadores dos relatórios
V8 e preserva as proporções exatas acima para Angular e servidor, sem depender de
percentuais arredondados. Os dois comandos de cobertura
utilizam o mesmo verificador. A própria política recebe testes automatizados, incluindo
casos de regressão individual, proporções equivalentes, relatório inválido e escopo desconhecido.

Os relatórios por arquivo são preservados no workflow de validação. Uma regressão deve
ser investigada; alterar o limite ou excluir arquivos exige uma justificativa explícita
na revisão. Elevar um limite exige evidência de cobertura efetivamente atingida.

## Auditoria do escopo do servidor

O inventário de `src/server` e `src/shared` identificou 16 módulos incluídos no relatório
unitário e três exclusões explícitas:

- `src/server/legacy-wordpress-data.ts`: inventário declarativo de URLs e IDs. Os destinos
  são exercitados pelo resolvedor de redirecionamentos.
- `src/shared/contact.ts` e `src/shared/newsletter.ts`: constantes e contratos
  compartilhados, exercitados pelos consumidores de contato e newsletter.
- `src/server.ts`: composição Express e Angular, fora dos diretórios acima, exercitada
  pelo servidor de produção nos testes E2E de cabeçalhos, rotas, APIs e encerramento.

A verificação de inventário rejeita módulos TypeScript novos em `src/server` e
`src/shared` que não apareçam no relatório, salvo exclusões explícitas. Arquivos de teste
e declarações de tipos não entram nessa medição. A auditoria por arquivo no Angular e
a proteção de linhas alteradas ainda dependem da análise dos relatórios detalhados.

## Critérios para a auditoria completa

A nota de qualidade é uma avaliação de engenharia, não uma métrica oficial nem uma
consequência automática de cobertura alta. Os seguintes critérios serão avaliados com
evidências reproduzíveis e sem alteração indevida do comportamento de produção.

Implementados:

- Registrar a linha de base e proteger as quatro métricas globais.
- Documentar as convenções de contribuição, testes e validação.

Pendentes de auditoria:

- Cobertura por arquivo, linhas alteradas e módulos novos, com proteção dos contratos críticos.
- Comportamento, isolamento, fixtures, mocks, cancelamento, erros, limites e asserções.
- Ampliar WebKit e avaliar Firefox, preservando os projetos Chromium existentes.
- Acessibilidade automatizada, teclado, foco, anúncios e verificações manuais aplicáveis.
- Regressão visual com referências aprovadas, sem atualizar snapshots para ocultar diferenças.
- Mutação de regras críticas, análise de sobreviventes e definição de limites por escopo.
- Orçamentos reproduzíveis de LCP, CLS, tráfego, memória e rede lenta.
- Confiabilidade do pipeline, diagnósticos, duração, repetibilidade e isolamento.

A conclusão exige validação dos workflows aplicáveis, revisão dos resultados e registro
de pendências reais. Não se considera uma etapa aprovada apenas porque foi planejada.

## Prevenção de falhas de entrega

O protocolo local está em [CONTRIBUTING.md](../CONTRIBUTING.md). As fases do comando de
validação são compartilhadas com o CI. A validação Linux, a validação Windows e a integração WordPress executam em paralelo.
O check Validate Sanaka exige o sucesso das três verificações.

A versão de Node vem de `.node-version` e a versão de npm vem de `package.json`.
O job de validação usa a imagem Playwright com navegadores pré-instalados, já adotada
pelos fluxos críticos. As versões do Playwright e da imagem devem permanecer compatíveis.

Uma falha de formatação gera um patch como artefato, sem alterar o repositório remoto.
A proteção da main deve exigir os checks de validação, navegador e SSR. A consulta
completa às regras administrativas ficou indisponível para a integração.

A auditoria de regras ESLint e de qualidade de templates continua pendente. O TypeScript
estrito, os templates estritos, a análise arquitetural e a duplicação já são verificados.
Não introduzir outra ferramenta sem identificar lacunas concretas.

## Compatibilidade e traduções

Os testes do resolvedor de traduções SSR usam caminhos nativos do sistema operacional,
sem assumir separadores de Linux. As suítes App, Home e Matrix leem os catálogos publicados
por meio de uma fixture compartilhada, evitando catálogos parciais e chaves duplicadas.
As configurações Vitest usam a extensão ESM explícita `.mts`.

A validação Windows executa as suítes Angular e servidor com os mesmos limites de cobertura
do Linux. A aprovação em ambos os sistemas ainda precisa ser comprovada pelo CI.

## Limitações conhecidas da linha de base

WebKit executa atualmente os testes de Home e quebra-cabeças, não a suíte completa.
No teste da Nandinī, Chromium compara quadros pintados na tela. WebKit valida a seleção,
as dimensões e a estrutura do WebP; essa verificação não comprova a progressão visual
automática. O custo da animação em rede lenta precisa ser medido separadamente.
