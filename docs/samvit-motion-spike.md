# Spike de movimento da Saṃvit

## Atualização de 24/10/2026 — Śeṣa e presença de Ākāśa

A animação de Saṃvit e das cinco cabeças de Śeṣa foi aprovada pela autora após a correção
local da pele abaixo do olho de Saṃvit próximo à tatuagem. O APNG aprovado foi copiado sem
alteração para `public/images/samvit/presences/samvit-sesha-blink.png`, com canvas de
1484 × 1060 px. O repouso de olhos fechados dura 4000 ms; o quadro aberto dura 1000 ms e
cada intermediário dura 100 ms. O fallback para movimento reduzido usa o próprio quadro
fechado aprovado, em `samvit-sesha-sleeping-still.png`.

A nova presença de Ākāśa usa `Akasha-sentada.png`, sem alterar corpo, chifres, patas,
cauda, escala ou canal alfa. Apenas as duas regiões de pálpebras recebem o desenho fechado
de `Akasha-deitada.png`, alinhado localmente sobre a pose sentada. A montagem é feita por
máscaras em Python, sem gerar uma nova ilustração. O APNG `akasha-seated-blink.png` tem
1359 × 1158 px, com 4000 ms de olhos abertos e uma piscada de 120 ms. O fallback
`akasha-seated-still.png` é uma cópia integral da imagem sentada fornecida. A aparência da
nova piscada de Ākāśa está disponível para revisão da autora nesta atualização.

Os dois APNGs foram decodificados quadro a quadro: alfa e cores visíveis são idênticos aos
PNGs de origem, durações são exatas e a repetição é infinita. Na montagem de Ākāśa, as
alterações ficam restritas às máscaras dos olhos; não há deslocamento do desenho inteiro.
O `<picture>` informa `image/png` para APNG e mantém `image/webp` para as cinco animações
existentes. A condição `prefers-reduced-motion` continua selecionando o PNG estático.

Śeṣa mantém 40% de prioridade. As outras seis presenças recebem 10% cada, incluindo
Ākāśa. Pose e uma das cinco frases são escolhidas uma única vez por visita. As cinco frases
de Ākāśa em PT-BR foram mantidas exatamente como enviadas pela autora, com traduções em EN.

A arte aprovada `Padaria em Caos Celestial.png` também foi aplicada ao header de
`/matrix/padaria`, em `public/images/matrix/padaria/padaria-atmosphere-desktop.webp`.
A conversão é sem perda e sem redimensionamento, com igualdade de todos os pixels RGBA
conferida após a decodificação. As cores e a composição de 1942 × 809 px permanecem intactas.

Os registros abaixo descrevem as etapas anteriores, incluindo tentativas rejeitadas.

Data: 04/10/2026

Issue relacionada: [#50 — base inicial de presença e movimento](https://github.com/brublurryface/sanaka/issues/50)

## Resultado

O protótipo de WebP animado produzido a partir das artes achatadas foi rejeitado.

O experimento deslocava a composição inteira entre dois quadros. Isso não produziu movimento expressivo da personagem e, no navegador, a composição dos quadros transparentes introduziu pontilhado escuro sobre pele, cabelo e roupa. A tentativa reduziu a qualidade da arte sem entregar presença.

Os cinco protótipos animados foram removidos e a página voltou a carregar exclusivamente os WebPs estáticos aprovados.

## Medição do protótipo rejeitado

| Presença            |        Estático |         Animado | Variação |
| ------------------- | --------------: | --------------: | -------: |
| Dormindo sobre Śeṣa | 1.864.140 bytes | 3.622.818 bytes |    1,94× |
| Curiosa             | 1.122.738 bytes | 2.141.344 bytes |    1,91× |
| Contemplativa       | 1.088.510 bytes | 2.082.228 bytes |    1,91× |
| Desconfiada         | 1.206.930 bytes | 2.297.828 bytes |    1,90× |
| Dot-eye             | 1.038.850 bytes | 1.973.100 bytes |    1,90× |

Além do defeito visual, o custo transferido praticamente dobrava sem criar uma animação significativa.

## Critério para uma nova tentativa

Não voltar a fabricar movimento deslocando a imagem achatada inteira.

Uma animação publicável precisa de quadros autorados ou de um master em camadas independentes.
O movimento deve ocorrer nas partes escolhidas, com o restante da arte estável entre os quadros.

Antes da implementação, produzir e aprovar um único estado piloto. Somente depois medir:

- fidelidade ao mangá em zoom de 100%;
- estabilidade da transparência no navegador;
- tamanho transferido e tempo de carregamento;
- comportamento em desktop e mobile;
- fallback estático e `prefers-reduced-motion`;
- manutenção das camadas e possibilidade de reação futura à conversa.

WebP animado pode ser reavaliado se receber quadros autorados corretamente. Rive ou Live2D só devem entrar na comparação quando a conversa precisar controlar movimentos e transições em tempo real.

## Saṃvit — quadros para revisão em 18/10/2026

O registro e as medições acima pertencem à tentativa de 04/10. A entrega atual aplica quatro
PNGs aprovados, sem redução de dimensões ou recompressão. Os originais copiados para o projeto
mantêm exatamente os bytes dos anexos. README e a presença com Bhu compartilham um único arquivo.
As artes anteriores de Śeṣa e da contemplativa aguardam suas substituições.

A tentativa de 18/10 solicita alterações localizadas por imagem. O original já é o quadro de repouso;
o PNG alternativo passa por revisão pela autora no Photoshop antes de montar qualquer WebP.
Não aplicar movimento CSS ao desenho nem deslocar a composição inteira entre quadros.

| Presença        | Alvo no projeto                                            | Canvas solicitado | Alteração do quadro alternativo                                                                                                              |
| --------------- | ---------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Abhaya mudra    | `public/images/samvit/presences/samvit-abhaya-still.png`   | 1233 × 1634 px    | Fechar suavemente os dois olhos, preservando sobrancelhas sérias, boca e a mão erguida                                                       |
| Curiosa/ouvinte | `public/images/samvit/presences/samvit-curious-still.png`  | 1122 × 1402 px    | Fechar suavemente os dois olhos e inclinar levemente para fora a orelha à direita de quem olha; manter cabeça apoiada na mão, boca e postura |
| Dot-eye         | `public/images/samvit/presences/samvit-dot-eye-still.png`  | 1024 × 1536 px    | Inclinar levemente para fora apenas a orelha à direita de quem olha, preservando a base e o outro lado; olhos pontuais permanecem iguais     |
| Com Bhu         | `public/images/samvit/presences/samvit-with-bhu-still.png` | 1122 × 1402 px    | Fechar suavemente os dois olhos de Saṃvit e os dois olhos de Bhu; preservar bocas, sobrancelhas, posição e todo o restante                   |

### Prompt comum aprovado para cada edição

```text
EDIÇÃO LOCALIZADA DE UM QUADRO DA IMAGEM FORNECIDA.
Use case: precise-object-edit.

Usar somente a imagem indicada como alvo da edição. Ela é o quadro original de uma futura
animação 2D do Projeto Sanaka. Não criar uma nova composição ou uma nova pose.

Entregar uma única imagem PNG RGBA com fundo realmente transparente, no mesmo tamanho
de canvas informado para o alvo. Não fazer sprite sheet, montagem, fundo preto ou quadriculado.
Manter a personagem inteira, exatamente na mesma posição, escala, perspectiva e enquadramento.

Executar exclusivamente a alteração indicada para este quadro. Preservar o desenho fora
da pequena região editada: rosto, proporções, expressão da boca, sobrancelhas, nariz,
cabelo, roupa, mãos, tatuagem, corpo, pernas, cauda, cores, luz e sombras.
Preservar o traço mangá delicado da referência, com linhas finas nítidas, cabelos definidos
e sombras limpas. Não pintar por cima da imagem inteira, suavizar detalhes, mudar a paleta,
clarear o cabelo, engrossar o traço, alterar anatomia ou adicionar objetos.
Na edição curiosa/ouvinte, apenas os olhos e a orelha à direita de quem olha mudam;
preservar a base da orelha, a cabeça apoiada na mão e todo o restante da pose.
Na edição dot-eye, os olhos, a boca, as sobrancelhas e os sinais gráficos ficam inalterados.
Na edição com Bhu, apenas os dois olhos de Saṃvit e os dois olhos de Bhu mudam;
todo o restante das duas personagens permanece inalterado.

Alvo, tamanho e alteração: anexar exatamente a linha correspondente da tabela acima.
```

Prompts aprovados pela autora em 18/10/2026, após as correções de Bhu e da curiosa/ouvinte.
A aprovação autoriza gerar os quatro PNGs para revisão; não autoriza aplicá-los como animação.
A edição generativa pode alterar detalhes
além do pedido; conferir cada PNG em 100%, tamanho do canvas, alinhamento e transparência.
Quadros com mudança de escala, pose, cor ou perda de linha devem ser descartados antes da montagem.
O WebP animado só será preparado com quadros aprovados, mantendo fallback estático e respeito
a `prefers-reduced-motion`.

### Conferência dos quatro PNGs gerados

Os quatro quadros foram gerados com a ferramenta integrada de edição de imagens, uma chamada
por alvo original, sem reaproveitar uma geração anterior como entrada. As artes estáticas da aplicação
e do README não foram substituídas. Os resultados foram apresentados para revisão da autora.

| Quadro          | Canvas recebido | Canal alfa | Resultado observado                                                                   |
| --------------- | --------------- | ---------- | ------------------------------------------------------------------------------------- |
| Com Bhu         | 1122 × 1402 px  | 0–255      | Saṃvit e Bhu com olhos fechados; canvas preservado                                    |
| Curiosa/ouvinte | 1122 × 1402 px  | 0–255      | Olhos fechados e cabeça apoiada; deslocamento da orelha discreto, sujeito à revisão   |
| Abhaya mudra    | 1089 × 1444 px  | 0–255      | Olhos fechados e expressão séria; dimensões originais não foram respeitadas           |
| Dot-eye         | 1024 × 1536 px  | 0–254      | Olhos pontuais preservados; inclinação da orelha; opacidade máxima diferente da fonte |

Todos os arquivos contêm pixels transparentes. Mesmo nos canvases preservados, a edição alterou
detalhes de textura e traço fora das regiões solicitadas; não são alterações exatas pixel a pixel.
Esses resultados ainda não estão aprovados para alternar com as fontes em uma animação.
Em particular, o quadro abhaya não pode ser intercalado diretamente com o original devido às
dimensões diferentes. Nenhum quadro foi redimensionado ou repintado para ocultar essa diferença,
e nenhuma nova geração foi feita automaticamente após a conferência.

### Progressão de quatro quadros aprovada em 18/10/2026

Após revisar os primeiros resultados, a autora pediu os intermediários de fechamento e reabertura.
A progressão aprovada é o original mais três quadros, com os primeiros resultados na posição 03:

| Quadro | Olhos nas poses com piscada                  | Orelha nas poses com esse movimento                   |
| ------ | -------------------------------------------- | ----------------------------------------------------- |
| 01     | Original, abertos                            | Posição original                                      |
| 02     | Fechando, cerca de 45% da abertura original  | Início da inclinação para fora, cerca de 3°           |
| 03     | Fechados, gerados na primeira rodada         | Inclinação máxima discreta, gerada na primeira rodada |
| 04     | Reabrindo, cerca de 65% da abertura original | Retorno próximo ao repouso, cerca de 1,5° para fora   |

Esses percentuais e ângulos são indicações de desenho, não medições garantidas pelo gerador.
Na pose com Bhu, ambos piscam. A curiosa/ouvinte pisca e move a orelha à direita de quem olha,
mantendo a cabeça apoiada na mão. Abhaya somente pisca. Dot-eye somente move essa orelha,
preservando olhos pontuais, boca, sobrancelhas e os três sinais gráficos.

O prompt comum e as travas de preservação acima continuam válidos. Cada chamada pediu uma única
imagem completa com fundo transparente, a partir do PNG original correspondente, nunca de um
quadro já gerado. Para os intermediários de piscada, o pedido explicitou íris parcialmente visíveis,
sem fechar completamente os olhos. Para a orelha, a base deveria permanecer fixa.

### Conferência dos oito intermediários

| Presença        | Quadro | Canvas recebido | Canal alfa | Comparação com o canvas original |
| --------------- | ------ | --------------- | ---------- | -------------------------------- |
| Com Bhu         | 02     | 1122 × 1402 px  | 0–255      | Mesmo tamanho                    |
| Com Bhu         | 04     | 1122 × 1402 px  | 0–255      | Mesmo tamanho                    |
| Curiosa/ouvinte | 02     | 1122 × 1402 px  | 0–255      | Mesmo tamanho                    |
| Curiosa/ouvinte | 04     | 1122 × 1402 px  | 0–255      | Mesmo tamanho                    |
| Abhaya mudra    | 02     | 1089 × 1444 px  | 0–255      | Menor que 1233 × 1634 px         |
| Abhaya mudra    | 04     | 1089 × 1444 px  | 0–255      | Menor que 1233 × 1634 px         |
| Dot-eye         | 02     | 1024 × 1536 px  | 0–254      | Mesmo tamanho                    |
| Dot-eye         | 04     | 1024 × 1536 px  | 0–254      | Mesmo tamanho                    |

Os oito arquivos são PNGs RGBA e contêm pixels transparentes. A conferência visual identificou
variações de posição e traço fora das regiões solicitadas. Na reabertura com Bhu, a composição
se deslocou. Na curiosa, os olhos intermediários ficaram mais próximos da abertura original que
o solicitado; a orelha do quadro 04 se afasta do repouso mais do que deveria para um retorno.
Portanto, a ordem planejada não comprova uma interpolação visual contínua.

Os três quadros gerados de abhaya têm 1089 × 1444 px, enquanto o original tem 1233 × 1634 px;
a repetição do tamanho no prompt não resolveu essa diferença. O canvas não foi corrigido nesta
rodada. Na dot-eye, os quadros gerados têm alfa máximo 254, diferente do original, e a intensidade
e continuidade do movimento da orelha também precisam de revisão.

São doze PNGs gerados ao todo, apresentados para revisão, além dos quatro originais. A composição
de WebPs, qualquer estabilização ou retoque e a aplicação dos resultados ao site continuam pendentes
da revisão da autora. Nenhum quadro foi redimensionado, repintado ou aplicado na página nesta rodada.

## Piloto com Bhu — sequência corrigida pela autora

A autora forneceu `samvit-bhu-read-me2.png`, `samvit-bhu-read-me3.png` e
`samvit-bhu-read-me4.png`, todos RGBA, 1122 × 1402 px. Eles representam fechamento progressivo,
terminando com os olhos fechados dos dois personagens. O quadro 01 continua sendo o PNG original
usado pelo README e pelo fallback estático. As mudanças dos quadros corrigidos se concentram nos
rostos; o restante da composição permanece alinhado.

O piloto foi autorizado para teste no site, antes de corrigir as outras poses. A sequência usada é
`01 → 02 → 03 → 04 → 03 → 02 → 01`: os intermediários são reutilizados na ordem inversa para
reabrir os olhos, sem gerar, redesenhar, redimensionar ou interpolar a arte.

| Quadro no WebP | Fonte | Duração |
| -------------- | ----- | ------- |
| 1              | 01    | 4000 ms |
| 2              | 02    | 60 ms   |
| 3              | 03    | 60 ms   |
| 4              | 04    | 100 ms  |
| 5              | 03    | 60 ms   |
| 6              | 02    | 60 ms   |

O retorno ao quadro 01 ocorre na repetição do ciclo, totalizando 4340 ms. O resultado é
`public/images/samvit/presences/samvit-with-bhu-blink.webp`, com 1.482.508 bytes, contra
1.885.495 bytes do PNG estático original. Não se trata de um aumento acumulado com o PNG:
`<picture>` escolhe uma fonte para a imagem conforme a preferência de movimento.

Somente a presença `withBhu` oferece o WebP. A fonte animada usa
`media="(prefers-reduced-motion: no-preference)"`; o `<img>` preserva o PNG, o texto alternativo
e as dimensões originais. Quem pede movimento reduzido recebe a imagem estática. As outras poses
permanecem estáticas até a revisão de seus quadros. Não há movimento CSS aplicado à personagem.
O `<source>` existe em todas as poses e aponta para o próprio estático nas demais, mantendo a
mesma estrutura de elementos quando o sorteio do navegador difere do HTML prerenderizado.
As cinco frases com Bhu foram substituídas pelas fornecidas pela autora, com tradução em inglês.

### Reprodução e verificação do arquivo

`scripts/encode-presence-animation.py` precisa de Python com Pillow somente para preparar o asset;
nenhuma dessas dependências é exigida pelo Angular, pelo visitante ou pelo servidor em produção.
Os três PNGs corrigidos continuam nos arquivos de trabalho da autora, sem cópias adicionais no
diretório público da aplicação. Depois de disponibilizar os quatro PNGs localmente:

```powershell
python scripts/encode-presence-animation.py `
  --frames public/images/samvit/presences/samvit-with-bhu-still.png `
    CAMINHO/samvit-bhu-read-me2.png `
    CAMINHO/samvit-bhu-read-me3.png `
    CAMINHO/samvit-bhu-read-me4.png `
  --output public/images/samvit/presences/samvit-with-bhu-blink.webp
```

Substituir `CAMINHO` pela pasta dos quadros corrigidos. O script rejeita canvases diferentes,
preserva as entradas e grava com compressão sem perda. Antes de publicar o arquivo final, ele
decodifica os seis quadros e exige igualdade de todos os pixels de alfa e de todos os valores RGB
visíveis com os respectivos PNGs; também confere duração e repetição infinita. Somente cores
escondidas sob alfa zero podem ser descartadas pelo WebP. Arquivos incompletos ficam fora de
`public/`, para não entrarem no build nem no observador do Angular.

Os testes do componente conferem a condição de movimento reduzido na fonte do `<picture>`,
o fallback PNG e o uso exclusivo dos arquivos estáticos nas poses ainda não aprovadas. A avaliação da
velocidade e da expressão no navegador da autora continua sendo o critério de aprovação do piloto.

## Revisão do refresh, dot-eye e pensativa

Após aprovar o piloto com Bhu, a autora pediu o título **Saṃvit e Bhu**, corrigiu o segundo quadro
da dot-eye e forneceu `samvit-pensativa.png` como base da próxima sequência.

O refresh exibia uma pose do HTML prerenderizado e depois outra sorteada no navegador. A seleção
foi movida para `afterNextRender`: o HTML inicial reserva a área sem escolher uma personagem;
o navegador escolhe uma única dupla de pose e frase por instância da página. A atualização é feita
em um único signal e não se repete durante a detecção de mudanças. O teste de regressão confere
que o construtor não chama o sorteio e que o primeiro render do navegador faz apenas duas chamadas
aleatórias, uma para a pose e outra para a frase.

A dot-eye usa o PNG original e `samvit-dot-eyes2(1).png`, ambos RGBA de 1024 × 1536 px.
A primeira montagem de `samvit-dot-eye-ear-twitch.webp` tinha dois quadros: repouso de 4000 ms e movimento de 70 ms,
mais curto que a piscada de 340 ms do piloto com Bhu. O ciclo de 4070 ms se repete e preserva o
fallback estático para movimento reduzido. O arquivo tem 1.075.944 bytes; a decodificação foi
comparada aos dois PNGs, com igualdade dos valores de alfa e RGB visíveis.

A nova pensativa substitui o WebP legado por `samvit-contemplative-still.png`, copiado byte a byte
do anexo, com 1024 × 1536 px. O texto alternativo descreve a pose abraçando os joelhos e olhando
para cima. O arquivo substituído foi removido; não são mantidos dois arquivos para a mesma função.
A autora aprovou o prompt abaixo para gerar três quadros da pensativa, sujeitos à revisão visual
antes de qualquer montagem. As animações de abhaya e ouvinte
também aguardam novos quadros: o tamanho reduzido da primeira e o estiramento dos olhos da
segunda impedem o uso das tentativas anteriores.

### Prompt aprovado — quadros da pensativa para revisão

```text
EDIÇÃO LOCALIZADA DE UM QUADRO DA SAṂVIT PENSATIVA.
Use case: precise-object-edit.

Alvo único: samvit-pensativa.png. Editar o original fornecido em cada chamada.
Entregar uma única imagem PNG RGBA transparente por chamada, 1024 × 1536 px,
com a personagem inteira na mesma posição, escala, pose e enquadramento.
Não criar uma nova pose, montagem ou sprite sheet.

Alterar somente as pálpebras e a extremidade marfim da cauda, conforme o quadro indicado.
Manter os cantos dos olhos e o formato original fixos; as pálpebras cobrem as íris sem
esticar, alargar, reposicionar ou deformar os olhos. Preservar a direção do olhar,
sobrancelhas, boca, cabeça inclinada para cima e a expressão pensativa.
Mover apenas a ponta da cauda, sem deslocar a base, aumentar o volume ou alterar sua anatomia.

Preservar cabelos, orelhas, corpo abraçando os joelhos, mãos, tatuagem, roupa, pés,
cores, luz, sombras e traço mangá fino fora dessas pequenas regiões. Não restaurar
ou repintar o conjunto. Não adicionar objetos, efeitos, chama ou fundo.

QUADRO 02: olhos fechando, cerca de dois terços da abertura visível; ponta da cauda sobe cerca de 3 px.
QUADRO 03: olhos mais fechados, cerca de um terço da abertura visível; ponta sobe cerca de 6 px.
QUADRO 04: os dois olhos completamente fechados; ponta sobe no máximo cerca de 9 px.

Executar somente a linha do quadro solicitado em cada chamada. O original é o quadro 01.
A reabertura e o retorno da cauda reutilizarão os quadros na ordem inversa.
```

Os valores de abertura e deslocamento são indicações para o desenho e precisam de conferência
antes da montagem. A nova proposta usa fechamento progressivo, como nos quadros corrigidos com Bhu.

Os três PNGs foram gerados em 18/10/2026, em chamadas independentes que usaram o mesmo original.
Todos têm 1024 × 1536 px, formato RGBA e fundo transparente. O quadro 02 mantém os olhos
parcialmente abertos; o 03 avança o fechamento; o 04 fecha os dois olhos. A transparência alcança
alfa zero no fundo e alfa máximo 254 nos três resultados, em comparação a 255 no original.

A comparação com a base detectou mudanças de cor e traço fora dos olhos e da ponta da cauda.
O deslocamento solicitado em pixels não foi tratado como garantia de execução pelo gerador.
Os resultados daquela geração ficaram para revisão da autora: não foram montados em WebP,
copiados para `public/` nem aplicados à página. Naquele momento, a pensativa continuava usando
somente o PNG original.

Identificação dos resultados para conferência por SHA-256:

| Quadro | SHA-256                                                            |
| ------ | ------------------------------------------------------------------ |
| 02     | `cc2f20cf69b8c9f747071959ea2137ff99a48afb3fbd1849a190963f86f67882` |
| 03     | `98230433a5264b701e2a6e311ebefcb10b929ce209727d849b4015b8f4867a2d` |
| 04     | `3ea49287529b515a2e358cf054ecc21927a78392222ff0b38e82d572dec77114` |

## Quadros corrigidos da pensativa e cadência contínua da dot-eye

Em 18/10/2026, a autora forneceu `samvit-pensativa2.png`, `samvit-pensativa3.png` e
`samvit-pensativa4.png` corrigidos. Os três têm 1024 × 1536 px, alfa de 0 a 255 e a mesma
transparência do original. A animação usa esses arquivos completos sem repintura,
redimensionamento, interpolação ou movimento adicional da cauda. As correções fornecidas
mantêm a cauda parada; o movimento visível é a piscada.

| Quadro | SHA-256                                                            |
| ------ | ------------------------------------------------------------------ |
| 02     | `42d32124d96d12267114effd86cd6d504ac40dee86686731f0f89051cd1e77da` |
| 03     | `fec9de14453db835efa5ee40730ff426987000c6981cd32047731efe13e17a9a` |
| 04     | `2feba59db50084e700b3850be88d6c99615186a75b319270b181a88d1b396f3f` |

`samvit-contemplative-blink.webp` tem 1.065.476 bytes e seis quadros, na ordem
01 → 02 → 03 → 04 → 03 → 02. As durações são 4000, 60, 60, 100, 60 e 60 ms, mantendo a
mesma cadência do piloto com Bhu. O ciclo de 4340 ms se repete sem limite.

A dot-eye passa a alternar seus dois desenhos a cada 250 ms, em um ciclo contínuo de 500 ms.
O arquivo existente foi substituído, sem manter outra versão pública para a mesma função.
O tamanho permanece em 1.075.944 bytes. Bhu mantém sua cadência anterior.

Os dois WebPs foram decodificados e comparados aos PNGs: todos os valores de alfa e RGB
visíveis permanecem iguais, assim como as durações e a repetição infinita. A página mantém
o PNG estático para movimento reduzido; somente a pose sorteada é carregada.

`npm run check` passou com 407 testes Angular, 64 testes do servidor, cobertura mínima,
formatação, sincronização do código didático, duplicação de 1,23% e build de dez rotas
prerenderizadas. O teste da pensativa confere a fonte animada condicionada à preferência de
movimento, o fallback estático e as dimensões originais. A cadência visual no navegador
da autora continua sendo a revisão pendente.

Para repetir a montagem com os PNGs corrigidos em uma pasta local:

```powershell
python scripts/encode-presence-animation.py `
  --frames public/images/samvit/presences/samvit-contemplative-still.png `
    CAMINHO/samvit-pensativa2.png `
    CAMINHO/samvit-pensativa3.png `
    CAMINHO/samvit-pensativa4.png `
  --output public/images/samvit/presences/samvit-contemplative-blink.webp

python scripts/encode-presence-animation.py `
  --frames public/images/samvit/presences/samvit-dot-eye-still.png `
    CAMINHO/samvit-dot-eyes2.png `
  --output public/images/samvit/presences/samvit-dot-eye-ear-twitch.webp `
  --frame-ms 250
```

`--frame-ms` define a duração igual de cada desenho em animações contínuas de dois quadros;
não usa a pausa de `--pause-ms`. Sem essa opção, a montagem conserva a pausa e os tempos
anteriores. Quatro quadros continuam usando fechamento progressivo e retorno em ordem inversa.
Não são mantidas cópias adicionais dos PNGs intermediários no diretório público.

### Histórico — proposta dos quadros de abhaya e ouvinte

As tentativas menores de abhaya e os olhos deformados da ouvinte foram rejeitados. Na entrega
anterior, esta proposta aguardava aprovação da autora. Cada quadro deveria usar diretamente o respectivo
original, sem reaproveitar uma tentativa reduzida nem ampliar artificialmente os resultados.
As dimensões são exigências para conferência; o prompt sozinho não garante que o gerador
as cumpra. Um resultado menor ou desalinhado não será aplicado à animação.

**Abhaya — alvo único:** `samvit-abhaya-mudra(1).png`, 1233 × 1634 px.

```text
PROJETO SANAKA — QUADRO LOCALIZADO DE SAṂVIT EM ABHAYA.
Use case: precise-object-edit.

Editar o PNG original fornecido, em uma chamada independente por quadro.
Entregar UMA imagem PNG RGBA transparente, 1233 × 1634 px, personagem inteira,
na mesma escala e nas mesmas coordenadas do original. Manter a área transparente
e o enquadramento existentes. Preservar a resolução; sem zoom, recorte, redução,
nova pose, montagem ou sprite sheet.

Alterar SOMENTE as pálpebras superiores, no grau indicado para este quadro.
Manter os cantos internos e externos, a largura dos olhos e as íris fixos;
as pálpebras descem sobre as íris sem alongar, alargar ou deslocar os olhos.
Preservar sobrancelhas, boca fechada e expressão séria.

Preservar integralmente rosto, cabeça, cabelo castanho-escuro, orelhas, cauda,
corpo sentado com pernas cruzadas, palma levantada em abhaya, outra mão,
tatuagem, pés, roupa preta e marfim, cores, sombras e traço mangá fino.
Fora das pálpebras, não restaurar nem repintar a arte. Não criar efeitos,
chama, sombras de chão, fundo ou adornos.

Executar apenas o estado do quadro solicitado ao final deste prompt.
02: deixar cerca de dois terços da abertura original de cada olho visíveis.
03: deixar cerca de um terço da abertura original visível, com parte das íris.
04: fechar os dois olhos com linhas delicadas, sem mudar a expressão.
```

**Ouvinte — alvo único:** `samvit-ouvinte(1).png`, 1122 × 1402 px.

```text
PROJETO SANAKA — QUADRO LOCALIZADO DE SAṂVIT OUVINTE.
Use case: precise-object-edit.

Editar o PNG original fornecido, em uma chamada independente por quadro.
Entregar UMA imagem PNG RGBA transparente, 1122 × 1402 px, personagem inteira,
na mesma escala e nas mesmas coordenadas do original. Manter a área transparente
e o enquadramento existentes. Preservar a resolução; sem zoom, recorte, redução,
nova pose, montagem ou sprite sheet.

Alterar SOMENTE as pálpebras superiores e a orelha do lado esquerdo de quem vê.
Fixar os cantos internos e externos dos olhos, sua largura e a posição das íris.
As pálpebras cobrem as íris sem esticar os olhos nem mudar seu formato.
Manter cabeça inclinada e apoiada na mão, boca entreaberta e expressão curiosa.

A orelha indicada pode inclinar discretamente a partir da própria base fixa;
manter sua forma, tamanho e volume. A outra orelha e os cabelos ficam parados.
Preservar integralmente rosto, corpo, mãos, tatuagem, pernas, pés, cauda,
roupa preta e marfim, cores, sombras e traço mangá fino. Fora das áreas
indicadas, não restaurar nem repintar. Não adicionar chama, efeitos ou fundo.

Executar apenas o estado do quadro solicitado ao final deste prompt.
02: dois terços da abertura dos olhos; orelha inclina no máximo cerca de 2 graus.
03: um terço da abertura, com parte das íris; orelha inclina até cerca de 4 graus.
04: olhos fechados com linhas delicadas; orelha inclina até cerca de 6 graus.
```

O original será o quadro 01 de cada pose. A reabertura dos olhos e o retorno da orelha
reutilizarão os desenhos em ordem inversa, somente depois da revisão da autora.

## Abhaya e ouvinte — sequências corrigidas integradas

Após revisar os testes, a autora forneceu sete PNGs prontos: o novo original de abhaya e seus
três quadros adicionais, mais os três quadros adicionais da ouvinte. A ouvinte usa como quadro 01
o PNG original já presente na aplicação.

Todos os desenhos da abhaya têm 1154 × 1483 px; os da ouvinte têm 1122 × 1402 px. A comparação
confirma que corpo e cauda permanecem iguais aos respectivos originais. As mudanças de alfa
presentes nos PNGs corrigidos são preservadas na montagem, incluindo o movimento das orelhas.
Não são usadas as tentativas com canvas reduzido ou com alterações dispersas pelo corpo.

O arquivo `samvit-abhaya-still.png` foi substituído byte a byte por `samvit-abhaya-mudra.png`.
As dimensões declaradas no componente foram atualizadas para 1154 × 1483 px, mantendo o
enquadramento fornecido pela autora. O original anterior não é mantido como outra imagem pública.
A base estática da ouvinte permanece igual a `samvit-ouvinte(1).png`.

| Sequência  | Arquivo de origem          | SHA-256                                                            |
| ---------- | -------------------------- | ------------------------------------------------------------------ |
| Abhaya 01  | `samvit-abhaya-mudra.png`  | `c42205b59d88f681dd5cf3f5dca5c1b3874203d28a86021e27bf6fae1f685eff` |
| Abhaya 02  | `samvit-abhaya-mudra2.png` | `2435665b4948581a270764cc355db2873a87c0b44db4c6e9fe837a7b6c02c15e` |
| Abhaya 03  | `samvit-abhaya-mudra3.png` | `c95eccc94f80edf74b3b8b4426bf5b7ab8edbe1b570dd2275758c7fd8f2f1c4b` |
| Abhaya 04  | `samvit-abhaya-mudra4.png` | `c65f13720efcd5cc2ab3368c984501908d9ad6cd3dfc5f1835b43b2f34ddb264` |
| Ouvinte 01 | `samvit-ouvinte(1).png`    | `c59c9972d852e61e49783b964b9b9ebedd27eaf73352a1639c8699342d5fba48` |
| Ouvinte 02 | `samvit-ouvinte2.png`      | `71204ef6c6864d9d509702de66920440756ffefad0c029b61b2b2c3efdfb4a77` |
| Ouvinte 03 | `samvit-ouvinte3.png`      | `2d7bf080d28994f0e4d0cfab9dfb60576ca60083ce90a86191a07affce60712a` |
| Ouvinte 04 | `samvit-ouvinte4.png`      | `7e6c8589bc1be5dc41a917ee4cba68f1f9261cde582e112ea6ac584487fe466f` |

Os novos arquivos são `samvit-abhaya-blink.webp` e `samvit-curious-blink.webp`. Ambos usam os
quatro desenhos completos na ordem 01 → 02 → 03 → 04 → 03 → 02, com durações de 4000, 60,
60, 100, 60 e 60 ms. Cada ciclo dura 4340 ms e se repete sem limite, como a pensativa e Bhu.
O codificador existente confere todos os valores de alfa e RGB visíveis e os tempos após decodificar
o WebP. A montagem conserva as entradas, sem redimensionar, repintar, interpolar ou limpar as bordas.

| Animação                    | Bytes     | SHA-256                                                            |
| --------------------------- | --------- | ------------------------------------------------------------------ |
| `samvit-abhaya-blink.webp`  | 1.248.948 | `d05769c661824933feae3cfb954458bcc9acb87a4bd7aeb501787fc8c9d618ff` |
| `samvit-curious-blink.webp` | 1.908.640 | `94d70a19e3315d17a65c5a60049ee96bc76341690e8a091018cf9a3ff35afd08` |

Com isso, cinco presenças usam animação: abhaya, ouvinte, pensativa, dot-eye e Bhu. Śeṣa mantém
seu arquivo estático e sua prioridade de 40% no sorteio. As outras probabilidades, frases e a seleção
única por entrada permanecem iguais. Movimento reduzido continua usando o original estático da
pose selecionada. Os testes conferem a fonte animada, essa condição de acessibilidade, as dimensões
atualizadas e o uso estático de Śeṣa. Os PNGs intermediários corrigidos não são duplicados em `public/`.

`npm run check` passou com 408 testes Angular e 64 testes do servidor, cobertura mínima,
formatação, código didático sincronizado, duplicação de 1,23% e build de dez rotas prerenderizadas.
As duas animações e o novo PNG estático na saída do build foram comparados byte a byte com os
arquivos validados. Não foi realizada revisão visual em navegador nesta execução; a cadência e
a aparência no dispositivo da autora continuam sendo sua conferência final.

Para repetir a montagem com os arquivos corrigidos em uma pasta local:

```powershell
python scripts/encode-presence-animation.py `
  --frames public/images/samvit/presences/samvit-abhaya-still.png `
    CAMINHO/samvit-abhaya-mudra2.png `
    CAMINHO/samvit-abhaya-mudra3.png `
    CAMINHO/samvit-abhaya-mudra4.png `
  --output public/images/samvit/presences/samvit-abhaya-blink.webp

python scripts/encode-presence-animation.py `
  --frames public/images/samvit/presences/samvit-curious-still.png `
    CAMINHO/samvit-ouvinte2.png `
    CAMINHO/samvit-ouvinte3.png `
    CAMINHO/samvit-ouvinte4.png `
  --output public/images/samvit/presences/samvit-curious-blink.webp
```

## Cadência mais calma da ouvinte e da dot-eye

Após conferir as animações no navegador, a autora pediu trocas mais lentas na ouvinte e na
dot-eye. Os mesmos desenhos e sua ordem foram preservados; somente as durações mudaram.

| Presença        | Durações anteriores          | Durações atuais              | Ciclo atual |
| --------------- | ---------------------------- | ---------------------------- | ----------- |
| Ouvinte/curiosa | 4000, 60, 60, 100, 60, 60 ms | 4000, 90, 90, 150, 90, 90 ms | 4510 ms     |
| Dot-eye         | 250, 250 ms                  | 375, 375 ms                  | 750 ms      |

As etapas do movimento duram 50% mais. A ouvinte mantém quatro segundos de repouso entre
os movimentos; a dot-eye continua alternando sem uma pausa longa. Bhu, pensativa e abhaya
mantêm seus tempos. As dimensões, cores, transparência e condição de movimento reduzido
permanecem iguais.

O codificador aceita `--blink-step-ms` para ajustar a duração dos desenhos intermediários
em uma sequência de quatro PNGs. O tempo de olhos fechados acompanha a proporção original
de 100 para 60, e o repouso permanece independente. Sem essa opção, os tempos originais
de 60 e 100 ms continuam sendo usados. Valores inválidos ou a combinação com dois quadros
são rejeitados antes da leitura ou gravação de arquivos.

A comparação com os WebPs anteriores confirmou igualdade de todos os valores de alfa e RGB
visíveis, dimensões, ordem dos desenhos e repetição infinita. Somente cinco bytes da ouvinte
e quatro da dot-eye mudaram, correspondendo aos novos tempos. Os arquivos mantêm o mesmo
tamanho. A conferência da cadência no navegador continua com a autora.

Nesta revisão, passaram a comparação dos quadros e tempos, a rejeição de parâmetros inválidos,
`npm run format:check`, `git diff --check` e `npm run build`. As duas animações na saída do
build são idênticas aos arquivos validados. O código Angular e os outros assets não mudaram.

Para repetir a montagem com a cadência revisada:

```powershell
python scripts/encode-presence-animation.py `
  --frames public/images/samvit/presences/samvit-curious-still.png `
    CAMINHO/samvit-ouvinte2.png `
    CAMINHO/samvit-ouvinte3.png `
    CAMINHO/samvit-ouvinte4.png `
  --output public/images/samvit/presences/samvit-curious-blink.webp `
  --blink-step-ms 90

python scripts/encode-presence-animation.py `
  --frames public/images/samvit/presences/samvit-dot-eye-still.png `
    CAMINHO/samvit-dot-eyes2.png `
  --output public/images/samvit/presences/samvit-dot-eye-ear-twitch.webp `
  --frame-ms 375
```
