"""Pack two or four approved PNGs losslessly; requires Pillow at authoring time only."""

import argparse
from pathlib import Path
from tempfile import TemporaryDirectory

from PIL import Image, ImageChops


def verify_frames(output, frames, durations):
    """Check decoded RGBA pixels, timing and loop metadata before publishing the asset."""
    with Image.open(output) as animation:
        if animation.n_frames != len(frames) or animation.info.get("loop") != 0:
            raise ValueError("The encoded frame count or loop mode differs from the source.")

        for index, (expected, duration) in enumerate(zip(frames, durations)):
            animation.seek(index)
            actual = animation.convert("RGBA")
            expected_alpha = expected.getchannel("A")
            if ImageChops.difference(actual.getchannel("A"), expected_alpha).getbbox():
                raise ValueError(f"Transparency changed in encoded frame {index + 1}.")

            # RGB beneath fully transparent pixels is invisible and may be discarded by WebP.
            visible = expected_alpha.point(lambda value: 255 if value else 0)
            rgb_difference = ImageChops.difference(
                actual.convert("RGB"), expected.convert("RGB")
            )
            visible_difference = Image.composite(
                rgb_difference, Image.new("RGB", actual.size), visible
            )
            if visible_difference.getbbox():
                raise ValueError(f"Visible colors changed in encoded frame {index + 1}.")
            if animation.info.get("duration") != duration:
                raise ValueError(f"The timing changed in encoded frame {index + 1}.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--frames", nargs="+", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--pause-ms", type=int, default=4000)
    args = parser.parse_args()
    if len(args.frames) not in (2, 4):
        parser.error("Provide two ear-twitch frames or four progressive blink frames.")
    if args.pause_ms < 1000:
        parser.error("Use at least 1000 ms of rest between blinks.")
    if args.output.suffix.lower() != ".webp":
        parser.error("The output must use the .webp extension.")
    if args.output.resolve() in {path.resolve() for path in args.frames}:
        parser.error("The output cannot overwrite a source frame.")

    originals = []
    for path in args.frames:
        with Image.open(path) as image:
            image.load()
            if image.mode != "RGBA" or image.getchannel("A").getextrema()[0] != 0:
                raise ValueError(f"{path} must be an RGBA image with transparency.")
            originals.append(image.copy())
    if len({image.size for image in originals}) != 1:
        raise ValueError("All source canvases must have exactly the same dimensions.")

    # Reuse the intermediate drawings in reverse; no redraw, resize, blur or frame interpolation.
    if len(originals) == 2:
        frames = originals
        durations = [args.pause_ms, 70]
    else:
        frames = [originals[index] for index in (0, 1, 2, 3, 2, 1)]
        durations = [args.pause_ms, 60, 60, 100, 60, 60]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    # Keep incomplete files outside public/, so ng serve/build never sees a half-written asset.
    with TemporaryDirectory(prefix="presence-encode-", dir=Path(__file__).resolve().parent) as work:
        pending = Path(work) / "animation.webp"
        frames[0].save(
            pending,
            format="WEBP",
            save_all=True,
            append_images=frames[1:],
            duration=durations,
            loop=0,
            lossless=True,
            allow_mixed=False,
            quality=100,
            alpha_quality=100,
            method=6,
            minimize_size=True,
            background=(0, 0, 0, 0),
        )
        verify_frames(pending, frames, durations)
        pending.replace(args.output)

    print(
        f"Verified {args.output}: {originals[0].width}x{originals[0].height}, "
        f"{len(frames)} frames, {sum(durations)} ms, {args.output.stat().st_size} bytes."
    )


if __name__ == "__main__":
    main()
