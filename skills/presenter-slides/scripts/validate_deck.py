#!/usr/bin/env python3
"""Valida estaticamente um deck (deck.json + slides.html) ANTES de compilar/abrir.

Uso:  python validate_deck.py DECK_DIR [--strict] [--json]

Erros (código de saída 1): JSON inválido, widget desconhecido/incompleto, expressão matemática inválida,
  data-goto/data-detail sem alvo, ids duplicados, ícone inexistente, imagem local ausente, <img> sem alt,
  quiz sem resposta correta.
Avisos (--strict os transforma em erro): slide com texto demais, listas longas, sequência de slides só com
  texto, deck sem nenhum recurso interativo/gráfico, slides sem título, deck muito longo.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path

HERE = Path(__file__).resolve().parent
ASSETS = HERE.parent / "assets"
sys.path.insert(0, str(HERE))
from build_deck import FONT_SETS, load_palettes, read_slides, DeckError  # noqa: E402

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
WIDGETS = {"lab", "chart", "sampler", "quiz", "compare", "tabs"}
VISUAL_CLASSES = {"widget", "stat", "stats", "cards", "card", "timeline", "steps", "media", "diagram", "formula", "callout", "hotspot-layer", "media-ph", "table", "chip", "badge"}
VISUAL_TAGS = {"img", "svg", "figure", "table", "canvas", "video", "pre", "blockquote"}
MAX_WORDS = 110
MAX_BULLETS = 6


def icon_names() -> set[str]:
    return set(re.findall(r'<symbol id="i-([\w-]+)"', (ASSETS / "icons.svg").read_text(encoding="utf-8")))


class Slide:
    def __init__(self, idx: int, attrs: dict):
        self.idx, self.attrs = idx, attrs
        self.id = attrs.get("id", "")
        self.title = attrs.get("data-title", "")
        self.words = 0
        self.headings: list[str] = []
        self.has_notes = False
        self.widgets: list[dict] = []          # {type, config|None, error}
        self.visual = False
        self.list_items: list[int] = []
        self.gotos: list[str] = []
        self.details: list[str] = []
        self.icons: list[str] = []
        self.imgs: list[tuple[str, str | None]] = []   # (src, alt)
        self.ids: set[str] = set()
        self.h1 = 0
        self.layout = attrs.get("class", "")

    @property
    def label(self) -> str:
        return f"slide {self.idx + 1} «{self.title or self.id or '?'}»"


class Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.slides: list[Slide] = []
        self.cur: Slide | None = None
        self.sec_depth = 0
        self.skip = {"aside_notes": 0, "template": 0, "script": 0, "style": 0, "svg": 0, "tabnav": 0}
        self.widget_stack: list[dict] = []
        self.json_buf: list[str] | None = None
        self.li_stack: list[int] = []
        self.all_ids: set[str] = set()
        self.template_ids: set[str] = set()
        self.cur_heading: list[str] | None = None
        self.cur_heading_tag = ""

    # -- helpers
    def _attrs(self, attrs):
        return {k: (v if v is not None else "") for k, v in attrs}

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_starttag(self, tag, attrs):
        a = self._attrs(attrs)
        classes = set(a.get("class", "").split())
        if "id" in a:
            self.all_ids.add(a["id"])
            if tag == "template":
                self.template_ids.add(a["id"])
        if tag == "section":
            if self.sec_depth == 0 and "slide" in classes:
                self.cur = Slide(len(self.slides), a)
                self.slides.append(self.cur)
            self.sec_depth += 1
        s = self.cur
        if s is None:
            return
        if "id" in a:
            s.ids.add(a["id"])
        in_template = self.skip["template"] > 0
        if tag == "template":
            self.skip["template"] += 1
        if tag == "aside" and "notes" in classes:
            s.has_notes = True
            self.skip["aside_notes"] += 1
        elif tag == "aside" and self.skip["aside_notes"]:
            self.skip["aside_notes"] += 1
        if tag == "svg":
            self.skip["svg"] += 1
            s.visual = True
        if tag == "style":
            self.skip["style"] += 1
        if tag == "script":
            self.skip["script"] += 1
            if a.get("type") == "application/json" and self.widget_stack:
                self.json_buf = []
        if in_template or self.skip["template"]:
            # dentro de <template> só nos interessam referências
            pass
        for k in ("data-goto",):
            if k in a:
                s.gotos.append(a[k])
        if "data-detail" in a:
            s.details.append(a["data-detail"])
        for k in ("data-icon", "data-tab-icon"):
            if k in a:
                s.icons.append(a[k])
        if "data-widget" in a:
            w = {"type": a["data-widget"], "config": None, "error": None, "tabs": 0, "depth": 0}
            s.widgets.append(w)
            self.widget_stack.append(w)
            s.visual = True
        elif self.widget_stack and "data-tab" in a:
            self.widget_stack[-1]["tabs"] += 1
        if tag == "img":
            s.imgs.append((a.get("src", ""), a.get("alt")))
            s.visual = True
        if tag in VISUAL_TAGS or classes & VISUAL_CLASSES:
            s.visual = True
        if tag in ("ul", "ol"):
            self.li_stack.append(0)
        if tag == "li" and self.li_stack:
            self.li_stack[-1] += 1
        if tag in ("h1", "h2", "h3") and not self.skip["template"] and not self.skip["aside_notes"]:
            self.cur_heading = []
            self.cur_heading_tag = tag
            if tag == "h1":
                s.h1 += 1

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        s = self.cur
        if tag == "section":
            self.sec_depth = max(0, self.sec_depth - 1)
            if self.sec_depth == 0:
                self.cur = None
                self.widget_stack = []
        if s is None:
            return
        if tag == "template" and self.skip["template"]:
            self.skip["template"] -= 1
        if tag == "aside" and self.skip["aside_notes"]:
            self.skip["aside_notes"] -= 1
        if tag == "svg" and self.skip["svg"]:
            self.skip["svg"] -= 1
        if tag == "style" and self.skip["style"]:
            self.skip["style"] -= 1
        if tag == "script" and self.skip["script"]:
            self.skip["script"] -= 1
            if self.json_buf is not None and self.widget_stack:
                w = self.widget_stack[-1]
                try:
                    w["config"] = json.loads("".join(self.json_buf))
                except json.JSONDecodeError as e:
                    w["error"] = f"JSON inválido ({e.msg} na linha {e.lineno}, coluna {e.colno})"
                self.json_buf = None
        if tag in ("ul", "ol") and self.li_stack:
            s.list_items.append(self.li_stack.pop())
        if tag == self.cur_heading_tag and self.cur_heading is not None:
            text = " ".join("".join(self.cur_heading).split())
            s.headings.append(text)
            if not s.title:
                s.title = text
            self.cur_heading = None

    def handle_data(self, data):
        s = self.cur
        if s is None:
            return
        if self.json_buf is not None and self.skip["script"]:
            self.json_buf.append(data)
            return
        if self.cur_heading is not None:
            self.cur_heading.append(data)
        if any(self.skip[k] for k in ("aside_notes", "template", "script", "style", "svg")):
            return
        s.words += len(re.findall(r"\w+", data))


# ------------------------------------------------------------------ expressões
def collect_exprs(w: dict, label: str) -> list[dict]:
    c = w["config"] or {}
    if w["type"] != "lab":
        return []
    known = ["x", "t"] + [p.get("id") for p in c.get("params", []) if p.get("id")]
    defs = c.get("defs", {})
    items = []

    def add(where, expr):
        if isinstance(expr, str) and expr.strip() and expr != "auto":
            items.append({"where": f"{label} › {where}", "expr": expr, "known": known, "defs": defs})

    for k in ("min", "max"):
        add(f"x.{k}", (c.get("x") or {}).get(k))
        add(f"y.{k}", (c.get("y") or {}).get(k))
    for i, s in enumerate(c.get("series", [])):
        add(f"series[{i}].expr", s.get("expr"))
        if s.get("parametric"):
            p = s["parametric"]
            add(f"series[{i}].parametric.x", p.get("x")); add(f"series[{i}].parametric.y", p.get("y"))
            for j, v in enumerate(p.get("t", [])):
                add(f"series[{i}].parametric.t[{j}]", v)
        for j, v in enumerate(s.get("discrete", []) or []):
            add(f"series[{i}].discrete[{j}]", v)
        for j, v in enumerate(s.get("domain", []) or []):
            add(f"series[{i}].domain[{j}]", v)
        for k in ("from", "to"):
            add(f"series[{i}].shade.{k}", (s.get("shade") or {}).get(k))
    for i, o in enumerate(c.get("outputs", [])):
        add(f"outputs[{i}].expr", o.get("expr"))
    for i, m in enumerate(c.get("markers", [])):
        add(f"markers[{i}].x", m.get("x")); add(f"markers[{i}].y", m.get("y"))
    for i, h in enumerate(c.get("hlines", [])):
        add(f"hlines[{i}].y", h.get("y"))
    for i, v in enumerate(c.get("vlines", [])):
        add(f"vlines[{i}].x", v.get("x"))
    for m in re.finditer(r"\{([^{}|]+)(?:\|[^{}]+)?\}", c.get("insight", "") or ""):
        add("insight", m.group(1))
    return items


def run_expr_check(items: list[dict]):
    node = shutil.which("node")
    if not node or not items:
        return None if not node else []
    r = subprocess.run([node, str(HERE / "check_expr.cjs")], input=json.dumps(items), capture_output=True, text=True, timeout=30)
    if r.returncode != 0:
        return None
    return json.loads(r.stdout or "[]")


# ------------------------------------------------------------------ validação
def widget_checks(w: dict, label: str, err, warn):
    t, c = w["type"], w["config"]
    if w["error"]:
        err(f"{label}: widget «{t}»: {w['error']}")
        return
    if t not in WIDGETS:
        err(f"{label}: widget desconhecido «{t}» (válidos: {', '.join(sorted(WIDGETS))})")
        return
    if t in ("compare", "tabs"):
        if t == "tabs" and w["tabs"] < 1:
            err(f"{label}: widget «tabs» precisa de filhos com data-tab")
        return
    if c is None:
        err(f"{label}: widget «{t}» sem <script type=\"application/json\"> de configuração")
        return
    if t == "lab":
        if not c.get("series") and not c.get("outputs"):
            err(f"{label}: lab precisa de \"series\" (gráfico) e/ou \"outputs\" (calculadora)")
        for i, p in enumerate(c.get("params", [])):
            if not p.get("id"):
                err(f"{label}: params[{i}] sem \"id\"")
            elif not p.get("options") and not all(k in p for k in ("min", "max")):
                err(f"{label}: param «{p['id']}» precisa de min e max (ou options)")
        for i, s in enumerate(c.get("series", [])):
            if not (s.get("expr") or s.get("parametric")):
                err(f"{label}: series[{i}] precisa de \"expr\" ou \"parametric\"")
        if c.get("series") and not c.get("params"):
            warn(f"{label}: lab com gráfico mas sem params — sem controles o aluno não interage; adicione sliders")
    elif t == "chart":
        ty = c.get("type", "bar")
        if ty not in ("bar", "hbar", "line", "area", "pie", "donut", "scatter", "stacked"):
            err(f"{label}: chart.type «{ty}» inválido")
        if not c.get("series"):
            err(f"{label}: chart sem \"series\"")
        elif ty != "scatter" and not c.get("labels"):
            err(f"{label}: chart sem \"labels\"")
        else:
            n = len(c.get("labels", []))
            for s in c["series"]:
                if ty != "scatter" and len(s.get("data", [])) != n:
                    err(f"{label}: série «{s.get('label', '?')}» tem {len(s.get('data', []))} valores, mas há {n} labels")
    elif t == "quiz":
        opts = c.get("options", [])
        if not c.get("question") or len(opts) < 2:
            err(f"{label}: quiz precisa de \"question\" e ao menos 2 \"options\"")
        elif not any(o.get("correct") for o in opts):
            err(f"{label}: quiz sem opção com \"correct\": true")
    elif t == "sampler":
        pass


def validate(deck_dir: Path, strict: bool = False):
    errors: list[str] = []
    warnings: list[str] = []
    err, warn = errors.append, warnings.append

    cfg_path = deck_dir / "deck.json"
    meta = {}
    if not cfg_path.is_file():
        err("deck.json não encontrado")
    else:
        try:
            meta = json.loads(cfg_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            err(f"deck.json inválido: {e}")
    if meta:
        if not meta.get("title"):
            err('deck.json: falta "title"')
        try:
            pals = load_palettes(meta.get("palettes_custom"))
            if meta.get("palette", "aurora") not in pals:
                err(f'deck.json: palette "{meta.get("palette")}" inexistente ({", ".join(pals)})')
        except DeckError as e:
            err(f"deck.json: {e}")
        if meta.get("fonts", "modern") not in FONT_SETS:
            err(f'deck.json: fonts "{meta.get("fonts")}" inexistente ({", ".join(FONT_SETS)})')
        if meta.get("mode", "auto") not in ("auto", "light", "dark"):
            err('deck.json: mode deve ser auto, light ou dark')
        lg = meta.get("logo")
        for rel in ([lg] if isinstance(lg, str) else [lg.get("light"), lg.get("dark")] if isinstance(lg, dict) else []):
            if rel and not re.match(r"^(https?:|data:|//)", rel) and not (deck_dir / rel).is_file():
                err(f"deck.json: logo não encontrada: {rel}")
        if len(meta.get("title", "")) > 90:
            warn("deck.json: título muito longo (>90 caracteres)")

    try:
        html = read_slides(deck_dir)
    except DeckError as e:
        err(str(e))
        return errors, warnings, 0
    p = Parser()
    p.feed(html)
    slides = p.slides
    if not slides:
        err('nenhum <section class="slide"> encontrado em slides.html')
        return errors, warnings, 0

    icons = icon_names()
    ids_seen: dict[str, int] = {}
    expr_items: list[dict] = []
    text_only_run = 0
    any_interactive = False
    any_notes = False
    for s in slides:
        L = s.label
        if s.id:
            if s.id in ids_seen:
                err(f"{L}: id «{s.id}» duplicado (também no slide {ids_seen[s.id] + 1})")
            ids_seen[s.id] = s.idx
        else:
            warn(f"{L}: sem id — referências cruzadas (data-goto) só poderão usar o número")
        if not s.headings and not s.attrs.get("data-title"):
            warn(f"{L}: sem título (h1/h2) nem data-title")
        if s.h1 > 1:
            warn(f"{L}: mais de um <h1>")
        if s.words > MAX_WORDS and "layout-quote" not in s.layout:
            warn(f"{L}: texto demais ({s.words} palavras; ideal ≤ {MAX_WORDS}) — enxugue ou divida em dois slides")
        if any(n > MAX_BULLETS for n in s.list_items):
            warn(f"{L}: lista com mais de {MAX_BULLETS} itens — agrupe ou converta em cards/etapas")
        for ic in s.icons:
            if ic not in icons:
                err(f"{L}: ícone inexistente «{ic}» (veja references/05-icons-and-crossrefs.md)")
        for src, alt in s.imgs:
            if alt is None:
                err(f"{L}: <img> sem atributo alt ({src[:40]})")
            if src and not re.match(r"^(https?:|data:|//|#)", src) and not (deck_dir / src).is_file():
                err(f"{L}: imagem local não encontrada: {src}")
        for w in s.widgets:
            widget_checks(w, L, err, warn)
            if w["type"] in ("lab", "chart", "sampler", "quiz", "tabs", "compare"):
                any_interactive = True
            expr_items += collect_exprs(w, L)
        any_notes |= s.has_notes
        is_title_like = any(k in s.layout for k in ("layout-title", "layout-section", "layout-closing", "layout-quote"))
        if not s.visual and not is_title_like:
            text_only_run += 1
            if text_only_run == 3:
                warn(f"{L}: 3+ slides seguidos só com texto — insira gráfico, diagrama, imagem, cards ou widget")
        else:
            text_only_run = 0

    # referências cruzadas
    for s in slides:
        for g in s.gotos:
            ok = (g.isdigit() and 1 <= int(g) <= len(slides)) or g in ids_seen
            if not ok:
                err(f"{s.label}: data-goto=\"{g}\" não aponta para nenhum slide (ids: {', '.join(list(ids_seen)[:8])}…)")
        for d in s.details:
            if d not in p.all_ids:
                err(f"{s.label}: data-detail=\"{d}\" não tem <template id=\"{d}\"> correspondente")
    if len(slides) > 30:
        warn(f"deck com {len(slides)} slides — confirme se cabe no tempo previsto (≈1–2 min por slide)")
    if not any_interactive:
        warn("nenhum widget interativo (lab/chart/sampler/quiz). Para temas com números, curvas ou estatística, adicione ao menos um")
    if not any_notes:
        warn("nenhum slide tem notas do apresentador (<aside class=\"notes\">)")

    # ícones dentro de configs
    for s in slides:
        for w in s.widgets:
            ic = (w["config"] or {}).get("icon")
            if ic and ic not in icons:
                err(f"{s.label}: widget icon inexistente «{ic}»")

    # expressões
    res = run_expr_check(expr_items)
    if res is None:
        warn("Node.js não encontrado: expressões matemáticas dos widgets NÃO foram verificadas")
    else:
        for e in res:
            err(f"{e['where']}: expressão «{e['expr']}» inválida → {e['error']}")
    return errors, warnings, len(slides)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Valida um deck antes de compilar.")
    ap.add_argument("deck_dir")
    ap.add_argument("--strict", action="store_true", help="avisos também falham")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args(argv)
    errors, warnings, n = validate(Path(a.deck_dir), a.strict)
    if a.json:
        print(json.dumps({"slides": n, "errors": errors, "warnings": warnings}, ensure_ascii=False, indent=2))
    else:
        for e in errors:
            print(f"✖ {e}")
        for w in warnings:
            print(f"⚠ {w}")
        print(f"\n{n} slides · {len(errors)} erro(s) · {len(warnings)} aviso(s)")
    return 1 if errors or (a.strict and warnings) else 0


if __name__ == "__main__":
    sys.exit(main())
