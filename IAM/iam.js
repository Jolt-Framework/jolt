const { IAM, CreateRoleCommand, AttachRolePolicyCommand, GetRoleCommand } = require("@aws-sdk/client-iam");
const AWS = require("@aws-sdk/client-iam");
const config = require("../Core/config.json");

class IAMWrapper {
  static roles = {};
  static policies = {};
  /**
   *
   * @param {string} region if none is specified, the default region will be us-east-1
   */
  constructor(region = "us-east-1") {
    this.client = new AWS.IAM({ region });
  }

  /**
   * creates an edge lambda role and returns the ARN
   * @param {String} roleName
   * @returns {Promise<String>}
   */
  async createEdgeRole() {
    const edgeLambdaRoleName = "LambdaDamnde";
    let role;

    try {
      role = await this.client.send(new GetRoleCommand({
        RoleName: edgeLambdaRoleName,
      }));

      console.log("Role: " + edgeLambdaRoleName + " already exists.")
      return Promise.resolve(role.Role.Arn);
    } catch (_) {
      console.log("Creating role: " + edgeLambdaRoleName);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    try {
      role = await this.client.send(new CreateRoleCommand({
        AssumeRolePolicyDocument: `{
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect": "Allow",
              "Principal": {
                "Service": [
                  "lambda.amazonaws.com",
                  "edgelambda.amazonaws.com"
                ]
              },
              "Action": "sts:AssumeRole"
            }
          ]
        }`,
        RoleName: edgeLambdaRoleName,
      }));
    } catch (error) {
      console.log("Error creating role:\n", error);
      throw new Error(error.message);
    }

    try {
      await this.client.send(new AttachRolePolicyCommand({
        PolicyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaRole", // need to remove hard coding
        RoleName: edgeLambdaRoleName,
      }));
    } catch (error) {
      console.log("Error attaching policy to role:\n", error);
      throw new Error(error.message);
    }

    return Promise.resolve(role.Role.Arn);
  }

  /**
   *
   * @param {string} name the name of the role you want
   */
  async findRole(name) {
    let role = IAMWrapper.roles[name];
    if (!role) {
      role = await this.client.getRole({ RoleName: name });
      if (role) IAMWrapper.roles[name] = role;
    }
    return role;
  }

  async createLambdaRole(roleName) {
    roleName = "LambdaExecRole";
    let role;

    try {

      role = await this.client.send(new GetRoleCommand({
        RoleName: roleName,
      }));
      console.log("Role: " + roleName + " already exists")
      return Promise.resolve(role.Role.Arn);
    } catch (_) {
      console.log("Creating role: " + roleName);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    try {
      role = await this.client.send(new CreateRoleCommand({
        AssumeRolePolicyDocument: `{
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect": "Allow",
              "Principal": {
                "Service": [
                  "lambda.amazonaws.com"
                ]
              },
              "Action": "sts:AssumeRole"
            }
          ]
        }`,
        RoleName: roleName,
      }));
    } catch (err) {
      console.log(err);
      throw new Error(err.message);
    }

    try {
      await this.client.send(new AttachRolePolicyCommand({
        PolicyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaRole",
        RoleName: roleName,
      }))
    } catch (error) {
      console.log(err);
      throw new Error(err.message);
    }

    return Promise.resolve(role.Role.Arn);
  }

/**
 *
 * @param {string} name if cached at runtime, policy can be found by name, otherwise there must be a second value arn
 * @param {string} arn policy can be retrieved by arn via api call, if not found, returns undefined.
 * @returns {object}  policy document.
 */
  async findPolicy(name, arn) {
    let policy = IAMWrapper.policies[name];
    if (!policy) {
      policy = await this.client.getPolicy({ PolicyArn: arn });
      if (policy) IAMWrapper.policies[name] = policy;
    }
    return policy;
  }

  /**
   *
   * @param {string} name the name of the role, if it already exists then it will be retrieved.
   * @param {object} policyDocument an object that will be turned into json, contains assume role doc.
   * @returns
   */
  async createRole(name, policyDocument) {
    let role; // = await this.findRole(name)

    if (!role) {
      try {
        role = await this.client.createRole({
          RoleName: name,
          AssumeRolePolicyDocument: JSON.stringify(policyDocument),
          Tags: [{ "Key": "Core-Jamstack", "Value": "MVP" }] // come back to remove hard code
        });
        IAMWrapper.roles[name] = role;
      } catch (error) {
        console.log(`Unable to create role: ${name}`);
        throw new Error(error.message);
      }
    }
    return role;
  }

  async deleteRole(roleName) {
    try {
      const confirmation = await this.client.deleteRole({ RoleName: roleName });
      console.log("Successfully deleted role: ", roleName);
      if (confirmation) {
        delete IAMWrapper.roles[roleName];
      }
    } catch (error) {
      console.log(`Unable to delete role: ${roleName}`);
      throw new Error(error.message);
    }
  }

/**
 *
 * @param {string} name the policy name that will remove the local cached version
 * @param {string} policyArn able to delete policy only by arn remotely
 */
  async deletePolicy(policyName, policyArn) {
    try {
      const confirmation = await this.client.deletePolicy({ PolicyArn: policyArn });
      console.log("Successfully deleted the policy:\n", policyName)
      if (confirmation) {
        delete IAMWrapper.policies[policyName];
      }
    } catch (error) {
      console.log("Unable to delete policy:\n", policyName);
      throw new Error(error.message);
    }
  }
  /**
   *
   * @param {string} name Creates temporary credentials based on given arn of a role. Note: DOES NOT CACHE THE ROLE AT RUNTIME.
   * @returns {object} temporary role object. Not cached.
   */
  async assumeRole(arn, duration) {
    try {
      const temporaryRole = this.client.assumeRole({ RoleARN: arn, DurationSeconds: duration});
      return temporaryRole;
    } catch (error) {
      console.log(`Unable to assume role: ${arn}`); // is this supposed to log `name` or `arn`?
      throw new Error(error.message);
    }
  }

  async detachPolicyFromRole(roleName, policyArn) {
    let confirmation;

    try {
      confirmation = this.client.detachRolePolicy({ RoleName: roleName, PolicyArn: policyArn });
    } catch (error) {
      console.log(`Unable to detach policy from ${rolename}.`);
      throw new Error(error.message);
    }

    return confirmation;
  }

  async createPolicyForRole(roleName, policyName, policyDoc, description) {
    let role = await this.findRole(roleName);

    if (!role) throw new Error("Cannot create a policy for a role that does not exist, check to see if the role has been made.");

    let {Policy} = await this.client.createPolicy({
      PolicyDocument: JSON.stringify(policyDoc),
      PolicyName: policyName,
      Description: description
    });

    console.log("Successfully created policy\n", Policy);
    IAMWrapper.policies[policyName] = Policy;

    const data = await this.client.attachRolePolicy({
      RoleName: roleName,
      PolicyArn: Policy.Arn,
    });

    console.log("Successfully attached role to policy:\n", data);

    return Policy;
  }
}

module.exports = IAMWrapper;
