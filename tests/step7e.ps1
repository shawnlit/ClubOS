$acct = aws sts get-caller-identity --query Account --output text
$bucket = "clubos-frontend-$acct"
$site = "http://$bucket.s3-website.ap-south-1.amazonaws.com"
$api = "https://7tk9dzahgk.execute-api.ap-south-1.amazonaws.com"

$script:n = 0
function T($label, [bool]$pass, $detail = "") {
  $script:n++
  $tag = if ($pass) { "PASS" } else { "FAIL" }
  "{0} #{1} {2}" -f $tag, $script:n, $label
  if (-not $pass -and $detail) { "     detail: $detail" }
}

$root = (curl.exe -s -i $site) -join "`n"
T "site root returns 200 and contains the app root" (($root -match "^HTTP/\S+ 200") -and ($root -match 'id="root"')) $root.Substring(0, [Math]::Min(300, $root.Length))

$deep = (curl.exe -s -i "$site/clubs") -join "`n"
T "deep link /clubs serves the app (index.html)" ($deep -match 'id="root"') $deep.Substring(0, [Math]::Min(300, $deep.Length))

$pre = (curl.exe -s -i -X OPTIONS "$api/clubs" -H "Origin: $site" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: authorization,content-type") -join "`n"
T "API preflight allows the site origin" ($pre -match "(?im)^access-control-allow-origin:\s*$([regex]::Escape($site))\s*$") $pre
