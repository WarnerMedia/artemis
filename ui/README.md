# 🛡️ Artemis UI

Web UI for Artemis source code security scanner.

## 📖 Contents

- [🛡️ Artemis UI](#️-artemis-ui)
  - [📖 Contents](#-contents)
  - [🏠 Local Development](#-local-development)
    - [🚀 Quick Start](#-quick-start)
    - [🎨 Customization](#-customization)
    - [✅ Prerequisites](#-prerequisites)
      - [🐚 Native Development](#-native-development)
      - [🚢 Container Development](#-container-development)
    - [🏃‍♂️ Scripts](#️-scripts)
    - [🌎 Browser Plugins](#-browser-plugins)
    - [🧩 IDE Plugins](#-ide-plugins)
    - [📝 IDE Config](#-ide-config)
    - [🐛 Debugging](#-debugging)
    - [🗺️ Project Layout / Where Things Live](#️-project-layout--where-things-live)
  - [🚢 Initial Deployment](#-initial-deployment)
  - [🥇 Code Style / Standards](#-code-style--standards)
    - [🛡️ Secure Coding](#️-secure-coding)
    - [🛠️ Development Patterns](#️-development-patterns)
    - [🕛 Dates/Times/Zones](#-datestimeszones)
    - [🇬🇷 Internationalization (i18n)](#-internationalization-i18n)
    - [♿ Accessibility (a11y)](#-accessibility-a11y)
    - [🖌️ UX Patterns](#️-ux-patterns)
    - [🔢 Misc Process](#-misc-process)
  - [🤖 Technologies](#-technologies)
  - [🧪 Testing](#-testing)
    - [Testing Gotchas](#testing-gotchas)
    - [Creating a Test Component](#creating-a-test-component)
  - [🔍 Other Resources](#-other-resources)
  - [License](#license)

## 🏠 Local Development

### 🚀 Quick Start

If you already have [prerequisites](#-prerequisites) installed, after cloning this project you can get up and running by:

```shell
npm ci
npm start
```

This should install all project dependencies, start the app in development mode, and open a new web browser tab for [http://localhost:3000](http://localhost:3000).  
Note: The UI will "hot reload" in development mode when code changes are made.

### 🎨 Customization

Once you have the project running, you will want to customize it to meet your needs. This includes:

1. Review the `.env.*` files in the project root directory and modify to meet your requirements
2. Populate the variables in the `nonprod.mk` and `prod.mk` Makefiles to match your deployment
3. Customize the `homepage` field in `package.json` to match your deployment. Refer to [create-react-app documentation](https://create-react-app.dev/docs/deployment/#step-1-add-homepage-to-packagejson)
4. Review and customize files in the `src/custom` directory to meet the requirements of your application, such as customizing the application logo, page footer, welcome message, and data export message
   - Search for "REPLACE ME" strings
5. Populate the `public` directory with any files you want to add, such as `favicon.ico`

### ✅ Prerequisites

The following steps describe how to bootstrap this project for development on a Mac .  
For Windows or Linux development, comparable steps exist, omitting certain utilities like Homebrew.

1. Install a terminal emulator, like [iTerm](https://iterm2.com/)
2. Install an IDE with support for ECMAScript, React, Redux language features or plugins, such as [Visual Studio Code](https://code.visualstudio.com/)
3. Install [Homebrew](https://brew.sh/), a package manager for many of the tools we will be using
4. Install [Node via NVM](#-native-development)
5. Install Python 3
6. Install a container management tool, such as [Docker Desktop](https://www.docker.com/products/docker-desktop)
7. Install Git. This can be accomplished by installing Apple XCode from the App Store, via Homebrew, or [directly](https://git-scm.com/download/mac)
8. Clone _this_ GitHub project
9. Install [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
10. Install [Terraform](https://www.terraform.io/) via Homebrew or [directly](https://www.terraform.io/downloads.html)
11. Install [pipenv](https://pypi.org/project/pipenv/) via pip3
    - `pip3 install -g pipenv`

#### 🐚 Native Development

To develop natively in the shell:

1. Install Node Version Manager (nvm)
   - `brew install nvm`
   - Instead of installing node directly for your user or globally, I like to use nvm to manage node versions
   - This allows you to maintain multiple sandboxed versions of node in order to migrate code to newer versions
   - Note: Ensure you follow any additional install instructions to create a nvm working directory and add nvm path to your current shell
   - Useful nvm commands:
     - `nvm ls` - list currently installed and available versions of Node.js in multiple streams (stable, unstable, etc.)
     - `nvm install [version|--lts]` - install a specific Node.js version or latest LTS release
     - `nvm use [version]` - use a particular version of Node.js
     - `nvm alias default [version]` - make a particular version of Node.js the default
     - `nvm uninstall [version]` - uninstall version of Node.js
2. Install Node.js
   - `nvm install --lts`
   - This will install the latest [LTS release](https://nodejs.org/en/about/releases/) of Node.js and make it the default if you don't have other versions installed
   - It's recommended to use an LTS release when developing an enterprise app so that you receive maintenance updates for this version for the longest duration
   - Node install includes facilities for package management (npm) and for running node package binaries (npx)
   - Note: The Node version of the project is maintained in the file [.nvmrc](./.nvmrc)
3. Update NPM to latest version
   1. `npm install -g npm@latest`
   2. Note: you may need to do this periodically to update to latest npm and also rev the version in [Dockerfile.dev](./Dockerfile.dev)
      1. If you update your Node version, such as via `nvm install new_version --reinstall-packages-from=old_version`, so may need to reinstall the latest version of NPM
4. Install jq (command-line JSON parser), used in Makefile for parsing `package.json`)
   - `brew install jq`
5. Install linters used by project that aren't covered by NPM:
   - `brew install hadolint`
6. Install all project dependencies
   - `npm ci` or `make install`

#### 🚢 Container Development

To develop in a Docker container:
This will run the UI webserver in a container.

1. Build the container and run it:
   - `make run`

If you need to run utilities for linting, code checking, or auditing dependencies, run the container shell using `make exec` and then run the commands from this shell (see [Scripts section](#️-scripts) below).

### 🏃‍♂️ Scripts

In the project directory, you can run:

1. `npm start` or `yarn start` or `make start`
   Runs the app in development mode.  
   This should also open a new web browser tab for [http://localhost:3000](http://localhost:3000).
   The page will reload if you make edits.  
   You will also see any lint errors in the console.
2. `npm test` or `yarn test` or `make test`
   Launches the test runner in interactive watch mode.
3. `npm run build` or `yarn build` or `make build|dist|all`
   Builds the app for production to the `build` folder.  
   It correctly bundles React in production mode and optimizes the build for the best performance.
   The build is minified, and the filenames include the hashes, ready for deployment.
4. `npm run lint` or `make lint`
   Run code linting (ESLint).
5. `npm outdated` or `make outdated`
   View out-of-date packages/libraries.
6. `npm audit` or `yarn audit` or `make audit`
   Audit packages/libraries for vulnerabilities.
7. `npm run prettier-check` or `make check`
   Run code standards check (prettier). Outputs results but doesn't make changes to source files.
8. `npm run prettier-write` or `make fix`
   Run code standards fix (prettier). Modifies source files to match standards.
9. `make precommit`
   Runs all checks: lint, audit, prettier-check.
10. `npm run extract` or `make extract`
    I18N: Uses LingUI to extract messages from source code into message catalogs (GNU gettext .po files).
    Messages will be written to `locales/en/messages.po`.
11. `npm run compile` or `make compile`
    I18N: Uses LingUI to compile message catalogs into a messages.js file that can be read by the application for text translations.
12. 🛑 **DO NOT** run `npm run eject` or `yarn eject`
    This project and its dependencies are currently managed by `create-react-app` choices for WebPack.  
    Running eject will disconnect this so that WebPack, Babel, ESLint, and other configs can be configured directly.  
    **This is a one-way operation, once you eject you can't go back!**

### 🌎 Browser Plugins

The following browser plugins help you debug/profile your React/Redux code:

- React Developer Tools
  - [Chrome](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi) | [Mozilla](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)
    - There is a somewhat obscure option in React DevTools located in Components [dev tools tab]>Gear>"Break on warnings" that will cause a breakpoint whenever a warning is generated by a React component. This can be quite useful in debugging various React component warnings
- Redux DevTools
  - [Chrome](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd) | [Mozilla](https://addons.mozilla.org/en-US/firefox/addon/reduxdevtools/)

### 🧩 IDE Plugins

The following IDE plugins are for VSCode:

- EditorConfig for VS Code
- ESLint
- hadolint
- Markdownlint
- Prettier

### 📝 IDE Config

The following IDE settings apply to VSCode.

Change the following settings:

- ENABLE Editor format on save `editor.formatOnSave`
- Change default MacOS terminal app `terminal.external.osxExec` to `iTerm.app`

The following settings should have defaults we want (no changes required):

- [Prettier settings](https://prettier.io/docs/en/options.html) (these can also be configured in `prettier.config.js` file in the project root)
  - Print width: 80 characters
  - Tab Width: 2
  - Use Editor Config: true (checked)
  - Trailing Comma: es5
  - Use Double Quotes
  - End lines with Semicolon
  - Use Tabs: true (checked)
- ESLint ENABLED
  - ESLint formatter `eslint.format.enable` DISABLED
- TypeScript formatter `typescript.format.enable` ENABLED

### 🐛 Debugging

- [Debugging in the IDE](https://create-react-app.dev/docs/setting-up-your-editor#debugging-in-the-editor)
  - If using VSCode IDE, you essentially just need to add the following to the `configurations` section of your `launch.json` file:

  ```json
    {
      "name": "Chrome",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/src",
      "sourceMapPathOverrides": {
        "webpack:///src/*": "${webRoot}/*"
      }
    }
  ```

  - You can modify the `url` value to reference a subpage if you want the debugger to launch that subpage

- [Debugging Tests](https://create-react-app.dev/docs/debugging-tests)
  - If using VSCode IDE, you essentially just need to add the following to the `configurations` section of your `launch.json` file:

  ```json
    {
      "name": "Debug CRA Tests",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "${workspaceRoot}/node_modules/.bin/react-scripts",
      "args": ["test", "--runInBand", "--no-cache", "--watchAll=false", "TESTNAME"],
      "cwd": "${workspaceRoot}",
      "protocol": "inspector",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "env": { "CI": "true", "DEBUG_PRINT_LIMIT": "100000" },
      "disableOptimisticBPs": true
    }
  ```

  - Replace TESTNAME with the name of the test you want to run, e.g. `HiddenFindingDialog`
  - `DEBUG_PRINT_LIMIT` environment variable will print more lines of DOM output if a test fails, helping you better identify why your test didn't pass
  - `CI=true` will stop after running the test instead of re-running the test(s) when files change
  - If running your tests from the shell, this test run equates to `CI=true DEBUG_PRINT_LIMIT=100000 npm run test TESTNAME`

- [Debugging Formik]
  - Formik form state can be viewed/debugged using the React Developer Tools. Look for the component named `FormikContext.Provider` in the React Components tab of the browser debugger.

### 🗺️ Project Layout / Where Things Live

Project layout is based on Create React App standards for a React project.

- Images, manifest, and index files live in the `public` directory
- All code lives in the `src` directory
  - Within `src`, API calls (business logic) reside in `api` folder
  - `app` contains "global app things" like the root store, root reducer, root saga, Navbar that is on every page, etc.
  - `components` contain re-usable components that have no data model tied to them, like data tables (e.g. `EnhancedTable`), custom form fields, etc.
  - `features` contains code for particular types of data in the app (such as notifications, scans, users, etc.). This may or may not also contain a component for using this type of data
  - `locale` contains app message catalogs. These are not edited manually but are created through build automation
  - `pages` contains SPA (single-page-application) pages, such as the `MainPage` (where you can create/view scans), and `ResultsPage` where you view results for a single scan
  - `utils` contains utility functions (not components). For example, functions for formatting dates in a particular style
  - `custom` contains any internal customizations, for example, support for a metadata schema

Tests should be created in the same directory as the code it tests and have the same name + "test". For example, a test for `App.tsx` is in the same directory as `App.tsx` and named `App.test.tsx`.

## 🚢 Initial Deployment

1. Create a new environment in `terraform/environments`, copying the example and modifing as needed.
2. Deploy the Terraform: `terraform -chdir=terraform/environments/ENV apply`
3. Update `ENV.mk`, where `ENV` matches the Terraform environment name.
4. Install the `npm` packages: `npm install`
5. Deploy the UI to S3: `make deploy`

## 🥇 Code Style / Standards

This project is using the following checks for code style and standards:

- ESLint - JavaScript linting
- Prettier - JavaScript code style
- NPM Audit - JavaScript dependency vulnerability auditing
- Hadolint - Dockerfile linting
- Markdownlint - Markdown linting

### 🛡️ Secure Coding

- [Snyk: 10 React Security Best Practices](https://snyk.io/blog/10-react-security-best-practices/) - Good overview of security considerations when writing a React app
- [Snyk: 10 npm Security Best Practices](https://snyk.io/blog/ten-npm-security-best-practices/) - Good recommendations for using npm in a project more securely
- Any other standards/best practice guides related to the current application stack (JavaScript, React, Redux, etc.)

### 🛠️ Development Patterns

- [Think in React](https://reactjs.org/docs/thinking-in-react.html)
- [Composition over inheritance](https://reactjs.org/docs/composition-vs-inheritance.html)
- Keep components small and function-specific
- Avoid creating new components to minimum required
  - Follow the "rule of 3" when abstracting a reused piece of code into a utility function or separate component
- Capitalize component names
- Use [React Hooks](https://reactjs.org/docs/hooks-intro.html)
- Use [Yup for validation](https://github.com/jquense/yup) (both user input and data returned from APIs)
- Use [Redux Sagas](https://redux-saga.js.org/) for side effect management
  - This also forces you to think in terms of using hooks for effect management, instead of `await dispatch(...)` and responding to blocking state change calls, respond to state changes in `useEffect` hooks
- [Use CSS in JavaScript](https://material-ui.com/customization/components/#overriding-styles-with-classes)
- [Lists should have keys](https://reactjs.org/docs/lists-and-keys.html)

### 🕛 Dates/Times/Zones

Dates/times in API fields should use UTC time zone and [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format.
It is up to the UI to "translate" that time so that the user always sees dates and times displayed in THEIR time zone.
This is accomplished by using [Luxon library](https://moment.github.io/luxon/) for date/time management.
At the moment, all dates/times are just being displayed in the time zone of the user's browser (usually the user's OS), which doesn't really require a library like Luxon.
However, in the future, we may allow the user to set the time zone they want dates/times displayed in, and this will require Luxon support.
Follow all existing code patterns where Luxon is being used for date/time management.

### 🇬🇷 Internationalization (i18n)

All text strings displayed in the UI should be handled so that they can be translated at a later time.
We are currently using the LinguiJS library to accomplish this ([refer to their usage documentation](https://lingui.js.org/)).

- Basic usage
  - Use `<Trans>>...</Trans>` as a component child, e.g. `<div><Trans>This is marked for translation</Trans></div>`
  - Use ` i18n._(t``...``) ` for text in component attributes, e.g. ` <Tooltip title={i18n._(t``Translated Tooltip Text``)}></Tooltip> `
- Design for translation
  - Different languages have different sentence structure, so don't concatenate text strings to form a sentence, e.g. `"this " + "breaks " + "translation"`
  - Design with space in mind: some languages may have longer or shorter representation for a piece of text, so allow elements to grow/shrink accordingly

### ♿ Accessibility (a11y)

UI should be designed to support accessibility features.
This includes but is not limited to:

- You can navigate to items on the page via keyboard alone
- Color should not be used alone to represent an idea, but should be accompanied by other descriptive text and/or icons
- Adjacent colors used on the page should be easily distinguishable (imagine viewing the page in black-and-white and whether the two colors would be distinguishable)
- Text/content on the screen should be resizable
- Use proper document elements and hierarchy for elements (e.g. use `<header>`, `<footer>`, `<h1>`, ... as they are designed to be used. Prefer to use specific element types `<button>` over a generic `div` with button styling)
- Use `wai-aria` (also known as just `aria`) attributes where applicable. Follow any specific guidance provided in Material UI documentation for components ([such as this](https://material-ui.com/components/alert/#accessibility))
- Display temporary status items like alert for a long enough duration for them to be read or provide an option for the user to close them

For a complete reference, refer to the [Web Content Accessability Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/).

### 🖌️ UX Patterns

- Follow [Material design standards](https://material.io/design)
  - E.g. Main action buttons have additional styling (icons, color), whereas secondary buttons (dialogs, "Cancel" are unadorned)
- Don't create designs that require use of tabs-within-tabs or dialogs-within-dialogs
  - If you are in a dialog and need to confirm an action "Delete this item?", replace the existing dialog content with this content, don't create a new dialog
- Don't hide data unless necessary (for clarity or screen real-estate)
  - E.g. if displaying user information in a list, also list null/blank/undefined items so it's clear these were unset
- Omit data an average user doesn't need to perform their tasks
- Destructive actions should have user confirmation (e.g. confirm a user wants to remove an item before removing it)

### 🔢 Misc Process

- Features should be tested (AND include automated tests where possible)
  - Create mocks in `src/api/server.ts` for local dev testing
  - Also test against real Artemis APIs/data
- Ensure the application version is updated with each change (in [package.json](package.json) and [package-lock.json](./package-lock.json)). Use semver.
- PR pushes should not fail automated checks
- All new and existing tests should PASS

## 🤖 Technologies

The following technologies are used in the production of this UI:

- [Axios](https://github.com/axios/axios) - HTTP request client
- [AutoSuggest-Highlight](https://github.com/moroshko/autosuggest-highlight) - Highlight matched characters in form Autocomplete field
- [Formik](https://formik.org/) (+[Formik-Material-UI](https://github.com/stackworx/formik-material-ui)) - React form management
- [Jest](https://jestjs.io/) - Testing framework
- [LingUI](https://lingui.js.org/) - Internationalization
- [Luxon](https://moment.github.io/luxon/) - Date/time management
- [Material-UI](https://material-ui.com/) - Design system and components for React
- [MirageJS](https://miragejs.com/) - API mocking library for development and testing
- [Nano ID](https://github.com/ai/nanoid) - A secure, unique string ID generator, used for "server-side" mocking of unique ids
- [Query-String](https://github.com/sindresorhus/query-string) - Parse and stringify URL query strings
- [Random-Material-Color](https://github.com/isuru88/random-material-color) - Generation of a random color compatible with Material-UI palette
- [React](https://reactjs.org/)
- [React-Copy-To-Clipboard](https://github.com/nkbt/react-copy-to-clipboard) - Copy content to the clipboard
- [React-Draggable](https://github.com/STRML/react-draggable) - Component for making elements draggable (such as dialog windows)
- [React-Redux](https://react-redux.js.org/) (+[Redux-Toolkit](https://redux-toolkit.js.org/)) - Predictable state management for React
- [React-Router/React-Router-DOM](https://reactrouter.com/) - SPA Router for React + DOM binding
- [React-Syntax-Highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter) - Code snippet syntax highlighting and formatting
- [React-Testing-Library](https://testing-library.com/) - DOM-based testing library
- [Recharts](http://recharts.org/) - Charting library for React
- [Redux Logger](https://github.com/LogRocket/redux-logger) - Dev logging for Redux
- [Redux-Saga](https://redux-saga.js.org/) - Manage application side-effects like fetching data
- [TSS-React](https://www.tss-react.dev/) - Material UI deprecated JSS-based styling in favor of Emotion-based styling in MUIv5. TSS-React allows you to continue to use JSS styling syntax (e.g., `makeStyles`, `withStyles`) while being a small translation-layer over Emotion-based styling
- [TypeScript](https://www.typescriptlang.org/) - Language extensions to ECMAScript that adds strong typings, allowing you to catch errors earlier in development
- [Typeface Roboto](https://fonts.google.com/specimen/Roboto) - Typeface recommended for use with Material-UI
- [Yup](https://github.com/jquense/yup) - Validate user input against a schema (recommended by authors of Formik for form field validation)

## 🧪 Testing

DOM-based tests are written in React-Testing-Library which is built on top of Jest.
Non-DOM-based tests are straight Jest.

Testing References:

- [How to Test React Components: the Complete Guide](https://www.freecodecamp.org/news/testing-react-hooks/) - Good intro to front-end testing
- [Jest Expect Matchers](https://jestjs.io/docs/expect#tobevalue) - What application states you can test for
- [User-event](https://github.com/testing-library/user-event) - Prefer user-event to "fire event" in your testing as a higher level of user-oriented abstraction
- [DOM-Testing-Library Cheatsheet](https://testing-library.com/docs/dom-testing-library/cheatsheet#queries) - Helps differentiate different DOM selection methods
- [React-Testing-Library Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library/) - Avoid common RTL mistakes
- [Debugging Tests](https://create-react-app.dev/docs/debugging-tests/) - Howto debug tests in Chrome browser and Visual Studio Code
- Testing Examples:
  - [Testing Library examples](https://testing-library.com/docs/example-codesandbox)
  - [React Testing](https://react-testing-examples.com/jest-rtl/)
  - [Formik Form Testing](https://testing-library.com/docs/example-react-formik/)

Code coverage reports are generated when tests run. Coverage reports can be viewed in the `coverage` directory, specifically `coverage/lcov-report/index.html`.

### Testing Gotchas

- When testing form field entry, unless you are creating separate tests for entering different values, you may need to clear previously entered form field data before entering new data using [userEvent.clear](https://testing-library.com/docs/ecosystem-user-event/#clearelement) or the `{backspace}` option in [userEvent.type](https://testing-library.com/docs/ecosystem-user-event/#typeelement-text-options)
- When firing userEvents in a form, you may need to `waitFor` an expected change to complete. Otherwise, you may see the warning: `Warning: You seem to have overlapping act() calls`
- Use the [correct query](https://testing-library.com/docs/react-testing-library/cheatsheet#queries). For example, if testing an element does not exist in the DOM, use `queryBy*` instead of `getBy*`
- Prefer more-specific queries (such as `*ByRole`, `*ByTitle`, `*byLabel`) to a general query (such as `*ByText`) as this also tests element type and not just a string found in the DOM. Only use `*ByTestId` as a last-resort if there are no other options
- Use `within` if you want to find a node within another node [see documentation](https://testing-library.com/docs/react-testing-library/cheatsheet#other)

### Creating a Test Component

Often the most difficult aspect to creating UI-based automated tests is visualizing the actions taken during test to determine what's missing or incorrect.
To address this you can create a `src/pages/TestPage.tsx` component and have it return the component you want to test with different attributes passed-in. Next, add this page to an app route in `src/App.tsx` (i.e. `<Route exact path="/test" component={TestPage} />`). You can then manually test using your local dev server at your new application test route [https://localhost:3000/test](https://localhost:3000/test).

## 🔍 Other Resources

- [Analyzing app bundle size](https://create-react-app.dev/docs/analyzing-the-bundle-size/)
- [Measuring app performance](https://create-react-app.dev/docs/measuring-performance/)
- [Optimizing app performance](https://reactjs.org/docs/optimizing-performance.html)
- [Introducing the React profiler](https://reactjs.org/blog/2018/09/10/introducing-the-react-profiler.html)

## License

This repository is released under [the MIT license](https://en.wikipedia.org/wiki/MIT_License).  View the [local license file](../LICENSE).
