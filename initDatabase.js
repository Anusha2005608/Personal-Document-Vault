import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { testConnection, executeQuery } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initializeDatabase() {
  console.log('🚀 Initializing Personal Document Vault Database...\n');
  
  try {
    // Test database connection
    console.log('1. Testing database connection...');
    const isConnected = await testConnection();
    
    if (!isConnected) {
      console.error('❌ Failed to connect to database. Please check your configuration.');
      process.exit(1);
    }
    
    // Read and execute schema
    console.log('2. Creating database schema...');
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.error('❌ Schema file not found:', schemaPath);
      process.exit(1);
    }
    
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        const result = await executeQuery(statement);
        if (!result.success) {
          console.warn('⚠️  Warning executing statement:', result.error);
        }
      }
    }
    
    console.log('✅ Database schema created successfully');
    
    // Verify tables were created
    console.log('3. Verifying tables...');
    const tablesResult = await executeQuery('SHOW TABLES');
    
    if (tablesResult.success) {
      console.log('📋 Created tables:');
      tablesResult.data.forEach(table => {
        console.log(`   - ${Object.values(table)[0]}`);
      });
    }
    
    // Check sample data
    console.log('4. Checking sample data...');
    const docCountResult = await executeQuery('SELECT COUNT(*) as count FROM documents');
    const logCountResult = await executeQuery('SELECT COUNT(*) as count FROM access_logs');
    
    if (docCountResult.success && logCountResult.success) {
      console.log(`📄 Sample documents: ${docCountResult.data[0].count}`);
      console.log(`📊 Sample access logs: ${logCountResult.data[0].count}`);
    }
    
    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Start the backend server: npm run dev');
    console.log('2. Start the frontend: npm run dev (in project root)');
    console.log('3. Access the application at http://localhost:5173');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  }
}

// Run initialization
initializeDatabase();
