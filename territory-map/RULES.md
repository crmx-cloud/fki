# MapKi Territory Map — Mandatory Rules

**CRITICAL: Read this file before making ANY changes to this app.**

## Rule 1: No Destructive Changes
- NEVER delete and recreate files. Only edit existing files.
- NEVER replace a page wholesale. Make targeted edits only.
- NEVER change the schema in a way that drops or renames tables/fields.
- NEVER run `clearAndReseed` in production — data is sacred.

## Rule 2: Backup Before Every Change
- Run `bash /work/scripts/mapki/backup_before_change.sh "description"` BEFORE starting any work.
- If the change touches more than 3 files, create a backup.
- If the change modifies backend (convex/) at all, create a backup.
- Backups live in `/work/backups/territory-map/` with timestamps.

## Rule 3: Incremental Changes Only
- Small, testable changes. Build after each file edit.
- If a "tweak" request would require rewriting a file, STOP and break it into small edits.
- Add new features by ADDING files/code, not replacing existing ones.

## Rule 4: Protect User Data
- Database data (brands, territories, users, invites) is production data.
- Schema changes must be additive only (new fields = optional, new tables = fine).
- Never remove fields from the schema — deprecate by adding new ones.

## Rule 5: Test Before Deploy
- `bun run build` must pass cleanly before any deploy.
- Verify the preview URL loads after deploy.
- If the build breaks, restore from backup immediately.

## Rule 6: Convex Backend Safety
- Backend changes (convex/*.ts) are the highest risk — they affect ALL users instantly.
- Always backup before touching convex/ files.
- New mutations/queries = safe. Changing existing ones = needs extra care.
- Schema migrations: add optional fields only, never remove.

## Backup Locations
- `/work/backups/territory-map/` — timestamped snapshots
- Restore: `tar xzf /work/backups/territory-map/{backup}.tar.gz -C /work/viktor-spaces/`

## History
- 2026-03-21: Rules established after Brent's concern about destructive changes.
- Original app was accidentally deleted and rebuilt — NEVER let this happen again.
