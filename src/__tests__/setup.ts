import '@testing-library/jest-dom'

// Suppress console.error noise in tests (e.g. React prop-type warnings)
const originalError = console.error
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const msg = String(args[0] ?? '')
    if (
      msg.includes('Warning:') ||
      msg.includes('ReactDOM.render') ||
      msg.includes('act(')
    ) return
    originalError(...args)
  }
})
afterAll(() => { console.error = originalError })

// Mock import.meta.env for tests
Object.defineProperty(import.meta, 'env', {
  value: { DEV: false, PROD: true, MODE: 'test' },
  writable: true,
})

// Stub canvas for jsdom (ImageCompressor needs document.createElement('canvas'))
HTMLCanvasElement.prototype.getContext = (() => ({
  drawImage: () => {},
  fillRect: () => {},
})) as unknown as typeof HTMLCanvasElement.prototype.getContext

HTMLCanvasElement.prototype.toDataURL = (_type?: string, _quality?: number) =>
  'data:image/jpeg;base64,/9j/fakeCompressedData=='
