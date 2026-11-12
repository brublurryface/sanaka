import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PageLoadingState } from '../../core/navigation/page-loading-state';
import { PageLoading } from './page-loading';

describe('PageLoading', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('should release the page on teardown and replace its request when the variant changes', () => {
    const fixture = TestBed.createComponent(PageLoading);
    fixture.componentRef.setInput('variant', 'vasuki');
    fixture.componentRef.setInput('labelKey', 'posts.loading');
    fixture.detectChanges();
    const state = TestBed.inject(PageLoadingState);
    expect(state.current()).toEqual({ variant: 'vasuki', labelKey: 'posts.loading' });

    fixture.componentRef.setInput('variant', 'maninaga');
    fixture.componentRef.setInput('labelKey', 'posts.detail.loading');
    fixture.detectChanges();
    expect(state.current()).toEqual({ variant: 'maninaga', labelKey: 'posts.detail.loading' });

    fixture.destroy();
    expect(state.current()).toBeNull();
  });
});
