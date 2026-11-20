# Mise · Meal Prep

A mobile-first, high-protein, gluten-free meal prep web app. It's plain HTML, CSS and JS with no build step, ready for GitHub Pages and iPhone "Add to Home Screen".

## Files

| File | Role | Portable to Expo? |
|---|---|---|
| `recipes.js` | Pure data: 20 recipes, ingredient nutrition, pantry defaults, substitution matrix, sauces, taste fixes | ✅ as-is |
| `engine.js` | Pure logic: matching, Use First ranking, scaling, macros, locks and swaps, fridge/freezer split, parallel timeline scheduler | ✅ as-is (no `window`/`document`) |
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

## Batch Cart & AI Chef Bridge

- **Batch Cart (Tab 2):** add meal blocks (count × slot × cuisine) or start Protein-First from raw grams. Lunch and dinner blocks that share a protein are pooled into one neutral master cook. Each block gets a cuisine Flavor Kit tagged Freeze-With or Spoon-After. Days 1–4 go in the fridge, Day 5+ in the freezer. You also get one summed shopping list and one parallel timeline.
- **AI Chef Bridge (Tabs 1, 2, 4):** "Copy Prompt" puts your kitchen, rules and targets on the clipboard, plus a strict JSON reply format. "Import JSON" accepts a recipe, `{"recipes": [...]}`, or a `batchPlan` and saves it to localStorage. The templates live in `AI_RECIPE_TEMPLATE` and `AI_BATCH_TEMPLATE` in `recipes.js`.

## Data

All user data (pantry, locks, blocklist, appliances, fridge selections, per-recipe swaps and portions, meal logs, weight logs, batch cart, imported recipes) autosaves to `localStorage` under the `kitchenos.v1.*` keys. Use **Rules → Export backup** to move it to another device.

## Adding a recipe

Add an object to `RECIPES` in `recipes.js`. In step text, `{id}` renders the ingredient name and `{=id}` renders the scaled amount plus name. Both follow swaps, locks and portion changes automatically.
