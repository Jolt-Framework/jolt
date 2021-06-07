const createCallback = (callbackStatus, cleanup, res) => {
  return async (lambdaErr, lambdaResponse) => {
    callbackStatus.sent = true;
    cleanup();

    // In case lambda returns it own custom error with callback
    if (lambdaErr) {
      res.status(500).send(JSON.stringify(lambdaErr)); 
    } else {
      try {
        // Ensuring that the response body was stringified
        if (lambdaResponse.body) {
          JSON.parse(lambdaResponse.body);
        }

        res
          .status(lambdaResponse.statusCode || 200)
          .send(lambdaResponse.body || "");
      } catch (err) {
        console.log(err.message);
        res.status(500).send({error:err.message}); 
      }
    }
  }
}

module.exports = createCallback;
