import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoLoader, TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { PortalImageViewModel } from '../rest-api.models';
import { ArcanePortal } from './arcane-portal';

class MockTranslocoLoader implements TranslocoLoader {
  getTranslation() {
    return of({
      matrix: {
        rest: {
          portal: {
            idle: { title: 'Portal at rest', text: 'No request yet.', action: 'Invoke image' },
            loading: { title: 'Crossing the network', text: 'Searching for {{ query }}.' },
            imageLoading: { title: 'Revealing image', text: 'The browser is loading the file.' },
            empty: { title: 'Nothing crossed', text: 'No image for {{ query }}.' },
            error: { title: 'Connection broken', text: 'Request failed.' },
            imageError: { title: 'Image unavailable', text: 'Metadata arrived.' },
            retry: 'Try again',
            newSearch: 'New search',
            success: {
              label: 'Mapped result',
              date: 'Date',
              credit: 'Credit',
              center: 'NASA center',
              openSource: 'View image at source',
            },
            announcement: {
              loading: 'Request started.',
              success: '{{ title }} arrived.',
              empty: 'No image found.',
              error: 'Request failed.',
            },
          },
          source: { prefix: 'Data and images:', name: 'NASA Image and Video Library' },
        },
      },
    });
  }
}

const image: PortalImageViewModel = {
  id: '42',
  title: 'Moon over the portal',
  credit: 'NASA / ESA',
  date: '2025-01-01',
  center: 'GSFC',
  imageUrl: 'https://images.example/image.jpg',
  imageAlt: 'A moonlit image',
  sourceUrl: 'https://images.example/image.jpg',
};

describe('ArcanePortal', () => {
  let fixture: ComponentFixture<ArcanePortal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArcanePortal],
      providers: [
        provideTransloco({
          config: {
            availableLangs: ['pt-BR', 'en'],
            defaultLang: 'pt-BR',
            fallbackLang: 'pt-BR',
            prodMode: true,
          },
          loader: MockTranslocoLoader,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArcanePortal);
  });

  it('should keep the idle portal action disabled until a search is possible', () => {
    const searchRequested = vi.fn();
    fixture.componentInstance.searchRequested.subscribe(searchRequested);

    fixture.componentRef.setInput('phase', 'idle');
    fixture.componentRef.setInput('canSearch', false);
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.portal-state button');
    expect(button.disabled).toBe(true);

    fixture.componentRef.setInput('canSearch', true);
    fixture.detectChanges();
    button.click();

    expect(searchRequested).toHaveBeenCalledOnce();
  });

  it('should render the mapped image and emit a request to reset the experiment', () => {
    const resetRequested = vi.fn();
    fixture.componentInstance.resetRequested.subscribe(resetRequested);

    fixture.componentRef.setInput('phase', 'success');
    fixture.componentRef.setInput('image', image);
    fixture.detectChanges();

    const element: HTMLImageElement = fixture.nativeElement.querySelector('.portal__image');
    expect(element.src).toBe(image.imageUrl);
    expect(element.alt).toBe(image.imageAlt);
    expect(fixture.nativeElement.querySelector('.image-caption').textContent).toContain(
      image.title,
    );

    fixture.nativeElement.querySelector('.image-caption button').click();
    expect(resetRequested).toHaveBeenCalledOnce();
  });

  it('should expose retry as an event when the connection fails', () => {
    const retryRequested = vi.fn();
    fixture.componentInstance.retryRequested.subscribe(retryRequested);

    fixture.componentRef.setInput('phase', 'error');
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.portal-state button').click();

    expect(retryRequested).toHaveBeenCalledOnce();
  });

  it('should display the record date in Brazilian order while preserving its ISO value', () => {
    const datedImage = { ...image, date: '2003-12-10' };
    fixture.componentRef.setInput('phase', 'success');
    fixture.componentRef.setInput('image', datedImage);
    fixture.detectChanges();

    const date: HTMLTimeElement = fixture.nativeElement.querySelector('.image-caption time');

    expect(date.textContent).toBe('10/12/2003');
    expect(date.getAttribute('datetime')).toBe('2003-12-10');
    expect(datedImage.date).toBe('2003-12-10');
  });

  it('should reformat the existing date when the interface switches to English', () => {
    fixture.componentRef.setInput('phase', 'success');
    fixture.componentRef.setInput('image', { ...image, date: '2003-12-10' });
    fixture.detectChanges();

    TestBed.inject(TranslocoService).setActiveLang('en');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.image-caption time').textContent).toBe(
      '12/10/2003',
    );
  });

  it('should recompute the formatted date when another image arrives', () => {
    fixture.componentRef.setInput('phase', 'success');
    fixture.componentRef.setInput('image', { ...image, date: '2003-12-10' });
    fixture.detectChanges();

    fixture.componentRef.setInput('image', { ...image, date: '2024-02-29' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.image-caption time').textContent).toBe(
      '29/02/2024',
    );
  });

  it.each([null, 'not-a-date', '2025-02-30'])(
    'should omit a missing or invalid date instead of displaying %s',
    (date) => {
      fixture.componentRef.setInput('phase', 'success');
      fixture.componentRef.setInput('image', { ...image, date });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.image-caption time')).toBeNull();
      expect(fixture.nativeElement.querySelector('.image-caption').textContent).toContain(
        image.title,
      );
    },
  );

  it('should keep Metatron visible until the browser confirms the image loaded', () => {
    const imageLoadSucceeded = vi.fn();
    fixture.componentInstance.imageLoadSucceeded.subscribe(imageLoadSucceeded);
    fixture.componentRef.setInput('phase', 'success');
    fixture.componentRef.setInput('image', image);
    fixture.detectChanges();

    const element: HTMLImageElement = fixture.nativeElement.querySelector('.portal__image');
    expect(element.classList.contains('portal__image--ready')).toBe(false);
    expect(fixture.nativeElement.querySelector('.portal-state app-metatron-mark')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.portal').getAttribute('aria-busy')).toBe('true');

    element.dispatchEvent(new Event('load'));
    expect(imageLoadSucceeded).toHaveBeenCalledOnce();
    fixture.componentRef.setInput('imageLoaded', true);
    fixture.detectChanges();

    expect(element.classList.contains('portal__image--ready')).toBe(true);
    expect(fixture.nativeElement.querySelector('.portal-state')).toBeNull();
    expect(fixture.nativeElement.querySelector('.portal').getAttribute('aria-busy')).toBe('false');
  });

  it('should render Metatron instead of the diamond when the image fails, preserving metadata', () => {
    const imageLoadFailed = vi.fn();
    fixture.componentInstance.imageLoadFailed.subscribe(imageLoadFailed);

    fixture.componentRef.setInput('phase', 'success');
    fixture.componentRef.setInput('image', image);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.portal__image').dispatchEvent(new Event('error'));
    expect(imageLoadFailed).toHaveBeenCalledOnce();

    fixture.componentRef.setInput('imageFailed', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.portal__image')).toBeNull();
    expect(fixture.nativeElement.querySelector('.portal-state app-metatron-mark')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.portal-state').textContent).not.toContain('◇');
    expect(fixture.nativeElement.querySelector('.image-caption').textContent).toContain(
      image.title,
    );
    expect(fixture.nativeElement.querySelector('[aria-live]').textContent).toContain(
      'Image unavailable',
    );
  });

  it('should use the same line-only mark for idle and loading states', () => {
    for (const phase of ['idle', 'loading']) {
      fixture.componentRef.setInput('phase', phase);
      fixture.detectChanges();

      const mark: HTMLElement = fixture.nativeElement.querySelector(
        '.portal-state app-metatron-mark',
      );
      expect(mark).not.toBeNull();
      expect(mark.querySelectorAll('line')).toHaveLength(78);
      expect(mark.querySelectorAll('circle')).toHaveLength(0);
    }
  });
});
