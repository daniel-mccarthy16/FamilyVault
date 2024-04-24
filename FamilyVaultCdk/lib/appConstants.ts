export enum StackNames {
  APIGATEWAYSTACK = "ApiGatewayStack",
  DATARESOURCESSTACK = "DataResourcesStack",
  LAMBDAFUNCTIONSSTACK = "LambdaFunctionsStack",
  STEPFUNCTIONSSTACK = "StepFunctionsStack"
}

export enum LambdaFunctionName {
  API_POST_PHOTO = "ApiPostPhoto", 
  WRITE_PHOTO_DYNAMODB = "WritePhotoDynamoDB", 
}

export enum StepFunctionExports {
  PROCESS_PHOTO = "processPhotoStepFunction", 
}

export enum DataExports {
  S3_BUCKET = "S3BucketName", 
  DYNAMODB_TABLE = "FamilyVaultTable"
}

export enum EventBridgeExports {
  S3_POST_IMAGE = "S3PostImageRule",
}
