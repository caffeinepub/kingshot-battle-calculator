/* ============================================================================
   kingshotCore.ts — Kingshot PvP Core Engine (Rebuilt)
   ----------------------------------------------------------------------------
   Web-aligned foundations:
   - Go-to PvP formation commonly recommended: 50/20/30 (5:2:3)
   - Counter system: Infantry > Cavalry, Cavalry > Archers, Archers > Infantry
   - RNG skills like Volley / Howling Wind / Assault Lance exist and can swing outcomes

   Notes:
   - Kingshot's exact server-side damage equations are not publicly verifiable.
   - This engine is a calibrated, web-aligned probabilistic estimator built from:
       (a) visible scout stats (Atk/Def/Leth/HP)
       (b) troop composition & counter mechanics
       (c) known RNG skills (tier/TG) via Monte Carlo sampling
       (d) diminishing returns with sqrt(troops) like your working model

   What you get:
   - parseScoutPaste(text): troops + bonuses (if present)
   - parseStatBonusesOnly(text): bonuses even if troop lines missing (reinforcements)
   - parseNotesTwoColumn(text): optional special bonuses (left=you, right=enemy)
   - recommendFormation(...): best win%, formation, troop counts, required march size

   Drop into React easily. No backend required.
============================================================================ */

export type TroopType = "infantry" | "cavalry" | "archers";

export type TierInput = { tier: number; tg: number };

export type BonusesPct = { atk: number; dfn: number; leth: number; hp: number };

export type SpecialBonusesPct = {
  squads_atk: number;
  squads_dfn: number;
  squads_leth: number;
  squads_hp: number;

  enemy_squads_atk: number; // debuff applied to enemy from this side
  enemy_squads_dfn: number;

  enemy_leth_pen: number;   // pet skill style (reduces enemy leth)
  enemy_hp_pen: number;     // pet skill style (reduces enemy hp)
  pet_atk_bonus: number;    // pet skill style (adds to this side atk)
};

export type Side = {
  troops: Record<TroopType, number>;
  bonuses: Record<TroopType, BonusesPct>;
  special: SpecialBonusesPct;
  tier: TierInput;
};

export type EnemyManual = {
  total: number;
  infPct: number;
  cavPct: number; // archPct auto = 100 - infPct - cavPct
};

export type BattleType = { 
  id: number; 
  label: string; 
  intensity: number;
  extraSkillFactor: number;
};

/** Official Kingshot combat categories with intensity and skill multipliers */
export const BATTLE_TYPES: BattleType[] = [
  { 
    id: 1, 
    label: "Solo PvP (Attack / Defense)", 
    intensity: 0.95,
    extraSkillFactor: 1.00
  },
  { 
    id: 2, 
    label: "Rally Attack", 
    intensity: 1.05,
    extraSkillFactor: 1.15
  },
  { 
    id: 3, 
    label: "Garrison Defense", 
    intensity: 1.00,
    extraSkillFactor: 1.12
  },
  { 
    id: 4, 
    label: "Outpost / Sanctuary / Fortress Battle", 
    intensity: 1.00,
    extraSkillFactor: 1.12
  },
];

const DEFAULTS = {
  targetWin: 0.55,
  maxScale: 10,            // max march size multiplier for "required size"
  coarseStepPct: 5,
  refineStepPct: 1,
  refineRadiusPct: 6,      // search +/- around best coarse result
  sims: 350,               // Monte Carlo sims per formation (tune)
  sqrtPower: 0.50,         // diminishing returns: sqrt(troops) (0.5)
};

/* ---------------------------------------------------------------------------
   Counter mechanics (mild; stats still dominate)
   Infantry > Cavalry, Cavalry > Archers, Archers > Infantry
--------------------------------------------------------------------------- */
const MATCHUP: Record<TroopType, Record<TroopType, number>> = {
  infantry: { infantry: 1.00, cavalry: 1.12, archers: 0.95 },
  cavalry:  { infantry: 0.95, cavalry: 1.00, archers: 1.12 },
  archers:  { infantry: 1.12, cavalry: 0.95, archers: 1.00 },
};

/* ---------------------------------------------------------------------------
   RNG skills (tier/TG) from web-visible community knowledge
   + Your earlier skill list aligns with:
   - Archers T7+: Volley 10% chance to strike twice
   - TG3 Archers: Howling Wind 20% chance +50% dmg
   - TG3 Cavalry: Assault Lance 10% chance double dmg
   Infantry TG3 shield isn't well documented in the web sources we pulled,
   so we model it as a mild expected damage mitigation.
--------------------------------------------------------------------------- */
function rollRngMultipliers(t: TroopType, tier: TierInput, rng: () => number) {
  let dmg = 1.0;
  let tank = 1.0;
  let cavBackline = 0.0; // additional weight shift toward archers

  // Infantry TG3+: "shield" modeled as damage mitigation (small)
  if (t === "infantry" && tier.tg >= 3) {
    // 25% chance: mitigate chunk; approximate as +6% effective tank
    // (kept conservative since exact numbers aren't verifiable)
    if (rng() < 0.25) tank *= 1.06;
  }

  // Cavalry T7+: ambusher/backline pressure (modeled as more archer targeting)
  if (t === "cavalry" && tier.tier >= 7) {
    // 20% chance to strike archers behind infantry (weight shift)
    if (rng() < 0.20) cavBackline += 0.25;
  }

  // Cavalry TG3+: 10% chance double damage
  if (t === "cavalry" && tier.tg >= 3) {
    if (rng() < 0.10) dmg *= 2.0;
  }

  // Archers T7+: Volley 10% chance strike twice
  if (t === "archers" && tier.tier >= 7) {
    if (rng() < 0.10) dmg *= 2.0;
  }

  // Archers TG3+: Howling Wind 20% chance +50% damage
  if (t === "archers" && tier.tg >= 3) {
    if (rng() < 0.20) dmg *= 1.5;
  }

  return { dmg, tank, cavBackline };
}

/* ---------------------------------------------------------------------------
   Parsing helpers
--------------------------------------------------------------------------- */
function normalizeLines(text: string): string[] {
  return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
}
function extractNumberToken(line: string): string | null {
  const m = line.match(/[-+]?\d[\d,]*\.?\d*\s*%?/);
  return m ? m[0] : null;
}
function parseIntCommas(tok: string | null): number | null {
  if (!tok) return null;
  const m = tok.match(/\d[\d,]*/);
  return m ? parseInt(m[0].replace(/,/g, ""), 10) : null;
}
function parsePct(tok: string | null): number | null {
  if (!tok) return null;
  const m = tok.match(/[-+]?\d+\.?\d*/);
  return m ? parseFloat(m[0]) : null;
}
export function parseTierString(s: string): TierInput {
  const t = /t\s*(\d+)/i.exec(s || "");
  const g = /tg\s*(\d+)/i.exec(s || "");
  return {
    tier: t ? clampInt(parseInt(t[1], 10), 1, 11) : 10,
    tg: g ? clampInt(parseInt(g[1], 10), 0, 5) : 5,
  };
}
function clampInt(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}
function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

/* ---------------------------------------------------------------------------
   Utility: Sum troop counts with fallback to 0
--------------------------------------------------------------------------- */
export function sumTroops(t: { infantry?: number; cavalry?: number; archers?: number }): number {
  return (t.infantry || 0) + (t.cavalry || 0) + (t.archers || 0);
}

/* ---------------------------------------------------------------------------
   Special bonuses (Notes on Special Bonuses) — two columns
   left = you, right = enemy (optional)
--------------------------------------------------------------------------- */
const SPECIAL_ALIASES: Record<keyof SpecialBonusesPct, string[]> = {
  squads_atk: ["squads' attack bonus", "squads attack bonus"],
  squads_dfn: ["squads' defense bonus", "squads defense bonus"],
  squads_leth: ["squads' lethality bonus", "squads lethality bonus"],
  squads_hp: ["squads' health bonus", "squads health bonus"],

  enemy_squads_atk: ["enemy squads' attack", "enemy squads attack"],
  enemy_squads_dfn: ["enemy squads' defense", "enemy squads defense"],

  enemy_leth_pen: ["enemy lethality penalty"],
  enemy_hp_pen: ["enemy health penalty"],
  pet_atk_bonus: ["attack bonus (pet skill)", "attack bonus pet skill"],
};

export function blankSpecial(): SpecialBonusesPct {
  return {
    squads_atk: 0,
    squads_dfn: 0,
    squads_leth: 0,
    squads_hp: 0,
    enemy_squads_atk: 0,
    enemy_squads_dfn: 0,
    enemy_leth_pen: 0,
    enemy_hp_pen: 0,
    pet_atk_bonus: 0,
  };
}

export function parseNotesTwoColumn(text: string): { me: SpecialBonusesPct; enemy: SpecialBonusesPct } {
  const lines = normalizeLines(text || "");
  const low = lines.map(l => l.toLowerCase());

  const me: any = blankSpecial();
  const enemy: any = blankSpecial();

  // Find two pct values near each label (left & right)
  function pctPairNearby(idx: number): [number | null, number | null] {
    const toks: number[] = [];
    for (let j = Math.max(0, idx - 3); j < Math.min(lines.length, idx + 10); j++) {
      const tok = extractNumberToken(lines[j]);
      if (tok && tok.includes("%")) {
        const p = parsePct(tok);
        if (p !== null) toks.push(p);
      }
    }
    if (toks.length >= 2) return [toks[0], toks[1]];
    if (toks.length === 1) return [toks[0], null];
    return [null, null];
  }

  for (let i = 0; i < low.length; i++) {
    for (const key of Object.keys(SPECIAL_ALIASES) as (keyof SpecialBonusesPct)[]) {
      if (SPECIAL_ALIASES[key].some(alias => low[i].includes(alias))) {
        const [l, r] = pctPairNearby(i);
        if (l !== null) me[key] = l;
        if (r !== null) enemy[key] = r;
      }
    }
  }

  return { me, enemy };
}

/* ---------------------------------------------------------------------------
   Scout parsing:
   - parseScoutPaste: tries to read troop counts AND stat bonuses
   - parseStatBonusesOnly: for reinforcements mode (no troop lines)
--------------------------------------------------------------------------- */
const STAT_ALIASES: Record<string, string[]> = {
  "infantry,atk": ["infantry attack"],
  "infantry,dfn": ["infantry defense"],
  "infantry,leth": ["infantry lethality"],
  "infantry,hp": ["infantry health"],

  "cavalry,atk": ["cavalry attack"],
  "cavalry,dfn": ["cavalry defense"],
  "cavalry,leth": ["cavalry lethality"],
  "cavalry,hp": ["cavalry health"],

  "archers,atk": ["archer attack", "archers attack"],
  "archers,dfn": ["archer defense", "archers defense"],
  "archers,leth": ["archer lethality", "archers lethality"],
  "archers,hp": ["archer health", "archers health"],
};

export function parseStatBonusesOnly(text: string): Record<TroopType, BonusesPct> {
  const lines = normalizeLines(text || "");
  const low = lines.map(l => l.toLowerCase());

  const out: any = {
    infantry: { atk: 0, dfn: 0, leth: 0, hp: 0 },
    cavalry: { atk: 0, dfn: 0, leth: 0, hp: 0 },
    archers: { atk: 0, dfn: 0, leth: 0, hp: 0 },
  };

  for (let i = 0; i < low.length; i++) {
    for (const [key, aliases] of Object.entries(STAT_ALIASES)) {
      if (aliases.some(a => low[i].includes(a))) {
        const tokHere = extractNumberToken(lines[i]);
        const tokNext = i + 1 < lines.length ? extractNumberToken(lines[i + 1]) : null;
        const pct = parsePct(tokHere) ?? parsePct(tokNext);
        if (pct !== null) {
          const [troop, statKey] = key.split(",");
          out[troop][statKey] = pct;
        }
      }
    }
  }

  return out;
}

export function parseScoutPaste(text: string): { troops: Record<TroopType, number>; bonuses: Record<TroopType, BonusesPct> } {
  const lines = normalizeLines(text || "");
  const low = lines.map(l => l.toLowerCase());

  const troops: any = { infantry: 0, cavalry: 0, archers: 0 };
  const bonuses = parseStatBonusesOnly(text);

  // Troop lines can be like "Apex Infantry" then next line "81,791"
  // or "Truegold Infantry 66,244" etc.
  for (let i = 0; i < low.length; i++) {
    const line = low[i];

    // Look at current line and next line for numeric token
    const tokHere = extractNumberToken(lines[i]);
    const tokNext = i + 1 < lines.length ? extractNumberToken(lines[i + 1]) : null;
    const val = parseIntCommas(tokHere) ?? parseIntCommas(tokNext);

    if (val !== null) {
      if (line.includes("infantry")) troops.infantry = Math.max(troops.infantry, val);
      if (line.includes("cavalry")) troops.cavalry = Math.max(troops.cavalry, val);
      if (line.includes("archer")) troops.archers = Math.max(troops.archers, val);
    }
  }

  return { troops, bonuses };
}

/* ---------------------------------------------------------------------------
   Build troops from manual reinforcements inputs
--------------------------------------------------------------------------- */
export function troopsFromManual(man: EnemyManual) {
  const total = Math.max(0, Math.floor(man.total || 0));
  const inf = clamp(man.infPct || 0, 0, 100);
  const cav = clamp(man.cavPct || 0, 0, 100 - inf);
  const arch = clamp(100 - inf - cav, 0, 100);

  const i = Math.round(total * (inf / 100));
  const c = Math.round(total * (cav / 100));
  const a = total - i - c;

  return {
    troops: { infantry: i, cavalry: c, archers: a } as Record<TroopType, number>,
    ratio: { infantry: inf, cavalry: cav, archers: arch },
  };
}

/* ---------------------------------------------------------------------------
   Stat application
--------------------------------------------------------------------------- */
function unitStats(side: Side, t: TroopType): [number, number, number, number] {
  const b = side.bonuses[t];
  const s = side.special;

  // Convert % to multiplier: +100% => 2.0, +0% => 1.0
  const atk = 1 + (b.atk / 100);
  const dfn = 1 + (b.dfn / 100);
  const leth = 1 + (b.leth / 100);
  const hp = 1 + (b.hp / 100);

  // Apply "Squads" bonuses and pet attack bonus
  const atk2 = atk * (1 + s.squads_atk / 100) * (1 + s.pet_atk_bonus / 100);
  const dfn2 = dfn * (1 + s.squads_dfn / 100);
  const leth2 = leth * (1 + s.squads_leth / 100);
  const hp2 = hp * (1 + s.squads_hp / 100);

  return [atk2, dfn2, leth2, hp2];
}

function applyDebuffs(att: Side, defender: [number, number, number, number]): [number, number, number, number] {
  const s = att.special;
  const [atk, dfn, leth, hp] = defender;

  // enemy squads attack/defense shown as negatives in notes
  const dfn2 = dfn * (1 + s.enemy_squads_dfn / 100);
  const atk2 = atk * (1 + s.enemy_squads_atk / 100);

  // penalties shown as negative; treat magnitude as reduction
  const leth2 = leth * (1 - Math.abs(s.enemy_leth_pen || 0) / 100);
  const hp2 = hp * (1 - Math.abs(s.enemy_hp_pen || 0) / 100);

  return [atk2, dfn2, leth2, hp2];
}

function ratiosFromTroops(troops: Record<TroopType, number>) {
  const total = (troops.infantry || 0) + (troops.cavalry || 0) + (troops.archers || 0);
  if (total <= 0) return { infantry: 1/3, cavalry: 1/3, archers: 1/3, total: 0 };
  return {
    infantry: (troops.infantry || 0) / total,
    cavalry:  (troops.cavalry || 0) / total,
    archers:  (troops.archers || 0) / total,
    total,
  };
}

/* ---------------------------------------------------------------------------
   Core "kills pressure" function
   - uses stats (atk/leth vs def/hp)
   - uses diminishing returns (troops^sqrtPower)
   - uses counters via MATCHUP
   - uses RNG via rollRngMultipliers()
--------------------------------------------------------------------------- */
function killsPressure(
  n: number,
  atk: number,
  leth: number,
  def: number,
  hp: number,
  dmgMult: number,
  tankMult: number,
  sqrtPower: number
) {
  if (n <= 0) return 0;
  const scale = Math.pow(n, sqrtPower); // sqrt-like diminishing returns
  const denom = Math.max(def * hp * tankMult, 1e-9);
  return scale * (atk * leth) * dmgMult / denom;
}

function sidePressureOnce(att: Side, dfn: Side, rng: () => number, sqrtPower: number, extraSkillFactor: number) {
  const enemyR = ratiosFromTroops(dfn.troops);

  const dInf = applyDebuffs(att, unitStats(dfn, "infantry"));
  const dCav = applyDebuffs(att, unitStats(dfn, "cavalry"));
  const dArc = applyDebuffs(att, unitStats(dfn, "archers"));

  const DEF: Record<TroopType, [number, number, number, number]> = {
    infantry: dInf,
    cavalry: dCav,
    archers: dArc,
  };

  let total = 0;

  for (const t of ["infantry", "cavalry", "archers"] as TroopType[]) {
    const n = att.troops[t] || 0;
    if (n <= 0) continue;

    const [atk, , leth] = unitStats(att, t);
    const proc = rollRngMultipliers(t, att.tier, rng);

    // Apply extraSkillFactor to damage multiplier
    const finalDmgMult = proc.dmg * extraSkillFactor;

    // Target weights = enemy exposure * matchup advantage
    let wInf = enemyR.infantry * MATCHUP[t].infantry;
    let wCav = enemyR.cavalry  * MATCHUP[t].cavalry;
    let wArc = enemyR.archers  * MATCHUP[t].archers;

    // Cavalry backline events: shift some weight to archers
    if (t === "cavalry" && proc.cavBackline > 0) {
      const shift = proc.cavBackline; // already small
      const take = Math.min(wInf, shift);
      wInf -= take;
      wArc += take;
    }

    const sum = wInf + wCav + wArc;
    if (sum <= 0) continue;
    wInf /= sum; wCav /= sum; wArc /= sum;

    const kInf = killsPressure(n, atk, leth, DEF.infantry[1], DEF.infantry[3], finalDmgMult, proc.tank, sqrtPower);
    const kCav = killsPressure(n, atk, leth, DEF.cavalry[1],  DEF.cavalry[3],  finalDmgMult, proc.tank, sqrtPower);
    const kArc = killsPressure(n, atk, leth, DEF.archers[1],  DEF.archers[3],  finalDmgMult, proc.tank, sqrtPower);

    total += wInf * kInf + wCav * kCav + wArc * kArc;
  }

  return total;
}

/* ---------------------------------------------------------------------------
   Monte Carlo win% for a single formation
--------------------------------------------------------------------------- */
function mulberry32(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function estimateWinPct(
  me: Side,
  enemy: Side,
  battleTypeId: number,
  sims = DEFAULTS.sims,
  sqrtPower = DEFAULTS.sqrtPower
) {
  const bt = BATTLE_TYPES.find(b => b.id === battleTypeId) ?? BATTLE_TYPES[0];
  const intensity = bt.intensity;
  const extraSkillFactor = bt.extraSkillFactor;

  // Deterministic seed from troop totals so results are stable for same inputs
  const seed =
    (me.troops.infantry + 3 * me.troops.cavalry + 7 * me.troops.archers +
     enemy.troops.infantry + 5 * enemy.troops.cavalry + 11 * enemy.troops.archers) | 0;

  let wins = 0;

  for (let i = 0; i < sims; i++) {
    const rng = mulberry32(seed + i * 9973);

    const pMe = sidePressureOnce(me, enemy, rng, sqrtPower, extraSkillFactor);
    const pEn = sidePressureOnce(enemy, me, rng, sqrtPower, extraSkillFactor);

    // Convert pressure ratio into a win event via logistic
    const adv = Math.log((pMe + 1e-12) / (pEn + 1e-12));
    const prob = 1 / (1 + Math.exp(-3 * intensity * adv));

    if (rng() < prob) wins += 1;
  }

  return wins / sims;
}

/* ---------------------------------------------------------------------------
   Formation search
--------------------------------------------------------------------------- */
export type RecommendResult = {
  winPct: number;
  formation: { infantry: number; cavalry: number; archers: number };
  troops: { infantry: number; cavalry: number; archers: number };
  requiredMarchSize: number | null;
};

function getFormationDefaults(battleTypeId: number): { infantry: number; cavalry: number; archers: number } {
  // Solo PvP (id: 1) and Rally Attack (id: 2) → 50/20/30
  // Garrison Defense (id: 3) and Outpost/Sanctuary/Fortress (id: 4) → 60/20/20
  if (battleTypeId === 1 || battleTypeId === 2) {
    return { infantry: 50, cavalry: 20, archers: 30 };
  } else {
    return { infantry: 60, cavalry: 20, archers: 20 };
  }
}

export function recommendFormation(opts: {
  my: Side;
  enemy: Side;
  battleTypeId: number;
  marchSize: number;
  targetWin?: number;
}): RecommendResult {
  const { my, enemy, battleTypeId, marchSize } = opts;
  const targetWin = opts.targetWin ?? DEFAULTS.targetWin;

  const defaults = getFormationDefaults(battleTypeId);

  // Coarse search
  const coarseStep = DEFAULTS.coarseStepPct;
  let bestWin = 0;
  let bestInf = defaults.infantry;
  let bestCav = defaults.cavalry;

  for (let inf = 0; inf <= 100; inf += coarseStep) {
    for (let cav = 0; cav <= 100 - inf; cav += coarseStep) {
      const arch = 100 - inf - cav;
      const testSide: Side = {
        ...my,
        troops: {
          infantry: Math.round(marchSize * (inf / 100)),
          cavalry: Math.round(marchSize * (cav / 100)),
          archers: Math.round(marchSize * (arch / 100)),
        },
      };
      const w = estimateWinPct(testSide, enemy, battleTypeId);
      if (w > bestWin) {
        bestWin = w;
        bestInf = inf;
        bestCav = cav;
      }
    }
  }

  // Refine search
  const refineStep = DEFAULTS.refineStepPct;
  const refineRadius = DEFAULTS.refineRadiusPct;
  const infMin = Math.max(0, bestInf - refineRadius);
  const infMax = Math.min(100, bestInf + refineRadius);
  const cavMin = Math.max(0, bestCav - refineRadius);
  const cavMax = Math.min(100, bestCav + refineRadius);

  for (let inf = infMin; inf <= infMax; inf += refineStep) {
    for (let cav = cavMin; cav <= cavMax; cav += refineStep) {
      if (inf + cav > 100) continue;
      const arch = 100 - inf - cav;
      const testSide: Side = {
        ...my,
        troops: {
          infantry: Math.round(marchSize * (inf / 100)),
          cavalry: Math.round(marchSize * (cav / 100)),
          archers: Math.round(marchSize * (arch / 100)),
        },
      };
      const w = estimateWinPct(testSide, enemy, battleTypeId);
      if (w > bestWin) {
        bestWin = w;
        bestInf = inf;
        bestCav = cav;
      }
    }
  }

  const bestArch = 100 - bestInf - bestCav;

  // Calculate required march size if target not met
  let requiredMarchSize: number | null = null;
  if (bestWin < targetWin) {
    for (let scale = 1.1; scale <= DEFAULTS.maxScale; scale += 0.1) {
      const scaledSize = Math.round(marchSize * scale);
      const testSide: Side = {
        ...my,
        troops: {
          infantry: Math.round(scaledSize * (bestInf / 100)),
          cavalry: Math.round(scaledSize * (bestCav / 100)),
          archers: Math.round(scaledSize * (bestArch / 100)),
        },
      };
      const w = estimateWinPct(testSide, enemy, battleTypeId);
      if (w >= targetWin) {
        requiredMarchSize = scaledSize;
        break;
      }
    }
  }

  return {
    winPct: bestWin,
    formation: { infantry: bestInf, cavalry: bestCav, archers: bestArch },
    troops: {
      infantry: Math.round(marchSize * (bestInf / 100)),
      cavalry: Math.round(marchSize * (bestCav / 100)),
      archers: Math.round(marchSize * (bestArch / 100)),
    },
    requiredMarchSize,
  };
}

/* ---------------------------------------------------------------------------
   High-level builders
--------------------------------------------------------------------------- */
export function buildSideFromScout(opts: {
  scoutText: string;
  tierText: string;
  special: SpecialBonusesPct;
}): Side {
  const parsed = parseScoutPaste(opts.scoutText);
  const tier = parseTierString(opts.tierText);
  return {
    troops: parsed.troops,
    bonuses: parsed.bonuses,
    special: opts.special,
    tier,
  };
}

export function buildEnemyFromManual(opts: {
  statBonusesText: string;
  manual: EnemyManual;
  tierText: string;
  special: SpecialBonusesPct;
}): Side {
  const bonuses = parseStatBonusesOnly(opts.statBonusesText);
  const { troops } = troopsFromManual(opts.manual);
  const tier = parseTierString(opts.tierText);
  return {
    troops,
    bonuses,
    special: opts.special,
    tier,
  };
}
