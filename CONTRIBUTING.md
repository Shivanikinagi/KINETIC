# Contributing to Kinetic Marketplace

Thank you for your interest in contributing to Kinetic! This document provides guidelines for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow the project's coding standards

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes
6. Commit with clear messages
7. Push to your fork
8. Open a Pull Request

## Development Setup

```bash
# Install dependencies
pip install -e .
cd web && npm install

# Run tests
pytest

# Run linters
ruff check .
mypy .
```

## Coding Standards

### Python
- Follow PEP 8
- Use type hints
- Write docstrings for functions
- Keep functions focused and small
- Add tests for new features

### JavaScript
- Use ES modules
- Follow modern JavaScript practices
- Add JSDoc comments
- Keep functions pure when possible

### Commits
- Use clear, descriptive commit messages
- Reference issues when applicable
- Keep commits focused on single changes

## Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass
4. Update CHANGELOG.md
5. Request review from maintainers

## Areas for Contribution

- Bug fixes
- New features
- Documentation improvements
- Test coverage
- Performance optimizations
- UI/UX enhancements

## Questions?

Open an issue or reach out to the maintainers.

Thank you for contributing! 🎉
