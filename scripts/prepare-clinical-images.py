"""Encode generated brand assets for the web; leave source artwork unchanged."""
from pathlib import Path
import argparse
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'apps/web/public/brand/clinical'
ORIGINALS = ROOT / 'output/imagegen/clinical'

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--hero', required=True, type=Path)
    parser.add_argument('--evidence', required=True, type=Path)
    parser.add_argument('--workflow', required=True, type=Path)
    args = parser.parse_args()
    DEST.mkdir(parents=True, exist_ok=True)
    ORIGINALS.mkdir(parents=True, exist_ok=True)
    for name, source, widths in [
        ('clarity-hero', args.hero, [768, 1536]),
        ('evidence-layers', args.evidence, [1024]),
        ('connected-workflow', args.workflow, [1024]),
    ]:
        shutil.copy2(source, ORIGINALS / f'{name}-v1.png')
        with Image.open(source) as original:
            for width in widths:
                height = round(original.height * width / original.width)
                image = original.convert('RGB').resize((width, height), Image.Resampling.LANCZOS)
                target = DEST / f'{name}-{width}.webp'
                image.save(target, 'WEBP', quality=84, method=6)
                print(f'{target.relative_to(ROOT)}: {target.stat().st_size:,} bytes')

if __name__ == '__main__':
    main()
