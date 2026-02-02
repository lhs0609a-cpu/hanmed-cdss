import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function RefundPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          돌아가기
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">환불 정책</CardTitle>
            <p className="text-sm text-muted-foreground">
              시행일: 2024년 1월 1일 | 최종 수정: 2024년 1월 1일
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                본 환불 정책은 전자상거래 등에서의 소비자보호에 관한 법률에 따라 작성되었습니다.
              </AlertDescription>
            </Alert>

            <h2 className="text-lg font-semibold mt-6 mb-3">제1조 (적용 범위)</h2>
            <p className="text-gray-700 leading-relaxed">
              본 환불 정책은 주식회사 온고지신(이하 "회사")이 제공하는 모든 유료 서비스에 적용됩니다.
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-3">제2조 (환불 가능 기간)</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300 mt-3">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">구분</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">환불 가능 기간</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">환불 금액</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">결제 후 7일 이내</td>
                    <td className="border border-gray-300 px-4 py-2">서비스 미이용 시</td>
                    <td className="border border-gray-300 px-4 py-2 font-semibold text-green-600">전액 환불</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">결제 후 7일 이내</td>
                    <td className="border border-gray-300 px-4 py-2">서비스 이용 시</td>
                    <td className="border border-gray-300 px-4 py-2">일할 계산 환불</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">결제 후 7일 초과</td>
                    <td className="border border-gray-300 px-4 py-2">-</td>
                    <td className="border border-gray-300 px-4 py-2 text-red-600">환불 불가</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 className="text-lg font-semibold mt-6 mb-3">제3조 (환불 금액 계산)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>
                <strong>기본 구독료 환불</strong>
                <div className="ml-6 mt-2 p-4 bg-blue-50 rounded-lg">
                  <p className="font-mono text-sm">
                    환불액 = 결제금액 × (잔여일수 / 결제기간 총일수)
                  </p>
                  <p className="text-sm mt-2 text-gray-600">
                    예시: 월 99,000원 결제, 10일 사용 후 환불 요청<br />
                    환불액 = 99,000 × (20/30) = 66,000원
                  </p>
                </div>
              </li>
              <li className="mt-4">
                <strong>초과 사용료</strong>
                <p className="ml-6 mt-1">이미 발생한 초과 사용료는 환불 대상에서 제외됩니다.</p>
              </li>
              <li className="mt-4">
                <strong>결제 수수료</strong>
                <p className="ml-6 mt-1">결제 시 발생한 PG 수수료는 환불 금액에서 공제될 수 있습니다.</p>
              </li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제4조 (환불 제외 사항)</h2>
            <p className="text-gray-700 leading-relaxed">
              다음의 경우에는 환불이 제한됩니다:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mt-3">
              <li>결제일로부터 7일이 경과한 경우</li>
              <li>서비스 이용 후 청약철회 기간(7일)이 지난 경우</li>
              <li>회원의 귀책사유로 서비스 이용이 정지된 경우</li>
              <li>이벤트, 프로모션으로 할인 적용된 결제의 경우 (별도 고지된 정책 적용)</li>
              <li>서비스 약관을 위반하여 이용이 제한된 경우</li>
              <li>법적 분쟁 중인 경우</li>
            </ul>

            <h2 className="text-lg font-semibold mt-6 mb-3">제5조 (환불 절차)</h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700">
              <li>
                <strong>환불 신청</strong>
                <ul className="list-disc list-inside ml-6 mt-2">
                  <li>서비스 내 [설정 → 구독 관리 → 환불 신청]</li>
                  <li>고객센터 이메일: support@ongojisin.kr</li>
                  <li>고객센터 전화: 02-1234-5678 (평일 09:00~18:00)</li>
                </ul>
              </li>
              <li>
                <strong>환불 심사</strong>
                <p className="ml-6 mt-1">신청일로부터 영업일 기준 3일 이내 심사 완료</p>
              </li>
              <li>
                <strong>환불 처리</strong>
                <p className="ml-6 mt-1">심사 완료 후 영업일 기준 5~7일 이내 환불 처리</p>
              </li>
              <li>
                <strong>환불 완료</strong>
                <p className="ml-6 mt-1">결제 수단에 따라 실제 입금까지 추가 소요 시간 발생 가능</p>
              </li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제6조 (환불 수단)</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300 mt-3">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">결제 수단</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">환불 방법</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">소요 기간</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">신용카드</td>
                    <td className="border border-gray-300 px-4 py-2">카드 결제 취소</td>
                    <td className="border border-gray-300 px-4 py-2">3~5 영업일</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">체크카드</td>
                    <td className="border border-gray-300 px-4 py-2">계좌 입금</td>
                    <td className="border border-gray-300 px-4 py-2">5~7 영업일</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">계좌이체</td>
                    <td className="border border-gray-300 px-4 py-2">원 결제 계좌 입금</td>
                    <td className="border border-gray-300 px-4 py-2">3~5 영업일</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 className="text-lg font-semibold mt-6 mb-3">제7조 (정기결제 해지)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>정기결제는 다음 결제일 전까지 언제든지 해지할 수 있습니다.</li>
              <li>해지 시 이미 결제된 기간은 계속 이용 가능하며, 다음 결제일부터 결제가 중단됩니다.</li>
              <li>해지 후에도 결제기간 만료일까지는 유료 서비스를 정상 이용할 수 있습니다.</li>
              <li>정기결제 해지와 환불은 별도의 절차입니다. 환불을 원하시면 별도로 환불 신청이 필요합니다.</li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제8조 (특수한 상황에서의 환불)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>
                <strong>서비스 장애</strong>
                <p className="ml-6 mt-1">회사 귀책사유로 연속 24시간 이상 서비스 이용이 불가능한 경우, 해당 기간에 대한 이용료를 일할 계산하여 환불 또는 이용기간 연장</p>
              </li>
              <li>
                <strong>서비스 종료</strong>
                <p className="ml-6 mt-1">회사의 서비스 종료 시 잔여 이용기간에 대해 전액 환불</p>
              </li>
              <li>
                <strong>부정 결제</strong>
                <p className="ml-6 mt-1">타인 명의 도용 등 부정 결제 확인 시 결제 취소 및 법적 조치</p>
              </li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제9조 (분쟁 해결)</h2>
            <p className="text-gray-700 leading-relaxed">
              환불 관련 분쟁 발생 시 다음의 절차를 통해 해결합니다:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 mt-3">
              <li>고객센터를 통한 1차 상담 및 조정</li>
              <li>한국소비자원(1372) 피해구제 신청</li>
              <li>전자상거래분쟁조정위원회 조정 신청</li>
            </ol>

            <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="font-semibold text-amber-800 mb-2">청약철회권 안내</h3>
              <p className="text-sm text-amber-700">
                전자상거래 등에서의 소비자보호에 관한 법률 제17조에 따라, 소비자는 계약 내용에 관한
                서면을 받은 날부터 7일 이내에 청약철회를 할 수 있습니다. 다만, 서비스 이용이 시작된
                경우에는 일부 금액이 공제될 수 있습니다.
              </p>
            </div>

            <h2 className="text-lg font-semibold mt-6 mb-3">부칙</h2>
            <p className="text-gray-700">본 환불 정책은 2024년 1월 1일부터 시행합니다.</p>

            <div className="mt-8 p-4 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>주식회사 온고지신</strong><br />
                서울특별시 강남구 테헤란로 123<br />
                대표: 홍길동<br />
                사업자등록번호: 123-45-67890<br />
                고객센터: 02-1234-5678<br />
                이메일: support@ongojisin.kr
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
