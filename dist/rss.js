const expressionCache = /* @__PURE__ */ new Map();
const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const compileExpression = (expression) => {
  const cached = expressionCache.get(expression);
  if (cached) {
    return cached;
  }
  const transformed = expression.replace(/\bthis\b/g, "__item");
  const fn = new Function("scope", `with (scope) { return (${transformed}); }`);
  expressionCache.set(expression, fn);
  return fn;
};
const evaluate = (expression, scope) => {
  try {
    return compileExpression(expression)(scope);
  } catch {
    return "";
  }
};
const parseNodes = (template2, from = 0, stopAt) => {
  const nodes = [];
  let index = from;
  while (index < template2.length) {
    const start = template2.indexOf("{{", index);
    if (start === -1) {
      nodes.push({ type: "text", value: template2.slice(index) });
      return { nodes, index: template2.length };
    }
    if (start > index) {
      nodes.push({ type: "text", value: template2.slice(index, start) });
    }
    const close = template2.indexOf("}}", start + 2);
    if (close === -1) {
      nodes.push({ type: "text", value: template2.slice(start) });
      return { nodes, index: template2.length };
    }
    const token = template2.slice(start + 2, close).trim();
    index = close + 2;
    if (token === "/if" || token === "/each") {
      if (stopAt === token) {
        return { nodes, index };
      }
      nodes.push({ type: "text", value: `{{${token}}}` });
      continue;
    }
    if (token.startsWith("#if ")) {
      const child = parseNodes(template2, index, "/if");
      nodes.push({
        type: "if",
        condition: token.slice(4).trim(),
        children: child.nodes
      });
      index = child.index;
      continue;
    }
    if (token.startsWith("#each ")) {
      const child = parseNodes(template2, index, "/each");
      nodes.push({
        type: "each",
        source: token.slice(6).trim(),
        children: child.nodes
      });
      index = child.index;
      continue;
    }
    nodes.push({ type: "expr", value: token });
  }
  return { nodes, index };
};
const renderNodes = (nodes, scope) => {
  let output = "";
  for (const node of nodes) {
    if (node.type === "text") {
      output += node.value;
      continue;
    }
    if (node.type === "expr") {
      output += escapeHtml(evaluate(node.value, scope));
      continue;
    }
    if (node.type === "if") {
      if (Boolean(evaluate(node.condition, scope))) {
        output += renderNodes(node.children, scope);
      }
      continue;
    }
    const items = evaluate(node.source, scope);
    if (!Array.isArray(items)) {
      continue;
    }
    for (const item of items) {
      const childScope = Object.create(scope);
      childScope.__item = item;
      output += renderNodes(node.children, childScope);
    }
  }
  return output;
};
const createTemplateRenderer = (template2) => {
  const parsed = parseNodes(template2).nodes;
  return (scope) => renderNodes(parsed, scope);
};
typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
  var e = new Error(message);
  return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};
async function invoke(cmd, args = {}, options) {
  return window.__TAURI_INTERNALS__.invoke(cmd, args, options);
}
function convertFileSrc(filePath, protocol = "asset") {
  return window.__TAURI_INTERNALS__.convertFileSrc(filePath, protocol);
}
var TauriEvent;
(function(TauriEvent2) {
  TauriEvent2["WINDOW_RESIZED"] = "tauri://resize";
  TauriEvent2["WINDOW_MOVED"] = "tauri://move";
  TauriEvent2["WINDOW_CLOSE_REQUESTED"] = "tauri://close-requested";
  TauriEvent2["WINDOW_DESTROYED"] = "tauri://destroyed";
  TauriEvent2["WINDOW_FOCUS"] = "tauri://focus";
  TauriEvent2["WINDOW_BLUR"] = "tauri://blur";
  TauriEvent2["WINDOW_SCALE_FACTOR_CHANGED"] = "tauri://scale-change";
  TauriEvent2["WINDOW_THEME_CHANGED"] = "tauri://theme-changed";
  TauriEvent2["WINDOW_CREATED"] = "tauri://window-created";
  TauriEvent2["WEBVIEW_CREATED"] = "tauri://webview-created";
  TauriEvent2["DRAG_ENTER"] = "tauri://drag-enter";
  TauriEvent2["DRAG_OVER"] = "tauri://drag-over";
  TauriEvent2["DRAG_DROP"] = "tauri://drag-drop";
  TauriEvent2["DRAG_LEAVE"] = "tauri://drag-leave";
})(TauriEvent || (TauriEvent = {}));
const isSignal = (value) => {
  if (typeof value !== "function") {
    return false;
  }
  const candidate = value;
  return candidate._isSignal === true && typeof candidate.set === "function" && typeof candidate.subscribe === "function";
};
const signal = (initialValue) => {
  let current = initialValue;
  const subscribers = /* @__PURE__ */ new Set();
  const read = (() => current);
  read._isSignal = true;
  read.set = (value) => {
    current = value;
    for (const subscriber of subscribers) {
      subscriber(current);
    }
  };
  read.update = (updater) => {
    read.set(updater(current));
  };
  read.subscribe = (subscriber) => {
    subscribers.add(subscriber);
    return () => subscribers.delete(subscriber);
  };
  return read;
};
const httpFetch = (url) => invoke("controller_http_get_text", { url });
const bindSignals = (source, onChange) => {
  const unsubscribers = [];
  for (const key of Object.keys(source)) {
    const value = source[key];
    if (isSignal(value)) {
      unsubscribers.push(value.subscribe(() => onChange()));
    }
  }
  return () => {
    for (const unsubscribe of unsubscribers) {
      unsubscribe();
    }
  };
};
const createScope = (instance, payload) => {
  return new Proxy(
    { payload },
    {
      get(target, property) {
        if (typeof property !== "string") {
          return void 0;
        }
        if (property in target) {
          return target[property];
        }
        const value = instance[property];
        if (typeof value === "function") {
          return value.bind(instance);
        }
        return value;
      },
      has(target, property) {
        if (typeof property !== "string") {
          return false;
        }
        return property in target || property in instance;
      }
    }
  );
};
const RELATIVE_URL_ATTRIBUTES = ["src", "href", "poster"];
const PACK_INSTALL_PATH_PLACEHOLDER = "{{pack-install-path}}/";
const ASSETS_PLACEHOLDER = "{{ASSETS}}";
const isExternalAssetUrl = (value) => {
  const trimmed = value.trim();
  return trimmed.length === 0 || trimmed.startsWith("data:") || trimmed.startsWith("blob:") || trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("file:") || trimmed.startsWith("asset:") || trimmed.startsWith("mailto:") || trimmed.startsWith("tel:") || trimmed.startsWith("javascript:") || trimmed.startsWith("//") || trimmed.startsWith("/") || trimmed.startsWith("#");
};
const extractWidgetRelativePath = (value) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (!isExternalAssetUrl(trimmed)) {
    return trimmed.replace(/^\.\/+/, "").replace(/^\/+/, "");
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      if (url.origin === window.location.origin) {
        return `${url.pathname}${url.search}${url.hash}`.replace(/^\/+/, "");
      }
    } catch {
      return null;
    }
  }
  return null;
};
const normalizeJoinedAssetPath = (widgetDirectory, relativePath) => {
  const normalizedBase = widgetDirectory.replaceAll("\\", "/").replace(/\/+$/, "");
  const combined = `${normalizedBase}/${relativePath.trim()}`;
  const segments = combined.split("/");
  const resolved = [];
  for (const segment of segments) {
    if (!segment || segment === ".") {
      if (resolved.length === 0 && combined.startsWith("/")) {
        resolved.push("");
      }
      continue;
    }
    if (segment === "..") {
      if (resolved.length > 1 || resolved.length === 1 && resolved[0] !== "") {
        resolved.pop();
      }
      continue;
    }
    resolved.push(segment);
  }
  return resolved.join("/") || normalizedBase;
};
const resolveAssetUrl = (widgetDirectory, value) => {
  const relativePath = extractWidgetRelativePath(value);
  if (!widgetDirectory || !relativePath) {
    return value;
  }
  try {
    return convertFileSrc(normalizeJoinedAssetPath(widgetDirectory, relativePath));
  } catch {
    return value;
  }
};
const resolveAssetsBaseUrl = (widgetDirectory) => {
  const normalizedDirectory = widgetDirectory.trim().replaceAll("\\", "/").replace(/\/+$/, "");
  if (!normalizedDirectory) {
    return "";
  }
  try {
    return convertFileSrc(normalizedDirectory);
  } catch {
    return normalizedDirectory;
  }
};
const rewriteSrcset = (value, widgetDirectory) => {
  return value.split(",").map((entry) => {
    const trimmed = entry.trim();
    if (!trimmed) {
      return trimmed;
    }
    const [url, descriptor] = trimmed.split(/\s+/, 2);
    const nextUrl = resolveAssetUrl(widgetDirectory, url);
    return descriptor ? `${nextUrl} ${descriptor}` : nextUrl;
  }).join(", ");
};
const rewriteInlineStyleUrls = (value, widgetDirectory) => {
  return value.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (full, quote, urlValue) => {
    const nextUrl = resolveAssetUrl(widgetDirectory, urlValue);
    if (nextUrl === urlValue) {
      return full;
    }
    return `url("${nextUrl}")`;
  });
};
const rewriteElementAssetUrls = (element, widgetDirectory) => {
  for (const attribute of RELATIVE_URL_ATTRIBUTES) {
    const currentValue = element.getAttribute(attribute);
    if (!currentValue) {
      continue;
    }
    const nextValue = resolveAssetUrl(widgetDirectory, currentValue);
    if (nextValue !== currentValue) {
      element.setAttribute(attribute, nextValue);
    }
  }
  const currentSrcset = element.getAttribute("srcset");
  if (currentSrcset) {
    const nextSrcset = rewriteSrcset(currentSrcset, widgetDirectory);
    if (nextSrcset !== currentSrcset) {
      element.setAttribute("srcset", nextSrcset);
    }
  }
  const currentStyle = element.getAttribute("style");
  if (currentStyle) {
    const nextStyle = rewriteInlineStyleUrls(currentStyle, widgetDirectory);
    if (nextStyle !== currentStyle) {
      element.setAttribute("style", nextStyle);
    }
  }
};
const rewriteTreeAssetUrls = (root, widgetDirectory) => {
  if (!widgetDirectory) {
    return;
  }
  if (root instanceof Element) {
    rewriteElementAssetUrls(root, widgetDirectory);
  }
  for (const element of Array.from(root.querySelectorAll("*"))) {
    rewriteElementAssetUrls(element, widgetDirectory);
  }
};
const rewriteInstallPathPlaceholders = (input, widgetDirectory) => {
  if (!widgetDirectory) {
    return input;
  }
  let output = input;
  const assetsBaseUrl = resolveAssetsBaseUrl(widgetDirectory);
  if (assetsBaseUrl && output.includes(ASSETS_PLACEHOLDER)) {
    output = output.replaceAll(ASSETS_PLACEHOLDER, assetsBaseUrl);
  }
  if (!output.includes(PACK_INSTALL_PATH_PLACEHOLDER)) {
    return output;
  }
  return output.replace(/\{\{pack-install-path\}\}\/([^"')\s]+)/g, (full, relativePath) => {
    return resolveAssetUrl(widgetDirectory, relativePath);
  });
};
const createWidgetClass = (WidgetImpl, options) => {
  return class RuntimeWidget {
    constructor({
      mount,
      payload,
      setLoading
    }) {
      this.cleanups = [];
      this.widgetDirectory = "";
      this.mount = mount;
      this.payload = payload ?? {};
      this.setLoading = typeof setLoading === "function" ? setLoading : (() => {
      });
      this.assetObserver = new MutationObserver((mutations) => {
        if (!this.widgetDirectory) {
          return;
        }
        for (const mutation of mutations) {
          if (mutation.type === "attributes" && mutation.target instanceof Element) {
            rewriteElementAssetUrls(mutation.target, this.widgetDirectory);
            continue;
          }
          for (const node of Array.from(mutation.addedNodes)) {
            if (node instanceof Element) {
              rewriteTreeAssetUrls(node, this.widgetDirectory);
            }
          }
        }
      });
      this.logic = new WidgetImpl({
        mount,
        payload: this.payload,
        setLoading: (loading) => this.setLoading(Boolean(loading)),
        on: (eventName, selector, handler) => this.on(eventName, selector, handler)
      });
      this.cleanupSignalSubscriptions = bindSignals(this.logic, () => this.render());
      this.assetObserver.observe(this.mount, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["src", "href", "poster", "srcset", "style"]
      });
    }
    onInit() {
      this.render();
      this.logic.onInit?.();
    }
    onUpdate(payload) {
      this.payload = payload ?? {};
      this.logic.onUpdate?.(this.payload);
      this.render();
    }
    onDestroy() {
      this.cleanupSignalSubscriptions();
      while (this.cleanups.length > 0) {
        const cleanup = this.cleanups.pop();
        cleanup?.();
      }
      this.assetObserver.disconnect();
      this.logic.onDestroy?.();
      this.mount.innerHTML = "";
    }
    render() {
      const scope = createScope(this.logic, this.payload);
      this.widgetDirectory = String(
        this.payload?.widgetDirectory ?? this.payload?.directory ?? ""
      ).trim();
      const finalTemplate = rewriteInstallPathPlaceholders(options.template, this.widgetDirectory);
      const finalStyles = rewriteInstallPathPlaceholders(options.styles, this.widgetDirectory);
      const renderTemplate = createTemplateRenderer(finalTemplate);
      const html = renderTemplate(scope);
      this.mount.innerHTML = `<style>${finalStyles}</style>${html}`;
      this.mount.setAttribute("data-displayduck-render-empty", html.trim().length === 0 ? "true" : "false");
      rewriteTreeAssetUrls(this.mount, this.widgetDirectory);
      this.logic.afterRender?.();
    }
    on(eventName, selector, handler) {
      const listener = (event) => {
        const target = event.target;
        const matched = target?.closest(selector);
        if (!matched || !this.mount.contains(matched)) {
          return;
        }
        handler(event, matched);
      };
      this.mount.addEventListener(eventName, listener);
      const cleanup = () => this.mount.removeEventListener(eventName, listener);
      this.cleanups.push(cleanup);
      return cleanup;
    }
  };
};
let DisplayDuckWidget$1 = class DisplayDuckWidget {
  constructor(ctx) {
    this.ctx = ctx;
    this.refreshTimerId = null;
    this.lastAppliedUrl = "";
    this.lastAppliedInterval = 0;
    this.lastAppliedMaxItems = 5;
    this.lastAppliedSkipItems = 0;
    this.effectiveInterval = 0;
    this.effectiveMaxItems = 5;
    this.effectiveSkipItems = 0;
    this.showBorder = signal(false);
    this.feedEntriesState = signal([]);
    this.errorMessageState = signal(null);
    this.fetchingState = signal(false);
    this.payload = ctx.payload ?? {};
    this.feedEntries = this.feedEntriesState;
    this.errorMessage = this.errorMessageState;
    this.fetching = this.fetchingState;
  }
  onInit() {
    this.applyInputs();
  }
  onUpdate(payload) {
    this.payload = payload ?? {};
    this.applyInputs();
  }
  onDestroy() {
    if (this.refreshTimerId) {
      clearInterval(this.refreshTimerId);
      this.refreshTimerId = null;
    }
  }
  entries() {
    return this.feedEntries();
  }
  feedClass() {
    const count = Math.max(0, Math.min(5, this.entries().length));
    return `feed-items-${count}`;
  }
  showEntries() {
    return !this.errorMessage() && !this.fetching() && this.entries().length > 0;
  }
  showFetchingState() {
    return this.fetching();
  }
  showErrorState() {
    return !this.fetching() && !this.showEntries();
  }
  textBorderEnabled() {
    return this.showBorder();
  }
  getConfig(key, fallback) {
    const config = this.payload.config ?? {};
    return config[key] ?? fallback;
  }
  applyInputs() {
    const nextUrl = String(this.getConfig("url", "") ?? "").trim();
    const refreshIntervalCandidate = Number(this.getConfig("refreshInterval", 0));
    const nextInterval = Number.isFinite(refreshIntervalCandidate) ? Math.max(0, Math.floor(refreshIntervalCandidate)) : 0;
    const parsedMaxItems = Number(this.getConfig("maxItems", 5));
    const nextMaxItems = Number.isFinite(parsedMaxItems) ? Math.max(1, Math.min(5, Math.floor(parsedMaxItems))) : 5;
    const parsedSkipItems = Number(this.getConfig("skipItems", 0));
    const nextSkipItems = Number.isFinite(parsedSkipItems) ? Math.max(0, Math.floor(parsedSkipItems)) : 0;
    const nextTextBorder = Boolean(this.getConfig("textBorder", false));
    this.showBorder.set(nextTextBorder);
    const changed = nextUrl !== this.lastAppliedUrl || nextInterval !== this.lastAppliedInterval || nextMaxItems !== this.lastAppliedMaxItems || nextSkipItems !== this.lastAppliedSkipItems;
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
  configureRefreshTimer() {
    if (this.refreshTimerId) {
      clearInterval(this.refreshTimerId);
      this.refreshTimerId = null;
    }
    if (this.effectiveInterval <= 0) {
      return;
    }
    const refreshMs = this.effectiveInterval * 6e4;
    this.refreshTimerId = setInterval(() => {
      void this.fetchFeed();
    }, refreshMs);
  }
  async fetchFeed() {
    const targetUrl = this.lastAppliedUrl;
    const hasExistingEntries = this.feedEntries().length > 0;
    if (!targetUrl) {
      this.updateEntries([]);
      this.errorMessageState.set("No RSS URL provided");
      return;
    }
    try {
      new URL(targetUrl);
    } catch {
      this.updateEntries([]);
      this.errorMessageState.set("Invalid RSS URL");
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
      const xml = parser.parseFromString(text, "text/xml");
      const channelImageUrl = xml.querySelector("channel > image > url")?.textContent?.trim() ?? "";
      const items = xml.querySelectorAll("item");
      const entries = Array.from(items).map((item) => {
        const title = item.querySelector("title")?.textContent || "";
        const link = item.querySelector("link")?.textContent || "";
        const description = item.querySelector("description")?.textContent || "";
        const pubDate = item.querySelector("pubDate")?.textContent || "";
        const imageUrl = this.extractItemImageUrl(item, description) || channelImageUrl;
        return { title, link, description, pubDate, imageUrl };
      }).slice(this.effectiveSkipItems, this.effectiveSkipItems + this.effectiveMaxItems);
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
  updateEntries(newEntries) {
    if (!this.areEntriesEqual(this.feedEntries(), newEntries)) {
      this.feedEntriesState.set(newEntries);
    }
  }
  areEntriesEqual(current, next) {
    if (current.length !== next.length) {
      return false;
    }
    for (let index = 0; index < current.length; index += 1) {
      const left = current[index];
      const right = next[index];
      if (left.title !== right.title || left.link !== right.link || left.description !== right.description || left.pubDate !== right.pubDate || left.imageUrl !== right.imageUrl) {
        return false;
      }
    }
    return true;
  }
  logFeedFetchError(targetUrl, error) {
    const ownProps = error && typeof error === "object" ? Object.getOwnPropertyNames(error) : [];
    if (error instanceof Error) {
      console.error("Failed to fetch RSS feed", {
        url: targetUrl,
        message: error.message,
        name: error.name,
        stack: error.stack,
        ownProps,
        raw: error
      });
      return;
    }
    console.error("Failed to fetch RSS feed", {
      url: targetUrl,
      ownProps,
      error
    });
  }
  buildUserFacingFetchError(error) {
    const base = "Failed to fetch RSS feed";
    const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
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
  extractItemImageUrl(item, description) {
    const mediaContent = item.querySelector("media\\:content[url], content[url]");
    const mediaContentUrl = mediaContent?.getAttribute("url")?.trim();
    if (mediaContentUrl) {
      return mediaContentUrl;
    }
    const mediaThumb = item.querySelector("media\\:thumbnail[url], thumbnail[url]");
    const mediaThumbUrl = mediaThumb?.getAttribute("url")?.trim();
    if (mediaThumbUrl) {
      return mediaThumbUrl;
    }
    const itunesImage = item.querySelector("itunes\\:image[href], image[href]");
    const itunesImageHref = itunesImage?.getAttribute("href")?.trim();
    if (itunesImageHref) {
      return itunesImageHref;
    }
    const enclosure = item.querySelector("enclosure[url][type]");
    const enclosureUrl = enclosure?.getAttribute("url")?.trim() ?? "";
    const enclosureType = enclosure?.getAttribute("type")?.toLowerCase() ?? "";
    if (enclosureUrl && enclosureType.startsWith("image/")) {
      return enclosureUrl;
    }
    const descriptionImageMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (descriptionImageMatch?.[1]) {
      return descriptionImageMatch[1];
    }
    return "";
  }
};
const template = '<div class="rss {{ feedClass() }}">\n  {{#if showEntries()}}\n    {{#each entries()}}\n      <div class="feed-item">\n        {{#if this.imageUrl}}\n          <div class="image">\n            <img src="{{ this.imageUrl }}" alt="Feed Image">\n          </div>\n        {{/if}}\n        <div class="item {{#if this.imageUrl}}has-image{{/if}}">\n          <div class="title {{#if textBorderEnabled()}}text-border{{/if}}">{{ this.title }}</div>\n        </div>\n      </div>\n    {{/each}}\n  {{/if}}\n\n  {{#if showFetchingState()}}\n    <div class="status-view">\n      <div class="icon spinner">\n        <i class="fas fa-rss"></i>\n      </div>\n      <div class="message">Loading feed...</div>\n    </div>\n  {{/if}}\n\n  {{#if showErrorState()}}\n    <div class="status-view">\n      <div class="icon">\n        <i class="fas fa-rss"></i>\n      </div>\n      <div class="message">{{ errorMessage() }}</div>\n    </div>\n  {{/if}}\n</div>\n';
const styles = ".rss {\n  display: flex;\n  flex-direction: column;\n  align-items: stretch;\n  justify-content: center;\n  width: 100%;\n  height: 100%;\n  color: var(--color-text);\n  overflow: hidden;\n  font-size: clamp(0.5em, var(--host-width) / 35, 1em);\n}\n.rss.feed-items-1 .feed-item {\n  height: 100%;\n}\n.rss.feed-items-2 .feed-item {\n  height: 50%;\n}\n.rss.feed-items-3 .feed-item {\n  height: 33%;\n}\n.rss.feed-items-4 .feed-item {\n  height: 25%;\n}\n.rss.feed-items-5 .feed-item {\n  height: 20%;\n}\n.rss .feed-item {\n  display: flex;\n  gap: 0.5em;\n  padding: 0.25em;\n  min-height: 0;\n  overflow: hidden;\n}\n.rss .image {\n  --forced-item-width: calc(var(--host-width, 300px) / 5);\n  width: var(--forced-item-width);\n  min-width: var(--forced-item-width);\n  max-width: var(--forced-item-width);\n  border-radius: 0.25em;\n  overflow: hidden;\n  border: max(0.15em, 5px) solid rgba(255, 255, 255, 0.12);\n}\n.rss .image img {\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n  object-position: center center;\n  display: block;\n}\n.rss .item {\n  flex: 1 1 auto;\n  min-width: 0;\n  display: flex;\n  align-items: center;\n  overflow: hidden;\n}\n.rss .title {\n  font-size: clamp(1em, var(--host-width) / 25, 1em);\n  line-height: 1.1em;\n  width: 100%;\n  overflow: hidden;\n  display: -webkit-box;\n  line-clamp: 2;\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n}\n.rss .text-border {\n  -webkit-text-stroke: 0.15em;\n  -webkit-text-stroke-color: rgba(0, 0, 0, 0.75);\n  paint-order: stroke fill;\n  padding-left: 0.15em;\n  padding-right: 0.15em;\n}\n.rss .status-view {\n  display: flex;\n  width: 100%;\n  height: 100%;\n  flex-direction: column;\n  justify-content: center;\n  align-items: center;\n  gap: 0.5em;\n  text-align: center;\n}\n.rss .icon {\n  font-size: clamp(2rem, var(--host-width, 300px) / 8, 4rem);\n  opacity: 0.8;\n}\n.rss .spinner {\n  animation: rss-spin 1.2s linear infinite;\n}\n.rss .message {\n  max-width: 90%;\n  font-size: 1rem;\n  line-height: 1.3;\n}\n\n@keyframes rss-spin {\n  from {\n    transform: rotate(0deg);\n  }\n  to {\n    transform: rotate(360deg);\n  }\n}";
const DisplayDuckWidget2 = createWidgetClass(DisplayDuckWidget$1, { template, styles });
const Widget = DisplayDuckWidget2;
const displayduckPackRss_rss_entry = { DisplayDuckWidget: DisplayDuckWidget2, Widget };
export {
  DisplayDuckWidget2 as DisplayDuckWidget,
  Widget,
  displayduckPackRss_rss_entry as default
};
//# sourceMappingURL=rss.js.map
