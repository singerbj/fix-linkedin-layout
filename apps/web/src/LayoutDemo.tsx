import { useState, type CSSProperties } from 'react';

/** A box in percent of the demo frame. */
interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

type Piece = 'headerInner' | 'left' | 'main' | 'right' | 'messaging';
type Mode = 'before' | 'after';

const HEADER = 9;
const COL_TOP = HEADER + 3;
const COL_H = 100 - COL_TOP;

const LAYOUTS: Record<Mode, Record<Piece, Rect>> = {
  // LinkedIn as shipped: a 1128px-capped centre strip and a floating messaging bubble.
  before: {
    headerInner: { left: 19, top: 0, width: 62, height: HEADER },
    left: { left: 19, top: COL_TOP, width: 13, height: COL_H },
    main: { left: 33.5, top: COL_TOP, width: 30, height: COL_H },
    right: { left: 65, top: COL_TOP, width: 16, height: COL_H },
    messaging: { left: 76, top: 88, width: 22, height: 12 },
  },
  // With the extension: everything shares the window edges, messaging is docked.
  after: {
    headerInner: { left: 1.2, top: 0, width: 97.6, height: HEADER },
    left: { left: 1.2, top: COL_TOP, width: 13, height: COL_H },
    main: { left: 15.7, top: COL_TOP, width: 40.6, height: COL_H },
    right: { left: 57.8, top: COL_TOP, width: 19.5, height: COL_H },
    messaging: { left: 78.8, top: HEADER, width: 20, height: 100 - HEADER },
  },
};

const LABELS: Record<Exclude<Piece, 'headerInner'>, string> = {
  left: 'Profile',
  main: 'Feed',
  right: 'News',
  messaging: 'Messaging',
};

const toStyle = (r: Rect): CSSProperties => ({
  left: `${r.left}%`,
  top: `${r.top}%`,
  width: `${r.width}%`,
  height: `${r.height}%`,
});

export default function LayoutDemo() {
  const [mode, setMode] = useState<Mode>('after');
  const layout = LAYOUTS[mode];

  return (
    <figure className="demo">
      <div className="demo-toggle" role="radiogroup" aria-label="Layout">
        {(['before', 'after'] as const).map((m) => (
          <button
            key={m}
            role="radio"
            aria-checked={mode === m}
            className={mode === m ? 'active' : undefined}
            onClick={() => setMode(m)}
          >
            {m === 'before' ? 'Before' : 'After'}
          </button>
        ))}
      </div>

      <div className="browser">
        <div className="browser-bar" aria-hidden="true">
          <span />
          <span />
          <span />
          <div className="browser-url">linkedin.com/feed</div>
        </div>
        <div className={`frame frame-${mode}`} aria-hidden="true">
          <div className="frame-header" />
          <div className="piece header-inner" style={toStyle(layout.headerInner)}>
            <i className="logo" />
            <i className="search" />
            <i className="nav" />
          </div>
          {(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((p) => (
            <div key={p} className={`piece col col-${p}`} style={toStyle(layout[p])}>
              <b>{LABELS[p]}</b>
              <i />
              <i />
              <i className="short" />
            </div>
          ))}
        </div>
      </div>
      <figcaption>
        {mode === 'before'
          ? 'Stock LinkedIn: a narrow centre strip, empty margins, messaging floating over the page.'
          : 'With the extension: every column shares the window edges and messaging is docked on the right.'}
      </figcaption>
    </figure>
  );
}
