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
