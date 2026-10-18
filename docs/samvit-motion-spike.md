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
