const fontTracer = require('./lib/fontTracer');
const gatherStylesheetsWithPredicates = require('./lib/gatherStylesheetsWithPredicates');

module.exports = function(document) {
  return fontTracer(
    document,
    gatherStylesheetsWithPredicates(document),
    require('assetgraph/lib/util/fonts/getCssRulesByProperty')
  );
};
