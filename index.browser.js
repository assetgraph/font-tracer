const fontTracer = require('./lib/fontTracer');
const gatherStylesheetsWithPredicates = require('./lib/gatherStylesheetsWithPredicates');

module.exports = function(document, options) {
  return fontTracer(document, {
    stylesheetsWithPredicates: gatherStylesheetsWithPredicates(document),
    getCssRulesByProperty: require('assetgraph/lib/util/fonts/getCssRulesByProperty'),
    ...options
  });
};
