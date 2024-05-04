// Import the required AWS SDK v3 packages
import { CodePipelineClient, StartPipelineExecutionCommand } from '@aws-sdk/client-codepipeline';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

// Create an instance of the CodePipeline client
const codepipeline = new CodePipelineClient();

// Lambda handler function
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    // Extract pipeline name from environment variables or event body
    const pipelineName = process.env.PIPELINE_NAME;

    if (!pipelineName) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Pipeline name is required' })
        };
    }

    try {
        const command = new StartPipelineExecutionCommand({
            name: pipelineName
        });
        const data = await codepipeline.send(command);
        console.log("Pipeline execution started successfully:", data);
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Pipeline execution started successfully', data })
        };
    } catch (error: unknown) {
        console.error("Error starting pipeline execution:", error);

        // Check if error is an instance of Error
        if (error instanceof Error) {
            return {
                statusCode: 500,
                body: JSON.stringify({ 
                    message: 'Failed to start pipeline execution', 
                    error: error.message  // Use message property safely
                })
            };
        } else {
            // Handle cases where error is not an Error instance
            return {
                statusCode: 500,
                body: JSON.stringify({ 
                    message: 'Failed to start pipeline execution', 
                    error: 'An unknown error occurred' 
                })
            };
        }
    }
};
