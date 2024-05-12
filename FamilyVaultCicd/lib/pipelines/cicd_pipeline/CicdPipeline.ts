import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Pipeline, Artifact, PipelineType } from "aws-cdk-lib/aws-codepipeline";
import { CodeBuildAction } from "aws-cdk-lib/aws-codepipeline-actions";
import { Project, BuildSpec, LinuxBuildImage } from "aws-cdk-lib/aws-codebuild";
import {
  GitHubSourceAction,
  GitHubTrigger,
} from "aws-cdk-lib/aws-codepipeline-actions";
import { Role, ServicePrincipal, ManagedPolicy } from "aws-cdk-lib/aws-iam";
import { Cache } from "aws-cdk-lib/aws-codebuild";
import { Bucket } from "aws-cdk-lib/aws-s3";

//TODO - investing if npm cache caching is working as intended
//TODO - having real issues when install dependencies into an artifact and importing it in the olther stages, needs to be investigated. potentially has to do with npm installing before passing only the cicd subfolder through which is borking npm paths somewhere?

class CicdPipeline extends Construct {
  public readonly pipeline: Pipeline;

  constructor(scope: Construct, id: string, cachingBucket: Bucket) {
    super(scope, id);

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

    const installDependenciesProject = new Project(this, "BuildProject", {
      projectName: "FamilyVaultInstallDependencies",
      environment: {
        buildImage: LinuxBuildImage.STANDARD_7_0,
      },
      cache: Cache.bucket(cachingBucket),
      buildSpec: BuildSpec.fromObject({
        version: "0.2",
        cache: {
          paths: ["/root/.npm/**/*"],
        },
        phases: {
          build: {
            commands: [
              "ls -ltrah || true",
              "cd FamilyVaultCicd",
              "ls -ltrah node_modules/ || true",
              "npm config list",
              "npm run install:all",
              "ls -ltrah node_modules/ || true",
            ],
          },
        },
      }),
    });

    const cicdLintProject = new Project(this, "CicdLintProject", {
      projectName: "CicdLintingProject",
      environment: {
        buildImage: LinuxBuildImage.STANDARD_7_0,
      },
      cache: Cache.bucket(cachingBucket),
      buildSpec: BuildSpec.fromObject({
        version: "0.2",
        cache: {
          paths: ["/root/.npm/**/*"],
        },
        phases: {
          build: {
            commands: [
              "ls -ltrah node_modules/ || true",
              "cd FamilyVaultCicd",
              "npm run install:all",
              "pwd",
              "npm config list",
              "ls -ltrah || true",
              "npm run lint",
            ],
          },
        },
      }),
    });

    const cicdPrettierProject = new Project(this, "CicdPrettierProject", {
      projectName: "CicdPrettierProject",
      environment: {
        buildImage: LinuxBuildImage.STANDARD_7_0,
      },
      cache: Cache.bucket(cachingBucket),
      buildSpec: BuildSpec.fromObject({
        version: "0.2",
        cache: {
          paths: ["/root/.npm/**/*"],
        },
        phases: {
          build: {
            commands: [
              "ls -ltrah node_modules/ || true",
              "cd FamilyVaultCicd",
              "npm run install:all",
              "pwd",
              "npm config list",
              "ls -ltrah || true",
              "npm run prettier-check",
            ],
          },
        },
      }),
    });

    const cicdDeployProject = new Project(this, "CicdDeployProject", {
      projectName: "CicdDeployProject",
      cache: Cache.bucket(cachingBucket),
      environment: {
        buildImage: LinuxBuildImage.STANDARD_7_0,
      },
      buildSpec: BuildSpec.fromObject({
        version: "0.2",
        cache: {
          paths: ["/root/.npm/**/*"],
        },
        phases: {
          build: {
            commands: [
              "ls -ltrah || true",
              "cd FamilyVaultCicd",
              "npm run install:all",
              "npx cdk deploy --require-approval never",
            ],
          },
        },
      }),
      role: new Role(this, "CodeBuildRole", {
        assumedBy: new ServicePrincipal("codebuild.amazonaws.com"),
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess"),
        ],
      }),
    });

    const pipeline = new Pipeline(this, "CicdPipeline", {
      pipelineName: "CicdPipeline",
      pipelineType: PipelineType.V2,
    });

    pipeline.addStage({
      stageName: "source",
      actions: [sourceAction],
    });

    pipeline.addStage({
      stageName: "install_dependencies",
      actions: [
        new CodeBuildAction({
          actionName: "Build",
          project: installDependenciesProject,
          input: sourceArtifact,
        }),
      ],
    });

    pipeline.addStage({
      stageName: "linting",
      actions: [
        new CodeBuildAction({
          actionName: "Linting",
          project: cicdLintProject,
          input: sourceArtifact,
        }),
      ],
    });

    pipeline.addStage({
      stageName: "formatter",
      actions: [
        new CodeBuildAction({
          actionName: "Prettier",
          project: cicdPrettierProject,
          input: sourceArtifact,
        }),
      ],
    });

    pipeline.addStage({
      stageName: "deploy",
      actions: [
        new CodeBuildAction({
          actionName: "CicdDeploy",
          project: cicdDeployProject,
          input: sourceArtifact,
        }),
      ],
    });

    this.pipeline = pipeline;
  }
}

export default CicdPipeline;
