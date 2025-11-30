const enUS = {
  toolbar: {
    logo: 'Wide Poster Maker',
    openImage: 'Open Image',
    export: 'Export'
  },
  navigation: {
    modes: 'Modes',
    language: 'Language'
  },
  modes: {
    preview: 'Preview',
    settings: 'Settings',
    export: 'Export',
    learn: 'Learn'
  },
  welcome: {
    title: 'Print big at home.',
    description:
      'Drop any image, preview the tile grid instantly, adjust DPI and overlap, then export multi-page PDFs or send them directly to your printer.',
    primaryCta: 'Choose Image',
    secondaryCta: 'Learn More',
    dropHint: 'Or drop an image anywhere in this window to get started.',
    dropAriaLabel: 'Image drop zone'
  },
  preview: {
    paperLabel: 'Paper',
    tilesLabel: 'tiles',
    loading: 'Preparing preview…',
    dragColumns: 'Adjust columns',
    dragRows: 'Adjust rows',
    untitled: 'Untitled poster',
    hoveredTile: 'Row {row}, Col {col}',
    tileSize: '{width} × {height}',
    imageAlt: 'Poster preview for {label}',
    legendLabel: 'Preview legend',
    fitToggle: 'Fit to frame',
    summary:
      '{rows} rows by {cols} columns grid, poster {posterWidth} × {posterHeight}, printable area {printableWidth} × {printableHeight}, {pages} total pages'
  },
  status: {
    rowsCols: 'Rows×Cols',
    poster: 'Poster',
    printableArea: 'Printable area',
    pages: 'Pages',
    dpi: 'DPI',
    exportProgress: 'Export'
  },
  exportModal: {
    title: 'Exporting poster…',
    step: 'Step',
    cancel: 'Cancel'
  },
  units: {
    millimeters: 'mm',
    inches: 'in'
  },
  actions: {
    openImage: 'Open image file',
    close: 'Close',
    cancel: 'Cancel'
  },
  panels: {
    grid: {
      title: 'Grid',
      description: 'Tile counts & overlap control',
      autoFit: 'Auto-fit',
      lockAspect: 'Lock aspect',
      rowsLabel: 'Rows',
      rowCount: 'Row count {count}',
      columnsLabel: 'Columns',
      columnCount: 'Column count {count}'
    },
    document: {
      title: 'Document',
      description: 'Paper size, orientation, DPI, margins',
      paperSize: 'Paper size',
      orientation: 'Orientation',
      orientations: {
        portrait: 'portrait',
        landscape: 'landscape'
      },
      dpi: 'DPI',
      dpiDescription: 'Current DPI {value}',
      margins: 'Margins (mm)',
      marginDescription: 'Margin {value} millimeters',
      overlap: 'Overlap (mm)',
      overlapDescription: 'Overlap {value} millimeters',
      hint: 'Printable area updates instantly in the metrics bar.'
    },
    guides: {
      title: 'Guides',
      description: 'Crop marks, labels, bleed',
      showInPreview: 'Show guides in preview',
      cropMarks: 'Crop marks',
      tileLabels: 'Tile labels',
      bleed: 'Bleed (mm)',
      bleedDescription: 'Bleed {value} millimeters'
    },
    output: {
      title: 'Output',
      description: 'Format, destination, automation',
      toneEyebrow: 'Tone control',
      toneTitle: 'Black & white finisher',
      toneCopy: 'Apply a calibrated monochrome profile so every sheet prints neutral, even on budget lasers.',
      toneEnabled: 'Enabled',
      toneDisabled: 'Disabled',
      format: 'Format',
      formats: {
        pdf: 'PDF',
        png: 'PNG tiles',
        jpg: 'JPG tiles'
      },
      destination: 'Destination folder',
      destinationPlaceholder: 'Choose folder',
      namingPattern: 'Naming pattern',
      openAfterExport: 'Open folder after export',
      sendToPrinter: 'Send to printer',
      startExport: 'Start export'
    }
  }
};

export type Messages = typeof enUS;

export default enUS;
