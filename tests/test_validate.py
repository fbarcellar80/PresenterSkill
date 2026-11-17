import json
import tempfile
import unittest
from pathlib import Path

from tests.helpers import EXAMPLES, ROOT
import validate_deck
from tests.test_build import make_deck


def run(slides: str, meta=None):
    with tempfile.TemporaryDirectory() as t:
        d = make_deck(Path(t) / "d", meta or {"title": "T"}, slides)
        return validate_deck.validate(d)


def widget(cfg, kind="lab"):
    return f'<section class="slide" id="s"><h2>T</h2><div class="widget" data-widget="{kind}"><script type="application/json">{json.dumps(cfg)}</script></div></section>'


class ValidateTests(unittest.TestCase):
    def test_examples_and_fixtures_are_clean(self):
        for d in [*sorted(p for p in EXAMPLES.iterdir() if (p / "deck.json").is_file()), ROOT / "tests" / "fixtures" / "recipes"]:
            with self.subTest(deck=d.name):
                errors, warnings, n = validate_deck.validate(d)
                self.assertEqual(errors, [])
                self.assertGreater(n, 3)

    def test_popup_target_and_glossary_are_checked(self):
        e, _, _ = run('<section class="slide" id="s"><h2>T</h2><button data-popup="nope">x</button></section>')
        self.assertTrue(any("data-popup" in m for m in e), e)
        e, _, _ = run('<section class="slide" id="s"><h2>T</h2><button data-popup="p">x</button><template id="p" data-title="P"><p>ok</p></template></section>')
        self.assertFalse([m for m in e if "data-popup" in m], e)
        e, _, _ = run('<section class="slide" id="s"><h2>T</h2></section>', {"title": "T", "glossary": {"LV": 3}})
        self.assertTrue(any("glossary" in m for m in e), e)

    def test_invalid_json_in_widget(self):
        e, _, _ = run('<section class="slide" id="s"><h2>T</h2><div class="widget" data-widget="lab"><script type="application/json">{"a":,}</script></div></section>')
        self.assertTrue(any("JSON inválido" in x for x in e))

    def test_unknown_widget_and_missing_config(self):
        e, _, _ = run('<section class="slide" id="s"><h2>T</h2><div class="widget" data-widget="foo"></div><div class="widget" data-widget="chart"></div></section>')
        self.assertTrue(any("desconhecido" in x for x in e))
        self.assertTrue(any("sem <script" in x for x in e))

    def test_expression_errors_use_runtime_parser(self):
        e, _, _ = run(widget({"params": [{"id": "a", "min": 0, "max": 1}], "series": [{"expr": "a*y+1"}], "outputs": [{"label": "z", "expr": "1+"}]}))
        self.assertTrue(any("Variável desconhecida" in x for x in e), e)
        self.assertTrue(any("outputs[0]" in x for x in e), e)

    def test_def_bodies_and_insight_are_checked(self):
        e, _, _ = run(widget({"params": [{"id": "a", "min": 0, "max": 1}], "defs": {"f": "a*zz"}, "series": [{"expr": "f(x)"}], "insight": "valor {a+qq|num}"}))
        self.assertTrue(any("zz" in x for x in e), e)
        self.assertTrue(any("qq" in x for x in e), e)

    def test_valid_expressions_pass(self):
        cfg = {"params": [{"id": "n", "min": 1, "max": 9}], "defs": {"f": "x^2", "g(x,y)": "x*y"}, "x": {"min": "-n", "max": "n"},
               "series": [{"expr": "f(x)+g(x,n)+sum(k,k,1,n)+deriv(f,x)+integ(f,0,1)+if(x>0,1,2)+normcdf(x)"}], "outputs": [{"label": "a", "expr": "comb(n,2)+pmt(0.01,n,100)"}]}
        e, _, _ = run(widget(cfg))
        self.assertEqual(e, [])

    def test_chart_and_quiz_rules(self):
        e, _, _ = run(widget({"type": "bar", "labels": ["a", "b"], "series": [{"label": "s", "data": [1]}]}, "chart"))
        self.assertTrue(any("valores" in x for x in e))
        e, _, _ = run(widget({"question": "?", "options": [{"text": "a"}, {"text": "b"}]}, "quiz"))
        self.assertTrue(any("correct" in x for x in e))
        e, _, _ = run(widget({"type": "donut", "labels": ["a"], "series": [{"data": [1]}]}, "chart"))
        self.assertEqual(e, [])

    def test_refs_ids_icons_images(self):
        html = ('<section class="slide" id="a"><h2>A</h2><i data-icon="foguete"></i><img src="x.png"><a data-goto="zzz">x</a><a data-goto="2">ok</a>'
                '<button data-detail="nada"></button></section><section class="slide" id="a"><h2>B</h2></section>')
        e, _, _ = run(html)
        for frag in ("ícone inexistente", "sem atributo alt", "não encontrada", 'data-goto="zzz"', "data-detail=\"nada\"", "duplicado"):
            self.assertTrue(any(frag in x for x in e), f"faltou: {frag}\n{e}")
        self.assertFalse(any('data-goto="2"' in x for x in e))

    def test_detail_template_found(self):
        html = '<section class="slide" id="a"><h2>A</h2><button class="info-btn" data-detail="d1"></button><template id="d1"><h3>x</h3></template></section>'
        e, _, _ = run(html)
        self.assertEqual(e, [])

    def test_warnings(self):
        words = " ".join(["palavra"] * 130)
        slides = "".join(f'<section class="slide" id="s{i}"><h2>T{i}</h2><p>{words}</p><ul>{"<li>x</li>" * 8}</ul></section>' for i in range(4))
        _, w, _ = run(slides)
        self.assertTrue(any("texto demais" in x for x in w))
        self.assertTrue(any("mais de 6 itens" in x for x in w))
        self.assertTrue(any("só com texto" in x for x in w))
        self.assertTrue(any("nenhum widget" in x for x in w))
        self.assertTrue(any("notas" in x for x in w))

    def test_deck_json_problems(self):
        e, _, _ = run('<section class="slide" id="a"><h2>A</h2></section>', {"palette": "nope", "fonts": "x", "mode": "y"})
        self.assertTrue(any("title" in x for x in e) and any("palette" in x for x in e) and any("fonts" in x for x in e) and any("mode" in x for x in e))

    def test_no_slides(self):
        e, _, n = run("<p>sem sections</p>")
        self.assertEqual(n, 0)
        self.assertTrue(e)

    def test_cli_exit_codes(self):
        self.assertEqual(validate_deck.main([str(EXAMPLES / "juros-compostos")]), 0)
        with tempfile.TemporaryDirectory() as t:
            d = make_deck(Path(t) / "d", {"title": "T"}, '<section class="slide" id="a"><h2>A</h2><a data-goto="x"></a></section>')
            self.assertEqual(validate_deck.main([str(d)]), 1)


if __name__ == "__main__":
    unittest.main()
