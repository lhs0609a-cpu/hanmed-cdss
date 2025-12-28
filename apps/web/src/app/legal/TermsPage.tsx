import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsPage() {
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
            <CardTitle className="text-2xl">서비스 이용약관</CardTitle>
            <p className="text-sm text-muted-foreground">
              시행일: 2024년 1월 1일 | 최종 수정: 2024년 1월 1일
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <h2 className="text-lg font-semibold mt-6 mb-3">제1조 (목적)</h2>
            <p className="text-gray-700 leading-relaxed">
              본 약관은 주식회사 온고지신(이하 "회사")이 제공하는 한의학 임상의사결정지원시스템
              "온고지신" 서비스(이하 "서비스")의 이용과 관련하여 회사와 회원 간의 권리, 의무 및
              책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-3">제2조 (정의)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>"서비스"란 회사가 제공하는 한의학 CDSS 플랫폼 및 관련 부가서비스를 의미합니다.</li>
              <li>"회원"이란 본 약관에 동의하고 서비스 이용계약을 체결한 자를 의미합니다.</li>
              <li>"유료서비스"란 회사가 유료로 제공하는 각종 서비스를 의미합니다.</li>
              <li>"정기결제"란 회원이 지정한 결제수단으로 매월 자동으로 결제되는 방식을 의미합니다.</li>
              <li>"빌링키"란 정기결제를 위해 카드사로부터 발급받은 결제 인증키를 의미합니다.</li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제3조 (약관의 효력 및 변경)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.</li>
              <li>회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있습니다.</li>
              <li>약관 변경 시 적용일자 및 변경사유를 명시하여 7일 전에 공지합니다. 단, 회원에게 불리한 변경의 경우 30일 전에 공지합니다.</li>
              <li>회원이 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제4조 (서비스의 제공)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>
                회사는 다음의 서비스를 제공합니다:
                <ul className="list-disc list-inside ml-4 mt-2">
                  <li>AI 기반 처방 추천 서비스</li>
                  <li>약물-한약 상호작용 확인 서비스</li>
                  <li>한의학 데이터베이스 검색 서비스</li>
                  <li>환자 관리 및 차트 기록 서비스</li>
                  <li>기타 회사가 정하는 서비스</li>
                </ul>
              </li>
              <li>서비스는 연중무휴, 1일 24시간 제공을 원칙으로 합니다.</li>
              <li>회사는 시스템 점검, 장애 복구 등의 사유로 서비스를 일시 중단할 수 있습니다.</li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제5조 (서비스 이용의 제한)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>본 서비스는 한의사, 한의과대학생, 한의학 연구자 등 한의학 전문가를 대상으로 합니다.</li>
              <li>서비스에서 제공하는 정보는 참고용이며, 최종 임상 판단은 회원의 전문적 판단에 따릅니다.</li>
              <li>회원은 서비스를 통해 취득한 정보를 환자 동의 없이 제3자에게 공개할 수 없습니다.</li>
              <li>회사는 다음의 경우 서비스 이용을 제한할 수 있습니다:
                <ul className="list-disc list-inside ml-4 mt-2">
                  <li>타인의 계정을 도용한 경우</li>
                  <li>서비스 운영을 방해한 경우</li>
                  <li>법령 또는 본 약관을 위반한 경우</li>
                  <li>결제 의무를 이행하지 않은 경우</li>
                </ul>
              </li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제6조 (유료서비스 및 결제)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>유료서비스의 요금 및 결제방법은 서비스 내 안내 페이지에 명시합니다.</li>
              <li>정기결제 서비스는 결제일에 등록된 결제수단으로 자동 결제됩니다.</li>
              <li>결제 실패 시 회사는 최대 3회까지 재시도하며, 모두 실패 시 서비스가 중단될 수 있습니다.</li>
              <li>요금 변경 시 30일 전에 회원에게 고지합니다.</li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제7조 (계약 해지 및 환불)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>회원은 언제든지 서비스 해지를 요청할 수 있습니다.</li>
              <li>정기결제 해지 시 다음 결제일부터 결제가 중단되며, 이미 결제된 기간은 이용 가능합니다.</li>
              <li>환불은 별도의 환불정책에 따릅니다.</li>
              <li>회원 귀책사유로 인한 계약 해지 시 환불이 제한될 수 있습니다.</li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제8조 (회사의 의무)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>회사는 관련 법령과 본 약관이 금지하거나 미풍양속에 반하는 행위를 하지 않습니다.</li>
              <li>회사는 지속적이고 안정적인 서비스 제공을 위해 노력합니다.</li>
              <li>회사는 회원의 개인정보를 보호하기 위해 노력합니다.</li>
              <li>회사는 서비스 장애 발생 시 신속히 복구하기 위해 노력합니다.</li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제9조 (회원의 의무)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>회원은 본 약관 및 관계 법령을 준수해야 합니다.</li>
              <li>회원은 자신의 계정 정보를 안전하게 관리해야 합니다.</li>
              <li>회원은 타인의 지식재산권을 침해해서는 안 됩니다.</li>
              <li>회원은 서비스를 이용하여 영리 목적의 활동을 하거나 제3자에게 양도할 수 없습니다.</li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제10조 (면책조항)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중단 등 불가항력으로 인한 서비스 중단에 대해 책임을 지지 않습니다.</li>
              <li>회사는 회원의 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.</li>
              <li>본 서비스에서 제공하는 처방 추천 등의 정보는 참고용이며, 실제 임상 결정은 회원의 전문적 판단과 책임 하에 이루어집니다.</li>
              <li>회사는 회원이 서비스를 이용하여 기대하는 수익을 얻지 못하거나 상실한 것에 대해 책임을 지지 않습니다.</li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제11조 (분쟁해결)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>회사와 회원 간 발생한 분쟁에 관한 소송은 대한민국 법원을 전속 관할로 합니다.</li>
              <li>회사와 회원 간 제기된 소송에는 대한민국 법을 적용합니다.</li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">부칙</h2>
            <p className="text-gray-700">본 약관은 2024년 1월 1일부터 시행합니다.</p>

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
