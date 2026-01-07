-- Add shop_id and is_admin to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_id VARCHAR(36);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin INTEGER DEFAULT 0;



