-- Fix for missing response_time column and enum values in power_events table
USE power_management;

-- Add the missing response_time column (if it doesn't exist)
SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'power_management' 
    AND TABLE_NAME = 'power_events' 
    AND COLUMN_NAME = 'response_time');

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE power_events ADD COLUMN response_time BIGINT DEFAULT NULL;', 
    'SELECT "Column response_time already exists" AS notice;');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update the action enum to include 'screenshot' and 'ping' actions
ALTER TABLE power_events MODIFY COLUMN action ENUM('wake', 'shutdown', 'restart', 'screenshot', 'ping') NOT NULL;

-- Verify the changes
DESCRIBE power_events;
