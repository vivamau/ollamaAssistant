import express from 'express';
import { databaseService } from '../services/DatabaseService';

const router = express.Router();

// Get all prompts
router.get('/', async (req, res) => {
  try {
    const prompts = await databaseService.getPrompts();
    res.json(prompts);
  } catch (error) {
    console.error('Error getting prompts:', error);
    res.status(500).json({ error: 'Failed to get prompts' });
  }
});

// Get single prompt
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const prompt = await databaseService.getPrompt(id);
    
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    
    res.json(prompt);
  } catch (error) {
    console.error('Error getting prompt:', error);
    res.status(500).json({ error: 'Failed to get prompt' });
  }
});

// Create new prompt
router.post('/', async (req, res) => {
  try {
    const { prompt, tags, modelIds, quality_rating, comment } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    const id = await databaseService.createPrompt(prompt, tags || '', modelIds || [], quality_rating || null, comment || null);
    res.json({ id, message: 'Prompt created successfully' });
  } catch (error) {
    console.error('Error creating prompt:', error);
    res.status(500).json({ error: 'Failed to create prompt' });
  }
});

// Update prompt
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { prompt, tags, modelIds, quality_rating, comment } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    await databaseService.updatePrompt(id, prompt, tags || '', modelIds || [], quality_rating || null, comment || null);
    res.json({ message: 'Prompt updated successfully' });
  } catch (error) {
    console.error('Error updating prompt:', error);
    res.status(500).json({ error: 'Failed to update prompt' });
  }
});

// Delete prompt
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await databaseService.deletePrompt(id);
    res.json({ message: 'Prompt deleted successfully' });
  } catch (error) {
    console.error('Error deleting prompt:', error);
    res.status(500).json({ error: 'Failed to delete prompt' });
  }
});

export default router;
