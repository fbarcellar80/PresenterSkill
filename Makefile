# Atalhos de desenvolvimento. Requer Python 3.9+ e Node 18+ (Playwright só para e2e/qa).
SKILL   := skills/presenter-slides
EXAMPLES := $(wildcard examples/*/deck.json)
DECKS   := $(patsubst %/deck.json,%,$(EXAMPLES))

.PHONY: test unit e2e examples validate qa contrast clean

test: unit            ## testes unitários (Python + Node)
unit:
	python3 -m unittest discover -s tests -t .
	node --test tests/math.test.cjs

e2e:                  ## testes de ponta a ponta (precisa de Playwright)
	node tests/e2e.cjs

contrast:             ## valida contraste WCAG das paletas
	python3 $(SKILL)/scripts/contrast.py

validate:             ## valida estaticamente os decks de exemplo
	@for d in $(DECKS); do python3 $(SKILL)/scripts/validate_deck.py $$d || exit 1; done

examples: validate    ## recompila examples/*/dist/index.html
	@for d in $(DECKS); do python3 $(SKILL)/scripts/build_deck.py $$d || exit 1; done

qa: examples          ## renderiza todos os slides dos exemplos (screenshots em qa/)
	@for d in $(DECKS); do node $(SKILL)/scripts/qa_check.cjs $$d/dist/index.html --out qa/$$(basename $$d) || exit 1; done

clean:
	rm -rf qa node_modules
