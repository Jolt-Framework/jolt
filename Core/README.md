# core
## Current Steps
0. create a build folder using the specified build command
  -
1. start with build folder and lambda functions folder
  - the build folder should have an index.html file
  - functions folder should have functions
2. upload both folders to an s3 bucket
  - create an s3 bucket
  -build
    - take content within build and create a build folder inside of the s3 bucket
    - iterate through a folder
    - create files based on the path.
    - upload all objects to have a path that starts with /build
3. deploy functions and create an api gateway
  - take zip file and push to lambda
  - ApiGateway - create stage (stage Name) - create routes for each lambda
  -functions
    - Recurse through functions directory
    - For each function
      - Zip it
      - upload it to s3
      - Deploy function code from bucket to a new Lambda
      - api.addRoute
4. create an edge lambda
  - created before distribution
  - use versioned approach
  - retrieve the arn(versioned)
5. create a distribution based on the build folder & link the edge lambda to the distribution
  - Params: bucketName, bucketDomainName, proxyARN, callerReference
6. Rejoice

