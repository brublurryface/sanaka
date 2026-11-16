import { TestBed } from '@angular/core/testing';

import { WordPressTextService } from './wordpress-text.service';

describe('WordPressTextService', () => {
  let service: WordPressTextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WordPressTextService);
  });

  it.each([
    ['', ''],
    ['  Saṃvit\n\tŚabala  ', 'Saṃvit Śabala'],
    ['<p>Vāsuki &amp; Maṇināga&nbsp;&#8230;</p>', 'Vāsuki & Maṇināga …'],
    ['<p>Primeiro.</p><p>Segundo.</p>', 'Primeiro. Segundo.'],
    [
      '<h2>Título</h2><blockquote>Trecho.</blockquote><ul><li>Um</li><li>Dois</li></ul>',
      'Título Trecho. Um Dois',
    ],
    [
      '<p>Texto <strong>preservado</strong>.</p><a class="more-link">Continue lendo</a>',
      'Texto preservado.',
    ],
    ['<style>p { color: red; }</style><p>Visível.</p><script>unsafe()</script>', 'Visível.'],
    ['<p>Primeiro <strong>trecho', 'Primeiro trecho'],
    ['<template><p>Oculto.</p></template><p>Visível.</p>', 'Visível.'],
    ['<p>&lt;img src=x onerror=unsafe()&gt;</p>', '<img src=x onerror=unsafe()>'],
  ])('extracts editorial text without changing its meaning (%s)', (html, expected) => {
    expect(service.toText(html)).toBe(expected);
  });

  it('does not retain content between conversions', () => {
    expect(service.toText('<p>Primeiro.</p>')).toBe('Primeiro.');
    expect(service.toText('<p>Segundo.</p>')).toBe('Segundo.');
  });
});
