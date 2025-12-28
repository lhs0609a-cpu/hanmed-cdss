"""응답 래퍼 미들웨어"""

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from datetime import datetime
import json


class ResponseWrapperMiddleware(BaseHTTPMiddleware):
    """API 응답을 { success: true, data: ..., timestamp: ... } 형식으로 감싸는 미들웨어"""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # JSON 응답만 래핑
        if response.headers.get("content-type", "").startswith("application/json"):
            # 응답 본문 읽기
            body = b""
            async for chunk in response.body_iterator:
                body += chunk

            try:
                original_data = json.loads(body.decode())

                # 이미 래핑된 응답이면 그대로 반환
                if isinstance(original_data, dict) and "success" in original_data:
                    return JSONResponse(
                        content=original_data,
                        status_code=response.status_code,
                        headers=dict(response.headers),
                    )

                # 에러 응답 (4xx, 5xx)
                if response.status_code >= 400:
                    wrapped_data = {
                        "success": False,
                        "error": original_data.get("detail", original_data),
                        "timestamp": datetime.utcnow().isoformat(),
                    }
                else:
                    # 성공 응답 래핑
                    wrapped_data = {
                        "success": True,
                        "data": original_data,
                        "timestamp": datetime.utcnow().isoformat(),
                    }

                return JSONResponse(
                    content=wrapped_data,
                    status_code=response.status_code,
                )
            except (json.JSONDecodeError, UnicodeDecodeError):
                # JSON 파싱 실패 시 원본 반환
                return response

        return response
