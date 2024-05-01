import { APIGatewayProxyHandler, APIGatewayEvent, Context } from 'aws-lambda';

// Handler function
export const handler: APIGatewayProxyHandler = async (event: APIGatewayEvent, context: Context) => {
    try {
        // Ensure the event body is valid
        if (!event.body) {
            throw new Error('No event body');
        }

        // Parse the GitHub webhook payload
        const body = JSON.parse(event.body);
        
        // This object will track changes
        const changes = {
            FamilyVaultCdk: false,
            FamilyVaultCicd: false,
            FamilyVaultReact: false
        };

        // Check for commits and modified paths
        if (body.commits && body.commits.length > 0) {
            for (const commit of body.commits) {
                // Check modified, added, and removed arrays
                const paths = [...commit.modified, ...commit.added, ...commit.removed];
                for (const path of paths) {
                    if (path.startsWith('FamilyVaultCdk/')) {
                        changes.FamilyVaultCdk = true;
                    }
                    if (path.startsWith('FamilyVaultCicd/')) {
                        changes.FamilyVaultCicd = true;
                    }
                    if (path.startsWith('FamilyVaultReact/')) {
                        changes.FamilyVaultReact = true;
                    }
                }
            }
        }

        // Logging changes
        console.log('Changes detected:', changes);

        // Response to API Gateway
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'Webhook processed successfully',
                changes
            })
        };
    } catch (error) {
        console.error('Error processing webhook', error);

        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Error processing your request' })
        };
    }
};
