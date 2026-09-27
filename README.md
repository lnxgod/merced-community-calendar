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
python3 -m unittest discover -s tests -v
python3 scripts/build_calendar.py
npm run build
```

Push reviewed changes to `main`. GitHub Actions validates the catalog, builds the site and publishes only `dist`. The public subscription feed is `/community.ics`; IDs are stable across updates. Do not put credentials, private source material or personal calendar exports in this repository.

The separate Google Calendar is identified in `public/calendar-config.json`. Updating this repository does not itself update Google. The daily maintenance task reconciles both destinations and verifies each write. Preserve Google event IDs when updating; importing the full feed again is not an update strategy. Google imports assign one-hour blocks to events without end times, so those Google copies are explicitly labeled “end time TBD” and explain that the block is only a placeholder. The website feed omits unknown ends.

## Hosting

This repository uses GitHub Pages and the existing Route 53 record `community.gamechangersai.org` pointing to `lnxgod.github.io`. There is no application server, login, analytics, tracking or public access to the private home dashboard.

## Coverage

This is a curated guide, not an official city calendar or a guarantee of complete coverage. Check the linked organizer for changes, admission, availability and registration. The city filter describes the venue location; events supporting McSwain organizations can take place in Merced. Lake McSwain is outside this neighborhood coverage.
