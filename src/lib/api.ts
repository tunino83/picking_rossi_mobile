import { getApiBaseUrl } from '../config/app.config';
import { User ,Order , OrderRow, Warehouse} from '../types';

// API client for backend (real or dummy server)
const API_BASE_URL = getApiBaseUrl();

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('authToken');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    console.log('🌐 Making API request to:', url);
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      console.log('📡 Response status:', response.status);
      
      if (response.status === 401) {
        // Token expired or invalid
        this.clearToken();
        window.location.href = '/login';
        throw new Error('Authentication required');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ API Error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ API Response:', data);
      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Authentication
  async login(email: string, password: string) {
    const response = await this.request<{ message: string; token:string, requiresVerification: boolean }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.token) {
      this.setToken(response.token);
    }

    return response
  }

  async verify2FA(email: string, code: string) {
    const response = await this.request<{ user: any; token: string; message: string }>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  // Users
  async getUsers() {
    return this.request<{ users: User[]; total: number }>('/users');
  }

  async getWarehouseUsers(warehouseCode: string) {
    return this.request<{ users: User[]; total: number }>(`/users?role=warehouse&warehouse_code=${warehouseCode}`);
  }

  async getUserProfile() {
    return this.request<{ user: User }>('/users/profile');
  }

  async getUserById(id: string) {
    return this.request<{ user: User }>(`/users/${id}`);
  }

  async createUser(userData: {
    email: string;
    FIRST_NAME: string;
    LAST_NAME: string;
    role: string;
    password: string;
  }) {
    return this.request<{ message: string; userId: string }>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Orders
  async getOrderById(id: number) {
    return this.request<{ order: Order }>('/orders/' + id);
  }
  
  async getOrders(filters?: { status?: string; userId?: number; withDetails?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.userId) params.append('userId', filters.userId.toString());
    if (filters?.withDetails) params.append('withDetails', filters.withDetails);
    
    const queryString = params.toString();
    const endpoint = `/orders${queryString ? '?' + queryString : '?withDetails=NC'}`;
    
    return this.request<{ orders: Order[]; total: number }>(endpoint);
  }

  async getWarehouses() {
    return this.request<{ warehouses: Warehouse[]; total: number }>('/warehouses');
  }

  async getStock(warehouseCode?: string, page: number = 1, limit: number = 25) {
    const qsParts: string[] = [];
    if (warehouseCode) qsParts.push(`warehouseCode=${encodeURIComponent(warehouseCode)}`);
    if (page) qsParts.push(`page=${encodeURIComponent(String(page))}`);
    if (limit) qsParts.push(`limit=${encodeURIComponent(String(limit))}`);
    const qs = qsParts.length ? `?${qsParts.join('&')}` : '';
    return this.request<{ stock: any[]; total: number; page:number; limit:number }>(`/stock${qs}`);
  }

  async addStockEntry(payload: { warehouseCode?: string; itemCode: string; locationCode: string; quantity: number }) {
    return this.request<{ message: string; stockId: number | null }>('/stock', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getUserOrders(userId: number) {
    return this.request<{ orders: Order[]; total: number }>(`/orders?userId=${userId}`);
  }


  async getMyOrders() {
    //il parametro withDetails accetta:
    //ALL : carica i dettagli di tutti gli ordini potrebbe essere troppi
    //NC: carica dettaglio per i notcompleted
    return this.request<{ orders: Order[]; total: number }>(`/orders?myList&withDetails=NC`);
  }

  async addTransactionLog( orderData:{ type:string, headerId:number, bodyId?:number, quantity?:number, userEmail:string }) {
    return this.request<{ message: string }>('/orders/transactionLog', {
      method: 'PUT',
      body: JSON.stringify(orderData),
    });
  }

  async getOrderRows() {
    return this.request<{ rows: OrderRow[]; total: number }>('/orders/rows');
  }

  async updateOrderStatus(orderId: string, status: string) {
    return this.request<{ message: string }>('/orders/status', {
      method: 'PUT',
      body: JSON.stringify({ orderId, status }),
    });
  }

  async assignOrder(orderId: number, userId: number) {
    return this.request<{ message: string }>('/orders/assign', {
      method: 'PUT',
      body: JSON.stringify({ orderId, userId }),
    });
  }

  async assignOrderRows(rowIds: number[], userId: number) {
    return this.request<{ message: string }>('/orders/assignRows', {
      method: 'PUT',
      body: JSON.stringify({ rowIds, userId }),
    });
  }

  async updateProductStatus(orderId: string, productId: string, status: string) {
    return this.request<{ message: string }>('/orders/product-status', {
      method: 'PUT',
      body: JSON.stringify({ orderId, productId, status }),
    });
  }

  // Settings
  async getSettings() {
    return this.request<{ settings: any[]; total: number }>('/settings');
  }

  async updateSettings(settings: Array<{ id: string; value: string }>) {
    return this.request<{ message: string }>('/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    });
  }

  async getSettingByName(name: string) {
    return this.request<{ setting: any }>(`/settings/${name}`);
  }

  // Health check
  async healthCheck() {
    return this.request<{ status: string; timestamp: string }>('/health');
  }
}

export const apiClient = new ApiClient();