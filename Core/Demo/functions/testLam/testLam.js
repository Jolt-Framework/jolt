// This is a generic template for a lambda function

// Note: This is the asynchronous variety of Lambda.
//       Asynchronous processes within the function should use await syntax or promises.
//       For async processes that use the event loop (such as with setTimeout),
//       you can use the the callback function parameter to return once the process has completed

exports.handler = async (event, context, callback) => {


  // Function logic here


  // Function return value.
  // Note: body property must be valid JSON and should be stringified before it is returned
  return {
    statusCode: 200,
    body: JSON.stringify({
      hello: "world"
    })
  }
}
