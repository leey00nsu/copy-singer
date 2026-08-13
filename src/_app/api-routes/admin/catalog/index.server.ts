import "server-only";

export { POST as adminCatalogArchivePost } from "./archive-route";
export { GET as adminCatalogGet, POST as adminCatalogPost } from "./catalog-route";
export { POST as adminCatalogPublishPost } from "./publish-route";
export { POST as adminCatalogRetryPost } from "./retry-route";
export { POST as adminCatalogSourcePost } from "./source-route";
export { POST as adminCatalogTargetPost } from "./target-route";
