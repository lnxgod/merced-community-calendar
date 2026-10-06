"""Optional website artwork cannot change the shared catalog/feed contract."""

import base64
import contextlib
import copy
import io
import json
from pathlib import Path
import tempfile
import unittest

from test_calendar import calendar, catalog, event

PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP1sAAAAASUVORK5CYII=")


class EventImageTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.root = Path(self.folder.name)
        self.asset = self.root / "assets/events/community-flyer-v1.png"
        self.asset.parent.mkdir(parents=True)
        self.asset.write_bytes(PNG)
        self.catalog = catalog()
        self.image = {"src": "assets/events/community-flyer-v1.png", "alt": "Public community event flyer.", "width": 1, "height": 1}

    def manifest(self, **overrides):
        return {"images": {self.catalog["events"][0]["id"]: {**self.image, **overrides}}}

    def test_optional_images_preserve_shared_catalog_and_feed(self):
        original = copy.deepcopy(self.catalog)
        feed = calendar.build_ics(self.catalog)
        for manifest in ({"images": {}}, self.manifest(), self.manifest(thumbnailSrc=self.image["src"])):
            calendar.validate_event_images(manifest, self.catalog, self.root)
        self.assertEqual(self.catalog, original)
        self.assertEqual(calendar.build_ics(self.catalog), feed)
        with self.assertRaises(calendar.ValidationError):
            calendar.validate_catalog(catalog(event(image=self.image)))

    def test_manifest_rejects_unknown_ids_private_fields_and_invalid_metadata(self):
        invalid = [{}, {"images": []}, {"images": {}, "sender": "private"}, {"images": {"unknown-id": self.image}}]
        for overrides in ({"sender": "private"}, {"alt": ""}, {"alt": "PRIVATE\nMESSAGE"},
                          {"alt": "Overlaps your family calendar"}, {"alt": "x" * 501},
                          {"width": True}, {"height": 0}, {"width": 10001}):
            invalid.append(self.manifest(**overrides))
        invalid.append({"images": {self.catalog["events"][0]["id"]: {"src": self.image["src"]}}})
        for manifest in invalid:
            with self.subTest(manifest=manifest), self.assertRaises(calendar.ValidationError):
                calendar.validate_event_images(manifest, self.catalog, self.root)

    def test_assets_must_be_existing_local_raster_images(self):
        for path in ("https://example.org/flyer.png", "//example.org/flyer.png", "assets/events/../private.png",
                     "assets/events/%2e%2e/private.png", "assets/events/flyer.svg", "assets/events/flyer.png?token=private",
                     "assets/events/missing.png", "assets/events/community-flyer-v1.png\n"):
            for field in ("src", "thumbnailSrc"):
                with self.subTest(path=path, field=field), self.assertRaises(calendar.ValidationError):
                    calendar.validate_event_images(self.manifest(**{field: path}), self.catalog, self.root)
        self.asset.write_text("<svg><text>Not a PNG</text></svg>")
        with self.assertRaises(calendar.ValidationError):
            calendar.validate_event_images(self.manifest(), self.catalog, self.root)
        self.asset.write_bytes(PNG)
        linked = self.asset.with_name("linked.png")
        linked.symlink_to(self.asset)
        with self.assertRaises(calendar.ValidationError):
            calendar.validate_event_images(self.manifest(src="assets/events/linked.png"), self.catalog, self.root)
        self.asset.write_bytes(PNG + b"\0" * (5 * 1024 * 1024))
        with self.assertRaises(calendar.ValidationError):
            calendar.validate_event_images(self.manifest(), self.catalog, self.root)

    def test_build_validates_manifest_before_writing_or_checking_feed(self):
        source, output = self.root / "events.json", self.root / "community.ics"
        source.write_text(json.dumps(self.catalog))
        manifest = self.root / "event-images.json"
        manifest.write_text(json.dumps(self.manifest()))
        args = ["--input", str(source), "--output", str(output)]
        self.assertEqual(calendar.main(args), 0)
        self.assertEqual(calendar.main(args + ["--check"]), 0)
        original = output.read_bytes()
        manifest.write_text(json.dumps(self.manifest(src="assets/events/missing.png")))
        with contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(calendar.main(args), 1)
            self.assertEqual(calendar.main(args + ["--check"]), 1)
        self.assertEqual(output.read_bytes(), original)


if __name__ == "__main__":
    unittest.main()
