-- Create feedback_analytics table
CREATE TABLE "feedback_analytics" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "feedback_request_id" UUID NOT NULL REFERENCES "feedback_requests"("id") ON DELETE CASCADE,
    "insights" JSONB NOT NULL,
    "feedback_hash" TEXT NOT NULL,
    "last_analyzed_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE "feedback_analytics" ENABLE ROW LEVEL SECURITY;

-- Add unique constraint to existing table
ALTER TABLE "feedback_analytics" 
ADD CONSTRAINT "feedback_analytics_request_id_key" 
UNIQUE ("feedback_request_id");

-- Update RLS policies (drop existing ones first)
DROP POLICY IF EXISTS "Users can view feedback analytics for their employees" ON "feedback_analytics";
DROP POLICY IF EXISTS "Users can create and update feedback analytics for their employees" ON "feedback_analytics";

-- Re-create RLS policies
CREATE POLICY "Users can view feedback analytics for their employees"
ON "feedback_analytics"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM "feedback_requests" fr
    JOIN "review_cycles" rc ON fr."review_cycle_id" = rc."id"
    WHERE fr."id" = "feedback_analytics"."feedback_request_id"
    AND rc."user_id" = auth.uid()
  )
);

CREATE POLICY "Users can create and update feedback analytics for their employees"
ON "feedback_analytics"
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM "feedback_requests" fr
    JOIN "review_cycles" rc ON fr."review_cycle_id" = rc."id"
    WHERE fr."id" = "feedback_analytics"."feedback_request_id"
    AND rc."user_id" = auth.uid()
  )
);
