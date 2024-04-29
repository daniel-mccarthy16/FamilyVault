import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class cicdDynamodb extends Construct {

  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.table = new dynamodb.Table(this, 'TestRunsTable', {
      partitionKey: { name: 'RunID', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'Type', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DELETE// Adjust based on your environment's requirements
    });

  }
}
