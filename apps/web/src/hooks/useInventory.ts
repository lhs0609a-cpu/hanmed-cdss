import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

// Mock Data for Demo Mode
const MOCK_SUPPLIERS: HerbSupplier[] = [
  { id: 's1', name: '경동약업사', contactPerson: '김약재', phone: '02-2345-6789', email: 'contact@kyungdong.co.kr', address: '서울시 동대문구 경동시장', rating: 4.5, isActive: true },
  { id: 's2', name: '제일약재상', contactPerson: '이한약', phone: '02-3456-7890', email: 'info@jeil-herb.com', address: '서울시 중구 을지로', rating: 4.2, isActive: true },
  { id: 's3', name: '대한약재', contactPerson: '박약사', phone: '02-4567-8901', email: 'sales@daehan-herb.kr', address: '대구시 중구', rating: 4.0, isActive: true },
];

const MOCK_INVENTORY: HerbInventory[] = [
  { id: 'i1', herbId: 'h1', supplierId: 's1', currentStock: 500, unit: 'g', minimumStock: 100, reorderPoint: 200, lastPurchasePrice: 15000, averagePrice: 14500, location: 'A-1', expiryDate: '2025-06-15', herb: { koreanName: '황기', chineseName: '黃芪' }, supplier: { name: '경동약업사' } },
  { id: 'i2', herbId: 'h2', supplierId: 's1', currentStock: 80, unit: 'g', minimumStock: 100, reorderPoint: 150, lastPurchasePrice: 25000, averagePrice: 24000, location: 'A-2', expiryDate: '2025-04-20', herb: { koreanName: '인삼', chineseName: '人蔘' }, supplier: { name: '경동약업사' } },
  { id: 'i3', herbId: 'h3', supplierId: 's2', currentStock: 300, unit: 'g', minimumStock: 50, reorderPoint: 100, lastPurchasePrice: 8000, averagePrice: 7500, location: 'B-1', expiryDate: '2025-08-10', herb: { koreanName: '감초', chineseName: '甘草' }, supplier: { name: '제일약재상' } },
  { id: 'i4', herbId: 'h4', supplierId: 's2', currentStock: 200, unit: 'g', minimumStock: 80, reorderPoint: 120, lastPurchasePrice: 12000, averagePrice: 11500, location: 'B-2', expiryDate: '2025-05-30', herb: { koreanName: '당귀', chineseName: '當歸' }, supplier: { name: '제일약재상' } },
  { id: 'i5', herbId: 'h5', supplierId: 's3', currentStock: 150, unit: 'g', minimumStock: 100, reorderPoint: 150, lastPurchasePrice: 18000, averagePrice: 17000, location: 'C-1', expiryDate: '2025-03-25', herb: { koreanName: '백출', chineseName: '白朮' }, supplier: { name: '대한약재' } },
];

const MOCK_ALERTS: InventoryAlert[] = [
  { id: 'a1', inventoryId: 'i2', alertType: 'low_stock', message: '인삼 재고가 최소 재고량 이하입니다', severity: 'critical', isResolved: false, createdAt: new Date().toISOString(), inventory: MOCK_INVENTORY[1] },
  { id: 'a2', inventoryId: 'i5', alertType: 'expiring_soon', message: '백출 유통기한이 30일 이내입니다', severity: 'warning', isResolved: false, createdAt: new Date().toISOString(), inventory: MOCK_INVENTORY[4] },
];

const MOCK_ORDERS: PurchaseOrder[] = [
  { id: 'o1', orderNumber: 'PO-2024-001', supplierId: 's1', status: 'shipped', items: [{ herbId: 'h1', quantity: 500, unitPrice: 15000, totalPrice: 75000, herb: { koreanName: '황기' } }], totalAmount: 75000, expectedDeliveryDate: new Date(Date.now() + 86400000 * 3).toISOString(), createdAt: new Date().toISOString(), supplier: { name: '경동약업사' } },
  { id: 'o2', orderNumber: 'PO-2024-002', supplierId: 's2', status: 'confirmed', items: [{ herbId: 'h3', quantity: 300, unitPrice: 8000, totalPrice: 24000, herb: { koreanName: '감초' } }], totalAmount: 24000, expectedDeliveryDate: new Date(Date.now() + 86400000 * 5).toISOString(), createdAt: new Date().toISOString(), supplier: { name: '제일약재상' } },
];

const MOCK_SUMMARY: InventorySummary = {
  totalItems: 45,
  lowStockCount: 3,
  expiringCount: 2,
  totalValue: 2450000,
  alertCount: 2,
  pendingOrdersCount: 2,
};

const MOCK_PRICE_HISTORY: HerbPriceHistory[] = [
  { id: 'ph1', herbId: 'h1', supplierId: 's1', price: 14000, unit: 'g', recordedAt: new Date(Date.now() - 86400000 * 60).toISOString() },
  { id: 'ph2', herbId: 'h1', supplierId: 's1', price: 14500, unit: 'g', recordedAt: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: 'ph3', herbId: 'h1', supplierId: 's1', price: 15000, unit: 'g', recordedAt: new Date().toISOString() },
];

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
      try {
        const { data } = await api.get('/inventory/suppliers');
        return data.data as HerbSupplier[];
      } catch {
        return MOCK_SUPPLIERS;
      }
    },
  });
}

// 공급업체 상세
export function useSupplier(supplierId: string) {
  return useQuery({
    queryKey: ['supplier', supplierId],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/inventory/suppliers/${supplierId}`);
        return data.data as HerbSupplier;
      } catch {
        return MOCK_SUPPLIERS.find(s => s.id === supplierId) || MOCK_SUPPLIERS[0];
      }
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
      try {
        const params = new URLSearchParams();
        if (options?.keyword) params.append('keyword', options.keyword);
        if (options?.lowStockOnly) params.append('lowStockOnly', 'true');
        if (options?.expiringOnly) params.append('expiringOnly', 'true');
        if (options?.supplierId) params.append('supplierId', options.supplierId);

        const { data } = await api.get(`/inventory/items?${params.toString()}`);
        return data.data as HerbInventory[];
      } catch {
        let filtered = [...MOCK_INVENTORY];
        if (options?.keyword) filtered = filtered.filter(i => i.herb?.koreanName.includes(options.keyword!));
        if (options?.lowStockOnly) filtered = filtered.filter(i => i.currentStock <= i.minimumStock);
        if (options?.expiringOnly) filtered = filtered.filter(i => i.expiryDate && new Date(i.expiryDate) < new Date(Date.now() + 30 * 86400000));
        return filtered;
      }
    },
  });
}

// 재고 현황 요약
export function useInventorySummary() {
  return useQuery({
    queryKey: ['inventory-summary'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/inventory/summary');
        return data.data as InventorySummary;
      } catch {
        return MOCK_SUMMARY;
      }
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
      try {
        const params = new URLSearchParams();
        if (options?.inventoryId) params.append('inventoryId', options.inventoryId);
        if (options?.startDate) params.append('startDate', options.startDate);
        if (options?.endDate) params.append('endDate', options.endDate);
        if (options?.transactionType) params.append('transactionType', options.transactionType);

        const { data } = await api.get(`/inventory/transactions?${params.toString()}`);
        return data.data as InventoryTransaction[];
      } catch {
        // 데모 데이터 반환
        return [
          { id: 't1', inventoryId: 'i1', transactionType: 'purchase' as const, quantity: 500, unitPrice: 15000, totalAmount: 75000, referenceNumber: 'PO-2024-001', createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), createdBy: { name: '홍길동' } },
          { id: 't2', inventoryId: 'i1', transactionType: 'sale' as const, quantity: 50, unitPrice: 15000, totalAmount: 7500, createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), createdBy: { name: '홍길동' } },
          { id: 't3', inventoryId: 'i2', transactionType: 'purchase' as const, quantity: 200, unitPrice: 25000, totalAmount: 50000, referenceNumber: 'PO-2024-002', createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), createdBy: { name: '홍길동' } },
        ];
      }
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
      try {
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
      } catch {
        // 데모 데이터 반환
        return MOCK_SUPPLIERS.map((supplier, i) => ({
          supplierId: supplier.id,
          supplierName: supplier.name,
          currentPrice: 15000 + i * 500,
          avgPrice: 14500 + i * 500,
          minPrice: 13000 + i * 500,
          maxPrice: 16000 + i * 500,
          lastUpdated: new Date().toISOString(),
        }));
      }
    },
    enabled: !!herbId,
  });
}

// 가격 추이
export function usePriceHistory(herbId: string, supplierId?: string, days?: number) {
  return useQuery({
    queryKey: ['price-history', herbId, supplierId, days],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (supplierId) params.append('supplierId', supplierId);
        if (days) params.append('days', String(days));

        const { data } = await api.get(`/inventory/prices/history/${herbId}?${params.toString()}`);
        return data.data as HerbPriceHistory[];
      } catch {
        return MOCK_PRICE_HISTORY.filter(p => p.herbId === herbId);
      }
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
      try {
        const { data } = await api.get(`/inventory/alerts?unresolvedOnly=${unresolvedOnly}`);
        return data.data as InventoryAlert[];
      } catch {
        if (unresolvedOnly) return MOCK_ALERTS.filter(a => !a.isResolved);
        return MOCK_ALERTS;
      }
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
      try {
        const params = status ? `?status=${status}` : '';
        const { data } = await api.get(`/inventory/orders${params}`);
        return data.data as PurchaseOrder[];
      } catch {
        if (status) return MOCK_ORDERS.filter(o => o.status === status);
        return MOCK_ORDERS;
      }
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
      try {
        const { data } = await api.get(`/inventory/reports/usage?startDate=${startDate}&endDate=${endDate}`);
        return data.data as {
          topUsedHerbs: Array<{ herbId: string; herbName: string; totalUsed: number; unit: string }>;
          usageTrend: Array<{ date: string; totalUsage: number }>;
          costAnalysis: { totalCost: number; avgCostPerDay: number };
        };
      } catch {
        // 데모 데이터 반환
        return {
          topUsedHerbs: [
            { herbId: 'h1', herbName: '황기', totalUsed: 2500, unit: 'g' },
            { herbId: 'h2', herbName: '인삼', totalUsed: 1800, unit: 'g' },
            { herbId: 'h3', herbName: '감초', totalUsed: 3200, unit: 'g' },
            { herbId: 'h4', herbName: '당귀', totalUsed: 2100, unit: 'g' },
            { herbId: 'h5', herbName: '백출', totalUsed: 1950, unit: 'g' },
          ],
          usageTrend: Array.from({ length: 14 }, (_, i) => ({
            date: new Date(Date.now() - (13 - i) * 86400000).toISOString().split('T')[0],
            totalUsage: Math.floor(Math.random() * 200) + 300,
          })),
          costAnalysis: {
            totalCost: 450000,
            avgCostPerDay: 32143,
          },
        };
      }
    },
    enabled: !!startDate && !!endDate,
  });
}
