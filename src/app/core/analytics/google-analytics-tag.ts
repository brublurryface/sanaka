import { signal } from '@angular/core';

type Command = (...args: unknown[]) => void;
type TagWindow = Window & {
  dataLayer?: unknown[];
  gtag?: Command;
  [flag: `ga-disable-${string}`]: boolean | undefined;
};

const COOKIE_PREFIX = 'sanaka';
const COOKIE_LIFETIME_SECONDS = 90 * 24 * 60 * 60;
const ANALYTICS_COOKIE = new RegExp(`^${COOKIE_PREFIX}_ga(?:_[A-Z0-9]+)?$`, 'u');

export class GoogleAnalyticsTag {
  private readonly loaded = signal(false);
  private command: Command | undefined;
  private readonly browser: TagWindow;
  private readonly disableFlag: `ga-disable-${string}`;
  readonly ready = this.loaded.asReadonly();

  constructor(
    browser: Window,
    private readonly id: string,
  ) {
    this.browser = browser as TagWindow;
    this.disableFlag = `ga-disable-${id}`;
  }

  enable(location: string, referrer: string): void {
    this.browser[this.disableFlag] = false;
    if (this.command) return;

    const layer = (this.browser.dataLayer ??= []);
    const gtag: Command = function () {
      layer.push(arguments);
    };
    this.command = gtag;
    this.browser.gtag = gtag;

    // O aceite autoriza a análise de visitas. Os recursos de publicidade ficam desativados.
    gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    gtag('js', new Date());
    gtag('set', this.pageParameters(location, referrer));
    gtag('config', this.id, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_prefix: COOKIE_PREFIX,
      cookie_domain: 'none',
      cookie_path: '/',
      cookie_expires: COOKIE_LIFETIME_SECONDS,
      cookie_update: false,
    });

    const document = this.browser.document;
    const script = document.createElement('script');
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(this.id)}`;
    script.addEventListener('load', () => this.loaded.set(true), { once: true });
    document.head.append(script);
  }

  pageView(location: string, referrer: string): void {
    const parameters = this.pageParameters(location, referrer);
    this.command?.('set', parameters);
    this.command?.('event', 'page_view', { ...parameters, send_to: this.id });
  }

  pause(): void {
    this.browser[this.disableFlag] = true;
  }

  withdraw(): void {
    this.pause();
    const document = this.browser.document;
    try {
      for (const entry of document.cookie.split(';')) {
        const name = entry.split('=', 1)[0].trim();
        if (ANALYTICS_COOKIE.test(name)) {
          document.cookie = `${name}=; Max-Age=0; Path=/; Secure; SameSite=Lax`;
        }
      }
    } catch {
      // A pausa já foi aplicada mesmo se o navegador impedir o acesso aos cookies.
    }
  }

  private pageParameters(location: string, referrer: string) {
    return { page_location: location, page_referrer: referrer, page_title: 'Sanaka' };
  }
}
