import { browser } from "wxt/browser";
import { hostKey, isInjectableUrl, originPattern } from "../../lib/host";
import { communitySitesFor } from "../../lib/rules";
import {
  loadState,
  setGlobalEnabled,
  setSiteDisabled,
  setUserRules,
} from "../../lib/storage";
import type { Rule } from "../../lib/types";

const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;

async function activeTab() {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  return tab;
}

async function init() {
  const tab = await activeTab();
  const url = tab?.url;
  const globalInput = $<HTMLInputElement>("global");
  const siteInput = $<HTMLInputElement>("site");
  const pickBtn = $<HTMLButtonElement>("pick");
  const note = $<HTMLParagraphElement>("note");

  const state = await loadState();
  globalInput.checked = state.globalEnabled;
  globalInput.addEventListener("change", () =>
    setGlobalEnabled(globalInput.checked),
  );

  $<HTMLButtonElement>("options").addEventListener("click", () => {
    browser.runtime.openOptionsPage();
  });

  if (!isInjectableUrl(url) || !tab?.id) {
    $("host").textContent = "Not available here";
    siteInput.disabled = true;
    pickBtn.disabled = true;
    note.textContent = "Haze can only run on normal web pages.";
    renderRules("", []);
    return;
  }

  const hostname = new URL(url).hostname;
  const key = hostKey(hostname);
  $("host").textContent = hostname;

  siteInput.checked = !state.siteDisabled[key];
  siteInput.addEventListener("change", () =>
    setSiteDisabled(key, !siteInput.checked),
  );

  const isCommunity = communitySitesFor(hostname).length > 0;
  pickBtn.addEventListener("click", () =>
    pick(tab.id as number, url, isCommunity),
  );

  renderRules(key, state.userRules[key] ?? []);
}

async function pick(tabId: number, url: string, isCommunity: boolean) {
  const pattern = originPattern(url);
  if (!isCommunity) {
    const has = await browser.permissions.contains({ origins: [pattern] });
    if (!has) {
      const granted = await browser.permissions.request({ origins: [pattern] });
      if (!granted) return;
    }
  }
  await browser.scripting.executeScript({
    target: { tabId },
    files: ["/picker.js"],
  });
  window.close();
}

function renderRules(key: string, rules: Rule[]) {
  $("count").textContent = rules.length ? `(${rules.length})` : "";
  const list = $<HTMLUListElement>("list");
  list.innerHTML = "";

  if (!rules.length) {
    const li = document.createElement("li");
    li.className = "empty-wrap";
    li.innerHTML =
      '<span class="empty">No custom rules on this site yet.</span>';
    list.appendChild(li);
    return;
  }

  for (const rule of rules) {
    const li = document.createElement("li");
    if (!rule.enabled) li.classList.add("off");

    const sel = document.createElement("span");
    sel.className = "sel";
    sel.textContent = rule.selector;
    sel.title = rule.selector;

    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = rule.effect;

    const toggle = document.createElement("button");
    toggle.textContent = rule.enabled ? "◉" : "○";
    toggle.title = rule.enabled ? "Disable" : "Enable";
    toggle.addEventListener("click", async () => {
      rule.enabled = !rule.enabled;
      await setUserRules(key, rules);
      renderRules(key, rules);
    });

    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "✕";
    del.title = "Remove";
    del.addEventListener("click", async () => {
      const next = rules.filter((r) => r.id !== rule.id);
      await setUserRules(key, next);
      renderRules(key, next);
    });

    li.append(sel, tag, toggle, del);
    list.appendChild(li);
  }
}

init();
