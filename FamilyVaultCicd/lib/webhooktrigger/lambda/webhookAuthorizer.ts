import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from "aws-lambda";

const secretsManagerClient = new SecretsManagerClient();

async function getSecret(secretName: string): Promise<string> {
    console.log(`Fetching secret: ${secretName}`);
    try {
        const command = new GetSecretValueCommand({ SecretId: secretName });
        const response = await secretsManagerClient.send(command);
        console.log(`Received secret value: ${response.SecretString ? "*******" : null}`);
        return response.SecretString || "";
    } catch (error) {
        console.error("Error fetching secret:", error);
        throw error;
    }
}

export const handler = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
    try {
        console.log("Received event:", JSON.stringify(event, null, 2));
        let token = event.authorizationToken;
        console.log(`Received authorization token: ${token}`);
        
        // Remove the "token " prefix if present
        if (token.toLowerCase().startsWith("token ")) {
            token = token.slice(6).trim();
        }

        const expectedToken = await getSecret("github-webhook-secret");
        console.log(`First 5 characters of received token: ${token}`);
        console.log(`First 5 characters of expected token: ${expectedToken}`);
        
        if (token === expectedToken) {
            console.log("Authorization successful");
            return generateAllow(event.methodArn);
        } else {
            console.log("Authorization failed");
            return generateDeny(event.methodArn);
        }
    } catch (error) {
        console.error("Error occurred in the authorizer function:", error);
        return {
            principalId: 'user',
            policyDocument: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Action: 'execute-api:Invoke',
                        Effect: 'Deny',
                        Resource: event.methodArn
                    }
                ]
            }
        };
    }
};

const generateAllow = (methodArn: string): APIGatewayAuthorizerResult => {
    const policy: APIGatewayAuthorizerResult = {
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
    };

    console.log("Generated allow policy:", JSON.stringify(policy, null, 2));
    return policy;
};

const generateDeny = (methodArn: string): APIGatewayAuthorizerResult => {
    const policy: APIGatewayAuthorizerResult = {
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
    };

    console.log("Generated deny policy:", JSON.stringify(policy, null, 2));
    return policy;
};
