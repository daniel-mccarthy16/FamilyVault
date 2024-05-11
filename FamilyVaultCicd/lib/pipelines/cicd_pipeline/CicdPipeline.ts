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

//TODO - the self updating aspect of this pipeline works although the 'last execution status' will show as cancelled. Issue appears to be non functional but requires further investigation and would be nice to have the last execution show as a success
//TODO - npm run lint and npm run prettier commands need looking at, currently have to specific the exact binary (cant simply add a 'eslint xxxxx' command for some reason
class CicdPipeline extends Construct {
  public readonly pipeline: Pipeline;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const sourceArtifact = new Artifact("SourceArtifact");
    const projectArtifact = new Artifact("ProjectArtifact");
    const buildArtifact = new Artifact("BuildArtifact");

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

    const prepareArtifactProject = new Project(this, "PrepareArtifactProject", {
      projectName: "PrepareArtifact",
      environment: {
        buildImage: LinuxBuildImage.STANDARD_7_0,
      },
      buildSpec: BuildSpec.fromObject({
        version: "0.2",
        phases: {
          build: {
            commands: [
              "ls -ltrah || true",
              "cd FamilyVaultCicd",
              "ls -ltrah || true", // Just to verify contents
            ],
          },
        },
        artifacts: {
          "base-directory": "FamilyVaultCicd",
          files: ["**/*"],
        },
      }),
    });

    const installDependenciesProject = new Project(this, "BuildProject", {
      projectName: "FamilyVaultInstallDependencies",
      environment: {
        buildImage: LinuxBuildImage.STANDARD_7_0,
      },
      buildSpec: BuildSpec.fromObject({
        version: "0.2",
        phases: {
          build: {
            commands: [
              "ls -ltrah || true",
              "ls -ltrah node_modules/ || true",
              "npm config list",
              "npm run install:all",
              "ls -ltrah node_modules/ || true",
            ],
          },
        },
        artifacts: {
          "base-directory": ".",
          files: ["**/*"],
        },
      }),
    });

    const cicdLintProject = new Project(this, "CicdLintProject", {
      projectName: "CicdLintingProject",
      environment: {
        buildImage: LinuxBuildImage.STANDARD_7_0,
      },
      buildSpec: BuildSpec.fromObject({
        version: "0.2",
        phases: {
          build: {
            commands: [
              "ls -ltrah node_modules/ || true",
              "pwd",
              "npm config list",
              "ls -ltrah || true",
              "npm run lint-cicd",
              // "npm run lint",
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
      buildSpec: BuildSpec.fromObject({
        version: "0.2",
        phases: {
          build: {
            commands: [
              "ls -ltrah node_modules/ || true",
              "pwd",
              "npm config list",
              "ls -ltrah || true",
              "npm run prettier",
            ],
          },
        },
      }),
    });

    // Define IAM Role for CodeBuild project
    const cdkDeployCodeBuildRole = new Role(this, "CodeBuildRole", {
      assumedBy: new ServicePrincipal("codebuild.amazonaws.com"),
    });

    //TODO - narrow down permissions, it was complaining about not being able to see the cdk bucket in this account but it really was just lacking permissions
    // Attach policy granting permissions to access SSM parameters
    // cdkDeployCodeBuildRole.addToPolicy(new PolicyStatement({
    //   actions: ['ssm:GetParameter'],
    //   resources: ['arn:aws:ssm:ap-southeast-2:891377335175:parameter/cdk-bootstrap/hnb659fds/version']
    // }));
    // Attach AdministratorAccess managed policy
    cdkDeployCodeBuildRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess"),
    );

    // Define the CodeBuild project
    const cicdDeployProject = new Project(this, "CicdDeployProject", {
      projectName: "CicdDeployProject",
      environment: {
        buildImage: LinuxBuildImage.STANDARD_7_0,
      },
      buildSpec: BuildSpec.fromObject({
        version: "0.2",
        phases: {
          build: {
            commands: [
              "ls -ltrah || true",
              "npx cdk deploy --require-approval never",
            ],
          },
        },
      }),
      role: cdkDeployCodeBuildRole, // Assign the IAM Role to the CodeBuild project
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
      stageName: "prepare_project",
      actions: [
        new CodeBuildAction({
          actionName: "Build",
          project: prepareArtifactProject,
          input: sourceArtifact,
          outputs: [projectArtifact],
        }),
      ],
    });

    pipeline.addStage({
      stageName: "install_dependencies",
      actions: [
        new CodeBuildAction({
          actionName: "Build",
          project: installDependenciesProject,
          input: projectArtifact,
          outputs: [buildArtifact],
        }),
      ],
    });

    pipeline.addStage({
      stageName: "linting",
      actions: [
        new CodeBuildAction({
          actionName: "Linting",
          project: cicdLintProject,
          input: buildArtifact,
        }),
      ],
    });

    pipeline.addStage({
      stageName: "formatter",
      actions: [
        new CodeBuildAction({
          actionName: "Prettier",
          project: cicdPrettierProject,
          input: buildArtifact,
        }),
      ],
    });

    pipeline.addStage({
      stageName: "deploy",
      actions: [
        new CodeBuildAction({
          actionName: "CicdDeploy",
          project: cicdDeployProject,
          input: buildArtifact,
        }),
      ],
    });

    this.pipeline = pipeline;
  }
}

export default CicdPipeline;
