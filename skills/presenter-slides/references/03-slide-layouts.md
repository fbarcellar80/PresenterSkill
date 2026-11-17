# 03 · Catálogo de layouts e componentes

Copie o trecho, troque o conteúdo. Tudo já é responsivo e funciona em claro/escuro.
Todo slide: `<section class="slide [layout-…]" id="kebab-id" data-title="Título curto" data-icon="nome" data-section="Seção">`.
O motor envolve o conteúdo em `.slide-body` automaticamente (centralizado, largura máx. ~86 rem).
Notas do apresentador: `<aside class="notes">…</aside>` (tecla **N**). Ícones: `<i data-icon="nome"></i>`.

## Sumário
[Atributos](#atributos-do-slide) · [Capa](#capa) · [Seção](#seção-divisória) · [Conteúdo + visual](#conteúdo--visual-split) ·
[Colunas](#colunas) · [Cards](#cards) · [Números de impacto](#números-de-impacto) · [Etapas](#etapas-processo) · [Linha do tempo](#linha-do-tempo) ·
[Comparação](#comparação) · [Destaque grande](#número-gigante) · [Citação](#citação) · [Tabela](#tabela) · [Código/fórmula](#código-e-fórmula) ·
[Figura](#figura-com-legenda) · [Fechamento](#fechamento) · [Utilitários](#utilitários) · [Animação e passos](#animação-e-passos)

## Atributos do slide
| Atributo | Função |
|---|---|
| `id` | alvo de `data-goto` (use kebab-case) |
| `data-title` | nome na visão geral / título da aba |
| `data-icon` | ícone na visão geral (nomes em `05-icons-and-crossrefs.md`) |
| `data-section` | rótulo no topo (propaga aos slides seguintes até mudar) |
| `data-bg` | `plain` (sem fundo decorativo), `grid`, `dots` (padrão: malha de gradientes) |
| `class` | `layout-title`, `layout-section`, `layout-closing`, `layout-big-stat`, `layout-quote` |

## Capa
```html
<section class="slide layout-title" id="capa" data-title="Capa" data-icon="rocket" data-section="Introdução">
  <div class="slide-body">
    <span class="eyebrow" data-anim="up">Área · Evento · 2026</span>
    <h1 data-anim="up"><span class="grad">Título forte</span> e subtítulo curto</h1>
    <p class="lead" data-anim="up">Uma promessa em 1–2 linhas.</p>
    <div class="meta" data-anim="up"><span><i data-icon="users"></i> Autor</span><span><i data-icon="clock"></i> 10 min</span></div>
  </div>
</section>
```
Com ilustração à direita: envolva texto e `<figure class="media">` em `<div class="split wide-visual">` (veja `examples/juros-compostos`).
Com **foto da organização** que se dissolve no fundo (largura da tela, sem moldura): ponha, dentro do `<section class="slide layout-title">` e antes do `.slide-body`,
`<img class="cover-photo" src="imagens/sede.jpg" alt="…"><div class="cover-veil"></div>`. O texto fica à esquerda e, no celular, a foto desce para a base.

## Seção (divisória)
```html
<section class="slide layout-section" id="parte-2" data-title="Parte 2" data-section="Parte 2">
  <div class="slide-body">
    <div class="section-num" data-anim="up">02</div>
    <h2 class="grad" data-anim="up">Título da seção</h2>
    <p class="lead">Uma frase que antecipa o que vem.</p>
  </div>
</section>
```

## Conteúdo + visual (split)
```html
<section class="slide" id="conceito" data-title="Conceito" data-section="Conceito">
  <div class="slide-head"><span class="eyebrow">Conceito</span><h2>Título que afirma a conclusão</h2></div>
  <div class="split">                       <!-- .reverse inverte; .wide-visual dá mais espaço ao visual -->
    <div class="stack">
      <p class="lead">Explicação curta.</p>
      <ul class="bullets"><li data-step>Ponto 1</li><li data-step>Ponto 2</li><li data-step>Ponto 3</li></ul>
    </div>
    <figure class="media frame"><svg class="art" viewBox="0 0 400 260" role="img" aria-label="…">…</svg><figcaption>Fonte/legenda</figcaption></figure>
  </div>
</section>
```
`.split` é 2 colunas (texto | visual); no celular empilha. Use `.align-center` para centralizar verticalmente.

## Colunas
`.cols` (2), `.cols-3`, `.cols-4`. Ótimo para comparar ou listar blocos de mesmo peso.
```html
<div class="cols-3"><div class="stack"><h3>A</h3><p>…</p></div> … </div>
```

## Cards
```html
<div class="cards">   <!-- auto-fit; entra em cascata; .hover levanta ao passar o mouse; .accent = card colorido; .glass = translúcido -->
  <div class="card hover">
    <h3><span class="icon-badge"><i data-icon="leaf"></i></span> Título</h3>
    <p>Descrição de 1–2 linhas.</p>
  </div>
  <div class="card accent"><h3>Destaque</h3><p>Card com fundo de cor.</p></div>
</div>
```
`icon-badge` variantes: `b2`, `b3` (cores de apoio). Badges/chips: `<span class="badge">rótulo</span>` (`b2`, `b3`).

## Números de impacto
```html
<div class="stats">
  <div class="stat">
    <span class="value"><span class="counter" data-to="1250" data-format="compact" data-suffix="+">1,3 mil+</span></span>
    <span class="label">clientes atendidos</span>
    <span class="delta">▲ 18% vs. ano anterior</span>   <!-- .delta.down para negativo -->
  </div>
  …
</div>
```
`counter`: `data-to`, `data-from`, `data-format` (`num:1`, `int`, `currency:0`, `percent`, `compact`), `data-prefix`, `data-suffix`, `data-duration` (ms). O texto interno é o valor final (fallback/impressão).

## Etapas (processo)
```html
<ol class="steps">
  <li><h4>Coletar</h4><p>Descrição curta.</p></li>
  <li><h4>Analisar</h4><p>…</p></li>
  <li><h4>Decidir</h4><p>…</p></li>
</ol>
```
Máx. 5 etapas lado a lado (empilha no celular). Para fluxos com ramificações, use diagrama SVG.

## Linha do tempo
```html
<ul class="timeline">              <!-- + class="horizontal" para a versão em linha -->
  <li><span class="when">1969</span><h4>Marco</h4><p>Descrição.</p></li>
</ul>
```

## Comparação
Duas colunas com cards, ou tabela (`table.data`). Para "antes × depois" visual use o widget `compare`.
```html
<div class="cols">
  <div class="card"><h3>Opção A</h3><ul class="checklist"><li>Vantagem</li></ul></div>
  <div class="card"><h3>Opção B</h3><ul class="checklist"><li>Vantagem</li></ul></div>
</div>
```

## Número gigante
```html
<section class="slide layout-big-stat" id="dado" data-title="O dado">
  <div class="slide-body center">
    <span class="eyebrow">Em 2025</span>
    <div class="big grad"><span class="counter" data-to="87" data-suffix="%">87%</span></div>
    <p class="lead">dos usuários preferem …</p>
  </div>
</section>
```

## Citação
```html
<section class="slide layout-quote" id="citacao" data-title="Citação">
  <div class="slide-body"><blockquote>“A melhor maneira de prever o futuro é criá-lo.”<cite>— Peter Drucker (atribuída)</cite></blockquote></div>
</section>
```
Só cite frases/fontes que você tem certeza; senão, parafraseie ou peça a fonte ao usuário.

## Tabela
```html
<table class="data">
  <thead><tr><th>Plano</th><th class="num">Preço</th></tr></thead>
  <tbody><tr><td>Básico</td><td class="num">R$ 29</td></tr></tbody>
</table>
```
≤ 6 linhas × 5 colunas. Mais que isso → gráfico ou resumo.

## Código e fórmula
```html
<p class="formula">M = C · (1 + i)<sup>n</sup></p>        <!-- texto simples, monoespaçado -->
<pre><code>def f(x):\n    return x ** 2</code></pre>
```
Para que cada termo mostre o significado ao passar o mouse, use `.formula` (bloco) ou `<span class="fx">` (em linha) + `glossary` no `deck.json` (veja `05-icons-and-crossrefs.md`).
Para fórmulas tipográficas completas ative KaTeX (`"katex": true` em `deck.json`) e escreva `$$ \int_a^b f(x)\,dx $$` ou `\( x^2 \)`. Veja `06-visuals-media-math.md`.

## Figura com legenda
```html
<figure class="media frame">
  <img src="imagens/foto.jpg" alt="Descrição objetiva da imagem">
  <figcaption>Crédito/fonte</figcaption>
</figure>
```
Variantes: `.frame` (moldura), `.contain` (não corta). Imagens locais são embutidas pelo build. Sem imagem? `<div class="media-ph"><i data-icon="image"></i></div>`.

## Fechamento
```html
<section class="slide layout-closing" id="fim" data-title="Conclusões" data-section="Fechamento">
  <div class="slide-body">
    <span class="eyebrow">Para levar</span>
    <h2 class="grad">A frase que você quer que lembrem</h2>
    <div class="cards">…3 cards com xref "rever …"…</div>
    <p class="muted">Contato · link · QR</p>
  </div>
</section>
```

## Utilitários
| Classe | Efeito |
|---|---|
| `.lead` / `.muted` / `.small` | texto de abertura / apoio / pequeno |
| `.grad` | texto com degradê dos acentos (use em 1–3 palavras) |
| `mark` ou `.hl` | marca-texto sutil |
| `.center` | centraliza texto e itens (capas, números) |
| `.stack` / `.stack.tight` | coluna com espaçamento |
| `.row-wrap` | linha que quebra (chips, botões) |
| `.callout` (`.warn` `.good` `.bad`) | caixa de destaque com ícone: `<div class="callout"><i data-icon="lightbulb"></i><p>…</p></div>` |
| `.checklist` / `.bullets` | listas estilizadas |
| `details.accordion` | acordeão nativo: `<details class="accordion"><summary>Pergunta</summary>Resposta</details>` |
| `.btn` / `.btn.primary` | botões (use só dentro de widgets ou com `data-goto`) |
| `kbd` | tecla: `<kbd>O</kbd>` |

## Animação e passos
- **Entrada**: `data-anim="up|left|right|zoom"`; atraso extra: `style="--delay:300ms"`. Grades `.cards .stats .steps .timeline .stagger` animam em cascata sozinhas.
- **Passos** (revelar com →): `data-step` em qualquer elemento. Números iguais aparecem juntos: `data-step="1"`, `data-step="2"`. Sem número = ordem do documento. Use para listas e para construir um raciocínio; **não** em todo slide.
- **Impressão/PDF**: tudo aparece, sem animação.
