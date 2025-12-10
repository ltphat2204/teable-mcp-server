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

    isAxiosError(error: any) {
        return axios.isAxiosError(error);
    }
}

export { TeableApiClient };
