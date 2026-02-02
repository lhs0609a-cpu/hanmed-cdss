import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPage() {
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
            <CardTitle className="text-2xl">개인정보처리방침</CardTitle>
            <p className="text-sm text-muted-foreground">
              시행일: 2024년 1월 1일 | 최종 수정: 2026년 1월 22일 (의료정보 특례 조항 추가)
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p className="text-gray-700 leading-relaxed">
              주식회사 온고지신(이하 "회사")은 정보주체의 자유와 권리 보호를 위해 「개인정보 보호법」
              및 관계 법령이 정한 바를 준수하여, 적법하게 개인정보를 처리하고 안전하게 관리하고 있습니다.
            </p>

            <h2 className="text-lg font-semibold mt-6 mb-3">제1조 (개인정보의 처리 목적)</h2>
            <p className="text-gray-700 leading-relaxed">
              회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적
              이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 「개인정보 보호법」
              제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
            </p>
            <ol className="list-decimal list-inside space-y-2 text-gray-700 mt-3">
              <li>
                <strong>회원가입 및 관리</strong>
                <p className="ml-6 mt-1">회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리, 서비스 부정이용 방지, 각종 고지·통지</p>
              </li>
              <li>
                <strong>서비스 제공</strong>
                <p className="ml-6 mt-1">AI 처방 추천, 약물 상호작용 확인, 환자 관리 등 서비스 제공, 맞춤서비스 제공</p>
              </li>
              <li>
                <strong>요금 결제</strong>
                <p className="ml-6 mt-1">유료서비스 제공에 따른 요금 결제, 환불, 정기결제 관리</p>
              </li>
              <li>
                <strong>마케팅 및 광고</strong>
                <p className="ml-6 mt-1">신규 서비스 개발 및 맞춤 서비스 제공, 이벤트 정보 제공 (선택 동의 시)</p>
              </li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제2조 (처리하는 개인정보의 항목)</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300 mt-3">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">구분</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">수집항목</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">수집방법</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">필수</td>
                    <td className="border border-gray-300 px-4 py-2">이메일, 비밀번호, 이름, 면허번호</td>
                    <td className="border border-gray-300 px-4 py-2">회원가입</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">선택</td>
                    <td className="border border-gray-300 px-4 py-2">소속기관, 전공분야, 프로필사진</td>
                    <td className="border border-gray-300 px-4 py-2">프로필 설정</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">결제</td>
                    <td className="border border-gray-300 px-4 py-2">카드정보(마스킹), 결제일, 결제금액</td>
                    <td className="border border-gray-300 px-4 py-2">유료서비스 결제</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">자동수집</td>
                    <td className="border border-gray-300 px-4 py-2">IP주소, 접속로그, 서비스 이용기록</td>
                    <td className="border border-gray-300 px-4 py-2">서비스 이용 시</td>
                  </tr>
                  <tr className="bg-amber-50">
                    <td className="border border-gray-300 px-4 py-2 font-medium text-amber-800">환자 의료정보 (민감정보)</td>
                    <td className="border border-gray-300 px-4 py-2 text-amber-800">증상, 진단 기록, 처방 내역, 복용 약물, 체질 정보, 설진/맥진/복진 소견</td>
                    <td className="border border-gray-300 px-4 py-2 text-amber-800">AI 진단 서비스 이용 시</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-4 border-l-4 border-amber-500 bg-amber-50 rounded">
              <h3 className="font-semibold text-amber-800 mb-2">민감정보(의료정보) 처리 안내</h3>
              <p className="text-sm text-amber-700">
                환자의 의료정보는 「개인정보 보호법」 제23조에 따른 민감정보에 해당합니다.
                회사는 의료정보 처리 시 정보주체(환자)의 별도 동의를 받거나,
                「의료법」 등 법령에서 민감정보의 처리를 요구하거나 허용하는 경우에만 처리합니다.
              </p>
            </div>

            <h2 className="text-lg font-semibold mt-6 mb-3">제3조 (개인정보의 처리 및 보유기간)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의 받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.</li>
              <li>
                각각의 개인정보 처리 및 보유 기간은 다음과 같습니다:
                <ul className="list-disc list-inside ml-4 mt-2">
                  <li>회원정보: 회원 탈퇴 시까지 (탈퇴 후 30일 이내 파기)</li>
                  <li>결제정보: 전자상거래법에 따라 5년</li>
                  <li>접속로그: 통신비밀보호법에 따라 3개월</li>
                  <li>계약 및 청약철회 기록: 전자상거래법에 따라 5년</li>
                  <li>소비자 불만 또는 분쟁처리 기록: 전자상거래법에 따라 3년</li>
                  <li className="text-amber-700 font-medium">환자 의료정보 접근기록: 의료법 시행규칙에 따라 5년</li>
                  <li className="text-amber-700 font-medium">AI 진단 결과 기록: 서비스 이용 종료 후 3년 (의료분쟁 대비)</li>
                </ul>
              </li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제4조 (개인정보의 제3자 제공)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>회사는 정보주체의 개인정보를 제1조에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 「개인정보 보호법」 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.</li>
              <li>현재 개인정보를 제3자에게 제공하고 있지 않습니다.</li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제5조 (개인정보처리의 위탁)</h2>
            <p className="text-gray-700 leading-relaxed">
              회사는 서비스 제공을 위해 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300 mt-3">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">수탁업체</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">위탁업무</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">보유기간</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">토스페이먼츠</td>
                    <td className="border border-gray-300 px-4 py-2">결제 처리</td>
                    <td className="border border-gray-300 px-4 py-2">위탁계약 종료 시</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Amazon Web Services</td>
                    <td className="border border-gray-300 px-4 py-2">데이터 저장 및 처리</td>
                    <td className="border border-gray-300 px-4 py-2">위탁계약 종료 시</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 className="text-lg font-semibold mt-6 mb-3">제6조 (정보주체의 권리·의무 및 행사방법)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>정보주체는 회사에 대해 언제든지 다음의 권리를 행사할 수 있습니다:
                <ul className="list-disc list-inside ml-4 mt-2">
                  <li>개인정보 열람요구</li>
                  <li>오류 등이 있을 경우 정정 요구</li>
                  <li>삭제요구</li>
                  <li>처리정지 요구</li>
                </ul>
              </li>
              <li>권리 행사는 서비스 내 설정 메뉴 또는 이메일(privacy@ongojisin.ai)을 통해 하실 수 있습니다.</li>
              <li>권리 행사 요구는 10일 이내에 처리됩니다.</li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제7조 (개인정보의 파기)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.</li>
              <li>파기 절차: 불필요한 개인정보는 개인정보보호책임자의 승인을 받아 파기합니다.</li>
              <li>파기 방법: 전자적 파일 형태의 정보는 복구할 수 없는 방법으로 영구 삭제하며, 종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각합니다.</li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제8조 (개인정보의 안전성 확보조치)</h2>
            <p className="text-gray-700 leading-relaxed">
              회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mt-3">
              <li>관리적 조치: 내부관리계획 수립·시행, 정기적 직원 교육</li>
              <li>기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 접속기록 보관, 암호화 기술 적용</li>
              <li>물리적 조치: 전산실, 자료보관실 등의 접근통제</li>
            </ul>

            <h2 className="text-lg font-semibold mt-6 mb-3">제8조의2 (의료정보의 특별 보호조치)</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-3">
              <p className="text-gray-700 leading-relaxed mb-3">
                회사는 환자의 의료정보(민감정보)에 대해 다음과 같은 강화된 보호조치를 적용합니다:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>
                  <strong>암호화 (Encryption)</strong>
                  <ul className="list-circle list-inside ml-4 mt-1 text-sm">
                    <li>전송 시: TLS 1.3 프로토콜을 통한 종단간 암호화</li>
                    <li>저장 시: AES-256-GCM 알고리즘을 통한 데이터베이스 필드 레벨 암호화</li>
                    <li>암호화 키: 별도 보안 키 관리 시스템(KMS)을 통한 관리</li>
                  </ul>
                </li>
                <li>
                  <strong>접근 통제 (Access Control)</strong>
                  <ul className="list-circle list-inside ml-4 mt-1 text-sm">
                    <li>역할 기반 접근 제어(RBAC) 적용</li>
                    <li>의료정보 접근 시 2단계 인증 필수</li>
                    <li>모든 접근 기록 로깅 및 감사 추적</li>
                  </ul>
                </li>
                <li>
                  <strong>데이터 최소화 (Data Minimization)</strong>
                  <ul className="list-circle list-inside ml-4 mt-1 text-sm">
                    <li>AI 분석에 필요한 최소한의 정보만 처리</li>
                    <li>환자 식별 정보(이름, 주민번호 등)는 수집하지 않음</li>
                    <li>익명화/가명화 처리 우선 적용</li>
                  </ul>
                </li>
                <li>
                  <strong>접근 로그 보관</strong>
                  <ul className="list-circle list-inside ml-4 mt-1 text-sm">
                    <li>의료정보 열람/수정/삭제 기록: 5년간 보관</li>
                    <li>로그에 포함되는 정보: 접근자 ID, 접근 시각, 접근 유형, IP 주소</li>
                  </ul>
                </li>
              </ul>
            </div>

            <h2 className="text-lg font-semibold mt-6 mb-3">제8조의3 (의료법 등 관계법령 준수)</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>
                회사는 「의료법」 제21조(기록 열람 등), 제22조(진료기록부 등), 제23조(전자의무기록)의 규정을 준수합니다.
              </li>
              <li>
                본 서비스는 임상결정지원 소프트웨어로서, 「의료기기법」 관련 규정에 따라 적법하게 운영됩니다.
              </li>
              <li>
                의료정보의 국외 이전: 회사는 환자의 의료정보를 국외로 이전하지 않습니다.
                데이터 저장 및 처리는 대한민국 내 서버에서만 이루어집니다.
              </li>
              <li>
                의료정보 유출 시 대응: 의료정보 유출 사고 발생 시, 지체 없이 정보주체에게 통지하고,
                보건복지부 및 개인정보보호위원회에 신고합니다.
              </li>
            </ol>

            <h2 className="text-lg font-semibold mt-6 mb-3">제8조의4 (환자 권리 보장)</h2>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-3">
              <p className="text-gray-700 leading-relaxed mb-3">
                환자(정보주체)는 자신의 의료정보에 대해 다음의 권리를 가집니다:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li><strong>열람권:</strong> 본인의 의료정보 처리 현황을 열람할 수 있습니다.</li>
                <li><strong>정정·삭제권:</strong> 잘못된 의료정보의 정정 또는 삭제를 요청할 수 있습니다.</li>
                <li><strong>처리정지권:</strong> 의료정보 처리의 정지를 요청할 수 있습니다.</li>
                <li><strong>동의 철회권:</strong> 언제든지 의료정보 처리에 대한 동의를 철회할 수 있습니다.</li>
                <li><strong>이동권:</strong> 본인의 의료정보를 다른 서비스로 이전 요청할 수 있습니다.</li>
              </ul>
              <p className="text-sm text-gray-600 mt-3">
                * 권리 행사: 서비스 내 [설정 &gt; 개인정보 관리] 또는 privacy@ongojisin.ai로 요청
              </p>
            </div>

            <h2 className="text-lg font-semibold mt-6 mb-3">제9조 (개인정보 보호책임자)</h2>
            <div className="bg-gray-100 p-4 rounded-lg mt-3">
              <p className="text-gray-700">
                <strong>개인정보 보호책임자</strong><br />
                성명: 양보름<br />
                직책: 대표<br />
                이메일: privacy@ongojisin.ai
              </p>
            </div>

            <h2 className="text-lg font-semibold mt-6 mb-3">제10조 (권익침해 구제방법)</h2>
            <p className="text-gray-700 leading-relaxed">
              정보주체는 개인정보침해로 인한 구제를 받기 위하여 다음 기관에 분쟁해결이나 상담 등을 신청할 수 있습니다.
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mt-3">
              <li>개인정보침해신고센터: (국번없이) 118</li>
              <li>개인정보분쟁조정위원회: 1833-6972</li>
              <li>대검찰청 사이버수사과: (국번없이) 1301</li>
              <li>경찰청 사이버안전국: (국번없이) 182</li>
            </ul>

            <h2 className="text-lg font-semibold mt-6 mb-3">부칙</h2>
            <p className="text-gray-700">본 개인정보처리방침은 2024년 1월 1일부터 시행합니다.</p>

            <div className="mt-8 p-4 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>머프키치</strong><br />
                경기도 의왕시<br />
                대표: 양보름<br />
                사업자등록번호: 신청 예정<br />
                고객센터: support@ongojisin.ai<br />
                이메일: privacy@ongojisin.ai
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
