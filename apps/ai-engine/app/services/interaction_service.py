from typing import List, Dict
from enum import Enum
from pydantic import BaseModel

class InteractionSeverity(str, Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"
    NONE = "none"

class DrugHerbInteraction(BaseModel):
    drug_name: str
    herb_name: str
    severity: InteractionSeverity
    mechanism: str
    recommendation: str

class InteractionCheckResult(BaseModel):
    has_interactions: bool
    total_count: int
    by_severity: Dict
    overall_safety: str
    recommendations: List[str]

class InteractionService:
    """양약-한약 상호작용 검증 서비스"""

    # 알려진 상호작용 데이터베이스
    KNOWN_INTERACTIONS = {
        ("와파린", "당귀"): {
            "severity": InteractionSeverity.CRITICAL,
            "mechanism": "당귀는 쿠마린 유도체를 함유하여 와파린의 항응고 작용을 증강시킬 수 있음",
            "recommendation": "병용 금기. 당귀 포함 처방 사용 시 INR 모니터링 필수",
        },
        ("와파린", "단삼"): {
            "severity": InteractionSeverity.CRITICAL,
            "mechanism": "단삼의 항혈소판 작용이 와파린의 항응고 효과를 증강",
            "recommendation": "병용 금기. 출혈 위험 증가",
        },
        ("아스피린", "은행잎"): {
            "severity": InteractionSeverity.WARNING,
            "mechanism": "은행잎의 항혈소판 작용이 아스피린과 상승 작용하여 출혈 위험 증가",
            "recommendation": "병용 시 출혈 증상 관찰 필요",
        },
        ("메트포르민", "황기"): {
            "severity": InteractionSeverity.WARNING,
            "mechanism": "황기가 혈당 강하 효과를 증강시킬 수 있음",
            "recommendation": "혈당 모니터링 권고, 저혈당 증상 주의",
        },
        ("디곡신", "감초"): {
            "severity": InteractionSeverity.WARNING,
            "mechanism": "감초의 저칼륨혈증 유발 가능성으로 디곡신 독성 증가 위험",
            "recommendation": "칼륨 수치 모니터링 필요",
        },
        ("면역억제제", "황기"): {
            "severity": InteractionSeverity.WARNING,
            "mechanism": "황기의 면역 증강 작용이 면역억제제 효과와 상충",
            "recommendation": "이식 환자에서 주의, 담당 의사와 상담 필요",
        },
        ("항우울제", "인삼"): {
            "severity": InteractionSeverity.INFO,
            "mechanism": "인삼이 세로토닌 수치에 영향을 줄 수 있음",
            "recommendation": "일반적으로 안전하나 고용량 사용 시 주의",
        },
    }

    async def check_interactions(
        self,
        herbs: List[str],
        medications: List[str],
    ) -> InteractionCheckResult:
        """처방 약재와 복용 중인 양약 간 상호작용 검사"""

        interactions = {
            "critical": [],
            "warning": [],
            "info": [],
        }

        # 알려진 상호작용 DB 검색
        for drug in medications:
            for herb in herbs:
                # 약품명 정규화 (간단한 매칭)
                drug_normalized = drug.lower().strip()
                herb_normalized = herb.strip()

                for (known_drug, known_herb), data in self.KNOWN_INTERACTIONS.items():
                    if (known_drug in drug_normalized or drug_normalized in known_drug.lower()) and \
                       (known_herb == herb_normalized or known_herb in herb_normalized):
                        interaction = DrugHerbInteraction(
                            drug_name=drug,
                            herb_name=herb,
                            severity=data["severity"],
                            mechanism=data["mechanism"],
                            recommendation=data["recommendation"],
                        )
                        interactions[data["severity"].value].append(interaction.model_dump())

        # 전체 안전성 평가
        total_count = sum(len(v) for v in interactions.values())
        has_critical = len(interactions["critical"]) > 0
        has_warning = len(interactions["warning"]) > 0

        if has_critical:
            overall_safety = "위험 - 금기 상호작용 발견"
        elif has_warning:
            overall_safety = "주의 - 모니터링 필요"
        elif total_count > 0:
            overall_safety = "경미한 상호작용 있음"
        else:
            overall_safety = "알려진 상호작용 없음"

        # 권고사항 생성
        recommendations = self._generate_recommendations(interactions)

        return InteractionCheckResult(
            has_interactions=total_count > 0,
            total_count=total_count,
            by_severity=interactions,
            overall_safety=overall_safety,
            recommendations=recommendations,
        )

    def _generate_recommendations(self, interactions: Dict) -> List[str]:
        """상호작용 기반 권고사항 생성"""
        recommendations = []

        if interactions["critical"]:
            herbs = set(i["herb_name"] for i in interactions["critical"])
            recommendations.append(
                f"[긴급] 다음 약재는 현재 복용 약물과 금기입니다: {', '.join(herbs)}"
            )

        if interactions["warning"]:
            recommendations.append(
                "정기적인 모니터링이 권장됩니다 (혈액검사, 활력징후 등)"
            )

        if not interactions["critical"] and not interactions["warning"] and not interactions["info"]:
            recommendations.append(
                "알려진 상호작용이 발견되지 않았습니다. 다만, 이상 증상 발생 시 즉시 상담하세요."
            )

        return recommendations
