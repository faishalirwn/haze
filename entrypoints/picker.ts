import { browser } from "wxt/browser";
import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";
import { generateCss, PREVIEW_CLASS } from "../lib/css";
import type { CreateRuleMessage, CreateRuleResponse } from "../lib/messages";
import {
  generalizedSelector,
  generateSelector,
  matchCount,
} from "../lib/selector";
import {
  DEFAULT_BG,
  DEFAULT_INTENSITY,
  type Effect,
  type Reveal,
  type Rule,
} from "../lib/types";

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
  // Two-phase: hover to preview, click to lock. Once locked, the selection is
  // frozen so the user can move to the toolbar and widen/tighten without the
  // mouse re-picking. Clicking another element re-locks.
  let base: Element | null = null;
  let depth = 0;
  let locked = false;
  let current: Element | null = null;

  const host = document.createElement("div");
  host.style.cssText = "all:initial;position:fixed;z-index:2147483647;";
  const root = host.attachShadow({ mode: "open" });
  document.documentElement.appendChild(host);

  // Live preview: a separate stylesheet gated on PREVIEW_CLASS so it never
  // touches the real engine state. Removed on cancel (revert) or create.
  const previewStyle = document.createElement("style");
  document.documentElement.appendChild(previewStyle);

  root.innerHTML = `
    <style>
      :host { all: initial; }
      .box {
        position: fixed; pointer-events: none; z-index: 1;
        border: 2px dashed #f0a23c; background: rgba(240,162,60,0.14);
        border-radius: 3px; transition: all .05s ease-out;
      }
      .box.locked { border-style: solid; background: rgba(240,162,60,0.22); }
      .bar {
        position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%);
        z-index: 2; display: flex; flex-direction: column; gap: 8px;
        background: #1a1a18; color: #eceae6; padding: 10px 12px;
        border: 1px solid #2e2d2a; border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0,0,0,.55);
        font: 13px/1.4 system-ui, sans-serif; width: min(660px, 92vw);
      }
      .bar .row { display: flex; align-items: center; gap: 8px; }
      .bar .row.controls { flex-wrap: wrap; }
      .bar .spacer { flex: 1; }
      .bar .sep { width: 1px; height: 20px; background: #2e2d2a; }
      .bar input.sel {
        font: 12px/1.3 ui-monospace, monospace; background: #121211;
        color: #cabfae; border: 1px solid #2e2d2a; border-radius: 6px;
        padding: 6px 8px; flex: 1; min-width: 0;
      }
      .bar .iconbtn {
        width: 30px; height: 28px; padding: 0;
        display: inline-flex; align-items: center; justify-content: center;
      }
      .bar select {
        background: #121211; color: #eceae6; border: 1px solid #2e2d2a;
        border-radius: 6px; padding: 5px 6px;
      }
      .bar .count { color: #918d85; white-space: nowrap; }
      .bar button {
        border: 0; border-radius: 6px; padding: 6px 10px; cursor: pointer;
        font: 600 12px system-ui; color: #eceae6; background: #26251f;
      }
      .bar button:disabled { opacity: .4; cursor: not-allowed; }
      .bar button.go { background: #f0a23c; color: #2a1c08; }
      .bar .prev {
        display: flex; align-items: center; gap: 5px;
        color: #918d85; font-size: 11px; white-space: nowrap; cursor: pointer;
      }
      .bar .prev input {
        appearance: none; -webkit-appearance: none; margin: 0;
        width: 14px; height: 14px; border: 1px solid #2e2d2a;
        border-radius: 4px; background: #121211; cursor: pointer; position: relative;
      }
      .bar .prev input:checked { background: #f0a23c; border-color: #f0a23c; }
      .bar .prev input:checked::after {
        content: ''; position: absolute; left: 4px; top: 1px;
        width: 3px; height: 7px; border: solid #221703;
        border-width: 0 2px 2px 0; transform: rotate(45deg);
      }
      .bar .hint { color: #9b9183; width: 100%; font-size: 11px; }
    </style>
    <div class="box" id="box"></div>
    <div class="bar">
      <div class="row">
        <input class="sel" id="sel" spellcheck="false" placeholder="click an element to start…" />
        <span class="count" id="count"></span>
        <button class="iconbtn" id="up" title="Broaden — select parent (↑)" disabled>▲</button>
        <button class="iconbtn" id="down" title="Narrow — select child (↓)" disabled>▼</button>
      </div>
      <div class="row controls">
        <select id="scope" title="How many elements to match">
          <option value="one">This one</option>
          <option value="similar">All similar</option>
        </select>
        <select id="effect" title="Effect">
          <option value="blur">Blur</option>
          <option value="scratchcard">Scratchcard</option>
          <option value="both">Both</option>
        </select>
        <select id="reveal" title="Reveal on">
          <option value="hover">Hover</option>
          <option value="click">Click</option>
        </select>
        <label class="prev"><input type="checkbox" id="gray" /> Gray</label>
        <label class="prev"><input type="checkbox" id="preview" checked /> Preview</label>
        <span class="spacer"></span>
        <button class="go" id="create" disabled>Create</button>
        <button id="cancel">Cancel</button>
      </div>
    </div>`;

  const box = root.getElementById("box") as HTMLDivElement;
  const selInput = root.getElementById("sel") as HTMLInputElement;
  const countEl = root.getElementById("count") as HTMLSpanElement;
  const effectSel = root.getElementById("effect") as HTMLSelectElement;
  const revealSel = root.getElementById("reveal") as HTMLSelectElement;
  const scopeSel = root.getElementById("scope") as HTMLSelectElement;
  const grayCb = root.getElementById("gray") as HTMLInputElement;
  const previewCb = root.getElementById("preview") as HTMLInputElement;
  const upBtn = root.getElementById("up") as HTMLButtonElement;
  const downBtn = root.getElementById("down") as HTMLButtonElement;
  const createBtn = root.getElementById("create") as HTMLButtonElement;

  function resolveCurrent(): Element | null {
    let el: Element | null = base;
    for (let i = 0; i < depth && el; i++) el = el.parentElement;
    return el;
  }

  function refresh(): void {
    current = resolveCurrent();
    box.classList.toggle("locked", locked);
    if (!current) return;
    const rect = current.getBoundingClientRect();
    box.style.left = `${rect.left}px`;
    box.style.top = `${rect.top}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
    const selector =
      scopeSel.value === "similar"
        ? generalizedSelector(current)
        : generateSelector(current);
    selInput.value = selector;
    updateCount(selector);
    updatePreview();
  }

  function currentRule(): Rule {
    return {
      id: "preview",
      selector: selInput.value.trim(),
      effect: effectSel.value as Effect,
      intensity: DEFAULT_INTENSITY,
      grayscale: grayCb.checked,
      reveal: revealSel.value as Reveal,
      enabled: true,
    };
  }

  function updatePreview(): void {
    const on = locked && previewCb.checked && selInput.value.trim() !== "";
    if (on) {
      previewStyle.textContent = generateCss(
        [currentRule()],
        DEFAULT_BG,
        PREVIEW_CLASS,
      );
      document.documentElement.classList.add(PREVIEW_CLASS);
    } else {
      previewStyle.textContent = "";
      document.documentElement.classList.remove(PREVIEW_CLASS);
    }
  }

  function setLocked(value: boolean): void {
    locked = value;
    upBtn.disabled = !value;
    downBtn.disabled = !value;
    createBtn.disabled = !value;
  }

  function updateCount(selector: string): void {
    const n = matchCount(selector);
    countEl.textContent = `${n} match${n === 1 ? "" : "es"}`;
  }

  function onMove(e: MouseEvent): void {
    if (locked) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === host || host.contains(el)) return;
    base = el;
    depth = 0;
    refresh();
  }

  function onClick(e: MouseEvent): void {
    // Let toolbar clicks through to their own handlers.
    if (e.target === host || host.contains(e.target as Node)) return;
    e.preventDefault();
    e.stopPropagation();
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === host || host.contains(el)) return;
    base = el;
    depth = 0;
    setLocked(true);
    refresh();
  }

  function widen(): void {
    if (!locked) return;
    depth++;
    refresh();
  }
  function tighten(): void {
    if (!locked || depth === 0) return;
    depth--;
    refresh();
  }

  function onKey(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      e.preventDefault();
      teardown();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      widen();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      tighten();
    } else if (e.key === "Enter" && locked) {
      e.preventDefault();
      create();
    }
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
      grayscale: grayCb.checked,
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
      "all:initial;position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#1a1a18;color:#eceae6;font:600 13px system-ui;padding:10px 16px;border-radius:8px;box-shadow:0 6px 24px rgba(0,0,0,.5);border:1px solid #2e2d2a;";
    document.documentElement.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }

  function teardown(): void {
    document.removeEventListener("mousemove", onMove, true);
    document.removeEventListener("keydown", onKey, true);
    document.removeEventListener("click", onClick, true);
    document.documentElement.classList.remove(PREVIEW_CLASS);
    previewStyle.remove();
    host.remove();
    onClose();
  }

  upBtn.addEventListener("click", widen);
  downBtn.addEventListener("click", tighten);
  createBtn.addEventListener("click", create);
  scopeSel.addEventListener("change", refresh);
  effectSel.addEventListener("change", updatePreview);
  revealSel.addEventListener("change", updatePreview);
  grayCb.addEventListener("change", updatePreview);
  previewCb.addEventListener("change", updatePreview);
  root.getElementById("cancel")?.addEventListener("click", teardown);
  selInput.addEventListener("input", () => {
    updateCount(selInput.value.trim());
    updatePreview();
  });

  document.addEventListener("mousemove", onMove, true);
  document.addEventListener("keydown", onKey, true);
  document.addEventListener("click", onClick, true);
}
