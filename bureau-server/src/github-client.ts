/**
 * GitHub API client for fetching user data and contributions
 * Enables agents to build reputation and verify their GitHub identity
 */

export interface GitHubUser {
    login: string;
    name: string | null;
    bio: string | null;
    public_repos: number;
    followers: number;
    following: number;
    created_at: string;
    html_url: string;
    avatar_url: string;
    company: string | null;
    location: string | null;
}

export interface GitHubContributions {
    total_commits: number;
    total_prs: number;
    total_issues: number;
    total_contributions: number;
}

/**
 * Fetch GitHub user profile
 * @param username - GitHub username
 * @returns Promise with GitHub user data
 */
export async function fetchGitHubProfile(username: string): Promise<GitHubUser> {
    const response = await fetch(`https://api.github.com/users/${username}`, {
        headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Agentic-Bureau',
            // Optional: Add GitHub token for higher rate limits
            // ...(process.env.GITHUB_TOKEN && { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` }),
        }
    });

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error(`GitHub user '${username}' not found`);
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Fetch GitHub contribution statistics
 * Note: This is a simplified version using public_repos as a proxy
 * In production, use GitHub GraphQL API for accurate contribution data
 * 
 * @param username - GitHub username
 * @returns Promise with contribution statistics
 */
export async function fetchGitHubContributions(username: string): Promise<GitHubContributions> {
    // For MVP, we use public_repos as a proxy for contributions
    // Production version should use GitHub GraphQL API to query:
    // - Commit count (via contributionsCollection)
    // - PR count (via pullRequests)
    // - Issue count (via issues)
    const profile = await fetchGitHubProfile(username);

    // Rough estimation: public_repos * 10 as contribution count
    // This is just a placeholder - real implementation would query GraphQL
    const estimatedContributions = profile.public_repos * 10;

    return {
        total_commits: 0, // Would need GraphQL API
        total_prs: 0,     // Would need GraphQL API  
        total_issues: 0,  // Would need GraphQL API
        total_contributions: estimatedContributions,
    };
}

/**
 * Verify that a GitHub username exists and is accessible
 * @param username - GitHub username to verify
 * @returns Promise with boolean indicating if username is valid
 */
export async function verifyGitHubUsername(username: string): Promise<boolean> {
    try {
        await fetchGitHubProfile(username);
        return true;
    } catch {
        return false;
    }
}

/**
 * Get GitHub profile URL for a username
 * @param username - GitHub username
 * @returns Full GitHub profile URL
 */
export function getGitHubProfileUrl(username: string): string {
    return `https://github.com/${username}`;
}
