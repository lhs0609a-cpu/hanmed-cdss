"""토스페이먼츠 결제 서비스"""

import httpx
import base64
from datetime import datetime, timedelta
from typing import Optional
from ..core.config import settings

# 플랜별 가격 및 설정
PLAN_PRICES = {
    "free": {
        "monthly": 0,
        "yearly": 0,
        "name": "Free",
        "included_queries": 10,
        "overage_price": 0,
        "can_exceed": False,
    },
    "basic": {
        "monthly": 19900,
        "yearly": 199000,
        "name": "Basic",
        "included_queries": 50,
        "overage_price": 500,
        "can_exceed": True,
    },
    "professional": {
        "monthly": 99000,
        "yearly": 990000,
        "name": "Professional",
        "included_queries": 300,
        "overage_price": 300,
        "can_exceed": True,
    },
    "clinic": {
        "monthly": 199000,
        "yearly": 1990000,
        "name": "Clinic",
        "included_queries": -1,  # 무제한
        "overage_price": 0,
        "can_exceed": False,
    },
}


class TossPaymentsService:
    """토스페이먼츠 API 연동 서비스"""

    def __init__(self):
        self.api_url = "https://api.tosspayments.com/v1"
        self.secret_key = settings.TOSS_SECRET_KEY
        self.client_key = settings.TOSS_CLIENT_KEY

    def _get_auth_header(self) -> str:
        """Basic Auth 헤더 생성"""
        credentials = base64.b64encode(f"{self.secret_key}:".encode()).decode()
        return f"Basic {credentials}"

    async def issue_billing_key(
        self,
        customer_key: str,
        card_number: str,
        expiration_year: str,
        expiration_month: str,
        card_password: str,
        customer_identity_number: str,
    ) -> dict:
        """빌링키 발급 (카드 등록)"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_url}/billing/authorizations/card",
                headers={
                    "Authorization": self._get_auth_header(),
                    "Content-Type": "application/json",
                },
                json={
                    "customerKey": customer_key,
                    "cardNumber": card_number,
                    "cardExpirationYear": expiration_year,
                    "cardExpirationMonth": expiration_month,
                    "cardPassword": card_password,
                    "customerIdentityNumber": customer_identity_number,
                },
            )

            if response.status_code != 200:
                error_data = response.json()
                raise Exception(error_data.get("message", "빌링키 발급 실패"))

            data = response.json()
            return {
                "billing_key": data["billingKey"],
                "card_number": data["card"]["number"],
                "card_company": data["card"].get("issuerCode", ""),
            }

    async def pay_with_billing_key(
        self,
        billing_key: str,
        customer_key: str,
        amount: int,
        order_id: str,
        order_name: str,
        customer_email: Optional[str] = None,
        customer_name: Optional[str] = None,
    ) -> dict:
        """빌링키로 결제 요청"""
        async with httpx.AsyncClient() as client:
            payload = {
                "customerKey": customer_key,
                "amount": amount,
                "orderId": order_id,
                "orderName": order_name,
            }
            if customer_email:
                payload["customerEmail"] = customer_email
            if customer_name:
                payload["customerName"] = customer_name

            response = await client.post(
                f"{self.api_url}/billing/{billing_key}",
                headers={
                    "Authorization": self._get_auth_header(),
                    "Content-Type": "application/json",
                },
                json=payload,
            )

            if response.status_code != 200:
                error_data = response.json()
                raise Exception(error_data.get("message", "결제 실패"))

            data = response.json()
            return {
                "payment_key": data["paymentKey"],
                "order_id": data["orderId"],
                "status": data["status"],
                "approved_at": data.get("approvedAt"),
                "total_amount": data["totalAmount"],
                "receipt_url": data.get("receipt", {}).get("url"),
            }

    async def cancel_payment(
        self,
        payment_key: str,
        cancel_reason: str,
        cancel_amount: Optional[int] = None,
    ) -> dict:
        """결제 취소 (환불)"""
        async with httpx.AsyncClient() as client:
            payload = {"cancelReason": cancel_reason}
            if cancel_amount:
                payload["cancelAmount"] = cancel_amount

            response = await client.post(
                f"{self.api_url}/payments/{payment_key}/cancel",
                headers={
                    "Authorization": self._get_auth_header(),
                    "Content-Type": "application/json",
                },
                json=payload,
            )

            if response.status_code != 200:
                error_data = response.json()
                raise Exception(error_data.get("message", "환불 실패"))

            data = response.json()
            cancels = data.get("cancels", [])
            latest_cancel = cancels[-1] if cancels else {}

            return {
                "success": True,
                "cancel_amount": latest_cancel.get("cancelAmount", 0),
                "canceled_at": latest_cancel.get("canceledAt"),
            }

    def get_plans(self) -> list:
        """요금제 목록 조회"""
        return [
            {
                "tier": "free",
                "name": "Free",
                "description": "학생/수련생을 위한 무료 플랜",
                "features": [
                    "AI 쿼리 10회/월",
                    "기본 검색 기능",
                    "커뮤니티 읽기",
                ],
                "monthlyPrice": 0,
                "yearlyPrice": 0,
                "aiQueryLimit": 10,
                "overagePrice": 0,
                "canExceed": False,
            },
            {
                "tier": "basic",
                "name": "Basic",
                "description": "한약사, 체험 사용자를 위한 기본 플랜",
                "features": [
                    "AI 쿼리 50회/월 포함",
                    "초과 시 500원/건",
                    "전체 검색 기능",
                    "커뮤니티 참여",
                    "이메일 지원",
                ],
                "monthlyPrice": 19900,
                "yearlyPrice": 199000,
                "aiQueryLimit": 50,
                "overagePrice": 500,
                "canExceed": True,
            },
            {
                "tier": "professional",
                "name": "Professional",
                "description": "봉직 한의사를 위한 전문가 플랜",
                "features": [
                    "AI 쿼리 300회/월 포함",
                    "초과 시 300원/건",
                    "고급 분석 기능",
                    "처방 비교 무제한",
                    "우선 지원",
                ],
                "monthlyPrice": 99000,
                "yearlyPrice": 990000,
                "aiQueryLimit": 300,
                "overagePrice": 300,
                "canExceed": True,
            },
            {
                "tier": "clinic",
                "name": "Clinic",
                "description": "개원 한의사를 위한 최상위 플랜",
                "features": [
                    "AI 쿼리 무제한",
                    "모든 기능 이용",
                    "다중 계정 지원",
                    "전담 지원",
                ],
                "monthlyPrice": 199000,
                "yearlyPrice": 1990000,
                "aiQueryLimit": -1,
                "overagePrice": 0,
                "canExceed": False,
            },
        ]

    def get_client_key(self) -> str:
        """클라이언트 키 반환"""
        return self.client_key


# 싱글톤 인스턴스
toss_service = TossPaymentsService()
