# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A Claude **skill** (`skills/presenter-slides/`) that generates interactive slide decks as a **single self-contained HTML file** (HTML/CSS/vanilla JS, zero runtime dependencies). The repo also holds the dev tooling around it: tests, example decks, docs, plugin/marketplace manifests. Project docs and user-facing strings are in Portuguese (pt-BR); `README.en.md` is a short English summary.

## Commands

Python 3.9+ (stdlib only) and Node 18+. Playwright is needed only for e2e/QA (`npm install && npx playwright install chromium`; if the module isn't found set `NODE_PATH`, if Chromium lives elsewhere set `PS_CHROMIUM=/path/to/chromium`).

```bash
make test        # unit tests: python unittest + node --test (no browser)
make e2e         # Playwright end-to-end (node tests/e2e.cjs)
make examples    # validate + rebuild examples/*/dist/index.html  (CI fails if this leaves a git diff)
make qa          # render every slide of the examples → qa/ (screenshots)
make contrast    # WCAG check of palettes.json

# single tests
python3 -m unittest tests.test_validate.ValidateTests.test_refs_ids_icons_images
python3 -m unittest tests.test_build -v
node --test --test-name-pattern="sum, prod" tests/math.test.cjs

# the skill's own pipeline (what Claude runs when the skill triggers)
S=skills/presenter-slides/scripts
python3 $S/new_deck.py <dir> --title "…" --palette ocean --lang pt-BR
python3 $S/validate_deck.py <dir>            # static lint; exit 1 on errors (--strict: warnings too)
python3 $S/build_deck.py <dir> [--no-fonts]  # → <dir>/dist/index.html
node $S/qa_check.cjs <dir>/dist/index.html --out <dir>/qa
```

There is no linter/formatter configured.

## Architecture (the big picture)

**Authoring model.** A deck is `deck.json` + `slides.html` (or `slides/*.html`, concatenated alphabetically). Slides are plain `<section class="slide">` HTML; interactivity comes from declarative widgets — `<div class="widget" data-widget="lab|chart|sampler|quiz|compare|tabs">` containing a `<script type="application/json">` config. Claude writes content, never engine code.

**Build pipeline** (`scripts/build_deck.py`): reads `assets/palettes.json` → generates palette CSS (`[data-palette][data-theme]` + `prefers-color-scheme` for "auto"), inlines `assets/css/*`, `assets/icons.svg` (sprite), and the JS bundle into `assets/template.html`, embeds local images as base64, and injects a `#ps-config` JSON block (title, lang, palette list…) that the runtime reads. JS concatenation order is fixed: `math → core → charts → widgets → engine`.

**Runtime** (`assets/js/`, global `PS` namespace, no build step):
- `math.js` — UMD safe expression parser (recursive descent → AST → closures, no `eval`). It is loaded by the browser **and** by Node: `validate_deck.py` shells out to `scripts/check_expr.cjs`, which compiles every widget expression with the *same* parser, so a widget expression change must keep both sides consistent.
- `charts.js` (SVG renderers) ← used by `widgets.js` (widget registry `PS.widgets.*`, initialized per slide by `PS.initWidgets`) ← orchestrated by `engine.js` (navigation, steps, theme/palette prefs, overview, notes, detail drawer, cross-slide jumps with a return stack). `PS.deck.*` is the public API used by `qa_check.cjs` and `tests/e2e.cjs`.

**Validation vs. runtime must agree.** `validate_deck.py` has its own HTML parser with per-widget rules (`WIDGETS`, `widget_checks`, `collect_exprs`) mirroring `widgets.js` config schemas. Adding/changing a widget field means updating: `widgets.js`, `validate_deck.py`, `references/04-interactive-widgets.md`, and a test.

**Skill content** (`skills/presenter-slides/SKILL.md` + `references/01…07`) is the prompt the model follows; `SKILL.md` is loaded on trigger, `references/` on demand (progressive disclosure).

## Invariants enforced by tests (`tests/test_skill.py`, `test_palettes.py`, …)

- `SKILL.md`: frontmatter has only `name` (= folder name) and `description` (≤1024 chars, trigger words in pt and en), body < 500 lines, and **every** `references/*.md` is cited as `references/<file>` in it; files >100 lines need a `## Sumário`.
- Every icon in `assets/icons.svg` must be listed in the catalog table of `references/05-icons-and-crossrefs.md` (and vice versa); every palette must appear in `references/01-planning.md`; `04-interactive-widgets.md` needs a `## <widget>` section per widget.
- Palettes must pass WCAG contrast (`scripts/contrast.py`): text ≥7:1, muted/accents ≥4.5:1, chart colors `x4–x6` ≥3:1 on both backgrounds.
- Version must match across `package.json`, `.claude-plugin/plugin.json` and the top `CHANGELOG.md` entry (also `marketplace.json` by convention).
- Committed `examples/*/dist/index.html` must equal a fresh build (run `make examples` and commit the result).
- Local markdown links must resolve.

## Gotchas learned the hard way

- **Never put a literal `</script>` or `<!--` in any `assets/js/*.js`** (even in comments) — the JS is inlined in a `<script>` tag; `build_deck.py` aborts if it finds one.
- Tab icons use `data-tab-icon`, not `data-icon` (the engine treats `[data-icon]` globally and would inject an icon into the panel).
- CSS: breakpoints are `@media screen and (…)` on purpose — Chrome evaluates print/PDF width in smaller units and would apply the mobile layout. Reduced-motion/`data-motion="off"` use `transition: none` (a `.01ms` duration made `visibility` flip a frame late and broke programmatic focus). Inactive slides stay in layout (`opacity/visibility`, not `display:none`) so charts can measure their container.
- Math evaluator uses null-prototype dictionaries and numeric-only variable lookup so `constructor`/`__proto__` never resolve.
- Colors in components/slides must be CSS tokens (`var(--accent)`…), never hex, so every palette × light/dark works. Series colors default to `--c1…--c6`, which intentionally interleave brand and contrast hues.
- `tests/e2e.cjs` builds examples with `--no-fonts`; `qa_check.cjs` ignores font/CDN network errors.

## Conventions when using the skill (maintainer preferences)

- **No brand assets in the skill.** Logos, photos and other organization-specific images are supplied by the user for each request and live only in that deck's folder (`decks/` is gitignored). Never commit them under `skills/` or `examples/`.
- **Logo and cover photo are generic mechanisms**: `deck.json › logo {light, dark, alt}` (top bar, one file per theme) and `.cover-photo` + `.cover-veil` on a `layout-title` slide. In slides, pair `<img class="logo-light">` with `<img class="logo-dark">` so the right version shows per theme.
- **Institutional / public-service / engineering material** → palette `azul_mod` (monochrome blue + gray, no green). Avoid green for status/check accents when the user asks for a neutral look: override locally with `style="--good:var(--muted)"` instead of editing the palette.
- **Long excerpts** (norm text, quotes, derivations) go behind the notebook-and-pencil button (`<button class="info-btn read-btn" data-detail="d-…"><i data-icon="notebook-pen"></i><span>…</span></button>` + `<template id="d-…">`), not on the slide.
- **Decks for a technical team have no review quizzes.** Prefer calculators (`lab`) that reproduce the source document's formulas, and check them against its tables before delivering.
- A deck is delivered as the single `dist/index.html` (send it to the user; cloud sessions cannot write to the user's own folders).

## Git / release

Default branch is `main` (history starts from an empty root commit). Commit style: `tipo(escopo): descrição` (`feat`, `fix`, `docs`, `test`, `chore`). To release, bump the version in the manifests + `CHANGELOG.md`, tag `vX.Y.Z`. Zip for Claude.ai upload: `cd skills && zip -r ../presenter-slides.zip presenter-slides`.
