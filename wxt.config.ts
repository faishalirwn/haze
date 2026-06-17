import { defineConfig } from "wxt";
import { COMMUNITY_MATCHES } from "./lib/community-hosts";

// See docs/DESIGN.md for the full architecture.
export default defineConfig({
  srcDir: ".",
  // Don't auto-launch a browser on `dev`; load .output/chrome-mv3 manually.
  webExt: { disabled: true },
  manifest: {
    name: "Haze",
    description:
      "Blur, hide, or scratchcard anything on any website. Toggle it all off in one click, reveal on hover.",
    // Bundled community sites are granted at install (modest prompt).
    // Everything else is requested per-site at pick time via optional perms.
    permissions: ["storage", "scripting", "activeTab"],
    host_permissions: COMMUNITY_MATCHES,
    optional_host_permissions: ["*://*/*"],
    action: {},
  },
});
