export interface QueryTeableArgs {
    tableId: string;
    filter?: string;
    sort?: string;
    limit?: number;
    viewId?: string;
}

export const isValidQueryTeableArgs = (args: any): args is QueryTeableArgs => {
    return (
        typeof args === 'object' &&
        args !== null &&
        typeof args.tableId === 'string'
    );
};

export interface CommentOnRecordArgs {
    tableId: string;
    recordId: string;
    content: string;
}

export interface CreateFieldArgs {
    tableId: string;
    name: string;
    type: string;
    description?: string;
    options?: string; // JSON string, parsed in handler
}

export interface UpdateFieldArgs {
    tableId: string;
    fieldId: string;
    name?: string;
    description?: string;
    options?: string; // JSON string, parsed in handler
}

export interface CreateTableArgs {
    baseId: string;
    name: string;
    description?: string;
    fields?: string; // JSON string array, parsed in handler
}

export interface CreateViewArgs {
    tableId: string;
    name: string;
    type: string;
}

export interface UpdateViewArgs {
    tableId: string;
    viewId: string;
    name?: string;
    filter?: string; // JSON string, parsed in handler
    sort?: string;   // JSON string, parsed in handler
}
