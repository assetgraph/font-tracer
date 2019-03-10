const postcssValuesParser = require('postcss-values-parser');
const expandPermutations = require('./expandPermutations');
const combinePredicates = require('./combinePredicates');
const initialValueByProp = require('./initialValueByProp');

function expandCustomProperties(computedStyle) {
  let hasCopiedOuter = false;
  for (const prop of Object.keys(computedStyle)) {
    let hasCopiedInner = false;
    let hypotheticalValues = computedStyle[prop];
    const hypotheticalValuesByCustomProp = {};
    for (let i = 0; i < hypotheticalValues.length; i += 1) {
      const hypotheticalValue = hypotheticalValues[i];
      // Quick test for whether the value contains custom properties:
      if (/var\(--[^)]+\)/.test(hypotheticalValue.value)) {
        const valueRootNode = postcssValuesParser.parse(
          hypotheticalValue.value
        );
        const seenCustomProperties = new Set();
        for (const node of valueRootNode.nodes) {
          if (
            node.type === 'func' &&
            node.nodes.length >= 1 &&
            node.nodes[0].type === 'word' &&
            node.nodes[0].value.startsWith('--')
          ) {
            const customPropertyName = node.nodes[0].value;
            hypotheticalValuesByCustomProp[
              customPropertyName
            ] = hypotheticalValuesByCustomProp[customPropertyName] ||
              computedStyle[customPropertyName] || [
                {
                  prop: hypotheticalValue.prop,
                  value: undefined,
                  predicates: hypotheticalValue.predicates
                }
              ];
            seenCustomProperties.add(customPropertyName);
          }
        }
        if (seenCustomProperties.size === 0) {
          // The quick regexp test was a false positive
          continue;
        }
        const replacementHypotheticalValues = [];
        for (const permutation of expandPermutations(
          hypotheticalValuesByCustomProp
        )) {
          const predicates = combinePredicates([
            hypotheticalValue.predicates,
            ...Object.values(permutation).map(v => v.predicates)
          ]);
          if (!predicates) {
            // Skip value because of an impossible combination of predicates
            continue;
          }
          const stringifiedTokens = [];
          let useInitialValue = false;
          (function visit(node) {
            if (
              node.type === 'func' &&
              node.nodes.length >= 1 &&
              node.nodes[0].type === 'word' &&
              node.nodes[0].value.startsWith('--')
            ) {
              const customPropertyName = node.nodes[0].value;
              if (
                permutation[customPropertyName] &&
                permutation[customPropertyName].value &&
                (!hypotheticalValue.expandedCustomProperties ||
                  !hypotheticalValue.expandedCustomProperties.has(
                    customPropertyName
                  ))
              ) {
                stringifiedTokens.push(permutation[customPropertyName].value);
              } else if (
                node.nodes.length >= 2 &&
                node.nodes[1].type === 'punctuation' &&
                node.nodes[1].value === ','
              ) {
                // Undefined property, but there is a default value
                for (const defaultValueNode of node.nodes.slice(2)) {
                  visit(defaultValueNode);
                }
              } else {
                // Reference to an undefined custom property and no default value
                useInitialValue = true;
              }
              // Do not visit the children
            } else {
              if (node.value) {
                stringifiedTokens.push(node.toString());
              } else if (node.nodes) {
                for (const childNode of node.nodes) {
                  visit(childNode);
                }
              }
            }
          })(valueRootNode);
          let value;
          if (useInitialValue) {
            value = initialValueByProp[prop];
          } else {
            value = stringifiedTokens.join(' ');
          }
          replacementHypotheticalValues.push({
            predicates,
            value,
            prop: hypotheticalValue.prop,
            expandedCustomProperties: new Set([
              ...(hypotheticalValues.expandedCustomProperties || []),
              ...seenCustomProperties
            ])
          });
        }
        if (!hasCopiedOuter) {
          computedStyle = { ...computedStyle };
          hasCopiedOuter = true;
        }
        if (!hasCopiedInner) {
          hypotheticalValues = computedStyle[prop] = [...hypotheticalValues];
          hasCopiedInner = true;
        }
        hypotheticalValues.splice(i, 1, ...replacementHypotheticalValues);
        i -= 1;
      }
    }
  }
  return computedStyle;
}

module.exports = expandCustomProperties;
