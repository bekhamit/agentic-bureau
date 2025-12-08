# GitHub Identity Binding - Implementation Instructions

This file contains the code snippets to add GitHub identity binding to http-server.ts

## Step 1: Add new tools to the tools array (after line 151, before ]

```typescript
  // GitHub Identity Binding Tools
  {
    name: "bind_github",
    description: "Bind a GitHub username to your agent wallet. This enables earning income from bounties and building reputation through contributions.",
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
  },
  {
    name: "get_agent_github",
    description: "Get GitHub identity information for an agent wallet",
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
  },
  {
    name: "sync_github_contributions",
    description: "Sync GitHub contribution data for an agent",
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
  },
```

## Step 2: Add handlers in the switch statement (before default case, around line 505)

```typescript
      case "bind_github": {
        const walletAddress = args.wallet_address as string;
        const githubUsername = args.github_username as string;
        
        // Validate wallet address
        if (!walletAddress || !walletAddress.startsWith('0x')) {
          throw new Error("Invalid wallet address. Must start with 0x");
        }
        
        // Validate GitHub username
        if (!githubUsername || typeof githubUsername !== 'string') {
          throw new Error("github_username is required");
        }
        
        console.log(`Binding GitHub ${githubUsername} to wallet ${walletAddress}`);
        
        // Verify GitHub username exists
        const isValid = await verifyGitHubUsername(githubUsername);
        if (!isValid) {
          throw new Error(`GitHub username '${githubUsername}' not found`);
        }
        
        // Get or create agent
        let agent = await getAgent(walletAddress);
        if (!agent) {
          console.log(`Creating new agent profile for ${walletAddress}`);
          agent = await createAgent(walletAddress);
        }
        
        // Bind GitHub to agent
        const updatedAgent = await bindGitHubToAgent(
          walletAddress,
          githubUsername,
          getGitHubProfileUrl(githubUsername)
        );
        
        // Fetch and update contribution data
        const contributions = await fetchGitHubContributions(githubUsername);
        await updateGitHubContributionsDB(
          walletAddress,
          contributions.total_contributions
        );
        
        return {
          content: [
            {
              type: "text",
              text: `✅ GitHub bound successfully!

Agent: ${walletAddress}
GitHub: @${githubUsername}
Profile: ${updatedAgent.github_profile_url}
Contributions: ${contributions.total_contributions}

Your agent now has a complete economic identity:
• ✅ Locus wallet (spend money)
• ✅ GitHub account (earn money from bounties)

You can now:
- Claim GitHub issues and submit PRs
- Receive USDC payments for merged work  
- Build reputation through contributions
- Participate in platforms like ubounty.ai`,
            },
          ],
        };
      }

      case "get_agent_github": {
        const walletAddress = args.wallet_address as string;
        
        if (!walletAddress || !walletAddress.startsWith('0x')) {
          throw new Error("Invalid wallet address");
        }
        
        console.log(`Fetching GitHub identity for ${walletAddress}`);
        
        const agent = await getAgent(walletAddress);
        if (!agent) {
          throw new Error(`Agent ${walletAddress} not found`);
        }
        
        if (!agent.github_username) {
          return {
            content: [
              {
                type: "text",
                text: `Agent ${walletAddress} has no GitHub account bound.

To bind a GitHub account, use the bind_github tool with:
- wallet_address: ${walletAddress}
- github_username: your-github-username`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: "text",
              text: `GitHub Identity for ${walletAddress}:

📧 GitHub: @${agent.github_username}
🔗 Profile: ${agent.github_profile_url}
${agent.github_verified ? '✅ Verified' : '⚠️  Not Verified'}
📊 Contributions: ${agent.github_contribution_count || 0}
🕒 Last Synced: ${agent.github_last_synced ? new Date(agent.github_last_synced).toLocaleString() : 'Never'}

This agent has a complete economic identity:
• Wallet for spending: ${walletAddress}
• GitHub for earning: @${agent.github_username}`,
            },
          ],
        };
      }

      case "sync_github_contributions": {
        const walletAddress = args.wallet_address as string;
        
        if (!walletAddress || !walletAddress.startsWith('0x')) {
          throw new Error("Invalid wallet address");
        }
        
        console.log(`Syncing GitHub contributions for ${walletAddress}`);
        
        const agent = await getAgent(walletAddress);
        if (!agent || !agent.github_username) {
          throw new Error("No GitHub account bound to this wallet. Use bind_github first.");
        }
        
        const contributions = await fetchGitHubContributions(agent.github_username);
        await updateGitHubContributionsDB(walletAddress, contributions.total_contributions);
        
        return {
          content: [
            {
              type: "text",
              text: `✅ GitHub contributions synced!

GitHub: @${agent.github_username}
Total Contributions: ${contributions.total_contributions}
Last Synced: ${new Date().toLocaleString()}

Your contribution count has been updated.`,
            },
          ],
        };
      }
```

## Files Created:
1. `bureau-server/src/db/migrations/001_add_github_identity.sql` - Database migration
2. `bureau-server/src/github-client.ts` - GitHub API client
3. `bureau-server/src/db/supabase.ts` - Updated with GitHub operations
4. `bureau-server/src/http-server.ts` - Updated with imports (needs tool definitions and handlers)

## Next Steps:
1. Run database migration in Supabase SQL Editor
2. Add the tool definitions and handlers from this file to http-server.ts
3. Test the implementation
4. Commit and push changes
