#!/usr/bin/env python3
"""Compila um deck (deck.json + slides.html) em UM arquivo HTML autossuficiente.

Uso:
    python build_deck.py DECK_DIR [-o SAIDA.html] [--no-fonts] [--no-embed] [--max-embed-kb 2500]

DECK_DIR contém:
    deck.json      metadados e tema (veja references/02-design-system.md)
    slides.html    várias <section class="slide">…</section>  (ou a pasta slides/*.html, em ordem alfabética)
    imagens/…      arquivos locais referenciados (são embutidos em base64)

Somente biblioteca padrão do Python. O HTML gerado funciona offline (exceto fontes do Google e KaTeX, se ativados).
"""
from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ASSETS = HERE.parent / "assets"
sys.path.insert(0, str(HERE))
from contrast import check_palettes  # noqa: E402

JS_ORDER = ["math.js", "core.js", "charts.js", "widgets.js", "engine.js"]
CSS_ORDER = ["base.css", "components.css"]

FONT_SETS = {
    "modern":    {"head": "Space Grotesk", "body": "Inter", "gf": ["Inter:wght@400;500;600;700", "Space+Grotesk:wght@500;700"]},
    "editorial": {"head": "Playfair Display", "body": "Source Sans 3", "gf": ["Source+Sans+3:wght@400;600;700", "Playfair+Display:wght@600;800"]},
    "friendly":  {"head": "Poppins", "body": "Nunito", "gf": ["Nunito:wght@400;600;700", "Poppins:wght@500;600;700;800"]},
    "technical": {"head": "Sora", "body": "IBM Plex Sans", "mono": "JetBrains Mono", "gf": ["IBM+Plex+Sans:wght@400;500;600;700", "Sora:wght@600;700;800", "JetBrains+Mono:wght@500;700"]},
    "system":    {"head": None, "body": None, "gf": []},
}
SYS_BODY = '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif'
KATEX = "0.16.9"
TOKEN_VARS = {"bg": "--bg", "surface": "--surface", "surface2": "--surface2", "text": "--text", "muted": "--muted",
              "border": "--border", "accent": "--accent", "accent2": "--accent2", "accent3": "--accent3", "onAccent": "--on-accent"}


class DeckError(Exception):
    pass


def slugify(s: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s.lower()).strip("-")
    return s or "deck"


def load_palettes(extra: dict | None) -> dict:
    data = json.loads((ASSETS / "palettes.json").read_text(encoding="utf-8"))
    data = {k: v for k, v in data.items() if not k.startswith("_")}
    for pid, pal in (extra or {}).items():
        for need in ("light", "dark"):
            if need not in pal:
                raise DeckError(f'palettes_custom.{pid}: faltou "{need}"')
        pal.setdefault("name", pid)
        for i, d in zip(("x4", "x5", "x6"), ("#C46205", "#059669", "#E11D48")):
            pal.setdefault(i, d)
        data[pid] = pal
    return data


def palette_css(palettes: dict) -> str:
    def block(tok: dict) -> str:
        return ";".join(f"{TOKEN_VARS[k]}:{v}" for k, v in tok.items() if k in TOKEN_VARS)

    # ordem das cores de série: alterna entre tons do tema e cores de contraste (legibilidade em gráficos)
    out = [":root{--c1:var(--accent);--c2:var(--x4);--c3:var(--accent2);--c4:var(--x5);--c5:var(--accent3);--c6:var(--x6)}"]
    for pid, p in palettes.items():
        sel = f':root[data-palette="{pid}"]'
        out.append(f"{sel}{{{block(p['light'])};--x4:{p['x4']};--x5:{p['x5']};--x6:{p['x6']}}}")
        out.append(f'@media (prefers-color-scheme:dark){{{sel}:not([data-theme="light"]){{{block(p["dark"])}}}}}')
        out.append(f'{sel}[data-theme="dark"]{{{block(p["dark"])}}}')
    return "\n".join(out)


def font_head(name: str, fonts: bool) -> tuple[str, str]:
    fs = FONT_SETS.get(name)
    if fs is None:
        raise DeckError(f'fonts "{name}" desconhecido. Opções: {", ".join(FONT_SETS)}')
    if not fs["head"]:
        return "", ""
    css = (f':root{{--font-head:"{fs["head"]}",{SYS_BODY};--font-body:"{fs["body"]}",{SYS_BODY}'
           + (f';--font-mono:"{fs["mono"]}",ui-monospace,Menlo,Consolas,monospace' if fs.get("mono") else "") + "}")
    link = ""
    if fonts:
        fam = "&".join(f"family={f}" for f in fs["gf"])
        link = (f'<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
                f'<link rel="stylesheet" href="https://fonts.googleapis.com/css2?{fam}&display=swap">')
    return css, link


_IMG_EXT = r"(?:png|jpe?g|gif|webp|avif|svg)"
_ATTR = re.compile(r'(\b(?:src|poster|data-src|data-bg-image)\s*=\s*)(["\'])([^"\']+?\.' + _IMG_EXT + r')(\?[^"\']*)?\2', re.I)
_URL = re.compile(r'url\(\s*(["\']?)([^)"\']+?\.' + _IMG_EXT + r')\1\s*\)', re.I)


def file_data_uri(base: Path, rel: str, max_kb: int, warn) -> str | None:
    """Data URI de um arquivo local (None se for URL, não existir ou passar de max_kb)."""
    if re.match(r"^(https?:|data:|//|#|/)", rel):
        return None
    p = (base / rel).resolve()
    if not p.is_file():
        warn(f"imagem não encontrada: {rel}")
        return None
    size = p.stat().st_size
    if size > max_kb * 1024:
        warn(f"imagem grande demais para embutir ({size // 1024} KB > {max_kb} KB), mantida como link relativo: {rel}")
        return None
    mime = mimetypes.guess_type(p.name)[0] or "application/octet-stream"
    return f"data:{mime};base64," + base64.b64encode(p.read_bytes()).decode()


def embed_assets(html: str, base: Path, max_kb: int, warn) -> str:
    def data_uri(rel: str) -> str | None:
        return file_data_uri(base, rel, max_kb, warn)

    def attr(m):
        d = data_uri(m.group(3))
        return m.group(0) if d is None else f"{m.group(1)}{m.group(2)}{d}{m.group(2)}"

    def url(m):
        d = data_uri(m.group(2))
        return m.group(0) if d is None else f'url("{d}")'

    return _URL.sub(url, _ATTR.sub(attr, html))


def read_slides(deck_dir: Path) -> str:
    single = deck_dir / "slides.html"
    if single.is_file():
        return single.read_text(encoding="utf-8")
    folder = deck_dir / "slides"
    parts = sorted(folder.glob("*.html")) if folder.is_dir() else []
    if not parts:
        raise DeckError(f"Nenhum slides.html (ou slides/*.html) em {deck_dir}")
    return "\n".join(p.read_text(encoding="utf-8") for p in parts)


def build(deck_dir: str | Path, out: str | Path | None = None, fonts: bool = True, embed: bool = True,
          max_embed_kb: int = 2500, warn=lambda m: print(f"aviso: {m}", file=sys.stderr)) -> Path:
    deck_dir = Path(deck_dir)
    cfg_path = deck_dir / "deck.json"
    if not cfg_path.is_file():
        raise DeckError(f"deck.json não encontrado em {deck_dir}")
    try:
        meta = json.loads(cfg_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise DeckError(f"deck.json inválido: {e}") from e
    if not meta.get("title"):
        raise DeckError('deck.json precisa de "title"')

    palettes = load_palettes(meta.get("palettes_custom"))
    pid = meta.get("palette", "aurora")
    if pid not in palettes:
        raise DeckError(f'palette "{pid}" inexistente. Opções: {", ".join(palettes)}')
    for f in check_palettes({k: v for k, v in palettes.items() if k in (meta.get("palettes_custom") or {})}):
        warn(f"contraste fraco na paleta custom {f[0]}/{f[1]}: {f[2]} = {f[3]:.2f}:1 (mínimo {f[4]}:1)")
    allowed = meta.get("palettes") or list(palettes)
    allowed = [a for a in allowed if a in palettes]
    if pid not in allowed:
        allowed.insert(0, pid)

    mode = meta.get("mode", "auto")
    if mode not in ("auto", "light", "dark"):
        raise DeckError('mode deve ser "auto", "light" ou "dark"')
    transition = meta.get("transition", "slide")
    if transition not in ("slide", "fade", "zoom", "none"):
        raise DeckError('transition deve ser slide, fade, zoom ou none')

    runtime = {
        "id": meta.get("id") or slugify(meta["title"]), "title": meta["title"], "lang": meta.get("lang", "pt-BR"),
        "palette": pid, "mode": mode, "transition": transition,
        "palettes": [{"id": k, "name": palettes[k].get("name", k), "mood": palettes[k].get("mood", ""),
                      "colors": [palettes[k]["light"]["accent"], palettes[k]["light"]["accent2"], palettes[k]["light"]["accent3"]]} for k in allowed],
    }

    logo = meta.get("logo")
    if logo:
        if isinstance(logo, str):
            logo = {"light": logo, "dark": logo}
        if not isinstance(logo, dict) or not (logo.get("light") or logo.get("dark")):
            raise DeckError('logo deve ser um caminho ou {"light": "...", "dark": "...", "alt": "..."}')
        lg = {"alt": logo.get("alt") or meta["title"]}
        for k in ("light", "dark"):
            rel = logo.get(k) or logo.get("light" if k == "dark" else "dark")
            lg[k] = (file_data_uri(deck_dir, rel, max_embed_kb, warn) if embed else None) or rel
        runtime["logo"] = lg

    css = "\n".join((ASSETS / "css" / n).read_text(encoding="utf-8") for n in CSS_ORDER)
    fcss, flink = font_head(meta.get("fonts", "modern"), fonts and not meta.get("offline", False))
    style = css + "\n" + palette_css(palettes) + "\n" + fcss
    script = "\n".join((ASSETS / "js" / n).read_text(encoding="utf-8") for n in JS_ORDER)
    if re.search(r"</script|<!--", script, re.I):
        raise DeckError("o JS embutido contém '</script' ou '<!--' (quebraria o HTML inline)")
    slides = read_slides(deck_dir)
    if embed:
        slides = embed_assets(slides, deck_dir, max_embed_kb, warn)

    head_extra = ""
    if meta.get("katex"):
        head_extra = (f'<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/{KATEX}/katex.min.css">'
                      f'<script defer src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/{KATEX}/katex.min.js"></script>'
                      f'<script defer src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/{KATEX}/contrib/auto-render.min.js"></script>')

    esc = lambda s: (s or "").replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;").replace(">", "&gt;")  # noqa: E731
    values = {
        "LANG": esc(runtime["lang"]), "TITLE": esc(meta["title"]),
        "DESCRIPTION": esc(meta.get("description") or meta.get("subtitle") or meta["title"]),
        "FONTS": flink, "STYLE": style, "HEAD_EXTRA": head_extra,
        "CONFIG": json.dumps(runtime, ensure_ascii=False).replace("</", "<\\/"),
        "SPRITE": (ASSETS / "icons.svg").read_text(encoding="utf-8"), "SLIDES": slides, "SCRIPT": script,
    }
    tpl = (ASSETS / "template.html").read_text(encoding="utf-8")
    html = re.sub(r"\{\{(\w+)\}\}", lambda m: values.get(m.group(1), m.group(0)), tpl)

    out = Path(out) if out else deck_dir / "dist" / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    return out


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Compila um deck em um único HTML.")
    ap.add_argument("deck_dir")
    ap.add_argument("-o", "--output")
    ap.add_argument("--no-fonts", action="store_true", help="não carrega fontes do Google (100%% offline)")
    ap.add_argument("--no-embed", action="store_true", help="não embute imagens locais em base64")
    ap.add_argument("--max-embed-kb", type=int, default=2500)
    a = ap.parse_args(argv)
    try:
        out = build(a.deck_dir, a.output, fonts=not a.no_fonts, embed=not a.no_embed, max_embed_kb=a.max_embed_kb)
    except DeckError as e:
        print(f"erro: {e}", file=sys.stderr)
        return 1
    n = len(re.findall(r'<section[^>]*class="[^"]*\bslide\b', out.read_text(encoding="utf-8")))
    print(f"✔ {out}  ({out.stat().st_size / 1024:.0f} KB, {n} slides)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
