// The bundled build ships without a declaration of its own; heic.ts describes
// the few methods it uses, so this only has to make the import resolve.
declare module 'libheif-js/libheif-wasm/libheif-bundle.mjs' {
  const factory: (options?: Record<string, unknown>) => unknown
  export default factory
}
