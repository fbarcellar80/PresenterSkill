# 07 · Qualidade, acessibilidade e entrega

## Fluxo de verificação
```bash
python3 scripts/validate_deck.py <deck>              # 1. estático (rápido) — corrija todos os ✖
python3 scripts/build_deck.py <deck>                 # 2. gera <deck>/dist/index.html
node scripts/qa_check.cjs <deck>/dist/index.html --out <deck>/qa     # 3. renderiza (Playwright)
```
`qa_check.cjs` (requer `npm i -D playwright && npx playwright install chromium`; em ambientes com Chromium já instalado defina
`PS_CHROMIUM=/caminho/chromium`; se o módulo não for encontrado exporte `NODE_PATH`): percorre cada slide em
**1920×1080, 1366×768 e 390×844 × claro/escuro**, falha em erros de console/JS, widgets com erro, rolagem horizontal,
elementos fora da tela e imagens quebradas; **avisa** quando o conteúdo é mais alto que a tela em desktop. Opções:
`--viewports`, `--themes`, `--palette <id>`, `--no-shots`, `--animated` (espera as animações).

**Olhe os screenshots** (ferramenta Read nas PNGs) pelo menos de: capa, 1 slide de cada widget, 1 slide denso, mobile e escuro.
Cheque: título legível, nada cortado, gráfico com eixos e legenda, contraste ok, cores consistentes, sem sobreposição com a barra superior/inferior.

## Checklist final
**Conteúdo**
- [ ] Cada título afirma uma conclusão; uma ideia por slide; ≤ 60 palavras visíveis.
- [ ] Há recurso visual/interativo onde o plano previu; todo número/curva/cálculo é manipulável ou demonstrado.
- [ ] Dados reais têm fonte; dados ilustrativos estão marcados como tal.
- [ ] Ícones "saiba mais" e saltos (`xref`) levam aonde devem; o botão Voltar aparece.
- [ ] Notas do apresentador nos slides principais.

**Design**
- [ ] Paleta coerente com o tema; sem cores fixas; claro **e** escuro revisados.
- [ ] Hierarquia clara (eyebrow → título → lead → conteúdo); 1 ponto focal.
- [ ] Sem rolagem em desktop; mobile legível (390 px).

**Interação e acessibilidade**
- [ ] → ← PgUp PgDn Espaço funcionam; `O` abre a visão geral; `T` troca o tema; `?` lista atalhos.
- [ ] Sliders respondem; quiz dá feedback; abas e legendas operáveis por teclado.
- [ ] `alt` em imagens; `aria-label` em botões só-ícone; contraste ≥ 4,5:1; `lang` correto.
- [ ] Funciona com "reduzir movimento" (o QA usa esse modo por padrão).

## Entrega
- Arquivo: `<deck>/dist/index.html` (autossuficiente). Compartilhe por e-mail/drive/servidor estático/GitHub Pages; funciona via `file://`.
- Fontes e KaTeX usam CDN; sem internet o deck cai para fontes do sistema e texto simples. Para garantir offline total: `--no-fonts` e sem `katex`.
- **PDF**: Chrome → Ctrl/Cmd+P → destino "Salvar como PDF", margens "Nenhuma", ative "Gráficos de plano de fundo". Cada slide vira uma página 16:9;
  widgets saem no estado atual dos sliders.
- **Apresentar**: `F` tela cheia · `N` notas · `B` ou `.` tela preta · `O` pular para um slide · clickers que enviam PgUp/PgDn ou setas funcionam direto.
- **Publicar no GitHub Pages**: coloque o HTML em `docs/` ou na raiz de uma branch `gh-pages` como `index.html`.
- **Artifact (claude.ai)**: se a ferramenta estiver disponível, o arquivo único pode ser publicado; confirme com o usuário antes de compartilhar.

## Solução de problemas
| Sintoma | Provável causa → ação |
|---|---|
| Página em branco | erro de JS: abra o console; rode o `qa_check` (relata a exceção) |
| Widget com caixa vermelha | JSON ou expressão inválida: leia a mensagem, rode `validate_deck.py` |
| Gráfico não aparece | container sem altura ou dados inconsistentes: use `"height":"short"`/`"tall"`, confira `labels`×`data` |
| Setas não mudam de slide | foco dentro de um slider/campo: pressione **Esc**; PgUp/PgDn sempre funcionam |
| Fontes diferentes do esperado | sem internet → fallback do sistema (esperado); use `--no-fonts` para ser determinístico |
| Imagem não aparece | caminho errado (relativo à pasta do deck) ou arquivo > limite de embutir |
| Texto estoura em tela pequena | escreva menos; o CSS já empilha colunas ≤ 900 px; evite larguras fixas em px |
| Tema não muda | `deck.json › mode` fixo? o usuário ainda alterna com **T**; preferência é salva por deck |
