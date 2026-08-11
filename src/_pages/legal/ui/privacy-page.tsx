import type { Metadata } from "next";
import Link from "next/link";

import { LegalDataItem, LegalDataList, LegalDocumentLayout, LegalList, LegalSection } from "./legal-document-layout";

const privacyMetadata: Metadata = {
  title: "개인정보 처리방침 | Copy Singer",
  description: "Copy Singer가 계정, 음성, 분석, 추천 및 AI 믹싱 데이터를 처리하는 방법입니다.",
};

function PrivacyPage() {
  return (
    <LegalDocumentLayout
      description="Copy Singer가 Google 로그인 정보, 음성 파일과 분석·추천·AI 믹싱 기록을 어떤 목적으로 처리하고 삭제하는지 설명합니다."
      effectiveDate="2026년 8월 11일"
      title="개인정보 처리방침"
    >
      <LegalSection title="1. 처리 원칙">
        <p>
          Copy Singer 운영팀(이하 “운영자”)은 서비스 제공에 필요한 범위에서 개인정보를 처리하며, 목적이 달성되거나
          이용자가 삭제를 요청하면 관련 법령상 보존 의무가 없는 한 안전하게 파기합니다. 음성은 사용자 식별을 위한
          생체인증 수단으로 사용하지 않고 보컬 분석과 사용자가 요청한 AI 믹싱에 사용합니다.
        </p>
      </LegalSection>

      <LegalSection title="2. 처리하는 개인정보와 목적">
        <LegalDataList>
          <LegalDataItem term="Google 계정">
            Google 계정 식별자, 이름, 이메일, 이메일 확인 여부, 프로필 이미지, OAuth 연결·토큰 metadata를 계정 생성,
            로그인과 공급자 연결 상태 확인에 사용합니다.
          </LegalDataItem>
          <LegalDataItem term="세션·접속">
            세션 token, 만료 시각, IP 주소, User-Agent를 로그인 유지, 보안, 오용 방지와 오류 대응에 사용합니다.
          </LegalDataItem>
          <LegalDataItem term="음성·분석">
            녹음·업로드 음성, 파일명·형식·크기·길이·sample rate, 음역·중앙음·안정도·음질 지표, 분석 descriptor와 대표
            구간을 보컬 프로필 생성·재생·추천·AI 믹싱 reference 생성에 사용합니다.
          </LegalDataItem>
          <LegalDataItem term="추천">
            선택한 보컬 프로필, 추천 곡·순위·적합도·권장 키·사유·합성 상태를 추천 결과 저장, 조회와 후속 믹싱 연결에
            사용합니다.
          </LegalDataItem>
          <LegalDataItem term="AI 믹싱">
            보컬 프로필·곡·추천 항목 식별자, reference/target/result audio, 외부 작업 ID, 진행 상태, 오류·재시도 기록을
            변환 작업 수행, 복구, 결과 제공과 삭제에 사용합니다.
          </LegalDataItem>
          <LegalDataItem term="티켓·운영">
            티켓 잔액·변경 유형·수량·사유, 관련 믹싱 ID, 관리자 조정자 ID와 작업 상태를 이용량 관리, 환급, 운영 감사와
            고객 지원에 사용합니다.
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
            계정 운영과 이용량·환급 이력 확인에 필요한 기간 동안 보유하며 정식 유료 서비스 도입 시 법정 보존기간을 별도
            확정합니다.
          </LegalDataItem>
          <LegalDataItem term="법정 보존">
            관계 법령에 별도 보존 의무가 생기면 해당 정보만 분리하여 법정 기간 동안 보관한 뒤 파기합니다.
          </LegalDataItem>
        </LegalDataList>
      </LegalSection>

      <LegalSection title="5. 외부 서비스 이용과 처리위탁">
        <p>운영자는 현재 기능 제공을 위해 다음 외부 서비스를 사용합니다.</p>
        <LegalDataList>
          <LegalDataItem term="Google OAuth">
            계정 인증과 로그인. Google 계정 식별자·이름·이메일·프로필 및 OAuth metadata를 처리합니다.
          </LegalDataItem>
          <LegalDataItem term="Leemage">
            사용자 reference, 분석용 대표 음성과 믹싱 결과 파일의 저장·조회·삭제를 처리합니다.
          </LegalDataItem>
          <LegalDataItem term="Modal / SoulX">
            업로드 음성의 보컬 분석과 사용자가 요청한 AI 음성 변환·믹싱 작업을 처리합니다.
          </LegalDataItem>
          <LegalDataItem term="PostgreSQL 운영 환경">
            계정, session, 분석 지표, 추천·믹싱·ticket metadata를 저장합니다. 실제 hosting 사업자는 배포 전 확정해야
            합니다.
          </LegalDataItem>
        </LegalDataList>
        <p>
          마케팅이나 광고를 목적으로 개인정보를 판매하거나 별도 제3자에게 제공하는 기능은 현재 구현되어 있지 않습니다.
        </p>
      </LegalSection>

      <LegalSection title="6. 국외 이전 확인사항">
        <p>
          Google과 Modal 등 외부 서비스의 실제 처리 국가·region은 배포 설정에 따라 달라질 수 있습니다. 정식 공개 전
          이전받는 자, 국가, 이전 일시·방법, 항목, 목적, 보유기간과 거부 방법을 확정하여 이 방침에 반영하고 필요한 동의
          또는 계약 이행 근거를 마련해야 합니다. 해당 확인 전에는 이 문서를 최종 국외 이전 고지로 사용할 수 없습니다.
        </p>
      </LegalSection>

      <LegalSection title="7. cookie와 자동 수집 정보">
        <p>
          서비스는 로그인 유지와 보안을 위한 필수 session cookie를 사용합니다. 현재 별도 광고·행태 분석 tracker는
          구현되어 있지 않습니다. 브라우저에서 필수 cookie를 차단하면 로그인이 필요한 기능을 이용할 수 없습니다.
        </p>
      </LegalSection>

      <LegalSection title="8. 파기 절차와 방법">
        <LegalList>
          <li>삭제 대상 database record는 관계와 진행 상태를 확인한 뒤 제거합니다.</li>
          <li>외부 저장 음성은 Leemage 삭제 API로 제거하고, 즉시 삭제가 실패하면 cleanup job으로 재시도합니다.</li>
          <li>
            분석기의 임시 작업 파일은 분석 응답 후 제거하고, AI 처리 시스템의 임시 파일은 작업 종료 후 정리하도록
            구성합니다.
          </li>
          <li>전자 파일은 복구하기 어렵도록 삭제하며 법령상 보존 정보는 다른 정보와 분리합니다.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="9. 이용자의 권리와 행사 방법">
        <p>
          이용자는 자신의 개인정보에 대한 열람, 정정·삭제, 처리정지와 동의 철회를 요청할 수 있습니다. 보컬 프로필, 추천
          결과와 종료된 믹싱 작업은 서비스 화면에서 직접 삭제할 수 있으며 계정 전체 삭제나 추가 요청은 아래 문의 채널이
          확정된 뒤 해당 채널로 접수합니다. 법령에서 제한하는 경우에는 사유를 안내할 수 있습니다.
        </p>
      </LegalSection>

      <LegalSection title="10. 안전성 확보 조치">
        <LegalList>
          <li>Google OAuth와 만료되는 session을 사용하고 사용자 소유 데이터는 서버에서 계정 ID로 접근을 제한합니다.</li>
          <li>외부 API key와 database credential은 server environment에서 관리하고 브라우저에 노출하지 않습니다.</li>
          <li>관리자 기능은 허용된 계정과 서버 검증으로 제한하고 ticket 조정 사유와 작업자를 기록합니다.</li>
          <li>
            음성 저장소 삭제 실패를 추적·재시도하고 작업 lease, idempotency key와 상태 검증으로 중복 처리를 줄입니다.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="11. 아동의 개인정보">
        <p>
          서비스는 만 14세 미만 아동을 대상으로 하지 않습니다. 운영자가 법정대리인 동의 없이 아동 정보가 수집된 사실을
          알게 되면 확인 후 지체 없이 삭제합니다.
        </p>
      </LegalSection>

      <LegalSection title="12. 개인정보 보호책임자와 문의">
        <LegalDataList>
          <LegalDataItem term="운영 주체">정식 공개 전 법적 명칭·대표자·사업장 주소 입력 필요</LegalDataItem>
          <LegalDataItem term="보호책임자">정식 공개 전 개인정보 보호책임자 이름·직책 입력 필요</LegalDataItem>
          <LegalDataItem term="문의 채널">정식 공개 전 실제 수신 가능한 이메일과 전화번호 입력 필요</LegalDataItem>
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
          방침을 확인할 수 있는 보관 방법은 정식 공개 전에 마련합니다. 서비스 이용 조건은{" "}
          <Link href="/terms">이용 약관</Link>
          에서 확인할 수 있습니다.
        </p>
      </LegalSection>
    </LegalDocumentLayout>
  );
}

export { PrivacyPage, privacyMetadata };
