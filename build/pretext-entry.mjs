/**
 * Browser bundle entry for @chenglou/pretext (https://github.com/chenglou/pretext).
 * Built to js/pretext.bundle.js via: npm run build:pretext
 */
import {
  prepare,
  layout,
  prepareWithSegments,
  layoutWithLines,
  walkLineRanges,
  layoutNextLine,
  clearCache,
  setLocale,
} from '@chenglou/pretext';

window.Pretext = {
  prepare,
  layout,
  prepareWithSegments,
  layoutWithLines,
  walkLineRanges,
  layoutNextLine,
  clearCache,
  setLocale,
};
