/**
 * Public interface of the User profile module (MODULE-BOUNDARIES section 2).
 */
export {
  defaultDisplayName,
  ensureProfile,
  exportProfile,
  getProfile,
  getUserClockContext,
  onboardingSteps,
  purgeProfile,
  updateOnboarding,
  updateProfile,
  type OnboardingInput,
  type OnboardingState,
  type PrimaryGoal,
  type ProfilePatch,
  type ProfileView,
  type Theme,
} from "./service";