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

  async createModel(name: string, modelfile: string) {
    return await this.ollama.create({ model: name, modelfile, stream: true });
  }

  async deleteModel(name: string) {
    return await this.ollama.delete({ model: name });
  }
}

export const ollamaService = new OllamaService();
