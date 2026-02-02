import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import Svg, {
  Rect,
  Circle,
  G,
  Text as SvgText,
  Path,
  Line,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============ 타입 정의 ============

export interface ChartDataset {
  label: string;
  data: number[];
  color?: string;
}

export interface ChartData {
  chartType: 'bar' | 'pie' | 'line' | 'gauge' | 'horizontalBar';
  title: string;
  labels: string[];
  datasets: ChartDataset[];
  unit?: string;
}

export interface OutcomeDistribution {
  cured: number;
  markedlyImproved: number;
  improved: number;
  noChange: number;
  worsened: number;
}

export interface SuccessGaugeProps {
  successRate: number;
  totalCases: number;
  confidenceLevel: 'high' | 'medium' | 'low';
}

export interface StatisticsChartProps {
  chartData?: ChartData;
  successGauge?: SuccessGaugeProps;
  outcomeDistribution?: OutcomeDistribution;
  showLegend?: boolean;
  height?: number;
}

// ============ 상수 ============

const COLORS = {
  primary: '#2196F3',
  success: '#4CAF50',
  warning: '#FF9800',
  danger: '#F44336',
  neutral: '#9E9E9E',
  background: '#F8F9FA',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
};

const CHART_COLORS = [
  '#4CAF50', // 녹색 (완치/성공)
  '#2196F3', // 파랑 (현저호전)
  '#03A9F4', // 하늘색 (호전)
  '#FF9800', // 주황 (불변)
  '#F44336', // 빨강 (악화)
  '#9C27B0', // 보라
  '#00BCD4', // 청록
  '#8BC34A', // 연두
];

const OUTCOME_COLORS: Record<string, string> = {
  cured: '#4CAF50',
  markedlyImproved: '#8BC34A',
  improved: '#03A9F4',
  noChange: '#FF9800',
  worsened: '#F44336',
};

const OUTCOME_LABELS: Record<string, string> = {
  cured: '완치',
  markedlyImproved: '현저호전',
  improved: '호전',
  noChange: '불변',
  worsened: '악화',
};

const CONFIDENCE_LABELS: Record<string, { label: string; color: string }> = {
  high: { label: '높은 신뢰도', color: COLORS.success },
  medium: { label: '중간 신뢰도', color: COLORS.warning },
  low: { label: '낮은 신뢰도', color: COLORS.neutral },
};

// ============ 유틸리티 함수 ============

const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
  ].join(' ');
};

// ============ 성공률 게이지 ============

const SuccessGauge: React.FC<SuccessGaugeProps & { size?: number }> = ({
  successRate,
  totalCases,
  confidenceLevel,
  size = 180,
}) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 20;
  const strokeWidth = 15;

  // 게이지 각도 계산 (0-100% -> 0-270도)
  const maxAngle = 270;
  const startAngle = -135;
  const angle = (successRate / 100) * maxAngle;

  // 색상 결정
  let gaugeColor = COLORS.success;
  if (successRate < 70) gaugeColor = COLORS.warning;
  if (successRate < 50) gaugeColor = COLORS.danger;

  const backgroundPath = describeArc(centerX, centerY, radius, startAngle, startAngle + maxAngle);
  const progressPath = describeArc(centerX, centerY, radius, startAngle, startAngle + angle);

  const confidence = CONFIDENCE_LABELS[confidenceLevel];

  return (
    <View style={styles.gaugeContainer}>
      <Svg width={size} height={size}>
        {/* 배경 호 */}
        <Path
          d={backgroundPath}
          fill="none"
          stroke={COLORS.border}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* 진행 호 */}
        <Path
          d={progressPath}
          fill="none"
          stroke={gaugeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* 중앙 텍스트 */}
        <SvgText
          x={centerX}
          y={centerY - 10}
          textAnchor="middle"
          fontSize={36}
          fontWeight="700"
          fill={COLORS.text}
        >
          {successRate}%
        </SvgText>
        <SvgText
          x={centerX}
          y={centerY + 18}
          textAnchor="middle"
          fontSize={12}
          fill={COLORS.textSecondary}
        >
          성공률
        </SvgText>
      </Svg>
      <View style={styles.gaugeInfo}>
        <Text style={styles.gaugeLabel}>분석 케이스: {totalCases.toLocaleString()}건</Text>
        <View style={[styles.confidenceBadge, { backgroundColor: confidence.color + '20' }]}>
          <Text style={[styles.confidenceText, { color: confidence.color }]}>
            {confidence.label}
          </Text>
        </View>
      </View>
    </View>
  );
};

// ============ 막대 차트 ============

const BarChart: React.FC<{
  data: ChartData;
  height?: number;
}> = ({ data, height = 200 }) => {
  const chartWidth = SCREEN_WIDTH - 80;
  const chartHeight = height - 50;
  const barWidth = Math.min(40, (chartWidth - 40) / data.labels.length - 10);
  const maxValue = Math.max(...data.datasets.flatMap(d => d.data));
  const scale = chartHeight / (maxValue * 1.1);

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{data.title}</Text>
      <Svg width={chartWidth} height={height}>
        {/* Y축 그리드 라인 */}
        {[0, 25, 50, 75, 100].map((val, i) => {
          const y = chartHeight - (val / 100) * chartHeight * (100 / maxValue);
          return (
            <G key={`grid-${i}`}>
              <Line
                x1={30}
                y1={y}
                x2={chartWidth - 10}
                y2={y}
                stroke={COLORS.border}
                strokeDasharray="3,3"
              />
              <SvgText
                x={25}
                y={y + 4}
                textAnchor="end"
                fontSize={10}
                fill={COLORS.textSecondary}
              >
                {Math.round((val / 100) * maxValue)}
              </SvgText>
            </G>
          );
        })}

        {/* 막대 */}
        {data.datasets[0].data.map((value, index) => {
          const barHeight = value * scale;
          const x = 40 + index * (barWidth + 15);
          const y = chartHeight - barHeight;
          const color = data.datasets[0].color || CHART_COLORS[index % CHART_COLORS.length];

          return (
            <G key={`bar-${index}`}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                rx={4}
              />
              <SvgText
                x={x + barWidth / 2}
                y={y - 5}
                textAnchor="middle"
                fontSize={11}
                fontWeight="600"
                fill={COLORS.text}
              >
                {value}{data.unit || ''}
              </SvgText>
              <SvgText
                x={x + barWidth / 2}
                y={chartHeight + 15}
                textAnchor="middle"
                fontSize={9}
                fill={COLORS.textSecondary}
              >
                {data.labels[index].length > 6
                  ? data.labels[index].substring(0, 6) + '..'
                  : data.labels[index]}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
};

// ============ 수평 막대 차트 ============

const HorizontalBarChart: React.FC<{
  data: ChartData;
  height?: number;
}> = ({ data, height = 200 }) => {
  const chartWidth = SCREEN_WIDTH - 80;
  const barHeight = 24;
  const maxValue = Math.max(...data.datasets.flatMap(d => d.data));
  const chartContentWidth = chartWidth - 80;

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{data.title}</Text>
      <View style={{ paddingVertical: 10 }}>
        {data.labels.map((label, index) => {
          const value = data.datasets[0].data[index];
          const width = (value / maxValue) * chartContentWidth;
          const color = CHART_COLORS[index % CHART_COLORS.length];

          return (
            <View key={index} style={styles.horizontalBarRow}>
              <Text style={styles.horizontalBarLabel} numberOfLines={1}>
                {label}
              </Text>
              <View style={styles.horizontalBarContainer}>
                <View
                  style={[
                    styles.horizontalBar,
                    { width, backgroundColor: color },
                  ]}
                />
                <Text style={styles.horizontalBarValue}>
                  {value}{data.unit || ''}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ============ 파이 차트 ============

const PieChart: React.FC<{
  data: ChartData;
  size?: number;
}> = ({ data, size = 160 }) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 10;
  const total = data.datasets[0].data.reduce((a, b) => a + b, 0);

  let currentAngle = 0;
  const slices = data.datasets[0].data.map((value, index) => {
    const angle = (value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const midAngle = startAngle + angle / 2;
    const labelRadius = radius * 0.7;
    const labelPos = polarToCartesian(centerX, centerY, labelRadius, midAngle - 90);

    return {
      value,
      percentage: Math.round((value / total) * 100),
      startAngle,
      endAngle,
      color: CHART_COLORS[index % CHART_COLORS.length],
      label: data.labels[index],
      labelPos,
    };
  });

  return (
    <View style={styles.pieContainer}>
      <Svg width={size} height={size}>
        {slices.map((slice, index) => {
          if (slice.value === 0) return null;

          const start = polarToCartesian(centerX, centerY, radius, slice.endAngle - 90);
          const end = polarToCartesian(centerX, centerY, radius, slice.startAngle - 90);
          const largeArcFlag = slice.endAngle - slice.startAngle > 180 ? 1 : 0;

          const pathData = [
            'M', centerX, centerY,
            'L', start.x, start.y,
            'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
            'Z',
          ].join(' ');

          return (
            <G key={index}>
              <Path d={pathData} fill={slice.color} />
              {slice.percentage >= 5 && (
                <SvgText
                  x={slice.labelPos.x}
                  y={slice.labelPos.y}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight="600"
                  fill="#FFFFFF"
                >
                  {slice.percentage}%
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>
      <View style={styles.pieLegend}>
        {slices.map((slice, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: slice.color }]} />
            <Text style={styles.legendText}>
              {slice.label} ({slice.value.toLocaleString()})
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// ============ 결과 분포 차트 ============

const OutcomeDistributionChart: React.FC<{
  distribution: OutcomeDistribution;
}> = ({ distribution }) => {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  const successCount = distribution.cured + distribution.markedlyImproved + distribution.improved;
  const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;

  const outcomes = [
    { key: 'cured', value: distribution.cured },
    { key: 'markedlyImproved', value: distribution.markedlyImproved },
    { key: 'improved', value: distribution.improved },
    { key: 'noChange', value: distribution.noChange },
    { key: 'worsened', value: distribution.worsened },
  ];

  const chartWidth = SCREEN_WIDTH - 80;

  return (
    <View style={styles.outcomeContainer}>
      <View style={styles.outcomeHeader}>
        <Text style={styles.chartTitle}>치료 결과 분포</Text>
        <View style={styles.successRateBadge}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
          <Text style={styles.successRateText}>성공률 {successRate}%</Text>
        </View>
      </View>

      {/* 스택 바 */}
      <View style={styles.stackBarContainer}>
        {outcomes.map(({ key, value }) => {
          const width = total > 0 ? (value / total) * chartWidth : 0;
          if (width < 2) return null;

          return (
            <View
              key={key}
              style={[
                styles.stackBarSegment,
                {
                  width,
                  backgroundColor: OUTCOME_COLORS[key],
                },
              ]}
            />
          );
        })}
      </View>

      {/* 범례 */}
      <View style={styles.outcomeLegend}>
        {outcomes.map(({ key, value }) => (
          <View key={key} style={styles.outcomeItem}>
            <View style={[styles.outcomeColor, { backgroundColor: OUTCOME_COLORS[key] }]} />
            <View>
              <Text style={styles.outcomeLabel}>{OUTCOME_LABELS[key]}</Text>
              <Text style={styles.outcomeValue}>
                {value.toLocaleString()}건 ({total > 0 ? Math.round((value / total) * 100) : 0}%)
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// ============ 메인 컴포넌트 ============

const StatisticsChart: React.FC<StatisticsChartProps> = ({
  chartData,
  successGauge,
  outcomeDistribution,
  showLegend = true,
  height = 200,
}) => {
  return (
    <View style={styles.container}>
      {successGauge && (
        <SuccessGauge
          successRate={successGauge.successRate}
          totalCases={successGauge.totalCases}
          confidenceLevel={successGauge.confidenceLevel}
        />
      )}

      {outcomeDistribution && (
        <OutcomeDistributionChart distribution={outcomeDistribution} />
      )}

      {chartData && chartData.chartType === 'bar' && (
        <BarChart data={chartData} height={height} />
      )}

      {chartData && chartData.chartType === 'horizontalBar' && (
        <HorizontalBarChart data={chartData} height={height} />
      )}

      {chartData && chartData.chartType === 'pie' && (
        <PieChart data={chartData} />
      )}

      {chartData && chartData.chartType === 'gauge' && successGauge && (
        <SuccessGauge
          successRate={successGauge.successRate}
          totalCases={successGauge.totalCases}
          confidenceLevel={successGauge.confidenceLevel}
        />
      )}
    </View>
  );
};

// ============ 스타일 ============

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  chartContainer: {
    paddingVertical: 8,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  gaugeContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  gaugeInfo: {
    alignItems: 'center',
    marginTop: 8,
  },
  gaugeLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  confidenceBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  horizontalBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  horizontalBarLabel: {
    width: 70,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  horizontalBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  horizontalBar: {
    height: 24,
    borderRadius: 4,
    minWidth: 4,
  },
  horizontalBarValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 8,
  },
  pieContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  pieLegend: {
    flex: 1,
    marginLeft: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.text,
  },
  outcomeContainer: {
    paddingVertical: 8,
  },
  outcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  successRateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  successRateText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.success,
    marginLeft: 4,
  },
  stackBarContainer: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
  },
  stackBarSegment: {
    height: '100%',
  },
  outcomeLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  outcomeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
  },
  outcomeColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 8,
  },
  outcomeLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  outcomeValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
});

export default StatisticsChart;
