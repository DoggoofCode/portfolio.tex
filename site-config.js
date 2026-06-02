const DEV_MODE_DEFAULT = true;
const PROD_OVERRIDE =
  typeof __PROD_OVERRIDE__ !== "undefined" ? __PROD_OVERRIDE__ : false;

export const DEV_MODE = PROD_OVERRIDE ? false : DEV_MODE_DEFAULT;
export const SITE_PASSWORD = "1234";
export const ALLOW_LOCAL_BYPASS = true;
