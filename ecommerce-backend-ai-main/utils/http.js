export function badRequest(res, message, code = 'BAD_REQUEST') {
  return res.status(400).json({ error: message, code });
}

export function notFound(res, message, code = 'NOT_FOUND') {
  return res.status(404).json({ error: message, code });
}

export function internalError(res, error) {
  console.error(error);
  return res.status(500).json({ error: 'Something went wrong!', code: 'INTERNAL_ERROR' });
}

export function parsePositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }
  return parsed;
}
