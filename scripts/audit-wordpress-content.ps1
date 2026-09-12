[CmdletBinding()]
param(
  [string] $ApiBase = 'https://www.sanaka.com.br/wp-json/wp/v2',
  [string] $OutputDirectory = ''
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
  $repositoryRoot = Split-Path -Parent $PSScriptRoot
  $OutputDirectory = Join-Path $repositoryRoot 'docs/data'
}

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

function Get-WpCollectionMetadata {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Endpoint
  )

  $response = Invoke-WebRequest `
    -UseBasicParsing `
    -Uri "$ApiBase/${Endpoint}?per_page=1&_fields=id"

  [pscustomobject]@{
    Resource = $Endpoint
    Total = [int] $response.Headers['X-WP-Total']
    PagesAtOneItem = [int] $response.Headers['X-WP-TotalPages']
  }
}

function Get-WpCollection {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Endpoint,

    [string] $AdditionalQuery = ''
  )

  $page = 1

  do {
    $uri = "$ApiBase/${Endpoint}?per_page=100&page=$page"

    if (-not [string]::IsNullOrWhiteSpace($AdditionalQuery)) {
      $uri = "$uri&$AdditionalQuery"
    }

    $response = Invoke-WebRequest -UseBasicParsing -Uri $uri
    $parsed = $response.Content | ConvertFrom-Json

    if ($null -ne $parsed) {
      foreach ($item in $parsed) {
        if ($item -is [System.Array]) {
          foreach ($nestedItem in $item) {
            Write-Output $nestedItem
          }
        }
        else {
          Write-Output $item
        }
      }
    }

    $totalPagesHeader = $response.Headers['X-WP-TotalPages']
    $totalPages = if ($null -eq $totalPagesHeader) {
      1
    }
    else {
      [int] $totalPagesHeader
    }

    $page += 1
  } while ($page -le $totalPages)
}

$resourceSummary = @(
  'posts'
  'categories'
  'tags'
  'media'
) | ForEach-Object {
  Get-WpCollectionMetadata -Endpoint $_
}

$categories = @(
  Get-WpCollection `
    -Endpoint 'categories' `
    -AdditionalQuery 'hide_empty=false&_fields=id,name,slug,count,parent'
)

$categoryById = @{}

foreach ($category in $categories) {
  $categoryById[[int] $category.id] = $category
}

$categoryDestinationBySlug = @{
  'romance' = 'WoD'
  'conto' = 'WoD'
  'co-escrito' = 'WoD'
  'pensamentos' = 'Sanaka'
  'de-preto' = 'Shared'
  'bruna' = 'Mixed parent'
  'business' = 'Review'
}

$categoryAudit = foreach ($category in $categories) {
  $destination = $categoryDestinationBySlug[[string] $category.slug]

  if ([string]::IsNullOrWhiteSpace($destination)) {
    $destination = 'Review'
  }

  [pscustomobject]@{
    Id = [int] $category.id
    Name = [System.Net.WebUtility]::HtmlDecode([string] $category.name)
    Slug = [string] $category.slug
    Count = [int] $category.count
    ParentId = [int] $category.parent
    Destination = $destination
  }
}

$posts = @(
  Get-WpCollection `
    -Endpoint 'posts' `
    -AdditionalQuery 'status=publish&_fields=id,date,slug,title,categories,tags,featured_media'
)

$postAudit = foreach ($post in $posts) {
  $postCategories = @(
    $post.categories |
      ForEach-Object { $categoryById[[int] $_] } |
      Where-Object { $null -ne $_ }
  )

  $categoryIds = @(
    $postCategories.id |
      ForEach-Object { [int] $_ } |
      Sort-Object
  )

  $categoryNames = @(
    $postCategories.name |
      ForEach-Object { [System.Net.WebUtility]::HtmlDecode([string] $_) }
  )

  $categorySlugs = @(
    $postCategories.slug |
      ForEach-Object { [string] $_ }
  )

  $destination = if ($categorySlugs -contains 'de-preto') {
    'Shared'
  }
  elseif ($categorySlugs -contains 'pensamentos') {
    'Sanaka'
  }
  elseif ($categorySlugs -contains 'romance') {
    'WoD'
  }
  else {
    'Review'
  }

  [pscustomobject]@{
    Id = [int] $post.id
    Date = [string] $post.date
    Slug = [string] $post.slug
    Title = [System.Net.WebUtility]::HtmlDecode([string] $post.title.rendered)
    CategoryIds = $categoryIds -join ','
    Categories = $categoryNames -join ' | '
    Destination = $destination
    FeaturedMediaId = [int] $post.featured_media
  }
}

$featuredMediaIds = @(
  $postAudit.FeaturedMediaId |
    Where-Object { $_ -gt 0 } |
    Sort-Object -Unique
)

if ($featuredMediaIds.Count -gt 100) {
  throw 'The audit currently supports up to 100 unique featured media IDs.'
}

$featuredMedia = if ($featuredMediaIds.Count -eq 0) {
  @()
}
else {
  @(
    Get-WpCollection `
      -Endpoint 'media' `
      -AdditionalQuery "include=$($featuredMediaIds -join ',')&_fields=id,slug,source_url,alt_text"
  )
}

$mediaUsageById = @{}

foreach ($group in ($postAudit | Group-Object FeaturedMediaId)) {
  $mediaUsageById[[int] $group.Name] = [int] $group.Count
}

$featuredMediaAudit = foreach ($media in $featuredMedia) {
  [pscustomobject]@{
    Id = [int] $media.id
    Slug = [string] $media.slug
    SourceUrl = [string] $media.source_url
    AltText = [string] $media.alt_text
    UsedByPosts = [int] $mediaUsageById[[int] $media.id]
  }
}

$categoryAuditPath = Join-Path $OutputDirectory 'wordpress-categories-audit.csv'
$postAuditPath = Join-Path $OutputDirectory 'wordpress-posts-audit.csv'
$featuredMediaAuditPath = Join-Path $OutputDirectory 'wordpress-featured-media-audit.csv'

$categoryAudit |
  Sort-Object Count -Descending |
  Export-Csv -Path $categoryAuditPath -NoTypeInformation -Encoding UTF8

$postAudit |
  Sort-Object Date -Descending |
  Export-Csv -Path $postAuditPath -NoTypeInformation -Encoding UTF8

$featuredMediaAudit |
  Sort-Object UsedByPosts -Descending |
  Export-Csv -Path $featuredMediaAuditPath -NoTypeInformation -Encoding UTF8

Write-Host ''
Write-Host 'WordPress resource summary'
$resourceSummary | Format-Table -AutoSize

Write-Host ''
Write-Host 'Post destinations'
$postAudit |
  Group-Object Destination |
  Sort-Object Count -Descending |
  Select-Object Count, Name |
  Format-Table -AutoSize

Write-Host ''
Write-Host 'Featured media usage'
$featuredMediaAudit |
  Select-Object Id, Slug, UsedByPosts, AltText |
  Format-Table -Wrap -AutoSize

Write-Host ''
Write-Host "Created: $categoryAuditPath"
Write-Host "Created: $postAuditPath"
Write-Host "Created: $featuredMediaAuditPath"
