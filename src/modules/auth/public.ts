/**
 * Public interface of the Authentication module (MODULE-BOUNDARIES section 2).
 * Only what another module or the adapter layer needs; nothing below it is exported.
 */
export {
  completePasswordReset,
  createVerifiedUser,
  currentIdentity,
  deviceLabel,
  listSignIns,
  registerWithPassword,
  requestPasswordReset,
  revokeOtherSignIns,
  revokeSignIn,
  signInWithPassword,
  signOut,
  type AuthDeps,
  type RegisterInput,
  type RequestContext,
  type SignInInput,
  type SignInView,
} from "./service";
export {
  auditRetentionCutoff,
  authCleanupJob,
  purgeExpiredResetTokens,
  purgeExpiredSessions,
  purgeUser,
  runAuthCleanup,
  type AuthCleanupResult,
} from "./cleanup";
export {
  createSession,
  resolveSession,
  type SessionIdentity,
  type NewSession,
} from "./sessions";

export {
  GOOGLE_PENDING_COOKIE,
  decodePending,
  encodePending,
  type PendingGoogle,
} from "./google";
export type { EmailMessage, MessageSender } from "./email-port";
export { hashPassword, verifyPassword } from "./password";
export {
  authorizeUrl,
  codeChallenge,
  completeGoogleSignIn,
  createStateCookie,
  decodeState,
  GOOGLE_STATE_COOKIE,
  safeNext,
  verifyIdToken,
  type GoogleConfig,
  type GooglePorts,
  type GoogleSignInResult,
  type GoogleTransport,
} from "./google";
export { deleteAuditEventsBefore, writeAuditEvent, type AuditContext } from "./audit";