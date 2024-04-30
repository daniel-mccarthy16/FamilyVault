import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Pipeline, Artifact } from 'aws-cdk-lib/aws-codepipeline';
import { CodeBuildAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { Project, BuildSpec, LinuxBuildImage, Source, BuildEnvironmentVariableType } from 'aws-cdk-lib/aws-codebuild';
import { Role, ServicePrincipal, PolicyStatement } from 'aws-cdk-lib/aws-iam';

class ReactPipeline extends Construct {

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Artifacts
    const sourceArtifact = new Artifact('SourceArtifact');
    const buildOutput = new Artifact('BuildOutput');

    const oauthToken = cdk.SecretValue.secretsManager('cicd-github-token', {
        jsonField: 'github-token'
    });

    // Define the CodeBuild project for cloning the repository
    const cloneRepoProject = new Project(this, 'CloneRepository', {
      projectName: 'CloneRepository',
      source: Source.gitHub({
        owner: 'daniel-mccarthy16',
        repo: 'FamilyVault',
        webhook: false,
      }),
      environment: {
        buildImage: LinuxBuildImage.STANDARD_5_0,
        environmentVariables: {
          'GITHUB_TOKEN': {
            value: oauthToken.toString(),
            type: BuildEnvironmentVariableType.PLAINTEXT
          }
        }
      },
      buildSpec: BuildSpec.fromObject({
        version: '0.2',
        phases: {
          build: {
            commands: [
              'echo Cloning the repository...',
              'git clone https://x-access-token:${GITHUB_TOKEN}@github.com/daniel-mccarthy16/FamilyVault.git .',
              'echo Preparing artifacts from FamilyVaultReact...',
              'cd FamilyVaultReact',
              'ls -alh'
            ],
          },
        },
        artifacts: {
          'base-directory': 'FamilyVault/FamilyVaultReact',
          'files': ['**/*']
        },
      }),
    });

    // Define the CodeBuild project for running tests and linting
    const testProject = new Project(this, 'RunTests', {
      projectName: 'RunTests',
      environment: {
        buildImage: LinuxBuildImage.STANDARD_7_0,
      },
      buildSpec: BuildSpec.fromObject({
        version: '0.2',
        phases: {
          pre_build: {
            commands: [
              'npm install',
            ],
          },
          build: {
            commands: [
              'npm run lint',
              'npm test',
              'npm run build',
            ],
          },
        },
      }),
    });

    // Define the pipeline
    const pipeline = new Pipeline(this, 'ReactPipeline', {
      pipelineName: 'ReactPipeline',
    });

    // Add stages to the pipeline
    pipeline.addStage({
      stageName: 'CloneRepo',
      actions: [
        new CodeBuildAction({
          actionName: 'CloneRepo',
          project: cloneRepoProject,
          outputs: [ sourceArtifact ] 
        }),
      ],
    });

    pipeline.addStage({
      stageName: 'RunTests',
      actions: [
        new CodeBuildAction({
          actionName: 'RunTests',
          project: testProject,
          input: sourceArtifact, // Input from previous stage
        }),
      ],
    });
  }
}

export default ReactPipeline;
