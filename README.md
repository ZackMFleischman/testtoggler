# testtoggler VSCode extension

This extension auto-magically switches between the tests for a source file and back at the touch of a keyboard shortcut (default is Mac: cmd+shift+t, Win/Linux: ctrl+shift+t).

<img src="https://raw.githubusercontent.com/ZackMFleischman/testtoggler/main/images/demo.gif" width="400" height="auto" />

## Features

It uses several strategies to try and locate the corresponding source/test files, and toggles to the file the first time one is matched.

### Strategies

1. Test file is in a tests folder adjacent to the source.

```
ParentFolder
  |- tests
  |  |- filename.test.ts
  |
  |- filename.ts
```

2. Test file is parallel tests directory starting from the root.

```
ProjectRoot
  |- src
  |   |- GrandparentFolder
  |      |- ParentFolder
  |         |- filename.ts
  |
  |- tests
  |   |- GrandparentFolder
  |      |- ParentFolder
  |         |- filename.test.ts
```

3. Global search across the entire workspace for file that matches the naming pattern.

**NOTES:**

- The pattern used to determine a test name given a source name is configurable, but has several defaults that likely will just work. (e.g. `filename-Test.ts`, `filename_specs.rb` `filename.Tests.jsx` all work out of the box).
- The pattern used to determine a test folder name is configurable, but also has several defaults that likely will just work. (e.g. `tests`, `__tests__`, `specs`, `__specs__` all work out of the box).
- The global search as the fallback pattern will usually find what you want, but may have multiple hits, in which case these options are displayed to you to choose which one you want.

## Extension Settings

- `testToggler.testFileSuffix`: If your codebase uses a non-standard test file naming pattern, you can specify it here. e.g. `baseFileName-test.e2e.tsx` -> `-test.e2e`
- `testToggler.testFolderName`: If your codebase usees a non-standard test folder naming pattern, you can specify it here. e.g. `_AcceptanceTests`
- `testToggler.confirmOnSinglePossibilityWhenUnsure`: This will ask you to confirm a single test/source file when the program is not confident it is the correct one before it toggles to it. This may happen during the global search fallback, which may produce false negatives in large codebases.

## Release Notes

See the [CHANGELOG](./CHANGELOG.md).
