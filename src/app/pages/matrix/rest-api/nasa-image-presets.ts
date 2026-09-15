export interface NasaImagePreset {
  readonly query: string;
  readonly translationKey: string;
  readonly nasaId?: string;
}

// Two examples target documented NASA records rather than an arbitrary search hit.
// Image URLs and metadata still come from the live API response.
export const NASA_IMAGE_PRESETS: readonly NasaImagePreset[] = [
  { query: 'Orion nebula', translationKey: 'matrix.rest.controls.presets.nebula' },
  {
    query: 'Global Color Views of Mars',
    translationKey: 'matrix.rest.controls.presets.mars',
    nasaId: 'PIA00407',
  },
  { query: 'earth blue marble', translationKey: 'matrix.rest.controls.presets.earth' },
  {
    query: 'Black Holes: Monsters in Space',
    translationKey: 'matrix.rest.controls.presets.blackHole',
    nasaId: 'PIA16695',
  },
];
