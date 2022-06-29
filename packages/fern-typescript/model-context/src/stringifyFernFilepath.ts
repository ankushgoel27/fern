import { FernFilepath } from "@fern-fern/ir-model/types";

export type StringifiedFernFilepath = string;

export function stringifyFernFilepath(fernFilepath: FernFilepath): StringifiedFernFilepath {
    return fernFilepath.join("/");
}
