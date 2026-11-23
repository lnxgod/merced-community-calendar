"""Render the public total from a private ledger of confirmed PayPal gifts."""

import argparse
import json
from datetime import date
from pathlib import Path


PAGE = Path(__file__).resolve().parents[1] / "public/toydrive/index.html"
START = "<!-- paypal-total:start -->"
END = "<!-- paypal-total:end -->"


def confirmed_total(ledger):
    if ledger.get("campaign") != "GC-TOYS-2026" or not isinstance(ledger.get("payments"), list):
        raise ValueError("Expected a 2026 toy-drive ledger with a payments list.")
    amounts = {}
    for payment in ledger["payments"]:
        identifier = payment["id"].strip().upper()
        gross = payment["grossCents"]
        refunded = payment["refundedCents"]
        if not identifier or type(gross) is not int or type(refunded) is not int:
            raise ValueError("Each payment needs an ID and integer USD cent amounts.")
        if not 0 <= refunded <= gross or gross == 0:
            raise ValueError("Invalid donation or cumulative refund amount.")
        if identifier in amounts and amounts[identifier] != (gross, refunded):
            raise ValueError("Duplicate payment with conflicting amounts; reconcile the receipts.")
        amounts[identifier] = (gross, refunded)
    return sum(gross - refunded for gross, refunded in amounts.values())


def render_total(html, cents, updated):
    if html.count(START) != 1 or html.count(END) != 1:
        raise ValueError("The donation tracker markers are missing or duplicated.")
    before, body = html.split(START)
    current, after = body.split(END)
    dollars, pennies = divmod(cents, 100)
    amount = f'<p class="donation-total">${dollars:,}.{pennies:02d}</p>'
    if amount in current:
        return html
    label = f"{updated:%B} {updated.day}, {updated.year}"
    timestamp = f'<p>Total updated <time datetime="{updated.isoformat()}">{label}</time></p>'
    return before + START + f"\n                {amount}\n                {timestamp}\n                " + END + after


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ledger", type=Path, help="Private JSON outside the public repository")
    parser.add_argument("--date", required=True, type=date.fromisoformat, help="Pacific date, YYYY-MM-DD")
    args = parser.parse_args()
    if args.ledger.resolve().is_relative_to(PAGE.parents[2]):
        parser.error("Keep the private ledger outside the public repository.")
    cents = confirmed_total(json.loads(args.ledger.read_text(encoding="utf-8-sig")))
    with PAGE.open(encoding="utf-8", newline="") as src:
        original = src.read()
    newline = "\r\n" if "\r\n" in original else "\n"
    updated = render_total(original.replace("\r\n", "\n"), cents, args.date).replace("\n", newline)
    if updated != original:
        PAGE.write_bytes(updated.encode("utf-8"))
