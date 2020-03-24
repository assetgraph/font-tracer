const duplicateComputedStyle = require('./duplicateComputedStyle');
const expandPermutations = require('./expandPermutations');
const parseFontWeight = require('./parseFontWeight');

function expandAnimations(computedStyle, keyframesDefinitions) {
  if (computedStyle.props['animation-name'].length > 0) {
    const isAnimatedByPropertyName = { 'animation-name': true };
    for (const animationNameValue of computedStyle.props['animation-name']) {
      for (const keyframesDefinition of keyframesDefinitions) {
        if (keyframesDefinition.name === animationNameValue.value) {
          keyframesDefinition.node.walkDecls((decl) => {
            if (/^--/.test(decl.prop) || computedStyle.props[decl.prop]) {
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
              keyframesDefinition.node.walkDecls((decl) => {
                if (/^--/.test(decl.prop) || computedStyle.props[decl.prop]) {
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
                    predicates: permutation['animation-name'].predicates,
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

module.exports = expandAnimations;
