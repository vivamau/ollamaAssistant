import express from 'express';
import { documentProcessor } from '../services/DocumentProcessor';
import { vectorStore } from '../services/VectorStore';
import { databaseService } from '../services/DatabaseService';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const websites = await databaseService.getWebsites();
    res.json({ websites });
  } catch (error) {
    console.error('Error fetching websites:', error);
    res.status(500).json({ error: 'Failed to fetch websites' });
  }
});

router.post('/scrape', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const content = await documentProcessor.processUrl(url);
    
    // Extract title from content (first line or first 100 chars)
    const title = content.split('\n')[0].substring(0, 100);
    
    // Save to database
    const websiteId = await databaseService.addWebsite({
      url,
      title,
      content
    });
    
    // Add to vector store
    await vectorStore.addDocument(content, { source: url, type: 'website', websiteId });

    res.json({ message: 'Website scraped successfully', url, id: websiteId });
  } catch (error) {
    console.error('Error scraping website:', error);
    res.status(500).json({ error: 'Failed to scrape website' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await databaseService.deleteWebsite(parseInt(id));
    res.json({ message: 'Website deleted successfully' });
  } catch (error) {
    console.error('Error deleting website:', error);
    res.status(500).json({ error: 'Failed to delete website' });
  }
});

export default router;
