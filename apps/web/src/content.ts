export const REPO_URL = 'https://github.com/singerbj/fix-linkedin-layout';

export const FEATURES = [
  {
    title: 'Full-width, aligned columns',
    body: 'The header and the left, main and right columns stretch to the full window and share the same edges. Nothing is off-centre any more.',
  },
  {
    title: 'Docked messaging sidebar',
    body: 'On wide screens messaging becomes a permanent full-height sidebar on the right. Conversations you open appear to its left.',
  },
  {
    title: 'Survives LinkedIn changes',
    body: "No reliance on LinkedIn's obfuscated class names. The page structure is detected from layout, so the fix keeps working as markup changes.",
  },
  {
    title: 'Always re-applied',
    body: 'SPA navigation, lazy-loaded rails, window resizes and messaging opening or closing all trigger a re-layout.',
  },
  {
    title: 'Private by design',
    body: 'Runs only on linkedin.com, needs no account and sends nothing anywhere. Settings live in Chrome sync storage.',
  },
  {
    title: 'Free and open source',
    body: 'MIT licensed. Read every line, fork it, or send a fix when LinkedIn ships a new layout.',
  },
] as const;

export const SETTINGS = [
  { name: 'Enabled', value: 'on', note: 'Master switch' },
  { name: 'Apply from width', value: '1200px', note: "Below this width LinkedIn's own layout is left alone" },
  { name: 'Dock messaging sidebar', value: 'on', note: 'Turns messaging into a right-hand sidebar' },
  { name: 'Dock from width', value: '1600px', note: 'Minimum window width for the sidebar' },
  {
    name: 'Auto-open messaging',
    value: 'on',
    note: 'Opens the panel on load. If you minimize it, it stays minimized and the columns take the space back',
  },
  { name: 'Debug outlines', value: 'off', note: 'Outlines every element the extension re-laid out' },
] as const;

export const EXTENSION_VERSION = __EXTENSION_VERSION__;

// Built and published with the site by .github/workflows/deploy.yml.
export const DOWNLOAD_URL = './fix-linkedin-layout.zip';

export const INSTALL_STEPS = [
  {
    title: 'Download and unzip',
    body: `Download fix-linkedin-layout.zip (v${EXTENSION_VERSION}) and unzip it somewhere you'll keep it. Chrome loads the extension from that folder, so don't delete it afterwards.`,
  },
  {
    title: 'Open the extensions page',
    body: 'Go to chrome://extensions and turn on Developer mode (top right).',
  },
  {
    title: 'Load it',
    body: 'Click Load unpacked and pick the unzipped folder (the one containing manifest.json). Reload LinkedIn and you are done.',
  },
] as const;

export const UPDATE_NOTE =
  'To update, download the zip again, replace the contents of the same folder, then click the reload icon on the extension card in chrome://extensions. Your settings are kept.';

export const BUILD_FROM_SOURCE = `git clone ${REPO_URL}.git
cd fix-linkedin-layout
npm install
npm run build
# then Load unpacked → apps/extension/dist`;
