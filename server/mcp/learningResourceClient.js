const path = require("path");

const { Client } = require("@modelcontextprotocol/sdk/client/index.js");

const {
    StdioClientTransport
} = require("@modelcontextprotocol/sdk/client/stdio.js");

let client;
let transport;
let connectionPromise;

async function connectMCP() {
    if (client && connectionPromise) {
        await connectionPromise;
        return client;
    }

    client = new Client({
        name: "learning-resource-client",
        version: "1.0.0"
    });

    transport = new StdioClientTransport({
        command: process.execPath,
        args: [
            path.join(__dirname, "learningResourceServer.js")
        ],
        env: { ...process.env }
    });

    connectionPromise = client.connect(transport);

    try {
        await connectionPromise;
        console.log("Learning Resources MCP connected.");
    } catch (error) {
        client = null;
        transport = null;
        connectionPromise = null;
        throw error;
    }

    return client;
}

async function searchLearningResources({
    career,
    skills = [],
    category = "all",
    level = "beginner"
}) {
    const mcpClient = await connectMCP();

    const result = await mcpClient.callTool({
        name: "search_learning_resources",
        arguments: {
            career,
            skills,
            category,
            level
        }
    });

    if (result.isError) {
        throw new Error(
            result.content?.map(item => item.text).join("\n") ||
            "Learning resource search failed."
        );
    }

    return result.content;
}

module.exports = {
    connectMCP,
    searchLearningResources
};