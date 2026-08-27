import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { SanctuaryHero } from './sanctuary-hero';

describe('SanctuaryHero', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SanctuaryHero],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should be created', () => {
    expect(TestBed.createComponent(SanctuaryHero).componentInstance).toBeTruthy();
  });

  it('should render the sanctuary title', () => {
    const fixture = TestBed.createComponent(SanctuaryHero);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#sanctuary-title')).toBeTruthy();
  });

  it('should contain the destination links', () => {
    const fixture = TestBed.createComponent(SanctuaryHero);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const links = Array.from(element.querySelectorAll('a'));

    expect(links.map((link) => link.getAttribute('href'))).toContain('/maya');
    expect(links.map((link) => link.getAttribute('href'))).toContain('/posts');
  });

  it('should contain the scroll link and Maya image alt text', () => {
    const fixture = TestBed.createComponent(SanctuaryHero);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('a[href="#sanctuary-paths"]')).toBeTruthy();
    expect(element.querySelector('img')?.getAttribute('alt')).toBe('Māyā');
  });
});
