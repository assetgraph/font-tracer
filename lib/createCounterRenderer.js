const counteraction = require('counteraction');

function createCounterRenderer(props, counterStyles) {
  const { fallback, ...options } = props;
  return counteraction(options, {
    fallback() {
      if (fallback) {
        const fallbackCounterStyle = counterStyles.find(
          counterStyle => counterStyle.name === fallback
        );
        if (fallbackCounterStyle) {
          return createCounterRenderer(
            fallbackCounterStyle.props,
            counterStyles
          );
        } else {
          return fallback;
        }
      }
    }
  });
}

module.exports = createCounterRenderer;
