# Ollama Assistant

A full-stack application to train (customize) Ollama models with your own documents. Upload PDFs, text files, or Word documents, and create specialized model variants to chat with.

## 📥 Installing from DMG (End Users)

If you received a `.dmg` file, follow these steps to install and run the app:

### 1. Install Ollama
Download and install [Ollama](https://ollama.com/) if you haven't already.

### 2. Install the App
1. Open the `.dmg` file
2. Drag **Ollama Assistant** to your **Applications** folder
3. **Important**: Since the app is not signed with an Apple Developer certificate, you need to remove the quarantine flag. Open **Terminal** and run:
   ```bash
   xattr -cr /Applications/ollama-assistant-desktop.app
   ```

### 3. Run the App
1. Make sure Ollama is running (open the Ollama app or run `ollama serve` in Terminal)
2. Open **Ollama Assistant** from your Applications folder
3. Enjoy! 🎉

---

## 🚀 Prerequisites (For Developers)

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Ollama](https://ollama.com/) installed and running locally

## ⚙️ Configuration

### Environment Variables
The backend supports the following optional environment variables. Create a `.env` file in the `backend` directory if you need to customize these settings:

```bash
# Server Configuration
PORT=3000                    # Backend server port (default: 3000)

### Database
The application uses **SQLite** for data storage. 

**⚠️ Important**: Before running the application for the first time, you need to set up the database:
```bash
cd backend/data
cp ollamaAssistant-sample.db ollamaAssistant.db
```
Or on Windows:
```bash
cd backend/data
copy ollamaAssistant-sample.db ollamaAssistant.db
```

The database file will be located at:
```
backend/data/ollamaAssistant.db
```

**Database Tables**:
- `Models` - Stores information about Ollama models
- `Chats` - Stores chat history and sessions
- `Documents` - Tracks uploaded documents (PDFs, TXT, DOCX)
- `Prompts` - Stores saved prompts with ratings and comments
- `PromptModels` - Links prompts to specific models

**Chat Storage**: Chat conversations are saved as individual files in the `backend/chats/` folder for easy backup and portability.

**Migrations**: Database migrations run automatically when the backend starts. No manual setup required!

## 🛠️ Installation & Setup

### Option 1: Web Application (Browser)

#### 1. Setup Database
Before starting the application, rename the sample database file:
```bash
cd backend/data
cp ollamaAssistant-sample.db ollamaAssistant.db
```

#### 2. Start Ollama
Make sure Ollama is running in the background:
```bash
ollama serve
```

#### 3. Backend Setup
The backend handles document processing and communicates with Ollama.

```bash
cd backend
npm install
npm run dev
```
*Server runs on http://localhost:3000*

#### 4. Frontend Setup
The frontend provides the user interface.

```bash
cd frontend
npm install
npm run dev
```
*App opens at http://localhost:5173*

### Option 2: Desktop Application (Electron)

#### 1. Install Dependencies
From the root directory, install all dependencies (backend, frontend, and Electron):
```bash
npm install
```
This will automatically install dependencies for backend and frontend as well.

#### 2. Setup Database
```bash
cd backend/data
cp ollamaAssistant-sample.db ollamaAssistant.db
cd ../..
```

#### 3. Start Ollama
Make sure Ollama is running:
```bash
ollama serve
```

#### 4. Run in Development Mode
Start the Electron app with hot-reload:
```bash
npm run dev
```
This will:
- Start the backend server on port 3000
- Start the frontend dev server on port 5173
- Launch the Electron desktop app

#### 5. Build Distribution Package
To create a distributable desktop application:

**Step 1: Build the frontend and backend**
```bash
npm run build
```
This compiles both the frontend and backend for production.

**Step 2: Create the distribution package**

Choose the appropriate command based on the target Mac architecture:

| Target Mac | Command | Description |
|------------|---------|-------------|
| **Apple Silicon** (M1/M2/M3/M4) | `npm run dist:arm64` | Creates DMG for arm64 architecture |
| **Intel** | `npm run dist:x64` | Creates DMG for x64 architecture |
| **Current machine** | `npm run dist` | Creates DMG for your current architecture |

```bash
# For Apple Silicon Macs (M1/M2/M3/M4)
npm run dist:arm64

# For Intel Macs
npm run dist:x64

# For your current architecture
npm run dist
```

The packaged application will be created in the `dist/` folder:
- **macOS**: `.dmg` installer and `.app` bundle
- **Windows**: `.exe` installer (if building on Windows)
- **Linux**: `.AppImage` or `.deb` (if building on Linux)

**⚠️ Important Notes for macOS Distribution:**

1. **Unsigned App Warning**: Since the app is not signed with an Apple Developer certificate, recipients will need to remove the quarantine flag before opening:
   ```bash
   xattr -cr /Applications/ollama-assistant-desktop.app
   ```

2. **Native Dependencies**: The `sqlite3` module is compiled for the architecture you build on. If you need to distribute to both Intel and Apple Silicon Macs, you must build separately for each architecture (ideally using CI/CD).

**Note**: By default, `electron-builder` creates packages for the current platform. To build for other platforms, see the [electron-builder documentation](https://www.electron.build/multi-platform-build).

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

- **Backend**: Node.js, Express, Multer (uploads), PDF-Parse/Mammoth (text extraction), SQLite (database)
- **Frontend**: React 19, TypeScript, Vite, CSS Modules (modern dark theme)
- **Desktop**: Electron (cross-platform desktop app)
- **AI Engine**: Ollama (local LLM inference)

## 🎨 Features

- **Custom Drag Region**: The desktop app features a custom draggable title bar area for a modern, frameless window experience
- **macOS Integration**: Native traffic light buttons (close, minimize, maximize) with custom positioning
- **Dark Theme**: Beautiful dark mode interface with glassmorphism effects
- **Context Management**: Toggle document context on/off for each chat
- **Chat History**: Save and load previous conversations
- **Prompt Library**: Save and rate prompts for future use
- **Model Switching**: Easily switch between different Ollama models mid-conversation
