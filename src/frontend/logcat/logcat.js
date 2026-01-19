class Logcat extends HTMLElementBase {
	autoScroll = true;
	isPlaying = false;

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
				<tag>${log.tag}</tag>
				<timestamp>${log.timestamp}</timestamp>
				<message>${log.message}</message>
			</entry>
		`);
	}

	toggleLoading(force) {
		this.loadingBar.style.display = force ? '' : 'none';
	}

	render() {
		return `
			<loading id="loading-bar" class="progress" style="display: none;"></loading>
			<toolbar>
				<select id="device-select" onchange="${this.handle}.onDeviceChanged(this.value)">
					<option value="">Select a device...</option>
				</select>
				<button class="ic refresh" title="Refresh Device List" onclick="${this.handle}.refreshDevices()"></button>

				<input type="text" id="package-input" onchange="${this.handle}.onPackageNameChanged(this.value)" placeholder="Package Name">

				<input type="text" id="tag-input" onchange="${this.handle}.onTagChanged(this.value)" placeholder="Tag">
				<select id="level-select" onchange="${this.handle}.onLevelChanged(this.value)">
					<option value="V">Verbose</option>
					<option value="D" selected>Debug</option>
					<option value="I">Info</option>
					<option value="W">Warning</option>
					<option value="E">Error</option>
					<option value="F">Fatal</option>
				</select>

				<input type="search" id="search-input" onchange="${this.handle}.onSearchChanged(this.value)" placeholder="Search">
				<button class="ic arrow-up" title="Previous" onclick="${this.handle}.findPrevious()"></button>
				<button class="ic arrow-up flip" title="Next" onclick="${this.handle}.findNext()"></button>

				<button id="play-stop-button" class="ic play" title="Start" onclick="${this.handle}.startStop()"></button>
				<button class="ic clear" title="Clear" onclick="${this.handle}.clear()"></button>
			</toolbar>

			<main id="log-list"></main>
		`;
	}
}

customElements.define('vsc-logcat', Logcat);
