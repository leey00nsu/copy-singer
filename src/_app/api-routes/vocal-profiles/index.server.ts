import "server-only";

export { GET as vocalProfileAnalysisJobDetailGet } from "./vocal-profile-analysis-job-detail-route";
export {
  GET as vocalProfileAnalysisJobsGet,
  POST as vocalProfileAnalysisJobsPost,
} from "./vocal-profile-analysis-jobs-route";
export { GET as vocalProfileAudioGet } from "./vocal-profile-audio-route";
export {
  DELETE as vocalProfileDetailDelete,
  GET as vocalProfileDetailGet,
} from "./vocal-profile-detail-route";
export { GET as vocalProfileHealthGet } from "./vocal-profile-health-route";
export { GET as vocalProfileSynthesisReferenceAudioGet } from "./vocal-profile-synthesis-reference-audio-route";
export { GET as vocalProfilesGet, POST as vocalProfilesPost } from "./vocal-profiles-route";
