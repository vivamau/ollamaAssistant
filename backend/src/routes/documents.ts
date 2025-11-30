import express from 'express';
import multer from 'multer';
import { documentProcessor } from '../services/DocumentProcessor';
import { vectorStore } from '../services/VectorStore';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { path, mimetype, originalname } = req.file;
    
    // Process document
    const content = await documentProcessor.processFile(path, mimetype);
    
    // Add to vector store
    await vectorStore.addDocument(content, { source: originalname, type: 'file' });

    res.json({ message: 'File processed successfully', filename: originalname });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ error: 'Failed to process file' });
  }
});

export default router;
