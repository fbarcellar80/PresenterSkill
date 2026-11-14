"""Conformidade da skill com as boas práticas do formato (Agent Skills) e consistência do repositório."""
import json
import re
import unittest

from tests.helpers import ROOT, SKILL


def frontmatter(text):
    m = re.match(r"---\n(.*?)\n---\n(.*)", text, re.S)
    assert m, "SKILL.md precisa começar com frontmatter YAML"
    fields = {}
    for line in m.group(1).splitlines():
        k, _, v = line.partition(":")
        fields[k.strip()] = v.strip()
    return fields, m.group(2)


class SkillFormatTests(unittest.TestCase):
    def setUp(self):
        self.text = (SKILL / "SKILL.md").read_text(encoding="utf-8")
        self.fm, self.body = frontmatter(self.text)

    def test_frontmatter(self):
        self.assertEqual(set(self.fm), {"name", "description"})
        self.assertEqual(self.fm["name"], SKILL.name)
        self.assertRegex(self.fm["name"], r"^[a-z0-9]+(-[a-z0-9]+)*$")
        self.assertLessEqual(len(self.fm["name"]), 64)
        self.assertLessEqual(len(self.fm["description"]), 1024)
        self.assertGreater(len(self.fm["description"]), 200, "descrição deve dizer o que faz E quando usar")

    def test_description_has_trigger_words_in_both_languages(self):
        d = self.fm["description"].lower()
        for w in ("apresentação", "slides", "presentation", "interativ", "claro/escuro", ".pptx"):
            self.assertIn(w, d)

    def test_body_is_concise(self):
        self.assertLess(self.text.count("\n"), 500)

    def test_every_reference_is_linked_from_skill_md_and_exists(self):
        refs = sorted(p.name for p in (SKILL / "references").glob("*.md"))
        self.assertGreaterEqual(len(refs), 7)
        for r in refs:
            self.assertIn(f"references/{r}", self.body, f"{r} não é citado no SKILL.md")
        for link in set(re.findall(r"references/([\w.-]+\.md)", self.body)):
            self.assertTrue((SKILL / "references" / link).is_file(), link)

    def test_scripts_mentioned_exist(self):
        for s in set(re.findall(r"scripts/([\w.]+)", self.body)):
            self.assertTrue((SKILL / "scripts" / s).is_file(), s)

    def test_large_references_have_toc(self):
        for p in (SKILL / "references").glob("*.md"):
            if len(p.read_text(encoding="utf-8").splitlines()) > 100:
                self.assertIn("## Sumário", p.read_text(encoding="utf-8"), p.name)

    def test_reference_docs_cover_all_widgets_and_palettes(self):
        w = (SKILL / "references" / "04-interactive-widgets.md").read_text(encoding="utf-8")
        for name in ("lab", "chart", "sampler", "quiz", "compare", "tabs"):
            self.assertIn(f"## {name}", w)
        design = (SKILL / "references" / "01-planning.md").read_text(encoding="utf-8")
        pals = json.loads((SKILL / "assets" / "palettes.json").read_text(encoding="utf-8"))
        for pid in (k for k in pals if not k.startswith("_")):
            self.assertIn(f"`{pid}`", design, f"paleta {pid} sem orientação de uso")

    def test_documented_icons_exist(self):
        sprite = (SKILL / "assets" / "icons.svg").read_text(encoding="utf-8")
        have = set(re.findall(r'<symbol id="i-([\w-]+)"', sprite))
        doc = (SKILL / "references" / "05-icons-and-crossrefs.md").read_text(encoding="utf-8")
        table = doc.split("## Catálogo")[1].split("## \"Saiba mais\"")[0]
        listed = set(re.findall(r"`([a-z][a-z0-9-]*)`", table))
        self.assertFalse(listed - have, f"ícones documentados que não existem: {listed - have}")
        self.assertFalse(have - listed, f"ícones existentes sem documentação: {have - listed}")


class RepoConsistencyTests(unittest.TestCase):
    def test_versions_match(self):
        pkg = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]
        plugin = json.loads((ROOT / ".claude-plugin" / "plugin.json").read_text(encoding="utf-8"))["version"]
        changelog = re.search(r"^## \[(\d+\.\d+\.\d+)\]", (ROOT / "CHANGELOG.md").read_text(encoding="utf-8"), re.M).group(1)
        self.assertEqual(pkg, plugin)
        self.assertEqual(pkg, changelog)

    def test_plugin_and_marketplace_manifests(self):
        plugin = json.loads((ROOT / ".claude-plugin" / "plugin.json").read_text(encoding="utf-8"))
        market = json.loads((ROOT / ".claude-plugin" / "marketplace.json").read_text(encoding="utf-8"))
        self.assertEqual(plugin["name"], SKILL.name)
        self.assertEqual([p["name"] for p in market["plugins"]], [plugin["name"]])
        self.assertTrue((ROOT / "skills" / plugin["name"] / "SKILL.md").is_file())

    def test_essential_docs_exist(self):
        for f in ("README.md", "README.en.md", "LICENSE", "CHANGELOG.md", "CONTRIBUTING.md", "THIRD_PARTY_NOTICES.md",
                  "docs/guia-de-uso.md", "docs/arquitetura.md", ".github/workflows/ci.yml"):
            self.assertTrue((ROOT / f).is_file(), f)

    def test_local_markdown_links_resolve(self):
        pat = re.compile(r"\]\((?!https?:|#|mailto:)([^)\s#]+)")
        for md in [*ROOT.glob("*.md"), *(ROOT / "docs").glob("*.md"), *SKILL.rglob("*.md")]:
            for link in pat.findall(md.read_text(encoding="utf-8")):
                self.assertTrue((md.parent / link).exists(), f"{md.relative_to(ROOT)} → link quebrado: {link}")


if __name__ == "__main__":
    unittest.main()
