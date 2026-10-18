# Spike de movimento da Saṃvit

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
O WebP `samvit-dot-eye-ear-twitch.webp` tem dois quadros: repouso de 4000 ms e movimento de 70 ms,
mais curto que a piscada de 340 ms do piloto com Bhu. O ciclo de 4070 ms se repete e preserva o
fallback estático para movimento reduzido. O arquivo tem 1.075.944 bytes; a decodificação foi
comparada aos dois PNGs, com igualdade dos valores de alfa e RGB visíveis.

A nova pensativa substitui o WebP legado por `samvit-contemplative-still.png`, copiado byte a byte
do anexo, com 1024 × 1536 px. O texto alternativo descreve a pose abraçando os joelhos e olhando
para cima. O arquivo substituído foi removido; não são mantidos dois arquivos para a mesma função.
A sequência da pensativa aguarda revisão do prompt abaixo. As animações de abhaya e ouvinte
também aguardam novos quadros: o tamanho reduzido da primeira e o estiramento dos olhos da
segunda impedem o uso das tentativas anteriores.

### Prompt proposto — pensativa, aguardando aprovação

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
Nenhum desses três PNGs foi gerado nesta revisão.
