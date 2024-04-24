// test-deploy-stage.ts
//TODO - is this nested stack required?
import { Construct } from 'constructs';
import { Stage, StageProps, Stack } from 'aws-cdk-lib';
import { PipelineProject, BuildSpec, LinuxBuildImage, Project } from 'aws-cdk-lib/aws-codebuild';
import { Role, ServicePrincipal, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

class TestDeployStack extends Stack {
    public readonly codeBuildProject: Project;

    constructor(scope: Construct, id: string, props?: StageProps) {
        super(scope, id, props);

        // Create an IAM role for CodeBuild within the Stack
        const codeBuildRole = new Role(this, 'CodeBuildRole', {
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
        this.codeBuildProject = new PipelineProject(this, 'TestDeployProject', {
            buildSpec: buildSpec,
            environment: {
                buildImage: LinuxBuildImage.STANDARD_5_0,
            },
            role: codeBuildRole
        });
    }
}

export class TestDeployStage extends Stage {
    constructor(scope: Construct, id: string, props: StageProps) {
        super(scope, id, props);

        new TestDeployStack(this, 'TestDeployStack', {
            env: props.env // Propagate the environment to the stack
        });
    }
}
