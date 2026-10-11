# Around Town maintenance

Read [docs/maintenance.md](docs/maintenance.md) before changing event data, synchronization, publishing, or the daily maintenance process. Read [README.md](README.md) for local development and schema behavior.

- This is the public GameChangers AI calendar for Merced, Atwater and the McSwain neighborhood. Publish only verified public event facts.
- Preserve event IDs, ICS UIDs, Google event IDs and past history. Never bulk reimport the subscription feed into Google as an update.
- The only Google destination is the calendar in `public/calendar-config.json`. Do not modify personal, family, school, Sidekicks or older Community calendars.
- The website, ICS and Google Calendar require separate verification. A Git push does not synchronize Google.
- Before a maintenance run, read the private operating guide, current checkpoint, latest dated run, Google mapping and Facebook reply ledger in the maintainer's working directory. On the existing host this is `../output/public-community-calendar/`. Do not copy these records into this public repository.
- If private state is unavailable in a fresh checkout, inspect live state and recover mappings before external writes; continue independent public research. Do not guess IDs or resend uncertain acknowledgments.
- Use the existing daily schedule; do not create a second updater. Keep unrelated in-progress work intact and stage only relevant public files.
- Keep these instructions and the maintenance guide current when the workflow changes. Save each run's evidence and recovery checkpoint privately.
