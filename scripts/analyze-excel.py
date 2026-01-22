import pandas as pd
import json

# 엑셀 파일 경로
file_path = r"G:\내 드라이브\developer\hanmed-cdss\치험례\word\#이종대_선생님_치험례 6.000건.밴드 (2001.0.00-2025.10.24).xlsx"

print("엑셀 파일 분석 중...")
print(f"파일 경로: {file_path}")

try:
    # 모든 시트 읽기
    xlsx = pd.ExcelFile(file_path)

    print(f"\n=== 워크북 정보 ===")
    print(f"시트 이름들: {xlsx.sheet_names}")

    for sheet_name in xlsx.sheet_names:
        print(f"\n=== 시트: {sheet_name} ===")
        df = pd.read_excel(xlsx, sheet_name=sheet_name)

        print(f"총 행 수: {len(df)}")
        print(f"총 컬럼 수: {len(df.columns)}")

        print(f"\n컬럼 목록:")
        for i, col in enumerate(df.columns):
            print(f"  {i+1}. {col}")

        print(f"\n샘플 데이터 (처음 3행):")
        print(df.head(3).to_string())

        print(f"\n각 컬럼 데이터 타입:")
        print(df.dtypes)

except Exception as e:
    print(f"에러 발생: {e}")
