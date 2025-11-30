const { contextBridge, ipcRenderer } = require('electron');

const createListener = (channel) => (callback) => {
  if (typeof callback !== 'function') {
    return () => undefined;
  }
  const handler = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('posterAPI', {
  openImageDialog: () => ipcRenderer.invoke('dialog:openFile'),
  loadImage: (payload) => ipcRenderer.invoke('tiler:loadImage', payload),
  startExport: (payload) => ipcRenderer.invoke('tiler:export', payload),
  cancelExport: (jobId) => ipcRenderer.invoke('tiler:cancelExport', jobId),
  saveProject: (request) => ipcRenderer.invoke('project:save', request),
  loadProject: (path) => ipcRenderer.invoke('project:load', path ?? null),
  readPreview: (previewPath) => ipcRenderer.invoke('tiler:readPreview', previewPath),
  onImageReady: createListener('tiler:imageReady'),
  onJobProgress: createListener('tiler:progress'),
  onJobComplete: createListener('tiler:complete'),
  onJobError: createListener('tiler:error'),
  onMenuOpenImage: createListener('menu:openImage')
});
