// Gerado por scripts/matrix-study-source.mjs. Fonte: bakery-api.ts.
import { StudySource } from '../shared/matrix-study-definition';
export const BAKERY_SOURCES: readonly StudySource[] = [
  {
    index: 0,
    fileName: 'bakery-api.ts',
    titleKey: 'matrix.studies.padaria.sources.request-contract.title',
    descriptionKey: 'matrix.studies.padaria.sources.request-contract.description',
    text: "/** Contratos do exemplo. O servidor ainda valida entradas: tipos TS não protegem uma API real. */\nexport type OrderBody = {\n  readonly productId: string;\n  readonly quantity: number;\n  readonly delivery: boolean;\n};\nexport type PaymentBody = { readonly orderId: string; readonly token: 'demo-token' };\nexport interface BakeryRequest {\n  readonly method: 'GET' | 'POST';\n  readonly path: string;\n  readonly body?: Readonly<Record<string, string | number | boolean>>;\n  // Aqui a chave representa um header de requisição, não um campo do pagamento.\n  readonly idempotencyKey?: string;\n}\nexport interface BakeryResponse {\n  readonly status: 200 | 201 | 400 | 404 | 409 | 500;\n  readonly body: unknown;\n  readonly headers?: Readonly<Record<string, string>>;\n}",
  },
  {
    index: 1,
    fileName: 'bakery-api.ts',
    titleKey: 'matrix.studies.padaria.sources.create-order.title',
    descriptionKey: 'matrix.studies.padaria.sources.create-order.description',
    text: "/** Validação e criação são responsabilidades do servidor simulado, não do template. */\nexport function createBakeryOrder(state: BakeryState, body: BakeryRequest['body']): BakeryState {\n  // [] lê campos de um Record. typeof e a guarda de quantidade estreitam seus tipos.\n  if (\n    !body ||\n    typeof body['productId'] !== 'string' ||\n    !validQuantity(body['quantity']) ||\n    typeof body['delivery'] !== 'boolean'\n  ) {\n    return respond(state, 400, { code: 'INVALID_ORDER' });\n  }\n  const product = state.products.find((item) => item.id === body['productId']);\n  if (!product) {\n    return respond(state, 404, { code: 'PRODUCT_NOT_FOUND' });\n  }\n  if (product.stock < body['quantity']) {\n    return respond(state, 409, { code: 'INSUFFICIENT_STOCK' });\n  }\n  // Limite didático da sessão, não uma regra de negócio recomendada para produção.\n  if (state.orders.length >= 20) {\n    return respond(state, 409, { code: 'DEMO_LIMIT' });\n  }\n  const order: BakeryOrder = {\n    id: `order-${state.orders.length + 1}`,\n    productId: product.id,\n    quantity: body['quantity'],\n    totalCredits: product.priceCredits * body['quantity'],\n    delivery: body['delivery'],\n  };\n  const products = state.products.map((item) =>\n    item.id === product.id ? { ...item, stock: item.stock - order.quantity } : item,\n  );\n  return respond(\n    { ...state, products, orders: [...state.orders, order] },\n    201,\n    { order },\n    { Location: `/api/pedidos/${order.id}` },\n  );\n}",
  },
  {
    index: 2,
    fileName: 'bakery-api.ts',
    titleKey: 'matrix.studies.padaria.sources.idempotent-payment.title',
    descriptionKey: 'matrix.studies.padaria.sources.idempotent-payment.description',
    text: "/**\n * Pagamento FICTÍCIO. Só aceita o token constante demo-token. Nunca peça dados bancários.\n * Chave + conteúdo identificam a intenção. Repetir a mesma intenção não produz novo efeito.\n * Sem chave, o modo deliberadamente inseguro duplica registros para demonstrar o problema.\n * Produção exigiria autenticação, armazenamento durável, transações, concorrência e expiração.\n */\nexport function payBakeryOrder(state: BakeryState, request: BakeryRequest): BakeryState {\n  const body = request.body;\n  if (!body || typeof body['orderId'] !== 'string' || body['token'] !== 'demo-token') {\n    return respond(state, 400, { code: 'INVALID_DEMO_PAYMENT' });\n  }\n  const order = state.orders.find((item) => item.id === body['orderId']);\n  if (!order) {\n    return respond(state, 404, { code: 'ORDER_NOT_FOUND' });\n  }\n  const key = request.idempotencyKey?.trim();\n  if (request.idempotencyKey !== undefined && !key) {\n    return respond(state, 400, { code: 'EMPTY_KEY' });\n  }\n  const fingerprint = JSON.stringify({ orderId: order.id, token: body['token'] });\n  // hasOwn evita confundir chaves como \"constructor\" com propriedades herdadas de Object.\n  const memo = key && Object.hasOwn(state.paymentKeys, key) ? state.paymentKeys[key] : undefined;\n  if (memo) {\n    return memo.fingerprint === fingerprint\n      ? respond(state, 200, { payment: memo.payment, replayed: true })\n      : respond(state, 409, { code: 'KEY_CONFLICT' });\n  }\n  if (state.payments.length >= 40) {\n    return respond(state, 409, { code: 'DEMO_LIMIT' });\n  }\n  const payment: BakeryPayment = {\n    id: `payment-${state.payments.length + 1}`,\n    orderId: order.id,\n    amountCredits: order.totalCredits,\n  };\n  const paymentKeys = key\n    ? { ...state.paymentKeys, [key]: { fingerprint, payment } }\n    : state.paymentKeys;\n  return respond({ ...state, payments: [...state.payments, payment], paymentKeys }, 201, {\n    payment,\n    replayed: false,\n  });\n}",
  },
  {
    index: 3,
    fileName: 'bakery-api.ts',
    titleKey: 'matrix.studies.padaria.sources.bff-view.title',
    descriptionKey: 'matrix.studies.padaria.sources.bff-view.description',
    text: '/**\n * Exemplo de contrato adaptado para uma tela, montado a partir de duas coleções locais.\n * Um BFF real poderia buscar serviços separados. Aqui não há outro servidor ou rede.\n * Só faz sentido ter essa camada se agregar/adaptar dados beneficiar seus consumidores.\n */\nexport function bakeryView(products: readonly BakeryProduct[], orders: readonly BakeryOrder[]) {\n  return {\n    menu: products.map(({ id, stock, priceCredits }) => ({ id, stock, priceCredits })),\n    recentOrders: orders\n      .slice(-3)\n      .map((order) => ({ id: order.id, productId: order.productId, quantity: order.quantity })),\n  };\n}',
  },
];
