class Logcat extends HTMLElementBase {
	BUFFER_SIZE = 50000;
	CLEAR_COUNT = 10000;
	buffer = [];

	matches = [];
	currentMatch = -1;
	query = '';

	autoScroll = true;
	isPlaying = false;

	connectedCallback() {
		super.render(this.render());

		this.logList.onscroll = () => {
			this.autoScroll = (this.logList.scrollTop + this.logList.clientHeight) >= this.logList.scrollHeight;
		};

		this.refreshDevices();
	}

	onMessage(event) {
		event = event.data;

		switch (event.type) {
			case 'devices':
				this.toggleLoading(false);
				this.setDevices(event.data.devices);
				break;
			case 'log':
				this.renderLogEntry(event.data.log);
				break;
			case 'stop':
				this.isPlaying = false;
				this.playStopButton.className = 'ic play';
				break;
		}
	}

	// ACTIONS
	startStop() {
		this.postMessage({
			type: this.isPlaying ? 'stop' : 'start',
			data: {
				deviceId: this.deviceSelect.value,
				packageName: this.packageInput.value,
				tag: this.tagInput.value,
				level: this.levelSelect.value,
				search: this.searchInput.value,
			}
		});
		this.playStopButton.className = this.isPlaying ? 'ic play' : 'ic stop';

		this.isPlaying = !this.isPlaying;
	}
	clear() {
		this.logList.innerHTML = '';
		this.buffer = [];
		this.clearSearch();
		this.postMessage({ type: 'clear' });
	}

	// DEVICES
	refreshDevices() {
		this.toggleLoading(true);
		this.postMessage({ type: 'devices' });
	}
	setDevices(devices) {
		this.deviceSelect.innerHTML = devices.length
			? devices.map(d => `<option value="${d.id}">${d.model}</option>`).join('')
			: '<option value="">No devices found</option>';
	}

	// LOGS
	renderLogEntry(log) {
		log.text = `${log.timestamp} ${log.tag} ${log.message}`.toLowerCase();

		this.buffer.push(log);

		this.logList.insertAdjacentHTML('beforeend', `
			<entry class="${log.priority}">
				<timestamp>${log.timestamp}</timestamp>
				<tag>${log.tag}</tag>
				<message>${log.message}</message>
			</entry>
		`);

		// Check if new log matches current search
		if (this.matchesQuery(log)) {
			this.matches.push(this.buffer.length - 1);
			this.updateSearchUI();
		}

		this.updateBuffer();

		if (this.autoScroll) this.logList.scrollTop = this.logList.scrollHeight;
	}

	// SEARCH
	search(dir) {
		const q = this.searchInput.value.toLowerCase();
		if (!q) return this.clearSearch();

		// New Search
		if (q != this.query) {
			this.query = q;
			this.matches = [];
			this.buffer.forEach((log, index) => {
				if (this.matchesQuery(log, q)) this.matches.push(index);
			});

			this.currentMatch = -1;
		}

		if (this.matches.length == 0) return this.updateSearchUI();

		if (dir == 'next') {
			this.currentMatch++;
			if (this.currentMatch >= this.matches.length) this.currentMatch = 0; // Wrap around
		}
		else {
			this.currentMatch--;
			if (this.currentMatch < 0) this.currentMatch = this.matches.length - 1; // Wrap around
		}

		this.scrollToMatch(this.matches[this.currentMatch]);
		this.updateSearchUI();
	}
	clearSearch() {
		this.matches = [];
		this.currentMatch = -1;
		this.query = '';
		this.updateSearchUI();
		this.logList.querySelectorAll('.active-match').forEach(el => el.classList.remove('active-match'));
	}

	matchesQuery(log, query) {
		return log.text.includes(query.toLowerCase());
	}

	scrollToMatch(bufferIndex) {
		const match = this.logList.children[bufferIndex];
		if (!match) return;

		// Highlight
		this.logList.querySelector('.active-match')?.classList?.remove('active-match');

		match.classList.add('active-match');
		match.scrollIntoView({ block: 'center' });
	}

	updateSearchUI() {
		const total = this.matches.length;
		const current = this.currentMatch >= 0 ? this.currentMatch + 1 : 0;
		this.searchMatches.textContent = !total ? 'Nada!' : `${current} of ${total}`;
		this.prevButton.disabled = this.nextButton.disabled = !total;
	}

	// BUFFER
	updateBuffer() {
		if (this.buffer.length <= this.BUFFER_SIZE) return;

		this.buffer.splice(0, this.CLEAR_COUNT);

		// Update match indices
		const originalMatchesCount = this.matches.length;
		this.matches = this.matches
			.map(idx => idx - this.CLEAR_COUNT)
			.filter(idx => idx >= 0);

		if (this.currentMatch >= 0) {
			const removedMatchesCount = originalMatchesCount - this.matches.length;
			this.currentMatch -= removedMatchesCount;
			if (this.currentMatch < 0) this.currentMatch = -1; // current match was removed
		}

		this.updateSearchUI();
		for (let i = 0; i < this.CLEAR_COUNT; i++) this.logList.firstElementChild?.remove();
	}

	toggleLoading(force) {
		this.loadingBar.style.display = force ? '' : 'none';
	}

	render() {
		return `
			<loading id="loading-bar" class="progress" style="display: none;"></loading>
			<toolbar>
				<div class="inline">
					<select id="device-select" onchange="${this.handle}.onDeviceChanged(this.value)">
						<option value="">Select a device...</option>
					</select>
					<button class="ic refresh" title="Refresh Device List" onclick="${this.handle}.refreshDevices()"></button>
				</div>

				<input type="text" id="package-input" class="inline" onchange="${this.handle}.onPackageNameChanged(this.value)" placeholder="Package Name">

				<div class="inline">
					<input type="text" id="tag-input" onchange="${this.handle}.onTagChanged(this.value)" placeholder="Tag">
					<select id="level-select" onchange="${this.handle}.onLevelChanged(this.value)">
						<option value="V">Verbose</option>
						<option value="D" selected>Debug</option>
						<option value="I">Info</option>
						<option value="W">Warning</option>
						<option value="E">Error</option>
						<option value="F">Fatal</option>
					</select>
				</div>

				<div class="inline" style="margin-left: auto;">
					<input type="search" id="search-input" onsearch="${this.handle}.search('next')" placeholder="Search">
					<span id="search-matches"></span>
					<button id="prev-button" class="ic arrow-down flip" disabled title="Previous" onclick="${this.handle}.search('prev')"></button>
					<button id="next-button" class="ic arrow-down" disabled title="Next" onclick="${this.handle}.search('next')"></button>
				</div>

				<button id="play-stop-button" class="ic play" title="Start" onclick="${this.handle}.startStop()"></button>
				<button class="ic clear" title="Clear" onclick="${this.handle}.clear()"></button>
			</toolbar>

			<main id="log-list"></main>
		`;
	}
}

customElements.define('vsc-logcat', Logcat);
