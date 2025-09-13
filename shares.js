import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { executeQuery, executeTransaction } from '../config/database.js';

const router = express.Router();

// GET /api/shares - Get all share settings
router.get('/', async (req, res) => {
  try {
    const { active = true } = req.query;
    
    let query = `
      SELECT 
        ss.*,
        d.name as document_name,
        d.original_name,
        d.size,
        d.type
      FROM share_settings ss
      JOIN documents d ON ss.document_id = d.id
    `;
    
    const params = [];
    
    if (active === 'true') {
      query += ' WHERE ss.is_active = TRUE AND ss.expiry_date > NOW()';
    } else if (active === 'false') {
      query += ' WHERE ss.is_active = FALSE OR ss.expiry_date <= NOW()';
    }
    
    query += ' ORDER BY ss.created_at DESC';
    
    const result = await executeQuery(query, params);
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error fetching share settings:', error);
    res.status(500).json({ error: 'Failed to fetch share settings' });
  }
});

// GET /api/shares/:id - Get single share setting
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        ss.*,
        d.name as document_name,
        d.original_name,
        d.size,
        d.type,
        d.file_path
      FROM share_settings ss
      JOIN documents d ON ss.document_id = d.id
      WHERE ss.id = ?
    `;
    
    const result = await executeQuery(query, [id]);
    
    if (result.success) {
      if (result.data.length === 0) {
        res.status(404).json({ error: 'Share setting not found' });
      } else {
        res.json(result.data[0]);
      }
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error fetching share setting:', error);
    res.status(500).json({ error: 'Failed to fetch share setting' });
  }
});

// POST /api/shares - Create share setting
router.post('/', async (req, res) => {
  try {
    const { 
      documentId, 
      expiryDate, 
      allowDownload = true, 
      requirePassword = false, 
      password, 
      maxAccessCount 
    } = req.body;
    
    if (!documentId || !expiryDate) {
      return res.status(400).json({ error: 'documentId and expiryDate are required' });
    }
    
    // Verify document exists
    const docQuery = 'SELECT id, name FROM documents WHERE id = ?';
    const docResult = await executeQuery(docQuery, [documentId]);
    
    if (!docResult.success || docResult.data.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const shareId = uuidv4();
    const shareLink = `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/share/${shareId}`;
    
    // Create share setting and update document
    const queries = [
      {
        query: `
          INSERT INTO share_settings (id, document_id, expiry_date, allow_download, require_password, password_hash, max_access_count, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
        `,
        params: [shareId, documentId, expiryDate, allowDownload, requirePassword, password || null, maxAccessCount || null]
      },
      {
        query: `
          UPDATE documents 
          SET is_shared = TRUE, share_link = ?, updated_at = NOW()
          WHERE id = ?
        `,
        params: [shareLink, documentId]
      }
    ];
    
    const result = await executeTransaction(queries);
    
    if (result.success) {
      // Get the created share setting
      const getShareQuery = `
        SELECT 
          ss.*,
          d.name as document_name,
          d.original_name,
          d.size,
          d.type
        FROM share_settings ss
        JOIN documents d ON ss.document_id = d.id
        WHERE ss.id = ?
      `;
      const shareResult = await executeQuery(getShareQuery, [shareId]);
      
      if (shareResult.success) {
        res.status(201).json(shareResult.data[0]);
      } else {
        res.status(201).json({ id: shareId, shareLink, message: 'Share created successfully' });
      }
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error creating share setting:', error);
    res.status(500).json({ error: 'Failed to create share setting' });
  }
});

// PUT /api/shares/:id - Update share setting
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic update query
    const allowedFields = ['expiry_date', 'allow_download', 'require_password', 'password_hash', 'max_access_count', 'is_active'];
    const updateFields = [];
    const params = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = ?`);
        params.push(value);
      }
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    params.push(id);
    
    const query = `
      UPDATE share_settings 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = ?
    `;
    
    const result = await executeQuery(query, params);
    
    if (result.success) {
      // Get updated share setting
      const getShareQuery = `
        SELECT 
          ss.*,
          d.name as document_name,
          d.original_name,
          d.size,
          d.type
        FROM share_settings ss
        JOIN documents d ON ss.document_id = d.id
        WHERE ss.id = ?
      `;
      const shareResult = await executeQuery(getShareQuery, [id]);
      
      if (shareResult.success) {
        res.json(shareResult.data[0]);
      } else {
        res.status(500).json({ error: 'Share updated but failed to retrieve' });
      }
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error updating share setting:', error);
    res.status(500).json({ error: 'Failed to update share setting' });
  }
});

// DELETE /api/shares/:id - Delete share setting
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get share setting to get document ID
    const getShareQuery = 'SELECT document_id FROM share_settings WHERE id = ?';
    const shareResult = await executeQuery(getShareQuery, [id]);
    
    if (!shareResult.success || shareResult.data.length === 0) {
      return res.status(404).json({ error: 'Share setting not found' });
    }
    
    const documentId = shareResult.data[0].document_id;
    
    // Delete share setting and update document
    const queries = [
      {
        query: 'DELETE FROM share_settings WHERE id = ?',
        params: [id]
      },
      {
        query: `
          UPDATE documents 
          SET is_shared = FALSE, share_link = NULL, updated_at = NOW()
          WHERE id = ?
        `,
        params: [documentId]
      }
    ];
    
    const result = await executeTransaction(queries);
    
    if (result.success) {
      res.json({ message: 'Share setting deleted successfully' });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error deleting share setting:', error);
    res.status(500).json({ error: 'Failed to delete share setting' });
  }
});

// GET /api/shares/link/:shareId - Access shared document
router.get('/link/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;
    
    const query = `
      SELECT 
        ss.*,
        d.name as document_name,
        d.original_name,
        d.size,
        d.type,
        d.file_path
      FROM share_settings ss
      JOIN documents d ON ss.document_id = d.id
      WHERE ss.id = ? AND ss.is_active = TRUE AND ss.expiry_date > NOW()
    `;
    
    const result = await executeQuery(query, [shareId]);
    
    if (!result.success || result.data.length === 0) {
      return res.status(404).json({ error: 'Share link not found or expired' });
    }
    
    const share = result.data[0];
    
    // Check access count limit
    if (share.max_access_count && share.current_access_count >= share.max_access_count) {
      return res.status(403).json({ error: 'Maximum access count reached' });
    }
    
    // Log access
    const logQuery = `
      INSERT INTO access_logs (id, document_id, accessed_at, ip_address, user_agent, location, action)
      VALUES (?, ?, NOW(), ?, ?, ?, 'view')
    `;
    
    const logId = uuidv4();
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    await executeQuery(logQuery, [logId, share.document_id, clientIP, userAgent, 'Unknown']);
    
    // Update access counts
    const updateQueries = [
      {
        query: `
          UPDATE documents 
          SET access_count = access_count + 1, last_accessed = NOW()
          WHERE id = ?
        `,
        params: [share.document_id]
      },
      {
        query: `
          UPDATE share_settings 
          SET current_access_count = current_access_count + 1
          WHERE id = ?
        `,
        params: [shareId]
      }
    ];
    
    await executeTransaction(updateQueries);
    
    res.json({
      document: {
        id: share.document_id,
        name: share.document_name,
        originalName: share.original_name,
        size: share.size,
        type: share.type
      },
      share: {
        id: share.id,
        allowDownload: share.allow_download,
        requirePassword: share.require_password,
        expiryDate: share.expiry_date
      }
    });
  } catch (error) {
    console.error('Error accessing shared document:', error);
    res.status(500).json({ error: 'Failed to access shared document' });
  }
});

// GET /api/shares/expiring - Get expiring shares
router.get('/expiring', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const query = `
      SELECT 
        ss.*,
        d.name as document_name,
        d.original_name,
        DATEDIFF(ss.expiry_date, NOW()) as days_until_expiry
      FROM share_settings ss
      JOIN documents d ON ss.document_id = d.id
      WHERE ss.is_active = TRUE 
        AND ss.expiry_date > NOW()
        AND DATEDIFF(ss.expiry_date, NOW()) <= ?
      ORDER BY ss.expiry_date ASC
    `;
    
    const result = await executeQuery(query, [parseInt(days)]);
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error fetching expiring shares:', error);
    res.status(500).json({ error: 'Failed to fetch expiring shares' });
  }
});

export default router;
