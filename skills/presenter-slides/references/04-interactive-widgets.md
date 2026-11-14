# 04 · Widgets interativos

Interatividade é obrigatória para gráficos, curvas, estatísticas e cálculos: **deixe o espectador mexer** para entender.
Formato comum:
```html
<div class="widget" data-widget="lab|chart|sampler|quiz|compare|tabs">
  <script type="application/json">{ …configuração… }</script>
</div>
```
JSON estrito (aspas duplas, sem comentários, sem vírgula final). `class="widget"` desenha o cartão; `data-bare` remove a moldura.
Erro no widget → aparece uma caixa vermelha com a mensagem (e o `validate_deck.py` acusa antes).

## Sumário
[lab](#lab--laboratório-paramétrico) · [Linguagem de expressões](#linguagem-de-expressões) · [Receitas de lab](#receitas-de-lab) ·
[chart](#chart--gráficos-de-dados) · [sampler](#sampler--simulador-estatístico) · [quiz](#quiz) · [compare](#compare--antesdepois) · [tabs](#tabs) ·
[Formatos](#formatos-numéricos) · [Teclado e foco](#teclado-e-foco) · [Erros comuns](#erros-comuns)

---
## lab — laboratório paramétrico
Sliders (`params`) → curvas (`series`), resultados (`outputs`) e uma frase dinâmica (`insight`). Serve como **plotador de funções,
calculadora e simulação**. Sem `series` vira calculadora; sem `params` vira gráfico estático com hover.

| Campo | Tipo | Descrição |
|---|---|---|
| `title`, `icon`, `caption` | texto | cabeçalho (ícone do sprite) e legenda |
| `params[]` | lista | `{id, label, min, max, step, value, format, suffix, hint}` ou `{id, label, options:[{value,label}], value}` (select) |
| `defs` | objeto | funções próprias: `{"f": "a*x^2+b", "g(x,y)": "x*y"}` (arg. padrão `x`) |
| `x` | objeto | `{min, max, label, samples (260), format, suffix}`; `min/max` podem ser **expressões** (`"mu-4*sigma"`) |
| `y` | objeto | `{min, max, label, format, suffix}`; omita min/max para escala automática. `"auto"` também vale |
| `series[]` | lista | ver abaixo |
| `markers[]` | lista | pontos: `{x, y, label, color}` (expressões) |
| `hlines[]`, `vlines[]` | lista | linhas de referência `{y,label}` / `{x,label}` |
| `outputs[]` | lista | cartões de resultado `{label, expr, format, suffix, color: 1\|2\|3}` |
| `insight` | texto | frase com `{expr\|formato}` calculado ao vivo: `"{P*(1+i)^n\|currency:0}"` |
| `play` | objeto | `{param, speed}` — botão "Animar" varre o parâmetro (fração do intervalo por segundo, padrão 0,12) |
| `currency` | texto | moeda ISO para `currency` (padrão BRL em pt, USD nos demais) |
| `height` | texto | `"short"` ou `"tall"` |

**series[]**: `{id, label, expr, style, color, dash, width, visible, domain, discrete, parametric, shade}`
- `expr`: função de `x`. `style`: `line` (padrão) · `area` · `points` · `bars` · `step`. `dash: true` tracejado.
- `domain: [a,b]` restringe o trecho desenhado. `visible:false` começa oculta (legenda liga).
- `discrete: [a,b]`: x inteiros de a até b (ex.: binomial) — combine com `"style":"bars"`.
- `parametric: {x, y, t:[t0,t1]}`: curvas paramétricas (círculos, Lissajous, trajetórias).
- `shade: {from, to}`: sombreia a área sob a curva entre dois x (integral, probabilidade, intervalos de confiança).
- `color`: `c1…c6` (padrão automático), `accent`, `accent2`, `accent3`, `good`, `warn`, `bad` ou qualquer cor CSS/`var(--…)`.

Com ≥ 2 séries aparece **legenda clicável**. Passar o mouse/tocar mostra a **mira com valores**.

## Linguagem de expressões
Parser próprio e seguro (sem `eval`). Variáveis: `id` dos `params`, `x` (eixo) e `t` (paramétrico).
- Operadores: `+ - * / % ^` (potência, associativa à direita) · comparações `< > <= >= == !=` (dão 1/0) · parênteses.
- Multiplicação implícita **só** depois de número ou `)`: `2x`, `3(x+1)`, `2pi`. Entre variáveis use `*` (`a*x`).
- Constantes: `pi e tau inf`.
- Funções: `sin cos tan asin acos atan atan2 sinh cosh tanh exp ln log(x[,base]) log2 log10 sqrt cbrt abs sign floor ceil round trunc min max pow mod clamp(x,a,b) lerp(a,b,t)`
  · combinatória `fact comb perm` · estatística `normpdf(x,mu,sigma) normcdf(x,mu,sigma)` · finanças `pmt(taxa,n,vp)` · lógica `if(cond,a,b)`.
- Especiais: `sum(expr,k,a,b)`, `prod(expr,k,a,b)` (índice `k`), `deriv(f,x0)`, `integ(f,a,b)` (`f` = nome em `defs`).
- Piecewise: `if(x<0, -x, x^2)`. Degrau: `(x>2)`.
- Erro comum: usar `y` ou nome que não é param/`x` → "Variável desconhecida". O validador acusa.

## Receitas de lab
**1. Calculadora com frase dinâmica** (sem `series`)
```json
{ "title": "Calculadora de IMC",
  "params": [{"id":"m","label":"Peso","min":40,"max":150,"step":1,"value":70,"suffix":" kg","format":"int"},
             {"id":"h","label":"Altura","min":1.4,"max":2.1,"step":0.01,"value":1.72,"suffix":" m","format":"num:2"}],
  "outputs": [{"label":"IMC","expr":"m/h^2","format":"num:1","color":1}],
  "insight": "Com {m|int} kg e {h|num:2} m, o IMC é {m/h^2|num:1}." }
```
**2. Função com parâmetros e ponto móvel**
```json
{ "title": "Parábola y = ax² + bx + c",
  "params": [{"id":"a","label":"a","min":-3,"max":3,"step":0.1,"value":1,"format":"num:1"},
             {"id":"b","label":"b","min":-6,"max":6,"step":0.1,"value":-2,"format":"num:1"},
             {"id":"c","label":"c","min":-6,"max":6,"step":0.1,"value":-1,"format":"num:1"}],
  "defs": {"f": "a*x^2+b*x+c"},
  "x": {"min": -6, "max": 6, "label": "x"}, "y": {"min": -10, "max": 10, "label": "f(x)"},
  "series": [{"id":"f","label":"f(x)","expr":"f(x)"}],
  "markers": [{"x":"-b/(2*a)","y":"f(-b/(2*a))","label":"vértice"}],
  "outputs": [{"label":"Vértice x","expr":"-b/(2*a)","format":"num:2"},{"label":"Δ","expr":"b^2-4*a*c","format":"num:1","color":2}] }
```
(`a = 0` dá divisão por zero no vértice → deixe `min` do slider ≠ 0 ou use passos que não incluam 0.)

**3. Área sob a curva / probabilidade** — veja `examples/normal-distribution` (slide "Explore μ, σ e k"): `shade` + `normcdf` em `outputs`.

**4. Distribuição discreta (binomial)**
```json
{ "params": [{"id":"n","label":"Tentativas","min":5,"max":60,"step":1,"value":20},{"id":"p","label":"p","min":0.05,"max":0.95,"step":0.05,"value":0.5,"format":"num:2"}],
  "x": {"min": -1, "max": "n+1", "label": "Sucessos"},
  "series": [{"label":"P(X=k)","style":"bars","discrete":[0,"n"],"expr":"comb(n,x)*p^x*(1-p)^(n-x)"}],
  "outputs": [{"label":"Média n·p","expr":"n*p","format":"num:1"}] }
```
**5. Animação no tempo (onda/projétil)**: `"params":[{"id":"t","min":0,"max":6.28,"step":0.01,"value":0}]`, `"play":{"param":"t","speed":0.15}`, série `sin(x - t)`.
**6. Série de Fourier / Taylor**: `sum(4/pi*sin((2*k-1)*x)/(2*k-1), k, 1, N)` com `N` como param inteiro.
**7. Curva paramétrica**: `{"parametric":{"x":"cos(t)*a","y":"sin(t)","t":[0,6.2832]}}`.
**8. Derivada/integral numéricas**: `defs {"f":"x^3-3*x"}`, série `deriv(f,x)`, saída `integ(f,0,2)`.
**9. Cenários financeiros**: `pmt(i/100, n, valor)`, `valor*(1+i/100)^n`; veja `examples/juros-compostos`.

---
## chart — gráficos de dados
Dados fixos, com tooltip, **legenda liga/desliga** e troca de tipo.
```json
{ "title": "Receita por trimestre", "type": "bar", "switch": ["bar","line","area"],
  "labels": ["T1","T2","T3","T4"],
  "series": [{"label":"2024","data":[10,14,12,18]},{"label":"2025","data":[13,17,20,26]}],
  "format": "currency:0", "xlabel": "Trimestre", "ylabel": "R$ mil", "showValues": true,
  "caption": "Passe o mouse para ver os valores." }
```
| Campo | Descrição |
|---|---|
| `type` | `bar` · `hbar` · `stacked` · `line` · `area` · `pie` · `donut` · `scatter` |
| `switch` | lista de tipos que o espectador pode alternar (botões segmentados); `switchLabels` renomeia |
| `labels` | categorias (exceto `scatter`); cada série precisa do mesmo nº de valores (validador confere) |
| `series[]` | `{label, data, color}`; em `scatter`, `data` = `[[x,y],…]`; em `pie/donut` usa-se a 1ª série |
| `colors[]` | cores por fatia/categoria em pizza/rosca (`["c1","c2",…]`) |
| `format`, `unit` | formato dos valores; `unit` = sufixo |
| `xlabel`, `ylabel`, `showValues`, `ydom:[min,max]`, `xdom` (scatter), `zero`, `centerLabel` (rosca), `height`, `caption` |
Boas práticas: ≤ 6 séries/fatias; barras começam em 0; use `line` para tendência, `bar` para comparação, `donut` para composição com 2–5 partes, `scatter` para correlação; sempre rótulos de eixo com unidade.

---
## sampler — simulador estatístico
Sorteia amostras e desenha o histograma com a **normal esperada**; ótimo para Lei dos Grandes Números e Teorema Central do Limite.
```json
{ "title": "Teorema Central do Limite", "dist": "exponential", "average": 1, "initial": 600,
  "caption": "Aumente k e sorteie mais valores." }
```
`dist`/`options`: `uniform normal exponential dice bimodal` · `average` (k inicial) · `maxAverage` (50) · `bins` (32) · `initial` (amostras iniciais) ·
`xlabel`, `distLabel`, `averageLabel`, `hint`. O espectador escolhe a distribuição, varia k e pressiona "Sortear 10/500".

---
## quiz
```json
{ "question": "R$ 100 a 10% a.a., compostos, em 2 anos resultam em…",
  "options": [{"text":"R$ 120","why":"Isso é juros simples."},
              {"text":"R$ 121","correct":true,"why":"100 × 1,1 × 1,1."}],
  "explain": "texto exibido se a opção correta não tiver 'why'" }
```
Pelo menos uma opção com `"correct": true`. A explicação (`why`) aparece ao clicar — escreva-a mesmo nas erradas.

## compare — antes/depois
Dois filhos (imagens ou SVGs) com slider de revelação; JSON opcional `{ "labelA": "Antes", "labelB": "Depois" }`.
```html
<div class="widget" data-widget="compare" data-bare>
  <script type="application/json">{"labelA":"2000","labelB":"2024"}</script>
  <figure class="media"><img src="imagens/a.jpg" alt="Região em 2000"></figure>
  <figure class="media"><img src="imagens/b.jpg" alt="Região em 2024"></figure>
</div>
```
Use proporções iguais nas duas figuras.

## tabs
```html
<div class="widget" data-widget="tabs" data-bare>
  <section data-tab="Visão geral" data-tab-icon="eye">…conteúdo…</section>
  <section data-tab="Detalhes">…conteúdo…</section>
</div>
```
Use `data-tab-icon` (não `data-icon`). Setas ←/→ trocam de aba quando o foco está nelas.

## Formatos numéricos
`num` (auto) · `num:N` (N casas) · `int` · `currency` / `currency:0` · `percent` / `percent:1` (**valor fracionário**: 0,153 → 15,3 %) ·
`compact` (1,2 mi) · `sci` / `sci:2` (1,2×10^6) · `raw`. `suffix`/`unit` anexa texto (`" kg"`). Locale segue `deck.json › lang`.

## Teclado e foco
- Com foco num **slider**, ←/→ ajustam o valor (não mudam de slide); **PageUp/PageDown** sempre mudam de slide (clickers);
  **Esc** tira o foco do controle e devolve as setas à navegação.
- Botões, abas e legendas são focáveis por Tab; `Enter`/`Espaço` ativam.
- Toque: deslizar **dentro** de um widget não troca de slide; deslizar fora troca.

## Erros comuns
| Sintoma | Causa/solução |
|---|---|
| Caixa vermelha "Widget … JSON" | vírgula sobrando/comentário/aspas simples |
| "Variável desconhecida" | nome não é `id` de param nem `x`/`t` — declare o param ou use `defs` |
| Curva "explode"/some | assíntota ou domínio: defina `y.min/max` e `x.min/max` |
| Gráfico vazio | `labels` e `data` de tamanhos diferentes; container sem altura (use `height`) |
| `percent` mostra 800 % | valor já estava em %: use `num` + `"suffix":"%"` ou divida por 100 |
| Slider "pula" | ajuste `step` (múltiplo de `min`) |
| Animação não roda | só roda com o slide ativo; confira `play.param` = id existente |
