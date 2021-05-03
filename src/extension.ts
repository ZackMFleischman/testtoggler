import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	let disposable = vscode.commands.registerCommand('extension.testToggler', () => {
		vscode.window.showInformationMessage('Hello World from TestToggler!');
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
