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

Depois de obter os dados SMTP, definir as variáveis apenas na sessão atual, gerar a aplicação e iniciar o servidor SSR:

```powershell
$env:SMTP_HOST = "servidor-do-provedor"
$env:SMTP_PORT = "465"
$env:SMTP_SECURE = "true"
$env:SMTP_USER = "sanaka@sanaka.com.br"
$env:SMTP_PASS = "senha-da-conta"
$env:CONTACT_FROM_EMAIL = "Sanaka <sanaka@sanaka.com.br>"
$env:CONTACT_TO_EMAIL = "sanaka@sanaka.com.br"

npm run build
npm run serve:ssr:sanaka
```

A página estará disponível em `http://localhost:4000/contato`. O `ng serve` continua adequado para revisar a interface, mas não executa o endpoint Express e, por isso, não entrega mensagens.

## Proteções atuais

O endpoint limita o corpo da requisição a 16 KB, valida tamanho e formato dos campos, usa um campo-isca contra bots e aceita até quatro mensagens por IP em quinze minutos. O conteúdo recebido é enviado como texto simples.
