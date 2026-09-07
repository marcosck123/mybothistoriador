#!/usr/bin/env python3
"""Renderiza vídeos verticais reais usando Kokoro e FFmpeg."""

import argparse
import json
import random
import shutil
import subprocess
import tempfile
from pathlib import Path


def run(command: list[str]) -> None:
    subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def split_text(text: str, parts: int) -> list[str]:
    words = text.split()
    size = max(1, (len(words) + parts - 1) // parts)
    return [" ".join(words[index:index + size]) for index in range(0, len(words), size)]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stories", required=True, type=Path)
    parser.add_argument("--videos", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--count", type=int, default=6)
    parser.add_argument("--parts", type=int, default=2)
    parser.add_argument("--duration", type=float, default=0)
    parser.add_argument("--voice", default="pm_alex")
    parser.add_argument("--speed", type=float, default=1.0)
    args = parser.parse_args()

    if not shutil.which("ffmpeg"):
        raise SystemExit("FFmpeg não está instalado ou não está no PATH.")
    try:
        from kokoro import KPipeline
        import numpy as np
        import soundfile as sf
    except ImportError as error:
        raise SystemExit("Kokoro ausente. Instale voice/requirements.txt em Python 3.10–3.12.") from error

    story_files = list(args.stories.rglob("*.json")) if args.stories.is_dir() else [args.stories]
    stories = []
    for story_file in story_files:
        data = json.loads(story_file.read_text(encoding="utf-8"))
        stories.extend(data.get("stories", []) if isinstance(data, dict) else data)
    stories = [story for story in stories if (story.get("text") or story.get("excerpt"))]
    videos = [path for path in args.videos.rglob("*") if path.suffix.lower() in {".mp4", ".webm", ".mov", ".m4v"}]
    if not stories:
        raise SystemExit("Nenhuma história com texto foi encontrada.")
    if not videos:
        raise SystemExit("Nenhum vídeo foi encontrado na biblioteca.")

    args.output.mkdir(parents=True, exist_ok=True)
    pipeline = KPipeline(lang_code="p")
    random.shuffle(stories)
    random.shuffle(videos)
    with tempfile.TemporaryDirectory(prefix="historiador-") as temporary:
        temporary_dir = Path(temporary)
        for index in range(args.count):
            story = stories[index % len(stories)]
            text_parts = split_text((story.get("text") or story.get("excerpt")).strip(), args.parts)
            part = text_parts[index % len(text_parts)]
            title = story.get("title", f"historia-{index + 1}")
            audio_path = temporary_dir / f"audio-{index}.wav"
            text_path = temporary_dir / f"text-{index}.txt"
            chunks = [audio for _, _, audio in pipeline(part, voice=args.voice, speed=args.speed)]
            if not chunks:
                raise SystemExit(f"Kokoro não gerou áudio para o vídeo {index + 1}.")
            sf.write(audio_path, np.concatenate(chunks), 24000)
            text_path.write_text(title, encoding="utf-8")
            output_path = args.output / f"video-{index + 1:02d}.mp4"
            command = ["ffmpeg", "-y", "-i", str(videos[index % len(videos)]), "-i", str(audio_path), "-map", "0:v:0", "-map", "1:a:0", "-shortest", "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p", "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-c:a", "aac", "-b:a", "192k", str(output_path)]
            run(command)
            print(f"Gerado: {output_path}")


if __name__ == "__main__":
    main()
