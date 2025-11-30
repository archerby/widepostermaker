import enUS, { type Messages } from './en-US';

const ukUA: Messages = {
	...enUS,
	toolbar: {
		...enUS.toolbar,
		openImage: 'Відкрити зображення',
		export: 'Експорт'
	},
	navigation: {
		...enUS.navigation,
		modes: 'Режими',
		language: 'Мова'
	},
	modes: {
		...enUS.modes,
		preview: 'Перегляд',
		settings: 'Налаштування',
		export: 'Експорт'
	},
	welcome: {
		...enUS.welcome,
		title: 'Друкуйте велике вдома.',
		description:
			'Перетягніть будь-яке зображення, миттєво перегляньте сітку аркушів, відрегулюйте DPI та перекриття, а потім експортуйте багатосторінкові PDF або надішліть їх прямо на принтер.',
		primaryCta: 'Обрати зображення',
		dropHint: 'Або перетягніть зображення в будь-яке місце цього вікна, щоб почати.'
	},
	preview: {
		...enUS.preview,
		loading: 'Готуємо попередній перегляд…',
		dragColumns: 'Налаштуйте стовпці',
		dragRows: 'Налаштуйте рядки',
		fitToggle: 'Підігнати під рамку'
	},
	status: {
		...enUS.status,
		rowsCols: 'Рядки×Стовпці',
		poster: 'Постер',
		printableArea: 'Друкована область',
		pages: 'Сторінки'
	},
	actions: {
		...enUS.actions,
		openImage: 'Відкрити файл зображення',
		cancel: 'Скасувати'
	},
	exportModal: {
		...enUS.exportModal,
		title: 'Експорт постера…',
		cancel: 'Скасувати'
	},
	panels: {
		...enUS.panels,
		grid: {
			...enUS.panels.grid,
			title: 'Сітка',
			description: 'Кількість плиток та перекриття',
			autoFit: 'Автопідгін',
			lockAspect: 'Фіксувати пропорції',
			rowsLabel: 'Рядки',
			rowCount: 'Кількість рядків {count}',
			columnsLabel: 'Стовпці',
			columnCount: 'Кількість стовпців {count}'
		},
		document: {
			...enUS.panels.document,
			title: 'Документ',
			description: 'Розмір паперу, орієнтація, DPI, поля',
			paperSize: 'Розмір паперу',
			orientation: 'Орієнтація',
			orientations: {
				...enUS.panels.document.orientations,
				portrait: 'книжкова',
				landscape: 'альбомна'
			},
			dpiDescription: 'Поточний DPI {value}',
			margins: 'Поля (мм)',
			marginDescription: 'Поле {value} міліметрів',
			overlap: 'Перекриття (мм)',
			overlapDescription: 'Перекриття {value} міліметрів',
			hint: 'Друкована область одразу оновлюється в рядку метрик.'
		},
		guides: {
			...enUS.panels.guides,
			title: 'Напрямні',
			description: 'Мітки різу, підписи, вильот',
			showInPreview: 'Показувати напрямні в перегляді',
			cropMarks: 'Мітки різу',
			tileLabels: 'Підписи плиток',
			bleed: 'Виліт (мм)',
			bleedDescription: 'Виліт {value} міліметрів'
		},
		output: {
			...enUS.panels.output,
			title: 'Вивід',
			description: 'Формат, тека призначення, автоматизація',
			toneEyebrow: 'Керування тоном',
			toneTitle: 'Ч/Б коректор',
			toneCopy: 'Застосуйте відкалібрований монохром, щоб кожен аркуш друкувався нейтрально навіть на офісних лазерах.',
			toneEnabled: 'Увімкнено',
			toneDisabled: 'Вимкнено',
			format: 'Формат',
			formats: {
				...enUS.panels.output.formats,
				png: 'PNG плитки',
				jpg: 'JPG плитки'
			},
			destination: 'Тека призначення',
			destinationPlaceholder: 'Обрати теку',
			namingPattern: 'Шаблон назв',
			openAfterExport: 'Відкрити теку після експорту',
			sendToPrinter: 'Надіслати на принтер',
			startExport: 'Почати експорт'
		}
	}
};

export default ukUA;
