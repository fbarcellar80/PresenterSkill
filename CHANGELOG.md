# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [0.1.0] — 2026-11-14

### Adicionado
- Skill `presenter-slides`: fluxo de 7 etapas (briefing → planejamento → scaffold → autoria → validação/QA → entrega → iteração).
- Motor de apresentação em HTML/CSS/JS puro, arquivo único e offline: navegação por teclado, clicker (PgUp/PgDn), toque e hash;
  passos (fragmentos), visão geral, notas do apresentador, tela cheia, tela preta, impressão em PDF (1 slide/página).
- Design responsivo fluido (celular → projetor), modo claro/escuro/auto, 9 paletas validadas por contraste WCAG, 5 pares de fontes, paleta própria via `deck.json`.
- Widgets interativos: `lab` (curvas, calculadoras e simulações com sliders), `chart` (barras, linhas, áreas, pizza/rosca, dispersão),
  `sampler` (LGN/TCL), `quiz`, `compare`, `tabs`, contadores animados.
- Parser de expressões matemáticas seguro (sem `eval`): `sum`, `prod`, `deriv`, `integ`, `normpdf/normcdf`, `comb`, `pmt`, `if`, funções do usuário.
- Ícones "saiba mais" (painel lateral), dicas, saltos entre slides com botão Voltar, hotspots; sprite com 75 ícones.
- Scripts: `new_deck.py`, `build_deck.py`, `validate_deck.py`, `qa_check.cjs`, `contrast.py`.
- Referências para o modelo (planejamento, design, layouts, widgets, ícones, mídia/SVG/matemática, QA) e dois decks de exemplo.
- Testes: unitários (Python/Node), conformidade da skill e e2e com Playwright; CI no GitHub Actions; manifesto de plugin/marketplace.
