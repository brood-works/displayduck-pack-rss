import { httpFetch, signal, type Signal, type WidgetContext, type WidgetPayload } from '@displayduck/base';

type FeedEntry = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  imageUrl: string;
};

export class DisplayDuckWidget {
  private refreshTimerId: ReturnType<typeof setInterval> | null = null;
  private lastAppliedUrl = '';
  private lastAppliedInterval = 0;
  private lastAppliedMaxItems = 5;
  private lastAppliedSkipItems = 0;
  private effectiveInterval = 0;
  private effectiveMaxItems = 5;
  private effectiveSkipItems = 0;
  private payload: WidgetPayload;

  public readonly feedEntries: Signal<FeedEntry[]>;
  public readonly errorMessage: Signal<string | null>;
  public readonly fetching: Signal<boolean>;
  public readonly showBorder: Signal<boolean> = signal(false);
  public readonly alignment: Signal<'left' | 'right'> = signal('left');

  private readonly feedEntriesState = signal<FeedEntry[]>([]);
  private readonly errorMessageState = signal<string | null>(null);
  private readonly fetchingState = signal(false);

  public constructor(private readonly ctx: WidgetContext) {
    this.payload = ctx.payload ?? {};
    this.feedEntries = this.feedEntriesState;
    this.errorMessage = this.errorMessageState;
    this.fetching = this.fetchingState;
  }

  public onInit(): void {
    this.applyInputs();
  }

  public onUpdate(payload: WidgetPayload): void {
    this.payload = payload ?? {};
    this.applyInputs();
  }

  public onDestroy(): void {
    if (this.refreshTimerId) {
      clearInterval(this.refreshTimerId);
      this.refreshTimerId = null;
    }
  }

  public entries(): FeedEntry[] {
    return this.feedEntries();
  }

  public feedClass(): string {
    const count = Math.max(0, Math.min(5, this.entries().length));
    return `feed-items-${count}`;
  }

  public showEntries(): boolean {
    return !this.errorMessage() && !this.fetching() && this.entries().length > 0;
  }

  public showFetchingState(): boolean {
    return this.fetching();
  }

  public showErrorState(): boolean {
    return !this.fetching() && !this.showEntries();
  }

  public textBorderEnabled(): boolean {
    return this.showBorder();
  }

  public alignmentClass(): string {
    return `align-${this.alignment()}`;
  }

  private getConfig<T>(key: string, fallback: T): T {
    const config = (this.payload as { config?: Record<string, unknown> }).config ?? {};
    return (config[key] as T | undefined) ?? fallback;
  }

  private applyInputs(): void {
    const nextUrl = String(this.getConfig('url', '') ?? '').trim();
    const refreshIntervalCandidate = Number(this.getConfig('refreshInterval', 0));
    const nextInterval = Number.isFinite(refreshIntervalCandidate)
      ? Math.max(0, Math.floor(refreshIntervalCandidate))
      : 0;
    const parsedMaxItems = Number(this.getConfig('maxItems', 5));
    const nextMaxItems = Number.isFinite(parsedMaxItems)
      ? Math.max(1, Math.min(5, Math.floor(parsedMaxItems)))
      : 5;
    const parsedSkipItems = Number(this.getConfig('skipItems', 0));
    const nextSkipItems = Number.isFinite(parsedSkipItems)
      ? Math.max(0, Math.floor(parsedSkipItems))
      : 0;
    const nextTextBorder = Boolean(this.getConfig('textBorder', false));
    const nextAlignment = this.readAlignment(this.getConfig('alignment', 'left'));

    this.showBorder.set(nextTextBorder);
    this.alignment.set(nextAlignment);

    const changed =
      nextUrl !== this.lastAppliedUrl ||
      nextInterval !== this.lastAppliedInterval ||
      nextMaxItems !== this.lastAppliedMaxItems ||
      nextSkipItems !== this.lastAppliedSkipItems;

    if (!changed) {
      return;
    }

    this.lastAppliedUrl = nextUrl;
    this.lastAppliedInterval = nextInterval;
    this.lastAppliedMaxItems = nextMaxItems;
    this.lastAppliedSkipItems = nextSkipItems;
    this.effectiveInterval = nextInterval;
    this.effectiveMaxItems = nextMaxItems;
    this.effectiveSkipItems = nextSkipItems;
    this.configureRefreshTimer();
    void this.fetchFeed();
  }

  private configureRefreshTimer(): void {
    if (this.refreshTimerId) {
      clearInterval(this.refreshTimerId);
      this.refreshTimerId = null;
    }

    if (this.effectiveInterval <= 0) {
      return;
    }

    const refreshMs = this.effectiveInterval * 60_000;
    this.refreshTimerId = setInterval(() => {
      void this.fetchFeed();
    }, refreshMs);
  }

  private async fetchFeed(): Promise<void> {
    const targetUrl = this.lastAppliedUrl;
    const hasExistingEntries = this.feedEntries().length > 0;
    if (!targetUrl) {
      this.updateEntries([]);
      this.errorMessageState.set('No RSS URL provided');
      return;
    }

    try {
      new URL(targetUrl);
    } catch {
      this.updateEntries([]);
      this.errorMessageState.set('Invalid RSS URL');
      return;
    }

    if (!hasExistingEntries) {
      this.fetchingState.set(true);
      this.ctx.setLoading(true);
    }
    this.errorMessageState.set(null);

    try {
      const text = await httpFetch(targetUrl);
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');
      const channelImageUrl =
        xml.querySelector('channel > image > url')?.textContent?.trim() ?? '';
      const items = xml.querySelectorAll('item');
      const entries = Array.from(items)
        .map((item) => {
          const title = item.querySelector('title')?.textContent || '';
          const link = item.querySelector('link')?.textContent || '';
          const description = item.querySelector('description')?.textContent || '';
          const pubDate = item.querySelector('pubDate')?.textContent || '';
          const imageUrl = this.extractItemImageUrl(item, description) || channelImageUrl;
          return { title, link, description, pubDate, imageUrl };
        })
        .slice(this.effectiveSkipItems, this.effectiveSkipItems + this.effectiveMaxItems);
      this.updateEntries(entries);
    } catch (error) {
      this.logFeedFetchError(targetUrl, error);
      if (!hasExistingEntries) {
        this.updateEntries([]);
        this.errorMessageState.set(this.buildUserFacingFetchError(error));
      }
    } finally {
      this.fetchingState.set(false);
      this.ctx.setLoading(false);
    }
  }

  private updateEntries(newEntries: FeedEntry[]): void {
    if (!this.areEntriesEqual(this.feedEntries(), newEntries)) {
      this.feedEntriesState.set(newEntries);
    }
  }

  private areEntriesEqual(current: FeedEntry[], next: FeedEntry[]): boolean {
    if (current.length !== next.length) {
      return false;
    }

    for (let index = 0; index < current.length; index += 1) {
      const left = current[index];
      const right = next[index];
      if (
        left.title !== right.title ||
        left.link !== right.link ||
        left.description !== right.description ||
        left.pubDate !== right.pubDate ||
        left.imageUrl !== right.imageUrl
      ) {
        return false;
      }
    }

    return true;
  }

  private logFeedFetchError(targetUrl: string, error: unknown): void {
    const ownProps = error && typeof error === 'object' ? Object.getOwnPropertyNames(error) : [];
    if (error instanceof Error) {
      console.error('Failed to fetch RSS feed', {
        url: targetUrl,
        message: error.message,
        name: error.name,
        stack: error.stack,
        ownProps,
        raw: error,
      });
      return;
    }

    console.error('Failed to fetch RSS feed', {
      url: targetUrl,
      ownProps,
      error,
    });
  }

  private buildUserFacingFetchError(error: unknown): string {
    const base = 'Failed to fetch RSS feed';
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : '';

    if (!message) {
      return base;
    }

    const parenthesizedStatus = message.match(/\((\d{3}\s+[^)]+)\)/);
    if (parenthesizedStatus?.[1]) {
      return `${base} (${parenthesizedStatus[1].trim()})`;
    }

    const inlineStatus = message.match(/\bHTTP\s+(\d{3}(?:\s+[A-Za-z][A-Za-z\s-]*)?)/i);
    if (inlineStatus?.[1]) {
      return `${base} (${inlineStatus[1].trim()})`;
    }

    return base;
  }

  private extractItemImageUrl(item: Element, description: string): string {
    const mediaContent = item.querySelector('media\\:content[url], content[url]');
    const mediaContentUrl = mediaContent?.getAttribute('url')?.trim();
    if (mediaContentUrl) {
      return mediaContentUrl;
    }

    const mediaThumb = item.querySelector('media\\:thumbnail[url], thumbnail[url]');
    const mediaThumbUrl = mediaThumb?.getAttribute('url')?.trim();
    if (mediaThumbUrl) {
      return mediaThumbUrl;
    }

    const itunesImage = item.querySelector('itunes\\:image[href], image[href]');
    const itunesImageHref = itunesImage?.getAttribute('href')?.trim();
    if (itunesImageHref) {
      return itunesImageHref;
    }

    const enclosure = item.querySelector('enclosure[url][type]');
    const enclosureUrl = enclosure?.getAttribute('url')?.trim() ?? '';
    const enclosureType = enclosure?.getAttribute('type')?.toLowerCase() ?? '';
    if (enclosureUrl && enclosureType.startsWith('image/')) {
      return enclosureUrl;
    }

    const descriptionImageMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (descriptionImageMatch?.[1]) {
      return descriptionImageMatch[1];
    }

    return '';
  }

  private readAlignment(value: unknown): 'left' | 'right' {
    return value === 'right' ? 'right' : 'left';
  }
}
