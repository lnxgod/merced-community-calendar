# Around Town community calendar

A public events calendar for Merced, Atwater and McSwain, California, from GameChangers AI, a 501(c)(3) nonprofit. This community project uses AI to help neighbors find and participate in local events. Organization and mission: https://gamechangersai.org.

Website: https://community.gamechangersai.org

## Run locally

```sh
npm ci
python3 scripts/build_calendar.py
npm run dev
```

## Publish event updates

The reviewed public catalog is `public/events.json`. Organizer links and research scope are in `public/sources.json`. Each event has a stable ID; preserve it when correcting a title, venue or time. All wall times are America/Los_Angeles. Use `null` for an unpublished start or end, with a useful `timeNote`; do not infer durations or future occurrences.

```sh
npm run build
```

`npm run build` runs the frontend visibility tests and Python publication tests, validates the full catalog, generates the subscription feed, and builds the site. This is also the GitHub Pages and daily maintenance build path; run `npm test` for the tests alone.

The default website view shows current and upcoming occurrences across months, soonest first, using the visitor's current time in America/Los_Angeles. It refreshes at minute boundaries and when a tab regains focus. Events remain visible until their published end; unknown ends and untimed date placeholders remain for their Pacific date. The schema has no true all-day, multi-day or recurrence-rule fields: an untimed record is still labeled time TBD, and recurring activities appear only on the explicit dates in the catalog. Do not infer further occurrences.

Preserve history in `public/events.json` and `community.ics`; neither the builder nor maintenance should prune past records to achieve the default view. Selecting a month or calendar date explicitly browses that period, including history. “Upcoming events” returns to the current list. The ghost quick filter uses explicit trunk-or-treat/trick-or-treat wording, or Halloween/“Boo Bash” wording together with candy, in event titles/descriptions; an October date or generic fall festival alone is not enough. Keep these descriptions factual instead of adding keywords just to make an event match.

Push reviewed changes to `main`. GitHub Actions validates the catalog, builds the site and publishes only `dist`. The public subscription feed is `/community.ics`; IDs are stable across updates. Do not put credentials, private source material or personal calendar exports in this repository.

The separate Google Calendar is identified in `public/calendar-config.json`. Updating this repository does not itself update Google. The daily maintenance task reconciles both destinations and verifies each write. Preserve Google event IDs when updating; importing the full feed again is not an update strategy. Google imports assign one-hour blocks to events without end times, so those Google copies are explicitly labeled “end time TBD” and explain that the block is only a placeholder. The website feed omits unknown ends.

## Optional event flyers and photos

Keep website images in `public/event-images.json`, keyed by the existing event ID. This separate manifest preserves the event fields used by Studio, the subscription feed, and Google sync. An event with no entry keeps its text-only layout. For example (replace the ID, filenames, dimensions and alt text with verified material):

```json
{
  "images": {
    "existing-event-id": {
      "src": "assets/events/existing-event-id-flyer-v1.jpg",
      "thumbnailSrc": "assets/events/existing-event-id-thumb-v1.webp",
      "alt": "Describe the public flyer or photo, including any useful visual information.",
      "width": 1200,
      "height": 1600
    }
  }
}
```

`thumbnailSrc` is optional; it can provide a smaller copy with the same composition. Dimensions describe the full image. Use descriptive, versioned lowercase filenames containing letters, digits, hyphens or underscores. Keep reviewed JPG, PNG or WebP files under `public/assets/events/`, at most 5 MiB each; use a reasonably compressed full image and a small thumbnail where possible. Remote hotlinks, expiring attachment URLs, query strings, SVGs and paths outside this folder are not accepted. `npm run build` validates the manifest, event IDs and local assets before generating the unchanged calendar feed.

Use only the public event artwork, with no Messenger interface, sender details or private attachment metadata. Strip embedded metadata before adding an asset. Transcribe verified dates, times, venue, admission and other essential flyer information into the normal event fields so readers never need to read an image. Supply concise, meaningful alt text. The detail view preserves the entire image and links to the local full-size original; images load lazily, and a failed image leaves the event information usable.

Publish the manifest and assets with the related catalog update through the existing reviewed repository build and Pages workflow. Retain image entries and files during later text edits; update their keys only if a catalog event ID must change. Remove an image entry when its event is deliberately removed. Studio can continue editing the shared text catalog; it does not upload or manage this website image manifest.

## Hosting

This repository uses GitHub Pages and the existing Route 53 record `community.gamechangersai.org` pointing to `lnxgod.github.io`. There is no application server, login, analytics, tracking or public access to the private home dashboard.

## Coverage

This is a curated guide, not an official city calendar or a guarantee of complete coverage. Check the linked organizer for changes, admission, availability and registration. The city filter describes the venue location; events supporting McSwain organizations can take place in Merced. Lake McSwain is outside this neighborhood coverage.
