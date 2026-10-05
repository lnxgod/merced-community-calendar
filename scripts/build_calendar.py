#!/usr/bin/env python3
"""Validate the public event catalog and build its deterministic iCalendar feed.

Only the explicitly supplied public JSON is read. This script never imports
Home, family calendars, credentials, or Google event payloads.
Retain history and all explicitly published occurrences; upcoming visibility is
computed in the browser from the current Pacific time, never frozen at build time.
"""

from __future__ import annotations

import argparse
from datetime import date, datetime, timedelta, timezone
import ipaddress
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
PACIFIC = ZoneInfo("America/Los_Angeles")
UTC = timezone.utc
FIELDS = frozenset({
    "id", "title", "date", "startTime", "endTime", "city", "location",
    "category", "description", "sourceUrl", "sourceName", "cost", "timeNote",
})
REQUIRED_FIELDS = FIELDS - {"cost", "timeNote"}
ID_PATTERN = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,119}\Z")
TIME_PATTERN = re.compile(r"(?:[01][0-9]|2[0-3]):[0-5][0-9]\Z")
PRIVATE_MARKERS = re.compile(
    r"\b(?:Dad|Mom|Child)[- /]only\b|"
    r"\bBoth means eligible\b|\bMUSTANG NIGHTS OUTREACH OPTION\b|"
    r"\bOverlaps your\b|\bSuitable for .{0,40}age group\b|"
    r"google-calendar\.json|BEGIN (?:RSA )?PRIVATE KEY|"
    r"\b(?:rsvpStatus|responseStatus)\b",
    re.IGNORECASE,
)


class ValidationError(ValueError):
    """The public input is not safe or precise enough to publish."""


def _text(value: object, label: str, *, multiline: bool = False,
          allow_empty: bool = False, limit: int = 8000) -> str:
    if not isinstance(value, str):
        raise ValidationError(f"{label} must be text")
    if len(value) > limit or (not allow_empty and not value.strip()):
        raise ValidationError(f"{label} is empty or exceeds {limit} characters")
    if any(ord(c) < 32 and not (multiline and c == "\n") for c in value):
        raise ValidationError(f"{label} contains a control character")
    if any(0xD800 <= ord(c) <= 0xDFFF for c in value):
        raise ValidationError(f"{label} contains invalid Unicode")
    if PRIVATE_MARKERS.search(value):
        raise ValidationError(f"{label} contains a private calendar marker")
    return value


def _day(value: object, label: str) -> date:
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValidationError(f"{label} must use YYYY-MM-DD")
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise ValidationError(f"{label} is not a valid date") from exc


def _updated_at(value: object) -> datetime:
    if isinstance(value, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return datetime.combine(_day(value, "updatedAt"), datetime.min.time(), UTC)
    if not isinstance(value, str):
        raise ValidationError("updatedAt must be an ISO date or timezone-aware datetime")
    try:
        result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValidationError("updatedAt is not an ISO datetime") from exc
    if result.tzinfo is None or result.utcoffset() is None:
        raise ValidationError("updatedAt datetime must specify its timezone")
    return result.astimezone(UTC)


def _source(value: object, label: str) -> str:
    source = _text(value, label, limit=3000)
    if any(c.isspace() for c in source) or "\\" in source:
        raise ValidationError(f"{label} must be an HTTPS URL without whitespace")
    try:
        parts = urlsplit(source)
        host = (parts.hostname or "").lower().rstrip(".")
        port = parts.port
    except ValueError as exc:
        raise ValidationError(f"{label} is not a valid URL") from exc
    if parts.scheme != "https" or not host or parts.username or parts.password:
        raise ValidationError(f"{label} must be an HTTPS URL without credentials")
    if port not in (None, 443):
        raise ValidationError(f"{label} must use standard HTTPS")
    try:
        ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        raise ValidationError(f"{label} must identify a public source by hostname")
    if ("." not in host or host.startswith("home.") or ".home." in host
            or host.endswith((".local", ".localdomain", ".internal", ".localhost"))):
        raise ValidationError(f"{label} cannot reference a local host")
    if host in {"calendar.google.com", "www.parentsquare.com", "parentsquare.com"}:
        raise ValidationError(f"{label} must be a public organizer source, not a personal feed")
    return source


def _instant(day: date, clock: str, label: str) -> datetime:
    """Reject ambiguous/nonexistent wall times rather than silently guessing."""
    wall = datetime.combine(day, datetime.strptime(clock, "%H:%M").time())
    candidates = set()
    for fold in (0, 1):
        instant = wall.replace(tzinfo=PACIFIC, fold=fold).astimezone(UTC)
        if instant.astimezone(PACIFIC).replace(tzinfo=None) == wall:
            candidates.add(instant)
    if not candidates:
        raise ValidationError(f"{label} is a nonexistent Pacific time during the DST change")
    if len(candidates) != 1:
        raise ValidationError(f"{label} is an ambiguous Pacific time during the DST change")
    return candidates.pop()


def validate_catalog(data: object) -> dict:
    if not isinstance(data, dict) or set(data) != {"updatedAt", "events"}:
        raise ValidationError("Catalog must contain only updatedAt and events")
    _updated_at(data["updatedAt"])
    if not isinstance(data["events"], list):
        raise ValidationError("events must be a list")
    seen_ids = set()
    for number, event in enumerate(data["events"], start=1):
        label = f"Event {number}"
        if not isinstance(event, dict):
            raise ValidationError(f"{label} must be an object")
        extra = set(event) - FIELDS
        missing = REQUIRED_FIELDS - set(event)
        if extra or missing:
            raise ValidationError(f"{label} fields: unexpected={sorted(extra)}, missing={sorted(missing)}")
        identifier = _text(event["id"], f"{label} id", limit=120)
        if not ID_PATTERN.fullmatch(identifier) or identifier in seen_ids:
            raise ValidationError(f"{label} id must be unique and use letters, digits, _ or -")
        seen_ids.add(identifier)
        day = _day(event["date"], f"{label} date")
        if day == date.max:
            raise ValidationError(f"{label} date is outside the supported range")
        for field in ("title", "city", "location", "category", "sourceName"):
            _text(event[field], f"{label} {field}", limit=1000)
        _text(event["description"], f"{label} description", multiline=True, allow_empty=True)
        for field in ("cost", "timeNote"):
            if field in event:
                _text(event[field], f"{label} {field}", multiline=True, limit=2000)
        _source(event["sourceUrl"], f"{label} sourceUrl")
        for field in ("startTime", "endTime"):
            clock = event[field]
            if clock is not None:
                if not isinstance(clock, str) or not TIME_PATTERN.fullmatch(clock):
                    raise ValidationError(f"{label} {field} must use HH:MM or null")
                _instant(day, clock, f"{label} {field}")
        if event["endTime"] is not None:
            if event["startTime"] is None or event["endTime"] <= event["startTime"]:
                raise ValidationError(f"{label} endTime must be after startTime on the same date")
    return data


def _unique_object(pairs: list[tuple[str, object]]) -> dict:
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValidationError(f"Duplicate JSON field: {key}")
        result[key] = value
    return result


def load_catalog(path: Path) -> dict:
    return validate_catalog(json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=_unique_object))


def escape_text(value: str) -> str:
    return value.replace("\\", "\\\\").replace("\n", "\\n").replace(";", "\\;").replace(",", "\\,")


def fold_line(line: str) -> str:
    """Fold at 75 UTF-8 octets without splitting a code point (RFC 5545)."""
    lines, current, size = [], [], 0
    for char in line:
        width = len(char.encode("utf-8"))
        if size + width > 75:
            lines.append("".join(current))
            current, size = [" "], 1
        current.append(char)
        size += width
    lines.append("".join(current))
    return "\r\n".join(lines)


def build_ics(data: dict) -> bytes:
    validate_catalog(data)
    stamp = _updated_at(data["updatedAt"]).strftime("%Y%m%dT%H%M%SZ")
    lines = [
        "BEGIN:VCALENDAR", "VERSION:2.0",
        "PRODID:-//Game Changers AI//Merced Atwater McSwain Community Calendar//EN",
        "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
        "X-WR-CALNAME:Merced · Atwater · McSwain Community Calendar",
        "X-WR-TIMEZONE:America/Los_Angeles",
    ]
    for event in sorted(data["events"], key=lambda e: (e["date"], e["startTime"] or "", e["id"])):
        day = date.fromisoformat(event["date"])
        title = event["title"]
        description = [event["description"]] if event["description"] else []
        if event.get("cost"):
            description.append("Cost: " + event["cost"])
        if event.get("timeNote"):
            description.append(event["timeNote"])
        if event["startTime"] is None:
            title += " · TIME TBD"
            description.append("Time TBD. This is a date placeholder, not an all-day event.")
        elif event["endTime"] is None:
            description.append("End time not published; confirm with the organizer.")
        description.append("Source: " + event["sourceName"] + "\n" + event["sourceUrl"])
        lines.extend([
            "BEGIN:VEVENT", "UID:" + event["id"] + "@community.gamechangersai.org",
            "DTSTAMP:" + stamp, "LAST-MODIFIED:" + stamp,
            "SUMMARY:" + escape_text(title),
            "DESCRIPTION:" + escape_text("\n\n".join(description)),
            "LOCATION:" + escape_text(event["location"]),
            "CATEGORIES:" + escape_text(event["category"]),
            "URL:" + event["sourceUrl"], "TRANSP:TRANSPARENT", "CLASS:PUBLIC",
        ])
        if event["startTime"] is None:
            lines.extend([
                "DTSTART;VALUE=DATE:" + day.strftime("%Y%m%d"),
                "DTEND;VALUE=DATE:" + (day + timedelta(days=1)).strftime("%Y%m%d"),
            ])
        else:
            lines.append("DTSTART:" + _instant(day, event["startTime"], "startTime").strftime("%Y%m%dT%H%M%SZ"))
            if event["endTime"] is not None:
                lines.append("DTEND:" + _instant(day, event["endTime"], "endTime").strftime("%Y%m%dT%H%M%SZ"))
        lines.append("END:VEVENT")
    lines.append("END:VCALENDAR")
    return ("\r\n".join(fold_line(line) for line in lines) + "\r\n").encode("utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=ROOT / "public/events.json")
    parser.add_argument("--output", type=Path, default=ROOT / "public/community.ics")
    parser.add_argument("--check", action="store_true", help="Validate and check the existing feed without writing")
    args = parser.parse_args(argv)
    try:
        data = load_catalog(args.input)
        content = build_ics(data)
        if args.check:
            if not args.output.is_file() or args.output.read_bytes() != content:
                raise ValidationError("The generated feed is missing or stale; run scripts/build_calendar.py")
        else:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_bytes(content)
        print(f"Validated {len(data['events'])} public events; feed {'checked' if args.check else 'generated'}.")
    except (ValidationError, OSError, json.JSONDecodeError) as exc:
        print(f"Calendar validation failed: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
