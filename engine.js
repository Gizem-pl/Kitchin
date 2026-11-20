// engine.js — PURE BUSINESS LOGIC.
// Zero `document` / `window` references. Every function is deterministic given its inputs,
// so this file can be dropped into an Expo / React Native project unchanged.

import {
  INGREDIENTS, RECIPES, SUBSTITUTIONS, SAUCES, TASTE_FIXES, LOCKS, APPLIANCES,
  APPLIANCE_CAPACITY, PANTRY_DEFAULTS, DEFAULT_BLOCKLIST, DEFAULT_TARGETS, FREEZE_REASONS,
  MEAL_SLOTS, BATCH_CUISINES, BATCH_DEFAULTS, MASTER_METHODS, PROTEIN_MASTERS, CARB_COOKS,
  FLAVOR_KITS, BREAKFAST_BASES, STORAGE_TAGS, AI_RECIPE_TEMPLATE, AI_BATCH_TEMPLATE, MOODS,
} from './recipes.js';

// ------------------------------------------------------------------------------------------
// Custom (imported) recipes & ingredients registry. Pure module state, no DOM.
// ------------------------------------------------------------------------------------------
let CUSTOM_RECIPES = [];
let CUSTOM_INGREDIENTS = {};

/** Register imported recipes (each may carry its own `customIngredients`). */
export function setCustomData(customRecipes = []) {
  CUSTOM_RECIPES = customRecipes.filter(Boolean);
  CUSTOM_INGREDIENTS = {};
  CUSTOM_RECIPES.forEach((r) => Object.assign(CUSTOM_INGREDIENTS, r.customIngredients || {}));
}
export const allRecipes = () => [...RECIPES, ...CUSTOM_RECIPES];
export const customRecipes = () => CUSTOM_RECIPES;

// ------------------------------------------------------------------------------------------
// Defaults
// ------------------------------------------------------------------------------------------
export function defaultSettings() {
  const locks = {};
  LOCKS.forEach((l) => { locks[l.id] = l.defaultOn; });
  const appliances = {};
  APPLIANCES.forEach((a) => { appliances[a.id] = true; });
  return { pantry: { ...PANTRY_DEFAULTS }, locks, blocklist: [...DEFAULT_BLOCKLIST], appliances };
}

export function defaultUserData() {
  return {
    settings: defaultSettings(),
    targets: { ...DEFAULT_TARGETS },
    mealLogs: {}, // { 'YYYY-MM-DD': [entry] }
    weightLogs: [], // [{ id, date, kg, chest, waist, hip }]
    fridge: { selected: [], useFirst: [], custom: [], leftovers: [], mood: 'All', missingOne: false, leftoverMode: false },
    batch: { focusId: null, sessionIds: [], size: 1 },
    recipePrefs: {}, // { recipeId: { servings, swaps: { fromId: subKey } } }
    cart: defaultCart(),
    customRecipes: [], // imported recipes (AI Chef Bridge)
  };
}

export function defaultCart() {
  return {
    blocks: [], // [{ id, count, slot, cuisine, choice: 'kit:id'|'base:id'|'recipe:id', protein }]
    rawPerServing: BATCH_DEFAULTS.rawPerServing,
    method: 'auto',
    proteinGrams: {}, // Protein-First overrides { proteinId: totalRawGrams }
    eaten: [],
    bought: [],
    builder: { count: 3, slot: 'Lunch', cuisine: 'Japanese', protein: 'turkey_breast' },
    pf: { protein: 'turkey_breast', grams: 1000, slot: 'Lunch', cuisines: ['Japanese', 'Turkish'] },
  };
}

// Merge stored data over defaults so new pantry items / settings appear after app updates.
export function mergeUserData(stored) {
  const d = defaultUserData();
  if (!stored) return d;
  const s = stored.settings || {};
  return {
    settings: {
      pantry: { ...d.settings.pantry, ...(s.pantry || {}) },
      locks: { ...d.settings.locks, ...(s.locks || {}) },
      blocklist: Array.isArray(s.blocklist) ? s.blocklist : d.settings.blocklist,
      appliances: { ...d.settings.appliances, ...(s.appliances || {}) },
    },
    targets: { ...d.targets, ...(stored.targets || {}) },
    mealLogs: stored.mealLogs || {},
    weightLogs: stored.weightLogs || [],
    fridge: { ...d.fridge, ...(stored.fridge || {}) },
    batch: { ...d.batch, ...(stored.batch || {}) },
    recipePrefs: stored.recipePrefs || {},
    cart: { ...d.cart, ...(stored.cart || {}), builder: { ...d.cart.builder, ...((stored.cart || {}).builder || {}) }, pf: { ...d.cart.pf, ...((stored.cart || {}).pf || {}) } },
    customRecipes: Array.isArray(stored.customRecipes) ? stored.customRecipes : [],
  };
}

// ------------------------------------------------------------------------------------------
// Ingredients, names, text matching
// ------------------------------------------------------------------------------------------
export function getIngredient(id) {
  return INGREDIENTS[id] || CUSTOM_INGREDIENTS[id] || { name: id, short: id, cat: 'custom', m: [0, 0, 0, 0] };
}
export const ingredientName = (id) => getIngredient(id).name;
export const ingredientShort = (id) => getIngredient(id).short || getIngredient(id).name;
export const isBasic = (id) => getIngredient(id).cat === 'basic';

export function listIngredients(cat) {
  return Object.keys(INGREDIENTS).filter((id) => INGREDIENTS[id].cat === cat);
}
const allIngredientIds = () => [...Object.keys(INGREDIENTS), ...Object.keys(CUSTOM_INGREDIENTS)];

export function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(' ').filter(Boolean)
    .map((w) => (w.length > 3 ? w.replace(/(es|s)$/, '') : w))
    .join(' ');
}

function termMatches(term, candidate) {
  if (!term || !candidate) return false;
  if (term === candidate) return true;
  const t = ` ${term} `;
  const c = ` ${candidate} `;
  return t.includes(c) || c.includes(t);
}

function namesFor(id) {
  const ing = getIngredient(id);
  return [id.replace(/_/g, ' '), ing.name, ing.short, ...(ing.aliases || [])].map(normalizeText);
}

/** Does a free-text term (e.g. "cooked carrots") refer to this ingredient? */
export function ingredientMatchesTerm(id, term) {
  const t = normalizeText(term);
  return namesFor(id).some((n) => termMatches(t, n));
}

/** Map free text to a catalogue ingredient id (exact names first, then partial). */
export function findIngredientByName(text, cats) {
  const t = normalizeText(text);
  if (!t) return null;
  const ids = allIngredientIds().filter((id) => !cats || cats.includes(getIngredient(id).cat));
  const exact = ids.find((id) => namesFor(id).includes(t));
  if (exact) return exact;
  return ids.find((id) => namesFor(id).some((n) => termMatches(t, n))) || null;
}

/** Like findIngredientByName but also reports whether the match was exact. */
export function matchIngredient(text, cats) {
  const t = normalizeText(text);
  const id = findIngredientByName(text, cats);
  return { id, exact: !!id && namesFor(id).includes(t) };
}

// ------------------------------------------------------------------------------------------
// Locks & blocklist
// ------------------------------------------------------------------------------------------
export function blockReason(id, settings) {
  if (isBasic(id)) return null;
  const ing = getIngredient(id);
  const flags = ing.flags || [];
  for (const lock of LOCKS) {
    if (settings.locks[lock.id] && flags.includes(lock.flag)) return lock.label;
  }
  const term = (settings.blocklist || []).find((b) => ingredientMatchesTerm(id, b));
  if (term) return `Never suggest: ${term}`;
  return null;
}
export const isBlocked = (id, settings) => blockReason(id, settings) !== null;

// ------------------------------------------------------------------------------------------
// Substitutions
// ------------------------------------------------------------------------------------------
export const subKey = (sub) => `${sub.from}>${sub.to.map((t) => t.id).join('+')}`;
const SUB_BY_KEY = Object.fromEntries(SUBSTITUTIONS.map((s) => [subKey(s), s]));
export const getSubstitution = (key) => SUB_BY_KEY[key] || null;

export function substitutionsFor(id, settings) {
  return SUBSTITUTIONS
    .filter((s) => s.from === id)
    .map((s) => ({ ...s, key: subKey(s), allowed: !s.to.some((t) => isBlocked(t.id, settings)) }));
}

/** Pick the best allowed substitute; prefer ones whose replacement(s) are already available. */
export function bestSubstitute(id, settings, available) {
  const subs = substitutionsFor(id, settings).filter((s) => s.allowed);
  if (!subs.length) return null;
  if (available) {
    const ready = subs.find((s) => s.to.every((t) => isAvailable(t.id, available)));
    if (ready) return { ...ready, ready: true };
  }
  return { ...subs[0], ready: false };
}

export function formatRatio(sub) {
  return sub.to.map((t) => `1 : ${roundNice(t.r)} ${ingredientShort(t.id)}`).join(' + ');
}

// ------------------------------------------------------------------------------------------
// Recipe resolution: swaps + locks + blocklist + appliance adaptation
// ------------------------------------------------------------------------------------------
export function getRecipe(id) {
  return allRecipes().find((r) => r.id === id) || null;
}

/**
 * Returns an "effective" recipe:
 *  lines: [{ srcId, base (original entry), entries: [{id, g}], kind: 'original'|'user'|'auto'|'dropped', subKey, reason }]
 *  steps: appliance-adapted steps with resolved deps
 *  hidden / hiddenReasons when a lock can't be satisfied
 */
export function resolveRecipe(recipe, settings, userSwaps = {}) {
  const lines = [];
  const hiddenReasons = [];

  for (const item of recipe.ingredients) {
    let line = { srcId: item.id, base: item, entries: [{ id: item.id, g: item.g }], kind: 'original', subKey: null, reason: null };

    const chosen = userSwaps[item.id] && getSubstitution(userSwaps[item.id]);
    if (chosen && chosen.from === item.id && !chosen.to.some((t) => isBlocked(t.id, settings))) {
      line = { ...line, entries: chosen.to.map((t) => ({ id: t.id, g: item.g * t.r })), kind: 'user', subKey: subKey(chosen) };
    }

    const blocked = line.entries.map((e) => blockReason(e.id, settings)).find(Boolean);
    if (blocked) {
      if (item.opt) {
        line = { ...line, entries: [], kind: 'dropped', reason: blocked };
      } else if ((recipe.lockedCore || []).includes(item.id)) {
        hiddenReasons.push(`${ingredientName(item.id)} is essential (${blocked})`);
      } else {
        const auto = substitutionsFor(item.id, settings).find((s) => s.allowed);
        if (auto) {
          line = { ...line, entries: auto.to.map((t) => ({ id: t.id, g: item.g * t.r })), kind: 'auto', subKey: auto.key, reason: blocked };
        } else {
          hiddenReasons.push(`${ingredientName(item.id)} (${blocked})`);
        }
      }
    }
    lines.push(line);
  }

  const steps = [];
  recipe.steps.forEach((s, i) => {
    const dep = Array.isArray(s.dep) ? s.dep : (i > 0 ? [i - 1] : []);
    const real = APPLIANCES.some((a) => a.id === s.app);
    if (real && !settings.appliances[s.app]) {
      const altApp = Object.keys(s.alt || {}).find((k) => settings.appliances[k]);
      if (!altApp) {
        hiddenReasons.push(`needs ${APPLIANCES.find((a) => a.id === s.app).label}`);
        steps.push({ ...s, idx: i, dep, unavailable: true });
      } else {
        const alt = s.alt[altApp];
        steps.push({ ...s, ...alt, app: altApp, adaptedFrom: s.app, idx: i, dep });
      }
    } else {
      steps.push({ ...s, idx: i, dep });
    }
  });

  return {
    ...recipe,
    lines,
    steps,
    hidden: hiddenReasons.length > 0,
    hiddenReasons: [...new Set(hiddenReasons)],
    swapsApplied: lines.filter((l) => l.kind === 'user' || l.kind === 'auto'),
    dropped: lines.filter((l) => l.kind === 'dropped'),
    adaptedSteps: steps.filter((s) => s.adaptedFrom),
  };
}

/** Scale a resolved recipe to N servings (non-mutating). */
export function scaleResolved(resolved, servings) {
  const f = servings / resolved.servings;
  return {
    ...resolved,
    servingsNow: servings,
    factor: f,
    lines: resolved.lines.map((l) => ({ ...l, entries: l.entries.map((e) => ({ ...e, g: e.g * f })) })),
  };
}

export function flatItems(resolvedOrScaled) {
  return resolvedOrScaled.lines.flatMap((l) => l.entries);
}

// ------------------------------------------------------------------------------------------
// Macros
// ------------------------------------------------------------------------------------------
export function computeMacros(items) {
  const t = { p: 0, c: 0, f: 0, kcal: 0 };
  for (const { id, g } of items) {
    const m = getIngredient(id).m;
    t.p += (m[0] * g) / 100;
    t.c += (m[1] * g) / 100;
    t.f += (m[2] * g) / 100;
    t.kcal += (m[3] * g) / 100;
  }
  return t;
}

export function divideMacros(m, n) {
  return { p: m.p / n, c: m.c / n, f: m.f / n, kcal: m.kcal / n };
}

export function roundMacros(m) {
  return { p: Math.round(m.p), c: Math.round(m.c), f: Math.round(m.f), kcal: Math.round(m.kcal) };
}

export const kcalFromMacros = (p = 0, c = 0, f = 0) => Math.round(p * 4 + c * 4 + f * 9);

/** Per-serving macros of a resolved recipe at any portion count. */
export function servingMacros(resolved) {
  return divideMacros(computeMacros(flatItems(resolved)), resolved.servings);
}

// ------------------------------------------------------------------------------------------
// Formatting helpers (pure, no DOM)
// ------------------------------------------------------------------------------------------
export function roundNice(n) {
  if (n === 0) return 0;
  if (n < 10) return Math.round(n * 10) / 10;
  return Math.round(n);
}

export function formatAmount(id, g) {
  const ing = getIngredient(id);
  const unit = ing.unit || 'g';
  let txt;
  if (g >= 1000) {
    txt = `${(Math.round(g / 10) / 100).toString()} ${unit === 'ml' ? 'L' : 'kg'}`;
  } else {
    txt = `${roundNice(g)} ${unit}`;
  }
  if (ing.each) {
    const count = Math.round((g / ing.each) * 2) / 2;
    txt += ` (≈${count} ${count === 1 ? ing.piece : `${ing.piece}s`})`;
  }
  return txt;
}

export function formatMinutes(min) {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export function clockLabel(min) {
  const m = Math.round(min);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

/** Split step text into renderable segments; {id} → name, {=id} → amount + name. */
export function stepSegments(text, scaledLines) {
  const out = [];
  const re = /\{(=?)([a-z_]+)\}/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ type: 'text', v: text.slice(last, m.index) });
    const withAmt = m[1] === '=';
    const id = m[2];
    const line = scaledLines.find((l) => l.srcId === id);
    if (!line) {
      out.push({ type: 'ing', name: ingredientShort(id), amount: null, swapped: false });
    } else if (line.kind === 'dropped') {
      out.push({ type: 'ing', name: `${ingredientShort(id)} (skipped)`, amount: null, swapped: true, dropped: true });
    } else {
      const name = line.entries.map((e) => ingredientShort(e.id)).join(' + ');
      const amount = withAmt ? line.entries.map((e) => formatAmount(e.id, e.g)).join(' + ') : null;
      if (withAmt && line.entries.length > 1) {
        out.push({ type: 'ing', name: line.entries.map((e) => `${formatAmount(e.id, e.g)} ${ingredientShort(e.id)}`).join(' + '), amount: null, swapped: line.kind !== 'original' });
      } else {
        out.push({ type: 'ing', name, amount, swapped: line.kind !== 'original' });
      }
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ type: 'text', v: text.slice(last) });
  return out;
}

export const segmentsToText = (segs) => segs.map((s) => (s.type === 'text' ? s.v : `${s.amount ? `${s.amount} ` : ''}${s.name}`)).join('');

// ------------------------------------------------------------------------------------------
// Availability & matching (Quick Cook)
// ------------------------------------------------------------------------------------------
/** Build the availability set: pantry toggles + fridge chips + leftovers + matched custom text. */
export function buildAvailability({ pantry = {}, fridge = [], leftovers = [], custom = [] }) {
  const ids = new Set();
  Object.keys(pantry).forEach((id) => { if (pantry[id]) ids.add(id); });
  fridge.forEach((id) => ids.add(id));
  leftovers.forEach((id) => ids.add(id));
  const unmatched = [];
  custom.forEach((txt) => {
    const id = findIngredientByName(txt);
    if (id) ids.add(id); else unmatched.push(txt);
  });
  return { ids, unmatched };
}

export function isAvailable(id, available) {
  return isBasic(id) || available.ids.has(id);
}

export function matchRecipe(resolved, available, useFirst = []) {
  const required = resolved.lines.filter((l) => l.kind !== 'dropped' && !l.base.opt && !l.entries.every((e) => isBasic(e.id)));
  const missing = [];
  let have = 0;
  required.forEach((l) => {
    const miss = l.entries.filter((e) => !isAvailable(e.id, available));
    if (miss.length) miss.forEach((e) => missing.push({ id: e.id, line: l }));
    else have += 1;
  });
  const useSet = new Set(useFirst);
  const useFirstHits = resolved.lines
    .filter((l) => l.kind !== 'dropped' && (useSet.has(l.srcId) || l.entries.some((e) => useSet.has(e.id))))
    .map((l) => l.entries.find((e) => useSet.has(e.id))?.id || l.srcId);
  const pct = required.length ? have / required.length : 1;
  return { pct, have, total: required.length, missing, useFirstHits: [...new Set(useFirstHits)] };
}

/**
 * Rank recipes for Quick Cook.
 * Returns { ready: [...], missingOne: [...], others: [...], hidden: [...] }
 * Each result: { recipe (resolved), match, perServing, time, subs: [{missingId, sub}] }
 */
export function rankRecipes({ settings, fridge, recipePrefs = {} }) {
  const available = buildAvailability({
    pantry: settings.pantry,
    fridge: fridge.selected,
    leftovers: fridge.leftoverMode ? fridge.leftovers : [],
    custom: fridge.custom,
  });
  const useFirst = fridge.useFirst || [];

  const pool = allRecipes()
    .filter((r) => (fridge.leftoverMode ? r.leftover : !r.leftover))
    .filter((r) => !fridge.mood || fridge.mood === 'All' || r.moods.includes(fridge.mood));

  const hidden = [];
  const results = [];
  pool.forEach((r) => {
    const resolved = resolveRecipe(r, settings, recipePrefs[r.id]?.swaps || {});
    if (resolved.hidden) { hidden.push({ recipe: resolved, reasons: resolved.hiddenReasons }); return; }
    const match = matchRecipe(resolved, available, useFirst);
    const subs = match.missing.map((mi) => ({ missingId: mi.id, srcId: mi.line.srcId, sub: bestSubstitute(mi.id, settings, available) }));
    const perServing = servingMacros(resolved);
    const score = match.pct + 0.6 * Math.min(match.useFirstHits.length, 3) + perServing.p / 1000;
    results.push({ recipe: resolved, match, subs, perServing, time: recipeTime(resolved), score });
  });

  results.sort((a, b) => b.score - a.score);
  return {
    ready: results.filter((x) => x.match.missing.length === 0),
    missingOne: results.filter((x) => x.match.missing.length === 1),
    others: results.filter((x) => x.match.missing.length > 1).sort((a, b) => b.match.pct - a.match.pct || b.score - a.score),
    hidden,
    unmatchedCustom: available.unmatched,
    available,
  };
}

// ------------------------------------------------------------------------------------------
// Time: active vs passive, single-recipe schedule and parallel batch timeline
// ------------------------------------------------------------------------------------------
/** Scale step durations for a bigger batch. Pan/basket-capacity steps repeat in rounds. */
export function scaleStepTimes(step, portions, baseServings) {
  if (portions <= baseServings) return { a: step.a, p: step.p, rounds: 1 };
  if (step.cap) {
    const rounds = Math.ceil(portions / step.cap);
    const baseRounds = Math.ceil(baseServings / step.cap);
    const mult = rounds / baseRounds;
    return { a: Math.round(step.a * mult), p: Math.round(step.p * mult), rounds };
  }
  const f = portions / baseServings;
  const a = step.a > 0 ? Math.max(1, Math.round(step.a * (1 + 0.3 * (f - 1)))) : 0;
  return { a, p: step.p, rounds: 1 };
}

function earliestFit(intervals, t, dur) {
  if (dur <= 0) return t;
  let start = t;
  const sorted = [...intervals].sort((x, y) => x[0] - y[0]);
  for (const [s, e] of sorted) {
    if (start + dur <= s) return start;
    if (start < e) start = e;
  }
  return start;
}

/**
 * Greedy list scheduler.
 * jobs: [{ resolved, portions }]
 * Resources: one cook (busy during active minutes) + appliance slots (busy for active + passive).
 */
export function buildTimeline(jobs) {
  const tasks = [];
  jobs.forEach((job, ji) => {
    const scaled = scaleResolved(job.resolved, job.portions);
    const base = tasks.length;
    job.resolved.steps.forEach((s, si) => {
      const t = scaleStepTimes(s, job.portions, job.resolved.servings);
      tasks.push({
        uid: base + si,
        job: ji,
        recipeId: job.resolved.id,
        recipeName: job.resolved.name,
        emoji: job.resolved.emoji,
        stepNo: si + 1,
        app: s.app,
        adaptedFrom: s.adaptedFrom || null,
        a: t.a,
        p: t.p,
        rounds: t.rounds,
        deps: s.dep.map((d) => base + d),
        segments: stepSegments(s.t, scaled.lines),
      });
    });
  });

  // Longest remaining path → priority.
  const succ = new Map(tasks.map((t) => [t.uid, []]));
  tasks.forEach((t) => t.deps.forEach((d) => succ.get(d).push(t.uid)));
  const tailMemo = new Map();
  const tail = (uid) => {
    if (tailMemo.has(uid)) return tailMemo.get(uid);
    const t = tasks[uid];
    const v = t.a + t.p + Math.max(0, ...succ.get(uid).map(tail));
    tailMemo.set(uid, v);
    return v;
  };

  const cook = [];
  const slots = {};
  Object.keys(APPLIANCE_CAPACITY).forEach((k) => { slots[k] = Array.from({ length: APPLIANCE_CAPACITY[k] }, () => []); });
  const done = new Map();
  const remaining = new Set(tasks.map((t) => t.uid));

  const plan = (t) => {
    const ready = Math.max(0, ...t.deps.map((d) => done.get(d).end));
    const appSlots = slots[t.app];
    let best = null;
    (appSlots || [null]).forEach((slot, slotIdx) => {
      let s = ready;
      for (let guard = 0; guard < 50; guard += 1) {
        const s1 = earliestFit(cook, s, t.a);
        const s2 = slot ? earliestFit(slot, s1, t.a + t.p) : s1;
        if (s2 === s1) { s = s1; break; }
        s = s2;
      }
      if (!best || s < best.start) best = { start: s, slotIdx };
    });
    return best;
  };

  while (remaining.size) {
    const candidates = [...remaining].map((uid) => tasks[uid]).filter((t) => t.deps.every((d) => done.has(d)));
    let pick = null;
    candidates.forEach((t) => {
      const p = plan(t);
      if (!pick || p.start < pick.p.start || (p.start === pick.p.start && tail(t.uid) > tail(pick.t.uid))) pick = { t, p };
    });
    const { t, p } = pick;
    const start = p.start;
    const activeEnd = start + t.a;
    const end = start + t.a + t.p;
    if (t.a > 0) cook.push([start, activeEnd]);
    if (slots[t.app]) slots[t.app][p.slotIdx].push([start, end]);
    done.set(t.uid, { ...t, start, activeEnd, end, slot: p.slotIdx });
    remaining.delete(t.uid);
  }

  const scheduled = [...done.values()].sort((x, y) => x.start - y.start || x.job - y.job);
  const makespan = Math.max(0, ...scheduled.map((t) => t.end));
  const activeTotal = scheduled.reduce((s, t) => s + t.a, 0);
  const sequentialTotal = scheduled.reduce((s, t) => s + t.a + t.p, 0);
  return { tasks: scheduled, makespan, activeTotal, sequentialTotal, saved: Math.max(0, sequentialTotal - makespan) };
}

/** Active (hands-on) vs passive (hands-off) minutes and realistic total for one recipe. */
export function recipeTime(resolved, portions) {
  const n = portions || resolved.servings;
  const tl = buildTimeline([{ resolved, portions: n }]);
  const active = tl.tasks.reduce((s, t) => s + t.a, 0);
  const passive = tl.tasks.reduce((s, t) => s + t.p, 0);
  return { active, passive, total: tl.makespan };
}

// ------------------------------------------------------------------------------------------
// 7-Day batch prep
// ------------------------------------------------------------------------------------------
export function splitContainers(containers = 7, fridgeDays = 4) {
  return Array.from({ length: containers }, (_, i) => {
    const day = i + 1;
    const where = day <= fridgeDays ? 'fridge' : 'freezer';
    return { day, where, thaw: where === 'freezer' ? `Move to the fridge on the evening of Day ${day - 1}` : null };
  });
}

/**
 * Full 7-day plan for one recipe.
 * size = container multiplier (1 = one recipe serving per container).
 */
export function batchPlan(recipe, settings, swaps = {}, { containers = 7, size = 1, fridgeDays = 4 } = {}) {
  const resolved = resolveRecipe(recipe, settings, swaps);
  const portions = containers * size;
  const scaled = scaleResolved(resolved, portions);
  const totals = scaled.lines
    .filter((l) => l.kind !== 'dropped')
    .flatMap((l) => l.entries.map((e) => ({ ...e, srcId: l.srcId, kind: l.kind, perContainer: e.g / containers })));
  const totalMacros = computeMacros(flatItems(scaled));
  const perContainer = divideMacros(totalMacros, containers);

  const freezer = recipe.batch?.freezer || 'ok';
  const bakedIn = new Set(recipe.batch?.bakedIn || []);
  const recipeFresh = new Set(recipe.batch?.packFresh || []);
  const packFresh = [];
  scaled.lines.forEach((l) => {
    if (l.kind === 'dropped') return;
    l.entries.forEach((e) => {
      const flag = getIngredient(e.id).freeze;
      const flaggedByIngredient = flag && !bakedIn.has(e.id) && !bakedIn.has(l.srcId);
      if (recipeFresh.has(l.srcId) || flaggedByIngredient) {
        packFresh.push({
          id: e.id,
          srcId: l.srcId,
          perContainer: e.g / containers,
          freezerTotal: (e.g / containers) * Math.max(0, containers - fridgeDays),
          type: flag || 'recipe',
          reason: FREEZE_REASONS[flag || 'recipe'],
        });
      }
    });
  });

  let days = splitContainers(containers, fridgeDays);
  if (freezer === 'no') {
    days = days.map((d) => (d.where === 'freezer' ? { ...d, where: 'fresh', thaw: 'Doesn\'t freeze well. Cook a fresh mini-batch on Day 4.' } : d));
  }

  return {
    resolved,
    scaled,
    portions,
    containers,
    totals,
    totalMacros,
    perContainer,
    days,
    fridgeCount: days.filter((d) => d.where === 'fridge').length,
    freezerCount: days.filter((d) => d.where === 'freezer').length,
    freezer,
    packFresh,
    note: recipe.batch?.note || '',
    reheat: recipe.reheat || {},
    time: recipeTime(resolved, portions),
  };
}

export function batchableRecipes(settings, recipePrefs = {}) {
  return allRecipes().map((r) => resolveRecipe(r, settings, recipePrefs[r.id]?.swaps || {})).filter((r) => !r.hidden);
}

// ------------------------------------------------------------------------------------------
// Sauces & taste fixes
// ------------------------------------------------------------------------------------------
export function getSauce(id) {
  return SAUCES.find((s) => s.id === id) || null;
}
export const listSauces = () => SAUCES;

/** Scale a sauce by servings ({servings}) or by total finished weight ({totalGrams}). */
export function scaleSauce(sauce, { servings, totalGrams } = {}) {
  const baseTotal = sauce.items.reduce((s, i) => s + i.g, 0);
  let f = 1;
  if (totalGrams) f = totalGrams / baseTotal;
  else if (servings) f = servings / sauce.serves;
  const items = sauce.items.map((i) => ({ id: i.id, g: i.g * f, pct: (i.g / baseTotal) * 100 }));
  return { items, total: baseTotal * f, factor: f, macros: computeMacros(items) };
}

export function tasteFixes(problemId, { servings = 1, available, settings } = {}) {
  const problem = TASTE_FIXES.find((t) => t.id === problemId);
  if (!problem) return null;
  const fixes = problem.fixes
    .filter((f) => !settings || !isBlocked(f.id, settings))
    .map((f) => ({ ...f, amount: f.g * servings, have: available ? isAvailable(f.id, available) : true }))
    .sort((a, b) => Number(b.have) - Number(a.have));
  return { ...problem, fixes };
}
export const listTasteProblems = () => TASTE_FIXES.map(({ id, label }) => ({ id, label }));

// ------------------------------------------------------------------------------------------
// Logs: meals & body measurements
// ------------------------------------------------------------------------------------------
export function dayKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function shiftDayKey(key, delta) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + delta));
}

export function makeMealEntry({ name, p = 0, c = 0, f = 0, kcal, recipeId = null, source = 'manual', portion = 1, now = Date.now() }) {
  const P = Number(p) || 0;
  const C = Number(c) || 0;
  const F = Number(f) || 0;
  return {
    id: `m${now.toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
    ts: now,
    name: String(name || 'Meal').trim() || 'Meal',
    recipeId,
    source,
    portion,
    p: Math.round(P),
    c: Math.round(C),
    f: Math.round(F),
    kcal: Math.round(Number(kcal) || kcalFromMacros(P, C, F)),
  };
}

export function addMealLog(mealLogs, key, entry) {
  return { ...mealLogs, [key]: [...(mealLogs[key] || []), entry] };
}

export function removeMealLog(mealLogs, key, entryId) {
  return { ...mealLogs, [key]: (mealLogs[key] || []).filter((e) => e.id !== entryId) };
}

export function summarizeDay(entries = [], targets) {
  const t = entries.reduce((s, e) => ({ p: s.p + e.p, c: s.c + e.c, f: s.f + e.f, kcal: s.kcal + e.kcal }), { p: 0, c: 0, f: 0, kcal: 0 });
  return {
    ...t,
    proteinPct: targets.protein ? Math.min(1, t.p / targets.protein) : 0,
    kcalPct: targets.calories ? Math.min(1, t.kcal / targets.calories) : 0,
    proteinLeft: Math.max(0, targets.protein - t.p),
    kcalLeft: targets.calories - t.kcal,
  };
}

export function addWeightLog(logs, { date, kg, chest, waist, hip }, now = Date.now()) {
  const num = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));
  const entry = { id: `w${now.toString(36)}`, date, kg: num(kg), chest: num(chest), waist: num(waist), hip: num(hip) };
  const others = logs.filter((l) => l.date !== date);
  return [...others, entry].sort((a, b) => a.date.localeCompare(b.date));
}

export function removeWeightLog(logs, id) {
  return logs.filter((l) => l.id !== id);
}

/** Series + stats for one metric ('kg' | 'chest' | 'waist' | 'hip'). */
export function measurementTrend(logs, metric = 'kg') {
  const points = logs.filter((l) => l[metric] !== null && l[metric] !== undefined).sort((a, b) => a.date.localeCompare(b.date)).map((l) => ({ date: l.date, v: l[metric] }));
  if (!points.length) return { points, min: 0, max: 0, change: 0, latest: null, avg7: null };
  const vs = points.map((p) => p.v);
  const recent = points.slice(-7);
  return {
    points,
    min: Math.min(...vs),
    max: Math.max(...vs),
    latest: vs[vs.length - 1],
    first: vs[0],
    change: Math.round((vs[vs.length - 1] - vs[0]) * 10) / 10,
    avg7: Math.round((recent.reduce((s, p) => s + p.v, 0) / recent.length) * 10) / 10,
  };
}

export function withDeltas(logs) {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((l, i) => {
    const prev = sorted.slice(0, i).reverse().find((x) => x.kg !== null);
    return { ...l, dKg: prev && l.kg !== null ? Math.round((l.kg - prev.kg) * 10) / 10 : null };
  }).reverse();
}

// ==========================================================================================
// BATCH CART & MASTER PROTEIN BUILDER
// ==========================================================================================
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export const getKit = (id) => FLAVOR_KITS.find((k) => k.id === id) || null;
export const getBase = (id) => BREAKFAST_BASES.find((b) => b.id === id) || null;
export const getStorageTag = (id) => STORAGE_TAGS[id] || null;
export const listMealSlots = () => MEAL_SLOTS;
export const listBatchCuisines = () => BATCH_CUISINES;
export const batchDefaults = () => BATCH_DEFAULTS;
export const listMoods = () => [...new Set([...MOODS, ...CUSTOM_RECIPES.flatMap((r) => r.moods || [])])];

/** Turn a kit / breakfast base (per-serving items) into a recipe-shaped object for the shared resolver. */
function templatePseudo(def, kind) {
  const n = BATCH_DEFAULTS.base;
  return {
    id: `${kind}:${def.id}`,
    name: def.name,
    emoji: def.emoji,
    servings: n,
    cuisine: def.cuisines[0],
    moods: def.cuisines,
    lockedCore: def.lockedCore || [],
    ingredients: def.items.map((i) => ({ id: i.id, g: i.g * n, pool: !!i.pool, opt: !!i.opt })),
    steps: def.steps,
    techniques: def.tip ? [def.tip] : [],
    blurb: '',
    batch: {},
    reheat: {},
  };
}

export function masterProteins(settings) {
  return Object.keys(PROTEIN_MASTERS).filter((id) => !isBlocked(id, settings));
}

/** The protein to actually cook: the requested one, or its best lock-safe substitute. */
export function resolveMasterProtein(id, settings) {
  if (PROTEIN_MASTERS[id] && !isBlocked(id, settings)) return id;
  const sub = substitutionsFor(id, settings).find((s) => s.allowed && PROTEIN_MASTERS[s.to[0].id]);
  if (sub) return sub.to[0].id;
  return masterProteins(settings)[0] || null;
}

export function masterMethodOptions(settings) {
  return APPLIANCES.filter((a) => settings.appliances[a.id]).map((a) => ({ id: a.id, label: a.label }));
}

export function chooseMasterMethod(protein, pref, settings) {
  const pm = PROTEIN_MASTERS[protein];
  if (!pm) return null;
  if (pref && pref !== 'auto' && pm.methods[pref] && settings.appliances[pref]) return pm.methods[pref];
  const app = pm.prefer.find((a) => settings.appliances[a] && pm.methods[a]);
  return app ? pm.methods[app] : null;
}

function masterPseudo(protein, methodKey, rawPerServing) {
  const m = MASTER_METHODS[methodKey];
  const n = BATCH_DEFAULTS.base;
  return {
    id: `master:${protein}`,
    name: `Master ${ingredientShort(protein)} (neutral)`,
    emoji: PROTEIN_MASTERS[protein].emoji,
    servings: n,
    moods: [],
    ingredients: [
      { id: protein, g: rawPerServing * n },
      ...m.items.map((it) => ({ id: it.id, g: (it.perRaw ? it.perRaw * rawPerServing : it.g) * n })),
    ],
    steps: m.steps.map((st) => ({ ...st, t: st.t.replace(/\{(=?)protein\}/g, (_, eq) => `{${eq}${protein}}`) })),
    techniques: [],
  };
}

function carbPseudo(id, perServing) {
  const n = BATCH_DEFAULTS.base;
  const cook = CARB_COOKS[id] || { steps: [{ app: 'stovetop', a: 3, p: 15, dep: [], t: `Cook {=${id}} as the packet directs, then cool it fast on a tray.` }] };
  return { id: `carb:${id}`, name: `Shared ${ingredientShort(id)}`, emoji: '🍚', servings: n, moods: [], ingredients: [{ id, g: perServing * n }], steps: cook.steps, techniques: [] };
}

/** Options for a block: flavor kits / breakfast bases for that cuisine, plus matching full recipes. */
export function choiceOptions(slot, cuisine, settings, recipePrefs = {}) {
  const out = [];
  const defs = slot === 'Breakfast' ? BREAKFAST_BASES.map((d) => ['base', d]) : FLAVOR_KITS.map((d) => ['kit', d]);
  defs.filter(([, d]) => d.cuisines.includes(cuisine)).forEach(([kind, d]) => {
    const res = resolveRecipe(templatePseudo(d, kind), settings);
    if (!res.hidden) out.push({ key: `${kind}:${d.id}`, kind, id: d.id, label: d.name, storage: d.storage || null, swaps: res.swapsApplied.length });
  });
  allRecipes()
    .filter((r) => !r.leftover && [...(r.moods || []), r.cuisine].includes(cuisine))
    .filter((r) => (slot === 'Breakfast' ? r.slot === 'Breakfast' : r.slot !== 'Breakfast'))
    .forEach((r) => {
      const res = resolveRecipe(r, settings, recipePrefs[r.id]?.swaps || {});
      if (!res.hidden) out.push({ key: `recipe:${r.id}`, kind: 'recipe', id: r.id, label: r.name, storage: null, custom: !!r.custom });
    });
  return out;
}

const splitKey = (key) => { const i = key.indexOf(':'); return [key.slice(0, i), key.slice(i + 1)]; };
const newId = (now, i = 0) => `b${now.toString(36)}${i.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

export function makeBlock({ count, slot, cuisine, protein, choice }, settings, now = Date.now(), i = 0) {
  const opts = choiceOptions(slot, cuisine, settings);
  return {
    id: newId(now, i),
    count: clamp(Math.round(count || 1), 1, BATCH_DEFAULTS.maxCount),
    slot,
    cuisine,
    choice: choice || (opts[0] ? opts[0].key : null),
    protein: slot === 'Breakfast' ? null : (protein || 'turkey_breast'),
  };
}

// ---------- Protein-First ----------
export function proteinYield(grams, { min = BATCH_DEFAULTS.minRaw, max = BATCH_DEFAULTS.maxRaw } = {}) {
  const g = Math.max(0, num(grams));
  const best = g ? Math.max(1, Math.round(g / ((min + max) / 2))) : 0;
  return { grams: g, low: Math.floor(g / max), high: Math.floor(g / min), best, perServing: best ? g / best : 0 };
}

export function distributeCount(total, n) {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  const rem = total % n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}

/** Create blocks that split a protein's portions across cuisines (max 10 per block). */
export function proteinFirstBlocks({ protein, grams, slot = 'Lunch', cuisines = [] }, settings, now = Date.now()) {
  const y = proteinYield(grams);
  const cs = cuisines.length ? cuisines : ['Quick High-Protein'];
  const counts = distributeCount(y.best, cs.length);
  const blocks = [];
  cs.forEach((c, i) => {
    let left = counts[i];
    while (left > 0) {
      const n = Math.min(left, BATCH_DEFAULTS.maxCount);
      blocks.push(makeBlock({ count: n, slot, cuisine: c, protein }, settings, now, blocks.length));
      left -= n;
    }
  });
  return { blocks, yield: y };
}

// ---------- Grocery ----------
export const GROCERY_GROUPS = ['Protein', 'Dairy & Eggs', 'Vegetables & Herbs', 'Rice, Pasta & Carbs', 'Pantry & Sauces', 'Imported'];
function groceryGroup(id) {
  const ing = getIngredient(id);
  if (ing.cat === 'custom') return 'Imported';
  if (ing.group === 'Protein' || ing.cat === 'leftover') return 'Protein';
  if (ing.group === 'Dairy & Eggs') return 'Dairy & Eggs';
  if (['potatoes', 'sweet_potato', 'rice_cakes'].includes(id) || ing.group === 'Rice & Pasta') return 'Rice, Pasta & Carbs';
  if (ing.cat === 'fresh') return 'Vegetables & Herbs';
  return 'Pantry & Sauces';
}

export function buildGrocery(sums, settings) {
  const groups = {};
  Object.keys(sums).forEach((id) => {
    if (id === 'water' || sums[id] <= 0) return;
    const g = groceryGroup(id);
    (groups[g] = groups[g] || []).push({ id, g: sums[id], amount: formatAmount(id, sums[id]), inPantry: !!settings.pantry[id] || isBasic(id) });
  });
  return GROCERY_GROUPS.filter((g) => groups[g]).map((g) => ({ group: g, items: groups[g].sort((a, b) => b.g - a.g) }));
}

export function groceryText(grocery) {
  return grocery.map((grp) => `${grp.group.toUpperCase()}\n${grp.items.map((i) => `- ${ingredientName(i.id)}: ${i.amount}${i.inPantry ? ' (pantry)' : ''}`).join('\n')}`).join('\n\n');
}

// ---------- Planner ----------
const divLines = (res, n) => res.lines
  .filter((l) => l.kind !== 'dropped')
  .map((l) => ({ ...l, entries: l.entries.map((e) => ({ ...e, g: e.g / n })) }));

function freshEntries(lines, { sauceIds = new Set(), packFresh = new Set(), bakedIn = new Set() }) {
  return lines
    .filter((l) => !sauceIds.has(l.srcId))
    .filter((l) => packFresh.has(l.srcId) || l.entries.some((e) => getIngredient(e.id).freeze && !bakedIn.has(e.id) && !bakedIn.has(l.srcId)))
    .flatMap((l) => l.entries);
}

/**
 * Plan the whole cart: pooled master proteins, pooled carbs, flavor kits, breakfast bases
 * and full recipes → containers (Days 1–4 fridge, Day 5+ freezer), grocery list, timeline.
 */
export function planCart(cart, settings, recipePrefs = {}) {
  const warnings = [];
  const fridgeDays = BATCH_DEFAULTS.fridgeDays;
  const defaultRaw = clamp(num(cart.rawPerServing) || BATCH_DEFAULTS.rawPerServing, 80, 300);

  // 1) Resolve each block's choice under the current rules.
  const blocks = [];
  (cart.blocks || []).forEach((b) => {
    const count = clamp(Math.round(num(b.count) || 1), 1, BATCH_DEFAULTS.maxCount);
    const options = choiceOptions(b.slot, b.cuisine, settings, recipePrefs);
    const opt = options.find((o) => o.key === b.choice) || options[0];
    if (!opt) { warnings.push(`No ${b.slot.toLowerCase()} option for ${b.cuisine} fits your rules, so that block is skipped.`); return; }
    if (b.choice && opt.key !== b.choice) warnings.push(`${b.cuisine} ${b.slot.toLowerCase()}: your pick no longer fits your rules, so it uses "${opt.label}".`);
    let protein = null;
    if (opt.kind === 'kit') {
      protein = resolveMasterProtein(b.protein || 'turkey_breast', settings);
      if (!protein) { warnings.push('Every master protein is blocked by your rules.'); return; }
      if (b.protein && protein !== b.protein) warnings.push(`${ingredientName(b.protein)} is blocked by your rules, so ${ingredientName(protein)} is used instead.`);
    }
    blocks.push({ ...b, count, opt, options, protein });
  });

  // 2) Pool proteins into master cooks.
  const proteinCounts = {};
  blocks.filter((b) => b.opt.kind === 'kit').forEach((b) => { proteinCounts[b.protein] = (proteinCounts[b.protein] || 0) + b.count; });
  const masters = [];
  Object.keys(proteinCounts).forEach((p) => {
    const override = num((cart.proteinGrams || {})[p]);
    const raw = override ? override / proteinCounts[p] : defaultRaw;
    const methodKey = chooseMasterMethod(p, cart.method, settings);
    if (!methodKey) { warnings.push(`None of your appliances can cook ${ingredientName(p)}.`); return; }
    const resolved = resolveRecipe(masterPseudo(p, methodKey, raw), settings);
    if (override && (raw < 110 || raw > 200)) warnings.push(`${formatAmount(p, override)} of ${ingredientShort(p)} over ${proteinCounts[p]} boxes = ${Math.round(raw)} g raw each. Adjust the blocks or the Protein-First grams.`);
    masters.push({
      protein: p, emoji: PROTEIN_MASTERS[p].emoji, count: proteinCounts[p], rawPerServing: raw, rawTotal: raw * proteinCounts[p],
      cookedPerServing: raw * PROTEIN_MASTERS[p].yield, methodKey, app: MASTER_METHODS[methodKey].app, methodLabel: MASTER_METHODS[methodKey].label,
      fromGrams: !!override, tip: PROTEIN_MASTERS[p].tip, resolved,
      seasoning: divLines(resolved, BATCH_DEFAULTS.base).filter((l) => l.srcId !== p).flatMap((l) => l.entries).map((e) => ({ ...e, g: e.g * proteinCounts[p] })),
    });
  });
  const masterBy = Object.fromEntries(masters.map((m) => [m.protein, m]));

  // 3) Per-container contents for each block.
  blocks.forEach((b) => {
    if (b.opt.kind === 'kit' || b.opt.kind === 'base') {
      const def = b.opt.kind === 'kit' ? getKit(b.opt.id) : getBase(b.opt.id);
      const res = resolveRecipe(templatePseudo(def, b.opt.kind), settings);
      const m = b.opt.kind === 'kit' ? masterBy[b.protein] : null;
      if (b.opt.kind === 'kit' && !m) { b.skip = true; return; }
      const lines = divLines(res, BATCH_DEFAULTS.base);
      const sauceIds = new Set(def.sauceIds || []);
      Object.assign(b, {
        def, res, lines,
        storage: def.storage || null,
        sauceName: def.sauceName || null,
        sauceItems: lines.filter((l) => sauceIds.has(l.srcId)).flatMap((l) => l.entries),
        packFresh: freshEntries(lines, { sauceIds, packFresh: new Set(def.packFresh || []), bakedIn: new Set(def.bakedIn || []) }),
        poolLines: lines.filter((l) => l.base.pool),
        items: [...(m ? divLines(m.resolved, BATCH_DEFAULTS.base) : []), ...lines].flatMap((l) => l.entries),
        reheat: [m && PROTEIN_MASTERS[b.protein].reheat, def.reheat].filter(Boolean),
        freezer: 'ok',
        name: def.name,
        subtitle: m ? `${ingredientName(b.protein)} · ${Math.round(m.cookedPerServing)} g cooked` : b.cuisine,
        emoji: def.emoji,
        tip: def.tip || null,
      });
    } else {
      const r = getRecipe(b.opt.id);
      const res = resolveRecipe(r, settings, recipePrefs[r.id]?.swaps || {});
      const lines = divLines(res, r.servings);
      Object.assign(b, {
        def: r, res, lines,
        storage: null, sauceName: null, sauceItems: [],
        packFresh: freshEntries(lines, { packFresh: new Set(r.batch?.packFresh || []), bakedIn: new Set(r.batch?.bakedIn || []) }),
        poolLines: [],
        items: lines.flatMap((l) => l.entries),
        reheat: [r.reheat?.microwave || r.reheat?.stovetop || r.reheat?.airfryer || 'Covered with 1 tbsp of water, 2 min at 70%.', r.batch?.note].filter(Boolean),
        freezer: r.batch?.freezer || 'ok',
        name: r.name,
        subtitle: `Full recipe${r.custom ? ' · imported' : ''}`,
        emoji: r.emoji || '🍽️',
        tip: (r.techniques || [])[0] || null,
      });
    }
    b.macros = computeMacros(b.items);
  });
  const live = blocks.filter((b) => !b.skip);

  // 4) Containers & smart fridge/freezer split (per meal slot: day N = Nth container of that slot).
  const containers = [];
  MEAL_SLOTS.forEach((slot) => {
    const rank = (b) => (b.freezer === 'no' ? 0 : b.freezer === 'partial' ? 1 : 2);
    const inSlot = live.filter((b) => b.slot === slot).map((b, i) => ({ b, i })).sort((x, y) => rank(x.b) - rank(y.b) || x.i - y.i).map((x) => x.b);
    let day = 0;
    inSlot.forEach((b) => {
      for (let k = 1; k <= b.count; k += 1) {
        day += 1;
        let where = day <= fridgeDays ? 'fridge' : 'freezer';
        if (where === 'freezer' && b.freezer === 'no') { where = 'fresh'; warnings.push(`${b.name} doesn't freeze. Day ${day} ${slot.toLowerCase()} should be cooked fresh or eaten earlier.`); }
        const reheat = [...b.reheat];
        if (where === 'freezer') reheat.unshift(`Thaw it overnight: move it to the fridge on the evening of Day ${day - 1}.`);
        if (b.storage === 'spoon-after') reheat.push(`Spoon on the ${b.sauceName} only AFTER reheating. Never heat it.`);
        if (b.packFresh.length) reheat.push(`Fresh pot: ${[...new Set(b.packFresh.map((e) => ingredientShort(e.id)))].join(', ')}. Add it after reheating${where === 'freezer' ? ', and buy or make it fresh for freezer days' : ''}.`);
        containers.push({
          id: `${b.id}:${k}`, blockId: b.id, day, slot, cuisine: b.cuisine, kind: b.opt.kind, name: b.name, subtitle: b.subtitle,
          emoji: b.emoji, protein: b.protein, macros: b.macros, items: b.items, storage: b.storage, sauceName: b.sauceName,
          sauceItems: b.sauceItems, packFresh: b.packFresh, where, reheat, freezer: b.freezer,
        });
      }
    });
  });
  containers.sort((a, b) => a.day - b.day || MEAL_SLOTS.indexOf(a.slot) - MEAL_SLOTS.indexOf(b.slot));

  // 5) Unified grocery list (raw, summed across every container).
  const sums = {};
  containers.forEach((c) => c.items.forEach((e) => { sums[e.id] = (sums[e.id] || 0) + e.g; }));
  const grocery = buildGrocery(sums, settings);

  // 6) Parallel timeline: masters + pooled carbs + kits/bases + full recipes.
  const jobs = masters.map((m) => ({ resolved: m.resolved, portions: m.count }));
  const carbTotals = {};
  const carbCounts = {};
  live.forEach((b) => b.poolLines.forEach((l) => l.entries.forEach((e) => {
    carbTotals[e.id] = (carbTotals[e.id] || 0) + e.g * b.count;
    carbCounts[e.id] = (carbCounts[e.id] || 0) + b.count;
  })));
  Object.keys(carbTotals).forEach((id) => {
    const res = resolveRecipe(carbPseudo(id, carbTotals[id] / carbCounts[id]), settings);
    if (res.hidden) warnings.push(`Can't cook the shared ${ingredientShort(id)} with your appliances.`);
    else jobs.push({ resolved: res, portions: carbCounts[id] });
  });
  const pooled = {};
  live.forEach((b) => {
    const k = b.opt.key;
    if (!pooled[k]) pooled[k] = { resolved: b.res, portions: 0, kind: b.opt.kind, def: b.def, storage: b.storage, sauceName: b.sauceName, sauceItems: b.sauceItems, cuisines: new Set() };
    pooled[k].portions += b.count;
    pooled[k].cuisines.add(b.cuisine);
  });
  Object.values(pooled).forEach((p) => jobs.push({ resolved: p.resolved, portions: p.portions }));
  const usable = jobs.filter((j) => !j.resolved.steps.some((s) => s.unavailable));
  const timeline = usable.length ? buildTimeline(usable) : null;

  const kits = Object.values(pooled).filter((p) => p.kind !== 'recipe').map((p) => ({
    id: p.def.id, kind: p.kind, name: p.def.name, emoji: p.def.emoji, count: p.portions, storage: p.storage, sauceName: p.sauceName,
    saucePerBox: p.sauceItems.reduce((s, e) => s + e.g, 0), cuisines: [...p.cuisines], tip: p.def.tip || null,
  }));

  const total = containers.reduce((t, c) => ({ p: t.p + c.macros.p, c: t.c + c.macros.c, f: t.f + c.macros.f, kcal: t.kcal + c.macros.kcal }), { p: 0, c: 0, f: 0, kcal: 0 });
  return {
    blocks: live.map((b) => ({
      id: b.id, slot: b.slot, cuisine: b.cuisine, count: b.count, choice: b.opt.key, kind: b.opt.kind, label: b.opt.label,
      options: b.options, protein: b.protein, macros: b.macros, storage: b.storage, emoji: b.emoji,
    })),
    containers,
    masters,
    kits,
    grocery,
    timeline,
    warnings: [...new Set(warnings)],
    totals: {
      containers: containers.length,
      days: containers.reduce((m, c) => Math.max(m, c.day), 0),
      fridge: containers.filter((c) => c.where === 'fridge').length,
      freezer: containers.filter((c) => c.where === 'freezer').length,
      macros: total,
      avgProtein: containers.length ? total.p / containers.length : 0,
    },
  };
}

// ==========================================================================================
// AI CHEF BRIDGE: prompt out, JSON in
// ==========================================================================================
export function buildChefPrompt({ mode = 'recipe', settings, fridge = {}, targets = DEFAULT_TARGETS, cart = null }) {
  const names = (ids) => ids.map(ingredientName).join(', ') || 'none';
  const pantry = Object.keys(settings.pantry).filter((id) => settings.pantry[id] && !isBlocked(id, settings));
  const locks = LOCKS.filter((l) => settings.locks[l.id]).map((l) => l.label);
  const apps = APPLIANCES.filter((a) => settings.appliances[a.id]).map((a) => a.label);
  const L = [];
  L.push('You are my private high-protein meal-prep chef. Cook like a Michelin-trained chef, but keep it practical for a home kitchen.');
  L.push('');
  L.push('## My kitchen right now');
  L.push(`- Fresh in the fridge: ${[...(fridge.selected || []).map(ingredientName), ...(fridge.custom || [])].join(', ') || 'nothing selected'}`);
  L.push(`- USE FIRST (expiring soon, prioritise these): ${names(fridge.useFirst || [])}`);
  if ((fridge.leftovers || []).length) L.push(`- Already-cooked leftovers: ${names(fridge.leftovers)}`);
  L.push(`- Pantry staples always available: ${names(pantry)}`);
  L.push(`- Appliances I have: ${apps.join(', ')} (no oven)`);
  L.push('');
  L.push('## Hard rules (never break these)');
  L.push(`- Dietary locks: ${locks.join(', ') || 'none'}`);
  if (settings.locks.glutenFree) L.push('  - Gluten-free: tamari (GF) instead of soy sauce, GF pasta, and no wheat, barley, bulgur, couscous, panko or regular noodles.');
  if (settings.locks.nonSpicy) L.push('  - Non-spicy: no chili, chili flakes, hot paprika, gochujang, harissa or wasabi. Sweet or smoked-sweet paprika is fine.');
  L.push(`- Never suggest: ${(settings.blocklist || []).join(', ') || 'nothing'}`);
  L.push('');
  L.push('## Targets');
  L.push(`- Daily: ${targets.protein} g protein and ${targets.calories} kcal. Aim for 35–55 g protein per main meal.`);
  L.push('');
  if (mode === 'batch' && cart) {
    const blocks = (cart.blocks || []).map((b) => `  - ${b.count} × ${b.slot} (${b.cuisine})${b.protein ? `, protein ${ingredientName(b.protein)}` : ''}`);
    L.push('## My batch cart so far');
    L.push(blocks.length ? blocks.join('\n') : '  - (empty)');
    const pg = Object.entries(cart.proteinGrams || {}).map(([p, g]) => `${g} g ${ingredientName(p)}`);
    if (pg.length) L.push(`- Protein I bought: ${pg.join(', ')}`);
    L.push(`- Raw protein per serving: ~${cart.rawPerServing || BATCH_DEFAULTS.rawPerServing} g`);
    L.push('');
    L.push('## Task');
    L.push('Plan my weekly batch prep as meal blocks. Lunch/dinner blocks share ONE neutral master protein cook and get a different cuisine flavor kit each. Breakfast blocks use a breakfast base. Days 1–4 go in the fridge and Day 5+ in the freezer, so cold or creamy sauces must be spoon-after.');
    L.push(`Allowed slots: ${MEAL_SLOTS.join(', ')}. Allowed cuisines: ${BATCH_CUISINES.join(', ')}. Count is 1–10 per block.`);
    L.push(`Built-in flavor kits (use their id in "kit"): ${FLAVOR_KITS.map((k) => `${k.id} [${k.cuisines.join('/')}]`).join('; ')}.`);
    L.push(`Built-in breakfast bases (use their id in "base"): ${BREAKFAST_BASES.map((k) => `${k.id} [${k.cuisines.join('/')}]`).join('; ')}.`);
    L.push('You may also invent new full recipes. Put them in "recipes" and reference them from a block with "recipe": "<recipe name>".');
    L.push('');
    L.push('## Reply format');
    L.push('Reply with ONLY one JSON code block, nothing else, in exactly this shape:');
    L.push('```json');
    L.push(JSON.stringify(AI_BATCH_TEMPLATE, null, 2));
    L.push('```');
  } else {
    L.push('## Task');
    L.push('Suggest 1–3 recipes I can cook now, using the USE FIRST items first and minimising shopping. Give exact gram/ml amounts and realistic hands-on (active) vs hands-off (passive) minutes.');
    L.push('');
    L.push('## Reply format');
    L.push('Reply with ONLY one JSON code block, nothing else. For several recipes use {"recipes": [ ... ]}. Each recipe looks exactly like this:');
    L.push('```json');
    L.push(JSON.stringify(AI_RECIPE_TEMPLATE, null, 2));
    L.push('```');
  }
  L.push('Rules for the JSON: every ingredient needs "g" or "ml". Add "per100" macros {p,c,f,kcal} for any uncommon ingredient. "appliance" must be one of stovetop | airfryer | instantpot | prep | none. "active" and "passive" are minutes.');
  return L.join('\n');
}

export const importTemplates = () => ({ recipe: AI_RECIPE_TEMPLATE, batchPlan: AI_BATCH_TEMPLATE });

const FLAG_WORDS = {
  gluten: ['wheat', 'flour', 'bread', 'breadcrumb', 'panko', 'couscous', 'bulgur', 'barley', 'rye', 'seitan', 'udon', 'ramen', 'orzo', 'semolina', 'farro', 'spelt', 'beer', 'pita', 'soy sauce', 'pasta', 'noodle', 'tortilla wrap'],
  spicy: ['chili', 'chilli', 'chile', 'jalapeno', 'cayenne', 'sriracha', 'gochujang', 'gochugaru', 'harissa', 'hot sauce', 'pul biber', 'isot', 'habanero', 'wasabi', 'tabasco', 'curry paste', 'hot paprika', 'pepper flake'],
  dairy: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'yoghurt', 'labneh', 'ghee', 'kefir', 'whey', 'mozzarella', 'ricotta', 'halloumi', 'skyr'],
  egg: ['egg', 'mayo', 'mayonnaise'],
  redMeat: ['beef', 'lamb', 'veal', 'pork', 'bacon', 'ham', 'sucuk', 'chorizo', 'steak'],
  seafood: ['fish', 'salmon', 'tuna', 'shrimp', 'prawn', 'cod', 'sea bass', 'crab', 'squid', 'octopus', 'mussel', 'anchov', 'sardine', 'mackerel'],
};
const FLAG_EXCEPTIONS = {
  gluten: ['gluten free', 'gf ', 'tamari', 'rice noodle', 'glass noodle', 'rice pasta', 'chickpea pasta', 'lentil pasta', 'corn tortilla', 'buckwheat', 'rice flour', 'almond flour', 'chickpea flour', 'tapioca'],
  dairy: ['coconut milk', 'almond milk', 'oat milk', 'soy milk', 'peanut butter', 'almond butter', 'cocoa butter', 'coconut cream'],
  egg: ['eggplant'],
};

export function detectFlags(text) {
  const t = ` ${String(text || '').toLowerCase().replace(/[-_]/g, ' ')} `;
  return Object.keys(FLAG_WORDS).filter((flag) => FLAG_WORDS[flag].some((w) => t.includes(w)) && !(FLAG_EXCEPTIONS[flag] || []).some((x) => t.includes(x)));
}

function slugify(s) {
  return normalizeText(s).replace(/ /g, '-').slice(0, 40) || 'item';
}

function normApp(v) {
  const t = String(v || '').toLowerCase();
  if (/instant|pressure/.test(t)) return 'instantpot';
  if (/air|oven|bake|roast/.test(t)) return 'airfryer';
  if (/stove|pan|hob|wok|pot|boil|simmer|sear|saut|fry/.test(t)) return 'stovetop';
  if (/rest|none|passive|marinat|chill|brine|soak/.test(t)) return 'none';
  return 'prep';
}

function normSlot(v) {
  const t = String(v || '').toLowerCase();
  return MEAL_SLOTS.find((s) => t.startsWith(s.toLowerCase().slice(0, 3))) || null;
}

const UNIT_G = { g: 1, gr: 1, gram: 1, grams: 1, kg: 1000, ml: 1, l: 1000, liter: 1000, litre: 1000, tbsp: 15, tablespoon: 15, tablespoons: 15, tsp: 5, teaspoon: 5, teaspoons: 5, cup: 240, cups: 240, oz: 28.35, lb: 453.6 };
const PIECE_UNITS = ['', 'pc', 'pcs', 'piece', 'pieces', 'whole', 'x', 'egg', 'eggs', 'clove', 'cloves', 'large', 'medium'];

function amountToGrams(ing, id, label, warnings) {
  if (num(ing.g) > 0) return num(ing.g);
  if (num(ing.grams) > 0) return num(ing.grams);
  if (num(ing.ml) > 0) return num(ing.ml);
  const amt = num(ing.amount ?? ing.qty ?? ing.quantity);
  if (!(amt > 0)) return 0;
  const unit = String(ing.unit || '').toLowerCase().replace(/\.$/, '').trim();
  if (UNIT_G[unit]) return amt * UNIT_G[unit];
  if (PIECE_UNITS.includes(unit)) {
    const each = id ? getIngredient(id).each : null;
    if (each) return amt * each;
    if (/clove/.test(unit) || /garlic/.test(label)) return amt * 5;
    if (/egg/.test(label)) return amt * 50;
    warnings.push(`"${label}": ${amt} ${unit || 'pieces'} was guessed as ${amt * 100} g. Edit the JSON for accuracy.`);
    return amt * 100;
  }
  warnings.push(`"${label}": unknown unit "${unit}", so ${amt} was read as grams.`);
  return amt;
}

function normalizeImportedRecipe(r, stamp, warnings, errors) {
  if (!r || typeof r !== 'object') { errors.push('A recipe entry is not an object.'); return null; }
  const name = String(r.name || r.title || '').trim();
  if (!name) { errors.push('A recipe is missing "name".'); return null; }
  const customIngredients = {};
  const ingredients = [];
  (Array.isArray(r.ingredients) ? r.ingredients : []).forEach((ing) => {
    if (typeof ing === 'string') ing = { name: ing };
    const label = String(ing.name || ing.item || ing.id || '').trim();
    if (!label) return;
    const per100 = ing.per100 || ing.macros || null;
    let { id, exact } = INGREDIENTS[ing.id] ? { id: ing.id, exact: true } : matchIngredient(label, ['fresh', 'pantry', 'leftover', 'basic']);
    if (!id || (!exact && per100)) {
      const cid = `cx_${slugify(label)}`;
      const p = num(per100?.p);
      const c = num(per100?.c);
      const f = num(per100?.f);
      customIngredients[cid] = {
        name: label.charAt(0).toUpperCase() + label.slice(1), short: label.toLowerCase(), cat: 'custom', group: 'Imported',
        unit: num(ing.ml) > 0 || /ml|l$/.test(String(ing.unit || '')) ? 'ml' : 'g',
        m: [p, c, f, num(per100?.kcal) || kcalFromMacros(p, c, f)], flags: detectFlags(label), aliases: [],
      };
      if (!per100) warnings.push(`${name}: "${label}" isn't in the database and has no per100 macros, so it counts as 0 kcal.`);
      id = cid;
    } else if (!exact) {
      warnings.push(`${name}: "${label}" was matched to ${ingredientName(id)}.`);
    }
    const g = amountToGrams(ing, INGREDIENTS[id] ? id : null, label.toLowerCase(), warnings);
    if (!(g > 0)) warnings.push(`${name}: no amount for "${label}".`);
    ingredients.push({ id, g: Math.round(g * 10) / 10, opt: !!(ing.optional || ing.opt), note: ing.note ? String(ing.note) : undefined });
  });
  if (!ingredients.length) { errors.push(`${name}: no ingredients.`); return null; }

  const steps = (Array.isArray(r.steps) ? r.steps : Array.isArray(r.method) ? r.method : [])
    .map((st) => (typeof st === 'string' ? { text: st } : st || {}))
    .map((st) => ({
      app: normApp(st.appliance || st.app),
      a: clamp(Math.round(num(st.active ?? st.a ?? 3)), 0, 240),
      p: clamp(Math.round(num(st.passive ?? st.p ?? 0)), 0, 600),
      t: String(st.text || st.t || st.step || st.instruction || '').replace(/[{}]/g, ''),
    }))
    .filter((s) => s.t);
  if (!steps.length) { errors.push(`${name}: no steps.`); return null; }

  const findId = (n) => {
    if (INGREDIENTS[n]) return n;
    const cid = `cx_${slugify(n)}`;
    if (customIngredients[cid]) return cid;
    return matchIngredient(n).id;
  };
  const ids = new Set(ingredients.map((i) => i.id));
  const cuisine = String(r.cuisine || 'Quick High-Protein');
  const reheat = { microwave: String(r.reheat?.microwave || 'Covered with 1 tbsp of water, 2 min at 70%, stirring halfway.') };
  if (r.reheat?.airfryer) reheat.airfryer = String(r.reheat.airfryer);
  if (r.reheat?.stovetop) reheat.stovetop = String(r.reheat.stovetop);
  return {
    id: `custom-${slugify(name)}-${stamp.toString(36)}`,
    custom: true,
    importedAt: stamp,
    name,
    emoji: typeof r.emoji === 'string' && r.emoji.length <= 8 ? r.emoji : '✨',
    cuisine,
    moods: [...new Set([cuisine, ...(Array.isArray(r.moods) ? r.moods.map(String) : [])])],
    slot: normSlot(r.slot),
    servings: clamp(Math.round(num(r.servings) || 2), 1, 20),
    blurb: String(r.blurb || r.description || 'Imported from your AI Chef.'),
    ingredients,
    steps,
    techniques: (Array.isArray(r.techniques) ? r.techniques : Array.isArray(r.tips) ? r.tips : [])
      .map((t) => (typeof t === 'string' ? { title: 'Chef tip', text: t } : { title: String(t.title || 'Chef tip'), text: String(t.text || '') }))
      .filter((t) => t.text),
    sauceId: null,
    batch: {
      freezer: ['ok', 'partial', 'no'].includes(r.batch?.freezer) ? r.batch.freezer : 'ok',
      packFresh: (r.batch?.packFresh || []).map(findId).filter((id) => id && ids.has(id)),
      note: String(r.batch?.note || ''),
    },
    reheat,
    customIngredients,
  };
}

function findTemplate(key) {
  const t = normalizeText(key);
  const all = [...FLAVOR_KITS.map((d) => ['kit', d]), ...BREAKFAST_BASES.map((d) => ['base', d])];
  const hit = all.find(([, d]) => d.id === key) || all.find(([, d]) => normalizeText(d.name) === t) || all.find(([, d]) => normalizeText(d.name).includes(t));
  return hit ? `${hit[0]}:${hit[1].id}` : null;
}

function normalizeImportedPlan(p, importedRecipes, warnings, now) {
  const blocks = [];
  (Array.isArray(p.blocks) ? p.blocks : []).forEach((b, i) => {
    if (!b || typeof b !== 'object') return;
    const slot = normSlot(b.slot) || 'Lunch';
    const ct = String(b.cuisine || '').toLowerCase();
    let cuisine = BATCH_CUISINES.find((c) => c.toLowerCase() === ct) || BATCH_CUISINES.find((c) => ct && c.toLowerCase().startsWith(ct.slice(0, 4)));
    if (!cuisine) { warnings.push(`Unknown cuisine "${b.cuisine || ''}", so Quick High-Protein was used.`); cuisine = 'Quick High-Protein'; }
    let choice = null;
    const ref = b.kit || b.flavorKit || b.base || b.breakfast;
    if (ref) {
      choice = findTemplate(String(ref));
      if (!choice) warnings.push(`Unknown kit or base "${ref}", so the default for ${cuisine} was used.`);
    }
    if (b.recipe) {
      const t = normalizeText(b.recipe);
      const r = importedRecipes.find((x) => normalizeText(x.name) === t || x.id === b.recipe) || allRecipes().find((x) => normalizeText(x.name) === t || x.id === b.recipe);
      if (r) {
        if (!r.moods.includes(cuisine)) r.moods.push(cuisine);
        if (slot === 'Breakfast' && !r.slot) r.slot = 'Breakfast';
        choice = `recipe:${r.id}`;
      } else warnings.push(`Recipe "${b.recipe}" wasn't found.`);
    }
    let protein = null;
    if (slot !== 'Breakfast') {
      const raw = String(b.protein || 'turkey breast');
      protein = PROTEIN_MASTERS[raw] ? raw : matchIngredient(raw, ['fresh']).id;
      if (!PROTEIN_MASTERS[protein]) { warnings.push(`"${raw}" can't be a master protein, so turkey breast was used.`); protein = 'turkey_breast'; }
    }
    blocks.push({ id: newId(now, i), count: clamp(Math.round(num(b.count) || 1), 1, BATCH_DEFAULTS.maxCount), slot, cuisine, choice, protein });
  });
  const proteinGrams = {};
  Object.entries(p.proteinGrams || {}).forEach(([k, v]) => {
    const id = PROTEIN_MASTERS[k] ? k : matchIngredient(k, ['fresh']).id;
    if (id && PROTEIN_MASTERS[id] && num(v) > 0) proteinGrams[id] = num(v);
  });
  return { blocks, proteinGrams, rawPerServing: num(p.rawPerServing) > 0 ? clamp(num(p.rawPerServing), 80, 300) : null };
}

/** Parse pasted AI output (raw JSON or a ```json fenced block, possibly with prose around it). */
export function parseImport(text, now = Date.now()) {
  const warnings = [];
  const errors = [];
  let raw = String(text || '').trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();
  const first = raw.search(/[[{]/);
  if (first > 0) raw = raw.slice(first);
  const lastObj = Math.max(raw.lastIndexOf('}'), raw.lastIndexOf(']'));
  if (lastObj >= 0) raw = raw.slice(0, lastObj + 1);
  if (!raw) return { recipes: [], plan: null, warnings, errors: ['Paste the JSON from your AI chef first.'] };
  let data;
  try { data = JSON.parse(raw); } catch (e) { return { recipes: [], plan: null, warnings, errors: [`That isn't valid JSON (${e.message}).`] }; }
  let recipeObjs = [];
  let planObj = null;
  if (Array.isArray(data)) recipeObjs = data;
  else if (data && (data.type === 'batchPlan' || Array.isArray(data.blocks))) { planObj = data; recipeObjs = Array.isArray(data.recipes) ? data.recipes : []; }
  else if (data && Array.isArray(data.recipes)) recipeObjs = data.recipes;
  else recipeObjs = [data];
  const recipes = recipeObjs.map((r, i) => normalizeImportedRecipe(r, now + i, warnings, errors)).filter(Boolean);
  const plan = planObj ? normalizeImportedPlan(planObj, recipes, warnings, now) : null;
  if (!recipes.length && !(plan && plan.blocks.length) && !errors.length) errors.push('No recipes or meal blocks were found in that JSON.');
  return { recipes, plan, warnings: [...new Set(warnings)], errors };
}

/** How an imported recipe fares against the current rules (for the import preview). */
export function importCheck(recipe, settings) {
  const tmpPrev = CUSTOM_INGREDIENTS;
  CUSTOM_INGREDIENTS = { ...CUSTOM_INGREDIENTS, ...(recipe.customIngredients || {}) };
  const res = resolveRecipe(recipe, settings);
  const per = servingMacros(res);
  CUSTOM_INGREDIENTS = tmpPrev;
  return { hidden: res.hidden, reasons: res.hiddenReasons, swaps: res.swapsApplied.length, perServing: per };
}
