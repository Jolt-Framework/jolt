exports.handler = (event) => {
  return {
    statusCode: 200,
    body: {
      event,
    }
  }
}
