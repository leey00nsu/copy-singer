import type { Metadata } from "next";
import Link from "next/link";

import { LegalDataItem, LegalDataList, LegalDocumentLayout, LegalList, LegalSection } from "./legal-document-layout";

const privacyMetadata: Metadata = {
  alternates: { canonical: "/privacy" },
  title: "개인정보 처리방침 | Copysinger",
  description: "Copysinger가 계정, 음성, 분석, 추천 및 AI 믹싱 데이터를 처리하는 방법입니다.",
  robots: { follow: true, index: true },
};

function PrivacyPage() {
  return (
    <LegalDocumentLayout
      description="Copysinger가 Google 로그인 정보, 음성 파일과 분석·추천·AI 믹싱 기록을 어떤 목적으로 처리하고 삭제하는지 설명합니다."
      effectiveDate="2026년 8월 13일"
      title="개인정보 처리방침"
    >
      <LegalSection title="1. 처리 원칙">
        <p>
          Copysinger 운영팀(이하 “운영자”)은 서비스 제공에 필요한 범위에서 개인정보를 처리하며, 목적이 달성되거나
          이용자가 삭제를 요청하면 관련 법령상 보존 의무가 없는 한 안전하게 파기합니다. 음성은 사용자 식별을 위한
          생체인증 수단으로 사용하지 않고 보컬 분석과 사용자가 요청한 AI 믹싱에 사용합니다.
        </p>
      </LegalSection>

      <LegalSection title="2. 처리하는 개인정보와 목적">
        <LegalDataList>
          <LegalDataItem term="계정정보">
            Google 계정 식별자, 이름, 이메일, 프로필 정보와 Google 계정 연결 정보를 계정 생성과 로그인에 사용합니다.
          </LegalDataItem>
          <LegalDataItem term="접속정보">
            세션 정보, IP 주소와 브라우저 정보를 로그인 유지, 보안, 오용 방지와 오류 대응에 사용합니다.
          </LegalDataItem>
          <LegalDataItem term="음성정보">
            녹음·업로드한 음성 파일과 파일정보, 음성 분석 결과를 보컬 프로필 생성, 재생, 노래 추천과 AI 믹싱에
            사용합니다.
          </LegalDataItem>
          <LegalDataItem term="추천·믹싱정보">
            보컬 프로필, 추천 결과, 믹싱 입력·결과 음원 및 작업정보를 추천 결과 제공, AI 믹싱 수행, 결과 조회와 삭제에
            사용합니다.
          </LegalDataItem>
          <LegalDataItem term="이용내역">
            티켓 잔액 및 사용·환급 내역을 서비스 이용량 관리와 환급 처리에 사용합니다.
          </LegalDataItem>
        </LegalDataList>
      </LegalSection>

      <LegalSection title="3. 수집 방법과 처리 근거">
        <LegalList>
          <li>이용자가 Google 로그인을 선택할 때 Google로부터 계정 정보를 전달받습니다.</li>
          <li>이용자가 브라우저에서 직접 녹음·업로드하거나 분석·추천·믹싱 기능을 요청할 때 관련 정보를 수집합니다.</li>
          <li>서비스 이용 계약의 체결·이행, 이용자의 동의, 보안과 법적 의무 이행에 필요한 범위에서 처리합니다.</li>
          <li>
            추천 점수는 보컬 특성과 곡 특성을 비교해 생성하지만 법적 효과나 중대한 권리 변동을 일으키는 자동화된 결정에
            사용하지 않습니다.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="4. 보유 및 이용 기간">
        <LegalDataList>
          <LegalDataItem term="계정·OAuth">
            회원 탈퇴 또는 전체 삭제 요청 완료 시까지. 개별 session은 만료 또는 로그아웃 시까지 보유합니다.
          </LegalDataItem>
          <LegalDataItem term="음성·보컬 프로필">
            이용자가 해당 프로필을 삭제하거나 계정 전체 삭제를 요청할 때까지 보유합니다.
          </LegalDataItem>
          <LegalDataItem term="추천·합성">
            이용자가 추천 결과를 삭제하거나 계정 전체 삭제를 요청할 때까지 보유하며 임시 합성물은 기록된 만료 시각에
            정리될 수 있습니다.
          </LegalDataItem>
          <LegalDataItem term="믹싱·결과">
            이용자가 종료된 작업을 삭제하거나 계정 전체 삭제를 요청할 때까지 보유합니다.
          </LegalDataItem>
          <LegalDataItem term="티켓 원장">
            비상업적 서비스의 계정 운영과 이용량·환급 이력 확인을 위해 계정 삭제 시까지 보유합니다.
          </LegalDataItem>
          <LegalDataItem term="법정 보존">
            관계 법령에 별도 보존 의무가 생기면 해당 정보만 분리하여 법정 기간 동안 보관한 뒤 파기합니다.
          </LegalDataItem>
        </LegalDataList>
      </LegalSection>

      <LegalSection title="5. 외부 서비스 이용">
        <p>운영자는 계정 인증과 로그인을 위해 다음 외부 서비스를 사용합니다.</p>
        <LegalDataList>
          <LegalDataItem term="Google OAuth">
            계정 인증과 로그인. Google 계정 식별자·이름·이메일·프로필 및 OAuth metadata를 처리합니다.
          </LegalDataItem>
        </LegalDataList>
        <p>
          마케팅이나 광고를 목적으로 개인정보를 판매하거나 별도 제3자에게 제공하는 기능은 현재 구현되어 있지 않습니다.
        </p>
      </LegalSection>

      <LegalSection title="6. Google 계정 정보 처리">
        <p>
          Google 계정 인증 과정에서 로그인에 필요한 계정 정보가 Google의 인프라를 통해 전송·처리될 수 있습니다. 운영자는
          계정 인증과 로그인에 필요한 범위에서만 해당 정보를 이용합니다.
        </p>
      </LegalSection>

      <LegalSection title="7. cookie와 자동 수집 정보">
        <p>
          서비스는 로그인 유지와 보안을 위한 필수 session cookie를 사용합니다. 현재 별도 광고·행태 분석 tracker는
          구현되어 있지 않습니다. 브라우저에서 필수 cookie를 차단하면 로그인이 필요한 기능을 이용할 수 없습니다.
        </p>
      </LegalSection>

      <LegalSection title="8. 파기 절차와 방법">
        <p>
          보유기간이 지나거나 이용자가 삭제를 요청한 개인정보는 지체 없이 삭제합니다. 전자적 파일은 복구하기 어려운
          방법으로 삭제하며, 법령에 따라 보존해야 하는 정보가 있는 경우 다른 개인정보와 분리하여 보관합니다.
        </p>
      </LegalSection>

      <LegalSection title="9. 이용자의 권리와 행사 방법">
        <p>
          이용자는 자신의 개인정보에 대한 열람, 정정·삭제, 처리정지와 동의 철회를 요청할 수 있습니다. 보컬 프로필, 추천
          결과와 종료된 믹싱 작업은 서비스 화면에서 직접 삭제할 수 있습니다. 계정 전체 삭제와 별도 문의 접수 기능은 현재
          제공하지 않습니다.
        </p>
      </LegalSection>

      <LegalSection title="10. 안전성 확보 조치">
        <LegalList>
          <li>로그인이 필요한 개인정보는 이용자 계정별로 접근을 제한합니다.</li>
          <li>서비스 인증정보와 접근 권한은 이용자에게 노출되지 않도록 관리합니다.</li>
          <li>관리자 기능은 허용된 계정만 사용할 수 있도록 제한합니다.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="11. 아동의 개인정보">
        <p>
          서비스는 만 14세 미만 아동을 대상으로 하지 않습니다. 운영자가 법정대리인 동의 없이 아동 정보가 수집된 사실을
          알게 되면 확인 후 지체 없이 삭제합니다.
        </p>
      </LegalSection>

      <LegalSection title="12. 개인정보 관리">
        <LegalDataList>
          <LegalDataItem term="운영 주체">Copysinger 개인 개발자</LegalDataItem>
          <LegalDataItem term="운영 형태">무료·비상업적 토이 프로젝트</LegalDataItem>
          <LegalDataItem term="삭제 방법">서비스 화면에서 개별 보컬 프로필, 추천 결과와 믹싱 작업 삭제</LegalDataItem>
        </LegalDataList>
      </LegalSection>

      <LegalSection title="13. 권익침해 구제기관">
        <LegalList>
          <li>
            개인정보침해신고센터: 국번 없이 118, <a href="https://privacy.kisa.or.kr">privacy.kisa.or.kr</a>
          </li>
          <li>
            개인정보분쟁조정위원회: 1833-6972, <a href="https://www.kopico.go.kr">kopico.go.kr</a>
          </li>
          <li>
            개인정보보호위원회: <a href="https://www.pipc.go.kr">pipc.go.kr</a>
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="14. 방침의 변경">
        <p>
          처리 항목, 외부 사업자 또는 보유기간이 변경되면 시행일과 주요 변경 내용을 서비스에서 알립니다. 이전 버전의
          방침은 서비스의 문서 변경 이력으로 보관합니다. 서비스 이용 조건은 <Link href="/terms">이용 약관</Link>
          에서 확인할 수 있습니다.
        </p>
      </LegalSection>
    </LegalDocumentLayout>
  );
}

export { PrivacyPage, privacyMetadata };
