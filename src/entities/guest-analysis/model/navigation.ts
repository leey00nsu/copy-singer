const UUID = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

/** Only the saved profile's own recommendation routes may resume after claiming. */
export function guestRecommendationReturn(profileId: string, candidate: string | undefined) {
  if (!new RegExp(`^${UUID}$`).test(profileId)) return "/profile";
  const fallback = `/vocal-profiles/${profileId}`;
  if (!candidate || /[\r\n]/.test(candidate)) return fallback;
  const allowed = new RegExp(`^/recommendations/${profileId}(?:/songs/${UUID})?$`);
  return allowed.test(candidate) ? candidate : fallback;
}

export function guestRecommendationSaveHref(profileId: string, itemId?: string, signedIn = false) {
  const destination = guestRecommendationReturn(
    profileId,
    `/recommendations/${profileId}${itemId ? `/songs/${itemId}` : ""}`,
  );
  const save = `/profile/save-trial?next=${encodeURIComponent(destination)}`;
  return signedIn ? save : `/login?callbackURL=${encodeURIComponent(save)}`;
}
