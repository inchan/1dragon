ALTER TABLE "video_jobs"
ADD COLUMN IF NOT EXISTS "reference_intake" jsonb;
