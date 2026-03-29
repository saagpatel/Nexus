# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-03-22

### Added
- Scaffold Electron Forge + Vue 3 + TypeScript project
- Tailwind CSS layout shell and type-safe IPC bridge
- SQLite database layer with migrations and query modules
- URL bar, HTTP execution, and Pinia stores
- Response viewer with body, headers, and timeline tabs
- Request editor with params, headers, body, and auth tabs
- Monaco editor for body editing and response viewing
- Persistence layer for saving/loading requests
- Keyboard shortcuts, vitest setup, and test suite
- Collection/environment/discovery backend: CRUD, IPC, services
- Pinia stores for collections tree, environments, history, discovery
- Collection tree, environment switcher, history panel, discovery UI
- Tests for variable resolver, postman importer, stores, migration
- Advanced API workflows and release gates
- Lean dev mode and cleanup scripts

### Fixed
- Restore history panel type safety and add regression tests
- Unblock bot PRs and main verification
- Quiet release workflow on main pushes

### Changed
- Bootstrap codex tests and docs defaults
- Prune non-functional project bloat
- Bump ajv and minimatch transitive versions
- Comprehensive README with features, architecture, and roadmap
