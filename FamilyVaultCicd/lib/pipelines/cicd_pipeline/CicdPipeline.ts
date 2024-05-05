import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Pipeline, Artifact } from 'aws-cdk-lib/aws-codepipeline';
import { CodeBuildAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { Project, BuildSpec, LinuxBuildImage } from 'aws-cdk-lib/aws-codebuild';
import { GitHubSourceAction, GitHubTrigger } from 'aws-cdk-lib/aws-codepipeline-actions';

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

    // Define the CodeBuild project for deploying updates
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
              'npm ci',
              'npm run build',
              'npx cdk deploy --require-approval never'  // Assuming deployment is intended here
            ],
          },
        },
      }),
    });

    // Define the pipeline
    const pipeline = new Pipeline(this, 'CicdPipeline', {
      pipelineName: 'CicdPipeline',
    });

    // Add stages to the pipeline
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
