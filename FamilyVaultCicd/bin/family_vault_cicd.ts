#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
//import { FamilyVaultCicdStack } from '../lib/family_vault_cicd-stack';
import { CicdStack } from '../lib/cicd_stack';

const app = new cdk.App();

new CicdStack(app, 'FamilyVaultCicdStack');

// new FamilyVaultCicdStack(app, 'FamilyVaultCicdStack', {
// });
