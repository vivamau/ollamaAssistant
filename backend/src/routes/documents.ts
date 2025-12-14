import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { documentProcessor } from '../services/DocumentProcessor';
import { vectorStore } from '../services/VectorStore';
import { databaseService } from '../services/DatabaseService';

const router = express.Router();

// Configure multer for permanent storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../data/documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Keep original extension but make filename unique
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

router.get('/', async (req, res) => {
  try {
    const documents = await databaseService.getDocuments();
    res.json(documents);
  } catch (error) {
    console.error('Error getting documents:', error);
    res.status(500).json({ error: 'Failed to get documents' });
  }
});

router.get('/:id/content', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const document = await databaseService.getDocument(id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Read and process the file content
    const content = await documentProcessor.processFile(document.path, document.mime_type);
    res.json({ content });
  } catch (error) {
    console.error('Error getting document content:', error);
    res.status(500).json({ error: 'Failed to get document content' });
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { path: filePath, mimetype, originalname, filename } = req.file;
    
    // Process document content
    try {
      const content = await documentProcessor.processFile(filePath, mimetype);
      
      // Add to vector store (keep existing functionality for search)
      await vectorStore.addDocument(content, { source: originalname, type: 'file' });

      // Save to database
      await databaseService.addDocument({
        filename: filename,
        originalName: originalname,
        path: filePath,
        mimeType: mimetype
      });

      res.json({ message: 'File processed successfully', filename: originalname });
    } catch (processError) {
      console.error('Error in processFile:', processError);
      throw processError;
    }
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ error: 'Failed to process file', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const document = await databaseService.getDocument(id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete file from filesystem
    if (document.path && fs.existsSync(document.path)) {
      try {
        fs.unlinkSync(document.path);
        console.log(`Deleted file: ${document.path}`);
      } catch (err) {
        console.error(`Error deleting file ${document.path}:`, err);
        // Continue to delete from DB
      }
    }

    await databaseService.deleteDocument(id);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
