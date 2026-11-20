# Mise · Meal Prep

A mobile-first, high-protein, gluten-free meal prep web app. It's plain HTML, CSS and JS with no build step, ready for GitHub Pages and iPhone "Add to Home Screen".

## Files

| File | Role | Portable to Expo? |
|---|---|---|
| `recipes.js` | Pure data: 26 starter recipes (Japanese, Turkish, Latin American, Mediterranean, Quick High-Protein, Comfort Bowl), ingredient nutrition, pantry defaults, substitution matrix, sauces, flavor kits, breakfast bases, Chef's Creation cuisine profiles | ✅ as-is |
| `engine.js` | Pure logic: matching, Use First ranking, scaling, macros, locks and swaps, fridge/freezer split, phased parallel scheduler, 7-day planner, in-app recipe generator, Write My Own builder, custom pantry staples | ✅ as-is (no `window`/`document`) |
| `storage.js` | Storage adapter with an AsyncStorage-compatible backend | ✅ `createStore(AsyncStorage)` |
| `ui.js` | DOM rendering and events only | ❌ rewrite as RN components |
| `index.html`, `style.css` | Layout and styling | ❌ |
| `sw.js` | Network-first offline cache (HTTPS only) | n/a |

## Run locally

ES modules need a server (not `file://`):

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy to GitHub Pages

Push this folder to a repo, then go to **Settings → Pages → Deploy from branch → main / root**. `.nojekyll` is already included.
On iPhone, open the Pages URL in Safari and choose **Share → Add to Home Screen**.

## Features

- **Quick Cook (Tab 1):** pick what's in your fridge to see matching recipes. **Chef's Creation** composes a complete recipe in-app from the selected ingredients, the chosen cuisine's flavor profile, your pantry and your appliances, with grams, macros, active vs passive time and technique tips. *Try another* remixes it and *Save* adds it to My Recipes. **Write My Own Recipe** opens a plain form: title, cuisine, slot, minutes, ingredient rows in g/ml/pcs, one step per line, and a tip.
- **7-Day Planner (Tab 2):** generates 21 meals (Breakfast, Lunch and Dinner × Days 1–7). You choose the breakfast variety (1, or 2 split 4 + 3 days), lunch & dinner mode (*1 master protein + 3 flavor kits*, or *rotating dishes* with 2–3 per slot), and the cuisine mix. Everything is cooked in one session. Phase 1 is breakfast and long-cook bases, Phase 2 is the mains in parallel, and Phase 3 is boxing: Days 1–4 go in the fridge, Days 5–7 in the freezer, and Spoon-After sauces in separate pots. You also get a daily macro total, *I Ate This* on every meal and one summed shopping list.
- **Rules & Pantry (Tab 4):** pantry toggles plus your own staples, dietary locks, the blocklist, appliances, My Recipes, backups and, at the bottom, the optional **AI Chef Bridge** (copy a prompt, then *Paste New Plan*).

## Data

All user data (pantry and custom staples, locks, blocklist, appliances, fridge selections, per-recipe swaps and portions, meal logs, weight logs, 7-day plan, My Recipes) autosaves to `localStorage` under the `kitchenos.v1.*` keys. Use **Rules → Export backup** to move it to another device.

## Adding a recipe

Add an object to `RECIPES` in `recipes.js`. In step text, `{id}` renders the ingredient name and `{=id}` renders the scaled amount plus name. Both follow swaps, locks and portion changes automatically.
