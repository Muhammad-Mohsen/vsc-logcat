const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const AdbService = require('./core/adb-service');

let currentPanel = undefined;
let adbService = new AdbService();

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('VSC Logcat is active');

	// Status Bar Item
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.command = 'vsc-logcat.open';
	statusBarItem.text = '$(bug) Logcat';
	statusBarItem.tooltip = 'Open Android Logcat';
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

	// Command to open webview
	let disposable = vscode.commands.registerCommand('vsc-logcat.open', () => {
		if (currentPanel) {
			currentPanel.reveal(vscode.ViewColumn.Bottom);
		} else {
			currentPanel = vscode.window.createWebviewPanel(
				'vscLogcat',
				'Android Logcat',
				vscode.ViewColumn.Bottom,
				{
					enableScripts: true,
					localResourceRoots: [
						vscode.Uri.file(path.join(context.extensionPath, 'frontend'))
					],
					retainContextWhenHidden: true
				}
			);

			currentPanel.webview.html = getWebviewContent(context.extensionPath);

			currentPanel.onDidDispose(() => {
				currentPanel = undefined;
				adbService.stop();
			}, null, context.subscriptions);

			// Handle messages from the webview
			currentPanel.webview.onDidReceiveMessage(
				async message => {
					switch (message.command) {
						case 'getDevices':
							try {
								const devices = await adbService.listDevices();
								currentPanel.webview.postMessage({ command: 'devices', devices });
							} catch (error) {
								vscode.window.showErrorMessage('Failed to list devices: ' + error.message);
							}
							break;
						case 'startLog':
							adbService.start(message.deviceId);
							break;
						case 'stopLog':
							adbService.stop();
							break;
					}
				},
				undefined,
				context.subscriptions
			);
		}
	});

	context.subscriptions.push(disposable);

	// Forward logs to webview
	adbService.on('log', (log) => {
		if (currentPanel) {
			currentPanel.webview.postMessage({ command: 'log', log });
		}
	});

	adbService.on('error', (err) => {
		if (currentPanel) {
			currentPanel.webview.postMessage({ command: 'error', error: err });
		}
	});
}

function getWebviewContent(extensionPath) {
	// The frontend path is relative to the extension root, which is passed in.
	const frontendPath = vscode.Uri.file(path.join(extensionPath, 'frontend'));
	const htmlPath = path.join(extensionPath, 'frontend', 'index.html');

	let htmlContent = fs.readFileSync(htmlPath, 'utf8');

	const getUri = (relativePath) => {
		return currentPanel.webview.asWebviewUri(vscode.Uri.file(path.join(extensionPath, 'frontend', relativePath)));
	};

	htmlContent = htmlContent.replace(/(href|src)="\.\/([^"]*)"/g, (match, attr, filepath) => {
		return `${attr}="${getUri(filepath)}"`;
	});

	return htmlContent;
}

function deactivate() {
	if (adbService) {
		adbService.stop();
	}
}

module.exports = {
	activate,
	deactivate
}
