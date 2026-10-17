$api = "https://7tk9dzahgk.execute-api.ap-south-1.amazonaws.com"
$cid = "4qka4upn5emacb6pcmu7hn8ke3"

function Get-Token($email, $pw) {
  (aws cognito-idp initiate-auth --auth-flow USER_PASSWORD_AUTH --client-id $cid `
    --auth-parameters "USERNAME=$email,PASSWORD=$pw" --region ap-south-1 |
    ConvertFrom-Json).AuthenticationResult.IdToken
}

function Iso($days) {
  [DateTime]::UtcNow.AddDays($days).ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", [Globalization.CultureInfo]::InvariantCulture)
}

function Call($method, $path, $token, $body = $null) {
  $p = @{ Uri = "$api$path"; Method = $method; UseBasicParsing = $true }
  if ($token) { $p.Headers = @{ Authorization = "Bearer $token" } }
  if ($body)  { $p.Body = ($body | ConvertTo-Json -Compress); $p.ContentType = "application/json" }
  try   { $r = Invoke-WebRequest @p; $code = [int]$r.StatusCode; $text = $r.Content }
  catch { $code = [int]$_.Exception.Response.StatusCode; $text = $_.ErrorDetails.Message }
  $json = $null
  if ($text) { try { $json = $text | ConvertFrom-Json } catch {} }
  [pscustomobject]@{ Status = $code; Body = $json; Raw = $text }
}

$script:n = 0
function T($label, $r, $status, $ok = $true) {
  $script:n++
  $pass = ($r.Status -eq $status) -and $ok
  $tag = if ($pass) { "PASS" } else { "FAIL" }
  "{0} #{1} {2} (got {3}, want {4})" -f $tag, $script:n, $label, $r.Status, $status
  if (-not $pass) { "     body: $($r.Raw)" }
}

# --- tokens ---
$tAdmin = Get-Token "admin@example.com"    "Admin1234"
$tExec  = Get-Token "exec1@example.com"    "Student1234"
$tM1    = Get-Token "member1@example.com"  "Student1234"
$tS2    = Get-Token "student2@example.com" "Student1234"
$tS3    = Get-Token "student3@example.com" "Student1234"

# --- setup: fresh club, exec1 = executive, member1 + student2 = members, student3 = outsider ---
$r = Call POST "/clubs" $tAdmin @{ name = "Step6 Club $(Get-Random)"; description = "step 6 tests"; category = "tech" }
$clubId = if ($r.Body.clubId) { $r.Body.clubId } else { $r.Body.club.clubId }
"setup club: $($r.Status) $clubId"

function Join-Approve($token, $extra) {
  $uid = (Call GET "/me" $token).Body.userId
  $j = Call POST "/clubs/$clubId/join" $token
  $p = Call PATCH "/clubs/$clubId/members/$uid" $tAdmin (@{ status = "approved" } + $extra)
  "setup member $uid : join $($j.Status), approve $($p.Status)"
}
Join-Approve $tExec @{ role = "executive" }
Join-Approve $tM1 @{}
Join-Approve $tS2 @{}

$good = @{ title = "Hack Night"; description = "Build stuff"; venue = "Lab 1"; startsAt = (Iso 7); registrationDeadline = (Iso 5); capacity = 3 }
$evId  = (Call POST "/clubs/$clubId/events" $tExec $good).Body.eventId
$ev2Id = (Call POST "/clubs/$clubId/events" $tExec $good).Body.eventId
"setup events: $evId $ev2Id"

# --- tests ---
$r = Call POST "/clubs/$clubId/events/$evId/register" $tM1
$tick1 = $r.Body.ticketId
T "member1 registers, gets ticketId" $r 201 ([bool]$tick1)

$r = Call POST "/clubs/$clubId/events/$evId/register" $tS2
$tick2 = $r.Body.ticketId
T "student2 registers, ticketId differs" $r 201 ($tick2 -and $tick2 -ne $tick1)

$r = Call GET "/clubs/$clubId/events/$evId/ticket" $tM1
T "member1 gets own ticket" $r 200 ($r.Body.ticketId -eq $tick1 -and $r.Body.status -eq "registered")
T "outsider has no ticket" (Call GET "/clubs/$clubId/events/$evId/ticket" $tS3) 404
T "ticket without token" (Call GET "/clubs/$clubId/events/$evId/ticket" $null) 401

T "check-in by plain member" (Call POST "/clubs/$clubId/events/$evId/checkin" $tM1 @{ ticketId = $tick2 }) 403
T "check-in by outsider" (Call POST "/clubs/$clubId/events/$evId/checkin" $tS3 @{ ticketId = $tick2 }) 403
T "check-in missing ticketId" (Call POST "/clubs/$clubId/events/$evId/checkin" $tExec @{ foo = "bar" }) 400
T "check-in bogus ticketId" (Call POST "/clubs/$clubId/events/$evId/checkin" $tExec @{ ticketId = "bogus-ticket" }) 404

$r = Call POST "/clubs/$clubId/events/$evId/checkin" $tExec @{ ticketId = $tick1 }
T "exec checks in member1" $r 200 ($r.Body.message -eq "Checked in")
T "check-in same ticket again" (Call POST "/clubs/$clubId/events/$evId/checkin" $tExec @{ ticketId = $tick1 }) 409
T "cancel after check-in" (Call DELETE "/clubs/$clubId/events/$evId/register" $tM1) 409

T "attendance as plain member" (Call GET "/clubs/$clubId/events/$evId/attendance" $tM1) 403
$r = Call GET "/clubs/$clubId/events/$evId/attendance" $tExec
T "attendance as exec (2 total, 1 checked in)" $r 200 ($r.Body.total -eq 2 -and $r.Body.checkedIn -eq 1)

T "student2 cancels (not checked in)" (Call DELETE "/clubs/$clubId/events/$evId/register" $tS2) 200
$r = Call GET "/clubs/$clubId/events/$evId/attendance" $tAdmin
T "attendance as admin (1 total, 1 checked in)" $r 200 ($r.Body.total -eq 1 -and $r.Body.checkedIn -eq 1)
T "cancelled student2 ticket is invalid" (Call POST "/clubs/$clubId/events/$evId/checkin" $tExec @{ ticketId = $tick2 }) 404

$r = Call POST "/clubs/$clubId/events/$evId/register" $tS2
T "student2 re-registers, new ticketId" $r 201 ($r.Body.ticketId -and $r.Body.ticketId -ne $tick2)

$r = Call POST "/clubs/$clubId/events/$ev2Id/register" $tM1
$tick3 = $r.Body.ticketId
T "member1 registers for event 2" $r 201 ([bool]$tick3)
T "event 2 ticket rejected at event 1" (Call POST "/clubs/$clubId/events/$evId/checkin" $tExec @{ ticketId = $tick3 }) 404
