const {
  CreateRoleCommand,
  AttachRolePolicyCommand,
  GetRoleCommand,
} = require("@aws-sdk/client-iam");
const AWS = require("@aws-sdk/client-iam");

const Policies = require("../lib/constants/policies");
const Constants = require("../lib/constants/IAMConstants");
const { DEFAULT_REGION } = require("../lib/constants/global");

class IAMWrapper {
  static roles = {};
  static policies = {};
  /**
   *
   * @param {string} region if none is specified, the default region will be us-east-1
   */
  constructor(region = DEFAULT_REGION) {
    this.client = new AWS.IAM({ region });
  }

  /**
   * creates an edge lambda role and returns the ARN
   * @param {String} roleName
   * @returns {Promise<String>}
   */
  async createEdgeRole(edgeLambdaRoleName = Constants.EDGE_LAMBDA_ROLE_NAME) {
    let role;
    try {
      role = await this.client.send(
        new GetRoleCommand({
          RoleName: edgeLambdaRoleName,
        })
      );
      return Promise.resolve(role.Role.Arn);
    } catch (_) {}

    try {
      role = await this.client.send(
        new CreateRoleCommand({
          AssumeRolePolicyDocument: Policies.EdgeLambdaAssumeRoleDocumentPolicy,
          RoleName: edgeLambdaRoleName,
        })
      );
    } catch (error) {
      throw new Error(error.message);
    }

    try {
      await this.client.send(
        new AttachRolePolicyCommand({
          PolicyArn: Policies.ServiceRoleARN,
          RoleName: edgeLambdaRoleName,
        })
      );
    } catch (error) {
      throw new Error(error.message);
    }
    await new Promise((resolve) => setTimeout(resolve, 10000));

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
    roleName = Constants.LAMBDA_ROLE_NAME;
    let role;

    try {
      role = await this.client.send(
        new GetRoleCommand({
          RoleName: roleName,
        })
      );
      return Promise.resolve(role.Role.Arn);
    } catch (_) {}

    try {
      role = await this.client.send(
        new CreateRoleCommand({
          AssumeRolePolicyDocument: Policies.LambdaAssumeRoleDocumentPolicy,
          RoleName: roleName,
        })
      );
    } catch (err) {
      throw new Error(err.message);
    }

    try {
      await this.client.send(
        new AttachRolePolicyCommand({
          PolicyArn: Policies.ServiceRoleARN,
          RoleName: roleName,
        })
      );
    } catch (error) {
      throw new Error(err.message);
    }

    await new Promise((resolve) => setTimeout(resolve, 10000));

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
    let role;

    if (!role) {
      try {
        role = await this.client.createRole({
          RoleName: name,
          AssumeRolePolicyDocument: JSON.stringify(policyDocument),
          Tags: [{ Key: Constants.JOLT_KEY, Value: Constants.JOLT_KEY_VALUE }],
        });
        IAMWrapper.roles[name] = role;
      } catch (error) {
        throw new Error(error.message);
      }
    }
    return role;
  }

  async deleteRole(roleName) {
    try {
      const confirmation = await this.client.deleteRole({ RoleName: roleName });
      if (confirmation) {
        delete IAMWrapper.roles[roleName];
      }
    } catch (error) {
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
      const confirmation = await this.client.deletePolicy({
        PolicyArn: policyArn,
      });
      if (confirmation) {
        delete IAMWrapper.policies[policyName];
      }
    } catch (error) {
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
      const temporaryRole = this.client.assumeRole({
        RoleARN: arn,
        DurationSeconds: duration,
      });
      return temporaryRole;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async detachPolicyFromRole(roleName, policyArn) {
    let confirmation;

    try {
      confirmation = this.client.detachRolePolicy({
        RoleName: roleName,
        PolicyArn: policyArn,
      });
    } catch (error) {
      throw new Error(error.message);
    }

    return confirmation;
  }

  async createPolicyForRole(roleName, policyName, policyDoc, description) {
    let role = await this.findRole(roleName);

    if (!role) throw new Error(Constants.ERROR_NO_ROLE);

    let { Policy } = await this.client.createPolicy({
      PolicyDocument: JSON.stringify(policyDoc),
      PolicyName: policyName,
      Description: description,
    });

    IAMWrapper.policies[policyName] = Policy;

    const data = await this.client.attachRolePolicy({
      RoleName: roleName,
      PolicyArn: Policy.Arn,
    });

    return Policy;
  }
}

module.exports = IAMWrapper;
