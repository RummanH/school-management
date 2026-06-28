export function errorHandler() {
  return (error, _req, res, _next) => {
    console.error(error);
    const status = error.status || 500;
    res.status(status).json({ message: error.message || "Internal server error." });
  };
}
