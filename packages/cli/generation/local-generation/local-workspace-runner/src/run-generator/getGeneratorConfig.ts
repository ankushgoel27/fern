import { AbsoluteFilePath } from "@fern-api/fs-utils";
import { GeneratorInvocation } from "@fern-api/generators-configuration";
import { FernGeneratorExec } from "@fern-fern/generator-exec-sdk";
import { DOCKER_CODEGEN_OUTPUT_DIRECTORY, DOCKER_PATH_TO_IR, DOCKER_PATH_TO_SNIPPET } from "./constants";

export declare namespace getGeneratorConfig {
    export interface Args {
        workspaceName: string;
        organization: string;
        customConfig: unknown;
        generatorInvocation: GeneratorInvocation;
        absolutePathToSnippet: AbsoluteFilePath | undefined;
    }

    export interface Return {
        config: FernGeneratorExec.GeneratorConfig;
        binds: string[];
    }
}

export function getGeneratorConfig({
    generatorInvocation,
    customConfig,
    workspaceName,
    organization,
    absolutePathToSnippet,
}: getGeneratorConfig.Args): getGeneratorConfig.Return {
    const binds: string[] = [];
    const output = generatorInvocation.outputMode._visit<FernGeneratorExec.GeneratorOutputConfig>({
        publish: () => {
            return DUMMY_PUBLISH_OUTPUT_CONFIG;
        },
        publishV2: () => {
            return DUMMY_PUBLISH_OUTPUT_CONFIG;
        },
        downloadFiles: () => {
            return {
                mode: FernGeneratorExec.OutputMode.downloadFiles(),
                path: DOCKER_CODEGEN_OUTPUT_DIRECTORY,
            };
        },
        github: (value) => {
            const outputConfig: FernGeneratorExec.GeneratorOutputConfig = {
                mode: FernGeneratorExec.OutputMode.github({
                    repoUrl: `https://github.com/${value.owner}/${value.repo}`,
                    version: "0.0.1",
                }),
                path: DOCKER_CODEGEN_OUTPUT_DIRECTORY,
            };
            if (absolutePathToSnippet !== undefined) {
                binds.push(`${absolutePathToSnippet}:${DOCKER_PATH_TO_SNIPPET}`);
                outputConfig.snippetFilepath = DOCKER_PATH_TO_SNIPPET;
            }
            return outputConfig;
        },
        _other: () => {
            throw new Error("Output type did not match any of the types supported by Fern");
        },
    });
    return {
        binds,
        config: {
            irFilepath: DOCKER_PATH_TO_IR,
            output,
            publish: undefined,
            customConfig,
            workspaceName,
            organization,
            environment: FernGeneratorExec.GeneratorEnvironment.local(),
            dryRun: false,
        },
    };
}

const DUMMY_PUBLISH_OUTPUT_CONFIG = {
    mode: FernGeneratorExec.OutputMode.publish({
        registries: {
            maven: {
                group: "",
                password: "",
                registryUrl: "",
                username: "",
            },
            npm: {
                registryUrl: "",
                scope: "",
                token: "",
            },
        },
        publishTarget: undefined,
        registriesV2: {
            maven: {
                password: "",
                registryUrl: "",
                username: "",
                coordinate: "",
            },
            npm: {
                registryUrl: "",
                token: "",
                packageName: "",
            },
            pypi: {
                packageName: "",
                password: "",
                registryUrl: "",
                username: "",
            },
        },
        version: "0.0.1",
    }),
    path: DOCKER_CODEGEN_OUTPUT_DIRECTORY,
};
