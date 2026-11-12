export type LoadingVariant = 'vasuki' | 'maninaga' | 'sabala' | 'samvit';

interface LoadingArtwork {
  readonly animated: string;
  readonly poster: string;
  readonly width: number;
  readonly height: number;
  readonly kind: 'snake' | 'music' | 'footprints';
}

export const LOADING_ARTWORK: Readonly<Record<LoadingVariant, LoadingArtwork>> = {
  vasuki: {
    animated: '/loadings/vasuki/animated.apng',
    poster: '/loadings/vasuki/poster.png',
    width: 734,
    height: 188,
    kind: 'snake',
  },
  maninaga: {
    animated: '/loadings/maninaga/animated.webp',
    poster: '/loadings/maninaga/poster.png',
    width: 734,
    height: 188,
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
