import { Client } from "@modelcontextprotocol/sdk/client";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio";
import { ListToolsResultSchema } from "@modelcontextprotocol/sdk/types";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types";
import { groq } from "@ai-sdk/groq";
import {z} from 'zod'
import {generateText,stepCountIs,tool} from 'ai'
import 'dotenv/config'

async function connectToServer(){
    console.log(`Connecting To The Server`)


    const transport = new StdioClientTransport({
        command:"npx",
        args:["tsx","mcp_server.ts"]

    })

    const mcpClient = new Client({
        name:"tdd-agent-harness",
        version:"1.0.1"
    },{
        capabilities:{}
    })

    await mcpClient.connect(transport)

    return mcpClient

}

async function main() {
    const mcpClient = await connectToServer();
    console.log("\n--- INITIATING AISDLC NEURAL LOOP ---");

    // 1. The Design Specification
   const userArgs = process.argv.slice(2).join(" ");

    if (!userArgs) {
        console.error("\n[SYSTEM HALT]: No feature request provided.");
        console.log("Usage: npx tsx agent.ts \"Your prompt here\"");
        process.exit(1); // Kill the script safely
    }

    const userPrompt = userArgs;
    console.log(`\n[DIRECTIVE RECEIVED]: "${userPrompt}"`)
    // 2. The Autonomous Loop
    const result = await generateText({
        model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),// The underlying neural engine
       system: `You are an elite, autonomous Test-Driven Development engineer. You have full access to the file system, NPM, and Git.
        
        CRITICAL EXECUTION RULES:
        1. YOU ARE A SILENT MACHINE. Do not output conversational plans, explanations, or "thinking".
        2. IMMEDIATELY call the needed native JSON tool. 

        PROTOCOL:
        1. CONTEXT: If modifying existing code, use 'read_file_artifact' to inspect it first.
        2. DEPENDENCIES: If you need external libraries, use 'install_npm_package'.
        3. TDD LOOP: Write tests first, write implementation, run tests. Iterate until tests pass.
        4. VERSION CONTROL: Once all tests pass and the feature is complete, use 'execute_git_commit' to save your work.
        
        ERROR-HANDLING (FORBIDDEN ACTIONS):
        1. If 'execute_test_suite' returns a non-zero exit code or failure, you are FORBIDDEN from using 'execute_git_commit'.
        2. Instead, you must read the test failure logs, locate the logical error in your implementation or schema, rewrite the file using 'write_code_artifact', and run the tests again.
        
        Be concise, accurate, and completely autonomous.`,
        prompt: userPrompt,
        stopWhen: stepCountIs(10),
        maxRetries:10,                 // The agent can loop up to 10 times to fix its own mistakes
        
        // 3. Mapping Vercel AI Tools to your local MCP Server
       tools: {
    write_code_artifact:tool( {
        description: "Safely writes or overwrites a TypeScript file.",
        inputSchema: z.object({
            filePath: z.string().describe("The relative path where the file should be created"),
            content: z.string().describe("The raw, complete source code to be written")
        }),
        execute: async ({ filePath, content }) => {
            console.log(`\n[AGENT DECISION]: Writing file -> ${filePath}`);

            const serverArgs = {
                filePath: filePath,
                codeContent: content
            };

            const response = await mcpClient.request({
                method: "tools/call",
                params: { name: "write_code_artifact", arguments: serverArgs }
            }, CallToolResultSchema) as any;

            console.log(`[BRAIN PIPELINE]: Wire response received for test operation.`);

            const extractedText: string = String(
                response.content
                    .filter((item: any) => item.type === "text")
                    .map((item: any) => item.text)
                    .join("\n")
            );

            return extractedText;
        }
    }),

    execute_test_suite: tool({
        description: "Runs the local Vitest testing suite. Returns stdout/stderr.",
        inputSchema: z.object({
            testFilePath: z.string().optional().describe("Optional path of the specific test file")
        }),
        execute: async ({ testFilePath }) => {

            console.log(`\n[AGENT DECISION]: Running test suite...`);

            const response = await mcpClient.request({
                method: "tools/call",
                params: { name: "execute_test_suite", arguments: { testFilePath } }
            }, CallToolResultSchema) as any;

            console.log(`[BRAIN PIPELINE]: Wire response received for test operation.`);

            const extractedText: string = String(
                response.content
                    .filter((item: any) => item.type === "text")
                    .map((item: any) => item.text)
                    .join("\n")
            );

            return extractedText;
        }
    }),
    read_file_artifact:tool({
        description:"Reads the contents of a file from the hard drive. Use this to inspect existing code before modifying it.",
        inputSchema:z.object({
            filepath:z.string().describe("The relative path of the file")  
        }),
        execute: async({filepath})=>{
            console.log(`Reading the file path`)

            const response = await mcpClient.request({
                method:"tools/call",
                params:{name: "read_file_artifact", arguments: { filepath }}
            },CallToolResultSchema as any)

            return String(response.content.filter((i: any) => i.type === "text").map((i: any) => i.text).join("\n"))
        }
    }),
    install_npm_package:tool({
        description:"Installs a package from NPM. Use this if your code requires a third-party library.",
        inputSchema:z.object({
            packageName:z.string().describe("The exact name of the npm package"),
            isDev:z.boolean().optional().describe("Set to true if it is a development dependency")
        }),
        execute:async ({packageName,isDev})=>{
            console.log(`\n[BRAIN PIPELINE]: Installing NPM package -> ${packageName}`);
                    const response = await mcpClient.request({
                        method: "tools/call",
                        params: { name: "install_npm_package", arguments: { packageName, isDev } }
                    }, CallToolResultSchema) as any;
                    
                    return String(response.content.filter((i: any) => i.type === "text").map((i: any) => i.text).join("\n"))
        }
    }),
    execute_git_command: tool({
                description: "Stages all current file changes and commits them to the local Git repository.",
                inputSchema: z.object({
                    commitMessage: z.string().describe("A concise, conventional commit message")
                }),
                execute: async ({ commitMessage }: { commitMessage: string }) => {
                    console.log(`\n[BRAIN PIPELINE]: Committing to Git -> "${commitMessage}"`);
                    const response = await mcpClient.request({
                        method: "tools/call",
                        params: { name: "execute_git_commit", arguments: { commitMessage } }
                    }, CallToolResultSchema) as any;
                    
                    return String(response.content.filter((i: any) => i.type === "text").map((i: any) => i.text).join("\n"));
                }
            })
}
    });

    console.log("\n--- AGENT EXECUTION COMPLETE ---");
    console.log(`Final Agent Report:\n${result.text}`);

    process.exit(0)
}

main().catch(console.error)