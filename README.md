# md-client

A lightweight, fast Markdown editor built with **Tauri 2**, **React 19**, and **CodeMirror 6**.

<!-- TODO: Add screenshot here -->
<!-- ![Screenshot](./docs/screenshot.png) -->

## Features

- **Live Preview** — Real-time split-view with synchronized scrolling
- **Multi-Tab Editing** — Open and edit multiple files simultaneously
- **Syntax Highlighting** — Code blocks with language-aware highlighting
- **GFM Support** — Tables, task lists, strikethrough, and more
- **Drag & Drop** — Drop `.md` files directly into the editor
- **Keyboard Shortcuts** — Ctrl+S save, Ctrl+O open, Ctrl+W close tab
- **Native Performance** — Rust-powered backend via Tauri 2
- **Dark Theme** — One Dark theme for the editor

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Tauri 2](https://v2.tauri.app/) |
| Frontend | [React 19](https://react.dev/) + TypeScript |
| Editor | [CodeMirror 6](https://codemirror.net/) via [@uiw/react-codemirror](https://github.com/uiwjs/react-codemirror) |
| Preview | [react-markdown](https://github.com/remarkjs/react-markdown) + remark/rehype plugins |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| Build | [Vite 7](https://vite.dev/) |

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Yarn](https://yarnpkg.com/) >= 1.22
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- Platform-specific Tauri dependencies — see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/lin51kevin/md-client.git
cd md-client

# Install dependencies
yarn install

# Run in development mode
yarn tauri dev

# Build for production
yarn tauri build
```

## Project Structure

```
md-client/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility libraries
│   ├── App.tsx             # Main application
│   ├── types.ts            # TypeScript types
│   └── constants.ts        # Constants & defaults
├── src-tauri/              # Tauri (Rust) backend
│   ├── src/                # Rust source
│   ├── capabilities/       # Permission configuration
│   ├── icons/              # App icons
│   └── tauri.conf.json     # Tauri configuration
└── package.json
```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a PR.

## License

This project is licensed under the [MIT License](LICENSE).
