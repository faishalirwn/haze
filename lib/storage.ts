import { browser } from "wxt/browser";
import type { Rule } from "./types";

// Persisted shape in browser.storage.sync.
export interface HazeState {
  globalEnabled: boolean;
  /** hostKey -> true when the site is explicitly turned off (default: on). */
  siteDisabled: Record<string, boolean>;
  /** hostKey -> user rules for that site. */
  userRules: Record<string, Rule[]>;
  /** community rule id -> true when disabled by the user. */
  communityDisabled: Record<string, boolean>;
}

const DEFAULTS: HazeState = {
  globalEnabled: true,
  siteDisabled: {},
  userRules: {},
  communityDisabled: {},
};

export async function loadState(): Promise<HazeState> {
  const items = await browser.storage.sync.get(DEFAULTS as never);
  return { ...DEFAULTS, ...(items as Partial<HazeState>) };
}

export async function setGlobalEnabled(value: boolean): Promise<void> {
  await browser.storage.sync.set({ globalEnabled: value });
}

export async function setSiteDisabled(
  key: string,
  disabled: boolean,
): Promise<void> {
  const { siteDisabled } = await loadState();
  if (disabled) siteDisabled[key] = true;
  else delete siteDisabled[key];
  await browser.storage.sync.set({ siteDisabled });
}

export async function setCommunityDisabled(
  id: string,
  disabled: boolean,
): Promise<void> {
  const { communityDisabled } = await loadState();
  if (disabled) communityDisabled[id] = true;
  else delete communityDisabled[id];
  await browser.storage.sync.set({ communityDisabled });
}

export async function getUserRules(key: string): Promise<Rule[]> {
  const { userRules } = await loadState();
  return userRules[key] ?? [];
}

export async function setUserRules(key: string, rules: Rule[]): Promise<void> {
  const { userRules } = await loadState();
  if (rules.length) userRules[key] = rules;
  else delete userRules[key];
  await browser.storage.sync.set({ userRules });
}

export async function addUserRule(key: string, rule: Rule): Promise<void> {
  const rules = await getUserRules(key);
  rules.push(rule);
  await setUserRules(key, rules);
}

// --- granted dynamic origins (storage.local; re-registered on startup) ---

export async function getGrantedOrigins(): Promise<string[]> {
  const { grantedOrigins } = await browser.storage.local.get({
    grantedOrigins: [] as string[],
  });
  return grantedOrigins as string[];
}

export async function addGrantedOrigin(pattern: string): Promise<void> {
  const origins = await getGrantedOrigins();
  if (!origins.includes(pattern)) {
    origins.push(pattern);
    await browser.storage.local.set({ grantedOrigins: origins });
  }
}
