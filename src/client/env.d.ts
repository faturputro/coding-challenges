/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENOBSERVE_CLIENT_TOKEN?: string;
  readonly VITE_OPENOBSERVE_SITE?: string;
  readonly VITE_OPENOBSERVE_ORG?: string;
  readonly VITE_OPENOBSERVE_APP_ID?: string;
  readonly VITE_APP_VERSION?: string;
}
