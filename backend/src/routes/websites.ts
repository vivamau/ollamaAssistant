import express from 'express';
import { documentProcessor } from '../services/DocumentProcessor';
import { vectorStore } from '../services/VectorStore';

const router = express.Router();

router.post('/scrape', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const content = await documentProcessor.processUrl(url);
    
    // Add to vector store
    await vectorStore.addDocument(content, { source: url, type: 'website' });

    res.json({ message: 'Website scraped successfully', url });
  } catch (error) {
    console.error('Error scraping website:', error);
    res.status(500).json({ error: 'Failed to scrape website' });
  }
});

export default router;
