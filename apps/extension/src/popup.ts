import { DEFAULTS, loadSettings, saveSettings, type Settings } from './settings';

const status = document.getElementById('status')!;

async function init(): Promise<void> {
  const settings = await loadSettings();
  for (const key of Object.keys(DEFAULTS) as Array<keyof Settings>) {
    const input = document.getElementById(key) as HTMLInputElement | null;
    if (!input) continue;
    if (input.type === 'checkbox') {
      input.checked = settings[key] as boolean;
      input.addEventListener('change', () => void saveSettings({ [key]: input.checked }));
    } else {
      input.value = String(settings[key]);
      input.addEventListener('change', () => {
        const n = Number(input.value);
        if (Number.isFinite(n) && n > 0) void saveSettings({ [key]: n });
      });
    }
  }

  document.getElementById('diag')!.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url?.startsWith('https://www.linkedin.com/')) {
        status.textContent = 'Open a LinkedIn tab first.';
        return;
      }
      const data = await chrome.tabs.sendMessage(tab.id, { type: 'fll:diagnostics' });
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      status.textContent = 'Diagnostics copied to clipboard.';
    } catch (err) {
      status.textContent = `Could not collect diagnostics: ${String(err)}. Try reloading the tab.`;
    }
  });
}

void init();
