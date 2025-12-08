import { Ollama } from 'ollama';

export class OllamaService {
  private ollama: Ollama;

  constructor() {
    this.ollama = new Ollama();
  }

  async listModels() {
    return await this.ollama.list();
  }

  async pullModel(model: string) {
    return await this.ollama.pull({ model, stream: true });
  }

  async chat(model: string, messages: { role: string; content: string }[], stream: boolean = true) {
    if (stream) {
      return await this.ollama.chat({ model, messages, stream: true });
    } else {
      return await this.ollama.chat({ model, messages, stream: false });
    }
  }

  async generateEmbeddings(model: string, prompt: string) {
    return await this.ollama.embeddings({ model, prompt });
  }

  async createModel(name: string, from: string, system?: string) {
    console.log('OllamaService.createModel (Direct Fetch) called with:', { name, from, systemLength: system?.length });
    
    // Use the environment variable or default to localhost
    // Note: in a real app better to store this base URL in a shared config
    const baseUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';
    
    try {
      const response = await fetch(`${baseUrl}/api/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: name,
          from: from,
          system: system,
          stream: true // Enable streaming
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ollama API create error:', response.status, errorText);
        throw new Error(`Ollama API error: ${response.status} ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body from Ollama API');
      }

      // Create an async generator to stream the response
      // This matches the interface expected by the route handler
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      async function* streamGenerator() {
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          
          // Keep the last chunk if it's incomplete
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                yield JSON.parse(line);
              } catch (e) {
                console.error('Error parsing JSON chunk:', e);
              }
            }
          }
        }
        
        // Process remaining buffer
        if (buffer.trim()) {
          try {
            yield JSON.parse(buffer);
          } catch (e) {
            console.error('Error parsing final chunk:', e);
          }
        }
      }

      return streamGenerator();

    } catch (error) {
      console.error('Direct fetch create error:', error);
      throw error;
    }
  }

  async deleteModel(name: string) {
    console.log('OllamaService.deleteModel (Direct Fetch) called for:', name);
    const baseUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';

    try {
      const response = await fetch(`${baseUrl}/api/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: name })
      });

      if (!response.ok) {
        // If model not found, consider it a success (idempotent delete)
        if (response.status === 404) {
          console.warn(`Model '${name}' not found in Ollama, proceeding as if deleted.`);
          return;
        }
        
        const errorText = await response.text();
        console.error('Ollama API delete error:', response.status, errorText);
        throw new Error(`Ollama API error: ${response.status} ${errorText}`);
      }
      
      console.log(`Model '${name}' deleted successfully from Ollama`);
    } catch (error) {
       console.error('Direct fetch delete error:', error);
       throw error;
    }
  }
}

export const ollamaService = new OllamaService();
