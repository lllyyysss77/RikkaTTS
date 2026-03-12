import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

const app = express();
// Zeabur expectsport 8080 or process.env.PORT
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Database Connection
const connectionString = 
  process.env.DATABASE_URL || 
  process.env.POSTGRES_URL || 
  process.env.POSTGRES_URI ||
  process.env.DATABASE_PUBLIC_URL;

let pool = null;
if (connectionString) {
  try {
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1') 
           ? false 
           : { rejectUnauthorized: false }
    });
    pool.on('error', (err) => console.error('Pool Error:', err));
    console.log('✅ DB Pool init');
  } catch (e) {
    console.error('❌ Pool init fail', e);
  }
}

// Minimal Health Check - NO WILDCARDS
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    db: !!pool,
    ts: Date.now()
  });
});

// API Routes
app.get('/api/nicknames', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'No DB' });
  try {
    const result = await pool.query('SELECT voice_id, nickname FROM global_nicknames');
    const dict = result.rows.reduce((acc, row) => {
      acc[row.voice_id] = row.nickname;
      return acc;
    }, {});
    res.json(dict);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/nicknames', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'No DB' });
  const { voice_id, nickname } = req.body;
  try {
    const q = `
      INSERT INTO global_nicknames (voice_id, nickname, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (voice_id) DO UPDATE SET nickname = EXCLUDED.nickname, updated_at = EXCLUDED.updated_at
      RETURNING *;
    `;
    const result = await pool.query(q, [voice_id, nickname]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auto-init table
if (pool) {
  pool.query(`
    CREATE TABLE IF NOT EXISTS global_nicknames (
      voice_id VARCHAR(255) PRIMARY KEY,
      nickname VARCHAR(255) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `).then(() => console.log('✨ Table ready')).catch(e => console.error('❌ Table error', e));
}

// Serve Frontend
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Final fallback for SPA - use middleware instead of route pattern to avoid PathError
app.use((req, res) => {
  // Only serve index.html for non-API requests
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API Server running on port ${PORT}`);
});
