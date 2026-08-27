import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    expect(app).toBeTruthy();
  });

  it('should render the Sanaka brand', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    const brand = compiled.querySelector<HTMLAnchorElement>('.brand');

    expect(brand).toBeTruthy();
    expect(brand?.getAttribute('aria-label')).toBe('Sanaka');
    expect(brand?.getAttribute('href')).toBe('/');
  });

  it('should render the main navigation links', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    const navigation = compiled.querySelector('nav[aria-label="Navegação principal"]');

    expect(navigation).toBeTruthy();

    const links = Array.from(navigation?.querySelectorAll<HTMLAnchorElement>('a') ?? []);

    expect(links.map((link) => link.textContent?.trim())).toEqual(['Início', 'Posts', 'Māyā']);

    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/', '/posts', '/maya']);
  });
});
