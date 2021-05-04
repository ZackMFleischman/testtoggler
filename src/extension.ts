
import * as vscode from 'vscode';
import * as path from 'path';
const capitalize = require('lodash.capitalize');

const testGlob = '{-,_,.}{test,Test,tests,Tests,TEST,TESTS,spec,Spec,SPEC,specs,Specs,SPECS}.*';
const allTestFoldersGlob = `{__tests__,__test__,__spec__,__specs__,tests,specs,test,spec}`;
const isTestFileRegex = /(.+)[-_\.](tests?|specs?)\..+/i;


// const config = vscode.workspace.getConfiguration('testToggler');
export function activate(context: vscode.ExtensionContext) {

	let disposable = vscode.commands.registerCommand('extension.testToggler', async () => {
    const currentDocument = vscode.window.activeTextEditor?.document; 
    if (!currentDocument) return;

    const workspacePath = vscode.workspace.getWorkspaceFolder(currentDocument.uri)?.uri.fsPath;
    if (!workspacePath) return;

    await toggleFile(currentDocument.fileName, workspacePath);
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}

const toggleFile = async (currentFilename: string, workspacePath: string) => {
    const baseFolder = path.relative(workspacePath, path.dirname(currentFilename));

    const isCurrentFileATestMatch = path.basename(currentFilename).match(isTestFileRegex);
    const fileToFindGlobs = (isCurrentFileATestMatch !== null) ?
      getSourceFileGlobs(isCurrentFileATestMatch[1], baseFolder) :
      getTestFileGlobs(baseFolder, currentFilename);

    const file = await findFileFromGlobs(fileToFindGlobs);
    if (file)
      await openFile(file.fsPath);
    else
      vscode.window.showErrorMessage(`Could not find ${!!isCurrentFileATestMatch ? 'source' : 'test'} file for '${path.basename(currentFilename)}'.`);
};

const getSourceFileGlobs = (baseName: string, baseFolder: string) => {
  const folderName =  path.basename(path.dirname(baseFolder));

  return (folderName === baseName) ?
    [getSourceGlob(baseName, baseFolder), getSourceGlob('index', baseFolder)] : 
    [getSourceGlob(baseName, baseFolder)];
};

const getTestFileGlobs = (baseFolder: string, currentFilename: string) => {
  const baseNameNoExtensions = path.basename(currentFilename, path.extname(currentFilename));
  const parentFolderName = path.basename(path.dirname(currentFilename));
  const finalBaseName = baseNameNoExtensions === 'index' ? parentFolderName : baseNameNoExtensions;

  return [getTestGlob(finalBaseName, baseFolder)];
};

// Look through all the possible globs for the first match.
const findFileFromGlobs = async (fileGlobs: string[]) => {
  for (let i=0; i<fileGlobs.length; ++i) {
    const file = await findFileFromGlob(fileGlobs[i]);
    if (file !== null) 
      return file;
  }

  return null;
};

const findFileFromGlob = (fileGlob: string) => {
  return vscode.workspace.findFiles(fileGlob, "/node_modules/")
    .then(uris => uris.length > 0 ? uris[0] : null);
};

async function openFile(filePath: string) {
  const textDocument = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(textDocument);
}

const getFilenameGlobPermutations = (filename: string) => {
  return `{${filename},${filename.toLowerCase()},${filename.toUpperCase()},${capitalize(filename)}}`;
};

const getSourceGlob = (baseName: string, baseFolder: string): string => {
  const allBaseNames = getFilenameGlobPermutations(baseName + '.*');
  return path.join(path.dirname(baseFolder), `${allBaseNames}`);
};

const getTestGlob = (baseName: string, baseFolder: string): string => {
  const allBaseNames = getFilenameGlobPermutations(baseName);
  return path.join(baseFolder, allTestFoldersGlob, `${allBaseNames}${testGlob}`);
};