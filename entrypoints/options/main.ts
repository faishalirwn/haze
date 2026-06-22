import { browser } from "wxt/browser";
import { COMMUNITY_SITES } from "../../lib/community-rules";
import { communityRuleId } from "../../lib/rules";
import { isValidSelector } from "../../lib/selector";
import {
  type HazeState,
  loadState,
  setCommunityDisabled,
  setCommunityOverride,
  setGlobalEnabled,
  setSiteDisabled,
  setUserRules,
} from "../../lib/storage";
import {
  DEFAULT_BG,
  DEFAULT_INTENSITY,
  type Effect,
  type Reveal,
  type Rule,
} from "../../lib/types";

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
    const card = siteCard(key);
    for (const rule of rules) {
      const row = ruleRow(rule, () => setUserRules(key, rules));
      const del = el<HTMLButtonElement>("button", "del");
      del.type = "button";
      del.textContent = "✕";
      del.title = "Remove";
      del.onclick = async () => {
        await setUserRules(
          key,
          rules.filter((r) => r.id !== rule.id),
        );
        render();
      };
      row.append(
        enableToggle(rule.enabled, row, (on) => {
          rule.enabled = on;
          setUserRules(key, rules);
        }),
      );
      row.append(del);
      card.appendChild(row);
    }
    root.appendChild(card);
  }
}

function renderCommunity(state: HazeState) {
  const root = $("community");
  root.innerHTML = "";

  for (const site of COMMUNITY_SITES) {
    const siteKey = site.hosts[0] as string;
    const card = document.createElement("div");
    card.className = "site";

    const head = document.createElement("div");
    head.className = "site-head";
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = site.id;
    head.append(
      name,
      switchEl(!state.siteDisabled[siteKey], (on) =>
        setSiteDisabled(siteKey, !on),
      ),
    );
    card.appendChild(head);

    site.rules.forEach((cr, index) => {
      const id = communityRuleId(site.id, index);
      const override = state.communityOverrides[id];
      const draft: Rule = override
        ? { ...override, id }
        : {
            id,
            selector: cr.selector,
            effect: cr.effect,
            intensity: cr.intensity ?? DEFAULT_INTENSITY,
            grayscale: cr.grayscale ?? false,
            reveal: "hover",
            bg: site.bg ?? DEFAULT_BG,
            enabled: true,
          };

      const reset = el<HTMLButtonElement>("button", "reset");
      reset.type = "button";
      reset.textContent = "Reset";
      reset.title = "Revert to the bundled default";
      reset.onclick = async () => {
        await setCommunityOverride(id, null);
        render();
      };

      let row: HTMLElement;
      // Show Reset as soon as the rule is first edited, no page refresh needed.
      const ensureReset = () => {
        if (!reset.isConnected) row.append(reset);
      };
      row = ruleRow(draft, () => {
        setCommunityOverride(id, { ...draft, enabled: true });
        ensureReset();
      });
      row.append(
        enableToggle(!state.communityDisabled[id], row, (on) =>
          setCommunityDisabled(id, !on),
        ),
      );
      if (override) ensureReset();
      card.appendChild(row);
    });

    root.appendChild(card);
  }
}

/** A row of editable controls bound to `rule`; `onChange` persists after edits. */
function ruleRow(rule: Rule, onChange: () => void): HTMLElement {
  const row = document.createElement("div");
  row.className = `rule${rule.enabled ? "" : " off"}`;

  const sel = el<HTMLInputElement>("input", "sel");
  sel.value = rule.selector;
  sel.spellcheck = false;
  const markValid = () =>
    sel.classList.toggle("invalid", !isValidSelector(sel.value.trim()));
  markValid();
  sel.oninput = markValid;
  sel.onchange = () => {
    rule.selector = sel.value.trim();
    markValid();
    onChange();
  };

  // Label anchor (lib/anchor.ts): only shown for rules that already have one,
  // since anchors are created via the picker. Clearing it reverts to plain CSS.
  let labelEl: HTMLInputElement | null = null;
  if (rule.label !== undefined) {
    labelEl = el<HTMLInputElement>("input", "label");
    labelEl.value = rule.label;
    labelEl.spellcheck = false;
    labelEl.placeholder = "label";
    labelEl.title = "Matches only values under this label";
    labelEl.onchange = () => {
      rule.label = labelEl?.value.trim() || undefined;
      onChange();
    };
  }

  const effect = select(["blur", "scratchcard", "both"], rule.effect, (v) => {
    rule.effect = v as Effect;
    onChange();
  });

  const intensity = el<HTMLInputElement>("input", "num");
  intensity.type = "number";
  intensity.min = "0";
  intensity.value = String(rule.intensity);
  intensity.title = "Blur radius (px)";
  intensity.onchange = () => {
    rule.intensity = Number(intensity.value) || 0;
    onChange();
  };

  const reveal = select(["hover", "click"], rule.reveal, (v) => {
    rule.reveal = v as Reveal;
    onChange();
  });

  row.append(sel);
  if (labelEl) row.append(labelEl);
  row.append(
    effect,
    intensity,
    reveal,
    checkbox("gray", rule.grayscale, (on) => {
      rule.grayscale = on;
      onChange();
    }),
  );
  return row;
}

function siteCard(title: string): HTMLElement {
  const card = document.createElement("div");
  card.className = "site";
  const head = document.createElement("div");
  head.className = "site-head";
  const name = document.createElement("span");
  name.className = "name";
  name.textContent = title;
  head.appendChild(name);
  card.appendChild(head);
  return card;
}

function enableToggle(
  on: boolean,
  row: HTMLElement,
  onChange: (on: boolean) => void,
): HTMLElement {
  return checkbox("on", on, (value) => {
    row.classList.toggle("off", !value);
    onChange(value);
  });
}

// --- export / import ---

async function exportRules() {
  const state = await loadState();
  const payload = {
    haze: true,
    version: 1,
    userRules: state.userRules,
    communityDisabled: state.communityDisabled,
    communityOverrides: state.communityOverrides,
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
    communityOverrides: data.communityOverrides ?? {},
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

function checkbox(
  label: string,
  checked: boolean,
  onChange: (on: boolean) => void,
): HTMLLabelElement {
  const wrap = el<HTMLLabelElement>("label", "cb");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.onchange = () => onChange(input.checked);
  wrap.append(input, document.createTextNode(label));
  return wrap;
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
