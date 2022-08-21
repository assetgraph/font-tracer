const postcssValueParser = require('postcss-value-parser');
const expandPermutations = require('./expandPermutations');
const combinePredicates = require('./combinePredicates');
const initialValueByProp = require('./initialValueByProp');
const duplicateComputedStyle = require('./duplicateComputedStyle');
const postcssValueVarNodeGenerator = require('./postcssValueVarNodeGenerator');

function replaceChildNode(parentNode, node, replacement) {
  const index = parentNode.nodes.indexOf(node);
  if (index === -1) {
    throw new Error(
      'The node to replace is not a child of the specified parent node'
    );
  }
  if (replacement === undefined) {
    parentNode.nodes.splice(index, 1);
  } else if (Array.isArray(replacement)) {
    parentNode.nodes.splice(index, 1, ...replacement);
  } else if (typeof replacement === 'string') {
    parentNode.nodes.splice(index, 1, ...postcssValueParser(replacement).nodes);
  } else {
    // Assume postcss-value-parser node
    parentNode.nodes.splice(index, 1, replacement);
  }
}

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
        for (const [node] of postcssValueVarNodeGenerator(rootNode)) {
          const customPropertyName = node.nodes[0].value;
          hypotheticalValuesByCustomProp[customPropertyName] =
            hypotheticalValuesByCustomProp[customPropertyName] ||
              computedStyle.props[customPropertyName] || [
                {
                  prop: hypotheticalValue.prop,
                  value: undefined,
                  predicates: hypotheticalValue.predicates,
                },
              ];
          seenCustomProperties.add(customPropertyName);
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
            ...Object.values(permutation).map((v) => v.predicates),
          ]);
          if (!predicates) {
            // Skip value because of an impossible combination of predicates
            continue;
          }
          const expandedRootNode = postcssValueParser(hypotheticalValue.value);
          const replacements = [];
          for (const [node, parentNode] of postcssValueVarNodeGenerator(
            expandedRootNode
          )) {
            const customPropertyName = node.nodes[0].value;

            if (
              permutation[customPropertyName] &&
              permutation[customPropertyName].value &&
              (!hypotheticalValue.expandedCustomProperties ||
                !hypotheticalValue.expandedCustomProperties.has(
                  customPropertyName
                ))
            ) {
              replacements.push({
                parentNode,
                node,
                replacement: permutation[customPropertyName].value,
              });
            } else if (
              node.nodes.length > 2 &&
              node.nodes[1].type === 'div' &&
              node.nodes[1].value === ','
            ) {
              // Undefined property, but there is a default value
              replacements.push({
                parentNode,
                node,
                replacement: node.nodes.slice(2),
              });
            } else {
              // Reference to an undefined custom property and no default value
              replacements.push({
                parentNode,
                node,
                replacement: initialValueByProp[prop],
              });
              break;
            }
          }
          for (const { parentNode, node, replacement } of replacements) {
            replaceChildNode(parentNode, node, replacement);
          }
          replacementHypotheticalValues.push({
            predicates,
            value: postcssValueParser.stringify(expandedRootNode),
            prop: hypotheticalValue.prop,
            expandedCustomProperties: new Set([
              ...(hypotheticalValues.expandedCustomProperties || []),
              ...seenCustomProperties,
            ]),
          });
        }
        if (!hasCopiedOuter) {
          computedStyle = duplicateComputedStyle(computedStyle);
          hasCopiedOuter = true;
        }
        if (!hasCopiedInner) {
          hypotheticalValues = computedStyle.props[prop] = [
            ...hypotheticalValues,
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
