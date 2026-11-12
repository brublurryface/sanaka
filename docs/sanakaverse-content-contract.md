# Contrato de conteúdo de Sanaka-loka

Este documento define como um livro entra na biblioteca de Sanaka-loka sem misturar a capa do
volume com a imagem destacada da publicação.

## Como publicar um volume

1. Criar ou editar a publicação correspondente no WordPress.
2. Associá-la à categoria **Sanaka-loka**, com o slug `sanaka-loka`.
3. Manter a imagem destacada como a composição horizontal usada no cabeçalho do post.
4. Selecionar a composição quadrada no campo próprio da capa do volume.

Quando a publicação estiver pública, a aplicação a transforma automaticamente em um livro e o
link interno abre `/posts/:slug` em uma nova aba.

O volume não aparece no catálogo, nas buscas nem nos filtros de `/posts`. A rota direta permanece
disponível para que a leitura seja aberta exclusivamente a partir de Sanaka-loka.

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
- Publicações da categoria Sanaka-loka pertencem somente à coleção de livros e não ao catálogo
  editorial de Posts.
- A ausência da categoria `sanaka-loka` é uma falha de configuração recuperável, com nova tentativa.
  Uma consulta bem-sucedida sem publicações mostra o estado vazio explicitamente.
- A categoria e a exclusão de Romance/WoD usam IDs resolvidos pelos slugs no CMS, incluindo as
  subcategorias. Falha na resolução da fronteira WoD interrompe a consulta em vez de retirar a
  exclusão.
- A ausência da capa representa um volume ainda não revelado, não autoriza usar a imagem destacada
  como substituta.

## Carregamento da biblioteca

A biblioteca solicita doze volumes por página, em ordem crescente de publicação
(`orderby=date&order=asc`). O botão **Carregar mais livros** consulta somente a
próxima página e mantém os volumes já exibidos. A contagem usa os cabeçalhos da
mesma consulta filtrada; metadados ausentes ou incoerentes produzem erro
recuperável. Uma falha numa página adicional mantém os livros e oferece nova
tentativa da mesma página.

Doze é o tamanho da página inicial, não um limite do catálogo. Os testes incluem
101 volumes alcançáveis em nove solicitações explícitas, sem consulta antecipada
das páginas restantes. Abertura em nova aba, títulos em maiúsculas na interface,
capas independentes e exclusões editoriais permanecem preservados.
