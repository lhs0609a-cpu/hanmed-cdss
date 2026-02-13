$file = "G:\내 드라이브\developer\hanmed-cdss\apps\web\src\app\consultation\ConsultationPage.tsx"
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

$content = $content -replace 'violet-500', 'slate-600'
$content = $content -replace 'violet-600', 'slate-700'
$content = $content -replace 'violet-700', 'slate-700'
$content = $content -replace 'violet-300', 'slate-300'
$content = $content -replace 'violet-100', 'slate-100'
$content = $content -replace 'violet-50', 'slate-50'

$content = $content -replace 'purple-500', 'slate-600'
$content = $content -replace 'purple-600', 'slate-700'
$content = $content -replace 'purple-700', 'slate-700'
$content = $content -replace 'purple-800', 'slate-800'
$content = $content -replace 'purple-900', 'slate-900'
$content = $content -replace 'purple-100', 'slate-100'
$content = $content -replace 'purple-200', 'slate-200'
$content = $content -replace 'purple-50', 'slate-50'

$content = $content -replace 'pink-500', 'slate-500'

[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
Write-Output "Done replacing in ConsultationPage.tsx"
