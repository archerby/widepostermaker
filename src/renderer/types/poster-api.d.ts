import type {
  DocumentSettings,
  GridSettings,
  GuideSettings,
  ExportSettings,
  ProjectFile,
  JobStatus,
  TilesState
} from '../store/useAppStore';

type LoadImageRequest = {
  path: string;
  settings: DocumentSettings;
  grid: GridSettings;
  guides: GuideSettings;
};

type ExportRequest = {
  imagePath: string;
  settings: DocumentSettings;
  grid: GridSettings;
  guides: GuideSettings;
  export: ExportSettings;
};

type SaveProjectRequest = {
  path?: string;
  payload: ProjectFile;
  destination?: string;
};

type LoadProjectResponse = {
  path: string;
  payload: ProjectFile;
};

type AutoGridRecommendation = {
  rows: number;
  cols: number;
  pageCount: number;
  reason?: string;
  wasteRatio?: number;
  resolutionScale?: number;
  posterSizeMm?: { width: number; height: number };
  requiresUpscale?: boolean;
  requiresDownscale?: boolean;
};

type ImageReadyPayload = {
  jobId: string;
  imageMeta: { path: string; width: number; height: number; thumbnail: string };
  tiles?: Partial<TilesState> & { rows: number; cols: number };
  previewPath?: string;
  recommendedGrid?: AutoGridRecommendation;
};

type JobProgressPayload = {
  jobId: string;
  step: JobStatus['step'];
  progress: number;
  message?: string;
};

type JobCompletePayload = {
  jobId: string;
  outputPaths: string[];
};

type JobErrorPayload = {
  jobId: string;
  error: string;
};

declare global {
  interface PosterAPI {
    openImageDialog(): Promise<string | null>;
    loadImage(request: LoadImageRequest): Promise<{ jobId: string } | void>;
    startExport(request: ExportRequest): Promise<{ jobId: string } | void>;
    cancelExport(jobId: string): Promise<void>;
    saveProject(request: SaveProjectRequest): Promise<{ path: string } | null>;
    loadProject(path?: string): Promise<LoadProjectResponse | null>;
    readPreview(previewPath: string): Promise<string | null>;
    onImageReady?(callback: (payload: ImageReadyPayload) => void): () => void;
    onJobProgress?(callback: (payload: JobProgressPayload) => void): () => void;
    onJobComplete?(callback: (payload: JobCompletePayload) => void): () => void;
    onJobError?(callback: (payload: JobErrorPayload) => void): () => void;
    onMenuOpenImage?(callback: () => void): () => void;
  }

  interface Window {
    posterAPI?: PosterAPI;
  }
}

export {};
