# Saṃvit e o ouroboros na Home

A animação aprovada pela autora passa a ser a imagem da Home.
A aprovação inclui a piscada, o ouroboros em movimento e a mão reconstruída,
com transparência entre os dedos. O arquivo aprovado não foi redesenhado,
redimensionado, reanimado ou recodificado nesta integração.

| Recurso                                                   | Propriedades                                                                                         |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `public/images/samvit/samvit-sanaka-ouroboros-motion.png` | PNG animado RGBA, 900 × 1254 px, 127 quadros, ciclo de 4290 ms, repetição contínua, 20.902.654 bytes |
| SHA-256 da animação aprovada e publicada                  | `14b5d62affbb571d3a14877968164433b77b3066dc41da09f8ff96e3a119559a`                                   |
| `public/images/samvit/samvit-sanaka-ouroboros-still.png`  | Primeiro quadro extraído sem alterar seus pixels; fallback da mesma arte aprovada                    |

O `<picture>` escolhe a animação somente com
`prefers-reduced-motion: no-preference`. Quem pede movimento reduzido recebe
o PNG estático e mantém a flutuação CSS desativada pela regra já existente.
O wrapper usa `display: contents` para preservar o alinhamento, a proporção
e o tamanho responsivo da imagem no grid. O texto alternativo continua Saṃvit.

A origem estática anterior permanece no repositório como registro. Esta mudança
é específica da Home e não altera o sorteio de presenças em `/samvit`.
Os 20,9 MB são o tamanho do arquivo aprovado, sem conversão automática.
Qualquer otimização posterior precisa preservar transparência, mão, contorno,
cores e tempos e passar por comparação visual própria.

Os dois PNGs foram enviados integralmente pelo navegador pela autora e integrados
à `main` na [PR #82](https://github.com/brublurryface/sanaka/pull/82).
Seus objetos Git são `fb5b9b096de089ef9eba32b281ed2afa9ccce5b2` (animação) e
`db5238df4685730cb3d874402c3775e083166cbe` (imagem estática).
Esta integração reutiliza esses arquivos; não exige outro envio do binário.
