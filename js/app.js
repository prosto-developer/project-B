const AppState = { chart: null, data: [], users: [], userMap: {} }

document.addEventListener('DOMContentLoaded', async () => {
	try {
		await initApplication()
	} catch (error) {
		console.error(error)
		showError('Не удалось загрузить приложение')
	}
})

async function initApplication() {
	await loadUsers()
	setupEventListeners()
	setDefaultDates()
}

async function loadUsers() {
	try {
		showLoader(true, 'Загрузка сотрудников...')
		const response = await fetch(`${APP_CONFIG.apiBaseUrl}/api/users`)
		if (!response.ok) throw new Error(`HTTP ${response.status}`)
		AppState.users = await response.json()
		AppState.userMap = createUserMap(AppState.users)
		renderUserSelect()
	} catch (error) {
		console.error(error)
		showError('Не удалось загрузить список сотрудников')
	} finally {
		showLoader(false)
	}
}

async function loadTasks() {
	const userId = document.getElementById('userSelect').value
	const dateFrom = document.getElementById('dateFrom').value
	const dateTo = document.getElementById('dateTo').value
	const statusFilter = document.getElementById('statusSelect').value

	if (!validateFilters(userId, dateFrom, dateTo)) return

	try {
		showLoader(true, 'Загрузка задач...')
		const params = new URLSearchParams({
			userId,
			dateStart: formatDateForAPI(dateFrom),
			dateEnd: formatDateForAPI(dateTo),
			status: statusFilter,
		})
		const response = await fetch(`${APP_CONFIG.apiBaseUrl}/api/data?${params}`)
		if (!response.ok) throw new Error(`HTTP ${response.status}`)
		AppState.data = await response.json()
		processAndDisplayData(userId, statusFilter)
	} catch (error) {
		console.error(error)
		showError('Ошибка загрузки данных')
	} finally {
		showLoader(false)
	}
}

function processAndDisplayData(userId, statusFilter) {
	try {
		const userEmail = AppState.userMap[userId]
		if (!userEmail) throw new Error('Email не найден')

		const filteredData = filterDataByDate(AppState.data)
		if (!filteredData.length) {
			showWarning('Нет данных за выбранный период')
			renderDashboard([], [])
			return
		}

		const tasks = extractUserTasks(filteredData, userEmail, statusFilter)
		const from = parseDate(document.getElementById('dateFrom').value)
		const to = parseDate(document.getElementById('dateTo').value)
		const dates = []

		for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
			dates.push(new Date(d))
		}

		renderDashboard(tasks, dates)
	} catch (e) {
		console.error(e)
		showError(`Ошибка обработки данных: ${e.message}`)
	}
}

function filterDataByDate(data) {
	const from = parseDate(document.getElementById('dateFrom').value)
	const to = parseDate(document.getElementById('dateTo').value)

	return data.filter(item => {
		const d = item['Дата'] ? parseDate(item['Дата']) : null
		return d && d >= from && d <= to
	})
}

function renderDashboard(tasks, dates) {
	const container = document.getElementById('gridContainer')
	container.innerHTML = ''

	if (!tasks.length || !dates.length) {
		showWarning('Нет задач или дат для отображения')
		return
	}

	renderGrid(tasks, dates)
	renderTable(tasks)
}

function renderGrid(tasks, dates) {
	const container = document.getElementById('gridContainer')
	container.innerHTML = ''

	const table = document.createElement('table')
	table.classList.add('excel-grid')

	// Тело таблицы
	const tbody = table.createTBody()

	// Строки с задачами
	tasks.forEach((t, idx) => {
		const row = tbody.insertRow()

		// Фиксированная ячейка с названием задачи
		const titleCell = row.insertCell()
		titleCell.textContent = t.title
		titleCell.classList.add('fixed-cell')
		titleCell.style.backgroundColor =
			APP_CONFIG.userColors[idx % APP_CONFIG.userColors.length]

		// Ячейки с датами
		dates.forEach(d => {
			const cell = row.insertCell()
			const dayStart = new Date(d)
			dayStart.setHours(0, 0, 0, 0)

			const dayEnd = new Date(dayStart)
			dayEnd.setDate(dayEnd.getDate() + 1)

			const coversDay =
				new Date(t.start) < dayEnd &&
				(t.status !== '5' || new Date(t.end) >= dayStart)

			if (coversDay) {
				cell.style.backgroundColor =
					APP_CONFIG.userColors[idx % APP_CONFIG.userColors.length]
			}
		})
	})

	// Футер с датами
	const tfoot = table.createTFoot()
	const footRow = tfoot.insertRow()
	footRow.insertCell() // Пустая ячейка для выравнивания
	dates.forEach(d => {
		const cell = footRow.insertCell()
		cell.textContent = formatDate(d, 'dd.MM')
		cell.classList.add('date-cell')
	})

	container.appendChild(table)
}

function renderTable(tasks) {
	const body = document.querySelector('#taskTable tbody')
	body.innerHTML = tasks.length ? '' : '<tr><td colspan="3">Нет задач</td></tr>'

	tasks.forEach(t => {
		const cls = t.status === '5' ? 'status-completed' : 'status-active'
		body.innerHTML += `
            <tr>
                <td>${formatDate(t.start)}</td>
                <td>${t.title}</td>
                <td><span class="${cls}">${
			t.status === '5' ? 'Завершена' : 'В работе'
		}</span></td>
            </tr>
        `
	})
}

// Вспомогательные функции
function parseDate(s) {
	return s ? new Date(s) : new Date()
}

function formatDate(d, f = 'dd.MM.yyyy') {
	const date = new Date(d),
		pad = n => String(n).padStart(2, '0')
	return f
		.replace('dd', pad(date.getDate()))
		.replace('MM', pad(date.getMonth() + 1))
		.replace('yyyy', date.getFullYear())
}

function formatDateForAPI(s) {
	return s.replace(/-/g, '.')
}

function setupEventListeners() {
	document.getElementById('loadBitrix').addEventListener('click', loadTasks)
}

function renderUserSelect() {
	const sel = document.getElementById('userSelect')
	sel.innerHTML =
		'<option value="" disabled selected>Выберите сотрудника</option>'

	AppState.users.forEach((u, i) => {
		const o = document.createElement('option')
		o.value = u.ID
		o.textContent =
			[u.NAME, u.LAST_NAME].filter(Boolean).join(' ') || u.EMAIL || `ID:${u.ID}`
		sel.appendChild(o)
	})
}

function setDefaultDates() {
	const today = new Date(),
		weekAgo = new Date()
	weekAgo.setDate(today.getDate() - APP_CONFIG.defaultDateRange)
	document.getElementById('dateFrom').valueAsDate = weekAgo
	document.getElementById('dateTo').valueAsDate = today
}

function validateFilters(u, d1, d2) {
	if (!u || !d1 || !d2) {
		showError('Заполните все поля фильтрации')
		return false
	}
	return true
}

function createUserMap(users) {
	return users.reduce((m, u) => {
		if (u.ID && u.EMAIL) m[u.ID] = u.EMAIL.toLowerCase()
		return m
	}, {})
}

function extractUserTasks(filteredData, userEmail, statusFilter) {
	const taskMap = new Map()

	filteredData.forEach(day => {
		const userTasks = day[userEmail] || {}
		Object.entries(userTasks).forEach(([id, task]) => {
			if (statusFilter === '5' && task.status !== '5') return
			if (statusFilter === 'other' && task.status === '5') return

			const start = new Date(task.start_date || task.start)
			const end = new Date(task.end_date || task.end)

			if (!taskMap.has(id)) {
				taskMap.set(id, {
					id,
					title: task.title || `Задача ${id}`,
					start,
					end,
					status: task.status,
				})
			} else {
				const entry = taskMap.get(id)
				if (start < entry.start) entry.start = start
				if (end > entry.end) entry.end = end
				entry.status = task.status
			}
		})
	})

	return Array.from(taskMap.values()).sort((a, b) => a.start - b.start)
}

// Утилиты
function showLoader(show, text = 'Загрузка...') {
	const btn = document.getElementById('loadBitrix')
	btn.disabled = show
	btn.innerHTML = show
		? `<span class="spinner">⌛</span> ${text}`
		: 'Загрузить задачи'
}

function showError(msg) {
	alert(`Ошибка: ${msg}`)
}

function showWarning(msg) {
	console.warn(msg)
}
