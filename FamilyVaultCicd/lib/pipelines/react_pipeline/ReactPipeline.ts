import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Pipeline, Artifact } from "aws-cdk-lib/aws-codepipeline";
import { CodeBuildAction } from "aws-cdk-lib/aws-codepipeline-actions";
import { Project, BuildSpec, LinuxBuildImage } from "aws-cdk-lib/aws-codebuild";
import {
  GitHubSourceAction,
  GitHubTrigger,
} from "aws-cdk-lib/aws-codepipeline-actions";

class ReactPipeline extends Construct {
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

    // Define the CodeBuild project for running tests and linting
    const reactJestTestProject = new Project(
      this,
      "RunReactJestTestsCodeBuild",
      {
        projectName: "RunReactJestTestsCodeBuild",
        environment: {
          buildImage: LinuxBuildImage.STANDARD_7_0,
        },
        buildSpec: BuildSpec.fromObject({
          version: "0.2",
          phases: {
            pre_build: {
              commands: ["npm install"],
            },
            build: {
              commands: ["npm run lint", "npm test", "npm run build"],
            },
          },
        }),
      },
    );

    // Define the pipeline
    const pipeline = new Pipeline(this, "ReactPipeline", {
      pipelineName: "ReactPipeline",
    });

    pipeline.addStage({
      stageName: "CloneRepo",
      actions: [sourceAction],
    });

    pipeline.addStage({
      stageName: "RunTests",
      actions: [
        new CodeBuildAction({
          actionName: "RunReactJestTests",
          project: reactJestTestProject,
          input: sourceArtifact, // Input from previous stage
        }),
      ],
    });

    this.pipeline = pipeline;
  }
}

export default ReactPipeline;
