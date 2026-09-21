import { Component } from '@angular/core';

interface Vertex {
  readonly x: number;
  readonly y: number;
}

interface Segment {
  readonly start: Vertex;
  readonly end: Vertex;
}

function hexagonVertices(radius: number): readonly Vertex[] {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (index * Math.PI) / 3;

    return {
      x: Number((Math.sin(angle) * radius).toFixed(3)),
      y: Number((-Math.cos(angle) * radius).toFixed(3)),
    };
  });
}

// Conecta os treze centros da geometria de Metatron sem desenhar os círculos.
// As coordenadas são criadas uma vez, durante a importação deste módulo lazy-loaded.
const vertices: readonly Vertex[] = [
  { x: 0, y: 0 },
  ...hexagonVertices(50),
  ...hexagonVertices(100),
];

const segments: readonly Segment[] = vertices.flatMap((start, index) =>
  vertices.slice(index + 1).map((end) => ({ start, end })),
);

@Component({
  selector: 'app-metatron-mark',
  templateUrl: './metatron-mark.html',
  styleUrl: './metatron-mark.scss',
})
export class MetatronMark {
  readonly segments = segments;
}
