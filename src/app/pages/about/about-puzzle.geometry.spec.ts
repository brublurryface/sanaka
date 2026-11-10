import { describe, expect, it } from 'vitest';

import {
  ABOUT_PUZZLE_MOBILE_OVERLAP,
  ABOUT_PUZZLE_MOBILE_PIECE_PATHS,
  ABOUT_PUZZLE_MOBILE_VIEW_BOXES,
  ABOUT_PUZZLE_PIECE_PATHS,
} from './about-puzzle.geometry';

type Point = readonly [number, number];

// Read the actual SVG commands so the assertions compare the drawn boundaries.
function curves(path: string): Point[][] {
  const tokens = path.match(/[MHVCZ]|-?\d+(?:\.\d+)?/g) ?? [];
  const result: Point[][] = [];
  let cursor: Point = [0, 0];
  let index = 0;
  const number = () => Number(tokens[index++]);

  while (index < tokens.length) {
    switch (tokens[index++]) {
      case 'M':
        cursor = [number(), number()];
        break;
      case 'H':
        cursor = [number(), cursor[1]];
        break;
      case 'V':
        cursor = [cursor[0], number()];
        break;
      case 'C': {
        const first: Point = [number(), number()];
        const second: Point = [number(), number()];
        const end: Point = [number(), number()];
        result.push([cursor, first, second, end]);
        cursor = end;
        break;
      }
      case 'Z':
        break;
      default:
        throw new Error('Unsupported puzzle path command');
    }
  }

  expect(result).toHaveLength(4);
  return result;
}

function expectSameCurve(first: readonly Point[], second: readonly Point[]): void {
  first.forEach((point, index) => {
    expect(point[0]).toBeCloseTo(second[index][0], 8);
    expect(point[1]).toBeCloseTo(second[index][1], 8);
  });
}

describe('About puzzle geometry', () => {
  it.each([270, 320, 368])('joins every mobile edge at a %ipx piece size', (pieceSize) => {
    const step = pieceSize * (1 + ABOUT_PUZZLE_MOBILE_OVERLAP);
    const edges = ABOUT_PUZZLE_MOBILE_PIECE_PATHS.map((path, index) => {
      const [x, y, width] = ABOUT_PUZZLE_MOBILE_VIEW_BOXES[index].split(' ').map(Number);
      const scale = pieceSize / width;
      return curves(path).map((curve) =>
        curve.map(([px, py]): Point => [index * step + (px - x) * scale, (py - y) * scale]),
      );
    });

    for (let index = 1; index < edges.length; index++) {
      expectSameCurve(edges[index - 1][1], [...edges[index][3]].reverse());
    }
  });

  it('keeps all twelve internal joins continuous on the desktop board', () => {
    const edges = ABOUT_PUZZLE_PIECE_PATHS.map(curves);

    for (let index = 0; index < edges.length; index++) {
      if (index % 3 < 2) {
        expectSameCurve(edges[index][1], [...edges[index + 1][3]].reverse());
      }
      if (index < 6) {
        expectSameCurve(edges[index][2], [...edges[index + 3][0]].reverse());
      }
    }
  });
});
