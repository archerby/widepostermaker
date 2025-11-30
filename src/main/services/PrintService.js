const { BrowserWindow } = require('electron');
const { pathToFileURL } = require('url');

class PrintService {
  constructor() {
    this.window = null;
  }

  async ensureWindow() {
    if (this.window && !this.window.isDestroyed()) {
      return this.window;
    }
    this.window = new BrowserWindow({
      show: false,
      webPreferences: {
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true
      }
    });
    this.window.on('closed', () => {
      this.window = null;
    });
    return this.window;
  }

  async printPdf(pdfPath, onProgress) {
    const target = await this.ensureWindow();
    const fileUrl = pathToFileURL(pdfPath).href;
    await target.loadURL(fileUrl);
    onProgress?.({ step: 'printing', progress: 0.05, message: 'Printing dialog opened' });
    await new Promise((resolve, reject) => {
      target.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
        if (!success) {
          reject(new Error(failureReason || 'Print job aborted'));
        } else {
          resolve();
        }
      });
    });
    onProgress?.({ step: 'printing', progress: 1, message: 'Print job completed' });
  }

  dispose() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.destroy();
    }
    this.window = null;
  }
}

module.exports = PrintService;
