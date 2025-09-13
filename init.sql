-- Personal Document Vault Database Initialization
-- Run this script to set up the database from scratch

-- Drop existing database if it exists (use with caution in production)
-- DROP DATABASE IF EXISTS personal_document_vault;

-- Create and use database
CREATE DATABASE IF NOT EXISTS personal_document_vault;
USE personal_document_vault;

-- Source the schema file
SOURCE schema.sql;

-- Create a database user for the application (optional)
-- CREATE USER 'vault_user'@'localhost' IDENTIFIED BY 'secure_password_123';
-- GRANT ALL PRIVILEGES ON personal_document_vault.* TO 'vault_user'@'localhost';
-- FLUSH PRIVILEGES;

-- Show tables to verify creation
SHOW TABLES;

-- Show sample data
SELECT 'Documents:' as info;
SELECT id, name, size, type, uploaded_at, access_count, is_shared FROM documents;

SELECT 'Access Logs:' as info;
SELECT id, document_id, accessed_at, action, ip_address FROM access_logs;

SELECT 'Share Settings:' as info;
SELECT id, document_id, expiry_date, allow_download, require_password FROM share_settings;
