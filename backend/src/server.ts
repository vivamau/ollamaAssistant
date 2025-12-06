import express from 'express';
import cors from 'cors';
import { Ollama } from 'ollama';
import path from 'path';

import chatRoutes from './routes/chat';
import documentsRoutes from './routes/documents';
import modelsRoutes from './routes/models';
import websiteRoutes from './routes/websites';
import promptsRoutes from './routes/prompts';
import { databaseService } from './services/DatabaseService';
import { MigrationRunner } from './services/MigrationRunner';
import { migrations } from './migrations';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/models', modelsRoutes);
app.use('/api/websites', websiteRoutes);
app.use('/api/prompts', promptsRoutes);

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Check Ollama connection
const ollama = new Ollama();
app.get('/api/ollama/status', async (req, res) => {
  try {
    await ollama.list();
    res.json({ status: 'connected', message: 'Ollama is running' });
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      message: 'Ollama is not reachable. Please ensure Ollama is running.' 
    });
  }
});

// Start server
app.listen(port, async () => {
  console.log(`Server running at http://localhost:${port}`);
  
  // Run database migrations
  try {
    const dbPath = path.join(__dirname, '../data/ollamaAssistant.db');
    const migrationRunner = new MigrationRunner(dbPath);
    await migrationRunner.runMigrations(migrations);
    migrationRunner.close();
    console.log('Database migrations completed');
  } catch (error) {
    console.error('Failed to run migrations:', error);
  }
  
  // Sync models from Ollama to database
  try {
    await databaseService.syncModels();
  } catch (error) {
    console.error('Failed to sync models at startup:', error);
  }
});
