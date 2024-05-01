import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

export class WebhookHandler extends Construct {

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id);

    // Define the Lambda function to handle GitHub webhooks
    const webhookHandlerLambda = new NodejsFunction(this, 'WebhookHandlerLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'webhookHandler.handler',
      entry: path.join(__dirname, './lambda/webHookHandler.ts'), // Correct the path to the specific .ts file
      environment: {
      }
    });

    // Define the API Gateway to expose the Lambda function
    const webhookApi = new apigateway.RestApi(this, 'WebhookApi', {
      restApiName: 'WebhookHandlerApi',
      description: 'API Gateway to handle GitHub webhooks.'
    });

    const webhookResource = webhookApi.root.addResource('webhook');

    webhookResource.addMethod('POST', new LambdaIntegration(webhookHandlerLambda), {
      apiKeyRequired: false // You can configure this depending on your security requirements
    });

  }
}
