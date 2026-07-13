Launchers layout
================

Use files inside practice_2026\launchers.
All launchers start the same app, but with different LLM and Whisper models.
Whisper GPU is intentionally disabled in all launchers because it previously crashed on startup.

01_recommended
- GPU_Qwen3_WhisperMedium.bat: recommended GPU quality variant.
- GPU_Qwen3_WhisperSmall.bat: same LLM, lighter/faster Whisper.
- CPU_Qwen25_WhisperMedium.bat: recommended CPU baseline.
- CPU_Qwen25_WhisperSmall.bat: CPU baseline with lighter Whisper.

02_qwen3_instruct
- Qwen3 4B Instruct variants for direct comparison: CPU/CUDA + Whisper small/medium.

03_qwen25_light
- Qwen2.5 3B variants. This is the lightest baseline for CPU tests.

04_other_models
- Gemma 4 E2B, Ministral 3B, Llama 3.2 3B variants with Whisper small.

05_experimental_heavy
- Qwen3 Thinking and Qwen3.5 9B. These are heavier/slower; mainly for experiments.

99_old_names_archive
- Old ZAPUSK*.bat names saved only as an archive/reference.
- Prefer the structured launchers above.