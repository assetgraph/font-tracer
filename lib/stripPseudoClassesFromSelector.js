const multiPseudoClassMatcher =
  /(?::(?:active|any|checked|default|empty|enabled|fullscreen|focus|hover|indeterminate|in-range|invalid|link|optional|out-of-range|read-only|read-write|scope|target|valid|visited))+/gi;

const cssCombinators = [' ', '>', '+', '~', '/'];

function stripPseudoClassesFromSelector(str) {
  return str.replace(multiPseudoClassMatcher, (match, offset) => {
    if (offset === 0) {
      return '*';
    }

    if (cssCombinators.includes(str.charAt(offset - 1))) {
      return '*';
    }

    return '';
  });
}

module.exports = stripPseudoClassesFromSelector;
