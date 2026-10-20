$ErrorActionPreference = "Stop"
$acct = aws sts get-caller-identity --query Account --output text
if ($LASTEXITCODE -ne 0) { throw "Could not determine AWS account" }
$bucket = "clubos-frontend-$acct"

Push-Location frontend
try {
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "frontend build failed" }
} finally {
  Pop-Location
}

aws s3 sync frontend/dist "s3://$bucket" --delete --region ap-south-1
if ($LASTEXITCODE -ne 0) { throw "Could not upload frontend to $bucket" }
"http://$bucket.s3-website.ap-south-1.amazonaws.com"
