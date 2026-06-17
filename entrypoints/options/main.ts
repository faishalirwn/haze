import { browser } from "wxt/browser";
import { COMMUNITY_SITES } from "../../lib/community-rules";
import { communityRuleId } from "../../lib/rules";
import {
  type HazeState,
  loadState,
  setCommunityDisabled,
  setGlobalEnabled,
  setSiteDisabled,
  setUserRules,
} from "../../lib/storage";
import type { Effect, Reveal, Rule } from "../../lib/types";

const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;

async function render() {
  const state = await loadState();
  renderGlobal(state);
  renderUser(state);
  renderCommunity(state);
  $("version").textContent = `v${browser.runtime.getManifest().version}`;
}

function renderGlobal(state: HazeState) {
  const g = $<HTMLInputElement>("global");
  g.checked = state.globalEnabled;
  g.onchange = () => setGlobalEnabled(g.checked);
}

function renderUser(state: HazeState) {
  const root = $("user");
  root.innerHTML = "";
  const keys = Object.keys(state.userRules).sort();

  if (!keys.length) {
    root.innerHTML =
      '<p class="empty">No custom rules yet. Open any site, click the Haze toolbar icon, and pick an element.</p>';
    return;
  }

  for (const key of keys) {
    const rules = state.userRules[key] ?? [];
    const card = document.createElement("div");
    card.className = "site";
    const head = document.createElement("div");
    head.className = "site-head";
    head.innerHTML = `<span class="name">${key}</span>`;
    card.appendChild(head);

    for (const rule of rules) {
      card.appendChild(userRuleRow(key, rules, rule));
    }
    root.appendChild(card);
  }
}

function userRuleRow(key: string, rules: Rule[], rule: Rule): HTMLElement {
  const row = document.createElement("div");
  row.className = `rule${rule.enabled ? "" : " off"}`;

  const save = async () => {
    await setUserRules(key, rules);
  };

  const sel = el<HTMLInputElement>("input", "sel");
  sel.value = rule.selector;
  sel.spellcheck = false;
  sel.onchange = () => {
    rule.selector = sel.value.trim();
    save();
  };

  const effect = select(["blur", "scratchcard", "both"], rule.effect, (v) => {
    rule.effect = v as Effect;
    save();
  });

  const intensity = el<HTMLInputElement>("input", "num");
  intensity.type = "number";
  intensity.min = "0";
  intensity.value = String(rule.intensity);
  intensity.title = "Blur radius (px)";
  intensity.onchange = () => {
    rule.intensity = Number(intensity.value) || 0;
    save();
  };

  const reveal = select(["hover", "click"], rule.reveal, (v) => {
    rule.reveal = v as Reveal;
    save();
  });

  const gray = el<HTMLLabelElement>("label", "cb");
  const grayCb = document.createElement("input");
  grayCb.type = "checkbox";
  grayCb.checked = rule.grayscale;
  grayCb.onchange = () => {
    rule.grayscale = grayCb.checked;
    save();
  };
  gray.append(grayCb, document.createTextNode("gray"));

  const enable = el<HTMLLabelElement>("label", "cb");
  const enableCb = document.createElement("input");
  enableCb.type = "checkbox";
  enableCb.checked = rule.enabled;
  enableCb.onchange = async () => {
    rule.enabled = enableCb.checked;
    row.classList.toggle("off", !rule.enabled);
    await save();
  };
  enable.append(enableCb, document.createTextNode("on"));

  const del = el<HTMLButtonElement>("button", "del");
  del.textContent = "✕";
  del.title = "Remove";
  del.onclick = async () => {
    const next = rules.filter((r) => r.id !== rule.id);
    await setUserRules(key, next);
    render();
  };

  row.append(sel, effect, intensity, reveal, gray, enable, del);
  return row;
}

function renderCommunity(state: HazeState) {
  const root = $("community");
  root.innerHTML = "";

  for (const site of COMMUNITY_SITES) {
    const siteDisableKey = site.hosts[0] as string;
    const card = document.createElement("div");
    card.className = "site";

    const head = document.createElement("div");
    head.className = "site-head";
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = site.id;
    const toggle = switchEl(!state.siteDisabled[siteDisableKey], (on) =>
      setSiteDisabled(siteDisableKey, !on),
    );
    head.append(name, toggle);
    card.appendChild(head);

    site.rules.forEach((cr, index) => {
      const id = communityRuleId(site.id, index);
      const row = document.createElement("div");
      const enabled = !state.communityDisabled[id];
      row.className = `rule${enabled ? "" : " off"}`;

      const sel = el<HTMLInputElement>("input", "sel");
      sel.value = cr.selector;
      sel.readOnly = true;

      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = cr.effect;

      const enable = el<HTMLLabelElement>("label", "cb");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = enabled;
      cb.onchange = () => {
        row.classList.toggle("off", !cb.checked);
        setCommunityDisabled(id, !cb.checked);
      };
      enable.append(cb, document.createTextNode("on"));

      row.append(sel, tag, enable);
      card.appendChild(row);
    });

    root.appendChild(card);
  }
}

// --- export / import ---

async function exportRules() {
  const state = await loadState();
  const payload = {
    haze: true,
    version: 1,
    userRules: state.userRules,
    communityDisabled: state.communityDisabled,
    siteDisabled: state.siteDisabled,
    globalEnabled: state.globalEnabled,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "haze-rules.json";
  a.click();
  URL.revokeObjectURL(url);
}

async function importRules(file: File) {
  const text = await file.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    alert("Invalid JSON file.");
    return;
  }
  if (data?.haze !== true) {
    alert("Not a Haze export file.");
    return;
  }
  await browser.storage.sync.set({
    userRules: data.userRules ?? {},
    communityDisabled: data.communityDisabled ?? {},
    siteDisabled: data.siteDisabled ?? {},
    ...(typeof data.globalEnabled === "boolean"
      ? { globalEnabled: data.globalEnabled }
      : {}),
  });
  render();
}

// --- small DOM helpers ---

function el<T extends HTMLElement>(tag: string, className: string): T {
  const node = document.createElement(tag) as T;
  node.className = className;
  return node;
}

function select(
  options: string[],
  value: string,
  onChange: (v: string) => void,
): HTMLSelectElement {
  const s = document.createElement("select");
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    if (opt === value) o.selected = true;
    s.appendChild(o);
  }
  s.onchange = () => onChange(s.value);
  return s;
}

function switchEl(checked: boolean, onChange: (on: boolean) => void) {
  const label = document.createElement("label");
  label.className = "switch";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.onchange = () => onChange(input.checked);
  const slider = document.createElement("span");
  slider.className = "slider";
  label.append(input, slider);
  return label;
}

$("export").addEventListener("click", exportRules);
$("import").addEventListener("click", () =>
  $<HTMLInputElement>("file").click(),
);
$<HTMLInputElement>("file").addEventListener("change", (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) importRules(file);
});

render();
