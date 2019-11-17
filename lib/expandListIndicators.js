const _ = require('lodash');
const unquote = require('./unquote');
const unescapeCssString = require('./unescapeCssString');
const combinePredicates = require('./combinePredicates');
const counteraction = require('counteraction');
const createCounterRenderer = require('./createCounterRenderer');

function expandListIndicators(
  computedStyle,
  counterStyles,
  possibleListItemNumbers
) {
  computedStyle.props.text = computedStyle.props.text || [];
  if (computedStyle.props.display) {
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
                    const renderer = createCounterRenderer(
                      counterStyle.props,
                      counterStyles
                    );
                    computedStyle.props.text.push({
                      value: possibleListItemNumbers
                        .map(counterValue => renderer.render(counterValue))
                        .join(''),
                      isListIndicator: true,
                      predicates: combinedPredicates
                    });
                  }
                }
              }
              if (!found) {
                computedStyle.props.text.push({
                  value: possibleListItemNumbers
                    .map(listItemNumber =>
                      renderListItem(listItemNumber, listStyleType)
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
  }
  return _.omit(computedStyle, '');
}

function renderListItem(listItemNumber, listStyleType) {
  const renderer = counteraction(listStyleType);
  if (renderer) {
    return `${renderer.render(listItemNumber)}.`;
  } else {
    const matchSymbols = listStyleType.match(
      /symbols\(\s*(cyclic|numeric|alphabetic|symbolic|fixed)?(.*)\)$/
    );
    if (matchSymbols) {
      const system = matchSymbols[1] || 'numeric';
      return counteraction(system, { symbols: matchSymbols[2] }).render(
        listItemNumber
      );
    } else {
      return '';
    }
  }
}

module.exports = expandListIndicators;
