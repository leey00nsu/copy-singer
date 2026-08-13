import type { Metadata } from "next";

import { LegalDataItem, LegalDataList, LegalDocumentLayout, LegalList, LegalSection } from "./legal-document-layout";

const termsMetadata: Metadata = {
  alternates: { canonical: "/terms" },
  title: "이용 약관 | Copy Singer",
  description: "Copy Singer의 계정, 음성 분석, 추천 및 AI 믹싱 서비스 이용 조건입니다.",
  robots: { follow: true, index: true },
};

function TermsPage() {
  return (
    <LegalDocumentLayout
      description="Copy Singer의 Google 계정 로그인, 보컬 분석, 노래 추천과 티켓 기반 AI 믹싱 기능을 이용할 때 적용되는 조건입니다."
      effectiveDate="2026년 8월 11일"
      title="이용 약관"
    >
      <LegalSection title="1. 목적과 적용 범위">
        <p>
          이 약관은 Copy Singer 운영팀(이하 “운영자”)이 제공하는 Copy Singer 웹 서비스(이하 “서비스”)의 이용 조건과
          운영자 및 이용자의 권리·의무를 정합니다. 이용자가 Google 로그인을 완료하고 서비스를 이용하면 이 약관과
          개인정보 처리방침을 확인하고 동의한 것으로 봅니다.
        </p>
      </LegalSection>

      <LegalSection title="2. 서비스가 제공하는 기능">
        <LegalList>
          <li>Google OAuth를 통한 계정 생성과 로그인</li>
          <li>이용자가 녹음하거나 업로드한 노래 음성의 음역·안정도 등 보컬 특성 분석</li>
          <li>분석 결과를 바탕으로 한 노래와 권장 키 추천</li>
          <li>이용자가 선택한 보컬 프로필과 사전 등록된 곡을 이용한 AI 음성 변환·믹싱 결과 생성</li>
          <li>보컬 프로필, 추천 결과, 믹싱 작업·결과와 티켓 변경 내역의 저장·조회·삭제</li>
        </LegalList>
        <p>서비스의 세부 기능과 제공 범위는 기술·운영상 필요에 따라 변경될 수 있으며 중요한 변경은 별도로 알립니다.</p>
      </LegalSection>

      <LegalSection title="3. 계정과 이용 자격">
        <LegalList>
          <li>이용자는 본인이 정당하게 사용할 수 있는 Google 계정으로 로그인해야 합니다.</li>
          <li>계정에서 발생한 활동과 인증 수단의 안전한 관리 책임은 이용자에게 있습니다.</li>
          <li>
            만 14세 미만 이용자를 대상으로 설계된 서비스가 아니며, 해당 이용자는 법정대리인 동의 없이 이용할 수
            없습니다.
          </li>
          <li>계정 삭제 기능이 제공되기 전까지 탈퇴와 전체 데이터 삭제는 운영자에게 요청할 수 있습니다.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="4. 음성·콘텐츠에 대한 권리와 책임">
        <p>
          이용자는 본인의 음성 또는 처리 권한을 가진 파일만 녹음·업로드해야 합니다. 타인의 음성, 음원, 저작물이나
          퍼블리시티권을 침해하는 자료를 권한 없이 사용할 수 없습니다.
        </p>
        <p>
          이용자가 제출한 음성과 생성 결과에 대한 권리는 원래 권리자에게 유지됩니다. 이용자는 서비스 제공, 오류 복구와
          사용자가 요청한 결과 생성을 위해 필요한 범위에서만 운영자가 해당 자료를 저장·변환·전송할 수 있도록 허용합니다.
        </p>
      </LegalSection>

      <LegalSection title="5. 분석·추천·AI 결과의 한계">
        <LegalList>
          <li>
            보컬 분석은 녹음 환경, 음질, 길이와 노래 방식에 따라 달라질 수 있으며 의학적 진단이나 전문 성대 평가가
            아닙니다.
          </li>
          <li>
            추천 점수와 권장 키는 현재 분석 알고리즘에 따른 참고 정보이며 적합성이나 가창 결과를 보장하지 않습니다.
          </li>
          <li>AI 믹싱 결과에는 음질 저하, 음색 차이, 처리 실패나 지연이 발생할 수 있습니다.</li>
          <li>이용자는 결과를 공개·배포하기 전에 필요한 음원·저작권·실연권 등 권리를 직접 확인해야 합니다.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="6. 티켓과 믹싱 작업">
        <LegalDataList>
          <LegalDataItem term="티켓 성격">
            서비스 안에서 AI 믹싱을 요청하기 위한 이용 단위이며 현금이나 재산적 가치로 교환·양도할 수 없습니다.
          </LegalDataItem>
          <LegalDataItem term="차감">믹싱 작업 생성 시 화면에 표시된 수량이 차감됩니다.</LegalDataItem>
          <LegalDataItem term="실패와 환급">
            외부 변환 처리 접수 전에 실패하면 자동 환급될 수 있으나, 접수 후 발생한 실패는 기술 계약에 따라 환급되지
            않을 수 있습니다.
          </LegalDataItem>
          <LegalDataItem term="유료 판매">
            현재 별도 결제 기능은 제공하지 않습니다. 유료 판매를 도입하면 가격·환불 조건을 적용 전에 별도로 고지합니다.
          </LegalDataItem>
        </LegalDataList>
      </LegalSection>

      <LegalSection title="7. 금지행위">
        <LegalList>
          <li>타인의 계정·음성·개인정보 또는 권리를 침해하는 행위</li>
          <li>불법·기만·괴롭힘·사칭 목적의 음성 합성 또는 결과 이용</li>
          <li>서비스의 인증, 접근제어, 사용량 제한이나 보안 기능을 우회하는 행위</li>
          <li>악성 코드 전송, 과도한 자동 요청, 역설계 등 서비스 안정성을 해치는 행위</li>
          <li>관련 법령이나 이 약관을 위반하는 행위</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="8. 외부 서비스와 처리 중단">
        <p>
          서비스는 Google 인증, Leemage 음성 저장, Modal 기반 보컬 분석·AI 믹싱 등 외부 시스템을 이용합니다. 해당
          시스템의 장애, 정책 변경이나 네트워크 문제로 일부 기능이 지연 또는 중단될 수 있습니다. 운영자는 가능한
          범위에서 상태를 안내하고 재시도·정리 작업을 수행합니다.
        </p>
      </LegalSection>

      <LegalSection title="9. 삭제, 이용 제한과 서비스 종료">
        <LegalList>
          <li>이용자는 화면에서 보컬 프로필, 추천 결과와 종료된 믹싱 작업을 삭제할 수 있습니다.</li>
          <li>
            연결된 추천이나 진행 중 작업이 있으면 데이터 일관성과 작업 안전을 위해 먼저 관련 항목을 정리해야 할 수
            있습니다.
          </li>
          <li>
            외부 저장소 삭제가 즉시 완료되지 않으면 정리 작업이 재시도되며 화면상 삭제와 실제 파일 제거 시점이 다를 수
            있습니다.
          </li>
          <li>
            운영자는 위법·침해·보안 위험이 있는 이용을 제한할 수 있고, 서비스 종료 시 합리적인 기간 전에 알립니다.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="10. 책임의 범위">
        <p>
          운영자는 고의 또는 중대한 과실이 없는 한 이용자의 권한 없는 콘텐츠 사용, 이용자 환경의 문제, 외부 서비스 장애,
          무료 시험 기능의 기대와 다른 분석·추천·생성 결과로 발생한 간접 손해에 책임을 지지 않습니다. 관련 법령이 달리
          정하는 경우에는 그 법령이 우선합니다.
        </p>
      </LegalSection>

      <LegalSection title="11. 약관 변경과 준거법">
        <p>
          약관을 변경할 때에는 시행일과 주요 변경 내용을 서비스에서 미리 알립니다. 이용자에게 불리한 중요한 변경은
          합리적인 사전 고지 기간을 둡니다. 이 약관은 대한민국 법령을 따르며 분쟁은 당사자 간 협의를 우선합니다.
        </p>
      </LegalSection>

      <LegalSection title="12. 운영자 정보와 문의">
        <LegalDataList>
          <LegalDataItem term="서비스명">Copy Singer</LegalDataItem>
          <LegalDataItem term="운영 주체">정식 공개 전 법적 명칭과 대표자 정보 입력 필요</LegalDataItem>
          <LegalDataItem term="주소·문의">
            정식 공개 전 사업장 주소와 실제 수신 가능한 문의 이메일 입력 필요
          </LegalDataItem>
        </LegalDataList>
      </LegalSection>
    </LegalDocumentLayout>
  );
}

export { TermsPage, termsMetadata };
