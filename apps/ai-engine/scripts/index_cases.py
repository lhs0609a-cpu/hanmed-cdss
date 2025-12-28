"""
Pinecone 인덱싱 스크립트
추출된 치험례 데이터를 OpenAI 임베딩으로 변환하여 Pinecone에 업로드
"""

import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional
import time
from dataclasses import dataclass

# 프로젝트 루트를 path에 추가
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "apps" / "ai-engine"))

from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / ".env")

# OpenAI & Pinecone
from openai import OpenAI
from pinecone import Pinecone

# 설정
EMBEDDING_MODEL = "text-embedding-3-large"
EMBEDDING_DIMENSIONS = 3072
BATCH_SIZE = 100  # Pinecone 배치 크기
NAMESPACE = "clinical_cases"

# 데이터 경로
DATA_DIR = PROJECT_ROOT / "apps" / "ai-engine" / "data"
CASES_FILE = DATA_DIR / "extracted_cases.json"


def load_cases() -> List[Dict]:
    """추출된 케이스 데이터 로드"""
    if not CASES_FILE.exists():
        print(f"Error: {CASES_FILE} 파일이 없습니다.")
        print("먼저 extract_cases.py를 실행하세요.")
        sys.exit(1)

    with open(CASES_FILE, 'r', encoding='utf-8') as f:
        cases = json.load(f)

    print(f"로드된 케이스: {len(cases)}개")
    return cases


def create_embedding_text(case: Dict) -> str:
    """케이스 데이터를 임베딩용 텍스트로 변환"""
    parts = []

    # 제목
    if case.get('title'):
        parts.append(f"제목: {case['title']}")

    # 주소증
    if case.get('chief_complaint'):
        parts.append(f"주소증: {case['chief_complaint']}")

    # 증상
    symptoms = case.get('symptoms', [])
    if symptoms:
        parts.append(f"증상: {', '.join(symptoms)}")

    # 진단
    if case.get('diagnosis'):
        parts.append(f"진단: {case['diagnosis']}")

    # 처방
    if case.get('treatment_formula'):
        parts.append(f"처방: {case['treatment_formula']}")

    # 결과
    if case.get('result'):
        # 결과가 너무 길면 자르기
        result = case['result'][:500] if len(case.get('result', '')) > 500 else case.get('result', '')
        parts.append(f"결과: {result}")

    return '\n'.join(parts)


def create_metadata(case: Dict) -> Dict:
    """Pinecone 메타데이터 생성"""
    return {
        "type": "clinical_case",
        "case_id": case.get('id', ''),
        "formula_id": case.get('formula_id', ''),
        "formula_name": case.get('formula_name', ''),
        "formula_hanja": case.get('formula_hanja', ''),
        "title": case.get('title', '')[:200],  # 메타데이터 크기 제한
        "chief_complaint": case.get('chief_complaint', '')[:200],
        "symptoms": case.get('symptoms', [])[:10],  # 최대 10개
        "diagnosis": case.get('diagnosis', '')[:200],
        "patient_age": case.get('patient_age') or 0,
        "patient_gender": case.get('patient_gender', ''),
        "patient_constitution": case.get('patient_constitution', ''),
        "treatment_formula": case.get('treatment_formula', ''),
        "data_source": case.get('data_source', ''),
        "symptom_keywords": case.get('symptom_keywords', [])[:10],
    }


def batch_create_embeddings(
    client: OpenAI,
    texts: List[str],
    batch_size: int = 20
) -> List[List[float]]:
    """배치로 임베딩 생성"""
    all_embeddings = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        print(f"  임베딩 생성: {i + 1} ~ {min(i + batch_size, len(texts))} / {len(texts)}")

        try:
            response = client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=batch
            )
            embeddings = [item.embedding for item in response.data]
            all_embeddings.extend(embeddings)

            # API 속도 제한 대응
            time.sleep(0.5)

        except Exception as e:
            print(f"  Error creating embeddings: {e}")
            # 실패한 배치는 빈 벡터로 채움
            all_embeddings.extend([[0.0] * EMBEDDING_DIMENSIONS] * len(batch))

    return all_embeddings


def upsert_to_pinecone(
    index,
    cases: List[Dict],
    embeddings: List[List[float]],
    batch_size: int = BATCH_SIZE
):
    """Pinecone에 벡터 업로드"""
    vectors = []

    for case, embedding in zip(cases, embeddings):
        vector = {
            "id": case['id'],
            "values": embedding,
            "metadata": create_metadata(case)
        }
        vectors.append(vector)

    # 배치 업로드
    total = len(vectors)
    for i in range(0, total, batch_size):
        batch = vectors[i:i + batch_size]
        print(f"  업로드: {i + 1} ~ {min(i + batch_size, total)} / {total}")

        try:
            index.upsert(vectors=batch, namespace=NAMESPACE)
            time.sleep(0.2)
        except Exception as e:
            print(f"  Error upserting: {e}")


def main():
    """메인 실행 함수"""
    print("=" * 60)
    print("Pinecone 인덱싱 스크립트")
    print("=" * 60)

    # 환경 변수 확인
    openai_key = os.getenv("OPENAI_API_KEY")
    pinecone_key = os.getenv("PINECONE_API_KEY")
    pinecone_index = os.getenv("PINECONE_INDEX_NAME", "hanmed-cases")

    if not openai_key:
        print("Error: OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.")
        print("\n.env 파일에 다음을 추가하세요:")
        print("OPENAI_API_KEY=sk-...")
        sys.exit(1)

    if not pinecone_key:
        print("Error: PINECONE_API_KEY 환경 변수가 설정되지 않았습니다.")
        print("\n.env 파일에 다음을 추가하세요:")
        print("PINECONE_API_KEY=...")
        sys.exit(1)

    print(f"\n설정:")
    print(f"  - 임베딩 모델: {EMBEDDING_MODEL}")
    print(f"  - Pinecone 인덱스: {pinecone_index}")
    print(f"  - 네임스페이스: {NAMESPACE}")

    # 케이스 로드
    print("\n1. 케이스 데이터 로드...")
    cases = load_cases()

    # OpenAI 클라이언트 초기화
    print("\n2. OpenAI 클라이언트 초기화...")
    openai_client = OpenAI(api_key=openai_key)

    # Pinecone 초기화
    print("\n3. Pinecone 인덱스 연결...")
    pc = Pinecone(api_key=pinecone_key)

    try:
        index = pc.Index(pinecone_index)
        stats = index.describe_index_stats()
        print(f"  현재 벡터 수: {stats.total_vector_count}")
    except Exception as e:
        print(f"  Error: Pinecone 인덱스 연결 실패 - {e}")
        print(f"\n  인덱스 '{pinecone_index}'가 없다면 Pinecone 콘솔에서 생성하세요.")
        print(f"  - Dimensions: {EMBEDDING_DIMENSIONS}")
        print(f"  - Metric: cosine")
        sys.exit(1)

    # 임베딩 텍스트 생성
    print("\n4. 임베딩 텍스트 생성...")
    texts = [create_embedding_text(case) for case in cases]
    print(f"  생성된 텍스트: {len(texts)}개")

    # 임베딩 생성
    print("\n5. 임베딩 생성 (시간이 걸릴 수 있습니다)...")
    embeddings = batch_create_embeddings(openai_client, texts)
    print(f"  생성된 임베딩: {len(embeddings)}개")

    # Pinecone 업로드
    print("\n6. Pinecone에 업로드...")
    upsert_to_pinecone(index, cases, embeddings)

    # 완료 확인
    print("\n7. 완료 확인...")
    stats = index.describe_index_stats()
    print(f"  총 벡터 수: {stats.total_vector_count}")

    if NAMESPACE in stats.namespaces:
        ns_stats = stats.namespaces[NAMESPACE]
        print(f"  '{NAMESPACE}' 네임스페이스 벡터 수: {ns_stats.vector_count}")

    print("\n" + "=" * 60)
    print("인덱싱 완료!")
    print("=" * 60)


def test_search():
    """테스트 검색 (인덱싱 후 확인용)"""
    print("\n테스트 검색...")

    openai_key = os.getenv("OPENAI_API_KEY")
    pinecone_key = os.getenv("PINECONE_API_KEY")
    pinecone_index = os.getenv("PINECONE_INDEX_NAME", "hanmed-cases")

    if not openai_key or not pinecone_key:
        print("API 키가 설정되지 않았습니다.")
        return

    # OpenAI 임베딩
    client = OpenAI(api_key=openai_key)
    query = "두통과 어지러움이 있는 60세 남성"

    print(f"  쿼리: {query}")

    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=query
    )
    query_embedding = response.data[0].embedding

    # Pinecone 검색
    pc = Pinecone(api_key=pinecone_key)
    index = pc.Index(pinecone_index)

    results = index.query(
        vector=query_embedding,
        top_k=5,
        namespace=NAMESPACE,
        include_metadata=True
    )

    print(f"\n  검색 결과: {len(results.matches)}건")
    for i, match in enumerate(results.matches):
        print(f"\n  #{i+1} (유사도: {match.score:.4f})")
        print(f"    제목: {match.metadata.get('title', 'N/A')}")
        print(f"    처방: {match.metadata.get('formula_name', 'N/A')}")
        print(f"    주소증: {match.metadata.get('chief_complaint', 'N/A')}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Pinecone 인덱싱')
    parser.add_argument('--test', action='store_true', help='테스트 검색만 실행')
    args = parser.parse_args()

    if args.test:
        test_search()
    else:
        main()
