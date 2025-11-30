import enUS, { type Messages } from './en-US';

const esES: Messages = {
	...enUS,
	toolbar: {
		...enUS.toolbar,
		openImage: 'Abrir imagen',
		export: 'Exportar'
	},
	navigation: {
		...enUS.navigation,
		modes: 'Modos',
		language: 'Idioma'
	},
	modes: {
		...enUS.modes,
		preview: 'Vista previa',
		settings: 'Ajustes',
		export: 'Exportar'
	},
	welcome: {
		...enUS.welcome,
		title: 'Imprime en grande desde casa.',
		description:
			'Suelta cualquier imagen, previsualiza al instante la cuadrícula de paneles, ajusta el DPI y el solapado y luego exporta PDF multipágina o envíalos directamente a tu impresora.',
		primaryCta: 'Elegir imagen',
		dropHint: 'O suelta una imagen en cualquier parte de esta ventana para empezar.'
	},
	preview: {
		...enUS.preview,
		loading: 'Preparando la vista previa…',
		dragColumns: 'Ajustar columnas',
		dragRows: 'Ajustar filas',
		fitToggle: 'Ajustar al marco'
	},
	status: {
		...enUS.status,
		rowsCols: 'Filas×Columnas',
		poster: 'Póster',
		printableArea: 'Área imprimible',
		pages: 'Páginas'
	},
	actions: {
		...enUS.actions,
		openImage: 'Abrir archivo de imagen',
		cancel: 'Cancelar'
	},
	exportModal: {
		...enUS.exportModal,
		title: 'Exportando póster…',
		cancel: 'Cancelar'
	},
	panels: {
		...enUS.panels,
		grid: {
			...enUS.panels.grid,
			title: 'Cuadrícula',
			description: 'Recuento de paneles y solapado',
			autoFit: 'Ajuste automático',
			lockAspect: 'Bloquear proporciones',
			rowsLabel: 'Filas',
			rowCount: 'Número de filas {count}',
			columnsLabel: 'Columnas',
			columnCount: 'Número de columnas {count}'
		},
		document: {
			...enUS.panels.document,
			title: 'Documento',
			description: 'Tamaño de papel, orientación, DPI y márgenes',
			paperSize: 'Tamaño de papel',
			orientation: 'Orientación',
			orientations: {
				...enUS.panels.document.orientations,
				portrait: 'vertical',
				landscape: 'horizontal'
			},
			dpiDescription: 'DPI actual {value}',
			margins: 'Márgenes (mm)',
			marginDescription: 'Margen {value} milímetros',
			overlap: 'Solapado (mm)',
			overlapDescription: 'Solapado {value} milímetros',
			hint: 'El área imprimible se actualiza al instante en la barra de métricas.'
		},
		guides: {
			...enUS.panels.guides,
			title: 'Guías',
			description: 'Marcas de corte, etiquetas y sangrado',
			showInPreview: 'Mostrar guías en la vista previa',
			cropMarks: 'Marcas de corte',
			tileLabels: 'Etiquetas de paneles',
			bleed: 'Sangrado (mm)',
			bleedDescription: 'Sangrado {value} milímetros'
		},
		output: {
			...enUS.panels.output,
			title: 'Salida',
			description: 'Formato, destino y automatización',
			toneEyebrow: 'Control de tono',
			toneTitle: 'Acabado en blanco y negro',
			toneCopy: 'Aplica un perfil monocromo calibrado para que cada hoja salga neutra incluso en impresoras básicas.',
			toneEnabled: 'Activado',
			toneDisabled: 'Desactivado',
			format: 'Formato',
			formats: {
				...enUS.panels.output.formats,
				png: 'Paneles PNG',
				jpg: 'Paneles JPG'
			},
			destination: 'Carpeta de destino',
			destinationPlaceholder: 'Elegir carpeta',
			namingPattern: 'Patrón de nombres',
			openAfterExport: 'Abrir carpeta tras exportar',
			sendToPrinter: 'Enviar a la impresora',
			startExport: 'Iniciar exportación'
		}
	}
};

export default esES;
