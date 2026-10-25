#!/usr/bin/env python3
"""
TaskWorker Pro - Automated Sanity Test Runner across all 19 Modules
Conforms to QA/README.md Specification
"""
import urllib.request
import urllib.error
import json
import sys

BASE_URL = "http://localhost:5008"

def request(method, path, data=None, token=None, expected_status=200):
    url = f"{BASE_URL}{path}"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            content_type = resp.headers.get("Content-Type", "")
            raw = resp.read()
            resp_data = None
            if "application/json" in content_type:
                try:
                    resp_data = json.loads(raw.decode("utf-8"))
                except Exception:
                    resp_data = raw.decode("utf-8")
            else:
                resp_data = f"<binary/text data: {len(raw)} bytes>"
            return resp.status, resp_data, None
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            err_data = json.loads(raw.decode("utf-8"))
        except Exception:
            err_data = raw.decode("utf-8")
        return e.code, err_data, f"HTTPError {e.code}"
    except Exception as ex:
        return 0, None, str(ex)

def main():
    print("=" * 80)
    print("   TASKWORKER PRO (TrackerKerja) - SANITY TEST RUNNER (19 MODULES)")
    print("=" * 80)

    results = []

    # 1. Health & Swagger
    status, _, err = request("GET", "/swagger/v1/swagger.json")
    results.append(("API", "Swagger OpenAPI Spec", "/swagger/v1/swagger.json", status, err))

    # 2. Auth Login & Tenant Companies
    status, comp_data, err = request("GET", "/api/auth/companies")
    results.append(("TENANT", "Get Tenant Companies", "/api/auth/companies", status, err))

    login_payload = {
        "email": "admin@trackerkerja.local",
        "password": "AdminSecurePassword2026!"
    }
    status, login_res, err = request("POST", "/api/auth/login", data=login_payload)
    token = None
    if status == 200 and isinstance(login_res, dict):
        token = login_res.get("accessToken")
    results.append(("AUTH", "Admin Login & JWT Issuance", "/api/auth/login", status, err))

    if not token:
        print("\nFATAL: Failed to acquire JWT Token. Aborting authenticated checks.\n")
        print(f"Login Response: {login_res}")
        return 1

    # Authenticated Modules Tests
    endpoints = [
        ("AUTH", "Profile Context Verification", "GET", "/api/profile", None),
        ("PROJ", "List Active Projects", "GET", "/api/projects", None),
        ("TASK", "List Tasks (WBS & Progress)", "GET", "/api/tasks", None),
        ("KANBAN", "Kanban View Tasks Filter", "GET", "/api/tasks?status=1", None),
        ("TIME", "Active Stopwatch & Timers", "GET", "/api/timesheets/active-timers", None),
        ("TIME", "Timesheet Work Sessions", "GET", "/api/timesheets", None),
        ("ATTEND", "Today's Attendance Status", "GET", "/api/attendances/today", None),
        ("ATTEND", "Monthly Attendance Summary", "GET", "/api/attendances/summary", None),
        ("NOTE", "Work Notes & Attachments", "GET", "/api/notes", None),
        ("EXCEL", "Standard 9-Col Excel Template", "GET", "/api/tasks/export/template", None),
        ("EXCEL", "ARMS 21-Col Excel Template", "GET", "/api/tasks/export/arms-template", None),
        ("TEAM", "Team Directory & Members", "GET", "/api/members", None),
        ("TEAM", "Admin Group Security Directory", "GET", "/api/members/admin-group", None),
        ("CAL", "Calendar Scheduled Events", "GET", "/api/calendar/events", None),
        ("DEV", "SQL Formatter Dialects", "GET", "/api/sqltools/dialects", None),
        ("DEV", "JSON Tools Validation & Format", "POST", "/api/devtools/json/format", {"jsonString": "{\"status\":\"ok\"}"}),
        ("AUDIT", "Audit Trail Summary Analytics", "GET", "/api/audit-logs/summary", None),
        ("AUDIT", "Audit Modules List", "GET", "/api/audit-logs/modules", None),
        ("AUDIT", "Audit Activity Logs Query", "GET", "/api/audit-logs?page=1&pageSize=5", None),
        ("MASTER", "Master SDLC Job Titles", "GET", "/api/master-data/job-titles", None),
        ("MASTER", "System Settings & Parameters", "GET", "/api/settings", None),
        ("GAME", "Gamification User Status", "GET", "/api/gamification/status", None),
        ("GAME", "Gamification Badges Catalog", "GET", "/api/gamification/badges", None),
        ("NOTIF", "Official Announcements", "GET", "/api/announcements", None),
        ("NOTIF", "SMTP Notification Config", "GET", "/api/email-config", None),
        ("SYNC", "Host Induk Sync Ping", "GET", "/api/sync/ping", None),
        ("SYNC", "Multi-Instance Sync Summary", "GET", "/api/sync/summary", None),
        ("THEME", "Theme Configuration Query", "GET", "/api/settings", None),
    ]

    for mod, desc, meth, path, payload in endpoints:
        s, data, error = request(meth, path, data=payload, token=token)
        results.append((mod, desc, path, s, error))

    # Print Report
    print(f"\n{'No':<3} | {'Modul':<7} | {'Deskripsi Uji':<34} | {'Status':<10} | {'HTTP':<5} | {'Detail':<15}")
    print("-" * 84)

    all_passed = True
    for i, (mod, desc, path, st, err) in enumerate(results, 1):
        status_text = "PASS" if st == 200 else "FAIL"
        if st != 200:
            all_passed = False
        detail_text = "OK" if st == 200 else (err or "Unknown error")
        print(f"{i:<3} | {mod:<7} | {desc:<34} | {status_text:<10} | {st:<5} | {detail_text[:20]}")

    print("=" * 84)
    total = len(results)
    passed = sum(1 for r in results if r[3] == 200)
    failed = total - passed
    print(f"TOTAL: {total} | PASSED: {passed} | FAILED: {failed} | SUCCESS RATE: {(passed/total)*100:.1f}%\n")

    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
