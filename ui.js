// ui.js — connects engine.js (logic) and storage.js (persistence) to the DOM.
// Everything DOM-related lives here; port this file to React Native components later.

import * as E from './engine.js';
import { createStore } from './storage.js';
import { APPLIANCES, LOCKS, INGREDIENT_GROUPS, INGREDIENTS, QUICK_ADDS } from './recipes.js';

const store = createStore();
const PERSISTED = ['settings', 'targets', 'mealLogs', 'weightLogs', 'fridge', 'batch', 'recipePrefs', 'cart', 'customRecipes', 'customPantry'];

let S = E.defaultUserData(); // persisted user data
const UI = {
  tab: 'quick',
  logDate: E.dayKey(new Date()),
  detail: null, // { id, context, servings, problem, sauceId, sauceMode, sauceServings, sauceTotal }
  editTargets: false,
  weightMetric: 'kg',
  showMeasure: false,
  undo: null,
  aiOpen: false,
  modal: null, // 'import' | 'write'
  importText: '',
  importResult: null,
  importReplace: false,
  draft: null, // Write My Own form state
  draftErrors: [],
  genVariant: 0,
  genNotes: [],
};

const emptyDraft = () => ({ title: '', cuisine: S.fridge.genCuisine || 'Japanese', slot: '', servings: 2, active: 15, passive: 15, ings: [{ name: '', amt: '', unit: 'g' }, { name: '', amt: '', unit: 'g' }, { name: '', amt: '', unit: 'g' }], steps: '', tip: '' });

// ------------------------------------------------------------------------------------------
// Small helpers
// ------------------------------------------------------------------------------------------
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r0 = (n) => Math.round(n).toLocaleString();
const name = (id) => E.ingredientName(id);
const short = (id) => E.ingredientShort(id);

const APP_LABEL = { stovetop: 'Stovetop', airfryer: 'Air Fryer', instantpot: 'Instant Pot', prep: 'Prep', none: 'Hands-off' };
const ROLE_ORDER = ['Umami', 'Acid', 'Creaminess', 'Crunch', 'Sweetness', 'Protein', 'Carb', 'Veg', 'Aromatic'];
const SESSION_COLORS = ['c1', 'c2', 'c3', 'c4', 'c5'];

const I = {
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  hand: '<svg viewBox="0 0 24 24"><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V12M14 11.5V6a1.5 1.5 0 0 1 3 0v7c0 4-2.5 7-6 7s-5-2-6.5-4.5L3 12.5a1.4 1.4 0 0 1 2.3-1.6L8 14"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M6 3h12M6 21h12M7 3c0 5 10 6 10 9s-10 4-10 9M17 3c0 5-10 6-10 9"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  hourglass: '<svg viewBox="0 0 24 24"><path d="M6 3h12M6 21h12M7 3c0 5 10 6 10 9s-10 4-10 9M17 3c0 5-10 6-10 9"/></svg>',
  swap: '<svg viewBox="0 0 24 24"><path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></svg>',
  fridge: '<svg viewBox="0 0 24 24"><rect x="5" y="2.5" width="14" height="19" rx="2.5"/><path d="M5 10h14M9 6v2M9 13v3"/></svg>',
  snow: '<svg viewBox="0 0 24 24"><path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 2 3-2M9 20l3-2 3 2"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/></svg>',
  chev: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  chevL: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  warn: '<svg viewBox="0 0 24 24"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/></svg>',
  flame: '<svg viewBox="0 0 24 24"><path d="M12 22c4 0 7-2.7 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8 0 4.3 3 7 7 7z"/></svg>',
  wave: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0M7 14c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0"/></svg>',
  fan: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 12c0-4 2-5 4-4M12 12c4 0 5 2 4 4M12 12c0 4-2 5-4 4M12 12c-4 0-5-2-4-4"/></svg>',
  pot: '<svg viewBox="0 0 24 24"><path d="M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M2 10h20M9 6h6M12 6V4"/></svg>',
  pan: '<svg viewBox="0 0 24 24"><circle cx="10" cy="13" r="7"/><path d="M17 13h5"/></svg>',
  spoon: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="7" rx="4" ry="5"/><path d="M12 12v10"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  spark: '<svg viewBox="0 0 24 24"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/></svg>',
};
const APP_ICON = { stovetop: I.pan, airfryer: I.fan, instantpot: I.pot, prep: I.hand, none: I.pause, microwave: I.wave };

function prefs(id) {
  if (!S.recipePrefs[id]) S.recipePrefs[id] = { swaps: {} };
  if (!S.recipePrefs[id].swaps) S.recipePrefs[id].swaps = {};
  return S.recipePrefs[id];
}

function persist(...keys) {
  keys.forEach((k) => store.save(k, S[k]));
}

function syncCustom() {
  E.setCustomData(S.customRecipes, S.customPantry);
}

const isDraft = (id) => !!E.draftRecipe() && E.draftRecipe().id === id;

function availability() {
  return E.buildAvailability({
    pantry: S.settings.pantry,
    fridge: S.fridge.selected,
    leftovers: S.fridge.leftovers,
    custom: S.fridge.custom,
  });
}

function seg(act, items, current) {
  return `<div class="seg" role="tablist">${items.map(([v, label]) => `<button type="button" role="tab" class="${String(v) === String(current) ? 'on' : ''}" aria-selected="${String(v) === String(current)}" data-act="${act}" data-v="${esc(v)}">${label}</button>`).join('')}</div>`;
}

function macroTiles(m, { unit = '', big = false } = {}) {
  const R = E.roundMacros(m);
  return `<div class="tiles ${big ? 'tiles-big' : ''}">
    <div class="tile tile-p"><b>${R.p}<small>g</small></b><span>Protein${unit}</span></div>
    <div class="tile"><b>${R.c}<small>g</small></b><span>Carbs</span></div>
    <div class="tile"><b>${R.f}<small>g</small></b><span>Fat</span></div>
    <div class="tile tile-k"><b>${r0(R.kcal)}</b><span>kcal</span></div>
  </div>`;
}

function segmentsHTML(segs) {
  return segs.map((s) => {
    if (s.type === 'text') return esc(s.v);
    const cls = s.dropped ? 'ing dropped' : s.swapped ? 'ing swapped' : 'ing';
    return `<span class="${cls}">${s.amount ? `<b>${esc(s.amount)}</b> ` : ''}${esc(s.name)}</span>`;
  }).join('');
}

function dateLabel(key) {
  const today = E.dayKey(new Date());
  if (key === today) return 'Today';
  if (key === E.shiftDayKey(today, -1)) return 'Yesterday';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function toast(msg, undoFn) {
  const el = $('#toast');
  UI.undo = undoFn || null;
  el.innerHTML = `<span>${esc(msg)}</span>${undoFn ? '<button type="button" data-act="undo">Undo</button>' : ''}`;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.classList.remove('show'); UI.undo = null; }, 4000);
}

// ------------------------------------------------------------------------------------------
// TAB 1 — QUICK COOK
// ------------------------------------------------------------------------------------------
function renderQuick() {
  const f = S.fridge;
  const rk = E.rankRecipes({ settings: S.settings, fridge: f, recipePrefs: S.recipePrefs });
  const sel = new Set(f.selected);
  const uf = new Set(f.useFirst);
  const lefts = new Set(f.leftovers);
  const freshIds = E.listIngredients('fresh').filter((id) => !E.isBlocked(id, S.settings));
  const leftoverIds = E.listIngredients('leftover').filter((id) => !E.isBlocked(id, S.settings));
  const trayIds = [...f.selected, ...(f.leftoverMode ? f.leftovers : [])];

  let h = seg('mode', [['fridge', 'Fridge Mode'], ['leftover', 'Leftover Remixer']], f.leftoverMode ? 'leftover' : 'fridge');

  if (f.leftoverMode) {
    h += `<section class="card card-tint">
      <div class="card-head"><h2>Already cooked</h2><span class="hint">10-minute remixes</span></div>
      <div class="chips">${leftoverIds.map((id) => `<button type="button" class="chip ${lefts.has(id) ? 'on' : ''}" data-act="pickLeft" data-id="${id}">${esc(name(id))}</button>`).join('')}</div>
    </section>`;
  }

  // Fridge selector
  h += `<section class="card">
    <div class="card-head"><h2>${f.leftoverMode ? 'Fresh extras' : 'What\'s in your fridge?'}</h2>${trayIds.length ? '<button type="button" class="link" data-act="clearFridge">Clear</button>' : ''}</div>`;
  if (trayIds.length || f.custom.length) {
    h += `<div class="tray">${trayIds.map((id) => `
      <span class="pill ${uf.has(id) ? 'hot' : ''}">
        <button type="button" class="pill-uf" data-act="useFirst" data-id="${id}" aria-label="Mark ${esc(name(id))} as Use First">${I.hourglass}${uf.has(id) ? '<em>Use first</em>' : ''}</button>
        <span class="pill-name">${esc(name(id))}</span>
        <button type="button" class="pill-x" data-act="unselect" data-id="${id}" aria-label="Remove">${I.close}</button>
      </span>`).join('')}
      ${f.custom.map((c, i) => `<span class="pill pill-custom"><span class="pill-name">${esc(c)} <small>(not in recipes)</small></span><button type="button" class="pill-x" data-act="removeCustom" data-i="${i}" aria-label="Remove">${I.close}</button></span>`).join('')}
    </div>
    <p class="micro">Tap ${I.hourglass} to mark an item <b>Use First</b>. Recipes that use it jump to the top.</p>`;
  }
  INGREDIENT_GROUPS.fresh.forEach((g) => {
    const ids = freshIds.filter((id) => INGREDIENTS[id].group === g);
    if (!ids.length) return;
    h += `<div class="chip-group"><h3>${esc(g)}</h3><div class="chips">${ids.map((id) => `<button type="button" class="chip ${sel.has(id) ? 'on' : ''} ${uf.has(id) ? 'hot' : ''}" data-act="pick" data-id="${id}">${esc(name(id))}</button>`).join('')}</div></div>`;
  });
  h += `<form class="inline-form" data-form="custom">
      <input name="item" type="text" placeholder="Add something else… (e.g. courgette)" autocomplete="off" enterkeyhint="done" aria-label="Custom ingredient">
      <button type="submit" class="btn btn-soft">${I.plus}<span>Add</span></button>
    </form>
  </section>`;

  h += chefCard(trayIds.length + f.custom.length);

  // Mood picker
  h += `<div class="rail moods">${['All', ...E.listMoods()].map((m) => `<button type="button" class="mood ${f.mood === m ? 'on' : ''}" data-act="mood" data-v="${esc(m)}">${esc(m)}</button>`).join('')}</div>`;

  // Results
  const tab = f.missingOne ? 'missing' : 'ready';
  h += seg('resTab', [['ready', `Ready now <span class="count">${rk.ready.length}</span>`], ['missing', `Missing 1 item <span class="count">${rk.missingOne.length}</span>`]], tab);
  const list = tab === 'ready' ? rk.ready : rk.missingOne;
  h += '<div class="results">';
  if (!list.length) {
    if (tab === 'ready') {
      h += `<div class="empty">${trayIds.length ? 'Nothing is 100% ready yet.' : 'Tap what\'s in your fridge to see what you can cook right now.'}
        ${rk.missingOne.length ? `<button type="button" class="btn btn-soft" data-act="resTab" data-v="missing">See ${rk.missingOne.length} recipes that are 1 item away</button>` : ''}</div>`;
    } else {
      h += '<div class="empty">No recipes are exactly one item away. Add a few more fridge items.</div>';
    }
  }
  h += list.map((x) => resultCard(x, tab)).join('');
  h += '</div>';

  if (rk.others.length) {
    h += `<details class="more"><summary>More ideas · need 2+ items <span class="count">${rk.others.length}</span></summary>
      <div class="results">${rk.others.map((x) => resultCard(x, 'others')).join('')}</div></details>`;
  }
  if (rk.hidden.length) {
    h += `<button type="button" class="hidden-note" data-act="tab" data-v="rules">${rk.hidden.length} recipe${rk.hidden.length > 1 ? 's' : ''} hidden by your Rules (${esc(rk.hidden.map((x) => x.reasons[0]).slice(0, 2).join('; '))})</button>`;
  }
  return h;
}

function chefCard(count) {
  const cur = S.fridge.genCuisine;
  return `<section class="card chef-card">
    <div class="card-head"><h2>${I.spark} Chef's Creation</h2><span class="hint">${count ? `${count} selected` : 'Select ingredients above'}</span></div>
    <p class="micro">Builds a complete recipe from your selected ingredients, pantry staples and appliances: exact grams, live macros, active vs passive time and chef technique.</p>
    <div class="chips" role="radiogroup" aria-label="Cuisine">${E.listGenCuisines().map((c) => `<button type="button" class="chip ${c === cur ? 'on' : ''}" role="radio" aria-checked="${c === cur}" data-act="genCuisine" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <button type="button" class="btn btn-primary btn-lg" data-act="genRecipe">${I.spark}Create Recipe From Selected Ingredients</button>
    <button type="button" class="btn btn-soft" data-act="openWrite">${I.plus}Write My Own Recipe</button>
  </section>`;
}

function resultCard(x, mode) {
  const r = x.recipe;
  const pct = Math.round(x.match.pct * 100);
  const sub = x.subs[0];
  const swapAttr = mode === 'missing' && sub && sub.sub && sub.sub.ready && sub.srcId === sub.missingId ? `data-swap="${esc(sub.srcId)}|${esc(sub.sub.key)}"` : '';
  let missing = '';
  if (mode === 'missing' && sub) {
    missing = `<div class="missing-row">
      <span class="miss">${I.close}<span>${esc(name(sub.missingId))}</span></span>
      <span class="arrow">${I.swap}</span>
      ${sub.sub
        ? `<span class="subst ${sub.sub.ready ? 'ready' : ''}">${esc(sub.sub.to.map((t) => short(t.id)).join(' + '))} <small>${esc(sub.sub.to.map((t) => `1 : ${E.roundNice(t.r)}`).join(' + '))}${sub.sub.ready ? ' · you have it' : ''}</small></span>`
        : '<span class="subst none">No good substitute. Buy it.</span>'}
    </div>`;
  } else if (mode === 'others') {
    missing = `<div class="micro">Need: ${esc(x.match.missing.map((m) => short(m.id)).join(', '))}</div>`;
  }
  return `<article class="rcard" data-act="open" data-id="${r.id}" ${swapAttr} tabindex="0">
    <div class="rcard-emoji" aria-hidden="true">${r.emoji}</div>
    <div class="rcard-body">
      <h3>${esc(r.name)}</h3>
      <div class="meta"><span>${esc(r.cuisine)}</span><span>${I.clock}${x.time.total} min</span><span class="p">${Math.round(x.perServing.p)} g protein</span><span>${r0(x.perServing.kcal)} kcal</span></div>
      <div class="meter ${pct === 100 ? 'full' : ''}"><span style="width:${pct}%"></span></div>
      <div class="rcard-foot"><small>${pct === 100 ? '100% ready' : `${x.match.have}/${x.match.total} ingredients`}</small>
      ${x.match.useFirstHits.length ? `<span class="badge badge-hot">${I.hourglass}Uses ${esc(x.match.useFirstHits.map(short).join(', '))}</span>` : ''}
      ${r.swapsApplied.length ? `<span class="badge">${I.swap}${r.swapsApplied.length} swap${r.swapsApplied.length > 1 ? 's' : ''}</span>` : ''}</div>
      ${missing}
    </div>
  </article>`;
}

// ------------------------------------------------------------------------------------------
// TAB 2 — 7-DAY MEAL PLANNER (21 meals, one unified prep session)
// ------------------------------------------------------------------------------------------
const SLOT_ICON = { Breakfast: '☀️', Lunch: '🥗', Dinner: '🌙' };
const PHASES = [
  { id: 1, title: 'Phase 1 · Breakfast batch & long-cook bases', text: 'The week\'s breakfasts go in first, while the rice, grains and potatoes start on the hob, Instant Pot or air fryer.' },
  { id: 2, title: 'Phase 2 · Lunch & dinner, all at once', text: 'Main proteins cook in parallel while you prep vegetables and whisk the flavor kit sauces.' },
];

function storageBadge(tag) {
  const t = tag && E.getStorageTag(tag);
  if (!t) return '';
  return `<span class="badge ${tag === 'spoon-after' ? 'badge-spoon' : 'badge-ice'}">${tag === 'spoon-after' ? I.spoon : I.snow}${t.label}</span>`;
}

function whereBadge(where) {
  if (where === 'fridge') return `<span class="badge badge-fridge">${I.fridge}Fridge</span>`;
  if (where === 'freezer') return `<span class="badge badge-ice">${I.snow}Freezer</span>`;
  return `<span class="badge badge-warn">${I.flame}Cook fresh</span>`;
}

function macroLine(m) {
  const R = E.roundMacros(m);
  return `<span class="mline"><b>${R.p} g P</b><span>${R.c} g C</span><span>${R.f} g F</span><span>${r0(R.kcal)} kcal</span></span>`;
}

function stepperHTML(act, display, { min = false, max = false, id = '' } = {}) {
  const idAttr = id ? ` data-id="${esc(id)}"` : '';
  return `<div class="stepper sm"><button type="button" data-act="${act}" data-d="-1"${idAttr} aria-label="Less" ${min ? 'disabled' : ''}>${I.minus}</button><b>${esc(display)}</b><button type="button" data-act="${act}" data-d="1"${idAttr} aria-label="More" ${max ? 'disabled' : ''}>${I.plus}</button></div>`;
}

function renderBatch() {
  const plan = S.cart.blocks.length ? E.planCart(S.cart, S.settings, S.recipePrefs) : null;
  let h = `<p class="lede">Plan <b>Breakfast, Lunch and Dinner for Days 1–7</b> and cook all 21 meals in <b>one parallel session</b>. Days 1–4 go in the fridge, Days 5–7 in the freezer.</p>`;
  h += weekSetupCard(!!plan);
  if (!plan) return h;
  if (!plan.containers.length) {
    return `${h}<div class="empty">Nothing in this plan fits your current rules. Change the cuisines or rules, then generate again.</div>`;
  }
  const tl = plan.timeline;
  h += `<div class="tiles">
    <div class="tile"><b>${plan.totals.containers}</b><span>Meals</span></div>
    <div class="tile tile-p"><b>${Math.round(plan.totals.avgProteinPerDay)}<small>g</small></b><span>Protein / day</span></div>
    <div class="tile"><b>${r0(plan.totals.avgKcalPerDay)}</b><span>kcal / day</span></div>
    <div class="tile"><b>${tl ? E.formatMinutes(tl.makespan).replace(' min', 'm') : '—'}</b><span>One session</span></div>
  </div>`;
  const warns = [...new Set([...(S.cart.genWarnings || []), ...plan.warnings])];
  if (warns.length) h += `<div class="alert"><div class="alert-head">${I.warn}<b>Heads up</b></div><ul>${warns.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>`;
  h += rotationCard(plan);
  h += scheduleCard(plan);
  if (tl) h += sessionCard(plan, tl);
  h += groceryCard(plan);
  return h;
}

function weekSetupCard(hasPlan) {
  const w = S.cart.week;
  const proteins = E.masterProteins(S.settings);
  if (!proteins.includes(w.protein)) w.protein = proteins[0];
  const methods = E.masterMethodOptions(S.settings);
  return `<section class="card">
    <div class="card-head"><h2>Plan your week</h2><span class="hint">7 days × 3 meals</span></div>
    <div class="field"><h3 class="label">Breakfast variety</h3>${seg('wBreakfast', [[1, '1 for all 7 days'], [2, '2 · Days 1–4 + 5–7']], w.breakfastVariety)}</div>
    <div class="field"><h3 class="label">Lunch & dinner</h3>${seg('wMode', [['master', '1 Protein + 3 Kits'], ['rotate', 'Rotating dishes']], w.mainMode)}
      <p class="micro">${w.mainMode === 'master'
        ? 'One protein is cooked once, neutrally, then split across 3 cuisine Flavor Kits that rotate through the 14 lunches and dinners. Each kit is eaten 4–5 times.'
        : 'Full recipes from your library rotate through the week, with flavor kits filling any gaps. Lunches and dinners each get their own dishes.'}</p></div>
    ${w.mainMode === 'rotate'
      ? `<div class="field"><h3 class="label">Dishes per slot</h3>${seg('wDishes', [[2, '2 · each 3–4×'], [3, '3 · each 2–3×']], w.dishesPerSlot)}</div>`
      : `<label class="field"><span class="label">Master protein</span><select data-change="wProtein">${proteins.map((p) => `<option value="${p}" ${p === w.protein ? 'selected' : ''}>${esc(name(p))}</option>`).join('')}</select></label>`}
    <div class="field"><h3 class="label">Cuisine mix</h3>
      <div class="chips">${E.listBatchCuisines().map((cu) => `<button type="button" class="chip ${w.cuisines.includes(cu) ? 'on' : ''}" data-act="wCuisine" data-v="${esc(cu)}" aria-pressed="${w.cuisines.includes(cu)}">${w.cuisines.includes(cu) ? I.check : ''}${esc(cu)}</button>`).join('')}</div></div>
    <details class="more inset"><summary>Fine-tune portions & cooking</summary>
      <div class="stack">
        <div class="row-between"><div><h3 class="label">Raw protein per serving</h3><small class="micro">For the master protein cook</small></div>
          ${stepperHTML('raw', `${S.cart.rawPerServing} g`, { min: S.cart.rawPerServing <= 100, max: S.cart.rawPerServing >= 220 })}</div>
        <div class="field"><h3 class="label">Master cook method</h3>${seg('method', [['auto', 'Auto'], ...methods.map((m) => [m.id, m.label])], S.cart.method)}</div>
      </div>
    </details>
    ${hasPlan && S.cart.genFrom && S.cart.genFrom !== weekKey(w) ? `<p class="micro warn-text">${I.warn} Settings changed. Regenerate to apply them.</p>` : ''}
    <button type="button" class="btn btn-primary btn-lg" data-act="genWeek">${I.spark}${hasPlan ? 'Regenerate 7-Day Plan' : 'Generate 7-Day Plan (21 meals)'}</button>
    ${hasPlan ? `<div class="btn-row"><button type="button" class="btn btn-soft" data-act="shuffleWeek">${I.swap}Shuffle</button><button type="button" class="btn btn-soft" data-act="clearCart">${I.trash}Clear plan</button></div>` : ''}
  </section>`;
}

function rotationCard(plan) {
  const proteins = E.masterProteins(S.settings);
  const daysOf = (id) => (S.cart.blocks.find((b) => b.id === id)?.days || []);
  const rows = E.listMealSlots().flatMap((slot) => plan.blocks.filter((b) => b.slot === slot));
  return `<section class="card">
    <div class="card-head"><h2>This week's rotation</h2><span class="hint">${plan.blocks.length} dish${plan.blocks.length === 1 ? '' : 'es'}</span></div>
    ${rows.map((b) => {
      const tmpl = b.options.filter((o) => o.kind !== 'recipe');
      const recs = b.options.filter((o) => o.kind === 'recipe');
      const opt = (o) => `<option value="${esc(o.key)}" ${o.key === b.choice ? 'selected' : ''}>${esc(o.label)}${o.storage ? ` · ${E.getStorageTag(o.storage).label}` : ''}${o.custom ? ' · mine' : ''}</option>`;
      const days = daysOf(b.id);
      return `<div class="block-row">
        <div class="br-head"><span class="br-emoji">${b.emoji}</span><span class="br-title"><b>${SLOT_ICON[b.slot]} ${esc(b.slot)} × ${b.count}</b><small>${esc(b.cuisine)}${days.length ? ` · Day ${days.join(', ')}` : ''}</small></span></div>
        <select data-change="blockChoice" data-id="${b.id}" aria-label="Dish for ${esc(b.slot)}">
          <optgroup label="${b.slot === 'Breakfast' ? 'Breakfast bases' : 'Flavor kits + master protein'}">${tmpl.map(opt).join('')}</optgroup>
          ${recs.length ? `<optgroup label="Full recipes">${recs.map(opt).join('')}</optgroup>` : ''}
        </select>
        ${b.kind === 'kit' ? `<select data-change="blockProtein" data-id="${b.id}" aria-label="Protein">${proteins.map((p) => `<option value="${p}" ${p === b.protein ? 'selected' : ''}>${esc(name(p))}</option>`).join('')}</select>` : ''}
        <div class="br-foot">${macroLine(b.macros)}${storageBadge(b.storage)}</div>
      </div>`;
    }).join('')}
    ${plan.masters.length ? `<h3 class="label">Cooked once</h3>${plan.masters.map((m) => `<div class="master">
      <span class="master-emoji">${m.emoji}</span>
      <div class="master-body">
        <b>${esc(E.formatAmount(m.protein, m.rawTotal))} ${esc(short(m.protein))} → ${m.count} portions</b>
        <small>${Math.round(m.rawPerServing)} g raw · ≈${Math.round(m.cookedPerServing)} g cooked per box · ${APP_LABEL[m.app]} (${esc(m.methodLabel)})</small>
        <p class="micro">${esc(m.tip)}</p>
      </div></div>`).join('')}` : ''}
  </section>`;
}

function scheduleCard(plan) {
  return `<section class="card">
    <div class="card-head"><h2>7-day schedule</h2><span class="hint">${plan.totals.fridge} fridge · ${plan.totals.freezer} freezer</span></div>
    ${plan.days.map((d) => `<div class="day-group">
      <div class="dg-head"><b>Day ${d.day}</b>${d.where === 'fridge' ? `<span class="badge badge-fridge">${I.fridge}Fridge</span>` : `<span class="badge badge-ice">${I.snow}Freezer</span>`}<span class="dg-total"><b>${Math.round(d.macros.p)} g P</b> · ${r0(d.macros.kcal)} kcal</span></div>
      ${E.listMealSlots().map((slot) => {
        const c = d.containers.find((x) => x.slot === slot);
        return c ? containerRow(c) : `<div class="box box-empty"><small class="box-slot">${SLOT_ICON[slot]} ${esc(slot)}</small><small>Not planned</small></div>`;
      }).join('')}
    </div>`).join('')}
  </section>`;
}

function containerRow(c) {
  const eaten = S.cart.eaten.includes(c.id);
  const sauce = c.storage === 'spoon-after' && c.sauceItems.length
    ? `<li><b>Sauce pot (${esc(c.sauceName)}):</b> ${esc(c.sauceItems.map((e) => `${E.formatAmount(e.id, e.g).replace(/ \(≈.*\)/, '')} ${short(e.id)}`).join(', '))}</li>` : '';
  return `<div class="box ${eaten ? 'eaten' : ''}">
    <div class="box-main">
      <span class="box-emoji">${c.emoji}</span>
      <div class="box-text">
        <small class="box-slot">${SLOT_ICON[c.slot]} ${esc(c.slot)} · ${esc(c.cuisine)}</small>
        <b>${esc(c.name)}</b>
        ${macroLine(c.macros)}
        <div class="box-tags">${whereBadge(c.where)}${storageBadge(c.storage)}</div>
      </div>
      <button type="button" class="btn btn-sm ${eaten ? 'btn-soft' : 'btn-primary'} box-btn" data-act="eatBox" data-id="${esc(c.id)}">${eaten ? `${I.check}Eaten` : 'I Ate This'}</button>
    </div>
    <details class="box-more"><summary>Reheat & packing</summary><ul>${c.reheat.map((r) => `<li>${esc(r)}</li>`).join('')}${sauce}</ul></details>
  </div>`;
}

function sessionCard(plan, tl) {
  const jobs = [];
  tl.tasks.forEach((t) => { if (!jobs[t.job]) jobs[t.job] = `${t.emoji} ${t.recipeName}`; });
  const taskLi = (t) => `<li class="${SESSION_COLORS[t.job % 5]}">
      <time>${E.clockLabel(t.start)}</time>
      <div class="tl-body">
        <div class="tl-head"><span class="dot"></span><b>${t.emoji} ${esc(t.recipeName)}</b><span class="app app-${t.app}">${APP_ICON[t.app]}${APP_LABEL[t.app]}</span></div>
        <p>${segmentsHTML(t.segments)}</p>
        <small>${t.a ? `${t.a} min hands-on` : ''}${t.a && t.p ? ' · ' : ''}${t.p ? `then ${t.p} min hands-off` : ''}${t.rounds > 1 ? ` · ${t.rounds} rounds` : ''}${t.adaptedFrom ? ` · adapted from ${APP_LABEL[t.adaptedFrom]}` : ''}</small>
      </div>
    </li>`;
  const phaseHTML = PHASES.map((ph) => {
    const tasks = tl.tasks.filter((t) => (t.phase || 2) === ph.id);
    if (!tasks.length) return '';
    return `<div class="phase"><div class="phase-head"><b>${esc(ph.title)}</b><small>${esc(ph.text)} Starts at ${E.clockLabel(tasks[0].start)}.</small></div>
      <ol class="timeline">${tasks.map(taskLi).join('')}</ol></div>`;
  }).join('');

  const fridge = plan.containers.filter((c) => c.where === 'fridge');
  const freezer = plan.containers.filter((c) => c.where !== 'fridge');
  const label = (c) => `<li><span class="lbl">Day ${c.day} · ${esc(c.slot)}</span><span>${c.emoji} ${esc(c.name)}${c.storage === 'spoon-after' ? ` <small>+ ${esc(c.sauceName)} pot</small>` : ''}</span></li>`;
  const spoon = plan.kits.filter((k) => k.storage === 'spoon-after');
  return `<section class="card">
    <div class="card-head"><h2>One cooking session</h2><span class="hint">All 21 meals together</span></div>
    <div class="tiles tiles-3">
      <div class="tile"><b>${E.formatMinutes(tl.makespan)}</b><span>Whole session</span></div>
      <div class="tile"><b>${E.formatMinutes(tl.activeTotal)}</b><span>Hands-on</span></div>
      <div class="tile tile-p"><b>${E.formatMinutes(tl.saved)}</b><span>Saved</span></div>
    </div>
    ${gantt(tl, jobs)}
    ${phaseHTML}
    <div class="phase"><div class="phase-head"><b>Phase 3 · Box & store</b><small>From ${E.clockLabel(tl.makespan)}: pack ${plan.containers.length} containers, each labelled by day and meal.</small></div>
      <div class="store-grid">
        <div class="store"><div class="store-head"><span class="badge badge-fridge">${I.fridge}Fridge · Days 1–4</span><small>${fridge.length} boxes</small></div><ul class="labels">${fridge.map(label).join('')}</ul></div>
        <div class="store"><div class="store-head"><span class="badge badge-ice">${I.snow}Freezer · Days 5–7</span><small>${freezer.length} boxes</small></div><ul class="labels">${freezer.map(label).join('')}</ul>
          ${freezer.length ? '<p class="micro">Move each box to the fridge the evening before you eat it.</p>' : ''}</div>
      </div>
      ${spoon.length ? `<p class="micro">${storageBadge('spoon-after')} Keep ${esc(listOf(spoon.map((k) => k.sauceName)))} in small separate pots. Cold and creamy sauces split when reheated or frozen.</p>` : ''}
    </div>
  </section>`;
}

const listOf = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

function groceryCard(plan) {
  const bought = new Set(S.cart.bought);
  return `<section class="card"><div class="card-head"><h2>Shopping list</h2><button type="button" class="link" data-act="copyGrocery">Copy</button></div>
    <p class="micro">Raw amounts summed across all ${plan.totals.containers} meals: proteins, eggs, carbs, vegetables and every sauce ingredient. Tap to tick off.</p>
    ${plan.grocery.map((grp) => `<div><h3 class="label">${esc(grp.group)}</h3><ul class="grocery">${grp.items.map((i) => `<li><button type="button" class="gitem ${bought.has(i.id) ? 'done' : ''}" data-act="buy" data-id="${i.id}" aria-pressed="${bought.has(i.id)}">
      <span class="gcheck">${bought.has(i.id) ? I.check : ''}</span><span class="gname">${esc(name(i.id))}${i.inPantry ? ' <small>pantry</small>' : ''}</span><span class="gamt">${esc(i.amount)}</span></button></li>`).join('')}</ul></div>`).join('')}
  </section>`;
}

function gantt(tl, jobs) {
  const M = Math.max(tl.makespan, 1);
  const lanes = [{ id: 'cook', label: 'You' }, ...APPLIANCES.filter((a) => tl.tasks.some((t) => t.app === a.id)).map((a) => ({ id: a.id, label: a.label }))];
  const step = M <= 60 ? 10 : M <= 150 ? 30 : 60;
  const ticks = [];
  for (let t = 0; t <= M; t += step) ticks.push(t);
  const bar = (start, end, job, extra = '', top = 0, h = 100) => `<span class="bar ${SESSION_COLORS[job % 5]} ${extra}" style="left:${(start / M) * 100}%;width:${Math.max(((end - start) / M) * 100, 0.8)}%;top:${top}%;height:${h}%"></span>`;
  return `<div class="gantt" aria-label="Session timeline chart">
    ${lanes.map((l) => {
      let bars = '';
      if (l.id === 'cook') {
        tl.tasks.filter((t) => t.a > 0).forEach((t) => { bars += bar(t.start, t.activeEnd, t.job); });
      } else {
        const multi = l.id === 'stovetop';
        tl.tasks.filter((t) => t.app === l.id).forEach((t) => {
          const top = multi ? (t.slot || 0) * 50 : 0;
          const hh = multi ? 50 : 100;
          bars += bar(t.start, t.activeEnd, t.job, '', top, hh) + bar(t.activeEnd, t.end, t.job, 'passive', top, hh);
        });
      }
      return `<div class="lane"><span class="lane-label">${esc(l.label)}</span><div class="lane-track">${bars}</div></div>`;
    }).join('')}
    <div class="lane axis"><span class="lane-label"></span><div class="lane-track">${ticks.map((t) => `<span class="tick" style="left:${(t / M) * 100}%">${E.clockLabel(t)}</span>`).join('')}</div></div>
    <p class="micro legend"><span class="sw solid"></span>hands-on <span class="sw striped"></span>hands-off ${jobs.length > 1 ? '· colours = cooks' : ''}</p>
  </div>`;
}

// ------------------------------------------------------------------------------------------
// AI CHEF BRIDGE (optional, bottom of Tab 4) + modals: import and Write My Own
// ------------------------------------------------------------------------------------------
function aiCard() {
  return `<details class="card advanced" data-toggle="ai" ${UI.aiOpen ? 'open' : ''}>
    <summary><span class="adv-title"><h2>${I.spark} AI Chef Bridge</h2><span class="hint">Advanced · optional</span></span></summary>
    <div class="adv-body">
      <span class="badge badge-hot">${I.spark}Gemini Co-Pilot</span>
      <p class="micro">Copies your cart, protein, pantry staples, rules, and macro targets. Paste it into your AI chat for fresh meal ideas, then paste the reply back here.</p>
      <div class="btn-row">
        <button type="button" class="btn btn-soft" data-act="copyPrompt" data-v="recipe">${I.copy}Recipe prompt</button>
        <button type="button" class="btn btn-soft" data-act="copyPrompt" data-v="batch">${I.copy}Week prompt</button>
      </div>
      <button type="button" class="btn btn-primary" data-act="openImport">${I.download}Paste New Plan</button>
    </div>
  </details>`;
}

function renderModal() {
  const m = $('#modal');
  if (UI.modal === 'write') {
    m.setAttribute('aria-label', 'Write my own recipe');
    renderWriteModal();
  } else {
    m.setAttribute('aria-label', 'Import recipe or batch plan');
    renderImportModal();
  }
}

function renderImportModal() {
  const r = UI.importResult;
  let preview = '';
  if (r) {
    if (r.errors.length) preview += `<div class="alert alert-danger"><div class="alert-head">${I.warn}<b>Can't import yet</b></div><ul>${r.errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>`;
    if (r.recipes.length) {
      preview += `<h3 class="label">Recipes (${r.recipes.length})</h3><ul class="import-list">${r.recipes.map((rec) => {
        const chk = E.importCheck(rec, S.settings);
        const m = E.roundMacros(chk.perServing);
        return `<li><span>${rec.emoji}</span><div><b>${esc(rec.name)}</b><small>${esc(rec.cuisine)}${rec.slot ? ` · ${rec.slot}` : ''} · ${rec.servings} servings · ${rec.ingredients.length} ingredients · ${rec.steps.length} steps</small>
          <small>Per serving: ${m.p} g P · ${m.c} g C · ${m.f} g F · ${m.kcal} kcal</small>
          ${chk.hidden ? `<small class="bad">Hidden by your rules: ${esc(chk.reasons.join(', '))}</small>` : chk.swaps ? `<small class="ok">${chk.swaps} ingredient(s) will be auto-swapped to fit your rules</small>` : '<small class="ok">Fits your rules</small>'}</div></li>`;
      }).join('')}</ul>`;
    }
    if (r.plan && r.plan.blocks.length) {
      preview += `<h3 class="label">Batch plan (${r.plan.blocks.length} blocks)</h3><ul class="import-list">${r.plan.blocks.map((b) => `<li><span>${SLOT_ICON[b.slot]}</span><div><b>${b.count} × ${esc(b.slot)} (${esc(b.cuisine)})</b><small>${b.protein ? esc(name(b.protein)) : 'Breakfast base'}${b.choice ? ` · ${esc(b.choice.split(':')[1])}` : ''}</small></div></li>`).join('')}</ul>
      ${Object.keys(r.plan.proteinGrams).length ? `<p class="micro">Protein-First: ${esc(Object.entries(r.plan.proteinGrams).map(([p, g]) => `${g} g ${short(p)}`).join(', '))}</p>` : ''}
      <button type="button" class="switch-row" role="switch" aria-checked="${UI.importReplace}" data-act="importReplace"><span class="sr-text"><b>Replace my current plan</b><small>Off = add these blocks to it</small></span><span class="switch ${UI.importReplace ? 'on' : ''}"><span></span></span></button>`;
    }
    if (r.warnings.length) preview += `<details class="more inset"><summary>${I.warn} ${r.warnings.length} note${r.warnings.length > 1 ? 's' : ''}</summary><ul class="plain">${r.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></details>`;
  }
  const canSave = r && !r.errors.length && (r.recipes.length || (r.plan && r.plan.blocks.length));
  $('#modalBody').innerHTML = `
    <header class="modal-head"><h2>Paste New Plan</h2><button type="button" class="icon-btn" data-act="closeImport" aria-label="Close">${I.close}</button></header>
    <div class="modal-scroll">
      <p class="micro">Paste your AI chat's reply. Code fences and chatty text around it are fine. Unknown ingredients are added with the macros the AI provided.</p>
      <textarea data-input="importText" rows="9" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder='{ "type": "recipe", "name": "…", "ingredients": [ … ], "steps": [ … ] }'>${esc(UI.importText)}</textarea>
      <div class="btn-row">
        <button type="button" class="btn btn-soft btn-sm" data-act="pasteImport">Paste</button>
        <button type="button" class="btn btn-soft btn-sm" data-act="copyTemplate" data-v="recipe">Recipe template</button>
        <button type="button" class="btn btn-soft btn-sm" data-act="copyTemplate" data-v="batchPlan">Batch template</button>
      </div>
      <button type="button" class="btn btn-soft" data-act="checkImport">Check reply</button>
      ${preview}
    </div>
    <footer class="modal-foot"><button type="button" class="btn btn-primary btn-lg" data-act="saveImport" ${canSave ? '' : 'disabled'}>${I.check}Save to my app</button></footer>`;
}

function renderWriteModal() {
  const d = UI.draft || (UI.draft = emptyDraft());
  const ingNames = Object.keys(INGREDIENTS).filter((id) => !['basic', 'leftover'].includes(INGREDIENTS[id].cat)).map((id) => INGREDIENTS[id].name);
  const sel = (key, opts, cur) => `<select data-draft="${key}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(cur) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  $('#modalBody').innerHTML = `
    <header class="modal-head"><h2>Write my own recipe</h2><button type="button" class="icon-btn" data-act="closeImport" aria-label="Close">${I.close}</button></header>
    <div class="modal-scroll">
      <label class="field"><span class="label">Title</span><input type="text" data-draft="title" value="${esc(d.title)}" placeholder="e.g. Lemon-herb chicken traybake" autocomplete="off"></label>
      <div class="form-grid">
        <label>Cuisine${sel('cuisine', E.listGenCuisines().map((c) => [c, c]), d.cuisine)}</label>
        <label>Meal slot${sel('slot', [['', 'Any'], ...E.listMealSlots().map((x) => [x, x])], d.slot)}</label>
      </div>
      <div class="form-grid three">
        <label>Servings<input type="number" inputmode="numeric" min="1" max="12" data-draft="servings" value="${esc(d.servings)}"></label>
        <label>Active min<input type="number" inputmode="numeric" min="0" data-draft="active" value="${esc(d.active)}"></label>
        <label>Passive min<input type="number" inputmode="numeric" min="0" data-draft="passive" value="${esc(d.passive)}"></label>
      </div>
      <div class="field"><h3 class="label">Ingredients</h3>
        <div class="ing-rows">${d.ings.map((ing, i) => `<div class="ing-row">
          <input type="text" list="ingNames" data-draft-ing="${i}" data-k="name" value="${esc(ing.name)}" placeholder="Ingredient" aria-label="Ingredient ${i + 1}" autocomplete="off">
          <input type="number" inputmode="decimal" min="0" step="any" data-draft-ing="${i}" data-k="amt" value="${esc(ing.amt)}" placeholder="0" aria-label="Amount">
          <select data-draft-ing="${i}" data-k="unit" aria-label="Unit">${['g', 'ml', 'pcs'].map((u) => `<option ${ing.unit === u ? 'selected' : ''}>${u}</option>`).join('')}</select>
          <button type="button" class="icon-btn subtle" data-act="woDelIng" data-i="${i}" aria-label="Remove ingredient" ${d.ings.length <= 1 ? 'disabled' : ''}>${I.trash}</button>
        </div>`).join('')}</div>
        <datalist id="ingNames">${ingNames.map((n) => `<option value="${esc(n)}"></option>`).join('')}</datalist>
        <button type="button" class="btn btn-soft btn-sm" data-act="woAddIng">${I.plus}Add ingredient</button>
        <p class="micro">Names from the list get exact macros. Anything else is saved too, at 0 kcal.</p>
      </div>
      <label class="field"><span class="label">Steps · one per line</span><textarea class="plain" data-draft="steps" rows="6" placeholder="Pat the chicken dry and season it.&#10;Air fry at 190 °C for 15 min.&#10;Rest 5 min, then slice.">${esc(d.steps)}</textarea></label>
      <label class="field"><span class="label">Michelin tip <small>(optional)</small></span><textarea class="plain short" data-draft="tip" rows="2" placeholder="e.g. Rest the meat on a rack so the crust stays crisp.">${esc(d.tip)}</textarea></label>
      ${UI.draftErrors.length ? `<div class="alert alert-danger"><div class="alert-head">${I.warn}<b>Almost there</b></div><ul>${UI.draftErrors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>` : ''}
    </div>
    <footer class="modal-foot"><button type="button" class="btn btn-primary btn-lg" data-act="saveWrite">${I.check}Save to My Recipes</button></footer>`;
}

function openModal(kind) {
  UI.modal = kind;
  if (kind === 'import') UI.importResult = UI.importText ? E.parseImport(UI.importText) : null;
  renderModal();
  const m = $('#modal');
  m.hidden = false;
  requestAnimationFrame(() => { m.classList.add('open'); document.documentElement.classList.add('sheet-open'); });
  $('.modal-scroll', m).scrollTop = 0;
}
const openImport = () => openModal('import');

function closeImport() {
  const m = $('#modal');
  m.classList.remove('open');
  if (!UI.detail) document.documentElement.classList.remove('sheet-open');
  setTimeout(() => { if (!m.classList.contains('open')) m.hidden = true; }, 250);
}

async function copyText(txt) {
  try {
    await navigator.clipboard.writeText(txt);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = txt;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, txt.length);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

// ------------------------------------------------------------------------------------------
// TAB 3 — MACROS & WEIGHT
// ------------------------------------------------------------------------------------------
function renderMacros() {
  const key = UI.logDate;
  const entries = S.mealLogs[key] || [];
  const sum = E.summarizeDay(entries, S.targets);
  const over = sum.kcal > S.targets.calories;
  const today = E.dayKey(new Date());

  let h = `<div class="daynav">
    <button type="button" class="icon-btn" data-act="day" data-v="-1" aria-label="Previous day">${I.chevL}</button>
    <button type="button" class="daynav-label" data-act="day" data-v="0">${esc(dateLabel(key))}</button>
    <button type="button" class="icon-btn" data-act="day" data-v="1" aria-label="Next day" ${key >= today ? 'disabled' : ''}>${I.chev}</button>
  </div>`;

  h += `<section class="card">
    <div class="card-head"><h2>Daily targets</h2><button type="button" class="link" data-act="editTargets">${UI.editTargets ? 'Done' : 'Edit'}</button></div>
    ${UI.editTargets ? `<form class="form-grid two" data-form="targets">
      <label>Protein (g)<input name="protein" type="number" inputmode="numeric" min="0" value="${S.targets.protein}"></label>
      <label>Calories (kcal)<input name="calories" type="number" inputmode="numeric" min="0" value="${S.targets.calories}"></label>
      <button type="submit" class="btn btn-primary span2">Save targets</button>
    </form>` : ''}
    <div class="progress">
      <div class="progress-row"><span>Protein</span><b>${r0(sum.p)} <small>/ ${S.targets.protein} g</small></b></div>
      <div class="bar-track"><span class="fill fill-p" style="width:${sum.proteinPct * 100}%"></span></div>
      <small class="micro">${sum.proteinLeft > 0 ? `${r0(sum.proteinLeft)} g to go` : 'Protein goal hit'}</small>
    </div>
    <div class="progress">
      <div class="progress-row"><span>Calories</span><b>${r0(sum.kcal)} <small>/ ${r0(S.targets.calories)} kcal</small></b></div>
      <div class="bar-track"><span class="fill ${over ? 'fill-over' : 'fill-k'}" style="width:${sum.kcalPct * 100}%"></span></div>
      <small class="micro">${over ? `${r0(-sum.kcalLeft)} kcal over` : `${r0(sum.kcalLeft)} kcal left`} · Carbs ${r0(sum.c)} g · Fat ${r0(sum.f)} g</small>
    </div>
  </section>`;

  h += `<section class="card">
    <div class="card-head"><h2>Logged meals</h2><span class="hint">${entries.length} item${entries.length === 1 ? '' : 's'}</span></div>
    ${entries.length ? `<ul class="log">${entries.map((e) => `<li>
      <div><b>${esc(e.name)}</b><small>${new Date(e.ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} · ${e.source === 'batch' ? 'Batch container' : e.source === 'recipe' ? 'Cooked' : 'Manual'}</small></div>
      <div class="log-m"><b>${e.p} g</b><small>${r0(e.kcal)} kcal</small></div>
      <button type="button" class="icon-btn subtle" data-act="delMeal" data-id="${e.id}" aria-label="Delete">${I.trash}</button>
    </li>`).join('')}</ul>` : '<div class="empty small">Nothing logged yet. Tap <b>I Ate This</b> on any recipe, or add a meal below.</div>'}
    <h3 class="label">Quick add</h3>
    <div class="chips">${QUICK_ADDS.map((q, i) => { const m = E.roundMacros(E.computeMacros(q.items)); return `<button type="button" class="chip" data-act="preset" data-i="${i}">${esc(q.name)} <small>${m.p} g P</small></button>`; }).join('')}</div>
    <form class="form-grid" data-form="meal">
      <label class="span2">Meal<input name="name" type="text" placeholder="e.g. Protein shake" autocomplete="off"></label>
      <label>Protein (g)<input name="p" type="number" inputmode="decimal" min="0" step="any"></label>
      <label>Calories<input name="kcal" type="number" inputmode="decimal" min="0" step="any" placeholder="auto"></label>
      <label>Carbs (g)<input name="c" type="number" inputmode="decimal" min="0" step="any"></label>
      <label>Fat (g)<input name="f" type="number" inputmode="decimal" min="0" step="any"></label>
      <button type="submit" class="btn btn-primary span2">${I.plus}Add to ${esc(dateLabel(key).toLowerCase() === 'today' ? 'today' : dateLabel(key))}</button>
    </form>
  </section>`;

  // Body weight & measurements
  const trend = E.measurementTrend(S.weightLogs, UI.weightMetric);
  const unit = UI.weightMetric === 'kg' ? 'kg' : 'cm';
  h += `<section class="card">
    <div class="card-head"><h2>Body & measurements</h2></div>
    <form class="form-grid" data-form="weight">
      <label>Date<input name="date" type="date" value="${today}" max="${today}"></label>
      <label>Weight (kg)<input name="kg" type="number" inputmode="decimal" step="0.1" min="0" placeholder="72.4"></label>
      ${UI.showMeasure ? `
      <label>Chest (cm)<input name="chest" type="number" inputmode="decimal" step="0.1" min="0"></label>
      <label>Waist (cm)<input name="waist" type="number" inputmode="decimal" step="0.1" min="0"></label>
      <label>Hip (cm)<input name="hip" type="number" inputmode="decimal" step="0.1" min="0"></label>` : ''}
      <button type="button" class="link span2 left" data-act="toggleMeasure">${UI.showMeasure ? '− Hide measurements' : '+ Add chest / waist / hip (optional)'}</button>
      <button type="submit" class="btn btn-primary span2">Save entry</button>
    </form>
    ${seg('metric', [['kg', 'Weight'], ['waist', 'Waist'], ['chest', 'Chest'], ['hip', 'Hip']], UI.weightMetric)}
    ${trend.points.length ? `<div class="tiles tiles-3">
      <div class="tile"><b>${trend.latest}<small>${unit}</small></b><span>Latest</span></div>
      <div class="tile ${trend.change < 0 ? 'tile-down' : trend.change > 0 ? 'tile-up' : ''}"><b>${trend.change > 0 ? '+' : ''}${trend.change}<small>${unit}</small></b><span>Since start</span></div>
      <div class="tile"><b>${trend.avg7}<small>${unit}</small></b><span>Avg last 7</span></div>
    </div>` : ''}
    ${chart(trend, unit)}
    ${S.weightLogs.length ? `<h3 class="label">History</h3><ul class="log hist">${E.withDeltas(S.weightLogs).map((w) => `<li>
      <div><b>${esc(dateLabel(w.date))}</b><small>${[w.chest && `Chest ${w.chest}`, w.waist && `Waist ${w.waist}`, w.hip && `Hip ${w.hip}`].filter(Boolean).join(' · ') || '&nbsp;'}</small></div>
      <div class="log-m"><b>${w.kg ?? '—'}${w.kg !== null ? ' kg' : ''}</b>${w.dKg !== null ? `<small class="${w.dKg < 0 ? 'down' : w.dKg > 0 ? 'up' : ''}">${w.dKg > 0 ? '+' : ''}${w.dKg}</small>` : ''}</div>
      <button type="button" class="icon-btn subtle" data-act="delWeight" data-id="${w.id}" aria-label="Delete">${I.trash}</button>
    </li>`).join('')}</ul>` : ''}
  </section>`;
  return h;
}

function chart(trend, unit) {
  const pts = trend.points;
  if (pts.length < 2) return `<div class="chart-empty">${pts.length ? 'Log one more entry to see your trend line.' : 'Your trend line appears after two entries.'}</div>`;
  const W = 340; const H = 150; const L = 34; const R = 10; const T = 12; const B = 24;
  const toDay = (d) => { const [y, m, dd] = d.split('-').map(Number); return Date.UTC(y, m - 1, dd) / 864e5; };
  const x0 = toDay(pts[0].date); const x1 = toDay(pts[pts.length - 1].date) || x0 + 1;
  const pad = Math.max((trend.max - trend.min) * 0.15, 0.5);
  const y0 = trend.min - pad; const y1 = trend.max + pad;
  const X = (d) => L + ((toDay(d) - x0) / Math.max(x1 - x0, 1)) * (W - L - R);
  const Y = (v) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.date).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');
  const area = `${line} L${X(pts[pts.length - 1].date).toFixed(1)},${H - B} L${X(pts[0].date).toFixed(1)},${H - B} Z`;
  const fmtD = (d) => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); };
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Trend chart">
    <defs><linearGradient id="ga" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".28"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
    <line x1="${L}" x2="${W - R}" y1="${Y(trend.max)}" y2="${Y(trend.max)}" class="grid"/>
    <line x1="${L}" x2="${W - R}" y1="${Y(trend.min)}" y2="${Y(trend.min)}" class="grid"/>
    <text x="${L - 6}" y="${Y(trend.max) + 4}" text-anchor="end">${trend.max}</text>
    <text x="${L - 6}" y="${Y(trend.min) + 4}" text-anchor="end">${trend.min}</text>
    <path d="${area}" class="area" fill="url(#ga)"/>
    <path d="${line}" class="line"/>
    ${pts.map((p) => `<circle cx="${X(p.date).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="3.2"/>`).join('')}
    <text x="${L}" y="${H - 6}">${fmtD(pts[0].date)}</text>
    <text x="${W - R}" y="${H - 6}" text-anchor="end">${fmtD(pts[pts.length - 1].date)}</text>
  </svg><p class="micro center">${unit}</p>`;
}

// ------------------------------------------------------------------------------------------
// TAB 4 — RULES & PANTRY
// ------------------------------------------------------------------------------------------
function renderRules() {
  const st = S.settings;
  const allIds = Object.keys(INGREDIENTS);
  const avail = E.batchableRecipes(st).length;
  const total = E.batchableRecipes({ ...E.defaultSettings(), locks: {}, blocklist: [] }).length;

  let h = `<p class="lede">Set these once. They apply to every recipe, match and batch plan. <b>${avail} of ${total}</b> recipes fit your rules right now.</p>`;

  h += `<section class="card">
    <div class="card-head"><h2>Always in pantry</h2><span class="hint">${Object.values(st.pantry).filter(Boolean).length} on</span></div>`;
  INGREDIENT_GROUPS.pantry.forEach((g) => {
    const ids = E.listIngredients('pantry').filter((id) => INGREDIENTS[id].group === g);
    h += `<div class="chip-group"><h3>${esc(g)}</h3><div class="chips">${ids.map((id) => {
      const blocked = E.blockReason(id, st);
      return `<button type="button" class="chip toggle ${st.pantry[id] ? 'on' : ''} ${blocked ? 'blocked' : ''}" data-act="pantry" data-id="${id}" aria-pressed="${!!st.pantry[id]}">${st.pantry[id] ? I.check : ''}${esc(name(id))}</button>`;
    }).join('')}</div></div>`;
  });
  h += `<div class="chip-group"><h3>My staples</h3>
    ${S.customPantry.length ? `<div class="chips">${S.customPantry.map((x) => `<span class="chip-pair ${st.pantry[x.id] ? 'on' : ''} ${E.blockReason(x.id, st) ? 'blocked' : ''}">
      <button type="button" class="chip toggle ${st.pantry[x.id] ? 'on' : ''}" data-act="pantry" data-id="${esc(x.id)}" aria-pressed="${!!st.pantry[x.id]}">${st.pantry[x.id] ? I.check : ''}${esc(x.name)}</button>
      <button type="button" class="chip-x" data-act="delPantry" data-id="${esc(x.id)}" aria-label="Delete ${esc(x.name)}">${I.close}</button></span>`).join('')}</div>` : '<p class="micro">Add anything you always keep in, like za\'atar, coconut aminos or pomegranate molasses.</p>'}
    <form class="inline-form" data-form="pantryAdd">
      <input name="item" type="text" placeholder="Add a pantry staple…" autocomplete="off" enterkeyhint="done" aria-label="New pantry staple">
      <button type="submit" class="btn btn-primary">${I.plus}<span>Add</span></button>
    </form>
  </div>`;
  const traps = allIds.filter((id) => INGREDIENTS[id].glutenNote && (INGREDIENTS[id].cat === 'pantry' || INGREDIENTS[id].cat === 'fresh'));
  if (st.locks.glutenFree) {
    h += `<details class="more inset"><summary>${I.warn} Gluten traps to check on labels <span class="count">${traps.length}</span></summary>
      <ul class="plain">${traps.map((id) => `<li><b>${esc(name(id))}</b>: ${esc(INGREDIENTS[id].glutenNote)}</li>`).join('')}</ul></details>`;
  }
  h += '</section>';

  h += `<section class="card">
    <div class="card-head"><h2>Dietary locks</h2><span class="hint">Hard filters</span></div>
    ${LOCKS.map((l) => switchRow('lock', l.id, l.label, st.locks[l.id], lockHint(l))).join('')}
  </section>`;

  h += `<section class="card">
    <div class="card-head"><h2>Never suggest</h2><span class="hint">Auto-swapped or hidden</span></div>
    <div class="tray">${st.blocklist.map((term, i) => {
      const hits = allIds.filter((id) => E.ingredientMatchesTerm(id, term));
      return `<span class="pill pill-block"><span class="pill-name">${esc(term)} <small>${hits.length ? `→ ${esc(hits.map(name).join(', '))}` : '(no match yet)'}</small></span><button type="button" class="pill-x" data-act="unblock" data-i="${i}" aria-label="Remove">${I.close}</button></span>`;
    }).join('') || '<span class="micro">Nothing blocked.</span>'}</div>
    <form class="inline-form" data-form="block">
      <input name="term" type="text" placeholder="e.g. cilantro, feta, salmon" autocomplete="off" enterkeyhint="done" aria-label="Ingredient to never suggest">
      <button type="submit" class="btn btn-soft">${I.plus}<span>Block</span></button>
    </form>
    <p class="micro">Blocked ingredients are replaced with the best substitute from the matrix. Optional garnishes are dropped. If there's no safe swap, the recipe is hidden.</p>
  </section>`;

  h += `<section class="card">
    <div class="card-head"><h2>Appliances</h2><span class="hint">Steps adapt automatically</span></div>
    ${APPLIANCES.map((a) => switchRow('appliance', a.id, a.label, st.appliances[a.id], applianceHint(a.id), APP_ICON[a.id])).join('')}
  </section>`;

  const customs = S.customRecipes;
  const kindOf = (r) => (r.written ? 'Written by you' : r.generated ? "Chef's creation" : 'Imported');
  h += `<section class="card">
    <div class="card-head"><h2>My recipes</h2><span class="hint">${customs.length}</span></div>
    ${customs.length ? `<ul class="log">${customs.map((r) => {
      const chk = E.importCheck(r, st);
      return `<li><div><b>${r.emoji} ${esc(r.name)}</b><small>${esc(kindOf(r))} · ${esc(r.cuisine)}${r.slot ? ` · ${r.slot}` : ''} · ${r.servings} servings${chk.hidden ? ' · hidden by your rules' : ''}</small></div>
        <button type="button" class="btn btn-soft btn-sm" data-act="openCustom" data-id="${esc(r.id)}">Open</button>
        <button type="button" class="icon-btn subtle" data-act="delCustom" data-id="${esc(r.id)}" aria-label="Delete">${I.trash}</button></li>`;
    }).join('')}</ul>` : '<div class="empty small">Recipes you write, generate in Quick Cook or import show up here, in Quick Cook, and in the 7-day planner.</div>'}
    <button type="button" class="btn btn-soft" data-act="openWrite">${I.plus}Write My Own Recipe</button>
  </section>`;

  h += `<section class="card">
    <div class="card-head"><h2>Your data</h2><span class="hint">Saved on this device</span></div>
    <div class="btn-row">
      <button type="button" class="btn btn-soft" data-act="export">Export backup</button>
      <label class="btn btn-soft">Import<input type="file" accept="application/json,.json" data-change="import" hidden></label>
      <button type="button" class="btn btn-danger" data-act="reset">Reset</button>
    </div>
  </section>`;
  h += aiCard();
  return h;
}

function lockHint(l) {
  const on = { ...S.settings, locks: { ...S.settings.locks, [l.id]: true } };
  const off = { ...S.settings, locks: { ...S.settings.locks, [l.id]: false } };
  const withLock = E.batchableRecipes(on);
  const adapted = withLock.filter((r) => {
    const before = E.resolveRecipe(E.getRecipe(r.id), off);
    return r.swapsApplied.length + r.dropped.length > before.swapsApplied.length + before.dropped.length;
  }).length;
  return `${withLock.length} recipes fit${adapted ? ` · ${adapted} adapted with swaps` : ' · no swaps needed'}`;
}

function applianceHint(id) {
  return {
    stovetop: 'Pan sears, rice, pasta, simmered sauces',
    airfryer: 'Crisping, glazing, hands-off proteins',
    instantpot: 'Pressure-cooked rice, braises, risotto',
  }[id];
}

function switchRow(act, id, label, on, hint, icon = '') {
  return `<button type="button" class="switch-row" role="switch" aria-checked="${!!on}" data-act="${act}" data-id="${id}">
    ${icon ? `<span class="sr-ico">${icon}</span>` : ''}<span class="sr-text"><b>${esc(label)}</b>${hint ? `<small>${esc(hint)}</small>` : ''}</span>
    <span class="switch ${on ? 'on' : ''}"><span></span></span>
  </button>`;
}

// ------------------------------------------------------------------------------------------
// RECIPE DETAIL (shared by Tab 1 & Tab 2)
// ------------------------------------------------------------------------------------------
function openDetail(id, { context = 'quick', servings, swap } = {}) {
  const raw = E.getRecipe(id);
  if (!raw) return;
  const p = prefs(id);
  if (swap) {
    const [from, key] = swap.split('|');
    p.swaps[from] = key;
    persist('recipePrefs');
    const sub = E.getSubstitution(key);
    if (sub) setTimeout(() => toast(`Swapped in ${sub.to.map((t) => short(t.id)).join(' + ')} for ${short(from)}`), 250);
  }
  UI.detail = {
    id,
    context,
    servings: servings || (context === 'quick' && p.servings) || raw.servings,
    problem: null,
    sauceId: raw.sauceId || 'yuzu-ponzu',
    sauceMode: 'servings',
    sauceServings: null,
    sauceTotal: 250,
  };
  renderDetail();
  const sheet = $('#sheet');
  sheet.hidden = false;
  requestAnimationFrame(() => { sheet.classList.add('open'); document.documentElement.classList.add('sheet-open'); });
  $('#sheetBody').scrollTop = 0;
}

function closeDetail() {
  if (UI.detail && isDraft(UI.detail.id)) E.setDraftRecipe(null);
  const sheet = $('#sheet');
  sheet.classList.remove('open');
  document.documentElement.classList.remove('sheet-open');
  UI.detail = null;
  setTimeout(() => { if (!UI.detail) sheet.hidden = true; }, 320);
  render();
}

function renderDetail() {
  const d = UI.detail;
  if (!d) return;
  const raw = E.getRecipe(d.id);
  const swaps = prefs(d.id).swaps;
  const res = E.resolveRecipe(raw, S.settings, swaps);
  const scaled = E.scaleResolved(res, d.servings);
  const per = E.servingMacros(res);
  const total = E.computeMacros(E.flatItems(scaled));
  const time = E.recipeTime(res, d.servings);
  const avail = availability();
  const isBatch = d.context === 'batch';

  let h = `<header class="sheet-head">
    <button type="button" class="icon-btn" data-act="closeSheet" aria-label="Close">${I.close}</button>
    <span class="sheet-title">${esc(res.name)}</span>
    <span class="icon-btn ghost"></span>
  </header>
  <div class="sheet-content">
  <div class="hero"><span class="hero-emoji">${res.emoji}</span>
    <h2>${esc(res.name)}</h2>
    <p>${esc(res.blurb)}</p>
    <div class="meta center"><span>${esc(res.moods.join(' · '))}</span>${res.slot ? `<span>${SLOT_ICON[res.slot] || ''} ${esc(res.slot)}</span>` : ''}</div>
    ${isDraft(d.id) ? `<span class="badge badge-hot">${I.spark}Chef's creation · not saved yet</span>`
      : raw.custom ? `<span class="badge badge-fridge">${I.check}In My Recipes</span>` : ''}
  </div>
  ${isDraft(d.id) ? `${UI.genNotes.length ? `<div class="notice"><ul>${UI.genNotes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}
  <div class="btn-row"><button type="button" class="btn btn-soft" data-act="remixRecipe">${I.swap}Try another</button><button type="button" class="btn btn-primary" data-act="saveDraft">${I.check}Save to My Recipes</button></div>` : ''}
  ${res.hidden ? `<div class="alert">${I.warn}<b>Not compatible with your rules:</b> ${esc(res.hiddenReasons.join(', '))}</div>` : ''}

  <div class="times">
    <div><span>${I.hand}</span><b>${time.active} min</b><small>Active</small></div>
    <div><span>${I.pause}</span><b>${time.passive} min</b><small>Passive</small></div>
    <div><span>${I.clock}</span><b>${time.total} min</b><small>Start → plate</small></div>
  </div>

  <div class="row-between serv">
    <div><h3 class="label">${isBatch ? 'Portions (containers)' : 'Servings'}</h3><small class="micro">Amounts, macros & timings update live</small></div>
    <div class="stepper">
      <button type="button" data-act="serv" data-d="-1" aria-label="Fewer" ${d.servings <= 1 ? 'disabled' : ''}>${I.minus}</button>
      <b>${d.servings}</b>
      <button type="button" data-act="serv" data-d="1" aria-label="More" ${d.servings >= 21 ? 'disabled' : ''}>${I.plus}</button>
    </div>
  </div>
  <h3 class="label">Per serving</h3>
  ${macroTiles(per, { big: true })}
  <p class="micro">Total for ${d.servings}: ${r0(total.p)} g protein · ${r0(total.c)} g carbs · ${r0(total.f)} g fat · ${r0(total.kcal)} kcal</p>`;

  const notices = [
    ...res.swapsApplied.filter((l) => l.kind === 'auto').map((l) => `${esc(name(l.srcId))} → <b>${esc(l.entries.map((e) => name(e.id)).join(' + '))}</b> <small>(${esc(l.reason)})</small>`),
    ...res.dropped.map((l) => `${esc(name(l.srcId))} left out <small>(${esc(l.reason)})</small>`),
    ...res.adaptedSteps.map((s) => `Step ${s.idx + 1} adapted: ${APP_LABEL[s.adaptedFrom]} → <b>${APP_LABEL[s.app]}</b>`),
  ];
  if (notices.length) h += `<div class="notice"><b>Adapted to your rules</b><ul>${notices.map((n) => `<li>${n}</li>`).join('')}</ul></div>`;

  // Ingredients
  h += `<section class="block"><h3 class="block-title">Ingredients</h3><ul class="ings">
    ${scaled.lines.map((l) => {
      if (l.kind === 'dropped') return `<li class="dropped"><span class="amt">—</span><span>${esc(name(l.srcId))} <small>skipped</small></span></li>`;
      return l.entries.map((e, i) => {
        const have = E.isAvailable(e.id, avail);
        return `<li class="${l.kind !== 'original' ? 'swapped' : ''}">
          <span class="amt">${esc(E.formatAmount(e.id, e.g))}</span>
          <span class="ing-name">${esc(name(e.id))}${l.base.opt ? ' <small>optional</small>' : ''}${l.base.note && i === 0 ? ` <small>${esc(l.base.note)}</small>` : ''}${l.kind !== 'original' && i === 0 ? ` <small class="was">instead of ${esc(short(l.srcId))}</small>` : ''}</span>
          ${E.isBasic(e.id) ? '' : `<span class="have ${have ? 'yes' : 'no'}" title="${have ? 'You have it' : 'Not in fridge/pantry'}">${have ? I.check : 'need'}</span>`}
          ${l.kind === 'user' && i === 0 ? `<button type="button" class="link small" data-act="unswap" data-from="${l.srcId}">Undo</button>` : ''}
        </li>`;
      }).join('');
    }).join('')}
  </ul></section>`;

  // Steps
  h += `<section class="block"><h3 class="block-title">Method</h3><ol class="steps">
    ${res.steps.map((s, i) => {
      const t = E.scaleStepTimes(s, d.servings, res.servings);
      return `<li class="${s.unavailable ? 'unavailable' : ''}">
        <div class="step-head"><span class="num">${i + 1}</span><span class="app app-${s.app}">${APP_ICON[s.app]}${APP_LABEL[s.app]}</span>
        <span class="step-time">${t.a ? `${t.a}′ active` : ''}${t.a && t.p ? ' · ' : ''}${t.p ? `${t.p}′ passive` : ''}</span></div>
        <p>${segmentsHTML(E.stepSegments(s.t, scaled.lines))}</p>
        ${t.rounds > 1 ? `<small class="micro">Cook in ${t.rounds} batches. Don't crowd the pan or basket.</small>` : ''}
      </li>`;
    }).join('')}
  </ol></section>`;

  // Technique cards
  if (res.techniques.length) h += `<section class="block"><h3 class="block-title">Chef upgrades</h3>
    ${res.techniques.map((t) => `<div class="tech"><span class="tech-ico">${I.star}</span><div><b>${esc(t.title)}</b><p>${esc(t.text)}</p></div></div>`).join('')}
  </section>`;

  // Substitution matrix
  h += renderSubs(res, swaps, per);

  // Taste fixer
  h += `<section class="block"><h3 class="block-title">Taste Fixer</h3><p class="micro">Tasting while you cook? Tap what's wrong.</p>
    <div class="chips">${E.listTasteProblems().map((p) => `<button type="button" class="chip ${d.problem === p.id ? 'on' : ''}" data-act="problem" data-v="${p.id}">${esc(p.label)}</button>`).join('')}</div>`;
  if (d.problem) {
    const fx = E.tasteFixes(d.problem, { servings: d.servings, available: avail, settings: S.settings });
    h += `<div class="fixes"><p class="why">${esc(fx.why)} Amounts are for ${d.servings} serving${d.servings > 1 ? 's' : ''}. Add one fix at a time and taste again.</p>
      <ol>${fx.fixes.map((f) => `<li class="${f.have ? '' : 'nohave'}"><b>${esc(E.formatAmount(f.id, f.amount))} ${esc(short(f.id))}</b>${f.have ? '' : ' <small>(not in pantry)</small>'}<br><small>${esc(f.how)}</small></li>`).join('')}</ol></div>`;
  }
  h += '</section>';

  // Sauce calculator
  h += renderSauceCalc(d);

  h += `<div class="sheet-spacer"></div></div>
  <footer class="sheet-foot">
    <div class="foot-info"><b>${Math.round(per.p)} g protein</b><small>${r0(per.kcal)} kcal per ${isBatch ? 'container' : 'serving'}</small></div>
    <button type="button" class="btn btn-primary btn-lg" data-act="ateThis">${I.check}${isBatch ? 'Log 1 container' : 'I Ate This'}</button>
  </footer>`;

  const body = $('#sheetBody');
  const top = body.scrollTop;
  body.innerHTML = h;
  body.scrollTop = top;
}

function renderSubs(res, swaps, per) {
  const rows = [];
  res.lines.forEach((l) => {
    if (l.kind === 'dropped') return;
    E.substitutionsFor(l.srcId, S.settings).filter((s) => s.allowed).forEach((s) => rows.push({ line: l, sub: s }));
  });
  if (!rows.length) return '';
  const byRole = {};
  rows.forEach((r) => { (byRole[r.sub.role] = byRole[r.sub.role] || []).push(r); });
  const main = ['Umami', 'Acid', 'Creaminess', 'Crunch'];
  const roles = ROLE_ORDER.filter((r) => byRole[r]);
  const roleHTML = (role) => `<div class="role"><h4>${esc(role)}</h4>${byRole[role].map(({ line, sub }) => {
    const active = swaps[line.srcId] === sub.key;
    const trial = E.servingMacros(E.resolveRecipe(E.getRecipe(res.id), S.settings, { ...swaps, [line.srcId]: active ? undefined : sub.key }));
    const dP = Math.round(trial.p - per.p);
    const dK = Math.round(trial.kcal - per.kcal);
    const delta = active ? '' : `<span class="delta">${dP ? `${dP > 0 ? '+' : ''}${dP} g P` : '±0 g P'} · ${dK > 0 ? '+' : ''}${dK} kcal</span>`;
    return `<div class="sub ${active ? 'active' : ''}">
      <div class="sub-main"><b>${esc(short(sub.from))} → ${esc(sub.to.map((t) => short(t.id)).join(' + '))}</b>
      <span class="ratio">${esc(sub.to.map((t) => `1 : ${E.roundNice(t.r)}`).join(' + '))}</span>${delta}
      <small>${esc(sub.note)}</small></div>
      <button type="button" class="btn ${active ? 'btn-primary' : 'btn-soft'} btn-sm" data-act="${active ? 'unswap' : 'swap'}" data-from="${line.srcId}" data-key="${esc(sub.key)}">${active ? `${I.check}On` : 'Swap'}</button>
    </div>`;
  }).join('')}</div>`;
  const primary = roles.filter((r) => main.includes(r));
  const extra = roles.filter((r) => !main.includes(r));
  return `<section class="block"><h3 class="block-title">Substitution matrix</h3><p class="micro">Grouped by culinary role. Ratio = replacement per 1 g/ml of the original. Macros recalculate instantly.</p>
    ${primary.map(roleHTML).join('')}
    ${extra.length ? `<details class="more inset"><summary>Protein, carb & veg swaps <span class="count">${extra.reduce((s, r) => s + byRole[r].length, 0)}</span></summary>${extra.map(roleHTML).join('')}</details>` : ''}
  </section>`;
}

function renderSauceCalc(d) {
  const sauces = E.listSauces();
  const sauce = E.getSauce(d.sauceId) || sauces[0];
  const sv = d.sauceServings || d.servings;
  const out = d.sauceMode === 'total' ? E.scaleSauce(sauce, { totalGrams: d.sauceTotal }) : E.scaleSauce(sauce, { servings: sv });
  return `<section class="block"><h3 class="block-title">Sauce & glaze calculator</h3>
    <label class="select-wrap"><span class="sr-only">Sauce</span>
      <select data-change="sauce">${sauces.map((s) => `<option value="${s.id}" ${s.id === sauce.id ? 'selected' : ''}>${esc(s.name)}${s.id === E.getRecipe(d.id).sauceId ? ' (this recipe)' : ''}</option>`).join('')}</select>
    </label>
    ${seg('sauceMode', [['servings', 'By servings'], ['total', 'By total weight']], d.sauceMode)}
    ${d.sauceMode === 'total'
      ? `<label class="field-inline">Total sauce wanted<input type="number" inputmode="numeric" min="10" step="10" value="${d.sauceTotal}" data-change="sauceTotal"><span>g</span></label>`
      : `<div class="row-between"><span class="micro">Servings</span><div class="stepper sm"><button type="button" data-act="sauceServ" data-d="-1" ${sv <= 1 ? 'disabled' : ''} aria-label="Fewer">${I.minus}</button><b>${sv}</b><button type="button" data-act="sauceServ" data-d="1" aria-label="More">${I.plus}</button></div></div>`}
    <table class="qty"><thead><tr><th>Ingredient</th><th>Amount</th><th>%</th></tr></thead><tbody>
      ${out.items.map((i) => `<tr><td>${esc(name(i.id))}</td><td><b>${esc(E.formatAmount(i.id, i.g).replace(/ \(≈.*\)/, ''))}</b></td><td>${Math.round(i.pct)}%</td></tr>`).join('')}
      <tr class="total"><td>Total</td><td><b>${Math.round(out.total)} g</b></td><td>${r0(out.macros.kcal)} kcal</td></tr>
    </tbody></table>
    <p class="micro">${esc(sauce.tip)}</p>
  </section>`;
}

// ------------------------------------------------------------------------------------------
// Logging
// ------------------------------------------------------------------------------------------
function logMeal(entry, key = E.dayKey(new Date())) {
  S.mealLogs = E.addMealLog(S.mealLogs, key, entry);
  persist('mealLogs');
  toast(`Logged ${entry.p} g protein · ${r0(entry.kcal)} kcal`, () => {
    S.mealLogs = E.removeMealLog(S.mealLogs, key, entry.id);
    persist('mealLogs');
    render();
  });
}

function logRecipe(id, { container = false, size = 1 } = {}) {
  const res = E.resolveRecipe(E.getRecipe(id), S.settings, prefs(id).swaps);
  const m = E.servingMacros(res);
  const mult = container ? size : 1;
  logMeal(E.makeMealEntry({
    name: container ? `${res.name} · batch box` : res.name,
    p: m.p * mult, c: m.c * mult, f: m.f * mult, kcal: m.kcal * mult,
    recipeId: id,
    source: container ? 'batch' : 'recipe',
    portion: mult,
  }));
}

// ------------------------------------------------------------------------------------------
// Rendering shell
// ------------------------------------------------------------------------------------------
const TABS = {
  quick: { title: 'Quick Cook', sub: 'Cook one meal from what\'s in the fridge', render: renderQuick },
  batch: { title: '7-Day Planner', sub: '21 meals, one prep session', render: renderBatch },
  macros: { title: 'Macros & Weight', sub: 'Protein first, everything else follows', render: renderMacros },
  rules: { title: 'Rules & Pantry', sub: 'Set once, applied everywhere', render: renderRules },
};

function render() {
  const t = TABS[UI.tab];
  $('#title').textContent = t.title;
  $('#subtitle').textContent = t.sub;
  $('#view').innerHTML = t.render();
  document.querySelectorAll('.tabbar button').forEach((b) => {
    const on = b.dataset.v === UI.tab;
    b.classList.toggle('on', on);
    b.setAttribute('aria-current', on ? 'page' : 'false');
  });
  if (UI.detail) renderDetail();
}

// ------------------------------------------------------------------------------------------
// Actions (event delegation)
// ------------------------------------------------------------------------------------------
const toggleIn = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

function generateDraft() {
  const out = E.generateFridgeRecipe({ settings: S.settings, fridge: S.fridge, cuisine: S.fridge.genCuisine, servings: 2, variant: UI.genVariant, now: Date.now() });
  if (out.error) { toast(out.error); return; }
  E.setDraftRecipe(out.recipe);
  UI.genNotes = [...out.notes, ...(out.unused.length ? [`Not used this time: ${out.unused.map((id) => short(id)).join(', ')}. Tap Try another for a different combination.`] : [])];
  if (UI.detail) {
    UI.detail.id = out.recipe.id;
    UI.detail.servings = out.recipe.servings;
    UI.detail.sauceId = out.recipe.sauceId || UI.detail.sauceId;
    renderDetail();
    $('#sheetBody').scrollTop = 0;
  } else {
    openDetail(out.recipe.id, { context: 'quick', servings: out.recipe.servings });
  }
}

const weekKey = (w) => JSON.stringify({ ...w, seed: undefined });

function buildWeek(shuffle) {
  const w = S.cart.week;
  if (shuffle) w.seed = (Number(w.seed) || 0) + 1;
  const { blocks, warnings } = E.generateWeek(w, S.settings, S.recipePrefs);
  const prev = JSON.parse(JSON.stringify(S.cart));
  S.cart = { ...S.cart, blocks, proteinGrams: {}, eaten: [], eatenLog: {}, bought: [], genWarnings: warnings, genFrom: weekKey(w) };
  persist('cart'); render();
  const meals = blocks.reduce((n, b) => n + b.count, 0);
  toast(meals ? `Planned ${meals} meals across 7 days` : (warnings[0] || 'Nothing fits your rules'), prev.blocks.length ? () => { S.cart = prev; persist('cart'); render(); } : undefined);
}

const actions = {
  tab(el) { UI.tab = el.dataset.v; render(); window.scrollTo({ top: 0 }); },

  // Quick Cook
  mode(el) { S.fridge.leftoverMode = el.dataset.v === 'leftover'; persist('fridge'); render(); },
  pick(el) {
    const id = el.dataset.id;
    S.fridge.selected = toggleIn(S.fridge.selected, id);
    if (!S.fridge.selected.includes(id)) S.fridge.useFirst = S.fridge.useFirst.filter((x) => x !== id);
    persist('fridge'); render();
  },
  pickLeft(el) {
    const id = el.dataset.id;
    S.fridge.leftovers = toggleIn(S.fridge.leftovers, id);
    if (!S.fridge.leftovers.includes(id)) S.fridge.useFirst = S.fridge.useFirst.filter((x) => x !== id);
    persist('fridge'); render();
  },
  useFirst(el) { S.fridge.useFirst = toggleIn(S.fridge.useFirst, el.dataset.id); persist('fridge'); render(); },
  unselect(el) {
    const id = el.dataset.id;
    S.fridge.selected = S.fridge.selected.filter((x) => x !== id);
    S.fridge.leftovers = S.fridge.leftovers.filter((x) => x !== id);
    S.fridge.useFirst = S.fridge.useFirst.filter((x) => x !== id);
    persist('fridge'); render();
  },
  removeCustom(el) { S.fridge.custom.splice(Number(el.dataset.i), 1); persist('fridge'); render(); },
  clearFridge() {
    const prev = JSON.parse(JSON.stringify(S.fridge));
    S.fridge = { ...S.fridge, selected: [], useFirst: [], custom: [], leftovers: [] };
    persist('fridge'); render();
    toast('Fridge cleared', () => { S.fridge = prev; persist('fridge'); render(); });
  },
  mood(el) { S.fridge.mood = el.dataset.v; persist('fridge'); render(); },
  resTab(el) { S.fridge.missingOne = el.dataset.v === 'missing'; persist('fridge'); render(); },
  open(el) { openDetail(el.dataset.id, { context: 'quick', swap: el.dataset.swap }); },
  genCuisine(el) { S.fridge.genCuisine = el.dataset.v; UI.genVariant = 0; persist('fridge'); render(); },
  genRecipe() { UI.genVariant = 0; generateDraft(); },
  remixRecipe() { UI.genVariant += 1; generateDraft(); },
  saveDraft() {
    const r = E.draftRecipe();
    if (!r) return;
    S.customRecipes = [...S.customRecipes.filter((x) => x.id !== r.id), { ...r, savedAt: Date.now() }];
    E.setDraftRecipe(null);
    syncCustom();
    persist('customRecipes');
    renderDetail();
    toast(`Saved "${r.name}" to My Recipes`);
  },
  openWrite() { if (!UI.draft) UI.draft = emptyDraft(); UI.draftErrors = []; openModal('write'); },
  woAddIng() {
    UI.draft.ings.push({ name: '', amt: '', unit: 'g' });
    renderModal();
    const rows = document.querySelectorAll('.ing-row input[data-k="name"]');
    if (rows.length) rows[rows.length - 1].focus();
  },
  woDelIng(el) { UI.draft.ings.splice(Number(el.dataset.i), 1); if (!UI.draft.ings.length) UI.draft.ings.push({ name: '', amt: '', unit: 'g' }); renderModal(); },
  saveWrite() {
    const out = E.createUserRecipe(UI.draft);
    if (out.errors.length || !out.recipe) { UI.draftErrors = out.errors; renderModal(); $('#modal .modal-scroll').scrollTop = 1e6; return; }
    S.customRecipes = [...S.customRecipes, out.recipe];
    syncCustom();
    persist('customRecipes');
    UI.draft = null;
    UI.draftErrors = [];
    closeImport();
    render();
    openDetail(out.recipe.id, { context: 'quick' });
    toast(out.warnings.length ? `Saved. ${out.warnings[0]}` : `Saved "${out.recipe.name}" to My Recipes`);
  },


  // Macros
  day(el) {
    const d = Number(el.dataset.v);
    const today = E.dayKey(new Date());
    UI.logDate = d === 0 ? today : E.shiftDayKey(UI.logDate, d);
    if (UI.logDate > today) UI.logDate = today;
    render();
  },
  editTargets() { UI.editTargets = !UI.editTargets; render(); },
  delMeal(el) {
    const key = UI.logDate;
    const entry = (S.mealLogs[key] || []).find((e) => e.id === el.dataset.id);
    S.mealLogs = E.removeMealLog(S.mealLogs, key, el.dataset.id);
    persist('mealLogs'); render();
    if (entry) toast('Meal removed', () => { S.mealLogs = E.addMealLog(S.mealLogs, key, entry); persist('mealLogs'); render(); });
  },
  preset(el) {
    const q = QUICK_ADDS[Number(el.dataset.i)];
    const m = E.computeMacros(q.items);
    logMeal(E.makeMealEntry({ name: q.name, ...m, source: 'manual' }), UI.logDate);
    render();
  },
  metric(el) { UI.weightMetric = el.dataset.v; render(); },
  toggleMeasure() { UI.showMeasure = !UI.showMeasure; render(); },
  delWeight(el) {
    const prev = S.weightLogs;
    S.weightLogs = E.removeWeightLog(S.weightLogs, el.dataset.id);
    persist('weightLogs'); render();
    toast('Entry removed', () => { S.weightLogs = prev; persist('weightLogs'); render(); });
  },

  // Rules
  pantry(el) { const id = el.dataset.id; S.settings.pantry[id] = !S.settings.pantry[id]; persist('settings'); render(); },
  lock(el) { const id = el.dataset.id; S.settings.locks[id] = !S.settings.locks[id]; persist('settings'); render(); },
  appliance(el) {
    const id = el.dataset.id;
    const next = { ...S.settings.appliances, [id]: !S.settings.appliances[id] };
    if (!Object.values(next).some(Boolean)) { toast('Keep at least one appliance on'); return; }
    S.settings.appliances = next; persist('settings'); render();
  },
  unblock(el) { S.settings.blocklist.splice(Number(el.dataset.i), 1); persist('settings'); render(); },
  delPantry(el) {
    const id = el.dataset.id;
    const prev = { list: S.customPantry, on: S.settings.pantry[id] };
    const item = S.customPantry.find((x) => x.id === id);
    S.customPantry = S.customPantry.filter((x) => x.id !== id);
    delete S.settings.pantry[id];
    syncCustom(); persist('customPantry', 'settings'); render();
    toast(`Removed ${item ? item.name : 'staple'}`, () => { S.customPantry = prev.list; S.settings.pantry[id] = prev.on; syncCustom(); persist('customPantry', 'settings'); render(); });
  },
  export() {
    const data = Object.fromEntries(PERSISTED.map((k) => [k, S[k]]));
    const blob = new Blob([JSON.stringify({ app: 'mise', version: 1, exported: new Date().toISOString(), data }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mise-backup-${E.dayKey(new Date())}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  async reset() {
    if (!confirm('Reset everything? This deletes your logs, weights and settings on this device.')) return;
    await store.clearAll();
    S = E.defaultUserData();
    E.setDraftRecipe(null);
    syncCustom();
    render();
    toast('All data reset');
  },

  // Detail
  closeSheet() { closeDetail(); },
  serv(el) {
    const d = UI.detail;
    d.servings = Math.min(21, Math.max(1, d.servings + Number(el.dataset.d)));
    if (d.context === 'quick' && !isDraft(d.id)) { prefs(d.id).servings = d.servings; persist('recipePrefs'); }
    renderDetail();
  },
  swap(el) { prefs(UI.detail.id).swaps[el.dataset.from] = el.dataset.key; persist('recipePrefs'); renderDetail(); },
  unswap(el) { delete prefs(UI.detail.id).swaps[el.dataset.from]; persist('recipePrefs'); renderDetail(); },
  problem(el) { UI.detail.problem = UI.detail.problem === el.dataset.v ? null : el.dataset.v; renderDetail(); },
  sauceMode(el) { UI.detail.sauceMode = el.dataset.v; renderDetail(); },
  sauceServ(el) {
    const d = UI.detail;
    d.sauceServings = Math.max(1, (d.sauceServings || d.servings) + Number(el.dataset.d));
    renderDetail();
  },
  ateThis() {
    const d = UI.detail;
    logRecipe(d.id);
  },
  // 7-day planner
  wBreakfast(el) { S.cart.week.breakfastVariety = Number(el.dataset.v); persist('cart'); render(); },
  wMode(el) { S.cart.week.mainMode = el.dataset.v; persist('cart'); render(); },
  wDishes(el) { S.cart.week.dishesPerSlot = Number(el.dataset.v); persist('cart'); render(); },
  wCuisine(el) {
    const next = toggleIn(S.cart.week.cuisines, el.dataset.v);
    if (!next.length) { toast('Keep at least one cuisine'); return; }
    S.cart.week.cuisines = E.listBatchCuisines().filter((c) => next.includes(c));
    persist('cart'); render();
  },
  genWeek() { buildWeek(false); },
  shuffleWeek() { buildWeek(true); },
  clearCart() {
    const prev = JSON.parse(JSON.stringify(S.cart));
    S.cart = { ...S.cart, blocks: [], proteinGrams: {}, eaten: [], eatenLog: {}, bought: [], genWarnings: [], genFrom: null };
    persist('cart'); render();
    toast('Plan cleared', () => { S.cart = prev; persist('cart'); render(); });
  },
  raw(el) { S.cart.rawPerServing = Math.min(220, Math.max(100, S.cart.rawPerServing + 5 * Number(el.dataset.d))); persist('cart'); render(); },
  method(el) { S.cart.method = el.dataset.v; persist('cart'); render(); },
  eatBox(el) {
    const id = el.dataset.id;
    S.cart.eatenLog = S.cart.eatenLog || {};
    if (S.cart.eaten.includes(id)) {
      const ref = S.cart.eatenLog[id];
      if (ref) S.mealLogs = E.removeMealLog(S.mealLogs, ref.key, ref.entryId);
      S.cart.eaten = S.cart.eaten.filter((x) => x !== id);
      delete S.cart.eatenLog[id];
      persist('cart', 'mealLogs'); render();
      toast('Unmarked and removed from today\'s log');
      return;
    }
    const c = E.planCart(S.cart, S.settings, S.recipePrefs).containers.find((x) => x.id === id);
    if (!c) return;
    const key = E.dayKey(new Date());
    const entry = E.makeMealEntry({ name: `${c.name} · Day ${c.day} ${c.slot.toLowerCase()}`, ...c.macros, source: 'batch' });
    S.mealLogs = E.addMealLog(S.mealLogs, key, entry);
    S.cart.eaten.push(id);
    S.cart.eatenLog[id] = { key, entryId: entry.id };
    persist('cart', 'mealLogs'); render();
    toast(`Logged ${entry.p} g protein · ${r0(entry.kcal)} kcal`, () => {
      S.mealLogs = E.removeMealLog(S.mealLogs, key, entry.id);
      S.cart.eaten = S.cart.eaten.filter((x) => x !== id);
      delete S.cart.eatenLog[id];
      persist('cart', 'mealLogs'); render();
    });
  },
  buy(el) { S.cart.bought = toggleIn(S.cart.bought, el.dataset.id); persist('cart'); render(); },
  async copyGrocery() {
    const plan = E.planCart(S.cart, S.settings, S.recipePrefs);
    const ok = await copyText(`Mise shopping list (${plan.totals.containers} meals)\n\n${E.groceryText(plan.grocery)}`);
    toast(ok ? 'Shopping list copied' : 'Copy failed. Long-press to select instead.');
  },

  // AI Chef Bridge
  async copyPrompt(el) {
    const mode = el.dataset.v === 'batch' ? 'batch' : 'recipe';
    const prompt = E.buildChefPrompt({ mode, settings: S.settings, fridge: S.fridge, targets: S.targets, cart: S.cart });
    const ok = await copyText(prompt);
    toast(ok ? 'Prompt copied. Paste it into your AI chat.' : 'Copy failed on this device');
  },
  openImport() { openModal('import'); },
  closeImport() { closeImport(); },
  async pasteImport() {
    try {
      UI.importText = await navigator.clipboard.readText();
      UI.importResult = E.parseImport(UI.importText);
      renderModal();
    } catch {
      toast('Paste blocked. Long-press the box and choose Paste.');
    }
  },
  async copyTemplate(el) {
    const t = E.importTemplates()[el.dataset.v];
    const ok = await copyText(JSON.stringify(t, null, 2));
    toast(ok ? 'Template copied' : 'Copy failed');
  },
  checkImport() { UI.importResult = E.parseImport(UI.importText); renderModal(); },
  importReplace() { UI.importReplace = !UI.importReplace; renderModal(); },
  saveImport() {
    const r = UI.importResult || E.parseImport(UI.importText);
    if (r.errors.length) { UI.importResult = r; renderModal(); return; }
    const names = new Set(r.recipes.map((x) => x.name.toLowerCase()));
    if (r.recipes.length) {
      S.customRecipes = [...S.customRecipes.filter((x) => !names.has(x.name.toLowerCase())), ...r.recipes];
      syncCustom();
    }
    let blocks = 0;
    if (r.plan && r.plan.blocks.length) {
      S.cart.blocks = UI.importReplace ? r.plan.blocks : [...S.cart.blocks, ...r.plan.blocks];
      S.cart.genWarnings = [];
      S.cart.genFrom = null;
      S.cart.proteinGrams = UI.importReplace ? r.plan.proteinGrams : { ...S.cart.proteinGrams, ...r.plan.proteinGrams };
      if (r.plan.rawPerServing) S.cart.rawPerServing = Math.round(r.plan.rawPerServing);
      blocks = r.plan.blocks.length;
    }
    persist('customRecipes', 'cart');
    UI.importText = '';
    UI.importResult = null;
    closeImport();
    if (blocks) UI.tab = 'batch';
    render();
    toast(`Imported ${[r.recipes.length && `${r.recipes.length} recipe${r.recipes.length > 1 ? 's' : ''}`, blocks && `${blocks} meal block${blocks > 1 ? 's' : ''}`].filter(Boolean).join(' + ')}`);
  },
  openCustom(el) { openDetail(el.dataset.id, { context: 'quick' }); },
  delCustom(el) {
    const r = S.customRecipes.find((x) => x.id === el.dataset.id);
    if (!r || !confirm(`Delete "${r.name}"?`)) return;
    S.customRecipes = S.customRecipes.filter((x) => x.id !== r.id);
    syncCustom();
    persist('customRecipes'); render();
  },

  undo() {
    if (UI.undo) UI.undo();
    UI.undo = null;
    $('#toast').classList.remove('show');
  },
};

const forms = {
  custom(fd) {
    const txt = String(fd.get('item') || '').trim();
    if (!txt) return;
    const id = E.findIngredientByName(txt, ['fresh', 'leftover', 'pantry']);
    if (id && INGREDIENTS[id].cat === 'fresh') {
      if (!S.fridge.selected.includes(id)) S.fridge.selected.push(id);
      toast(`Added ${name(id)}`);
    } else if (id && INGREDIENTS[id].cat === 'leftover') {
      if (!S.fridge.leftovers.includes(id)) S.fridge.leftovers.push(id);
      toast(`Added ${name(id)} (Leftover Remixer)`);
    } else if (id && INGREDIENTS[id].cat === 'pantry') {
      S.settings.pantry[id] = true; persist('settings');
      toast(`${name(id)} is a pantry staple and is now switched on`);
    } else if (!S.fridge.custom.some((c) => c.toLowerCase() === txt.toLowerCase())) {
      S.fridge.custom.push(txt);
    }
    persist('fridge'); render();
  },
  pantryAdd(fd) {
    const res = E.customPantryItem(fd.get('item'), S.customPantry);
    if (res.error) { toast(res.error); return; }
    if (res.knownId) {
      if (res.cat === 'pantry') { S.settings.pantry[res.knownId] = true; persist('settings'); toast(`${name(res.knownId)} is already a staple. It's switched on.`); }
      else toast(`${name(res.knownId)} is a fridge item. Select it in Quick Cook instead.`);
      render(); return;
    }
    if (res.duplicate) { S.settings.pantry[res.duplicate] = true; persist('settings'); render(); toast('Already in My staples. It\'s switched on.'); return; }
    S.customPantry = [...S.customPantry, res.item];
    S.settings.pantry[res.item.id] = true;
    syncCustom(); persist('customPantry', 'settings'); render();
    toast(`Added ${res.item.name} to your pantry`);
    const input = document.querySelector('[data-form="pantryAdd"] input');
    if (input) input.focus();
  },
  block(fd) {
    const term = String(fd.get('term') || '').trim().toLowerCase();
    if (!term || S.settings.blocklist.includes(term)) return;
    S.settings.blocklist.push(term); persist('settings'); render();
  },
  targets(fd) {
    const p = Number(fd.get('protein'));
    const k = Number(fd.get('calories'));
    if (p > 0) S.targets.protein = Math.round(p);
    if (k > 0) S.targets.calories = Math.round(k);
    UI.editTargets = false; persist('targets'); render();
  },
  meal(fd) {
    const p = fd.get('p'); const c = fd.get('c'); const f = fd.get('f'); const kcal = fd.get('kcal');
    if (!p && !kcal && !c && !f) { toast('Enter protein or calories'); return; }
    logMeal(E.makeMealEntry({ name: fd.get('name') || 'Quick entry', p, c, f, kcal: kcal || undefined, source: 'manual' }), UI.logDate);
    render();
  },
  weight(fd) {
    const date = fd.get('date') || E.dayKey(new Date());
    const entry = { date, kg: fd.get('kg'), chest: fd.get('chest'), waist: fd.get('waist'), hip: fd.get('hip') };
    if (![entry.kg, entry.chest, entry.waist, entry.hip].some((v) => v)) { toast('Enter a weight or a measurement'); return; }
    S.weightLogs = E.addWeightLog(S.weightLogs, entry);
    persist('weightLogs'); render();
    toast('Saved');
  },
};

const changes = {
  wProtein(el) { S.cart.week.protein = el.value; persist('cart'); render(); },
  blockChoice(el) { const b = S.cart.blocks.find((x) => x.id === el.dataset.id); if (b) { b.choice = el.value; persist('cart'); render(); } },
  blockProtein(el) { const b = S.cart.blocks.find((x) => x.id === el.dataset.id); if (b) { b.protein = el.value; persist('cart'); render(); } },
  sauce(el) { UI.detail.sauceId = el.value; renderDetail(); },
  sauceTotal(el) { UI.detail.sauceTotal = Math.max(1, Number(el.value) || 1); renderDetail(); },
  import(el) {
    const file = el.files && el.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);
        S = E.mergeUserData(parsed.data || parsed);
        syncCustom();
        await store.saveAll(S);
        render();
        toast('Backup imported');
      } catch {
        toast('That file isn\'t a valid backup');
      }
    };
    reader.readAsText(file);
  },
};

function bind() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('article[data-act]')) { e.preventDefault(); e.target.click(); }
    if (e.key === 'Escape' && !$('#modal').hidden) closeImport();
    else if (e.key === 'Escape' && UI.detail) closeDetail();
  });
  document.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-form]');
    if (!form) return;
    e.preventDefault();
    const fn = forms[form.dataset.form];
    if (fn) fn(new FormData(form));
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change]');
    if (el && changes[el.dataset.change]) changes[el.dataset.change](el);
  });
  const draftInput = (e) => {
    const t = e.target;
    if (!t.matches) return;
    if (t.matches('[data-input="importText"]')) UI.importText = t.value;
    if (!UI.draft) return;
    if (t.matches('[data-draft]')) UI.draft[t.dataset.draft] = t.value;
    if (t.matches('[data-draft-ing]')) { const row = UI.draft.ings[Number(t.dataset.draftIng)]; if (row) row[t.dataset.k] = t.value; }
  };
  document.addEventListener('input', draftInput);
  document.addEventListener('change', draftInput);
  document.addEventListener('toggle', (e) => {
    if (e.target.matches && e.target.matches('[data-toggle="ai"]')) UI.aiOpen = e.target.open;
  }, true);
  // Write pending changes before iOS suspends the web app.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') store.flush((k) => S[k]);
  });
  window.addEventListener('pagehide', () => store.flush((k) => S[k]));
}

async function init() {
  const stored = await store.loadAll();
  S = E.mergeUserData(stored);
  syncCustom();
  bind();
  render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
