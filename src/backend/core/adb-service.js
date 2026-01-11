const { spawn, exec } = require('child_process');
const { platform } = require('os');
const EventEmitter = require('events');

class ADBService extends EventEmitter {
	logcatProcess;

	listDevices() {
		return new Promise((resolve, reject) => {
			exec('adb devices -l', (error, stdout, stderr) => {
				if (error) return reject(error);

				// sample: R5CX912W25A            device product:e3qxxx model:SM_S928B device:e3q transport_id:1
				const lines = stdout.split('List of devices attached').pop().trim()
					.split('\n').map(l => l.trim()).filter(l => l);

				const devices = lines.map(line => {
					const { id, model } = line.match(/(^\w+)|(model:\w+)/g);
					return { id, model, raw: line };
				});

				resolve(devices);
			});
		});
	}

	getUID(packageName) {
		return new Promise((resolve, reject) => {
			const filter = platform() == 'win32' ? 'FINDSTR' : 'grep';
			exec(`adb shell dumpsys package ${packageName} | ${filter} uid`, (error, stdout, stderr) => {
				if (error) return reject(error);

				// sample: uid=10520 gids=[] type=0 prot=signature
				const uid = stdout.trim().match(/uid=(\d+)/)?.[1];
				uid ? resolve(uid) : reject('Package not found.');
			});
		});
	}

	start({ deviceId, uid, filters }) {
		this.stop();

		const args = [
			'-s', deviceId, // -s: serial number
			'logcat',
			uid ? `-u ${uid}` : '',
			...filters // {tag}:{priority}
		]
		.filter(a => a);

		console.log(`Starting logcat: adb ${args.join(' ')}`);

		this.logcatProcess = spawn('adb', args);

		this.logcatProcess.stdout.on('data', (data) => {
			const lines = data.split('\n');
			lines.forEach(line => {
				line = line.trim();
				if (!line) return;

				// date, invocation time, PID, TID, priority, tag, tag, message
				// 01-07 18:53:20.285  2882  2882 I SemMdnieManagerService: DisplayListener onDisplayChanged. mAlwaysOnDisplayEnabled : true , mDisplayOn : true , mDisplayState : 2 , mWorkBlueFilter : true , mNightModeBlock : true
				const parts = line.match(/^(\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\.\d{3})\s+(\d+)\s+(\d+)\s+([VDIWEF])\s+([^:]+):\s+(.*)$/);

				this.emit('log', {
					timestamp: parts[1],
					pid: parts[2],
					tid: parts[3],
					priority: parts[4],
					tag: parts[5],
					message: parts[6]
				});
			});
		});

		this.logcatProcess.stderr.on('data', (data) => {
			console.error(`adb stderr: ${data}`);
			this.emit('error', data);
		});

		this.logcatProcess.on('close', (code) => {
			console.log(`adb process exited with code ${code}`);
			this.emit('closed', code);
		});
	}

	stop() {
		this.logcatProcess?.kill();
		this.logcatProcess = null;
	}
}

module.exports = ADBService;
