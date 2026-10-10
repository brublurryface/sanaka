import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { CharacterOboloService } from '../data-access/character-obolo.service';
import { CharacterOboloStore } from './character-obolo.store';

describe('CharacterOboloStore', () => {
  const service = {
    getTotal: vi.fn<(slug: string) => Observable<number>>(),
    offer: vi.fn<(slug: string) => Observable<number>>(),
  };

  let store: CharacterOboloStore;

  beforeEach(() => {
    service.getTotal.mockReset();
    service.offer.mockReset();
    service.getTotal.mockReturnValue(of(12));
    service.offer.mockReturnValue(of(13));

    TestBed.configureTestingModule({
      providers: [CharacterOboloStore, { provide: CharacterOboloService, useValue: service }],
    });

    store = TestBed.inject(CharacterOboloStore);
  });

  it('should load a character only once while the same post emits navigation updates', () => {
    store.setCharacter('nandini');
    store.setCharacter('nandini');

    expect(service.getTotal).toHaveBeenCalledTimes(1);
    expect(store.state()).toEqual({ status: 'ready', total: 12 });
  });

  it('should lock another offer after the first success', () => {
    store.setCharacter('nandini');
    store.offer();
    store.offer();

    expect(service.offer).toHaveBeenCalledTimes(1);
    expect(store.state()).toEqual({ status: 'success', total: 13 });
  });

  it('should preserve the count and allow retry after an offer error', () => {
    service.offer
      .mockReturnValueOnce(throwError(() => new Error('offline')))
      .mockReturnValueOnce(of(13));
    store.setCharacter('nandini');

    store.offer();
    expect(store.state()).toEqual({ status: 'offer-error', total: 12 });

    store.offer();
    expect(store.state()).toEqual({ status: 'success', total: 13 });
  });

  it('should discard a stale counter response after the character changes', () => {
    const nandiniResponse = new Subject<number>();
    service.getTotal.mockReturnValueOnce(nandiniResponse).mockReturnValueOnce(of(31));

    store.setCharacter('nandini');
    store.setCharacter('maya');
    nandiniResponse.next(99);

    expect(store.state()).toEqual({ status: 'ready', total: 31 });
  });

  it('should expose a recoverable loading error', () => {
    service.getTotal
      .mockReturnValueOnce(throwError(() => new Error('offline')))
      .mockReturnValueOnce(of(12));

    store.setCharacter('nandini');
    expect(store.state()).toEqual({ status: 'load-error', total: null });

    store.retry();
    expect(store.state()).toEqual({ status: 'ready', total: 12 });
  });
});
