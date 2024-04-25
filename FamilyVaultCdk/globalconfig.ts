export const outputNames = {
  userPoolId: "UserPoolID",
  userPoolClientId: "UserPoolClientID",
  apiUrl: "FamilyVaultApiUrl",
  s3BucketName: "S3BucketName",
  apiGatewayEndpoint: "ApiGatewayEndpoint",
};

export const enum StackNames {
    APIGATEWAYSTACK = "ApiGatewayStack",
    DATARESOURCESSTACK = "DataResourcesStack",
    LAMBDAFUNCTIONSSTACK = "LambdaFunctionsStack",
    STEPFUNCTIONSSTACK = "StepFunctionsStack"
}
export const enum LambdaFunctionName {
    API_POST_PHOTO = "ApiPostPhoto",
    WRITE_PHOTO_DYNAMODB = "WritePhotoDynamoDB"
}
export const enum StepFunctionExports {
    PROCESS_PHOTO = "PROCESS_PHOTO"
}
export const enum DataExports {
    S3_BUCKET = "S3BucketName",
    DYNAMODB_TABLE = "FamilyVaultTable"
}
export const enum EventBridgeExports {
    S3_POST_IMAGE = "S3PostImageRule"
}
