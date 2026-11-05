import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { CharacterOboloService } from '../data-access/character-obolo.service';
import { CharacterOboloStore, CREATE_OBOLO_OPERATION_ID } from './character-obolo.store';

describe('CharacterOboloStore', () => {
  const service = {
    getTotal: vi.fn<(slug: string) => Observable<number>>(),
    offer: vi.fn<(slug: string, operationId: string) => Observable<number>>(),
  };

  let store: CharacterOboloStore;

  beforeEach(() => {
    service.getTotal.mockReset();
    service.offer.mockReset();
    service.getTotal.mockReturnValue(of(12));
    service.offer.mockReturnValue(of(13));

    TestBed.configureTestingModule({
      providers: [
        CharacterOboloStore,
        { provide: CharacterOboloService, useValue: service },
        {
          provide: CREATE_OBOLO_OPERATION_ID,
          useValue: () => '00000000-0000-4000-8000-000000000001',
        },
      ],
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
    expect(service.offer.mock.calls).toEqual([
      ['nandini', '00000000-0000-4000-8000-000000000001'],
      ['nandini', '00000000-0000-4000-8000-000000000001'],
    ]);
  });

  it('ignores a previous visit when A changes to B and then back to A', () => {
    const stale = new Subject<number>();
    service.getTotal
      .mockReturnValueOnce(stale)
      .mockReturnValueOnce(of(31))
      .mockReturnValueOnce(of(44));
    store.setCharacter('nandini');
    store.setCharacter('samvit');
    store.setCharacter('nandini');
    stale.next(99);
    expect(store.state()).toEqual({ status: 'ready', total: 44 });
  });

  it('ignores an old offer response after returning to the same character', () => {
    const stale = new Subject<number>();
    service.offer.mockReturnValueOnce(stale);
    store.setCharacter('nandini');
    store.offer();
    store.setCharacter('samvit');
    store.setCharacter('nandini');
    stale.next(99);
    expect(store.state()).toEqual({ status: 'ready', total: 12 });
  });

  it('does not send an offer when a secure operation key cannot be created', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        CharacterOboloStore,
        { provide: CharacterOboloService, useValue: service },
        {
          provide: CREATE_OBOLO_OPERATION_ID,
          useValue: () => {
            throw new Error('unavailable');
          },
        },
      ],
    });
    const unavailable = TestBed.inject(CharacterOboloStore);
    unavailable.setCharacter('nandini');
    unavailable.offer();
    expect(service.offer).not.toHaveBeenCalled();
    expect(unavailable.state()).toEqual({ status: 'offer-error', total: 12 });
  });

  it('should discard a stale counter response after the character changes', () => {
    const nandiniResponse = new Subject<number>();
    service.getTotal.mockReturnValueOnce(nandiniResponse).mockReturnValueOnce(of(31));

    store.setCharacter('nandini');
    store.setCharacter('samvit');
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
