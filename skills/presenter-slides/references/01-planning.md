# 01 · Planejamento da apresentação

Planejar antes de escrever HTML evita o erro mais comum: slides cheios de texto e sem recurso visual.
O plano é um artefato real (`PLAN.md`), curto o bastante para o usuário ler em 1 minuto.

## Sumário
1. [Briefing: o que descobrir](#1-briefing)
2. [Duração → número de slides](#2-duração--número-de-slides)
3. [Arcos narrativos](#3-arcos-narrativos)
4. [Títulos que afirmam](#4-títulos-que-afirmam)
5. [Mapa de recursos gráficos](#5-mapa-de-recursos-gráficos)
6. [Orçamento de interatividade](#6-orçamento-de-interatividade)
7. [Ícones de aprofundamento e saltos](#7-ícones-de-aprofundamento-e-saltos)
8. [Paleta, fontes e modo](#8-paleta-fontes-e-modo)
9. [Modelo do PLAN.md](#9-modelo-do-planmd)
10. [Exemplo de plano](#10-exemplo-de-plano)

## 1. Briefing
| Pergunta | Se não souber, assuma |
|---|---|
| Tema e recorte (o que fica de fora?) | recorte mais útil para o público |
| Público (nível, o que já sabe) | leigo inteligente |
| Objetivo: informar / ensinar / persuadir / decidir | ensinar |
| Duração e formato (palestra, aula, pitch, auto-estudo) | 10–15 min, apresentado ao vivo |
| Idioma e tom | idioma do pedido; tom claro e envolvente |
| Marca/cores/logo | escolher paleta por humor (§8) |
| Conteúdo/dados/imagens fornecidos | usar tudo que foi fornecido, citando origem |

Dados numéricos: **nunca invente estatísticas "reais"**. Use dados do usuário, cálculos que você pode demonstrar
(fórmulas, simulações) ou marque como "exemplo ilustrativo" / "valores hipotéticos" no próprio slide.

## 2. Duração → número de slides
Regra prática: **1 a 2 minutos por slide de conteúdo**; widgets interativos pedem 2–3 min.
| Duração | Slides (incl. capa e fecho) |
|---|---|
| 5 min (pitch relâmpago) | 5–7 |
| 10 min | 8–12 |
| 20 min | 12–18 |
| 45–50 min (aula) | 20–30 (use `data-section` para agrupar) |
Acima de 30 slides, divida em módulos/decks.

## 3. Arcos narrativos
Escolha um e deixe-o explícito no plano:
- **Problema → Solução → Evidência → Ação** (persuasão, pitch)
- **Gancho → Conceito → Demonstração interativa → Aplicação → Síntese** (ensino de conceito; o mais usado aqui)
- **Concreto → Abstrato** (mostre o caso, depois a regra/fórmula)
- **Passado → Presente → Futuro** (história, tendências)
- **Pergunta → Hipótese → Teste → Conclusão** (ciência, dados)
Todo deck: **capa → (roteiro opcional) → corpo → conclusões acionáveis**. Um slide de "Para levar"
com 3 ideias, no máximo, fecha melhor que "Obrigado".

## 4. Títulos que afirmam
O título de cada slide é a **conclusão**, não o assunto. O corpo é a evidência.
- ✗ "Juros compostos" → ✓ "Juros compostos crescem em curva; os simples, em linha reta"
- ✗ "Resultados" → ✓ "As vendas dobraram no 2º trimestre"
- ✗ "Arquitetura" → ✓ "Três camadas isolam o erro do usuário"
Máx. ~12 palavras. Rótulo curto acima do título (`.eyebrow`) pode dar o tópico.

## 5. Mapa de recursos gráficos
Para **cada ideia do plano**, escolha o recurso pelo tipo de conteúdo:

| Tipo de conteúdo | Recurso | Detalhes |
|---|---|---|
| Função, curva, modelo, relação entre variáveis (física, economia, biologia…) | **`lab`** com `params` + `series` | sliders mudam a curva; `shade` mostra áreas/probabilidades; `markers`/`vlines` destacam pontos |
| Cálculo com entradas (juros, IMC, conversão, dosagem, break-even) | **`lab` sem `series`** (calculadora) | `outputs` + `insight` com frase dinâmica |
| Evolução no tempo / simulação ("o que muda se…") | `lab` com `"play"` (anima um parâmetro) | ex.: onda se propagando, projétil |
| Estatística: distribuição, amostragem, TCL, lei dos grandes números | **`sampler`** e/ou `lab` com `normpdf`/`normcdf` | histograma ao vivo + curva teórica |
| Comparar categorias ou períodos | **`chart`** bar/hbar/stacked/line/area com `switch` | legenda liga/desliga séries |
| Partes de um todo | `chart` donut/pie | máx. 6 fatias; agrupe o resto em "Outros" |
| Correlação entre duas variáveis | `chart` scatter | rótulos de eixo com unidade |
| Processo, fluxo, arquitetura, ciclo | **SVG `diagram`** + `hotspot` ou `.steps` | nós clicáveis abrem o "saiba mais" |
| Sequência histórica / roadmap | `.timeline` (vertical ou `.horizontal`) | |
| Antes × depois / duas versões visuais | `compare` (slider de revelação) | |
| Números de impacto | `.stats` com `.counter` | 3 números no máximo por slide |
| Definição, nuance, fonte, fórmula extra | `info-btn` → painel lateral | mantém o slide limpo |
| Retomar conceito já visto | `xref` / `goto-btn` | botão "Voltar" devolve ao ponto de origem |
| Checar entendimento | `quiz` | 1 por bloco, antes de mudar de assunto |
| Visão de conjunto de itens paralelos | `.cards` com `icon-badge` | 3–4 cards |
| Citação / depoimento | `layout-quote` | |
| Ambiente/ilustração sem foto | SVG autoral (`svg.art`) ou `.media-ph` | veja `06-visuals-media-math.md` |

Heurística: se você escreveu "cresce", "diminui", "depende de", "quanto", "probabilidade" ou "relação" no plano
→ há um `lab`/`chart` esperando para existir.

## 6. Orçamento de interatividade
- Deck de 10 slides: 2–4 com widget (`lab`/`chart`/`sampler`), 1 `quiz` opcional, 3+ `info-btn`/`xref`.
- Não coloque dois widgets pesados no mesmo slide (a atenção se divide); um widget principal + texto de apoio.
- Cada widget responde a **uma pergunta** explícita no `insight` ou no título ("Quanto rende…?", "O que acontece se σ aumenta?").
- Deixe um valor inicial "bonito" nos sliders (que já conte a história sem mexer) e um botão Restaurar (automático).

## 7. Ícones de aprofundamento e saltos
Planeje-os no plano, não no improviso:
- **`info-btn`** (painel "saiba mais"): definições, deduções, fontes, exceções, "por quê?". Cada slide: 0–2.
- **`data-tip`/`.term`**: glossário de 1 frase para jargão.
- **`goto-btn` / `xref`**: quando um slide **retoma ou antecipa** outro ("lembra da regra dos 72?"); anote `slide X → slide Y` na tabela.
- **`hotspot`**: pontos numerados sobre ilustrações/diagramas.
Fechar o deck com `xref`s "rever …" para os conceitos-chave ajuda a revisão.

## 8. Paleta, fontes e modo
Escolha pelo **humor do tema** (detalhes de teoria de cores em `02-design-system.md`):

| Tema / público | Paleta | Fontes |
|---|---|---|
| Tecnologia, produto, startups, dados | `aurora` | `modern` ou `technical` |
| Finanças, saúde, corporativo, confiança | `ocean` | `modern` |
| Sustentabilidade, ciência, natureza, educação | `forest` | `friendly` ou `modern` |
| Marketing, criatividade, eventos, storytelling | `sunset` | `friendly` ou `editorial` |
| Executivo, jurídico, relatórios sóbrios | `graphite` | `modern` ou `editorial` |
| Moda, social, bem-estar, design | `rose` | `editorial` |
| Premium, história, investimentos, gastronomia | `amber` | `editorial` |
| Cultura, arquitetura, alimentos, geografia | `earth` | `editorial` ou `friendly` |
| Infantil/juvenil, jogos, oficinas enérgicas | `playful` | `friendly` |
| Institucional, serviço público, engenharia, normas e relatórios técnicos | `azul_mod` | `technical` ou `modern` |

Modo: `"auto"` (segue o sistema; o espectador troca com `T`). Salas escuras/projetor forte: considere `"dark"` fixo
como ponto de partida — o usuário ainda pode alternar.

## 9. Modelo do PLAN.md
```markdown
# <Título>
**Tese:** …  **Público:** …  **Duração:** … min · **Idioma:** …  **Arco:** …
**Paleta/fontes/modo:** ocean · modern · auto — porque …
**Suposições:** …

| # | id | layout | título-conclusão | conteúdo-chave | recurso gráfico | interação | ícones/saltos |
|---|----|--------|------------------|----------------|-----------------|-----------|---------------|
| 1 | capa | layout-title | … | gancho | SVG autoral (curva) | – | – |
| 2 | … | … | … | … | lab: P×i×n → curvas | sliders | info-btn "juros simples"; goto → #4 |

**Fora do escopo:** …
**Dados/fontes a citar:** …
```

## 10. Exemplo de plano
Tema "Juros compostos" · 10 min · público leigo · arco *gancho → conceito → demonstração → aplicação → síntese*:

| # | id | layout | título-conclusão | recurso | interação |
|---|----|--------|------------------|---------|-----------|
| 1 | capa | title | Juros compostos: o poder do tempo | SVG: curva exponencial × reta | – |
| 2 | impacto | padrão | O tempo trabalha a seu favor — ou contra você | `.stats` + counters | info-btn "taxas equivalentes"; goto → regra72 |
| 3 | simples-vs-compostos | padrão | Simples crescem em reta; compostos, em curva | `lab` 2 séries + marcador | 3 sliders; info-btn |
| 4 | formula | split | Uma fórmula, três ideias | `lab` calculadora | passos `data-step`; xref → #3 |
| 5 | regra72 | padrão | Regra dos 72 | `lab` exato × aproximação | slider de taxa |
| 6 | cenarios | padrão | Pequenas taxas, enormes diferenças | `chart` bar/line/area | legenda interativa |
| 7 | divida | split | Como devedor, a curva trabalha contra você | `chart` donut | passos |
| 8 | aplicacoes | padrão | Onde aparece | `tabs` + cards | abas |
| 9 | quiz | padrão | Você pegou a ideia? | `quiz` | – |
| 10 | fim | closing | Comece cedo, seja constante, fuja das taxas altas | cards + xrefs | revisar |

O deck real correspondente está em `examples/juros-compostos/`.
