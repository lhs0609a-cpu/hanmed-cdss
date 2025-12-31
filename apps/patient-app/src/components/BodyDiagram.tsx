import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';

export interface BodyPart {
  id: string;
  name: string;
  nameKo: string;
  severity?: number; // 1-10
  symptoms?: string[];
  description?: string;
  meridian?: string; // 관련 경락
}

export interface BodyDiagramProps {
  affectedParts: BodyPart[];
  view?: 'front' | 'back' | 'side';
  onPartPress?: (part: BodyPart) => void;
  showLabels?: boolean;
  size?: 'small' | 'medium' | 'large';
}

// 신체 부위별 좌표 (SVG 경로)
const BODY_PARTS_COORDS: Record<string, { cx: number; cy: number; r: number }> = {
  // 머리/얼굴
  head: { cx: 150, cy: 40, r: 35 },
  forehead: { cx: 150, cy: 25, r: 15 },
  eyes: { cx: 150, cy: 35, r: 12 },
  nose: { cx: 150, cy: 45, r: 8 },
  mouth: { cx: 150, cy: 55, r: 10 },
  ears: { cx: 150, cy: 40, r: 10 },

  // 목/어깨
  neck: { cx: 150, cy: 85, r: 15 },
  left_shoulder: { cx: 100, cy: 110, r: 18 },
  right_shoulder: { cx: 200, cy: 110, r: 18 },

  // 가슴/등
  chest: { cx: 150, cy: 140, r: 30 },
  upper_back: { cx: 150, cy: 130, r: 28 },
  heart: { cx: 165, cy: 135, r: 15 },
  lungs: { cx: 150, cy: 130, r: 25 },

  // 복부
  abdomen: { cx: 150, cy: 190, r: 28 },
  stomach: { cx: 145, cy: 175, r: 18 },
  liver: { cx: 175, cy: 170, r: 16 },
  spleen: { cx: 125, cy: 175, r: 14 },
  intestines: { cx: 150, cy: 210, r: 22 },

  // 허리/골반
  lower_back: { cx: 150, cy: 230, r: 25 },
  pelvis: { cx: 150, cy: 255, r: 28 },
  kidneys: { cx: 150, cy: 220, r: 18 },

  // 팔
  left_arm: { cx: 70, cy: 170, r: 15 },
  right_arm: { cx: 230, cy: 170, r: 15 },
  left_elbow: { cx: 60, cy: 195, r: 12 },
  right_elbow: { cx: 240, cy: 195, r: 12 },
  left_wrist: { cx: 50, cy: 240, r: 10 },
  right_wrist: { cx: 250, cy: 240, r: 10 },
  left_hand: { cx: 45, cy: 265, r: 14 },
  right_hand: { cx: 255, cy: 265, r: 14 },

  // 다리
  left_thigh: { cx: 120, cy: 310, r: 20 },
  right_thigh: { cx: 180, cy: 310, r: 20 },
  left_knee: { cx: 115, cy: 360, r: 15 },
  right_knee: { cx: 185, cy: 360, r: 15 },
  left_calf: { cx: 110, cy: 410, r: 14 },
  right_calf: { cx: 190, cy: 410, r: 14 },
  left_ankle: { cx: 105, cy: 455, r: 10 },
  right_ankle: { cx: 195, cy: 455, r: 10 },
  left_foot: { cx: 100, cy: 480, r: 16 },
  right_foot: { cx: 200, cy: 480, r: 16 },
};

// 심각도에 따른 색상
const getSeverityColor = (severity: number = 5): string => {
  if (severity >= 8) return '#EF4444'; // 빨강 - 심각
  if (severity >= 6) return '#F97316'; // 주황 - 중등도
  if (severity >= 4) return '#EAB308'; // 노랑 - 경도
  return '#22C55E'; // 초록 - 경미
};

const getSeverityLabel = (severity: number = 5): string => {
  if (severity >= 8) return '심각';
  if (severity >= 6) return '중등도';
  if (severity >= 4) return '경도';
  return '경미';
};

export default function BodyDiagram({
  affectedParts,
  view = 'front',
  onPartPress,
  showLabels = true,
  size = 'medium',
}: BodyDiagramProps) {
  const [selectedPart, setSelectedPart] = useState<BodyPart | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const dimensions = {
    small: { width: 200, height: 340 },
    medium: { width: 300, height: 500 },
    large: { width: 360, height: 600 },
  };

  const { width, height } = dimensions[size];
  const scale = width / 300;

  const handlePartPress = (part: BodyPart) => {
    setSelectedPart(part);
    setModalVisible(true);
    onPartPress?.(part);
  };

  const renderBodyOutline = () => (
    <G>
      {/* 머리 */}
      <Circle cx={150 * scale} cy={40 * scale} r={35 * scale} fill="#FDE9D9" stroke="#D4A574" strokeWidth={1} />

      {/* 목 */}
      <Path
        d={`M ${135 * scale} ${75 * scale} L ${165 * scale} ${75 * scale} L ${165 * scale} ${100 * scale} L ${135 * scale} ${100 * scale} Z`}
        fill="#FDE9D9"
        stroke="#D4A574"
        strokeWidth={1}
      />

      {/* 몸통 */}
      <Path
        d={`M ${95 * scale} ${100 * scale}
            Q ${85 * scale} ${110 * scale} ${75 * scale} ${120 * scale}
            L ${55 * scale} ${180 * scale}
            L ${50 * scale} ${250 * scale}
            L ${55 * scale} ${270 * scale}
            Q ${100 * scale} ${280 * scale} ${150 * scale} ${275 * scale}
            Q ${200 * scale} ${280 * scale} ${245 * scale} ${270 * scale}
            L ${250 * scale} ${250 * scale}
            L ${245 * scale} ${180 * scale}
            L ${225 * scale} ${120 * scale}
            Q ${215 * scale} ${110 * scale} ${205 * scale} ${100 * scale}
            Z`}
        fill="#FDE9D9"
        stroke="#D4A574"
        strokeWidth={1}
      />

      {/* 왼팔 */}
      <Path
        d={`M ${75 * scale} ${120 * scale}
            Q ${50 * scale} ${160 * scale} ${45 * scale} ${220 * scale}
            L ${35 * scale} ${270 * scale}
            L ${55 * scale} ${275 * scale}
            L ${65 * scale} ${225 * scale}
            Q ${70 * scale} ${170 * scale} ${85 * scale} ${130 * scale}
            Z`}
        fill="#FDE9D9"
        stroke="#D4A574"
        strokeWidth={1}
      />

      {/* 오른팔 */}
      <Path
        d={`M ${225 * scale} ${120 * scale}
            Q ${250 * scale} ${160 * scale} ${255 * scale} ${220 * scale}
            L ${265 * scale} ${270 * scale}
            L ${245 * scale} ${275 * scale}
            L ${235 * scale} ${225 * scale}
            Q ${230 * scale} ${170 * scale} ${215 * scale} ${130 * scale}
            Z`}
        fill="#FDE9D9"
        stroke="#D4A574"
        strokeWidth={1}
      />

      {/* 왼다리 */}
      <Path
        d={`M ${100 * scale} ${275 * scale}
            L ${95 * scale} ${350 * scale}
            L ${90 * scale} ${420 * scale}
            L ${85 * scale} ${490 * scale}
            L ${115 * scale} ${490 * scale}
            L ${120 * scale} ${420 * scale}
            L ${125 * scale} ${350 * scale}
            L ${130 * scale} ${280 * scale}
            Z`}
        fill="#FDE9D9"
        stroke="#D4A574"
        strokeWidth={1}
      />

      {/* 오른다리 */}
      <Path
        d={`M ${200 * scale} ${275 * scale}
            L ${205 * scale} ${350 * scale}
            L ${210 * scale} ${420 * scale}
            L ${215 * scale} ${490 * scale}
            L ${185 * scale} ${490 * scale}
            L ${180 * scale} ${420 * scale}
            L ${175 * scale} ${350 * scale}
            L ${170 * scale} ${280 * scale}
            Z`}
        fill="#FDE9D9"
        stroke="#D4A574"
        strokeWidth={1}
      />
    </G>
  );

  const renderAffectedAreas = () => (
    <G>
      {affectedParts.map((part) => {
        const coords = BODY_PARTS_COORDS[part.id];
        if (!coords) return null;

        const color = getSeverityColor(part.severity);

        return (
          <G key={part.id}>
            <Circle
              cx={coords.cx * scale}
              cy={coords.cy * scale}
              r={(coords.r + 5) * scale}
              fill={color}
              opacity={0.3}
            />
            <Circle
              cx={coords.cx * scale}
              cy={coords.cy * scale}
              r={coords.r * scale}
              fill={color}
              opacity={0.6}
              onPress={() => handlePartPress(part)}
            />
            {/* 펄스 애니메이션 효과를 위한 외곽선 */}
            <Circle
              cx={coords.cx * scale}
              cy={coords.cy * scale}
              r={(coords.r + 3) * scale}
              fill="none"
              stroke={color}
              strokeWidth={2}
              opacity={0.8}
            />
          </G>
        );
      })}
    </G>
  );

  const renderLabels = () => {
    if (!showLabels) return null;

    return (
      <G>
        {affectedParts.map((part) => {
          const coords = BODY_PARTS_COORDS[part.id];
          if (!coords) return null;

          const labelX = coords.cx > 150 ? coords.cx + coords.r + 10 : coords.cx - coords.r - 10;
          const anchor = coords.cx > 150 ? 'start' : 'end';

          return (
            <SvgText
              key={`label-${part.id}`}
              x={labelX * scale}
              y={(coords.cy + 4) * scale}
              fill="#374151"
              fontSize={11 * scale}
              fontWeight="500"
              textAnchor={anchor}
            >
              {part.nameKo}
            </SvgText>
          );
        })}
      </G>
    );
  };

  return (
    <View style={styles.container}>
      <Svg width={width} height={height} viewBox={`0 0 ${300 * scale} ${500 * scale}`}>
        {renderBodyOutline()}
        {renderAffectedAreas()}
        {renderLabels()}
      </Svg>

      {/* 범례 */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendText}>심각</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F97316' }]} />
          <Text style={styles.legendText}>중등도</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EAB308' }]} />
          <Text style={styles.legendText}>경도</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
          <Text style={styles.legendText}>경미</Text>
        </View>
      </View>

      {/* 부위 상세 모달 */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {selectedPart && (
              <>
                <View style={styles.modalHeader}>
                  <View
                    style={[
                      styles.severityBadge,
                      { backgroundColor: getSeverityColor(selectedPart.severity) },
                    ]}
                  >
                    <Text style={styles.severityText}>
                      {getSeverityLabel(selectedPart.severity)}
                    </Text>
                  </View>
                  <Text style={styles.modalTitle}>{selectedPart.nameKo}</Text>
                </View>

                <ScrollView style={styles.modalBody}>
                  {selectedPart.description && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>증상 설명</Text>
                      <Text style={styles.modalText}>{selectedPart.description}</Text>
                    </View>
                  )}

                  {selectedPart.symptoms && selectedPart.symptoms.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>관련 증상</Text>
                      <View style={styles.symptomsList}>
                        {selectedPart.symptoms.map((symptom, idx) => (
                          <View key={idx} style={styles.symptomItem}>
                            <Text style={styles.symptomBullet}>•</Text>
                            <Text style={styles.symptomText}>{symptom}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {selectedPart.meridian && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>관련 경락</Text>
                      <View style={styles.meridianBadge}>
                        <Text style={styles.meridianText}>{selectedPart.meridian}</Text>
                      </View>
                    </View>
                  )}
                </ScrollView>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>닫기</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 340,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalBody: {
    padding: 16,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
  },
  symptomsList: {
    gap: 6,
  },
  symptomItem: {
    flexDirection: 'row',
    gap: 8,
  },
  symptomBullet: {
    color: '#10B981',
    fontWeight: '600',
  },
  symptomText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  meridianBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  meridianText: {
    fontSize: 14,
    color: '#1D4ED8',
    fontWeight: '500',
  },
  closeButton: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
});
