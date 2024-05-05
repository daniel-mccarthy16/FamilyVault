import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import * as path from 'path';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

//TODO - also need to whitelist github IP range, anything to avoid ending up with a giga bill
export class WebhookHandler extends Construct {

  constructor(scope: Construct, id: string, pipelines: { [key: string]: Pipeline }) {
    super(scope, id);

    const webhookApi = new apigateway.RestApi(this, 'WebhookApi', {
      restApiName: 'WebhookHandlerApi',
      description: 'API Gateway to handle different GitHub webhooks.'
    });

    const authorizerLambda = new NodejsFunction(this, 'CustomAuthorizerLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, './lambda/webhookAuthorizer.ts'),
    });

    authorizerLambda.addToRolePolicy(new PolicyStatement({
      actions: ['secretsmanager:GetSecretValue'],
      resources: ['arn:aws:secretsmanager:ap-southeast-2:891377335175:secret:github-webhook-secret-869QnV'],
    }));

    const authorizer = new apigateway.TokenAuthorizer(this, 'WebhookAuthorizer', {
      handler: authorizerLambda,
      identitySource: 'method.request.header.Authorization', // The header key to check
      resultsCacheTtl: cdk.Duration.seconds(0) // Disable caching
    });

    Object.entries(pipelines).forEach(([pipelineId, pipeline]) => {
      const lambdaFunction = new NodejsFunction(this, `${pipelineId}PipelineWebhookHandlerLambda`, {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'webhookHandler.handler',
        entry: path.join(__dirname, `./lambda/${pipelineId}PipelineWebhookHandler.ts`),
        environment: {
          PIPELINE_NAME: pipeline.pipelineName
        }
      });

      // Grant permissions to start executions of this pipeline
      lambdaFunction.addToRolePolicy(new PolicyStatement({
        actions: ['codepipeline:StartPipelineExecution'],
        resources: [pipeline.pipelineArn]
      }));

      const resource = webhookApi.root.addResource(pipelineId.toLowerCase());
      resource.addMethod('POST', new LambdaIntegration(lambdaFunction), {
        authorizer,
        apiKeyRequired: false 
      });

    });
  }
}
