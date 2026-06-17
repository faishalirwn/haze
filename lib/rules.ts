import { COMMUNITY_SITES, type CommunitySite } from "./community-rules";
import { hostKey, hostMatchesSuffix } from "./host";
import type { HazeState } from "./storage";
import { DEFAULT_BG, DEFAULT_INTENSITY, type Rule } from "./types";

/** A stable id for a bundled community rule: `<siteId>#<index>`. */
export function communityRuleId(siteId: string, index: number): string {
  return `${siteId}#${index}`;
}

export function communitySitesFor(hostname: string): CommunitySite[] {
  return COMMUNITY_SITES.filter((site) =>
    site.hosts.some((suffix) => hostMatchesSuffix(hostname, suffix)),
  );
}

/** Materialize bundled community rules for a host into full Rule objects. */
function communityRulesFor(hostname: string, state: HazeState): Rule[] {
  const out: Rule[] = [];
  for (const site of communitySitesFor(hostname)) {
    site.rules.forEach((cr, index) => {
      const id = communityRuleId(site.id, index);
      out.push({
        id,
        selector: cr.selector,
        effect: cr.effect,
        intensity: cr.intensity ?? DEFAULT_INTENSITY,
        grayscale: cr.grayscale ?? false,
        reveal: "hover",
        bg: site.bg ?? DEFAULT_BG,
        enabled: !state.communityDisabled[id],
      });
    });
  }
  return out;
}

export interface EffectiveRules {
  rules: Rule[];
  /** Default scratchcard background, derived from the matching community site. */
  defaultBg: string;
}

/** All rules (community + user) that apply to a host, with disabled ones dropped. */
export function effectiveRulesFor(
  hostname: string,
  state: HazeState,
): EffectiveRules {
  const community = communityRulesFor(hostname, state);
  const user = state.userRules[hostKey(hostname)] ?? [];
  const site = communitySitesFor(hostname)[0];
  const all = [...community, ...user].filter((r) => r.enabled);
  return { rules: all, defaultBg: site?.bg ?? DEFAULT_BG };
}
