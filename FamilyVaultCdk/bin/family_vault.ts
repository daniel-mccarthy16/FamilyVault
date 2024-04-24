#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AppStack } from '../lib/AppStack';
import { PipelineStack } from '../lib/cicd/pipelineStack';

const app = new cdk.App();

new PipelineStack(app, 'PipelineStack');
new AppStack(app, 'AppStack');


