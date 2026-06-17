import { browser } from "wxt/browser";
import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";
import type { CreateRuleMessage, CreateRuleResponse } from "../lib/messages";
import { generateSelector, matchCount } from "../lib/selector";
import { DEFAULT_INTENSITY, type Effect, type Reveal } from "../lib/types";

// Self-contained element picker. Injected via scripting.executeScript from the
// popup (under activeTab) so it works before any persistent permission exists.
export default defineUnlistedScript(() => {
  const w = window as unknown as Record<string, boolean>;
  if (w.__hazePicker) return;
  w.__hazePicker = true;
  startPicker(() => {
    w.__hazePicker = false;
  });
});

function startPicker(onClose: () => void): void {
  let base: Element | null = null;
  let depth = 0;
  let current: Element | null = null;

  const host = document.createElement("div");
  host.style.cssText = "all:initial;position:fixed;z-index:2147483647;";
  const root = host.attachShadow({ mode: "open" });
  document.documentElement.appendChild(host);

  root.innerHTML = `
    <style>
      :host { all: initial; }
      .box {
        position: fixed; pointer-events: none; z-index: 1;
        border: 2px solid #20c4d4; background: rgba(32,196,212,0.18);
        border-radius: 3px; transition: all .05s ease-out;
      }
      .bar {
        position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%);
        z-index: 2; display: flex; gap: 8px; align-items: center;
        background: #15151c; color: #eee; padding: 10px 12px;
        border-radius: 10px; box-shadow: 0 6px 24px rgba(0,0,0,.45);
        font: 13px/1.4 system-ui, sans-serif; max-width: 92vw; flex-wrap: wrap;
      }
      .bar input.sel {
        font: 12px/1.3 ui-monospace, monospace; background: #25252e;
        color: #9fe6ee; border: 1px solid #333; border-radius: 6px;
        padding: 6px 8px; min-width: 260px; flex: 1;
      }
      .bar select {
        background: #25252e; color: #eee; border: 1px solid #333;
        border-radius: 6px; padding: 5px 6px;
      }
      .bar .count { color: #aaa; white-space: nowrap; }
      .bar button {
        border: 0; border-radius: 6px; padding: 6px 10px; cursor: pointer;
        font: 600 12px system-ui; color: #fff; background: #3a3a46;
      }
      .bar button.go { background: #20c4d4; color: #06262a; }
      .bar .hint { color: #888; width: 100%; font-size: 11px; }
    </style>
    <div class="box" id="box"></div>
    <div class="bar">
      <input class="sel" id="sel" spellcheck="false" />
      <span class="count" id="count"></span>
      <button id="up" title="Broaden (↑)">▲ wider</button>
      <button id="down" title="Narrow (↓)">▼ tighter</button>
      <select id="effect">
        <option value="blur">Blur</option>
        <option value="scratchcard">Scratchcard</option>
        <option value="both">Both</option>
      </select>
      <select id="reveal">
        <option value="hover">Hover</option>
        <option value="click">Click</option>
      </select>
      <button class="go" id="create">Create</button>
      <button id="cancel">Cancel</button>
      <span class="hint">Move mouse to target • ↑/↓ adjust • Enter create • Esc cancel</span>
    </div>`;

  const box = root.getElementById("box") as HTMLDivElement;
  const selInput = root.getElementById("sel") as HTMLInputElement;
  const countEl = root.getElementById("count") as HTMLSpanElement;
  const effectSel = root.getElementById("effect") as HTMLSelectElement;
  const revealSel = root.getElementById("reveal") as HTMLSelectElement;

  function resolveCurrent(): Element | null {
    let el: Element | null = base;
    for (let i = 0; i < depth && el; i++) el = el.parentElement;
    return el;
  }

  function refresh(): void {
    current = resolveCurrent();
    if (!current) return;
    const rect = current.getBoundingClientRect();
    box.style.left = `${rect.left}px`;
    box.style.top = `${rect.top}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
    const selector = generateSelector(current);
    selInput.value = selector;
    updateCount(selector);
  }

  function updateCount(selector: string): void {
    const n = matchCount(selector);
    countEl.textContent = `${n} match${n === 1 ? "" : "es"}`;
  }

  function onMove(e: MouseEvent): void {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === host || host.contains(el)) return;
    base = el;
    depth = 0;
    refresh();
  }

  function onKey(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      e.preventDefault();
      teardown();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      depth++;
      refresh();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (depth > 0) depth--;
      refresh();
    } else if (e.key === "Enter") {
      e.preventDefault();
      create();
    }
  }

  // Block page interactions while picking (don't follow links on hover-click).
  function swallow(e: Event): void {
    if (e.target === host || host.contains(e.target as Node)) return;
    e.preventDefault();
    e.stopPropagation();
  }

  async function create(): Promise<void> {
    const selector = selInput.value.trim();
    if (!selector) return;
    const msg: CreateRuleMessage = {
      type: "haze:create-rule",
      selector,
      effect: effectSel.value as Effect,
      reveal: revealSel.value as Reveal,
      intensity: DEFAULT_INTENSITY,
    };
    teardown();
    try {
      const res = (await browser.runtime.sendMessage(msg)) as
        | CreateRuleResponse
        | undefined;
      toast(res?.ok ? "Rule added ✓" : `Failed: ${res?.error ?? "unknown"}`);
    } catch (err) {
      toast(`Failed: ${String(err)}`);
    }
  }

  function toast(text: string): void {
    const t = document.createElement("div");
    t.textContent = text;
    t.style.cssText =
      "all:initial;position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#15151c;color:#fff;font:600 13px system-ui;padding:10px 16px;border-radius:8px;box-shadow:0 6px 24px rgba(0,0,0,.45);";
    document.documentElement.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }

  function teardown(): void {
    document.removeEventListener("mousemove", onMove, true);
    document.removeEventListener("keydown", onKey, true);
    document.removeEventListener("click", swallow, true);
    host.remove();
    onClose();
  }

  root.getElementById("up")?.addEventListener("click", () => {
    depth++;
    refresh();
  });
  root.getElementById("down")?.addEventListener("click", () => {
    if (depth > 0) depth--;
    refresh();
  });
  root.getElementById("create")?.addEventListener("click", create);
  root.getElementById("cancel")?.addEventListener("click", teardown);
  selInput.addEventListener("input", () => updateCount(selInput.value.trim()));

  document.addEventListener("mousemove", onMove, true);
  document.addEventListener("keydown", onKey, true);
  document.addEventListener("click", swallow, true);
}
