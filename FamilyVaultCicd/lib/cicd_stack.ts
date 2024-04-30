import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {  MasterPipeline } from './pipelines/master_pipeline/MasterPipeline'


export class CicdStack extends cdk.Stack { 
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {

    //TODO - dont store return values if not needed, will be confusing in the future
    super(scope, id, props);


    new MasterPipeline(this, 'MasterPipeline');


  }
}


