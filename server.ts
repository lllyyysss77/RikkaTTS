import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
// Zeabur will automatically inject DATABASE_URL or POSTGRES_URI
const connectionString = 
  process.env.DATABASE_URL || 
  process.env.POSTGRES_URL || 
  process.env.POSTGRES_URI ||
  process.env.DATABASE_PUBLIC_URL;

let pool: Pool | null = null;
if (connectionString) {
  pool = new Pool({
    connectionString,
    // Add SSL for remote hosted databases, but usually Zeabur internal doesn't strictly need it if in same VPC.
    // Uncomment if connection fails: ssl: { rejectUnauthorized: false }
  });
  console.log('PostgreSQL connection pool initialized.');
} else {
  console.warn('WARN: DATABASE_URL is not set. Database features will not work.');
}

// Auto-create table if it doesn't exist
const initDB = async () => {
  if (!pool) return;
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS global_nicknames (
        voice_id VARCHAR(255) PRIMARY KEY,
        nickname VARCHAR(255) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createTableQuery);
    console.log('Database table global_nicknames checked/created.');
  } catch (err) {
    console.error('Error initializing database table:', err);
  }
};
initDB();

// API Routes
app.get('/api/nicknames', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not available' });
  }
  
  try {
    const result = await pool.query('SELECT voice_id, nickname FROM global_nicknames');
    
    // Convert to a dictionary: { "voiceId1": "Nick1", "voiceId2": "Nick2" }
    const nicknamesDict = result.rows.reduce((acc, row) => {
      acc[row.voice_id] = row.nickname;
      return acc;
    }, {} as Record<string, string>);
    
    res.json(nicknamesDict);
  } catch (err) {
    console.error('Error fetching nicknames:', err);
    res.status(500).json({ error: 'Failed to fetch nicknames' });
  }
});

app.post('/api/nicknames', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database not available' });
  }
  
  const { voice_id, nickname } = req.body;
  
  if (!voice_id || !nickname) {
    return res.status(400).json({ error: 'voice_id and nickname are required' });
  }
  
  try {
    // Upsert (Insert or Update)
    const upsertQuery = `
      INSERT INTO global_nicknames (voice_id, nickname, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (voice_id) 
      DO UPDATE SET 
        nickname = EXCLUDED.nickname,
        updated_at = EXCLUDED.updated_at
      RETURNING *;
    `;
    const result = await pool.query(upsertQuery, [voice_id, nickname]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating nickname:', err);
    res.status(500).json({ error: 'Failed to update nickname' });
  }
});

// Serve static React Frontend in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  
  // Catch-all route to serve strictly index.html for SPA routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
