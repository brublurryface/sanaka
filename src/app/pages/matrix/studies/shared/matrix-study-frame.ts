/**
 * Estrutura editorial real comum aos laboratórios: Header, história, três níveis
 * de explicação, experimento projetado, código, cenários e investigação.
 * A lógica de cada laboratório continua em sua funcionalidade.
 */
// Component registra o template. input/output definem a conversa com o componente pai.
import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { CodeExplorerController } from '../../code-explorer.controller';
import { MATRIX_EXPERIMENTS } from '../../matrix-experiments';
import { StudyCheck } from './study-checks';
import { MatrixStudyDefinition, StudySource } from './matrix-study-definition';
import { MATRIX_STUDY_SOURCE_REF, studyFiles, studySourceUrl } from './matrix-study-files';

@Component({
  selector: 'app-matrix-study-frame',
  host: { class: 'matrix-study-host' },
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './matrix-study-frame.html',
})
export class MatrixStudyFrame extends CodeExplorerController<StudySource> {
  readonly study = input.required<MatrixStudyDefinition>();
  readonly sources = input.required<readonly StudySource[]>();
  readonly checks = input<readonly StudyCheck[]>([]);
  // output<void> anuncia um pedido de execução sem transportar um valor adicional.
  readonly runChecks = output<void>();

  // O prefixo é derivado da entrada: trocar o estudo troca suas traduções, não o CSS.
  readonly translationKey = computed(() => `matrix.studies.${this.study().id}`);
  readonly number = computed(
    () => MATRIX_EXPERIMENTS.find((item) => item.id === this.study().id)!.number,
  );
  readonly studyLinks = MATRIX_EXPERIMENTS.filter((item) => item.status === 'available');
  readonly files = computed(() =>
    studyFiles(this.study().id).map((file) => ({
      ...file,
      url: studySourceUrl(file.path, MATRIX_STUDY_SOURCE_REF),
    })),
  );

  // Reutiliza previous/next/showSlide do explorador existente da Matrix.
  override get slides(): readonly StudySource[] {
    return this.sources();
  }
}
