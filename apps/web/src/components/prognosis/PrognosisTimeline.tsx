import { TrendingUp, Calendar, Target, Check } from 'lucide-react';
import type { PrognosisPrediction } from '@/hooks/usePrognosis';

interface PrognosisTimelineProps {
  prediction: PrognosisPrediction;
  currentDay?: number;
}

export function PrognosisTimeline({ prediction, currentDay = 0 }: PrognosisTimelineProps) {
  const { expectedDuration, improvementRate } = prediction.prediction;

  const milestones = [
    { day: 7, label: '1주차', improvement: improvementRate.week1 },
    { day: 14, label: '2주차', improvement: improvementRate.week2 },
    { day: 28, label: '4주차', improvement: improvementRate.week4 },
    { day: 56, label: '8주차', improvement: improvementRate.week8 },
  ];

  const getProgress = () => {
    return Math.min((currentDay / expectedDuration.typical) * 100, 100);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="w-5 h-5 text-purple-600" />
        <h3 className="font-semibold text-gray-900">치료 타임라인</h3>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">치료 진행률</span>
          <span className="font-medium text-purple-600">{getProgress().toFixed(0)}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${getProgress()}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
          <span>시작</span>
          <span>예상 완료: {expectedDuration.typical}일</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

        <div className="space-y-6">
          {milestones.map((milestone, index) => {
            const isPast = currentDay >= milestone.day;
            const isCurrent =
              index === 0
                ? currentDay < milestone.day
                : currentDay >= milestones[index - 1].day && currentDay < milestone.day;

            return (
              <div key={milestone.day} className="relative flex items-start gap-4 pl-10">
                {/* Dot */}
                <div
                  className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    isPast
                      ? 'bg-green-100'
                      : isCurrent
                      ? 'bg-purple-100 ring-4 ring-purple-50'
                      : 'bg-gray-100'
                  }`}
                >
                  {isPast ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Target
                      className={`w-4 h-4 ${isCurrent ? 'text-purple-600' : 'text-gray-400'}`}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4
                        className={`font-medium ${
                          isPast
                            ? 'text-green-700'
                            : isCurrent
                            ? 'text-purple-700'
                            : 'text-gray-600'
                        }`}
                      >
                        {milestone.label}
                      </h4>
                      <p className="text-sm text-gray-500">{milestone.day}일차</p>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        isPast
                          ? 'bg-green-100 text-green-700'
                          : isCurrent
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      예상 호전율 {milestone.improvement}%
                    </div>
                  </div>

                  {/* Improvement Bar */}
                  <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isPast
                          ? 'bg-green-400'
                          : isCurrent
                          ? 'bg-purple-400'
                          : 'bg-gray-300'
                      }`}
                      style={{ width: `${milestone.improvement}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Final Goal */}
          <div className="relative flex items-start gap-4 pl-10">
            <div
              className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${
                currentDay >= expectedDuration.typical
                  ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                  : 'bg-gray-100'
              }`}
            >
              <TrendingUp
                className={`w-4 h-4 ${
                  currentDay >= expectedDuration.typical ? 'text-white' : 'text-gray-400'
                }`}
              />
            </div>
            <div className="flex-1">
              <h4
                className={`font-medium ${
                  currentDay >= expectedDuration.typical ? 'text-green-700' : 'text-gray-600'
                }`}
              >
                치료 완료
              </h4>
              <p className="text-sm text-gray-500">예상 {expectedDuration.typical}일</p>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t flex items-center justify-center gap-6 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <span>완료</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-purple-400" />
          <span>진행중</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gray-300" />
          <span>예정</span>
        </div>
      </div>
    </div>
  );
}

export default PrognosisTimeline;
