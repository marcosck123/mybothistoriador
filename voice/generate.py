#!/usr/bin/env python3
"""Gera narração local em português usando Kokoro."""

import argparse
import json
import re
from pathlib import Path


def slugify(value: str) -> str:
    value = re.sub(r"[^\w\s-]", "", value, flags=re.UNICODE).strip().lower()
    return re.sub(r"[-\s]+", "-", value)[:80] or "historia"


def main() -> None:
    parser = argparse.ArgumentParser(description="Gera WAVs locais com Kokoro")
    parser.add_argument("input", type=Path, help="JSON com uma história ou lista de histórias")
    parser.add_argument("--output", type=Path, default=Path("audio"))
    parser.add_argument("--voice", default="pm_alex", help="Voz Kokoro em português")
    parser.add_argument("--speed", type=float, default=1.0)
    args = parser.parse_args()

    try:
        from kokoro import KPipeline
        import soundfile as sf
    except ImportError as error:
        raise SystemExit(
            "Dependências ausentes. Instale com: pip install -r voice/requirements.txt"
        ) from error

    data = json.loads(args.input.read_text(encoding="utf-8"))
    stories = data.get("stories", [data]) if isinstance(data, dict) else data
    args.output.mkdir(parents=True, exist_ok=True)
    pipeline = KPipeline(lang_code="p")

    for index, story in enumerate(stories, start=1):
        text = (story.get("text") or story.get("excerpt") or "").strip()
        if not text:
            continue
        title = story.get("title", f"historia-{index}")
        output = args.output / f"{index:03d}-{slugify(title)}.wav"
        chunks = []
        for _, _, audio in pipeline(text, voice=args.voice, speed=args.speed):
            chunks.append(audio)
        if chunks:
            import numpy as np
            sf.write(output, np.concatenate(chunks), 24000)
            print(f"Gerado: {output}")


if __name__ == "__main__":
    main()
