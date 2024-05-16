# FamilyVault: A Secure, Serverless Family Hub

FamilyVault is a comprehensive, serverless platform designed to securely store and share family memories and documents. Crafted as a mono-repo, this project features a sleek React frontend and a robust backend powered entirely by serverless technologies, including AWS Lambda functions written in Rust for performance-critical tasks.

Developed as a personal side project, FamilyVault serves dual purposes: providing a private and secure digital space for my family to upload and manage important family content, and serving as a sandbox for enhancing my software development skills. The project is a testament to the power of modern web technologies and a fun exploration into the world of serverless architecture, offering a practical solution that keeps family memories at the fingertips while pushing the boundaries of coding and system design.


# TODO 
1. rust lambdas have to be compiled for each codepipeline execution, adds a lot of time. needs to be cached or precompiled somehow
2. cdk not deleting cognito which is annoying for test account
3. add pre-push hook that runs trufflehog


# CLICKOPS
github oauth token - used by cicd pipeline 
control tower 
account provisioning 
identity center created identities 
IAM role test/prod for cicd pipeline to assume
cicd-role-test
