# 06 · Imagens, ilustrações SVG, diagramas e fórmulas

Imagem boa **prova** um argumento; imagem decorativa só ocupa espaço. Ordem de preferência:
1. **Diagrama/ilustração SVG autoral** (nítido em qualquer tela, segue o tema claro/escuro, zero licenciamento).
2. **Gráfico interativo** (`lab`/`chart`) quando o conteúdo é quantitativo.
3. **Foto/imagem fornecida pelo usuário** (arquivo local ou URL dele).
4. Fotos externas: só se o usuário pedir e você puder **verificar** a URL/licença — senão use SVG ou `.media-ph`.
Nunca invente URLs de imagens. Nunca use imagens de pessoas reais sem o usuário fornecê-las.

## Sumário
[Imagens](#imagens) · [SVG autoral](#svg-autoral-que-respeita-o-tema) · [Receitas de diagrama](#receitas-de-diagrama) · [Fórmulas](#fórmulas-katex) · [Fundos](#fundos-e-atmosfera)

## Imagens
```html
<figure class="media frame">
  <img src="imagens/painel-solar.jpg" alt="Painel solar sobre telhado ao entardecer" loading="lazy">
  <figcaption>Foto: autor · licença</figcaption>
</figure>
```
- Coloque os arquivos em `<deck>/imagens/`. O **build embute em base64** (até 2,5 MB cada; ajuste com `--max-embed-kb`), mantendo o deck em 1 arquivo.
  Comprima antes (JPG/WebP ≤ 1600 px de largura).
- `alt` descreve **o que a imagem mostra para o argumento**, não "imagem de…". O validador exige `alt` (use `alt=""` só em decoração pura).
- `figcaption` com crédito/fonte quando aplicável. Proporção constante em grades (`aspect-ratio` via CSS inline se precisar).
- Imagem de fundo suave: `<img class="bg-image" src="…" alt=""><div class="bg-scrim"></div>` dentro do `<section>` (fora de `.slide-body`).
- Sem imagem disponível: `<div class="media-ph"><i data-icon="image"></i></div>` (degradê da paleta) ou SVG.

## SVG autoral que respeita o tema
Regras: `viewBox` sem `width/height` fixos; **cores só via variáveis** (`var(--accent)`) ou classes `dg-*`; texto em `<text>` com `class`
ou `style="font:700 15px var(--font-head);fill:var(--text)"`; `role="img"` + `aria-label` descritivo.

Classes de diagrama (dentro de `<svg class="diagram">`):
| Classe | Uso |
|---|---|
| `dg-node` (+ `a1` `a2` `a3`) | retângulo/círculo de nó (neutro ou colorido por acento) |
| `dg-fill1/2/3` | preenchimentos sólidos nos acentos |
| `dg-edge` (+ `a1`, `dash`) | linha/seta; `marker-end="url(#ps-arrow)"` (cinza) ou `url(#ps-arrow-accent)` |
| `dg-flow` | tracejado animado (fluxo de dados/energia) |
| `dg-title`, `dg-sub` | texto de título / secundário |
| `on-accent` | texto sobre `dg-fill*` |
Para `svg.art` (ilustração livre) use `figure.media`. Gradientes: `<stop style="stop-color:var(--accent)"/>`.

## Receitas de diagrama
**Fluxo horizontal de 3 etapas**
```html
<svg class="diagram" viewBox="0 0 720 160" role="img" aria-label="Entrada, processamento e saída">
  <g data-detail="d-in"><rect class="dg-node a1" x="10" y="40" width="190" height="80" rx="14"/><text class="dg-title" x="105" y="86" text-anchor="middle">Entrada</text></g>
  <path class="dg-edge a1 dg-flow" d="M200 80H260" marker-end="url(#ps-arrow-accent)"/>
  <rect class="dg-node a2" x="265" y="40" width="190" height="80" rx="14"/><text class="dg-title" x="360" y="86" text-anchor="middle">Processo</text>
  <path class="dg-edge a1 dg-flow" d="M455 80H515" marker-end="url(#ps-arrow-accent)"/>
  <rect class="dg-node a3" x="520" y="40" width="190" height="80" rx="14"/><text class="dg-title" x="615" y="86" text-anchor="middle">Saída</text>
</svg>
```
**Ciclo** (3–5 nós em círculo com setas curvas `d="M… A… "`), **pirâmide** (polígonos `dg-node` empilhados), **camadas** (retângulos
empilhados com `a1/a2/a3`), **gráfico ilustrativo** (path + área com gradiente, como na capa de `examples/juros-compostos`),
**anatomia** (figura + `hotspot`s, como em `examples/normal-distribution`). Torne partes clicáveis com `data-detail`/`data-goto`.
Mantenha ≤ 7 nós por diagrama e ≥ 13 px de texto na escala do `viewBox`.

## Fórmulas (KaTeX)
Fórmulas simples: `<p class="formula">M = C · (1 + i)<sup>n</sup></p>` (sem dependências).
Fórmulas tipográficas: em `deck.json` → `"katex": true` (carrega KaTeX do cdnjs; requer internet) e escreva:
```html
<p class="formula">$$ M = C\,(1+i)^{n} $$</p>     <!-- bloco -->
A área é \( \int_a^b f(x)\,dx \).                  <!-- inline -->
```
Delimitadores: `$$…$$`, `\[…\]`, `\(…\)`. Sem internet o texto cru permanece legível — por isso prefira também uma versão simples quando o deck
precisar funcionar 100 % offline. Valores calculados ao vivo ficam em `outputs`/`insight` dos widgets, não em KaTeX.

## Fundos e atmosfera
`data-bg="grid|dots|plain"` no slide; capas/seções/fechos já têm malha de gradientes. Evite foto de fundo em slides de conteúdo (compete com o texto);
se usar, mantenha `.bg-scrim` e contraste ≥ 4,5:1.
