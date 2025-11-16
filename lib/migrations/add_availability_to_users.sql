-- Add availability status to users table
-- This allows users to set their status: online, busy, off_work, on_leave

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'online' CHECK (availability_status IN ('online', 'busy', 'off_work', 'on_leave'));

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_availability_status ON users(availability_status);

-- Add comment
COMMENT ON COLUMN users.availability_status IS 'User availability status: online, busy, off_work, on_leave';

