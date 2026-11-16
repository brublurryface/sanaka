# Fluxos críticos em navegador

A suíte Playwright em `e2e/` executa a aplicação Angular de produção pelo servidor Express real. Ela complementa os testes Vitest existentes; não os substitui. O workflow independente `Browser critical flows` executa os cenários em Chromium desktop e em uma viewport de celular com toque.

## Executar

```sh
npm ci
npx playwright install --with-deps chromium
npm run test:e2e:types
npm run build
npm run test:e2e
```

O runner inicia o build em `127.0.0.1:4300`, espera `/api/health` e encerra o processo ao terminar. Ele não reutiliza um servidor que já esteja na porta, evitando testar uma revisão diferente por engano. Não são necessárias credenciais ou variáveis de produção.

## Cenários

- Loading inicial das quatro páginas: Posts, artigo, Sobre e Sanaka-loka. A arte precisa carregar; header, conteúdo e footer permanecem ocultos e inertes. Um observador de frames detecta exposição do shell enquanto o loading está presente.
- Śabala usa o iframe original de Hysteria: os testes aguardam a imagem carregada e o primeiro frame desenhado no canvas, conferem LOADING, nove notas e duas linhas ornamentais e verificam a remoção do contexto do iframe ao terminar ou abandonar a página.
- Posts aguardam a árvore de categorias, mesmo com a resposta das publicações disponível.
- Voltar à Home durante uma espera remove o loading e impede que a resposta atrasada restaure a página abandonada.
- Erro temporário de artigo e arquivo exige retentativa explícita e recupera o conteúdo sem duplicá-lo. Artigo inexistente oferece retorno ao arquivo.
- Newsletter pelo footer, fragmento direto, repetição do link e cancelamento da navegação: URL, posição e foco são conferidos depois do loading.
- Home e quebra-cabeça usam a rolagem nativa aprovada. Os testes observam posições intermediárias com movimento normal e o salto direto solicitado por movimento reduzido, sem impor duração em milissegundos.
- Um único `main` global nas onze rotas cobertas, incluindo o arquivo paginado, o portal REST e a página inexistente. A mesma verificação acompanha os fluxos de erro, retentativa e cancelamento por meio de `expectReady`.
- A troca PT/EN traduz controles e datas sem mudar o conteúdo português nem repetir consultas ao CMS. Título, corpo e prévia mantêm `lang="pt-BR"`; controles herdam o idioma da interface.

## Estrutura e idioma editorial

`app.html` fornece o único `main` da aplicação. Posts, artigo e portal REST usam contêineres `div` dentro dele; as classes, os estilos e as artes existentes são preservados.

O WordPress atual é monolíngue. O token público `SANAKA_WORDPRESS_CONTENT_LANGUAGE`, em `wordpress-content-policy.ts`, explicita `pt-BR` como idioma editorial, independentemente do Transloco. Ele marca título, corpo, prévias, alternativas das capas e títulos de publicações adjacentes. Não engloba datas, botões ou rótulos traduzidos. Não há inferência de idioma pelo texto. Se o CMS passar a publicar em vários idiomas, o contrato precisará transportar o idioma de cada publicação.

Os testes conferem os atributos e a herança de idioma no DOM, sem prometer uma auditoria completa de leitores de tela ou de acessibilidade. Referências: [landmark principal](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/examples/main.html) e [idioma de partes do conteúdo](https://www.w3.org/WAI/WCAG22/Understanding/language-of-parts.html).

## Isolamento e diagnósticos

Na primeira execução, a regressão identificou que o link nativo da Home podia emitir `popstate` e ser interpretado como navegação de histórico: o fragmento aparecia na URL, mas a restauração do roteador interrompia a rolagem. O link agora usa `RouterLink` com `fragment`, passando pelo `PageAnchorNavigation` existente, assim como a Newsletter. A rolagem continua usando a API nativa e o CSS aprovado; não foi introduzida duração própria.

Cada teste recebe contexto de navegador e fixtures novos. As respostas reproduzem as categorias editoriais obrigatórias `romance`, `sobre` e `sanaka-loka`, a árvore de categorias e os cabeçalhos de paginação do WordPress. As esperas são controladas por respostas que o teste libera, sem `waitForTimeout`, dependência do CMS ou alteração do estado interno Angular.

O navegador intercepta WordPress e disponibilidade da Newsletter. Escritas HTTP e serviços externos não previstos são bloqueados e fazem o teste falhar. Fontes externas usam fallback local; as imagens e animações locais permanecem as do repositório. Nenhuma oferta, inscrição ou mensagem real é enviada.

Erros não tratados da aplicação também reprovam o teste. Não há retentativa automática da suíte para esconder instabilidade. Em falha, o CI guarda trace, captura e console do navegador por três dias; são dados sintéticos de teste. Os relatórios gerados ficam fora do Git.

A suíte inclui a integração de Śabala incorporada pela PR #100 e convive com a regressão de segurança do conversor HTML da PR #101, executada pelo workflow `Validate Sanaka`.

Referências: [boas práticas do Playwright](https://playwright.dev/docs/best-practices), [respostas simuladas](https://playwright.dev/docs/mock) e [servidor do runner](https://playwright.dev/docs/test-webserver).
