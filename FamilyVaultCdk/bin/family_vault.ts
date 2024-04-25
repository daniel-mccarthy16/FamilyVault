#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AppStack } from '../lib/AppStack';

const app = new cdk.App();

new AppStack(app, 'AppStack');


