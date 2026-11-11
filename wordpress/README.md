# Óbolos de Sanaka

Plugin do [Projeto Sanaka](https://sanaka.com.br), concebido e desenvolvido por [Sanaka Bruna](https://github.com/brublurryface).

Uma oferta pode chegar ao servidor e perder sua resposta no caminho de volta. O plugin grava um recibo para que a repetição da operação conserve o resultado. O painel reúne essas ofertas às personagens e moedas que já existem no CMS.

**Versão:** 1.1.0 · **PHP:** 8.3+ · **Banco:** MySQL/MariaDB com InnoDB.

## O painel

Abra **Óbolos de Sanaka** no menu administrativo ou **Plugins → Óbolos de Sanaka → Abrir painel**.

- **Visão geral:** total de óbolos, personagens publicadas, recibos e uso da capacidade.
- **Ofertas:** recibos por data, filtro de personagem, total atual e paginação.
- **Personagens e moedas:** nomes, identificadores, anverso/reverso e totais. O link de cada personagem abre suas ofertas; a tela de ofertas mantém um caminho de volta.

O painel é de consulta e exige `manage_options`. Não altera contadores, capacidade, moedas ou publicações. Funciona sem JavaScript; o script apenas anuncia a consulta ao enviar um filtro. Imagens são carregadas sob demanda.

O total preserva ofertas anteriores. **O histórico detalhado cobre somente operações concluídas com recibo desde sua ativação.** Ofertas antigas e chamadas sem chave não geram recibos retroativos.

## Fonte dos dados e consultas

As publicações WordPress de tipo `post`, publicadas e com `sanaka_character_slug` válido, são a fonte das personagens. O plugin reutiliza `sanaka_character_name`, `sanaka_obolo_front` e `sanaka_obolo_back`; não cria outro cadastro.

As consultas usam projeções, paginação no banco de 20 itens e uma consulta em lote para os três metadados da página. Publicações duplicadas para a mesma personagem não multiplicam resultados: a de menor ID é a referência. Corpos de posts e metadados de outros plugins não são carregados. Os recibos têm índices por data/chave e personagem/data/chave para filtros e ordenação estável.

Em WordPress com Abilities API, três consultas administrativas reutilizam a mesma camada: `sanaka-obolos/overview`, `sanaka-obolos/characters` e `sanaka-obolos/receipts`. Todas exigem `manage_options`, validam parâmetros e são somente leitura.

## Como a oferta é confirmada

1. O Angular atribui uma chave UUID v4 à oferta.
2. O WordPress valida a chave e a personagem.
3. O banco grava o incremento e o recibo na mesma transação.
4. Uma retentativa com a mesma chave devolve o recibo original.

Reutilizar a chave em outra personagem retorna conflito. Operações com chaves diferentes são ofertas diferentes; não há regra de uma oferta por pessoa. O recibo conserva o total confirmado naquela operação, enquanto a consulta GET informa o total atual.

- Endpoint preservado: `/wp-json/sanaka/v1/obolos/{character_slug}`.
- Contadores: tabela com sufixo `sanaka_obolos`.
- Recibos: tabela com sufixo `sanaka_obolo_operations`.
- Prefixo: o configurado na instalação.
- Cabeçalho `Idempotency-Key`: permitido por CORS somente nas rotas de óbolos.
- Requisições antigas sem chave continuam compatíveis.

O plugin 1.1.0 assume o endpoint, as personagens e os campos de óbolos anteriormente mantidos pelo snippet #6. Também funciona enquanto o snippet antigo ainda está ativo, para permitir uma atualização em etapas.

## Atualização para 1.1.0

1. Preserve um backup de arquivos e banco e registre os totais e recibos atuais.
2. Envie [obolos-de-sanaka-1.1.0.zip](dist/obolos-de-sanaka-1.1.0.zip) em **Plugins → Adicionar plugin → Enviar plugin**. Confirme a substituição da instalação existente.
3. Mantenha o diretório técnico `sanaka-obolo-idempotency`. Confira versão, painel, contadores, API e campos públicos **antes** de mexer no snippet.
4. No Code Snippets, substitua somente o código do snippet #6 pelo conteúdo de [integracao-publica-sem-obolos.php](snippets/integracao-publica-sem-obolos.php), sem a linha inicial `<?php`. Preserve nome, escopo e estado ativo. O snippet continua expondo `hover_text` e `sanakaverse_cover`.
5. Confira novamente API, totais, moedas, capas e fragmentos. A validação real de oferta/retentativa permanece acompanhada na [#80](https://github.com/brublurryface/sanaka/issues/80).

A [cópia anterior do snippet](snippets/integracao-publica-antes-1.1.0.php) registra o código lido no CMS para permitir comparação e reversão. Não desinstale o plugin para atualizar. A atualização não zera tabelas nem altera recibos existentes; acrescenta dois índices.

O ZIP contém somente o plugin, módulos, assets e esta documentação. Testes e backups de snippets ficam fora do pacote. O arquivo `.zip.sha256` permite conferir sua integridade.

## Capacidade e privacidade

Cada recibo armazena o SHA-256 da chave, a personagem, o total confirmado e a data UTC. Não armazena nome, e-mail ou IP do visitante.

O limite inicial global é de 50.000 operações, além da linha interna de controle. O filtro PHP `sanaka_obolo_operation_limit` aceita um inteiro positivo. Ao atingir o limite, novas operações com chave retornam indisponibilidade; retentativas de recibos concluídos continuam funcionando.

Não há expiração ou exclusão automática. Apagar um recibo pode fazer uma retentativa antiga ser contada novamente. Uma futura política de retenção precisa definir antes o prazo de validade das operações.

## Validação e reversão

O [workflow PHP/MySQL/WordPress](../.github/workflows/obolo-protocol.yml) verifica concorrência, rollback, perda de resposta e compatibilidade; a instalação WordPress isolada verifica ativação sobre dados existentes, convivência/remoção do snippet, REST, campos públicos, permissões, filtros, paginação, projeções, falhas e navegação. Nenhum teste usa o CMS ou envia e-mail.

O verificador do pacote compara cada arquivo do ZIP aos fontes e confere CRC e SHA-256. O CI informa os resultados; publicar código não substitui a conferência da instalação ativa.

Para reverter o plugin a 1.0.2 **após a migração**, restaure primeiro o código anterior do snippet #6 e só depois reinstale o pacote antigo. Preserve tabelas e recibos. Sem o snippet original, a versão 1.0.2 não possui o endpoint completo.

A implementação e suas decisões estão descritas no [estudo de caso](../docs/architecture/obolos-de-sanaka-panel.md). A implantação é acompanhada na [#86](https://github.com/brublurryface/sanaka/issues/86).

## Evoluções

Configuração administrativa de capacidade, exportação e edição de personagens exigem outro desenho de permissões e validação; não fazem parte da interface de consulta.

## Histórico

- **1.1.0:** domínio centralizado, painel de consulta, consultas paginadas, índices e integração de leitura com Abilities API.
- **1.0.2:** autoria Sanaka Bruna e direção do painel.
- **1.0.1:** nome Óbolos de Sanaka, identidade de autoria e página do plugin.
- **1.0.0:** complemento de idempotência e recibos persistentes.
