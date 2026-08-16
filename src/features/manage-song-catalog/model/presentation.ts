import type { AdminCatalogEntryView, AdminCatalogSourceView } from "./view";

export type AdminCatalogVersionRole = "current" | "pending" | "preparing" | "history";
export type AdminCatalogStateTone = "neutral" | "success" | "warning" | "destructive";

export type AdminCatalogSourcePresentation = {
  source: AdminCatalogSourceView;
  versionLabel: string;
  role: AdminCatalogVersionRole;
  roleLabel: string;
  stateLabel: string;
  stateDescription: string;
  tone: AdminCatalogStateTone;
  canPublish: boolean;
  publishBlockedReason: string | null;
  needsOriginalFileRecovery: boolean;
  canRetryAnalysis: boolean;
};

const ROLE_LABELS: Record<AdminCatalogVersionRole, string> = {
  current: "현재 공개 버전",
  pending: "교체 준비 중",
  preparing: "공개 준비 중",
  history: "이전 버전",
};

function publishBlockedReason(source: AdminCatalogSourceView) {
  if (!source.targetReady) return "원곡 음원 파일을 업로드해야 해요.";
  if (source.analysisStatus === "FAILED") return "실패한 음원 분석을 다시 시도해야 해요.";
  if (source.analysisStatus === "PROCESSING") return "원곡 음원을 분석하고 있어요.";
  if (source.analysisStatus === "PENDING" || source.analysisStatus === null)
    return "원곡 음원 분석이 시작되기를 기다리고 있어요.";
  if (!source.analysisReady) return "사용할 수 있는 음원 분석 결과가 필요해요.";
  return null;
}

function statePresentation(
  entry: AdminCatalogEntryView,
  source: AdminCatalogSourceView,
  role: AdminCatalogVersionRole,
): Pick<AdminCatalogSourcePresentation, "stateLabel" | "stateDescription" | "tone"> {
  if (source.status === "UNAVAILABLE") {
    return {
      stateLabel: "사용할 수 없음",
      stateDescription: "이 버전은 추천에 공개할 수 없어요.",
      tone: "destructive",
    };
  }
  if (!source.targetReady) {
    return {
      stateLabel: "원곡 파일 필요",
      stateDescription: "보컬과 반주가 함께 있는 원곡 음원 파일을 다시 업로드해 주세요.",
      tone: "warning",
    };
  }
  if (source.analysisStatus === "FAILED") {
    return {
      stateLabel: "분석 실패",
      stateDescription: "원곡 파일은 보관되어 있어요. 음원 분석을 다시 시도해 주세요.",
      tone: "destructive",
    };
  }
  if (source.analysisStatus === "PROCESSING") {
    return {
      stateLabel: "음원 분석 중",
      stateDescription: "보컬을 분리해 곡의 음역과 원키를 확인하고 있어요.",
      tone: "neutral",
    };
  }
  if (source.analysisStatus === "PENDING" || source.analysisStatus === null || !source.analysisReady) {
    return {
      stateLabel: "분석 대기 중",
      stateDescription: "원곡 음원 분석이 시작되기를 기다리고 있어요.",
      tone: "neutral",
    };
  }
  if (role === "current" && entry.song.lifecycleStatus === "ACTIVE") {
    return {
      stateLabel: "추천에 공개 중",
      stateDescription: "현재 추천과 AI 믹싱에서 사용하는 버전이에요.",
      tone: "success",
    };
  }
  if (role === "current" && entry.song.lifecycleStatus === "ARCHIVED") {
    return {
      stateLabel: "보관됨",
      stateDescription: "추천에서는 제외됐지만 곡 정보와 원곡 파일은 유지돼요.",
      tone: "warning",
    };
  }
  if (role === "history") {
    return {
      stateLabel: "이전 버전",
      stateDescription: "현재 추천에서는 사용하지 않는 과거 버전이에요.",
      tone: "neutral",
    };
  }
  return {
    stateLabel: "공개 준비 완료",
    stateDescription: "검토 후 추천에 공개할 수 있어요.",
    tone: "success",
  };
}

export function presentAdminCatalogSources(entry: AdminCatalogEntryView): AdminCatalogSourcePresentation[] {
  const sources = [...entry.song.sources].sort((left, right) => right.revision - left.revision);
  const candidate = sources.find((source) => source.id !== entry.song.activeSourceId && source.status !== "SUPERSEDED");

  return sources.map((source) => {
    const role: AdminCatalogVersionRole =
      source.id === entry.song.activeSourceId
        ? "current"
        : source.id === candidate?.id
          ? entry.song.activeSourceId
            ? "pending"
            : "preparing"
          : "history";
    const blocker = publishBlockedReason(source);
    return {
      source,
      versionLabel: `버전 ${source.revision}`,
      role,
      roleLabel: ROLE_LABELS[role],
      ...statePresentation(entry, source, role),
      canPublish: blocker === null,
      publishBlockedReason: blocker,
      needsOriginalFileRecovery: !source.targetReady,
      canRetryAnalysis: source.analysisStatus === "FAILED",
    };
  });
}
