Get-ChildItem *.html | ForEach-Object {
    $c = Get-Content $_.FullName -Raw
    # Change M color from gold gradient to same maroon as the rest
    $c = $c -replace '<tspan fill="url\(#roseGold\)">M</tspan>', 'M'
    # Make tagline font bigger
    $c = $c -replace 'font-size="8" fill="#C9A96E" letter-spacing="3\.5"', 'font-size="10.5" fill="#C9A96E" letter-spacing="3"'
    Set-Content $_.FullName $c -NoNewline
    Write-Host ("Fixed: " + $_.Name)
}
