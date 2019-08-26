const postcssValueParser = require('postcss-value-parser');
const expandPermutations = require('./expandPermutations');
const combinePredicates = require('./combinePredicates');
const initialValueByProp = require('./initialValueByProp');
const duplicateComputedStyle = require('./duplicateComputedStyle');

function expandCustomProperties(computedStyle) {
  let hasCopiedOuter = false;
  for (const prop of Object.keys(computedStyle.props)) {
    let hasCopiedInner = false;
    let hypotheticalValues = computedStyle.props[prop];
    const hypotheticalValuesByCustomProp = {};
    for (let i = 0; i < hypotheticalValues.length; i += 1) {
      const hypotheticalValue = hypotheticalValues[i];
      // Quick test for whether the value contains custom properties:
      if (/var\(--[^)]+\)/.test(hypotheticalValue.value)) {
        const rootNode = postcssValueParser(hypotheticalValue.value);
        const seenCustomProperties = new Set();
        for (const node of rootNode.nodes) {
          if (
            node.type === 'function' &&
            node.value === 'var' &&
            node.nodes.length > 0 &&
            node.nodes[0].type === 'word' &&
            /^--/.test(node.nodes[0].value)
          ) {
            const customPropertyName = node.nodes[0].value;
            hypotheticalValuesByCustomProp[
              customPropertyName
            ] = hypotheticalValuesByCustomProp[customPropertyName] ||
              computedStyle.props[customPropertyName] || [
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
          let value = '';
          for (const node of rootNode.nodes) {
            if (
              node.type === 'function' &&
              node.value === 'var' &&
              node.nodes.length > 0 &&
              node.nodes[0].type === 'word' &&
              /^--/.test(node.nodes[0].value)
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
                value += permutation[customPropertyName].value;
              } else if (
                node.nodes.length > 2 &&
                node.nodes[1].type === 'div' &&
                node.nodes[1].value === ','
              ) {
                // Undefined property, but there is a default value
                value += node.nodes
                  .slice(2)
                  .map(postcssValueParser.stringify)
                  .join('');
              } else {
                // Reference to an undefined custom property and no default value
                value = initialValueByProp[prop];
                break;
              }
            } else {
              value += postcssValueParser.stringify(node);
            }
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
          computedStyle = duplicateComputedStyle(computedStyle);
          hasCopiedOuter = true;
        }
        if (!hasCopiedInner) {
          hypotheticalValues = computedStyle.props[prop] = [
            ...hypotheticalValues
          ];
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
