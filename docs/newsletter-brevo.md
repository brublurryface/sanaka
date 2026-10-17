# Newsletter de Sanaka — Brevo sem plugin WordPress

## Decisão e limites

A newsletter é uma seleção editorial de novidades com comentários breves da autora. As edições são preparadas e enviadas manualmente na Brevo; publicar ou revisar um post no WordPress **não dispara campanha**. Preservar a separação de conteúdo entre Sanaka e WoD, inclusive ao escolher os links de uma edição.

- Angular apresenta o cadastro no final de `/posts`; o footer aponta para `/posts#newsletter`.
- O servidor Node existente recebe o pedido e chama o endpoint **double opt-in** da Brevo.
- Brevo administra assinantes, confirmação, campanhas e descadastro.
- WordPress continua responsável pelo conteúdo, sem plugin adicional de newsletter.
- Contato por SMTP e newsletter são operações separadas. Enviar uma mensagem de contato não assina a newsletter.

O cadastro solicita somente e-mail e consentimento explícito, inicialmente desmarcado. Não cria usuário WordPress nem exige conta do visitante. A interface tem traduções PT-BR/en; o conteúdo editorial das campanhas e do modelo de confirmação é configurado separadamente na Brevo.

Esta implementação pode ser validada com respostas simuladas. **Entrega real, inclusão após confirmação, remetente e descadastro só podem ser considerados validados depois do teste na conta da autora.**

## Configuração na Brevo

1. Criar a conta e concluir as verificações solicitadas pela plataforma.
2. Configurar o remetente e autenticar o domínio conforme os registros informados pela Brevo. Esses registros são específicos da conta: não inventar nem substituir entradas DNS existentes indiscriminadamente.
3. Criar a lista **Sanaka — Novidades** e guardar seu ID numérico.
4. Criar ou usar um modelo **de confirmação double opt-in**, com remetente autorizado, e ativá-lo. Guardar seu ID numérico. O botão precisa usar o link de confirmação da Brevo, não um endereço fixo para o Sanaka.
5. Conferir o modelo pelo endpoint `GET /v3/smtp/templates/{templateId}`: deve estar ativo (`isActive: true`) e ser reconhecido como DOI (`doiTemplate: true`). A documentação da API também descreve `{{ params.DOIurl }}` como referência para a URL de retorno. Uma URL de retorno, sozinha, não substitui o mecanismo de confirmação.
6. Criar uma chave de API dedicada à integração e guardá-la somente no ambiente do servidor. Não colar a chave no chat, em prints, no WordPress, no TypeScript do navegador ou no Git.

A aplicação usa diretamente `POST /v3/contacts/doubleOptinConfirmation`. Não usa `POST /v3/contacts` para cadastrar pessoas imediatamente e não depende de uma automação baseada em lista temporária.

O texto de consentimento do modelo deve corresponder ao convite apresentado no formulário: receber novidades de Sanaka por e-mail, com opção de cancelamento. Preparar as campanhas com o mecanismo de descadastro da Brevo e testar esse link antes do primeiro envio público.

### Configuração informada pela autora — 17/10/2026

| Item                      | Valor confirmado                                                          |
| ------------------------- | ------------------------------------------------------------------------- |
| Domínio de envio          | `sanaka.com.br`, informado como autenticado no painel                     |
| Subdomínio de marca       | Prefixo `news`, informado como configurado no painel                      |
| Remetente                 | Sanaka — `sanaka@sanaka.com.br`, informado como verificado                |
| Lista                     | Sanaka — Novidades, ID `4` informado pela autora                          |
| Modelo                    | Sanaka — Confirmação de inscrição, ID `1`                                 |
| Consulta do modelo        | `GET /v3/smtp/templates/1` executado pela autora com sucesso              |
| Estado remoto do modelo   | `isActive: true` e `doiTemplate: true`                                    |
| Teste direto do fluxo DOI | Recebimento correto do e-mail e inclusão na lista confirmados pela autora |

A consulta confirma que a chave usada pela autora foi aceita e que o modelo está ativo e reconhecido como DOI. A chave permanece somente no computador da autora.

Em 17/10/2026, a autora executou o teste direto de `POST /v3/contacts/doubleOptinConfirmation`, com lista `4`, modelo `1` e retorno provisório para `https://sanaka.com.br/`. Informou que o e-mail de confirmação chegou corretamente e que o endereço foi incluído na lista. Esse resultado valida a etapa exercitada diretamente na Brevo; o formulário Angular, o retorno à aplicação local, o descadastro e a campanha de teste continuam pendentes.

O nome do modelo apareceu com acentos corrompidos na saída do PowerShell; esse resultado deve ser distinguido do e-mail recebido, que a autora informou estar correto.

## Variáveis exclusivamente do servidor

| Nome                            | Valor esperado                                         |
| ------------------------------- | ------------------------------------------------------ |
| `BREVO_API_KEY`                 | Chave secreta da integração                            |
| `BREVO_NEWSLETTER_LIST_ID`      | ID inteiro positivo da lista Sanaka — Novidades        |
| `BREVO_NEWSLETTER_TEMPLATE_ID`  | ID inteiro positivo do modelo DOI ativo                |
| `BREVO_NEWSLETTER_REDIRECT_URL` | URL da aplicação após a confirmação; HTTPS em produção |

IDs e URL são lidos do ambiente, não aceitos do visitante. Não há valores padrão que possam cadastrar alguém em uma lista errada.

As quatro variáveis precisam estar preenchidas e válidas para liberar o formulário. `GET /api/newsletter/status` retorna apenas `{ "available": true }` ou `{ "available": false }`, com `Cache-Control: no-store`. Esse estado verifica a configuração local, **não** autentica a conta nem comprova a validade remota da chave, da lista ou do modelo.

Configuração ausente ou inválida deixa somente a inscrição indisponível; não impede a aplicação de iniciar. Não é necessário configurar newsletter para desenvolver ou acessar outras páginas.

O arquivo `.env.example` documenta os nomes. Ele não contém uma chave e não é carregado automaticamente. A configuração deve estar no processo que executa o Node, no desenvolvimento e na produção.

## Teste local — PowerShell

Parar o servidor com `Ctrl+C`. No mesmo PowerShell que iniciará o Angular, colar o bloco inteiro abaixo. Só depois que o PowerShell pedir a chave, colar o valor completo. O bloco captura a chave e atualiza a variável usada na requisição na mesma execução, evitando consultar a API com uma credencial anterior.

Os IDs `4` e `1` correspondem à conta informada nesta entrega. Conferi-los antes de usar o exemplo em outra conta.

```powershell
& {
    $newsletterSecureKey = Read-Host "Chave API completa da Brevo" -AsSecureString

    # A consulta usa a variável de ambiente, atualizada com a chave recém-digitada.
    $env:BREVO_API_KEY = ([System.Net.NetworkCredential]::new("", $newsletterSecureKey).Password).Trim()
    $env:BREVO_NEWSLETTER_LIST_ID = "4"
    $env:BREVO_NEWSLETTER_TEMPLATE_ID = "1"
    $env:BREVO_NEWSLETTER_REDIRECT_URL = "http://localhost:4200/posts#newsletter"

    # Exibe somente metadados do modelo, sem imprimir a chave.
    Invoke-RestMethod `
      -Uri "https://api.brevo.com/v3/smtp/templates/$env:BREVO_NEWSLETTER_TEMPLATE_ID" `
      -Headers @{ "api-key" = $env:BREVO_API_KEY } `
      -ErrorAction Stop |
      Format-List id, name, isActive, doiTemplate
}
```

Se a API responder `Key not found`, conferir a chave em **Configurações → SMTP e API → Chaves API e MCP**. A integração usa uma chave API completa, cujo formato documentado começa com `xkeysib-`; uma chave SMTP não serve para esta consulta. Deixar a opção de chave MCP desmarcada. O teste de formato ajuda a identificar uma cópia incorreta, mas a aceitação pela API é que valida a autenticação. Não imprimir a chave para investigar.

Quando os IDs e o modelo estiverem corretos:

```powershell
npx ng serve --watch
```

Essa configuração executa o handler Express exportado por `src/server.ts` no desenvolvimento. O formulário fica em `http://localhost:4200/posts#newsletter`. As variáveis valem somente para aquela sessão; não são compartilhadas com outro PowerShell nem gravadas no repositório.

### Conferência real, feita com e-mail de teste da autora

1. Verificar que sem e-mail válido ou sem consentimento o pedido não é enviado.
2. Enviar uma inscrição autorizada e confirmar que aparece **pedido recebido, confira seu e-mail**, não assinatura já confirmada.
3. Antes de clicar, conferir que o endereço ainda não está apto a receber campanhas da lista final pelo fluxo DOI.
4. Abrir o e-mail de confirmação e clicar no link gerado pela Brevo.
5. Conferir a entrada na lista correta e o retorno à aplicação.
6. Enviar uma campanha de teste somente para o endereço autorizado e conferir arte, links para Angular e descadastro.
7. Testar endereço já inscrito e nova inscrição após descadastro; não forçar reativação com `emailBlacklisted: false` nem contornar a confirmação.
8. Conferir o bloco e o link do footer em desktop e mobile, inclusive ao abrir a newsletter enquanto a lista de posts ainda carrega.

`localhost` só funciona no dispositivo do teste. Antes da publicação, trocar a URL de retorno pela URL pública Angular. No teste de produção, confirmar também as restrições da conta e os limites do plano vigente no painel Brevo.

## Contrato HTTP e proteções

`POST /api/newsletter` aceita JSON de até 2 KB:

```json
{
  "email": "leitor@example.com",
  "consent": true,
  "website": ""
}
```

| Resposta                | Significado                                                                  |
| ----------------------- | ---------------------------------------------------------------------------- |
| `202`, `accepted: true` | Pedido de confirmação aceito; a assinatura ainda depende do clique no e-mail |
| `400`                   | Campos inválidos, consentimento ausente ou JSON malformado                   |
| `413`                   | Corpo maior que 2 KB                                                         |
| `415`                   | Conteúdo não enviado como JSON                                               |
| `429`                   | Limite local de tentativas ou limitação do provedor                          |
| `503`                   | Configuração local ausente ou inválida                                       |
| `502`                   | Brevo recusou o pedido ou ocorreu falha/timeout de comunicação               |

O campo `website` é uma isca: quando preenchido, devolve uma aceitação genérica sem chamar a Brevo. Não é uma prova de entrega.

O endpoint valida o pedido novamente no servidor, limita a cinco tentativas por IP a cada quinze minutos e aplica prazo de oito segundos à comunicação externa. Não repete automaticamente pedidos que possam disparar outro e-mail. Erros públicos não expõem respostas da Brevo, endereços cadastrados, configuração ou chave; logs da newsletter não imprimem e-mails nem segredos.

O limitador compartilhado com contato mantém no máximo mil entradas por processo e remove janelas vencidas. As contagens dos dois endpoints são independentes. Não mantém cookies nem base paralela de assinantes.

O limite é **por processo Node**, não distribuído. Em produção com várias instâncias, a proteção precisa ser compartilhada ou aplicada no proxy. Em hospedagem com proxy reverso, conferir os proxies confiáveis antes de configurar `trust proxy`; não confiar indiscriminadamente em `X-Forwarded-For` enviado pelo visitante. Essa configuração depende da topologia real da implantação.

O WordPress não é chamado nesse fluxo e a integração não importa posts nem cria campanhas automaticamente. A chave não pertence ao bundle do navegador. Não foi adicionado SDK, plugin ou serviço de banco de dados à aplicação.

## Validações automatizadas

```sh
npm run test:server
npm run check
```

Os testes do servidor usam a rota HTTP real com uma função de rede simulada. Os testes Angular validam formulário, acessibilidade dos campos, consentimento, envio único, estados de falha, confirmação pendente e cancelamento da assinatura RxJS na destruição do componente. As suítes não criam contatos nem enviam mensagens à Brevo.

## Conferência desta entrega — 16/10/2026

- `npm run check`: aprovado, incluindo sincronismo do código didático, Prettier, testes do servidor, testes Angular, cobertura, duplicação e build.
- Angular: **398 testes, 53 arquivos**. Cobertura: statements **95,74%**, branches **92,88%**, functions **96,47%**, lines **95,79%**.
- Servidor: **45 testes, 3 arquivos**, incluindo regressão do envio de contato sem SMTP real. A cobertura configurada para os módulos novos de newsletter/limitação é **98,90%** em statements/lines, **96%** em branches e **100%** em functions. Esse número não representa cobertura completa de todos os módulos preexistentes do servidor.
- Duplicação TypeScript da aplicação: **1,24% das linhas**, abaixo do limite de 3%; nenhuma nova ocorrência foi apontada nos módulos da newsletter.
- Build: **10 rotas pré-renderizadas**, bundle inicial **417,91 KB** e transferência estimada **109,58 KB**.
- Conferência HTTP do build sem variáveis Brevo: `/` e `/posts` respondem `200`; disponibilidade retorna `available: false`; pedido sem consentimento retorna `400`; pedido válido sem configuração retorna `503`; contato com corpo inválido continua retornando `400`. Nenhuma mensagem foi enviada nesse teste.
- Busca no JavaScript de publicação do navegador: não encontrou os nomes das variáveis Brevo nem `api.brevo.com`.
- `git diff --check`: aprovado.
- Aviso preexistente do ambiente: npm informa configuração `http-proxy` desconhecida. Não foi alterada nesta entrega.
- A inspeção visual em navegador não foi executada: não havia Chromium disponível. Os testes DOM não substituem o pente fino visual de desktop/mobile.
- Não houve configuração de conta Brevo, alteração de WordPress, envio real de confirmação/campanha, commit, push ou PR nesta etapa.

### Arquivos da entrega

**Contrato e servidor**

- `src/shared/newsletter.ts`
- `src/server/newsletter.ts`
- `src/server/newsletter.spec.ts`
- `src/server/request-rate-limit.ts`
- `src/server/request-rate-limit.spec.ts`
- `src/server/contact.ts`
- `src/server/contact.spec.ts`
- `src/server.ts`

**Interface e integração**

- `src/app/pages/posts/newsletter-signup/newsletter-signup.ts`
- `src/app/pages/posts/newsletter-signup/newsletter-signup.html`
- `src/app/pages/posts/newsletter-signup/newsletter-signup.scss`
- `src/app/pages/posts/newsletter-signup/newsletter-signup.spec.ts`
- `src/app/pages/posts/newsletter-signup/data-access/newsletter.service.ts`
- `src/app/pages/posts/newsletter-signup/data-access/newsletter.service.spec.ts`
- `src/app/pages/posts/posts.ts`
- `src/app/pages/posts/posts.html`
- `src/app/pages/posts/posts.spec.ts`
- `src/app/app.html`
- `src/app/app.scss`
- `src/app/app.spec.ts`
- `public/i18n/pt-BR.json`
- `public/i18n/en.json`

**Configuração e documentação**

- `.env.example`
- `angular.json`
- `package.json`
- `vitest.server.config.ts`
- `docs/contact-form-deployment.md`
- `docs/newsletter-brevo.md`

## Referências oficiais

- [Brevo — Create Contact via DOI](https://developers.brevo.com/reference/create-doi-contact)
- [Brevo — Consulta e identificação do modelo DOI](https://developers.brevo.com/reference/get-smtp-template)
- [Brevo — Variáveis de links em modelos](https://help.brevo.com/hc/en-us/articles/4402386448530--Manual-Personalize-your-messages-with-dynamic-content-Brevo-Template-Language)
- [Angular — Servidor SSR e handler usado no desenvolvimento](https://angular.dev/guide/ssr)
