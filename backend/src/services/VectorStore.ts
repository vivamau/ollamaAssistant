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

  async addDocument(content: string, metadata: any) {
    // Simple chunking strategy (split by paragraphs or fixed size)
    // For now, let's split by paragraphs
    const paragraphs = content.split(/\n\s*\n/);
    
    for (const paragraph of paragraphs) {
      if (paragraph.trim().length < 10) continue;

      const embeddingResponse = await ollamaService.generateEmbeddings(this.embeddingModel, paragraph);
      
      this.chunks.push({
        id: Math.random().toString(36).substring(7),
        content: paragraph,
        embedding: embeddingResponse.embedding,
        metadata
      });
    }
  }

  async search(query: string, k: number = 3): Promise<DocumentChunk[]> {
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
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
}

export const vectorStore = new VectorStore();
