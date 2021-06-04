const logRequest = (req, _, next) => {
  console.log(`${req.method} to ${req.url}`);
  next();
}

module.exports = logRequest;
