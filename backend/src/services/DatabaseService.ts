import sqlite3 from 'sqlite3';
import path from 'path';
import { ollamaService } from './OllamaService';

export class DatabaseService {
  private db: sqlite3.Database;

  constructor() {
    const dbPath = path.join(__dirname, '../../data/ollamaAssistant.db');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error connecting to database:', err);
      } else {
        console.log('Connected to SQLite database');
      }
    });
  }

  async syncModels(): Promise<void> {
    try {
      console.log('Starting model sync...');
      
      // Fetch models from Ollama
      const response = await ollamaService.listModels();
      const models = response.models || [];

      console.log(`Found ${models.length} models from Ollama`);

      for (const model of models) {
        await this.insertModelIfNotExists(model);
      }

      console.log('Model sync completed successfully');
    } catch (error) {
      console.error('Error syncing models:', error);
      throw error;
    }
  }

  private async insertModelIfNotExists(model: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const originalName = model.name;
      
      // Extract short name (remove tag if present, e.g., "gemma:2b" -> "gemma")
      const shortName = originalName.split(':')[0];
      
      // Convert modified_at to timestamp (Unix timestamp in seconds)
      const createDate = model.modified_at 
        ? Math.floor(new Date(model.modified_at).getTime() / 1000)
        : Math.floor(Date.now() / 1000);

      // Check if model already exists
      this.db.get(
        'SELECT ID FROM Models WHERE model_original_name = ?',
        [originalName],
        (err, row) => {
          if (err) {
            console.error('Error checking model existence:', err);
            reject(err);
            return;
          }

          if (row) {
            console.log(`Model "${originalName}" already exists, skipping`);
            resolve();
          } else {
            // Insert new model
            this.db.run(
              'INSERT INTO Models (model_name, model_create_date, model_original_name) VALUES (?, ?, ?)',
              [shortName, createDate, originalName],
              (err) => {
                if (err) {
                  console.error(`Error inserting model "${originalName}":`, err);
                  reject(err);
                } else {
                  console.log(`Inserted new model: "${originalName}"`);
                  resolve();
                }
              }
            );
          }
        }
      );
    });
  }

  async getModels(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM Models ORDER BY model_create_date DESC',
        (err, rows) => {
          if (err) {
            console.error('Error getting models:', err);
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  async saveChat(chatData: { startTime: number; modelsUsed: string[]; filename: string }): Promise<number> {
    return new Promise(async (resolve, reject) => {
      const { startTime, modelsUsed, filename } = chatData;
      
      try {
        // Resolve model names to IDs
        const modelIds: number[] = [];
        for (const modelName of modelsUsed) {
          const modelId = await this.getModelIdByName(modelName);
          if (modelId) {
            modelIds.push(modelId);
          } else {
            console.warn(`Model "${modelName}" not found in database, skipping`);
          }
        }

        const modelsString = modelIds.join(', ');
        const saveTime = Math.floor(Date.now() / 1000);

        this.db.run(
          'INSERT INTO Chats (chat_start_datetime, models_used, save_datetime, filename) VALUES (?, ?, ?, ?)',
          [startTime, modelsString, saveTime, filename],
          function(err) {
            if (err) {
              console.error('Error saving chat to database:', err);
              reject(err);
            } else {
              console.log(`Chat saved to database with ID: ${this.lastID}`);
              resolve(this.lastID);
            }
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  async getChats(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM Chats ORDER BY save_datetime DESC',
        async (err, rows: any[]) => {
          if (err) {
            console.error('Error getting chats:', err);
            reject(err);
            return;
          }

          // Resolve model IDs to names for each chat
          const chatsWithModels = await Promise.all(rows.map(async (chat) => {
            let modelNames: string[] = [];
            if (chat.models_used) {
              const modelIds = chat.models_used.split(',').map((id: string) => parseInt(id.trim()));
              for (const id of modelIds) {
                if (!isNaN(id)) {
                  const name = await this.getModelNameById(id);
                  if (name) modelNames.push(name);
                }
              }
            }
            return {
              ...chat,
              modelNames
            };
          }));

          resolve(chatsWithModels);
        }
      );
    });
  }

  async getChat(id: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM Chats WHERE ID = ?',
        [id],
        (err, row) => {
          if (err) {
            console.error('Error getting chat:', err);
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  async deleteChat(id: number): Promise<string | null> {
    return new Promise((resolve, reject) => {
      // First get the filename
      this.db.get(
        'SELECT filename FROM Chats WHERE ID = ?',
        [id],
        (err, row: any) => {
          if (err) {
            console.error('Error getting chat for deletion:', err);
            reject(err);
            return;
          }

          if (!row) {
            resolve(null);
            return;
          }

          const filename = row.filename;

          // Delete from database
          this.db.run(
            'DELETE FROM Chats WHERE ID = ?',
            [id],
            (err) => {
              if (err) {
                console.error('Error deleting chat from database:', err);
                reject(err);
              } else {
                console.log(`Chat ${id} deleted from database`);
                resolve(filename);
              }
            }
          );
        }
      );
    });
  }

  private async getModelNameById(id: number): Promise<string | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT model_original_name FROM Models WHERE ID = ?',
        [id],
        (err, row: any) => {
          if (err) {
            // Don't reject, just return null so we can continue
            resolve(null);
          } else {
            resolve(row ? row.model_original_name : null);
          }
        }
      );
    });
  }

  private async getModelIdByName(modelName: string): Promise<number | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT ID FROM Models WHERE model_original_name = ?',
        [modelName],
        (err, row: any) => {
          if (err) {
            console.error('Error getting model ID:', err);
            reject(err);
          } else {
            resolve(row ? row.ID : null);
          }
        }
      );
    });
  }

  async trackModelUsage(modelName: string, promptTokens: number = 0, completionTokens: number = 0): Promise<void> {
    return new Promise((resolve, reject) => {
      const now = Math.floor(Date.now() / 1000);
      this.db.run(
        `UPDATE Models 
         SET usage_count = COALESCE(usage_count, 0) + 1,
             total_prompt_tokens = COALESCE(total_prompt_tokens, 0) + ?,
             total_completion_tokens = COALESCE(total_completion_tokens, 0) + ?,
             last_used_at = ?
         WHERE model_original_name = ?`,
        [promptTokens, completionTokens, now, modelName],
        (err) => {
          if (err) {
            console.error('Error tracking model usage:', err);
            reject(err);
          } else {
            console.log(`Tracked usage for model: ${modelName} (prompt: ${promptTokens}, completion: ${completionTokens})`);
            resolve();
          }
        }
      );
    });
  }

  async addDocument(doc: { filename: string; originalName: string; path: string; mimeType: string }): Promise<number> {
    return new Promise((resolve, reject) => {
      const { filename, originalName, path, mimeType } = doc;
      const uploadDate = Math.floor(Date.now() / 1000);

      this.db.run(
        'INSERT INTO Documents (filename, original_name, path, mime_type, upload_date) VALUES (?, ?, ?, ?, ?)',
        [filename, originalName, path, mimeType, uploadDate],
        function(err) {
          if (err) {
            console.error('Error adding document to database:', err);
            reject(err);
          } else {
            console.log(`Document added to database with ID: ${this.lastID}`);
            resolve(this.lastID);
          }
        }
      );
    });
  }

  async getDocuments(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM Documents ORDER BY upload_date DESC',
        (err, rows) => {
          if (err) {
            console.error('Error getting documents:', err);
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  async getDocument(id: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM Documents WHERE ID = ?',
        [id],
        (err, row) => {
          if (err) {
            console.error('Error getting document:', err);
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  async deleteDocument(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM Documents WHERE ID = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Websites methods
  async addWebsite(website: { url: string; title?: string; content: string }): Promise<number> {
    return new Promise((resolve, reject) => {
      const now = Math.floor(Date.now() / 1000);
      this.db.run(
        'INSERT INTO Websites (url, title, content, scraped_at, last_updated) VALUES (?, ?, ?, ?, ?)',
        [website.url, website.title || null, website.content, now, now],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async getWebsites(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM Websites ORDER BY scraped_at DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getWebsite(id: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM Websites WHERE ID = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async deleteModel(name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM Models WHERE model_original_name = ?', [name], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async updateWebsite(id: number, content: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const now = Math.floor(Date.now() / 1000);
      this.db.run(
        'UPDATE Websites SET content = ?, last_updated = ? WHERE ID = ?',
        [content, now, id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async deleteWebsite(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM Websites WHERE ID = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  close(): void {
    this.db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
    });
  }

  // Prompts methods
  async createPrompt(prompt: string, tags: string, modelIds: number[] = [], quality_rating: number | null = null, comment: string | null = null): Promise<number> {
    return new Promise((resolve, reject) => {
      const createdAt = Math.floor(Date.now() / 1000);

      this.db.run(
        'INSERT INTO Prompts (prompt, tags, created_at, quality_rating, comment) VALUES (?, ?, ?, ?, ?)',
        [prompt, tags, createdAt, quality_rating, comment],
        async function(err) {
          if (err) {
            console.error('Error creating prompt:', err);
            reject(err);
          } else {
            const promptId = this.lastID;
            console.log(`Prompt created with ID: ${promptId}`);
            
            // Add model associations if provided
            if (modelIds.length > 0) {
              try {
                await databaseService.addPromptModels(promptId, modelIds);
              } catch (modelErr) {
                console.error('Error adding prompt models:', modelErr);
              }
            }
            
            resolve(promptId);
          }
        }
      );
    });
  }

  async getPrompts(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT p.*, 
                GROUP_CONCAT(m.model_original_name) as model_names,
                GROUP_CONCAT(pm.model_id) as model_ids
         FROM Prompts p
         LEFT JOIN PromptModels pm ON p.ID = pm.prompt_id
         LEFT JOIN Models m ON pm.model_id = m.ID
         GROUP BY p.ID
         ORDER BY p.created_at DESC`,
        (err, rows: any[]) => {
          if (err) {
            console.error('Error getting prompts:', err);
            reject(err);
          } else {
            // Parse model_ids and model_names into arrays
            const prompts = rows.map(row => ({
              ...row,
              model_ids: row.model_ids ? row.model_ids.split(',').map(Number) : [],
              model_names: row.model_names ? row.model_names.split(',') : []
            }));
            resolve(prompts);
          }
        }
      );
    });
  }

  async getPrompt(id: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT p.*,
                GROUP_CONCAT(m.model_original_name) as model_names,
                GROUP_CONCAT(pm.model_id) as model_ids
         FROM Prompts p
         LEFT JOIN PromptModels pm ON p.ID = pm.prompt_id
         LEFT JOIN Models m ON pm.model_id = m.ID
         WHERE p.ID = ?
         GROUP BY p.ID`,
        [id],
        (err, row: any) => {
          if (err) {
            console.error('Error getting prompt:', err);
            reject(err);
          } else {
            if (row) {
              row.model_ids = row.model_ids ? row.model_ids.split(',').map(Number) : [];
              row.model_names = row.model_names ? row.model_names.split(',') : [];
            }
            resolve(row);
          }
        }
      );
    });
  }

  async updatePrompt(id: number, prompt: string, tags: string, modelIds: number[] = [], quality_rating: number | null = null, comment: string | null = null): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const updatedAt = Math.floor(Date.now() / 1000);

      this.db.run(
        'UPDATE Prompts SET prompt = ?, tags = ?, updated_at = ?, quality_rating = ?, comment = ? WHERE ID = ?',
        [prompt, tags, updatedAt, quality_rating, comment, id],
        async (err) => {
          if (err) {
            console.error('Error updating prompt:', err);
            reject(err);
          } else {
            console.log(`Prompt ${id} updated`);
            
            // Update model associations
            try {
              await this.removePromptModels(id);
              if (modelIds.length > 0) {
                await this.addPromptModels(id, modelIds);
              }
            } catch (modelErr) {
              console.error('Error updating prompt models:', modelErr);
            }
            
            resolve();
          }
        }
      );
    });
  }

  async deletePrompt(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM Prompts WHERE ID = ?',
        [id],
        (err) => {
          if (err) {
            console.error('Error deleting prompt:', err);
            reject(err);
          } else {
            console.log(`Prompt ${id} deleted`);
            resolve();
          }
        }
      );
    });
  }

  async addPromptModels(promptId: number, modelIds: number[]): Promise<void> {
    const createdAt = Math.floor(Date.now() / 1000);
    const placeholders = modelIds.map(() => '(?, ?, ?)').join(', ');
    const values: any[] = [];
    
    modelIds.forEach(modelId => {
      values.push(promptId, modelId, createdAt);
    });

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO PromptModels (prompt_id, model_id, created_at) VALUES ${placeholders}`,
        values,
        (err) => {
          if (err) {
            console.error('Error adding prompt models:', err);
            reject(err);
          } else {
            console.log(`Added ${modelIds.length} models to prompt ${promptId}`);
            resolve();
          }
        }
      );
    });
  }

  async removePromptModels(promptId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM PromptModels WHERE prompt_id = ?',
        [promptId],
        (err) => {
          if (err) {
            console.error('Error removing prompt models:', err);
            reject(err);
          } else {
            console.log(`Removed models from prompt ${promptId}`);
            resolve();
          }
        }
      );
    });
  }
}

export const databaseService = new DatabaseService();
