import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SubscriptionTermsPage() {
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
            <CardTitle className="text-2xl">정기결제 이용약관</CardTitle>
            <p className="text-sm text-muted-foreground">
              시행일: 2024년 1월 1일 | 최종 수정: 2024년 1월 1일
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <Alert className="mb-6">
              <Info className="h-4 w-4" />
              <AlertDescription>
                정기결제(자동결제) 서비스 이용 시 본 약관에 동의한 것으로 간주됩니다.
              </AlertDescription>
            </Alert>

            <h2 className="text-lg font-semibold mt-6 mb-3">제1조 (목적)</h2>
            <p className="text-gray-700 leading-relaxed">
              본 약관은 주식회사 온고지신(이하 "회사")이 제공하는 정기결제(자동결제) 서비스의
              이용조건 및 절차, 회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-3">제2조 (정의)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li><strong>"정기결제"</strong>란 회원이 등록한 결제수단으로 일정 주기(월/년)마다 자동으로 결제되는 서비스를 의미합니다.</li>
              <li><strong>"빌링키"</strong>란 정기결제를 위해 카드사로부터 발급받은 결제 인증 키를 의미합니다.</li>
              <li><strong>"결제일"</strong>이란 정기결제가 실행되는 날짜를 의미합니다.</li>
              <li><strong>"구독기간"</strong>이란 정기결제로 이용 가능한 서비스 기간을 의미합니다.</li>
              <li><strong>"초과사용료"</strong>란 기본 제공량을 초과하여 사용한 경우 부과되는 요금을 의미합니다.</li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제3조 (정기결제 신청)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>정기결제를 신청하려면 다음 정보를 제공해야 합니다:
                <ul className="list-disc list-inside ml-6 mt-2">
                  <li>카드번호</li>
                  <li>유효기간</li>
                  <li>생년월일 또는 사업자등록번호</li>
                  <li>카드 비밀번호 앞 2자리</li>
                </ul>
              </li>
              <li>회사는 본인 확인을 위해 추가 정보를 요청할 수 있습니다.</li>
              <li>카드 정보는 토스페이먼츠를 통해 안전하게 암호화되어 저장됩니다.</li>
              <li>회사는 카드 정보(전체 카드번호, 비밀번호)를 직접 저장하지 않습니다.</li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제4조 (결제 주기 및 결제일)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>
                결제 주기는 다음과 같습니다:
                <ul className="list-disc list-inside ml-6 mt-2">
                  <li>월간 구독: 매월 결제</li>
                  <li>연간 구독: 매년 결제</li>
                </ul>
              </li>
              <li>최초 결제일을 기준으로 매 결제주기마다 동일한 날짜에 결제됩니다.</li>
              <li>해당 월에 결제일이 없는 경우(예: 31일) 해당 월의 마지막 날에 결제됩니다.</li>
              <li>결제는 결제일 오전 9시(한국시간)에 자동으로 실행됩니다.</li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제5조 (요금 체계)</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300 mt-3">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">요금제</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">월 기본료</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">포함 건수</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">초과 단가</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">무료</td>
                    <td className="border border-gray-300 px-4 py-2">0원</td>
                    <td className="border border-gray-300 px-4 py-2">50건/월</td>
                    <td className="border border-gray-300 px-4 py-2">-</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Basic</td>
                    <td className="border border-gray-300 px-4 py-2">39,000원</td>
                    <td className="border border-gray-300 px-4 py-2">500건/월</td>
                    <td className="border border-gray-300 px-4 py-2">100원/건</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Professional</td>
                    <td className="border border-gray-300 px-4 py-2">79,000원</td>
                    <td className="border border-gray-300 px-4 py-2">2,000건/월</td>
                    <td className="border border-gray-300 px-4 py-2">80원/건</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Clinic</td>
                    <td className="border border-gray-300 px-4 py-2">199,000원</td>
                    <td className="border border-gray-300 px-4 py-2">무제한</td>
                    <td className="border border-gray-300 px-4 py-2">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-500 mt-2">* VAT 별도</p>

            <h2 className="text-lg font-semibold mt-6 mb-3">제6조 (초과사용료 정산)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>초과사용료는 다음 결제일에 기본료와 함께 청구됩니다.</li>
              <li>초과사용료 계산: (사용건수 - 포함건수) × 초과단가</li>
              <li>사용량은 실시간으로 서비스 내에서 확인할 수 있습니다.</li>
              <li>월말 기준으로 사용량이 리셋되며, 미사용분은 이월되지 않습니다.</li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제7조 (결제 실패 처리)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>
                결제 실패 시 다음과 같이 처리됩니다:
                <ul className="list-disc list-inside ml-6 mt-2">
                  <li>1차 시도: 결제일 오전 9시</li>
                  <li>2차 시도: 결제일 +1일 오전 9시</li>
                  <li>3차 시도: 결제일 +3일 오전 9시</li>
                </ul>
              </li>
              <li>3회 연속 결제 실패 시:
                <ul className="list-disc list-inside ml-6 mt-2">
                  <li>서비스 이용이 즉시 중단됩니다.</li>
                  <li>등록된 연락처로 결제 실패 안내가 발송됩니다.</li>
                  <li>새로운 결제수단 등록 후 서비스를 재개할 수 있습니다.</li>
                </ul>
              </li>
              <li>미결제 금액이 있는 경우, 서비스 재개 시 미결제 금액이 먼저 청구됩니다.</li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제8조 (결제수단 변경)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>결제수단은 서비스 내 [설정 → 결제 관리]에서 언제든지 변경할 수 있습니다.</li>
              <li>변경된 결제수단은 다음 결제일부터 적용됩니다.</li>
              <li>기존 결제수단이 만료되는 경우, 새로운 결제수단을 등록해야 합니다.</li>
              <li>결제수단 변경 시 본인 확인을 위한 인증이 필요합니다.</li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제9조 (요금제 변경)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>
                <strong>업그레이드</strong>: 즉시 적용되며, 일할 계산된 차액이 청구됩니다.
              </li>
              <li>
                <strong>다운그레이드</strong>: 현재 결제기간 종료 후 다음 결제일부터 적용됩니다.
              </li>
              <li>요금제 변경은 서비스 내 [설정 → 구독 관리]에서 신청할 수 있습니다.</li>
              <li>연간 결제에서 월간 결제로 변경 시, 남은 기간에 대한 환불 후 월간 결제가 시작됩니다.</li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제10조 (정기결제 해지)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>정기결제는 다음 결제일 전까지 언제든지 해지할 수 있습니다.</li>
              <li>해지 방법:
                <ul className="list-disc list-inside ml-6 mt-2">
                  <li>서비스 내 [설정 → 구독 관리 → 구독 해지]</li>
                  <li>고객센터 이메일: support@ongojisin.kr</li>
                  <li>고객센터 전화: 02-1234-5678</li>
                </ul>
              </li>
              <li>해지 시 이미 결제된 기간은 계속 이용 가능합니다.</li>
              <li>해지 후 재구독 시 기존 데이터는 30일간 보관 후 삭제됩니다.</li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제11조 (결제 내역 및 영수증)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>모든 결제 내역은 서비스 내 [설정 → 결제 내역]에서 확인할 수 있습니다.</li>
              <li>세금계산서/현금영수증은 결제 완료 후 요청 시 발행됩니다.</li>
              <li>결제 완료 시 등록된 이메일로 결제 완료 알림이 발송됩니다.</li>
              <li>영수증은 토스페이먼츠를 통해 전자 발급됩니다.</li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제12조 (가격 변경)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>서비스 요금 변경 시 최소 30일 전에 회원에게 고지합니다.</li>
              <li>요금 인상 시 기존 구독자는 다음 결제일까지 기존 요금이 적용됩니다.</li>
              <li>요금 인상에 동의하지 않는 경우, 결제일 전까지 해지할 수 있습니다.</li>
              <li>연간 구독의 경우, 구독 갱신 시점까지 기존 요금이 유지됩니다.</li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제13조 (개인정보 보호)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>결제 정보는 PCI-DSS 인증을 받은 토스페이먼츠를 통해 처리됩니다.</li>
              <li>회사는 마스킹된 카드번호(끝 4자리)만 저장합니다.</li>
              <li>결제 관련 개인정보는 전자상거래법에 따라 5년간 보관됩니다.</li>
            </ol>

            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">정기결제 전 확인사항</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>[ ] 결제 금액 및 결제 주기를 확인했습니다.</li>
                <li>[ ] 자동 결제에 동의합니다.</li>
                <li>[ ] 해지 방법을 확인했습니다.</li>
                <li>[ ] 환불 정책을 확인했습니다.</li>
              </ul>
            </div>

            <h2 className="text-lg font-semibold mt-6 mb-3">부칙</h2>
            <p className="text-gray-700">본 약관은 2024년 1월 1일부터 시행합니다.</p>

            <div className="mt-8 p-4 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>주식회사 온고지신</strong><br />
                서울특별시 강남구 테헤란로 123<br />
                대표: 홍길동<br />
                사업자등록번호: 123-45-67890<br />
                통신판매업신고: 제2024-서울강남-0000호<br />
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
