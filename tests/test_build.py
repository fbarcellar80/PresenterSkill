import json
import re
import tempfile
import unittest
from pathlib import Path

from tests.helpers import EXAMPLES, SKILL
import build_deck
from build_deck import DeckError

PNG_1PX = bytes.fromhex("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000001e221bc330000000049454e44ae426082")


def make_deck(tmp: Path, meta=None, slides=None) -> Path:
    tmp.mkdir(parents=True, exist_ok=True)
    (tmp / "deck.json").write_text(json.dumps(meta or {"title": "T"}), encoding="utf-8")
    (tmp / "slides.html").write_text(slides or '<section class="slide" id="a"><h1>Oi</h1></section>', encoding="utf-8")
    return tmp


class BuildTests(unittest.TestCase):
    def test_examples_build_to_single_html(self):
        for ex in sorted(p for p in EXAMPLES.iterdir() if (p / "deck.json").is_file()):
            with self.subTest(example=ex.name), tempfile.TemporaryDirectory() as t:
                out = build_deck.build(ex, Path(t) / "o.html", warn=lambda m: self.fail(m))
                html = out.read_text(encoding="utf-8")
                self.assertIn('id="ps-config"', html)
                self.assertNotRegex(html, r"\{\{[A-Z_]+\}\}", "token de template sobrando")
                n_src = len(re.findall(r'<section[^>]*class="[^"]*\bslide\b', (ex / "slides.html").read_text(encoding="utf-8")))
                self.assertEqual(len(re.findall(r'<section[^>]*class="[^"]*\bslide\b', html)), n_src)
                self.assertEqual(len(re.findall(r"<script(?![^>]*json)[^>]*>", html)) - html.count("<script defer"), 2)  # tema + bundle
                self.assertLess(out.stat().st_size, 600_000)

    def test_config_and_palettes_in_runtime(self):
        with tempfile.TemporaryDirectory() as t:
            d = make_deck(Path(t) / "d", {"title": 'A "b" <c>', "palette": "forest", "lang": "en", "mode": "dark", "palettes": ["ocean"]})
            html = build_deck.build(d, warn=print).read_text(encoding="utf-8")
            cfg = json.loads(re.search(r'id="ps-config">(.*?)</script>', html, re.S).group(1).replace("<\\/", "</"))
            self.assertEqual((cfg["palette"], cfg["mode"], cfg["lang"]), ("forest", "dark", "en"))
            self.assertEqual({p["id"] for p in cfg["palettes"]}, {"forest", "ocean"})
            self.assertIn("&lt;c&gt;", html)  # título escapado no <title>
            self.assertTrue((d / "dist" / "index.html").is_file())

    def test_logo_light_dark_embedded_once_in_config(self):
        with tempfile.TemporaryDirectory() as t:
            d = make_deck(Path(t) / "d", {"title": "T", "logo": {"light": "img/a.png", "dark": "img/b.png", "alt": "Marca"}})
            (d / "img").mkdir()
            (d / "img" / "a.png").write_bytes(PNG_1PX)
            (d / "img" / "b.png").write_bytes(PNG_1PX + b"\x00")
            html = build_deck.build(d, warn=lambda m: self.fail(m)).read_text(encoding="utf-8")
            cfg = json.loads(re.search(r'id="ps-config">(.*?)</script>', html, re.S).group(1).replace("<\\/", "</"))
            self.assertTrue(cfg["logo"]["light"].startswith("data:image/png;base64,"))
            self.assertNotEqual(cfg["logo"]["light"], cfg["logo"]["dark"])
            self.assertEqual(cfg["logo"]["alt"], "Marca")
            self.assertIn(".logo-dark", html)

    def test_all_palettes_generate_css_for_light_and_dark(self):
        with tempfile.TemporaryDirectory() as t:
            html = build_deck.build(make_deck(Path(t) / "d")).read_text(encoding="utf-8")
            for pid in build_deck.load_palettes(None):
                self.assertIn(f':root[data-palette="{pid}"]', html)
                self.assertIn(f':root[data-palette="{pid}"][data-theme="dark"]', html)
            self.assertIn("prefers-color-scheme:dark", html)

    def test_embeds_local_images_and_warns_on_missing(self):
        with tempfile.TemporaryDirectory() as t:
            d = make_deck(Path(t) / "d", slides='<section class="slide"><img src="img/a.png" alt="x"><img src="img/nope.png" alt="y"><div style="background:url(img/a.png)"></div></section>')
            (d / "img").mkdir()
            (d / "img" / "a.png").write_bytes(PNG_1PX)
            warns = []
            html = build_deck.build(d, warn=warns.append).read_text(encoding="utf-8")
            self.assertEqual(html.count("data:image/png;base64,"), 2)
            self.assertIn('src="img/nope.png"', html)
            self.assertTrue(any("nope.png" in w for w in warns))

    def test_no_embed_keeps_relative_paths(self):
        with tempfile.TemporaryDirectory() as t:
            d = make_deck(Path(t) / "d", slides='<section class="slide"><img src="a.png" alt="x"></section>')
            (d / "a.png").write_bytes(PNG_1PX)
            self.assertIn('src="a.png"', build_deck.build(d, embed=False).read_text(encoding="utf-8"))

    def test_no_fonts_has_no_google_link(self):
        with tempfile.TemporaryDirectory() as t:
            d = make_deck(Path(t) / "d")
            self.assertIn("fonts.googleapis.com", build_deck.build(d, fonts=True).read_text(encoding="utf-8"))
            self.assertNotIn("fonts.googleapis.com", build_deck.build(d, fonts=False).read_text(encoding="utf-8"))

    def test_slides_folder_is_concatenated_in_order(self):
        with tempfile.TemporaryDirectory() as t:
            d = Path(t) / "d"
            d.mkdir()
            (d / "deck.json").write_text('{"title":"T"}', encoding="utf-8")
            (d / "slides").mkdir()
            (d / "slides" / "02.html").write_text('<section class="slide" id="b"><h2>B</h2></section>', encoding="utf-8")
            (d / "slides" / "01.html").write_text('<section class="slide" id="a"><h2>A</h2></section>', encoding="utf-8")
            html = build_deck.build(d).read_text(encoding="utf-8")
            self.assertLess(html.index('id="a"'), html.index('id="b"'))

    def test_katex_adds_cdn(self):
        with tempfile.TemporaryDirectory() as t:
            d = make_deck(Path(t) / "d", {"title": "T", "katex": True})
            html = build_deck.build(d).read_text(encoding="utf-8")
            self.assertIn("katex.min.js", html)

    def test_custom_palette_and_contrast_warning(self):
        pal = json.loads((SKILL / "assets" / "palettes.json").read_text(encoding="utf-8"))["ocean"]
        pal["light"]["muted"] = "#E0E0E0"
        with tempfile.TemporaryDirectory() as t:
            d = make_deck(Path(t) / "d", {"title": "T", "palette": "marca", "palettes_custom": {"marca": pal}})
            warns = []
            html = build_deck.build(d, warn=warns.append).read_text(encoding="utf-8")
            self.assertIn('data-palette="marca"', html)
            self.assertTrue(any("contraste" in w for w in warns))

    def test_errors(self):
        with tempfile.TemporaryDirectory() as t:
            t = Path(t)
            for meta, msg in [({"title": "T", "palette": "zzz"}, "palette"), ({"title": "T", "mode": "x"}, "mode"),
                              ({"title": "T", "transition": "x"}, "transition"), ({"title": "T", "fonts": "x"}, "fonts"), ({"x": 1}, "title")]:
                with self.subTest(msg=msg), self.assertRaisesRegex(DeckError, msg):
                    build_deck.build(make_deck(t / msg, meta))
            with self.assertRaises(DeckError):
                build_deck.build(t / "inexistente")


if __name__ == "__main__":
    unittest.main()
