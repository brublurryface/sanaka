# Excelência em testes do Sanaka

## Linha de base verificada

A PR #123, no commit `c386702`, registrou a seguinte linha de base:

| Verificação               | Resultado     |
| ------------------------- | ------------- |
| Angular / Vitest          | 880 aprovados |
| Servidor / Vitest         | 281 aprovados |
| Playwright                | 175 aprovados |
| Hidratação de artigos SSR | 10 aprovados  |
| Segurança em Chromium     | 16 aprovados  |

| Métrica      | Angular | Servidor |
| ------------ | ------: | -------: |
| Instruções   |  94,19% |   99,75% |
| Ramificações |  92,71% |   98,65% |
| Funções      |  94,65% |     100% |
| Linhas       |  94,29% |   99,73% |

Evidências: [Validate Sanaka](https://github.com/brublurryface/sanaka/actions/runs/45255856396),
[Browser critical flows](https://github.com/brublurryface/sanaka/actions/runs/45255853047)
e [Article SSR experiment](https://github.com/brublurryface/sanaka/actions/runs/45255856731).

A cobertura Angular mede TypeScript de produção no escopo configurado pelo comando
`test:coverage`; as rotas declarativas são excluídas. A cobertura do servidor considera
os módulos explicitamente incluídos em `vitest.server.config.ts`. Esses números não
representam cobertura de todos os arquivos, templates, estilos ou do código WordPress.

## Contratos de qualidade

A política de cobertura em `scripts/coverage-policy.mjs` usa os contadores dos relatórios
V8 e preserva os limites acima para Angular e servidor. Os dois comandos de cobertura
utilizam o mesmo verificador. A própria política recebe testes automatizados, incluindo
casos de regressão individual, relatório inválido e escopo desconhecido.

Os relatórios por arquivo são preservados no workflow de validação. Uma regressão deve
ser investigada; alterar o limite ou excluir arquivos exige uma justificativa explícita
na revisão. Elevar um limite exige evidência de cobertura efetivamente atingida.

## Critérios para a auditoria completa

A nota de qualidade é uma avaliação de engenharia, não uma métrica oficial nem uma
consequência automática de cobertura alta. Os seguintes critérios serão avaliados com
evidências reproduzíveis e sem alteração indevida do comportamento de produção.

- [x] Registrar linha de base e proteger as quatro métricas globais de ambos os escopos.
- [x] Documentar convenções de contribuição, testes e validação.
- [ ] Auditar cobertura por arquivo e linhas alteradas, inclusive arquivos novos e
  módulos de servidor fora da lista atual. Impedir perdas relevantes nos contratos críticos.
- [ ] Revisar testes unitários e de integração quanto a comportamento, isolamento, fixtures,
  mocks, cancelamento, erros, limites e asserções que detectem regressões reais.
- [ ] Ampliar os fluxos críticos em WebKit; avaliar Firefox e executar os fluxos definidos
  sem remover a cobertura dos dois projetos Chromium existentes.
- [ ] Automatizar acessibilidade com verificação de violações, teclado, foco e anúncios.
  Registrar verificações manuais com tecnologia assistiva e dispositivos físicos quando
  necessárias; uma ferramenta automatizada não comprova conformidade integral.
- [ ] Definir regressões visuais em ambientes e estados determinísticos, com referências
  aprovadas e revisão das diferenças. Não atualizar snapshots automaticamente para ocultar
  uma alteração inesperada.
- [ ] Medir a capacidade dos testes de detectar defeitos com mutação em regras críticas.
  Analisar mutantes sobreviventes e estabelecer limites por escopo antes de bloquear o CI.
- [ ] Definir e medir orçamentos de desempenho (LCP, CLS, tráfego, memória e rede lenta)
  com condições reproduzíveis e distinguir métricas de laboratório de dados reais.
- [ ] Auditar o pipeline: versões, dependências, diagnósticos, duração, repetibilidade e
  isolamento. Preservar a execução completa e documentar limitações.

A conclusão exige validação dos workflows aplicáveis, revisão dos resultados e registro
de pendências reais. Não se considera uma etapa aprovada apenas porque foi planejada.

## Limitações conhecidas da linha de base

WebKit executa atualmente os testes de Home e quebra-cabeças, não a suíte completa.
No teste da Nandinī, Chromium compara quadros pintados na tela. WebKit valida a seleção,
as dimensões e a estrutura do WebP; essa verificação não comprova a progressão visual
automática. O custo da animação em rede lenta precisa ser medido separadamente.
