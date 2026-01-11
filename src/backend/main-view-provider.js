const vscode = require('vscode');

const vsc = require('./core/vsc');
const git = require('./core/git');
const util = require('./core/utils');

module.exports = class MainViewProvider {

	#view
	#extensionURI;

	constructor(context) {
		this.#extensionURI = context.extensionUri;
	}

	// MESSAGING
	async #onMessage(event) {
		try {
			// event: { type: string, data: any }
			switch (event.type) {
				case 'openfolder':
					vsc.executeCommand('vscode.openFolder');
					break;

			}

		} catch (err) {
			vsc.showErrorPopup(err.message || err);
		}
	}
	async onContext(message) {
		try {
			switch (message.command) {
				case 'openFile':
					await vsc.executeCommand('vscode.open', vsc.joinPath(git.getRepoPath(), message.body.fsPath));
					break;
			}
		} catch (err) {
			vsc.showErrorPopup(err.message || err);
		}
	}
	#postMessage(message) {
		this.#view?.webview?.postMessage(message);
	}

	async resolveWebviewView(webviewView) {
		this.#view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this.#extensionURI],
		}
		webviewView.webview.html = await this.#render(webviewView.webview);
		webviewView.webview.onDidReceiveMessage((message) => this.#onMessage(message));
	}

	/** @param {vscode.Webview} webview */
	async #render(webview) {
		const uri = (path) => webview.asWebviewUri(vscode.Uri.joinPath(this.#extensionURI, path));
		const nonce = util.getNonce(); // Use a nonce to only allow...umm...because they said to use a nonce

		return `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="img-src https: data:; style-src 'unsafe-inline' ${webview.cspSource};">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${uri('src/frontend/css/reset.css')}" rel="stylesheet">
				<link href="${uri('src/frontend/css/vscode.css')}" rel="stylesheet">
				<link href="${uri('src/frontend/css/iconly.css')}" rel="stylesheet">
				<link href="${uri('src/frontend/css/seti.css')}" rel="stylesheet">

				<link href="${uri('src/frontend/components/toolbar/toolbar.css')}" rel="stylesheet">
				<link href="${uri('src/frontend/components/welcome/welcome.css')}" rel="stylesheet">
				<link href="${uri('src/frontend/components/commit-list/commit-list.css')}" rel="stylesheet">
				<link href="${uri('src/frontend/components/change-list/change-list.css')}" rel="stylesheet">

				<script nonce="${nonce}" type="module" src="${uri('src/frontend/core/html-element-base.js')}"></script>
				<script nonce="${nonce}" type="module" src="${uri('src/frontend/components/welcome/welcome.js')}"></script>
				<script nonce="${nonce}" type="module" src="${uri('src/frontend/components/toolbar/toolbar.js')}"></script>
				<script nonce="${nonce}" type="module" src="${uri('src/frontend/components/commit-list/commit-list.js')}"></script>
				<script nonce="${nonce}" type="module" src="${uri('src/frontend/components/change-list/change-list.js')}"></script>

			</head>
	  		<body data-vscode-context='{ "preventDefaultContextMenuItems": true }'>
				<logcat></logcat>
			</body>
			</html>
		`;
	}
}
