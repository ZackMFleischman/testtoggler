
import * as vscode from 'vscode';
import * as path from 'path';
const capitalize = require('lodash.capitalize');

const testGlob = '{-,_,.}{test,Test,tests,Tests,TEST,TESTS,spec,Spec,SPEC,specs,Specs,SPECS}.*';
const allTestFoldersGlob = `{__tests__,__test__,__spec__,__specs__,tests,specs,test,spec}`;

const findFile = (fileGlob: string) => {
  return vscode.workspace.findFiles(fileGlob, "/node_modules/", 10)
    .then(uris => {
      uris.map(uri => console.log(uri.fsPath));
      return uris.length > 0 ? uris[0] : null;
    });
  };

// If test && is javascript/typescript:
//    Extract baseFilename from test file.
//    If the grandparent folder name === baseFilename, then look for `../index.{ext}`
//    else look for `../{baseFilename}.{ext}`
//    if nothing, then look globally for {baseFilename}.{ext}, 
//
//     choices = [index.tsx, ../filename.tsx, globalSearch]
//
//     for each choice:
//        if (1) choice, then go to it.
      //  if multiple choices, then present them in a picker to the user,
      //  if no choices, try the next one in the list, and pop info message to user if there's none left.


// If source && is javascript/typescript:
//    Extract baseFilename from source file (if it's 'index', use the parent folder for this).
//    Search for baseFilename.{ts(x), js(x)} in the following


// NEXT: Get it to work for multiple file extensions.


async function openFileFrom(filePath: string) {
  const textDocument = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(textDocument);
}

const getFilenameGlobPermutations = (filename: string) => `{${filename},${filename.toLowerCase()},${filename.toUpperCase()},${capitalize(filename)}}`;

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
        await vscode.workspace.fs.stat(toUri(filePath));
        return true;
      } catch (err) {
        return false;
      }
    };

    const baseName = path.basename(currentFilename, path.extname(currentFilename));
    const baseFolder = path.relative(workspacePath, path.dirname(document.fileName));
    const parentFolderName = path.basename(path.dirname(currentFilename));

    console.log('BASE FOLDER: ' + baseFolder);

    const isTestFileRegex = /(.+)[-_\.](tests?|specs?)\..+/i;

    let fileGlob = '';
    const match = path.basename(currentFilename).match(isTestFileRegex);
    const isTestFile = match !== null;
    if (match !== null) // isTestFile
      {
        const baseNameMinusTest = match[1];
        console.log(`Is a test file! baseName = ${baseNameMinusTest}`);
        const folderName =  path.basename(path.dirname(baseFolder));

        const finalBaseName = folderName !== baseNameMinusTest ? `${baseNameMinusTest}.*` : 'index.*';
        const allBaseNames = getFilenameGlobPermutations(finalBaseName);

        fileGlob =  path.join(path.dirname(baseFolder), `${allBaseNames}`);
      } else {
        // Is a source file
        const finalBaseName = baseName === 'index' ? parentFolderName : baseName;
        const allBaseNames = getFilenameGlobPermutations(finalBaseName);

        fileGlob = path.join(baseFolder, allTestFoldersGlob, `${allBaseNames}${testGlob}`);
      }

    
    console.log(`openFileName: ${fileGlob}`);
    
    const fileUri = await findFile(fileGlob);
    // const fileUri = await findFile('**/' + openFileName);
    // const include = `**/__tests__/${parentFolderName}-test.tsx`;
    // const config = vscode.workspace.getConfiguration('testToggler');
    // console.log(`Full folder name: ${path.dirname(currentFilename)}`);

    console.log("----------------");
    console.log(`Trying to open file: ${fileUri?.fsPath}`);

    if (fileUri !== null)  {
      console.log(`File exists: ${fileUri.fsPath}`);
      await openFileFrom(fileUri.fsPath); // path.join(workspacePath, openFileName));
    }
    else  {
      console.log('File does not exist!');
      vscode.window.showErrorMessage(`Could not find ${isTestFile ? 'source' : 'test'} file for ${path.relative(workspacePath, document.fileName)}`);
      return;
    }
    console.log("----------------");



    // const include = `**/__tests__/${parentFolderName}-test.tsx`;
    // const exclude = "/node_modules/";

    // vscode.workspace.findFiles(openFileName, exclude, 10)
    //   .then((uris: vscode.Uri[]) => {
    //     uris.map(uri => uri.fsPath).forEach(
    //       file => console.log(file)
    //     );
    //   }); 

		// vscode.window.showInformationMessage('Hello World from TestToggler!');
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
