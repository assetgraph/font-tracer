const expandPermutations = require('./expandPermutations');

function arePredicatesExhaustive(predicatesArray) {
  const seenPredicateNames = {};
  for (const predicates of predicatesArray) {
    for (const predicateName of Object.keys(predicates)) {
      seenPredicateNames[predicateName] = true;
    }
  }
  for (const permutation of expandPermutations(
    Object.keys(seenPredicateNames).reduce(
      // eslint-disable-next-line no-sequences
      (acc, predicateName) => ((acc[predicateName] = [true, false]), acc),
      {}
    )
  )) {
    if (
      !predicatesArray.some(predicates =>
        Object.keys(seenPredicateNames).every(
          predicateName =>
            predicates[predicateName] === undefined ||
            predicates[predicateName] === permutation[predicateName]
        )
      )
    ) {
      return false;
    }
  }
  return true;
}

module.exports = arePredicatesExhaustive;
