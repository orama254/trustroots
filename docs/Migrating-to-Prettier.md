<!-- @format -->

# Migrating files to new Prettier formatter

[Prettier](https://prettier.io/) is an opinionated code formatter that we use to format JavaScript, HTML and Markdown files.

- We have a git-commit hook which automatically formats your code just before commit lands using `npm run reformat-files [files]` command.
- Only files with `/** @format */` pragma in them will get formatted, the rest will stay untouched.
- You can reformat files manually with `npm run prettify [files-glob]` (see instructions below)

## Workflow for migrating files

- Run for files:
  ```bash
  npm run prettify file.js
  ```
- Run for folders:
  ```bash
  npm run prettify folder/*.js
  ```
- Test the section you've formatted manually.
- Commit your files and open a pull request.
