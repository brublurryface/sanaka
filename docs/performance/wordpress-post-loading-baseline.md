# Linha de base — carregamento das publicações do WordPress

Data da medição: 29/09/2026

Issue relacionada: #47

## Objetivo

Registrar o comportamento anterior à otimização do arquivo e da leitura completa de publicações. O WordPress continua sendo o CMS e a aplicação Angular, a experiência pública de Sanaka.

## Método

As medições foram realizadas contra a REST API pública de produção com HTTP/2 e conexão reutilizada. A primeira chamada feita pelo ambiente de execução apresentou custo adicional de negociação TLS e proxy, entre 9 e 12 segundos, e foi descartada da comparação por não representar o processamento recorrente do WordPress.

Os intervalos abaixo representam chamadas aquecidas repetidas. Eles devem ser complementados por uma conferência no painel de rede do navegador após a publicação em produção.

| Recurso                       | Tempo observado | Transferência aproximada |
| ----------------------------- | --------------: | -----------------------: |
| Página nativa do WordPress    |     1,09–1,17 s |                  11,9 KB |
| Arquivo de publicações        |     1,30–1,54 s |                   4,3 KB |
| Categorias                    |     1,13–1,20 s |                    409 B |
| Tags                          |     1,17–1,22 s |                   1,4 KB |
| Publicação completa           |     1,22–1,47 s |                   2,6 KB |
| Mídia destacada isolada       |     1,13–1,18 s |                    136 B |
| Arquivo com mídia incorporada |     1,30–1,47 s |                 55–59 KB |

## Diagnóstico

O payload textual da aplicação é pequeno. O maior atraso vinha da sequência de viagens à API:

- arquivo: publicações → categorias e mídias;
- detalhe: publicação → categorias, tags e mídia → navegação adjacente;
- cartões: uso da imagem original, mesmo quando o WordPress oferecia versões menores.

Como cada chamada aquecida levava aproximadamente 1,2 a 1,5 segundo, a cascata elevava o caminho crítico estimado para 2,4 a 2,7 segundos antes do download das imagens.

O Angular já habilita o cache de transferência HTTP por meio de `provideClientHydration()`. Portanto, não foi adicionada uma segunda configuração de hidratação para tentar corrigir um problema que estava na organização das consultas.

## Otimização adotada

- solicitar a mídia destacada com `_embed=wp:featuredmedia`;
- carregar publicações e categorias em paralelo;
- carregar publicação, categorias e tags em paralelo na leitura completa;
- retirar a consulta adicional ao endpoint de mídia;
- usar `medium_large`, com fallback para `large` e para a imagem original, nos cartões;
- preservar a imagem original na página da publicação;
- carregar miniaturas com `loading="lazy"` e `decoding="async"`;
- manter a exclusão da categoria Romance definida pela política de conteúdo de Sanaka.

Com essa organização, o caminho crítico esperado passa a acompanhar a requisição paralela mais lenta, cerca de 1,3 a 1,5 segundo nas mesmas condições, em vez da soma de duas chamadas. A confirmação definitiva deve ser feita depois do deploy, comparando arquivo e detalhe em navegação fria e aquecida.
