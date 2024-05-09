import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import ReactPipeline from "./pipelines//react_pipeline/ReactPipeline";
import { WebhookHandler } from "./webhooktrigger/WebHookTrigger";
import CdkPipeline from "./pipelines/cdk_pipeline/CdkPipeline";
import CicdPipeline from "./pipelines/cicd_pipeline/CicdPipeline";

export class CicdStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //self updating pipeline for deploying cdk code
    //TODO - maybe in future add tests and make this somewhat safer
    //TODO - magic strings...

    const cicdPipeline = new CicdPipeline(this, "CicdPipeline");
    const cdkPipeline = new CdkPipeline(this, "CdkPipeline");
    const reactPipeline = new ReactPipeline(this, "ReactPipeline");

    new WebhookHandler(this, "WebHookHandler", {
      cicd: cicdPipeline.pipeline,
      cdk: cdkPipeline.pipeline,
      react: reactPipeline.pipeline,
    });
  }
}
