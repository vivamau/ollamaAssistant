import express from 'express';
import { ollamaService } from '../services/OllamaService';
import { databaseService } from '../services/DatabaseService';
import { documentProcessor } from '../services/DocumentProcessor';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Get models from database which includes IDs
    const dbModels = await databaseService.getModels();
    
    // Get fresh data from Ollama
    const ollamaResponse = await ollamaService.listModels();
    
    // Merge database IDs, usage_count, token counts, and last_used_at with Ollama data
    const modelsWithIds = ollamaResponse.models.map((ollamaModel: any) => {
      const dbModel = dbModels.find((m: any) => m.model_original_name === ollamaModel.name);
      return {
        ...ollamaModel,
        ID: dbModel?.ID || null,
        usage_count: dbModel?.usage_count || 0,
        total_prompt_tokens: dbModel?.total_prompt_tokens || 0,
        total_completion_tokens: dbModel?.total_completion_tokens || 0,
        last_used_at: dbModel?.last_used_at || null
      };
    });
    
    res.json({ models: modelsWithIds });
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
    const { documentId, baseModel, newModelName } = req.body;

    if (!documentId || !baseModel || !newModelName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get document from database
    const document = await databaseService.getDocument(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Process document content
    const content = await documentProcessor.processFile(document.path, document.mime_type);

    // Create Modelfile
    const modelfile = `FROM ${baseModel}
SYSTEM """
You are a helpful assistant trained on the following document: ${document.original_name}.
Use this content to answer questions:

${content}
"""`;

    // Create model
    const stream = await ollamaService.createModel(newModelName, modelfile);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const part of stream) {
      res.write(`data: ${JSON.stringify(part)}\n\n`);
    }
    
    // Sync models after creation
    await databaseService.syncModels();
    
    res.end();
  } catch (error) {
    console.error('Error creating model:', error);
    res.status(500).json({ error: 'Failed to create model' });
  }
});

router.delete('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    if (!name) {
      return res.status(400).json({ error: 'Model name is required' });
    }

    // Delete from Ollama first
    await ollamaService.deleteModel(name);
    
    // Then delete from database
    await databaseService.deleteModel(name);
    
    res.json({ message: 'Model deleted successfully from both Ollama and database' });
  } catch (error) {
    console.error('Error deleting model:', error);
    res.status(500).json({ error: 'Failed to delete model' });
  }
});

export default router;
