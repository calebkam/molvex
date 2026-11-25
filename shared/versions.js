/* One place for every version number. Bump a tool's number when you change that tool, and "site" when you change the home page.
   Keys match the folder names. Everything is at 0.4.1 as of 25 Nov 2026. */
window.CP_VERSIONS = {
  site: '0.4.1',
  'molvex': '0.4.1',
  'rapiddock': '0.4.1'
};
/* Display text: a number such as "0.4.1" is shown as "v0.4.1". */
window.cpVer = function (v) { return /^\d/.test(v) ? 'v' + v : v; };
