const expect = require('unexpected');
const comparator = require('../lib/stylePropObjectComparator');

describe('stylePropObjectComparator', function() {
  it('should sort important objects before non-important objects', function() {
    const a = {
      important: true
    };
    const b = {
      important: false
    };

    const compare = comparator([a, b]);

    expect(compare(a, b), 'to be', -1);
  });

  it('should sort styleAttribute objects before non-styleAttribute', function() {
    const a = {
      important: false,
      specificityArray: [1, 0, 0, 0]
    };
    const b = {
      important: false,
      specificityArray: [0, 1, 0, 0]
    };

    const compare = comparator([a, b]);

    expect(compare(a, b), 'to be', -1);
  });

  it('should sort higher specificity objects before lower specificity objects', function() {
    const a = {
      important: false,
      specificityArray: [0, 0, 1, 0]
    };
    const b = {
      important: false,
      specificityArray: [0, 0, 0, 1]
    };

    const compare = comparator([a, b]);

    expect(compare(a, b), 'to be', -1);
  });

  it('should reverse source order when all else is equal (higher specificity first)', function() {
    const a = {
      important: false,
      specificityArray: [0, 0, 0, 1]
    };
    const b = {
      important: false,
      specificityArray: [0, 0, 0, 1]
    };

    const compare = comparator([a, b]);

    expect(compare(a, b), 'to be', 1);
  });

  it('should sort a big array of different cases correctly', function() {
    const a = {
      id: 'a',
      important: false,
      specificityArray: [0, 0, 0, 1]
    };
    const b = {
      id: 'b',
      important: false,
      specificityArray: [0, 0, 0, 1]
    };
    const c = {
      id: 'c',
      important: false,
      specificityArray: [0, 1, 0, 1]
    };
    const d = {
      id: 'd',
      important: false,
      specificityArray: [0, 0, 1, 1]
    };
    const e = {
      id: 'e',
      important: false,
      specificityArray: [0, 1, 0, 1]
    };
    const f = {
      id: 'f',
      important: false,
      specificityArray: [0, 0, 1, 0]
    };
    const g = {
      id: 'g',
      important: true,
      specificityArray: [0, 0, 0, 1]
    };
    const h = {
      id: 'h',
      important: false,
      specificityArray: [0, 0, 0, 1]
    };
    const i = {
      id: 'i',
      important: false,
      specificityArray: [1, 0, 0, 1]
    };
    const j = {
      id: 'j',
      important: true,
      specificityArray: [1, 0, 0, 1]
    };
    const k = {
      id: 'k',
      important: false,
      specificityArray: [0, 1, 0, 1]
    };

    const array = [a, b, c, d, e, f, g, h, i, j, k];

    expect(array.sort(comparator(array)), 'to satisfy', [
      j,
      g,
      i,
      k,
      e,
      c,
      d,
      f,
      h,
      b,
      a
    ]);
  });
});
