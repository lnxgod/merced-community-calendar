# Toy drives: events and a separate drop-off directory

The website and both Around Town mobile apps use the same public `events.json` catalog. The website now has **Toy drop-offs** and **Toy-drive events** buttons. A first app release is needed for this feature; after that, publishing changes to the catalog updates the website and the apps without another app release.

## Drop-off locations are not calendar events

Maintain the optional top-level `dropOffLocations` array in `public/events.json`. It is a directory, not a set of daily occurrences. Locations appear only after choosing **Toy drop-offs**. They are excluded from the ordinary event list, calendar grid, ICS subscription feed and Google event reconciliation. Do not generate daily events, all-day spans or recurrence rules for a collection box.

The GameChangers AI Christmas Light Show drop-off (`game-changers-ai-holiday-show-toy-drop-off`) lists the owner-approved McSwain street address and November 27 through December 11, 2026. The [combined toy drive and lights page](https://community.gamechangersai.org/toydrive/) gives directions, the show's official opening date, and the 90.7 FM frequency. The collection end date applies to toy drop-offs.

Each directory record supports:

| Field | Contract |
| --- | --- |
| `id`, `title`, `location` | Required nonempty public strings; `id` is stable and unique within the directory. A planned site may list just the confirmed neighborhood. |
| `status` | Required: `coming-soon`, `accepting`, or `closed`. Closed locations are hidden from the active directory. `accepting` is not a claim of 24-hour access. |
| `city` | Optional community string or `null` when unconfirmed. Do not infer a city from the organization's name. |
| `description`, `timeNote` | Optional public donation rules, published collection hours or uncertainty. |
| `sourceName`, `sourceUrl` | Optional public organizer attribution and HTTPS link. No private source documents or credentials. |
| `songRequestUrl` | Supported in older holiday show catalog snapshots. New records use `sourceUrl`. |
| `startDate`, `endDate` | Optional confirmed collection-window dates, `YYYY-MM-DD`. Omit unknown dates; no `null`. If both exist, end must not precede start. An expired end date hides the location, without creating calendar entries. |

The directory uses community and search filters only. Event categories, month/day controls and the calendar grid are hidden while it is selected. Share the [Toy drop-offs view](https://community.gamechangersai.org/?view=toy-drop-offs#events) to open the directory directly. Tap the published address of an accepting location to open Google Maps directions. Known addresses can be corrected in the feed; the app does not bundle a second maintained address list.

The holiday show's **Organizer details** action in the app opens the record's `sourceUrl`. Use the combined page at `https://community.gamechangersai.org/toydrive/` and append `#request=<visitor invitation>` for that record. The public web directory links directly to the same page without the fragment, so visitors see the show and donation information. Anyone with the app link can share it, and the catalog is public. Use only the show’s shareable visitor invitation here.

The 2026 Cops & Fire for Kids locations use the title prefix “Cops, Fire, and Kids” and share the organizer's public flyer through `sourceUrl`. The website labels the link **View flyer** and the app exposes it under **Organizer details**. Those locations stay visible through November 30 in Pacific time and then expire from the directory.

## Scheduled events

Shows, toy-drive fundraisers and toy distributions stay in the normal `events` array with their actual date/time, source links and restrictions. They also appear under **Toy-drive events**. The optional event field `toyDriveType: "event"` gives an explicit classification. Existing clear toy-drive/Toys for Tots wording works without retagging records; plain toy workshops or conventions do not match.

The legacy `toyDriveType: "drop-off"` event classification remains accepted for compatibility, but those records are hidden from ordinary website/app event views. New collection locations belong in `dropOffLocations`, not `events`. No existing live collection-site event records required migration in this change.

## Maintenance and publication

Every editor/updater must preserve `dropOffLocations` while updating `events`; never rebuild the catalog root from only `updatedAt` and `events`. Use the existing daily maintenance workflow and stable IDs. Update the catalog timestamp, validate/build, and publish the reviewed website/feed through its existing GitHub Pages process. The builder validates the directory but emits ICS only from `events`; do not send directory records to Google Calendar.

The Android/iPhone apps refresh the feed on launch, manual refresh and foreground/reconnection after five minutes. They retain a validated offline copy; the bundled snapshot is a fallback. When testing an unpublished candidate, use the local candidate feed/cache or bundled snapshot. The live feed includes only published directory entries.

The owner authorized merging both repositories into `main`. Pushing this website's `main` branch triggers GitHub Pages; verify that deployment and the live feed before releasing the app feature. The paired mobile source release is 1.0.1 (Android build 5, iOS build 4); the owner will build, sign and submit it to the stores from the other laptop. Subsequent address, hour, status and event changes require only a catalog publication.

## Local validation — November 17, 2026

All 29 Node tests, 32 Python tests and the production build pass. Browser checks at 320, 720 and 1280 pixels cover both themes, directory search, the exact Coming Soon entry, absent Directions/date/category controls and exclusion from normal event/calendar views. The 250 event records are unchanged. The generated ICS changes only its catalog-level timestamps; event contents and UIDs are unchanged and the new directory never enters it.

The paired mobile feature passes 36 tests, Android/iPhone simulator builds and native emulator checks using the unpublished candidate feed. Feed updates were verified to appear after refresh without another app build. Test-only addresses and runtime mocks were not published or committed. Website publication is handled by the authorized `main` push and verified independently of these local tests. No Google Calendar write or store upload is part of this source release.

Locked website dependencies were retained. `npm ci` reports five existing high-severity advisories; dependency remediation remains a release follow-up. The paired mobile release notes record its existing advisories and native build-number/upload requirements.
