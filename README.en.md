# 🎞️ Presenter Slides — a Claude skill

**Ask Claude for a presentation on any topic and get a single `.html` file**: modern, responsive, light/dark mode, with
diagrams/images, **charts and simulators the audience can play with**, "learn more" icons, and keyboard/clicker navigation.
Works offline in any browser, from phone to projector.

> Português: see [README.md](README.md) (full documentation).

## Highlights
- **Plans first**: thesis, narrative arc, slide table, *graphics-resource map*, palette/fonts, interactivity budget (`PLAN.md`).
- **Interactive where it matters**: curves, statistics and calculations become slider-driven labs (`lab`), data charts, a sampling
  simulator (CLT), quiz, tabs — all in plain HTML/CSS/JS, **zero runtime dependencies**.
- **Icons that expand ideas**: ⓘ opens a side panel, cross-slide jumps with a **Back** button, glossary tips, hotspots on figures.
- **Market-grade UI/UX**: fluid type, 10 WCAG-validated palettes, light/dark/auto, 5 font pairings, custom brand palette.
- **Keyboard / clicker / touch**: `← →`, `PgUp/PgDn`, `Space`, `O` overview, `N` notes, `F` fullscreen, `B` blackout, `T` theme, `P` palette.
- **Accessible**, printable to PDF (1 slide/page), and **self-verifying** (static validator + visual QA with screenshots).

## Install
```bash
git clone https://github.com/fbarcellar80/PresenterSkill.git
mkdir -p ~/.claude/skills && cp -r PresenterSkill/skills/presenter-slides ~/.claude/skills/      # personal skill
```
Or as a plugin: `/plugin marketplace add fbarcellar80/PresenterSkill` then `/plugin install presenter-slides@presenter-skill`.
For Claude.ai, zip `skills/presenter-slides` and upload it in the Skills area of the settings.
Requires Python 3.9+ (stdlib only); Node 18 + Playwright only for the optional visual QA.

## Use
> *"Build a 10-minute deck on the central limit theorem for undergrads, with interactive simulations and dark mode."*

Claude will brief → plan → write slides → validate → QA → deliver `dist/index.html`. Manual CLI:
```bash
S=skills/presenter-slides/scripts
python3 $S/new_deck.py my-deck --title "My topic" --palette aurora --lang en
python3 $S/validate_deck.py my-deck && python3 $S/build_deck.py my-deck
```
Examples: [`examples/juros-compostos`](examples/juros-compostos/) (pt-BR, finance) and [`examples/normal-distribution`](examples/normal-distribution/) (en, statistics).
Docs (Portuguese): [usage guide](docs/guia-de-uso.md), [architecture](docs/arquitetura.md), [contributing](CONTRIBUTING.md). License: [MIT](LICENSE).
