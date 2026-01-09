const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let backendProcess;

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // For simple ipc in this example, consider securing for prod
      webSecurity: true, // Enable web security
    },
  });

  if (isDev) {
    // In dev, usually the backend and frontend are started separately via 'npm run dev'
    // But we can also orchestrate them here if we wanted. 
    // For the root 'npm run dev' script, we rely on concurrently to start them.
    // So we just load the dev server url.
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, we need to spawn the backend and load the static frontend
    startBackend();
    
    // Load the index.html of the app.
    if (mainWindow) {
      mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
    }
  }

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object
    mainWindow = null;
  });
}

function startBackend() {
  // In production (packaged app), backend is in extraResources
  // In dev, it's relative to electron/main.js
  let backendPath;
  let nodePath;
  
  if (isDev) {
    backendPath = path.join(__dirname, '../backend');
    nodePath = 'node'; // Use system node in development
  } else {
    // extraResources are in Contents/Resources/ on Mac
    // process.resourcesPath points to Contents/Resources
    backendPath = path.join(process.resourcesPath, 'backend');
    // Use bundled node binary in production
    nodePath = path.join(process.resourcesPath, 'bundled-node', 'node');
  }

  const serverPath = path.join(backendPath, 'dist/server.js');
  
  // Check if bundled node exists (production only)
  if (!isDev && !fs.existsSync(nodePath)) {
    console.error('Bundled Node.js not found!', nodePath);
    dialog.showErrorBox('Node.js Error', 
      `Bundled Node.js binary not found at: ${nodePath}\n\n` +
      `This app requires the bundled Node.js to run.\n` +
      `Please reinstall the application.`
    );
    return;
  }
  
  if (!fs.existsSync(serverPath)) {
    console.error('Backend build not found!', serverPath);
    dialog.showErrorBox('Backend Error', `Backend file not found at: ${serverPath}\nResources: ${process.resourcesPath}`);
    return;
  }

  console.log('Starting backend process...');
  console.log('  Node path:', nodePath);
  console.log('  Server path:', serverPath);
  console.log('  Backend path:', backendPath);
  
  const env = { 
    ...process.env, 
    PORT: 3001, // Use different port for production to avoid conflicts with dev server
    APP_DATA_PATH: app.getPath('userData'),
    NODE_PATH: path.join(backendPath, 'node_modules')
  };

  let backendOutput = '';

  backendProcess = spawn(nodePath, [serverPath], {
    cwd: backendPath,
    stdio: ['ignore', 'pipe', 'pipe'], // Capture stdout and stderr
    env: env
  });


  // Capture stdout
  backendProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('[Backend]', output);
    backendOutput += output;
  });

  // Capture stderr
  backendProcess.stderr.on('data', (data) => {
    const output = data.toString();
    console.error('[Backend Error]', output);
    backendOutput += output;
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend:', err);
    dialog.showErrorBox('Backend Start Failed', 
      `Error: ${err.message}\n` +
      `Code: ${err.code}\n` +
      `Node path: ${nodePath}\n\n` +
      `Please try reinstalling the application.`
    );
  });
  
  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
    if (code !== 0 && code !== null) {
       console.error('Backend crashed');
       dialog.showErrorBox('Backend Crashed', 
         `Exit code: ${code}\n\nOutput:\n${backendOutput.slice(-2000)}`
       );
    }
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // Kill backend process if it exists
  if (backendProcess) {
    backendProcess.kill();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
   if (backendProcess) {
    backendProcess.kill();
   }
});
