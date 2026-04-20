export const USER_PROFILE_UPDATED_EVENT = 'yelp-user-updated'

export function notifyUserProfileUpdated() {
  window.dispatchEvent(new CustomEvent(USER_PROFILE_UPDATED_EVENT))
}
