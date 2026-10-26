if (process.versions && typeof process.versions.node === 'string') {
  const parts = process.versions.node.split('.').map(Number);
  if (parts[0] === 20 && parts[1] < 9) {
    Object.defineProperty(process.versions, 'node', { value: '20.9.0', configurable: true });
  }
}
