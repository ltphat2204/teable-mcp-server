import { TeableApiClient } from "../teable-client.js";

export interface FieldNode {
    id: string;
    name: string;
    type: string;
    isComputed: boolean;
    isLookup: boolean;
    expression?: string;
    lookupOptions?: {
        foreignTableId: string;
        linkFieldId: string;
        lookupFieldId: string;
    };
    dependencies: {
        fieldId: string;
        fieldName: string;
        tableId?: string;
        tableName?: string;
    }[];
    dependents: {
        fieldId: string;
        fieldName: string;
        tableId?: string;
        tableName?: string;
    }[];
}

export interface ImpactReport {
    fieldId: string;
    fieldName: string;
    fieldType: string;
    impactLevel: "Critical" | "High" | "Medium" | "Low" | "None";
    safeToDelete: boolean;
    directDependents: {
        fieldId: string;
        fieldName: string;
        type: string;
    }[];
    transitiveDependents: {
        fieldId: string;
        fieldName: string;
        type: string;
    }[];
    crossTableDependents: {
        fieldId: string;
        fieldName: string;
        tableId: string;
        tableName: string;
        type: string;
        viaFieldId: string;
        viaFieldName: string;
    }[];
    recommendations: string[];
}

export function extractFieldNamesFromFormula(expression: string): string[] {
    const fieldNames: string[] = [];
    const regex = /\{([^}]+)\}/g;
    let match;
    while ((match = regex.exec(expression)) !== null) {
        fieldNames.push(match[1]);
    }
    return Array.from(new Set(fieldNames));
}

export async function findBaseIdForTable(tableId: string, client: TeableApiClient): Promise<string | null> {
    try {
        const spaces = await client.listSpaces();
        if (!Array.isArray(spaces)) return null;

        for (const space of spaces) {
            if (!space.id) continue;
            const bases = await client.listBases(space.id);
            if (!Array.isArray(bases)) continue;

            for (const base of bases) {
                if (!base.id) continue;
                const tables = await client.listTables(base.id);
                if (!Array.isArray(tables)) continue;

                for (const table of tables) {
                    if (table.id === tableId) {
                        return base.id;
                    }
                }
            }
        }
    } catch (error) {
        // Fail-safe default
    }
    return null;
}

export async function buildDependencyGraph(
    tableId: string,
    client: TeableApiClient
): Promise<{
    nodes: Map<string, FieldNode>;
    tableName: string;
}> {
    let tableName = "Unknown Table";
    let baseId: string | null = null;
    try {
        baseId = await findBaseIdForTable(tableId, client);
    } catch (e) {
        // Fallback
    }

    if (baseId) {
        try {
            const tables = await client.listTables(baseId);
            const table = tables.find((t: any) => t.id === tableId);
            if (table && table.name) {
                tableName = table.name;
            }
        } catch (e) {
            // Fallback
        }
    }

    const fields = await client.getTableFields(tableId);
    if (!Array.isArray(fields)) {
        throw new Error(`Failed to retrieve fields for table ${tableId}`);
    }

    const nodes = new Map<string, FieldNode>();
    const nameToId = new Map<string, string>();

    for (const field of fields) {
        const node: FieldNode = {
            id: field.id,
            name: field.name,
            type: field.type,
            isComputed: !!field.isComputed,
            isLookup: !!field.isLookup,
            expression: field.options?.expression,
            lookupOptions: field.lookupOptions,
            dependencies: [],
            dependents: []
        };
        nodes.set(field.id, node);
        nameToId.set(field.name, field.id);
    }

    const foreignCache = new Map<string, { fields: any[]; name: string }>();
    async function getForeignTableData(fTableId: string) {
        if (foreignCache.has(fTableId)) {
            return foreignCache.get(fTableId)!;
        }
        let fFields: any[] = [];
        let fName = "Unknown Table";
        try {
            fFields = await client.getTableFields(fTableId);
        } catch (e) {
            // Fail-safe fallback
        }
        let fBaseId: string | null = null;
        try {
            fBaseId = await findBaseIdForTable(fTableId, client);
        } catch (e) {
            // Fallback
        }
        if (fBaseId) {
            try {
                const tables = await client.listTables(fBaseId);
                const table = tables.find((t: any) => t.id === fTableId);
                if (table && table.name) {
                    fName = table.name;
                }
            } catch (e) {
                // Fallback
            }
        }
        const data = { fields: fFields, name: fName };
        foreignCache.set(fTableId, data);
        return data;
    }

    for (const [id, node] of nodes.entries()) {
        if (node.type === "formula" && node.expression) {
            const referencedNames = extractFieldNamesFromFormula(node.expression);
            for (const refName of referencedNames) {
                let refId: string | undefined = undefined;
                if (nodes.has(refName)) {
                    refId = refName;
                } else {
                    refId = nameToId.get(refName);
                }

                if (refId) {
                    const depNode = nodes.get(refId)!;
                    node.dependencies.push({
                        fieldId: refId,
                        fieldName: depNode.name
                    });
                    depNode.dependents.push({
                        fieldId: id,
                        fieldName: node.name
                    });
                } else {
                    node.dependencies.push({
                        fieldId: "unknown",
                        fieldName: refName
                    });
                }
            }
        } else if (node.lookupOptions) {
            const { foreignTableId, linkFieldId, lookupFieldId } = node.lookupOptions;

            if (linkFieldId) {
                const linkNode = nodes.get(linkFieldId);
                if (linkNode) {
                    node.dependencies.push({
                        fieldId: linkFieldId,
                        fieldName: linkNode.name
                    });
                    linkNode.dependents.push({
                        fieldId: id,
                        fieldName: node.name
                    });
                }
            }

            if (foreignTableId && lookupFieldId) {
                const foreignData = await getForeignTableData(foreignTableId);
                const foreignField = foreignData.fields.find((f: any) => f.id === lookupFieldId);
                const foreignFieldName = foreignField ? foreignField.name : lookupFieldId;

                node.dependencies.push({
                    fieldId: lookupFieldId,
                    fieldName: foreignFieldName,
                    tableId: foreignTableId,
                    tableName: foreignData.name
                });
            }
        }
    }

    return { nodes, tableName };
}

export function getTransitiveClosure(
    fieldId: string,
    nodes: Map<string, FieldNode>,
    direction: "upstream" | "downstream",
    visited = new Set<string>()
): { fieldId: string; fieldName: string; tableId?: string; tableName?: string }[] {
    if (visited.has(fieldId)) return [];
    visited.add(fieldId);

    const node = nodes.get(fieldId);
    if (!node) return [];

    const result: { fieldId: string; fieldName: string; tableId?: string; tableName?: string }[] = [];
    const list = direction === "upstream" ? node.dependencies : node.dependents;

    for (const edge of list) {
        result.push(edge);
        if (!edge.tableId) {
            const subClosure = getTransitiveClosure(edge.fieldId, nodes, direction, visited);
            result.push(...subClosure);
        }
    }

    const seen = new Set<string>();
    return result.filter(item => {
        const key = `${item.tableId || "local"}_${item.fieldId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function generateMermaidDiagram(nodes: Map<string, FieldNode>): string {
    let diagram = "flowchart TD\n";
    let hasEdges = false;

    for (const [id, node] of nodes.entries()) {
        const typeStr = node.isLookup ? "Lookup" : node.type;
        diagram += `    ${id}["${node.name} (${typeStr})"]\n`;
    }

    diagram += "    classDef formula fill:#e1f5fe,stroke:#0288d1,stroke-width:1px;\n";
    diagram += "    classDef lookup fill:#e8f5e9,stroke:#388e3c,stroke-width:1px;\n";
    diagram += "    classDef base fill:#fff,stroke:#777,stroke-width:1px;\n";

    for (const [id, node] of nodes.entries()) {
        if (node.type === "formula") {
            diagram += `    class ${id} formula;\n`;
        } else if (node.isLookup || node.type === "rollup") {
            diagram += `    class ${id} lookup;\n`;
        } else {
            diagram += `    class ${id} base;\n`;
        }
    }

    for (const [id, node] of nodes.entries()) {
        for (const dep of node.dependencies) {
            if (dep.tableId) {
                const foreignKey = `${dep.tableId}_${dep.fieldId}`;
                diagram += `    ${foreignKey}["${dep.tableName || "Foreign Table"}.${dep.fieldName} (${dep.tableId})"] --> ${id}\n`;
                diagram += `    style ${foreignKey} fill:#fff3e0,stroke:#f57c00,stroke-width:1px\n`;
            } else {
                diagram += `    ${dep.fieldId} --> ${id}\n`;
            }
            hasEdges = true;
        }
    }

    if (!hasEdges) {
        diagram += "    %% No field dependencies found in this table\n";
    }

    return diagram;
}

export async function analyzeFieldImpact(
    tableId: string,
    fieldId: string,
    client: TeableApiClient
): Promise<ImpactReport> {
    const { nodes, tableName } = await buildDependencyGraph(tableId, client);
    const targetNode = nodes.get(fieldId);
    if (!targetNode) {
        throw new Error(`Field with ID ${fieldId} not found in table ${tableName} (${tableId})`);
    }

    const directLocalDependents = targetNode.dependents.map(d => {
        const fullNode = nodes.get(d.fieldId);
        return {
            fieldId: d.fieldId,
            fieldName: d.fieldName,
            type: fullNode ? fullNode.type : "unknown"
        };
    });

    const transitiveLocalClosure = getTransitiveClosure(fieldId, nodes, "downstream");
    const transitiveLocalDependents = transitiveLocalClosure
        .filter(c => c.fieldId !== fieldId && !directLocalDependents.some(d => d.fieldId === c.fieldId))
        .map(c => {
            const fullNode = nodes.get(c.fieldId);
            return {
                fieldId: c.fieldId,
                fieldName: c.fieldName,
                type: fullNode ? fullNode.type : "unknown"
            };
        });

    const crossTableDependents: any[] = [];

    const baseId = await findBaseIdForTable(tableId, client);
    if (baseId) {
        const tables = await client.listTables(baseId);
        if (Array.isArray(tables)) {
            for (const table of tables) {
                if (table.id === tableId) continue;

                try {
                    const fFields = await client.getTableFields(table.id);
                    if (Array.isArray(fFields)) {
                        for (const field of fFields) {
                            if (field.lookupOptions) {
                                const { foreignTableId, lookupFieldId, linkFieldId } = field.lookupOptions;
                                if (foreignTableId === tableId && lookupFieldId === fieldId) {
                                    const linkField = fFields.find(f => f.id === linkFieldId);
                                    crossTableDependents.push({
                                        fieldId: field.id,
                                        fieldName: field.name,
                                        tableId: table.id,
                                        tableName: table.name || "Unknown Table",
                                        type: field.type,
                                        viaFieldId: linkFieldId,
                                        viaFieldName: linkField ? linkField.name : linkFieldId
                                    });
                                }
                            }
                        }
                    }
                } catch (e) {
                    // Ignore errors for individual foreign tables
                }
            }
        }
    }

    const totalDependents = directLocalDependents.length + transitiveLocalDependents.length + crossTableDependents.length;
    let impactLevel: "Critical" | "High" | "Medium" | "Low" | "None" = "None";

    if (crossTableDependents.length > 0) {
        impactLevel = "Critical";
    } else if (transitiveLocalDependents.length > 3 || directLocalDependents.length > 2) {
        impactLevel = "High";
    } else if (totalDependents > 0) {
        impactLevel = "Medium";
    }

    const safeToDelete = totalDependents === 0;

    const recommendations: string[] = [];
    if (safeToDelete) {
        recommendations.push("This field has no dependents and is safe to modify or delete.");
    } else {
        recommendations.push("This field is referenced by other fields. Modifying its type or deleting it will cause calculation errors.");

        if (directLocalDependents.length > 0) {
            recommendations.push(`Locally, delete or reconfigure the following direct dependents first: ${directLocalDependents.map(d => `"${d.fieldName}" (${d.fieldId})`).join(", ")}`);
        }

        if (crossTableDependents.length > 0) {
            recommendations.push(`CRITICAL: This field is pulled into other tables. You must reconfigure the following foreign lookup/rollup fields first: ${crossTableDependents.map(c => `"${c.tableName}.${c.fieldName}" via link "${c.viaFieldName}"`).join(", ")}`);
        }
    }

    return {
        fieldId,
        fieldName: targetNode.name,
        fieldType: targetNode.type,
        impactLevel,
        safeToDelete,
        directDependents: directLocalDependents,
        transitiveDependents: transitiveLocalDependents,
        crossTableDependents,
        recommendations
    };
}
