import { Component } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';

import { Post } from './post';
import { PostCard } from './post-card/post-card';

@Component({
  imports: [ReactiveFormsModule, PostCard],
  selector: 'app-posts',
  styleUrl: './posts.scss',
  templateUrl: './posts.html',
})
export class Posts {
  readonly posts: readonly Post[] = [
    {
      id: 1,
      slug: 'a-presenca-de-maya',
      title: 'A presença de Māyā',
      excerpt:
        'Notas sobre as formas pelas quais Māyā aparece nas escrituras, entre criação, percepção e manifestação.',
      publishedAt: '2026-08-28',
      category: 'Escrituras',
    },
    {
      id: 2,
      slug: 'sanaka-como-espaco-de-estudo',
      title: 'Sanaka como espaço de estudo',
      excerpt:
        'Reflexões sobre a construção de um espaço digital dedicado a textos, estudos e experimentação.',
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

  readonly searchControl = new FormControl('', {
    nonNullable: true,
  });

  readonly filteredPosts = toSignal(
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      map((term) => this.normalizeSearchValue(term)),
      distinctUntilChanged(),
      map((term) => this.filterPosts(term)),
    ),
    {
      initialValue: this.posts,
    },
  );

  private filterPosts(term: string): readonly Post[] {
    if (!term) {
      return this.posts;
    }

    return this.posts.filter((post) =>
      [post.title, post.excerpt, post.category].some((value) =>
        this.normalizeSearchValue(value).includes(term),
      ),
    );
  }

  private normalizeSearchValue(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLocaleLowerCase('pt-BR');
  }
}
