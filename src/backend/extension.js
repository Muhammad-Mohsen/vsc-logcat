const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

const vsc = require('./core/vsc');
const AdbService = require('./core/adb-service');
const MainViewProvider = require('./main-view-provider');

let currentPanel = undefined;
let adb = new AdbService();

/** @param {vscode.ExtensionContext} context */
function activate(context) {

	// Status Bar Item
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	statusBarItem.command = 'vsc-logcat.open';
	statusBarItem.text = '$(bug)';
	statusBarItem.tooltip = 'Open Android Logcat';
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

	const provider = new MainViewProvider(context);
	vsc.registerWebViewProvider(context, 'mingit-main-view',
		provider,
		{ webviewOptions: { retainContextWhenHidden: true }
	});

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
				adb.stop();
			}, null, context.subscriptions);

			// Handle messages from the webview
			currentPanel.webview.onDidReceiveMessage(
				async message => {
					switch (message.command) {
						case 'getDevices':
							try {
								const devices = await adb.listDevices();
								currentPanel.webview.postMessage({ command: 'devices', devices });
							} catch (error) {
								vscode.window.showErrorMessage('Failed to list devices: ' + error.message);
							}
							break;
						case 'startLog':
							adb.start(message.deviceId);
							break;
						case 'stopLog':
							adb.stop();
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
	adb.on('log', (log) => {
		if (currentPanel) {
			currentPanel.webview.postMessage({ command: 'log', log });
		}
	});

	adb.on('error', (err) => {
		if (currentPanel) {
			currentPanel.webview.postMessage({ command: 'error', error: err });
		}
	});
}

function getWebviewContent(extensionPath) {
	const frontendPath = vscode.Uri.file(path.join(extensionPath, 'frontend'));
	const htmlPath = path.join(extensionPath, 'frontend', 'index.html');

	let htmlContent = fs.readFileSync(htmlPath, 'utf8');

	// Replace links with vscode-resource uris
	// This is a naive replacement, but should work for our simple structure
	// We need to transform relative paths in the HTML to webview Uris

	// Helper to get webview URI
	const getUri = (relativePath) => {
		return currentPanel.webview.asWebviewUri(vscode.Uri.file(path.join(extensionPath, 'frontend', relativePath)));
	};

	// We can't just read the file and serve it directly because of the resource paths.
	// Instead of regex replacing everything, let's construct the HTML here for simplicity or replace specific known tags.
	// Since request said "no build step", we will inject the paths.

	// Better approach: use <base> tag or replacement.
	// Let's replace simple script and link tags.

	htmlContent = htmlContent.replace(/(href|src)="\.\/([^"]*)"/g, (match, attr, filepath) => {
		return `${attr}="${getUri(filepath)}"`;
	});

	return htmlContent;
}

function deactivate() {
	if (adb) {
		adb.stop();
	}
}

module.exports = {
	activate,
	deactivate
}
