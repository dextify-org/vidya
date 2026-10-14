import * as client from "openid-client";

const env = process.env;
const bool = (value, fallback) =>
  value === undefined || value === "" ? fallback : value === "true";

export const OIDC = {
  enabled: Boolean(env.OIDC_ISSUER_URL),
  issuerUrl: env.OIDC_ISSUER_URL,
  clientId: env.OIDC_CLIENT_ID,
  clientSecret: env.OIDC_CLIENT_SECRET,
  redirectUri: env.OIDC_REDIRECT_URI,
  scopes: env.OIDC_SCOPES || "openid profile email groups",
  buttonLabel: env.OIDC_BUTTON_LABEL || "Log in with SSO",
  usernameClaim: env.OIDC_USERNAME_CLAIM || "preferred_username",
  groupsClaim: env.OIDC_GROUPS_CLAIM || "groups",
  adminGroup: env.OIDC_ADMIN_GROUP,
  autoCreate: bool(env.OIDC_AUTO_CREATE, true),
  disableLocalLogin: bool(env.OIDC_DISABLE_LOCAL_LOGIN, false),
};

if (OIDC.enabled && (!OIDC.clientId || !OIDC.redirectUri)) {
  throw new Error(
    "OIDC_ISSUER_URL is set but OIDC_CLIENT_ID or OIDC_REDIRECT_URI is missing",
  );
}

export const localLoginEnabled = !(OIDC.enabled && OIDC.disableLocalLogin);

// Discovery is retried on the next login if the provider was unreachable.
let configPromise;
export const getOidcConfig = () => {
  configPromise ??= client
    .discovery(
      new URL(OIDC.issuerUrl),
      OIDC.clientId,
      OIDC.clientSecret,
      OIDC.clientSecret
        ? client.ClientSecretBasic(OIDC.clientSecret)
        : client.None(),
      OIDC.issuerUrl.startsWith("http://")
        ? { execute: [client.allowInsecureRequests] }
        : undefined,
    )
    .catch((error) => {
      configPromise = undefined;
      throw error;
    });
  return configPromise;
};
