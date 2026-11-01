# Implantação de Sanaka no Render

## Estado em 01/11/2026

O serviço Node está ativo em [sanaka.onrender.com](https://sanaka.onrender.com), no workspace
Sanaka, com uma instância `0.5c-512mb` em Virginia e deploy automático desativado. A prévia
mantém `SITE_NOINDEX=true`. O domínio público ainda é servido pela Locaweb.

A autora configurou as credenciais no painel do Render e confirmou o recebimento do teste
de contato. A newsletter responde `available: true`; o fluxo completo de confirmação ainda
precisa ser conferido nessa origem. O retorno DOI já está configurado para
`https://sanaka.onrender.com/posts#newsletter`.

O conector criou o serviço com a verificação TCP padrão. No painel, configurar
**Settings → Health Checks → Health Check Path** como `/api/health`.

As 12 URLs de capas e óbolos dos posts publicados de Mors, Nandinī, Ākāśa e Nemi foram
ajustadas para o CMS e verificadas na API. As URLs principais do WordPress continuam em
`https://sanaka.com.br`; sua troca para o CMS deve acompanhar a virada do domínio.

## Configuração original da entrega

Configuração preparada para uma primeira conferência em `https://<serviço>.onrender.com`.
Esta entrega não cria recursos pagos, não configura credenciais remotas e não altera DNS.
A publicação definitiva depende da aprovação das artes de Saṃvit e da preservação do acesso
ao WordPress e às suas mídias.

O `render.yaml` descreve **um único Web Service Node**. Não criar um Static Site: o formulário
de contato e a newsletter dependem do Express, assim como a resposta HTTP da página 404.

## Configuração do serviço

| Campo             | Valor                                          |
| ----------------- | ---------------------------------------------- |
| Workspace         | Hobby, sem assinatura Pro                      |
| Tipo              | Web Service, runtime Node                      |
| Plano de execução | `0.5c-512mb`: 0,5 CPU e 512 MB                 |
| Preço consultado  | US$ 7/mês pelo serviço, antes de extras        |
| Região proposta   | Virginia                                       |
| Repositório       | `brublurryface/sanaka`                         |
| Branch            | `main`, após o merge desta entrega             |
| Root Directory    | Vazio: a aplicação está na raiz do repositório |
| Build Command     | `npm ci --include=dev && npm run build`        |
| Start Command     | `npm run serve:ssr:sanaka`                     |
| Health Check Path | `/api/health`                                  |
| Auto Deploy       | Desativado                                     |

O identificador atual `0.5c-512mb` corresponde ao antigo Starter. Conferir o preço no resumo
antes de criar o serviço. A cobrança de execução é separada do workspace Hobby; tráfego e
outros excedentes podem acrescentar custo. O plano não estabelece um teto total de R$ 50.

A região pode ser revista antes da criação; ela não pode ser alterada depois no mesmo serviço.
O build usa recursos separados da instância em execução. A escolha de 512 MB ainda precisa
ser validada no Render com navegação real, métricas e formulários.

`.node-version` fixa o Node 24.19.0 usado na validação local desta entrega. `package.json`
restringe a compatibilidade à série 24, a partir de 24.15.0. Uma variável `NODE_VERSION`
configurada no painel tem precedência sobre esse arquivo; evitar uma versão conflitante.

## Primeiro deploy para conferência

1. Depois do merge, conectar o repositório ao Render pelo GitHub.
2. Usar **New → Blueprint** para importar `render.yaml`, ou **New → Web Service** e preencher
   os valores da tabela. Usar um único fluxo para não criar serviços duplicados.
3. Conferir o plano, a região e o custo apresentado. A criação inicia o primeiro build e a cobrança;
   `autoDeployTrigger: 'off'` impede os deploys automáticos seguintes, não esse primeiro deploy.
4. Guardar `SMTP_PASS` e `BREVO_API_KEY` no formulário de variáveis secretas do Render.
   O Blueprint usa `sync: false` para solicitá-las sem gravar valores no Git.
5. Após o serviço receber sua URL, adicionar `BREVO_NEWSLETTER_REDIRECT_URL` com
   `https://<hostname-real>.onrender.com/posts#newsletter` e aplicar a configuração com novo deploy.
   Não usar `localhost`, nem o endereço do WordPress, como retorno desse teste.
6. Conferir a aplicação na URL fornecida antes de adicionar qualquer domínio próprio.

O primeiro deploy pode iniciar sem as credenciais, caso a configuração seja feita manualmente:
o site abre, mas o contato não entrega mensagens e a inscrição na newsletter fica indisponível.
O health check não comprova que essas integrações estão configuradas.

## Ambiente do processo Node

| Variável                        | Valor / origem                                                             |
| ------------------------------- | -------------------------------------------------------------------------- |
| `NODE_ENV`                      | `production`                                                               |
| `PORT`                          | Fornecida pelo Render; o servidor escuta em `0.0.0.0`                      |
| `RENDER_EXTERNAL_HOSTNAME`      | Fornecida pelo Render; autoriza somente o hostname exato no Angular        |
| `NG_ALLOWED_HOSTS`              | Opcional, hosts adicionais separados por vírgula; sem protocolo ou caminho |
| `TRUST_PROXY_HOPS`              | `1` no Blueprint; hipótese a confirmar no ingresso real do Render          |
| `SITE_NOINDEX`                  | `true` na conferência; emite `X-Robots-Tag: noindex, nofollow`             |
| `SMTP_HOST`                     | `email-ssl.com.br`                                                         |
| `SMTP_PORT`                     | `465`                                                                      |
| `SMTP_SECURE`                   | `true`                                                                     |
| `SMTP_USER`                     | `bruna@sanaka.com.br`                                                      |
| `SMTP_PASS`                     | Senha dessa caixa, somente no painel                                       |
| `CONTACT_FROM_EMAIL`            | `Sanaka <bruna@sanaka.com.br>`                                             |
| `CONTACT_TO_EMAIL`              | `sanaka@sanaka.com.br`                                                     |
| `BREVO_API_KEY`                 | Chave API completa, somente no painel                                      |
| `BREVO_NEWSLETTER_LIST_ID`      | `4`                                                                        |
| `BREVO_NEWSLETTER_TEMPLATE_ID`  | `1`                                                                        |
| `BREVO_NEWSLETTER_REDIRECT_URL` | URL HTTPS Angular do ambiente atual, terminando em `/posts#newsletter`     |

Os valores públicos de SMTP, lista e modelo correspondem aos testes já confirmados pela autora.
As credenciais locais não são transferidas ao Render. `.env.example` apenas documenta os nomes;
o servidor não o carrega automaticamente. Não colocar segredos em `public/`, no Angular ou no Git.

### Hosts e proxies

Os hosts locais e públicos já declarados em `angular.json` permanecem autorizados.
O servidor acrescenta o hostname exato fornecido pelo Render e eventuais `NG_ALLOWED_HOSTS`.
Não usar `*` ou `.onrender.com`, que autorizariam outros serviços.

No desenvolvimento local, `TRUST_PROXY_HOPS` fica em `0`: cabeçalhos `X-Forwarded-For` enviados
pelo cliente não mudam o IP usado pelos limitadores. O Blueprint configura `1` para confiar
somente no proxy imediatamente anterior ao Node. Não usar `true`, nem copiar livremente
o primeiro IP desse cabeçalho.

Antes de liberar os formulários em produção, conferir em diagnóstico temporário no servidor
se `request.ip` corresponde ao IP do visitante em duas redes distintas e se um prefixo
`X-Forwarded-For` fornecido pelo cliente não altera esse resultado. Remover esse diagnóstico
depois da conferência. Se houver um proxy adicional, rever a topologia antes de mudar o número.
Os testes locais simulam a cadeia; não comprovam a cadeia real do Render.

Contato e newsletter mantêm contagens independentes, em memória, por processo. A configuração
tem uma instância; não adicionar réplicas sem rever o armazenamento desses limites.

## Conferência da versão publicada para teste

| Conferência              | Resultado esperado                                                           |
| ------------------------ | ---------------------------------------------------------------------------- |
| `/api/health`            | HTTP 200, `{ "status": "ok" }`, `Cache-Control: no-store`                    |
| `/api/newsletter/status` | HTTP 200; `available: true` somente com configuração completa                |
| Home e rotas internas    | Abrir diretamente e atualizar sem erro do host ou perda da rota              |
| Rota inexistente         | Página Nemi com HTTP 404                                                     |
| Imagem ou tradução       | `Cache-Control: public, max-age=0, must-revalidate`                          |
| Bundle JS/CSS com hash   | `Cache-Control: public, max-age=31536000, immutable`                         |
| HTML                     | Revalidação, sem manter uma versão antiga por um ano                         |
| Ambiente de conferência  | `X-Robots-Tag: noindex, nofollow`                                            |
| Conteúdo WordPress       | Posts, imagens, quebra-cabeça e capas carregam no navegador                  |
| Contato autorizado       | Mensagem chega à caixa da autora via SMTP, sem credenciais no navegador      |
| Inscrição autorizada     | E-mail DOI chega; confirmação inclui na lista 4 e retorna à URL Angular      |
| Limites por IP           | Visitantes de redes distintas não compartilham a mesma contagem por proxy    |
| Memória e CPU            | Conferir métricas durante navegação real, sem reinícios por falta de memória |

O teste de saúde verifica apenas a resposta do processo. Não consulta SMTP, Brevo ou WordPress
e não envia mensagens. Um `available: true` verifica a configuração local da newsletter,
não a validade remota da chave. Envios reais devem ser testes expressamente autorizados pela autora.

O cache de um ano foi reservado aos bundles com hash. Imagens e traduções podem reutilizar
o nome e ainda receber conteúdo atualizado mediante revalidação HTTP. A mudança não apaga
cópias antigas que algum navegador já tenha guardado com a política anterior.

## WordPress na Locaweb

`https://cms.sanaka.com.br` é um apontamento para a instalação WordPress existente, com o mesmo
banco, arquivos, snippets e contadores. Não criar outra instalação nem duplicar o conteúdo.
O subdomínio já tem HTTPS e um registro A próprio para a Locaweb, independente do domínio público.

| Recurso          | Endereço                                              | Situação                                                                  |
| ---------------- | ----------------------------------------------------- | ------------------------------------------------------------------------- |
| Site público     | `https://sanaka.com.br` e `https://www.sanaka.com.br` | Ainda servidos pela Locaweb; destino futuro: Render                       |
| API editorial    | `https://cms.sanaka.com.br/wp-json/wp/v2`             | Consultada pelo Angular e pelo script de auditoria                        |
| API de óbolos    | `https://cms.sanaka.com.br/wp-json/sanaka/v1`         | Mesmos contadores da instalação atual                                     |
| Painel WordPress | `https://cms.sanaka.com.br/wp-admin/`                 | Ainda redireciona o login para o domínio antigo                           |
| Mídias           | `https://cms.sanaka.com.br/wp-content/uploads/…`      | Arquivos acessíveis; URLs retornadas pela API ainda usam o domínio antigo |

O endereço REST fica em `src/app/core/wordpress/wordpress-api.ts`. Posts, fragmentos do Sobre,
livros do Sanakaverse e óbolos usam os tokens compartilhados desse arquivo. A troca do hostname
não muda os IDs das categorias nem as regras editoriais de Sanaka e WoD.

### Conferência em 18/10/2026

Consultas públicas confirmaram HTTPS, posts com os mesmos IDs nos dois hosts, os seis ciclos
com `hover_text`, os campos de capa e óbolo de Nandinī e a leitura de seu contador. Duas mídias
de exemplo responderam HTTP 200 diretamente pelo CMS, sem redirecionamento ao domínio antigo.
O CORS permitiu a origem `http://localhost:4200`, expôs os cabeçalhos de paginação e respondeu
ao preflight de POST dos óbolos. Não foi feita oferta real para validar essa configuração.

A aplicação já pode consultar a API pelo CMS enquanto o site público continua no WordPress.
Isso não conclui a mudança: as URLs internas do WordPress e das mídias ainda precisam ser
ajustadas antes de apontar o domínio público para o Render.

### Preparação para a troca final

Os redirecionamentos necessários estão em `src/server/legacy-wordpress-redirects.ts`,
com inventário público de 01/11/2026 em `src/server/legacy-wordpress-data.ts`:

- As 21 publicações de Sanaka em `/ano/mês/slug/` e seus links curtos `?p=ID` apontam
  para `/posts/slug`, com HTTP 301.
- Os posts da categoria Romance (43), arquivos por data, páginas legadas, categorias,
  tags, autores e feeds mantêm o caminho no WordPress em `https://cms.sanaka.com.br`.
  A página `/contato` permanece na aplicação.
- Mídias, arquivos do WordPress, painel, login e API são encaminhados ao CMS com HTTP 308,
  preservando método e corpo dos clientes antigos. Os parâmetros da URL são mantidos;
  links curtos de Sanaka removem somente o parâmetro de identificação usado no redirecionamento.
- Pré-visualizações editoriais continuam no WordPress. Rotas e APIs da aplicação continuam
  com seu comportamento anterior; caminhos fora dos espaços legados mantêm a página 404.

Conferir essas regras no endereço do Render depois do merge e do deploy. O inventário
usa os mesmos IDs e a exclusão de Romance adotada pela aplicação; se um endereço legado
mudar de destino, atualizar esse inventário. As regras não criam, apagam ou transferem
conteúdo no WordPress, nem dependem de uma chamada REST por acesso.

Com a aplicação aprovada na URL de conferência do Render e um backup atualizado de arquivos e banco:

1. Registrar os valores atuais de `home` e `siteurl` e verificar se `WP_HOME` ou `WP_SITEURL`
   os sobrescrevem em `wp-config.php`. Na janela da mudança, ajustar os endereços da instalação
   para `https://cms.sanaka.com.br` e conferir login, painel, API e uploads nesse host.
2. Revisar as URLs de mídias no conteúdo, metadados, opções de plugins e campos personalizados,
   incluindo `sanakaverse_cover`, `sanaka_obolo_front` e `sanaka_obolo_back`. Usar uma ferramenta
   compatível com dados serializados, com simulação e revisão antes de aplicar. Preservar os GUIDs;
   evitar um `REPLACE` indiscriminado em todas as tabelas. Não mover os arquivos nem recriar os IDs.
3. Conferir o conteúdo e as imagens pelo Angular a partir do novo host. Validar também CORS e
   paginação na origem real do Render; a conferência com `localhost` não substitui esse teste.
4. Preparar os redirecionamentos das URLs antigas no servidor que receberá o domínio público.
   Respeitar os destinos editoriais de Sanaka e WoD. Um `.htaccess` deixado na Locaweb não atenderá
   requisições de um domínio cujo DNS já aponta para o Render.
5. Alterar somente os registros web do domínio público. Manter o apontamento independente do CMS,
   os registros de e-mail da Locaweb e os registros da Brevo. Conferir painel, uploads e API novamente.

O preparo desta entrega não altera `home`, `siteurl`, conteúdo do banco, DNS ou credenciais,
nem cria um serviço no Render. A mudança definitiva continua dependente da aprovação das artes
e da autorização para iniciar o serviço pago.

## Antes da troca do domínio

1. Concluir as artes aprovadas de Saṃvit.
2. Concluir a separação do WordPress descrita acima. A API do Angular já usa
   `https://cms.sanaka.com.br/wp-json`, mas o WordPress ainda retorna URLs de mídia no domínio
   público. Validar painel, API, mídias e redirecionamentos antes de alterar esse DNS.
3. Preservar os registros de e-mail da Locaweb e os registros de autenticação/branding da Brevo.
4. Configurar o domínio e HTTPS no Render, revisar os links canônicos e os redirecionamentos
   das URLs públicas antigas do WordPress para as publicações Angular.
5. Atualizar o retorno DOI para a URL Angular definitiva.
6. Depois da aprovação, mudar `SITE_NOINDEX` para `false` no Blueprint e no serviço, fazer novo
   deploy e conferir que o cabeçalho de bloqueio desapareceu.

WordPress e e-mail permanecem na Locaweb. Esta configuração não contrata banco, disco ou IA,
nem implementa a conversa de Saṃvit. O sistema de arquivos do serviço é temporário; não usá-lo
como armazenamento permanente de futuras conversas.

Para atualizar a versão após uma PR aprovada, fazer um deploy manual da `main` no Render e
repetir as conferências afetadas. Em caso de falha, usar o rollback do painel para um deploy
anterior bem-sucedido; rollback não restaura dados alterados no WordPress ou na Brevo.

## Referências

Consultadas em 17 e 18/10/2026:

- [Render — preços](https://render.com/pricing)
- [Render — Blueprint](https://render.com/docs/blueprint-spec)
- [Render — versão do Node](https://render.com/docs/node-version)
- [Render — build separado da execução](https://render.com/docs/build-pipeline)
- [Render — Web Services](https://render.com/docs/web-services)
- [Render — health checks](https://render.com/docs/health-checks)
- [Express — configuração de proxies](https://expressjs.com/en/guide/behind-proxies/)
- [WordPress — migração e mudança de URLs](https://developer.wordpress.org/advanced-administration/upgrade/migrating/)
- [Contato por SMTP](contact-form-deployment.md)
- [Newsletter Brevo](newsletter-brevo.md)
