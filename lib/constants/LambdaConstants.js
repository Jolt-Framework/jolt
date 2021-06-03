const Constants = {
  FUNCTION_ARCHIVE_EXTENSION: ".zip",
  FUNCTION_HANDLER_EXTENSION: ".handler",
  FUNCTION_RUNTIME: "nodejs12.x",
  ERROR_UNABLE_TO_UPDATE_FUNCTION_CODE: "unable to update the function's code, \n",
  LAMBDA_PERMISSION_STATEMENT_ID: "thisisalambda",
  LAMBDA_PERMISSION_ACTION: "lambda:InvokeFunction",
  LAMBDA_PERMISSION_PRINCIPAL: "apigateway.amazonaws.com",
  EDGE_PROXY_ERROR: "edge-proxy",
  EMPTY_STRING: "",
  VERSION_REMOVAL_REGEX: /:\d+$/,

}

module.exports = Constants