# ClubOS demo script (about 5 minutes)

Before: run `scripts/seed-demo.ps1` (new data each run), open the site URL in a clean browser profile, have 2 browsers/profiles ready.

1. **Admin** (admin@example.com): log in, Admin dashboard, create a club live. Open Robotics Club: you manage all clubs.
2. **Student** (student3@example.com): browse clubs, open Robotics Club, Request to join. Status shows Pending.
3. **Executive** (exec1@example.com): open Robotics Club, Join requests, Approve student3. Create an event (small capacity).
4. **Member** (member1@example.com): open an event, Register, show the QR ticket. Copy the Ticket ID.
5. **Executive**: open the event, Check-in, paste the Ticket ID. Attendance updates.
6. Paste the same Ticket ID again: "Ticket already used" (duplicate scan blocked).
7. **Member**: Cancel registration is now blocked (already checked in).
8. Capacity: register student2 and member1 for the full event (Hack Night): the next user sees "Event full". (With the seeded registrations, register exec1 to fill the third spot.)

Fallbacks: token expired -> log in again. Data messy -> rerun the seed script and use the new clubs. API down -> show screenshots (take them during rehearsal).
