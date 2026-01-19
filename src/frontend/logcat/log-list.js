class LogList extends HTMLElement {
	constructor() {
		super();
		this.logs = [];
		this.filterText = '';
		this.filterPackage = '';
		this.filterLevel = 'all';
		this.autoScroll = true;
		this.maxLogs = 5000;

		this.container = document.createElement('div');
		this.container.style.height = '100%';
		this.container.style.width = '100%';
		// this.container.style.overflow = 'auto'; // Handled by host style in css

		this.style.overflow = 'auto'; // Host needs to scroll
	}

	connectedCallback() {
		this.appendChild(this.container);
		this.addEventListener('scroll', () => {
			// If user scrolls up, disable auto-scroll
			if (this.scrollHeight - this.scrollTop - this.clientHeight > 50) {
				this.autoScroll = false;
			} else {
				this.autoScroll = true;
			}
		});
	}

	addLog(logLine) {
		// Parse log line essentially to get level/tag if possible
		// Standard threadtime format: MM-DD HH:MM:SS.ms PID TID LEVEL TAG: MESSAGE
		// We will do a simple efficient regex or just string ops

		const logObj = this.parseLog(logLine);
		this.logs.push(logObj);

		if (this.logs.length > this.maxLogs) {
			this.logs.shift();
			if (this.container.firstChild) {
				this.container.removeChild(this.container.firstChild);
			}
		}

		if (this.matchesFilter(logObj)) {
			const row = this.createRow(logObj);
			this.container.appendChild(row);
			if (this.autoScroll) {
				this.scrollToBottom();
			}
		}
	}

	clear() {
		this.logs = [];
		this.container.innerHTML = '';
	}

	setFilters(text, packageName, level) {
		this.filterText = text.toLowerCase();
		this.filterPackage = packageName.toLowerCase();
		this.filterLevel = level;
		this.refresh();
	}

	refresh() {
		this.container.innerHTML = '';
		const fragment = document.createDocumentFragment();

		// Optimize: verify if we need to implement virtual DOM if 5000 nodes are too heavy.
		// For now, 5000 simple divs is "okay" in modern browsers, but can be sluggish.
		// Let's rely on simple appending for now.

		this.logs.forEach(log => {
			if (this.matchesFilter(log)) {
				fragment.appendChild(this.createRow(log));
			}
		});

		this.container.appendChild(fragment);
		if (this.autoScroll) {
			this.scrollToBottom();
		}
	}

	matchesFilter(log) {
		// Level logic
		const levels = ['V', 'D', 'I', 'W', 'E', 'F'];
		if (this.filterLevel !== 'all') {
			const filterIdx = levels.indexOf(this.filterLevel);
			const logIdx = levels.indexOf(log.level);
			if (logIdx < filterIdx) return false;
		}

		// Text search
		if (this.filterText && !log.raw.toLowerCase().includes(this.filterText)) {
			return false;
		}

		// Package filter (This is tricky because basic logcat doesn't always show package name in the line unless we used specific format or the TAG is the package)
		// threadtime format doesn't natively have package name, it has PID.
		// To filter by package properly, we usually need to map PID to package or usage `adb logcat --pid=$(pidof package)`.
		// However, requirements said "filter by package name".
		// If the log line contains the package name (often in TAG or Msg), we match it.
		if (this.filterPackage && !log.raw.toLowerCase().includes(this.filterPackage)) {
			return false;
		}

		return true;
	}

	parseLog(line) {
		// 12-29 10:23:45.678  1234  5678 D Tag    : Message
		// Simple heuristic for Level
		let level = 'V';
		const parts = line.split(/\s+/);
		// Usually parts[4] is level in threadtime
		if (parts.length > 4) {
			const possibleLevel = parts[4];
			if (['V', 'D', 'I', 'W', 'E', 'F'].includes(possibleLevel)) {
				level = possibleLevel;
			}
		}

		return {
			raw: line,
			level: level
		};
	}

	createRow(log) {
		const div = document.createElement('div');
		div.className = `log-row log-${log.level}`;
		div.textContent = log.raw;
		return div;
	}

	scrollToBottom() {
		this.scrollTop = this.scrollHeight;
	}
}

customElements.define('log-list', LogList);
