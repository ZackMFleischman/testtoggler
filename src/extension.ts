
import * as vscode from 'vscode';
import * as path from 'path';



async function openFileFrom(filePath: string) {
  const textDocument = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(textDocument);
}


export function activate(context: vscode.ExtensionContext) {

	let disposable = vscode.commands.registerCommand('extension.testToggler', async () => {
    const document = vscode.window.activeTextEditor?.document; 
    if (!document) return;

    const currentFilename = document.fileName;

    const workspacePath = vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath;
    if (!workspacePath)
      return;

    const toUri = (relativeWorkspacePath: string) => vscode.Uri.file(path.join(workspacePath, relativeWorkspacePath));
    const fileExists = async (filePath: string) => {
      try {
        await vscode.workspace.fs.stat(toUri(filePath))
        return true;
      } catch (err) {
        return false;
      }
    }

    const baseName = path.basename(currentFilename, path.extname(currentFilename));
    const baseFolder = path.relative(workspacePath, path.dirname(document.fileName));
    const parentFolderName = path.basename(path.dirname(currentFilename));

    console.log('BASE FOLDER: ' + baseFolder);

    let openFileName = '';
    const isTestFile = /.*-test\.ts/.test(path.basename(currentFilename));
    if (isTestFile)
      {
        console.log('Is a test file!');
        const baseNameMinusTest = baseName.slice(0, baseName.length-5);
        const folderName =  path.basename(path.dirname(baseFolder));

        if (folderName !== baseNameMinusTest)
          openFileName =  path.join(path.dirname(baseFolder), `${baseNameMinusTest}.tsx`);
        else 
          openFileName =  path.join(path.dirname(baseFolder), `index.tsx`);
      } else {
        console.log('Is a source file!');
        if (baseName === 'index') {
          console.log('Current file is an index file!');
          console.log(`Looking for ./__tests__/${parentFolderName}-test.tsx`);
          openFileName = path.join(baseFolder, '__tests__', `${parentFolderName}-test.tsx`);
        } else {
          openFileName = path.join(baseFolder, '__tests__', `${baseName}-test.tsx`);
        }
      }



    // const config = vscode.workspace.getConfiguration('testToggler');


    console.log(`Full folder name: ${path.dirname(currentFilename)}`);
    console.log("----------------");
    console.log(`Trying to open file: ${openFileName}`);

    if (await fileExists(openFileName))  {
      console.log(`File exists: ${openFileName}`);
      await openFileFrom(path.join(workspacePath, openFileName));
    }
    else  {
      console.log('File does not exist!');
      return;
    }
    console.log("----------------");



    // const include = `**/__tests__/${parentFolderName}-test.tsx`;
    const exclude = "/node_modules/";

    vscode.workspace.findFiles(openFileName, exclude, 10)
      .then((uris: vscode.Uri[]) => {
        uris.map(uri => uri.fsPath).forEach(
          file => console.log(file)
        );
      }); 

		// vscode.window.showInformationMessage('Hello World from TestToggler!');
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
