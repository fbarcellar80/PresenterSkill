"""Utilidades compartilhadas pelos testes."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKILL = ROOT / "skills" / "presenter-slides"
SCRIPTS = SKILL / "scripts"
EXAMPLES = ROOT / "examples"
sys.path.insert(0, str(SCRIPTS))
