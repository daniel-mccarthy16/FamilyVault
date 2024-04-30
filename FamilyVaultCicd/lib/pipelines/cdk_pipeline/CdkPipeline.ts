import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Pipeline, Artifact } from 'aws-cdk-lib/aws-codepipeline';
import { CodeBuildAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { Project, BuildSpec, LinuxBuildImage, Source, BuildEnvironmentVariableType } from 'aws-cdk-lib/aws-codebuild';
import { Role, ServicePrincipal, PolicyStatement } from 'aws-cdk-lib/aws-iam';

class CdkPipeline extends cdk.Stack {

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

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
        webhook: false, // Disable automatic trigger
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
              'echo Preparing artifacts...',
              'ls -alh' // Optional: List files to verify
            ],
          },
        },
        artifacts: {
          'base-directory': 'FamilyVault/FamilyVaultCdk', // Adjust path as necessary
          'files': ['**/*']
        },
      }),
    });

    // Define the CodeBuild project for running tests
    const testProject = new Project(this, 'RunTests', {
      projectName: 'RunTests',
      environment: {
        buildImage: LinuxBuildImage.STANDARD_5_0,
      },
      buildSpec: BuildSpec.fromObject({
        version: '0.2',
        phases: {
          build: {
            commands: [
              'echo Running npm install...',
              'npm install',
              'echo Running tests...',
              'npm test'
            ],
          },
        },
      }),
    });

    // Define the CodeBuild project for CDK deployment
    const deployProject = new Project(this, 'CDKDeploy', {
      projectName: 'CDKDeploy',
      environment: {
        buildImage: LinuxBuildImage.STANDARD_5_0,
      },
      buildSpec: BuildSpec.fromObject({
        version: '0.2',
        phases: {
          build: {
            commands: [
              'echo Deploying with CDK...',
              'npx cdk deploy --all --require-approval never'
            ],
          },
        },
      }),
    });

    // Define the pipeline
    const pipeline = new Pipeline(this, 'ModularPipeline', {
      pipelineName: 'ModularPipeline',
    });

    // Add stages to the pipeline
    pipeline.addStage({
      stageName: 'CloneRepo',
      actions: [
        new CodeBuildAction({
          actionName: 'CloneRepo',
          project: cloneRepoProject,
          outputs: [ sourceArtifact ], // Output artifact used in subsequent stages
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

    pipeline.addStage({
      stageName: 'Deploy',
      actions: [
        new CodeBuildAction({
          actionName: 'Deploy',
          project: deployProject,
          input: sourceArtifact, // Ensure this project pulls the artifact for deployment
        }),
      ],
    });
  }
}

export default CdkPipeline;
