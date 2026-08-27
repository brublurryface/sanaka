import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { SanctuaryPaths } from './sanctuary-paths';

describe('SanctuaryPaths', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SanctuaryPaths],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should be created', () => {
    expect(TestBed.createComponent(SanctuaryPaths).componentInstance).toBeTruthy();
  });

  it('should render the sanctuary paths section', () => {
    const fixture = TestBed.createComponent(SanctuaryPaths);
    fixture.detectChanges();
    const section = fixture.nativeElement.querySelector('section#sanctuary-paths');

    expect(section).toBeTruthy();
    expect(section.getAttribute('aria-labelledby')).toBe('paths-title');
  });

  it('should contain the posts and Maya links', () => {
    const fixture = TestBed.createComponent(SanctuaryPaths);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const links = Array.from(element.querySelectorAll('a'));

    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/posts', '/maya']);
  });
});
