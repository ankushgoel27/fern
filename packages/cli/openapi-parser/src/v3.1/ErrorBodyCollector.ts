import { Schema } from "@fern-fern/openapi-ir-model/ir";
import { OpenAPIV3_1 } from "openapi-types";
import { AbstractOpenAPIV3_1ParserContext } from "./AbstractOpenAPIV3_1ParserContext";
import { convertSchema } from "./converters/convertSchemas";
import { isReferenceObject } from "./utils/isReferenceObject";
import { isSchemaEqual } from "./utils/isSchemaEqual";

export class ErrorBodyCollector {
    private references: Set<string> = new Set();
    private schemas: (OpenAPIV3_1.ReferenceObject | OpenAPIV3_1.SchemaObject)[] = [];
    private convertedSchemas: Schema[] = [];
    private context: AbstractOpenAPIV3_1ParserContext;

    constructor(context: AbstractOpenAPIV3_1ParserContext) {
        this.context = context;
    }

    public collect(schema: OpenAPIV3_1.ReferenceObject | OpenAPIV3_1.SchemaObject): void {
        if (isReferenceObject(schema)) {
            if (this.references.has(schema.$ref)) {
                // skip
            } else {
                this.schemas.push(schema);
                this.references.add(schema.$ref);
            }
        } else {
            const convertedCurrentSchema = convertSchema(schema, false, this.context, []);
            let isDupe = false;
            for (const convertedSchema of this.convertedSchemas) {
                isDupe = isSchemaEqual(convertedSchema, convertedCurrentSchema);
                if (isDupe) {
                    break;
                }
            }
            if (!isDupe) {
                this.schemas.push(schema);
                this.convertedSchemas.push(convertedCurrentSchema);
            }
        }
    }

    public getSchemas(): (OpenAPIV3_1.ReferenceObject | OpenAPIV3_1.SchemaObject)[] {
        return this.schemas;
    }
}