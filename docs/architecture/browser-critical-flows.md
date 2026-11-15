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
- Posts aguardam a árvore de categorias, mesmo com a resposta das publicações disponível.
- Voltar à Home durante uma espera remove o loading e impede que a resposta atrasada restaure a página abandonada.
- Erro temporário de artigo e arquivo exige retentativa explícita e recupera o conteúdo sem duplicá-lo. Artigo inexistente oferece retorno ao arquivo.
- Newsletter pelo footer, fragmento direto, repetição do link e cancelamento da navegação: URL, posição e foco são conferidos depois do loading.
- Home e quebra-cabeça usam a rolagem nativa aprovada. Os testes observam posições intermediárias com movimento normal e o salto direto solicitado por movimento reduzido, sem impor duração em milissegundos.

## Isolamento e diagnósticos

Cada teste recebe contexto de navegador e fixtures novos. As respostas reproduzem as categorias editoriais obrigatórias `romance`, `sobre` e `sanaka-loka`, a árvore de categorias e os cabeçalhos de paginação do WordPress. As esperas são controladas por respostas que o teste libera, sem `waitForTimeout`, dependência do CMS ou alteração do estado interno Angular.

O navegador intercepta WordPress e disponibilidade da Newsletter. Escritas HTTP e serviços externos não previstos são bloqueados e fazem o teste falhar. Fontes externas usam fallback local; as imagens e animações locais permanecem as do repositório. Nenhuma oferta, inscrição ou mensagem real é enviada.

Erros não tratados da aplicação também reprovam o teste. Não há retentativa automática da suíte para esconder instabilidade. Em falha, o CI guarda trace, captura e console do navegador por três dias; são dados sintéticos de teste. Os relatórios gerados ficam fora do Git.

As verificações de um único `main` e idioma editorial pertencem à entrega de acessibilidade seguinte. O teste específico do iframe de Śabala será acrescentado quando a PR #100 for incorporada; esta suíte verifica o loading disponível na revisão testada, sem importar essa implementação pendente.

Referências: [boas práticas do Playwright](https://playwright.dev/docs/best-practices), [respostas simuladas](https://playwright.dev/docs/mock) e [servidor do runner](https://playwright.dev/docs/test-webserver).
