# Contribuindo

Obrigado por querer melhorar a skill! Este guia explica como rodar, testar e estender o projeto.

## Ambiente
- Python 3.9+ (somente stdlib) e Node 18+.
- Para QA visual/e2e: `npm install` e `npx playwright install chromium` (ou defina `PS_CHROMIUM=/caminho/do/chromium`).

```bash
make test         # unitários (Python + Node)       — rápido, sem navegador
make e2e          # ponta a ponta com Playwright
make examples     # valida e recompila examples/*/dist/index.html
make qa           # screenshots de todos os slides dos exemplos (qa/)
make contrast     # contraste WCAG das paletas
```
Todo PR deve passar em `make test`, `make e2e` e deixar `make examples` sem diferenças (o CI confere).

## Princípios (leia antes de propor mudanças)
1. **Runtime sem dependências**: nada de bibliotecas em tempo de execução; o deck é um arquivo único offline. CDN só para opcionais (fontes, KaTeX).
2. **O modelo escreve conteúdo, não motor**: prefira widgets/classes declarativos a pedir que o modelo escreva JavaScript.
3. **Tudo é verificável**: nova regra/recurso → regra no validador, teste e documentação.
4. **Acessibilidade e responsividade não são opcionais**: teclado, foco, `aria`, contraste, mobile.
5. **Só tokens de tema**: nada de cores hexadecimais fixas nos componentes.

## Como estender
| Tarefa | Passos |
|---|---|
| **Paleta** | `assets/palettes.json` (tokens `light`/`dark` + `x4–x6`, `name`, `mood`, `scheme`) → `make contrast` → adicione a linha em `references/01-planning.md` (tabela de humor) → `make examples` |
| **Ícone** | `<symbol id="i-nome" viewBox="0 0 24 24">` em `assets/icons.svg` (traço 2px, sem preenchimento, `currentColor`) → catálogo em `references/05-icons-and-crossrefs.md` (o teste exige os dois). Se derivar de um conjunto de terceiros, registre em `THIRD_PARTY_NOTICES.md` |
| **Widget** | `widgets.js` (+ CSS em `components.css`) → registre em `WIDGETS` e valide a config em `validate_deck.py` → seção `## nome` em `references/04-interactive-widgets.md` → teste e2e/unitário → exemplo |
| **Função matemática** | `FUNCS` em `math.js` → teste em `tests/math.test.cjs` → lista em `references/04` |
| **Idioma da interface** | bloco em `I18N` (`core.js`) com todas as chaves |
| **Mudar o comportamento do Claude** | edite `SKILL.md`/`references/` (veja abaixo) |

## Editando `SKILL.md` e `references/`
- `SKILL.md`: **< 500 linhas**, frontmatter só com `name` e `description` (≤ 1024 caracteres, diga *o que faz* e *quando usar*, com gatilhos em pt e en). `name` = nome da pasta.
- Explique o **porquê** das regras (o modelo generaliza melhor) e evite `SEMPRE/NUNCA` em caixa alta sem justificativa.
- Detalhes longos vão para `references/` (carregamento sob demanda); arquivos > 100 linhas têm `## Sumário`. Todo `references/*.md` deve ser citado no `SKILL.md` (o teste confere).
- Teste mudanças de comportamento com prompts reais: peça 2–3 decks (tema numérico, tema descritivo, tema com marca) e confira
  `validate_deck.py` + `qa_check.cjs` + screenshots. Descreva no PR o que mudou no resultado.

## Estilo
- Python: stdlib, tipagem leve, funções importáveis (os scripts são testados por import). JS: ES2019, sem build, sem dependências, comentários curtos em português.
- Mensagens para o usuário em português (o público-alvo); documentação técnica em português, com resumo em inglês no `README.en.md`.
- Commits: `tipo(escopo): descrição` — `feat(widgets): …`, `fix(engine): …`, `docs: …`, `test: …`, `chore: …`.

## Pull requests
1. Branch a partir de `main`; mudanças focadas.
2. `make test`, `make e2e` e `make examples` passando; `CHANGELOG.md` atualizado em *Não lançado*.
3. Se a UI mudou, anexe screenshots (claro e escuro; desktop e mobile).
4. Preencha o modelo de PR.

## Versionamento e releases
SemVer. Para lançar: atualize a versão em `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` e `CHANGELOG.md`
(o teste `RepoConsistencyTests` exige que coincidam), crie a tag `vX.Y.Z` e a *release* no GitHub. Para distribuir como arquivo `.zip` de skill:
```bash
cd skills && zip -r ../presenter-slides.zip presenter-slides -x "*/__pycache__/*"
```

## Reportando problemas
Use os modelos de *issue*. Inclua o `deck.json`/trecho do `slides.html` que reproduz, navegador/SO e, se possível, a saída de `validate_deck.py`.
