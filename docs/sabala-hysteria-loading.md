# Śabala — Hysteria na Sanaka-loka

## Origem e fidelidade

Integração do pacote `sanaka-sabala-hysteria-recuperado.zip`, conforme `WORK-INTEGRAR-SABALA-HYSTERIA.md`. A referência comparada foi `referencia-original/sabala-loading-rock-hysteria-demo.html`, SHA-256 `261e515bca235425a9afb08804c4e9c1415c5ac98a9780a73efbae31ec652be1`.

O HTML e o CSS recuperados foram importados sem alteração de bytes. A árvore do palco, incluindo posições das notas, duas linhas ornamentais, canvas e letras, corresponde à referência após substituir somente os caminhos das imagens originalmente embutidas. O CSS original permanece inteiro; o pacote já acrescentava fundo transparente e retirava título e legenda.

O renderer conserva os 360 quadros de nove bandas FFT, o envelope RMS, as nove cores, os cálculos das ondas, das notas e das letras, e o ciclo de 12 segundos. A amplitude vem das frequências analisadas; a geometria senoidal é estilizada. Nenhum áudio é carregado ou reproduzido.

### Proteção do primeiro frame

A única alteração no JavaScript recuperado limita `now - start` a zero antes de calcular o índice. No navegador, o primeiro timestamp de `requestAnimationFrame` podia anteceder `performance.now()` usado na inicialização: o índice negativo interrompia o renderer antes de desenhar as nove linhas. O teste de regressão cobre esse caso. Os quadros posteriores e todos os dados e fórmulas dos efeitos permanecem iguais.

## Angular e ciclo de vida

`LoadingIndicator` usa o documento estático somente na variante `sabala`. Os estados existentes da Sanaka-loka permanecem intactos: consulta inicial, nova tentativa e carregamento de páginas adicionais. Não há duração mínima, atraso artificial nem novo estado para manter a animação em cena.

O carregamento inicial continua no nível da aplicação, com header, conteúdo e footer ocultos e inertes. A paginação mantém os livros visíveis e usa o indicador compacto. Conclusão, erro e destruição da rota removem o iframe; seu documento e os callbacks de animação são descartados pelo navegador.

O iframe possui título formado pelo nome Śabala e pela mensagem traduzida já existente, carregamento imediato e URL literal do próprio projeto. O `sandbox` permite scripts e mesma origem: a origem opaca de `allow-scripts` isoladamente impediu a leitura dos recursos locais no preview. O documento do iframe conserva o isolamento de estilos. Com `allow-scripts allow-same-origin`, o sandbox não constitui uma barreira entre código malicioso e a aplicação pai; esta configuração se destina exclusivamente aos três arquivos estáticos confiáveis e auditados do projeto, nunca a HTML do CMS ou a uma URL fornecida por visitantes.

## Acessibilidade e movimento reduzido

A mensagem do indicador permanece visualmente oculta e acessível. O título do iframe acompanha mudanças de idioma. O CSS e o JavaScript originais atendem a `prefers-reduced-motion`: poster estático, letras e notas sem deslocamento e canvas limpo. Esses contratos são cobertos por testes; a preferência do sistema operacional não foi emulada visualmente nesta revisão.

## Validação

- Comparação estrutural com a referência original e verificação dos arquivos importados.
- Nove traços de cores distintas no canvas, notas/letras variando no tempo e repetição da linha temporal original.
- Regressão para primeiro timestamp anterior à inicialização e ramo de movimento reduzido.
- Fluxos Angular reais de sucesso, vazio, erro, cancelamento ao navegar e paginação preservando livros.
- Conferência no navegador do protótipo e da Sanaka-loka em desktop e viewport de 390 px, com uma fixture HTTP local que responde às consultas reais. Os arquivos do embed foram servidos separadamente, como no projeto; nenhuma versão com recursos inline integra a entrega.
- Após a resposta, observados zero iframes de loading, 12 livros e footer visível, em desktop e no viewport móvel.

A referência original foi mantida intacta fora dos arquivos publicados. Nenhum gráfico aprovado foi modificado, nenhum GIF foi gerado, e não houve merge ou deploy.

## Integridade dos gráficos preservados

| Arquivo         | SHA-256                                                            |
| --------------- | ------------------------------------------------------------------ |
| `animated.webp` | `5579b08e6642614ef08a8747dcf2fa5aa255147227f9365eb5d781355b4b851e` |
| `poster.png`    | `88aa2359d49cc6e354aeb37d5069c59bb7bb96b1fb8c61d7933383f27bb2bac8` |

## Arquivos de integração

| Arquivo        | SHA-256                                                            |
| -------------- | ------------------------------------------------------------------ |
| `hysteria.css` | `ba0b698f101a0a707ed96523c5deda6d19366998004e2209cf4519551cc2101f` |
| `hysteria.js`  | `7389bbef887639a7a64f609191e95734841c48fd2d5747752401e817c3fb6096` |
| `index.html`   | `f58f5f0dcd3dc4e38d0446ebfe443070ce909d0d60df43657dd8544821702124` |
