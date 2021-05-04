exports.handler = async (event, context, callback) => {
  callback({
    statusCode: 200,
    body: JSON.stringify({
      what: "Hello!"
    })
  })
}
