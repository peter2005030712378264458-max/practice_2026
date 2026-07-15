import argparse
import json
import os
import sys
from pathlib import Path

import torch
import soundfile as sf
from qwen_tts import Qwen3TTSModel


def eprint(message: str) -> None:
    print(message, file=sys.stderr, flush=True)


def send(payload: dict) -> None:
    print(json.dumps(payload, ensure_ascii=False), flush=True)


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

    raise FileNotFoundError("Qwen3-TTS model directory was not found")


def load_model(model_path: Path, device: str):
    dtype = torch.bfloat16 if device.startswith("cuda") else torch.float32
    return Qwen3TTSModel.from_pretrained(str(model_path), device_map=device, dtype=dtype)


def main() -> int:
    parser = argparse.ArgumentParser(description="Persistent local Qwen3-TTS JSONL server.")
    parser.add_argument("--model", default=os.environ.get("IT_STALKER_TTS_MODEL", ""))
    parser.add_argument("--speaker", default=os.environ.get("IT_STALKER_TTS_SPEAKER", "Ryan"))
    parser.add_argument("--language", default=os.environ.get("IT_STALKER_TTS_LANGUAGE", "Russian"))
    parser.add_argument("--device", default=os.environ.get("IT_STALKER_TTS_DEVICE", "auto"))
    args = parser.parse_args()

    device = "cuda:0" if args.device == "auto" and torch.cuda.is_available() else args.device
    if device == "auto":
        device = "cpu"

    model_path = resolve_model_path(args.model)
    eprint(f"Qwen3-TTS server loading model from {model_path}")
    eprint(f"Qwen3-TTS server device={device}, speaker={args.speaker}, language={args.language}")
    model = load_model(model_path, device)
    send({"type": "ready", "device": device, "model": str(model_path)})

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
            request_id = request.get("id")
            input_path = Path(request["input"])
            output_path = Path(request["output"])
            output_path.parent.mkdir(parents=True, exist_ok=True)
            text = input_path.read_text(encoding="utf-8").strip()
            if not text:
                raise ValueError("input text is empty")

            wavs, sr = model.generate_custom_voice(
                text=text,
                language=request.get("language") or args.language,
                speaker=request.get("speaker") or args.speaker,
                instruct=request.get("instruct") or None,
            )
            sf.write(str(output_path), wavs[0], sr)
            send({"id": request_id, "ok": True, "sample_rate": sr, "output": str(output_path)})
        except Exception as exc:
            send({"id": request.get("id") if 'request' in locals() else None, "ok": False, "error": str(exc)})
            eprint(f"Qwen3-TTS request failed: {exc}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())