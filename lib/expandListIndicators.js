const _ = require('lodash');
const unquote = require('./unquote');
const unescapeCssString = require('./unescapeCssString');
const getCounterCharacters = require('./getCounterCharacters');
const combinePredicates = require('./combinePredicates');
const counterRendererByListStyleType = require('./counterRendererByListStyleType');

function expandListIndicators(
  computedStyle,
  counterStyles,
  possibleListItemNumbers
) {
  computedStyle.props.text = computedStyle.props.text || [];
  for (let i = 0; i < computedStyle.props.display.length; i += 1) {
    if (/\blist-item\b/.test(computedStyle.props.display[i].value)) {
      for (
        let j = 0;
        j < computedStyle.props['list-style-type'].length;
        j += 1
      ) {
        const listStyleType = computedStyle.props['list-style-type'][j].value;
        const predicates = combinePredicates([
          computedStyle.props.display[i].predicates,
          computedStyle.props['list-style-type'][j].predicates
        ]);
        if (predicates) {
          if (/^['"]/.test(listStyleType)) {
            computedStyle.props.text.push({
              value: unescapeCssString(unquote(listStyleType)),
              isListIndicator: true,
              predicates
            });
          } else {
            let found = false;
            for (const counterStyle of counterStyles) {
              if (counterStyle.name === listStyleType) {
                const combinedPredicates = combinePredicates([
                  predicates,
                  counterStyle.predicates
                ]);
                if (combinedPredicates) {
                  found = true;
                  computedStyle.props.text.push({
                    value: getCounterCharacters(
                      counterStyle,
                      counterStyles,
                      possibleListItemNumbers
                    ),
                    isListIndicator: true,
                    predicates: combinedPredicates
                  });
                }
              }
            }
            if (!found) {
              computedStyle.props.text.push({
                value: possibleListItemNumbers
                  .map(
                    listItemNumber =>
                      `${counterRendererByListStyleType[listStyleType](
                        listItemNumber
                      )}.`
                  )
                  .join(''),
                isListIndicator: true,
                predicates
              });
            }
          }
        }
      }
    }
  }
  // ??
  return _.omit(computedStyle, '');
}

module.exports = expandListIndicators;
