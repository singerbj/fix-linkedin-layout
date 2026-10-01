/**
 * Fix LinkedIn Layout — content script.
 *
 * LinkedIn ships obfuscated, frequently-changing class names, so this script
 * finds the page's structural pieces (header, column row, messaging panel)
 * using a mix of known selectors and geometry, then tags them with
 * `data-fll-*` attributes. All styling lives in content.css and only targets
 * those attributes, so nothing changes until an element has been identified.
 *
 * A MutationObserver re-runs detection (throttled) so the layout stays fixed
 * across SPA navigation, lazy-loaded rails and messaging re-renders.
 */
import { DEFAULTS, loadSettings, type Settings } from './settings';

const ROOT = document.documentElement;
const MESSAGING_TITLE = 'Messaging';

/** Every attribute this script sets, so it can clean up after itself. */
const TAGS = [
  'data-fll-widen',
  'data-fll-header',
  'data-fll-header-inner',
  'data-fll-row',
  'data-fll-col',
  'data-fll-col-i',
  'data-fll-msg',
  'data-fll-msg-list',
  'data-fll-msg-flex',
  'data-fll-msg-scroll',
] as const;
type Tag = (typeof TAGS)[number];

const HEADER_SELECTORS = ['#global-nav', 'header.global-nav', 'header[role="banner"]', '[role="banner"]', 'header'];
const MAIN_ANCHORS = [
  '.scaffold-layout__main',
  '[data-testid="mainFeed"]',
  '.scaffold-finite-scroll',
  'main',
  '[role="main"]',
];
const MSG_ROOT_SELECTORS = ['#msg-overlay', '.msg-overlay-container', '[data-testid="msg-overlay"]'];
const MSG_LIST_SELECTORS = ['.msg-overlay-list-bubble'];

interface State {
  header?: HTMLElement;
  headerInner?: HTMLElement;
  row?: HTMLElement;
  msgRoot?: HTMLElement;
  msgList?: HTMLElement;
  docked: boolean;
}

let settings: Settings = { ...DEFAULTS };
let state: State = { docked: false };
let lastUrl = '';
let autoOpenAttempts = 0;
let userCollapsedMessaging = false;
let lastMsgPointer = 0;
let wasMinimized: boolean | undefined;
let nextRowSearch = 0;
const msgObserver = new MutationObserver(() => schedule());

// ---------------------------------------------------------------------------
// DOM helpers

function tag(el: Element, name: Tag, value = ''): void {
  if (el.getAttribute(name) !== value) el.setAttribute(name, value);
}

function untagAll(name?: Tag): void {
  const names = name ? [name] : TAGS;
  for (const n of names) {
    for (const el of document.querySelectorAll(`[${n}]`)) el.removeAttribute(n);
  }
}

function viewportWidth(): number {
  return document.documentElement.clientWidth || window.innerWidth;
}

function isRendered(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return false;
  const cs = getComputedStyle(el);
  return cs.display !== 'none' && cs.visibility !== 'hidden';
}

/** Visible children that participate in normal layout (not fixed/absolute). */
function flowChildren(el: Element): HTMLElement[] {
  return [...el.children].filter((c): c is HTMLElement => {
    if (!isRendered(c)) return false;
    const pos = getComputedStyle(c).position;
    return pos !== 'fixed' && pos !== 'absolute';
  });
}

/** True when `el` lays out at least two substantial children side by side. */
function isColumnRow(el: Element): boolean {
  if (!(el instanceof HTMLElement) || el === document.body) return false;
  const kids = flowChildren(el).filter((c) => {
    const r = c.getBoundingClientRect();
    return r.width >= 150 && r.height >= 40;
  });
  if (kids.length < 2) return false;
  const rects = kids.map((k) => k.getBoundingClientRect()).sort((a, b) => a.left - b.left);
  for (let i = 1; i < rects.length; i++) {
    const a = rects[i - 1];
    const b = rects[i];
    if (b.left < a.right - 2) return false; // overlapping → stacked, not columns
    if (b.top >= a.bottom || a.top >= b.bottom) return false; // no vertical overlap
  }
  const widest = Math.max(...rects.map((r) => r.width));
  const span = rects[rects.length - 1].right - rects[0].left;
  return widest >= 380 && span >= 700;
}

function firstVisible(selectors: string[], root: ParentNode = document): HTMLElement | undefined {
  for (const sel of selectors) {
    for (const el of root.querySelectorAll(sel)) if (isRendered(el)) return el;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Header

function findHeader(): HTMLElement | undefined {
  const vw = viewportWidth();
  for (const sel of HEADER_SELECTORS) {
    for (const el of document.querySelectorAll(sel)) {
      if (!isRendered(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.top <= 8 && r.width >= vw * 0.9 && r.height <= 120) return el;
    }
  }
  return undefined;
}

/**
 * The header's content container: descend from the header while a single
 * child still contains every visible control, stopping where they split.
 */
function findHeaderInner(header: HTMLElement): HTMLElement {
  const hr = header.getBoundingClientRect();
  const controls = [...header.querySelectorAll('a, button, input, [role="button"]')].filter((c) => {
    const r = c.getBoundingClientRect();
    return r.width > 2 && r.height > 2 && r.bottom > hr.top && r.top < hr.bottom;
  });
  let cur: HTMLElement = header;
  if (controls.length < 2) return cur;
  for (;;) {
    const holders = [...cur.children].filter((c) => controls.some((x) => c.contains(x)));
    if (holders.length !== 1) return cur;
    const only = holders[0];
    if (!(only instanceof HTMLElement) || !controls.every((x) => only.contains(x))) return cur;
    cur = only;
  }
}

function applyHeader(): void {
  const { header, headerInner } = state;
  if (header?.isConnected && headerInner?.isConnected && header.hasAttribute('data-fll-header')) {
    tag(header, 'data-fll-header', getComputedStyle(header).position === 'fixed' ? 'fixed' : 'flow');
    return;
  }
  untagAll('data-fll-header');
  untagAll('data-fll-header-inner');
  const h = findHeader();
  state.header = h;
  state.headerInner = undefined;
  if (!h) return;
  const inner = findHeaderInner(h);
  state.headerInner = inner;
  tag(h, 'data-fll-header', getComputedStyle(h).position === 'fixed' ? 'fixed' : 'flow');
  tag(inner, 'data-fll-header-inner');
  for (let el = inner.parentElement; el && el !== h; el = el.parentElement) tag(el, 'data-fll-widen', 'outer');
}

// ---------------------------------------------------------------------------
// Column row

function findRow(): { row: HTMLElement; anchor: HTMLElement } | undefined {
  for (const sel of MAIN_ANCHORS) {
    for (const anchor of document.querySelectorAll(sel)) {
      if (!isRendered(anchor) || state.header?.contains(anchor)) continue;
      // Walk up: the first ancestor that lays out columns side by side.
      for (let el = anchor.parentElement; el && el !== document.body; el = el.parentElement) {
        if (isColumnRow(el)) return { row: el, anchor };
      }
      // `main` may wrap all columns: look a few levels down instead.
      const queue: Array<[Element, number]> = [[anchor, 0]];
      while (queue.length) {
        const [el, depth] = queue.shift()!;
        if (isColumnRow(el)) return { row: el as HTMLElement, anchor: el as HTMLElement };
        if (depth < 6) for (const c of el.children) queue.push([c, depth + 1]);
      }
    }
  }
  return undefined;
}

/** Index of the main column: the one holding the anchor, else the widest. */
function mainIndex(cols: HTMLElement[], anchor: HTMLElement): number {
  const byAnchor = cols.findIndex((c) => c.contains(anchor));
  if (byAnchor >= 0) return byAnchor;
  let best = 0;
  cols.forEach((c, i) => {
    if (c.getBoundingClientRect().width > cols[best].getBoundingClientRect().width) best = i;
  });
  return best;
}

function rowNeedsRetag(row: HTMLElement): boolean {
  if (!row.isConnected || !row.hasAttribute('data-fll-row')) return true;
  const cols = flowChildren(row);
  return cols.length < 2 || cols.some((c) => !c.hasAttribute('data-fll-col'));
}

function applyRow(): void {
  if (state.row && !rowNeedsRetag(state.row)) {
    stretchColumns(state.row);
    return;
  }
  for (const t of ['data-fll-row', 'data-fll-col', 'data-fll-col-i'] as const) untagAll(t);
  for (const el of document.querySelectorAll('[data-fll-widen]')) {
    if (!state.header?.contains(el)) el.removeAttribute('data-fll-widen');
  }
  state.row = undefined;

  if (Date.now() < nextRowSearch) return;
  const found = findRow();
  if (!found) {
    nextRowSearch = Date.now() + 1000; // pages without columns: don't rescan constantly
    return;
  }
  const { row, anchor } = found;
  // Order columns visually, not by DOM order (LinkedIn uses grid-areas).
  const cols = flowChildren(row).sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
  const mi = mainIndex(cols, anchor);
  const template = cols.map((_, i) => (i === mi ? 'minmax(0, 1fr)' : 'var(--fll-side)')).join(' ');

  state.row = row;
  tag(row, 'data-fll-row');
  row.style.setProperty('--fll-cols', template);
  cols.forEach((c, i) => {
    tag(c, 'data-fll-col', i === mi ? 'main' : i < mi ? 'left' : 'right');
    tag(c, 'data-fll-col-i', String(i + 1));
  });
  for (let el = row.parentElement; el && el !== document.body; el = el.parentElement) tag(el, 'data-fll-widen', 'outer');
  stretchColumns(row);
}

const BLOCKISH = new Set(['block', 'flow-root', 'flex', 'grid', 'list-item']);
const REPLACED = new Set(['IMG', 'VIDEO', 'CANVAS', 'SVG', 'IFRAME', 'PICTURE', 'svg']);

/**
 * Inside each column, widen wrappers that LinkedIn sized for its old fixed
 * column widths (e.g. a 555px feed inside a now-wider main column).
 */
function stretchColumns(row: HTMLElement): void {
  for (const col of row.querySelectorAll<HTMLElement>(':scope > [data-fll-col]')) stretchWithin(col, 0);
}

function stretchWithin(parent: HTMLElement, depth: number): void {
  if (depth >= 3) return;
  const pcs = getComputedStyle(parent);
  const stacks =
    pcs.display === 'block' ||
    pcs.display === 'flow-root' ||
    pcs.display === 'list-item' ||
    (pcs.display.includes('flex') && pcs.flexDirection.startsWith('column'));
  const inner = parent.clientWidth - parseFloat(pcs.paddingLeft) - parseFloat(pcs.paddingRight);
  for (const child of flowChildren(parent)) {
    if (REPLACED.has(child.tagName)) continue;
    const display = getComputedStyle(child).display;
    if (!BLOCKISH.has(display)) continue;
    const w = child.getBoundingClientRect().width;
    if (stacks && w < inner - 2 && w >= inner * 0.5) tag(child, 'data-fll-widen', 'inner');
    if (w >= inner * 0.9) stretchWithin(child, depth + 1);
  }
}

// ---------------------------------------------------------------------------
// Messaging

function outermostFixedAncestor(el: Element): HTMLElement | undefined {
  let found: HTMLElement | undefined;
  for (let cur: Element | null = el; cur && cur !== document.body; cur = cur.parentElement) {
    if (cur instanceof HTMLElement && getComputedStyle(cur).position === 'fixed') found = cur;
  }
  return found;
}

function findMessaging(): { root: HTMLElement; list: HTMLElement } | undefined {
  // 1. Known (legacy) class names.
  // (The root may have zero size once its list bubble is docked/fixed.)
  const knownRoot = MSG_ROOT_SELECTORS.map((sel) => document.querySelector<HTMLElement>(sel)).find(
    (el) => el && getComputedStyle(el).display !== 'none',
  );
  if (knownRoot) {
    const list = firstVisible(MSG_LIST_SELECTORS, knownRoot);
    if (list) return { root: knownRoot, list };
  }

  // 2. Structure: a "Messaging" title inside a fixed panel docked to the
  //    bottom-right of the viewport (excludes the nav item in the header).
  const vw = viewportWidth();
  const vh = window.innerHeight;
  const titles = document.evaluate(
    `//body//*[normalize-space(text())='${MESSAGING_TITLE}']`,
    document,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null,
  );
  for (let i = 0; i < titles.snapshotLength; i++) {
    const title = titles.snapshotItem(i) as Element;
    if (state.header?.contains(title) || !isRendered(title)) continue;
    const root = outermostFixedAncestor(title);
    if (!root) continue;
    // Our own docking moves the panel, so only check position on first sight.
    const r = root.getBoundingClientRect();
    if (root !== state.msgRoot && (r.bottom < vh - 4 || r.right < vw - 80 || r.top < 40)) continue;
    const list = pickListBubble(root, title);
    return { root, list };
  }
  return undefined;
}

/**
 * Inside the panel, descend through wrapper elements. If what remains
 * are bubbles side by side (open conversations + the list), the list is the
 * one holding the title; if they are stacked, we are already in the list.
 */
function pickListBubble(root: HTMLElement, title: Element): HTMLElement {
  let c: HTMLElement = root;
  // Only pure wrappers: a bubble whose content is hidden (minimized) still has
  // several element children and must not be descended into.
  while (c.children.length === 1 && isRendered(c.children[0])) c = c.children[0] as HTMLElement;
  const kids = [...c.children].filter(isRendered);
  const holder = kids.find((k) => k.contains(title));
  if (!holder || kids.length < 2) return c;
  const rects = kids.map((k) => k.getBoundingClientRect()).sort((a, b) => a.left - b.left);
  const sideBySide = rects.every((r, i) => i === 0 || r.left >= rects[i - 1].right - 2);
  return sideBySide ? holder : c;
}

function isMinimized(list: HTMLElement): boolean {
  if (list.className.toString().includes('is-minimized')) return true;
  // When docked we force the height, so check the content instead.
  if (list.hasAttribute('data-fll-msg-list') && state.docked) {
    const scroll = list.querySelector('[data-fll-msg-scroll]');
    if (scroll) return !isRendered(scroll);
  }
  return list.getBoundingClientRect().height < 120;
}

/** Find the scrolling conversation list and make it fill the docked panel. */
function tagMessagingScroller(list: HTMLElement): void {
  if (list.querySelector('[data-fll-msg-scroll]')) return;
  let best: HTMLElement | undefined;
  let bestArea = 0;
  for (const el of list.querySelectorAll<HTMLElement>('*')) {
    const oy = getComputedStyle(el).overflowY;
    if (oy !== 'auto' && oy !== 'scroll') continue;
    const r = el.getBoundingClientRect();
    if (r.width * r.height > bestArea) {
      best = el;
      bestArea = r.width * r.height;
    }
  }
  if (!best) return;
  tag(best, 'data-fll-msg-scroll');
  for (let el = best.parentElement; el && el !== list; el = el.parentElement) {
    tag(el, 'data-fll-msg-flex', getComputedStyle(el).display.includes('flex') ? 'flex' : 'block');
  }
}

function findMessagingToggle(list: HTMLElement): HTMLElement | undefined {
  const header = list.querySelector<HTMLElement>('.msg-overlay-bubble-header');
  const buttons = [...list.querySelectorAll<HTMLElement>('button, [role="button"]')];
  const labelled = buttons.find((b) => {
    const label = `${b.getAttribute('aria-label') ?? ''} ${b.title}`;
    return (
      /(open|expand|maximi[sz]e|show).*(messag|conversation|list)|messaging overlay/i.test(label) &&
      !/menu|dropdown|option|setting|compose|new message|write/i.test(label)
    );
  });
  if (labelled) return labelled;
  if (header) return header;
  const title = [...list.querySelectorAll<HTMLElement>('*')].find(
    (el) => el.children.length === 0 && el.textContent?.trim() === MESSAGING_TITLE,
  );
  return title?.closest<HTMLElement>('button, [role="button"], header') ?? title;
}

function applyMessaging(vw: number): void {
  const found = findMessaging();
  if (!found) {
    if (state.msgList) untagAll('data-fll-msg-list');
    if (state.msgRoot) untagAll('data-fll-msg');
    state.msgRoot = state.msgList = undefined;
    setDocked(false);
    return;
  }
  const { root, list } = found;
  if (state.msgList !== list) {
    for (const t of ['data-fll-msg', 'data-fll-msg-list', 'data-fll-msg-flex', 'data-fll-msg-scroll'] as const) {
      untagAll(t);
    }
    state.msgRoot = root;
    state.msgList = list;
    wasMinimized = undefined;
    list.addEventListener('pointerdown', (e) => {
      if (e.isTrusted) lastMsgPointer = Date.now();
    });
    // Minimize/expand often only flips a class, which the body observer ignores.
    msgObserver.disconnect();
    msgObserver.observe(list, {
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-expanded'],
      childList: true,
      subtree: true,
    });
  }
  if (root !== list) tag(root, 'data-fll-msg');

  const wantDock = settings.dockMessaging && vw >= settings.dockMinWidth;
  const minimized = isMinimized(list);

  // A minimize right after the user clicked the panel is deliberate: respect it.
  if (minimized && wasMinimized === false && Date.now() - lastMsgPointer < 2000) userCollapsedMessaging = true;
  if (!minimized) userCollapsedMessaging = false;
  wasMinimized = minimized;

  if (wantDock && minimized && settings.autoOpenMessaging && !userCollapsedMessaging && autoOpenAttempts < 3) {
    autoOpenAttempts++;
    findMessagingToggle(list)?.click();
    schedule(400);
  }

  const dock = wantDock && !minimized;
  if (dock) {
    tag(list, 'data-fll-msg-list');
    tagMessagingScroller(list);
  } else {
    list.removeAttribute('data-fll-msg-list');
  }
  setDocked(dock);
}

function setDocked(docked: boolean): void {
  state.docked = docked;
  ROOT.classList.toggle('fll-docked', docked);
}

// ---------------------------------------------------------------------------
// Main loop

function reset(): void {
  untagAll();
  state.row?.style.removeProperty('--fll-cols');
  state = { docked: false };
  ROOT.classList.remove('fll-active', 'fll-docked');
}

function apply(): void {
  const vw = viewportWidth();
  ROOT.classList.toggle('fll-debug', settings.debug);
  if (!settings.enabled || vw < settings.minWidth) {
    if (ROOT.classList.contains('fll-active')) reset();
    return;
  }
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    autoOpenAttempts = 0;
    state.row = undefined; // force a fresh column scan on navigation
    nextRowSearch = 0;
  }
  ROOT.classList.add('fll-active');
  applyHeader();
  applyRow();
  applyMessaging(vw);
  if (state.header) {
    ROOT.style.setProperty('--fll-header-h', `${Math.round(state.header.getBoundingClientRect().height)}px`);
  }
}

let timer: number | undefined;
let lastRun = 0;
const THROTTLE_MS = 200;

function schedule(delay?: number): void {
  if (timer !== undefined) return;
  const wait = delay ?? Math.max(0, THROTTLE_MS - (Date.now() - lastRun));
  timer = window.setTimeout(() => {
    timer = undefined;
    lastRun = Date.now();
    try {
      apply();
    } catch (err) {
      console.warn('[fix-linkedin-layout]', err);
    }
  }, wait);
}

// ---------------------------------------------------------------------------
// Diagnostics (popup "Copy diagnostics" button)

function describe(el: Element | undefined): unknown {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const attrs: Record<string, string> = {};
  for (const a of el.attributes) if (a.name !== 'style' && a.name !== 'class') attrs[a.name] = a.value.slice(0, 80);
  return {
    tag: el.tagName.toLowerCase(),
    id: el.id || undefined,
    class: el.className.toString().slice(0, 160) || undefined,
    attrs,
    rect: [r.left, r.top, r.width, r.height].map(Math.round),
    position: getComputedStyle(el).position,
    display: getComputedStyle(el).display,
  };
}

function ancestry(el: Element | undefined, depth = 8): unknown[] {
  const out: unknown[] = [];
  for (let cur = el?.parentElement; cur && cur !== document.body && out.length < depth; cur = cur.parentElement) {
    out.push(describe(cur));
  }
  return out;
}

function diagnostics(): unknown {
  const anchors = MAIN_ANCHORS.map((s) => ({ selector: s, count: document.querySelectorAll(s).length }));
  const fixed = [...document.querySelectorAll('body *')]
    .filter((el) => getComputedStyle(el).position === 'fixed' && isRendered(el))
    .slice(0, 20)
    .map(describe);
  return {
    url: location.href,
    viewport: [viewportWidth(), window.innerHeight],
    settings,
    classes: ROOT.className,
    header: describe(state.header),
    headerInner: describe(state.headerInner),
    row: describe(state.row),
    rowAncestry: ancestry(state.row),
    columns: state.row ? [...state.row.children].map(describe) : [],
    anchors,
    msgRoot: describe(state.msgRoot),
    msgList: describe(state.msgList),
    docked: state.docked,
    fixedElements: fixed,
  };
}

// ---------------------------------------------------------------------------
// Boot

async function init(): Promise<void> {
  settings = await loadSettings();
  chrome.storage.onChanged.addListener(async (_changes, area) => {
    if (area !== 'sync') return;
    settings = await loadSettings();
    reset();
    autoOpenAttempts = 0;
    schedule(0);
  });
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'fll:diagnostics') sendResponse(diagnostics());
  });

  new MutationObserver(() => schedule()).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('resize', () => schedule());
  window.addEventListener('popstate', () => schedule());
  schedule(0);
  // LinkedIn hydrates in waves; make sure late layout shifts get picked up.
  for (const ms of [500, 1500, 3000, 6000]) setTimeout(() => schedule(), ms);
}

void init();
