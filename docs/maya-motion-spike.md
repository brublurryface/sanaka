# Spike de movimento da Māyā

Data: 04/10/2026

Issue relacionada: [#50 — establish Māyā presence and motion foundation](https://github.com/brublurryface/sanaka/issues/50)

## Decisão

A primeira presença animada de Māyā usa WebP animado. A solução não adiciona engine nem runtime de animação à aplicação e mantém um WebP estático correspondente para movimento reduzido e falha de carregamento.

Os cinco microloops foram produzidos em resolução nativa, com transparência e compressão sem perda. Cada asset possui dois quadros, em uma cadência deliberadamente curta e simples, semelhante à presença de um bichinho virtual. A arte aprovada não foi redesenhada nem recomprimida com perda.

## Integração

- somente a presença sorteada é solicitada pela página;
- `prefers-reduced-motion: reduce` seleciona o asset estático pelo elemento `picture`;
- se o WebP animado falhar, a imagem troca para o asset estático da mesma presença;
- largura e altura declaradas reservam o espaço antes do carregamento;
- a escolha de presença e frase permanece fixa durante a permanência na rota.

## Medição dos assets

| Presença            |        Estático |         Animado | Variação |
| ------------------- | --------------: | --------------: | -------: |
| Dormindo sobre Śeṣa | 1.864.140 bytes | 3.622.818 bytes |    1,94× |
| Curiosa             | 1.122.738 bytes | 2.141.344 bytes |    1,91× |
| Contemplativa       | 1.088.510 bytes | 2.082.228 bytes |    1,91× |
| Desconfiada         | 1.206.930 bytes | 2.297.828 bytes |    1,90× |
| Dot-eye             | 1.038.850 bytes | 1.973.100 bytes |    1,90× |

O custo transferido por visita fica entre 1,97 MB e 3,62 MB, porque a aplicação não baixa as cinco presenças. Esse valor é aceitável para o primeiro experimento, mas estabelece um teto a ser acompanhado antes de aumentar a quantidade de quadros.

## Limite desta fase

As artes entregues são imagens achatadas. Por isso, o microloop movimenta a composição como uma unidade e não articula separadamente olhos, orelhas, cabelos, roupa, cauda ou Śeṣa. Piscar, respirar ou reagir com partes independentes exige masters preparados em camadas.

WebP animado permanece adequado aos movimentos de espera. Rive ou Live2D só devem ser reavaliados quando a conversa precisar controlar estados e transições em tempo real; nesse momento, fidelidade ao mangá, preparação da arte, peso, licença e manutenção devem ser medidos novamente.
