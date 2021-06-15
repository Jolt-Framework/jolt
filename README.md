<img src="https://github.com/Jolt-Framework/jolt-framework.github.io/blob/main/images/logo/color_logo.svg"/>

# Jolt is a framework for developing, deploying, and maintaining JAMstack applications with serverless functions.

For an in-depth look at JAMstack + Serverless and to learn how we built Jolt, read our whitepaper [here](https://jolt-framework.github.io).

## Table of Contents
- [Jolt Commands](https://github.com/Jolt-Framework/jolt/blob/main/README.md#jolt-commands)
- [Prerequisites](https://github.com/Jolt-Framework/jolt/blob/main/README.md#prerequisites)
- [Getting Started](https://github.com/Jolt-Framework/jolt/blob/main/README.md#getting-started)
- [Working With Functions](https://github.com/Jolt-Framework/jolt/blob/main/README.md#working-with-functions)
- [Local Development Server](https://github.com/Jolt-Framework/jolt/blob/main/README.md#local-development-server)
- [Deploying](https://github.com/Jolt-Framework/jolt/blob/main/README.md#deploying)
- [Updating](https://github.com/Jolt-Framework/jolt/blob/main/README.md#updating)
- [Performing a Rollback](https://github.com/Jolt-Framework/jolt/blob/main/README.md#performing-a-rollback)
- [Teardown](https://github.com/Jolt-Framework/jolt/blob/main/README.md#teardown)

## Jolt Commands

| Command | Description |
|--|--|
| `jolt init` | Initialize an application for use with Jolt: Prompts the user to answer a series of questions about the application. Answers are stored in a local configuration file that Jolt references while running other commands. |
| `jolt dev`|Spins up the user’s front end development server + Lambda development server in order to allow the full application to be run locally. |
|`jolt functions`| Spins up the Lambda development server by itself.|
|`jolt deploy`| Deploys the application on AWS.|
|`jolt update`| Builds and deploys the latest version of a previously deployed application. The underlying infrastructure is reused wherever possible.|
|`jolt rollback`| Prompts the user to select from a list of versions associated with the current application. Once a version is selected, the front end and Lambdas are reverted to that version.|
|`jolt destroy`| Removes an application and all of its associated AWS infrastructure|
|`jolt lambda [function_name]`| Creates a Lambda template in the functions folder with the specified `function_name` |

## Prerequisites
- AWS Account
- AWS credentials saved locally. Can be done:
	- Via the [AWS CLI](https://aws.amazon.com/cli/):
		1. Run `aws configure` and follow the prompts
	- Manually without AWS CLI
		1. Run the following: `mkdir ~/.aws && touch ~/.aws/credentials`
		2. Open `~/.aws/credentials` and set it up in the following format:
		```
		[default]
		
		aws_access_key_id = [access_key]
		aws_secret_access_key = [secret_access_key]
		```

## Getting Started
1. Install Jolt
```sh
npm i -g jolt-framework
```
 
**Note:** All Jolt commands should be run from the route of the application

**Demo:** Each "**Example**" below will guide you through building a simple demo app that interfaces with a single serverless function. Once set up, this app can be deployed with Jolt.

2. Create an application.

**Example:**
```sh
npx create-react-app jolt-first-project
cd jolt-first-project
```
- Replace the contents of `src/App.js` with:
```jsx
function App() {
	fetch(".functions/hello/jolt")
		.then(res => res.json()
			.then(data => alert(JSON.stringify(data))
		)
	)
    
	return <h1>Hello From Jolt!</h1>;
}

export default App;
```

3. Create the Functions Folder

- This is the directory where serverless functions will be defined

**Example:**

```sh
mkdir functions
```

4. Initialize the application with Jolt

**Example:**

```sh
jolt init
# For the simple demo app, all of the default options can be used
```
-  Guides you through a series of questions to gather the information Jolt needs to manage and deploy your application

## Working With Functions

### Creating Serverless Functions
- Define all serverless function files within the `functions` directory that lives in the root of your application
- Functions are defined as `.js` files 
- The URL path that the function will be deployed at is the relative path the function has within your `functions` folder
- For instance:
	- To create a function that will become a Lambda at the relative path `/hello-jolt` define the function in `functions/hello-jolt.js`
	- To create a function with the relative path `/hello/jolt`, define the function in `functions/hello/jolt.js`
- Any environment variables the function needs should be listed in a `.env` file that lives in the same directory as the function

 ### Invoking Serverless Functions

- Functions can be invoked in your front-end application with the `.functions` path prefix
- ie: The `/hello/jolt` function can be invoked with `fetch('/.functions/hello/jolt')`

### Function Templates

- Use `jolt lambda [path/to/function/name.js]` to automatically create a function and any needed directories inside your `functions` folder

**Example:**

```sh
jolt lambda hello/jolt
```

## Local Development Server

**Example:**

```sh
jolt dev
# The application can be viewed at `localhost:3000`
```
1. Spins up a React development server on port 3000
2. Spins up a local Lambda server on port 3001
3. Front-end requests to functions will be proxied to the appropriate Lambda
4. The local Lambda server can also be spun up by itself

**Example:**

```sh
jolt functions
```

## Deploying

- Once you've verified that the application works as intended, it's time to deploy it.

**Example:**

```sh
jolt deploy
```
- You will be prompted for a description that can be used to identify this version of the application should you need to rollback to it in the future.
- Deployment may take up to 10 minutes to finish propagating to all CDN servers.
- Once the application has finished being deployed, the link to the application on CloudFront will be displayed in the terminal.

## Updating

- Under the hood, a different process is used to update the application, but from a user's perspective, updating works just like deployment.

**Example:**

```sh
# For the demo: Add some additional text to `App.js` to see the update take effect.
jolt update
```

## Performing a Rollback 

- Reverts the application to a different version
- The selected version can be any version of the application, forwards or backwards.

**Example:**

```sh
jolt rollback
```

1. Select from a list of all applications deployed with Jolt on the current AWS account
2. Select a version for the chosen application
3. Confirm to begin the rollback (this may take a while)

## Teardown

- If you're certain that you no longer want the application, a teardown will deprovision all resources on AWS
- Warning: This is permanent. The application and all prior versions of it will be lost

**Example:**

```sh
jolt teardown
```
