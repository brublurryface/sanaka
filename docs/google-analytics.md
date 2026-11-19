# Google Analytics no Sanaka

O código prepara a medição de páginas com GA4. A ativação depende de um fluxo Web e do ID de
medição correspondente. A inspeção do repositório e do HTML público de Sanaka e do CMS não
localizou uma tag Google existente. A existência de uma propriedade na conta do Analytics
deve ser confirmada no painel da titular.

## Preferência no rodapé

Com o Analytics configurado, o rodapé apresenta **Preferências de cookies** e a frase da autora.
O visitante pode aceitar ou recusar com botões equivalentes e reabrir a escolha pelo mesmo
controle. O painel cabe no fluxo normal da página e aparece junto ao restante do rodapé.

Para experimentar as preferências no computador, rode `npm start` e vá ao rodapé em
`http://localhost:4200`. A prévia também funciona em `127.0.0.1`. As escolhas ficam no navegador
para aquele endereço, sem exigir um ID de medição nem carregar a tag do Google.

O modo básico carrega a tag após aceite explícito. Antes de aceitar, o site consulta apenas sua
configuração no próprio domínio e a preferência local. A escolha fica registrada no navegador
por ID de medição. A retirada pausa a tag, expira os cookies de análise com prefixo `sanaka` e
é aplicada nas outras abas do mesmo domínio. A tag recebe `cookie_domain: 'none'` e um prazo de
90 dias para os cookies que cria. Armazenamento indisponível mantém a escolha durante a visita.

## Medição

| Visita ou ação                                                            | Evento                                                                                              |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Entrada direta ou navegação concluída em página pública elegível          | Um `page_view` depois do aceite e de a tag estar pronta.                                            |
| Artigo                                                                    | Um `page_view` quando o WordPress confirma o artigo público e a rota corresponde ao slug retornado. |
| Buscar, filtrar ou paginar o arquivo de Posts                             | A mesma página `/posts`.                                                                            |
| Trocar idioma, seguir âncora ou abrir o iframe de Śabala                  | A página atual.                                                                                     |
| Artigo indisponível, rota desconhecida ou saída antes da tag ficar pronta | A página pode ficar fora da contagem.                                                               |

O Analytics recebe a URL canônica sem query ou fragmento. A origem externa chega apenas como
protocolo e domínio. Em navegações internas, o referenciador vem da última página medida. O evento
usa o título fixo `Sanaka` e a URL identifica a página no relatório. A aplicação emite apenas
`page_view`; não envia campos de formulários, termos de busca, filtros ou ofertas. As estatísticas
representam os visitantes que deram aceite e tiveram a tag carregada.

## Ativação e conferência

1. Confirmar a propriedade do Sanaka no Analytics e selecionar um fluxo Web para
   `https://sanaka.com.br`. Anotar o ID público `G-…` do fluxo.
2. Desativar **Medição otimizada** nesse fluxo para que o Google não conte histórico de navegação
   de novo e não colete interações extras. Conferir que os recursos publicitários e a coleta de
   dados fornecidos pelo usuário estão desativados. O código também nega consentimento para anúncios,
   desativa os sinais de publicidade e configura `send_page_view: false`.
3. Na revisão aprovada, configurar `SANAKA_GA4_MEASUREMENT_ID` no ambiente do serviço de produção
   e aplicar o deploy conforme o fluxo do Render. Um ID ausente/inválido ou `SITE_NOINDEX=true`
   deixa a medição desativada. A tag só inicializa no domínio canônico HTTPS.
4. Usar o Tag Assistant em uma visita controlada e conferir o DebugView. Antes do aceite e depois
   da recusa, observar a ausência de carregamento da tag. Com aceite, conferir o evento inicial,
   a navegação para um artigo, as URLs sem parâmetros e a ausência de duplicação após âncora/idioma.
   Confirmar o comportamento após retirar o aceite. Manter o tráfego de teste fora dos relatórios
   de produção com o filtro de desenvolvedores do GA4, quando fizer sentido para a conta.
5. Para suspender a medição, retirar a variável do ambiente e publicar a configuração.

O backend disponibiliza somente o ID público em `/api/analytics/config` com `no-store`. A CSP
de observação inclui as origens do Google Analytics com recursos de anúncios desativados quando
há um ID válido. Os testes de navegador usam um fluxo fictício e interceptam a tag. Eles comprovam
as decisões e os comandos do Sanaka. O recebimento no DebugView requer a conferência do fluxo real.

Referências: [Consent Mode básico](https://developers.google.com/tag-platform/security/concepts/consent-mode),
[visualizações manuais](https://developers.google.com/analytics/devguides/collection/ga4/views),
[controle da coleta](https://developers.google.com/tag-platform/security/guides/privacy) e
[CSP para o Google Analytics](https://developers.google.com/tag-platform/security/guides/csp).
