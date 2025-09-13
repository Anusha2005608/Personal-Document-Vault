import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { executeQuery, executeTransaction } from '../config/database.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${fileExtension}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || '').split(',');
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024 // 100MB default
  },
  fileFilter: fileFilter
});

// GET /api/documents - Get all documents
router.get('/', async (req, res) => {
  try {
    const { search, filter, type } = req.query;
    
    let query = `
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
        COUNT(al.id) as total_access_logs
      FROM documents d
      LEFT JOIN access_logs al ON d.id = al.document_id
    `;
    
    const conditions = [];
    const params = [];
    
    if (search) {
      conditions.push('(d.name LIKE ? OR d.original_name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (filter === 'shared') {
      conditions.push('d.is_shared = TRUE');
    } else if (filter === 'private') {
      conditions.push('d.is_shared = FALSE');
    }
    
    if (type && type !== 'all') {
      conditions.push('d.type = ?');
      params.push(type);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' GROUP BY d.id ORDER BY d.uploaded_at DESC';
    
    const result = await executeQuery(query, params);
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// GET /api/documents/:id - Get single document
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        d.*,
        COUNT(al.id) as total_access_logs,
        MAX(al.accessed_at) as last_logged_access
      FROM documents d
      LEFT JOIN access_logs al ON d.id = al.document_id
      WHERE d.id = ?
      GROUP BY d.id
    `;
    
    const result = await executeQuery(query, [id]);
    
    if (result.success) {
      if (result.data.length === 0) {
        res.status(404).json({ error: 'Document not found' });
      } else {
        res.json(result.data[0]);
      }
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// POST /api/documents - Upload new document
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const documentId = uuidv4();
    const { originalname, filename, mimetype, size, path: filePath } = req.file;
    
    const query = `
      INSERT INTO documents (id, name, original_name, size, type, file_path, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;
    
    const params = [documentId, filename, originalname, size, mimetype, filePath];
    const result = await executeQuery(query, params);
    
    if (result.success) {
      // Get the created document
      const getDocQuery = 'SELECT * FROM documents WHERE id = ?';
      const docResult = await executeQuery(getDocQuery, [documentId]);
      
      if (docResult.success) {
        res.status(201).json(docResult.data[0]);
      } else {
        res.status(500).json({ error: 'Document created but failed to retrieve' });
      }
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// PUT /api/documents/:id - Update document
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic update query
    const allowedFields = ['is_shared', 'share_link', 'expiry_date'];
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
      UPDATE documents 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = ?
    `;
    
    const result = await executeQuery(query, params);
    
    if (result.success) {
      // Get updated document
      const getDocQuery = 'SELECT * FROM documents WHERE id = ?';
      const docResult = await executeQuery(getDocQuery, [id]);
      
      if (docResult.success) {
        res.json(docResult.data[0]);
      } else {
        res.status(500).json({ error: 'Document updated but failed to retrieve' });
      }
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// DELETE /api/documents/:id - Delete document
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First get the document to get file path
    const getDocQuery = 'SELECT file_path FROM documents WHERE id = ?';
    const docResult = await executeQuery(getDocQuery, [id]);
    
    if (!docResult.success || docResult.data.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const filePath = docResult.data[0].file_path;
    
    // Delete from database (cascade will handle related records)
    const deleteQuery = 'DELETE FROM documents WHERE id = ?';
    const result = await executeQuery(deleteQuery, [id]);
    
    if (result.success) {
      // Delete physical file
      try {
        const fs = await import('fs');
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileError) {
        console.warn('Failed to delete physical file:', fileError.message);
      }
      
      res.json({ message: 'Document deleted successfully' });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// GET /api/documents/:id/download - Download document
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'SELECT * FROM documents WHERE id = ?';
    const result = await executeQuery(query, [id]);
    
    if (!result.success || result.data.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const document = result.data[0];
    
    // Log the download access
    const logQuery = `
      INSERT INTO access_logs (id, document_id, accessed_at, ip_address, user_agent, location, action)
      VALUES (?, ?, NOW(), ?, ?, ?, 'download')
    `;
    
    const logId = uuidv4();
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    await executeQuery(logQuery, [logId, id, clientIP, userAgent, 'Unknown']);
    
    // Update document access count
    const updateQuery = `
      UPDATE documents 
      SET access_count = access_count + 1, last_accessed = NOW()
      WHERE id = ?
    `;
    await executeQuery(updateQuery, [id]);
    
    // Send file
    res.download(document.file_path, document.original_name);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

export default router;
