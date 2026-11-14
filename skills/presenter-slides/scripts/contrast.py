#!/usr/bin/env python3
"""Utilitários de contraste WCAG 2.x e verificação das paletas.

Uso:  python contrast.py [palettes.json]
Sai com código 1 se alguma combinação falhar.
"""
import json
import sys
from pathlib import Path


def _lin(c: float) -> float:
    c /= 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def luminance(hex_color: str) -> float:
    h = hex_color.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b)


def ratio(a: str, b: str) -> float:
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


# (token em primeiro plano, token de fundo, mínimo) — 4.5 texto normal, 3 elementos gráficos
TEXT_CHECKS = [
    ("text", "bg", 7.0), ("text", "surface", 7.0), ("text", "surface2", 7.0),
    ("muted", "bg", 4.5), ("muted", "surface", 4.5), ("muted", "surface2", 4.5),
    ("accent", "bg", 4.5), ("accent", "surface", 4.5),
    ("accent2", "bg", 4.5), ("accent2", "surface", 4.5),
    ("accent3", "bg", 4.5), ("accent3", "surface", 4.5),
    ("onAccent", "accent", 4.5),
]
GRAPHIC_CHECKS = [("x4", 3.0), ("x5", 3.0), ("x6", 3.0)]


def check_palettes(data: dict):
    """Retorna lista de falhas: (paleta, modo, descrição, razão, mínimo)."""
    failures = []
    for pid, pal in data.items():
        if pid.startswith("_"):
            continue
        for mode in ("light", "dark"):
            tok = pal[mode]
            for fg, bg, minimum in TEXT_CHECKS:
                r = ratio(tok[fg], tok[bg])
                if r < minimum:
                    failures.append((pid, mode, f"{fg} em {bg}", r, minimum))
            for name, minimum in GRAPHIC_CHECKS:
                r = ratio(pal[name], tok["bg"])
                if r < minimum:
                    failures.append((pid, mode, f"{name} em bg", r, minimum))
    return failures


def main() -> int:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "assets" / "palettes.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    fails = check_palettes(data)
    for pid, mode, what, r, m in fails:
        print(f"FALHA {pid}/{mode}: {what} = {r:.2f}:1 (mínimo {m}:1)")
    n = len([k for k in data if not k.startswith('_')])
    print(f"{n} paletas verificadas, {len(fails)} falha(s).")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
