import json
import unittest

from tests.helpers import SKILL
import contrast

REQUIRED = {"bg", "surface", "surface2", "text", "muted", "border", "accent", "accent2", "accent3", "onAccent"}


class PaletteTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads((SKILL / "assets" / "palettes.json").read_text(encoding="utf-8"))
        self.pals = {k: v for k, v in self.data.items() if not k.startswith("_")}

    def test_contrast_helper_known_values(self):
        self.assertAlmostEqual(contrast.ratio("#000000", "#FFFFFF"), 21.0, places=1)
        self.assertAlmostEqual(contrast.ratio("#777777", "#FFFFFF"), 4.48, places=1)

    def test_all_palettes_pass_wcag(self):
        self.assertEqual(contrast.check_palettes(self.data), [])

    def test_palettes_have_all_tokens_in_both_modes(self):
        self.assertGreaterEqual(len(self.pals), 9)
        for pid, p in self.pals.items():
            for mode in ("light", "dark"):
                self.assertTrue(REQUIRED <= set(p[mode]), f"{pid}/{mode} sem tokens")
            for k in ("x4", "x5", "x6", "name", "mood"):
                self.assertIn(k, p, f"{pid} sem {k}")

    def test_dark_is_darker_than_light(self):
        for pid, p in self.pals.items():
            self.assertLess(contrast.luminance(p["dark"]["bg"]), contrast.luminance(p["light"]["bg"]), pid)

    def test_checker_detects_bad_palette(self):
        bad = {"x": json.loads(json.dumps(self.pals["ocean"]))}
        bad["x"]["light"]["muted"] = "#DDDDDD"
        self.assertTrue(contrast.check_palettes(bad))


if __name__ == "__main__":
    unittest.main()
