import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import  ReactPipeline  from './pipelines//react_pipeline/ReactPipeline';
import { WebhookHandler } from './webhooktrigger/WebHookTrigger';
import CdkPipeline from './pipelines/cdk_pipeline/CdkPipeline';
import CicdPipeline from './pipelines/cicd_pipeline/CicdPipeline';

export class CicdStack extends cdk.Stack { 

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {

    super(scope, id, props);

    //self updating pipeline for deploying cdk code
    //TODO - maybe in future add tests and make this somewhat safer

    new CicdPipeline(this, 'CicdPipeline');
    new CdkPipeline(this, 'CdkPipeline');
    new ReactPipeline(this, 'ReactPipeline');
    new WebhookHandler(this, 'WebHookHandler');
  }
}


