const COLUMNS = 3;
const PIECE_SIZE = 100;
const TAB_START = 40;
const TAB_END = PIECE_SIZE - TAB_START;
const TAB_DEPTH = 12;
const MOBILE_PADDING = 18;
const MOBILE_VIEW_SIZE = PIECE_SIZE + MOBILE_PADDING * 2;

function rightBend(index: number): number {
  return index % 2 === 0 ? TAB_DEPTH : -TAB_DEPTH;
}

function piecePath(index: number, leftBend: number): string {
  const column = index % COLUMNS;
  const x = column * PIECE_SIZE;
  const y = Math.floor(index / COLUMNS) * PIECE_SIZE;
  const horizontalBend = column % 2 === 0 ? -TAB_DEPTH : TAB_DEPTH;
  const right = rightBend(index);

  return [
    `M ${x} ${y} H ${x + TAB_START}`,
    `C ${x + TAB_START} ${y + horizontalBend} ${x + TAB_END} ${y + horizontalBend} ${x + TAB_END} ${y} H ${x + PIECE_SIZE}`,
    `V ${y + TAB_START} C ${x + PIECE_SIZE + right} ${y + TAB_START} ${x + PIECE_SIZE + right} ${y + TAB_END} ${x + PIECE_SIZE} ${y + TAB_END} V ${y + PIECE_SIZE}`,
    `H ${x + TAB_END} C ${x + TAB_END} ${y + PIECE_SIZE + horizontalBend} ${x + TAB_START} ${y + PIECE_SIZE + horizontalBend} ${x + TAB_START} ${y + PIECE_SIZE} H ${x}`,
    `V ${y + TAB_END} C ${x + leftBend} ${y + TAB_END} ${x + leftBend} ${y + TAB_START} ${x} ${y + TAB_START} V ${y} Z`,
  ].join(' ');
}

export const ABOUT_PUZZLE_PIECE_PATHS = Array.from({ length: COLUMNS ** 2 }, (_, index) => {
  const left =
    index % COLUMNS === 0 ? (index === 0 ? TAB_DEPTH : -TAB_DEPTH) : rightBend(index - 1);
  return piecePath(index, left);
});

// A single mobile row joins the end of one desktop row to the start of the next.
export const ABOUT_PUZZLE_MOBILE_PIECE_PATHS = ABOUT_PUZZLE_PIECE_PATHS.map((_, index) =>
  piecePath(index, index === 0 ? TAB_DEPTH : rightBend(index - 1)),
);

export const ABOUT_PUZZLE_MOBILE_VIEW_BOXES = ABOUT_PUZZLE_PIECE_PATHS.map((_, index) => {
  const x = (index % COLUMNS) * PIECE_SIZE - MOBILE_PADDING;
  const y = Math.floor(index / COLUMNS) * PIECE_SIZE - MOBILE_PADDING;
  return `${x} ${y} ${MOBILE_VIEW_SIZE} ${MOBILE_VIEW_SIZE}`;
});

// Overlap the viewBox padding; the visible 100-unit bodies then share an edge.
export const ABOUT_PUZZLE_MOBILE_OVERLAP = (PIECE_SIZE - MOBILE_VIEW_SIZE) / MOBILE_VIEW_SIZE;
