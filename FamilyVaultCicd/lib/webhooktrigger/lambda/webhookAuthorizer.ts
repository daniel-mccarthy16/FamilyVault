import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from "aws-lambda";

const secretsManagerClient = new SecretsManagerClient();

async function getSecret(secretName: string): Promise<string> {
    console.log(`Fetching secret: ${secretName}`);
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await secretsManagerClient.send(command);
    console.log(`Received secret value: ${response.SecretString ? "*******" : null}`);
    return response.SecretString || "";
}

export const handler = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
    try {
        console.log("Received event:", JSON.stringify(event, null, 2));
        const token = event.authorizationToken;
        console.log(`Received authorization token: ${token}`);
        
        const expectedToken = await getSecret("github-webhook-secret");
        console.log(`Expected authorization token: ${expectedToken}`);
        
        if (token === expectedToken) {
            console.log("Authorization successful");
            return generateAllow(event.methodArn);
        } else {
            console.log("Authorization failed");
            return generateDeny(event.methodArn);
        }
    } catch (error) {
        console.error("Error occurred in the authorizer function:", error);
        throw error;
    }
};

const generateAllow = (methodArn: string): APIGatewayAuthorizerResult => ({
    principalId: 'user',
    policyDocument: {
        Version: '2012-10-17',
        Statement: [
            {
                Action: 'execute-api:Invoke',
                Effect: 'Allow',
                Resource: methodArn
            }
        ]
    }
});

const generateDeny = (methodArn: string): APIGatewayAuthorizerResult => ({
    principalId: 'user',
    policyDocument: {
        Version: '2012-10-17',
        Statement: [
            {
                Action: 'execute-api:Invoke',
                Effect: 'Deny',
                Resource: methodArn
            }
        ]
    }
});
