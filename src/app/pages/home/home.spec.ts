import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { beforeEach, describe, expect, it } from 'vitest';
import { TranslationFixture } from '../../../../testing/translation-fixture';
import { routes } from '../../app.routes';
import { Home } from './home';

describe('Home', () => {
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter(routes),
        provideTransloco({
          config: {
            availableLangs: ['pt-BR', 'en'],
            defaultLang: 'pt-BR',
            fallbackLang: 'pt-BR',
            reRenderOnLangChange: true,
            prodMode: true,
          },
          loader: TranslationFixture,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the sanctuary hero', () => {
    expect(fixture.nativeElement.querySelector('app-sanctuary-hero')).toBeTruthy();
  });

  it('should render the sanctuary paths', () => {
    expect(fixture.nativeElement.querySelector('app-sanctuary-paths')).toBeTruthy();
  });
});
