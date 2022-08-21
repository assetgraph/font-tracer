const reduceCalc = require('@jazzcss/reduce-calc');
const duplicateComputedStyle = require('./duplicateComputedStyle');

function expandCalculations(computedStyle) {
  let hasCopiedOuter = false;
  for (const prop of Object.keys(computedStyle.props)) {
    let hasCopiedInner = false;
    let hypotheticalValues = computedStyle.props[prop];
    for (let i = 0; i < hypotheticalValues.length; i += 1) {
      const hypotheticalValue = hypotheticalValues[i];
      // Quick test for whether the value contains a calculation:
      if (/calc\(/.test(hypotheticalValue.value)) {
        let reducedValue;
        try {
          reducedValue = reduceCalc(hypotheticalValue.value);
        } catch (err) {
          continue;
        }
        if (reducedValue !== hypotheticalValue.value) {
          const replacementHypotheticalValue = {
            ...hypotheticalValue,
            value: reducedValue,
          };
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
          hypotheticalValues.splice(i, 1, replacementHypotheticalValue);
          i -= 1;
        }
      }
    }
  }
  return computedStyle;
}

module.exports = expandCalculations;
