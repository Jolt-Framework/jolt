// Template for a typical lambda handler.

// Note: This is the asynchronous variety of Lambda.
//       Asynchronous processes within the function should use await syntax or promises.
//       For async processes that use the event loop (such as with setTimeout), you can use the the callback function parameter to return once the process has completed

exports.handler = async (event, context, callback) => {

  // Function logic here

  return {
    statusCode: 200,
    body: JSON.stringify({
      Goodbye: "world"
    })
  }
}
