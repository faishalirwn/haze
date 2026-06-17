import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/utils/define-content-script";
import { COMMUNITY_MATCHES } from "../lib/community-hosts";
import {
  ACTIVE_CLASS,
  allSelectorParts,
  clickSelectorParts,
  generateCss,
  REVEALED_CLASS,
  SUPPRESSED_CLASS,
} from "../lib/css";
import { hostKey } from "../lib/host";
import { effectiveRulesFor } from "../lib/rules";
import { type HazeState, loadState } from "../lib/storage";

const STYLE_ID = "haze-style";
const INIT_FLAG = "__hazeEngineInit";

// Statically registered on the bundled community sites; also injected at runtime
// (same file) on user-granted origins by the background. Guard against running
// twice on a page that gets both.
export default defineContentScript({
  matches: COMMUNITY_MATCHES,
  runAt: "document_start",
  allFrames: false,
  main() {
    const w = window as unknown as Record<string, boolean>;
    if (w[INIT_FLAG]) return;
    w[INIT_FLAG] = true;
    runEngine();
  },
});

function runEngine(): void {
  const hostname = location.hostname;
  const key = hostKey(hostname);

  let clickSelector = "";
  let unionSelector = "";
  let observer: MutationObserver | null = null;

  const style = document.createElement("style");
  style.id = STYLE_ID;

  function injectStyle(): void {
    const root = document.head || document.documentElement;
    if (style.parentNode !== root) root.appendChild(style);
  }

  function applyEnabled(state: HazeState): void {
    const enabled = state.globalEnabled && !state.siteDisabled[key];
    document.documentElement.classList.toggle(ACTIVE_CLASS, enabled);
  }

  /** Outermost-wins: suppress any matched element nested inside another match. */
  function runContainment(): void {
    if (!unionSelector) return;
    let matched: Element[];
    try {
      matched = Array.from(document.querySelectorAll(unionSelector));
    } catch {
      return;
    }
    const set = new Set(matched);
    for (const el of matched) {
      let suppressed = false;
      let parent = el.parentElement;
      while (parent) {
        if (set.has(parent)) {
          suppressed = true;
          break;
        }
        parent = parent.parentElement;
      }
      el.classList.toggle(SUPPRESSED_CLASS, suppressed);
    }
  }

  let debounce = 0;
  function scheduleContainment(): void {
    if (debounce) return;
    debounce = window.setTimeout(() => {
      debounce = 0;
      runContainment();
    }, 150);
  }

  function rebuild(state: HazeState): void {
    const { rules, defaultBg } = effectiveRulesFor(hostname, state);
    style.textContent = generateCss(rules, defaultBg);
    injectStyle();
    unionSelector = allSelectorParts(rules).join(",");
    clickSelector = clickSelectorParts(rules).join(",");
    applyEnabled(state);
    runContainment();
    if (!observer) {
      observer = new MutationObserver(scheduleContainment);
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    }
  }

  // Click-to-reveal: toggle the revealed class on the effective target.
  document.addEventListener(
    "click",
    (e) => {
      if (!clickSelector) return;
      if (!document.documentElement.classList.contains(ACTIVE_CLASS)) return;
      const target = e.target as Element | null;
      const el = target?.closest?.(clickSelector);
      if (el && !el.classList.contains(SUPPRESSED_CLASS)) {
        el.classList.toggle(REVEALED_CLASS);
      }
    },
    true,
  );

  loadState().then(rebuild);

  browser.storage.onChanged.addListener((_changes, area) => {
    if (area !== "sync") return;
    loadState().then(rebuild);
  });
}
