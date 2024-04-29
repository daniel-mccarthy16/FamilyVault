import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

//TODO - add tests
//TODO - review hard coded arn, probably no issue
//TODO - review codepipeline permissions
//
export class FetchDiffLambda extends Construct {
  public readonly lambdaFunction: lambda.Function;

  constructor(scope: Construct, id: string) {
    super(scope, id);

     const githubTokenSecret = secretsmanager.Secret.fromSecretCompleteArn(this, 'GithubToken', 'arn:aws:secretsmanager:ap-southeast-2:891377335175:secret:cicd-github-token-RYutJE');

    this.lambdaFunction = new lambda.Function(this, 'FetchDiffLambda', {
      runtime: lambda.Runtime.PYTHON_3_8,
      handler: 'fetch_diff_lambda.lambda_handler',
      code: lambda.Code.fromAsset('lib/fetchDiffLambda/lambda'),
    });

    // Grant the Lambda function permissions to read the GitHub token from Secrets Manager
    githubTokenSecret.grantRead(this.lambdaFunction);

    // Optional: Grant the Lambda function permissions to interact with AWS CodePipeline
    this.lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['codepipeline:PutJobSuccessResult', 'codepipeline:PutJobFailureResult'],
      resources: ['*'],
    }));
  }
}
