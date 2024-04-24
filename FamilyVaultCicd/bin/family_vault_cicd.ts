#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
//import { FamilyVaultCicdStack } from '../lib/family_vault_cicd-stack';
import { FamilyVaultPipeline } from '../lib/FamilyVaultPipeline';

const app = new cdk.App();
new FamilyVaultPipeline(app, 'FamilyVaultPipeline');

// new FamilyVaultCicdStack(app, 'FamilyVaultCicdStack', {
// });
