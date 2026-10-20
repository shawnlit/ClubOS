$ErrorActionPreference = "Stop"
$api = "https://7tk9dzahgk.execute-api.ap-south-1.amazonaws.com"
$cid = "4qka4upn5emacb6pcmu7hn8ke3"
$adminPassword = $env:CLUBOS_ADMIN_PASSWORD
$studentPassword = $env:CLUBOS_STUDENT_PASSWORD
if (-not $adminPassword -or -not $studentPassword) {
  throw "Set CLUBOS_ADMIN_PASSWORD and CLUBOS_STUDENT_PASSWORD before running the seed script."
}

function Get-Token($email, $pw) {
  $tokenJson = aws cognito-idp initiate-auth --auth-flow USER_PASSWORD_AUTH --client-id $cid `
    --auth-parameters "USERNAME=$email,PASSWORD=$pw" --region ap-south-1
  if ($LASTEXITCODE -ne 0) { throw "Authentication failed for $email" }
  $tokenJson | ConvertFrom-Json | ForEach-Object { $_.AuthenticationResult.IdToken }
}
function Iso($days) {
  [DateTime]::UtcNow.AddDays($days).ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", [Globalization.CultureInfo]::InvariantCulture)
}
function Call($method, $path, $token, $body = $null) {
  $p = @{ Uri = "$api$path"; Method = $method; UseBasicParsing = $true }
  if ($token) { $p.Headers = @{ Authorization = "Bearer $token" } }
  if ($null -ne $body)  { $p.Body = ($body | ConvertTo-Json -Compress); $p.ContentType = "application/json" }
  try {
    $r = Invoke-WebRequest @p
    $code = [int]$r.StatusCode
    $text = $r.Content
  } catch {
    if (-not $_.Exception.Response) { throw }
    $code = [int]$_.Exception.Response.StatusCode
    $text = $_.ErrorDetails.Message
  }
  $json = $null
  if ($text) {
    try { $json = $text | ConvertFrom-Json } catch { $json = $null }
  }
  [pscustomobject]@{ Status = $code; Body = $json; Raw = $text }
}

$tAdmin = Get-Token "admin@example.com" $adminPassword
$tExec  = Get-Token "exec1@example.com" $studentPassword
$tM1    = Get-Token "member1@example.com" $studentPassword
$tS2    = Get-Token "student2@example.com" $studentPassword
$tS3    = Get-Token "student3@example.com" $studentPassword
$tT     = Get-Token "test@example.com" $studentPassword

function New-Club($name, $desc, $cat) {
  $r = Call POST "/clubs" $tAdmin @{ name = $name; description = $desc; category = $cat }
  if ($r.Status -ne 201) { throw "club '$name' failed: $($r.Raw)" }
  if ($r.Body.clubId) { $r.Body.clubId } else { $r.Body.club.clubId }
}
function Join-Approve($clubId, $token, $extra) {
  $uidResult = Call GET "/me" $token
  if ($uidResult.Status -ne 200) { throw "could not get user ID: $($uidResult.Raw)" }
  $uid = $uidResult.Body.userId
  $joined = Call POST "/clubs/$clubId/join" $token
  if ($joined.Status -ne 201) { throw "join failed: $($joined.Raw)" }
  $p = Call PATCH "/clubs/$clubId/members/$uid" $tAdmin (@{ status = "approved" } + $extra)
  if ($p.Status -ne 200) { throw "approve failed: $($p.Raw)" }
}
function New-Event($clubId, $title, $venue, $desc, $startDays, $deadlineDays, $cap) {
  $r = Call POST "/clubs/$clubId/events" $tExec @{ title = $title; description = $desc; venue = $venue; startsAt = (Iso $startDays); registrationDeadline = (Iso $deadlineDays); capacity = $cap }
  if ($r.Status -ne 201) { throw "event '$title' failed: $($r.Raw)" }
  $r.Body.eventId
}

$robotics = New-Club "Robotics Club" "Build robots, compete, and learn embedded systems." "tech"
$photo    = New-Club "Photography Club" "Photo walks, editing workshops, and exhibitions." "arts"
$ecell    = New-Club "Entrepreneurship Cell" "Pitch nights and startup mentoring." "business"

Join-Approve $robotics $tExec @{ role = "executive" }
Join-Approve $robotics $tM1 @{}
Join-Approve $robotics $tS2 @{}
$pending = Call POST "/clubs/$robotics/join" $tS3
if ($pending.Status -ne 201) { throw "pending join request failed: $($pending.Raw)" }
Join-Approve $photo $tExec @{ role = "executive" }
Join-Approve $photo $tT @{}

$e1 = New-Event $robotics "Line Follower Workshop" "Lab 2" "Hands-on session building a line-following robot." 5 3 30
$e2 = New-Event $robotics "Hack Night" "Innovation Lab" "Overnight build session." 7 5 3
$e3 = New-Event $photo "Campus Photo Walk" "Main Gate" "Golden-hour photo walk around campus." 6 4 20

$reg1 = Call POST "/clubs/$robotics/events/$e1/register" $tM1
if ($reg1.Status -ne 201) { throw "registration failed: $($reg1.Raw)" }
$reg2 = Call POST "/clubs/$robotics/events/$e2/register" $tM1
if ($reg2.Status -ne 201) { throw "registration failed: $($reg2.Raw)" }
$reg3 = Call POST "/clubs/$robotics/events/$e2/register" $tS2
if ($reg3.Status -ne 201) { throw "registration failed: $($reg3.Raw)" }

"`nSeed complete"
"Robotics Club       $robotics"
"Photography Club    $photo"
"Entrepreneurship    $ecell"
"Logins: admin@example.com / [password from CLUBOS_ADMIN_PASSWORD] ; exec1, member1, student2, student3, test @example.com / [password from CLUBOS_STUDENT_PASSWORD]"
"Pending join request: student3 -> Robotics Club (approve it live as exec1)"
