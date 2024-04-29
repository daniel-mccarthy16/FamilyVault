import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import { Duration, aws_s3 as s3Alias } from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Role, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';


export class StaticTestingStepFunction extends Construct {

    public readonly stateMachine: sfn.StateMachine;

    constructor(scope: Construct, id: string, cicdTable: Table, artifactsBucket: Bucket) {

        super(scope, id);

        const processDiffLambda = new lambda.Function(this, 'ProcessDiffLambda', {
            runtime: lambda.Runtime.PYTHON_3_8,
            handler: 'process_diff.lambda_handler',
            code: lambda.Code.fromAsset('lib/staticTestingStepFunction/processDiffArtifact'),
            environment: {
                BUCKET_NAME: cicdTable.tableName,
            }
        });
        //TODO  -need a bucket dedicated to artifacts
        const s3Bucket = s3Alias.Bucket.fromBucketName(this, 'Bucket', artifactsBucket.bucketName);
        s3Bucket.grantRead(processDiffLambda);

        // Define the task to invoke the Lambda function
        const processDiffTask = new tasks.LambdaInvoke(this, 'Process DiffArtifact', {
            lambdaFunction: processDiffLambda,
            outputPath: '$.Payload',
            payload: sfn.TaskInput.fromObject({
                'bucket': sfn.JsonPath.stringAt('$.sourceArtifactBucket'),
                'key': sfn.JsonPath.stringAt('$.sourceArtifactKey')
            }),
        });

        // Role for the CodeBuild project
        const codeBuildRole = new Role(this, 'CodeBuildRole', {
            assumedBy: new ServicePrincipal('codebuild.amazonaws.com')
        });

        // Granting permissions to the CodeBuild role to access the S3 bucket
        artifactsBucket.grantRead(codeBuildRole);

        const cdkTestProject = new codebuild.Project(this, 'CdkTestProject', {
            projectName: 'CdkTests',
            source: codebuild.Source.s3({
                bucket: artifactsBucket,
                path: 'sourceArtifact.zip'  // Specify the object key dynamically if needed
            }),
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
                privileged: true, // Necessary if you need Docker to run npm or other tools
            },
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    pre_build: {
                        commands: [
                            'echo Installing dependencies...',
                            'npm install',
                        ]
                    },
                    build: {
                        commands: [
                            'echo Running tests...',
                            'npm test'
                        ]
                    }
                },
                artifacts: {
                    'files': ['**/*'],
                    'discard-paths': 'yes'
                }
            }),
            role: codeBuildRole,
        });

        // Define the task to start CodeBuild tests
        const startCdkTests = new tasks.CodeBuildStartBuild(this, 'Start CDK Tests', {
            project: cdkTestProject,
            integrationPattern: sfn.IntegrationPattern.RUN_JOB,
        });

        // Define the choice state to conditionally run tests
        const choice = processDiffTask.next(new sfn.Choice(this, 'Are CDK Tests Required?')
            .when(sfn.Condition.booleanEquals('$.cdk_testing_required', true), startCdkTests)
            .otherwise(new sfn.Pass(this, 'Skip CDK Testing')));

        // Define the state machine
        this.stateMachine = new sfn.StateMachine(this, 'StaticTestingStateMachine', {
            definition: choice,
            timeout: Duration.minutes(5),
        });
    }
}
