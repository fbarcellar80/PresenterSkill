# Arquitetura

## Objetivos de projeto
1. **Um arquivo, zero dependências em runtime** — o deck abre em qualquer navegador, offline, de `file://`.
2. **O modelo escreve conteúdo, o motor cuida do resto** — slides são HTML declarativo; interatividade vem de JSON validável.
3. **Verificável** — tudo que o modelo gera passa por validador estático e por QA em navegador real.
4. **Acessível e responsivo por padrão** — tokens de tema, escala fluida, teclado, `aria`, contraste testado.
5. **Seguro** — sem `eval`/`new Function` (expressões têm parser próprio), sem rede obrigatória, sem coleta de dados.

## Visão geral
```text
            deck.json ──┐                                    ┌─────────────── dist/index.html ───────────────┐
            slides.html ┼─► build_deck.py ─► template.html ─►│ <style> base.css + components.css + palettes  │
 (imagens/ → base64) ───┘        │                          │ <svg> sprite de ícones                         │
                                 │                          │ <script id=ps-config> (título, paletas, lang) │
 assets/palettes.json ──► CSS ───┘                          │ <main class=deck> slides </main>              │
 assets/js/*.js ──► bundle ────────────────────────────────►│ <script> math+core+charts+widgets+engine      │
                                                            └───────────────────────────────────────────────┘
 validate_deck.py  (estático)  ──►  check_expr.cjs (usa o MESMO math.js do runtime)
 qa_check.cjs      (Playwright) ──►  screenshots + erros de layout/JS em 3 viewports × 2 temas
```

## Componentes

### Pipeline (Python, somente stdlib)
| Script | Função |
|---|---|
| `new_deck.py` | cria `deck.json` + `slides.html` a partir de `assets/starter/` |
| `build_deck.py` | valida `deck.json`, gera CSS das paletas, escolhe fontes, embute imagens locais (base64), injeta config JSON, monta o HTML único |
| `validate_deck.py` | parser HTML (stdlib) extrai slides, widgets, referências, ícones, imagens; aplica regras de erro/aviso; chama `check_expr.cjs` para compilar as expressões com o parser real |
| `contrast.py` | WCAG 2.x: razão de contraste e checagem das paletas (usada no build, nos testes e no CI) |
| `qa_check.cjs` | Playwright: percorre `PS.deck.go(i)` em cada slide × viewport × tema; coleta erros, estouros, imagens quebradas; screenshots |

### Runtime (JS puro, ordem de concatenação)
| Arquivo | Responsabilidade |
|---|---|
| `math.js` | **parser de expressões** (descida recursiva → AST → closures), funções, `defs`, `sum/prod/deriv/integ`, formatação `Intl`, `template()`. UMD: roda no navegador e no Node (testes/validador) |
| `core.js` | `PS` (namespace), helpers `el/svg`, i18n (pt/en/es), cores de série, armazenamento seguro (`localStorage` com try/catch) |
| `charts.js` | renderizadores SVG: `cartesian` (linhas/áreas/pontos/barras discretas, sombreamento, marcadores, mira), `bars`, `pie`, legenda, `observe` (ResizeObserver) |
| `widgets.js` | registro `PS.widgets`: `lab`, `chart`, `sampler`, `quiz`, `compare`, `tabs`; `PS.initWidgets` lê o JSON de cada `.widget` |
| `engine.js` | slides, navegação (teclado/clicker/toque/hash), passos, contadores, tema/paleta/escala/movimento, visão geral, notas, painel de detalhes, saltos com pilha de retorno, tooltips, atalhos, a11y |

### Estilos
- `base.css` — tokens, tipografia fluida (`--fs-base = clamp(13px, min(1.4vw, 2.5vh), 32px)`), palco, chrome, painéis, impressão.
- `components.css` — layouts, cards, listas, estatísticas, diagramas SVG, widgets, animações.
- Paletas: `palettes.json` → CSS em `[data-palette][data-theme]` + `@media (prefers-color-scheme: dark)` (modo auto).

## Decisões e porquês
- **Slides fluidos, não 1920×1080 escalado**: garante legibilidade em celular, tablet, janela estreita e projetor, sem "letterbox".
  Em desktop o conteúdo deve caber (o QA avisa); em telas estreitas o slide rola.
- **Widgets declarativos em JSON** (`<script type="application/json">`): o modelo erra menos que ao escrever JS, o JSON é validável,
  e a superfície de ataque é pequena. O parser de expressões elimina `eval`.
- **Dicionários sem protótipo** no avaliador (`Object.create(null)`): `constructor`, `__proto__` nunca resolvem como funções/variáveis.
- **Slides inativos continuam no layout** (`opacity/visibility`, não `display:none`): gráficos medem o container corretamente e animam ao entrar.
- **Sem `visibility` na transição do slide ativo** e `transition: none` em "reduzir movimento": o foco programático funciona no mesmo frame
  (bug real encontrado nos testes e2e).
- **Breakpoints só em `screen`**: o Chrome avalia a largura da página de PDF em unidades menores; assim a impressão mantém o layout desktop.
- **Paletas com tokens separados por modo**: acentos mais claros no escuro; verificação automática de contraste.
- **Cores de série alternadas** (`--c1…c6`): matizes análogos são pouco distinguíveis em gráficos; a sequência intercala contraste.
- **Pilha de retorno nos saltos**: o espectador explora e volta sem se perder.
- **Persistência leve**: tema, paleta, escala e movimento em `localStorage` (por deck), com fallback silencioso.

## Estado e eventos
- Estado global em `engine.js`: `cur` (índice), `stack` (retorno), `prefs` (modo/paleta/escala/movimento). Cada slide guarda `__groups` (passos) e `__r` (revelados).
- API pública para testes/QA: `PS.deck.{go,next,prev,index,count,slides,setMode,setPalette,openOverview,xref}`; evento `ps:slide` na troca.
- URL: `#/N` (1-based) ou `#id`.

## Estendendo
| Quero… | Faça |
|---|---|
| **Nova paleta** | adicione em `assets/palettes.json` (tokens claro/escuro + `x4–x6`); `make contrast`; documente em `references/01-planning.md` (há teste que cobra) |
| **Novo ícone** | adicione o `<symbol>` em `assets/icons.svg` (24×24, traço, `currentColor`) e ao catálogo em `references/05-icons-and-crossrefs.md` (teste cobra) |
| **Novo widget** | `PS.widgets.nome = (host, config, ctx) => {…}` em `widgets.js`; adicione a `WIDGETS` e regras em `validate_deck.py`; documente em `references/04`; teste e2e |
| **Nova função matemática** | `FUNCS` em `math.js` + teste em `tests/math.test.cjs` + lista em `references/04` |
| **Novo idioma da UI** | bloco em `I18N` (`core.js`) |
| **Novo layout** | CSS em `components.css`, trecho em `references/03-slide-layouts.md` |

## Testes
| Camada | Arquivo | O que cobre |
|---|---|---|
| Paletas | `tests/test_palettes.py` | contraste WCAG, tokens completos |
| Build | `tests/test_build.py` | exemplos, config, CSS de paletas, imagens base64, fontes, KaTeX, erros |
| Validador | `tests/test_validate.py` | cada regra de erro/aviso; expressões pelo parser real |
| Scaffold | `tests/test_new_deck.py` | starter válido e compilável |
| Skill | `tests/test_skill.py` | frontmatter, tamanho, links de referência, catálogo de ícones, versões, manifestos |
| Matemática | `tests/math.test.cjs` | precedência, `defs`, `sum/deriv/integ`, estrito, segurança, formatação |
| E2E | `tests/e2e.cjs` | teclado, passos, sliders, painel, saltos, tema, hash, quiz, hotspot, sampler, tooltip, mobile, PDF |
