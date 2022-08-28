import { Workspace } from "@fern-api/workspace-loader";
import { Fiddle } from "@fern-fern/fiddle-client-v2";
import { IntermediateRepresentation } from "@fern-fern/ir-model/ir";
import axios, { AxiosError } from "axios";
import FormData from "form-data";
import urlJoin from "url-join";
import { FIDDLE_ORIGIN, REMOTE_GENERATION_SERVICE } from "./service";

export async function createAndStartJob({
    workspace,
    organization,
    intermediateRepresentation,
    generatorConfigs,
    version,
}: {
    workspace: Workspace;
    organization: string;
    intermediateRepresentation: IntermediateRepresentation;
    generatorConfigs: Fiddle.remoteGen.GeneratorConfig[];
    version: string | undefined;
}): Promise<Fiddle.remoteGen.CreateJobResponse> {
    const job = await createJob({ workspace, organization, generatorConfigs, version });
    await startJob({ intermediateRepresentation, job });
    return job;
}

async function createJob({
    workspace,
    organization,
    generatorConfigs,
    version,
}: {
    workspace: Workspace;
    organization: string;
    generatorConfigs: Fiddle.remoteGen.GeneratorConfig[];
    version: string | undefined;
}) {
    const createResponse = await REMOTE_GENERATION_SERVICE.remoteGen.createJob({
        apiName: workspace.name,
        version,
        organizationName: organization,
        generators: generatorConfigs,
    });

    if (!createResponse.ok) {
        return createResponse.error._visit({
            illegalApiNameError: () => {
                throw new Error("API name is invalid: " + workspace.name);
            },
            generatorsDoNotExistError: (value) => {
                throw new Error(
                    "Generators do not exist: " +
                        value.nonExistentGenerators
                            .map((generator) => `${generator.id}@${generator.version}`)
                            .join(", ")
                );
            },
            _network: () => {
                throw new Error("Network Error: " + JSON.stringify(createResponse.error));
            },
            _unknown: () => {
                throw new Error("Unknown Error: " + JSON.stringify(createResponse.error));
            },
        });
    }

    const job = createResponse.body;
    return job;
}

async function startJob({
    intermediateRepresentation,
    job,
}: {
    intermediateRepresentation: IntermediateRepresentation;
    job: Fiddle.remoteGen.CreateJobResponse;
}) {
    const formData = new FormData();
    formData.append("file", JSON.stringify(intermediateRepresentation));
    const url = urlJoin(FIDDLE_ORIGIN, `/api/remote-gen/jobs/${job.jobId}/start`);
    try {
        await axios.post(url, formData, {
            headers: {
                "Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`,
            },
        });
    } catch (error) {
        if (error instanceof AxiosError) {
            const data = error.response?.data;
            throw new Error(data != null ? JSON.stringify(data) : undefined);
        } else {
            throw error;
        }
    }
}