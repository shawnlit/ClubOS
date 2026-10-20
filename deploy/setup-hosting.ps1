$ErrorActionPreference = "Stop"
$acct = aws sts get-caller-identity --query Account --output text
if ($LASTEXITCODE -ne 0) { throw "Could not determine AWS account" }
$bucket = "clubos-frontend-$acct"
$region = "ap-south-1"

aws s3api create-bucket --bucket $bucket --region $region --create-bucket-configuration LocationConstraint=$region
if ($LASTEXITCODE -ne 0) { throw "Could not create hosting bucket $bucket" }

aws s3api put-public-access-block --bucket $bucket --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
if ($LASTEXITCODE -ne 0) { throw "Could not configure public access for $bucket" }

$policy = @"
{"Version":"2012-10-17","Statement":[{"Sid":"PublicRead","Effect":"Allow","Principal":"*","Action":"s3:GetObject","Resource":"arn:aws:s3:::$bucket/*"}]}
"@
$policyPath = Join-Path $PSScriptRoot "bucket-policy.json"
Set-Content -Path $policyPath -Value $policy -Encoding ascii
try {
  aws s3api put-bucket-policy --bucket $bucket --policy "file://$policyPath"
  if ($LASTEXITCODE -ne 0) { throw "Could not apply public-read policy to $bucket" }
} finally {
  Remove-Item -LiteralPath $policyPath -ErrorAction SilentlyContinue
}

aws s3 website "s3://$bucket" --index-document index.html --error-document index.html --region $region
if ($LASTEXITCODE -ne 0) { throw "Could not configure website hosting for $bucket" }

"http://$bucket.s3-website.$region.amazonaws.com"
