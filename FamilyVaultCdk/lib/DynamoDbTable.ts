import { Construct } from 'constructs';
import { Stack, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { aws_dynamodb as dynamodb } from 'aws-cdk-lib';
import { DataExports } from '../appConstants';

export class DynamoDbTable extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.table = new dynamodb.Table(this, 'FamilyVaultTable', {
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY, // Consider using RETAIN for production environments
      tableName: 'FamilyVault', // This is a fixed table name; ensure it's unique or auto-generated per environment
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Export the table name using CfnOutput
    new CfnOutput(this, 'DynamoDBTableExport', {
      value: this.table.tableName,
      exportName: DataExports.DYNAMODB_TABLE, // This should match the export name you're using to import elsewhere
    });
  }
}
