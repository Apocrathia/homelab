// CryptPad SSO plugin config (cryptpad/sso 0.6.0, loaded from lib/plugins/sso).
// Credentials are injected via OIDC_CLIENT_ID / OIDC_CLIENT_SECRET env vars
// from the cryptpad-secrets Secret; never put them in this file.
// Admin panel SSO settings, if used, are stored as decrees and override this.
module.exports = {
  // SSO login on this instance
  enabled: true,
  // Registration is SSO-only; existing local accounts can still log in
  enforced: true,
  // No extra CryptPad password prompt for SSO users
  cpPassword: false,
  forceCpPassword: false,
  list: [
    {
      name: "Authentik",
      type: "oidc",
      url: "https://auth.gateway.services.apocrathia.com/application/o/cryptpad/",
      client_id: process.env.OIDC_CLIENT_ID,
      client_secret: process.env.OIDC_CLIENT_SECRET,
      id_token_alg: "RS256",
      username_scope: "profile",
      username_claim: "preferred_username",
      use_pkce: true,
      use_nonce: true,
    },
  ],
};
