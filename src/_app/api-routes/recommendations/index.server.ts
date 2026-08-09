import "server-only";

export {
  DELETE as recommendationDetailDelete,
  GET as recommendationDetailGet,
} from "./recommendation-detail-route";
export { GET as recommendationSynthesisAudioGet } from "./recommendation-synthesis-audio-route";
export { POST as recommendationSynthesisPost } from "./recommendation-synthesis-route";
export { POST as recommendationsPost } from "./recommendations-route";
