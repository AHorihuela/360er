-- This migration tried to deprecate tables that don't exist in local development.
-- The tables were likely from production-specific data.
-- Keeping as no-op for migration history consistency.
SELECT 1; 