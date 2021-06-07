const createEvent = (req) => {
  // {
  //   routeKey: 'POST /function3',
  //   rawPath: '/prod/function3',
  //   headers:
  //   requestContext: {
  //     http: {
  //       method,
  //       path,
  //       protocol
  //       sourceIp,
  //       userAgent
  //     }
  //   }
  // }

  const { body, url, method, headers } = req;
  const { path, protocol, } = req._parsedUrl;
  return {
    routeKey: `${method} url`,
    rawPath: url,
    requestContext: {
      http: {
        method,
        path,
        protocol,
      },
    },
    headers,
    body: JSON.stringify(body),
  };
}

module.exports = createEvent;
