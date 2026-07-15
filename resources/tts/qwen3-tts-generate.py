import argparse
import os
import sys
from pathlib import Path

import torch
import soundfile as sf
from qwen_tts import Qwen3TTSModel


def eprint(message: str) -> None:
    print(message, file=sys.stderr, flush=True)


def read_text(path: Path) -> str:
    text = path.read_text(encoding="utf-8").strip()
    if not text:
        raise ValueError("input text is empty")
    return text


def resolve_model_path(raw_path: str) -> Path:
    candidates = []
    if raw_path:
        candidates.append(Path(raw_path))

    base_dir = Path(__file__).resolve().parent
    candidates.extend([
        base_dir / "models" / "Qwen3-TTS-12Hz-0.6B-CustomVoice",
        base_dir / "models" / "Qwen3-TTS-12Hz-1.7B-CustomVoice",
        base_dir / "models" / "Qwen3-TTS-12Hz-0.6B-Base",
        base_dir / "models" / "Qwen3-TTS",
    ])

    for candidate in candidates:
        if candidate.exists():
            return candidate.resolve()

    raise FileNotFoundError(
        "Qwen3-TTS model directory was not found. "
        "Put it into resources/tts/models/Qwen3-TTS-12Hz-0.6B-CustomVoice "
        "or set IT_STALKER_TTS_MODEL."
    )


def load_model(model_path: Path, device: str):
    dtype = torch.bfloat16 if device.startswith("cuda") else torch.float32
    kwargs = {
        "device_map": device,
        "dtype": dtype,
    }
    return Qwen3TTSModel.from_pretrained(str(model_path), **kwargs)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate WAV with local Qwen3-TTS.")
    parser.add_argument("--input", required=True, help="UTF-8 text file")
    parser.add_argument("--output", required=True, help="Output WAV file")
    parser.add_argument("--model", default=os.environ.get("IT_STALKER_TTS_MODEL", ""))
    parser.add_argument("--speaker", default=os.environ.get("IT_STALKER_TTS_SPEAKER", "Ryan"))
    parser.add_argument("--language", default=os.environ.get("IT_STALKER_TTS_LANGUAGE", "Russian"))
    parser.add_argument("--instruct", default=os.environ.get("IT_STALKER_TTS_INSTRUCT", ""))
    parser.add_argument("--device", default=os.environ.get("IT_STALKER_TTS_DEVICE", "auto"))
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    text = read_text(input_path)
    model_path = resolve_model_path(args.model)

    if args.device == "auto":
        device = "cuda:0" if torch.cuda.is_available() else "cpu"
    else:
        device = args.device

    eprint(f"Qwen3-TTS: loading model from {model_path}")
    eprint(f"Qwen3-TTS: device={device}, speaker={args.speaker}, language={args.language}")
    model = load_model(model_path, device)

    generate_kwargs = {
        "text": text,
        "language": args.language,
        "speaker": args.speaker,
    }
    if args.instruct:
        generate_kwargs["instruct"] = args.instruct

    wavs, sr = model.generate_custom_voice(**generate_kwargs)
    sf.write(str(output_path), wavs[0], sr)
    print(f"OK {sr}", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        eprint(f"Qwen3-TTS failed: {exc}")
        raise