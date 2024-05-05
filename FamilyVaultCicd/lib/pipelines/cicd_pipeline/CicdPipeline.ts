import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Pipeline, Artifact } from 'aws-cdk-lib/aws-codepipeline';
import { CodeBuildAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { Project, BuildSpec, LinuxBuildImage } from 'aws-cdk-lib/aws-codebuild';
import { GitHubSourceAction, GitHubTrigger } from 'aws-cdk-lib/aws-codepipeline-actions';
import { PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';

class CicdPipeline extends Construct {

  public readonly pipeline: Pipeline;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const sourceArtifact = new Artifact('SourceArtifact');

    const sourceAction = new GitHubSourceAction({
      actionName: 'GitHub_Source',
      owner: 'daniel-mccarthy16',
      repo: 'FamilyVault',
      oauthToken: cdk.SecretValue.secretsManager('cicd-github-token', {
        jsonField: 'github-token'
      }),
      output: sourceArtifact,
      trigger: GitHubTrigger.NONE,
      branch: 'main'
    });

    // Define IAM Role for CodeBuild project
    const codeBuildRole = new Role(this, 'CodeBuildRole', {
      assumedBy: new ServicePrincipal('codebuild.amazonaws.com')
    });

    // Attach policy granting permissions to access SSM parameters
    codeBuildRole.addToPolicy(new PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: ['arn:aws:ssm:ap-southeast-2:891377335175:parameter/cdk-bootstrap/hnb659fds/version']
    }));

    // Define the CodeBuild project
    const cicdDeployProject = new Project(this, 'CicdDeployProject', {
      projectName: 'CicdDeployProject',
      environment: {
        buildImage: LinuxBuildImage.STANDARD_7_0,
      },
      buildSpec: BuildSpec.fromObject({
        version: '0.2',
        phases: {
          build: {
            commands: [
              'cd FamilyVaultCicd',
              'ls -ltrah',
              'npm run install:all',
              'npx cdk deploy --require-approval never'  // Assuming deployment is intended here
            ],
          },
        },
      }),
      role: codeBuildRole // Assign the IAM Role to the CodeBuild project
    });

    const pipeline = new Pipeline(this, 'CicdPipeline', {
      pipelineName: 'CicdPipeline',
    });

    pipeline.addStage({
      stageName: 'CloneRepo',
      actions: [sourceAction],
    });

    pipeline.addStage({
      stageName: 'DeployCicdCdkCode',
      actions: [
        new CodeBuildAction({
          actionName: 'CicdDeploy',
          project: cicdDeployProject,
          input: sourceArtifact,
        }),
      ],
    });

    this.pipeline = pipeline;
  }
}

export default CicdPipeline;
