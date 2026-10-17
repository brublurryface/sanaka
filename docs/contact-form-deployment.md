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
