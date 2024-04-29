#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
//import { FamilyVaultCicdStack } from '../lib/family_vault_cicd-stack';
import { FamilyVaultPipeline } from '../lib/FamilyVaultPipeline';
import Dynamod

const app = new cdk.App();

new 
new FamilyVaultPipeline(app, 'FamilyVaultPipeline');

// new FamilyVaultCicdStack(app, 'FamilyVaultCicdStack', {
// });
