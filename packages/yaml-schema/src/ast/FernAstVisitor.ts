import {
    ErrorDeclarationSchema,
    HttpEndpointSchema,
    HttpServiceSchema,
    IdSchema,
    TypeDeclarationSchema,
    TypeReferenceSchema,
} from "../schemas";
import { NodePath } from "./NodePath";

export type FernAstVisitor<R = void> = {
    [K in keyof FernAstNodeTypes]: FernAstNodeVisitor<K, R>;
};

export interface FernAstNodeTypes {
    docs: string;
    import: string;
    id: IdSchema;
    typeDeclaration: { typeName: string; declaration: TypeDeclarationSchema };
    typeReference: TypeReferenceSchema;
    typeName: string;
    httpService: { serviceName: string; service: HttpServiceSchema };
    httpEndpoint: { endpointId: string; endpoint: HttpEndpointSchema };
    errorDeclaration: { errorName: string; declaration: ErrorDeclarationSchema };
    errorReference: string;
}

export type FernAstNodeVisitor<K extends keyof FernAstNodeTypes, R = void> = (
    node: FernAstNodeTypes[K],
    nodePath: NodePath
) => R;
