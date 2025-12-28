"""구독 관리 API 엔드포인트"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import jwt

from ...core.config import settings
from ...services.toss_service import toss_service, PLAN_PRICES

router = APIRouter()


# ============ Pydantic 모델 ============

class RegisterCardRequest(BaseModel):
    cardNumber: str
    expirationYear: str
    expirationMonth: str
    cardPassword: str
    customerIdentityNumber: str


class SubscribeRequest(BaseModel):
    tier: str  # basic, professional, clinic
    interval: str  # monthly, yearly


class RefundRequest(BaseModel):
    paymentId: str
    reason: str
    amount: Optional[int] = None


# ============ 인증 헬퍼 ============

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """JWT 토큰에서 사용자 정보 추출 (간소화된 버전)"""
    if not authorization:
        raise HTTPException(status_code=401, detail="인증이 필요합니다")

    try:
        token = authorization.replace("Bearer ", "")
        # JWT 검증 (실제로는 더 강력한 검증 필요)
        if settings.JWT_SECRET:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
            return {
                "id": payload.get("sub") or payload.get("userId"),
                "email": payload.get("email"),
                "name": payload.get("name"),
                "subscriptionTier": payload.get("subscriptionTier", "free"),
            }
        else:
            # JWT_SECRET 없으면 토큰 디코드만 (검증 없음 - 개발용)
            payload = jwt.decode(token, options={"verify_signature": False})
            return {
                "id": payload.get("sub") or payload.get("userId"),
                "email": payload.get("email"),
                "name": payload.get("name"),
                "subscriptionTier": payload.get("subscriptionTier", "free"),
            }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="토큰이 만료되었습니다")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")


# ============ 임시 저장소 (실제로는 DB 사용) ============
# TODO: PostgreSQL 연동 시 제거

user_subscriptions = {}  # user_id -> subscription info
user_billing_keys = {}   # user_id -> billing_key
user_usage = {}          # user_id -> usage count


# ============ API 엔드포인트 ============

@router.get("/plans")
async def get_plans():
    """요금제 목록 조회 (인증 불필요)"""
    return {"plans": toss_service.get_plans()}


@router.get("/client-key")
async def get_client_key():
    """토스페이먼츠 클라이언트 키 조회"""
    return {"clientKey": toss_service.get_client_key()}


@router.get("/info")
async def get_subscription_info(user: dict = Depends(get_current_user)):
    """현재 구독 정보 조회"""
    user_id = user["id"]
    subscription = user_subscriptions.get(user_id)
    has_billing_key = user_id in user_billing_keys

    return {
        "tier": subscription["tier"] if subscription else user.get("subscriptionTier", "free"),
        "expiresAt": subscription["expires_at"] if subscription else None,
        "hasBillingKey": has_billing_key,
        "subscription": subscription,
    }


@router.get("/usage")
async def get_usage(user: dict = Depends(get_current_user)):
    """이번 달 사용량 조회"""
    user_id = user["id"]
    tier = user.get("subscriptionTier", "free")
    plan = PLAN_PRICES.get(tier, PLAN_PRICES["free"])

    usage_count = user_usage.get(user_id, 0)
    limit = plan["included_queries"]

    # 다음 달 1일
    now = datetime.now()
    if now.month == 12:
        next_month = datetime(now.year + 1, 1, 1)
    else:
        next_month = datetime(now.year, now.month + 1, 1)

    return {
        "aiQuery": {
            "used": usage_count,
            "limit": limit,
        },
        "resetDate": next_month.isoformat(),
    }


@router.post("/register-card")
async def register_card(
    request: RegisterCardRequest,
    user: dict = Depends(get_current_user),
):
    """결제 카드 등록 (빌링키 발급)"""
    user_id = user["id"]
    customer_key = f"customer_{user_id}"

    try:
        result = await toss_service.issue_billing_key(
            customer_key=customer_key,
            card_number=request.cardNumber,
            expiration_year=request.expirationYear,
            expiration_month=request.expirationMonth,
            card_password=request.cardPassword,
            customer_identity_number=request.customerIdentityNumber,
        )

        # 빌링키 저장
        user_billing_keys[user_id] = {
            "billing_key": result["billing_key"],
            "card_number": result["card_number"],
            "card_company": result.get("card_company", ""),
        }

        return {
            "success": True,
            "message": "카드가 등록되었습니다.",
            "cardNumber": result["card_number"],
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/subscribe")
async def subscribe(
    request: SubscribeRequest,
    user: dict = Depends(get_current_user),
):
    """구독 결제 요청"""
    user_id = user["id"]

    if request.tier not in ["basic", "professional", "clinic"]:
        raise HTTPException(status_code=400, detail="유효하지 않은 요금제입니다")

    if user_id not in user_billing_keys:
        raise HTTPException(status_code=400, detail="등록된 결제 수단이 없습니다")

    billing_info = user_billing_keys[user_id]
    plan = PLAN_PRICES[request.tier]

    amount = plan["yearly"] if request.interval == "yearly" else plan["monthly"]
    order_id = f"order_{user_id}_{int(datetime.now().timestamp())}"
    interval_text = "연간" if request.interval == "yearly" else "월간"
    order_name = f"온고지신 AI {plan['name']} 플랜 ({interval_text})"

    try:
        result = await toss_service.pay_with_billing_key(
            billing_key=billing_info["billing_key"],
            customer_key=f"customer_{user_id}",
            amount=amount,
            order_id=order_id,
            order_name=order_name,
            customer_email=user.get("email"),
            customer_name=user.get("name"),
        )

        # 구독 정보 저장
        now = datetime.now()
        if request.interval == "yearly":
            expires_at = datetime(now.year + 1, now.month, now.day)
        else:
            if now.month == 12:
                expires_at = datetime(now.year + 1, 1, now.day)
            else:
                expires_at = datetime(now.year, now.month + 1, now.day)

        user_subscriptions[user_id] = {
            "id": order_id,
            "tier": request.tier,
            "status": "active",
            "billingInterval": request.interval,
            "currentPeriodStart": now.isoformat(),
            "currentPeriodEnd": expires_at.isoformat(),
            "expires_at": expires_at.isoformat(),
            "cancelAt": None,
            "paymentKey": result["payment_key"],
        }

        return {
            "success": True,
            "message": "구독이 시작되었습니다.",
            "paymentKey": result["payment_key"],
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cancel")
async def cancel_subscription(user: dict = Depends(get_current_user)):
    """구독 취소 (기간 종료 시 취소)"""
    user_id = user["id"]
    subscription = user_subscriptions.get(user_id)

    if not subscription or subscription["status"] != "active":
        raise HTTPException(status_code=404, detail="활성화된 구독이 없습니다")

    subscription["cancelAt"] = subscription["currentPeriodEnd"]

    return {
        "success": True,
        "message": "구독이 현재 기간 종료 시 취소됩니다.",
    }


@router.delete("/cancel-immediately")
async def cancel_subscription_immediately(user: dict = Depends(get_current_user)):
    """구독 즉시 취소"""
    user_id = user["id"]
    subscription = user_subscriptions.get(user_id)

    if not subscription or subscription["status"] != "active":
        raise HTTPException(status_code=404, detail="활성화된 구독이 없습니다")

    subscription["status"] = "canceled"
    subscription["canceledAt"] = datetime.now().isoformat()

    return {
        "success": True,
        "message": "구독이 즉시 취소되었습니다.",
    }


@router.post("/track-usage")
async def track_usage(user: dict = Depends(get_current_user)):
    """AI 쿼리 사용량 추적 (내부 호출용)"""
    user_id = user["id"]
    tier = user.get("subscriptionTier", "free")
    plan = PLAN_PRICES.get(tier, PLAN_PRICES["free"])

    current_usage = user_usage.get(user_id, 0)
    limit = plan["included_queries"]

    # 무제한이거나 한도 내
    if limit == -1 or current_usage < limit:
        user_usage[user_id] = current_usage + 1
        return {"allowed": True, "used": current_usage + 1, "limit": limit}

    # 초과 가능한 플랜
    if plan["can_exceed"]:
        user_usage[user_id] = current_usage + 1
        return {
            "allowed": True,
            "used": current_usage + 1,
            "limit": limit,
            "overage": True,
            "overagePrice": plan["overage_price"],
        }

    # 한도 초과 (무료 플랜)
    return {"allowed": False, "used": current_usage, "limit": limit}
