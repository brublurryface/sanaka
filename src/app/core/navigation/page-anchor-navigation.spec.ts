import { Component, PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  NavigationEnd,
  NavigationSkipped,
  NavigationSkippedCode,
  NavigationStart,
  Router,
  Scroll,
} from '@angular/router';
import { Subject } from 'rxjs';

import { PageAnchorNavigation } from './page-anchor-navigation';
import { PageLoadingState } from './page-loading-state';

@Component({ template: '<h2 id="newsletter" tabindex="-1">Newsletter</h2>' })
class AnchorPage {}

describe('PageAnchorNavigation', () => {
  let fixture: ComponentFixture<AnchorPage>;
  let events: Subject<NavigationStart | NavigationSkipped | Scroll>;
  let active: ReturnType<typeof signal<boolean>>;
  let target: HTMLElement;
  let scroll = vi.fn<HTMLElement['scrollIntoView']>();

  function setup(platform = 'browser'): void {
    events = new Subject();
    active = signal(false);
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { events } },
        { provide: PageLoadingState, useValue: { active } },
        { provide: PLATFORM_ID, useValue: platform },
      ],
    });
    TestBed.inject(PageAnchorNavigation);
    fixture = TestBed.createComponent(AnchorPage);
    fixture.detectChanges();
    target = fixture.nativeElement.querySelector('#newsletter');
    scroll = vi.fn<HTMLElement['scrollIntoView']>();
    target.scrollIntoView = scroll;
  }

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('should wait for the loading screen to release the page before scrolling and focusing', async () => {
    setup();
    active.set(true);
    events.next(
      new Scroll(
        new NavigationEnd(1, '/posts#newsletter', '/posts#newsletter'),
        null,
        'newsletter',
      ),
    );
    await render();
    expect(scroll).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(target);

    active.set(false);
    await render();
    expect(scroll).toHaveBeenCalledExactlyOnceWith({ block: 'start', behavior: 'auto' });
    expect(document.activeElement).toBe(target);

    await render();
    expect(scroll).toHaveBeenCalledTimes(1);
  });

  it('should scroll an already ready page and handle another click on the same fragment', async () => {
    setup();
    events.next(
      new Scroll(
        new NavigationEnd(1, '/posts#newsletter', '/posts#newsletter'),
        null,
        'newsletter',
      ),
    );
    await render();
    expect(scroll).toHaveBeenCalledTimes(1);

    const skipped = new NavigationSkipped(
      2,
      '/posts#newsletter',
      'Same URL',
      NavigationSkippedCode.IgnoredSameUrlNavigation,
    );
    events.next(skipped);
    events.next(new Scroll(skipped, null, 'newsletter'));
    await render();
    expect(scroll).toHaveBeenCalledTimes(2);
  });

  it('should discard a pending fragment and stale scroll events when the user navigates away', async () => {
    setup();
    active.set(true);
    const previous = new Scroll(
      new NavigationEnd(1, '/posts#newsletter', '/posts#newsletter'),
      null,
      'newsletter',
    );
    events.next(previous);
    await render();
    events.next(new NavigationStart(2, '/sobre'));
    events.next(previous);
    active.set(false);
    await render();
    expect(scroll).not.toHaveBeenCalled();
  });

  it('should preserve manual scrolling and history restoration and tolerate missing anchors', async () => {
    setup();
    const end = new NavigationEnd(1, '/posts#newsletter', '/posts#newsletter');
    events.next(new Scroll(end, null, 'newsletter', 'manual'));
    await render();
    events.next(new Scroll(end, [0, 400], 'newsletter'));
    await render();
    events.next(new Scroll(end, null, null));
    await render();
    events.next(new Scroll(end, null, 'missing'));
    await render();
    expect(scroll).not.toHaveBeenCalled();
  });

  it('should not manipulate the viewport during server rendering', async () => {
    setup('server');
    events.next(
      new Scroll(
        new NavigationEnd(1, '/posts#newsletter', '/posts#newsletter'),
        null,
        'newsletter',
      ),
    );
    await render();
    expect(scroll).not.toHaveBeenCalled();
  });
});
