export type LoadingVariant = 'vasuki' | 'maninaga' | 'sabala' | 'samvit' | 'nandini';

interface LoadingArtwork {
  readonly animated: string;
  readonly poster: string;
  readonly width: number;
  readonly height: number;
  readonly posterSize?: { readonly width: number; readonly height: number };
  readonly posterFirst?: boolean;
  readonly kind: 'snake' | 'music' | 'footprints' | 'dream';
}

export const LOADING_ARTWORK: Readonly<Record<LoadingVariant, LoadingArtwork>> = {
  nandini: {
    animated: '/loadings/nandini/animated.webp',
    poster: '/loadings/nandini/poster.png',
    width: 1600,
    height: 900,
    kind: 'dream',
    posterFirst: true,
  },
  vasuki: {
    animated: '/loadings/vasuki/animated.apng',
    poster: '/loadings/vasuki/poster.png',
    width: 734,
    height: 188,
    kind: 'snake',
  },
  maninaga: {
    animated: '/loadings/maninaga/animated.apng',
    poster: '/loadings/maninaga/poster.png',
    width: 734,
    height: 188,
    posterSize: { width: 730, height: 243 },
    kind: 'snake',
  },
  sabala: {
    animated: '/loadings/sabala/animated.webp',
    poster: '/loadings/sabala/poster.png',
    width: 460,
    height: 460,
    kind: 'music',
  },
  samvit: {
    animated: '/loadings/samvit/animated.webp',
    poster: '/loadings/samvit/poster.png',
    width: 1500,
    height: 760,
    kind: 'footprints',
  },
};
