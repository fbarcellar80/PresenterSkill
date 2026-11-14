---
name: presenter-slides
description: Cria apresentações de slides modernas, responsivas e interativas em um único arquivo HTML (HTML + CSS + JavaScript, sem dependências), com planejamento da narrativa, paletas de cores com modo claro/escuro, imagens/SVG, gráficos explicativos e simuladores interativos (curvas, estatística, cálculos) controlados por sliders, além de ícones "saiba mais" e navegação por teclado/clicker. Use SEMPRE que o usuário pedir uma apresentação, slides, deck, palestra, aula, pitch, workshop, treinamento ou "slides sobre <tema>" para tela/web/projetor — mesmo sem citar HTML —, ou pedir slides com gráficos, simulações, fórmulas ou conteúdo didático. Also use for "build a slide deck / presentation / interactive slides / HTML slides / lecture slides about X". NÃO use quando o usuário exigir explicitamente um arquivo .pptx/.key/PDF nativo (use a skill pptx) ou for apenas editar texto de um deck já pronto sem relação com esta skill.
---

# Presenter Slides — apresentações web interativas

Gera um deck como **um único `.html`** que abre em qualquer navegador (offline), com:
design moderno e fluido (celular → projetor), **modo claro/escuro/auto**, **9 paletas** validadas (WCAG),
navegação por **teclado, clicker e toque**, **ícones que expandem ideias** (painel "saiba mais", dicas,
saltos entre slides com botão voltar) e **widgets interativos** (curvas e simulações com sliders, calculadoras,
gráficos de dados, simulador estatístico, quiz, abas).

`SKILL_DIR` = pasta onde este `SKILL.md` está. Scripts: `python3 $SKILL_DIR/scripts/<nome>.py` (apenas stdlib do Python 3.9+).

## Fluxo de trabalho

Siga na ordem. Cada etapa existe porque a anterior evita retrabalho na seguinte.

### 1. Briefing (máx. 1 rodada de perguntas)
Entenda: **tema, público, objetivo** (informar/persuadir/ensinar), **duração** (define nº de slides), **idioma**, **tom**,
cores/marca, conteúdo obrigatório, imagens que o usuário possui. O que faltar, **assuma com bom senso e declare as
suposições** no resumo do plano — só pergunte antes se a resposta mudar tudo (ex.: público desconhecido para tema técnico).
Se o usuário já deu informação suficiente, não pergunte nada.

### 2. Planejamento (obrigatório — leia `references/01-planning.md`)
Escreva o plano em `<pasta-do-deck>/PLAN.md` e mostre-o de forma compacta ao usuário. Ele deve conter:
1. **Tese** (1 frase) e **arco narrativo** (ex.: problema → conceito → demonstração → aplicação → ação).
2. **Tabela de slides**: nº · id · layout · *título-conclusão* · conteúdo-chave · **recurso gráfico** · **interação** · ícones/referências cruzadas.
3. **Mapa de recursos gráficos**: para cada ideia, o melhor recurso (curva/variáveis → `lab`; comparação → `chart`;
   processo → diagrama SVG; números de impacto → `stats`+`counter`; etc. — tabela em `01-planning.md`).
4. **Paleta e fontes** escolhidas com justificativa (tabela de humor em `references/01-planning.md`; teoria de cores, contraste e tipografia em `references/02-design-system.md`) e modo padrão.
Regra de ouro: **uma ideia por slide**, título que afirma a conclusão, e **todo conceito com variáveis, curvas,
estatística ou cálculo vira algo que o espectador consegue mexer**. Em geral ≥ 40% dos slides têm recurso visual
não-textual e há pelo menos 1 widget interativo quando o tema envolve números.
Se o usuário pediu para aprovar o plano antes, pare aqui; caso contrário, siga em frente.

### 3. Estruturar a pasta
```bash
python3 $SKILL_DIR/scripts/new_deck.py <pasta> --title "…" --subtitle "…" --lang pt-BR --palette ocean --fonts modern
```
Cria `deck.json` + `slides.html` (capa, roteiro, exemplo, fechamento). Paletas: `aurora ocean forest sunset graphite rose amber earth playful`.
Fontes: `modern editorial friendly technical system`. Cores da marca do usuário → `palettes_custom` (ver `references/02-design-system.md`).

### 4. Escrever os slides (`slides.html`)
Cada slide é `<section class="slide …" id="…" data-title="…">`. Leia **sob demanda**:
- `references/03-slide-layouts.md` — catálogo de layouts/componentes com trechos prontos (copie e adapte).
- `references/04-interactive-widgets.md` — `lab`, `chart`, `sampler`, `quiz`, `compare`, `tabs`, contadores; linguagem de expressões.
- `references/05-icons-and-crossrefs.md` — catálogo de ícones, painel "saiba mais", dicas, saltos entre slides, hotspots.
- `references/06-visuals-media-math.md` — imagens (embutir, alt, crédito), diagramas SVG temáticos, fórmulas (KaTeX).

Princípios que valem sempre:
- Use as **classes do sistema e as variáveis CSS** (`var(--accent)` …) — nunca cores fixas — para o tema claro/escuro funcionar.
- Texto curto: ≤ ~60 palavras visíveis/slide, ≤ 6 itens de lista. O que sobra vai para `<aside class="notes">` (notas do
  apresentador) ou atrás de um ícone `info-btn` + `<template>`.
- **Ícones de aprofundamento**: onde um termo/fórmula/dado merece mais explicação, ponha `info-btn`; onde retoma algo
  de outro slide, `goto-btn`/`xref` (o espectador volta com o botão "Voltar"). Planeje-os já no plano.
- Todo gráfico/simulador tem **título, eixos rotulados, unidades** e uma **frase `insight`** dizendo o que observar.
- Imagens sempre com `alt`. Prefira **SVG autoral** (diagramas, ilustrações) a fotos de origem incerta; fotos só de
  arquivos fornecidos pelo usuário (veja a seção de mídia).
- Escreva no idioma do usuário e ajuste `"lang"` em `deck.json` (a interface do deck traduz: pt, en, es).

### 5. Compilar, validar e testar
```bash
python3 $SKILL_DIR/scripts/validate_deck.py <pasta>          # erros estáticos: JSON, expressões, ids, ícones, alt…
python3 $SKILL_DIR/scripts/build_deck.py <pasta>             # → <pasta>/dist/index.html  (use --no-fonts para 100% offline)
node    $SKILL_DIR/scripts/qa_check.cjs <pasta>/dist/index.html --out <pasta>/qa   # se houver Playwright
```
- Checklist final, acessibilidade, PDF e solução de problemas: `references/07-qa-and-delivery.md`.
- **Corrija todos os ✖** do validador antes de entregar; trate os ⚠ com critério (texto demais → enxugar/dividir).
- O `qa_check` renderiza cada slide em 1920×1080, 1366×768 e 390×844, claro e escuro, acusa erros de widget/JS e estouros
  de layout e salva PNGs. **Olhe pelo menos os screenshots dos slides com widgets e do mobile** (use Read nas imagens).
  Sem Playwright, diga ao usuário que a checagem visual não foi feita e peça para abrir o arquivo.
- Se `qa_check` avisar "conteúdo mais alto que a tela", enxugue ou divida o slide — não confie na rolagem.

### 6. Entregar
Informe: caminho do `dist/index.html`, nº de slides, **resumo do plano e suposições**, e os atalhos
(`← →` `PgUp/PgDn` navegam · `O` visão geral · `T` tema · `P` paleta · `N` notas · `F` tela cheia · `?` ajuda).
PDF: abrir no Chrome → Imprimir → "Salvar como PDF" (já há CSS de impressão, 1 slide/página).
Se a ferramenta `Artifact` estiver disponível e o usuário quiser compartilhar, o arquivo único pode ser publicado
(respeitando o limite de tamanho); se for para um repositório GitHub, o `dist/index.html` funciona direto no GitHub Pages.

### 7. Iterar
Pedidos de ajuste: edite `slides.html`/`deck.json` e recompile (não edite o `dist/`). Mudança de paleta/modo/fonte = só `deck.json`.

## Referência rápida (o essencial para escrever sem reler tudo)

**Atributos do slide**: `id`, `data-title`, `data-icon`, `data-section` (rótulo no topo), `data-bg="plain|grid|dots"`.
**Layouts**: `layout-title`, `layout-section`, `layout-closing`, `layout-big-stat`, `layout-quote`; corpo: `.slide-head`, `.split(.reverse/.wide-visual)`, `.cols/.cols-3/.cols-4`, `.cards`, `.stats`, `.steps`, `.timeline`.
**Revelar em passos**: `data-step` (mesmo número = juntos). **Entrada animada**: `data-anim="up|left|right|zoom"` (grades `.cards/.stats/.steps/.timeline/.stagger` já animam em cascata).
**Aprofundar**: `<button class="info-btn" data-detail="ID">` + `<template id="ID">…</template>` · `data-tip="texto"` (+ `.term`) · `.hotspot` sobre figuras.
**Saltar**: `<a class="xref" data-goto="id-do-slide">` · `<button class="goto-btn" data-goto="id">` (aparece o botão **Voltar**).
**Widgets**: `<div class="widget" data-widget="lab|chart|sampler|quiz|compare|tabs"><script type="application/json">{…}</script></div>`.
**Cores em gráficos**: deixe automático ou use `c1…c6` (alternam tons do tema e cores de contraste), `accent`, `accent2`, `accent3`, `good`, `warn`, `bad`.
**Formatos numéricos** (`format`): `num`, `num:2`, `int`, `currency[:0]`, `percent[:1]` (valor fracionário → %), `compact`, `sci`.

## Armadilhas comuns (cada uma já causou bug)
- JSON dos widgets **não aceita comentários nem vírgula sobrando**; aspas duplas sempre. O validador acusa.
- Em expressões, multiplicação é `*` (a forma `2x` só vale após número); potência é `^`; funções: `sin cos tan ln log sqrt abs exp min max if(c,a,b) sum(expr,k,a,b) normpdf normcdf comb fact pmt …`. Variáveis = `id` dos `params` + `x`/`t`. Funções próprias em `defs`.
- `percent` espera fração (0,12 → 12%). Para "8" já em %, use `num` com `"suffix": "%"`.
- Assíntotas (`tan`, `1/x`): defina `y.min`/`y.max` explícitos, senão a escala "estoura".
- `data-goto`/`data-detail` apontam para **ids existentes** (o validador confere). `<template>` precisa de `id`.
- Não use `<script>` próprio nos slides; a interatividade vem dos widgets. Não use cores hexadecimais fixas em texto/fundos.
- Um slide que "rola" em desktop é defeito de planejamento: divida-o.
- Ícones só existem no sprite embutido (`references/05-icons-and-crossrefs.md`); nome inventado = ícone vazio (o validador acusa).
- Não prometa a checagem visual se `qa_check` não rodou.
