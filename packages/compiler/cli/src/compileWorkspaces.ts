import { lstat } from "fs/promises";
import glob from "glob-promise";
import Listr from "listr";
import { createCompileWorkspaceTask } from "./compileWorkspace";
import { WorkspaceCliOption } from "./constants";
import { loadProjectConfig, ProjectConfig } from "./project-config/loadProjectConfig";

export async function compileWorkspaces(commandLineWorkspaces: readonly string[]): Promise<void> {
    const projectConfig = await loadProjectConfig();
    const workspaceDefinitionPaths = await collectWorkspaceDefinitions({
        commandLineWorkspaces,
        projectConfig,
    });
    const uniqueWorkspaceDefinitionPaths = uniq(workspaceDefinitionPaths);
    const tasks = new Listr(await Promise.all(uniqueWorkspaceDefinitionPaths.map(createCompileWorkspaceTask)), {
        concurrent: true,
    });
    await tasks.run();
}

async function collectWorkspaceDefinitions({
    commandLineWorkspaces,
    projectConfig,
}: {
    commandLineWorkspaces: readonly string[];
    projectConfig: ProjectConfig | undefined;
}): Promise<string[]> {
    if (commandLineWorkspaces.length > 0) {
        return getWorkspaceDefinitionsFromCommandLineArgs(commandLineWorkspaces);
    }

    if (projectConfig == null) {
        throw new Error(
            "No project configuration found." +
                ` If you're running from outside a project, you must manually specify the workspace(s) with --${WorkspaceCliOption.KEY}`
        );
    }

    const workspacesGlobs = projectConfig.workspaces;
    const allWorkspaces: string[] = [];
    for (const workspacesGlob of workspacesGlobs) {
        const workspacesInGlob = await findWorkspaceDefinitionsFromGlob(workspacesGlob);
        allWorkspaces.push(...workspacesInGlob);
    }
    return allWorkspaces;
}

async function getWorkspaceDefinitionsFromCommandLineArgs(commandLineWorkspaces: readonly string[]) {
    const promises = commandLineWorkspaces.flatMap(async (commandLineWorkspace) => {
        const stats = await lstat(commandLineWorkspace);
        if (stats.isFile()) {
            return [commandLineWorkspace];
        } else if (stats.isDirectory()) {
            return findWorkspaceDefinitionsFromGlob(`${commandLineWorkspace}/**`);
        } else {
            throw new Error("Filepath is not a file or a directory " + commandLineWorkspace);
        }
    });

    return (await Promise.all(promises)).flat();
}

async function findWorkspaceDefinitionsFromGlob(workspaceDefinitionsGlob: string): Promise<string[]> {
    return glob(`${workspaceDefinitionsGlob}/.fernrc.yml`, {
        absolute: true,
    });
}

function uniq<T>(items: readonly T[]): T[] {
    const uniqueItems: T[] = [];
    const seen = new Set<T>();

    for (const item of items) {
        if (!seen.has(item)) {
            uniqueItems.push(item);
        }
        seen.add(item);
    }

    return uniqueItems;
}
