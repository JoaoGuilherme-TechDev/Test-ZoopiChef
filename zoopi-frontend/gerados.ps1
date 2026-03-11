try {
    $startTime = Get-Date
    $dir = $PSScriptRoot
    Set-Location $dir
    $out = 'projeto-gerado.txt'

    if (Test-Path $out) {
        Write-Host 'Removendo arquivo antigo...'
        Remove-Item $out
    }

    Write-Host ''
    Write-Host '================================'
    Write-Host ' GERADOR DE CODIGO PARA IA'
    Write-Host '================================'
    Write-Host ''

    # Pastas ignoradas
    $ignoreFolders = @(
        'node_modules', 'dist', 'build', '.git', '.next', '.cache', '.vite',
        'coverage', '.turbo', 'out', 'public', '.idea', '.vscode',
        'dev-dist',                    # service worker compilado
        'components\ui', 'components/ui'  # shadcn - a IA ja conhece
    )

    # Arquivos ignorados por nome (suporta wildcards)
    $ignoreFiles = @(
        # locks e configs de package manager
        'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
        # arquivos gerados/compilados
        '*.min.js', '*.min.css', '*.map',
        'workbox-*.js', 'sw.js', 'registerSW.js',
        # o proprio output do script e o script em si
        'projeto-gerado.txt', 'gerar-projeto.ps1', 'gerados.ps1',
        # scripts de sistema
        '*.bat', '*.cmd', '*.exe',
        # documentacao
        'README.md', 'CHANGELOG.md', 'LICENSE',
        # arquivos grandes conhecidos com dados hardcoded
        'downloadPrint*.ts',
        # testes e2e (raramente uteis pro contexto)
        'playwright-fixture.ts', 'playwright.config.ts'
    )

    # Extensoes permitidas (so codigo relevante)
    $allowedExtensions = @(
        '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
        '.json', '.jsonc',
        '.css', '.scss', '.sass', '.less',
        '.html', '.htm',
        '.md', '.mdx',
        '.env', '.env.example', '.env.local',
        '.prisma', '.sql',
        '.yaml', '.yml',
        '.toml',
        '.ps1',
        '.graphql', '.gql'
    )

    # Tamanho maximo por arquivo em bytes (40KB)
    $maxFileSize = 40000

    Write-Host 'Escaneando arquivos...'

    $files = Get-ChildItem -Recurse -File | Where-Object {
        # Ignora pastas
        foreach ($folder in $ignoreFolders) {
            if ($_.FullName -match [regex]::Escape($folder)) { return $false }
        }

        # Ignora arquivos por nome/padrao
        foreach ($pattern in $ignoreFiles) {
            if ($_.Name -like $pattern) { return $false }
        }

        # So permite extensoes relevantes
        if ($allowedExtensions -notcontains $_.Extension.ToLower()) { return $false }

        return $true
    }

    $total = $files.Count
    Write-Host "Arquivos encontrados: $total"
    Write-Host ''

    # Top 10 maiores para diagnostico
    Write-Host '--- Top 10 maiores arquivos ---'
    $files | Sort-Object Length -Descending | Select-Object -First 10 | ForEach-Object {
        $kb = [math]::Round($_.Length / 1024, 1)
        Write-Host "  ${kb}KB  $($_.Name)"
    }
    Write-Host ''

    $index = 0
    $totalSize = 0
    $skipped = 0

    foreach ($f in $files) {
        $index++
        Write-Progress `
            -Activity 'Processando arquivos' `
            -Status "$index de $total - $($f.Name)" `
            -PercentComplete (($index / $total) * 100)

        $rel = $f.FullName.Substring($dir.Length + 1)

        # Pula arquivos muito grandes
        if ($f.Length -gt $maxFileSize) {
            $skipped++
            $fkb = [math]::Round($f.Length / 1024)
            Add-Content $out "===== $rel ====="
            Add-Content $out "[IGNORADO: arquivo muito grande (${fkb}KB) - considere quebrar em componentes menores]"
            Add-Content $out ''
            continue
        }

        $content = Get-Content $f.FullName -Raw -ErrorAction SilentlyContinue
        if ($null -eq $content) { continue }

        $totalSize += $content.Length

        Add-Content $out "===== $rel ====="
        Add-Content $out $content
        Add-Content $out ''
    }

    Write-Progress -Activity 'Processando arquivos' -Completed

    $duration = (Get-Date) - $startTime
    $sizeKB = [math]::Round($totalSize / 1024, 1)
    $sizeMB = [math]::Round($totalSize / 1024 / 1024, 2)
    $secs = [math]::Round($duration.TotalSeconds, 1)
    $processados = $total - $skipped
    $limiteKB = [math]::Round($maxFileSize / 1024)

    Write-Host ''
    Write-Host '================================'
    Write-Host 'FINALIZADO'
    Write-Host "Arquivos processados : $processados"
    Write-Host "Arquivos ignorados   : $skipped (acima de ${limiteKB}KB)"
    Write-Host "Tamanho total        : ${sizeKB}KB (${sizeMB}MB)"
    Write-Host "Tempo                : ${secs}s"
    Write-Host "Arquivo gerado       : $out"
    Write-Host '================================'
    Write-Host ''

    # Lista ignorados por tamanho para o usuario investigar
    $ignoradosTamanho = $files | Where-Object { $_.Length -gt $maxFileSize }
    if ($ignoradosTamanho.Count -gt 0) {
        Write-Host '--- Arquivos ignorados por tamanho (considere refatorar) ---'
        $ignoradosTamanho | Sort-Object Length -Descending | ForEach-Object {
            $kb = [math]::Round($_.Length / 1024, 1)
            $rel = $_.FullName.Substring($dir.Length + 1)
            Write-Host "  ${kb}KB  $rel"
        }
        Write-Host ''
    }
}
catch {
    Write-Host 'ERRO:'
    Write-Host $_
}
finally {
    Write-Host ''
    Read-Host 'Pressione ENTER para fechar'
}