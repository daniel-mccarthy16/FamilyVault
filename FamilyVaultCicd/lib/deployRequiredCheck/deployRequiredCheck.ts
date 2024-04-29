import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';

//TODO - review codepipeline permissions

export class DeployRequiredCheckLambda extends Construct {
  public readonly lambdaFunction: lambda.Function;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.lambdaFunction = new lambda.Function(this, 'FetchDiffLambda', {
      runtime: lambda.Runtime.PYTHON_3_8,
      handler: 'fetch_diff_lambda.lambda_handler',
      code: lambda.Code.fromAsset('lib/deployRequiredCheck/lambda'),
    });

    // Optional: Grant the Lambda function permissions to interact with AWS CodePipeline
    this.lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['codepipeline:PutJobSuccessResult', 'codepipeline:PutJobFailureResult'],
      resources: ['*'],
    }));
  }
}
