"""Original sculpted moon gate, exported from committed authoring sources."""
import os,runpy
from pathlib import Path
root=Path(__file__).resolve().parents[2]
os.environ.update(ASTRAL_SCULPT_SOURCE=str(root/'art/atelier/sculpts/moon-gate'),ASTRAL_SCULPT_HEIGHT='7.2',ASTRAL_SCULPT_OUTPUT='moon-gate.glb',ASTRAL_SCULPT_LABEL='Moon gate',ASTRAL_SCULPT_PIVOT='roots',ASTRAL_SCULPT_BLEND='MoonGate.blend')
runpy.run_path(str(root/'tools/atelier/build_reconstructed_keeper.py'),run_name='__main__')
