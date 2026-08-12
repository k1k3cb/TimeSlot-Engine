-- =============================================================
-- TimeSlot Engine: Booking overlap prevention via EXCLUDE
-- =============================================================
-- Adds a tstzrange column maintained by trigger, plus a GiST
-- EXCLUDE constraint that prevents overlapping PENDING/CONFIRMED
-- bookings on the same resource at the DB level.
-- =============================================================

-- 1) tstzrange column (not generated — maintained by trigger)
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "time_range" tstzrange;

-- 2) Trigger function: sets time_range from startAt/endAt
CREATE OR REPLACE FUNCTION set_booking_time_range()
RETURNS TRIGGER AS $$
BEGIN
  NEW."time_range" := tstzrange(NEW."startAt", NEW."endAt", '[)');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3) Trigger: fires before INSERT or UPDATE of startAt/endAt
DROP TRIGGER IF EXISTS trg_booking_time_range ON "Booking";
CREATE TRIGGER trg_booking_time_range
  BEFORE INSERT OR UPDATE OF "startAt", "endAt" ON "Booking"
  FOR EACH ROW
  EXECUTE FUNCTION set_booking_time_range();

-- 4) Backfill existing rows (if any)
UPDATE "Booking" SET "time_range" = tstzrange("startAt", "endAt", '[)') WHERE "time_range" IS NULL;

-- 5) NOT NULL constraint
ALTER TABLE "Booking" ALTER COLUMN "time_range" SET NOT NULL;

-- 6) GiST EXCLUDE constraint: no overlapping bookings on same resource
--    Only enforced for PENDING and CONFIRMED statuses.
ALTER TABLE "Booking"
  ADD CONSTRAINT "booking_no_overlap"
  EXCLUDE USING gist (
    "resourceId" WITH =,
    "time_range" WITH &&
  )
  WHERE (status IN ('PENDING', 'CONFIRMED'));
