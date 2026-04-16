# Contributing to MarkLite

Thank you for your interest in contributing!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/<your-username>/md-client.git`
3. Create a branch: `git checkout -b feat/my-feature`
4. Install dependencies: `yarn install`
5. Start dev server: `yarn tauri dev`

## Development

- **Frontend**: React 19 + TypeScript in `src/`
- **Backend**: Rust in `src-tauri/src/`
- **Styling**: Tailwind CSS 4

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: resolve bug
docs: update documentation
refactor: code restructuring
chore: maintenance tasks
```

## Pull Requests

1. Keep PRs focused on a single change
2. Update documentation if needed
3. Ensure `yarn build` and `yarn tauri build` pass
4. Describe your changes clearly in the PR description

## Reporting Issues

- Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) for bugs
- Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) for ideas
- Include steps to reproduce for bug reports

## Code Style

- TypeScript for all frontend code
- Prefer immutable patterns (spread operator, avoid mutation)
- Use functional components and hooks
- Keep files under 400 lines

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
