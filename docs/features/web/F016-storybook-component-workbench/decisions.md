# Decisions Log

기술 결정과 그 이유를 기록합니다.
canonical docs surface 밖의 unmanaged docs 산출물이 있더라도, 실제로 채택한 대안과 선택 이유는 이 파일에 다시 남겨 Feature의 결정 이력을 유지합니다.

---

## D001: Vite Storybook과 production 격리 경계 (2026-08-09)

- **Context**: Next.js App Router UI를 실제 애플리케이션과 backend 없이 렌더하고 Storybook story를 real browser test로 재사용할 기반이 없다.
- **Constraints**: Next.js 16/React 19/Tailwind 4/FSD public API와 호환되어야 하며 Storybook, MSW worker와 Playwright가 Coolify production runtime 또는 Next.js `public`에 포함되면 안 된다. 기존 Node `node:test` suite를 유지해야 한다.
- **Options**: Webpack 기반 Storybook과 legacy test-runner, Vite 기반 Storybook과 Vitest browser project, 별도 Vite demo app을 검토한다.
- **Decision**: `@storybook/nextjs-vite`와 Storybook 10의 CSF Next preview를 사용하고, Vitest browser project는 공식 10.5.7 template처럼 `storybookTest` plugin이 preview annotation을 직접 읽도록 구성한다. 별도 `vitest.setup.ts`는 두지 않는다.
- **Rationale**: Vite builder는 Vitest addon과 직접 통합되고 Next.js 16/React 19 peer 범위를 충족한다. 설치 버전의 공식 template을 따르면 preview annotation 이중 등록을 피하면서 기존 `tsx --test` Node suite와 browser project를 분리할 수 있다.
- **Trace**:
  - **DOING 시작 시점**: Storybook 공식 권장인 `@storybook/nextjs-vite`와 Vitest addon을 사용하고 모든 패키지를 devDependency로 제한한다. preview는 production QueryClient singleton 대신 story별 instance를 만들며 worker는 `.storybook/public`에서만 제공한다.
  - **DONE 전 확정 시점**: Storybook 10.5.7 CSF Next preview, story별 QueryClient, App Router parameter와 Tailwind 전역 CSS를 구성했다. MSW addon의 기본 worker setup은 Storybook 내부·정적 asset request만 제외하고 그 외 unhandled request를 warning으로 알려 주며 story 종료 시 handler를 reset한다. worker를 `.storybook/public`에서만 제공하고 production 경계 test로 Next.js `public` 유입을 막았다.
  - **머지 후 확인**: 로컬 통합 후 갱신 예정
- **Evidence**:
  - **Commit**: docs `12eb3dc`, project `86c16c2`
  - **PR**: 로컬 workflow (원격 PR 없음)
  - **Test/Log**: Storybook smoke/static build/browser test, `pnpm run typecheck`, `pnpm run check:architecture`, production 경계 test PASS (2026-08-09)
- **Consequences**: Storybook 실행에는 로컬 Playwright Chromium 설치가 필요하지만 Next.js build/start와 Coolify runtime에는 새 command, 환경 변수 또는 production dependency가 추가되지 않는다.
