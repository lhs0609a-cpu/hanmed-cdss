import { useState } from 'react';
import {
  TrendingUp,
  Clock,
  Target,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { usePrognosisByRecord, useGeneratePrognosis, type PrognosisPrediction } from '@/hooks/usePrognosis';

interface PrognosisCardProps {
  recordId: string;
  onViewDetails?: (prediction: PrognosisPrediction) => void;
}

export function PrognosisCard({ recordId, onViewDetails }: PrognosisCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { data: prediction, isLoading } = usePrognosisByRecord(recordId);
  const generateMutation = useGeneratePrognosis();

  const handleGenerate = async () => {
    await generateMutation.mutateAsync(recordId);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>예후 분석 로딩중...</span>
        </div>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-purple-900">AI 예후 예측</h3>
            <p className="text-sm text-purple-600 mt-1">
              이 진료 기록에 대한 예후 예측을 생성하세요
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            {generateMutation.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Target className="w-4 h-4" />
            )}
            예후 예측 생성
          </button>
        </div>
      </div>
    );
  }

  const { expectedDuration, improvementRate, confidenceScore, relapseProbability, factors } =
    prediction.prediction;

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">AI 예후 예측</h3>
              <p className="text-sm text-purple-100">
                {new Date(prediction.createdAt).toLocaleDateString('ko-KR')} 생성
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(
              confidenceScore
            )}`}
          >
            신뢰도 {(confidenceScore * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {/* Duration Prediction */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">예상 치료 기간</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-xs text-green-600 mb-1">낙관적</p>
              <p className="text-lg font-bold text-green-700">{expectedDuration.optimistic}일</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-xs text-blue-600 mb-1">일반적</p>
              <p className="text-lg font-bold text-blue-700">{expectedDuration.typical}일</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-xs text-amber-600 mb-1">보수적</p>
              <p className="text-lg font-bold text-amber-700">{expectedDuration.conservative}일</p>
            </div>
          </div>
        </div>

        {/* Improvement Timeline */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">예상 호전율</span>
          </div>
          <div className="flex items-end gap-2 h-20">
            {[
              { week: '1주', rate: improvementRate.week1 },
              { week: '2주', rate: improvementRate.week2 },
              { week: '4주', rate: improvementRate.week4 },
              { week: '8주', rate: improvementRate.week8 },
            ].map((item) => (
              <div key={item.week} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-gradient-to-t from-purple-500 to-purple-300 rounded-t"
                  style={{ height: `${item.rate}%` }}
                />
                <span className="text-xs text-gray-500">{item.week}</span>
                <span className="text-xs font-medium text-purple-600">{item.rate}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Relapse Probability */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">재발 가능성</span>
          </div>
          <span
            className={`font-medium ${
              relapseProbability < 0.3
                ? 'text-green-600'
                : relapseProbability < 0.6
                ? 'text-yellow-600'
                : 'text-red-600'
            }`}
          >
            {(relapseProbability * 100).toFixed(0)}%
          </span>
        </div>

        {/* Expandable Factors */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <span className="text-sm font-medium text-gray-700">영향 요인 분석</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {expanded && (
          <div className="mt-3 space-y-2">
            {factors.map((factor, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  factor.impact === 'positive' ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {factor.impact === 'positive' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm">{factor.factor}</span>
                </div>
                <span
                  className={`text-xs font-medium ${
                    factor.impact === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {factor.impact === 'positive' ? '+' : '-'}
                  {(factor.weight * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Evidence */}
        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-500">
          <span>유사 케이스 {prediction.evidence.similarCases}건 분석</span>
          <button
            onClick={() => onViewDetails?.(prediction)}
            className="flex items-center gap-1 text-purple-600 hover:text-purple-700"
          >
            <FileText className="w-4 h-4" />
            상세 리포트
          </button>
        </div>
      </div>
    </div>
  );
}

export default PrognosisCard;
