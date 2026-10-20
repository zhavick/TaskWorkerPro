$reader = [System.IO.File]::OpenText("database/TrackerKerja_Sync_20261020_142603.sql")
$inTable = $false
$currentBlock = New-Object System.Collections.Generic.List[string]

while (($line = $reader.ReadLine()) -ne $null) {
    if ($line -match "CREATE TABLE\s+(?!IF NOT EXISTS\s+`"tces|public\.tces)") {
        $inTable = $true
        $currentBlock.Clear()
        $currentBlock.Add($line)
    } elseif ($inTable) {
        $currentBlock.Add($line)
        if ($line.Trim().EndsWith(");")) {
            $inTable = $false
            Write-Output ($currentBlock -join "`r`n")
            Write-Output "`r`n========================================================`r`n"
        }
    }
}
$reader.Close()
