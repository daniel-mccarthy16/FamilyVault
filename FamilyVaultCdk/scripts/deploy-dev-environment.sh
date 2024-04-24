#!/bin/bash
#TODO - should this be written in python? should it be a container?

if ! command -v jq &> /dev/null
then
    echo "[ERROR]: jq could not be found on path, please install it to continue."
    exit 1
fi

cd cdk
if ! cdk deploy --outputs-file ../outputs.json; then
    echo "CDK deployment failed."
    exit 1
fi
cd ..

# Navigate to the webapp directory
cd webapp

# Read outputs and write them to .env
echo "Creating .env file..."
if ! cat ../outputs.json | jq -r '"REACT_APP_API_URL=" + .MyStack.ApiGatewayEndpoint.value, "REACT_APP_COGNITO_POOL_ID=" + .MyStack.UserPoolId.value' > .env; then
    echo "Failed to create .env file."
    exit 1
fi

echo ".env file created with the following content:"
cat .env

# Add any additional commands you need to run after creating the .env file
