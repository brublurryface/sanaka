/** Volume do Sanakaverse já normalizado para a apresentação. */
export interface SanakaverseBook {
  readonly id: number;
  readonly slug: string;
  readonly title: string;
  readonly coverImageUrl?: string;
  readonly coverImageAlt?: string;
}
