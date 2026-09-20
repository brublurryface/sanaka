export interface NasaImagePreset {
  readonly query: string;
  readonly translationKey: string;
  readonly nasaId?: string;
}

// Dois exemplos apontam para registros documentados, evitando um resultado arbitrário da busca.
// URLs e metadados das imagens continuam vindo da resposta real da API.
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
