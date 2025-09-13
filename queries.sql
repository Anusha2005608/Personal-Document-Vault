-- Personal Document Vault - Common Queries
-- Useful SQL queries for the application

USE personal_document_vault;

-- 1. Get all documents with their access statistics
SELECT 
    d.id,
    d.name,
    d.original_name,
    d.size,
    d.type,
    d.uploaded_at,
    d.last_accessed,
    d.access_count,
    d.is_shared,
    d.share_link,
    d.expiry_date,
    COUNT(al.id) as total_access_logs,
    MAX(al.accessed_at) as last_logged_access
FROM documents d
LEFT JOIN access_logs al ON d.id = al.document_id
GROUP BY d.id
ORDER BY d.uploaded_at DESC;

-- 2. Get documents by type
SELECT 
    type,
    COUNT(*) as document_count,
    SUM(size) as total_size,
    AVG(size) as average_size
FROM documents
GROUP BY type
ORDER BY document_count DESC;

-- 3. Get recent access activity (last 24 hours)
SELECT 
    al.id,
    d.name as document_name,
    al.accessed_at,
    al.action,
    al.ip_address,
    al.location
FROM access_logs al
JOIN documents d ON al.document_id = d.id
WHERE al.accessed_at >= NOW() - INTERVAL 24 HOUR
ORDER BY al.accessed_at DESC;

-- 4. Get shared documents that are expiring soon
SELECT 
    d.id,
    d.name,
    d.share_link,
    ss.expiry_date,
    DATEDIFF(ss.expiry_date, NOW()) as days_until_expiry
FROM documents d
JOIN share_settings ss ON d.id = ss.document_id
WHERE d.is_shared = TRUE 
    AND ss.is_active = TRUE 
    AND ss.expiry_date > NOW()
    AND DATEDIFF(ss.expiry_date, NOW()) <= 7
ORDER BY ss.expiry_date ASC;

-- 5. Get access statistics by document
SELECT 
    d.id,
    d.name,
    d.access_count,
    COUNT(al.id) as logged_accesses,
    COUNT(CASE WHEN al.action = 'view' THEN 1 END) as view_count,
    COUNT(CASE WHEN al.action = 'download' THEN 1 END) as download_count,
    MAX(al.accessed_at) as last_access
FROM documents d
LEFT JOIN access_logs al ON d.id = al.document_id
GROUP BY d.id, d.name, d.access_count
ORDER BY d.access_count DESC;

-- 6. Get documents by size range
SELECT 
    CASE 
        WHEN size < 1024*1024 THEN 'Small (< 1MB)'
        WHEN size < 10*1024*1024 THEN 'Medium (1-10MB)'
        WHEN size < 100*1024*1024 THEN 'Large (10-100MB)'
        ELSE 'Very Large (> 100MB)'
    END as size_category,
    COUNT(*) as document_count,
    AVG(size) as average_size
FROM documents
GROUP BY size_category
ORDER BY average_size;

-- 7. Get monthly upload statistics
SELECT 
    YEAR(uploaded_at) as year,
    MONTH(uploaded_at) as month,
    COUNT(*) as documents_uploaded,
    SUM(size) as total_size_uploaded
FROM documents
GROUP BY YEAR(uploaded_at), MONTH(uploaded_at)
ORDER BY year DESC, month DESC;

-- 8. Get access patterns by hour of day
SELECT 
    HOUR(accessed_at) as hour_of_day,
    COUNT(*) as access_count,
    COUNT(CASE WHEN action = 'view' THEN 1 END) as views,
    COUNT(CASE WHEN action = 'download' THEN 1 END) as downloads
FROM access_logs
GROUP BY HOUR(accessed_at)
ORDER BY hour_of_day;

-- 9. Clean up expired share links
UPDATE share_settings 
SET is_active = FALSE 
WHERE expiry_date < NOW() AND is_active = TRUE;

-- 10. Get storage usage statistics
SELECT 
    COUNT(*) as total_documents,
    SUM(size) as total_size_bytes,
    ROUND(SUM(size) / (1024*1024), 2) as total_size_mb,
    ROUND(SUM(size) / (1024*1024*1024), 2) as total_size_gb,
    AVG(size) as average_file_size,
    MAX(size) as largest_file_size
FROM documents;
