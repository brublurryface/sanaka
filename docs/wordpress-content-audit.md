# WordPress content audit: Sanaka and WoD

- Parent issue: #25
- Delivery issue: #26

Snapshot date: 2026-09-12

## Scope

This audit covers the 99 published items exposed by the standard WordPress `post` REST endpoint. It documents their categories, preliminary frontend destination, and featured media usage.

The following are intentionally outside this audit:

- WordPress pages;
- character profiles that may have been stored by the Retro theme or plugins;
- Revolution Slider data;
- custom post types that are no longer registered;
- the complete 2,523-item media library;
- media deletion or filesystem cleanup;
- WordPress content migration;
- Angular filtering implementation;
- the WoD frontend.

These items must be investigated separately when work begins on `wod.sanaka.com.br`.

## Inventory

| Resource                               | Total | Notes                                                                                        |
| -------------------------------------- | ----: | -------------------------------------------------------------------------------------------- |
| Published posts                        |    99 | Standard WordPress `post` collection                                                         |
| Categories                             |     7 | Includes three empty legacy categories                                                       |
| Tags                                   |     0 | Tags are not currently used                                                                  |
| Media attachments                      | 2,523 | Historical library; includes the two new editorial covers and is not safe to treat as unused |
| Featured media used by published posts |     3 | All 99 posts now have a featured image                                                       |

## Category map

|  ID | Name        | Slug          | Posts | Parent | Preliminary destination       |
| --: | ----------- | ------------- | ----: | -----: | ----------------------------- |
|  43 | Romance     | `romance`     |    95 |      0 | WoD                           |
|  41 | Bruna       | `bruna`       |     4 |      0 | Mixed parent category         |
|  45 | Pensamentos | `pensamentos` |     3 |     41 | Sanaka                        |
|  46 | De Preto    | `de-preto`    |     1 |     41 | Shared between Sanaka and WoD |
|  44 | Conto       | `conto`       |     0 |     43 | WoD; currently empty          |
|   3 | Business    | `business`    |     0 |      0 | Review; likely legacy residue |
|  42 | Co-escrito  | `co-escrito`  |     0 |     43 | WoD; currently empty          |

## Post classification

| Category combination | Posts | Destination |
| -------------------- | ----: | ----------- |
| Romance              |    95 | WoD         |
| Bruna + Pensamentos  |     3 | Sanaka      |
| Bruna + De Preto     |     1 | Shared      |

No published post was found without a category. No post combines the Romance and Bruna branches. The archive currently uses no tags.

### Shared content: Blaike

`I . • Acordar`, slug `acordar`, belongs to `Bruna + De Preto`. De Preto is connected to Blaike and should be available to both Sanaka and WoD without duplicating the WordPress post.

This exposes a distinction that the parent architecture issue must resolve:

- category describes the editorial collection;
- frontend destination describes where content may appear.

Using categories for both responsibilities may become fragile. Issue #25 must evaluate whether a dedicated destination taxonomy is required, with values such as `sanaka` and `wod`. Shared content could receive both values.

## Featured media

| Media ID | Slug                              | Posts using it | Purpose                  |
| -------: | --------------------------------- | -------------: | ------------------------ |
|     6453 | `not_included`                    |             95 | Shared WoD/Romance cover |
|     6696 | `pensamentos-maya-raposa-deserto` |              3 | Shared Pensamentos cover |
|     6695 | `blaike-capa-sanaka`              |              1 | Blaike/De Preto cover    |

The REST output displayed no alternative text for these records. Their `alt_text` values should be confirmed and completed in WordPress as a separate editorial accessibility action.

The 2,523 media attachments must not be classified as unused from this audit. This total increased from 2,521 after the Pensamentos and Blaike covers were added. Old theme content, Revolution Slider, plugin tables, pages, or unregistered custom post types may still reference the remaining media.

## Preliminary frontend rules

These rules document current intent; they are not implemented by this issue.

| Frontend | Included collections     |
| -------- | ------------------------ |
| Sanaka   | Pensamentos and De Preto |
| WoD      | Romance and De Preto     |

The same De Preto post should be queried by both frontends rather than duplicated.

## Risks and unresolved decisions

- The `not_included` slug is a legacy name even though the underlying image was replaced.
- Category hierarchy currently mixes organization and destination concerns.
- Empty categories must not be deleted until their historical purpose is reviewed.
- Character profiles and slider content may remain in the database outside the standard post endpoint.
- Media cleanup requires a backup and an audit of plugin, page, database, and filesystem references.
- The final REST queries for each frontend depend on the taxonomy decision in issue #25.

## Reproducing the audit

Run from the repository root:

```powershell
.\scripts\audit-wordpress-content.ps1
```

If the Windows execution policy blocks the script:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\audit-wordpress-content.ps1
```

The script creates:

- `docs/data/wordpress-categories-audit.csv`;
- `docs/data/wordpress-posts-audit.csv`;
- `docs/data/wordpress-featured-media-audit.csv`.

The generated CSV files are evidence snapshots. This Markdown document contains the editorial interpretation of those results.
