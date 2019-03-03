const _ = require('lodash');
const defaultStylesheets = require('./defaultStylesheets');
const stylePropObjectComparator = require('./stylePropObjectComparator');
const unquote = require('./unquote');
const memoizeSync = require('memoizesync');
const capitalize = require('capitalize');
const stripPseudoClassesFromSelector = require('./stripPseudoClassesFromSelector');
const extractTextFromContentPropertyValue = require('./extractTextFromContentPropertyValue');
const counterRendererByListStyleType = require('./counterRendererByListStyleType');
const unescapeCssString = require('./unescapeCssString');
const getCounterCharacters = require('./getCounterCharacters');
const expandPermutations = require('./expandPermutations');
const combinePredicates = require('./combinePredicates');
const arePredicatesExhaustive = require('./arePredicatesExhaustive');
const expandCustomProperties = require('./expandCustomProperties');
const cssFontParser = require('css-font-parser-papandreou');
const initialValueByProp = require('./initialValueByProp');
const cssFontWeightNames = require('css-font-weight-names');
const duplicateComputedStyle = require('./duplicateComputedStyle');

const FONT_PROPS = ['font-family', 'font-style', 'font-weight'];

function safeMatchesSelector(node, selector) {
  try {
    return node.matches(selector);
  } catch (err) {
    return false;
  }
}

function parseFontWeight(value) {
  let parsedValue = value;
  if (typeof parsedValue === 'string') {
    // FIXME: Stripping the +bolder... suffix here will not always yield the correct result
    // when expanding animations and transitions
    parsedValue = parsedValue.replace(/\+.*$/, '').toLowerCase();
  }
  parsedValue = parseFloat(cssFontWeightNames[parsedValue] || parsedValue);
  if (parsedValue >= 1 && parsedValue <= 1000) {
    return parsedValue;
  } else {
    return value;
  }
}

const CSS_PROPS_TO_TRACE = [
  ...FONT_PROPS,
  'content',
  'quotes',
  'list-style-type',
  'display',
  'animation-name',
  'text-transform',
  'transition-property',
  'transition-duration',
  'counter-increment',
  'counter-reset',
  'counter-set',
  'white-space'
];

const CSS_PROPS_TO_TRACE_AND_TEXT = ['text', ...CSS_PROPS_TO_TRACE];

const INHERITED = {
  'font-family': true,
  'font-weight': true,
  'font-style': true,
  content: false,
  quotes: true,
  'list-style-type': true,
  display: false,
  'animation-name': false,
  'text-transform': true,
  'transition-property': false,
  'transition-duration': false,
  'counter-increment': false,
  'counter-reset': false,
  'white-space': true
};

function createPredicatePermutations(predicatesToVary, predicates, i) {
  if (typeof i !== 'number') {
    i = 0;
  }
  if (i < predicatesToVary.length) {
    const permutations = [];
    for (const permutation of createPredicatePermutations(
      predicatesToVary,
      predicates,
      i + 1
    )) {
      const permutationWithPredicateOff = { ...permutation };
      let predicateValue = predicates[predicatesToVary[i]];
      if (typeof predicateValue === 'undefined') {
        predicateValue = true;
      }
      permutationWithPredicateOff[predicatesToVary[i]] = predicateValue;
      permutations.push(permutation, permutationWithPredicateOff);
    }
    return permutations;
  } else {
    return [{}];
  }
}

const excludedNodes = ['HEAD', 'STYLE', 'SCRIPT'];

function getFontRulesWithDefaultStylesheetApplied(
  stylesheetsWithPredicates,
  getCssRulesByProperty
) {
  const fontPropRules = [...defaultStylesheets, ...stylesheetsWithPredicates]
    .map(stylesheetAndIncomingMedia =>
      getCssRulesByProperty(
        CSS_PROPS_TO_TRACE,
        stylesheetAndIncomingMedia.text,
        stylesheetAndIncomingMedia.predicates
      )
    )
    .reduce((rules, current) => {
      // Input:
      // [
      //   {
      //     'font-style': [],
      //     'font-weight': [],
      //     'font-family': []
      //   },
      //   {
      //     'font-style': [],
      //     'font-weight': [],
      //     'font-family': []
      //   },
      //   {
      //     'font-style': [],
      //     'font-weight': [],
      //     'font-family': []
      //   }
      // ]

      // Output:
      // {
      //   'font-style': [[], [], []],
      //   'font-weight': [[], [], []],
      //   'font-family': [[], [], []]
      // }
      for (const prop of Object.keys(current)) {
        if (!rules[prop]) {
          rules[prop] = [];
        }

        rules[prop] = [...rules[prop], ...current[prop]];
      }

      return rules;
    }, {});

  for (const prop of Object.keys(fontPropRules)) {
    fontPropRules[prop].sort(stylePropObjectComparator(fontPropRules[prop]));
  }

  return fontPropRules;
}

function getMemoizedElementStyleResolver(fontPropRules, getCssRulesByProperty) {
  const nonInheritingTags = ['BUTTON', 'INPUT', 'OPTION', 'TEXTAREA'];

  const cssPropsAndCustomPropsToTrace = [
    ...CSS_PROPS_TO_TRACE,
    ...Object.keys(fontPropRules).filter(prop => /^--/.test(prop))
  ];

  const getComputedStyle = memoizeSync(
    (node, idArray, pseudoElementName, parentTrace, predicates) => {
      predicates = predicates || {};
      const localFontPropRules = { ...fontPropRules };
      const result = { props: {} };

      // Stop condition. We moved above <HTML>
      if (!node.tagName) {
        for (const prop of cssPropsAndCustomPropsToTrace) {
          result.props[prop] = [
            { value: initialValueByProp[prop], predicates, prop }
          ];
        }
        return result;
      }

      if (node.getAttribute('style')) {
        const attributeStyles = getCssRulesByProperty(
          cssPropsAndCustomPropsToTrace,
          `bogusselector { ${node.getAttribute('style')} }`,
          [],
          []
        );

        for (const prop of Object.keys(attributeStyles)) {
          if (attributeStyles[prop].length > 0) {
            const concatRules = [
              ...attributeStyles[prop],
              ...(localFontPropRules[prop] || [])
            ];
            localFontPropRules[prop] = concatRules.sort(
              stylePropObjectComparator(concatRules)
            );
          }
        }
      }

      let foundPseudoElement = false;

      function traceProp(prop, startIndex, predicates) {
        startIndex = startIndex || 0;
        const propDeclarations = localFontPropRules[prop] || [];
        for (let i = startIndex; i < propDeclarations.length; i += 1) {
          const declaration = propDeclarations[i];
          // Skip to the next rule if we are doing a trace where one of true predicates is already assumed false,
          // or one of the false predicates is already assumed true:
          if (
            Object.keys(declaration.predicates).some(
              predicate =>
                typeof predicates[predicate] === 'boolean' &&
                declaration.predicates[predicate] !== predicates[predicate]
            )
          ) {
            continue;
          }

          // Style attributes always have a specificity array of [1, 0, 0, 0]
          const isStyleAttribute = declaration.specificityArray[0] === 1;
          let strippedSelector =
            !isStyleAttribute &&
            stripPseudoClassesFromSelector(declaration.selector);
          const hasPseudoClasses = strippedSelector !== declaration.selector;
          let hasPseudoElement = false;

          if (!isStyleAttribute) {
            const matchPseudoElement = strippedSelector.match(
              /^(.*?)::?(before|after|first-letter|first-line|placeholder)$/i
            );
            if (matchPseudoElement) {
              hasPseudoElement = true;
              // The selector ends with :before, :after, :first-letter, or :first-line
              if (pseudoElementName === matchPseudoElement[2].toLowerCase()) {
                strippedSelector = matchPseudoElement[1];
              } else {
                // We're not currently tracing this pseudo element, skip this rule
                continue;
              }
            }
          }

          if (
            !prop.startsWith('--') &&
            !INHERITED[prop] &&
            !hasPseudoElement &&
            pseudoElementName
          ) {
            continue;
          }

          if (
            isStyleAttribute ||
            (!strippedSelector || safeMatchesSelector(node, strippedSelector))
          ) {
            if (hasPseudoElement) {
              foundPseudoElement = true;
            }
            let hypotheticalValues;
            if (
              declaration.value === 'inherit' ||
              declaration.value === 'unset'
            ) {
              hypotheticalValues = (
                parentTrace ||
                getComputedStyle(
                  node.parentNode,
                  idArray.slice(0, -1),
                  undefined,
                  undefined,
                  predicates
                )
              ).props[prop];
            } else if (
              prop === 'font-weight' &&
              (declaration.value === 'lighter' ||
                declaration.value === 'bolder')
            ) {
              hypotheticalValues = (
                parentTrace ||
                getComputedStyle(
                  node.parentNode,
                  idArray.slice(0, -1),
                  undefined,
                  undefined,
                  predicates
                )
              ).props[prop].map(inheritedHypotheticalValue => ({
                prop: inheritedHypotheticalValue.prop,
                value: `${inheritedHypotheticalValue.value}+${
                  declaration.value
                }`,
                predicates: inheritedHypotheticalValue
              }));
            } else {
              let value;
              if (declaration.value === 'initial') {
                value = initialValueByProp[prop];
              } else if (prop !== 'content' || hasPseudoElement) {
                // content: ... is not inherited, has to be applied directly to the pseudo element
                value = declaration.value;
              }

              hypotheticalValues = [
                { prop: declaration.prop, value, predicates }
              ];
            }

            const predicatesToVary = Object.keys(declaration.predicates);
            if (!isStyleAttribute && hasPseudoClasses) {
              predicatesToVary.push(
                `selectorWithPseudoClasses:${declaration.selector}`
              );
            }
            if (predicatesToVary.length > 0) {
              const multipliedHypotheticalValues = [];
              for (const predicatePermutation of createPredicatePermutations(
                predicatesToVary,
                declaration.predicates
              )) {
                const predicatePermutationKeys = Object.keys(
                  predicatePermutation
                );
                if (predicatePermutationKeys.length === 0) {
                  continue;
                }
                const predicatesForThisPermutation = combinePredicates([
                  predicates,
                  predicatePermutation
                ]);
                const predicatesOtherwise = combinePredicates([
                  predicates,
                  _.mapValues(predicatePermutation, value => !value)
                ]);
                if (
                  predicatesForThisPermutation &&
                  Object.keys(declaration.predicates).every(
                    predicate =>
                      declaration.predicates[predicate] ===
                      predicatesForThisPermutation[predicate]
                  )
                ) {
                  multipliedHypotheticalValues.push(
                    ...hypotheticalValues.map(hypotheticalValue => ({
                      prop: hypotheticalValue.prop,
                      value: hypotheticalValue.value,
                      predicates: predicatesForThisPermutation
                    }))
                  );
                }
                if (predicatesOtherwise) {
                  multipliedHypotheticalValues.push(
                    ...traceProp(prop, i + 1, predicatesOtherwise)
                  );
                }
              }
              hypotheticalValues = multipliedHypotheticalValues;
            }
            return hypotheticalValues;
          }
        }
        if (!nonInheritingTags.includes(node.tagName)) {
          return (
            parentTrace ||
            getComputedStyle(
              node.parentNode,
              idArray.slice(0, -1),
              undefined,
              undefined,
              predicates
            )
          ).props[prop];
        } else {
          return [{ prop, value: initialValueByProp[prop], predicates }];
        }
      }

      for (const prop of cssPropsAndCustomPropsToTrace) {
        result.props[prop] = traceProp(prop, 0, predicates);
      }
      if (pseudoElementName && !foundPseudoElement) {
        // We're tracing a pseudo element, but didn't match any rules
        return;
      }
      return result;
    },
    {
      argumentsStringifier(args) {
        // node, idArray, pseudoElementName, parentTrace, predicates
        if (args[3]) {
          // Bypass memoization if parentTrace is given
          return false;
        }
        return `${args[1].join(',')}\x1e${
          args[4]
            ? Object.keys(args[4])
                .map(key => `${key}\x1d${args[4][key]}`)
                .join('\x1d')
            : ''
        }${args[2] || ''}`;
      }
    }
  );

  return getComputedStyle;
}

function expandAnimations(computedStyle, keyframesDefinitions) {
  if (computedStyle.props['animation-name'].length > 0) {
    const isAnimatedByPropertyName = { 'animation-name': true };
    for (const animationNameValue of computedStyle.props['animation-name']) {
      for (const keyframesDefinition of keyframesDefinitions) {
        if (keyframesDefinition.name === animationNameValue.value) {
          keyframesDefinition.node.walkDecls(decl => {
            if (
              /^--/.test(decl.prop) ||
              CSS_PROPS_TO_TRACE.includes(decl.prop)
            ) {
              isAnimatedByPropertyName[decl.prop] = true;
            }
          });
        }
      }
    }
    const animatedPropertyNames = Object.keys(isAnimatedByPropertyName);
    if (animatedPropertyNames.length > 0) {
      // Create a 1-level deep copy with new value arrays so we can add more items
      // without mutating the caller's copy:
      computedStyle = duplicateComputedStyle(computedStyle);
      const extraValuesByProp = {};
      for (const permutation of expandPermutations(
        computedStyle.props,
        animatedPropertyNames
      )) {
        if (permutation['animation-name'].value !== 'none') {
          for (const keyframesDefinition of keyframesDefinitions) {
            if (
              keyframesDefinition.name === permutation['animation-name'].value
            ) {
              const seenValuesByProp = {};
              for (const prop of Object.keys(permutation)) {
                seenValuesByProp[prop] = [permutation[prop].value];
              }
              keyframesDefinition.node.walkDecls(decl => {
                if (
                  /^--/.test(decl.prop) ||
                  CSS_PROPS_TO_TRACE.includes(decl.prop)
                ) {
                  seenValuesByProp[decl.prop].push(decl.value);
                }
              });
              for (const prop of Object.keys(seenValuesByProp)) {
                let values = seenValuesByProp[prop];
                if (prop === 'font-weight') {
                  // https://drafts.csswg.org/css-transitions/#animtype-font-weight
                  const sortedValues = values.map(parseFontWeight).sort();
                  values = [];
                  for (
                    let fontWeight = sortedValues[0];
                    fontWeight <= sortedValues[sortedValues.length - 1];
                    fontWeight += 100
                  ) {
                    values.push(String(fontWeight));
                  }
                }
                for (const value of values) {
                  (extraValuesByProp[prop] =
                    extraValuesByProp[prop] || []).push({
                    prop,
                    value,
                    predicates: permutation['animation-name'].predicates
                  });
                }
              }
            }
          }
        }
      }
      for (const prop of Object.keys(extraValuesByProp)) {
        computedStyle.props[prop].push(...extraValuesByProp[prop]);
      }
    }
  }
  return computedStyle;
}

function expandTransitions(computedStyle) {
  const fontWeightTransitions = computedStyle.props[
    'transition-property'
  ].filter(hypotheticalValue =>
    /\b(?:font-weight|all)\b/.test(hypotheticalValue.value)
  );
  if (fontWeightTransitions.length > 0) {
    const hypotheticalFontWeightValuesInPseudoClassStates = computedStyle.props[
      'font-weight'
    ].filter(hypotheticalValue =>
      Object.keys(hypotheticalValue.predicates).some(
        predicate =>
          hypotheticalValue.predicates[predicate] &&
          /^selectorWithPseudoClasses:/.test(predicate)
      )
    );
    if (hypotheticalFontWeightValuesInPseudoClassStates.length > 0) {
      const hypotheticalNonZeroTransitionDurations = computedStyle.props[
        'transition-duration'
      ].filter(
        hypotheticalValue =>
          !/^\s*0s\s*(,\s*0s\s*)*$/.test(hypotheticalValue.value)
      );
      if (hypotheticalNonZeroTransitionDurations.length > 0) {
        const extraHypotheticalFontWeightValues = [];
        for (const transitionDuration of hypotheticalNonZeroTransitionDurations) {
          for (const fontWeightTransition of fontWeightTransitions) {
            for (const hypotheticalFontWeightValueInPseudoClassStates of hypotheticalFontWeightValuesInPseudoClassStates) {
              for (const hypotheticalFontWeightValue of computedStyle.props[
                'font-weight'
              ]) {
                const fontWeightEndPoints = [
                  hypotheticalFontWeightValue.value,
                  hypotheticalFontWeightValueInPseudoClassStates.value
                ].map(parseFontWeight);
                for (
                  let fontWeight = Math.min(...fontWeightEndPoints) + 100;
                  fontWeight < Math.max(...fontWeightEndPoints);
                  fontWeight += 100
                ) {
                  // Explicitly don't include hypotheticalFontWeightValueInPseudoClassStates.predicates
                  const combinedPredicates = combinePredicates([
                    transitionDuration.predicates,
                    fontWeightTransition.predicates,
                    hypotheticalFontWeightValue.predicates
                  ]);
                  if (combinedPredicates) {
                    extraHypotheticalFontWeightValues.push({
                      prop: 'font-weight',
                      value: String(fontWeight),
                      predicates: combinedPredicates
                    });
                  }
                }
              }
            }
          }
        }
        if (extraHypotheticalFontWeightValues.length > 0) {
          // Create a shallow copy and add the extra hypothetical font-weight values
          computedStyle = duplicateComputedStyle(computedStyle);
          computedStyle.props['font-weight'] = [
            ...computedStyle.props['font-weight'],
            ...extraHypotheticalFontWeightValues
          ];
        }
      }
    }
  }
  return computedStyle;
}

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

// null represents <br>
function normalizeTextNodeValues(textNodeValues, whiteSpaceValue) {
  return textNodeValues
    .map(textNodeValue =>
      textNodeValue === null
        ? '\n'
        : /^pre/i.test(whiteSpaceValue)
        ? textNodeValue
        : textNodeValue.replace(/\n/g, ' ')
    )
    .join('');
}

// htmlAsset is optional
function fontTracer(
  document,
  stylesheetsWithPredicates,
  getCssRulesByProperty,
  htmlAsset
) {
  const fontPropRules = getFontRulesWithDefaultStylesheetApplied(
    stylesheetsWithPredicates,
    getCssRulesByProperty
  );
  const getComputedStyle = getMemoizedElementStyleResolver(
    fontPropRules,
    getCssRulesByProperty
  );

  const hypotheticalCounterStylesByName = {};
  for (const counterStyle of fontPropRules.counterStyles) {
    (hypotheticalCounterStylesByName[counterStyle.name] =
      hypotheticalCounterStylesByName[counterStyle.name] || []).push({
      value: counterStyle.props,
      predicates: counterStyle.predicates
    });
  }

  const visualValueInputTypes = [
    'date',
    'datetime-local',
    'email',
    'month',
    'number',
    'reset',
    'search',
    'submit',
    'tel',
    'text',
    'time',
    'url',
    'week'
  ];

  const possibleNextListItemNumberStack = [[1]];
  let possibleCounterValuesByName = {};

  function adjustPossibleCountersAndListItemNumbers(
    computedStyle,
    isWithinConditionalCommentOrNoscript
  ) {
    let numHypotheticalListItems = 0;
    for (const hypotheticalDisplayValue of computedStyle.props.display) {
      if (/\blist-item\b/.test(hypotheticalDisplayValue.value)) {
        numHypotheticalListItems += 1;
      }
    }
    let nextPossibleCounterValuesByName = {};
    for (const propertyName of ['counter-reset', 'counter-set']) {
      const values = _.uniq(
        computedStyle.props[propertyName].map(
          hypotheticalCounterResetValue => hypotheticalCounterResetValue.value
        )
      );
      for (const value of values) {
        const valueByCounterName = {};
        if (value !== 'none') {
          const tokens = value.split(/\s+/);
          for (let i = 0; i < tokens.length; i += 1) {
            const counterName = tokens[i];
            let resetValue = 0;
            if (/^-?\d+$/.test(tokens[i + 1])) {
              resetValue = parseInt(tokens[i + 1], 10);
              i += 1;
            }
            valueByCounterName[counterName] = resetValue;
          }
        }
        for (const counterName of Object.keys(valueByCounterName)) {
          for (const possibleCounterValue of possibleCounterValuesByName[
            counterName
          ] || [0]) {
            (nextPossibleCounterValuesByName[counterName] =
              nextPossibleCounterValuesByName[counterName] || []).push(
              valueByCounterName[counterName] + possibleCounterValue
            );
          }
        }
        for (const counterName of Object.keys(possibleCounterValuesByName)) {
          if (!valueByCounterName[counterName]) {
            nextPossibleCounterValuesByName[counterName] = [
              ...possibleCounterValuesByName[counterName]
            ];
          }
        }
      }
    }

    possibleCounterValuesByName = nextPossibleCounterValuesByName;
    nextPossibleCounterValuesByName = {};

    const counterIncrementValues = _.uniq(
      computedStyle.props['counter-increment'].map(
        hypotheticalCounterIncrementValue =>
          hypotheticalCounterIncrementValue.value
      )
    );
    const counterIncrementsByName = {};
    for (const counterIncrementValue of counterIncrementValues) {
      if (counterIncrementValue !== 'none') {
        const tokens = counterIncrementValue.split(/\s+/);
        for (let i = 0; i < tokens.length; i += 1) {
          const counterName = tokens[i];
          let increment = 1;
          if (/^-?\d+$/.test(tokens[i + 1])) {
            increment = parseInt(tokens[i + 1], 10);
            i += 1;
          }
          (counterIncrementsByName[counterName] =
            counterIncrementsByName[counterName] || []).push(increment);
        }
      }
    }
    for (const counterName of Object.keys(counterIncrementsByName)) {
      for (const possibleCounterValue of possibleCounterValuesByName[
        counterName
      ] || [0]) {
        for (const counterIncrement of counterIncrementsByName[counterName]) {
          (nextPossibleCounterValuesByName[counterName] =
            nextPossibleCounterValuesByName[counterName] || []).push(
            possibleCounterValue + counterIncrement
          );
        }
      }
    }
    for (const counterName of Object.keys(possibleCounterValuesByName)) {
      if (!counterIncrementsByName[counterName]) {
        nextPossibleCounterValuesByName[counterName] = [
          ...possibleCounterValuesByName[counterName]
        ];
      }
    }
    possibleCounterValuesByName = nextPossibleCounterValuesByName;
    for (const counterName of Object.keys(possibleCounterValuesByName)) {
      possibleCounterValuesByName[counterName] = _.uniq(
        possibleCounterValuesByName[counterName]
      );
    }
    if (numHypotheticalListItems > 0) {
      if (
        numHypotheticalListItems === computedStyle.props.display.length &&
        !isWithinConditionalCommentOrNoscript
      ) {
        possibleNextListItemNumberStack[
          possibleNextListItemNumberStack.length - 1
        ] = possibleNextListItemNumberStack[
          possibleNextListItemNumberStack.length - 1
        ].map(
          potentialPrecedingListItemCount => potentialPrecedingListItemCount + 1
        );
      } else {
        possibleNextListItemNumberStack[
          possibleNextListItemNumberStack.length - 1
        ] = _.uniq([
          ...possibleNextListItemNumberStack[
            possibleNextListItemNumberStack.length - 1
          ],
          ...possibleNextListItemNumberStack[
            possibleNextListItemNumberStack.length - 1
          ].map(
            potentialPrecedingListItemCount =>
              potentialPrecedingListItemCount + 1
          )
        ]);
      }
    }
    return computedStyle;
  }

  const conditionalCommentStack = [];
  const noscriptStack = [];

  function expandComputedStyle(computedStyle) {
    return expandListIndicators(
      expandCustomProperties(
        expandTransitions(
          expandAnimations(computedStyle, fontPropRules.keyframes)
        )
      ),
      fontPropRules.counterStyles,
      possibleNextListItemNumberStack[
        possibleNextListItemNumberStack.length - 1
      ]
    );
  }

  function traceBeforeOrAfterPseudoElement(pseudoElementName, node, idArray) {
    const styledTexts = [];
    let computedStyle = getComputedStyle(node, idArray, pseudoElementName);
    if (computedStyle) {
      computedStyle = expandComputedStyle({ ...computedStyle });
      const expandedContents = [];
      // Multiply the hypothetical content values with the hypothetical quotes values:
      for (const hypotheticalContent of computedStyle.props.content) {
        const hypotheticalValues = extractTextFromContentPropertyValue(
          hypotheticalContent.value,
          node,
          computedStyle.props.quotes,
          hypotheticalCounterStylesByName,
          possibleCounterValuesByName
        );
        for (const hypotheticalValue of hypotheticalValues) {
          hypotheticalValue.predicates = combinePredicates([
            hypotheticalValue.predicates,
            hypotheticalContent.predicates
          ]);
          if (hypotheticalValue.predicates) {
            expandedContents.push(hypotheticalValue);
          }
        }
      }
      computedStyle.props.text = expandedContents;
      const styledText = adjustPossibleCountersAndListItemNumbers(
        computedStyle,
        conditionalCommentStack.length > 0 || noscriptStack.length > 0
      );
      styledText.props.text = styledText.props.text.filter(
        hypotheticalText => hypotheticalText.value.length > 0
      );
      if (styledText.props.text.length > 0) {
        styledTexts.push(styledText);
      }
      return styledTexts;
    }
  }

  function expandFirstLineAndFirstLetter(groupedStyledTexts, node, idArray) {
    for (const pseudoElementName of ['first-line', 'first-letter']) {
      const additionalStyledTexts = [];
      // Whether there's a perfect overlap between the predicates of the existing styled texts we've "taken bites" of:
      let aligned = true;
      groupedStyledTexts.some(styledTextsInSection => {
        let allExhaustive = false;
        // Keep track of whether we have consumed all the required characters:
        let done = true;
        for (let i = 0; i < styledTextsInSection.length; i += 1) {
          const styledTextInSection = styledTextsInSection[i];
          const thisExhaustive = Object.keys(styledTextInSection.props).every(
            prop =>
              arePredicatesExhaustive(
                styledTextInSection.props[prop].map(
                  hypotheticalValue => hypotheticalValue.predicates
                )
              )
          );
          allExhaustive = allExhaustive || thisExhaustive;

          const pseudoElementStyle = getComputedStyle(
            node,
            idArray.slice(0, -1),
            pseudoElementName,
            styledTextInSection
          );
          if (pseudoElementStyle) {
            for (const hypotheticalValue of styledTextInSection.props.text) {
              let matchContent;
              if (pseudoElementName === 'first-letter') {
                matchContent = hypotheticalValue.value.match(
                  /^(\s*"?\s*\w|\s*"\s*\w?)/
                );
              } else {
                // pseudoElementName === 'first-line'
                matchContent = hypotheticalValue.value.match(/^([^\n]+)/);
                done = false;
              }
              if (matchContent) {
                const content = matchContent[1];
                pseudoElementStyle.props.text = [
                  {
                    value: content,
                    predicates: hypotheticalValue.predicates
                  }
                ];
                additionalStyledTexts.push(pseudoElementStyle);
                if (aligned) {
                  if (pseudoElementName === 'first-letter') {
                    hypotheticalValue.value = hypotheticalValue.value.substr(
                      content.length
                    );
                  } else if (pseudoElementName === 'first-line') {
                    done = hypotheticalValue.value.includes('\n');
                  }
                }
              } else {
                done = false;
              }
            }
          }
        }
        if (allExhaustive && done) {
          // Short circuit -- no need to proceed to the next section
          return true;
        } else if (!done) {
          aligned = false;
        }
      });
      groupedStyledTexts[0].unshift(...additionalStyledTexts);
    }
  }

  const styledTexts = [];

  (function traversePreOrder(node, idArray) {
    const textNodeValues = [];
    if (node.nodeType === node.TEXT_NODE) {
      const textContent = node.nodeValue
        .replace(/⋖\d+⋗/g, templatePlaceholder => {
          if (
            htmlAsset &&
            htmlAsset._templateReplacements[templatePlaceholder]
          ) {
            return '';
          } else {
            return templatePlaceholder;
          }
        })
        .replace(/\xad/g, '-'); // Include an actual hyphen when there's a soft hyphen:
      if (textContent) {
        textNodeValues.push(textContent);
      }
    } else if (node.nodeType === node.COMMENT_NODE) {
      if (/^\s*\[if\s+!IE\s*\]\s*>\s*$/i.test(node.nodeValue)) {
        // Start of non-IE conditional comment where the markup is in the containing document:
        conditionalCommentStack.push(true);
      } else if (/^\s*<!\[\s*endif\s*\]\s*$/.test(node.nodeValue)) {
        // End of non-IE conditional comment where the markup is in the containing document:
        conditionalCommentStack.pop();
      } else {
        // See if this is a conditional comment where the markup is in the comment value:
        htmlAsset &&
          htmlAsset.outgoingRelations.some(relation => {
            if (
              relation.type === 'HtmlConditionalComment' &&
              relation.node === node
            ) {
              conditionalCommentStack.push(true);
              const conditionalCommentDocument = relation.to.parseTree;
              let isWithinBody = false;
              for (
                let i = 0;
                i < conditionalCommentDocument.childNodes.length;
                i += 1
              ) {
                const childNode = conditionalCommentDocument.childNodes[i];
                // Don't proceed unless we're between
                // <!--ASSETGRAPH DOCUMENT START MARKER--> and <!--ASSETGRAPH DOCUMENT END MARKER-->
                if (childNode.nodeType === childNode.COMMENT_NODE) {
                  if (
                    childNode.nodeValue === 'ASSETGRAPH DOCUMENT START MARKER'
                  ) {
                    isWithinBody = true;
                    continue;
                  } else if (
                    childNode.nodeValue === 'ASSETGRAPH DOCUMENT END MARKER'
                  ) {
                    break;
                  }
                } else if (!isWithinBody) {
                  continue;
                }
                // Fake that the node in the conditional comment has the parent element of the comment as its parentElement
                // so that the correct CSS selectors match:
                Object.defineProperty(childNode, 'parentElement', {
                  configurable: true,
                  get() {
                    return node.parentElement;
                  }
                });
                textNodeValues.push(
                  ...traversePreOrder(childNode, [...idArray, i])
                );
                delete childNode.parentElement;
              }
              conditionalCommentStack.pop();
              // Short circuit
              return true;
            }
          });
      }
    } else if (
      node.nodeType === node.ELEMENT_NODE &&
      !excludedNodes.includes(node.tagName)
    ) {
      if (!idArray) {
        idArray = [0];
      }

      if (node.tagName === 'NOSCRIPT') {
        htmlAsset &&
          htmlAsset.outgoingRelations.some(relation => {
            if (relation.type === 'HtmlNoscript' && relation.node === node) {
              noscriptStack.push(true);
              const noscriptDocument = relation.to.parseTree;
              for (let i = 0; i < noscriptDocument.childNodes.length; i += 1) {
                const childNode = noscriptDocument.childNodes[i];
                // Fake that the top-level node in the inline asset has the <noscript> as its parentNode
                // so that the correct CSS selectors match:
                Object.defineProperty(childNode, 'parentElement', {
                  configurable: true,
                  get() {
                    return node;
                  }
                });
                textNodeValues.push(
                  ...traversePreOrder(childNode, [...idArray, i])
                );
                delete childNode.parentElement;
              }
              noscriptStack.pop();
              // Short circuit
              return true;
            }
          });
      } else if (
        node.tagName === 'INPUT' &&
        visualValueInputTypes.includes(node.type || 'text')
      ) {
        // Inputs might have visual text, but don't have childNodes
        const inputValue = (node.value || '').trim();
        const inputPlaceholder = (node.placeholder || '').trim();

        if (inputValue) {
          const inputValueComputedStyle = duplicateComputedStyle(
            expandComputedStyle(getComputedStyle(node, idArray))
          );
          inputValueComputedStyle.props.text = [
            { value: inputValue, predicates: {} }
          ];
          styledTexts.push(inputValueComputedStyle);
        }

        if (inputPlaceholder) {
          // Stupidly named var to avoid clash, fix after merging to master where const and let can be used
          const elementComputedStyle = duplicateComputedStyle(
            getComputedStyle(node, idArray)
          );

          const placeholderComputedStyle =
            getComputedStyle(
              node,
              idArray,
              'placeholder',
              elementComputedStyle
            ) || elementComputedStyle;

          placeholderComputedStyle.props.text = [
            { value: inputPlaceholder, predicates: {} }
          ];

          styledTexts.push(expandComputedStyle(placeholderComputedStyle));
        }
      } else if (node.nodeType === node.ELEMENT_NODE) {
        if (node.constructor.name === 'HTMLBRElement') {
          textNodeValues.push(null);
        } else {
          const computedStyle = duplicateComputedStyle(
            getComputedStyle(node, idArray)
          );
          computedStyle.props.text = [{ value: '', predicates: {} }];

          styledTexts.push(
            adjustPossibleCountersAndListItemNumbers(
              expandComputedStyle(computedStyle),
              conditionalCommentStack.length > 0 || noscriptStack.length > 0
            )
          );
          possibleNextListItemNumberStack.push([1]);

          const beforeStyledTexts = traceBeforeOrAfterPseudoElement(
            'before',
            node,
            idArray
          );
          const afterStyledTexts = traceBeforeOrAfterPseudoElement(
            'after',
            node,
            idArray
          );

          const childTextNodeValues = _.flatten(
            [].slice
              .call(node.childNodes)
              .map((childNode, i) =>
                traversePreOrder(childNode, [...idArray, i])
              )
          );
          const tracedTextNodes = [];
          if (childTextNodeValues.length > 0) {
            for (const hypotheticalValue of computedStyle.props[
              'white-space'
            ]) {
              const normalizedText = normalizeTextNodeValues(
                childTextNodeValues,
                hypotheticalValue.value
              );
              if (normalizedText) {
                const textComputedStyle = duplicateComputedStyle(computedStyle);
                textComputedStyle.props.text = [
                  {
                    value: normalizedText,
                    predicates: hypotheticalValue.predicates
                  }
                ];
                tracedTextNodes.push(expandComputedStyle(textComputedStyle));
              }
            }
          }
          const groupedStyledTexts = _.compact([
            beforeStyledTexts,
            tracedTextNodes,
            afterStyledTexts
          ]);
          expandFirstLineAndFirstLetter(groupedStyledTexts, node, idArray);
          styledTexts.push(..._.flattenDeep(groupedStyledTexts));
          possibleNextListItemNumberStack.pop();
        }
      }
    }
    return textNodeValues;
  })(document.body.parentNode);

  // propsByText Before:
  // [
  //   {
  //     text: 'foo',
  //     props: {
  //       'font-family': [ { value: 'a', predicates: {...} }, { value: 'b', predicates: {...} }],
  //       'font-style': [ { value: 'normal', predicates: {...} } ],
  //       'font-weight': [ { value: 400, predicates: {...} }, { value: 700, predicates: {...} }]
  //      }
  //   },
  //   ...
  // ]

  // Extract longhand property values from font shorthands
  for (const styledText of styledTexts) {
    for (const prop of ['font-family', 'font-weight', 'font-style']) {
      for (const [i, hypotheticalValue] of styledText.props[prop].entries()) {
        let value = hypotheticalValue.value;

        if (value) {
          if (hypotheticalValue.prop === 'font') {
            const fontProperties = cssFontParser(value);
            value =
              (fontProperties && fontProperties[prop]) ||
              initialValueByProp[prop];
          }
          if (prop === 'font-family' && Array.isArray(value)) {
            value = value.join(', ');
          }
          if (value !== hypotheticalValue.value) {
            styledText.props[prop].splice(i, 1, {
              predicates: hypotheticalValue.predicates,
              prop,
              value
            });
          }
        }
      }
    }
  }

  const seenPermutationByKey = {};
  const multipliedStyledTexts = _.flatten(
    styledTexts.map(styledText =>
      expandPermutations(styledText.props)
        .map(props => ({
          props
        }))
        .filter(function removeImpossibleCombinations(styledText) {
          return CSS_PROPS_TO_TRACE_AND_TEXT.every(prop => {
            return Object.keys(styledText.props[prop].predicates).every(
              predicate => {
                const predicateValue =
                  styledText.props[prop].predicates[predicate];
                return (
                  predicateValue === false ||
                  CSS_PROPS_TO_TRACE_AND_TEXT.every(
                    otherProp =>
                      styledText.props[otherProp].predicates[predicate] !==
                      false
                  )
                );
              }
            );
          });
        })
        .map(styledText => {
          // Strip the "hypothetical" wrapper objects around the values:
          const transformedStyledText = { props: {} };
          for (const prop of CSS_PROPS_TO_TRACE) {
            transformedStyledText.props[prop] = styledText.props[prop].value;
          }

          let text = styledText.props.text.value;
          // Apply text-transform:
          const textTransform = styledText.props['text-transform'].value;
          if (
            textTransform !== 'none' &&
            !styledText.props.text.isListIndicator
          ) {
            if (textTransform === 'uppercase') {
              text = text.toUpperCase();
            } else if (textTransform === 'lowercase') {
              text = text.toLowerCase();
            } else if (textTransform === 'capitalize') {
              text = capitalize.words(text);
            }
          }
          transformedStyledText.props.text = text;
          return transformedStyledText;
        })
        .filter(function filterAndDeduplicate(styledText) {
          if (
            !styledText.props.text ||
            styledText.display.toLowerCase() === 'none'
          ) {
            return false;
          }
          // Unwrap the "hypothetical value" objects:
          let permutationKey = '';
          for (const prop of [
            'font-weight',
            'font-style',
            'font-family',
            'text'
          ]) {
            permutationKey += `${prop}\x1d${styledText.props[prop]}\x1d`;
          }

          // Deduplicate:
          if (!seenPermutationByKey[permutationKey]) {
            seenPermutationByKey[permutationKey] = true;
            return true;
          }
        })
        // Maybe this mapping step isn't necessary:
        .map(styledText => ({
          text: styledText.props.text,
          props: _.pick(styledText.props, FONT_PROPS)
        }))
    )
  );

  // multipliedStyledTexts After:
  // [
  //   {
  //     text: 'foo',
  //     props: {
  //       'font-family': 'a',
  //       'font-style': 'normal',
  //       'font-weight': 400
  //     }
  //   },
  //   {
  //     text: 'foo',
  //     props: {
  //       'font-family': 'b',
  //       'font-style': 'normal',
  //       'font-weight': 400
  //     }
  //   },
  //   {
  //     text: 'foo',
  //     props: {
  //       'font-family': 'a',
  //       'font-style': 'normal',
  //       'font-weight': 700
  //     }
  //   },
  //   {
  //     text: 'foo',
  //     props: {
  //       'font-family': 'b',
  //       'font-style': 'normal',
  //       'font-weight': 700
  //     }
  //   },
  //   ...
  // ]

  return multipliedStyledTexts;
}

module.exports = fontTracer;

fontTracer.counterRenderers = counterRendererByListStyleType;
