const duplicateComputedStyle = require('./duplicateComputedStyle');
const parseFontWeight = require('./parseFontWeight');
const combinePredicates = require('./combinePredicates');

function expandTransitions(computedStyle) {
  if (
    computedStyle.props['font-weight'] &&
    computedStyle.props['transition-property']
  ) {
    const fontWeightTransitions = computedStyle.props[
      'transition-property'
    ].filter((hypotheticalValue) =>
      /\b(?:font-weight|all)\b/.test(hypotheticalValue.value)
    );
    if (fontWeightTransitions.length > 0) {
      const hypotheticalFontWeightValuesInPseudoClassStates = computedStyle.props[
        'font-weight'
      ].filter((hypotheticalValue) =>
        Object.keys(hypotheticalValue.predicates).some(
          (predicate) =>
            hypotheticalValue.predicates[predicate] &&
            /^selectorWithPseudoClasses:/.test(predicate)
        )
      );
      if (hypotheticalFontWeightValuesInPseudoClassStates.length > 0) {
        const hypotheticalNonZeroTransitionDurations = computedStyle.props[
          'transition-duration'
        ].filter(
          (hypotheticalValue) =>
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
                    hypotheticalFontWeightValueInPseudoClassStates.value,
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
                      hypotheticalFontWeightValue.predicates,
                    ]);
                    if (combinedPredicates) {
                      extraHypotheticalFontWeightValues.push({
                        prop: 'font-weight',
                        value: String(fontWeight),
                        predicates: combinedPredicates,
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
              ...extraHypotheticalFontWeightValues,
            ];
          }
        }
      }
    }
  }
  return computedStyle;
}

module.exports = expandTransitions;
