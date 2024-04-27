CLICKOPS

github oauth token - used by cicd pipeline 
control tower 
account provisioning 
identity center created identities 
IAM role test/prod for cicd pipeline to assume
cicd-role-test


bootstrap environments...
cdk bootstrap aws://058264330237/ap-southeast-2 \
    --trust 891377335175 \
    --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess


#TODO 
1. rust lambdas have to be compiled for each codepipeline execution, adds a lot of time. needs to be cached or precompiled somehow
2. cdk not deleting cognito which is annoying for test account



