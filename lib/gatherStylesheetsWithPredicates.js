function gatherStylesheetsWithPredicates(document) {
  const stylesheetsWithPredicates = [];
  for (const stylesheet of Array.from(document.styleSheets)) {
    const predicates = {};
    if (
      stylesheet.media &&
      stylesheet.media.mediaText &&
      stylesheet.media.mediaText !== 'all'
    ) {
      predicates[`mediaQuery:${stylesheet.media.mediaText}`] = true;
    }

    let cssRules;
    // Avoid crashing on stylesheets from other origins
    try {
      cssRules = stylesheet.cssRules;
    } catch (err) {
      continue;
    }
    stylesheetsWithPredicates.push({
      text: Array.from(cssRules)
        .map((cssRule) => cssRule.cssText)
        .join('\n'),

      predicates,
    });
  }
  return stylesheetsWithPredicates;
}

module.exports = gatherStylesheetsWithPredicates;
