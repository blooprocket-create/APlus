"""Reproducible portrait conditioning from our original character paintings.
No retouching or new design: preserve the original pixels and record crop/hash.
"""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parents[3]
parser = argparse.ArgumentParser()
parser.add_argument('output', type=Path)
args = parser.parse_args()
if any((args.output / name).exists() for name in ['embedding.npy', 'latents.npy', 'CelestiaFitted.blend']):
    raise RuntimeError('Use a fresh candidate directory; do not replace active conditioning or reviewed sources')
args.output.mkdir(parents=True, exist_ok=True)
front = root / 'art/atelier/references/celestia-apose.png'
back = root / 'art/atelier/references/celestia-back-paint.png'
front_box, back_box = (350, 15, 680, 307), (470, 175, 790, 470)
Image.open(front).crop(front_box).save(args.output / 'source.png')
Image.open(back).crop(back_box).save(args.output / 'back-source.png')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

(args.output / 'crop.json').write_text(json.dumps({
    'source': str(front.relative_to(root)), 'sourceSHA256': sha(front),
    'crop': front_box, 'conditioningSHA256': sha(args.output / 'source.png'),
    'backSource': str(back.relative_to(root)), 'backSourceSHA256': sha(back),
    'backCrop': back_box, 'backCropSHA256': sha(args.output / 'back-source.png'),
    'method': 'Unretouched original pixels for portrait-scale 3D conditioning; same original identity, no new painted details'
}, indent=2) + '\n')
print('Original portrait source prepared:', args.output)
