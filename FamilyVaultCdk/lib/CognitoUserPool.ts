import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as cr from 'aws-cdk-lib/custom-resources';
import { outputNames } from '../../globalconfig';

export class CognitoUserPool extends Construct {

  public userPool: cognito.UserPool;
  
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const adminPasswordSecret = new secretsmanager.Secret(this, 'AdminPasswordSecret', {
      description: 'Admin initial password for Cognito',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'admin' }),
        generateStringKey: 'password',
        passwordLength: 16,
        requireEachIncludedType: true
      },
    });


    this.userPool = new cognito.UserPool(this, 'CognitoUserPool', {
      // UserPoolName is optional, but good practice to set
      userPoolName: 'FamilyVaultCongitoUserPool',
      
      // Specifies self sign up enabled for the user pool. Default is true.
      selfSignUpEnabled: true,

      // Configuration for user pool to send emails
      userVerification: {
        emailSubject: 'Verify your email for our app!',
        emailBody: 'Hello {username}, Thanks for signing up to our app! Your verification code is {####}',
        emailStyle: cognito.VerificationEmailStyle.CODE,
        smsMessage: 'Hello {username}, Thanks for signing up to our app! Your verification code is {####}',
      },

      // Password policy configuration
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },

      // Define attributes which are required at user sign up
      standardAttributes: {
        email: {
          required: false,
          mutable: true,
        },
      },

      // Enabling admin to create users directly
      accountRecovery: cognito.AccountRecovery.NONE,
    });

    // Optionally, you can create a User Pool Client
    // TODO - should probably remove userPassword auth flow later on in piece ( SRP is a diffiehelmen type protocol where the password is never transmitted directly over the network
    const userPoolClient = new cognito.UserPoolClient(this, 'AppClient', {
      userPool: this.userPool,
      authFlows: {
         userSrp: true,         // Enables SRP-based authentication (USER_SRP_AUTH)
         userPassword: true,    // Directly use username and password (USER_PASSWORD_AUTH)
         //adminUserPassword: true, // Enables an admin to authenticate users (ADMIN_USER_PASSWORD_AUTH)
         //custom: true,          // Enables using Lambda triggers to customize authentication flow
       },
       preventUserExistenceErrors: true
    });

    // Creating 'admin' group
    const adminGroup = new cognito.CfnUserPoolGroup(this, 'CognitoAdminGroup', {
      groupName: 'admin',
      userPoolId: this.userPool.userPoolId,
      description: 'Admin group with full access',
      // You can specify an IAM role to associate with this group
    });

    // Creating 'user' group
    const userGroup = new cognito.CfnUserPoolGroup(this, 'CognitoUserGroup', {
      groupName: 'user',
      userPoolId: this.userPool.userPoolId,
      description: 'Default user group with limited access',
      // You can specify an IAM role to associate with this group
    });

    const adminUserLambda = new lambda.Function(this, 'AdminUserLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('./lib/LambdaFunctions/cognito-cr-admin'), //TODO - path is weird right? 
      environment: {
        SECRET_ARN: adminPasswordSecret.secretArn,
        USER_POOL_ID: this.userPool.userPoolId,
        ADMIN_EMAIL: "dmacl0l1992+familyvaultcognito@gmail.com"
      },
    });

    adminPasswordSecret.grantRead(adminUserLambda);
    adminUserLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['cognito-idp:AdminCreateUser'],
      resources: [this.userPool.userPoolArn],
    }));

    new cr.AwsCustomResource(this, 'CreateAdminUserTrigger', {
      onCreate: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: adminUserLambda.functionName,
        },
        physicalResourceId: cr.PhysicalResourceId.of(`InitialAdminUser-${Date.now()}`),
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([new iam.PolicyStatement({
        actions: ['lambda:InvokeFunction'],
        resources: [adminUserLambda.functionArn],
      })]),
    });

    new cdk.CfnOutput(this, 'UserPoolID', {
      value: this.userPool.userPoolId,
      exportName: outputNames.userPoolId
    });

    new cdk.CfnOutput(this, 'UserPoolClientID', {
      value: userPoolClient.userPoolClientId,
      exportName: outputNames.userPoolClientId
    });

  }
}
