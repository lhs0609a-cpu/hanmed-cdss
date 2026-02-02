import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

// Types
export interface HerbSupplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  rating?: number;
  notes?: string;
  isActive: boolean;
}

export interface HerbInventory {
  id: string;
  herbId: string;
  supplierId?: string;
  currentStock: number;
  unit: string;
  minimumStock: number;
  maximumStock?: number;
  reorderPoint: number;
  lastPurchasePrice: number;
  averagePrice: number;
  location?: string;
  batchNumber?: string;
  expiryDate?: string;
  lastRestockDate?: string;
  herb?: { koreanName: string; chineseName?: string };
  supplier?: { name: string };
}

export interface InventoryTransaction {
  id: string;
  inventoryId: string;
  transactionType: 'purchase' | 'sale' | 'adjustment' | 'waste' | 'return';
  quantity: number;
  unitPrice?: number;
  totalAmount?: number;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
  createdBy?: { name: string };
}

export interface HerbPriceHistory {
  id: string;
  herbId: string;
  supplierId: string;
  price: number;
  unit: string;
  recordedAt: string;
  supplier?: { name: string };
}

export interface InventoryAlert {
  id: string;
  inventoryId: string;
  alertType: 'low_stock' | 'expiring_soon' | 'expired' | 'price_increase' | 'reorder_needed';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  isResolved: boolean;
  resolvedAt?: string;
  createdAt: string;
  inventory?: HerbInventory;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  status: 'draft' | 'submitted' | 'confirmed' | 'shipped' | 'received' | 'cancelled';
  items: Array<{
    herbId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    herb?: { koreanName: string };
  }>;
  totalAmount: number;
  expectedDeliveryDate?: string;
  notes?: string;
  createdAt: string;
  supplier?: { name: string };
}

export interface InventorySummary {
  totalItems: number;
  lowStockCount: number;
  expiringCount: number;
  totalValue: number;
  alertCount: number;
  pendingOrdersCount: number;
}

// 공급업체 목록
export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data } = await api.get('/inventory/suppliers');
      return data.data as HerbSupplier[];
    },
  });
}

// 공급업체 상세
export function useSupplier(supplierId: string) {
  return useQuery({
    queryKey: ['supplier', supplierId],
    queryFn: async () => {
      const { data } = await api.get(`/inventory/suppliers/${supplierId}`);
      return data.data as HerbSupplier;
    },
    enabled: !!supplierId,
  });
}

// 공급업체 생성
export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: Omit<HerbSupplier, 'id'>) => {
      const { data } = await api.post('/inventory/suppliers', dto);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

// 재고 목록
export function useInventory(options?: {
  keyword?: string;
  lowStockOnly?: boolean;
  expiringOnly?: boolean;
  supplierId?: string;
}) {
  return useQuery({
    queryKey: ['inventory', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.keyword) params.append('keyword', options.keyword);
      if (options?.lowStockOnly) params.append('lowStockOnly', 'true');
      if (options?.expiringOnly) params.append('expiringOnly', 'true');
      if (options?.supplierId) params.append('supplierId', options.supplierId);

      const { data } = await api.get(`/inventory/items?${params.toString()}`);
      return data.data as HerbInventory[];
    },
  });
}

// 재고 현황 요약
export function useInventorySummary() {
  return useQuery({
    queryKey: ['inventory-summary'],
    queryFn: async () => {
      const { data } = await api.get('/inventory/summary');
      return data.data as InventorySummary;
    },
  });
}

// 재고 등록/수정
export function useUpsertInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: {
      herbId: string;
      supplierId?: string;
      currentStock: number;
      unit: string;
      minimumStock: number;
      reorderPoint: number;
      lastPurchasePrice: number;
      location?: string;
      batchNumber?: string;
      expiryDate?: string;
    }) => {
      const { data } = await api.post('/inventory/items', dto);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
    },
  });
}

// 거래 내역 조회
export function useTransactions(options?: {
  inventoryId?: string;
  startDate?: string;
  endDate?: string;
  transactionType?: string;
}) {
  return useQuery({
    queryKey: ['inventory-transactions', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.inventoryId) params.append('inventoryId', options.inventoryId);
      if (options?.startDate) params.append('startDate', options.startDate);
      if (options?.endDate) params.append('endDate', options.endDate);
      if (options?.transactionType) params.append('transactionType', options.transactionType);

      const { data } = await api.get(`/inventory/transactions?${params.toString()}`);
      return data.data as InventoryTransaction[];
    },
  });
}

// 거래 기록
export function useRecordTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: {
      inventoryId: string;
      transactionType: 'purchase' | 'sale' | 'adjustment' | 'waste' | 'return';
      quantity: number;
      unitPrice?: number;
      referenceNumber?: string;
      notes?: string;
    }) => {
      const { data } = await api.post('/inventory/transactions', dto);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
    },
  });
}

// 가격 비교
export function usePriceComparison(herbId: string) {
  return useQuery({
    queryKey: ['price-comparison', herbId],
    queryFn: async () => {
      const { data } = await api.get(`/inventory/prices/compare/${herbId}`);
      return data.data as Array<{
        supplierId: string;
        supplierName: string;
        currentPrice: number;
        avgPrice: number;
        minPrice: number;
        maxPrice: number;
        lastUpdated: string;
      }>;
    },
    enabled: !!herbId,
  });
}

// 가격 추이
export function usePriceHistory(herbId: string, supplierId?: string, days?: number) {
  return useQuery({
    queryKey: ['price-history', herbId, supplierId, days],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (supplierId) params.append('supplierId', supplierId);
      if (days) params.append('days', String(days));

      const { data } = await api.get(`/inventory/prices/history/${herbId}?${params.toString()}`);
      return data.data as HerbPriceHistory[];
    },
    enabled: !!herbId,
  });
}

// 가격 기록
export function useRecordPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: {
      herbId: string;
      supplierId: string;
      price: number;
      unit: string;
    }) => {
      const { data } = await api.post('/inventory/prices', dto);
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['price-comparison', variables.herbId] });
      queryClient.invalidateQueries({ queryKey: ['price-history', variables.herbId] });
    },
  });
}

// 재고 알림
export function useInventoryAlerts(unresolvedOnly: boolean = true) {
  return useQuery({
    queryKey: ['inventory-alerts', unresolvedOnly],
    queryFn: async () => {
      const { data } = await api.get(`/inventory/alerts?unresolvedOnly=${unresolvedOnly}`);
      return data.data as InventoryAlert[];
    },
  });
}

// 알림 해결
export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data } = await api.post(`/inventory/alerts/${alertId}/resolve`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
    },
  });
}

// 발주서 목록
export function usePurchaseOrders(status?: string) {
  return useQuery({
    queryKey: ['purchase-orders', status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : '';
      const { data } = await api.get(`/inventory/orders${params}`);
      return data.data as PurchaseOrder[];
    },
  });
}

// 발주서 생성
export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: {
      supplierId: string;
      items: Array<{ herbId: string; quantity: number; unitPrice: number }>;
      expectedDeliveryDate?: string;
      notes?: string;
    }) => {
      const { data } = await api.post('/inventory/orders', dto);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}

// 발주서 상태 변경
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { data } = await api.put(`/inventory/orders/${orderId}/status`, { status });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}

// 발주서 입고 처리
export function useReceiveOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data } = await api.post(`/inventory/orders/${orderId}/receive`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
    },
  });
}

// 사용량 분석
export function useUsageAnalysis(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['usage-analysis', startDate, endDate],
    queryFn: async () => {
      const { data } = await api.get(`/inventory/reports/usage?startDate=${startDate}&endDate=${endDate}`);
      return data.data as {
        topUsedHerbs: Array<{ herbId: string; herbName: string; totalUsed: number; unit: string }>;
        usageTrend: Array<{ date: string; totalUsage: number }>;
        costAnalysis: { totalCost: number; avgCostPerDay: number };
      };
    },
    enabled: !!startDate && !!endDate,
  });
}
