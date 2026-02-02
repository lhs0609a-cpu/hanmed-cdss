import { useState } from 'react';
import {
  FileText,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronRight,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import {
  useInsuranceClaims,
  useClaimSummary,
  useMissingClaims,
  useSubmitClaims,
} from '@/hooks/useInsurance';

const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <FileText className="w-4 h-4" /> },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <Clock className="w-4 h-4" /> },
  submitted: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Send className="w-4 h-4" /> },
  under_review: { bg: 'bg-purple-100', text: 'text-purple-700', icon: <Search className="w-4 h-4" /> },
  approved: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-4 h-4" /> },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle className="w-4 h-4" /> },
  partial: { bg: 'bg-orange-100', text: 'text-orange-700', icon: <AlertTriangle className="w-4 h-4" /> },
  paid: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <CheckCircle className="w-4 h-4" /> },
};

const statusLabels: Record<string, string> = {
  draft: '작성중',
  pending: '검토대기',
  submitted: '제출됨',
  under_review: '심사중',
  approved: '승인',
  rejected: '거절',
  partial: '부분승인',
  paid: '지급완료',
};

export default function InsurancePage() {
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();
  const [selectedClaims, setSelectedClaims] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const { data: claimsData, isLoading } = useInsuranceClaims({
    status: selectedStatus,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  const { data: summary } = useClaimSummary(dateRange.startDate, dateRange.endDate);
  const { data: missingClaims } = useMissingClaims(dateRange.startDate, dateRange.endDate);
  const submitClaimsMutation = useSubmitClaims();

  const handleSelectAll = () => {
    if (selectedClaims.length === (claimsData?.claims.length || 0)) {
      setSelectedClaims([]);
    } else {
      setSelectedClaims(claimsData?.claims.map((c) => c.id) || []);
    }
  };

  const handleSelectClaim = (claimId: string) => {
    setSelectedClaims((prev) =>
      prev.includes(claimId) ? prev.filter((id) => id !== claimId) : [...prev, claimId]
    );
  };

  const handleSubmitSelected = async () => {
    if (selectedClaims.length === 0) return;
    await submitClaimsMutation.mutateAsync(selectedClaims);
    setSelectedClaims([]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">스마트 보험청구</h1>
          <p className="text-gray-500 mt-1">AI 기반 자동 청구서 생성 및 관리</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-2 border rounded-lg text-sm"
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm">총 청구건수</p>
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold mt-2">{summary?.totalClaims || 0}건</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm">청구금액</p>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{formatCurrency(summary?.totalAmount || 0)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm">대기중</p>
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{formatCurrency(summary?.pendingAmount || 0)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm">승인금액</p>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{formatCurrency(summary?.approvedAmount || 0)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm">거절금액</p>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{formatCurrency(summary?.rejectedAmount || 0)}</p>
        </div>
      </div>

      {/* Missing Claims Alert */}
      {missingClaims && missingClaims.count > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <div>
              <p className="font-medium text-amber-800">누락된 청구 발견</p>
              <p className="text-sm text-amber-600">
                {missingClaims.count}건의 진료 기록이 청구되지 않았습니다.
              </p>
            </div>
          </div>
          <button className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center gap-2">
            자동 청구서 생성
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Claims Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {/* Table Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={selectedStatus || ''}
                onChange={(e) => setSelectedStatus(e.target.value || undefined)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">전체 상태</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            {selectedClaims.length > 0 && (
              <span className="text-sm text-gray-500">{selectedClaims.length}건 선택됨</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedClaims.length > 0 && (
              <button
                onClick={handleSubmitSelected}
                disabled={submitClaimsMutation.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 disabled:opacity-50"
              >
                {submitClaimsMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                일괄 제출
              </button>
            )}
            <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Download className="w-4 h-4" />
              내보내기
            </button>
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={
                        selectedClaims.length === (claimsData?.claims.length || 0) &&
                        claimsData?.claims.length !== 0
                      }
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">청구번호</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">환자명</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">진료일</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">상태</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">청구금액</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">승인금액</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">AI 분석</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {claimsData?.claims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedClaims.includes(claim.id)}
                        onChange={() => handleSelectClaim(claim.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">{claim.claimNumber}</td>
                    <td className="px-4 py-3 font-medium">{claim.patient?.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(claim.treatmentDate).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          statusColors[claim.status]?.bg
                        } ${statusColors[claim.status]?.text}`}
                      >
                        {statusColors[claim.status]?.icon}
                        {statusLabels[claim.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(claim.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {claim.reviewResult?.approvedAmount
                        ? formatCurrency(claim.reviewResult.approvedAmount)
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {claim.aiAnalysis && (
                        <div className="flex items-center justify-center gap-1">
                          {claim.aiAnalysis.warnings.length > 0 ? (
                            <span className="text-amber-500" title={claim.aiAnalysis.warnings.join(', ')}>
                              <AlertTriangle className="w-4 h-4" />
                            </span>
                          ) : (
                            <span className="text-green-500">
                              <CheckCircle className="w-4 h-4" />
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {(claim.aiAnalysis.riskScore * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-primary-600 hover:text-primary-800">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {claimsData && claimsData.total > claimsData.limit && (
          <div className="p-4 border-t flex items-center justify-between">
            <p className="text-sm text-gray-500">
              총 {claimsData.total}건 중 {(claimsData.page - 1) * claimsData.limit + 1}-
              {Math.min(claimsData.page * claimsData.limit, claimsData.total)}건
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={claimsData.page === 1}
                className="px-3 py-1 border rounded-lg disabled:opacity-50"
              >
                이전
              </button>
              <button
                disabled={claimsData.page * claimsData.limit >= claimsData.total}
                className="px-3 py-1 border rounded-lg disabled:opacity-50"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
