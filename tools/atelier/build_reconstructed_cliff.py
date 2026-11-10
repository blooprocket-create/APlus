"""Original vista sculpture and its authored surface-flow attachments."""
import os,runpy,shutil
from pathlib import Path
root=Path(__file__).resolve().parents[2];source=root/'art/atelier/sculpts/riven-cliff'
os.environ.update(ASTRAL_SCULPT_SOURCE=str(source),ASTRAL_SCULPT_HEIGHT='42',ASTRAL_SCULPT_OUTPUT='riven-cliff.glb',ASTRAL_SCULPT_LABEL='Riven cliff',ASTRAL_SCULPT_PIVOT='roots',ASTRAL_SCULPT_BLEND='RivenCliff.blend')
runpy.run_path(str(root/'tools/atelier/build_reconstructed_keeper.py'),run_name='__main__')
shutil.copyfile(source/'flow-path.json',root/'public/art/observatory/riven-cliff-flow.json')
