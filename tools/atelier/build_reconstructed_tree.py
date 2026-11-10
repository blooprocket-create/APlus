"""Original reconstructed elder: source paint/UVs -> runtime glTF.
Normal art export requires Blender only, never inference weights/network.
"""
import os,runpy
from pathlib import Path
root=Path(__file__).resolve().parents[2]
os.environ.update(ASTRAL_SCULPT_SOURCE=str(root/'art/atelier/sculpts/elder-tree'),ASTRAL_SCULPT_HEIGHT='12.4',ASTRAL_SCULPT_OUTPUT='elder-tree.glb',ASTRAL_SCULPT_LABEL='Elder tree',ASTRAL_SCULPT_PIVOT='roots',ASTRAL_SCULPT_BLEND='ElderTree.blend')
runpy.run_path(str(root/'tools/atelier/build_reconstructed_keeper.py'),run_name='__main__')
