#!/usr/bin/env python3
"""Cria a pasta de um novo deck a partir do starter.

Uso:
    python new_deck.py PASTA --title "Título" [--subtitle ".."] [--author ".."] [--lang pt-BR]
                       [--palette ocean] [--fonts modern] [--closing "Mensagem final"]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
STARTER = HERE.parent / "assets" / "starter"
sys.path.insert(0, str(HERE))
from build_deck import FONT_SETS, load_palettes  # noqa: E402


def create(dest: Path, title: str, subtitle: str = "", author: str = "", lang: str = "pt-BR", palette: str = "aurora",
           fonts: str = "modern", closing: str = "Uma frase de fechamento memorável", eyebrow: str = "Apresentação") -> Path:
    pals = load_palettes(None)
    if palette not in pals:
        raise SystemExit(f"palette inválida. Opções: {', '.join(pals)}")
    if fonts not in FONT_SETS:
        raise SystemExit(f"fonts inválido. Opções: {', '.join(FONT_SETS)}")
    if dest.exists() and any(dest.iterdir()):
        raise SystemExit(f"{dest} já existe e não está vazio")
    dest.mkdir(parents=True, exist_ok=True)
    subs = {"__TITLE__": title, "__SUBTITLE__": subtitle or title, "__AUTHOR__": author or "Apresentador", "__LANG__": lang,
            "__PALETTE__": palette, "__FONTS__": fonts, "__CLOSING__": closing, "__EYEBROW__": eyebrow}
    for name in ("deck.json", "slides.html"):
        text = (STARTER / name).read_text(encoding="utf-8")
        for k, v in subs.items():
            text = text.replace(k, v.replace('"', '\\"') if name == "deck.json" else v)
        (dest / name).write_text(text, encoding="utf-8")
    return dest


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Cria um novo deck a partir do starter.")
    ap.add_argument("dest")
    ap.add_argument("--title", required=True)
    ap.add_argument("--subtitle", default="")
    ap.add_argument("--author", default="")
    ap.add_argument("--lang", default="pt-BR")
    ap.add_argument("--palette", default="aurora")
    ap.add_argument("--fonts", default="modern")
    ap.add_argument("--closing", default="Uma frase de fechamento memorável")
    ap.add_argument("--eyebrow", default="Apresentação")
    a = ap.parse_args(argv)
    d = create(Path(a.dest), a.title, a.subtitle, a.author, a.lang, a.palette, a.fonts, a.closing, a.eyebrow)
    print(f"✔ deck criado em {d}\n  edite {d / 'slides.html'} e rode: python {HERE / 'build_deck.py'} {d}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
