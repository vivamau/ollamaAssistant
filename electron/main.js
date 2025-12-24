const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

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
    titleBarStyle: 'hidden', // Shows traffic lights but hides title bar
    trafficLightPosition: { x: 10, y: 10 }, // Position of traffic light buttons
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // For simple ipc in this example, consider securing for prod
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
  
  if (isDev) {
    backendPath = path.join(__dirname, '../backend');
  } else {
    // extraResources are in Contents/Resources/ on Mac
    // process.resourcesPath points to Contents/Resources
    backendPath = path.join(process.resourcesPath, 'backend');
  }

  const serverPath = path.join(backendPath, 'dist/server.js');
  
  if (!fs.existsSync(serverPath)) {
    console.error('Backend build not found!', serverPath);
    dialog.showErrorBox('Backend Error', `Backend file not found at: ${serverPath}\nResources: ${process.resourcesPath}`);
    return;
  }

  console.log('Starting backend process from:', serverPath);
  
  // Fix PATH for macOS GUI apps
  // Add common user-level paths
  const homeDir = os.homedir();
  
  // Construct potential NVM paths (checking specific versions is hard, but we can try generic approaches or just assume user might have symlinks)
  // Actually, simplest is to check common bin folders
  const commonPaths = [
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
    path.join(homeDir, '.nvm/versions/node'), // we'd need to find versions, skip for now.
    // better: path.join(homeDir, '.webi/bin') etc. 
    // Just add generic /Users/user/bin
    path.join(homeDir, 'bin')
  ];

  // If we can't find node in PATH, we can try to "guess" or ask the user to symlink it.
  // BUT: The user who is building this has 'node' in their terminal. 
  // Let's rely on 'fix-path' module logic manually.
  
  // Check if we can execute 'node -v' with current fixPath. 
  // If not, we fall back to absolute path if we can find it? No.
  
  const fixPathString = process.platform === 'darwin' ? commonPaths.join(':') : process.env.PATH;

  const env = { 
    ...process.env, 
    PORT: 3000,
    PATH: fixPathString + (process.platform === 'win32' ? ';' : ':') + (process.env.PATH || ''),
    APP_DATA_PATH: app.getPath('userData'),
    NODE_PATH: path.join(backendPath, 'node_modules')
  };
  
  // DEBUG: Print PATH to finding issues
  console.log('Spawning backend with PATH:', env.PATH);
  console.log('Backend path:', backendPath);
  console.log('Server path:', serverPath);

  let backendOutput = '';

  backendProcess = spawn('node', [serverPath], {
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
    // Show exact PATH used in error box to help debug
    dialog.showErrorBox('Backend Start Failed', 
      `Error: ${err.message}\n` +
      `Code: ${err.code}\n` +
      `PATH used: ${env.PATH}\n` + 
      `Try running: 'sudo ln -s $(which node) /usr/local/bin/node'`
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
