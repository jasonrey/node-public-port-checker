module.exports = input => {
  const ports = []

  input
    .split(',')
    .map(port => {
      const [start, end] = port.split('-').map(val => parseInt(val))

      if (end) {
        return Array.from({ length: 1 + end - start }, (val, key) => start + key)
      }

      return [start]
    })
    .map(port => ports.push(...port))

  return ports.filter(port => !isNaN(port))
}
