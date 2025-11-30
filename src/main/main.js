const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const sharp = require('sharp');
const { randomUUID } = require('crypto');
const ImageEngine = require('./services/ImageEngine');
const PrintService = require('./services/PrintService');
const { computeTilePayload, suggestGridForImage } = require('../shared/documentMath');

const isDev = process.env.NODE_ENV === 'development' || !!process.env.VITE_DEV_SERVER_URL;
const preloadPath = path.join(__dirname, 'preload.js');
const resolveAssetPath = (assetName) => {
  if (isDev) {
    return path.join(__dirname, '..', '..', assetName);
  }
  return path.join(process.resourcesPath, assetName);
};

const iconPath = resolveAssetPath('icon.png');
const aboutImagePath = resolveAssetPath('about.jpg');
const supportLink = 'https://upupa.dev/';
let mainWindow;
let aboutWindow = null;
let tempRootDir = null;
const imageEngine = new ImageEngine();
const printService = new PrintService();
const jobContexts = new Map();
let isShuttingDown = false;

const DEFAULT_EXPORT_DIR_NAME = 'Poster Exports';

const sendToRenderer = (jobId, channel, payload) => {
  if (!jobId) return;
  const target = jobContexts.get(jobId)?.sender || mainWindow?.webContents;
  target?.send(channel, payload);
};

imageEngine.on('progress', (payload) => {
  if (!payload?.jobId) return;
  sendToRenderer(payload.jobId, 'tiler:progress', payload);
});

imageEngine.on('log', (payload) => {
  if (!payload?.message) return;
  console.debug(`[ImageEngine][${payload.jobId || 'unknown'}] ${payload.message}`);
});

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#111827',
    show: false,
    icon: iconPath,
    webPreferences: {
      preload: preloadPath,
      sandbox: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const devServerURL = process.env.VITE_DEV_SERVER_URL;
  if (isDev && devServerURL) {
    await mainWindow.loadURL(devServerURL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexHtml = path.join(__dirname, '..', '..', 'dist', 'renderer', 'index.html');
    await mainWindow.loadFile(indexHtml);
  }
}

app.whenReady().then(async () => {
  await resetTempRoot();
  await createWindow();
  buildAppMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  imageEngine.shutdown().catch((error) => {
    console.warn('Image engine failed to shut down cleanly', error);
  });
  printService.dispose?.();
});

const ensureBaseTempDir = async () => {
  if (tempRootDir) {
    return tempRootDir;
  }
  if (!app.isReady()) {
    throw new Error('App not ready for temp storage');
  }
  tempRootDir = path.join(app.getPath('temp'), 'wide-poster-maker');
  await fs.mkdir(tempRootDir, { recursive: true });
  return tempRootDir;
};

async function resetTempRoot() {
  if (!app.isReady()) {
    return;
  }
  const base = path.join(app.getPath('temp'), 'wide-poster-maker');
  await fs.rm(base, { recursive: true, force: true }).catch(() => undefined);
  await fs.mkdir(base, { recursive: true });
  tempRootDir = base;
}

const ensureJobTempDir = async (jobId) => {
  const root = await ensureBaseTempDir();
  const dir = path.join(root, jobId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

const cleanupJob = async (jobId) => {
  const context = jobContexts.get(jobId);
  if (context?.tempDir) {
    await fs.rm(context.tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
  jobContexts.delete(jobId);
};

const pathExists = async (targetPath) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch (_error) {
    return false;
  }
};

const moveResultsToDestination = async (files, destination, jobId) => {
  if (!Array.isArray(files) || files.length === 0) {
    return [];
  }
  await fs.mkdir(destination, { recursive: true });
  const outputs = [];
  for (const sourcePath of files) {
    const baseName = path.basename(sourcePath);
    let targetPath = path.join(destination, baseName);
    if (await pathExists(targetPath)) {
      const parsed = path.parse(baseName);
      targetPath = path.join(destination, `${parsed.name}-${jobId}${parsed.ext}`);
    }
    await fs.copyFile(sourcePath, targetPath);
    outputs.push(targetPath);
  }
  return outputs;
};

const runPrintJob = async (jobId, pdfPath) => {
  await printService.printPdf(pdfPath, (update) => {
    sendToRenderer(jobId, 'tiler:progress', { jobId, ...update });
  });
};

const createPreviewThumbnail = async (imagePath, jobId) => {
  try {
    const root = await ensureBaseTempDir();
    const previewDir = path.join(root, 'previews');
    await fs.mkdir(previewDir, { recursive: true });
    const previewPath = path.join(previewDir, `${jobId}.jpg`);
    await sharp(imagePath)
      .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(previewPath);
    return previewPath;
  } catch (error) {
    console.warn('Failed to build preview thumbnail', error);
    return '';
  }
};

const resolveDestination = (exportSettings = {}) => {
  const requested = exportSettings.destination?.trim();
  if (requested) {
    return requested;
  }
  return path.join(app.getPath('documents'), DEFAULT_EXPORT_DIR_NAME);
};

const formatAutoFitReason = (recommendation) => {
  if (!recommendation) {
    return '';
  }
  const size = recommendation.posterSizeMm || { width: 0, height: 0 };
  const detailPercent = Math.round((recommendation.resolutionScale || 0) * 100);
  const wastePercent = Math.round((recommendation.wasteRatio || 0) * 1000) / 10;
  const sizeLabel = `${Math.round(size.width)}×${Math.round(size.height)} mm`;
  const prefix = recommendation.requiresUpscale ? 'Auto-fit forced' : 'Auto-fit chose';
  const suffix = recommendation.requiresDownscale ? ' · warning: image exceeds printable area' : '';
  return `${prefix} ${recommendation.rows}×${recommendation.cols} (${sizeLabel}) · detail ${detailPercent}% · waste ${wastePercent}%${suffix}`;
};

const buildAutoFitRecommendation = (payload, imageMeta) => {
  if (!payload?.grid?.autoFit) {
    return { grid: null, info: null };
  }
  const suggestion = suggestGridForImage(
    { width: imageMeta.width || 0, height: imageMeta.height || 0 },
    payload.settings,
    { maxRows: 12, maxCols: 12, maxPages: 60 }
  );
  if (!suggestion) {
    return { grid: null, info: null };
  }
  return {
    grid: { rows: suggestion.rows, cols: suggestion.cols },
    info: { ...suggestion, reason: formatAutoFitReason(suggestion) }
  };
};

const getFocusedWindow = () => BrowserWindow.getFocusedWindow() || mainWindow;

const triggerOpenImageFromMenu = () => {
  const target = getFocusedWindow();
  target?.webContents?.send('menu:openImage');
};

const showAboutDialog = async () => {
  if (aboutWindow && !aboutWindow.isDestroyed()) {
    aboutWindow.focus();
    return;
  }

  const parent = getFocusedWindow();
  aboutWindow = new BrowserWindow({
    width: 500,
    height: 640,
    resizable: true,
    minimizable: false,
    maximizable: false,
    parent: parent || undefined,
    modal: Boolean(parent),
    show: false,
    title: 'About Wide Poster Maker',
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    useContentSize: true,
    icon: iconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  aboutWindow.on('closed', () => {
    aboutWindow = null;
  });

  let artworkMarkup = '';
  try {
    const buffer = await fs.readFile(aboutImagePath);
    const ext = path.extname(aboutImagePath).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
    const dataUri = `data:${mime};base64,${buffer.toString('base64')}`;
    artworkMarkup = `<img src="${dataUri}" alt="Wide Poster Maker inspiration" />`;
  } catch (error) {
    console.warn('Failed to load about artwork', error);
  }

  const html = `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>About Wide Poster Maker</title>
      <style>
        :root { color-scheme: dark; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; }
        body { margin: 0; background: #0f172a; color: #e2e8f0; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; overflow-y: auto; }
        .shell { min-height: 100vh; display: flex; flex-direction: column; justify-content: flex-start; align-items: center; gap: 18px; padding: 32px 28px 48px; text-align: center; }
        .artwork { width: 150px; border-radius: 18px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 18px 40px rgba(2, 6, 23, 0.6); background: #020617; }
        .artwork img { display: block; width: 150px; height: auto; }
        h1 { margin: 0; font-size: 22px; letter-spacing: 0.01em; }
        h2 { margin: 24px 0 12px; font-size: 16px; color: #38bdf8; letter-spacing: 0.02em; }
        p { margin: 0; color: #cbd5f5; font-size: 15px; }
        .subtle { color: #94a3b8; font-size: 14px; margin-top: 6px; }
        .license-box { margin-top: 28px; padding: 20px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 12px; text-align: left; max-width: 420px; font-size: 13px; line-height: 1.6; }
        .license-box h3 { margin: 0 0 12px; font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
        .license-box ul { margin: 8px 0; padding-left: 20px; }
        .license-box li { margin: 4px 0; color: #cbd5f5; }
        .license-box .section { margin-bottom: 16px; }
        .license-box .section:last-child { margin-bottom: 0; }
        .license-box .copyright { color: #94a3b8; font-size: 12px; margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(148, 163, 184, 0.2); }
        .license-box .emoji { margin-right: 6px; }
        .license-box a { color: #38bdf8; text-decoration: none; }
        .license-box a:hover { text-decoration: underline; }
        button { margin-top: 24px; border: none; border-radius: 999px; padding: 10px 28px; font-size: 15px; font-weight: 600; cursor: pointer; background: #38bdf8; color: #031525; font-family: inherit; transition: background 120ms ease; }
        button:hover { background: #5ad0ff; }
        button:focus-visible { outline: 2px solid #bae6fd; outline-offset: 2px; }
      </style>
    </head>
    <body>
      <div class="shell">
        ${artworkMarkup ? `<div class="artwork">${artworkMarkup}</div>` : ''}
        <div>
          <h1>Wide Poster Maker</h1>
          <p>Created by Pavel Novikau</p>
          <p class="subtle">upupa.dev</p>
        </div>
        
        <div class="license-box">
          <div class="section">
            <h3>License & Usage</h3>
            <p><strong>Free for personal, educational, and commercial use</strong></p>
          </div>
          
          <div class="section">
            <p><span class="emoji">✅</span> You may:</p>
            <ul>
              <li>Use for any purpose (personal, commercial, educational)</li>
              <li>Distribute unmodified binaries</li>
              <li>Share and recommend</li>
            </ul>
          </div>
          
          <div class="section">
            <p><span class="emoji">❌</span> You may NOT:</p>
            <ul>
              <li>Sell this software (it must remain free)</li>
              <li>Modify or create derivative works</li>
              <li>Claim ownership or remove attributions</li>
            </ul>
          </div>
          
          <div class="section">
            <p><strong>Commercial Inquiries:</strong> <a href="mailto:contact@upupa.dev">contact@upupa.dev</a></p>
          </div>
          
          <div class="section">
            <p style="font-size: 12px; line-height: 1.5;">
              <strong>No Warranties:</strong> This software is provided "AS IS" without warranty. 
              No guarantee of updates, support, or specific features. Use at your own risk.
            </p>
          </div>
          
          <div class="section">
            <p style="font-size: 12px; color: #38bdf8;">
              A portion of donations supports the <strong>35mm.of.history</strong> archival project.
            </p>
          </div>
          
          <p class="copyright">Copyright © 2024-2025 Pavel Novikau, upupa.dev<br>All rights reserved.</p>
        </div>
        
        <button type="button" onclick="window.close()">Close</button>
      </div>
    </body>
  </html>`;

  aboutWindow.once('ready-to-show', () => aboutWindow?.show());

  try {
    await aboutWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  } catch (error) {
    console.error('Failed to show About dialog', error);
    aboutWindow.close();
    aboutWindow = null;
    const target = parent || getFocusedWindow();
    await dialog.showMessageBox(target || undefined, {
      type: 'info',
      title: 'About Wide Poster Maker',
      message: 'Wide Poster Maker',
      detail: 'Created by Pavel Novikau · upupa.dev'
    });
  }
};

const buildAppMenu = () => {
  const template = [];
  if (process.platform === 'darwin') {
    template.push({
      label: app.name,
      submenu: [
        { label: 'About Wide Poster Maker', click: () => showAboutDialog() },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  template.push({
    label: 'File',
    submenu: [
      {
        label: 'Open Image...',
        accelerator: 'CmdOrCtrl+O',
        click: () => triggerOpenImageFromMenu()
      },
      { type: 'separator' },
      process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' }
    ]
  });

  template.push({
    label: 'Help',
    role: 'help',
    submenu: [
      {
        label: 'Learn more',
        click: () => {
          shell.openExternal(supportLink).catch((error) => console.error('Support link failed', error));
        }
      },
      {
        label: 'Buy coffee for author',
        click: () => {
          shell.openExternal('https://buymeacoffee.com/upupa.dev').catch((error) => console.error('Buy coffee link failed', error));
        }
      },
      { type: 'separator' },
      { label: 'About Wide Poster Maker', click: () => showAboutDialog() }
    ]
  });

  const applicationMenu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(applicationMenu);
};

ipcMain.handle('dialog:openFile', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'tiff', 'bmp'] }],
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('tiler:loadImage', async (event, payload) => {
  const jobId = randomUUID();
  try {
    if (!payload?.path) {
      throw new Error('No image provided');
    }
    const metadata = await sharp(payload.path).metadata();
    const previewPath = await createPreviewThumbnail(payload.path, jobId);
    const imageMeta = {
      path: payload.path,
      width: metadata.width || 0,
      height: metadata.height || 0,
      thumbnail: previewPath
    };
    const autoFit = buildAutoFitRecommendation(payload, imageMeta);
    const gridForTiles = autoFit.grid ? { ...payload.grid, ...autoFit.grid } : payload.grid;
    const tiles = computeTilePayload(payload.settings, gridForTiles);
    event.sender.send('tiler:imageReady', {
      jobId,
      imageMeta,
      tiles,
      previewPath,
      recommendedGrid: autoFit.info || undefined
    });
  } catch (error) {
    event.sender.send('tiler:error', { jobId, error: error.message || 'Unable to load image' });
  }
  return { jobId };
});

ipcMain.handle('tiler:readPreview', async (_event, previewPath) => {
  if (!previewPath) {
    return null;
  }
  try {
    const buffer = await fs.readFile(previewPath);
    const ext = path.extname(previewPath).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.warn('Failed to read preview asset', error);
    return null;
  }
});

ipcMain.handle('tiler:export', async (event, payload) => {
  const jobId = randomUUID();
  const context = { jobId, sender: event.sender };
  jobContexts.set(jobId, context);

  try {
    if (!payload?.imagePath) {
      throw new Error('Missing image path for export');
    }
    console.info(`[Tiler][${jobId}] Export requested for ${payload.imagePath}`);
    const tempDir = await ensureJobTempDir(jobId);
    context.tempDir = tempDir;
    const destination = resolveDestination(payload.export || {});
    context.destination = destination;

    const request = {
      jobId,
      imagePath: payload.imagePath,
      document: payload.settings,
      grid: payload.grid,
      guides: payload.guides,
      export: payload.export,
      tempDir
    };
    context.request = request;

    imageEngine
      .slice(request)
      .then(async (result) => {
        try {
          console.info(`[Tiler][${jobId}] Slice complete, ${result.files?.length || 0} files ready.`);
          const outputPaths = await moveResultsToDestination(result.files || [], destination, jobId);
          if (payload.export?.sendToPrinter && payload.export?.format === 'pdf' && outputPaths.length) {
            console.info(`[Tiler][${jobId}] Sending first PDF to printer`);
            await runPrintJob(jobId, outputPaths[0]);
          }
          sendToRenderer(jobId, 'tiler:complete', { jobId, outputPaths });
          if (payload.export?.openAfterExport && outputPaths.length) {
            shell.showItemInFolder(outputPaths[0]);
          }
        } catch (finalizeError) {
          console.error(`[Tiler][${jobId}] Finalization failed`, finalizeError);
          sendToRenderer(jobId, 'tiler:error', {
            jobId,
            error: finalizeError.message || 'Failed to finalize export'
          });
        } finally {
          await cleanupJob(jobId);
        }
      })
      .catch(async (error) => {
        console.error(`[Tiler][${jobId}] Slice failed`, error);
        sendToRenderer(jobId, 'tiler:error', { jobId, error: error.message || 'Export failed' });
        await cleanupJob(jobId);
      });
  } catch (error) {
    console.error(`[Tiler][${jobId}] Export rejected`, error);
    sendToRenderer(jobId, 'tiler:error', { jobId, error: error.message || 'Failed to queue export' });
    await cleanupJob(jobId);
  }

  return { jobId };
});

ipcMain.handle('tiler:cancelExport', async (_event, jobId) => {
  if (!jobId) {
    return;
  }
  try {
    console.info(`[Tiler][${jobId}] Cancellation requested`);
    await imageEngine.cancel(jobId);
    console.info(`[Tiler][${jobId}] Cancellation acknowledged`);
  } finally {
    await cleanupJob(jobId);
  }
});

ipcMain.handle('project:save', async (_event, request) => {
  if (!mainWindow) return null;
  if (!request?.payload) return null;
  let targetPath = request?.path;
  if (!targetPath) {
    const result = await dialog.showSaveDialog(mainWindow, {
      filters: [{ name: 'Poster Project', extensions: ['poster.json'] }]
    });
    if (result.canceled || !result.filePath) {
      return null;
    }
    targetPath = result.filePath.endsWith('.poster.json') ? result.filePath : `${result.filePath}.poster.json`;
  }
  await fs.writeFile(targetPath, JSON.stringify(request.payload, null, 2), 'utf-8');
  return { path: targetPath };
});

ipcMain.handle('project:load', async (_event, projectPath) => {
  if (!mainWindow) return null;
  let targetPath = projectPath;
  if (!targetPath) {
    const result = await dialog.showOpenDialog(mainWindow, {
      filters: [{ name: 'Poster Project', extensions: ['poster.json'] }],
      properties: ['openFile']
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    targetPath = result.filePaths[0];
  }
  const raw = await fs.readFile(targetPath, 'utf-8');
  return { path: targetPath, payload: JSON.parse(raw) };
});
