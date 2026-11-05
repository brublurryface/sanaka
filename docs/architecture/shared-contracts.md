# Contratos de entrada compartilhados

## Contato

`src/shared/contact.ts` define os limites e os tipos neutros usados pelo formulário e pelo servidor. Os valores permanecem 80/254/120/4000 caracteres para nome, e-mail, assunto e mensagem. O HTML e os Validators usam esses mesmos limites; o endpoint ainda recebe `unknown`, normaliza e valida cada entrada por conta própria. Compartilhar tipos não transforma dados recebidos em dados confiáveis.

Os testes exercitam cada valor máximo e máximo + 1 no formulário e via HTTP direto, inclusive um e-mail válido de 254 caracteres. SMTP é simulado: nenhum envio real faz parte dos testes.

## Portal NASA

`nasa-query.ts` concentra a normalização e o limite didático de 60 caracteres. O portal resolve o identificador opcional dos seus exemplos; o adaptador HTTP recebe esse identificador explicitamente e não importa a lista visual. Uma consulta livre cujo texto coincide com um exemplo continua sendo livre quando feita diretamente ao adaptador.

O inspetor recebe os mesmos argumentos da chamada HTTP. Os testes conferem texto livre, identificador explícito, normalização, exemplos do portal e a correspondência dos parâmetros exibidos.

## Arquivo de publicações

`post-query.ts` define o tamanho padrão de 20 publicações usado pelo store e pelo adaptador. Os limites de paginação das outras coleções continuam próprios. Não foi introduzida memoização adicional da árvore de categorias: esse custo depende das medições de crescimento do acervo.
