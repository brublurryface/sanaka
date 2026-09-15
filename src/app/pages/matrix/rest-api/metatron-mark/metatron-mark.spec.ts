import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MetatronMark } from './metatron-mark';

describe('MetatronMark', () => {
  let fixture: ComponentFixture<MetatronMark>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MetatronMark] }).compileComponents();

    fixture = TestBed.createComponent(MetatronMark);
    fixture.detectChanges();
  });

  it('should connect thirteen vertices with straight segments and no circles', () => {
    expect(fixture.nativeElement.querySelectorAll('line')).toHaveLength(78);
    expect(fixture.nativeElement.querySelectorAll('circle, ellipse')).toHaveLength(0);
    expect(fixture.componentInstance.segments.every(({ start, end }) => start !== end)).toBe(true);
  });

  it('should remain decorative for assistive technologies', () => {
    const svg: SVGElement = fixture.nativeElement.querySelector('svg');

    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
  });
});
