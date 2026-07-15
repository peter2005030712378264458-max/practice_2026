param(
  [Parameter(Mandatory = $true)]
  [string]$InputTextFile,

  [Parameter(Mandatory = $true)]
  [string]$OutputAudioFile,

  [string]$ModelPath = $env:IT_STALKER_TTS_MODEL,

  [string]$Voice = $env:IT_STALKER_TTS_VOICE
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PythonExe = Join-Path $ScriptDir 'venv\Scripts\python.exe'
$Generator = Join-Path $ScriptDir 'qwen3-tts-generate.py'

if (-not (Test-Path -LiteralPath $PythonExe)) {
  throw "Qwen3-TTS Python venv not found: $PythonExe. Create it in resources\tts\venv and install qwen-tts."
}

if (-not (Test-Path -LiteralPath $Generator)) {
  throw "Qwen3-TTS generator script not found: $Generator"
}

$Speaker = if ($Voice) { $Voice } elseif ($env:IT_STALKER_TTS_SPEAKER) { $env:IT_STALKER_TTS_SPEAKER } else { 'Ryan' }
$Language = if ($env:IT_STALKER_TTS_LANGUAGE) { $env:IT_STALKER_TTS_LANGUAGE } else { 'Russian' }
$Device = if ($env:IT_STALKER_TTS_DEVICE) { $env:IT_STALKER_TTS_DEVICE } else { 'auto' }

$Args = @(
  $Generator,
  '--input', $InputTextFile,
  '--output', $OutputAudioFile,
  '--speaker', $Speaker,
  '--language', $Language,
  '--device', $Device
)

if ($ModelPath) {
  $Args += @('--model', $ModelPath)
}

if ($env:IT_STALKER_TTS_INSTRUCT) {
  $Args += @('--instruct', $env:IT_STALKER_TTS_INSTRUCT)
}

& $PythonExe @Args

if ($LASTEXITCODE -ne 0) {
  throw "Qwen3-TTS generator failed with exit code $LASTEXITCODE"
}

if (-not (Test-Path -LiteralPath $OutputAudioFile)) {
  throw "Qwen3-TTS did not create output audio: $OutputAudioFile"
}