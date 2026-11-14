# Guia de uso

Para quem vai **pedir** apresentações ao Claude e para quem vai **editar/apresentar** o resultado.

## Sumário
1. [Como pedir uma boa apresentação](#1-como-pedir-uma-boa-apresentação)
2. [O que acontece por trás](#2-o-que-acontece-por-trás)
3. [Pedidos de ajuste que funcionam](#3-pedidos-de-ajuste-que-funcionam)
4. [Apresentando](#4-apresentando)
5. [Exportar e compartilhar](#5-exportar-e-compartilhar)
6. [Editar o deck à mão](#6-editar-o-deck-à-mão)
7. [Personalização (cores, fontes, marca)](#7-personalização)
8. [Perguntas frequentes](#8-perguntas-frequentes)

## 1. Como pedir uma boa apresentação
Quanto mais contexto, melhor o plano. Informe (o que não for dito, o Claude assume e declara):

| Informação | Exemplo |
|---|---|
| **Tema e recorte** | "juros compostos, só o básico — sem cálculo de financiamentos" |
| **Público** | "alunos do 9º ano", "diretoria não-técnica", "devs júnior" |
| **Objetivo** | ensinar · convencer · decidir · inspirar |
| **Duração** | "10 minutos" → ~8–12 slides |
| **Idioma e tom** | "português, descontraído" |
| **Marca/cores** | "azul `#0B5FFF`", "logo em `imagens/logo.svg`", "estilo sóbrio" |
| **Conteúdo seu** | cole textos, tabelas, dados; envie imagens (ficam em `imagens/`) |
| **Interações desejadas** | "quero que a turma mexa na taxa de juros", "um quiz no final" |

Exemplos de pedido completo:
> *Crie uma apresentação de 15 min sobre **efeito estufa** para o ensino médio. Quero um gráfico em que o aluno altere a
> concentração de CO₂ e veja a temperatura, um diagrama da atmosfera com pontos clicáveis e um quiz. Paleta de natureza, modo escuro padrão.*

> *Slides de **onboarding** da nossa equipe de suporte (20 min). Marca verde `#00A86B`. Inclua um fluxograma do atendimento,
> 3 números de impacto (vou passar) e checklist final. Em inglês.*

Temas com **números, curvas, probabilidades ou cálculos** rendem os decks mais interativos — diga o que o público deve "descobrir mexendo".

## 2. O que acontece por trás
1. **Briefing** — no máximo uma rodada curta de perguntas (ou nenhuma).
2. **Plano** (`PLAN.md`) — tese, arco narrativo, tabela de slides, recursos gráficos, paleta, saltos/ícones previstos.
3. **Deck** em `deck.json` + `slides.html`.
4. **Validação** (`validate_deck.py`) — JSON, expressões matemáticas, ids, ícones, `alt`, texto demais.
5. **Build** → `dist/index.html` (arquivo único).
6. **QA visual** (se Playwright existir) — screenshots em 3 tamanhos × claro/escuro, erros de layout.
7. **Entrega** — caminho do arquivo, resumo, suposições, atalhos.

## 3. Pedidos de ajuste que funcionam
- "Troque a paleta para `ocean`" / "modo escuro por padrão" / "fonte editorial" → só `deck.json`.
- "Divida o slide 4: está denso" · "Troque o gráfico de barras por linhas" · "Adicione um simulador de X".
- "Inclua um ícone de aprofundamento sobre Y no slide 3" · "No fechamento, ponha links para rever os slides 3 e 5".
- "Traduza para inglês" (ajusta também `lang`, que muda os textos da interface).
- "Cada slide precisa de notas do apresentador."
O Claude edita `slides.html`/`deck.json` e recompila; o `dist/` nunca é editado à mão.

## 4. Apresentando
| Tecla | Ação |
|---|---|
| `→` `↓` `PgDn` `Espaço` `Enter` | próximo slide (ou revela o próximo passo) |
| `←` `↑` `PgUp` `Backspace` | anterior |
| `Home` `End` · `número` + `Enter` | primeiro / último · ir ao slide N |
| `O` ou `G` | visão geral (clique para saltar) |
| `T` · `P` · `S` | tema claro/escuro · trocar paleta · painel de ajustes |
| `N` | notas do apresentador |
| `F` · `B` / `.` | tela cheia · tela preta |
| `?` · `Esc` | lista de atalhos · fechar painéis |
- **Clickers** (apresentadores sem fio) que enviam PgUp/PgDn ou setas funcionam sem configuração.
- Em celular/tablet: deslize para os lados; botões ‹ › no canto.
- Dentro de um **slider**, ←/→ ajustam o valor; **Esc** devolve as setas à navegação (PgUp/PgDn sempre navegam).
- Após clicar num atalho de assunto (`→ slide X`), o botão **Voltar** retorna ao ponto de origem.
- A interface esconde-se após 3,5 s sem mexer o mouse (modo palco).
- Dica de sala: teste claro × escuro no projetor real; telas muito claras favorecem o modo escuro.

## 5. Exportar e compartilhar
- **Arquivo único**: `dist/index.html` — envie por e-mail/drive, abra de pendrive, hospede em qualquer servidor estático.
- **GitHub Pages**: suba o HTML para o repositório e ative *Settings → Pages*.
- **PDF**: abra no Chrome → `Ctrl/Cmd + P` → "Salvar como PDF", margens *Nenhuma*, marque *Gráficos de plano de fundo*. 1 slide por página (16:9).
  Os gráficos saem no estado atual; ajuste os sliders antes se quiser outro cenário.
- **Offline total**: fontes do Google e KaTeX dependem de internet; sem ela o deck usa fontes do sistema. Para ser determinístico: peça "versão 100 % offline" (`--no-fonts`, sem KaTeX).

## 6. Editar o deck à mão
```text
meu-deck/
├── deck.json       título, idioma, paleta, fontes, modo, transição
├── slides.html     os slides (<section class="slide">…)
├── imagens/        arquivos locais (embutidos no build)
├── PLAN.md         plano da apresentação
└── dist/index.html resultado
```
Fluxo: edite `slides.html` → `python3 …/validate_deck.py meu-deck` → `python3 …/build_deck.py meu-deck` → abra `dist/index.html`.
Referência de componentes (copie e cole): [`references/03-slide-layouts.md`](../skills/presenter-slides/references/03-slide-layouts.md) ·
widgets e expressões: [`references/04-interactive-widgets.md`](../skills/presenter-slides/references/04-interactive-widgets.md).
Para decks grandes, divida em `slides/01-intro.html`, `slides/02-conceito.html`… (concatenados em ordem alfabética).

`deck.json` — campos:
| Campo | Valores | Padrão |
|---|---|---|
| `title` (obrigatório), `subtitle`, `author`, `description` | texto | – |
| `lang` | `pt-BR`, `en`, `es`… (idioma da interface e formatos numéricos) | `pt-BR` |
| `palette` | `aurora ocean forest sunset graphite rose amber earth playful` ou id de `palettes_custom` | `aurora` |
| `palettes` | lista de ids oferecidos no seletor | todas |
| `mode` | `auto` `light` `dark` | `auto` |
| `fonts` | `modern editorial friendly technical system` | `modern` |
| `transition` | `slide` `fade` `zoom` `none` | `slide` |
| `katex` | `true` carrega KaTeX (internet) | `false` |
| `offline` | `true` não carrega fontes externas | `false` |
| `id` | chave para salvar preferências do espectador | derivado do título |

## 7. Personalização
- **Cor da marca**: use `palettes_custom` (exemplo em [`references/02-design-system.md`](../skills/presenter-slides/references/02-design-system.md#6-paleta-própria-marca)); o build avisa se o contraste for fraco.
- **Logo**: coloque em `imagens/` e referencie com `<img>` na capa/rodapé (será embutido).
- **Tamanho do texto**: o espectador ajusta em *Ajustes* (A−/A+).
- **Novos widgets/ícones/paletas**: veja [CONTRIBUTING.md](../CONTRIBUTING.md).

## 8. Perguntas frequentes
**Posso abrir no PowerPoint/Keynote?** Não: o resultado é HTML (permite interatividade). Para `.pptx` use a skill de PowerPoint; para impressão/envio use o PDF.
**Funciona sem internet?** Sim (com fontes do sistema). Fontes do Google e KaTeX são opcionais.
**As imagens são buscadas na internet?** Não. O Claude usa SVG autoral ou as imagens que você enviar — nunca inventa links.
**Os dados dos gráficos são reais?** Só os que você fornecer ou que forem calculados pelo modelo matemático; exemplos ilustrativos vêm marcados como tal.
**O que o público vê se o JavaScript estiver desligado?** Uma mensagem pedindo JavaScript — a interatividade depende dele.
**Os sliders não deixam eu navegar!** Pressione `Esc` (ou use `PgUp/PgDn`).
**Posso reutilizar um slide em outro deck?** Sim: copie a `<section>` (e os `<template>` que ela usa) para o outro `slides.html`.
