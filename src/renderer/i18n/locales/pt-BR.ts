import enUS, { type Messages } from './en-US';

const ptBR: Messages = {
	...enUS,
	toolbar: {
		...enUS.toolbar,
		openImage: 'Abrir imagem',
		export: 'Exportar'
	},
	navigation: {
		...enUS.navigation,
		modes: 'Modos',
		language: 'Idioma'
	},
	modes: {
		...enUS.modes,
		preview: 'Prévia',
		settings: 'Configurações',
		export: 'Exportar'
	},
	welcome: {
		...enUS.welcome,
		title: 'Imprima em grande em casa.',
		description:
			'Solte qualquer imagem, visualize instantaneamente a grade de folhas, ajuste o DPI e a sobreposição e depois exporte PDFs com várias páginas ou envie direto para a impressora.',
		primaryCta: 'Escolher imagem',
		dropHint: 'Ou solte uma imagem em qualquer lugar desta janela para começar.'
	},
	preview: {
		...enUS.preview,
		loading: 'Preparando prévia…',
		dragColumns: 'Ajustar colunas',
		dragRows: 'Ajustar linhas',
		fitToggle: 'Ajustar à moldura'
	},
	status: {
		...enUS.status,
		rowsCols: 'Linhas×Colunas',
		poster: 'Pôster',
		printableArea: 'Área imprimível',
		pages: 'Páginas'
	},
	actions: {
		...enUS.actions,
		openImage: 'Abrir arquivo de imagem',
		cancel: 'Cancelar'
	},
	exportModal: {
		...enUS.exportModal,
		title: 'Exportando pôster…',
		cancel: 'Cancelar'
	},
	panels: {
		...enUS.panels,
		grid: {
			...enUS.panels.grid,
			title: 'Grade',
			description: 'Contagem de folhas e sobreposição',
			autoFit: 'Ajuste automático',
			lockAspect: 'Travar proporções',
			rowsLabel: 'Linhas',
			rowCount: 'Total de linhas {count}',
			columnsLabel: 'Colunas',
			columnCount: 'Total de colunas {count}'
		},
		document: {
			...enUS.panels.document,
			title: 'Documento',
			description: 'Tamanho do papel, orientação, DPI e margens',
			paperSize: 'Tamanho do papel',
			orientation: 'Orientação',
			orientations: {
				...enUS.panels.document.orientations,
				portrait: 'retrato',
				landscape: 'paisagem'
			},
			dpiDescription: 'DPI atual {value}',
			margins: 'Margens (mm)',
			marginDescription: 'Margem {value} milímetros',
			overlap: 'Sobreposição (mm)',
			overlapDescription: 'Sobreposição {value} milímetros',
			hint: 'A área imprimível é atualizada na hora na barra de métricas.'
		},
		guides: {
			...enUS.panels.guides,
			title: 'Guias',
			description: 'Marcas de corte, rótulos e sangria',
			showInPreview: 'Mostrar guias na prévia',
			cropMarks: 'Marcas de corte',
			tileLabels: 'Rótulos das folhas',
			bleed: 'Sangria (mm)',
			bleedDescription: 'Sangria {value} milímetros'
		},
		output: {
			...enUS.panels.output,
			title: 'Saída',
			description: 'Formato, destino e automação',
			toneEyebrow: 'Controle de tom',
			toneTitle: 'Finalizador P&B',
			toneCopy: 'Aplique um perfil monocromático calibrado para que cada folha saia neutra mesmo nas lasers básicas.',
			toneEnabled: 'Ativado',
			toneDisabled: 'Desativado',
			format: 'Formato',
			formats: {
				...enUS.panels.output.formats,
				png: 'Blocos PNG',
				jpg: 'Blocos JPG'
			},
			destination: 'Pasta de destino',
			destinationPlaceholder: 'Escolher pasta',
			namingPattern: 'Padrão de nomes',
			openAfterExport: 'Abrir pasta após exportar',
			sendToPrinter: 'Enviar para a impressora',
			startExport: 'Iniciar exportação'
		}
	}
};

export default ptBR;
