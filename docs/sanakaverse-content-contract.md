# Contrato de conteúdo do Sanakaverse

Este documento define como um livro entra na biblioteca do Sanakaverse sem misturar a capa do
volume com a imagem destacada da publicação.

## Como publicar um volume

1. Criar ou editar a publicação correspondente no WordPress.
2. Associá-la à categoria **Sanakaverse**, cujo slug deve permanecer `sanakaverse`.
3. Manter a imagem destacada como a composição horizontal usada no cabeçalho do post.
4. Selecionar a composição quadrada no campo próprio **Capa do Sanakaverse**.

Quando a publicação estiver pública, a aplicação a transforma automaticamente em um livro e o
link interno abre `/posts/:slug` em uma nova aba.

## Campo da capa

Nome técnico: `sanakaverse_cover`.

Na API REST, o campo pode chegar como URL simples, objeto de mídia ou array de metadados. A
aplicação normaliza essas formas para preservar compatibilidade com o cadastro atual do WordPress.

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

- Proporção: **1:1**, quadrada.
- Tamanho de origem: **1200 × 1200 px**.
- Formato preferencial: **WebP**.
- Peso recomendado: até **350 KB**, preservando a qualidade do traço.
- Composição: a imagem quadrada funciona como palco; o livro desenhado dentro dela pode ser aberto,
  fechado, fino, espesso ou assumir outra forma coerente com a personagem.
- Área segura: manter rostos, símbolos e textos importantes afastados das extremidades.
- Identidade visual: arte em mangá coerente com o Projeto Sanaka.

O formato quadrado mantém quatro volumes alinhados por linha no desktop sem impor ao livro
representado dentro da arte uma anatomia única.

## Limites editoriais

- Publicações da categoria Romance/WoD continuam excluídas mesmo que recebam outra categoria por
  engano.
- A ausência da categoria `sanakaverse` representa uma biblioteca ainda vazia, não uma falha.
- A ausência da capa representa um volume ainda não revelado, não autoriza usar a imagem destacada
  como substituta.
