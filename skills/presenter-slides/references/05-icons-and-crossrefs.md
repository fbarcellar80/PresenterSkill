# 05 · Ícones, "saiba mais" e referências cruzadas

Ícones servem a duas funções: **ilustrar** (badges, cards, rótulos) e **expandir a ideia** (abrir um aprofundamento ou retomar
outro slide). Todos vêm de um sprite embutido (75 ícones de traço, 24×24, herdam a cor do texto).

## Sumário
[Usar ícones](#usar-ícones) · [Catálogo](#catálogo) · [Saiba mais](#saiba-mais-painel-lateral) · [Dicas rápidas](#dicas-rápidas-glossário) ·
[Saltar entre slides](#saltar-entre-slides) · [Hotspots](#hotspots-em-figuras-e-diagramas) · [Acordeão e abas](#acordeão-e-abas) · [Acessibilidade](#acessibilidade) · [Padrões de uso](#padrões-de-uso)

## Usar ícones
```html
<i data-icon="lightbulb"></i>                                        <!-- inline, no tamanho do texto -->
<span class="icon-badge"><i data-icon="leaf"></i></span>             <!-- selo quadrado colorido (b2, b3 = outras cores) -->
<section class="slide" data-icon="target" …>                         <!-- ícone do slide na visão geral -->
{"title": "Simule", "icon": "calculator", …}                         <!-- ícone no cabeçalho de um widget -->
```
O validador acusa nomes que não existem. Ícone sem sentido óbvio precisa de `aria-label`/texto ao lado.

## Catálogo
| Uso | Nomes |
|---|---|
| Informação e ajuda | `info` `help` `lightbulb` `book` `graduation` `bookmark` `search` `eye` |
| Navegação | `arrow-left` `arrow-right` `arrow-up` `arrow-down` `chevron-left` `chevron-right` `link` `external` `home` `compass` `map-pin` |
| Ações | `play` `pause` `reset` `plus` `minus` `check` `x` `download` `settings` `maximize` `minimize` `grid` `list` `notes` `keyboard` |
| Dados e matemática | `bar-chart` `line-chart` `pie-chart` `trending-up` `activity` `calculator` `sigma` `percent` `database` `layers` |
| Negócios e pessoas | `target` `rocket` `flag` `star` `heart` `users` `user` `briefcase` `dollar` `shield` `lock` `mail` `globe` |
| Ciência e tecnologia | `flask` `cpu` `code` `zap` `battery` `wrench` `thermometer` |
| Natureza e clima | `leaf` `droplet` `sun` `moon` `cloud` `wind` |
| Alertas | `alert` `info` `check` `x` |
| Mídia e tema | `image` `palette` `monitor` `clock` |
Precisa de um ícone que não existe? Use um **SVG autoral** inline (`<svg class="icon">…`) com `stroke="currentColor"`, ou escolha o
mais próximo. Para contribuir novos ícones ao sprite, veja `CONTRIBUTING.md`.

## "Saiba mais": painel lateral
Botão-ícone que abre um painel (gaveta à direita; folha inferior no celular) com conteúdo extra. O painel fecha com **Esc**,
clique fora ou ✕, e o foco retorna ao botão.
```html
<h2>Título do slide <button class="info-btn" data-detail="d-juros" aria-label="O que são juros simples?"></button></h2>

<template id="d-juros">
  <h3>Juros simples</h3>
  <p>Calculados sempre sobre o capital inicial: <code>M = C · (1 + i · n)</code>.</p>
  <a class="xref" data-goto="formula">Ir para a fórmula</a>
</template>
```
- O botão vazio recebe o ícone `info` sozinho; ponha **`aria-label` descritivo**.
- `<template id>` pode ficar em qualquer lugar do slide; `id` único no deck inteiro (use prefixo `d-`).
- O conteúdo aceita títulos, parágrafos, listas, fórmulas, imagens, **links `data-goto`** e outros `data-detail`.
- Use para: definições, deduções, fontes, exceções, "por que isso?", casos extremos. Mantenha ≤ ~80 palavras.

## Dicas rápidas (glossário)
```html
Isso é medido pelo <span class="term" data-tip="Distância típica dos valores até a média.">desvio-padrão</span>.
```
Aparece ao passar o mouse, focar ou tocar. 1 frase. Para mais que isso, use o painel.

## Saltar entre slides
```html
<a class="xref" data-goto="regra72">ver a regra dos 72 →</a>             <!-- chip tracejado dentro do texto -->
<button class="goto-btn" data-goto="formula" aria-label="Ir para a fórmula"></button>   <!-- botão circular só-ícone -->
```
`data-goto` aceita o **id** do slide (recomendado) ou o número (1-based). Após o salto aparece o botão flutuante
**"← Voltar para o slide N"**, que devolve o espectador ao ponto de origem (pilha de retorno; vários saltos empilham).
Boas práticas:
- Antecipar: "você verá a prova no slide X"; retomar: "lembra da curva do slide Y?".
- No fechamento, `xref`s "rever …" para os conceitos-chave.
- Planeje os pares origem → destino no `PLAN.md`; o validador garante que os ids existem.
- Funciona também dentro do painel "saiba mais" e em elementos SVG (`data-goto` em `<g>`).

## Hotspots em figuras e diagramas
Pontos numerados pulsantes sobre uma imagem/SVG; cada um abre um "saiba mais".
```html
<div class="hotspot-layer">                      <!-- position: relative -->
  <svg class="diagram" viewBox="0 0 600 300">…</svg>   <!-- ou <img> -->
  <button class="hotspot" style="--x:50%; --y:12%" data-detail="d-mean" aria-label="Sobre a média">1</button>
  <button class="hotspot" style="--x:62%; --y:62%" data-detail="d-sigma" aria-label="Sobre o desvio-padrão">2</button>
</div>
```
`--x`/`--y` = posição do centro em % da figura. Numere de forma que a sequência narre algo, e repita os números no texto ao lado.
Em SVG puro, qualquer `<g data-detail="id">` também vira clicável (ganha foco e `role="button"` automaticamente).

## Acordeão e abas
`<details class="accordion"><summary>Pergunta</summary>Resposta</details>` para FAQs; widget `tabs` para alternativas paralelas
(ver `04-interactive-widgets.md`). Prefira-os a slides extras de "detalhes".

## Acessibilidade
- Botões só-ícone **sempre** com `aria-label`; elementos não-botão com `data-detail/data-goto/data-tip` recebem `tabindex`/`role` automáticos.
- Tudo é operável por teclado: `Tab` percorre, `Enter`/`Espaço` ativam, `Esc` fecha painéis.
- O painel é `role="dialog"` com título associado; as mudanças de slide são anunciadas a leitores de tela.

## Padrões de uso
| Situação | Recurso |
|---|---|
| Termo técnico novo | `.term` + `data-tip` |
| Fórmula/dedução que alguns querem ver | `info-btn` → `<template>` |
| Conceito já visto que volta a ser usado | `xref`/`goto-btn` para o slide original |
| Diagrama com várias partes | `hotspot`s numerados |
| Fonte/dado de apoio | `info-btn` com a referência |
| Resumo final | cards com `xref` "rever …" |
