$api = "https://7tk9dzahgk.execute-api.ap-south-1.amazonaws.com"
$cid = "4qka4upn5emacb6pcmu7hn8ke3"
$origin = "http://localhost:5173"

function Get-Token($email, $pw) {
  (aws cognito-idp initiate-auth --auth-flow USER_PASSWORD_AUTH --client-id $cid `
    --auth-parameters "USERNAME=$email,PASSWORD=$pw" --region ap-south-1 |
    ConvertFrom-Json).AuthenticationResult.IdToken
}

$script:n = 0
function T($label, [bool]$pass, $detail = "") {
  $script:n++
  $tag = if ($pass) { "PASS" } else { "FAIL" }
  "{0} #{1} {2}" -f $tag, $script:n, $label
  if (-not $pass -and $detail) { "     detail: $detail" }
}

$tMember = Get-Token "member1@example.com" "Student1234"
$tAdmin  = Get-Token "admin@example.com"   "Admin1234"

# --- CORS preflight ---
$pre = (curl.exe -s -i -X OPTIONS "$api/clubs" -H "Origin: $origin" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: authorization,content-type") -join "`n"
T "preflight returns 200/204" ($pre -match "^HTTP/\S+ (200|204)") $pre
T "preflight allows origin" ($pre -match "(?im)^access-control-allow-origin:\s*$([regex]::Escape($origin))\s*$") $pre
T "preflight allows authorization header" ($pre -match "(?im)^access-control-allow-headers:.*authorization") $pre
T "preflight allows PATCH and DELETE" (($pre -match "(?im)^access-control-allow-methods:.*PATCH") -and ($pre -match "(?im)^access-control-allow-methods:.*DELETE")) $pre

$bad = (curl.exe -s -i -X OPTIONS "$api/clubs" -H "Origin: https://evil.example" -H "Access-Control-Request-Method: GET") -join "`n"
T "preflight from other origin gets no allow-origin" ($bad -notmatch "(?im)^access-control-allow-origin:") $bad

# --- real request with Origin ---
$me = (curl.exe -s -i "$api/me" -H "Authorization: Bearer $tMember" -H "Origin: $origin") -join "`n"
T "GET /me with Origin returns 200" ($me -match "^HTTP/\S+ 200") $me
T "GET /me response has allow-origin" ($me -match "(?im)^access-control-allow-origin:\s*$([regex]::Escape($origin))\s*$") $me

# --- /me shape ---
$meBody = curl.exe -s "$api/me" -H "Authorization: Bearer $tMember" | ConvertFrom-Json
T "/me shape (member): userId, email, groups contains student" ($meBody.userId -and $meBody.email -and (@($meBody.groups) -contains "student")) ($meBody | ConvertTo-Json -Compress)
$adminBody = curl.exe -s "$api/me" -H "Authorization: Bearer $tAdmin" | ConvertFrom-Json
T "/me shape (admin): groups contains college_admin" ($adminBody.userId -and (@($adminBody.groups) -contains "college_admin")) ($adminBody | ConvertTo-Json -Compress)

# --- Cognito called the way the browser will call it ---
$tmp = [IO.Path]::GetTempFileName()
$okBody = '{"AuthFlow":"USER_PASSWORD_AUTH","ClientId":"' + $cid + '","AuthParameters":{"USERNAME":"member1@example.com","PASSWORD":"Student1234"}}'
[IO.File]::WriteAllText($tmp, $okBody)
$cog = (curl.exe -s -i -X POST "https://cognito-idp.ap-south-1.amazonaws.com/" -H "Content-Type: application/x-amz-json-1.1" -H "X-Amz-Target: AWSCognitoIdentityProviderService.InitiateAuth" -H "Origin: $origin" --data-binary "@$tmp") -join "`n"
T "Cognito InitiateAuth from browser origin: 200 + allow-origin + IdToken" (($cog -match "^HTTP/\S+ 200") -and ($cog -match "(?im)^access-control-allow-origin:") -and ($cog -match "IdToken")) ($cog.Substring(0, [Math]::Min(400, $cog.Length)))

$badBody = '{"AuthFlow":"USER_PASSWORD_AUTH","ClientId":"' + $cid + '","AuthParameters":{"USERNAME":"member1@example.com","PASSWORD":"WrongPass999"}}'
[IO.File]::WriteAllText($tmp, $badBody)
$cogBad = (curl.exe -s -i -X POST "https://cognito-idp.ap-south-1.amazonaws.com/" -H "Content-Type: application/x-amz-json-1.1" -H "X-Amz-Target: AWSCognitoIdentityProviderService.InitiateAuth" -H "Origin: $origin" --data-binary "@$tmp") -join "`n"
T "Cognito wrong password: 400 + NotAuthorizedException" (($cogBad -match "^HTTP/\S+ 400") -and ($cogBad -match "NotAuthorizedException")) $cogBad
Remove-Item $tmp

# --- no token ---
$noTok = (curl.exe -s -i "$api/me" -H "Origin: $origin") -join "`n"
T "GET /me without token returns 401" ($noTok -match "^HTTP/\S+ 401") $noTok