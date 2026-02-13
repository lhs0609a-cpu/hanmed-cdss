#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
서비스 화면 스크린샷 캡처 스크립트
"""

from playwright.sync_api import sync_playwright
import os
import time

BASE_URL = "https://hanmed-cdss.vercel.app"
SCREENSHOT_DIR = "G:/내 드라이브/developer/hanmed-cdss/docs/screenshots"

# 캡처할 페이지 목록
PAGES = [
    {"name": "01_landing", "url": "/", "need_login": False},
    {"name": "02_login", "url": "/login", "need_login": False},
    {"name": "03_dashboard", "url": "/dashboard", "need_login": True},
    {"name": "04_unified_search", "url": "/dashboard/unified-search", "need_login": True},
    {"name": "05_consultation", "url": "/dashboard/consultation", "need_login": True},
    {"name": "06_herbs", "url": "/dashboard/herbs", "need_login": True},
    {"name": "07_patients", "url": "/dashboard/patients", "need_login": True},
    {"name": "08_constitution", "url": "/dashboard/constitution", "need_login": True},
    {"name": "09_interactions", "url": "/dashboard/interactions", "need_login": True},
    {"name": "10_cases", "url": "/dashboard/cases", "need_login": True},
]

def hide_all_popups(page):
    """모든 팝업/모달 제거"""
    page.evaluate("""
        () => {
            // z-index가 높은 요소들 제거
            document.querySelectorAll('[class*="z-50"], [class*="z-["]').forEach(el => {
                if (el.querySelector('[role="dialog"]') || el.classList.contains('fixed')) {
                    el.remove();
                }
            });
            // 모달/다이얼로그 제거
            document.querySelectorAll('[role="dialog"]').forEach(el => el.remove());
            // 오버레이 제거
            document.querySelectorAll('.fixed.inset-0').forEach(el => {
                if (el.style.backgroundColor || el.classList.contains('bg-black') || el.className.includes('bg-black')) {
                    el.remove();
                }
            });
            // backdrop 제거
            document.querySelectorAll('[class*="backdrop"], [class*="overlay"]').forEach(el => el.remove());
        }
    """)

def capture_screenshots():
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            locale="ko-KR"
        )
        page = context.new_page()

        logged_in = False

        for item in PAGES:
            try:
                print(f"캡처 중: {item['name']} - {item['url']}")

                # 로그인 필요한 페이지 처리
                if item["need_login"] and not logged_in:
                    print("  데모 계정으로 로그인 시도...")
                    page.goto(BASE_URL + "/login", wait_until="networkidle", timeout=30000)
                    time.sleep(2)

                    # 데모 버튼 클릭
                    demo_btn = page.locator('button:has-text("데모")')
                    if demo_btn.count() > 0:
                        demo_btn.first.click()
                        time.sleep(5)
                        logged_in = True
                        print("  데모 계정 로그인 완료")

                # 페이지 이동
                page.goto(BASE_URL + item["url"], wait_until="networkidle", timeout=30000)
                time.sleep(3)

                # 팝업 여러 번 제거 시도
                for _ in range(3):
                    hide_all_popups(page)
                    time.sleep(0.5)

                # 스크린샷 저장
                screenshot_path = os.path.join(SCREENSHOT_DIR, f"{item['name']}.png")
                page.screenshot(path=screenshot_path, full_page=False)
                print(f"  저장: {screenshot_path}")

            except Exception as e:
                print(f"  오류: {e}")
                try:
                    hide_all_popups(page)
                    screenshot_path = os.path.join(SCREENSHOT_DIR, f"{item['name']}.png")
                    page.screenshot(path=screenshot_path)
                    print(f"  저장 (오류 후): {screenshot_path}")
                except:
                    pass

        browser.close()

    print("\n스크린샷 캡처 완료!")
    return SCREENSHOT_DIR

if __name__ == "__main__":
    capture_screenshots()
