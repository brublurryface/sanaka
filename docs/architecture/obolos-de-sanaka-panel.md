# Óbolos de Sanaka: de recibos a um painel do CMS

## Problema e comportamento

Uma resposta pode se perder depois de o servidor confirmar uma oferta. Reenviar uma operação sem identificador poderia acrescentar outro óbolo. O primeiro plugin resolveu a repetição com recibos persistentes; o contador e a definição de personagem ainda dependiam de um snippet.

A versão 1.1.0 concentra esse domínio e permite à autora consultar ofertas e encontrar as personagens e suas moedas no mesmo painel. A consulta mostra o total atual e o histórico disponível sem inventar detalhes das ofertas anteriores à adoção dos recibos.

## Limites de responsabilidade

O WordPress mantém publicações, metadados e dados persistentes. O plugin possui a API de óbolos, a transação e o painel. O Angular apresenta a oferta e conserva sua chave ao repetir uma tentativa. O snippet editorial continua expondo somente os campos públicos de hover e capa.

O painel exige a capacidade `manage_options` tanto na entrada do menu quanto no callback da página. As consultas opcionais da Abilities API aplicam a mesma permissão. Nenhuma das telas permite editar, apagar ou redefinir os dados.

## Fonte de verdade e custo de leitura

Personagens são projeções dos posts publicados com identificador válido; nome e moedas vêm dos metadados existentes. Não há tabela paralela de personagens nem lista fixa em TypeScript ou PHP. A referência canônica é o menor ID publicado por identificador.

Cada página tem até 20 itens. A consulta retorna somente ID, título, identificador e total; três metadados são consultados em lote para os IDs da página. Uma página não busca corpos de posts, todos os metadados ou uma consulta por personagem. O histórico também pagina no banco, ordenado por data e chave para resolver empates.

Os índices novos cobrem `(created_at, operation_key)` e `(character_slug, created_at, operation_key)`. A capacidade é lida do mesmo filtro empregado na transação; o painel não mantém um limite duplicado.

## Escrita e integridade

O registro da oferta preserva as transações InnoDB, a trava da capacidade, a chave única e o recibo da versão anterior. Mesmo com ofertas concorrentes, repetir a chave na mesma personagem recupera o resultado confirmado. A chave em outra personagem retorna conflito. A tabela não armazena identidade pessoal.

Totais históricos e recibos são preservados durante a atualização. A migração acrescenta índices, sem apagar registros. O plugin assume a rota depois do snippet antigo, permitindo atualizar e conferir o plugin antes de reduzir o snippet.

## Interface e identidade

Visão geral, ofertas e personagens/moedas compartilham uma navegação. A personagem abre o histórico filtrado; o histórico mantém o retorno à personagem. Filtros GET e paginação funcionam sem JavaScript. O script apenas anuncia uma consulta em andamento e limpa esse estado ao voltar pelo histórico do navegador.

A identidade usa fundo escuro, dourado, tipografia serifada nos destaques e autoria Sanaka Bruna. O CSS fica restrito ao painel. URLs e textos são escapados no contexto de saída; imagens remotas são normalizadas para HTTP/HTTPS.

## Evidências e limites

Os testes transacionais simulam concorrência, rollback e perda da confirmação. A integração roda sobre WordPress 7.1.4 e MySQL isolados, com o snippet anterior e com o reduzido em processos separados. Inclui preservação de dados, contrato REST, campos públicos, permissões, validação, filtros, paginação, ausência de consultas por item e saída escapada.

O CI também compara o pacote de instalação aos arquivos versionados. Os testes não acessam o CMS ativo nem enviam mensagens. Resultados do CI e conferência posterior no CMS são evidências distintas; acompanhar a instalação na #86 e a oferta/retentativa real na #80.

Sem uma inspeção visual de navegador, testes de HTML e consultas não comprovam todos os detalhes da aparência em um dispositivo físico.
