import axios, { AxiosInstance } from 'axios';
import { QueryTeableArgs } from './types.js';

class TeableApiClient {
    private client: AxiosInstance;

    constructor(apiKey: string, baseUrl: string) {
        this.client = axios.create({
            baseURL: baseUrl,
            headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: 'application/json',
            },
        });
    }

    private validateId(id: string, name: string) {
        if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id)) {
            throw new Error(`Invalid ${name} format: must be alphanumeric, hyphens, or underscores`);
        }
    }

    async queryTable(args: QueryTeableArgs) {
        const { tableId, filter, sort, limit, viewId } = args;
        this.validateId(tableId, 'tableId');
        if (viewId) this.validateId(viewId, 'viewId');

        const params: any = {};
        if (filter) params.filter = filter;
        if (sort) params.sort = sort;
        if (limit) params.limit = limit;
        if (viewId) params.viewId = viewId;

        const response = await this.client.get(`/table/${tableId}/record`, { params });
        return response.data;
    }

    async listSpaces() {
        const response = await this.client.get('/space');
        return response.data;
    }

    async listBases(spaceId: string) {
        this.validateId(spaceId, 'spaceId');
        const response = await this.client.get(`/space/${spaceId}/base`);
        return response.data;
    }

    async listTables(baseId: string) {
        this.validateId(baseId, 'baseId');
        const response = await this.client.get(`/base/${baseId}/table`);
        return response.data;
    }

    async getTableFields(tableId: string) {
        this.validateId(tableId, 'tableId');
        const response = await this.client.get(`/table/${tableId}/field`);
        return response.data;
    }

    async getTable(tableId: string) {
        this.validateId(tableId, 'tableId');
        const response = await this.client.get(`/table/${tableId}`);
        return response.data;
    }

    async getRecord(tableId: string, recordId: string) {
        this.validateId(tableId, 'tableId');
        this.validateId(recordId, 'recordId');
        const response = await this.client.get(`/table/${tableId}/record/${recordId}`);
        return response.data;
    }

    async createRecord(tableId: string, fields: Record<string, any>) {
        this.validateId(tableId, 'tableId');
        const response = await this.client.post(`/table/${tableId}/record`, {
            fieldKeyType: 'name',
            records: [{ fields }],
        });
        return response.data;
    }

    async deleteRecord(tableId: string, recordId: string) {
        this.validateId(tableId, 'tableId');
        this.validateId(recordId, 'recordId');
        const response = await this.client.delete(`/table/${tableId}/record/${recordId}`);
        return response.data;
    }

    async updateRecord(tableId: string, recordId: string, fields: Record<string, any>) {
        this.validateId(tableId, 'tableId');
        this.validateId(recordId, 'recordId');
        const response = await this.client.patch(`/table/${tableId}/record/${recordId}`, {
            fieldKeyType: 'name',
            record: {
                fields,
            },
        });
        return response.data;
    }

    async listViews(tableId: string) {
        this.validateId(tableId, 'tableId');
        const response = await this.client.get(`/table/${tableId}/view`);
        return response.data;
    }

    async getRecordHistory(tableId: string, recordId: string) {
        this.validateId(tableId, 'tableId');
        this.validateId(recordId, 'recordId');
        const response = await this.client.get(`/table/${tableId}/record/${recordId}/history`);
        return response.data;
    }

    // ── Phase 1: Record Comments ──────────────────────────────────────────────

    async getRecordComments(tableId: string, recordId: string) {
        this.validateId(tableId, 'tableId');
        this.validateId(recordId, 'recordId');
        const response = await this.client.get(`/comment/${tableId}/${recordId}/list`);
        return response.data;
    }

    async commentOnRecord(tableId: string, recordId: string, content: string) {
        this.validateId(tableId, 'tableId');
        this.validateId(recordId, 'recordId');
        const response = await this.client.post(`/comment/${tableId}/${recordId}/create`, {
            quoteId: null,
            content: [{ type: 'p', children: [{ type: 'span', value: content }] }],
        });
        return response.data;
    }

    // ── Phase 2: Field CRUD ───────────────────────────────────────────────────

    async createField(tableId: string, name: string, type: string, description?: string, options?: Record<string, any>) {
        this.validateId(tableId, 'tableId');
        const body: any = { name, type };
        if (description) body.description = description;
        if (options) body.options = options;
        const response = await this.client.post(`/table/${tableId}/field`, body);
        return response.data;
    }

    async updateField(tableId: string, fieldId: string, updates: { name?: string; description?: string; options?: Record<string, any> }) {
        this.validateId(tableId, 'tableId');
        this.validateId(fieldId, 'fieldId');
        const response = await this.client.patch(`/table/${tableId}/field/${fieldId}`, updates);
        return response.data;
    }

    async deleteField(tableId: string, fieldId: string) {
        this.validateId(tableId, 'tableId');
        this.validateId(fieldId, 'fieldId');
        const response = await this.client.delete(`/table/${tableId}/field/${fieldId}`);
        return response.data;
    }

    // ── Phase 3: Table CRUD + Export ─────────────────────────────────────────

    async createTable(baseId: string, name: string, description?: string, fields?: any[]) {
        this.validateId(baseId, 'baseId');
        const body: any = { name };
        if (description) body.description = description;
        if (fields) body.fields = fields;
        const response = await this.client.post(`/base/${baseId}/table`, body);
        return response.data;
    }

    async updateTable(baseId: string, tableId: string, updates: { name?: string; description?: string }) {
        this.validateId(baseId, 'baseId');
        this.validateId(tableId, 'tableId');
        const results: any = {};
        if (updates.name !== undefined) {
            const nameRes = await this.client.put(`/base/${baseId}/table/${tableId}/name`, { name: updates.name });
            results.name = nameRes.data;
        }
        if (updates.description !== undefined) {
            const descRes = await this.client.put(`/base/${baseId}/table/${tableId}/description`, { description: updates.description });
            results.description = descRes.data;
        }
        return results;
    }

    async deleteTable(baseId: string, tableId: string) {
        this.validateId(baseId, 'baseId');
        this.validateId(tableId, 'tableId');
        const response = await this.client.delete(`/base/${baseId}/table/${tableId}`);
        return response.data;
    }

    async exportTableData(tableId: string) {
        this.validateId(tableId, 'tableId');
        const response = await this.client.get(`/export/${tableId}`);
        return response.data;
    }

    // ── Phase 4: Table Trash ─────────────────────────────────────────────────

    async getTableTrash(baseId: string) {
        this.validateId(baseId, 'baseId');
        const response = await this.client.get('/trash/items', {
            params: { resourceId: baseId, resourceType: 'base' },
        });
        return response.data;
    }

    async restoreTableFromTrash(trashId: string) {
        this.validateId(trashId, 'trashId');
        const response = await this.client.post(`/trash/restore/${trashId}`);
        return response.data;
    }

    async permanentlyDeleteTable(baseId: string, tableId: string) {
        this.validateId(baseId, 'baseId');
        this.validateId(tableId, 'tableId');
        const response = await this.client.delete(`/base/${baseId}/table/${tableId}/permanent`);
        return response.data;
    }

    // ── Phase 5: View CRUD + Share ────────────────────────────────────────────

    async createView(tableId: string, name: string, type: string) {
        this.validateId(tableId, 'tableId');
        const response = await this.client.post(`/table/${tableId}/view`, { name, type });
        return response.data;
    }

    async updateView(tableId: string, viewId: string, updates: { name?: string; filter?: any; sort?: any }) {
        this.validateId(tableId, 'tableId');
        this.validateId(viewId, 'viewId');
        const results: any = {};
        if (updates.name !== undefined) {
            const nameRes = await this.client.put(`/table/${tableId}/view/${viewId}/name`, { name: updates.name });
            results.name = nameRes.data;
        }
        return results;
    }

    async deleteView(tableId: string, viewId: string) {
        this.validateId(tableId, 'tableId');
        this.validateId(viewId, 'viewId');
        const response = await this.client.delete(`/table/${tableId}/view/${viewId}`);
        return response.data;
    }

    async shareView(tableId: string, viewId: string, enableShare: boolean) {
        this.validateId(tableId, 'tableId');
        this.validateId(viewId, 'viewId');
        if (enableShare) {
            const response = await this.client.post(`/table/${tableId}/view/${viewId}/enable-share`);
            return response.data;
        } else {
            const response = await this.client.post(`/table/${tableId}/view/${viewId}/disable-share`);
            return response.data;
        }
    }

    isAxiosError(error: any) {
        return axios.isAxiosError(error);
    }
}

export { TeableApiClient };
