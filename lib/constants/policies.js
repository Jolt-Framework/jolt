const LAMBDA_ASSUME_ROLE_DOCUMENT_POLICY = `{
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
}`

const EDGE_LAMBDA_ASSUME_ROLE_DOCUMENT_POLICY = `{
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
}`

const READ_ONLY_LAMBDA_POLICY = `{
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
}`

const SERVICE_ROLE_ARN = "arn:aws:iam::aws:policy/service-role/AWSLambdaRole"

module.exports = {
    LambdaAssumeRoleDocumentPolicy: LAMBDA_ASSUME_ROLE_DOCUMENT_POLICY,
    ReadOnlyLambdaPolicy: READ_ONLY_LAMBDA_POLICY,
    EdgeLambdaAssumeRoleDocumentPolicy: EDGE_LAMBDA_ASSUME_ROLE_DOCUMENT_POLICY,
    ServiceRoleARN: SERVICE_ROLE_ARN
}