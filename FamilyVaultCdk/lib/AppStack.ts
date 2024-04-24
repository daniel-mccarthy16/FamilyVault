import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DynamoDbTable } from './DynamoDbTable';
import { S3Bucket } from './S3Bucket';
import { Gateway } from './Gateway';
import { PhotoProcessingWorkflow } from './StepFunctions/photo-workflows/PhotoProcessingWorkflow';
import { ApiPostPhotoLambda } from './LambdaFunctions/photo-processing/ApiPostPhoto/ApiPostPhoto';
import { CognitoUserPool } from './CognitoUserPool';
import { CloudFront } from './CloudFront';
//import { FamilyVaultConfig } from './FamilyVaultConfig';

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {

    //TODO - dont store return values if not needed, will be confusing in the future
    super(scope, id, props);

    const cognitoPool = new CognitoUserPool(this, 'CognitoUserPool');
    const myS3Bucket = new S3Bucket(this, 'MyS3Bucket');
    const dynamoDbTable = new DynamoDbTable(this, 'MyDynamoDbTable');

    const apiGateway = new Gateway(this, 'MyApiGateway', cognitoPool.userPool);
    const apiPostPhotoLambda = new ApiPostPhotoLambda(this, 'ApiPostPhotoLambda', myS3Bucket.bucket);
    apiGateway.registerLambda(apiPostPhotoLambda.lambdaFunction, 'photo', 'POST');

    const photoProcessingWorkflow = new PhotoProcessingWorkflow(this, 'PhotoProcessingWorkflow', myS3Bucket.bucket, dynamoDbTable.table);

    const cloudfront = new CloudFront(this, 'CloudFrontDist', { api: apiGateway.api, bucket: myS3Bucket.bucket } );

    // const config = new FamilyVaultConfig(this, 'FamilyVaultConfig', myS3Bucket.bucket, 

  }
}
