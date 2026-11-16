# Conversão segura de texto do WordPress

`WordPressTextService.toText` extrai texto de títulos e resumos recebidos do CMS. Interpretar esse HTML em um `div` criado pelo documento da aplicação permitia disparar eventos de imagens e carregar recursos mesmo sem inserir o elemento na página.

## Implementação

O serviço cria um documento sem contexto de navegação com `DOCUMENT.implementation.createHTMLDocument` e interpreta cada entrada em um `template` desse documento. Seu conteúdo nunca é adotado pelo DOM da aplicação. A conversão remove `.more-link`, `script` e `style`, preserva entidades e separadores editoriais e devolve somente texto com espaços normalizados.

Essa função não sanitiza HTML para exibição. Os consumidores devem tratar o resultado como texto. As renderizações de HTML do artigo continuam usando a proteção normal do Angular; esta mudança não introduz `bypassSecurityTrustHtml`, dependências de produção ou alterações em artes e animações.

## Regressão automatizada

- `npm run test:ci -- --include=src/app/core/wordpress/wordpress-text.service.spec.ts`: entidades, blocos, conteúdo removido, HTML incompleto e isolamento entre conversões.
- `npm run test:browser:security`: os mesmos casos e a regressão de segurança em Chromium real, com eventos de imagem/SVG/HTML malformado e tentativas de carregar imagens, `srcset` e frames.
- O observador de requisições intercepta apenas caminhos reservados do teste. Um controle positivo carrega uma imagem ativa e comprova que o observador detecta requisições. Nenhum desses testes depende do CMS.

O workflow `Validate Sanaka` instala o Chromium do Playwright e executa a regressão após as verificações existentes. O navegador é necessário porque o JSDOM não reproduz todos os eventos e carregamentos relevantes.

## Compatibilidade verificada

Uma comparação isolada em navegador, usando os serviços original e corrigido com a mesma entrada, demonstrou execução do evento e duas requisições no original; na correção, nenhum evento nem requisição ocorreu e o texto permaneceu igual.

A API pública `renderApplication` do Angular também foi exercitada com o serviço corrigido: cinco casos de texto, entidades, remoção de scripts/estilos, `.more-link` e templates internos passaram no documento do servidor. Isso verifica a compatibilidade do conversor com SSR, sem ativar renderização editorial em produção.

Referências: [segurança no Angular](https://angular.dev/best-practices/security), [testes com navegador](https://angular.dev/guide/testing) e [elemento template no padrão HTML](https://html.spec.whatwg.org/multipage/scripting.html#the-template-element).
