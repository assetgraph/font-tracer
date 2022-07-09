const _ = require('lodash');
const postcssValueParser = require('postcss-value-parser');

const defaultStylesheets = require('./defaultStylesheets');
const stylePropObjectComparator = require('./stylePropObjectComparator');
const memoizeSync = require('memoizesync');
const applyTextTransform = require('./applyTextTransform');
const stripPseudoClassesFromSelector = require('./stripPseudoClassesFromSelector');
const extractTextFromContentPropertyValue = require('./extractTextFromContentPropertyValue');
const expandPermutations = require('./expandPermutations');
const combinePredicates = require('./combinePredicates');
const cssFontParser = require('css-font-parser-papandreou');
const initialValueByProp = require('./initialValueByProp');
const duplicateComputedStyle = require('./duplicateComputedStyle');

const expandAnimations = require('./expandAnimations');
const expandTransitions = require('./expandTransitions');
const expandCustomProperties = require('./expandCustomProperties');
const expandListIndicators = require('./expandListIndicators');

const expandFirstLineAndFirstLetter = require('./expandFirstLineAndFirstLetter');

function safeMatchesSelector(node, selector) {
  try {
    return node.matches(selector);
  } catch (err) {
    return false;
  }
}

const CSS_PROPS_REQUIRED_FOR_TEXT = [
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
  'white-space',
];

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
  'white-space': true,
};

const SVG_NAMESPACE_URI = 'http://www.w3.org/2000/svg';

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
  getCssRulesByProperty,
  cssPropsToTrace
) {
  const fontPropRules = [...defaultStylesheets, ...stylesheetsWithPredicates]
    .map((stylesheetAndIncomingMedia) =>
      getCssRulesByProperty(
        cssPropsToTrace,
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

const specificity = require('specificity');
function specificityComparator(a, b) {
  // Compare importance
  const importanceComparison = b.important - a.important;

  if (importanceComparison !== 0) {
    return importanceComparison;
  }

  // Compare specificity
  return -specificity.compare(a.specificityArray, b.specificityArray);
}

function* createDeclarationGenerator(
  node,
  prop,
  fontPropRules,
  attributeStyles
) {
  const attributeStylesForProp =
    attributeStyles &&
    attributeStyles[prop] &&
    attributeStyles[prop].length > 0 &&
    attributeStyles[prop];

  if (fontPropRules[prop]) {
    if (attributeStylesForProp) {
      let i = 0;
      let j = 0;
      while (
        i < attributeStylesForProp.length &&
        j < fontPropRules[prop].length
      ) {
        if (
          specificityComparator(
            attributeStylesForProp[i],
            fontPropRules[prop][j]
          ) <= 0
        ) {
          yield attributeStylesForProp[i];
          i += 1;
        } else {
          yield fontPropRules[prop][j];
          j += 1;
        }
      }
      while (i < attributeStylesForProp.length) {
        yield attributeStylesForProp[i];
        i += 1;
      }
      while (j < fontPropRules[prop].length) {
        yield fontPropRules[prop][j];
        j += 1;
      }
    } else {
      yield* fontPropRules[prop];
    }
  } else if (attributeStylesForProp) {
    yield* attributeStylesForProp;
  }

  if (node.namespaceURI === SVG_NAMESPACE_URI) {
    if (node.hasAttribute(prop)) {
      yield {
        namespaceURI: SVG_NAMESPACE_URI,
        selector: '*',
        predicates: {},
        prop,
        value: node.getAttribute(prop),
        specificityArray: [0, 0, 0, 0],
      };
    }
  }
}

function getMemoizedElementStyleResolver(
  fontPropRules,
  getCssRulesByProperty,
  cssPropsToTrace
) {
  const nonInheritingTags = ['BUTTON', 'INPUT', 'OPTION', 'TEXTAREA'];

  const cssPropsAndCustomPropsToTrace = [
    ...cssPropsToTrace,
    ...Object.keys(fontPropRules).filter((prop) => /^--/.test(prop)),
  ];

  const getComputedStyle = memoizeSync(
    (node, idArray, pseudoElementName, parentTrace, predicates) => {
      predicates = predicates || {};
      const result = { node, pseudoElementName, props: {} };

      // Stop condition. We moved above <HTML>
      if (!node.tagName) {
        for (const prop of cssPropsAndCustomPropsToTrace) {
          result.props[prop] = [
            { value: initialValueByProp[prop], predicates, prop },
          ];
        }
        return result;
      }

      const attributeStyles =
        node.hasAttribute('style') &&
        getCssRulesByProperty(
          cssPropsAndCustomPropsToTrace,
          `bogusselector { ${node.getAttribute('style')} }`,
          [],
          []
        );

      let foundPseudoElement = false;

      function traceProp(prop, startIndex, predicates) {
        startIndex = startIndex || 0;
        let i = 0;
        for (const declaration of createDeclarationGenerator(
          node,
          prop,
          fontPropRules,
          attributeStyles
        )) {
          if (i < startIndex) {
            i += 1;
            continue;
          }
          // Skip to the next rule if we are doing a trace where one of true predicates is already assumed false,
          // or one of the false predicates is already assumed true:
          if (
            Object.keys(declaration.predicates).some(
              (predicate) =>
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
            !strippedSelector ||
            ((!declaration.namespaceURI ||
              node.namespaceURI === declaration.namespaceURI) &&
              safeMatchesSelector(node, strippedSelector))
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
              ).props[prop].map((inheritedHypotheticalValue) => ({
                prop: inheritedHypotheticalValue.prop,
                value: `${inheritedHypotheticalValue.value}+${declaration.value}`,
                predicates: inheritedHypotheticalValue,
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
                { prop: declaration.prop, value, predicates },
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
                const predicatePermutationKeys =
                  Object.keys(predicatePermutation);
                if (predicatePermutationKeys.length === 0) {
                  continue;
                }
                const predicatesForThisPermutation = combinePredicates([
                  predicates,
                  predicatePermutation,
                ]);
                const predicatesOtherwise = combinePredicates([
                  predicates,
                  _.mapValues(predicatePermutation, (value) => !value),
                ]);
                if (
                  predicatesForThisPermutation &&
                  Object.keys(declaration.predicates).every(
                    (predicate) =>
                      declaration.predicates[predicate] ===
                      predicatesForThisPermutation[predicate]
                  )
                ) {
                  multipliedHypotheticalValues.push(
                    ...hypotheticalValues.map((hypotheticalValue) => ({
                      prop: hypotheticalValue.prop,
                      value: hypotheticalValue.value,
                      predicates: predicatesForThisPermutation,
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
          i += 1;
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
                .map((key) => `${key}\x1d${args[4][key]}`)
                .join('\x1d')
            : ''
        }${args[2] || ''}`;
      },
    }
  );

  return getComputedStyle;
}

// null represents <br>
function normalizeTextNodeValues(textNodeValues, whiteSpaceValue) {
  return textNodeValues
    .map((textNodeValue) =>
      textNodeValue === null
        ? '\n'
        : /^pre/i.test(whiteSpaceValue)
        ? textNodeValue
        : textNodeValue.replace(/\n/g, ' ')
    )
    .join('');
}

function extractReferencedCustomPropertyNames(cssValue) {
  const rootNode = postcssValueParser(cssValue);
  const customPropertyNames = new Set();
  for (const node of rootNode.nodes) {
    if (
      node.type === 'function' &&
      node.value === 'var' &&
      node.nodes.length >= 1 &&
      node.nodes[0].type === 'word' &&
      /^--/.test(node.nodes[0].value)
    ) {
      customPropertyNames.add(node.nodes[0].value);
    }
  }
  return customPropertyNames;
}

// Avoid a combinatorial explosion of predicates when many custom CSS properties
// unrelated to fonts are in play.
// https://github.com/Munter/subfont/issues/159
function eliminateUnneededCustomProperties(fontPropRules, cssPropsToTrace) {
  const seenCustomProperties = new Set();
  const queue = new Set(cssPropsToTrace);
  for (const prop of queue) {
    for (const { value } of fontPropRules[prop] || []) {
      for (const customPropertyName of extractReferencedCustomPropertyNames(
        value
      )) {
        queue.add(customPropertyName);
        seenCustomProperties.add(customPropertyName);
      }
    }
  }
  for (const prop of Object.keys(fontPropRules)) {
    if (prop.startsWith('--') && !seenCustomProperties.has(prop)) {
      delete fontPropRules[prop];
    }
  }
}

// asset is optional
function fontTracer(
  document,
  {
    stylesheetsWithPredicates = [],
    getCssRulesByProperty,
    asset,
    propsToReturn = [
      'font-family',
      'font-style',
      'font-weight',
      'font-variant',
      'font-stretch',
    ],
    deduplicate = true,
  } = {}
) {
  const cssPropsToTrace = [...propsToReturn, ...CSS_PROPS_REQUIRED_FOR_TEXT];
  const cssPropsToTraceAndText = [...cssPropsToTrace, 'text'];
  const fontPropRules = getFontRulesWithDefaultStylesheetApplied(
    stylesheetsWithPredicates,
    getCssRulesByProperty,
    cssPropsToTrace
  );
  eliminateUnneededCustomProperties(fontPropRules, cssPropsToTrace);

  const getComputedStyle = getMemoizedElementStyleResolver(
    fontPropRules,
    getCssRulesByProperty,
    cssPropsToTrace
  );

  const hypotheticalCounterStylesByName = {};
  for (const counterStyle of fontPropRules.counterStyles) {
    (hypotheticalCounterStylesByName[counterStyle.name] =
      hypotheticalCounterStylesByName[counterStyle.name] || []).push({
      value: counterStyle.props,
      predicates: counterStyle.predicates,
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
    'week',
  ];

  const possibleNextListItemNumberStack = [[1]];
  let possibleCounterValuesByName = {};

  function adjustPossibleCountersAndListItemNumbers(
    computedStyle,
    isWithinConditionalCommentOrNoscript
  ) {
    let numHypotheticalListItems = 0;
    if (computedStyle.props.display) {
      for (const hypotheticalDisplayValue of computedStyle.props.display) {
        if (/\blist-item\b/.test(hypotheticalDisplayValue.value)) {
          numHypotheticalListItems += 1;
        }
      }
    }
    let nextPossibleCounterValuesByName = {};
    for (const propertyName of ['counter-reset', 'counter-set']) {
      const values = _.uniq(
        computedStyle.props[propertyName].map(
          (hypotheticalCounterResetValue) => hypotheticalCounterResetValue.value
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
              ...possibleCounterValuesByName[counterName],
            ];
          }
        }
      }
    }

    possibleCounterValuesByName = nextPossibleCounterValuesByName;
    nextPossibleCounterValuesByName = {};

    const counterIncrementValues = _.uniq(
      computedStyle.props['counter-increment'].map(
        (hypotheticalCounterIncrementValue) =>
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
          ...possibleCounterValuesByName[counterName],
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
          (potentialPrecedingListItemCount) =>
            potentialPrecedingListItemCount + 1
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
            (potentialPrecedingListItemCount) =>
              potentialPrecedingListItemCount + 1
          ),
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
            hypotheticalContent.predicates,
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
        (hypotheticalText) => hypotheticalText.value.length > 0
      );
      if (styledText.props.text.length > 0) {
        styledTexts.push(styledText);
      }
      return styledTexts;
    }
  }

  const styledTexts = [];

  (function traversePreOrder(node, idArray) {
    const textNodeValues = [];
    if (node.nodeType === node.TEXT_NODE) {
      if (
        node.parentNode.namespaceURI !== SVG_NAMESPACE_URI ||
        ['text', 'tspan', 'textPath'].includes(node.parentNode.tagName)
      ) {
        const textContent = node.nodeValue
          .replace(/⋖\d+⋗/g, (templatePlaceholder) => {
            if (asset && asset._templateReplacements[templatePlaceholder]) {
              return '';
            } else {
              return templatePlaceholder;
            }
          })
          .replace(/\xad/g, '-'); // Include an actual hyphen when there's a soft hyphen:
        if (textContent) {
          textNodeValues.push(textContent);
        }
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
        asset &&
          asset.outgoingRelations.some((relation) => {
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
                  },
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
            return false;
          });
      }
    } else if (
      node.nodeType === node.DOCUMENT_NODE ||
      (node.nodeType === node.ELEMENT_NODE &&
        !excludedNodes.includes(node.tagName))
    ) {
      if (!idArray) {
        idArray = [0];
      }

      if (node.tagName === 'NOSCRIPT') {
        asset &&
          asset.outgoingRelations.some((relation) => {
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
                  },
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
            return false;
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
            { value: inputValue, predicates: {} },
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
            { value: inputPlaceholder, predicates: {} },
          ];

          styledTexts.push(expandComputedStyle(placeholderComputedStyle));
        }
      } else if (
        [node.ELEMENT_NODE, node.DOCUMENT_NODE].includes(node.nodeType)
      ) {
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
                    predicates: hypotheticalValue.predicates,
                  },
                ];
                tracedTextNodes.push(expandComputedStyle(textComputedStyle));
              }
            }
          }
          const groupedStyledTexts = _.compact([
            beforeStyledTexts,
            tracedTextNodes,
            afterStyledTexts,
          ]);
          expandFirstLineAndFirstLetter(
            groupedStyledTexts,
            node,
            getComputedStyle,
            idArray
          );
          styledTexts.push(..._.flattenDeep(groupedStyledTexts));
          possibleNextListItemNumberStack.pop();
        }
      }
    }
    return textNodeValues;
  })(document.body ? document.body.parentNode : document);

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
      if (styledText.props[prop]) {
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
                value,
              });
            }
          }
        }
      }
    }
  }

  const seenPermutationKeys = new Set();
  const multipliedStyledTexts = _.flatMap(styledTexts, ({ props, ...rest }) =>
    [...expandPermutations(props)]
      .map((props) => ({
        ...rest,
        props,
      }))
      // Remove impossible combinations:
      .filter(({ props }) =>
        cssPropsToTraceAndText.every((prop) => {
          return Object.keys(props[prop].predicates).every((predicate) => {
            const predicateValue = props[prop].predicates[predicate];
            return (
              predicateValue === false ||
              cssPropsToTraceAndText.every(
                (otherProp) => props[otherProp].predicates[predicate] !== false
              )
            );
          });
        })
      )
      .map(({ props, ...rest }) => {
        const text = props.text.isListIndicator
          ? props.text.value
          : applyTextTransform(
              props.text.value,
              props['text-transform'].value.toLowerCase()
            );

        // Strip the "hypothetical" wrapper objects around the values
        // and lift out the text
        const predicates = {};
        const transformedStyledText = {
          text,
          predicates,
          props: {},
          ...rest,
        };
        for (const prop of cssPropsToTrace) {
          transformedStyledText.props[prop] = props[prop].value;
          Object.assign(predicates, props[prop].predicates);
        }
        return transformedStyledText;
      })
      .filter(function filterAndDeduplicate({ text, props }) {
        if (
          !text ||
          (props.display && props.display.toLowerCase() === 'none')
        ) {
          return false;
        }
        if (!deduplicate) {
          return true;
        }
        // Unwrap the "hypothetical value" objects:
        let permutationKey = `${text}\x1d`;
        for (const prop of ['font-weight', 'font-style', 'font-family']) {
          permutationKey += `${prop}\x1d${props[prop]}\x1d`;
        }

        // Deduplicate:
        if (!seenPermutationKeys.has(permutationKey)) {
          seenPermutationKeys.add(permutationKey);
          return true;
        }
        return false;
      })
      .map(({ text, props, ...rest }) => ({
        text,
        ...rest,
        props: _.pick(props, propsToReturn),
      }))
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
