# Contributing to VIDYA

Thanks for contributing to VIDYA.

## Before You Start

- Check existing issues and pull requests before creating a new one.
- For large changes, open an issue first to discuss the idea.
- Keep pull requests focused and small when possible.

## Contribution Flow

1. Fork the repository.
2. Create a new branch from `main`.
3. Make your changes.
4. Test your changes locally.
5. Commit using clear commit messages.
6. Push your branch.
7. Open a pull request.

## Branch Naming

Use descriptive branch names such as:

- `feature/add-login`
- `fix/api-timeout`
- `docs/update-readme`

## Commit Message Style

Examples:

- `feat: add user profile endpoint`
- `fix: resolve frontend routing issue`
- `docs: improve setup instructions`

## Pull Request Rules

- Describe what changed and why.
- Link the related issue if one exists.
- Add screenshots for UI changes when relevant.
- Make sure the project builds and tests pass.
- Be respectful during review discussions.

## Coding Expectations

- Write clear and maintainable code.
- Follow the existing project structure and style.
- Avoid unrelated refactoring in the same PR.
- Add or update documentation where needed.

## Packaging Changes

For Docker or Windows packaging changes:

- Keep Docker's default host publication loopback-only.
- Preserve the non-root, read-only container runtime controls.
- Use the root `package-lock.json` and npm workspaces for production installs.
- Keep Windows installation and registry changes scoped to the current user.
- Pin and verify downloaded build inputs.
- Run `sh scripts/validate-packaging.sh` before opening a pull request.

## Reporting Bugs

Please include:

- What happened
- Expected behavior
- Steps to reproduce
- Logs or screenshots if helpful
- Environment details

## Suggesting Features

Please explain:

- The problem being solved
- Your proposed solution
- Alternative solutions considered
- Any implementation notes

## Need Help

Open a discussion or issue for clarification before starting large work.
