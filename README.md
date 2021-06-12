# Jolt
Jolt is a framework for developing, deploying, and maintaing JAMstack applications with serverless functions.

## Table of Contents
- Jolt Commands
- Prerequisites
- Getting Started
- Working With Functions
- Local Development Server
- Commands

## Jolt Commands

| Command | Description |
| `jolt init` | Initialize an application for use with Jolt: Prompts the user to answer a series of questions about the application. Answers are stored in a local configuration file that Jolt references while running other commands. |
| `jolt dev`|Spins up the user’s front end development server + Lambda development server in order to allow the full application to be run locally. |
|-|-|
|`jolt functions`| Spins up the Lambda development server by itself.| 
|-|-|
|`jolt deploy`| Deploys the application on AWS.|
|-|-|
|`jolt update`| Builds and deploys the latest version of a previously deployed application. The underlying infrastructure is reused wherever possible.|
|-|-|
|`jolt rollback`| Prompts the user to select from a list of versions associated with the current application. Once a version is selected, the front end and Lambdas are reverted to that version.|
|-|-|
|`jolt destroy`| Removes an application and all of its associated AWS infrastructure|
|-|-|
|`jolt lambda [function_name]`| Creates a Lambda template in the functions folder with the specified function_name`|
|-|-|

## Prerequisites
- AWS Account
- AWS credentials saved locally
  - Via the [AWS CLI](https://aws.amazon.com/cli/):
		1. Run `aws configure` and follw the prompts

	- Manually without AWS CLI
		1. Run the following `mkdir ~/.aws && touch ~/.aws/credentials`
		2. Open `~/.aws/credentials` and set it up in the following format
		```
		[default]

		aws_access_key_id = [access_key]
		aws_secret_access_key = [secret_access_key]
		```

## Getting Started
1. Install Jolt
`npm i -g jolt-framework`

~ Note: All Jolt commands should be run from the route of the application
~ Demo: Each "Example" below will guide you through building a simple demo app that interfaces with a single serverless function. Once set up, this app can be deployed with Jolt.

2. Create an application.

**- Example:**
	```sh
	npx create-react-app jolt-first-project
	cd jolt-first-project
	```

	- Replace the contents of `src/App.js` with:
		```jsx
		function App() {
			fetch(".functions/hello/world")
				.then(res => res.json()
					.then(data => alert(JSON.stringify(data))
				)
			)
			return <h1>Hello World!</h1>;
		}

		export default App;
		```

3. Create Serverless Functions
- This is the directory where serverless functions are defined 
**- Example:**
	```sh
	mkdir functions
	```

4. Initialize the application with Jolt
**- Example:**
	```sh
	jolt init
	# For the simple demo app, all of the default options can be used
	```
-  Guides you through a series of questions to gather the information Jolt needs to manage and deploy your application

## Working With Functions

### Creating Serverless Functions
	- Define all serverless function files within your `functions` directory that lives in the root of your application
	- Functions are defined as `.js` files 
	- The URL path that the function will be deployed at is the relative path the function has within your `functions` folder
	- For instance:
		- To create a function that will become a Lambda at the relative path `/hello-world` define the function in `functions/hello-world.js`
		- To create a function with the relative path `/hello/world`, define the function in `functions/hello/world.js`

### Invoking Serverless Functions
- Functions can be invoked in your front-end application with the `.functions` path prefix
- Example: the `/hello/world` function can be invoked with `fetch('/.functions/hello/world')`

### Function Templates
- Use `jolt lambda [path/to/function/name.js]` to automatically create a function and any needed directories inside your `functions` folder
**- Example: **
```sh
jolt lambda hello/world
```

5. Local Development Server
**- Example:**
	```sh
	jolt dev
	# Application can be viewed at `localhost:3000`
	```
	1. Spins up a React development server on port 3000
	2. Spins up a local Lambda server on port 3001 that
	3. Front-end requests to functions will be proxied to appropriate Lambda
	4. The local Lambda server can also be spun up by itself
	- **Example:**
	```sh
	jolt functions
	```


6. Deployment
- Once you've verified that the application works as intended, it's time to deploy it.
**- Example:**
```sh
jolt deploy
```
- You will be prompted for a description that can be used to identify this version of the application should you need to rollback to it in the future.
- Deployment may take up to 10 minutes to finish propagating to all CDN servers.
- Once the application has finished being deployed, the link to the application on CloudFront will be displayed in the terminal.

7. Updating
- Under the hood, a different process is used to update the application, but from a user's perspective, updating works just like deployment
**- Example:**
```sh
# For the demo: Add some additional text to `App.js` to see the update take effect.
jolt update
```

8. Performing a Rollback 
- Revert the application to a different version
- The selected version can be any version of the application, forwards or backwards.
**- Example:**
```sh
jolt rollback
```
1. Select from a list of all applications deployed with Jolt on the current AWS account
2. Select a version for the chosen application
3. Confirm to begin the rollback (may take a while).

