# Architecture
- QR attendance uses token-scoped database functions for public name lookup and check-in; direct attendance reads are owner-only to keep existing account data private.
- Attendance is separate from plans and tasks; project dialogs poll records so employee check-ins appear without altering hours.
- Attendance dates and display times use Pacific/Auckland on the server and client to avoid device clock or timezone differences.
- Public check-in routes stay outside AuthGate so employees do not need an account.
- WhatsApp group sharing uses a text deep link to the permanent public attendance URL, not provider credentials, because visitors initiate check-in themselves.
- Group project daywork lists by date for display only; retain original record IDs and signatures so editing, deletion, and PDF selection preserve existing approvals.