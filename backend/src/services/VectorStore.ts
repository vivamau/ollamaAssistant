import { ollamaService } from './OllamaService';

interface DocumentChunk {
  id: string;
  content: string;
  embedding: number[];
  metadata: any;
}

export class VectorStore {
  private chunks: DocumentChunk[] = [];
  private embeddingModel: string = 'nomic-embed-text'; // Default embedding model

  constructor() {}

  private async ensureEmbeddingModel() {
    const models = await ollamaService.listModels();
    const hasModel = models.models.some(m => m.name.includes(this.embeddingModel));
    if (!hasModel) {
      console.log(`Embedding model '${this.embeddingModel}' not found. Pulling it...`);
      await ollamaService.pullModel(this.embeddingModel);
      console.log(`Embedding model '${this.embeddingModel}' pulled successfully.`);
    }
  }

  async addDocument(content: string, metadata: any) {
    await this.ensureEmbeddingModel();

    // Chunk the content with a max size to avoid context length errors
    const maxChunkSize = 1000; // characters per chunk
    const chunks = this.chunkText(content, maxChunkSize);
    
    for (const chunk of chunks) {
      if (chunk.trim().length < 10) continue;

      try {
        const embeddingResponse = await ollamaService.generateEmbeddings(this.embeddingModel, chunk);
        
        this.chunks.push({
          id: Math.random().toString(36).substring(7),
          content: chunk,
          embedding: embeddingResponse.embedding,
          metadata
        });
      } catch (error) {
        console.error('Error generating embedding for chunk:', error);
        // Continue with other chunks instead of failing completely
      }
    }
  }

  private chunkText(text: string, maxSize: number): string[] {
    const chunks: string[] = [];
    
    // First try to split by paragraphs
    const paragraphs = text.split(/\n\s*\n/);
    
    for (const paragraph of paragraphs) {
      if (paragraph.length <= maxSize) {
        chunks.push(paragraph);
      } else {
        // If paragraph is too long, split by sentences or fixed size
        const sentences = paragraph.split(/[.!?]\s+/);
        let currentChunk = '';
        
        for (const sentence of sentences) {
          if ((currentChunk + sentence).length <= maxSize) {
            currentChunk += (currentChunk ? '. ' : '') + sentence;
          } else {
            if (currentChunk) chunks.push(currentChunk);
            
            // If single sentence is too long, split by fixed size
            if (sentence.length > maxSize) {
              for (let i = 0; i < sentence.length; i += maxSize) {
                chunks.push(sentence.substring(i, i + maxSize));
              }
              currentChunk = '';
            } else {
              currentChunk = sentence;
            }
          }
        }
        
        if (currentChunk) chunks.push(currentChunk);
      }
    }
    
    return chunks.filter(c => c.trim().length > 0);
  }

  async search(query: string, k: number = 3): Promise<DocumentChunk[]> {
    await this.ensureEmbeddingModel();

    try {
      const queryEmbeddingResponse = await ollamaService.generateEmbeddings(this.embeddingModel, query);
      const queryEmbedding = queryEmbeddingResponse.embedding;

      // Calculate cosine similarity
      const similarities = this.chunks.map(chunk => ({
        chunk,
        score: this.cosineSimilarity(queryEmbedding, chunk.embedding)
      }));

      // Sort by score descending
      similarities.sort((a, b) => b.score - a.score);

      return similarities.slice(0, k).map(s => s.chunk);
    } catch (error) {
      console.error('Error in vector search:', error);
      throw error;
    }
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
}

export const vectorStore = new VectorStore();
