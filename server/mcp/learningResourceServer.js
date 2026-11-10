const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");

// Create MCP server
const server = new McpServer({
    name: "learning-resources-server",
    version: "1.0.0"
});

// Free learning resource catalogue
const resources = [
    {
        title: "freeCodeCamp",
        provider: "freeCodeCamp",
        category: "courses",
        levels: ["beginner", "intermediate", "advanced"],
        tags: ["programming", "python", "javascript", "web development", "data science"],
        description: "Free programming courses and certifications.",
        uri: "https://www.freecodecamp.org/"
    },
    {
        title: "MDN Web Docs",
        provider: "Mozilla",
        category: "documentation",
        levels: ["beginner", "intermediate", "advanced"],
        tags: ["html", "css", "javascript", "web development", "frontend"],
        description: "Official web development documentation and tutorials.",
        uri: "https://developer.mozilla.org/"
    },
    {
        title: "Python Documentation",
        provider: "Python",
        category: "documentation",
        levels: ["beginner", "intermediate", "advanced"],
        tags: ["python", "data science", "machine learning", "programming"],
        description: "Official Python language documentation.",
        uri: "https://docs.python.org/3/"
    },
    {
        title: "Kaggle Learn",
        provider: "Kaggle",
        category: "courses",
        levels: ["beginner", "intermediate"],
        tags: ["python", "data science", "machine learning", "pandas", "sql"],
        description: "Free practical micro-courses in data science and machine learning.",
        uri: "https://www.kaggle.com/learn"
    },
    {
        title: "SQLBolt",
        provider: "SQLBolt",
        category: "tutorials",
        levels: ["beginner", "intermediate"],
        tags: ["sql", "database", "data science"],
        description: "Interactive SQL lessons and exercises.",
        uri: "https://sqlbolt.com/"
    },
    {
        title: "GitHub Skills",
        provider: "GitHub",
        category: "courses",
        levels: ["beginner", "intermediate"],
        tags: ["git", "github", "programming", "projects"],
        description: "Interactive courses for learning GitHub and development workflows.",
        uri: "https://skills.github.com/"
    },
    {
        title: "HackerRank",
        provider: "HackerRank",
        category: "practice",
        levels: ["beginner", "intermediate", "advanced"],
        tags: ["python", "java", "c", "sql", "programming"],
        description: "Practice programming and problem-solving challenges.",
        uri: "https://www.hackerrank.com/"
    },
    {
        title: "LeetCode",
        provider: "LeetCode",
        category: "practice",
        levels: ["beginner", "intermediate", "advanced"],
        tags: ["python", "java", "algorithms", "data structures"],
        description: "Coding and algorithm practice. Free problems are available.",
        uri: "https://leetcode.com/"
    },
    {
        title: "Google Machine Learning Crash Course",
        provider: "Google",
        category: "courses",
        levels: ["beginner", "intermediate"],
        tags: ["machine learning", "artificial intelligence", "python", "data science"],
        description: "Free machine learning lessons and practical exercises.",
        uri: "https://developers.google.com/machine-learning/crash-course"
    },
    {
        title: "PyTorch Tutorials",
        provider: "PyTorch",
        category: "tutorials",
        levels: ["intermediate", "advanced"],
        tags: ["python", "deep learning", "machine learning", "artificial intelligence"],
        description: "Learn deep learning with practical PyTorch tutorials.",
        uri: "https://pytorch.org/tutorials/"
    },
    {
        title: "React Documentation",
        provider: "React",
        category: "documentation",
        levels: ["beginner", "intermediate", "advanced"],
        tags: ["react", "javascript", "frontend", "web development"],
        description: "Official React documentation and learning guides.",
        uri: "https://react.dev/learn"
    },
    {
        title: "Node.js Documentation",
        provider: "Node.js",
        category: "documentation",
        levels: ["beginner", "intermediate", "advanced"],
        tags: ["node.js", "javascript", "backend", "web development"],
        description: "Official Node.js documentation and API guides.",
        uri: "https://nodejs.org/en/learn"
    },
    {
        title: "GitHub Project Repository",
        provider: "GitHub",
        category: "projects",
        levels: ["beginner", "intermediate", "advanced"],
        tags: ["programming", "python", "javascript", "projects"],
        description: "Explore open-source projects and build your portfolio.",
        uri: "https://github.com/"
    },
    {
        title: "W3Schools",
        provider: "W3Schools",
        category: "tutorials",
        levels: ["beginner", "intermediate"],
        tags: ["html", "css", "javascript", "python", "sql", "web development"],
        description: "Free tutorials and examples for programming technologies.",
        uri: "https://www.w3schools.com/"
    },
    {
        title: "OpenLearn",
        provider: "The Open University",
        category: "courses",
        levels: ["beginner", "intermediate"],
        tags: ["computer science", "technology", "programming"],
        description: "Free online courses covering various subjects.",
        uri: "https://www.open.edu/openlearn/"
    }
];

// Register MCP tool
server.registerTool(
    "search_learning_resources",
    {
        description:
            "Find free learning resources based on career, skills, category and level.",

        inputSchema: {
            career: z.string().min(2).max(100),
            skills: z.array(z.string()).max(15).default([]),
            category: z.enum([
                "all",
                "courses",
                "tutorials",
                "documentation",
                "practice",
                "projects"
            ]).default("all"),
            level: z.enum([
                "beginner",
                "intermediate",
                "advanced"
            ]).default("beginner")
        }
    },

    async ({ career, skills, category, level }) => {
        try {
            const keywords = [
                career,
                ...skills
            ].join(" ").toLowerCase();

            const matchingResources = resources.filter(resource => {

                const categoryMatch =
                    category === "all" ||
                    resource.category === category;

                const levelMatch =
                    resource.levels.includes(level);

                const searchMatch =
                    resource.tags.some(tag =>
                        keywords.includes(tag.toLowerCase())
                    ) ||
                    resource.title.toLowerCase().includes(career.toLowerCase()) ||
                    resource.provider.toLowerCase().includes(career.toLowerCase());

                return categoryMatch && levelMatch && searchMatch;
            });

            const recommendations = matchingResources.length
                ? matchingResources.map((resource, index) =>
                    `${index + 1}. **${resource.title}**\n` +
                    `   Provider: ${resource.provider}\n` +
                    `   Description: ${resource.description}\n` +
                    `   Level: ${level}\n` +
                    `   Link: ${resource.uri}`
                ).join("\n\n")
                : "No exact matches found. Try selecting All Resources or adding relevant skills.";

            const result = {
                career,
                skills,
                category,
                level,
                recommendations,
                sources: matchingResources.map(resource => ({
                    title: resource.title,
                    provider: resource.provider,
                    description: resource.description,
                    category: resource.category,
                    level: level,
                    uri: resource.uri
                }))
            };

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result, null, 2)
                    }
                ]
            };

        } catch (error) {
            console.error("Learning resource error:", error);

            return {
                isError: true,
                content: [
                    {
                        type: "text",
                        text: `Learning resource search failed: ${error.message}`
                    }
                ]
            };
        }
    }
);

// Start MCP server
async function startServer() {
    const transport = new StdioServerTransport();

    await server.connect(transport);

    console.error("Free Learning Resources MCP server started.");
}

startServer().catch(error => {
    console.error("MCP server startup failed:", error);
    process.exit(1);
});