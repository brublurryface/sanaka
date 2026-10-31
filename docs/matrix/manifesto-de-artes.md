# Matrix — manifesto de artes exclusivas

Em 15/10/2026 foram aplicadas as três artes enviadas pela autora. Cada imagem mantém
o enquadramento e as dimensões de origem (1942 × 809 px), convertidos para WebP com
qualidade 92. Não houve redesenho, alteração de iluminação ou ampliação artificial.

| Estudo   | Arte aprovada                                      | Arquivo publicado                                                | Tamanho         |
| -------- | -------------------------------------------------- | ---------------------------------------------------------------- | --------------- |
| Óbolos   | Mors e Busca no Sótão das Relíquias.png            | `public/images/matrix/obolos/obolos-atmosphere-desktop.webp`     | 426.504 bytes   |
| Entregas | As Entregas de Akasha v3.png                       | `public/images/matrix/entregas/entregas-atmosphere-desktop.webp` | 2.412.664 bytes |
| Jogo     | Kalika na Taverna Oculta de Cartas e Espíritos.png | `public/images/matrix/jogo/jogo-atmosphere-desktop.webp`         | 461.300 bytes   |

Os três usam o mesmo Header, degradês, sombra de texto e comportamento responsivo.
O mobile usa o recorte compartilhado da imagem horizontal; não há arte vertical
exclusiva. A Padaria continua com fallback neutro até receber sua arte aprovada.

## Entrada da Matrix — Saṃvit e gaṇāḥ

Em 27/10/2026, a autora autorizou a substituição da arte da entrada da Matrix pela
versão de Saṃvit de costas, vestida de preto, com gaṇāḥ azuis e violetas no laboratório.
O arquivo `public/images/matrix/matrix-atmosphere-desktop.webp` tem 1942 × 809 px e
1.296.608 bytes. A conversão usa WebP sem perda, com igualdade dos pixels RGBA
verificada após a decodificação. As dimensões do HTML e os textos alternativos em
PT-BR e inglês acompanham essa versão.

## Contrato comum

Criação desktop: **2400 × 1000 px**. Criação mobile: **1080 × 1350 px**.
Publicação: **WebP otimizado**, com nitidez conferida após conversão. Meta inicial de
até 250 KB por variante, não um teto que justifique destruir linhas finas.

Pasta por laboratório: `public/images/matrix/<id>/`. Os nomes mobile da tabela abaixo
indicam arquivos futuros; não configure URLs para imagens que ainda não existem.

| Estudo   | Desktop                            | Mobile                            | Personagens                                           |
| -------- | ---------------------------------- | --------------------------------- | ----------------------------------------------------- |
| Óbolos   | `obolos-atmosphere-desktop.webp`   | `obolos-atmosphere-mobile.webp`   | Mors                                                  |
| Entregas | `entregas-atmosphere-desktop.webp` | `entregas-atmosphere-mobile.webp` | Ākāśa                                                 |
| Jogo     | `jogo-atmosphere-desktop.webp`     | `jogo-atmosphere-mobile.webp`     | Kālikā e Mors                                         |
| Padaria  | `padaria-atmosphere-desktop.webp`  | `padaria-atmosphere-mobile.webp`  | Saṃvit, Nandinī, Mors; Ākāśa se a composição permitir |

Reserve uma região escura e tranquila à esquerda para título e texto no desktop.
No mobile, componha de novo o enquadramento: não dependa de recortar a arte horizontal.
Proteja rostos, patas, asas, caudas e conexões importantes da área ocupada pelo texto.
Não inclua títulos ou labels dentro da imagem.

O Header mantém as bordas superior/inferior fundidas ao preto **exato** do tema,
`#0d1117`, com os degradês já existentes. A imagem não invade o Header de navegação.
Não adicione moldura, card, vinheta oval atrás das palavras ou layout por laboratório.

## Direção comum de desenho

Mangá 2D delicado do Projeto Sanaka: linhas finas nítidas, cores/sombras controladas.
Cenário, objetos e personagens pertencem ao mesmo desenho. Sem fundo fotográfico,
render 3D, manchas entre mechas ou anatomia genérica. A composição pode ter humor,
curiosidade e seriedade sem converter todos os personagens em crianças hiper-chibi.

## Óbolos de Mors

A arte aprovada mostra Mors e seus companheiros procurando moedas e relíquias em um
sótão. Respeitar as asas negras, cabelo e roupa da referência **Mors.png** e, sobretudo,
**esclera preta**, não branca.

Em 31/10/2026, a autora aprovou a versão com o olho de Nandinī revisado a partir de
**Nandini-de-lado.png**. O asset conserva as dimensões de 1942 × 809 px e usa WebP
sem perda, com igualdade de todos os pixels RGBA verificada em relação ao PNG
aprovado. Essa versão substitui a conversão de qualidade 92 registrada em 15/10.
O Header, os degradês e o recorte responsivo permanecem os mesmos.

Não inventar moedas canônicas ou reversos. Se houver moedas reconhecíveis na arte,
usar referências aprovadas. Saṃvit, Mors e Ākāśa compartilham o reverso canônico.

## Entregas de Ākāśa

Em 25/10/2026, a arte foi substituída por **As Entregas de Akasha v3.png**, enviada
pela autora após corrigir erros da versão anterior. A conversão atual é WebP sem perda,
sem redimensionamento (1942 × 809 px), com igualdade de todos os pixels RGBA verificada
após a decodificação. Essa versão substitui a conversão de qualidade 92 registrada em 15/10.

A arte aprovada mostra Ākāśa diante de painéis estelares com alertas, personagens nas
telas e fios de energia. Mantém sua forma quadrúpede, chifres, peito claro e escamas
escuras estreladas. Não substituir a imagem por um entregador humano genérico.

## Jogo impossível de Kālikā

A arte aprovada mostra Kālikā, Mors e um companheiro estudando cartas em uma taverna,
entre lamparinas e espíritos. O humor está na investigação, não em expressões
exageradamente felizes. Referência **Kalika.png**: cabelo curto, marcações,
adornos, roupa e cauda originais. Sua proporção futura ao lado de Saṃvit é ligeiramente
mais baixa. Não alongar cabelo ou inventar novos braços. Mors conserva sua esclera preta.

## Padaria de Saṃvit

Primeira ideia: Saṃvit diante de um balcão com dois pães; Nandinī confere a disponibilidade,
Mors registra créditos fictícios. Ākāśa pode participar da entrega se houver espaço, sem
apertar todos os corpos num único canto. Não desenhar cartões bancários nem prometer
uma loja real. O cenário inteiro deve ser mangá.

Referência atual da Saṃvit: `public/images/samvit/presences/samvit-with-bhu-still.png`,
sem adicionar Bhū automaticamente. Preservar o rosto e as proporções da referência,
cabelos castanho-escuros até os ombros, olhos vermelho-laranja-amarelos, roupa preta
com gola alta e sobreposição longa marfim. As orelhas e a cauda são de lobo-guará.
Cauda proporcional, elegante, ponta clara e origem no cóccis; não nas costas,
em outro personagem ou com volume de esquilo. Não inserir chama na composição.

Nandinī continua **Bull Terrier com chifres de touro**, patas e cabeça canônicas.
Referências **Nandini.png** e **Nandini-de-lado.png**; preservar flores, cordões vermelhos,
adornos dourados e capa. Não converter patas em mãos ou omitir os adornos.

## Aplicação futura

Após aprovar as duas variantes, coloque os arquivos na pasta proposta e configure
`desktopImage`/`mobileImage` no `study` da página. O mesmo Frame usa `<picture>` e o
Header compartilhado. Ajuste `imageAlt` em PT-BR e inglês. Se uma variante ainda não
estiver pronta, não configure sua URL.

Conferir desktop 1440px e mobile 360/390px com o título, texto, degradês e foco visíveis.
Confirmar que o mobile não corta elementos anatômicos importantes. Nenhum teste de
TypeScript substitui a inspeção visual da arte publicada.
