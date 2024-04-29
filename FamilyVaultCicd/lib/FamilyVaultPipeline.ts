import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Artifact, Pipeline, PipelineType } from 'aws-cdk-lib/aws-codepipeline';
import { GitHubSourceAction, CodeBuildAction, StepFunctionInvokeAction, StateMachineInput } from 'aws-cdk-lib/aws-codepipeline-actions';
import { PipelineProject, BuildSpec, LinuxBuildImage } from 'aws-cdk-lib/aws-codebuild';
import { Role, ServicePrincipal, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { SecretValue } from 'aws-cdk-lib';
import { LambdaInvokeAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { FetchDiffLambda } from './fetchDiffLambda/FetchDiff';
import { DeployRequiredCheckLambda } from './deployRequiredCheck/deployRequiredCheck';
import { StaticTestingStepFunction } from './staticTestingStepFunction/staticTestingStepFunction';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class FamilyVaultPipeline extends cdk.Stack {

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const artifactsBucket = new s3.Bucket(this, 'ArtifactsBucket', {
            removalPolicy: cdk.RemovalPolicy.RETAIN, // Adjust based on your use case
            autoDeleteObjects: false, // Ensure this is false in production environments
            encryption: s3.BucketEncryption.S3_MANAGED // Encrypt objects at rest
        });

        const oauthToken = SecretValue.secretsManager('cicd-github-token', {
            jsonField: 'github-token'
        });

        const testResultsTable = new dynamodb.Table(this, 'TestResultsTable', {
            partitionKey: { name: 'testId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
            removalPolicy: cdk.RemovalPolicy.RETAIN
        });

        const fetchDiffLambda = new FetchDiffLambda(this, 'FetchDiffLambdaConstruct');
        const deployRequiredCheckLambda = new DeployRequiredCheckLambda(this, 'DeployRequiredCheckLambdaConstruct');

        const sourceOutput = new Artifact('sourceOutput');
        const buildOutput = new Artifact();
        const diffOutput = new Artifact('TestAndDeploySpec');

        const pipeline = new Pipeline(this, 'FamilyVaultCicdPipeline', {
            pipelineType: PipelineType.V2,
            pipelineName: 'FamilyVaultCicd',
            restartExecutionOnUpdate: true,
        });

        const sourceAction = new GitHubSourceAction({
            actionName: 'GitHub_Source',
            owner: 'daniel-mccarthy16',
            repo: 'FamilyVault',
            branch: 'main',
            oauthToken: oauthToken,
            output: sourceOutput,
        });

        const codeBuildRole = new Role(this, 'CodeBuildRole', {
            assumedBy: new ServicePrincipal('codebuild.amazonaws.com')
        });

        codeBuildRole.addToPolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['sts:AssumeRole'],
            resources: ['arn:aws:iam::058264330237:role/cicd-role-test']
        }));

        //TODO - maybe need a more comprehensive fix to ensure pipeline doesnt attempt to run cdk
        //this would probably not even be a problem once we can prevent rust lambda functions from compiling on every cdk synth/deploy/diff
        //need to move all functional files into a single folder ( lib probably ), if changes madde outside lib, dont redeploy
        const buildSpec = BuildSpec.fromObject({
            version: '0.2',
            phases: {
                pre_build: {
                    commands: [
                        `ASSUME_ROLE_ARN="arn:aws:iam::058264330237:role/cicd-role-test"`,
                        `TEMP_ROLE=$(aws sts assume-role --role-arn $ASSUME_ROLE_ARN --role-session-name CodeBuildDeploymentSession)`,
                        'export AWS_ACCESS_KEY_ID=$(echo $TEMP_ROLE | jq -r .Credentials.AccessKeyId)',
                        'export AWS_SECRET_ACCESS_KEY=$(echo $TEMP_ROLE | jq -r .Credentials.SecretAccessKey)',
                        'export AWS_SESSION_TOKEN=$(echo $TEMP_ROLE | jq -r .Credentials.SessionToken)',
                    ]
                },
                build: {
                    commands: [
                        'cd FamilyVaultCdk',
                        'npm install',
                        'npx cdk deploy --all --require-approval never',
                    ]
                }
            }
        });

        const testBuildProject = new PipelineProject(this, 'TestDeployProject', {
            buildSpec: buildSpec,
            environment: {
                buildImage: LinuxBuildImage.STANDARD_7_0
            },
            role: codeBuildRole
        });

        const TestDeployAction = new CodeBuildAction({
            actionName: 'test_deploy',
            project: testBuildProject,
            input: sourceOutput,
            outputs: [buildOutput], 
        });

        pipeline.addStage({
            stageName: 'Source',
            actions: [sourceAction],
        });

        pipeline.addStage({
          stageName: 'get_repo_diff',
          actions: [
            new LambdaInvokeAction({
              actionName: 'FetchRepoDiff',
              lambda: fetchDiffLambda.lambdaFunction,
              outputs: [new Artifact('TestAndDeploySpec')],
            })
          ]
        });

        const staticTestingStepFunction = new StaticTestingStepFunction(this, 'StaticTestingStepFunction', testResultsTable, artifactsBucket);

        pipeline.addStage({
            stageName: 'RunStaticTests',
            actions: [
                new StepFunctionInvokeAction({
                    actionName: 'InvokeStaticTests',
                    stateMachine: staticTestingStepFunction.stateMachine,
                    stateMachineInput: StateMachineInput.literal({
                        sourceArtifactBucket: sourceOutput.s3Location.bucketName,
                        sourceArtifactKey: sourceOutput.s3Location.objectKey,
                        diffArtifactBucket: diffOutput.s3Location.bucketName,
                        diffArtifactKey: diffOutput.s3Location.objectKey,
                    })
                })
            ],
        });

        pipeline.addStage({
          stageName: 'deploy required',
          actions: [
            new LambdaInvokeAction({
              actionName: 'DeployRequired',
              lambda: deployRequiredCheckLambda.lambdaFunction,
              outputs: [new Artifact('TestAndDeploySpec')],
            })
          ]
        });

        pipeline.addStage({
            stageName: 'TestDeploy',
            actions: [TestDeployAction],
        });
    }
}
