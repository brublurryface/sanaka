# Óbolos de Sanaka

Plugin WordPress do [Projeto Sanaka](https://sanaka.com.br), concebido e desenvolvido por [Sanaka Bruna](https://github.com/brublurryface).

Uma oferta pode chegar ao servidor e perder sua resposta no caminho de volta. Óbolos de Sanaka registra um recibo para que a repetição dessa mesma operação conserve o resultado, sem acrescentar outro óbolo.

**Versão:** 1.0.2 · **PHP:** 8.3 ou superior · **Banco:** MySQL/MariaDB com InnoDB.

## O que está implementado

- Recibo persistente por operação identificada por UUID v4.
- Incremento do contador e gravação do recibo na mesma transação.
- Repetição da mesma chave e personagem devolve o recibo original.
- Reutilização da chave em outra personagem é recusada.
- Compatibilidade com o endpoint e as solicitações legadas.
- Liberação do cabeçalho `Idempotency-Key` somente nas rotas de óbolos.
- Capacidade inicial de 50.000 recibos, configurável por filtro PHP.
- Testes automatizados com PHP 8.3 e MySQL 8, incluindo concorrência, rollback e perda da confirmação.

Essa proteção conserva uma operação durante sua retentativa. Ofertas com identificadores diferentes continuam sendo operações diferentes; não existe regra de uma oferta por pessoa.

## Como a oferta é confirmada

1. O Angular atribui uma chave à oferta.
2. O WordPress verifica a chave e a personagem.
3. O banco grava o incremento e seu recibo na mesma transação.
4. Uma retentativa com a mesma chave recupera o recibo já registrado.

O recibo conserva o total obtido naquela operação. Outras ofertas podem aumentar o contador depois; a consulta GET é a fonte do total atual.

## Integração atual

A versão 1.0.2 complementa o snippet #6, que ainda mantém o endpoint público, a validação das personagens e o contador original. Os outros campos públicos do CMS presentes nesse snippet continuam sob sua responsabilidade.

- Endpoint: `/wp-json/sanaka/v1/obolos/{character_slug}`.
- Contadores: tabela com sufixo `sanaka_obolos`.
- Recibos: tabela com sufixo `sanaka_obolo_operations`.
- Prefixo das tabelas: o configurado na instalação WordPress.
- Cliente Angular: provider `OBOLO_IDEMPOTENCY_ENABLED` habilitado após a conferência do plugin no CMS.

O código reaproveita as personagens publicadas no WordPress. A lista de personagens não é duplicada no plugin.

## Instalação e atualização

Envie o ZIP pelo painel WordPress em **Plugins → Adicionar plugin → Enviar plugin**. Ative o complemento e confira a criação da tabela de recibos, InnoDB, a consulta do contador e o preflight da origem real do Angular.

A atualização das versões 1.0.0 ou 1.0.1 para 1.0.2 reutiliza o diretório técnico `sanaka-obolo-idempotency`, substituindo a versão instalada. A alteração do nome público preserva a identificação interna do plugin, suas funções e os dados já registrados.

O pacote contém o arquivo PHP principal e esta documentação. Os testes destrutivos de CI usam um banco isolado próprio; não devem ser executados no CMS.

## Armazenamento e capacidade

Cada recibo armazena o SHA-256 da chave da operação, a personagem, o total confirmado e a data. Essa tabela não armazena nome, e-mail ou IP do visitante.

O limite inicial é global: 50.000 operações, além de uma linha de controle. O filtro `sanaka_obolo_operation_limit` aceita um inteiro positivo para uma decisão de capacidade. Ao atingir o limite, novas operações retornam indisponibilidade; recibos já concluídos continuam disponíveis.

Não há expiração automática. Excluir recibos pode fazer uma retentativa antiga ser contabilizada novamente. Qualquer política de retenção deve definir primeiro o prazo de validade das operações.

## Reversão

Para voltar ao comportamento anterior, desabilite `OBOLO_IDEMPOTENCY_ENABLED` no frontend e publique essa configuração. Preserve o complemento e os recibos existentes.

## Validação e manutenção

O workflow [Validate obolo protocol](../.github/workflows/obolo-protocol.yml) executa o lint PHP e os cenários transacionais em MySQL isolado. Os testes Angular verificam a conservação da chave nas retentativas e o tratamento de respostas antigas.

A documentação operacional detalhada está em [Idempotência dos óbolos](../docs/architecture/obolo-idempotency.md). Instalação e ativação são acompanhadas na [issue #80](https://github.com/brublurryface/sanaka/issues/80).

## Próximas evoluções propostas

Estas funcionalidades ainda não estão implementadas:

1. **Centralizar o domínio dos óbolos:** migrar do snippet somente as funções e os campos relacionados aos óbolos, preservando a API e os dados existentes.
2. **Painel de consulta:** mostrar totais por personagem, uso da capacidade, versão e situação da integração. Consultas e históricos devem ser paginados no banco e restritos a quem tiver permissão administrativa.
3. **Configuração operacional:** permitir ajustar a capacidade com validação e avisos de uso, sem apagar recibos ou redefinir contadores.
4. **Exportação administrativa:** consultar e exportar totais e recibos com filtros, limites e permissões.
5. **Apresentação do projeto:** documentar as decisões de arquitetura, as falhas simuladas e as evidências de testes como estudo de caso do portfólio.

A sequência proposta começa pela responsabilidade do backend e depois pela interface de administração.

## Direção do painel da próxima versão

A autora escolheu reunir ofertas e personagens. A interface ainda será implementada, acompanhada na [issue #86](https://github.com/brublurryface/sanaka/issues/86).

| Área | Conteúdo previsto |
| --- | --- |
| Visão geral | Totais, personagens e uso da capacidade, com acesso às duas áreas. |
| Ofertas | Totais por personagem e histórico paginado dos recibos. |
| Personagens e moedas | Personagens do CMS, frente e verso das moedas e suas ofertas. |

Selecionar uma personagem abrirá suas ofertas com o filtro aplicado. A primeira interface será de consulta e reaproveitará os dados do CMS. O histórico detalhado terá início nas operações com recibo, preservando os totais anteriores.

## Histórico de versões

### 1.0.2

- Assinatura de autoria corrigida para **Sanaka Bruna**.
- Direção do painel registrada com ofertas, personagens e moedas.
- Lógica PHP e dados preservados.

### 1.0.1

- Nome público **Óbolos de Sanaka**.
- Identificação de autoria, página do plugin e endereço próprio de atualização.
- Descrição voltada à finalidade do plugin e documentação própria.
- Lógica transacional e contrato da API preservados.

### 1.0.0

- Primeira entrega do complemento de idempotência, com recibos persistentes e integração ao endpoint existente.
