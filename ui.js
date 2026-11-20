// ui.js — connects engine.js (logic) and storage.js (persistence) to the DOM.
// Everything DOM-related lives here; port this file to React Native components later.

import * as E from './engine.js';
import { createStore } from './storage.js';
import { APPLIANCES, LOCKS, INGREDIENT_GROUPS, INGREDIENTS, QUICK_ADDS } from './recipes.js';

const store = createStore();
const PERSISTED = ['settings', 'targets', 'mealLogs', 'weightLogs', 'fridge', 'batch', 'recipePrefs', 'cart', 'customRecipes'];

let S = E.defaultUserData(); // persisted user data
const UI = {
  tab: 'quick',
  logDate: E.dayKey(new Date()),
  detail: null, // { id, context, servings, problem, sauceId, sauceMode, sauceServings, sauceTotal }
  editTargets: false,
  weightMetric: 'kg',
  showMeasure: false,
  undo: null,
  pfOpen: false,
  importText: '',
  importResult: null,
  importReplace: false,
};

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
  h += aiCard('recipe');
  return h;
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
// TAB 2 — BATCH CART & MASTER PROTEIN BUILDER
// ------------------------------------------------------------------------------------------
const SLOT_ICON = { Breakfast: '☀️', Lunch: '🥗', Dinner: '🌙' };

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
  const plan = E.planCart(S.cart, S.settings, S.recipePrefs);
  let h = `<p class="lede">Build the week from <b>meal blocks</b>. Lunches and dinners that share a protein are cooked <b>once</b>, neutrally, then each block gets its own cuisine <b>Flavor Kit</b>.</p>`;
  h += builderCard();
  h += proteinFirstCard();
  h += cartCard(plan);
  if (plan.containers.length) {
    const tl = plan.timeline;
    h += `<div class="tiles">
      <div class="tile"><b>${plan.totals.containers}</b><span>Boxes</span></div>
      <div class="tile"><b>${plan.totals.days}</b><span>Days</span></div>
      <div class="tile tile-p"><b>${Math.round(plan.totals.avgProtein)}<small>g</small></b><span>Avg P / box</span></div>
      <div class="tile"><b>${tl ? E.formatMinutes(tl.makespan).replace(' min', 'm') : '—'}</b><span>Prep session</span></div>
    </div>`;
    h += mastersCard(plan);
    h += containersCard(plan);
    h += groceryCard(plan);
    if (tl) h += timelineCard(tl);
  }
  h += aiCard('batch');
  return h;
}

function builderCard() {
  const b = S.cart.builder;
  const proteins = E.masterProteins(S.settings);
  if (b.slot !== 'Breakfast' && !proteins.includes(b.protein)) b.protein = proteins[0];
  return `<section class="card">
    <div class="card-head"><h2>Add a meal block</h2><span class="hint">Count · Slot · Cuisine</span></div>
    <div class="builder-row">
      <div><h3 class="label">Count</h3>${stepperHTML('bCount', b.count, { min: b.count <= 1, max: b.count >= 10 })}</div>
      <div class="grow"><h3 class="label">Meal slot</h3>${seg('bSlot', E.listMealSlots().map((s) => [s, s]), b.slot)}</div>
    </div>
    <div><h3 class="label">Cuisine</h3>
    <div class="chips">${E.listBatchCuisines().map((cu) => `<button type="button" class="chip ${b.cuisine === cu ? 'on' : ''}" data-act="bCuisine" data-v="${esc(cu)}">${esc(cu)}</button>`).join('')}</div></div>
    ${b.slot !== 'Breakfast' ? `<label class="field"><span class="label">Protein (pooled into one master cook)</span><select data-change="bProtein">${proteins.map((p) => `<option value="${p}" ${p === b.protein ? 'selected' : ''}>${esc(name(p))}</option>`).join('')}</select></label>` : '<p class="micro">Breakfast blocks use a self-contained breakfast base, such as baked tortilla squares or egg bites.</p>'}
    <button type="button" class="btn btn-primary" data-act="addBlock">${I.plus}Add ${b.count} × ${esc(b.slot)} (${esc(b.cuisine)})</button>
  </section>`;
}

function proteinFirstCard() {
  const pf = S.cart.pf;
  const proteins = E.masterProteins(S.settings);
  if (!proteins.includes(pf.protein)) pf.protein = proteins[0];
  const y = E.proteinYield(pf.grams);
  const counts = E.distributeCount(y.best, pf.cuisines.length || 1);
  const preview = pf.cuisines.length ? pf.cuisines.map((c, i) => `${counts[i]} ${c}`).filter((s) => !s.startsWith('0 ')).join(' + ') : `${y.best} Quick High-Protein`;
  return `<details class="card pf" data-toggle="pf" ${UI.pfOpen ? 'open' : ''}>
    <summary><span class="pf-title"><h2>Protein-First</h2><span class="hint">Start from what you bought</span></span></summary>
    <div class="pf-body">
      <div class="form-grid">
        <label>Protein<select data-change="pfProtein">${proteins.map((p) => `<option value="${p}" ${p === pf.protein ? 'selected' : ''}>${esc(name(p))}</option>`).join('')}</select></label>
        <label>Raw weight (g)<input type="number" inputmode="numeric" min="100" step="50" value="${pf.grams}" data-change="pfGrams"></label>
      </div>
      <div class="yield"><b>${y.best} portions</b><small>${y.low}–${y.high} portions at 140–150 g raw · ${Math.round(y.perServing)} g raw each</small></div>
      <div><h3 class="label">Slot</h3>${seg('pfSlot', [['Lunch', 'Lunch'], ['Dinner', 'Dinner']], pf.slot)}</div>
      <div><h3 class="label">Spread across cuisines</h3>
      <div class="chips">${E.listBatchCuisines().map((cu) => `<button type="button" class="chip ${pf.cuisines.includes(cu) ? 'on' : ''}" data-act="pfCuisine" data-v="${esc(cu)}">${esc(cu)}</button>`).join('')}</div></div>
      <button type="button" class="btn btn-primary" data-act="pfGo" ${y.best ? '' : 'disabled'}>Add ${esc(preview)}</button>
    </div>
  </details>`;
}

function cartCard(plan) {
  const c = S.cart;
  if (!c.blocks.length) {
    return `<section class="card"><div class="card-head"><h2>Your batch cart</h2></div>
      <div class="empty small">Empty. Add a block above, for example <b>3 × Lunch (Japanese)</b> + <b>2 × Dinner (Turkish)</b> + <b>4 × Breakfast (Spanish)</b>.</div></section>`;
  }
  const byId = Object.fromEntries(plan.blocks.map((b) => [b.id, b]));
  const proteins = E.masterProteins(S.settings);
  const methods = E.masterMethodOptions(S.settings);
  let h = `<section class="card"><div class="card-head"><h2>Your batch cart</h2><button type="button" class="link" data-act="clearCart">Clear</button></div>`;
  h += c.blocks.map((b) => {
    const pb = byId[b.id];
    const head = (emoji, count) => `<div class="br-head"><span class="br-emoji">${emoji}</span><span class="br-title"><b>${count} × ${esc(b.slot)}</b><small>${SLOT_ICON[b.slot]} ${esc(b.cuisine)}</small></span>
      <button type="button" class="icon-btn subtle" data-act="removeBlock" data-id="${b.id}" aria-label="Remove block">${I.trash}</button></div>`;
    if (!pb) return `<div class="block-row muted">${head('⚠️', b.count)}<p class="micro">No option fits your rules, so this block is skipped.</p></div>`;
    const tmpl = pb.options.filter((o) => o.kind !== 'recipe');
    const recs = pb.options.filter((o) => o.kind === 'recipe');
    const opt = (o) => `<option value="${esc(o.key)}" ${o.key === pb.choice ? 'selected' : ''}>${esc(o.label)}${o.storage ? ` · ${E.getStorageTag(o.storage).label}` : ''}${o.custom ? ' · imported' : ''}</option>`;
    return `<div class="block-row">
      ${head(pb.emoji, pb.count)}
      <select data-change="blockChoice" data-id="${b.id}" aria-label="Flavor kit or recipe">
        <optgroup label="${b.slot === 'Breakfast' ? 'Breakfast bases' : 'Flavor kits + master protein'}">${tmpl.map(opt).join('')}</optgroup>
        ${recs.length ? `<optgroup label="Full recipes">${recs.map(opt).join('')}</optgroup>` : ''}
      </select>
      ${pb.kind === 'kit' ? `<select data-change="blockProtein" data-id="${b.id}" aria-label="Protein">${proteins.map((p) => `<option value="${p}" ${p === pb.protein ? 'selected' : ''}>${esc(name(p))}</option>`).join('')}</select>` : ''}
      <div class="br-foot"><span class="br-meta">${macroLine(pb.macros)}${storageBadge(pb.storage)}</span>${stepperHTML('blockCount', pb.count, { min: pb.count <= 1, max: pb.count >= 10, id: b.id })}</div>
    </div>`;
  }).join('');
  h += `<div class="cart-settings">
    <div class="row-between"><div><h3 class="label">Raw protein per serving</h3><small class="micro">Proteins with Protein-First grams use those instead</small></div>
      ${stepperHTML('raw', `${c.rawPerServing} g`, { min: c.rawPerServing <= 100, max: c.rawPerServing >= 220 })}</div>
    <div><h3 class="label">Master cook method</h3>${seg('method', [['auto', 'Auto'], ...methods.map((m) => [m.id, m.label])], c.method)}</div>
  </div>`;
  if (plan.warnings.length) h += `<div class="alert"><div class="alert-head">${I.warn}<b>Heads up</b></div><ul>${plan.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>`;
  return `${h}</section>`;
}

function mastersCard(plan) {
  let h = `<section class="card"><div class="card-head"><h2>Master cooks & flavor kits</h2><span class="hint">Cook once, flavor many</span></div>`;
  h += plan.masters.map((m) => `<div class="master">
    <span class="master-emoji">${m.emoji}</span>
    <div class="master-body">
      <b>${esc(E.formatAmount(m.protein, m.rawTotal))} ${esc(short(m.protein))} → ${m.count} portion${m.count > 1 ? 's' : ''}</b>
      <small>${Math.round(m.rawPerServing)} g raw · ≈${Math.round(m.cookedPerServing)} g cooked per box · ${APP_LABEL[m.app]} (${esc(m.methodLabel)})</small>
      <small>Neutral seasoning: ${esc(m.seasoning.filter((e) => e.id !== 'chicken_broth').map((e) => `${E.formatAmount(e.id, e.g)} ${short(e.id)}`).join(', '))}</small>
      <p class="micro">${esc(m.tip)}</p>
      ${m.fromGrams ? `<button type="button" class="link small left" data-act="clearPG" data-id="${m.protein}">Using Protein-First grams · switch to ${S.cart.rawPerServing} g per serving</button>` : ''}
    </div></div>`).join('');
  if (plan.kits.length) {
    h += `<h3 class="label">Kits & bases</h3><ul class="kits">${plan.kits.map((k) => `<li>
      <span class="kit-emoji">${k.emoji}</span>
      <div><b>${esc(k.name)}</b> <small>× ${k.count}</small><div class="box-tags">${storageBadge(k.storage)}${k.saucePerBox && k.storage ? `<small>${Math.round(k.saucePerBox)} g ${esc(k.sauceName)} per box</small>` : ''}</div></div>
    </li>`).join('')}</ul>`;
  }
  h += `<div class="legend-tags">
    <p>${storageBadge('freeze-with')} ${esc(E.getStorageTag('freeze-with').text)}</p>
    <p>${storageBadge('spoon-after')} ${esc(E.getStorageTag('spoon-after').text)}</p>
  </div>`;
  return `${h}</section>`;
}

function containersCard(plan) {
  const days = {};
  plan.containers.forEach((c) => { (days[c.day] = days[c.day] || []).push(c); });
  let h = `<section class="card"><div class="card-head"><h2>Containers</h2><span class="hint">${plan.totals.fridge} fridge · ${plan.totals.freezer} freezer</span></div>
    <p class="micro">Days 1–4 go in the <b>fridge</b>, Day 5 onwards in the <b>freezer</b>. Each slot counts its own days, so Day 3 = 3rd breakfast, 3rd lunch and 3rd dinner.</p>`;
  Object.keys(days).map(Number).sort((a, b) => a - b).forEach((d) => {
    const where = d <= 4 ? 'fridge' : 'freezer';
    h += `<div class="day-group"><div class="dg-head"><b>Day ${d}</b>${where === 'fridge' ? `<span class="badge badge-fridge">${I.fridge}Fridge · Days 1–4</span>` : `<span class="badge badge-ice">${I.snow}Freezer · Day 5+</span>`}</div>
      ${days[d].map(containerRow).join('')}</div>`;
  });
  return `${h}</section>`;
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
        <small>${esc(c.subtitle)}</small>
        ${macroLine(c.macros)}
        <div class="box-tags">${whereBadge(c.where)}${storageBadge(c.storage)}</div>
      </div>
      <button type="button" class="btn btn-sm ${eaten ? 'btn-soft' : 'btn-primary'} box-btn" data-act="eatBox" data-id="${esc(c.id)}">${eaten ? `${I.check}Eaten` : 'I Ate This'}</button>
    </div>
    <details class="box-more"><summary>Reheat & packing</summary><ul>${c.reheat.map((r) => `<li>${esc(r)}</li>`).join('')}${sauce}</ul></details>
  </div>`;
}

function groceryCard(plan) {
  const bought = new Set(S.cart.bought);
  return `<section class="card"><div class="card-head"><h2>Shopping list</h2><button type="button" class="link" data-act="copyGrocery">Copy</button></div>
    <p class="micro">Raw amounts summed across all ${plan.totals.containers} boxes: proteins, eggs, carbs, vegetables and every sauce ingredient. Tap to tick off.</p>
    ${plan.grocery.map((grp) => `<div><h3 class="label">${esc(grp.group)}</h3><ul class="grocery">${grp.items.map((i) => `<li><button type="button" class="gitem ${bought.has(i.id) ? 'done' : ''}" data-act="buy" data-id="${i.id}" aria-pressed="${bought.has(i.id)}">
      <span class="gcheck">${bought.has(i.id) ? I.check : ''}</span><span class="gname">${esc(name(i.id))}${i.inPantry ? ' <small>pantry</small>' : ''}</span><span class="gamt">${esc(i.amount)}</span></button></li>`).join('')}</ul></div>`).join('')}
  </section>`;
}

function timelineCard(tl) {
  const jobs = [];
  tl.tasks.forEach((t) => { if (!jobs[t.job]) jobs[t.job] = `${t.emoji} ${t.recipeName}`; });
  return `<section class="card">
    <div class="card-head"><h2>Parallel cooking timeline</h2><span class="hint">Instant Pot · Air Fryer · Stovetop</span></div>
    <div class="tiles tiles-3">
      <div class="tile"><b>${E.formatMinutes(tl.makespan)}</b><span>Whole session</span></div>
      <div class="tile"><b>${E.formatMinutes(tl.activeTotal)}</b><span>Hands-on</span></div>
      <div class="tile tile-p"><b>${E.formatMinutes(tl.saved)}</b><span>Saved vs. one by one</span></div>
    </div>
    <div class="chips">${jobs.map((j, i) => (j ? `<span class="pill session-pill ${SESSION_COLORS[i % 5]}"><span class="dot"></span><span class="pill-name">${esc(j)}</span></span>` : '')).join('')}</div>
    ${gantt(tl, jobs)}
    <ol class="timeline">${tl.tasks.map((t) => `
      <li class="${SESSION_COLORS[t.job % 5]}">
        <time>${E.clockLabel(t.start)}</time>
        <div class="tl-body">
          <div class="tl-head"><span class="dot"></span><b>${t.emoji} ${esc(t.recipeName)}</b><span class="app app-${t.app}">${APP_ICON[t.app]}${APP_LABEL[t.app]}</span></div>
          <p>${segmentsHTML(t.segments)}</p>
          <small>${t.a ? `${t.a} min hands-on` : ''}${t.a && t.p ? ' · ' : ''}${t.p ? `then ${t.p} min hands-off` : ''}${t.rounds > 1 ? ` · ${t.rounds} rounds` : ''}${t.adaptedFrom ? ` · adapted from ${APP_LABEL[t.adaptedFrom]}` : ''}</small>
        </div>
      </li>`).join('')}
      <li class="done"><time>${E.clockLabel(tl.makespan)}</time><div class="tl-body"><b>Pack.</b> Days 1–4 go in the fridge and Day 5+ in the freezer. Spoon-After sauces go in small separate pots.</div></li>
    </ol>
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
// AI CHEF BRIDGE (Tabs 1, 2, 4) + import modal
// ------------------------------------------------------------------------------------------
function aiCard(mode) {
  const both = mode === 'rules';
  const text = mode === 'batch'
    ? 'Copies your cart, protein grams, locks, appliances, pantry and macro targets, plus a strict JSON reply format.'
    : 'Copies your fridge, Use First items, pantry staples, locks, appliances and daily macro targets, plus a strict JSON reply format.';
  return `<section class="card ai-card">
    <div class="card-head"><h2>${I.spark} AI Chef Bridge</h2><span class="hint">Prompt out · JSON in</span></div>
    <p class="micro">${both ? 'Send your rules and kitchen to any AI chat, then import the recipe or batch plan JSON it replies with.' : text} Paste it into any AI chat, then import its reply here.</p>
    <div class="btn-row">
      ${both
        ? `<button type="button" class="btn btn-soft" data-act="copyPrompt" data-v="recipe">${I.copy}Recipe prompt</button><button type="button" class="btn btn-soft" data-act="copyPrompt" data-v="batch">${I.copy}Batch prompt</button>`
        : `<button type="button" class="btn btn-soft" data-act="copyPrompt" data-v="${mode}">${I.copy}Copy Prompt for AI Chef</button>`}
      <button type="button" class="btn btn-primary" data-act="openImport">${I.download}Import JSON</button>
    </div>
  </section>`;
}

function renderModal() {
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
      <button type="button" class="switch-row" role="switch" aria-checked="${UI.importReplace}" data-act="importReplace"><span class="sr-text"><b>Replace my current cart</b><small>Off = add these blocks to it</small></span><span class="switch ${UI.importReplace ? 'on' : ''}"><span></span></span></button>`;
    }
    if (r.warnings.length) preview += `<details class="more inset"><summary>${I.warn} ${r.warnings.length} note${r.warnings.length > 1 ? 's' : ''}</summary><ul class="plain">${r.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></details>`;
  }
  const canSave = r && !r.errors.length && (r.recipes.length || (r.plan && r.plan.blocks.length));
  $('#modalBody').innerHTML = `
    <header class="modal-head"><h2>Import recipe / batch plan</h2><button type="button" class="icon-btn" data-act="closeImport" aria-label="Close">${I.close}</button></header>
    <div class="modal-scroll">
      <p class="micro">Paste the JSON your AI chef replied with. Code fences and chatty text around it are fine. Unknown ingredients are added with the macros the AI provided.</p>
      <textarea data-input="importText" rows="9" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder='{ "type": "recipe", "name": "…", "ingredients": [ … ], "steps": [ … ] }'>${esc(UI.importText)}</textarea>
      <div class="btn-row">
        <button type="button" class="btn btn-soft btn-sm" data-act="pasteImport">Paste</button>
        <button type="button" class="btn btn-soft btn-sm" data-act="copyTemplate" data-v="recipe">Recipe template</button>
        <button type="button" class="btn btn-soft btn-sm" data-act="copyTemplate" data-v="batchPlan">Batch template</button>
      </div>
      <button type="button" class="btn btn-soft" data-act="checkImport">Check JSON</button>
      ${preview}
    </div>
    <footer class="modal-foot"><button type="button" class="btn btn-primary btn-lg" data-act="saveImport" ${canSave ? '' : 'disabled'}>${I.check}Save to my app</button></footer>`;
}

function openImport() {
  UI.importResult = UI.importText ? E.parseImport(UI.importText) : null;
  renderModal();
  const m = $('#modal');
  m.hidden = false;
  requestAnimationFrame(() => { m.classList.add('open'); document.documentElement.classList.add('sheet-open'); });
}

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

  h += aiCard('rules');
  const customs = S.customRecipes;
  h += `<section class="card">
    <div class="card-head"><h2>Imported recipes</h2><span class="hint">${customs.length}</span></div>
    ${customs.length ? `<ul class="log">${customs.map((r) => {
      const chk = E.importCheck(r, st);
      return `<li><div><b>${r.emoji} ${esc(r.name)}</b><small>${esc(r.cuisine)}${r.slot ? ` · ${r.slot}` : ''} · ${r.servings} servings${chk.hidden ? ' · hidden by your rules' : ''}</small></div>
        <button type="button" class="btn btn-soft btn-sm" data-act="openCustom" data-id="${esc(r.id)}">Open</button>
        <button type="button" class="icon-btn subtle" data-act="delCustom" data-id="${esc(r.id)}" aria-label="Delete">${I.trash}</button></li>`;
    }).join('')}</ul>` : '<div class="empty small">Recipes you import from your AI chef show up here, in Quick Cook, and as full-recipe options in Batch Prep.</div>'}
  </section>`;

  h += `<section class="card">
    <div class="card-head"><h2>Your data</h2><span class="hint">Saved on this device</span></div>
    <div class="btn-row">
      <button type="button" class="btn btn-soft" data-act="export">Export backup</button>
      <label class="btn btn-soft">Import<input type="file" accept="application/json,.json" data-change="import" hidden></label>
      <button type="button" class="btn btn-danger" data-act="reset">Reset</button>
    </div>
  </section>`;
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
    <div class="meta center"><span>${esc(res.moods.join(' · '))}</span></div>
  </div>
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
  batch: { title: 'Batch Cart', sub: 'Master proteins, flavor kits and any mix of days', render: renderBatch },
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
    E.setCustomData([]);
    render();
    toast('All data reset');
  },

  // Detail
  closeSheet() { closeDetail(); },
  serv(el) {
    const d = UI.detail;
    d.servings = Math.min(21, Math.max(1, d.servings + Number(el.dataset.d)));
    if (d.context === 'quick') { prefs(d.id).servings = d.servings; persist('recipePrefs'); }
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
  // Batch cart
  bCount(el) { const b = S.cart.builder; b.count = Math.min(10, Math.max(1, b.count + Number(el.dataset.d))); persist('cart'); render(); },
  bSlot(el) { S.cart.builder.slot = el.dataset.v; persist('cart'); render(); },
  bCuisine(el) { S.cart.builder.cuisine = el.dataset.v; persist('cart'); render(); },
  addBlock() {
    const b = S.cart.builder;
    const block = E.makeBlock(b, S.settings);
    if (!block.choice) { toast(`No ${b.slot.toLowerCase()} option for ${b.cuisine} fits your rules`); return; }
    S.cart.blocks.push(block);
    persist('cart'); render();
    toast(`Added ${b.count} × ${b.slot} (${b.cuisine})`, () => { S.cart.blocks = S.cart.blocks.filter((x) => x.id !== block.id); persist('cart'); render(); });
  },
  pfSlot(el) { S.cart.pf.slot = el.dataset.v; persist('cart'); render(); },
  pfCuisine(el) { S.cart.pf.cuisines = toggleIn(S.cart.pf.cuisines, el.dataset.v); persist('cart'); render(); },
  pfGo() {
    const pf = S.cart.pf;
    const { blocks, yield: y } = E.proteinFirstBlocks(pf, S.settings);
    if (!blocks.length) return;
    const prev = JSON.parse(JSON.stringify(S.cart));
    S.cart.blocks.push(...blocks);
    S.cart.proteinGrams = { ...S.cart.proteinGrams, [pf.protein]: Number(pf.grams) };
    persist('cart'); render();
    toast(`${pf.grams} g ${short(pf.protein)} → ${y.best} portions added`, () => { S.cart = prev; persist('cart'); render(); });
  },
  clearPG(el) { const pg = { ...S.cart.proteinGrams }; delete pg[el.dataset.id]; S.cart.proteinGrams = pg; persist('cart'); render(); },
  blockCount(el) {
    const b = S.cart.blocks.find((x) => x.id === el.dataset.id);
    if (!b) return;
    b.count = Math.min(10, Math.max(1, b.count + Number(el.dataset.d)));
    persist('cart'); render();
  },
  removeBlock(el) {
    const prev = S.cart.blocks;
    S.cart.blocks = prev.filter((x) => x.id !== el.dataset.id);
    persist('cart'); render();
    toast('Block removed', () => { S.cart.blocks = prev; persist('cart'); render(); });
  },
  clearCart() {
    const prev = JSON.parse(JSON.stringify(S.cart));
    S.cart = { ...S.cart, blocks: [], proteinGrams: {}, eaten: [], eatenLog: {}, bought: [] };
    persist('cart'); render();
    toast('Cart cleared', () => { S.cart = prev; persist('cart'); render(); });
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
    const ok = await copyText(`Mise shopping list (${plan.totals.containers} boxes)\n\n${E.groceryText(plan.grocery)}`);
    toast(ok ? 'Shopping list copied' : 'Copy failed. Long-press to select instead.');
  },

  // AI Chef Bridge
  async copyPrompt(el) {
    const mode = el.dataset.v === 'batch' ? 'batch' : 'recipe';
    const prompt = E.buildChefPrompt({ mode, settings: S.settings, fridge: S.fridge, targets: S.targets, cart: S.cart });
    const ok = await copyText(prompt);
    toast(ok ? 'Prompt copied. Paste it into your AI chat.' : 'Copy failed on this device');
  },
  openImport() { openImport(); },
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
      E.setCustomData(S.customRecipes);
    }
    let blocks = 0;
    if (r.plan && r.plan.blocks.length) {
      S.cart.blocks = UI.importReplace ? r.plan.blocks : [...S.cart.blocks, ...r.plan.blocks];
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
    E.setCustomData(S.customRecipes);
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
  bProtein(el) { S.cart.builder.protein = el.value; persist('cart'); render(); },
  pfProtein(el) { S.cart.pf.protein = el.value; persist('cart'); render(); },
  pfGrams(el) { S.cart.pf.grams = Math.max(0, Math.round(Number(el.value) || 0)); persist('cart'); render(); },
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
        E.setCustomData(S.customRecipes);
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
  document.addEventListener('input', (e) => {
    if (e.target.matches('[data-input="importText"]')) UI.importText = e.target.value;
  });
  document.addEventListener('toggle', (e) => {
    if (e.target.matches && e.target.matches('[data-toggle="pf"]')) UI.pfOpen = e.target.open;
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
  E.setCustomData(S.customRecipes);
  bind();
  render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
