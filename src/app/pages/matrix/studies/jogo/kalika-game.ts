/**
 * Motor determinístico do jogo: função simples e composição de regras reais.
 * Não usa sorteio. Assim, a mesma entrada produz a mesma história e pode ser testada.
 * Classes aparecem porque queremos trocar políticas; não porque funções sejam inferiores.
 */
// StudyStep relaciona um snapshot imutável à explicação que o visualizador traduz.
import { StudyStep } from '../shared/study-history';

// Uma união de literais aceita somente estes nomes no código tipado.
export type Move = 'rock' | 'paper' | 'scissors' | 'lizard' | 'spock';
export type RoundOutcome = 'tie' | 'win' | 'lose';
export type GameVariant = 'conditions' | 'rulesClassic' | 'rulesExtended';
export const CLASSIC_MOVES: readonly Move[] = ['rock', 'paper', 'scissors'];
export const EXTENDED_MOVES: readonly Move[] = [...CLASSIC_MOVES, 'lizard', 'spock'];

export interface GameState {
  readonly player: string;
  readonly opponent: string;
  readonly variant: GameVariant;
  // null significa que a avaliação ainda não acabou; invalid é uma entrada rejeitada.
  readonly result: RoundOutcome | 'invalid' | null;
  readonly inspectedRule: string | null;
  readonly inspectedRules: readonly string[];
}

/** includes verifica pertinência; não converte uma palavra desconhecida numa jogada. */
function isMove(value: string, allowed: readonly Move[]): value is Move {
  return allowed.some((move) => move === value);
}

// @study-start classic-function
/** Função pura suficiente para três jogadas fixas. Não modifica suas entradas. */
export function playClassic(player: string, opponent: string): RoundOutcome | 'invalid' {
  if (!isMove(player, CLASSIC_MOVES) || !isMove(opponent, CLASSIC_MOVES)) {
    return 'invalid';
  }
  if (player === opponent) {
    return 'tie';
  }
  // && exige as duas condições; || aceita qualquer uma das três vitórias possíveis.
  const wins =
    (player === 'rock' && opponent === 'scissors') ||
    (player === 'paper' && opponent === 'rock') ||
    (player === 'scissors' && opponent === 'paper');
  // ?: escolhe um retorno. Uma vez removidos empates, não vencer significa perder.
  return wins ? 'win' : 'lose';
}
// @study-end classic-function

// @study-start rule-contract
/**
 * Interface é um contrato de compilação, não um objeto criado em tempo de execução.
 * null significa "esta regra não decidiu"; outra regra poderá avaliar a rodada.
 */
export interface RoundRule {
  readonly id: string;
  evaluate(player: Move, opponent: Move): RoundOutcome | null;
}

export class TieRule implements RoundRule {
  readonly id = 'tie';
  evaluate(player: Move, opponent: Move): RoundOutcome | null {
    return player === opponent ? 'tie' : null;
  }
}
// @study-end rule-contract

// @study-start dominance-rule
/**
 * A regra recebe dados de domínio; encapsula a maneira de consultar esses dados.
 * private readonly não permite que consumidores troquem o mapa pelo campo da classe.
 * private é uma restrição TypeScript, não a privacidade em runtime de um campo #.
 */
export class DominanceRule implements RoundRule {
  readonly id = 'dominance';
  private readonly beats: ReadonlyMap<Move, readonly Move[]>;

  constructor(pairs: readonly (readonly [Move, readonly Move[]])[]) {
    // Copiamos os arrays: alterar a configuração externa não muda a partida existente.
    this.beats = new Map(pairs.map(([move, defeated]) => [move, [...defeated]]));
  }

  evaluate(player: Move, opponent: Move): RoundOutcome | null {
    // ?. interrompe o acesso se get retornar undefined; não inventa uma vitória.
    if (this.beats.get(player)?.includes(opponent)) {
      return 'win';
    }
    if (this.beats.get(opponent)?.includes(player)) {
      return 'lose';
    }
    return null;
  }
}
// @study-end dominance-rule

// @study-start composed-game
/**
 * Composição: o jogo TEM regras. Não precisa HERDAR de uma regra.
 * Polimorfismo: chama evaluate sem conhecer a classe concreta de cada regra.
 * Open/Closed: outra política compatível pode ser fornecida sem editar este laço.
 * Com r regras e listas de até d gestos vencidos, a inspeção de dominância custa
 * O(r·d) no modelo geral. Este jogo limita os gestos a cinco, não é um benchmark.
 */
export class RuleGame {
  private readonly moves: readonly Move[];
  private readonly rules: readonly RoundRule[];

  constructor(moves: readonly Move[], rules: readonly RoundRule[]) {
    this.moves = [...moves];
    this.rules = [...rules];
  }

  steps(player: string, opponent: string, variant: GameVariant): readonly StudyStep<GameState>[] {
    let state: GameState = {
      player,
      opponent,
      variant,
      result: null,
      inspectedRule: null,
      inspectedRules: [],
    };
    const steps = [gameStep(state, 'initial')];
    if (!isMove(player, this.moves) || !isMove(opponent, this.moves)) {
      return [...steps, gameStep({ ...state, result: 'invalid' }, 'invalid')];
    }
    steps.push(gameStep(state, 'validated'));
    for (const rule of this.rules) {
      const result = rule.evaluate(player, opponent);
      state = {
        ...state,
        inspectedRule: rule.id,
        inspectedRules: [...state.inspectedRules, rule.id],
        result,
      };
      steps.push(gameStep(state, result === null ? 'continue' : 'decided', { rule: rule.id }));
      if (result !== null) {
        return steps;
      }
    }
    // Configuração incompleta também é rejeitada: não tratamos ausência de regra como derrota.
    return [...steps, gameStep({ ...state, result: 'invalid' }, 'unhandled')];
  }
}
// @study-end composed-game

/** Matriz clássica e extensão explícita: pares formam um grafo dirigido de vitórias. */
export function createRuleGame(extended: boolean): RuleGame {
  const pairs: readonly (readonly [Move, readonly Move[]])[] = extended
    ? [
        ['rock', ['scissors', 'lizard']],
        ['paper', ['rock', 'spock']],
        ['scissors', ['paper', 'lizard']],
        ['lizard', ['paper', 'spock']],
        ['spock', ['rock', 'scissors']],
      ]
    : [
        ['rock', ['scissors']],
        ['paper', ['rock']],
        ['scissors', ['paper']],
      ];
  return new RuleGame(extended ? EXTENDED_MOVES : CLASSIC_MOVES, [
    new TieRule(),
    new DominanceRule(pairs),
  ]);
}

/** Helper só monta a explicação. Quem decide o resultado são as funções/regras acima. */
function gameStep(
  state: GameState,
  event: string,
  parameters: Record<string, string | number> = {},
): StudyStep<GameState> {
  return { state, explanationKey: `matrix.studies.jogo.events.${event}`, parameters };
}

/** O caminho exibido usa o mesmo retorno da função executada, não uma cópia no template. */
export function playGameSteps(
  player: string,
  opponent: string,
  variant: GameVariant,
): readonly StudyStep<GameState>[] {
  if (variant !== 'conditions') {
    return createRuleGame(variant === 'rulesExtended').steps(player, opponent, variant);
  }
  const state: GameState = {
    player,
    opponent,
    variant,
    result: null,
    inspectedRule: null,
    inspectedRules: [],
  };
  const result = playClassic(player, opponent);
  return [
    gameStep(state, 'initial'),
    gameStep(
      { ...state, result, inspectedRule: 'conditions', inspectedRules: ['conditions'] },
      result === 'invalid' ? 'invalid' : 'conditions',
    ),
  ];
}
