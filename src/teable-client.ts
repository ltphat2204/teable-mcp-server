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

    async queryTable(args: QueryTeableArgs) {
        const { tableId, filter, sort, limit, viewId } = args;
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
        const response = await this.client.get(`/space/${spaceId}/base`);
        return response.data;
    }

    async listTables(baseId: string) {
        const response = await this.client.get(`/base/${baseId}/table`);
        return response.data;
    }

    async getTableFields(tableId: string) {
        const response = await this.client.get(`/table/${tableId}/field`);
        return response.data;
    }

    async getRecord(tableId: string, recordId: string) {
        const response = await this.client.get(`/table/${tableId}/record/${recordId}`);
        return response.data;
    }

    async listViews(tableId: string) {
        const response = await this.client.get(`/table/${tableId}/view`);
        return response.data;
    }

    async getRecordHistory(tableId: string, recordId: string) {
        const response = await this.client.get(`/table/${tableId}/record/${recordId}/history`);
        return response.data;
    }

    // ── Phase 1: Record Comments ──────────────────────────────────────────────

    async getRecordComments(tableId: string, recordId: string) {
        const response = await this.client.get(`/comment/${tableId}/${recordId}/list`);
        return response.data;
    }

    async commentOnRecord(tableId: string, recordId: string, content: string) {
        const response = await this.client.post(`/comment/${tableId}/${recordId}/create`, {
            quoteId: null,
            content: [{ type: 'p', children: [{ type: 'span', value: content }] }],
        });
        return response.data;
    }

    // ── Phase 2: Field CRUD ───────────────────────────────────────────────────

    async createField(tableId: string, name: string, type: string, description?: string, options?: Record<string, any>) {
        const body: any = { name, type };
        if (description) body.description = description;
        if (options) body.options = options;
        const response = await this.client.post(`/table/${tableId}/field`, body);
        return response.data;
    }

    async updateField(tableId: string, fieldId: string, updates: { name?: string; description?: string; options?: Record<string, any> }) {
        const response = await this.client.patch(`/table/${tableId}/field/${fieldId}`, updates);
        return response.data;
    }

    async deleteField(tableId: string, fieldId: string) {
        const response = await this.client.delete(`/table/${tableId}/field/${fieldId}`);
        return response.data;
    }

    // ── Phase 3: Table CRUD + Export ─────────────────────────────────────────

    async createTable(baseId: string, name: string, description?: string, fields?: any[]) {
        const body: any = { name };
        if (description) body.description = description;
        if (fields) body.fields = fields;
        const response = await this.client.post(`/base/${baseId}/table`, body);
        return response.data;
    }

    async updateTable(baseId: string, tableId: string, updates: { name?: string; description?: string }) {
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
        const response = await this.client.delete(`/base/${baseId}/table/${tableId}`);
        return response.data;
    }

    async exportTableData(tableId: string) {
        const response = await this.client.get(`/export/${tableId}`);
        return response.data;
    }

    // ── Phase 4: Table Trash ─────────────────────────────────────────────────

    async getTableTrash(baseId: string) {
        const response = await this.client.get('/trash/items', {
            params: { resourceId: baseId, resourceType: 'base' },
        });
        return response.data;
    }

    async restoreTableFromTrash(trashId: string) {
        const response = await this.client.post(`/trash/restore/${trashId}`);
        return response.data;
    }

    async permanentlyDeleteTable(baseId: string, tableId: string) {
        const response = await this.client.delete(`/base/${baseId}/table/${tableId}/permanent`);
        return response.data;
    }

    // ── Phase 5: View CRUD + Share ────────────────────────────────────────────

    async createView(tableId: string, name: string, type: string) {
        const response = await this.client.post(`/table/${tableId}/view`, { name, type });
        return response.data;
    }

    async updateView(tableId: string, viewId: string, updates: { name?: string; filter?: any; sort?: any }) {
        const results: any = {};
        if (updates.name !== undefined) {
            const nameRes = await this.client.put(`/table/${tableId}/view/${viewId}/name`, { name: updates.name });
            results.name = nameRes.data;
        }
        return results;
    }

    async deleteView(tableId: string, viewId: string) {
        const response = await this.client.delete(`/table/${tableId}/view/${viewId}`);
        return response.data;
    }

    async shareView(tableId: string, viewId: string, enableShare: boolean) {
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
