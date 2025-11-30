import express from 'express';
import cors from 'cors';
import { Ollama } from 'ollama';

import documentsRouter from './routes/documents';
import websitesRouter from './routes/websites';
import modelsRouter from './routes/models';
import chatRouter from './routes/chat';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/documents', documentsRouter);
app.use('/api/websites', websitesRouter);
app.use('/api/models', modelsRouter);
app.use('/api/chat', chatRouter);

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
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
