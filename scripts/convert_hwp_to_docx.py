"""
HWP 파일을 DOCX로 변환하는 스크립트
한컴오피스 자동화(COM) 사용
"""

import os
import sys
import time
from pathlib import Path

try:
    import win32com.client as win32
except ImportError:
    print("pywin32가 필요합니다: pip install pywin32")
    sys.exit(1)

# 변환할 HWP 파일 목록
HWP_FILES = [
    r"G:\내 드라이브\developer\hanmed-cdss\치험례\word1\사상 소양인 치험례 모음(081024).hwp",
    r"G:\내 드라이브\developer\hanmed-cdss\치험례\word1\사상 소음인 치험례 모음(081024).hwp",
    r"G:\내 드라이브\developer\hanmed-cdss\치험례\word1\사상 태양인 치험례 모음081025.hwp",
    r"G:\내 드라이브\developer\hanmed-cdss\치험례\word1\사상 태음인 치험례 모음(081024).hwp",
    r"G:\내 드라이브\developer\hanmed-cdss\치험례\word1\최경구. 삼례. 연수당. 흑색종..hwp",
    r"G:\내 드라이브\developer\hanmed-cdss\치험례\word1\1차본1.고령자채록모음집.22.5.12.이종대.hwp",
]

# 출력 폴더
OUTPUT_DIR = r"C:\temp_docx"


def convert_hwp_to_docx(hwp_path, output_dir):
    """HWP 파일을 DOCX로 변환"""
    hwp_path = Path(hwp_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    docx_path = output_dir / (hwp_path.stem + ".docx")

    print(f"\n변환 중: {hwp_path.name}")
    print(f"  출력: {docx_path}")

    try:
        # 한글 COM 객체 생성
        hwp = win32.gencache.EnsureDispatch("HWPFrame.HwpObject")

        # 백그라운드 모드 (창 숨김)
        hwp.XHwpWindows.Item(0).Visible = False

        # 파일 열기
        hwp.Open(str(hwp_path), "HWP", "forceopen:true")

        # DOCX로 저장
        # SaveAs 형식: "DOCX" = MS Word 2007+ 형식
        hwp.SaveAs(str(docx_path), "DOCX")

        print(f"  ✓ 변환 완료!")

        # 파일 닫기
        hwp.Clear(1)

        return True

    except Exception as e:
        print(f"  ⚠ 변환 오류: {e}")
        return False

    finally:
        try:
            hwp.Quit()
        except:
            pass


def convert_hwp_to_docx_alternative(hwp_path, output_dir):
    """HWP를 DOCX로 변환 (HWPFrame.HwpObject 사용)"""
    hwp_path = Path(hwp_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    docx_path = output_dir / (hwp_path.stem + ".docx")

    print(f"\n변환 중: {hwp_path.name}")

    hwp = None
    try:
        # 한글 애플리케이션 실행 (HWPFrame.HwpObject 사용)
        hwp = win32.Dispatch("HWPFrame.HwpObject")

        # 보안 모듈 등록 (스크립트 실행 허용)
        try:
            hwp.RegisterModule("FilePathCheckDLL", "SecurityModule")
        except:
            pass

        # 파일 열기 옵션
        hwp.Open(str(hwp_path), "HWP", "forceopen:true")

        # DOCX로 저장
        # SaveAs 형식: "DOCX", "DOC", "HWP", "HTML", "TXT" 등
        hwp.SaveAs(str(docx_path), "DOCX")

        print(f"  ✓ 변환 완료: {docx_path.name}")

        return True

    except Exception as e:
        print(f"  ⚠ 오류: {e}")
        return False

    finally:
        if hwp:
            try:
                hwp.Clear(1)  # 문서 닫기
                hwp.Quit()
            except:
                pass


def main():
    print("=" * 60)
    print("  HWP → DOCX 변환기 (한컴오피스 자동화)")
    print("=" * 60)

    output_dir = Path(OUTPUT_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)

    success_count = 0
    fail_count = 0

    for hwp_file in HWP_FILES:
        hwp_path = Path(hwp_file)

        if not hwp_path.exists():
            print(f"\n⚠ 파일 없음: {hwp_path.name}")
            fail_count += 1
            continue

        # 변환 시도
        if convert_hwp_to_docx_alternative(hwp_path, output_dir):
            success_count += 1
        else:
            fail_count += 1

        # 약간의 딜레이
        time.sleep(1)

    print("\n" + "=" * 60)
    print(f"  변환 완료!")
    print(f"  성공: {success_count}개")
    print(f"  실패: {fail_count}개")
    print(f"  출력 폴더: {OUTPUT_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    main()
