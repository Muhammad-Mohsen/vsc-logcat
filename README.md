# VSCode Logcat

## Core Features

TODO

## Usage

### Main View


## Visual Studio Marketplace

TODO

## Release Notes

### 1.0.0
- Initial release.

## Prompt
Act as a Senior Full Stack Developer.
create a vscode extension called VSC Logcat.

*The Goal:* the extension will display the logcat logs of a connected android device.
*Code Structure:* there should be two top-level folders: `backend` and `frontend`.
*The Stack:* 1. Backend: vanilla javascript, child_process. 2. Frontend: vanilla javascript with native web components.
*Core Requirements:*
1. extension will search for connected android devices.
2. when the user selects a device, the extension will display the logcat logs of the selected device.
3. the user will be able to filter the logcat logs by log level (e.g. verbose, debug, info, warn, error, fatal, silent) and by package name (e.g. com.android.chrome).
4. the user will be able to search the logs using a search bar.
5. the user will be able to start and stop the logcat process.
6. the user will be able to clear the logs.
7. the user will be able to export the logs to a file.
* General Requirements:*
DO NOT include a build step (tsc).
DO NOT use tailwindcss.
the styling should be minimal using css variables.
the code should be straight forward and easy to understand.
keep the dependencies at a minimum.
assume that adb is already installed on the target machine and is added to the PATH.