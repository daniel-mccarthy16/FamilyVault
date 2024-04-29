import { App } from 'aws-cdk-lib';
import { AppStack } from '../lib/AppStack';
import { Template, Match, Capture } from 'aws-cdk-lib/assertions';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy, CfnOutput } from 'aws-cdk-lib';

describe('MyAppStack', () => {
  const app = new App();
  const stack = new AppStack(app, 'AppStack');
  const template = Template.fromStack(stack);

it('has the correct S3 buckets', () => {
  template.resourceCountIs('AWS::S3::Bucket', 1);
  template.hasResourceProperties('AWS::S3::Bucket', {
    VersioningConfiguration: {
      Status: "Suspended" // Since versioning is false
    },
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: false, // Allow the bucket policy to grant public access to 'public/' prefix
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true
    },
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [
        {
          ServerSideEncryptionByDefault: {
            SSEAlgorithm: "AES256"
          }
        }
      ]
    }
  });
});


  // it('exports the bucket name', () => {
  //   template.hasOutput('BucketNameOutput', {
  //     Export: {
  //       Name: Match.anyValue()
  //     },
  //     Value: Match.anyValue()
  //   });
  // });

});
