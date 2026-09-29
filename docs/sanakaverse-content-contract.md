# Contrato de conteúdo do Sanakaverse

Este documento define como um livro entra na biblioteca do Sanakaverse sem misturar a capa do
volume com a imagem destacada da publicação.

## Como publicar um volume

1. Criar ou editar a publicação correspondente no WordPress.
2. Associá-la à categoria **Sanakaverse**, cujo slug deve permanecer `sanakaverse`.
3. Manter a imagem destacada como a composição horizontal usada no cabeçalho do post.
4. Selecionar a capa vertical no campo próprio **Capa do Sanakaverse**.

Quando a publicação estiver pública, a aplicação a transforma automaticamente em um livro e o
link interno abre `/posts/:slug` em uma nova aba.

## Campo da capa

Nome técnico: `sanakaverse_cover`.

O campo REST deverá entregar um objeto com este formato:

```json
{
  "source_url": "https://sanaka.com.br/wp-content/uploads/capa.webp",
  "alt_text": "Descrição objetiva da arte da capa"
}
```

A aplicação também reconhece `url` e `alt` como nomes alternativos. A configuração do campo no
WordPress será feita depois de conferir como os campos personalizados estão sendo administrados na
instalação atual. Até lá, um post da categoria sem `sanakaverse_cover` recebe uma capa provisória
elegante, sem reutilizar indevidamente a imagem destacada.

## Modelo recomendado da imagem

- Proporção: **2:3**, vertical.
- Tamanho de origem: **1200 × 1800 px**.
- Formato preferencial: **WebP**.
- Peso recomendado: até **350 KB**, preservando a qualidade do traço.
- Composição: manter rostos, símbolos e textos importantes afastados das extremidades.
- Identidade visual: arte em mangá coerente com o Projeto Sanaka.

Os livros podem variar em escala e inclinação na interface, mas a proporção-base evita cortes e
deformações das capas.

## Limites editoriais

- Publicações da categoria Romance/WoD continuam excluídas mesmo que recebam outra categoria por
  engano.
- A ausência da categoria `sanakaverse` representa uma biblioteca ainda vazia, não uma falha.
- A ausência da capa representa um volume ainda não revelado, não autoriza usar a imagem destacada
  como substituta.
