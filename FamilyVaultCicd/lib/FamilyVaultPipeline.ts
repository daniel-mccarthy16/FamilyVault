import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import { Role, ServicePrincipal, ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { TestDeployStage } from './testDeployStage';

export class FamilyVaultPipeline extends cdk.Stack {

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const oauthToken = cdk.SecretValue.secretsManager('cicd-github-token', {
        jsonField: 'github-token'
    });

    const pipelineRole = new Role(this, 'FamilyVaultCICDPipelineRole', {
      assumedBy: new ServicePrincipal('codepipeline.amazonaws.com'),
      description: 'Role for the FamilyVault CI/CD pipeline',
    });

    //TODO - tighten up lol
    pipelineRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));

    const source = CodePipelineSource.gitHub('daniel-mccarthy16/FamilyVault', 'main', {
        authentication: oauthToken,
    });

    const pipeline = new CodePipeline(this, 'FamilyVaultCicdPipeline', {
        pipelineName: 'FamilyVaultCicd',
        role: pipelineRole,  // Use the custom role for the pipeline
        synth: new ShellStep('Synth', {
            input: source,
            commands: [
                'pwd',
                'ls -la',
                'cd FamilyVaultCicd',
                'npm ci',
                'npm run build',
                'npx cdk synth'
            ],
        }),
    });

    const testStage = new TestDeployStage(this, 'TestDeployment', {});
    pipeline.addStage(testStage);

  }
}

