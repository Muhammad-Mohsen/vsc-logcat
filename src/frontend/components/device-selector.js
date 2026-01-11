class DeviceSelector extends HTMLElement {
	constructor() {
		super();
		this.devices = [];
		this.select = document.createElement('select');
	}

	connectedCallback() {
		this.select.addEventListener('change', () => {
			this.dispatchEvent(new CustomEvent('device-changed', {
				detail: { deviceId: this.select.value },
				bubbles: true
			}));
		});
		this.appendChild(this.select);
	}

	setDevices(devices) {
		this.devices = devices;
		this.render();
	}

	render() {
		this.select.innerHTML = '<option value="">Select a device...</option>';
		this.devices.forEach(device => {
			const option = document.createElement('option');
			option.value = device.id;
			option.textContent = `${device.id} (${device.type}) - ${device.details}`;
			this.select.appendChild(option);
		});
	}

	getSelectedDevice() {
		return this.select.value;
	}
}

customElements.define('device-selector', DeviceSelector);
