import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import { PipelineProject, BuildSpec, LinuxBuildImage } from 'aws-cdk-lib/aws-codebuild';
import { Role, ServicePrincipal, PolicyStatement, Effect, ManagedPolicy } from 'aws-cdk-lib/aws-iam';

export class FamilyVaultPipeline extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Setup OAuth Token for GitHub
        const oauthToken = cdk.SecretValue.secretsManager('cicd-github-token', {
            jsonField: 'github-token'
        });

        // Define Role for the Pipeline
        const pipelineRole = new Role(this, 'FamilyVaultCICDPipelineRole', {
            assumedBy: new ServicePrincipal('codepipeline.amazonaws.com'),
            description: 'Role for the FamilyVault CI/CD pipeline',
        });

        pipelineRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));

        // Define Source Stage
        const source = CodePipelineSource.gitHub('daniel-mccarthy16/FamilyVault', 'main', {
            authentication: oauthToken,
        });

        // Define the Synth Step
        const synth = new ShellStep('Synth', {
            input: source,
            commands: [
                'pwd',
                'ls -la',
                'cd FamilyVaultCicd',
                'npm ci',
                'npm run build',
                'npx cdk synth'
            ],
            primaryOutputDirectory: 'FamilyVaultCicd/cdk.out'
        });

        // Create the Pipeline
        const pipeline = new CodePipeline(this, 'FamilyVaultCicdPipeline', {
            pipelineName: 'FamilyVaultCicd',
            role: pipelineRole,
            synth: synth
        });

        // Add Test Deployment Stage
        const testDeployStage = this.addTestDeployStage();
        pipeline.addStage(testDeployStage);
    }

    private addTestDeployStage(): cdk.Stage {
        const stage = new cdk.Stage(this, 'TestDeployStage');

        // Create an IAM role for CodeBuild within the Stage
        const codeBuildRole = new Role(stage, 'CodeBuildRole', {
            assumedBy: new ServicePrincipal('codebuild.amazonaws.com')
        });

        codeBuildRole.addToPolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['sts:AssumeRole'],
            resources: ['arn:aws:iam::058264330237:role/cicd-role-test']
        }));

        // Define the inline build spec
        const buildSpec = BuildSpec.fromObject({
            version: '0.2',
            phases: {
                pre_build: {
                    commands: [
                        'echo Assuming cross-account role...',
                        `ASSUME_ROLE_ARN="arn:aws:iam::058264330237:role/cicd-role-test"`,
                        `TEMP_ROLE=$(aws sts assume-role --role-arn $ASSUME_ROLE_ARN --role-session-name CodeBuildDeploymentSession)`,
                        'export AWS_ACCESS_KEY_ID=$(echo $TEMP_ROLE | jq -r .Credentials.AccessKeyId)',
                        'export AWS_SECRET_ACCESS_KEY=$(echo $TEMP_ROLE | jq -r .Credentials.SecretAccessKey)',
                        'export AWS_SESSION_TOKEN=$(echo $TEMP_ROLE | jq -r .Credentials.SessionToken)',
                        'echo Installing source dependencies...',
                        'npm install',
                    ]
                },
                build: {
                    commands: [
                        'echo Changing to the FamilyVaultCdk directory...',
                        'cd FamilyVaultCdk',
                        'echo Starting build and deploy...',
                        'npx cdk deploy --all --require-approval never'
                    ]
                }
            }
        });

        // Define the CodeBuild project
        new PipelineProject(stage, 'TestDeployProject', {
            buildSpec: buildSpec,
            environment: {
                buildImage: LinuxBuildImage.STANDARD_5_0,
            },
            role: codeBuildRole
        });

        return stage;
    }
}
