# Ollama Assistant

A full-stack application to train (customize) Ollama models with your own documents. Upload PDFs, text files, or Word documents, and create specialized model variants to chat with.

## 🚀 Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Ollama](https://ollama.com/) installed and running locally

## ⚙️ Configuration

### Environment Variables
The backend supports the following optional environment variables. Create a `.env` file in the `backend` directory if you need to customize these settings:

```bash
# Server Configuration
PORT=3000                    # Backend server port (default: 3000)

# Redis Configuration (Optional - for caching)
REDIS_HOST=localhost         # Redis server host
REDIS_PORT=6379             # Redis server port
REDIS_PASSWORD=             # Redis password (if required)
REDIS_DB=0                  # Redis database number
REDIS_CONNECT_TIMEOUT=10000 # Connection timeout in ms
REDIS_COMMAND_TIMEOUT=5000  # Command timeout in ms
```

**Note**: Redis is optional. The application will work without it, but enabling Redis provides caching for improved performance.

### Database
The application uses **SQLite** for data storage. The database file is automatically created at:
```
backend/data/ollamaAssistant.db
```

**Database Tables**:
- `Models` - Stores information about Ollama models
- `Chats` - Stores chat history and sessions
- `Documents` - Tracks uploaded documents (PDFs, TXT, DOCX)
- `Prompts` - Stores saved prompts with ratings and comments
- `PromptModels` - Links prompts to specific models

**Migrations**: Database migrations run automatically when the backend starts. No manual setup required!

## 🛠️ Installation & Setup

### 1. Start Ollama
Make sure Ollama is running in the background:
```bash
ollama serve
```

### 2. Backend Setup
The backend handles document processing and communicates with Ollama.

```bash
cd backend
npm install
npm run dev
```
*Server runs on http://localhost:3000*

### 3. Frontend Setup
The frontend provides the user interface.

```bash
cd frontend
npm install
npm run dev
```
*App opens at http://localhost:5173*

## 📖 How to Use

1. **Upload Documents**: Go to the "Documents" tab and drag & drop your PDF, TXT, or DOCX files.
2. **Add Websites**: Enter a website URL in the "Add Website" section to scrape and add web content.
3. **Create Model**: 
   - Go to "Create Model".
   - Enter a name (e.g., `my-custom-model`).
   - Select a base model (e.g., `gemma:2b`).
   - Click "Create". This generates a custom Modelfile with your documents' and websites' content as system context.
4. **Chat**: 
   - Go to "Chat".
   - Select your new model.
   - Enable "Use Document Context" for RAG-like capabilities.
   - Start chatting!

## 🏗️ Architecture

- **Backend**: Node.js, Express, Multer (uploads), PDF-Parse/Mammoth (text extraction)
- **Frontend**: React, Vite, CSS Modules (modern dark theme)
- **AI Engine**: Ollama (local LLM inference)
