function duplicateComputedStyle({ props, ...rest }) {
  const duplicatedComputedStyle = {
    ...rest,
    props: {}
  };
  for (const prop of Object.keys(props)) {
    let duplicatedValue = props[prop];
    if (Array.isArray(duplicatedValue)) {
      duplicatedValue = [...duplicatedValue];
    }
    duplicatedComputedStyle.props[prop] = duplicatedValue;
  }
  return duplicatedComputedStyle;
}

module.exports = duplicateComputedStyle;
