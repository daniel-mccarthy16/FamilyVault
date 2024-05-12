import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import ReactPipeline from "./pipelines//react_pipeline/ReactPipeline";
import { WebhookHandler } from "./webhooktrigger/WebHookTrigger";
import CdkPipeline from "./pipelines/cdk_pipeline/CdkPipeline";
import CicdPipeline from "./pipelines/cicd_pipeline/CicdPipeline";
import { Bucket } from "aws-cdk-lib/aws-s3";

export class CicdStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //self updating pipeline for deploying cdk code
    //TODO - maybe in future add tests and make this somewhat safer
    //TODO - magic strings...
    //
    const cacheBucket = new Bucket(this, "CodeBuildCacheBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const cicdPipeline = new CicdPipeline(this, "CicdPipeline", cacheBucket);
    const cdkPipeline = new CdkPipeline(this, "CdkPipeline");
    const reactPipeline = new ReactPipeline(this, "ReactPipeline");

    new WebhookHandler(this, "WebHookHandler", {
      cicd: cicdPipeline.pipeline,
      cdk: cdkPipeline.pipeline,
      react: reactPipeline.pipeline,
    });
  }
}

// Create an S3 bucket for CodeBuild caching
