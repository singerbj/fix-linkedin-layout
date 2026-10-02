import LayoutDemo from './LayoutDemo';
import {
  BUILD_FROM_SOURCE,
  DOWNLOAD_URL,
  EXTENSION_VERSION,
  FEATURES,
  INSTALL_STEPS,
  REPO_URL,
  SETTINGS,
  UPDATE_NOTE,
} from './content';

export default function App() {
  return (
    <>
      <header className="site-header">
        <div className="wrap site-header-inner">
          <a className="brand" href="#top">
            <img src="./icon.png" alt="" width={28} height={28} />
            Fix LinkedIn Layout
          </a>
          <nav>
            <a href="#features">Features</a>
            <a href="#install">Install</a>
            <a href={REPO_URL}>GitHub</a>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="hero wrap">
          <p className="eyebrow">Free &amp; open-source Chrome extension</p>
          <h1>
            LinkedIn, using your <em>whole</em> screen.
          </h1>
          <p className="lede">
            Full-width, aligned columns and messaging docked as a permanent sidebar. No more narrow centre strip
            surrounded by empty space.
          </p>
          <div className="cta">
            <a className="button primary" href={DOWNLOAD_URL} download>
              Download v{EXTENSION_VERSION}
            </a>
            <a className="button" href="#install">
              How to install
            </a>
            <a className="button" href={REPO_URL}>
              View source
            </a>
          </div>
          <LayoutDemo />
        </section>

        <section id="features" className="wrap">
          <h2>What it does</h2>
          <div className="grid">
            {FEATURES.map((f) => (
              <article key={f.title} className="card">
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="install" className="wrap">
          <h2>Install</h2>
          <p className="section-lede">
            The extension isn't on the Chrome Web Store, so it's installed in Developer mode. The download is built from
            the latest code on <code>main</code>.
          </p>
          <ol className="steps">
            {INSTALL_STEPS.map((s, i) => (
              <li key={s.title} className="card">
                <span className="step-num">{i + 1}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                  {i === 0 && (
                    <a className="button primary step-action" href={DOWNLOAD_URL} download>
                      Download v{EXTENSION_VERSION}
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <p className="section-lede install-note">{UPDATE_NOTE}</p>
          <details className="card build-source">
            <summary>Prefer to build it yourself?</summary>
            <pre>
              <code>{BUILD_FROM_SOURCE}</code>
            </pre>
          </details>
        </section>

        <section id="settings" className="wrap">
          <h2>Settings</h2>
          <p className="section-lede">Click the toolbar icon to change any of these. They sync across your Chrome profile.</p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Setting</th>
                  <th>Default</th>
                  <th>What it does</th>
                </tr>
              </thead>
              <tbody>
                {SETTINGS.map((s) => (
                  <tr key={s.name}>
                    <td>{s.name}</td>
                    <td>
                      <code>{s.value}</code>
                    </td>
                    <td>{s.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="issues" className="wrap">
          <h2>Something look off?</h2>
          <p className="section-lede">
            LinkedIn changes its markup often. Open the popup on the broken page, click <strong>Copy diagnostics</strong>{' '}
            and paste the JSON into a{' '}
            <a href={`${REPO_URL}/issues/new`}>GitHub issue</a>. It contains element tags, classes and sizes only, never
            post content.
          </p>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <p>
            Released under the <a href={`${REPO_URL}/blob/main/LICENSE`}>MIT License</a>. Not affiliated with or endorsed
            by LinkedIn.
          </p>
          <a href={REPO_URL}>github.com/singerbj/fix-linkedin-layout</a>
        </div>
      </footer>
    </>
  );
}
