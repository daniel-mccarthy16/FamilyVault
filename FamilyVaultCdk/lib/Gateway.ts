import { Construct } from 'constructs';
import {  aws_lambda as lambda, aws_apigateway as apigateway, aws_cognito as cognito, CfnOutput } from 'aws-cdk-lib';
import { outputNames } from 'globalconfig';

export class Gateway extends Construct {

  public api: apigateway.RestApi;
  private authorizer: apigateway.CognitoUserPoolsAuthorizer;

  constructor(scope: Construct, id: string, userPool: cognito.IUserPool) {
    super(scope, id);

    this.api = new apigateway.RestApi(this, 'FamilyVaultApi', {
      restApiName: 'Family Vault Service',
      description: 'This service serves the FamilyVault application.',
    });

    // Create the Cognito User Pool Authorizer
    this.authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
      authorizerName: 'FamilyVaultAuthorizer',
      identitySource: 'method.request.header.Authorization',
    });

    new CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      exportName: outputNames.apiGatewayEndpoint
    });

  }

  public registerLambda(lambdaFunction: lambda.IFunction, resourcePath: string, method: string): void {
    const resource = this.findOrCreateResource(resourcePath);
    resource.addMethod(method, new apigateway.LambdaIntegration(lambdaFunction), {
      authorizer: this.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
  }

  private findOrCreateResource(resourcePath: string): apigateway.IResource {
    let resource = this.api.root.getResource(resourcePath);
    if (!resource) {
      resource = this.api.root.addResource(resourcePath);
    }
    return resource;
  }

}
