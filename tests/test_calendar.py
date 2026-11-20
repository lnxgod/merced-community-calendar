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


def drop_off(**overrides):
    row = {
        "id": "fixture-holiday-show-drop-off",
        "title": "Game Changers AI Holiday Show Toy Drop-Off Location",
        "location": "Coming Soon",
        "status": "coming-soon",
    }
    row.update(overrides)
    return row


def unfold(content):
    return content.decode("utf-8").replace("\r\n ", "")


class CalendarTests(unittest.TestCase):
    def test_drop_off_directory_accepts_undated_coming_soon_placeholder(self):
        data = dict(catalog(), dropOffLocations=[drop_off(city=None)])
        original = copy.deepcopy(data)
        self.assertIs(calendar.validate_catalog(data), data)
        self.assertEqual(data, original)
        self.assertNotIn("date", data["dropOffLocations"][0])
        self.assertNotIn("startTime", data["dropOffLocations"][0])

    def test_drop_off_directory_preserves_events_uids_and_exact_ics_bytes(self):
        baseline = catalog(event(id="stable-event"), event(id="later-event", date="2026-11-07"))
        expected = calendar.build_ics(baseline)
        for locations in (
            [], [drop_off()],
            [drop_off(status="accepting", location="Test-only venue, Merced, CA",
                      startDate="2026-11-01", endDate="2026-12-05",
                      timeNote="Weekdays only; confirm host hours.",
                      sourceName="Public organizer", sourceUrl="https://example.org/toy-drive")],
            [drop_off(status="closed", description="Collections have ended.")],
        ):
            with self.subTest(locations=locations):
                data = dict(copy.deepcopy(baseline), dropOffLocations=locations)
                original = copy.deepcopy(data)
                self.assertEqual(calendar.build_ics(data), expected)
                self.assertEqual(data, original)
                self.assertEqual(data["events"], baseline["events"])
                self.assertNotIn("fixture-holiday-show-drop-off", unfold(expected))

    def test_drop_off_directory_rejects_nonarrays_missing_fields_and_duplicate_ids(self):
        invalid_directories = [None, {}, "locations", [None], ["location"], [drop_off(), drop_off()]]
        for field in ("id", "title", "location", "status"):
            incomplete = drop_off()
            del incomplete[field]
            invalid_directories.append([incomplete])
        for locations in invalid_directories:
            with self.subTest(locations=locations), self.assertRaises(calendar.ValidationError):
                calendar.validate_catalog(dict(catalog(), dropOffLocations=locations))

    def test_drop_off_directory_rejects_private_or_unexpected_fields(self):
        for field, value in {
            "familyNotes": "private", "attendees": [{"email": "private@example.com"}],
            "credentials": "private", "googleEventId": "private", "date": "2026-11-17",
            "startTime": "09:00", "endTime": "17:00", "allDay": True,
        }.items():
            with self.subTest(field=field), self.assertRaises(calendar.ValidationError):
                calendar.validate_catalog(dict(catalog(), dropOffLocations=[drop_off(**{field: value})]))
        for field in ("title", "location", "description", "timeNote", "sourceName", "city"):
            with self.subTest(field=field), self.assertRaises(calendar.ValidationError):
                calendar.validate_catalog(dict(catalog(), dropOffLocations=[
                    drop_off(**{field: "MUSTANG NIGHTS OUTREACH OPTION: bring flyer."})]))

    def test_drop_off_directory_validates_public_text_and_status(self):
        for field, value in (
            ("id", "bad@id"), ("id", "x" * 121), ("title", ""), ("location", None),
            ("status", "open"), ("status", None), ("status", True), ("status", []),
            ("city", 1), ("city", ""), ("sourceName", None), ("description", None),
            ("timeNote", []), ("title", "Line\nBreak"), ("location", "Venue\rprivate"),
            ("description", "x" * 8001), ("timeNote", "x" * 2001),
        ):
            with self.subTest(field=field, value=value), self.assertRaises(calendar.ValidationError):
                calendar.validate_catalog(dict(catalog(), dropOffLocations=[drop_off(**{field: value})]))

    def test_drop_off_directory_optional_dates_do_not_require_an_event_occurrence(self):
        for dates in ({}, {"startDate": "2026-11-01"}, {"endDate": "2026-12-05"},
                      {"startDate": "2026-11-01", "endDate": "2026-12-05"},
                      {"startDate": "2026-11-01", "endDate": "2026-11-01"}):
            with self.subTest(dates=dates):
                data = dict(catalog(), dropOffLocations=[drop_off(**dates)])
                self.assertIs(calendar.validate_catalog(data), data)
        for dates in ({"startDate": None}, {"endDate": None}, {"startDate": "2026-02-30"},
                      {"endDate": "2026-13-01"}, {"startDate": "11/01/2026"},
                      {"startDate": 20261101}, {"endDate": {}},
                      {"startDate": "2026-12-05", "endDate": "2026-11-01"}):
            with self.subTest(dates=dates), self.assertRaises(calendar.ValidationError):
                calendar.validate_catalog(dict(catalog(), dropOffLocations=[drop_off(**dates)]))

    def test_drop_off_directory_sources_require_safe_public_https(self):
        for url in (None, "", "http://example.org/", "javascript:alert(1)",
                    "https://user:password@example.org/", "https://127.0.0.1/",
                    "https://192.168.1.1/", "https://localserver/", "https://host.internal/",
                    "https://home.gamechangersai.org/", "https://example.org:8443/",
                    "https://www.parentsquare.com/feeds/123", "https://calendar.google.com/event?eid=private",
                    "https://example.org/event\nPRIVATE:content"):
            with self.subTest(url=url), self.assertRaises(calendar.ValidationError):
                calendar.validate_catalog(dict(catalog(), dropOffLocations=[drop_off(sourceUrl=url)]))
        for url in ("https://example.org/toy-drive", "https://example.org:443/toy-drive"):
            data = dict(catalog(), dropOffLocations=[drop_off(sourceUrl=url)])
            self.assertIs(calendar.validate_catalog(data), data)

    def test_holiday_show_app_opens_the_combined_page_with_a_request_fragment(self):
        base = "https://community.gamechangersai.org/toydrive/"
        invite = "A" * 43
        url = f"{base}#request={invite}"
        location = drop_off(id=calendar.HOLIDAY_SHOW_DROP_OFF_ID, sourceUrl=url)
        data = dict(catalog(), dropOffLocations=[location])
        self.assertIs(calendar.validate_catalog(data), data)
        self.assertEqual(calendar.build_ics(data), calendar.build_ics(catalog()))
        fallback_url = f"{base}?vote={'a' * 32}#request={invite}"
        fallback_data = dict(catalog(), dropOffLocations=[dict(location, sourceUrl=fallback_url)])
        self.assertIs(calendar.validate_catalog(fallback_data), fallback_data)
        for changes in ({"id": "another-drop-off"}, {"sourceUrl": url[:-1]},
                        {"sourceUrl": url + "!"}, {"sourceUrl": url.replace("#", "?")},
                        {"sourceUrl": url.replace("toydrive/", "ChristmasShow/")},
                        {"sourceUrl": url.replace("community.gamechangersai.org", "example.org")},
                        {"sourceUrl": fallback_url.partition("#")[0]},
                        {"sourceUrl": fallback_url.replace("vote=", "vote=!")},
                        {"sourceUrl": fallback_url.replace("#", "&extra=1#")}):
            with self.subTest(changes=changes), self.assertRaises(calendar.ValidationError):
                calendar.validate_catalog(dict(catalog(), dropOffLocations=[dict(location, **changes)]))

    def test_legacy_holiday_show_links_remain_valid_for_old_catalog_snapshots(self):
        invite = "A" * 43
        url = f"https://community.gamechangersai.org/roadtree/#{invite}"
        location = drop_off(id=calendar.HOLIDAY_SHOW_DROP_OFF_ID,
                            sourceUrl="https://community.gamechangersai.org/toydrive/",
                            songRequestUrl=url)
        data = dict(catalog(), dropOffLocations=[location])
        self.assertIs(calendar.validate_catalog(data), data)
        self.assertEqual(calendar.build_ics(data), calendar.build_ics(catalog()))
        for changes in ({"id": "another-drop-off"}, {"songRequestUrl": url[:-1]},
                        {"songRequestUrl": url.replace("community.gamechangersai.org", "example.org")},
                        {"songRequestUrl": "https://community.gamechangersai.org/roadtree/"}):
            with self.subTest(changes=changes), self.assertRaises(calendar.ValidationError):
                calendar.validate_catalog(dict(catalog(), dropOffLocations=[dict(location, **changes)]))

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

    def test_all_day_span_has_exclusive_ics_end_and_preserves_identity(self):
        row = event(id="field-of-honor-merced-2026-11-07", date="2026-11-07",
                    endDate="2026-11-14", allDay=True, startTime=None, endTime=None)
        data = catalog(row)
        original = copy.deepcopy(data)
        result = unfold(calendar.build_ics(data))
        self.assertIn("DTSTART;VALUE=DATE:20261107", result)
        self.assertIn("DTEND;VALUE=DATE:20261115", result)
        self.assertIn("UID:field-of-honor-merced-2026-11-07@community.gamechangersai.org", result)
        self.assertNotIn("TIME TBD", result)
        self.assertNotIn("not an all-day event", result)
        self.assertNotIn("End time not published", result)
        self.assertEqual(data, original)

    def test_all_day_date_arithmetic_is_independent_of_dst_and_year_rollover(self):
        for start, last, exclusive in (
            ("2026-10-31", "2026-11-01", "20261102"),
            ("2026-03-07", "2026-03-08", "20260309"),
            ("2026-12-31", "2027-01-01", "20270102"),
            ("2028-02-28", "2028-02-29", "20280301"),
        ):
            with self.subTest(start=start):
                result = unfold(calendar.build_ics(catalog(event(
                    date=start, endDate=last, allDay=True, startTime=None, endTime=None))))
                self.assertIn("DTEND;VALUE=DATE:" + exclusive, result)
                self.assertNotIn("DTSTART:", result)
                self.assertNotIn("DTEND:", result)
        single = unfold(calendar.build_ics(catalog(event(
            date="2026-12-31", allDay=True, startTime=None, endTime=None))))
        self.assertIn("DTEND;VALUE=DATE:20270101", single)

    def test_date_spans_cannot_mix_timed_fields_or_invalid_ranges(self):
        for overrides in (
            {"allDay": "true"}, {"allDay": 1}, {"allDay": None},
            {"allDay": True},
            {"endDate": "2026-10-05"},
            {"allDay": False, "endDate": "2026-10-05"},
            {"allDay": True, "startTime": None, "endTime": None, "endDate": "2026-10-02"},
            {"allDay": True, "startTime": None, "endTime": None, "endDate": "2026-02-30"},
            {"allDay": True, "startTime": None, "endTime": None, "endDate": "9999-12-31"},
        ):
            with self.subTest(overrides=overrides), self.assertRaises(calendar.ValidationError):
                calendar.build_ics(catalog(event(**overrides)))

    def test_explicit_false_all_day_preserves_legacy_feed_bytes(self):
        for row in (event(), event(endTime=None), event(startTime=None, endTime=None)):
            original = copy.deepcopy(row)
            self.assertEqual(calendar.build_ics(catalog(row)),
                             calendar.build_ics(catalog(dict(row, allDay=False))))
            self.assertEqual(row, original)

    def test_toy_drive_type_is_optional_and_preserves_catalog_and_ics_bytes(self):
        for kind in ("drop-off", "event"):
            for row in (
                event(),
                event(date="2026-11-01", endDate="2026-12-05", allDay=True,
                      startTime=None, endTime=None),
            ):
                with self.subTest(kind=kind, date=row["date"]):
                    typed = catalog(dict(row, toyDriveType=kind))
                    original = copy.deepcopy(typed)
                    self.assertIs(calendar.validate_catalog(typed), typed)
                    self.assertEqual(calendar.build_ics(typed), calendar.build_ics(catalog(row)))
                    self.assertEqual(typed, original)

    def test_toy_drive_type_rejects_unknown_and_nontext_values(self):
        for kind in (None, "", "location", "all", "drop-offs", 1, True, [], {}):
            with self.subTest(kind=kind), self.assertRaises(calendar.ValidationError):
                calendar.build_ics(catalog(event(toyDriveType=kind)))

    def test_toy_collection_span_retains_uid_exclusive_end_and_host_hours(self):
        row = event(id="fixture-toy-collection", title="Test-only toy collection site",
                    date="2026-11-01", endDate="2026-12-05", allDay=True,
                    startTime=None, endTime=None, toyDriveType="drop-off",
                    timeNote="Weekdays only; confirm collection hours with the host.")
        original = copy.deepcopy(row)
        result = unfold(calendar.build_ics(catalog(row)))
        self.assertIn("UID:fixture-toy-collection@community.gamechangersai.org", result)
        self.assertIn("DTSTART;VALUE=DATE:20261101", result)
        self.assertIn("DTEND;VALUE=DATE:20261206", result)
        self.assertIn("Weekdays only\\; confirm collection hours with the host.", result)
        self.assertNotIn("TIME TBD", result)
        self.assertEqual(row, original)

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
