import enUS, { type Messages } from './en-US';

const plPL: Messages = {
	...enUS,
	toolbar: {
		...enUS.toolbar,
		openImage: 'Otwórz obraz',
		export: 'Eksportuj'
	},
	navigation: {
		...enUS.navigation,
		modes: 'Tryby',
		language: 'Język'
	},
	modes: {
		...enUS.modes,
		preview: 'Podgląd',
		settings: 'Ustawienia',
		export: 'Eksport'
	},
	welcome: {
		...enUS.welcome,
		title: 'Drukuj duże w domu.',
		description:
			'Przeciągnij dowolny obraz, natychmiast podejrzyj siatkę arkuszy, dostosuj DPI i zakładkę, a następnie wyeksportuj wielostronicowe pliki PDF albo wyślij je bezpośrednio do drukarki.',
		primaryCta: 'Wybierz obraz',
		dropHint: 'Lub upuść obraz w dowolnym miejscu tego okna, aby zacząć.'
	},
	preview: {
		...enUS.preview,
		loading: 'Przygotowywanie podglądu…',
		dragColumns: 'Dostosuj kolumny',
		dragRows: 'Dostosuj wiersze',
		fitToggle: 'Dopasuj do ramki'
	},
	status: {
		...enUS.status,
		rowsCols: 'Wiersze×Kolumny',
		poster: 'Plakat',
		printableArea: 'Obszar zadruku',
		pages: 'Strony'
	},
	actions: {
		...enUS.actions,
		openImage: 'Otwórz plik obrazu',
		cancel: 'Anuluj'
	},
	exportModal: {
		...enUS.exportModal,
		title: 'Eksport plakatu…',
		cancel: 'Anuluj'
	},
	panels: {
		...enUS.panels,
		grid: {
			...enUS.panels.grid,
			title: 'Siatka',
			description: 'Liczba arkuszy i zakładka',
			autoFit: 'Autodopasowanie',
			lockAspect: 'Zablokuj proporcje',
			rowsLabel: 'Wiersze',
			rowCount: 'Liczba wierszy {count}',
			columnsLabel: 'Kolumny',
			columnCount: 'Liczba kolumn {count}'
		},
		document: {
			...enUS.panels.document,
			title: 'Dokument',
			description: 'Format papieru, orientacja, DPI, marginesy',
			paperSize: 'Format papieru',
			orientation: 'Orientacja',
			orientations: {
				...enUS.panels.document.orientations,
				portrait: 'pionowa',
				landscape: 'pozioma'
			},
			dpiDescription: 'Bieżące DPI {value}',
			margins: 'Marginesy (mm)',
			marginDescription: 'Margines {value} milimetrów',
			overlap: 'Zakładka (mm)',
			overlapDescription: 'Zakładka {value} milimetrów',
			hint: 'Obszar zadruku od razu aktualizuje się na pasku metryk.'
		},
		guides: {
			...enUS.panels.guides,
			title: 'Prowadnice',
			description: 'Znaczniki cięcia, etykiety, spad',
			showInPreview: 'Pokaż prowadnice w podglądzie',
			cropMarks: 'Znaczniki cięcia',
			tileLabels: 'Etykiety arkuszy',
			bleed: 'Spad (mm)',
			bleedDescription: 'Spad {value} milimetrów'
		},
		output: {
			...enUS.panels.output,
			title: 'Wyjście',
			description: 'Format, folder docelowy, automatyzacja',
			toneEyebrow: 'Kontrola tonu',
			toneTitle: 'Czarno-biały finisher',
			toneCopy: 'Zastosuj skalibrowany profil mono, aby każdy arkusz drukował się neutralnie nawet na tanich laserach.',
			toneEnabled: 'Włączone',
			toneDisabled: 'Wyłączone',
			format: 'Format',
			formats: {
				...enUS.panels.output.formats,
				png: 'Płytki PNG',
				jpg: 'Płytki JPG'
			},
			destination: 'Folder docelowy',
			destinationPlaceholder: 'Wybierz folder',
			namingPattern: 'Schemat nazewniczy',
			openAfterExport: 'Otwórz folder po eksporcie',
			sendToPrinter: 'Wyślij do drukarki',
			startExport: 'Rozpocznij eksport'
		}
	}
};

export default plPL;
