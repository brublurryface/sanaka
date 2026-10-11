# Matrix — manifesto de artes exclusivas

A arte enviada pela autora, **Busca no Sótão das Relíquias(1).png**, foi aplicada aos
Óbolos de Mors, em WebP (1942 × 809 px). Personagens, cores e iluminação foram preservados.
Está em `public/images/matrix/obolos/obolos-atmosphere-desktop.webp` e usa o Header,
degradês e sombra de texto compartilhados. Ainda não há composição mobile exclusiva.

Os outros três laboratórios usam fallback neutro até receberem artes aprovadas.
Os nomes da tabela abaixo descrevem as demais variantes futuras; não crie URLs para
arquivos que ainda não existem.

## Contrato comum

Criação desktop: **2400 × 1000 px**. Criação mobile: **1080 × 1350 px**.
Publicação: **WebP otimizado**, com nitidez conferida após conversão. Meta inicial de
até 250 KB por variante, não um teto que justifique destruir linhas finas.

Pasta proposta: `public/images/matrix/studies/`.

| Estudo   | Desktop                            | Mobile                            | Personagens                                         |
| -------- | ---------------------------------- | --------------------------------- | --------------------------------------------------- |
| Óbolos   | `obolos-atmosphere-desktop.webp`   | `obolos-atmosphere-mobile.webp`   | Mors                                                |
| Entregas | `entregas-atmosphere-desktop.webp` | `entregas-atmosphere-mobile.webp` | Ākāśa                                               |
| Jogo     | `jogo-atmosphere-desktop.webp`     | `jogo-atmosphere-mobile.webp`     | Kālikā e Mors                                       |
| Padaria  | `padaria-atmosphere-desktop.webp`  | `padaria-atmosphere-mobile.webp`  | Māyā, Nandinī, Mors; Ākāśa se a composição permitir |

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

Mors investiga uma bancada escura com uma caixa de óbolos e pequenos grupos repetidos.
Uma mão organiza, outra compara. Livros e registros sugerem inventário sem competir com
o título. Respeitar as asas negras, cabelo e roupa da referência **Mors.png** e, sobretudo,
**esclera preta**, não branca.

Não inventar moedas canônicas ou reversos. Se houver moedas reconhecíveis na arte,
usar referências aprovadas. Māyā, Mors e Ākāśa compartilham o reverso canônico.

## Entregas de Ākāśa

Volumes dispostos numa sequência clara diante de Ākāśa; um está a caminho e outros
aguardam. Uma marca discreta de retorno pode sugerir retry, sem texto falso legível.
Atmosfera cósmica escura com acentos dourados. Ākāśa permanece **dragão quadrúpede** das
referências **Akasha-busto(2).png** e **Akasha-canon(5).png**: azuis noturnos, peito claro,
chifres e proporções originais. Não transformá-lo em humano/entregador genérico.

## Jogo impossível de Kālikā

Kālikā confronta três sinais sobre uma mesa; Mors aproxima mais dois, provocando uma
investigação curiosa e séria das relações. O humor está no problema que cresce, não em
expressões exageradamente felizes. Referência **Kalika.png**: cabelo curto, marcações,
adornos, roupa e cauda originais. Sua proporção futura ao lado de Māyā é ligeiramente
mais baixa. Não alongar cabelo ou inventar novos braços. Mors conserva sua esclera preta.

## Padaria de Māyā

Primeira ideia: Māyā diante de um balcão com dois pães; Nandinī confere a disponibilidade,
Mors registra créditos fictícios. Ākāśa pode participar da entrega se houver espaço, sem
apertar todos os corpos num único canto. Não desenhar cartões bancários nem prometer
uma loja real. O cenário inteiro deve ser mangá.

Referência da Māyā: **maya-bhu-readme.png**, sem adicionar Bhu automaticamente. Cabelos
castanho-escuros até os ombros no máximo, volume canônico, roupa de monge, orelhas e
cauda de lobo-guará. Cauda proporcional, elegante, ponta branca e origem no cóccis;
não nas costas, em outro personagem ou com volume de esquilo. Não inserir chama só
porque a imagem de referência contém uma.

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
