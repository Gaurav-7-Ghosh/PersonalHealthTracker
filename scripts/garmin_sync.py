#!/usr/bin/env python3
"""Daily Garmin auto-sync: steps, calories burnt and sleep into your own Supabase, for the app to pick up.

Runs on a schedule in GitHub Actions (.github/workflows/garmin-sync.yml). It signs in to Garmin Connect with the
unofficial `garminconnect` library, reads the last few days, and writes one `wellness` row per day into the
Supabase `records` table that the app already syncs (docs/SYNC.md). The app's next sync shows the days.

This is unofficial: Garmin can change its sign-in at any time, and then this job fails until the library catches
up. The export import in the app (Health, Garmin) keeps working regardless. See docs/GARMIN.md.

Environment (GitHub secrets):
  GARMIN_EMAIL, GARMIN_PASSWORD          Garmin Connect login
  GARMIN_TOKENS                           optional: tokens from `--login` on your own computer (for MFA accounts)
  SUPABASE_URL, SUPABASE_KEY              the same Project URL and publishable key the app uses
  SUPABASE_EMAIL, SUPABASE_PASSWORD       the same login you use in the app
  GARMIN_TOKENSTORE                       optional: where tokens are kept between runs, default ~/.garminconnect

Usage:
  python scripts/garmin_sync.py [--days 3]
  python scripts/garmin_sync.py --login          sign in on your computer (asks for MFA) and print GARMIN_TOKENS
  python scripts/garmin_sync.py --fake FILE      read Garmin responses from a JSON file instead (tests)

Logs from a public repo's Actions are public, so this prints only counts and dates, never values.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

STORE = "wellness"


def env(name: str, default: str | None = None) -> str | None:
    v = os.environ.get(name, "").strip()
    return v or default


# ---------- Garmin ----------


def tokenstore() -> Path:
    return Path(env("GARMIN_TOKENSTORE", "~/.garminconnect")).expanduser()


def seed_tokens(store: Path) -> None:
    """GARMIN_TOKENS is garmin_tokens.json from --login; write it when nothing is cached yet (MFA accounts)."""
    tokens = env("GARMIN_TOKENS")
    file = store / "garmin_tokens.json"
    if tokens and not file.exists():
        store.mkdir(mode=0o700, parents=True, exist_ok=True)
        file.write_text(tokens)
        file.chmod(0o600)


def no_mfa() -> str:
    raise SystemExit("Garmin asked for an MFA code. Run `python scripts/garmin_sync.py --login` on your computer and save GARMIN_TOKENS.")


def garmin_client(interactive: bool = False):
    """Signs in with saved tokens when they work, else with the password; the library saves fresh tokens to the store."""
    from garminconnect import Garmin  # imported here so tests and --help don't need it

    store = tokenstore()
    seed_tokens(store)
    prompt = (lambda: input("Garmin MFA code: ").strip()) if interactive else no_mfa
    if interactive and not env("GARMIN_EMAIL"):
        os.environ["GARMIN_EMAIL"] = input("Garmin email: ").strip()
    if interactive and not env("GARMIN_PASSWORD"):
        import getpass

        os.environ["GARMIN_PASSWORD"] = getpass.getpass("Garmin password: ")
    api = Garmin(email=env("GARMIN_EMAIL"), password=env("GARMIN_PASSWORD"), prompt_mfa=prompt)
    api.login(str(store))
    return api


class FakeGarmin:
    """Answers from a JSON file: {"summary": {day: {...}}, "sleep": {day: {...}}}."""

    def __init__(self, path: str):
        self.data = json.loads(Path(path).read_text())

    def get_user_summary(self, day: str) -> dict:
        return self.data.get("summary", {}).get(day) or {}

    def get_sleep_data(self, day: str) -> dict:
        return self.data.get("sleep", {}).get(day) or {}

    def today(self):
        return datetime.now(ZoneInfo(env("GARMIN_TZ", "UTC") or "UTC")).date()


# ---------- mapping to the app's DayStats (src/types.ts) ----------


def num(v: Any) -> float | None:
    if isinstance(v, bool) or v is None:
        return None
    if isinstance(v, (int, float)):
        return v
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def ms(v: Any) -> int | None:
    """Garmin timestamps: ms numbers from the web API, or "2024-05-01T22:10:00.0" strings in GMT."""
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return int(v)
    if isinstance(v, str) and v:
        try:
            s = v.replace(" ", "T")
            dt = datetime.fromisoformat(s if s[-1] in "Zz" or "+" in s[10:] else s + "+00:00")
            return int(dt.timestamp() * 1000)
        except ValueError:
            return None
    return None


def parse_summary(s: dict) -> dict:
    d: dict[str, Any] = {}
    if (v := num(s.get("totalSteps"))) is not None:
        d["steps"] = int(v)
    if v := num(s.get("dailyStepGoal")):
        d["stepGoal"] = int(v)
    total, active, resting = num(s.get("totalKilocalories")), num(s.get("activeKilocalories")), num(s.get("bmrKilocalories"))
    if total is not None:
        d["kcalTotal"] = total
    elif active is not None and resting is not None:
        d["kcalTotal"] = active + resting
    if active is not None:
        d["kcalActive"] = active
    if resting is not None:
        d["kcalResting"] = resting
    if (v := num(s.get("totalDistanceMeters"))) is not None:
        d["distanceM"] = v
    if v := num(s.get("restingHeartRate")):
        d["restingHr"] = v
    # Before the watch has synced a day, Garmin returns a summary with no steps or calories at all.
    if "steps" not in d and "kcalActive" not in d:
        return {}
    return d


def parse_sleep(raw: dict) -> dict:
    s = raw.get("dailySleepDTO") or raw
    if not isinstance(s, dict):
        return {}
    out: dict[str, Any] = {}
    scores = s.get("sleepScores") or {}
    if isinstance(scores, dict):
        overall = scores.get("overall")
        score = num(scores.get("overallScore"))
        if score is None:
            score = num(overall.get("value")) if isinstance(overall, dict) else num(overall)
        if score is not None:
            out["score"] = int(score)
    for key, field in (("start", "sleepStartTimestampGMT"), ("end", "sleepEndTimestampGMT")):
        if (v := ms(s.get(field))) is not None:
            out[key] = v
    for key, field in (("deep", "deepSleepSeconds"), ("light", "lightSleepSeconds"), ("rem", "remSleepSeconds"), ("awake", "awakeSleepSeconds")):
        if (v := num(s.get(field))) is not None:
            out[key] = int(v)
    if not any(k in out for k in ("score", "deep", "light", "rem")):
        return {}
    return out


def read_days(api, days: list[str]) -> dict[str, dict]:
    found: dict[str, dict] = {}
    for day in days:
        d: dict[str, Any] = {}
        try:
            d.update(parse_summary(api.get_user_summary(day) or {}))
        except Exception as e:
            print(f"{day}: summary not read ({type(e).__name__})")
        try:
            sleep = parse_sleep(api.get_sleep_data(day) or {})
            if sleep:
                d["sleep"] = sleep
        except Exception as e:
            print(f"{day}: sleep not read ({type(e).__name__})")
        if d:
            found[day] = d
        time.sleep(0.3 if not isinstance(api, FakeGarmin) else 0)
    return found


def merge(old: dict | None, new: dict, day: str, now: int) -> dict:
    """Same rule as mergeDay in src/garmin.ts: new fields win, older fields on the day are kept."""
    old = old or {}
    out = {**old, **new, "day": day, "source": "garmin", "updatedAt": now}
    if old.get("sleep") or new.get("sleep"):
        out["sleep"] = {**(old.get("sleep") or {}), **(new.get("sleep") or {})}
    return out


# ---------- Supabase (same REST calls as src/sync.ts) ----------


class Supabase:
    def __init__(self, url: str, key: str):
        self.url, self.key, self.token, self.uid = url.rstrip("/"), key, "", ""

    def call(self, path: str, method: str = "GET", body: Any = None, headers: dict | None = None) -> Any:
        h = {"apikey": self.key, "Content-Type": "application/json", **(headers or {})}
        if self.token:
            h["Authorization"] = f"Bearer {self.token}"
        data = None if body is None else json.dumps(body).encode()
        req = urllib.request.Request(self.url + path, data=data, method=method, headers=h)
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                text = res.read().decode()
        except urllib.error.HTTPError as e:
            raise SystemExit(f"Supabase {method} {path.split('?')[0]} failed: HTTP {e.code}")
        return json.loads(text) if text.strip() else None

    def sign_in(self, email: str, password: str) -> None:
        r = self.call("/auth/v1/token?grant_type=password", "POST", {"email": email, "password": password})
        self.token, self.uid = r["access_token"], r["user"]["id"]

    def existing(self, days: list[str]) -> dict[str, dict]:
        ids = ",".join(days)
        q = f"/rest/v1/records?select=store,id,data,deleted&user_id=eq.{self.uid}&store=eq.{STORE}&id=in.({urllib.parse.quote(ids)})"
        rows = self.call(q) or []
        return {r["id"]: r["data"] for r in rows if r.get("store") == STORE and r.get("id") in days and not r.get("deleted") and r.get("data")}

    def upsert(self, records: list[dict], now: int) -> None:
        rows = [{"user_id": self.uid, "store": STORE, "id": r["day"], "data": r, "deleted": False, "modified": now} for r in records]
        self.call(
            "/rest/v1/records?on_conflict=user_id,store,id",
            "POST",
            rows,
            {"Prefer": "resolution=merge-duplicates,return=minimal"},
        )


# ---------- main ----------


def day_list(n: int, today) -> list[str]:
    return [(today - timedelta(days=i)).isoformat() for i in range(n - 1, -1, -1)]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--days", type=int, default=int(env("GARMIN_DAYS", "3") or 3), help="how many days back to read, today included")
    ap.add_argument("--login", action="store_true", help="sign in interactively and print GARMIN_TOKENS")
    ap.add_argument("--fake", help="JSON file of Garmin responses (tests)")
    args = ap.parse_args()

    if args.login:
        garmin_client(interactive=True)
        print("\nSigned in. Save the line below as the GARMIN_TOKENS secret in GitHub (Settings, Secrets and variables, Actions):\n")
        print((tokenstore() / "garmin_tokens.json").read_text().strip())
        return 0

    sb_url, sb_key, sb_email, sb_password = (env(k) for k in ("SUPABASE_URL", "SUPABASE_KEY", "SUPABASE_EMAIL", "SUPABASE_PASSWORD"))
    has_garmin = args.fake or env("GARMIN_TOKENS") or (env("GARMIN_EMAIL") and env("GARMIN_PASSWORD"))
    if not (sb_url and sb_key and sb_email and sb_password and has_garmin):
        # Not set up (or a fork): nothing to do, and not an error, so the schedule doesn't fail every day.
        print("Garmin auto-sync is not set up: add the secrets listed in docs/GARMIN.md. Skipping.")
        return 0

    api = FakeGarmin(args.fake) if args.fake else garmin_client()
    # Garmin's "today" is in your profile's time zone, not the runner's (UTC).
    days = day_list(max(1, min(args.days, 60)), api.today())
    found = read_days(api, days)
    print(f"Garmin: {len(found)} of {len(days)} days had data ({days[0]} to {days[-1]})")
    if not found:
        return 0

    sb = Supabase(sb_url, sb_key)
    sb.sign_in(sb_email, sb_password)
    old = sb.existing(list(found))
    now = int(time.time() * 1000)
    records = [merge(old.get(day), d, day, now) for day, d in found.items()]
    sb.upsert(records, now)
    print(f"Supabase: wrote {len(records)} days")
    return 0


if __name__ == "__main__":
    sys.exit(main())
