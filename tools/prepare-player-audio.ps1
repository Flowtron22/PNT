param(
 [string]$SourceDirectory = (Join-Path $env:USERPROFILE 'Downloads'),
 [string]$Ffmpeg = (Join-Path $PSScriptRoot '../.local/audio-tools/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe')
)
$ErrorActionPreference = 'Stop'
$audioOutput = Join-Path $PSScriptRoot '../assets/pnt/audio'
$coinSource = Join-Path $SourceDirectory 'SE_O_Coin_GET3.wav'
$stepSourceA = Join-Path $SourceDirectory '00001 - WAV_1_GUESS_BNK_SE_FS_PC51.wav'
$stepSourceB = Join-Path $SourceDirectory 'WAV_0_GUESS_BNK_SE_FS_PC54.wav'
foreach ($audioSource in @($Ffmpeg, $coinSource, $stepSourceA, $stepSourceB)) {
 if (-not (Test-Path -LiteralPath $audioSource)) { throw "Missing audio input/tool: $audioSource" }
}
# Remove the coin clip's silent tail for continuous looping; match footstep peaks.
& $Ffmpeg -y -i $coinSource -t 0.72 -af 'afade=t=out:st=0.70:d=0.02' -ac 1 -ar 44100 -c:a pcm_s16le (Join-Path $audioOutput 'Coin_GET3.wav')
if ($LASTEXITCODE -ne 0) { throw 'Coin conversion failed' }
& $Ffmpeg -y -i $stepSourceA -af 'volume=16dB' -ac 1 -ar 44100 -c:a pcm_s16le (Join-Path $audioOutput 'Footstep_A.wav')
if ($LASTEXITCODE -ne 0) { throw 'Footstep A conversion failed' }
& $Ffmpeg -y -i $stepSourceB -ac 1 -ar 44100 -c:a pcm_s16le (Join-Path $audioOutput 'Footstep_B.wav')
if ($LASTEXITCODE -ne 0) { throw 'Footstep B conversion failed' }
