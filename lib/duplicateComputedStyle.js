function duplicateComputedStyle(computedStyle) {
  return {
    props: Object.keys(computedStyle.props).reduce(
      // eslint-disable-next-line no-sequences
      (acc, prop) => ((acc[prop] = [...computedStyle.props[prop]]), acc),
      {}
    )
  };
}

module.exports = duplicateComputedStyle;
