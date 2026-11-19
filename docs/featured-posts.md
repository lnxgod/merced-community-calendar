# Featured posts in Around Town

Edit [public/featured-posts.json](../public/featured-posts.json) and publish it through the existing website workflow. Apps with featured-post support check this file when they refresh. An empty `posts` array keeps every slot empty. The first active, valid post in each placement gets the slot.

Use one title, one short sentence and one action. The app formats the card with a choice of three accents and optional artwork. Supply a landscape photo or illustration with a centered subject and descriptive alt text. A roughly 12:5 crop works across phone sizes.

| Field | Value |
| --- | --- |
| `id` | Stable, unique ID for the post |
| `title` | Headline, up to 96 characters |
| `placements` | One or more of `events`, `toy-drop-offs`, `toy-drive-events`, and `halloween-events` |
| `target` | See the action types below |
| `summary`, `actionLabel` | Optional description up to 200 characters and button label up to 35 characters |
| `startsAt`, `endsAt` | Optional ISO timestamps with a UTC offset. The start is inclusive and the end is exclusive. Use the Pacific offset for that date. |
| `theme` | Optional `default`, `halloween`, or `toy-drive` |
| `image` | Optional object with `url` and `alt`. Host artwork on the community website. |

| Action | Example |
| --- | --- |
| Open any current event | `{"type":"event","id":"event-id-from-events-json"}` |
| Open a collection site | `{"type":"drop-off","id":"location-id-from-dropOffLocations"}` |
| Open a list in the app | `{"type":"section","id":"toy-drive-events"}`. Use a placement name as the ID. The `halloween-events` list is available during Pacific October when the app has eligible trick-or-treat or trunk-or-treat listings. |
| Open a public information page | `{"type":"url","href":"/toydrive/"}` or a full HTTPS URL |

For a toy drive with a public information page, a post can appear directly above both the general event list and the drop-off directory:

```json
{
  "posts": [
    {
      "id": "sample-toy-drive",
      "title": "Community toy drive",
      "summary": "Find out what to bring and where to drop it off.",
      "actionLabel": "See toy drive details",
      "placements": ["events", "toy-drop-offs"],
      "target": { "type": "url", "href": "/toydrive/" },
      "theme": "toy-drive",
      "startsAt": "2026-11-28T08:00:00-08:00",
      "endsAt": "2026-12-13T00:00:00-08:00"
    }
  ]
}
```

Use verified public dates and details in live posts. Verify the destination and image over HTTPS, and check the card in the app before announcing it. For an in-app action, use the actual catalog ID. The app skips expired, closed, missing, or invalid targets. Set an end for time-sensitive content so it expires on devices that still have the previous response in memory. A successful refresh with an empty list clears the slots, and an offline cold launch starts with empty slots. The file is separate from calendar entries and drop-off locations.
