import sqlite3 from 'sqlite3';
import type { Migration } from '../services/MigrationRunner';
import { runSQL, getAll } from '../services/MigrationRunner';

export const migrations: Migration[] = [
  {
    id: 1,
    name: 'create_models_table',
    up: async (db: sqlite3.Database) => {
      await runSQL(db, `
        CREATE TABLE IF NOT EXISTS Models (
          ID INTEGER PRIMARY KEY AUTOINCREMENT,
          model_name TEXT,
          model_create_date INTEGER,
          model_original_name TEXT UNIQUE
        )
      `);
    }
  },
  {
    id: 2,
    name: 'create_chats_table',
    up: async (db: sqlite3.Database) => {
      await runSQL(db, `
        CREATE TABLE IF NOT EXISTS Chats (
          ID INTEGER PRIMARY KEY AUTOINCREMENT,
          chat_start_datetime INTEGER,
          models_used TEXT,
          save_datetime INTEGER,
          filename TEXT
        )
      `);
    }
  },
  {
    id: 3,
    name: 'migrate_chats_to_model_ids',
    up: async (db: sqlite3.Database) => {
      // Check if Chats table has any data with model names (not IDs)
      const chats = await getAll(db, 'SELECT ID, models_used FROM Chats');
      
      for (const chat of chats) {
        if (!chat.models_used) continue;
        
        // Check if models_used contains names (has colons) or IDs (only numbers and commas)
        if (chat.models_used.includes(':')) {
          // Contains model names, need to convert
          const modelNames = chat.models_used.split(', ');
          const modelIds: number[] = [];
          
          for (const modelName of modelNames) {
            const result = await getAll(
              db,
              'SELECT ID FROM Models WHERE model_original_name = ?',
              [modelName.trim()]
            );
            
            if (result.length > 0) {
              modelIds.push(result[0].ID);
            }
          }
          
          if (modelIds.length > 0) {
            await runSQL(
              db,
              'UPDATE Chats SET models_used = ? WHERE ID = ?',
              [modelIds.join(', '), chat.ID]
            );
          }
        }
      }
    }
  },
  {
    id: 4,
    name: 'create_documents_table',
    up: async (db: sqlite3.Database) => {
      await runSQL(db, `
        CREATE TABLE IF NOT EXISTS Documents (
          ID INTEGER PRIMARY KEY AUTOINCREMENT,
          filename TEXT,
          original_name TEXT,
          path TEXT,
          mime_type TEXT,
          upload_date INTEGER
        )
      `);
    }
  },
  {
    id: 5,
    name: 'create_prompts_table',
    up: async (db: sqlite3.Database) => {
      await runSQL(db, `
        CREATE TABLE IF NOT EXISTS Prompts (
          ID INTEGER PRIMARY KEY AUTOINCREMENT,
          prompt TEXT NOT NULL,
          tags TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER
        )
      `);
    }
  },
  {
    id: 6,
    name: 'create_prompt_models_table',
    up: async (db: sqlite3.Database) => {
      await runSQL(db, `
        CREATE TABLE IF NOT EXISTS PromptModels (
          ID INTEGER PRIMARY KEY AUTOINCREMENT,
          prompt_id INTEGER NOT NULL,
          model_id INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (prompt_id) REFERENCES Prompts(ID) ON DELETE CASCADE,
          FOREIGN KEY (model_id) REFERENCES Models(ID) ON DELETE CASCADE,
          UNIQUE(prompt_id, model_id)
        )
      `);
    }
  },
  {
    id: 7,
    name: 'add_quality_and_comment_to_prompts',
    up: async (db: sqlite3.Database) => {
      await runSQL(db, `
        ALTER TABLE Prompts ADD COLUMN quality_rating INTEGER;
      `);
      await runSQL(db, `
        ALTER TABLE Prompts ADD COLUMN comment TEXT;
      `);
    }
  }
];
