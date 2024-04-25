// import * as fs from 'fs';
// import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
// import { Construct } from 'constructs';
//
// export class FamilyVaultConfig extends Construct {
//
//   constructor(scope: Construct, id: string ) {
//     super(scope, id);
//
//     fs.writeFileSync('./config.json', JSON.stringify(config));
//     
//     // Deploy config.json to the S3 bucket
//     new s3deploy.BucketDeployment(this, 'DeployWebsite', {
//         sources: [s3deploy.Source.asset('./build'), s3deploy.Source.asset('./config.json')],
//         destinationBucket: webHostingBucket,
//         distribution: cloudFrontDistribution,
//         distributionPaths: ['/*'],
//     });
//
//
//   }
// }
//
//
//
