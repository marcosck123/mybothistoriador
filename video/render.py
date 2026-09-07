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


def ass_time(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    remainder = seconds % 60
    return f"{hours}:{minutes:02d}:{remainder:05.2f}"


def write_subtitles(audio_path: Path, subtitle_path: Path, model) -> None:
    segments, _ = model.transcribe(str(audio_path), language="pt", vad_filter=True, beam_size=1)
    lines = ["[Script Info]", "ScriptType: v4.00+", "[V4+ Styles]", "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding", "Style: Default,Arial,22,&H00FFFFFF,&H00FFFFFF,&H00000000,&H99000000,1,0,1,3,0,2,40,40,130,1", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
    for segment in segments:
        text = segment.text.strip().replace("{", "\\{").replace("}", "\\}")
        if text:
            lines.append(f"Dialogue: 0,{ass_time(segment.start)},{ass_time(segment.end)},Default,,0,0,0,,{text}")
    subtitle_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


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
        from faster_whisper import WhisperModel
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
    whisper = WhisperModel("small", device="cpu", compute_type="int8")
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
            subtitle_path = temporary_dir / f"subtitle-{index}.ass"
            write_subtitles(audio_path, subtitle_path, whisper)
            output_path = args.output / f"video-{index + 1:02d}.mp4"
            video_filter = f"scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,subtitles={subtitle_path},format=yuv420p"
            command = ["ffmpeg", "-y", "-i", str(videos[index % len(videos)]), "-i", str(audio_path), "-map", "0:v:0", "-map", "1:a:0", "-shortest", "-vf", video_filter, "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-c:a", "aac", "-b:a", "192k", str(output_path)]
            run(command)
            print(f"Gerado: {output_path}")


if __name__ == "__main__":
    main()
