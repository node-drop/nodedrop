# Contributing to Node-Drop

Thank you for your interest in contributing to Node-Drop! 🎉

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/nodedrop.git
   cd nodedrop
   ```
3. **Set up the development environment**:
   ```bash
   cp .env.example .env
   npm install
   npm run docker:setup
   ```

## Development Workflow

### Branch Naming
- `feature/` - New features (e.g., `feature/slack-integration`)
- `fix/` - Bug fixes (e.g., `fix/workflow-save-error`)
- `docs/` - Documentation updates
- `refactor/` - Code refactoring

### Making Changes

1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and test them:
   ```bash
   npm run test
   ```

3. Commit with clear messages:
   ```bash
   git commit -m "feat: add Slack node integration"
   ```

### Commit Message Format
We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Formatting, no code change
- `refactor:` - Code restructuring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

## Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass
4. Update the README if you've added new features
5. Submit your PR with a clear description

## Code Style

- Use TypeScript for all new code
- Follow existing code patterns
- Run linting before committing
- Keep functions small and focused

## Creating Custom Nodes

See [backend/docs/CUSTOM_NODES.md](backend/docs/CUSTOM_NODES.md) for the node development guide.

## Reporting Issues

When reporting bugs, please include:
- Node.js version
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Error messages/logs

## Questions?

Open a [Discussion](https://github.com/node-drop/nodedrop/discussions) for questions or ideas.

## Code of Conduct

Be respectful and inclusive. We're all here to build something great together.

---

Thank you for contributing! 🚀
