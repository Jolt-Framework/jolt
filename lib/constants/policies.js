const LambdaAssumeRoleDocumentPolicy = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": [
                        "lambda.amazonaws.com",
                        "apigateway.amazonaws.com"
                ]
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
const EdgeLambdaAssumeRoleDocumentPolicy = {
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
}

const ReadOnlyLambdaPolicy = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "ReadOnlyPermissions",
            "Effect": "Allow", 
            "Action": [
                "lambda:GetAccountSettings",
                "lambda:ListFunctions",
                "lambda:ListTags",
                "lambda:GetEventSourceMapping",
                "lambda:ListEventSourceMappings",
                "iam:ListRoles"
            ],
            "Resource": "*"
        }
    ]
}

module.exports = {
    LambdaAssumeRoleDocumentPolicy,
    ReadOnlyLambdaPolicy,
    EdgeLambdaAssumeRoleDocumentPolicy
}