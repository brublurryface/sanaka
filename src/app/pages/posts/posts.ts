import { Component } from '@angular/core';

import { Post } from './post';
import { PostCard } from './post-card/post-card';

@Component({
  imports: [PostCard],
  selector: 'app-posts',
  styleUrl: './posts.scss',
  templateUrl: './posts.html',
})
export class Posts {
  readonly posts: readonly Post[] = [
    {
      id: 1,
      slug: 'a-descida-de-narasimha',
      title: 'A descida de Narasiṃha',
      excerpt:
        'Uma leitura das fontes que narram a manifestação de Narasiṃha e o confronto com Hiraṇyakaśipu.',
      publishedAt: '2026-08-28',
      category: 'Escrituras',
    },
    {
      id: 2,
      slug: 'maya-entre-forma-e-percepcao',
      title: 'Māyā entre forma e percepção',
      excerpt:
        'Notas sobre Māyā, aparência, conhecimento e os modos pelos quais a realidade é percebida.',
      publishedAt: '2026-08-24',
      category: 'Estudos',
    },
    {
      id: 3,
      slug: 'o-silencio-do-santuario',
      title: 'O silêncio do santuário',
      excerpt:
        'Uma investigação sobre silêncio, espaço e presença como princípios da identidade do Sanaka.',
      publishedAt: '2026-08-20',
      category: 'Reflexões',
    },
  ];
}
