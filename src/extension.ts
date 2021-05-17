
import * as vscode from 'vscode';
import * as path from 'path';
const capitalize = require('lodash.capitalize');

const extensionName = 'testToggler';

const testGlob = '{-,_,.}{test,Test,tests,Tests,TEST,TESTS,spec,Spec,SPEC,specs,Specs,SPECS}';
const allTestFoldersGlob = `{__tests__,__test__,__spec__,__specs__,tests,specs,test,spec,Test,Spec,Tests,Specs}`;
const isTestFileRegex = /(.+)[-_\.](tests?|specs?)\..+/i;

const excludeFromFileSearch = "/node_modules/";


export function activate(context: vscode.ExtensionContext) {
	let testTogglerDisposable = vscode.commands.registerCommand(`extension.${extensionName}`, async () => {
    const currentDocument = vscode.window.activeTextEditor?.document; 
    if (!currentDocument) return;

    const workspacePath = vscode.workspace.getWorkspaceFolder(currentDocument.uri)?.uri.fsPath;
    if (!workspacePath) return;

    await toggleFile(currentDocument.fileName, workspacePath);
	});

	context.subscriptions.push(testTogglerDisposable);
}

export function deactivate() {}

const toggleFile = async (currentFilename: string, workspacePath: string) => {
    const parentFolder = path.relative(workspacePath, path.dirname(currentFilename));
    const isCurrentFileATestMatch = isCurrentFileATestFile(path.basename(currentFilename));

    // Get the file patterns to search for.
    const fileGlobs = (isCurrentFileATestMatch !== null) ?
      getSourceFileGlobs(currentFilename, parentFolder, isCurrentFileATestMatch[1]) :
      getTestFileGlobs(currentFilename, parentFolder);

    const file = await findFileFromGlobs(fileGlobs, workspacePath, currentFilename, isCurrentFileATestMatch !== null);
    if (file)
      await openFile(file.fsPath);
    else
      vscode.window.showWarningMessage(`Could not find ${!!isCurrentFileATestMatch ? 'source' : 'test'} file for '${path.basename(currentFilename)}'.`);
};

const getConfigValue = (propertyName: string) => vscode.workspace.getConfiguration(extensionName).get(propertyName);

const isCurrentFileATestFile = (currentBasename: string) => {
  // Check the custom test file suffix too.
  const customTestFileSuffix = getConfigValue('testFileSuffix');
  if (customTestFileSuffix) {
    const regex = new RegExp(`(.+)${customTestFileSuffix}\..+`, 'i');
    const match = regex.exec(currentBasename);
    if (match !== null)
      return match;
  }  

  return currentBasename.match(isTestFileRegex);
};

const getSourceFileGlobs = (currentFilename: string, parentFolder: string, baseName: string) => {
  const extension = path.extname(currentFilename);
  const allBaseNames = getFilenameGlobPermutations(baseName);
  const grandparentFolderPath = path.dirname(parentFolder);
  const grandparentFolderName =  path.basename(grandparentFolderPath);
  const sourceGlobs = [];

  /** Strategy 1: test has same name as source, but with a suffix (e.g. -test).
   *      grandparentFolder
   *        |- __tests__
   *        |    |-baseName-test.tsx
   *        |- baseName.tsx
   */
  sourceGlobs.push(path.join(grandparentFolderPath, `${allBaseNames}.*`));

  /** Strategy 2: test has same name as `grandparentFolder`, but source is named index.*
   *      grandparentFolder (This is `baseName`) 
   *        |- __tests__
   *        |    |-baseName-test.tsx
   *        |- index.tsx
   */
  if (grandparentFolderName === baseName)
    sourceGlobs.push(path.join(grandparentFolderPath, 'index.*'));

  /** Strategy 3: source and tests are in parallel folder hierarchies, and tests have a suffix.
   *    src/path/to/baseName.rb
   *    spec/path/to/baseName_spec.rb
   */
  sourceGlobs.push(getSourceFromFullTestPath(allBaseNames, parentFolder));


  sourceGlobs.push(path.join('**', `${allBaseNames}${extension}`));

  return sourceGlobs;
};

const getSourceFromFullTestPath = (allBaseNames: string, parentFolder: string) => {
  // Remove the top-level folder since that would be `spec` or `tests` or something.
  const [_, ...sourcePath] = parentFolder.split(path.sep); 
  return path.join('**', sourcePath.join(path.sep), allBaseNames + '.*');
};

const getTestFileGlobs = (currentFilename: string, parentFolder: string) => {
  const extension = path.extname(currentFilename);
  const baseNameNoExtensions = path.basename(currentFilename, extension);
  const parentFolderName = path.basename(path.dirname(currentFilename));
  const finalBaseName = baseNameNoExtensions === 'index' ? parentFolderName : baseNameNoExtensions;
  const testGlobs: string[] = [];
  const customTestFileSuffix: string = getConfigValue('testFileSuffix') as string;

  /** Strategy 1:  Test is same name as parentFolder or the file itself with a suffix, located in a sibling tests folder.
   *      parentFolderName
   *        |- __tests__
   *        |    |-baseName-test.tsx
   *        |- baseName.tsx || index.tsx
   */
  testGlobs.push(path.join(parentFolder, allTestFoldersGlob, `${getAllTestGlobPermutations(finalBaseName)}.*`));
  if (customTestFileSuffix)
    testGlobs.push(path.join(parentFolder, allTestFoldersGlob, `${getAllTestGlobPermutations(finalBaseName, customTestFileSuffix)}.*`));

  const customTestFolderName = getConfigValue('testFolderName') as string;
  if (customTestFolderName) {
    testGlobs.push(path.join(parentFolder, customTestFolderName, `${getAllTestGlobPermutations(finalBaseName)}.*`));
    if (customTestFileSuffix)
      testGlobs.push(path.join(parentFolder, customTestFolderName, `${getAllTestGlobPermutations(finalBaseName, customTestFileSuffix)}.*`));
  }

  /** Strategy 2: Test is in a parallel hierarchy path.
   *   src/path/to/baseName.rb
   *   spec/path/to/baseName_spec.rb
   */
  testGlobs.push(getTestFromFullSourcePath(finalBaseName, parentFolder));
  if (getConfigValue('testFileSuffix'))
    testGlobs.push(getTestFromFullSourcePath(finalBaseName, parentFolder, getConfigValue('testFileSuffix') as string));

  /** Strategy 3: Global search for test file as source file + suffix.
   *   baseName.rb -> baseName_spec.rb
   */
  testGlobs.push(path.join('**', `${getAllTestGlobPermutations(finalBaseName)}${extension}`));
  if (getConfigValue('testFileSuffix'))
    testGlobs.push(path.join('**', `${getAllTestGlobPermutations(finalBaseName, getConfigValue('testFileSuffix') as string)}${extension}`));

  return testGlobs;
};

const getTestFromFullSourcePath = (baseName: string, parentFolder: string, customSuffix?: string) => {
  // Remove the top-level folder since that would be `src` or `libs` or something.
  const [_, ...sourcePath] = parentFolder.split(path.sep); 
  return path.join('**', sourcePath.join(path.sep), `${getAllTestGlobPermutations(baseName, customSuffix)}.*`);
};

// Look through all the possible globs for the first match.
const findFileFromGlobs = async (fileGlobs: string[], workspacePath: string, currentFilename: string, lookingForSourceFile: boolean) => {
  const normalStrategyGlobs = fileGlobs.slice(0, fileGlobs.length-1);
  const globalSearchStrategy = fileGlobs[fileGlobs.length-1];

  for (let i=0; i<normalStrategyGlobs.length; ++i) {
    const file = await findFileFromGlob(normalStrategyGlobs[i]);
    if (file !== null && file.fsPath !== currentFilename) 
      return file;
  }

  // Our fallback strategy is the global search, which isn't always accurate.
  // If there are any hits here, present them to the user with a picker.
  return findFileFromGlobAndGiveChoices(globalSearchStrategy, workspacePath, lookingForSourceFile) || null;
};

const findFileFromGlob = (fileGlob: string) => {
  return vscode.workspace.findFiles(fileGlob, excludeFromFileSearch)
    .then(uris => uris.length > 0 ? uris[0] : null);
};

const findFileFromGlobAndGiveChoices = (fileGlob: string, workspacePath: string, lookingForSourceFile: boolean) => {
  return vscode.workspace.findFiles(fileGlob, excludeFromFileSearch)
    .then(async uris => {
      if (uris.length === 0) return null;

      if (uris.length === 1 && !getConfigValue('confirmOnSinglePossibilityWhenUnsure'))
        return vscode.Uri.file(uris[0].fsPath);

      // Present choices.
      const selectedPath = await vscode.window.showQuickPick(uris.map(uri => ({
        label: path.basename(uri.fsPath),
        description: path.relative(workspacePath, uri.fsPath)
      })), {
        placeHolder: `Possible ${lookingForSourceFile ? 'source' : 'test'} file${uris.length === 1 ? '' : 's'} found.`
      });
      if (selectedPath) return vscode.Uri.file(path.join(workspacePath, selectedPath.description));
      else return null;
    });
};

async function openFile(filePath: string) {
  const textDocument = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(textDocument);
}

const getFilenameGlobPermutations = (filename: string) => {
  return `{${filename},${filename.toLowerCase()},${filename.toUpperCase()},${capitalize(filename)}}`;
};

const getAllTestGlobPermutations = (baseName: string, customSuffix?: string) => `${getFilenameGlobPermutations(baseName)}${customSuffix ? customSuffix : testGlob}`;