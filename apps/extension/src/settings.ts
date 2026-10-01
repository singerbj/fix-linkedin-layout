export interface Settings {
  /** Master switch. */
  enabled: boolean;
  /** Below this viewport width (px) LinkedIn's own layout is left untouched. */
  minWidth: number;
  /** Dock the messaging panel as a full-height right sidebar. */
  dockMessaging: boolean;
  /** Messaging docks at or above this viewport width (px). */
  dockMinWidth: number;
  /** Expand the messaging panel on page load if it is minimized. */
  autoOpenMessaging: boolean;
  /** Outline every element the extension has re-laid out. */
  debug: boolean;
}

export const DEFAULTS: Settings = {
  enabled: true,
  minWidth: 1200,
  dockMessaging: true,
  dockMinWidth: 1600,
  autoOpenMessaging: true,
  debug: false,
};

export async function loadSettings(): Promise<Settings> {
  try {
    const stored = await chrome.storage.sync.get(DEFAULTS as unknown as Record<string, unknown>);
    return { ...DEFAULTS, ...(stored as Partial<Settings>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(patch: Partial<Settings>): Promise<void> {
  return chrome.storage.sync.set(patch);
}
