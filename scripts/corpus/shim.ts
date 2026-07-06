// Import this FIRST in any entrypoint that pulls in app modules. ES imports are
// hoisted and run before top-level statements, so the browser-global stubs must
// live in their own module that is imported ahead of the app code. The app only
// touches localStorage inside initData()/the store (never reached here), but we
// stub it defensively so a stray import can't crash a Node build.
(globalThis as any).localStorage ??= {
  getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {},
};
