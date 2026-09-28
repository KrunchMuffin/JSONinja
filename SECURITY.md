# Security Policy

## Supported Versions

Only the [latest release](https://github.com/KrunchMuffin/JSONinja/releases/latest) receives security fixes. Please update before reporting (**Help > Check for Updates**); your version is shown in **Help > About JSONinja**.

## Reporting a Vulnerability

Please **don't** open a public issue for security problems. Instead, [report it privately on GitHub](https://github.com/KrunchMuffin/JSONinja/security/advisories/new). Only the maintainer can see the report.

Helpful details to include:

- The app version and your operating system
- What an attacker could do, and what they need (for example, "the victim opens a crafted `.json` file")
- Steps or a sample file that reproduce it

This is a small project maintained in spare time, so responses are best-effort. You'll get an acknowledgement once the report has been read, and credit in the release notes if you'd like it.

## Scope

Examples of what's in scope:

- A JSON file, or a file name, that runs script in the viewer
- Ways for the page to read or write files the user didn't open
- Problems with the installer, the Windows file registration, or the release builds
- Ways to get an installed copy to accept an update that wasn't signed by the project

Issues in third-party components (Tauri, WebView2, WebKit/WebKitGTK) are best reported to those projects, but let us know too if they affect this app.
