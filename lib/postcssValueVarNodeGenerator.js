function* postcssValueVarNodeGenerator(parentNode) {
  for (const node of parentNode.nodes) {
    if (node.type === 'function' && node.value === 'var') {
      if (
        node.nodes.length > 0 &&
        node.nodes[0].type === 'word' &&
        /^--/.test(node.nodes[0].value)
      ) {
        yield [node, parentNode];
      }
    } else if (node.nodes) {
      yield* postcssValueVarNodeGenerator(node);
    }
  }
}

module.exports = postcssValueVarNodeGenerator;
