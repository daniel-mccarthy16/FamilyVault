import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3'; // Import the S3 module
import * as path from 'path';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import { LambdaFunctionName } from '../../../../globalconfig';

export class ApiPostPhotoLambda extends Construct {
  public readonly lambdaFunction: lambda.Function;

  constructor(scope: Construct, id: string, photoBucket: s3.IBucket) {
    super(scope, id);

    // Define the IAM Role for the Lambda Function
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for Lambda to access S3',
    });

    // Update policy to use the photoBucket's ARN
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: ['s3:PutObject'],
      resources: [photoBucket.arnForObjects('images/raw/*')],
    }));

    this.lambdaFunction = new lambda.Function(this, LambdaFunctionName.API_POST_PHOTO, {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, './lambda')),
      role: lambdaRole,
      environment: {
        BUCKET_NAME: photoBucket.bucketName, // Use the bucket name directly
      }
    });

    // Explain what the stack variable is doing
    const stack = cdk.Stack.of(this); // Retrieves the stack in which this construct is defined
    this.lambdaFunction.addPermission('APIGatewayInvoke', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      // This ARN construction ensures the permission is scoped to the API Gateway in the same account and region
      sourceArn: `arn:aws:execute-api:${stack.region}:${stack.account}:*/*/*/*`
    });

    // Output is usually for exporting values in CloudFormation, might not be necessary if not using CloudFormation exports
    new cdk.CfnOutput(this, 'LambdaApiPostPhotoExport', {
      value: this.lambdaFunction.functionArn,
      exportName: LambdaFunctionName.API_POST_PHOTO,
    });
  }
}
