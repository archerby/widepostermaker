import enUS, { type Messages } from './en-US';

const beBY: Messages = {
	...enUS,
	toolbar: {
		...enUS.toolbar,
		openImage: 'Адкрыць выяву',
		export: 'Экспарт'
	},
	navigation: {
		...enUS.navigation,
		modes: 'Рэжымы',
		language: 'Мова'
	},
	modes: {
		...enUS.modes,
		preview: 'Папярэдні прагляд',
		settings: 'Налады',
		export: 'Экспарт',
		learn: enUS.modes.learn
	},
	welcome: {
		...enUS.welcome,
		title: 'Друкуйце вялікае дома.',
		description:
			'Перацягніце любую выяву, адразу паглядзіце сетку аркушаў, адрэгулюйце DPI і перакрыцце, а потым экспартуйце шматстаронкавыя PDF або адправіце іх непасрэдна на прынтар.',
		primaryCta: 'Абярыце выяву',
		dropHint: 'Або перацягніце выяву ў любое месца гэтага акна, каб пачаць.'
	},
	preview: {
		...enUS.preview,
		loading: 'Падрыхтоўка прагляду…',
		dragColumns: 'Наладзьце слупкі',
		dragRows: 'Наладзьце радкі',
		fitToggle: 'Упісаць у рамку'
	},
	status: {
		...enUS.status,
		rowsCols: 'Радкі×Слупкі',
		poster: 'Постар',
		printableArea: 'Зона друку',
		pages: 'Старонкі'
	},
	actions: {
		...enUS.actions,
		openImage: 'Адкрыць файл выявы',
		cancel: 'Скасаваць'
	},
	exportModal: {
		...enUS.exportModal,
		title: 'Экспартуецца постар…',
		cancel: 'Скасаваць'
	},
	panels: {
		...enUS.panels,
		grid: {
			...enUS.panels.grid,
			title: 'Сетка',
			description: 'Колькасць аркушаў і перакрыцце',
			autoFit: 'Аўтападбор',
			lockAspect: 'Фіксаваць прапорцыі',
			rowsLabel: 'Радкі',
			rowCount: 'Колькасць радкоў {count}',
			columnsLabel: 'Слупкі',
			columnCount: 'Колькасць слупкоў {count}'
		},
		document: {
			...enUS.panels.document,
			title: 'Дакумент',
			description: 'Фармат паперы, арыентацыя, DPI, палі',
			paperSize: 'Памер паперы',
			orientation: 'Арыентацыя',
			orientations: {
				...enUS.panels.document.orientations,
				portrait: 'кніжная',
				landscape: 'альбомная'
			},
			dpiDescription: 'Бягучы DPI {value}',
			margins: 'Палі (мм)',
			marginDescription: 'Поле {value} міліметраў',
			overlap: 'Перакрыцце (мм)',
			overlapDescription: 'Перакрыцце {value} міліметраў',
			hint: 'Зона друку абнаўляецца адразу ў радку метрык.'
		},
		guides: {
			...enUS.panels.guides,
			title: 'Напрамкі',
			description: 'Метки абрэзу, пазнакі, вылет',
			showInPreview: 'Паказваць напрамкі ў праглядзе',
			cropMarks: 'Метки абрэзу',
			tileLabels: 'Метки аркушаў',
			bleed: 'Вылет (мм)',
			bleedDescription: 'Вылет {value} міліметраў'
		},
		output: {
			...enUS.panels.output,
			title: 'Вынік',
			description: 'Фармат, прызначэнне, аўтаматызацыя',
			toneEyebrow: 'Кантроль тонаў',
			toneTitle: 'Ч/Б фінальны профіль',
			toneCopy: 'Прымяняйце адкалібраваны манахромны профіль, каб кожны аркуш друкаваўся нейтральна нават на танных прынтарах.',
			toneEnabled: 'Уключана',
			toneDisabled: 'Выключана',
			format: 'Фармат',
			formats: {
				...enUS.panels.output.formats,
				png: 'PNG аркушы',
				jpg: 'JPG аркушы'
			},
			destination: 'Каталог прызначэння',
			destinationPlaceholder: 'Абраць папку',
			namingPattern: 'Шаблон назвы',
			openAfterExport: 'Адкрыць папку пасля экспарту',
			sendToPrinter: 'Адправіць на прынтар',
			startExport: 'Пачаць экспарт'
		}
	}
};

export default beBY;
