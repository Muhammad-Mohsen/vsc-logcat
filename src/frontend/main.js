import './components/device-selector.js';
import './components/log-list.js';

const vscode = acquireVsCodeApi();

const deviceSelector = document.getElementById('device-selector');
const logList = document.getElementById('log-list');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const btnClear = document.getElementById('btn-clear');
const btnExport = document.getElementById('btn-export');

const filterSearch = document.getElementById('filter-search');
const filterPackage = document.getElementById('filter-package');
const filterLevel = document.getElementById('filter-level');

// Request initial device list
vscode.postMessage({ command: 'getDevices' });

// Event Listeners
document.addEventListener('device-changed', (e) => {
	const deviceId = e.detail.deviceId;
	if (deviceId) {
		// Auto start or just ready? Requirement: selects device, displays logs.
		// Let's stop current and start new
		vscode.postMessage({ command: 'startLog', deviceId });
		updateControls(true);
	} else {
		vscode.postMessage({ command: 'stopLog' });
		updateControls(false);
	}
});

btnStart.addEventListener('click', () => {
	const deviceId = deviceSelector.getSelectedDevice();
	if (deviceId) {
		vscode.postMessage({ command: 'startLog', deviceId });
		updateControls(true);
	}
});

btnStop.addEventListener('click', () => {
	vscode.postMessage({ command: 'stopLog' });
	updateControls(false);
});

btnClear.addEventListener('click', () => {
	logList.clear();
});

btnExport.addEventListener('click', () => {
	// We need to send logs back to extension to save
	// Or we could trigger a save command.
	// For simplicity, let's just send the raw text of current view
	// But logs might be huge.
	// Better: Extension/Backend implementation of export?
	// Requirement 7: user will be able to export logs.
	// Let's implement a 'copy to clipboard' or 'save to file' from the extension side.
	// For now, let's just create a blob and download it?
	// VS Code webview download can be tricky.
	// Easiest is to send the logs (or request extension to save internal buffer) to extension.
	// Since backend isn't buffering everything, only frontend has the "view" of logs.
	// Let's aggregate logs in frontend and save.

	const content = logList.logs.map(l => l.raw).join('\n');
	// Create element to download
	const blob = new Blob([content], { type: 'text/plain' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = 'logcat.txt';
	a.click();
	URL.revokeObjectURL(url);
});

[filterSearch, filterPackage, filterLevel].forEach(el => {
	el.addEventListener('input', updateFilters);
});

function updateFilters() {
	logList.setFilters(
		filterSearch.value,
		filterPackage.value,
		filterLevel.value
	);
}

function updateControls(running) {
	btnStart.disabled = running;
	btnStop.disabled = !running;
	deviceSelector.style.opacity = running ? 0.7 : 1;
	// deviceSelector.style.pointerEvents = running ? 'none' : 'auto'; // Optional: lock selector while running
}

// Handle messages
window.addEventListener('message', event => {
	const message = event.data;
	switch (message.command) {
		case 'devices':
			deviceSelector.setDevices(message.devices);
			break;
		case 'log':
			logList.addLog(message.log);
			break;
		case 'error':
			console.error('ADB Error:', message.error);
			logList.addLog(`[ERROR] ${message.error}`);
			break;
	}
});
