import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam'; // Import IAM module for policy statements
import { outputNames } from '../../globalconfig';

export class S3Bucket extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // S3 Bucket definition
    this.bucket = new s3.Bucket(this, 'MyUniqueBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: s3.BucketEncryption.S3_MANAGED,
      eventBridgeEnabled: true,
    });

    // Define a policy to allow public read access to the 'public/' folder
    const bucketPolicy = new s3.BucketPolicy(this, 'BucketPolicy', {
      bucket: this.bucket,
    });

    bucketPolicy.document.addStatements(new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [`${this.bucket.bucketArn}/public/*`],
      principals: [new iam.AnyPrincipal()], // TODO - double check this is allowing * principals
    }));

    // Exporting the bucket name
    new CfnOutput(this, 'BucketNameOutput', {
      value: this.bucket.bucketName,
      exportName: outputNames.s3BucketName
    });
  }
}
