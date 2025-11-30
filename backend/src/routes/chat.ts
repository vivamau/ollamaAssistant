import express from 'express';
import { ollamaService } from '../services/OllamaService';
import { vectorStore } from '../services/VectorStore';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { model, messages, useContext } = req.body;
    const lastMessage = messages[messages.length - 1].content;

    let context = '';
    if (useContext) {
      const chunks = await vectorStore.search(lastMessage);
      context = chunks.map(c => c.content).join('\n\n');
      
      if (context) {
        const systemPrompt = `You are a helpful assistant. Use the following context to answer the user's question:\n\n${context}`;
        // Insert system prompt at the beginning or as a system message
        messages.unshift({ role: 'system', content: systemPrompt });
      }
    }

    const response = await ollamaService.chat(model, messages, true) as AsyncGenerator<any, any, any>;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const part of response) {
      res.write(`data: ${JSON.stringify(part)}\n\n`);
    }
    res.end();
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: 'Chat failed' });
  }
});

export default router;
