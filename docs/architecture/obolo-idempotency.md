# Idempotência dos óbolos

## Estado da entrega

A leitura autenticada e somente de leitura do CMS em 04/11/2026 confirmou o endpoint do snippet ativo #6 e a tabela `sanaka_obolos` em InnoDB. O incremento existente é atômico, mas dois POSTs após a perda de uma resposta representam duas ofertas. O complemento em `wordpress/sanaka-obolo-idempotency.php` acrescenta um recibo persistente por operação.

O complemento está versionado, mas **não foi instalado no WordPress**. `OBOLO_IDEMPOTENCY_ENABLED` tem valor padrão `false`: integrar esta entrega mantém o POST legado, sem o novo cabeçalho. A proteção contra duplicação só passa a existir depois da instalação validada no CMS e da ativação explícita no frontend. Nenhum contador de produção foi usado nos testes.

## Contrato e transação

O cliente cria um UUID v4 somente após a ação de oferecer um óbolo. Uma retentativa manual conserva esse UUID enquanto a mesma visita à personagem permanece ativa; não existe retry automático de POST. Trocar de personagem ou iniciar outra visita cria outra operação. A chave não é uma identidade de usuário e não persiste entre recargas da página.

Quando habilitado, o cliente envia `Idempotency-Key`. O complemento valida a chave e a personagem da **URL**, preservando as permissões, argumentos e demais hooks de despacho do WordPress. Sem cabeçalho, o callback legado continua responsável pelo POST. O GET não é substituído; GET e POST de óbolos ficam fora do TransferCache do Angular.

Uma transação InnoDB bloqueia a capacidade, reclama a chave pelo seu SHA-256, bloqueia o recibo e incrementa o contador apenas se a operação ainda não foi concluída. O total resultante é gravado junto ao recibo e ambos são confirmados no mesmo COMMIT. Um replay devolve o total original daquele recibo, mesmo que ofertas posteriores tenham aumentado o agregado. Não se deve interpretar esse recibo como uma nova consulta do total atual.

| Situação                                                        | Resposta e efeito                                    |
| --------------------------------------------------------------- | ---------------------------------------------------- |
| Mesma chave e personagem                                        | Mesmo recibo; nenhum novo incremento                 |
| Chave usada em outra personagem                                 | 409; nenhum incremento                               |
| Chave inválida / personagem inexistente                         | 400 / 404                                            |
| Falha antes do COMMIT                                           | 503 e rollback; repetir com a mesma chave            |
| COMMIT concluído, confirmação perdida                           | Pode retornar 503; repetir a chave recupera o recibo |
| Tabela sem InnoDB, instalação incompleta ou capacidade esgotada | 503; falha fechada                                   |

O recibo de sucesso usa `Cache-Control: no-store`. A mensagem de erro é genérica; não expõe SQL, credenciais ou dados pessoais. O complemento apenas acrescenta `Idempotency-Key` aos cabeçalhos CORS permitidos da rota; não amplia origens ou credenciais.

## Capacidade e manutenção

A tabela nova contém uma linha reservada `capacity` e até 50.000 operações por padrão. O filtro PHP `sanaka_obolo_operation_limit` aceita um inteiro positivo para uma decisão operacional explícita. O bloqueio global da capacidade serializa as transações curtas, limitando crescimento sem apagar recibos necessários a retentativas tardias. Medir contenção antes de aumentar carga ou limite.

Ao atingir o limite, operações novas retornam 503; replays concluídos continuam disponíveis. Não há expiração automática nem rotina que remova recibos. Apagar um recibo permite que uma repetição tardia incremente novamente. A capacidade limita armazenamento; não substitui rate limiting, proteção na borda ou uma política de abuso do endpoint público.

O instalador cria somente a tabela de operações no prefixo corrente, após conferir InnoDB no contador existente. Não converte a tabela de totais, não altera seus valores e não substitui o snippet #6. Fazer backup antes da instalação; não mudar engines em produção como efeito colateral desta entrega.

## Ativação em etapas

1. Instalar o arquivo PHP como plugin de site em **staging**, com PHP 8.3 ou superior, mantendo o snippet #6 ativo. Conferir prefixo, collation, criação da tabela e engines; não usar os testes destrutivos de CI no CMS.
2. Em personagens de teste, conferir uma oferta, repetição da mesma chave, chaves independentes e uma resposta perdida. A mesma chave deve conservar seu recibo sem outro incremento. Conferir também GET, POST legado e permissões/validações do endpoint completo.
3. Conferir OPTIONS/CORS a partir da origem real do Angular, incluindo o plugin de segurança e a camada de hospedagem. O teste PHP isolado não exercita essas camadas.
4. Após validar o complemento no ambiente de destino, adicionar `{ provide: OBOLO_IDEMPOTENCY_ENABLED, useValue: true }` aos providers de `src/app/app.config.ts`, importando o token de `src/app/core/wordpress/obolo-protocol.ts`. Validar a aplicação nesse ambiente e publicar a configuração como mudança própria.
5. Monitorar erros, capacidade e contenção sem registrar chave, IP ou conteúdo de formulário. A confirmação de instalação/ativação permanece na issue #80.

Para reverter, voltar o provider para `false` e publicar o frontend. Manter o complemento e os recibos já criados; remover a tabela ou o histórico não é uma reversão segura de idempotência. Clientes antigos continuam com a semântica legada e podem duplicar uma oferta após resposta perdida.

## Evidência de testes

`Validate obolo protocol` executa lint PHP e `wordpress/tests/obolo-idempotency.test.php` com PHP 8.3 e MySQL 8 no runner isolado. O harness usa SQL real e adaptadores mínimos de WordPress/`wpdb`; não é uma instalação completa do WordPress.

Os cenários incluem 20 workers repetindo a mesma chave, 20 operações independentes, replay tardio, COMMIT seguido de perda da confirmação, rollback, conflito de personagem, chave inválida, capacidade, engine incompatível e preservação do despacho legado. O script só aceita o banco local `sanaka_obolo_test`; ele cria e remove tabelas próprias de teste. Não executar esse harness em uma base de conteúdo.

Os testes Angular conferem cabeçalho habilitado, compatibilidade desabilitada, UUID estável no retry, respostas antigas após A→B→A e totais representáveis com segurança. Ainda são necessárias as conferências de staging do WordPress, CORS e segurança descritas acima.
