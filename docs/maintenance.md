# Daily calendar maintenance and recovery

Around Town is a free community resource from GameChangers AI. The aim is a reliable, curated selection of public events for Merced, Atwater and the McSwain neighborhood. Coverage is not exhaustive. Lake McSwain near Snelling is outside this neighborhood scope.

This guide records the process, not a frozen snapshot of what is currently published. The event catalog, live organizer evidence and latest private run record determine current state.

## Destinations and records

| Item | Purpose |
| --- | --- |
| `public/events.json` | Reviewed public catalog, including past history |
| `public/sources.json` | Organizer URLs and research scope |
| `public/calendar-config.json` | Exact authorized Google calendar, subscription and embed links |
| `public/community.ics` | Generated subscription feed with stable UIDs |
| `public/event-images.json` | Optional public artwork manifest; preserve during text edits |
| `scripts/build_calendar.py` | Catalog validation and feed generation |
| `.github/workflows/pages.yml` | Test, build and publish `dist` after a push to `main` |
| `https://community.gamechangersai.org/` | Live public website |
| `lnxgod/merced-community-calendar` | Dedicated public repository |

Private run records, source captures, social reply ledgers, Google ID mappings and recovery notes belong outside this repository. They are not website assets. Consult the maintainer's private `OPERATING-GUIDE.md` and `CURRENT-STATE.json`; never depend only on conversation memory.

The existing daily maintenance task performs research and Google reconciliation. GitHub Actions only builds and publishes the website/feed. Neither a successful build nor a push proves Google synchronization.

## Start each run

1. Read this guide, the private operating guide and checkpoint, latest dated run, `google-sync.json`, `facebook-reply-ledger.json`, and any unresolved publication record. Check timestamps and live evidence: an old queued task may already be complete.
2. Confirm the checkout, branch and remote. Inspect `git status --short` and preserve unrelated changes. Avoid concurrent writers to the catalog, Google destination or reply ledger.
3. Read `public/events.json`, `public/sources.json` and the authorized Google calendar before changing either. Complete pagination and use an explicit date range that covers the records being reconciled. Compare source identity, title, date/time and venue; do not deduplicate solely by title.
4. Save a private before-snapshot of changed records and mappings. Record an intended changeset before external writes so a restart can distinguish planned, written and verified operations.

## Research and editorial rules

- Maintain a rolling 90-day selection, prioritizing the next two weekends. Keep past records; the frontend filters the default view without deleting history.
- Start with existing sources and broaden thoughtfully: public organizer pages, city/county calendars, libraries, theatres, arts groups, neighborhood organizations, Castle events, markets and festivals.
- Read the private `DAILY-DISCOVERY-SOURCES.json` on every daily run. It records required discovery hubs, public organizer pages and per-source check methods alongside this public source index. Save source access failures separately from successful checks. Event aggregators, volunteer calendars and public school calendars supply leads; verify organizer facts and public attendance before publishing. Exclude internal or school-only activities.
- When adding a useful source, save its verified public URL in `public/sources.json` and its check method in the private daily list. Source-list-only updates do not require Google writes or changes to event timestamps; preserve the existing event catalog and feed, validate and verify the source deployment, and record its success separately from event synchronization.
- Verify event identity, organizer, local venue, date, Pacific time, age limits, admission, registration and cancellations. Prefer current organizer evidence over stale search results.
- Use only public facts. Private-group suggestions are leads requiring independent public verification. Never publish family notes, personal names from private records, attendance commitments, payments, private messages, ParentSquare material, personalized eligibility or login-only source text.
- Preserve source URLs, published restrictions and uncertainty. An inaccessible page is not evidence of cancellation. Conflicting details belong in the private follow-up list with a revisit date; use an accurate uncertainty note for an existing listing when warranted.
- Do not extend recurring events beyond published dates, infer holiday exceptions, invent end times or assume free admission. Unknown starts are clearly labeled date placeholders with a useful `timeNote`.
- The schema supports date-only events with `allDay: true`, null `startTime`/`endTime`, and optional inclusive `endDate` (the last included date). Use only verified spans; date-only calendar blocks do not imply 24-hour access, so state published or unknown visitor hours in `timeNote`. Preserve existing null-start time-TBD placeholders unless the organizer confirms a date-only event. The website covers every included date; ICS and Google must use a date-valued exclusive end one day after `endDate` (or `date` for one-day events). Timed overnight spans and recurrence rules remain unsupported; hold events that cannot be represented accurately. Read the current code before changing these assumptions.
- Preserve branding, dark default/light option, source links and public subscription/download access during maintenance.

## Reconcile Google and the public catalog

1. Use only the calendar ID in `public/calendar-config.json`. Confirm its name is **Merced · Atwater · McSwain Community Calendar**. Leave all other calendars and maintenance schedules unchanged.
2. Preserve existing website IDs, ICS UIDs and Google event IDs. Correct the existing Google event instead of creating a replacement. Never bulk import the full ICS as an update mechanism.
3. Use generic public descriptions with source links, transparent availability, no attendees, reminders/alarms or Google Meet. Use Pacific dates/times and accurate public visibility.
   For `allDay: true`, Google uses `start.date` and `end.date`, with the end one day after the inclusive catalog `endDate` or one day after `date` when no end is supplied. Do not convert a confirmed date span to midnight timestamp blocks or a one-hour placeholder.
4. Read back each Google write and compare the actual stored fields with the intended event. Record its ID and verification result privately before proceeding.
5. Existing Google records imported with unknown ends can contain explicitly labeled one-hour placeholders. These are not verified durations. Preserve their explanatory wording and correct them when the organizer publishes an end. The website feed omits unknown ends; do not manufacture new durations to make a comparison pass.
6. Preserve cancellation history and stable identity. Inspect the current schema/builder before representing a cancellation; do not invent unsupported fields or erase an event merely because its source disappeared.

## Validate and publish

Run from the public repository:

```sh
python3 scripts/build_calendar.py
python3 -m unittest discover -s tests -v
npm run build
git diff --check
git diff --stat
git diff -- public/events.json public/sources.json public/community.ics
```

`npm run build` also runs the Node and Python tests before generating the feed and building with Vite. Inspect all other intentionally changed files, including optional artwork. Check that IDs/UIDs remain stable, dates use the proper Pacific offset, restrictions survive and no private material entered the diff.

Stage named, relevant files only. Commit and push the dedicated repository's `main` branch. Do not force-push or overwrite unrelated work. If the remote advanced, inspect and integrate its changes before publishing.

Wait for the **Publish community calendar** workflow for the intended commit to succeed. Verify live HTTPS responses for `/`, `/events.json`, `/sources.json` and `/community.ics`, compare catalog/feed content with the intended build, and check referenced assets. A green older run is not proof that the new commit deployed. A queued deployment is not complete. Avoid repeated manual dispatches: the workflow cancels an in-progress run when a newer one starts.

For a no-change run, do not create an empty commit merely to show activity. Save the private source checks and verification outcome instead.

## Suggested events and acknowledgments

Review only the already-authorized announcement threads and their submission status views. Use All comments and expand nested replies. Keep exact post/comment IDs and group details in the private ledger. A missing/inaccessible post remains unverified; do not resubmit it.

For each legitimate suggestion, verify it publicly, deduplicate it, and publish or correct it as needed. Send an authorized acknowledgment only after Google readback and live website/ICS verification. Thank the person and accurately say “added,” “updated,” or “already on the calendar.” Do not promise attendance or endorsement.

Before sending, check both the live thread and ledger for an equivalent acknowledgment by the user or assistant. Verify a sent reply appears, save its permalink and a focused screenshot privately, and record the result. If the send times out, reread before retrying. No new promotional posts, private messages, invitations, purchases or organizer outreach are part of this routine.

## Finish every run, including partial failures

Save a dated private run record with source checks, changes and unchanged findings, held leads/revisit dates, Google readbacks, tests, commit/workflow, live verification, social review, acknowledgments and any incomplete work. Update the private checkpoint with links to those records, the latest attempted run and the last independently verified success for each destination. Never overwrite the last successful timestamp with a failed attempt.

Record available aggregate engagement numbers from the already-authorized post review, with observation time and scope. Missing metrics are unknown, not zero. Facebook reach, repository views, website page views, unique visitors and calendar subscriptions are different measures; never substitute one for another. Routine calendar work must not add tracking, paid analytics, DNS/proxy changes or advertising configuration.

## Recover without duplicating work

| Situation | Next safe step |
| --- | --- |
| New task or compacted chat | Read the guide, private checkpoint and latest evidence; verify live state before resuming writes. |
| Google write may have succeeded | Read the mapped ID and search the bounded target calendar before retrying creation. |
| Website published but Google incomplete | Reconcile only missing/corrected Google records; keep acknowledgments pending. |
| Google verified but deployment incomplete | Resume publication of the reviewed changeset, then verify live files; do not recreate Google events. |
| Facebook unavailable | Continue independent research/publication, keep unsent replies pending, and mark review incomplete. |
| Reply outcome uncertain | Reread the thread and ledger before sending anything again. |
| Source removed or stale | Record uncertainty and revisit; do not infer cancellation or recurrence. |
| Local private records missing | Reconstruct from the public catalog and live target calendar read-only; recover mappings and acknowledgment state before writes. |
| Daily task appears missed | Inspect the existing schedule and latest run first. Repair that task; do not create a duplicate updater. |

Dated helper scripts in private output are evidence of a particular run, not guaranteed reusable synchronization tools. Inspect and adapt their dates, formats, assumptions and counts before reuse. Keep routine successful runs quiet under the existing notification settings; report incomplete publication/synchronization or required user action accurately.

## Statistics and scheduling references

[GitHub repository traffic](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-traffic-to-a-repository) reports repository activity over the past 14 days. It is not a visitor counter for the separate community website. Keep any available aggregate metrics private unless publication is requested.

The maintenance task uses local files and authorized account access. Keep its host/project available and the desktop app running as required by [scheduled task documentation](https://learn.chatgpt.com/docs/automations?surface=app). Durable notes make recovery possible; they do not guarantee uninterrupted execution. The current schedule, identity, status and private paths are recorded in the private operating guide and should be verified against the actual task configuration when troubleshooting.
