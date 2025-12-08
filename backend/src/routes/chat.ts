import express from 'express';
import fs from 'fs';
import path from 'path';
import { ollamaService } from '../services/OllamaService';
import { vectorStore } from '../services/VectorStore';
import { databaseService } from '../services/DatabaseService';

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

    let lastPart: any = null;
    for await (const part of response) {
      res.write(`data: ${JSON.stringify(part)}\n\n`);
      lastPart = part;
    }
    
    // Increment usage count and track tokens for the model
    try {
      const promptTokens = lastPart?.prompt_eval_count || 0;
      const completionTokens = lastPart?.eval_count || 0;
      await databaseService.trackModelUsage(model, promptTokens, completionTokens);
    } catch (error) {
      console.error('Error tracking model usage:', error);
      // Don't fail the request if usage tracking fails
    }
    
    res.end();
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: 'Chat failed' });
  }
});



router.post('/save', async (req, res) => {
  try {
    const { filename, content, startTime, modelsUsed } = req.body;
    if (!filename || !content) {
      return res.status(400).json({ error: 'Filename and content are required' });
    }

    const chatsDir = path.join(__dirname, '../../chats');
    if (!fs.existsSync(chatsDir)) {
      fs.mkdirSync(chatsDir, { recursive: true });
    }

    const filePath = path.join(chatsDir, filename);
    fs.writeFileSync(filePath, content);

    // Save to database if startTime and modelsUsed are provided
    let chatId = null;
    if (startTime && modelsUsed) {
      chatId = await databaseService.saveChat({
        startTime,
        modelsUsed,
        filename
      });
    }

    res.json({ success: true, path: filePath, chatId });
  } catch (error) {
    console.error('Error saving chat:', error);
    res.status(500).json({ error: 'Failed to save chat' });
  }
});

router.get('/', async (req, res) => {
  try {
    const chats = await databaseService.getChats();
    res.json(chats);
  } catch (error) {
    console.error('Error getting chats:', error);
    res.status(500).json({ error: 'Failed to get chats' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const filename = await databaseService.deleteChat(id);
    
    if (filename) {
      const filePath = path.join(__dirname, '../../chats', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

router.get('/:id/content', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const chat = await databaseService.getChat(id);
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const filePath = path.join(__dirname, '../../chats', chat.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Chat file not found' });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Parse markdown content to messages
    const messages = [];
    const lines = content.split('\n');
    let currentMessage: any = null;

    for (const line of lines) {
      // Check for message headers
      // Format: ### Role [Date Time] (Model: Name)
      const headerMatch = line.match(/^### (User|Assistant) \[(.*?)\](?: \(Model: (.*?)\))?$/);
      const systemMatch = line.match(/^\*\*System\*\* \[(.*?)\]$/);

      if (headerMatch) {
        if (currentMessage) messages.push(currentMessage);
        currentMessage = {
          role: headerMatch[1].toLowerCase(),
          timestamp: headerMatch[2], // Keep as string for now, frontend will parse
          model: headerMatch[3],
          content: ''
        };
      } else if (systemMatch) {
        if (currentMessage) messages.push(currentMessage);
        currentMessage = {
          role: 'system',
          timestamp: systemMatch[1],
          content: ''
        };
      } else if (currentMessage) {
        if (line.trim() === '---') continue; // Skip separator
        currentMessage.content += line + '\n';
      }
    }
    if (currentMessage) messages.push(currentMessage);

    // Clean up content (trim extra newlines)
    messages.forEach(m => {
      m.content = m.content.trim();
    });

    res.json({ messages });
  } catch (error) {
    console.error('Error getting chat content:', error);
    res.status(500).json({ error: 'Failed to get chat content' });
  }
});

export default router;
