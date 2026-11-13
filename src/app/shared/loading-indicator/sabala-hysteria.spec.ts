import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

const directory = join(process.cwd(), 'public/loadings/sabala/hysteria');
const source = readFileSync(join(directory, 'hysteria.js'), 'utf8');
const markup = readFileSync(join(directory, 'index.html'), 'utf8');
const styles = readFileSync(join(directory, 'hysteria.css'), 'utf8');

function prototype(reducedMotion = false) {
  const document = new DOMParser().parseFromString(markup, 'text/html');
  const strokes: string[] = [];
  const points: number[] = [];
  const context = {
    strokeStyle: '',
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: (_x: number, y: number) => points.push(y),
    lineTo: vi.fn(),
    stroke: () => strokes.push(context.strokeStyle),
  };
  const canvas = document.querySelector('canvas');
  if (!canvas) throw new Error('Missing spectrum canvas.');
  canvas.getContext = vi.fn().mockReturnValue(context);
  let nextFrame: ((now: number) => void) | undefined;
  const requestFrame = vi.fn((callback: (now: number) => void) => {
    nextFrame = callback;
    return 1;
  });
  runInNewContext(source, {
    document,
    performance: { now: () => 0 },
    window: { matchMedia: () => ({ matches: reducedMotion }) },
    requestAnimationFrame: requestFrame,
  });

  return {
    document,
    context,
    strokes,
    points,
    requestFrame,
    render(now: number) {
      strokes.length = 0;
      points.length = 0;
      nextFrame?.(now);
    },
  };
}

describe('Recovered Śabala Hysteria prototype', () => {
  it('should retain the two ornaments, nine notes and the complete word behind Śabala', () => {
    const { document } = prototype();

    expect(document.querySelectorAll('.line')).toHaveLength(2);
    expect(document.querySelectorAll('.note')).toHaveLength(9);
    expect(document.querySelector('.word')?.textContent).toBe('LOADING...');
    expect(document.querySelector('.word + .note')).not.toBeNull();
    expect(document.querySelector('.sabala.animated')?.getAttribute('src')).toBe(
      '../animated.webp',
    );
    expect(document.querySelector('.sabala.still')?.getAttribute('src')).toBe('../poster.png');
    expect(document.querySelector('audio, video')).toBeNull();
    expect(document.querySelector('[src$=".gif"]')).toBeNull();
  });

  it('should draw nine separately colored frequency bands and animate notes and letters', () => {
    const animation = prototype();
    animation.render(500);
    const firstPoints = [...animation.points];
    const note = animation.document.querySelector<HTMLElement>('.note');
    const letter = animation.document.querySelector<HTMLElement>('.letter');
    const firstNote = note?.style.transform;

    expect(animation.strokes).toHaveLength(9);
    expect(new Set(animation.strokes).size).toBe(9);
    expect(animation.context.beginPath).toHaveBeenCalledTimes(9);
    expect(note?.style.animation).toBe('none');
    expect(firstNote).toContain('scale(');
    expect(letter?.style.transform).toContain('translateY(');

    animation.render(2200);
    expect(animation.points).not.toEqual(firstPoints);
    expect(note?.style.transform).not.toBe(firstNote);
    expect(animation.requestFrame).toHaveBeenCalledTimes(3);
  });

  it('should repeat the original twelve-second frequency timeline', () => {
    const animation = prototype();
    animation.render(1000);
    const points = [...animation.points];
    const note = animation.document.querySelector<HTMLElement>('.note');
    const transform = note?.style.transform;

    animation.render(13_000);
    expect(animation.points).toEqual(points);
    expect(note?.style.transform).toBe(transform);
  });

  it('should start the spectrum even when the first frame timestamp precedes script initialization', () => {
    const animation = prototype();

    expect(() => animation.render(-1)).not.toThrow();
    expect(animation.strokes).toHaveLength(9);
    expect(animation.points.every(Number.isFinite)).toBe(true);
  });

  it('should clear the spectrum and keep notes, letters and the character static for reduced motion', () => {
    const animation = prototype(true);
    animation.render(2200);

    expect(animation.strokes).toHaveLength(0);
    expect(animation.context.clearRect).toHaveBeenCalled();
    expect(animation.document.querySelector<HTMLElement>('.note')?.style.transform).toBe('');
    expect(animation.document.querySelector<HTMLElement>('.letter')?.style.transform).toBe('');
    expect(styles).toContain('@media(prefers-reduced-motion:reduce)');
    expect(styles).toContain('.sabala.animated{display:none}');
    expect(styles).toContain('.sabala.still{display:block}');
  });
});
