# Formulário de contato

O formulário da rota `/contato` envia `POST /api/contact`. O endpoint pertence ao servidor Express da aplicação e entrega a mensagem por SMTP; nenhuma credencial é enviada ao navegador.

## Variáveis de ambiente

Configurar no ambiente que executa o servidor SSR:

- `SMTP_HOST`: servidor informado pelo provedor do e-mail;
- `SMTP_PORT`: normalmente `465` com conexão segura ou `587` com STARTTLS;
- `SMTP_SECURE`: `true` para a porta segura, `false` para STARTTLS;
- `SMTP_USER`: usuário da conta de e-mail;
- `SMTP_PASS`: senha ou senha de aplicação;
- `CONTACT_FROM_EMAIL`: remetente autorizado pelo servidor SMTP;
- `CONTACT_TO_EMAIL`: caixa que receberá as mensagens. Se omitida, usa `sanaka@sanaka.com.br`.

O arquivo `.env.example` documenta os nomes, mas a aplicação não carrega segredos desse arquivo. As credenciais devem ser configuradas no painel da hospedagem ou no processo que inicia o Node.

## Teste local pelo PowerShell

O envio local foi confirmado pela autora em 15/10/2026 com SMTP Locaweb, autenticação pela caixa `bruna@sanaka.com.br`, remetente correspondente e destino `sanaka@sanaka.com.br`. A autenticação pela caixa `sanaka@sanaka.com.br` havia retornado `535 / EAUTH`; isso não identifica, sozinho, a causa da recusa dessa conta.

Parar o servidor com `Ctrl+C` e definir as variáveis na mesma sessão PowerShell que iniciará o Node:

```powershell
$env:SMTP_HOST = "email-ssl.com.br"
$env:SMTP_PORT = "465"
$env:SMTP_SECURE = "true"
$env:SMTP_USER = "bruna@sanaka.com.br"
$env:CONTACT_FROM_EMAIL = "Sanaka <bruna@sanaka.com.br>"
$env:CONTACT_TO_EMAIL = "sanaka@sanaka.com.br"

$senhaSanaka = Read-Host "Senha da caixa de e-mail" -AsSecureString
```

Digitar a senha na solicitação e pressionar Enter. Só depois executar:

```powershell
$env:SMTP_PASS = [System.Net.NetworkCredential]::new("", $senhaSanaka).Password
node -e "console.log(Boolean(process.env.SMTP_PASS?.trim()))"
```

O teste imprime somente `true` ou `false`. Quando retornar `true`, iniciar:

```powershell
npx ng serve --watch
```

A página fica em `http://localhost:4200/contato`. Nesta configuração do projeto (`outputMode: server`, `ssr.entry: src/server.ts` e `reqHandler` exportado), o dev-server Angular usa o endpoint Express. Não é necessário gerar um build a cada teste de envio.

Para conferir o artefato de produção localmente, com as variáveis já definidas:

```powershell
npm run build
if ($LASTEXITCODE -eq 0) {
  npm run serve:ssr:sanaka
}
```

Nesse segundo modo, a página estará em `http://localhost:4000/contato`. Não iniciar os dois modos por engano em terminais com configurações diferentes.

Não colocar senhas em comandos literais, commits ou prints. Ao encerrar a sessão, as variáveis locais não permanecem configuradas. Em produção elas precisam ser definidas no ambiente do processo Node. `535 / EAUTH` indica autenticação recusada pelo SMTP; `Missing environment variable: SMTP_PASS` indica senha ausente/vazia antes da tentativa de autenticação.

## Proteções atuais

O endpoint limita o corpo da requisição a 16 KB, valida tamanho e formato dos campos, usa um campo-isca contra bots e aceita até quatro mensagens por IP em quinze minutos, com `Retry-After` quando bloqueia. O conteúdo recebido é enviado como texto simples.

Contato e newsletter reutilizam a implementação do limitador, mas mantêm contagens independentes. O limite é local ao processo Node; a política de proxy e de múltiplas instâncias precisa ser definida na implantação. Veja [Newsletter Brevo](newsletter-brevo.md) para os limites dessa proteção e a separação dos cadastros.

## Prazos e confirmação do envio

| Limite                     | Valor | Alcance                                                                |
| -------------------------- | ----- | ---------------------------------------------------------------------- |
| connectionTimeout          | 10 s  | Estabelecimento da conexão SMTP.                                       |
| greetingTimeout            | 5 s   | Espera pela saudação/handshake dentro do orçamento de conexão.         |
| socketTimeout              | 10 s  | Inatividade da conexão.                                                |
| Tentativa SMTP completa    | 30 s  | AbortController por mensagem, incluindo a confirmação final.           |
| Resposta HTTP no navegador | 40 s  | Cancela a assinatura/requisição pendente e encerra o estado de espera. |

Os limites por fase não são somados nem substituem o prazo total. O Nodemailer foi atualizado de 10.3.1 para 10.5.0, com suporte nativo a AbortSignal por envio. Ao vencer o prazo total, o sinal encerra a conexão daquela mensagem; não há Promise.race abandonando a entrega em segundo plano. O timer é removido quando a tentativa termina antes do prazo.

O contrato neutro em `src/shared/contact.ts` mantém os orçamentos de servidor e navegador alinhados. Os limites por fase ficam no servidor. Não foram acrescentadas credenciais ou variáveis obrigatórias de implantação.

Timeouts SMTP retornam 504 com `{ delivered: false, reason: 'unconfirmed' }`. Perdas de conexão retornam 503 com o mesmo motivo, pois o servidor SMTP pode ter recebido a mensagem antes da interrupção. Recusas conhecidas, como autenticação rejeitada, e configuração ausente continuam com 503 e `{ delivered: false }`. Nenhum detalhe do provedor ou corpo da mensagem aparece na resposta ou no log genérico de falha.

A interface identifica prazo vencido, interrupção de rede e resultado não confirmado. Preserva os campos, libera o botão e informa em PT/EN que a mensagem pode ter sido enviada. Somente uma resposta de sucesso limpa o formulário. Não há retry automático de POST ou de SMTP: repetir um envio sem confirmação pode duplicar uma mensagem já aceita.

`createContactHandler` isola transporte e contador por instância. `createContactRouter` compõe o parser JSON de 16 KB, o handler e o tratamento de erros de corpo. JSON malformado, corpo excessivo e charset não suportado recebem JSON controlado, sem reproduzir conteúdo recebido. O router ocupa a mesma posição em `server.ts`, após o cache no-store de APIs e antes dos redirecionamentos, arquivos e renderer. O health check permanece independente de SMTP, Brevo e CMS.

## Validação automatizada

- `npm run test:server`: cobre validação, honeypot, quatro tentativas, privacidade, parser e falhas HTTP. O cálculo de cobertura inclui o handler e o router de contato, com o limite existente de 85%.
- Os testes de integração usam um servidor SMTP TCP local e o Nodemailer real, com respostas controladas: saudação silenciosa, conexão indisponível, inatividade após DATA, perda da confirmação, recusa de autenticação e tráfego contínuo que só termina pelo cancelamento total. Nenhuma mensagem sai da máquina de testes.
- Os testes Angular verificam cancelamento da requisição no prazo, ausência de retry, preservação dos campos e estados de confirmação.
- Os cenários de navegador usam respostas locais simuladas para POST /api/contact, sem chegar ao Express/SMTP. Conferem envio pendente, bloqueio de duplicação, confirmação, resultado incerto traduzido e limite de tentativas em desktop e celular. O bloqueio dos demais envios/serviços externos da suíte permanece ativo.

Referências: [Nodemailer 10.5.0](https://github.com/nodemailer/nodemailer/releases/tag/v10.5.0), [cancelamento por envio](https://nodemailer.com/guides/cancelling-a-send) e [prazos SMTP](https://nodemailer.com/smtp).
