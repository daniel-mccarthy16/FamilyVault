import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Artifact, Pipeline, PipelineType } from 'aws-cdk-lib/aws-codepipeline';
import { GitHubSourceAction, CodeBuildAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { PipelineProject, BuildSpec, LinuxBuildImage } from 'aws-cdk-lib/aws-codebuild';
import { Role, ServicePrincipal, PolicyStatement, Effect, ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { SecretValue } from 'aws-cdk-lib';
import { CodePipeline } from 'aws-cdk-lib/aws-events-targets';

export class FamilyVaultPipeline extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const oauthToken = SecretValue.secretsManager('cicd-github-token', {
            jsonField: 'github-token'
        });

        const sourceOutput = new Artifact();
        const buildOutput = new Artifact();

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
                        'npx cdk deploy --all --require-approval never'
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
            outputs: [buildOutput], //optional, delete probably
        });

        pipeline.addStage({
            stageName: 'Source',
            actions: [sourceAction],
        });

        pipeline.addStage({
            stageName: 'Build',
            actions: [TestDeployAction],
        });
    }
}
