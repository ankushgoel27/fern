import { compile } from "@fern-api/compiler";
import { runPlugin } from "@fern-api/plugin-runner";
import { readFile, rm, writeFile } from "fs/promises";
import yaml from "js-yaml";
import Listr from "listr";
import path from "path";
import tmp from "tmp-promise";
import { handleCompilerFailure } from "./handleCompilerFailure";
import { parseFernDirectory } from "./parseFernDirectory";

interface WorkspaceConfig {
    name?: string;
    input: string;
    plugins: { name: string; output: string; config: unknown }[];
}

export async function createCompileWorkspaceTask(pathToWorkspaceDefinition: string): Promise<Listr.ListrTask> {
    const fileContents = await readFile(pathToWorkspaceDefinition);
    const workspaceConfig = yaml.load(fileContents.toString()) as WorkspaceConfig;
    return {
        title: workspaceConfig.name ?? pathToWorkspaceDefinition,
        task: await createCompileWorkspaceSubtasks({
            pathToWorkspaceDefinition,
            workspaceConfig,
        }),
    };
}

async function createCompileWorkspaceSubtasks({
    pathToWorkspaceDefinition,
    workspaceConfig,
}: {
    pathToWorkspaceDefinition: string;
    workspaceConfig: WorkspaceConfig;
}): Promise<() => Listr> {
    const workspaceTempDir = await tmp.dir({
        tmpdir: path.dirname(pathToWorkspaceDefinition),
        prefix: ".fern",
    });

    const pathToIr = path.join(workspaceTempDir.path, "ir.json");

    const listr = new Listr([
        {
            title: "Parse API definition",
            task: async () => {
                const files = await parseFernDirectory(
                    path.join(path.dirname(pathToWorkspaceDefinition), workspaceConfig.input)
                );
                const compileResult = await compile(files);
                if (compileResult.didSucceed) {
                    await writeFile(pathToIr, JSON.stringify(compileResult.intermediateRepresentation));
                } else {
                    handleCompilerFailure(compileResult.failure);
                }
            },
        },
        {
            title: "Run plugins",
            task: async () => {
                await Promise.all(
                    workspaceConfig.plugins.map(async (plugin) => {
                        const configJson = await tmp.file({
                            tmpdir: workspaceTempDir.path,
                        });
                        await runPlugin({
                            imageName: plugin.name,
                            pathToIr,
                            pathToWriteConfigJson: configJson.path,
                            pluginConfig: plugin.config,
                            pluginOutputDirectory: path.join(path.dirname(pathToWorkspaceDefinition), plugin.output),
                        });
                    })
                );
            },
        },
        {
            title: "Clean up",
            task: async () => {
                await rm(workspaceTempDir.path, { recursive: true });
            },
        },
    ]);

    return () => listr;
}
