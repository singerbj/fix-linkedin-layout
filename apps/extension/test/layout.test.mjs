import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { legacyPage, hashedPage } from './fixtures/page.mjs';

const EXT = resolve('dist');
let context;

before(async () => {
  context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'fll-')), {
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  });
});
after(() => context?.close());

async function open(variant, width, height = 1120) {
  const page = await context.newPage();
  await page.setViewportSize({ width, height });
  await page.route('https://www.linkedin.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: variant(new URL(route.request().url()).pathname) }),
  );
  await page.goto('https://www.linkedin.com/feed/');
  return page;
}

/** Geometry of the pieces we care about, in viewport px. */
function measure(page) {
  return page.evaluate(() => {
    const r = (el) => el && el.getBoundingClientRect().toJSON();
    const cols = [...document.querySelectorAll('[data-fll-col]')]
      .map((el) => ({ kind: el.getAttribute('data-fll-col'), ...r(el) }))
      .sort((a, b) => a.left - b.left);
    return {
      vw: document.documentElement.clientWidth,
      classes: document.documentElement.className,
      logo: r(document.querySelector('a.logo')),
      headerInner: r(document.querySelector('[data-fll-header-inner]')),
      lastNavItem: r(document.querySelector('a[href="/business/"]')),
      cols,
      feed: r(document.querySelector('.feed')),
      msg: r(document.querySelector('[data-fll-msg-list]')),
      convScroll: r(document.querySelector('.conv-scroll')),
      bubble: r(document.querySelector('.conversation-bubble')),
      menuOpened: !!window.__menuOpened,
    };
  });
}

const near = (a, b, msg, tol = 1.5) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

function assertAligned(m, { docked }) {
  assert.match(m.classes, /fll-active/);
  assert.equal(m.cols.length, 3);
  assert.deepEqual(m.cols.map((c) => c.kind), ['left', 'main', 'right']);
  const [left, main, right] = m.cols;
  near(left.left, 20, 'left column starts at gutter');
  near(main.left - left.right, 24, 'gap left|main');
  near(right.left - main.right, 24, 'gap main|right');
  near(m.headerInner.left + 20, left.left, 'header and columns share left edge');
  near(m.lastNavItem.right, right.right, 'header content ends where right rail ends');
  near(m.logo.left, left.left, 'logo aligns with left column');
  near(m.feed.width, main.width, 'feed fills main column', 3);
  if (docked) {
    assert.match(m.classes, /fll-docked/);
    near(m.msg.right, m.vw - 20, 'dock at right gutter');
    near(m.msg.left - right.right, 24, 'gap right rail|dock');
    near(m.msg.top, right.top, 'dock top aligns with columns', 2);
    near(m.msg.bottom, 1120, 'dock is full height');
    assert.ok(m.convScroll.height > 600, `conversation list fills dock (${m.convScroll.height})`);
  } else {
    assert.doesNotMatch(m.classes, /fll-docked/);
    near(right.right, m.vw - 20, 'right rail ends at gutter');
  }
}

for (const [name, variant] of [
  ['legacy', legacyPage],
  ['hashed', hashedPage],
]) {
  test(`${name}: wide screen docks messaging and aligns everything`, async () => {
    const page = await open(variant, 2000);
    await page.waitForFunction(() => document.documentElement.classList.contains('fll-docked'), null, { timeout: 5000 });
    await page.waitForTimeout(300);
    const m = await measure(page);
    assertAligned(m, { docked: true });
    assert.equal(m.menuOpened, false, 'did not click the "…" menu button');
    await page.screenshot({ path: `test/out-${name}-2000.png` });
    await page.close();
  });

  test(`${name}: medium screen is full-width without dock`, async () => {
    const page = await open(variant, 1400);
    await page.waitForFunction(() => document.querySelector('[data-fll-col]'), null, { timeout: 5000 });
    await page.waitForTimeout(300);
    assertAligned(await measure(page), { docked: false });
    await page.close();
  });

  test(`${name}: narrow screen is left alone`, async () => {
    const page = await open(variant, 1100);
    await page.waitForTimeout(800);
    const m = await measure(page);
    assert.doesNotMatch(m.classes, /fll-active/);
    assert.equal(m.cols.length, 0);
    await page.close();
  });

  test(`${name}: survives SPA re-render, resize, conversations and user minimize`, async () => {
    const page = await open(variant, 2000);
    await page.waitForFunction(() => document.documentElement.classList.contains('fll-docked'), null, { timeout: 5000 });

    // SPA navigation that re-renders the whole column row.
    await page.evaluate(() => {
      const row = document.querySelector('[data-fll-row]');
      const clone = row.cloneNode(true);
      for (const el of [clone, ...clone.querySelectorAll('*')]) {
        for (const a of [...el.attributes]) if (a.name.startsWith('data-fll')) el.removeAttribute(a.name);
      }
      clone.style.removeProperty('--fll-cols');
      row.replaceWith(clone);
      history.pushState({}, '', '/feed/?nav=1');
    });
    await page.waitForTimeout(600);
    assertAligned(await measure(page), { docked: true });

    // Resize down and back up.
    await page.setViewportSize({ width: 1400, height: 1120 });
    await page.waitForTimeout(500);
    assertAligned(await measure(page), { docked: false });
    await page.setViewportSize({ width: 2000, height: 1120 });
    await page.waitForTimeout(500);
    assertAligned(await measure(page), { docked: true });

    // Opening a conversation keeps the dock and puts the bubble to its left.
    await page.evaluate(() => window.__openConversation());
    await page.waitForTimeout(500);
    let m = await measure(page);
    assertAligned(m, { docked: true });
    assert.ok(m.bubble.right <= m.msg.left, `bubble left of dock (${m.bubble.right} <= ${m.msg.left})`);

    // A user minimizing messaging is respected (not re-opened) and the layout reflows.
    await page.click('button.toggle');
    await page.waitForTimeout(1500);
    m = await measure(page);
    assert.doesNotMatch(m.classes, /fll-docked/);
    assert.equal(m.cols.length, 3);
    near(m.cols[2].right, m.vw - 20, 'right rail reclaims dock space');
    await page.close();
  });
}
