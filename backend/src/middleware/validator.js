export function validateQueryParams(requiredParams) {
  return (req, res, next) => {
    const missing = requiredParams.filter(param => !req.query[param]);
    if (missing.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Missing required query parameters: ${missing.join(', ')}`
      });
    }
    next();
  };
}

export function validateBodyParams(requiredParams) {
  return (req, res, next) => {
    const missing = requiredParams.filter(param => !req.body[param]);
    if (missing.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Missing required body parameters: ${missing.join(', ')}`
      });
    }
    next();
  };
}
