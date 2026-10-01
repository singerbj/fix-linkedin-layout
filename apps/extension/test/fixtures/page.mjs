// Mock LinkedIn feed pages that reproduce the broken layout from the
// screenshots: a 1128px-capped header/body and a floating messaging overlay.
// `legacy` uses LinkedIn's long-standing class names; `hashed` uses random
// class names, a different DOM order and no ids, to exercise the heuristics.

const lorem = (n) => 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(n);

const posts = (n) =>
  Array.from(
    { length: n },
    (_, i) => `<div class="card post" style="padding:12px"><b>Author ${i}</b><p>${lorem(4)}</p>
      <div class="media" style="height:300px;background:#cde"></div></div>`,
  ).join('');

const conversations = Array.from({ length: 30 }, (_, i) => `<li style="height:70px">Person ${i}</li>`).join('');

const baseCss = `
  body { margin:0; font:14px system-ui; background:#f4f2ee; }
  .card { background:#fff; border:1px solid #ddd; border-radius:8px; margin-bottom:8px; }
  ul { list-style:none; margin:0; padding:0; }
  .content { display:flex; flex-direction:column; height:calc(100% - 48px); }
  .minimized .content { display:none; }
`;

const headerHtml = (cls) => `
  <header ${cls.header}>
    <div ${cls.headerInner}>
      <a href="https://www.linkedin.com/feed/" class="logo" style="width:34px;height:34px;background:#0a66c2;display:block"></a>
      <input placeholder="I'm looking for…" style="width:280px;margin-left:12px" />
      <nav style="display:flex;gap:20px;margin:0 auto">
        <a href="/feed/">Home</a><a href="/mynetwork/">My Network</a><a href="/jobs/">Jobs</a>
        <a href="/messaging/"><span>Messaging</span></a><a href="/notifications/">Notifications</a>
      </nav>
      <button>Me</button><a href="/business/" style="margin-left:20px">For Business</a>
    </div>
  </header>`;

const rails = {
  left: `<div class="card" style="height:240px">Benjamin Singer</div><div class="card" style="height:160px">Analytics</div>`,
  right: `<div class="card" style="height:320px">LinkedIn News</div><div class="card" style="height:280px">Today's puzzles</div>`,
  main: (title) =>
    `<div class="card share" style="height:110px">Start a post — ${title}</div><div class="feed">${posts(8)}</div>`,
};

function messaging(cls) {
  return `
  <div ${cls.msgRoot}>
    <div ${cls.msgList}>
      <div ${cls.msgHeader}>
        <span class="avatar" style="width:32px;height:32px;border-radius:50%;background:#999"></span>
        <h2 style="font-size:14px;margin:0 8px">Messaging</h2>
        <button aria-label="Open messenger dropdown menu" onclick="window.__menuOpened = true">…</button>
        <button class="toggle" aria-label="You are on the messaging overlay. Press enter to open the list of conversations." onclick="event.stopPropagation(); window.__toggleMsg()">^</button>
      </div>
      <div class="content">
        <input placeholder="Search messages" style="margin:8px" />
        <div class="tabs" style="height:40px">Focused | Other</div>
        <div class="conv-scroll" style="overflow-y:auto;flex:1">
          <ul>${conversations}</ul>
        </div>
      </div>
    </div>
  </div>`;
}

const toggleScript = (listSel, minimizedClass) => `
  <script>
    window.__toggleMsg = () => {
      const l = document.querySelector('${listSel}');
      l.classList.toggle('${minimizedClass}');
      l.classList.toggle('minimized');
    };
    window.__openConversation = () => {
      const b = document.createElement('div');
      b.className = 'conversation-bubble';
      b.style.cssText = 'width:336px;height:400px;background:#fff;border:1px solid #999;margin-right:8px';
      b.textContent = 'Conversation with Erick';
      document.querySelector('${listSel}').parentElement.appendChild(b);
    };
  </script>`;

export function legacyPage(title = 'feed') {
  const cls = {
    header: 'id="global-nav" class="global-nav" style="position:fixed;top:0;left:0;width:100%;height:52px;background:#fff;z-index:10"',
    headerInner:
      'class="global-nav__content" style="max-width:1128px;margin:0 auto;padding:0 24px;height:52px;display:flex;align-items:center"',
    msgRoot:
      'id="msg-overlay" class="msg-overlay-container" style="position:fixed;bottom:0;right:0;display:flex;flex-direction:row-reverse;align-items:flex-end;z-index:20"',
    msgList:
      'class="msg-overlay-list-bubble msg-overlay-list-bubble--is-minimized minimized" style="width:288px;height:calc(100vh - 100px);background:#fff;border:1px solid #ccc;margin-right:20px"',
    msgHeader:
      'class="msg-overlay-bubble-header" style="height:48px;display:flex;align-items:center" onclick="window.__toggleMsg()"',
  };
  return `<!doctype html><html><head><style>${baseCss}
    .msg-overlay-list-bubble--is-minimized { height:48px !important; }
    .scaffold-layout__row { display:grid; grid-template-columns:225px 555px 300px; column-gap:24px; grid-template-areas:'sidebar main aside'; }
    .scaffold-layout__sidebar { grid-area:sidebar } .scaffold-layout__main { grid-area:main } .scaffold-layout__aside { grid-area:aside }
  </style></head><body>
  ${headerHtml(cls)}
  <div class="application-outlet"><div class="authentication-outlet">
    <div class="scaffold-layout" style="padding-top:75px">
      <div class="scaffold-layout__inner" style="max-width:1128px;margin:0 auto;padding:0 24px">
        <div class="scaffold-layout__row">
          <aside class="scaffold-layout__sidebar">${rails.left}</aside>
          <main id="main" class="scaffold-layout__main">${rails.main(title)}</main>
          <aside class="scaffold-layout__aside">${rails.right}</aside>
        </div>
      </div>
    </div>
  </div>
  ${messaging(cls)}
  </div>
  ${toggleScript('.msg-overlay-list-bubble', 'msg-overlay-list-bubble--is-minimized')}
  </body></html>`;
}

export function hashedPage(title = 'feed') {
  const cls = {
    header: 'class="_h7x" style="position:fixed;top:0;left:0;right:0;height:52px;background:#fff;z-index:10"',
    headerInner: 'class="_q2a" style="width:1080px;margin:0 auto;height:52px;display:flex;align-items:center"',
    msgRoot:
      'class="_m91" style="position:fixed;bottom:0;right:0;display:flex;flex-direction:row-reverse;align-items:flex-end;z-index:20"',
    msgList: 'class="_b44 _min minimized" style="width:288px;height:calc(100vh - 100px);background:#fff;margin-right:20px"',
    msgHeader: 'class="_k0" style="height:48px;display:flex;align-items:center"',
  };
  // Main column comes first in the DOM; grid areas place it in the middle.
  return `<!doctype html><html><head><style>${baseCss}
    ._min { height:48px !important; }
    ._r1 { display:grid; grid-template-columns:225px 555px 300px; column-gap:24px; grid-template-areas:'l m r'; }
    ._c1 { grid-area:m } ._c2 { grid-area:l } ._c3 { grid-area:r }
    ._c1 .feed { max-width:555px; margin:0 auto }
  </style></head><body>
  ${headerHtml(cls)}
  <div class="_a0"><main class="_x9" style="padding-top:75px">
    <div class="_w1" style="width:1128px;margin:0 auto">
      <div class="_r1">
        <div class="_c1">${rails.main(title)}</div>
        <div class="_c2">${rails.left}</div>
        <div class="_c3">${rails.right}</div>
      </div>
    </div>
  </main></div>
  ${messaging(cls)}
  ${toggleScript('._b44', '_min')}
  </body></html>`;
}
