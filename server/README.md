# Police N Thief multiplayer server

Colyseus server for the browser prototype. Requires Node.js 24+.

From the repository root:

```powershell
npm run server:install
npm run dev:online
```

See [the multiplayer guide](../docs/MULTIPLAYER.md) for joining from phones,
architecture, tests, and future deployment configuration.

The server owns gameplay state and Mall physics. The browser sends input intent
and renders shared state. No original Unreal project files are used at runtime.
