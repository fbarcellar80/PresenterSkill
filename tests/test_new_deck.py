import tempfile
import unittest
from pathlib import Path

import build_deck
import new_deck
import validate_deck


class NewDeckTests(unittest.TestCase):
    def test_scaffold_validates_and_builds(self):
        with tempfile.TemporaryDirectory() as t:
            d = new_deck.create(Path(t) / 'meu "deck"', 'Título com "aspas"', "Sub", "Ana", "en", "sunset", "editorial", "Fecho")
            errors, _, n = validate_deck.validate(d)
            self.assertEqual(errors, [])
            self.assertEqual(n, 4)
            html = build_deck.build(d).read_text(encoding="utf-8")
            self.assertIn('data-palette', html)
            self.assertNotIn("__TITLE__", html)
            self.assertIn("Playfair", html)

    def test_refuses_non_empty_dir_and_bad_options(self):
        with tempfile.TemporaryDirectory() as t:
            d = Path(t) / "x"
            d.mkdir()
            (d / "a.txt").write_text("x")
            with self.assertRaises(SystemExit):
                new_deck.create(d, "T")
            with self.assertRaises(SystemExit):
                new_deck.create(Path(t) / "y", "T", palette="nope")
            with self.assertRaises(SystemExit):
                new_deck.create(Path(t) / "z", "T", fonts="nope")


if __name__ == "__main__":
    unittest.main()
