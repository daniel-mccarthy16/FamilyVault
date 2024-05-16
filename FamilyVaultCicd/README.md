1. Source
Description: Automatically triggers on commit/push to a branch. Pulls the latest code for all components of the monorepo.
Tools: GitHub, Bitbucket, or AWS CodeCommit with AWS CodePipeline's source action.
2. Calculate Diff
Description: Determines which components of the monorepo have changed and thus require testing or deployment. This step sets flags like cdk_tests_required or react_deploy_required.
Implementation: A Lambda function can be used to perform the diff and update DynamoDB with the components that need attention.
3. Run Required Tests
Description: Executes tests based on the flags set in the previous step. Each test result updates DynamoDB with its status (passed, failed) and details (error messages if any).
Implementation: This can be implemented using AWS Step Functions to handle parallel execution and conditional logic, ensuring that only necessary tests are run. Each test step within the Step Function will update DynamoDB with its result.
4. Run Deploys
Description: Deploys components conditionally based on test results stored in DynamoDB. For instance, React is deployed only if React tests pass.
Implementation: Similar to testing, use Step Functions for managing conditional and parallel deployments. Each deployment step will record its outcome in DynamoDB.
5. Check Status in DynamoDB
Description: Before proceeding to manual approval, a verification step checks the status of all tests and deployments in DynamoDB.
Implementation: A Lambda function reads the statuses from DynamoDB and decides whether to proceed. It also formats and outputs detailed status reports for any failures.
6. Manual Approval
Description: A gate where manual approval is required to proceed to E2E testing and deployment to production.
Implementation: Utilize the manual approval feature of AWS CodePipeline.
7. E2E and DAST Tests
Description: Conduct end-to-end tests and Dynamic Application Security Testing to ensure the integrated application functions correctly and securely.
Implementation: Can be executed using AWS CodeBuild or external tools, depending on the specific requirements and setup.
8. Production Deploy
Description: Final deployment to production, executed only if all previous steps, including E2E tests, are successful.
Implementation: Depending on the complexity, this might also be managed by AWS Step Functions or directly through CodePipeline with conditional actions based on the test results.
Suggestions for Improvement:
Artifacts: Make sure artifacts (builds, test results) are handled efficiently between stages if needed. Consider using AWS S3 for artifact storage.
Notifications: Integrate AWS SNS or similar tools to send notifications on failures or required manual approvals.
Monitoring and Logging: Ensure detailed logging and monitoring are in place, possibly using AWS CloudWatch, to track the pipeline's operation and quickly diagnose issues.
Security: Review IAM policies and ensure that permissions are Strictly controlled, especially for operations that affect production environments.


#TODO - remove this TODOOOO
