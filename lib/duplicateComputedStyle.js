function duplicateComputedStyle(computedStyle) {
  const duplicatedComputedStyle = {
    props: {}
  };
  for (const prop of Object.keys(computedStyle.props)) {
    let duplicatedValue = computedStyle.props[prop];
    if (Array.isArray(duplicatedValue)) {
      duplicatedValue = [...duplicatedValue];
    }
    duplicatedComputedStyle.props[prop] = duplicatedValue;
  }
  return duplicatedComputedStyle;
}

module.exports = duplicateComputedStyle;
