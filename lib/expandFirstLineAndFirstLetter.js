const arePredicatesExhaustive = require('./arePredicatesExhaustive');

function expandFirstLineAndFirstLetter(
  groupedStyledTexts,
  node,
  getComputedStyle,
  idArray
) {
  for (const pseudoElementName of ['first-line', 'first-letter']) {
    const additionalStyledTexts = [];
    // Whether there's a perfect overlap between the predicates of the existing styled texts we've "taken bites" of:
    let aligned = true;
    groupedStyledTexts.some((styledTextsInSection) => {
      let allExhaustive = false;
      // Keep track of whether we have consumed all the required characters:
      let done = true;
      for (let i = 0; i < styledTextsInSection.length; i += 1) {
        const styledTextInSection = styledTextsInSection[i];
        const thisExhaustive = Object.keys(styledTextInSection.props).every(
          (prop) =>
            arePredicatesExhaustive(
              styledTextInSection.props[prop].map(
                (hypotheticalValue) => hypotheticalValue.predicates
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
                  predicates: hypotheticalValue.predicates,
                },
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
      return false;
    });
    groupedStyledTexts[0].unshift(...additionalStyledTexts);
  }
}

module.exports = expandFirstLineAndFirstLetter;
