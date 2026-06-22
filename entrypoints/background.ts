import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { hostKey, originPattern } from "../lib/host";
import type { CreateRuleResponse, HazeMessage } from "../lib/messages";
import { communitySitesFor } from "../lib/rules";
import {
  addGrantedOrigin,
  addUserRule,
  getGrantedOrigins,
  loadState,
} from "../lib/storage";
import { DEFAULT_BG, type Rule } from "../lib/types";

const ENGINE_FILE = "/content-scripts/engine.js";

// Maps the original per-site toggle keys to the new site keys. Old value `true`
// meant "show ratings" (blur off) -> new siteDisabled[key] = true.
const LEGACY_KEYS: Record<string, string> = {
  imdb: "imdb.com",
  mal: "myanimelist.net",
  goodreads: "goodreads.com",
  letterboxd: "letterboxd.com",
  google: "google.com",
  trakt: "trakt.tv",
  anilist: "anilist.co",
  hardcover: "hardcover.app",
};

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(async () => {
    await migrateLegacy();
    await reRegisterDynamic();
  });
  browser.runtime.onStartup.addListener(reRegisterDynamic);

  browser.runtime.onMessage.addListener((message, sender) => {
    const msg = message as HazeMessage;
    if (msg?.type === "haze:create-rule") {
      return handleCreateRule(msg, sender);
    }
    return undefined;
  });
});

async function migrateLegacy(): Promise<void> {
  const legacy = await browser.storage.sync.get(Object.keys(LEGACY_KEYS));
  const { siteDisabled } = await loadState();
  let changed = false;
  for (const [oldKey, newKey] of Object.entries(LEGACY_KEYS)) {
    if (legacy[oldKey] === true && !siteDisabled[newKey]) {
      siteDisabled[newKey] = true;
      changed = true;
    }
  }
  if (changed) await browser.storage.sync.set({ siteDisabled });
}

/** Re-register runtime content scripts for previously-granted custom origins. */
async function reRegisterDynamic(): Promise<void> {
  const origins = await getGrantedOrigins();
  if (!origins.length) return;
  let registered: { id: string }[] = [];
  try {
    registered = await browser.scripting.getRegisteredContentScripts();
  } catch {
    /* ignore */
  }
  const existing = new Set(registered.map((r) => r.id));
  for (const pattern of origins) {
    await registerForPattern(pattern, existing);
  }
}

async function registerForPattern(
  pattern: string,
  existing: Set<string>,
): Promise<void> {
  const id = `haze-${pattern}`;
  if (existing.has(id)) return;
  try {
    const ok = await browser.permissions.contains({ origins: [pattern] });
    if (!ok) return;
    await browser.scripting.registerContentScripts([
      {
        id,
        matches: [pattern],
        js: [ENGINE_FILE],
        runAt: "document_start",
        persistAcrossSessions: true,
      },
    ]);
  } catch {
    /* permission revoked or already registered - ignore */
  }
}

async function handleCreateRule(
  msg: Extract<HazeMessage, { type: "haze:create-rule" }>,
  sender: { tab?: { id?: number; url?: string } },
): Promise<CreateRuleResponse> {
  const url = sender.tab?.url;
  const tabId = sender.tab?.id;
  if (!url || tabId == null) return { ok: false, error: "no tab" };

  const hostname = new URL(url).hostname;
  const key = hostKey(hostname);

  const rule: Rule = {
    id: cryptoId(),
    selector: msg.selector,
    effect: msg.effect,
    intensity: msg.intensity,
    grayscale: msg.grayscale,
    reveal: msg.reveal,
    bg: DEFAULT_BG,
    text: msg.text,
    label: msg.label,
    enabled: true,
  };
  await addUserRule(key, rule);

  // Persist a runtime content script for non-bundled sites so it survives reloads.
  if (communitySitesFor(hostname).length === 0) {
    const pattern = originPattern(url);
    await addGrantedOrigin(pattern);
    await registerForPattern(pattern, new Set());
  }

  // Apply immediately in the current tab (no reload needed).
  try {
    await browser.scripting.executeScript({
      target: { tabId },
      files: [ENGINE_FILE],
    });
  } catch (err) {
    return { ok: false, error: String(err) };
  }
  return { ok: true };
}

function cryptoId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `r-${Math.abs(hashString(Date.now().toString()))}`;
  }
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}
