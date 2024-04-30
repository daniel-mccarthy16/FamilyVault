import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import  CdkPipeline from '../cdk_pipeline/CdkPipeline';
import  ReactPipeline  from '../react_pipeline/ReactPipeline';
import { WebhookHandler } from '../../webhooktrigger/WebHookTrigger';

export class MasterPipeline extends Construct {

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {

    super(scope, id);

    const MasterPipeline = new CodePipeline(this, 'Pipeline', {
      pipelineName: 'MasterCicdPipeline',
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.gitHub('OWNER/REPO', 'main'),
        commands: ['cd FamilyVaultCicd', 'npm ci', 'npm run build', 'npx cdk synth']
      })
    });

    new WebhookHandler(this, 'WebHookHandler');
    new CdkPipeline(this, 'CdkPipeline');
    new ReactPipeline(this, 'ReactPipeline');
    

  }
}


