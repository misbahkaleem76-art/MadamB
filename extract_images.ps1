$urls = @(
    @{url="https://www.mariab.pk/products/sf-ef25-60r1-lilac"; brand="MariaB"},
    @{url="https://www.mariab.pk/products/dw-ef25-23-cream"; brand="MariaB"},
    @{url="https://www.mariab.pk/products/pe-ef25-01-ivory"; brand="MariaB"},
    @{url="https://www.gulahmedshop.com/"; brand="GulAhmed"},
    @{url="https://sanasafinaz.com/collections/ready-to-wear"; brand="SanaSafinaz"},
    @{url="https://saya.pk/collections/all"; brand="Saya"},
    @{url="https://pk.khaadi.com/ready-to-wear/essentials/"; brand="Khaadi"},
    @{url="https://www.junaidjamshed.com/"; brand="JJ"}
)

foreach ($item in $urls) {
    try {
        Start-Sleep -Seconds 3
        $response = Invoke-WebRequest -Uri $item.url -UseBasicParsing -TimeoutSec 30
        $html = $response.Content
        
        # Extract ALL cdn.shopify.com image URLs
        $pattern = '(https?://[^"''>\s]+cdn\.shopify\.com/s/files/[^"''>\s]+\.(jpg|png|webp))'
        $imgMatches = [regex]::Matches($html, $pattern)
        
        # Also try other CDN patterns
        $pattern2 = '(https?://[^"''>\s]+\.(jpg|png|webp))'
        $imgMatches2 = [regex]::Matches($html, $pattern2)
        
        Write-Host "=== $($item.brand) ==="
        $seen = @{}
        $count = 0
        foreach ($m in $imgMatches) {
            $imgUrl = $m.Groups[1].Value -replace '\?.*$', ''
            if (-not $seen[$imgUrl] -and $imgUrl -notmatch 'logo|icon|banner|svg|favicon|badge') {
                $seen[$imgUrl] = $true
                $count++
                Write-Host "  $count. $imgUrl"
                if ($count -ge 8) { break }
            }
        }
        if ($count -eq 0) {
            foreach ($m in $imgMatches2) {
                $imgUrl = $m.Groups[1].Value -replace '\?.*$', ''
                if (-not $seen[$imgUrl] -and $imgUrl -notmatch 'logo|icon|banner|svg|favicon|badge|sprite|pixel|blank|spacer' -and $imgUrl.Length -gt 60) {
                    $seen[$imgUrl] = $true
                    $count++
                    Write-Host "  $count. $imgUrl"
                    if ($count -ge 8) { break }
                }
            }
        }
        if ($count -eq 0) {
            Write-Host "  NO IMAGES FOUND"
        }
        Write-Host ""
    }
    catch {
        Write-Host "=== $($item.brand) ==="
        Write-Host "  ERROR: $($_.Exception.Message)"
        Write-Host ""
    }
}
