import { useState } from 'react';
import {
  Package,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Clock,
  Plus,
  Search,
  Filter,
  RefreshCw,
  ShoppingCart,
  Building2,
  BarChart3,
  Bell,
  Check,
  ChevronRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  useInventory,
  useInventorySummary,
  useInventoryAlerts,
  usePurchaseOrders,
  useSuppliers,
  usePriceHistory,
  useResolveAlert,
} from '@/hooks/useInventory';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'suppliers' | 'alerts'>('inventory');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [filterExpiring, setFilterExpiring] = useState(false);
  const [selectedHerbId, setSelectedHerbId] = useState<string | null>(null);

  const { data: inventoryItems, isLoading } = useInventory({
    keyword: searchKeyword,
    lowStockOnly: filterLowStock,
    expiringOnly: filterExpiring,
  });
  const { data: summary } = useInventorySummary();
  const { data: alerts } = useInventoryAlerts(true);
  const { data: orders } = usePurchaseOrders();
  const { data: suppliers } = useSuppliers();
  const { data: priceHistory } = usePriceHistory(selectedHerbId || '', undefined, 90);

  const resolveAlertMutation = useResolveAlert();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  const getStockStatus = (current: number, minimum: number, reorderPoint: number) => {
    if (current <= minimum) return { color: 'text-red-600', bg: 'bg-red-100', label: '부족' };
    if (current <= reorderPoint) return { color: 'text-yellow-600', bg: 'bg-yellow-100', label: '재주문' };
    return { color: 'text-green-600', bg: 'bg-green-100', label: '정상' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">약재 재고 관리</h1>
          <p className="text-gray-500 mt-1">실시간 재고 현황 및 가격 관리</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
            <ShoppingCart className="w-4 h-4" />
            발주서 생성
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            <Plus className="w-4 h-4" />
            재고 등록
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm">총 품목</p>
            <Package className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{summary?.totalItems || 0}종</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm">재고 부족</p>
            <TrendingDown className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-red-600">{summary?.lowStockCount || 0}종</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm">유통기한 임박</p>
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-yellow-600">{summary?.expiringCount || 0}종</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm">총 재고 가치</p>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{formatCurrency(summary?.totalValue || 0)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm">미처리 알림</p>
            <Bell className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold mt-2 text-amber-600">{summary?.alertCount || 0}건</p>
        </div>
      </div>

      {/* Alerts Banner */}
      {alerts && alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-medium text-amber-800">주의가 필요한 항목</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.slice(0, 6).map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg"
              >
                <div>
                  <p className="font-medium text-sm">
                    {alert.inventory?.herb?.koreanName || '약재'}
                  </p>
                  <p className="text-xs text-gray-500">{alert.message}</p>
                </div>
                <button
                  onClick={() => resolveAlertMutation.mutate(alert.id)}
                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-8">
          {[
            { key: 'inventory', label: '재고 현황', icon: Package },
            { key: 'orders', label: '발주 관리', icon: ShoppingCart },
            { key: 'suppliers', label: '공급업체', icon: Building2 },
            { key: 'alerts', label: '알림', icon: Bell, count: summary?.alertCount },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 pb-4 border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="약재 검색..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterLowStock}
                    onChange={(e) => setFilterLowStock(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-600">재고 부족만</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterExpiring}
                    onChange={(e) => setFilterExpiring(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-600">유통기한 임박</span>
                </label>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">약재명</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">공급업체</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">현재고</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">최소재고</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">상태</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">단가</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">유통기한</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {inventoryItems?.map((item) => {
                  const stockStatus = getStockStatus(
                    item.currentStock,
                    item.minimumStock,
                    item.reorderPoint
                  );
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{item.herb?.koreanName || '-'}</p>
                          <p className="text-sm text-gray-500">{item.herb?.chineseName}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{item.supplier?.name || '-'}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {item.currentStock} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {item.minimumStock} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.bg} ${stockStatus.color}`}
                        >
                          {stockStatus.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{formatCurrency(item.lastPurchasePrice)}</td>
                      <td className="px-4 py-3">
                        {item.expiryDate ? (
                          <span
                            className={
                              new Date(item.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                ? 'text-red-600'
                                : 'text-gray-500'
                            }
                          >
                            {new Date(item.expiryDate).toLocaleDateString('ko-KR')}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedHerbId(item.herbId)}
                          className="text-primary-600 hover:text-primary-800"
                        >
                          <BarChart3 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b">
            <h3 className="font-medium">발주서 목록</h3>
          </div>
          <div className="divide-y">
            {orders?.map((order) => (
              <div key={order.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm">{order.orderNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          order.status === 'received'
                            ? 'bg-green-100 text-green-700'
                            : order.status === 'shipped'
                            ? 'bg-blue-100 text-blue-700'
                            : order.status === 'confirmed'
                            ? 'bg-purple-100 text-purple-700'
                            : order.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {order.status === 'draft'
                          ? '초안'
                          : order.status === 'submitted'
                          ? '제출됨'
                          : order.status === 'confirmed'
                          ? '확인됨'
                          : order.status === 'shipped'
                          ? '배송중'
                          : order.status === 'received'
                          ? '입고완료'
                          : '취소됨'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {order.supplier?.name} · {order.items.length}품목
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">총액</p>
                      <p className="font-medium">{formatCurrency(order.totalAmount)}</p>
                    </div>
                    {order.expectedDeliveryDate && (
                      <div className="text-right">
                        <p className="text-sm text-gray-500">배송예정</p>
                        <p className="text-sm">
                          {new Date(order.expectedDeliveryDate).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                    )}
                    <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suppliers Tab */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers?.map((supplier) => (
            <div
              key={supplier.id}
              className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:border-primary-300 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{supplier.name}</h4>
                  {supplier.contactPerson && (
                    <p className="text-sm text-gray-500 mt-1">{supplier.contactPerson}</p>
                  )}
                </div>
                {supplier.rating && (
                  <div className="flex items-center gap-1">
                    <span className="text-amber-500">★</span>
                    <span className="text-sm font-medium">{supplier.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-2">
                {supplier.phone && (
                  <p className="text-sm text-gray-600">📞 {supplier.phone}</p>
                )}
                {supplier.email && (
                  <p className="text-sm text-gray-600">✉️ {supplier.email}</p>
                )}
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    supplier.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {supplier.isActive ? '활성' : '비활성'}
                </span>
                <button className="text-primary-600 text-sm hover:underline">상세보기</button>
              </div>
            </div>
          ))}
          <button className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-5 flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-primary-300 hover:text-primary-600 transition-colors">
            <Plus className="w-8 h-8" />
            <span>공급업체 추가</span>
          </button>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="divide-y">
            {alerts?.map((alert) => (
              <div key={alert.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-lg ${
                        alert.severity === 'critical'
                          ? 'bg-red-100'
                          : alert.severity === 'warning'
                          ? 'bg-yellow-100'
                          : 'bg-blue-100'
                      }`}
                    >
                      <AlertTriangle
                        className={`w-5 h-5 ${
                          alert.severity === 'critical'
                            ? 'text-red-600'
                            : alert.severity === 'warning'
                            ? 'text-yellow-600'
                            : 'text-blue-600'
                        }`}
                      />
                    </div>
                    <div>
                      <p className="font-medium">{alert.inventory?.herb?.koreanName || '약재'}</p>
                      <p className="text-sm text-gray-500">{alert.message}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-400">
                      {new Date(alert.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                    {!alert.isResolved && (
                      <button
                        onClick={() => resolveAlertMutation.mutate(alert.id)}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                      >
                        해결
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Price History Modal */}
      {selectedHerbId && priceHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">가격 추이</h3>
              <button
                onClick={() => setSelectedHerbId(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="recordedAt"
                      tickFormatter={(v) => new Date(v).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(v) => new Date(v).toLocaleDateString('ko-KR')}
                      formatter={(v: number) => [formatCurrency(v), '가격']}
                    />
                    <Line type="monotone" dataKey="price" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
