-- Shift the current two-hour schedule from 08:00-00:00 to 07:00-23:00.
--
-- Review the affected rows before running the UPDATE statements. Set
-- @cutover_date to the first date that should move; historical records remain
-- unchanged. This migration does not update existing Google Calendar events.

SET @cutover_date = 'YYYY-MM-DD';

SELECT 'bookings' AS record_type, id, slot_date, slot_time, status, calendar_event_id
FROM bookings
WHERE slot_date >= @cutover_date
  AND slot_time IN ('08:00:00', '10:00:00', '12:00:00', '14:00:00',
                    '16:00:00', '18:00:00', '20:00:00', '22:00:00')
ORDER BY slot_date, slot_time, id;

SELECT 'bids' AS record_type, id, slot_date, slot_time, allocation_status
FROM bids
WHERE slot_date >= @cutover_date
  AND slot_time IN ('08:00:00', '10:00:00', '12:00:00', '14:00:00',
                    '16:00:00', '18:00:00', '20:00:00', '22:00:00')
ORDER BY slot_date, slot_time, id;

-- Run these statements only after reviewing the two SELECT results above.
START TRANSACTION;

UPDATE bookings
SET
  slot_time = TIME_SUB(slot_time, INTERVAL 1 HOUR),
  calendar_sync_status = CASE
    WHEN calendar_event_id IS NULL THEN calendar_sync_status
    ELSE 'not_synced'
  END
WHERE slot_date >= @cutover_date
  AND slot_time IN ('08:00:00', '10:00:00', '12:00:00', '14:00:00',
                    '16:00:00', '18:00:00', '20:00:00', '22:00:00');

UPDATE bids
SET slot_time = TIME_SUB(slot_time, INTERVAL 1 HOUR)
WHERE slot_date >= @cutover_date
  AND slot_time IN ('08:00:00', '10:00:00', '12:00:00', '14:00:00',
                    '16:00:00', '18:00:00', '20:00:00', '22:00:00');

COMMIT;

-- Recreate or update every affected Google Calendar event before relying on
-- calendar_sync_status again.
