// Gerado por scripts/matrix-study-source.mjs. Fonte: kalika-game.ts.
import { StudySource } from '../shared/matrix-study-definition';
export const GAME_SOURCES: readonly StudySource[] = [
  {
    index: 0,
    fileName: 'kalika-game.ts',
    titleKey: 'matrix.studies.jogo.sources.classic-function.title',
    descriptionKey: 'matrix.studies.jogo.sources.classic-function.description',
    text: "/** Função pura suficiente para três jogadas fixas. Não modifica suas entradas. */\nexport function playClassic(player: string, opponent: string): RoundOutcome | 'invalid' {\n  if (!isMove(player, CLASSIC_MOVES) || !isMove(opponent, CLASSIC_MOVES)) {\n    return 'invalid';\n  }\n  if (player === opponent) {\n    return 'tie';\n  }\n  // && exige as duas condições; || aceita qualquer uma das três vitórias possíveis.\n  const wins =\n    (player === 'rock' && opponent === 'scissors') ||\n    (player === 'paper' && opponent === 'rock') ||\n    (player === 'scissors' && opponent === 'paper');\n  // ?: escolhe um retorno. Uma vez removidos empates, não vencer significa perder.\n  return wins ? 'win' : 'lose';\n}",
  },
  {
    index: 1,
    fileName: 'kalika-game.ts',
    titleKey: 'matrix.studies.jogo.sources.rule-contract.title',
    descriptionKey: 'matrix.studies.jogo.sources.rule-contract.description',
    text: "/**\n * Interface é um contrato de compilação, não um objeto criado em tempo de execução.\n * null significa \"esta regra não decidiu\"; outra regra poderá avaliar a rodada.\n */\nexport interface RoundRule {\n  readonly id: string;\n  evaluate(player: Move, opponent: Move): RoundOutcome | null;\n}\n\nexport class TieRule implements RoundRule {\n  readonly id = 'tie';\n  evaluate(player: Move, opponent: Move): RoundOutcome | null {\n    return player === opponent ? 'tie' : null;\n  }\n}",
  },
  {
    index: 2,
    fileName: 'kalika-game.ts',
    titleKey: 'matrix.studies.jogo.sources.dominance-rule.title',
    descriptionKey: 'matrix.studies.jogo.sources.dominance-rule.description',
    text: "/**\n * A regra recebe dados de domínio; encapsula a maneira de consultar esses dados.\n * private readonly não permite que consumidores troquem o mapa pelo campo da classe.\n * private é uma restrição TypeScript, não a privacidade em runtime de um campo #.\n */\nexport class DominanceRule implements RoundRule {\n  readonly id = 'dominance';\n  private readonly beats: ReadonlyMap<Move, readonly Move[]>;\n\n  constructor(pairs: readonly (readonly [Move, readonly Move[]])[]) {\n    // Copiamos os arrays: alterar a configuração externa não muda a partida existente.\n    this.beats = new Map(pairs.map(([move, defeated]) => [move, [...defeated]]));\n  }\n\n  evaluate(player: Move, opponent: Move): RoundOutcome | null {\n    // ?. interrompe o acesso se get retornar undefined; não inventa uma vitória.\n    if (this.beats.get(player)?.includes(opponent)) {\n      return 'win';\n    }\n    if (this.beats.get(opponent)?.includes(player)) {\n      return 'lose';\n    }\n    return null;\n  }\n}",
  },
  {
    index: 3,
    fileName: 'kalika-game.ts',
    titleKey: 'matrix.studies.jogo.sources.composed-game.title',
    descriptionKey: 'matrix.studies.jogo.sources.composed-game.description',
    text: "/**\n * Composição: o jogo TEM regras. Não precisa HERDAR de uma regra.\n * Polimorfismo: chama evaluate sem conhecer a classe concreta de cada regra.\n * Open/Closed: outra política compatível pode ser fornecida sem editar este laço.\n * Com r regras e listas de até d gestos vencidos, a inspeção de dominância custa\n * O(r·d) no modelo geral. Este jogo limita os gestos a cinco, não é um benchmark.\n */\nexport class RuleGame {\n  private readonly moves: readonly Move[];\n  private readonly rules: readonly RoundRule[];\n\n  constructor(moves: readonly Move[], rules: readonly RoundRule[]) {\n    this.moves = [...moves];\n    this.rules = [...rules];\n  }\n\n  steps(player: string, opponent: string, variant: GameVariant): readonly StudyStep<GameState>[] {\n    let state: GameState = {\n      player,\n      opponent,\n      variant,\n      result: null,\n      inspectedRule: null,\n      inspectedRules: [],\n    };\n    const steps = [gameStep(state, 'initial')];\n    if (!isMove(player, this.moves) || !isMove(opponent, this.moves)) {\n      return [...steps, gameStep({ ...state, result: 'invalid' }, 'invalid')];\n    }\n    steps.push(gameStep(state, 'validated'));\n    for (const rule of this.rules) {\n      const result = rule.evaluate(player, opponent);\n      state = {\n        ...state,\n        inspectedRule: rule.id,\n        inspectedRules: [...state.inspectedRules, rule.id],\n        result,\n      };\n      steps.push(gameStep(state, result === null ? 'continue' : 'decided', { rule: rule.id }));\n      if (result !== null) {\n        return steps;\n      }\n    }\n    // Configuração incompleta também é rejeitada: não tratamos ausência de regra como derrota.\n    return [...steps, gameStep({ ...state, result: 'invalid' }, 'unhandled')];\n  }\n}",
  },
];
