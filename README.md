# Nexus

A modern, intelligent API client built with Electron, Vue 3, and TypeScript. Nexus combines powerful API testing capabilities with intelligent discovery features to streamline your API development workflow.

![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

### 🚀 Core API Client

- **HTTP Methods**: Full support for GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- **Request Building**: Comprehensive editor for headers, query parameters, and body (JSON/Text/Form-urlencoded/GraphQL)
- **Authentication**: Built-in support for Basic and Bearer token auth
- **Response Viewer**: Formatted body display, headers inspection, timing metrics
- **Monaco Editor**: Syntax-highlighted editing with auto-formatting

### 🔌 Advanced Protocol Workflows

- **GraphQL Support**: Query, variables, and operation name editing with proper request payload generation
- **WebSocket Testing**: Connect, disconnect, send messages, and inspect a live event timeline
- **Local Mock Server**: Define local routes, run a localhost mock server, and inspect captured request traffic
- **Code Generation**: Export the current request as cURL, `fetch`, or Axios snippets
- **Response Assertions**: Verify status, headers, and body content
- **Collection Runner**: Execute saved request groups sequentially with stop-on-failure behavior
- **Request Chaining**: Reuse basic `last_*` values from earlier runner steps

### 📁 Collections & Organization

- **Hierarchical Collections**: Organize requests in nested folders
- **Drag & Drop** (planned): Reorder collections and requests
- **Smart Tree View**: Expandable/collapsable collection tree with inline rename
- **Import/Export**: Import Postman Collection v2.1 JSON files

### 🌍 Environment Management

- **Multiple Environments**: Create unlimited environments (Dev, Staging, Prod, etc.)
- **Variable System**: Define variables per environment with `{{variable}}` syntax
- **Secure Variables**: Mark sensitive variables as secrets (masked in UI)
- **Active Environment**: Switch environments with a single click
- **Variable Highlighting**: Visual indicators for variables in Monaco editor

### 🔍 API Discovery

- **Automatic Spec Detection**: Probes common OpenAPI/Swagger spec locations
- **Smart Parsing**: Extracts endpoints from OpenAPI 3.x and Swagger 2.0 specs
- **Real-time Progress**: Visual progress stepper during discovery
- **One-Click Import**: Generate complete collections from discovered APIs
- **Endpoint Browser**: Browse discovered endpoints by tag/category

### 📊 Request History

- **Automatic Tracking**: All requests saved to history automatically
- **Advanced Filtering**: Filter by method, status code, or URL pattern
- **Quick Replay**: Click any history entry to reload and resend
- **Chronological View**: Recent requests sorted by execution time

### ⚡ Performance & UX

- **Fast & Native**: Built on Electron for native performance
- **Keyboard Shortcuts**:
  - `Cmd+Enter`: Send request
  - `Cmd+S`: Save request
  - `Cmd+N`: New request
  - `Cmd+L`: Focus URL bar
  - `Esc`: Cancel in-flight HTTP request or disconnect an active WebSocket session
- **Instant Startup**: SQLite database with optimized indexes
- **Responsive UI**: Tailwind CSS 4 with custom dark theme

## Tech Stack

- **Frontend**: Vue 3.5, Pinia 3, Tailwind CSS 4, Radix Vue
- **Backend**: Electron 40, Node.js
- **Database**: better-sqlite3 (local SQLite)
- **HTTP Client**: undici (high-performance HTTP)
- **Code Editor**: Monaco Editor
- **Build**: Vite, TypeScript, Electron Forge
- **Testing**: Vitest, Vue Test Utils (124 tests)

## Architecture

### Type-Safe IPC

Nexus uses a type-safe IPC bridge between the main and renderer processes:

```typescript
// shared/ipc-channels.ts defines the contract
export interface IpcChannelMap {
  "http:execute": { args: HttpRequest; return: IpcResult<HttpResponse> };
  "db:request:save": { args: SavedRequest; return: IpcResult<SavedRequest> };
  // ... all channels type-checked
}

// Renderer invokes with full type safety
const result = await window.api.invoke("http:execute", httpRequest);
```

The IPC boundary is also runtime-hardened:

- Main-process handlers validate payload shape before invoking privileged services.
- Preload event subscriptions are limited to an explicit allowlist.
- Renderer trust is restricted to the configured dev server or packaged renderer entry.
- Navigation, popup creation, and webview attachment are denied outside the trusted app surface.

### Database Schema

- **workspaces**: Project workspaces with base URLs
- **collections**: Hierarchical folders (recursive parent_id)
- **requests**: Saved API requests with full configuration
- **request_history**: Execution log with request/response snapshots
- **environments**: Named environment contexts
- **env_variables**: Key-value pairs per environment
- **discovered_endpoints**: API discovery cache

### Variable Resolution

Variables are resolved at send-time in the main process:

```typescript
// In renderer: {{base_url}}/users
// In main: Resolves to https://api.example.com/users
```

This keeps secrets (like API keys) in the main process, never exposing them to the renderer.

## Development

### Prerequisites

- Node.js 18+ with pnpm
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/Nexus.git
cd Nexus

# Install dependencies
pnpm install

# Start development server
pnpm start

# Start development server in low-disk "lean dev" mode
pnpm lean:start

# Run tests
pnpm test

# Run the desktop smoke test
pnpm test:e2e:smoke

# Build for production
pnpm package
```

### Dev Modes

#### Normal Dev

```bash
pnpm start
```

- Fastest incremental startup after the first run.
- Keeps build artifacts in the repo (for example `.vite/`) until you clean them.

#### Lean Dev (low disk)

```bash
pnpm lean:start
```

- Starts the app with an ephemeral Vite cache directory in your system temp folder.
- Automatically cleans heavy build artifacts (`.vite/`, `out/`, `dist/`, `.webpack/`) when the app exits.
- Tradeoff: slightly slower startup on each run because caches are not reused across sessions.

### Cleanup Commands

```bash
# Remove heavy build artifacts only (safe daily cleanup)
pnpm clean:heavy

# Remove all reproducible local caches (larger reset, slower next startup)
pnpm clean:full
```

- `clean:heavy` preserves dependencies to keep regular startup speed reasonable.
- `clean:full` also removes `node_modules/` and other reproducible caches, which frees more disk but requires reinstalling dependencies.

### Project Structure

```
Nexus/
├── electron/
│   ├── main/                  # Main process
│   │   ├── database/         # SQLite + migrations
│   │   ├── ipc/              # IPC handlers
│   │   └── services/         # Business logic
│   └── preload/              # Preload script (IPC bridge)
├── src/                       # Renderer process (Vue)
│   ├── components/
│   │   ├── collection/       # Collection tree
│   │   ├── discovery/        # API discovery UI
│   │   ├── environment/      # Environment switcher
│   │   ├── history/          # History panel
│   │   ├── layout/           # App shell
│   │   ├── request/          # Request editor
│   │   ├── response/         # Response viewer
│   │   └── ui/               # Shared UI components
│   ├── composables/          # Vue composables
│   ├── stores/               # Pinia stores
│   └── styles/               # Global CSS
├── shared/                    # Shared types between main/renderer
└── tests/                     # Test suite (84 tests)
```

## Roadmap

### Phase 1 ✅ Complete

- [x] HTTP client with all methods
- [x] Request/response editors
- [x] Monaco integration
- [x] Persistence layer
- [x] Test suite (43 tests)

### Phase 2+3 ✅ Complete

- [x] Hierarchical collections
- [x] Environment management with variables
- [x] Variable resolution system
- [x] Request history with filtering
- [x] API discovery engine
- [x] Postman collection import
- [x] Comprehensive test coverage (84 tests)

### Phase 4 🔜 Planned

- [x] GraphQL support (query, variables, operation name)
- [x] WebSocket testing
- [x] Mock server
- [x] Request chaining/scripting (basic `last_*` variable extraction in collection runner)
- [x] Code generation (cURL, fetch, axios)
- [x] Response assertions
- [x] Collection runner (sequential + stop-on-failure option)
- [ ] Team collaboration features (deferred)
- [ ] Cloud sync (deferred)

## Testing

Nexus has comprehensive test coverage:

```bash
pnpm test
```

- **124 automated tests** across unit, component, shared-security, and Electron helper coverage
- **1 Playwright Electron smoke test** covering app boot, mode switching, and mock-server traffic
- Unit tests for stores, services, and database
- Component tests for UI elements and workspace mode switching
- Browser-backed desktop smoke coverage for the compiled Electron app
- Shared/runtime validation tests for the IPC trust boundary
- Fixtures for Postman collections and OpenAPI specs

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: add some amazing feature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Acknowledgments

Built with Claude Code - Anthropic's official CLI for Claude.

---

**Note**: Nexus is under active development. Features and APIs may change.
