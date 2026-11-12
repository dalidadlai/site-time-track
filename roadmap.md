# QR attendance
- [x] Add secure project QR links and daily check-in storage.
- [x] Add employee name-selection check-in page.
- [x] Add project attendance view compared with Plan Hours.
- [x] Test owner/public flow and duplicate check-in protection.

# Daily job list
- [x] Group same-date jobs in one expandable date card with daily totals.
- [x] Preserve individual edit, delete, signature and PDF actions; grouping tests and authenticated read-only browser fixture passed on mobile and desktop.

# Saved SI
- [x] Add editable SI list with sender, number and content, synced across devices.
- [x] Select and save SI on a Daywork without changing existing records or hours.
- [x] Verify saved SI and Daywork selection through tests and the signed-in app.

# Task SI
- [x] Move SI selection into task add/edit descriptions and show each task's saved SI.
- [x] Preserve existing SI data and verify independent task saves and account sync; tests and signed-in mobile save/refresh passed, temporary records removed.

# Mobile return position
- [x] Preserve each screen's scroll position and project list expansions/filters when navigating back.
- [x] Verify regression tests and signed-in mobile navigation with existing records; returning to the expanded mid-list day restored the exact scroll position, with no runtime errors.

# Registration approval
- [x] Enforce pending registrations and owner-only approval without exposing other accounts' records.
- [x] Add waiting screen and approval controls in Settings.
- [x] Verify owner sign-in and approval controls; 11 regression tests passed, existing approved accounts and owner role confirmed.
- [ ] Verify new signup trigger, pending denial and approval/rejection end-to-end: blocked because temporary test-account creation was declined; no new account was created.