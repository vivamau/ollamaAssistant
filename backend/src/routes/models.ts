import express from 'express';
import { ollamaService } from '../services/OllamaService';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const response = await ollamaService.listModels();
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list models' });
  }
});

router.post('/pull', async (req, res) => {
  try {
    const { model } = req.body;
    const stream = await ollamaService.pullModel(model);
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const part of stream) {
      res.write(`data: ${JSON.stringify(part)}\n\n`);
    }
    res.end();
  } catch (error) {
    console.error('Error pulling model:', error);
    res.status(500).json({ error: 'Failed to pull model' });
  }
});

router.post('/create', async (req, res) => {
  try {
    const { name, modelfile } = req.body;
    const stream = await ollamaService.createModel(name, modelfile);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const part of stream) {
      res.write(`data: ${JSON.stringify(part)}\n\n`);
    }
    res.end();
  } catch (error) {
    console.error('Error creating model:', error);
    res.status(500).json({ error: 'Failed to create model' });
  }
});

export default router;
