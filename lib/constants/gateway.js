const Constants = {
  ALLOWED_ORIGINS: ["*"],
  ALLOWED_HEADERS: ["content-type"],
  ALLOWED_METHODS: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
  ],
  OPTIONS_METHOD: "OPTIONS",
  ROUTE_KEY_SEPARATOR: " /",
  INTEGRATION_METHOD: "POST",
  INTEGRATION_VERSION: "2.0",
  VERSION_REMOVAL_REGEX: /:\d+$/,
  EMPTY_STRING: "",
  INTEGRATION_UPDATE_MESSAGE: "updated integrations for ",

}

module.exports = Constants;