class Logcat extends HTMLElementBase {
	autoScroll = true;
	isPlaying = false;

	BUFFER_SIZE = 50000;
	buffer = [];

	connectedCallback() {
		super.render(this.render());

		this.logList.onscroll = () => {
			this.autoScroll = (this.logList.scrollTop + this.logList.clientHeight) >= this.logList.scrollHeight;
		};
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
		this.logList.insertAdjacentHTML('beforeend', `
			<entry class="${log.priority}">
				<timestamp>${log.timestamp}</timestamp>
				<tag>${log.tag}</tag>
				<message>${log.message}</message>
			</entry>
		`);
	}

	// FIND
	find(dir) {
		const q = this.searchInput.value;
		// string, caseSensitive, backwards, wrapAround, wholeWord, searchInFrames, showDialog
		window.find(q, false, dir == 'prev', true, false, false);
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
					<input type="search" id="search-input" onsearch="${this.handle}.find('next')" placeholder="Search">
					<span id="search-matches">0 of 0</span>
					<button class="ic arrow-down flip" title="Previous" onclick="${this.handle}.find('prev')"></button>
					<button class="ic arrow-down" title="Next" onclick="${this.handle}.find('next')"></button>
				</div>

				<button id="play-stop-button" class="ic play" title="Start" onclick="${this.handle}.startStop()"></button>
				<button class="ic clear" title="Clear" onclick="${this.handle}.clear()"></button>
			</toolbar>

			<main id="log-list"></main>
		`;
	}
}

customElements.define('vsc-logcat', Logcat);
