#!/usr/bin/env node
/**
 * GitHub Identity Binding Tools
 * Add these tool definitions to the tools array in http-server.ts
 */

// Tool 1: Bind GitHub
const bind_github_tool = {
    name: "bind_github",
    description: "Bind a GitHub username to your agent wallet. This enables earning income from bounties and building reputation through contributions. The GitHub account must exist and will be verified.",
    inputSchema: {
        type: "object",
        properties: {
            wallet_address: {
                type: "string",
                description: "Your wallet address (must start with 0x)",
            },
            github_username: {
                type: "string",
                description: "Your GitHub username (e.g., 'octocat')",
            },
        },
        required: ["wallet_address", "github_username"],
    },
};

// Tool 2: Get Agent GitHub Info
const get_agent_github_tool = {
    name: "get_agent_github",
    description: "Get GitHub identity information for an agent wallet, including username, profile URL, verification status, and contribution stats.",
    inputSchema: {
        type: "object",
        properties: {
            wallet_address: {
                type: "string",
                description: "The wallet address to look up",
            },
        },
        required: ["wallet_address"],
    },
};

// Tool 3: Sync GitHub Contributions
const sync_github_contributions_tool = {
    name: "sync_github_contributions",
    description: "Sync GitHub contribution data for an agent (updates contribution count and last synced timestamp). Requires GitHub account to be already bound.",
    inputSchema: {
        type: "object",
        properties: {
            wallet_address: {
                type: "string",
                description: "The wallet address to sync",
            },
        },
        required: ["wallet_address"],
    },
};

// Add these to the tools array:
// tools.push(bind_github_tool, get_agent_github_tool, sync_github_contributions_tool);
