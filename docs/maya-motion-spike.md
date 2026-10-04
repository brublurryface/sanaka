# Spike de movimento da Māyā

Data: 04/10/2026

Issue relacionada: [#50 — establish Māyā presence and motion foundation](https://github.com/brublurryface/sanaka/issues/50)

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

Uma animação publicável precisa partir de um master preparado em camadas independentes para, conforme a presença, movimentar olhos, orelhas, cabelos, roupa, cauda, respiração e Śeṣa sem redesenhar ou recomprimir o restante da arte.

Antes da implementação, produzir e aprovar um único estado piloto. Somente depois medir:

- fidelidade ao mangá em zoom de 100%;
- estabilidade da transparência no navegador;
- tamanho transferido e tempo de carregamento;
- comportamento em desktop e mobile;
- fallback estático e `prefers-reduced-motion`;
- manutenção das camadas e possibilidade de reação futura à conversa.

WebP animado pode ser reavaliado se receber quadros autorados corretamente. Rive ou Live2D só devem entrar na comparação quando a conversa precisar controlar movimentos e transições em tempo real.
