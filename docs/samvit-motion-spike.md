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

A próxima tentativa usa uma alteração localizada por imagem. O original já é o quadro de repouso;
será pedido um PNG alternativo para revisão pela autora no Photoshop antes de montar qualquer WebP.
Não aplicar movimento CSS ao desenho nem deslocar a composição inteira entre quadros.

| Presença        | Alvo no projeto                                            | Canvas solicitado | Alteração do quadro alternativo                                                                                                          |
| --------------- | ---------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Abhaya mudra    | `public/images/samvit/presences/samvit-abhaya-still.png`   | 1233 × 1634 px    | Fechar suavemente os dois olhos, preservando sobrancelhas sérias, boca e a mão erguida                                                   |
| Curiosa/ouvinte | `public/images/samvit/presences/samvit-curious-still.png`  | 1122 × 1402 px    | Fechar suavemente os dois olhos; manter cabeça apoiada na mão, boca e postura                                                            |
| Dot-eye         | `public/images/samvit/presences/samvit-dot-eye-still.png`  | 1024 × 1536 px    | Inclinar levemente para fora apenas a orelha à direita de quem olha, preservando a base e o outro lado; olhos pontuais permanecem iguais |
| Com Bhu         | `public/images/samvit/presences/samvit-with-bhu-still.png` | 1122 × 1402 px    | Fechar apenas os olhos de Saṃvit; Bhu permanece inteiro e inalterado                                                                     |

### Prompt comum proposto para cada edição

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
clarear o cabelo, engrossar o traço, alterar anatomia, adicionar objetos ou redesenhar Bhu.
Na edição dot-eye, os olhos, a boca, as sobrancelhas e os sinais gráficos ficam inalterados.
Na edição com Bhu, apenas os olhos de Saṃvit mudam; todo o Bhu permanece inalterado.

Alvo, tamanho e alteração: anexar exatamente a linha correspondente da tabela acima.
```

Estes prompts aguardam aprovação antes da geração. A edição generativa pode alterar detalhes
além do pedido; conferir cada PNG em 100%, tamanho do canvas, alinhamento e transparência.
Quadros com mudança de escala, pose, cor ou perda de linha devem ser descartados antes da montagem.
O WebP animado só será preparado com quadros aprovados, mantendo fallback estático e respeito
a `prefers-reduced-motion`.
