-- Fix payrun_id column type from INTEGER to VARCHAR(100)
-- Run this SQL command directly in your PostgreSQL database if the migration doesn't work

-- Step 1: Check current column type
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payroll' 
AND column_name = 'payrun_id';

-- Step 2: If it's INTEGER, convert it to VARCHAR(100)
-- First, drop any foreign key constraints on payrun_id
DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'payroll'::regclass 
        AND contype = 'f'
        AND conname LIKE '%payrun_id%'
    LOOP
        EXECUTE 'ALTER TABLE payroll DROP CONSTRAINT IF EXISTS ' || constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- Then convert integer column to VARCHAR using USING clause
ALTER TABLE payroll 
ALTER COLUMN payrun_id TYPE VARCHAR(100) 
USING CASE 
  WHEN payrun_id IS NULL THEN NULL 
  ELSE payrun_id::text 
END;

-- Step 3: Verify the change
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'payroll' 
AND column_name = 'payrun_id';

