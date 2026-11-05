# DOM e imagens — linha de base de laboratório

## Resultado e decisão

A retenção do arquivo contínuo cresce linearmente. Em mobile (390 × 844) e desktop (1280 × 844), o arquivo com 20/200/500 posts teve 326/2126/5125 elementos. A biblioteca alcançou 100 livros após oito ações de carregar mais e teve 799 elementos. Nenhum livro ou post foi truncado ou baixado antecipadamente em lote único.

Manter a leitura paginada existente como alternativa para acervos longos. Não cortar cartões já carregados nem introduzir virtualização com base apenas nestes números: a fixture é textual e não representa o custo de centenas de capas diferentes. Uma evolução deve comparar também rolagem, foco, retorno ao artigo e memória retida após navegar. Não há evidência para memoização adicional da pequena árvore atual de categorias.

| Amostra                | Viewport | DOM  | Heap observado (MiB) | LCP de laboratório (ms) | CLS observado |
| ---------------------- | -------- | ---- | -------------------- | ----------------------- | ------------- |
| Arquivo 20             | 390      | 326  | 11,94                | 168                     | 0,348         |
| Arquivo 200            | 390      | 2126 | 15,68                | 168                     | 0,807         |
| Arquivo 500            | 390      | 5125 | 12,98                | 168                     | 0,807         |
| Arquivo 20             | 1280     | 326  | 14,42                | 192                     | 0,148         |
| Arquivo 200            | 1280     | 2126 | 16,22                | 192                     | 0,345         |
| Arquivo 500            | 1280     | 5125 | 23,74                | 192                     | 0,362         |
| Biblioteca 100         | 390      | 799  | 22,91                | 152                     | 0,358         |
| Artigo com capa grande | 390      | 184  | 24,01                | 448                     | 0,277         |
| Home                   | 390      | 138  | 26,33                | 228                     | 0,230         |
| Home                   | 1280     | 138  | 28,28                | 148                     | 0,042         |
| Saṃvit, animação Śeṣa  | 390      | 98   | 32,46                | 152                     | 0,044         |

Os valores de heap compartilham o processo do Chromium e variam com o GC; o valor menor em 500 posts não significa menor retenção. O LCP permanece o da navegação inicial ao acrescentar posts. As amostras são sequenciais, com cache compartilhado, sem limitação de CPU/rede e em iframe. A Home deste build é CSR para permitir a fixture; a Home publicada é prerenderizada. Não comparar esses tempos como desempenho de produção nem como p75 mobile.

Os deslocamentos observados, sobretudo no arquivo mobile, precisam de uma gravação de trace com atribuição a elementos antes de corrigir layout/fontes. O painel calcula a maior janela de CLS (até 5 s, com menos de 1 s entre deslocamentos, excluindo entrada recente), mas as ações automatizadas e a inspeção de acessibilidade também interferem na experiência observada. Event Timing retornou um outlier de 9208 ms numa visita de 500 posts; isso **não é INP p75**, não prova uma trava do aplicativo e não deve fundamentar uma alteração sem trace. Não foi instalado rastreamento de visitantes para obter INP real.

## Imagens e integridade

O inventário contém 34 imagens, 61.393.001 bytes no conjunto, com tamanho, dimensões, número de frames e SHA-256. Esse total é do repositório, não de uma visita. Nenhum arquivo em `public` foi alterado.

| Recurso observado                 | Bytes originais | Observação                                                                           |
| --------------------------------- | --------------- | ------------------------------------------------------------------------------------ |
| `posts-atmosphere-desktop.webp`   | 1.808.422       | O mesmo recurso foi usado no hero de 375 e 1265 px neste teste                       |
| `sanctuary-hero.png`              | 1.819.062       | Fundo da Home                                                                        |
| `samvit-sanaka.png`               | 1.469.618       | Arte da Home                                                                         |
| `samvit-sesha-blink.png`          | 5.446.333       | APNG, 4 frames; carregado intacto no artigo de teste e em Saṃvit                     |
| `samvit-sesha-sleeping-still.png` | 2.440.792       | Mesmas dimensões 1484 × 1060; alternativa estática já existente                      |
| `about-cycles-sketch-nine.webp`   | 2.765.158       | Fixture reutiliza essa capa nos 100 livros; o browser pode compartilhar seu download |

A capa grande respondeu com 5.446.333 bytes de corpo na navegação observada. O inventário mostra uma oportunidade de recursos responsivos, mas nenhum formato novo foi gerado. Para o WordPress, propor `srcset` apenas quando a mídia trouxer largura real de cada variante; manter a original como fallback e não substituir animações por derivados estáticos. Para as artes locais, criar derivados requer comparação visual das linhas, mãos, transparência e frames antes de aprovar.

O teste do navegador confirmou a animação selecionada; o inventário e os testes existentes verificam os caminhos das alternativas estáticas. Não foi emulada a preferência de movimento reduzido de um dispositivo real nesta medição. O comportamento existente de `picture` com `prefers-reduced-motion` foi preservado.

## Reprodução

```sh
npm ci
npm run build -- --configuration production,performance --output-path dist/performance
node experiments/performance/preview.mjs
```

Abrir o URL exato retornado pelo preview e o arquivo `__audit-frame.html`. Os seletores permitem escolher a rota e a largura. Para iniciar o iframe já em mobile, usar `?width=390`; para outra rota, acrescentar `&route=/sanakaverse`, por exemplo. Capturar no painel após o conteúdo carregar, usar os controles reais de carregar mais e registrar o JSON exibido. Não redimensionar uma visita já iniciada para comparar o CLS inicial de outro viewport.

O build `performance` é independente e não muda o build padrão. O servidor de teste usa somente módulos nativos e fixtures locais, não encaminha credenciais nem realiza POST no CMS. O script de preview restaura `package.json` após fornecer o comando temporário ao preview gerenciado. Os dados resumidos e as limitações estão em `data/browser-baseline-2026-11.json`; os bytes e checksums, em `data/image-inventory-2026-11.json`.
