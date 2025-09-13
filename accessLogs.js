import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { executeQuery } from '../config/database.js';

const router = express.Router();

// GET /api/access-logs - Get all access logs
router.get('/', async (req, res) => {
  try {
    const { documentId, limit = 100, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        al.id,
        al.document_id,
        d.name as document_name,
        al.accessed_at,
        al.ip_address,
        al.user_agent,
        al.location,
        al.action
      FROM access_logs al
      JOIN documents d ON al.document_id = d.id
    `;
    
    const params = [];
    
    if (documentId) {
      query += ' WHERE al.document_id = ?';
      params.push(documentId);
    }
    
    query += ' ORDER BY al.accessed_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await executeQuery(query, params);
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error fetching access logs:', error);
    res.status(500).json({ error: 'Failed to fetch access logs' });
  }
});

// GET /api/access-logs/:id - Get single access log
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        al.*,
        d.name as document_name,
        d.original_name
      FROM access_logs al
      JOIN documents d ON al.document_id = d.id
      WHERE al.id = ?
    `;
    
    const result = await executeQuery(query, [id]);
    
    if (result.success) {
      if (result.data.length === 0) {
        res.status(404).json({ error: 'Access log not found' });
      } else {
        res.json(result.data[0]);
      }
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error fetching access log:', error);
    res.status(500).json({ error: 'Failed to fetch access log' });
  }
});

// POST /api/access-logs - Log document access
router.post('/', async (req, res) => {
  try {
    const { documentId, action, ipAddress, userAgent, location } = req.body;
    
    if (!documentId || !action) {
      return res.status(400).json({ error: 'documentId and action are required' });
    }
    
    // Verify document exists
    const docQuery = 'SELECT id FROM documents WHERE id = ?';
    const docResult = await executeQuery(docQuery, [documentId]);
    
    if (!docResult.success || docResult.data.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const logId = uuidv4();
    const query = `
      INSERT INTO access_logs (id, document_id, accessed_at, ip_address, user_agent, location, action)
      VALUES (?, ?, NOW(), ?, ?, ?, ?)
    `;
    
    const params = [
      logId,
      documentId,
      ipAddress || req.ip || 'unknown',
      userAgent || req.get('User-Agent') || 'unknown',
      location || 'Unknown',
      action
    ];
    
    const result = await executeQuery(query, params);
    
    if (result.success) {
      // Update document access count and last accessed
      const updateQuery = `
        UPDATE documents 
        SET access_count = access_count + 1, last_accessed = NOW()
        WHERE id = ?
      `;
      await executeQuery(updateQuery, [documentId]);
      
      // Return the created log
      const getLogQuery = `
        SELECT 
          al.*,
          d.name as document_name
        FROM access_logs al
        JOIN documents d ON al.document_id = d.id
        WHERE al.id = ?
      `;
      const logResult = await executeQuery(getLogQuery, [logId]);
      
      if (logResult.success) {
        res.status(201).json(logResult.data[0]);
      } else {
        res.status(201).json({ id: logId, message: 'Access logged successfully' });
      }
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error logging access:', error);
    res.status(500).json({ error: 'Failed to log access' });
  }
});

// GET /api/access-logs/stats/overview - Get access statistics overview
router.get('/stats/overview', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const queries = [
      {
        name: 'totalAccesses',
        query: `
          SELECT COUNT(*) as count
          FROM access_logs 
          WHERE accessed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        `,
        params: [parseInt(days)]
      },
      {
        name: 'uniqueDocuments',
        query: `
          SELECT COUNT(DISTINCT document_id) as count
          FROM access_logs 
          WHERE accessed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        `,
        params: [parseInt(days)]
      },
      {
        name: 'viewsVsDownloads',
        query: `
          SELECT 
            action,
            COUNT(*) as count
          FROM access_logs 
          WHERE accessed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
          GROUP BY action
        `,
        params: [parseInt(days)]
      },
      {
        name: 'hourlyDistribution',
        query: `
          SELECT 
            HOUR(accessed_at) as hour,
            COUNT(*) as count
          FROM access_logs 
          WHERE accessed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
          GROUP BY HOUR(accessed_at)
          ORDER BY hour
        `,
        params: [parseInt(days)]
      }
    ];
    
    const results = {};
    
    for (const { name, query, params } of queries) {
      const result = await executeQuery(query, params);
      if (result.success) {
        results[name] = result.data;
      }
    }
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching access statistics:', error);
    res.status(500).json({ error: 'Failed to fetch access statistics' });
  }
});

// GET /api/access-logs/stats/documents/:id - Get access stats for specific document
router.get('/stats/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;
    
    const queries = [
      {
        name: 'totalAccesses',
        query: `
          SELECT COUNT(*) as count
          FROM access_logs 
          WHERE document_id = ? AND accessed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        `,
        params: [id, parseInt(days)]
      },
      {
        name: 'recentActivity',
        query: `
          SELECT 
            accessed_at,
            action,
            ip_address,
            location
          FROM access_logs 
          WHERE document_id = ? 
          ORDER BY accessed_at DESC 
          LIMIT 10
        `,
        params: [id]
      },
      {
        name: 'dailyAccess',
        query: `
          SELECT 
            DATE(accessed_at) as date,
            COUNT(*) as count
          FROM access_logs 
          WHERE document_id = ? AND accessed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
          GROUP BY DATE(accessed_at)
          ORDER BY date DESC
        `,
        params: [id, parseInt(days)]
      }
    ];
    
    const results = {};
    
    for (const { name, query, params } of queries) {
      const result = await executeQuery(query, params);
      if (result.success) {
        results[name] = result.data;
      }
    }
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching document access statistics:', error);
    res.status(500).json({ error: 'Failed to fetch document access statistics' });
  }
});

export default router;
