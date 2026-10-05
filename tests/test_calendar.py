"""Publication contract, privacy boundary, and iCalendar interoperability checks."""

import copy
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/build_calendar.py"
SPEC = importlib.util.spec_from_file_location("build_calendar", SCRIPT)
calendar = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(calendar)


def event(**overrides):
    row = {
        "id": "merced-market-2026-10-03", "title": "Community market",
        "date": "2026-10-03", "startTime": "08:00", "endTime": "11:00",
        "city": "Merced", "location": "16th & M Streets, Merced, CA",
        "category": "Markets", "description": "Local growers and makers.",
        "sourceUrl": "https://www.mercedcfm.com/phone/about-us.html",
        "sourceName": "Merced Certified Farmers Market",
    }
    row.update(overrides)
    return row


def catalog(*rows):
    return {"updatedAt": "2026-09-27T02:00:00Z", "events": list(rows or [event()])}


def unfold(content):
    return content.decode("utf-8").replace("\r\n ", "")


class CalendarTests(unittest.TestCase):
    def test_public_field_allowlist_rejects_private_payloads(self):
        for field, value in {
            "attendees": [{"email": "private@example.com"}],
            "organizer": {"email": "private@example.com"},
            "audience": "Both", "familyNotes": "private", "reminders": [],
            "extendedProperties": {}, "htmlLink": "https://calendar.google.com/",
        }.items():
            with self.subTest(field=field), self.assertRaises(calendar.ValidationError):
                calendar.build_ics(catalog(event(**{field: value})))
        with self.assertRaises(calendar.ValidationError):
            calendar.build_ics(dict(catalog(), credentials="private"))

    def test_known_family_note_markers_rejected(self):
        for note in ("Suitable for our child's age group.", "Overlaps your Mustang Nights setup.",
                     "MUSTANG NIGHTS OUTREACH OPTION: bring flyer."):
            with self.subTest(note=note), self.assertRaises(calendar.ValidationError):
                calendar.build_ics(catalog(event(description=note)))

    def test_pacific_dst_conversion(self):
        result = unfold(calendar.build_ics(catalog(
            event(id="summer", date="2026-10-31", startTime="08:00", endTime="11:00"),
            event(id="winter", date="2026-11-01", startTime="08:00", endTime="11:00"),
        )))
        self.assertIn("DTSTART:20261031T150000Z", result)
        self.assertIn("DTEND:20261031T180000Z", result)
        self.assertIn("DTSTART:20261101T160000Z", result)
        self.assertIn("DTEND:20261101T190000Z", result)

    def test_dst_wall_time_uncertainty_rejected(self):
        for day, clock in (("2026-03-08", "02:30"), ("2026-11-01", "01:30")):
            with self.subTest(day=day), self.assertRaises(calendar.ValidationError):
                calendar.build_ics(catalog(event(date=day, startTime=clock, endTime=None)))

    def test_unknown_end_stays_unspecified(self):
        result = unfold(calendar.build_ics(catalog(event(endTime=None))))
        self.assertIn("DTSTART:20261003T150000Z", result)
        self.assertNotIn("DTEND", result)
        self.assertIn("End time not published", result)

    def test_unknown_start_is_labeled_date_placeholder(self):
        result = unfold(calendar.build_ics(catalog(event(date="2026-12-31", startTime=None, endTime=None))))
        self.assertIn("SUMMARY:Community market · TIME TBD", result)
        self.assertIn("DTSTART;VALUE=DATE:20261231", result)
        self.assertIn("DTEND;VALUE=DATE:20270101", result)
        self.assertIn("not an all-day event", result)

    def test_source_urls_cannot_inject_credentials_private_hosts_or_properties(self):
        for url in ("http://example.com/event", "https://user:password@example.com/event",
                    "https://127.0.0.1/event", "https://192.168.42.21/", "https://localserver/",
                    "https://home.gamechangersai.org/", "https://example.com/event\nATTENDEE:person",
                    "https://example.com:8443/event", "https://www.parentsquare.com/feeds/123",
                    "https://calendar.google.com/event?eid=private"):
            with self.subTest(url=url), self.assertRaises(calendar.ValidationError):
                calendar.build_ics(catalog(event(sourceUrl=url)))

    def test_utf8_folding_and_escaping(self):
        description = "Café 🍊; crafts, music\\food\n" * 12
        content = calendar.build_ics(catalog(event(description=description)))
        self.assertTrue(content.endswith(b"\r\n"))
        self.assertNotIn(b"\n", content.replace(b"\r\n", b""))
        for line in content.split(b"\r\n"):
            self.assertLessEqual(len(line), 75)
            line.decode("utf-8")
        self.assertIn("Café 🍊\\; crafts\\, music\\\\food\\n", unfold(content))
        self.assertIn(b"\r\n ", content)

    def test_stable_uids_and_deterministic_order(self):
        one, two = event(id="one"), event(id="two", date="2026-11-07")
        self.assertEqual(calendar.build_ics(catalog(one, two)), calendar.build_ics(catalog(two, one)))
        revised = copy.deepcopy(one)
        revised.update(title="Corrected market title", date="2026-10-04")
        before = next(line for line in unfold(calendar.build_ics(catalog(one))).splitlines() if line.startswith("UID:"))
        after = next(line for line in unfold(calendar.build_ics(catalog(revised))).splitlines() if line.startswith("UID:"))
        self.assertEqual(before, after)

    def test_generation_preserves_history_and_only_explicit_recurrence_dates(self):
        data = catalog(
            event(id="historic", date="2000-01-01"),
            event(id="weekly-one", date="2099-10-01"),
            event(id="weekly-two", date="2099-10-08"),
            event(id="untimed", date="2099-10-31", startTime=None, endTime=None),
        )
        original = copy.deepcopy(data)
        content = calendar.build_ics(data)
        result = unfold(content)
        self.assertEqual(result.count("BEGIN:VEVENT"), 4)
        for row in data["events"]:
            self.assertIn("UID:" + row["id"] + "@community.gamechangersai.org", result)
        self.assertNotIn("RRULE:", result)
        self.assertNotIn("20991015", result)
        self.assertEqual(data, original)
        self.assertEqual(calendar.build_ics(data), content)

    def test_no_alarm_invitation_or_organizer_properties(self):
        result = unfold(calendar.build_ics(catalog()))
        for property_name in ("ATTENDEE:", "ORGANIZER:", "BEGIN:VALARM", "TRIGGER:", "METHOD:REQUEST"):
            self.assertNotIn(property_name, result)
        self.assertIn("TRANSP:TRANSPARENT", result)

    def test_malformed_ids_dates_and_end_ranges_rejected(self):
        for override in ({"id": "bad@uid"}, {"date": "2026-02-30"}, {"startTime": "8:00"},
                         {"endTime": "07:00"}, {"endTime": "08:00"}, {"startTime": None},
                         {"title": "Title\r\nATTENDEE:person"}):
            with self.subTest(override=override), self.assertRaises(calendar.ValidationError):
                calendar.build_ics(catalog(event(**override)))
        with self.assertRaises(calendar.ValidationError):
            calendar.build_ics(catalog(event(), event()))

    def test_cli_generates_checks_and_refuses_duplicate_json_fields(self):
        with tempfile.TemporaryDirectory() as folder:
            source, output = Path(folder) / "events.json", Path(folder) / "community.ics"
            source.write_text(json.dumps(catalog()), encoding="utf-8")
            args = ["--input", str(source), "--output", str(output)]
            self.assertEqual(calendar.main(args), 0)
            self.assertEqual(calendar.main(args + ["--check"]), 0)
            original = output.read_bytes()
            source.write_text('{"updatedAt":"2026-09-27","events":[],"events":[]}', encoding="utf-8")
            with contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(calendar.main(args), 1)
            self.assertEqual(output.read_bytes(), original)

    def test_updated_at_requires_timezone_and_controls_timestamp(self):
        data = catalog()
        data["updatedAt"] = "2026-09-26T19:00:00-07:00"
        self.assertIn("DTSTAMP:20260927T020000Z", unfold(calendar.build_ics(data)))
        data["updatedAt"] = "2026-09-27T02:00:00"
        with self.assertRaises(calendar.ValidationError):
            calendar.build_ics(data)


if __name__ == "__main__":
    unittest.main()
