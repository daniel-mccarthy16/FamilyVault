import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Pipeline, Artifact } from "aws-cdk-lib/aws-codepipeline";
import { CodeBuildAction } from "aws-cdk-lib/aws-codepipeline-actions";
import { Project, BuildSpec, LinuxBuildImage } from "aws-cdk-lib/aws-codebuild";
import {
  GitHubSourceAction,
  GitHubTrigger,
} from "aws-cdk-lib/aws-codepipeline-actions";

class CdkPipeline extends Construct {
  public readonly pipeline: Pipeline;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Artifacts
    const sourceArtifact = new Artifact("SourceArtifact");

    const sourceAction = new GitHubSourceAction({
      actionName: "GitHub_Source",
      owner: "daniel-mccarthy16",
      repo: "FamilyVault",
      oauthToken: cdk.SecretValue.secretsManager("cicd-github-token", {
        jsonField: "github-token",
      }),
      output: sourceArtifact,
      trigger: GitHubTrigger.NONE,
      branch: "main",
    });

    // Define the CodeBuild project for running tests
    const cdkTestProject = new Project(this, "RunCdkTestsCodeBuildProject", {
      projectName: "RunCdkTestsCodeBuildProject",
      environment: {
        buildImage: LinuxBuildImage.STANDARD_5_0,
      },
      buildSpec: BuildSpec.fromObject({
        version: "0.2",
        phases: {
          build: {
            commands: [
              "echo Running npm install...",
              "npm install",
              "echo Running tests...",
              "npm test",
            ],
          },
        },
      }),
    });

    // Define the CodeBuild project for CDK deployment
    const deployProject = new Project(this, "CDKDeploy", {
      projectName: "CDKDeploy",
      environment: {
        buildImage: LinuxBuildImage.STANDARD_5_0,
      },
      buildSpec: BuildSpec.fromObject({
        version: "0.2",
        phases: {
          build: {
            commands: [
              "echo Deploying with CDK...",
              "npx cdk deploy --all --require-approval never",
            ],
          },
        },
      }),
    });

    // Define the pipeline
    const pipeline = new Pipeline(this, "CdkPipeline", {
      pipelineName: "CdkPipeline",
    });

    // Add stages to the pipeline
    pipeline.addStage({
      stageName: "CloneRepo",
      actions: [sourceAction],
    });

    pipeline.addStage({
      stageName: "RunTests",
      actions: [
        new CodeBuildAction({
          actionName: "RunTests",
          project: cdkTestProject,
          input: sourceArtifact, // Input from previous stage
        }),
      ],
    });

    pipeline.addStage({
      stageName: "Deploy",
      actions: [
        new CodeBuildAction({
          actionName: "Deploy",
          project: deployProject,
          input: sourceArtifact, // Ensure this project pulls the artifact for deployment
        }),
      ],
    });

    this.pipeline = pipeline;
  }
}

export default CdkPipeline;
