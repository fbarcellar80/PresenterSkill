# 02 · Sistema de design (cores, tipografia, UX)

Tudo é governado por **variáveis CSS** (tokens). Trocar paleta/modo/fonte não exige reescrever slides — por isso
**nunca use cores hexadecimais fixas** em slides; use `var(--accent)`, `var(--text)`, `var(--surface)` etc.

## Sumário
1. [Tokens](#1-tokens) · 2. [Teoria de cores → paletas](#2-teoria-de-cores--paletas) · 3. [Regra 60-30-10](#3-regra-60-30-10)
4. [Contraste e acessibilidade](#4-contraste-e-acessibilidade) · 5. [Modo claro/escuro](#5-modo-claroescuro)
6. [Paleta própria (marca)](#6-paleta-própria-marca) · 7. [Tipografia](#7-tipografia) · 8. [Espaço, ritmo e movimento](#8-espaço-ritmo-e-movimento)
9. [Responsividade](#9-responsividade) · 10. [Boas práticas de UI/UX](#10-boas-práticas-de-uiux) · 11. [Anti-padrões](#11-anti-padrões)

## 1. Tokens
| Token | Uso |
|---|---|
| `--bg` | fundo do slide |
| `--surface`, `--surface2` | cartões/painéis; superfície secundária (campos, saídas) |
| `--text`, `--muted` | texto principal; texto de apoio (legendas, rótulos) |
| `--border` | linhas, grades, divisórias |
| `--accent` | cor primária: títulos de destaque, links, botões, 1ª série dos gráficos |
| `--accent2`, `--accent3` | cores de apoio (UI harmônica); badges, ícones, degradês |
| `--on-accent` | texto sobre `--accent` |
| `--c1…--c6` | **sequência para séries de gráficos** (accent, contraste quente/frio, accent2, …) |
| `--good --warn --bad` | status (sucesso/atenção/erro) |
Variáveis de forma: `--r-s/m/l` (raios), `--shadow-s/m`, `--gap`, `--pad`. Tipografia: `--font-head/body/mono`.

## 2. Teoria de cores → paletas
As paletas implementam os esquemas clássicos de harmonia (os mesmos que guias de web design como o da Hostinger
apresentam). Escolha o **esquema** pela intenção e depois a paleta:

| Esquema | Ideia | Efeito | Paletas |
|---|---|---|---|
| **Monocromático** | variações de 1 matiz | sóbrio, coeso, elegante | `graphite` (neutra + 1 destaque), `amber` |
| **Análogo** | matizes vizinhos na roda | suave, natural, harmonioso | `aurora`, `ocean`, `forest`, `sunset` |
| **Complementar** | matizes opostos | contraste forte, energia | `rose` (rosa ↔ ciano), partes de `sunset` |
| **Tríade** | 3 matizes equidistantes | vivo, lúdico | `playful` (azul · vermelho · amarelo) |
| **Terroso/natural** | tons de terra | acolhedor, artesanal | `earth` |
Detalhe importante para **gráficos**: matizes análogos são pouco distinguíveis entre si. Por isso a sequência `--c1…c6`
alterna a cor de marca com cores de contraste (ex.: azul + âmbar + teal + verde + índigo + vermelho). Para 2 séries, deixe
o padrão (c1 + c2 já contrastam). Para destacar uma série entre várias, use `accent` nela e `muted` nas demais.

Psicologia resumida: azul = confiança/tecnologia/finanças · verde = natureza/crescimento/saúde · laranja/magenta = energia/criatividade ·
neutros = seriedade/clareza · dourado/âmbar = valor/tradição · rosa = cuidado/moda · terracota = calor/cultura.

## 3. Regra 60-30-10
- **60 %** fundo e superfícies (`--bg`, `--surface`) — calma visual;
- **30 %** texto e estruturas (`--text`, `--muted`, `--border`);
- **10 %** destaque (`--accent` + apoio) — só no que importa: 1 palavra no título (`.grad`/`mark`), botões, a série principal.
Se tudo está colorido, nada se destaca.

## 4. Contraste e acessibilidade
As paletas são validadas por script (`scripts/contrast.py`, também no CI):
texto ≥ 7:1 · texto de apoio, links e cores de destaque ≥ 4,5:1 · cores de gráfico ≥ 3:1 sobre os dois fundos.
- Não transmita informação **só por cor** (use rótulos, formas, tracejado).
- Alvos de toque ≥ ~40 px; foco visível em tudo (`:focus-visible`); `alt` em imagens; `aria-label` em botões só-ícone.
- `prefers-reduced-motion` é respeitado automaticamente; o usuário também pode desligar animações em Ajustes.
- Rode `python3 scripts/contrast.py` ao criar/alterar paletas.

## 5. Modo claro/escuro
- `deck.json`: `"mode": "auto" | "light" | "dark"`. `auto` segue o sistema. O espectador alterna com **T** ou em *Ajustes*; a escolha fica salva.
- Cada paleta tem tokens próprios para claro e escuro (não é só inverter): no escuro, acentos ficam mais claros e as superfícies ganham elevação.
- SVG/ilustrações: pinte com `var(--…)`/classes `dg-*` para adaptar-se; teste os dois modos (o `qa_check` faz).
- Sombras são sutis no escuro; sobreposições usam `color-mix` com tokens.

## 6. Paleta própria (marca)
Em `deck.json`:
```json
{
  "palette": "minhamarca",
  "palettes_custom": {
    "minhamarca": {
      "name": "Minha Marca", "mood": "institucional",
      "x4": "#C46205", "x5": "#059669", "x6": "#E11D48",
      "light": {"bg":"#F7F8FA","surface":"#FFFFFF","surface2":"#EDEFF3","text":"#14161C","muted":"#505564","border":"#DCDFE6",
                "accent":"#0B5FFF","accent2":"#0F766E","accent3":"#A21CAF","onAccent":"#FFFFFF"},
      "dark":  {"bg":"#0D0F14","surface":"#171A22","surface2":"#20242F","text":"#F1F3F7","muted":"#A8AEBD","border":"#2C313F",
                "accent":"#6EA0FF","accent2":"#2DD4BF","accent3":"#E879F9","onAccent":"#0D0F14"}
    }
  }
}
```
O build avisa se algum par de cores não atingir os mínimos de contraste. `x4–x6` são cores de gráfico que servem nos dois fundos
(luminância média). Se o usuário só tem 1 cor de marca: use-a como `accent` (claro: tom escuro dela; escuro: tom claro) e herde o resto de `graphite`.

### Logo da marca
Em `deck.json`: `"logo": {"light": "imagens/logo-azul.png", "dark": "imagens/logo-branca.png", "alt": "Marca"}` (ou só um caminho).
O build embute os arquivos uma vez e o motor põe a logo na barra superior de todos os slides, trocando a versão conforme o tema
(claro/escuro/auto). Use PNG/SVG com fundo transparente: a versão `light` na cor da marca, a `dark` em branco. Em slides
(capa, fecho) repita o par de imagens: `<img class="logo-light" src="…" alt="Marca"><img class="logo-dark" src="…" alt="Marca">` —
a classe mostra só a versão do tema atual.

## 7. Tipografia
`deck.json` → `"fonts"`:
| Valor | Títulos / Corpo | Personalidade |
|---|---|---|
| `modern` (padrão) | Space Grotesk / Inter | tecnologia, produto, geral |
| `editorial` | Playfair Display / Source Sans 3 | cultura, premium, narrativa |
| `friendly` | Poppins / Nunito | educação, comunidade, lúdico |
| `technical` | Sora / IBM Plex Sans (+ JetBrains Mono) | engenharia, dados, ciência |
| `system` | fontes do sistema | zero rede, máxima velocidade |
As fontes vêm do Google Fonts (com fallback do sistema). Para uso 100 % offline: `build_deck.py --no-fonts` ou `"offline": true`.
Escala (em `rem`, que acompanha a tela): `h1 3.3` · `h2 2` · `h3 1.3` · lead `1.28` · corpo `1`. Peso 700–800 em títulos, 400–600 no corpo.
Nunca abaixo de `0.8rem` em informação importante. Máximo ~65 caracteres por linha (`.lead` já limita).
Números em tabelas e métricas usam `font-variant-numeric: tabular-nums` (já aplicado em `.stat`, `.out`, `table.data`).

## 8. Espaço, ritmo e movimento
- Espaço em branco é design: deixe respirar; 1 ponto focal por slide. Alinhamento consistente à esquerda (centro só em capa/seções/fecho).
- Hierarquia: eyebrow → título → lead → conteúdo. No máximo 3 níveis de tamanho por slide.
- Movimento com propósito: entrada em cascata (`data-anim`), revelação por `data-step`, curvas que se desenham. Sem piscar, sem loops longos.
- Transições entre slides: `"transition": "slide" | "fade" | "zoom" | "none"` em `deck.json`.

## 9. Responsividade
- A escala de fonte usa `min(1.4vw, 2.5vh)`: em projetor 16:9 o texto ocupa bem a tela; em janelas altas/estreitas não estoura.
- ≤ 900 px: grades viram 1 coluna; `.steps` e `.timeline.horizontal` empilham; o slide pode rolar na vertical (celular). Deslizar horizontalmente muda de slide.
- Em desktop o conteúdo **deve caber sem rolar** (o `qa_check` avisa).
- Gráficos redesenham com o container (ResizeObserver) e mantêm o texto legível.

## 10. Boas práticas de UI/UX
- **Título-conclusão**, 1 ideia por slide, ≤ 60 palavras. Exemplos e visuais antes de definições abstratas.
- **Progressive disclosure**: o básico no slide; o resto sob demanda (`info-btn`, `data-step`, abas, acordeão).
- **Feedback imediato**: sliders atualizam gráfico e frase; quiz responde na hora; hover/toque mostra valores.
- **Affordances claras**: botões com ícone + rótulo; dicas (`data-tip`) para jargão; "Voltar" após saltos.
- **Consistência**: mesmo padrão de widget, mesma ordem eyebrow/título, mesma paleta em todo o deck.
- **Orientação**: contador, barra de progresso, seção no topo, visão geral (`O`).
- **Modo palco**: interface some após 3,5 s sem mexer o mouse; `B`/`.` escurece a tela; `N` mostra notas.

## 11. Anti-padrões
✗ Parágrafos longos · ✗ listas de 8+ itens · ✗ 3+ cores de destaque competindo · ✗ gráfico 3D/pizza com 10 fatias ·
✗ texto sobre imagem sem scrim · ✗ cores fixas em hex · ✗ widget sem título/eixos · ✗ animação que atrasa a leitura ·
✗ fotos genéricas de banco de imagens sem relação com o argumento · ✗ slide que só diz "Obrigado".
