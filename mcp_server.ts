import {   Server } from "@modelcontextprotocol/sdk/server/index.js";
import {  ListToolsRequestSchema ,CallToolRequestSchema} from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import fs from 'fs/promises'
import path from "path";
import {exec} from 'child_process'
import { promisify } from "util";
import { stdout } from "process";

const asyncExec = promisify(exec)

const server = new Server({
    name: "tdd-automation-server",
    version: "1.0.0"
}, {
    capabilities: { tools: {} }
});

// Executing the tools with Telemetry Logging
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    
    if (request.params.name === "write_code_artifact") {
        const args = request.params.arguments as any;
        const relativePath = String(args.filePath);
        const codeContent = String(args.codeContent);

        // Telemetry
        console.error(`[SERVER HANDS]: Received request to write file -> ${relativePath}`);

        try {
            const absolutePath = path.resolve(process.cwd(), relativePath);
            const targetDirectory = path.dirname(absolutePath);
            
            await fs.mkdir(targetDirectory, { recursive: true });
            await fs.writeFile(absolutePath, codeContent, 'utf-8');

            console.error(`[SERVER HANDS]: File successfully flushed to disk.`);
            return {
                content: [{ type: "text", text: `Success: File written to ${relativePath}` }]
            };
        } catch (error) {
            console.error(`[SERVER HANDS ERROR]: Failed to write file: ${String(error)}`);
            return {
                isError: true,
                content: [{ type: "text", text: `Failed to write file: ${String(error)}` }]
            };
        }
    }

    if (request.params.name === "execute_test_suite") {
        const args = request.params.arguments as any;
        const testFilePath = args.testFilePath ? String(args.testFilePath).trim() : "";

        // Telemetry
        console.error(`[SERVER HANDS]: Received request to execute tests for: "${testFilePath}"`);

        try {
            // ARCHITECTURAL PATCH: --no-threads prevents worker pool deadlocks in piped streams
            const command = `npx vitest run --no-threads ${testFilePath}`;
            console.error(`[SERVER HANDS]: Spawning bash process -> ${command}`);

            const { stdout, stderr } = await asyncExec(command);
            
            console.error(`[SERVER HANDS]: Test process finished with exit code 0.`);
            return {
                content: [{ type: "text", text: `TESTS PASSED:\n${stdout}\n${stderr}` }]
            };
        } catch (error: any) {
            console.error(`[SERVER HANDS]: Test process finished with non-zero exit code (failures detected).`);
            return {
                content: [{ 
                    type: "text", 
                    text: `TEST SUITE FAILED. Read the output and fix the code:\n${error.stdout || ''}\n${error.stderr || error.message}` 
                }]
            };
        }
    }

    if(request.params.name === "read_file_artifact"){
        const args = request.params.arguments as any
        const relativePath = String(args.filePath)
        console.log(`[SERVER HANDS]:Reading File -> ${relativePath}`)

        try{
            const absolutePath = path.resolve(process.cwd(),relativePath)
            const fileContent = await fs.readFile(absolutePath,'utf-8')
            return {content:[{type:"text",text:fileContent}]}
        }catch(error:any){
            console.error(`Could Not Read -> ${relativePath}`)
            return {content:[{type:"text",text:`Error reading file:${error.message}.Does the file exist?`}]}
        }
    }

    if(request.params.name === "install_npm_package"){
        const args = request.params.arguments as any
        const pkg = String (args.packageName)
        const devFlag = args.isDev ? " -D ":" "
        const command = `npm install ${devFlag}${pkg}`

        console.error(`Executing command`)

        try{
            const {stderr,stdout} = await asyncExec(command)

            return {content:[{content:"text",text:`Installed Suncessfully \n${stderr}\n${stdout}`}]}
        }catch(error:any){
            return {content:[{content:"text",text:`Npm Install Failed ${error.message}`}]}
        }
    }

    if(request.params.name === "execute_git_command"){
        const args = request.params.arguments as any
        const msg = String(args.commitMessage).replace(/"/g, '\\"')
        const command = `git add . && git commit -m "${msg}"`

        console.error(`[SERVER COMMANDS] -> ${msg}`)

        try{
            const{stderr,stdout} = await asyncExec(command)
            return { content: [{ type: "text", text: `Git commit successful.\n${stdout}` }] }

        }catch (error: any) {
            return { content: [{ type: "text", text: `Git commit failed (Are there changes to commit?):\n${error.message}` }] }
        }
    }

    throw new Error("Tool Not Found");
});




// Defining the boundaries of the Hands
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "write_code_artifact",
                description: "Safely writes or overwrites a TypeScript file (source code or test file) within the local workspace.",
                inputSchema: {
                    type: "object",
                    properties: {
                        "filepath":{
                            type:"string",
                            description:"The relative path where the file should be created eg: `src/math.ts` or `tests/math.ts`"
                        },
                        "codeContent":{
                            type:"string",
                            description:"The raw, complete source code to be written to the file."
                        }
                    },
                    required: [
                        "filepath",
                        "code-content"
                    ]
                }
            },
            {
                name:"execute_test_suite",
                description:"Runs the local Vitest testing suite. Returns the stdout and stderr so the agent can read test failures or compilation errors.",
                inputSchema:{
                    type:"object",
                    properties:{
                        "testFilePath":{
                            type:"string",
                            description:"The Specific Test Path for  the file  which is to be tested"
                        }
                    },
                    required:[
                    ]

                }
            },
            {
                name:"read_file_artifact",
                description:"Read The Contents of File From The local File System",
                inputSchema:{
                    type:"object",
                    properties:{
                        filepath:{type:"string",}
                    },
                    required:["filepath"]
                }
            },{
                name:"install_npm_package",
                description:"Install a package from npm",
                inputSchema:{
                    type:"object",
                    properties:{
                        packageName:{type:"string",description:"Name of the package"},
                        isDev:{type:"string",description:"Set True for --save-dev"}
                    },
                    required:["packageName"]
                }
            },
            {
                name:"execute_git_commit",
                description:"Stages all changes and commits them to local Git Repository",
                inputSchema:{
                    type:"object",
                    properties:{
                        commitMessage:{type:"string",description:"The Commit Message"}
                    },
                    required:["commitMessage"]
                }

            }
        ]
    };
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("AISDLC MCP Server running on stdio");
}

main().catch(console.error);