export function getPort(value = process.env.PORT) {
  if (value === undefined || value === '') return 3000;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new RangeError('PORT must be a whole number between 1 and 65535');
  }
  return port;
}