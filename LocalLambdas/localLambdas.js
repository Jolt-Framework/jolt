// Notes:
// 1. Whenever a response body is returned, it gets JSON.parsed to verify that it was stringified before it was returned from the lambda. If it wasn't, an error is thrown and 500 is returned
// 2. If function doesn't exist, 404 is returned
// 3. A separate function, processResponseAndSend is passed to the lambda as the "callback" argument. It can be invoked within the function to return a response. If it isn't invoked, the return value of the lambda is captured and set after lambda execution finishes.
// 4. This doesn't handle setTimeout style code that uses the event loop since the lambda will finish execution and a response will be sent before setTimeout executes the callback. Not sure how to handle this, yet.
// 5. The Context object is empty

// TODO: Format the event object to more closely resemble the Lambda event object
// TODO: Figure out the setTimeout problem
// TODO: Is there a way to run the lambdas in the background, behind the React server without needing to run loclam in a separate terminal?
// TODO: Handling dynamic routing and multipart paths

const express = require('express');
const { listFunctions } = require("../Utilities/zip-it-and-ship-it/src/main");
const path = require("path");

const generateFunctionEvent = (req) => {
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
    http: {
      method,
      path,
      protocol,
    },
    headers,
    body: JSON.stringify(body),
  };
}

const createLocalLambdaPathMap = (functionsFolder) => {
  return (async (req, _, next) => {
    const functions = await listFunctions(functionsFolder)

    req.funcMap = functions.reduce((funcMap, currentFunc) => {
      const funcName = currentFunc.name.replace(path.extname(currentFunc.name), "");

      funcMap[funcName] = currentFunc.mainFile;

      return funcMap;
    }, {});

    next();
  });
}

const logRequest = (req, _, next) => {
  console.log(`${req.method} to ${req.url}`);
  next();
}

const runLocalLambdas = (functionsFolder, port = 3001) => {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(createLocalLambdaPathMap(functionsFolder));
  app.use(logRequest);

  console.log(`Local Lambdas running on port ${port}...`);

  app.all("/.functions/*", async (req, res) => {
    let functionName = req.url.replace(/^\/\.functions\//, "");

    const functionPath = req.funcMap[functionName];

    if (!functionPath) {
      res.status(404).send({
        error: `Function: "${functionName}" wasn't found`
      });
    } else {
      const functionEvent = generateFunctionEvent(req);

      let sent = false;

      const processResponseAndSend = async (lambdaErr, lambdaResponse) => {
        sent = true;
        // Clear the imported function from the cache so that the function is refreshed on each request
        delete require.cache[require.resolve(functionPath)];

        // For lambda creators to return their own custom errors
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

      const requestedFunction = require(functionPath).handler;

      let output = await requestedFunction(
        functionEvent,
        {},
        processResponseAndSend
      );

      if (!sent) {
        processResponseAndSend(null, output);
      }
    }
  })

  app.listen(port);
}

module.exports = runLocalLambdas;

// GET request event object
// {
//   version: '2.0',
//   routeKey: 'GET /function2',
//   rawPath: '/prod/function2',
//   rawQueryString: '',
// query
//   headers: {
//     accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
//     'accept-encoding': 'gzip, deflate, br',
//     'accept-language': 'en-US,en;q=0.9',
//     'cache-control': 'max-age=0',
//     'content-length': '0',
//     host: 'juox7jnxah.execute-api.us-east-1.amazonaws.com',
//     'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="90", "Google Chrome";v="90"',
//     'sec-ch-ua-mobile': '?0',
//     'sec-fetch-dest': 'document',
//     'sec-fetch-mode': 'navigate',
//     'sec-fetch-site': 'none',
//     'sec-fetch-user': '?1',
//     'upgrade-insecure-requests': '1',
//     'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.72 Safari/537.36',
//     'x-amzn-trace-id': 'Root=1-608f4c11-613abc8b023c68496ee3c663',
//     'x-forwarded-for': '208.65.162.184',
//     'x-forwarded-port': '443',
//     'x-forwarded-proto': 'https'
//   },
//   requestContext: {
//     accountId: '472111561985',
//     apiId: 'juox7jnxah',
//     domainName: 'juox7jnxah.execute-api.us-east-1.amazonaws.com',
//     domainPrefix: 'juox7jnxah',
//     http: {
//       method: 'GET',
//       path: '/prod/function2',
//       protocol: 'HTTP/1.1',
//       sourceIp: '208.65.162.184',
//       userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.72 Safari/537.36'
//     },
//     requestId: 'eujSuiUhoAMEMEQ=',
//     routeKey: 'GET /function2',
//     stage: 'prod',
//     time: '03/May/2021:01:04:17 +0000',
//     timeEpoch: 1620003857319
//   },
//   isBase64Encoded: false
// }


// POST is:
// {
//   version: '2.0',
//   routeKey: 'POST /function3',
//   rawPath: '/prod/function3',
//   rawQueryString: '',
//   headers: {
//       accept: '*/*',
//       'accept-encoding': 'gzip, deflate, br',
//       'accept-language': 'en-US,en;q=0.9',
//       'cache-control': 'no-cache',
//       'content-length': '19',
//       'content-type': 'application/json',
//       host: 'juox7jnxah.execute-api.us-east-1.amazonaws.com',
//       origin: 'chrome-extension://fhbjgbiflinjbdggehcddcbncdddomop',
//       'postman-token': '624e9390-a773-1f33-c569-46baed914a00',
//       'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="90", "Google Chrome";v="90"',
//       'sec-ch-ua-mobile': '?0',
//       'sec-fetch-dest': 'empty',
//       'sec-fetch-mode': 'cors',
//       'sec-fetch-site': 'none',
//       'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.72 Safari/537.36',
//       'x-amzn-trace-id': 'Root=1-608f4ce3-499957851d8990fc6319ba1f',
//       'x-forwarded-for': '208.65.162.184',
//       'x-forwarded-port': '443',
//       'x-forwarded-proto': 'https'
//     },

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
//   requestContext: {
//       accountId: '472111561985',
//       apiId: 'juox7jnxah',
//       domainName: 'juox7jnxah.execute-api.us-east-1.amazonaws.com',
//       domainPrefix: 'juox7jnxah',
//       http: {
//             method: 'POST',
//             path: '/prod/function3',
//             protocol: 'HTTP/1.1',
//             sourceIp: '208.65.162.184',
//             userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.72 Safari/537.36'
//           },
//       requestId: 'eujzfg5boAMEMvw=',
//       routeKey: 'POST /function3',
//       stage: 'prod',
//       time: '03/May/2021:01:07:47 +0000',
//       timeEpoch: 1620004067010
//     },
//   body: '{\n\t"name": "fred"\n}',
//       isBase64Encoded: false
// }
