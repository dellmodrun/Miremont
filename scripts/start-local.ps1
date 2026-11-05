$ErrorActionPreference = 'Stop'

$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$validator = '/root/.local/share/solana/install/active_release/bin/solana-test-validator'
$solana = '/root/.local/share/solana/install/active_release/bin/solana'
$ledger = '/root/miremont-ledger-20261105'
$programId = 'HB1DSzqQFLRPAabjSoFGG7tbkNGya27enKfuAsXJND88'
$wslProgram = '/mnt/c/Users/Administrator/Desktop/01/swarm-site-local/miremont_protocol/target/deploy/miremont_protocol.so'
$wslProgramKey = '/mnt/c/Users/Administrator/Desktop/01/swarm-site-local/miremont_protocol/target/deploy/miremont_protocol-keypair.json'

if (-not (Get-NetTCPConnection -LocalPort 8899 -State Listen -ErrorAction SilentlyContinue)) {
  Start-Process -FilePath 'wsl.exe' -ArgumentList @('-d','Ubuntu-24.04','--',$validator,'--ledger',$ledger,'--quiet') -WindowStyle Hidden
  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Seconds 1
    if (Test-NetConnection -ComputerName 127.0.0.1 -Port 8899 -InformationLevel Quiet) { $ready = $true; break }
  }
  if (-not $ready) { throw 'The local Solana validator did not start. Check available disk space and the validator ledger.' }
}

& wsl.exe -d Ubuntu-24.04 -- $solana program show $programId --url http://127.0.0.1:8899 *> $null
if ($LASTEXITCODE -ne 0) {
  & wsl.exe -d Ubuntu-24.04 -- $solana airdrop 20 --url http://127.0.0.1:8899 --keypair /root/.config/solana/id.json
  & wsl.exe -d Ubuntu-24.04 -- $solana program deploy $wslProgram --program-id $wslProgramKey --url http://127.0.0.1:8899 --keypair /root/.config/solana/id.json
  Push-Location (Join-Path $projectRoot 'miremont_protocol\client')
  try { npm run test:local } finally { Pop-Location }
}

if (-not (Get-NetTCPConnection -LocalPort 4328 -State Listen -ErrorAction SilentlyContinue)) {
  Start-Process -FilePath 'node.exe' -ArgumentList 'server.mjs' -WorkingDirectory $projectRoot -WindowStyle Hidden
}

Start-Process 'http://127.0.0.1:4328/'
