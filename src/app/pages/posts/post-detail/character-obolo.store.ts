import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CharacterOboloService } from '../data-access/character-obolo.service';

export type OboloInteractionStatus =
  'loading' | 'ready' | 'submitting' | 'success' | 'load-error' | 'offer-error';

export interface OboloViewState {
  readonly status: OboloInteractionStatus;
  readonly total: number | null;
}

/** Mantém uma única oferta por visualização, compartilhada pelas apresentações desktop e mobile. */
@Injectable()
export class CharacterOboloStore {
  private readonly service = inject(CharacterOboloService);
  private readonly destroyRef = inject(DestroyRef);
  private activeCharacterSlug = '';

  readonly state = signal<OboloViewState>({ status: 'loading', total: null });

  /** Troca o contador ativo quando a rota passa a exibir outra personagem. */
  setCharacter(characterSlug: string | undefined): void {
    if (!characterSlug) {
      this.activeCharacterSlug = '';
      this.state.set({ status: 'loading', total: null });
      return;
    }

    if (characterSlug === this.activeCharacterSlug) {
      return;
    }

    this.activeCharacterSlug = characterSlug;
    this.load();
  }

  retry(): void {
    if (this.activeCharacterSlug) {
      this.load();
    }
  }

  /** Ignora cliques repetidos depois do sucesso e durante uma requisição em andamento. */
  offer(): void {
    const currentState = this.state();
    const requestedSlug = this.activeCharacterSlug;

    if (
      !requestedSlug ||
      currentState.total === null ||
      !['ready', 'offer-error'].includes(currentState.status)
    ) {
      return;
    }

    this.state.set({ status: 'submitting', total: currentState.total });
    this.service
      .offer(requestedSlug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (total) => {
          if (this.activeCharacterSlug === requestedSlug) {
            this.state.set({ status: 'success', total });
          }
        },
        error: () => {
          if (this.activeCharacterSlug === requestedSlug) {
            this.state.set({ status: 'offer-error', total: currentState.total });
          }
        },
      });
  }

  private load(): void {
    const requestedSlug = this.activeCharacterSlug;

    this.state.set({ status: 'loading', total: null });
    this.service
      .getTotal(requestedSlug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (total) => {
          if (this.activeCharacterSlug === requestedSlug) {
            this.state.set({ status: 'ready', total });
          }
        },
        error: () => {
          if (this.activeCharacterSlug === requestedSlug) {
            this.state.set({ status: 'load-error', total: null });
          }
        },
      });
  }
}
