const v = /* @__PURE__ */ new Map(), D = (s) => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;"), U = (s) => {
  const t = v.get(s);
  if (t)
    return t;
  const i = s.replace(/\bthis\b/g, "__item"), e = new Function("scope", `with (scope) { return (${i}); }`);
  return v.set(s, e), e;
}, p = (s, t) => {
  try {
    return U(s)(t);
  } catch {
    return "";
  }
}, g = (s, t = 0, i) => {
  const e = [];
  let r = t;
  for (; r < s.length; ) {
    const n = s.indexOf("{{", r);
    if (n === -1)
      return e.push({ type: "text", value: s.slice(r) }), { nodes: e, index: s.length };
    n > r && e.push({ type: "text", value: s.slice(r, n) });
    const a = s.indexOf("}}", n + 2);
    if (a === -1)
      return e.push({ type: "text", value: s.slice(n) }), { nodes: e, index: s.length };
    const o = s.slice(n + 2, a).trim();
    if (r = a + 2, o === "/if" || o === "/each") {
      if (i === o)
        return { nodes: e, index: r };
      e.push({ type: "text", value: `{{${o}}}` });
      continue;
    }
    if (o.startsWith("#if ")) {
      const c = g(s, r, "/if");
      e.push({
        type: "if",
        condition: o.slice(4).trim(),
        children: c.nodes
      }), r = c.index;
      continue;
    }
    if (o.startsWith("#each ")) {
      const c = g(s, r, "/each");
      e.push({
        type: "each",
        source: o.slice(6).trim(),
        children: c.nodes
      }), r = c.index;
      continue;
    }
    e.push({ type: "expr", value: o });
  }
  return { nodes: e, index: r };
}, y = (s, t) => {
  let i = "";
  for (const e of s) {
    if (e.type === "text") {
      i += e.value;
      continue;
    }
    if (e.type === "expr") {
      i += D(p(e.value, t));
      continue;
    }
    if (e.type === "if") {
      p(e.condition, t) && (i += y(e.children, t));
      continue;
    }
    const r = p(e.source, t);
    if (Array.isArray(r))
      for (const n of r) {
        const a = Object.create(t);
        a.__item = n, i += y(e.children, a);
      }
  }
  return i;
}, R = (s) => {
  const t = g(s).nodes;
  return (i) => y(t, i);
};
async function M(s, t = {}, i) {
  return window.__TAURI_INTERNALS__.invoke(s, t, i);
}
function w(s, t = "asset") {
  return window.__TAURI_INTERNALS__.convertFileSrc(s, t);
}
var b;
(function(s) {
  s.WINDOW_RESIZED = "tauri://resize", s.WINDOW_MOVED = "tauri://move", s.WINDOW_CLOSE_REQUESTED = "tauri://close-requested", s.WINDOW_DESTROYED = "tauri://destroyed", s.WINDOW_FOCUS = "tauri://focus", s.WINDOW_BLUR = "tauri://blur", s.WINDOW_SCALE_FACTOR_CHANGED = "tauri://scale-change", s.WINDOW_THEME_CHANGED = "tauri://theme-changed", s.WINDOW_CREATED = "tauri://window-created", s.WEBVIEW_CREATED = "tauri://webview-created", s.DRAG_ENTER = "tauri://drag-enter", s.DRAG_OVER = "tauri://drag-over", s.DRAG_DROP = "tauri://drag-drop", s.DRAG_LEAVE = "tauri://drag-leave";
})(b || (b = {}));
const k = (s) => {
  if (typeof s != "function")
    return !1;
  const t = s;
  return t._isSignal === !0 && typeof t.set == "function" && typeof t.subscribe == "function";
}, m = (s) => {
  let t = s;
  const i = /* @__PURE__ */ new Set(), e = (() => t);
  return e._isSignal = !0, e.set = (r) => {
    t = r;
    for (const n of i)
      n(t);
  }, e.update = (r) => {
    e.set(r(t));
  }, e.subscribe = (r) => (i.add(r), () => i.delete(r)), e;
}, C = (s) => M("controller_http_get_text", { url: s }), T = (s, t) => {
  const i = [];
  for (const e of Object.keys(s)) {
    const r = s[e];
    k(r) && i.push(r.subscribe(() => t()));
  }
  return () => {
    for (const e of i)
      e();
  };
}, L = (s, t) => new Proxy(
  { payload: t },
  {
    get(i, e) {
      if (typeof e != "string")
        return;
      if (e in i)
        return i[e];
      const r = s[e];
      return typeof r == "function" ? r.bind(s) : r;
    },
    has(i, e) {
      return typeof e != "string" ? !1 : e in i || e in s;
    }
  }
), O = ["src", "href", "poster"], F = "{{pack-install-path}}/", I = "{{ASSETS}}", N = (s) => {
  const t = s.trim();
  return t.length === 0 || t.startsWith("data:") || t.startsWith("blob:") || t.startsWith("http://") || t.startsWith("https://") || t.startsWith("file:") || t.startsWith("asset:") || t.startsWith("mailto:") || t.startsWith("tel:") || t.startsWith("javascript:") || t.startsWith("//") || t.startsWith("/") || t.startsWith("#");
}, $ = (s) => {
  const t = s.trim();
  if (!t)
    return null;
  if (!N(t))
    return t.replace(/^\.\/+/, "").replace(/^\/+/, "");
  if (t.startsWith("http://") || t.startsWith("https://"))
    try {
      const i = new URL(t);
      if (i.origin === window.location.origin)
        return `${i.pathname}${i.search}${i.hash}`.replace(/^\/+/, "");
    } catch {
      return null;
    }
  return null;
}, q = (s, t) => {
  const i = s.replaceAll("\\", "/").replace(/\/+$/, ""), e = `${i}/${t.trim()}`, r = e.split("/"), n = [];
  for (const a of r) {
    if (!a || a === ".") {
      n.length === 0 && e.startsWith("/") && n.push("");
      continue;
    }
    if (a === "..") {
      (n.length > 1 || n.length === 1 && n[0] !== "") && n.pop();
      continue;
    }
    n.push(a);
  }
  return n.join("/") || i;
}, d = (s, t) => {
  const i = $(t);
  if (!s || !i)
    return t;
  try {
    return w(q(s, i));
  } catch {
    return t;
  }
}, P = (s) => {
  const t = s.trim().replaceAll("\\", "/").replace(/\/+$/, "");
  if (!t)
    return "";
  try {
    return w(t);
  } catch {
    return t;
  }
}, j = (s, t) => s.split(",").map((i) => {
  const e = i.trim();
  if (!e)
    return e;
  const [r, n] = e.split(/\s+/, 2), a = d(t, r);
  return n ? `${a} ${n}` : a;
}).join(", "), z = (s, t) => s.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (i, e, r) => {
  const n = d(t, r);
  return n === r ? i : `url("${n}")`;
}), S = (s, t) => {
  for (const r of O) {
    const n = s.getAttribute(r);
    if (!n)
      continue;
    const a = d(t, n);
    a !== n && s.setAttribute(r, a);
  }
  const i = s.getAttribute("srcset");
  if (i) {
    const r = j(i, t);
    r !== i && s.setAttribute("srcset", r);
  }
  const e = s.getAttribute("style");
  if (e) {
    const r = z(e, t);
    r !== e && s.setAttribute("style", r);
  }
}, x = (s, t) => {
  if (t) {
    s instanceof Element && S(s, t);
    for (const i of Array.from(s.querySelectorAll("*")))
      S(i, t);
  }
}, A = (s, t) => {
  if (!t)
    return s;
  let i = s;
  const e = P(t);
  return e && i.includes(I) && (i = i.replaceAll(I, e)), i.includes(F) ? i.replace(/\{\{pack-install-path\}\}\/([^"')\s]+)/g, (r, n) => d(t, n)) : i;
}, H = (s, t) => class {
  constructor({
    mount: e,
    payload: r,
    setLoading: n
  }) {
    this.cleanups = [], this.widgetDirectory = "", this.mount = e, this.payload = r ?? {}, this.setLoading = typeof n == "function" ? n : (() => {
    }), this.assetObserver = new MutationObserver((a) => {
      if (this.widgetDirectory)
        for (const o of a) {
          if (o.type === "attributes" && o.target instanceof Element) {
            S(o.target, this.widgetDirectory);
            continue;
          }
          for (const c of Array.from(o.addedNodes))
            c instanceof Element && x(c, this.widgetDirectory);
        }
    }), this.logic = new s({
      mount: e,
      payload: this.payload,
      setLoading: (a) => this.setLoading(!!a),
      on: (a, o, c) => this.on(a, o, c)
    }), this.cleanupSignalSubscriptions = T(this.logic, () => this.render()), this.assetObserver.observe(this.mount, {
      subtree: !0,
      childList: !0,
      attributes: !0,
      attributeFilter: ["src", "href", "poster", "srcset", "style"]
    });
  }
  onInit() {
    this.render(), this.logic.onInit?.();
  }
  onUpdate(e) {
    this.payload = e ?? {}, this.logic.onUpdate?.(this.payload), this.render();
  }
  onDestroy() {
    for (this.cleanupSignalSubscriptions(); this.cleanups.length > 0; )
      this.cleanups.pop()?.();
    this.assetObserver.disconnect(), this.logic.onDestroy?.(), this.mount.innerHTML = "";
  }
  render() {
    const e = L(this.logic, this.payload);
    this.widgetDirectory = String(
      this.payload?.widgetDirectory ?? this.payload?.directory ?? ""
    ).trim();
    const r = A(t.template, this.widgetDirectory), n = A(t.styles, this.widgetDirectory), o = R(r)(e);
    this.mount.innerHTML = `<style>${n}</style>${o}`, this.mount.setAttribute("data-displayduck-render-empty", o.trim().length === 0 ? "true" : "false"), x(this.mount, this.widgetDirectory), this.logic.afterRender?.();
  }
  on(e, r, n) {
    const a = (c) => {
      const h = c.target?.closest(r);
      !h || !this.mount.contains(h) || n(c, h);
    };
    this.mount.addEventListener(e, a);
    const o = () => this.mount.removeEventListener(e, a);
    return this.cleanups.push(o), o;
  }
};
let B = class {
  constructor(t) {
    this.ctx = t, this.refreshTimerId = null, this.lastAppliedUrl = "", this.lastAppliedInterval = 0, this.lastAppliedMaxItems = 5, this.lastAppliedSkipItems = 0, this.effectiveInterval = 0, this.effectiveMaxItems = 5, this.effectiveSkipItems = 0, this.feedEntriesState = m([]), this.errorMessageState = m(null), this.fetchingState = m(!1), this.payload = t.payload ?? {}, this.feedEntries = this.feedEntriesState, this.errorMessage = this.errorMessageState, this.fetching = this.fetchingState;
  }
  onInit() {
    this.applyInputs();
  }
  onUpdate(t) {
    this.payload = t ?? {}, this.applyInputs();
  }
  onDestroy() {
    this.refreshTimerId && (clearInterval(this.refreshTimerId), this.refreshTimerId = null);
  }
  entries() {
    return this.feedEntries();
  }
  feedClass() {
    return `feed-items-${Math.max(0, Math.min(5, this.entries().length))}`;
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
  getConfig(t, i) {
    return (this.payload.config ?? {})[t] ?? i;
  }
  applyInputs() {
    const t = String(this.getConfig("url", "") ?? "").trim(), i = Number(this.getConfig("refreshInterval", 0)), e = Number.isFinite(i) ? Math.max(0, Math.floor(i)) : 0, r = Number(this.getConfig("maxItems", 5)), n = Number.isFinite(r) ? Math.max(1, Math.min(5, Math.floor(r))) : 5, a = Number(this.getConfig("skipItems", 0)), o = Number.isFinite(a) ? Math.max(0, Math.floor(a)) : 0;
    (t !== this.lastAppliedUrl || e !== this.lastAppliedInterval || n !== this.lastAppliedMaxItems || o !== this.lastAppliedSkipItems) && (this.lastAppliedUrl = t, this.lastAppliedInterval = e, this.lastAppliedMaxItems = n, this.lastAppliedSkipItems = o, this.effectiveInterval = e, this.effectiveMaxItems = n, this.effectiveSkipItems = o, this.configureRefreshTimer(), this.fetchFeed());
  }
  configureRefreshTimer() {
    if (this.refreshTimerId && (clearInterval(this.refreshTimerId), this.refreshTimerId = null), this.effectiveInterval <= 0)
      return;
    const t = this.effectiveInterval * 6e4;
    this.refreshTimerId = setInterval(() => {
      this.fetchFeed();
    }, t);
  }
  async fetchFeed() {
    const t = this.lastAppliedUrl, i = this.feedEntries().length > 0;
    if (!t) {
      this.updateEntries([]), this.errorMessageState.set("No RSS URL provided");
      return;
    }
    try {
      new URL(t);
    } catch {
      this.updateEntries([]), this.errorMessageState.set("Invalid RSS URL");
      return;
    }
    i || (this.fetchingState.set(!0), this.ctx.setLoading(!0)), this.errorMessageState.set(null);
    try {
      const e = await C(t), n = new DOMParser().parseFromString(e, "text/xml"), a = n.querySelector("channel > image > url")?.textContent?.trim() ?? "", o = n.querySelectorAll("item"), c = Array.from(o).map((l) => {
        const h = l.querySelector("title")?.textContent || "", f = l.querySelector("link")?.textContent || "", u = l.querySelector("description")?.textContent || "", W = l.querySelector("pubDate")?.textContent || "", _ = this.extractItemImageUrl(l, u) || a;
        return { title: h, link: f, description: u, pubDate: W, imageUrl: _ };
      }).slice(this.effectiveSkipItems, this.effectiveSkipItems + this.effectiveMaxItems);
      this.updateEntries(c);
    } catch (e) {
      this.logFeedFetchError(t, e), i || (this.updateEntries([]), this.errorMessageState.set(this.buildUserFacingFetchError(e)));
    } finally {
      this.fetchingState.set(!1), this.ctx.setLoading(!1);
    }
  }
  updateEntries(t) {
    this.areEntriesEqual(this.feedEntries(), t) || this.feedEntriesState.set(t);
  }
  areEntriesEqual(t, i) {
    if (t.length !== i.length)
      return !1;
    for (let e = 0; e < t.length; e += 1) {
      const r = t[e], n = i[e];
      if (r.title !== n.title || r.link !== n.link || r.description !== n.description || r.pubDate !== n.pubDate || r.imageUrl !== n.imageUrl)
        return !1;
    }
    return !0;
  }
  logFeedFetchError(t, i) {
    const e = i && typeof i == "object" ? Object.getOwnPropertyNames(i) : [];
    if (i instanceof Error) {
      console.error("Failed to fetch RSS feed", {
        url: t,
        message: i.message,
        name: i.name,
        stack: i.stack,
        ownProps: e,
        raw: i
      });
      return;
    }
    console.error("Failed to fetch RSS feed", {
      url: t,
      ownProps: e,
      error: i
    });
  }
  buildUserFacingFetchError(t) {
    const i = "Failed to fetch RSS feed", e = t instanceof Error ? t.message : typeof t == "string" ? t : "";
    if (!e)
      return i;
    const r = e.match(/\((\d{3}\s+[^)]+)\)/);
    if (r?.[1])
      return `${i} (${r[1].trim()})`;
    const n = e.match(/\bHTTP\s+(\d{3}(?:\s+[A-Za-z][A-Za-z\s-]*)?)/i);
    return n?.[1] ? `${i} (${n[1].trim()})` : i;
  }
  extractItemImageUrl(t, i) {
    const r = t.querySelector("media\\:content[url], content[url]")?.getAttribute("url")?.trim();
    if (r)
      return r;
    const a = t.querySelector("media\\:thumbnail[url], thumbnail[url]")?.getAttribute("url")?.trim();
    if (a)
      return a;
    const c = t.querySelector("itunes\\:image[href], image[href]")?.getAttribute("href")?.trim();
    if (c)
      return c;
    const l = t.querySelector("enclosure[url][type]"), h = l?.getAttribute("url")?.trim() ?? "", f = l?.getAttribute("type")?.toLowerCase() ?? "";
    if (h && f.startsWith("image/"))
      return h;
    const u = i.match(/<img[^>]+src=["']([^"']+)["']/i);
    return u?.[1] ? u[1] : "";
  }
};
const G = `<div class="rss {{ feedClass() }}">
  {{#if showEntries()}}
    {{#each entries()}}
      <div class="feed-item">
        {{#if this.imageUrl}}
          <div class="image">
            <img src="{{ this.imageUrl }}" alt="Feed Image">
          </div>
        {{/if}}
        <div class="item {{#if this.imageUrl}}has-image{{/if}}">
          <div class="title">{{ this.title }}</div>
        </div>
      </div>
    {{/each}}
  {{/if}}

  {{#if showFetchingState()}}
    <div class="status-view">
      <div class="icon spinner">
        <i class="fas fa-rss"></i>
      </div>
      <div class="message">Loading feed...</div>
    </div>
  {{/if}}

  {{#if showErrorState()}}
    <div class="status-view">
      <div class="icon">
        <i class="fas fa-rss"></i>
      </div>
      <div class="message">{{ errorMessage() }}</div>
    </div>
  {{/if}}
</div>
`, V = ".rss{display:flex;flex-direction:column;align-items:stretch;justify-content:center;width:100%;height:100%;color:var(--color-text);overflow:hidden;font-size:clamp(.5em,var(--host-width) / 35,1em)}.rss.feed-items-1 .feed-item{height:100%}.rss.feed-items-2 .feed-item{height:50%}.rss.feed-items-3 .feed-item{height:33%}.rss.feed-items-4 .feed-item{height:25%}.rss.feed-items-5 .feed-item{height:20%}.rss .feed-item{display:flex;gap:.5em;padding:.25em;min-height:0;overflow:hidden}.rss .image{--forced-item-width: calc(var(--host-width, 300px) / 5);width:var(--forced-item-width);min-width:var(--forced-item-width);max-width:var(--forced-item-width);border-radius:.25em;overflow:hidden;border:max(.15em,5px) solid rgba(255,255,255,.12)}.rss .image img{width:100%;height:100%;object-fit:cover;object-position:center center;display:block}.rss .item{flex:1 1 auto;min-width:0;display:flex;align-items:center;overflow:hidden}.rss .title{font-size:clamp(1em,var(--host-width) / 25,1em);line-height:1.1em;width:100%;overflow:hidden;display:-webkit-box;line-clamp:2;-webkit-line-clamp:2;-webkit-box-orient:vertical}.rss .status-view{display:flex;width:100%;height:100%;flex-direction:column;justify-content:center;align-items:center;gap:.5em;text-align:center}.rss .icon{font-size:clamp(2rem,var(--host-width, 300px) / 8,4rem);opacity:.8}.rss .spinner{animation:rss-spin 1.2s linear infinite}.rss .message{max-width:90%;font-size:1rem;line-height:1.3}@keyframes rss-spin{0%{transform:rotate(0)}to{transform:rotate(360deg)}}", E = H(B, { template: G, styles: V }), Z = E, Q = { DisplayDuckWidget: E, Widget: Z };
export {
  E as DisplayDuckWidget,
  Z as Widget,
  Q as default
};
