-- Personal Document Vault Database Schema
-- MySQL Database Setup

-- Create database
CREATE DATABASE IF NOT EXISTS personal_document_vault;
USE personal_document_vault;

-- Documents table
CREATE TABLE documents (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    size BIGINT NOT NULL,
    type VARCHAR(100) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP NULL,
    access_count INT DEFAULT 0,
    is_shared BOOLEAN DEFAULT FALSE,
    share_link VARCHAR(500) NULL,
    expiry_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_uploaded_at (uploaded_at),
    INDEX idx_is_shared (is_shared),
    INDEX idx_expiry_date (expiry_date)
);

-- Access logs table
CREATE TABLE access_logs (
    id VARCHAR(50) PRIMARY KEY,
    document_id VARCHAR(50) NOT NULL,
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    location VARCHAR(255) DEFAULT 'Unknown',
    action ENUM('view', 'download') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    INDEX idx_document_id (document_id),
    INDEX idx_accessed_at (accessed_at),
    INDEX idx_action (action)
);

-- Share settings table
CREATE TABLE share_settings (
    id VARCHAR(50) PRIMARY KEY,
    document_id VARCHAR(50) NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    allow_download BOOLEAN DEFAULT TRUE,
    require_password BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255) NULL,
    max_access_count INT NULL,
    current_access_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    INDEX idx_document_id (document_id),
    INDEX idx_expiry_date (expiry_date),
    INDEX idx_is_active (is_active)
);

-- Users table (for future authentication)
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
);

-- Document permissions table (for future multi-user support)
CREATE TABLE document_permissions (
    id VARCHAR(50) PRIMARY KEY,
    document_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    permission_type ENUM('read', 'write', 'admin') NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by VARCHAR(50) NOT NULL,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_document (document_id, user_id),
    INDEX idx_document_id (document_id),
    INDEX idx_user_id (user_id)
);

-- Create views for common queries
CREATE VIEW document_stats AS
SELECT 
    d.id,
    d.name,
    d.size,
    d.type,
    d.uploaded_at,
    d.last_accessed,
    d.access_count,
    d.is_shared,
    COUNT(al.id) as total_access_logs,
    MAX(al.accessed_at) as last_logged_access
FROM documents d
LEFT JOIN access_logs al ON d.id = al.document_id
GROUP BY d.id, d.name, d.size, d.type, d.uploaded_at, d.last_accessed, d.access_count, d.is_shared;

-- Create view for recent activity
CREATE VIEW recent_activity AS
SELECT 
    al.id,
    al.document_id,
    d.name as document_name,
    al.accessed_at,
    al.action,
    al.ip_address,
    al.location
FROM access_logs al
JOIN documents d ON al.document_id = d.id
ORDER BY al.accessed_at DESC;

-- Insert sample data
INSERT INTO documents (id, name, original_name, size, type, file_path, uploaded_at, access_count, is_shared) VALUES
('doc_001', 'sample_document.pdf', 'Sample Document.pdf', 1024000, 'application/pdf', '/uploads/sample_document.pdf', NOW(), 5, TRUE),
('doc_002', 'presentation.pptx', 'Project Presentation.pptx', 2048000, 'application/vnd.openxmlformats-officedocument.presentationml.presentation', '/uploads/presentation.pptx', NOW(), 2, FALSE),
('doc_003', 'spreadsheet.xlsx', 'Financial Report.xlsx', 512000, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '/uploads/spreadsheet.xlsx', NOW(), 0, FALSE);

INSERT INTO access_logs (id, document_id, accessed_at, ip_address, user_agent, location, action) VALUES
('log_001', 'doc_001', NOW() - INTERVAL 2 HOUR, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'New York, NY', 'view'),
('log_002', 'doc_001', NOW() - INTERVAL 1 HOUR, '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'San Francisco, CA', 'download'),
('log_003', 'doc_002', NOW() - INTERVAL 30 MINUTE, '192.168.1.102', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Chicago, IL', 'view');

INSERT INTO share_settings (id, document_id, expiry_date, allow_download, require_password, is_active) VALUES
('share_001', 'doc_001', NOW() + INTERVAL 7 DAY, TRUE, FALSE, TRUE);
