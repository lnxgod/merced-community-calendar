import unittest
from datetime import date

from scripts.update_toy_drive_total import END, START, confirmed_total, render_total


class DonationTotalTests(unittest.TestCase):
    def test_receipt_replays_and_refunds(self):
        gift = {"id": "sample-one", "grossCents": 1111, "refundedCents": 100}
        refunded = {"id": "sample-two", "grossCents": 2000, "refundedCents": 2000}
        ledger = {"campaign": "GC-TOYS-2026", "payments": [gift, gift, refunded]}
        self.assertEqual(confirmed_total(ledger), 1011)

    def test_inconsistent_receipts_fail_before_publication(self):
        gift = {"id": "sample", "grossCents": 500, "refundedCents": 0}
        for other in [dict(gift, refundedCents=100), dict(gift, refundedCents=501),
                      dict(gift, grossCents=1.5)]:
            with self.subTest(other=other), self.assertRaises(ValueError):
                confirmed_total({"campaign": "GC-TOYS-2026", "payments": [gift, other]})

    def test_static_total_and_last_change_date(self):
        original = f"before{START}pending{END}after"
        first = render_total(original, 123456, date(2026, 11, 22))
        self.assertIn("$1,234.56", first)
        self.assertIn('datetime="2026-11-22"', first)
        self.assertEqual(render_total(first, 123456, date(2026, 11, 23)), first)
        fully_refunded = render_total(first, 0, date(2026, 11, 23))
        self.assertIn("$0.00", fully_refunded)
        self.assertIn('datetime="2026-11-23"', fully_refunded)
        self.assertTrue(fully_refunded.startswith("before") and fully_refunded.endswith("after"))
