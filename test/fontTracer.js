const pathModule = require('path');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-dom'))
  .use(require('magicpen-prism'));
const AssetGraph = require('assetgraph');
const fontTracer = require('../lib/fontTracer');
const gatherStylesheetsWithPredicates = require('subfont/lib/gatherStylesheetsWithPredicates');
const getCssRulesByProperty = require('subfont/lib/getCssRulesByProperty');

expect.addAssertion(
  '<string> [when parsed as SVG] to [exhaustively] satisfy computed font properties <array>',
  async function (expect, subject, result) {
    expect.subjectOutput = function (output) {
      output.code(subject, 'text/html');
    };
    const assetGraph = new AssetGraph();

    const [asset] = await assetGraph.loadAssets({
      type: expect.flags['when parsed as SVG'] ? 'Svg' : 'Html',
      text: subject,
    });

    await assetGraph.populate({ followRelations: { crossorigin: false } });

    const traces = fontTracer(asset.parseTree, {
      stylesheetsWithPredicates: gatherStylesheetsWithPredicates(
        asset.assetGraph,
        asset
      ),
      getCssRulesByProperty,
      asset,
    });

    expect(traces, 'to [exhaustively] satisfy', result);
  }
);

describe('fontTracer', function () {
  it('should include reference back to the original node', function () {
    return expect('<div>foo</div>', 'to satisfy computed font properties', [
      {
        text: 'foo',
        node: {
          name: 'div',
        },
      },
    ]);
  });

  it('should strip empty text nodes', function () {
    const htmlText = ['  <div>div</div>   <span></span>  '].join('');

    return expect(htmlText, 'to satisfy computed font properties', [
      {
        text: 'div',
        props: {
          'font-family': undefined,
          'font-weight': 'normal',
          'font-style': 'normal',
        },
      },
      {
        text: '       ',
        props: {
          'font-family': undefined,
          'font-style': 'normal',
          'font-weight': 'normal',
        },
      },
    ]);
  });

  it('should skip template language placeholders', function () {
    const htmlText = '<div>foo <?bar?> quux</div>';

    return expect(htmlText, 'to satisfy computed font properties', [
      {
        text: 'foo  quux',
        props: {
          'font-family': undefined,
          'font-weight': 'normal',
          'font-style': 'normal',
        },
      },
    ]);
  });

  it('should include whitespace', async function () {
    await expect(
      '<h2><span>foo</span> </h2>',
      'to satisfy computed font properties',
      [
        {
          text: 'foo',
          props: {
            'font-family': undefined,
            'font-weight': 'bold',
            'font-style': 'normal',
          },
        },
        {
          text: ' ',
          props: {
            'font-family': undefined,
            'font-weight': 'bold',
            'font-style': 'normal',
          },
        },
      ]
    );
  });

  it('should apply inline style attribute values', function () {
    const htmlText = ['<div style="font-weight: bold">div</div>'].join('');

    return expect(htmlText, 'to satisfy computed font properties', [
      {
        text: 'div',
        props: {
          'font-family': undefined,
          'font-weight': 'bold',
          'font-style': 'normal',
        },
      },
    ]);
  });

  it('should match CSS property names case insensitively', function () {
    const htmlText = [
      '<style>div { FONT-family: foo; font-WEIGHT: bold; }</style>',
      '<div style="FONT-style: italic;">div</div>',
    ].join('');

    return expect(htmlText, 'to satisfy computed font properties', [
      {
        text: 'div',
        props: {
          'font-family': 'foo',
          'font-weight': 'bold',
          'font-style': 'italic',
        },
      },
    ]);
  });

  it('should apply stylesheet attribute values', function () {
    const htmlText = [
      '<style>div { font-weight: bold; }</style>',
      '<div>div</div>',
    ].join('');

    return expect(htmlText, 'to satisfy computed font properties', [
      {
        text: 'div',
        props: {
          'font-family': undefined,
          'font-weight': 'bold',
          'font-style': 'normal',
        },
      },
    ]);
  });

  it('should exclude text in display:none elements', function () {
    const htmlText = [
      '<style>div { display: none; }</style>',
      '<div>div</div>',
    ].join('');

    return expect(
      htmlText,
      'to exhaustively satisfy computed font properties',
      []
    );
  });

  it('should apply default browser styles', function () {
    const htmlText = ['<div>div</div><strong>strong</strong><em>em</em>'].join(
      '\n'
    );

    return expect(htmlText, 'to satisfy computed font properties', [
      {
        text: 'div',
        props: {
          'font-family': undefined,
          'font-weight': 'normal',
          'font-style': 'normal',
        },
      },
      {
        text: 'strong',
        props: {
          'font-family': undefined,
          'font-weight': 'normal+bolder',
          'font-style': 'normal',
        },
      },
      {
        text: 'strong',
        props: {
          'font-family': undefined,
          'font-weight': 'bold',
          'font-style': 'normal',
        },
      },
      {
        text: 'em',
        props: {
          'font-family': undefined,
          'font-weight': 'normal',
          'font-style': 'italic',
        },
      },
    ]);
  });

  it('should trace a single quoted font-family', function () {
    const htmlText = [
      "<style>body { font-family: 'font 1'; }</style>",
      'text',
    ].join('');

    return expect(htmlText, 'to satisfy computed font properties', [
      {
        text: 'text',
        props: {
          'font-family': "'font 1'",
          'font-weight': 'normal',
          'font-style': 'normal',
        },
      },
    ]);
  });

  it('should trace a double quoted font-family', function () {
    const htmlText = [
      '<style>body { font-family: "font 1"; }</style>',
      'text',
    ].join('');

    return expect(htmlText, 'to satisfy computed font properties', [
      {
        text: 'text',
        props: {
          'font-family': '"font 1"',
          'font-weight': 'normal',
          'font-style': 'normal',
        },
      },
    ]);
  });

  it('should return font-weight as a string', function () {
    const htmlText = '<style>body { font-weight: 500; }</style>text';

    return expect(htmlText, 'to satisfy computed font properties', [
      {
        text: 'text',
        props: {
          'font-family': undefined,
          'font-weight': '500',
          'font-style': 'normal',
        },
      },
    ]);
  });

  describe('specificity', function () {
    it('stylesheets should override browser defaults', function () {
      const htmlText = [
        '<style>h1 { font-weight: normal; }</style>',
        '<h1>h1</h1>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'h1',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('style attributes should override stylesheets', function () {
      const htmlText = [
        '<style>div { font-weight: bold; }</style>',
        '<div style="font-weight: normal">div</div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'div',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('redefined properties in the same rule should override previous ones', function () {
      const htmlText = [
        '<style>div { font-weight: bold; font-weight: light }</style>',
        '<div>div</div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'div',
          props: {
            'font-family': undefined,
            'font-weight': 'light',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('higher specificity selectors should override lower ones', function () {
      const htmlText = [
        '<style>.all {font-weight: light} div { font-weight: bold; }</style>',
        '<div class="all">div</div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'div',
          props: {
            'font-family': undefined,
            'font-weight': 'light',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('last selector of equal specificity should override previous ones', function () {
      const htmlText = [
        '<style>div {font-weight: light} div { font-weight: bold; }</style>',
        '<div>div</div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'div',
          props: {
            'font-family': undefined,
            'font-weight': 'bold',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('!important should override specificity in stylesheets', function () {
      const htmlText = [
        '<style>.all {font-weight: light} div { font-weight: bold !important; }</style>',
        '<div class="all">div</div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'div',
          props: {
            'font-family': undefined,
            'font-weight': 'bold',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('!important in stylesheet should override style attribute', function () {
      const htmlText = [
        '<style>div { font-weight: bold !important; }</style>',
        '<div style="font-weight: light">div</div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'div',
          props: {
            'font-family': undefined,
            'font-weight': 'bold',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('!important in style attribute should override !important in stylesheet', function () {
      const htmlText = [
        '<style>div { font-weight: bold !important; }</style>',
        '<div style="font-weight: light !important">div</div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'div',
          props: {
            'font-family': undefined,
            'font-weight': 'light',
            'font-style': 'normal',
          },
        },
      ]);
    });
  });

  describe('inheritance', function () {
    it('should treat `inherit` values as undefined and traverse up to the parent', function () {
      const htmlText = [
        '<style>h1 { font-family: font1; } span { font-family: inherit; }</style>',
        '<h1>foo <span>bar</span></h1>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'bar',
          props: {
            'font-family': 'font1',
            'font-weight': 'bold',
            'font-style': 'normal',
          },
        },
        {
          text: 'foo ',
          props: {
            'font-family': 'font1',
            'font-weight': 'bold',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('default non-inheritance form elements should not inherit styles from parents', function () {
      const htmlText = [
        '<style>body { font-family: font1; }</style>',
        '<button>button</button>',
        '<option>option</option>',
        '<textarea>textarea</textarea>',
        '<input value="input">',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
          text: 'button',
        },
        {
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
          text: 'option',
        },
        {
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
          text: 'textarea',
        },
        {
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
          text: 'input',
        },
      ]);
    });

    it('default non-inheritance form elements should inherit styles for props with `inherit`-value', function () {
      const htmlText = [
        '<style>body { font-family: font1; font-style: italic } * { font-family: inherit } </style>',
        '<button>button</button>',
        '<select><option>option</option></select>',
        '<textarea>textarea</textarea>',
        '<input value="input">',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          props: { 'font-family': 'font1', 'font-style': 'normal' },
          text: 'button',
        },
        {
          props: { 'font-family': 'font1', 'font-style': 'normal' },
          text: 'option',
        },
        {
          props: { 'font-family': 'font1', 'font-style': 'normal' },
          text: 'textarea',
        },
        {
          props: { 'font-family': 'font1', 'font-style': 'normal' },
          text: 'input',
        },
      ]);
    });
  });

  describe('non-textNode elements that show text', function () {
    it('should pick up <input> elements with visual values', function () {
      const htmlText = [
        '<style>input { font-family: font1; }</style>',
        '<input value="type:undefined">',
        '<input type="date" value="2017-12-03">',
        '<input type="datetime-local" value="2017-12-03T11:22">',
        '<input type="email" value="foo@example.com">',
        '<input type="month" value="2017-12">',
        '<input type="number" value="1234">',
        '<input type="reset" value="type:reset">',
        '<input type="search" value="type:search">',
        '<input type="submit" value="type:submit">',
        '<input type="tel" value="type:tel">',
        '<input type="text" value="type:text">',
        '<input type="time" value="11:22:33">',
        '<input type="url" value="type:url">',
        '<input type="week" value="2017-W50">',
        '<input type="radio" value="type:radio">',
        '<input placeholder="placeholder">',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        { props: { 'font-family': 'font1' }, text: 'type:undefined' },
        { props: { 'font-family': 'font1' }, text: '2017-12-03' },
        { props: { 'font-family': 'font1' }, text: '2017-12-03T11:22' },
        { props: { 'font-family': 'font1' }, text: 'foo@example.com' },
        { props: { 'font-family': 'font1' }, text: '2017-12' },
        { props: { 'font-family': 'font1' }, text: '1234' },
        { props: { 'font-family': 'font1' }, text: 'type:reset' },
        { props: { 'font-family': 'font1' }, text: 'type:search' },
        { props: { 'font-family': 'font1' }, text: 'type:submit' },
        { props: { 'font-family': 'font1' }, text: 'type:tel' },
        { props: { 'font-family': 'font1' }, text: 'type:text' },
        { props: { 'font-family': 'font1' }, text: '11:22:33' },
        { props: { 'font-family': 'font1' }, text: 'type:url' },
        { props: { 'font-family': 'font1' }, text: '2017-W50' },
        { props: { 'font-family': 'font1' }, text: 'placeholder' },
      ]);
    });
  });

  describe('`initial`-keyword', function () {
    it('should set initial values even when inheritance set other values', function () {
      const htmlText = [
        '<style>.all {font-weight: 900} span { font-weight: initial; }</style>',
        '<div class="all"><span>span</span></div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'span',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
      ]);
    });
  });

  describe('`lighter`-keyword', function () {
    it('should return initial value with `lighter` modification', function () {
      const htmlText = [
        '<style>span { font-weight: lighter; }</style>',
        '<div><span>span</span></div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'span',
          props: {
            'font-family': undefined,
            'font-weight': 'normal+lighter',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should return inherited value with `lighter` modification', function () {
      const htmlText = [
        '<style>div { font-weight: 600; }</style>',
        '<style>span { font-weight: lighter; }</style>',
        '<div><span>span</span></div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'span',
          props: {
            'font-family': undefined,
            'font-weight': '600+lighter',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should return multiple hypothetical inherited values with `lighter` modification', function () {
      const htmlText = [
        '<style>div { font-weight: 600; }</style>',
        '<style>@media 3dglasses { div { font-weight: 800; } }</style>',
        '<style>span { font-weight: lighter; }</style>',
        '<div><span>span</span></div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'span',
          props: {
            'font-family': undefined,
            'font-weight': '800+lighter',
            'font-style': 'normal',
          },
        },
        {
          text: 'span',
          props: {
            'font-family': undefined,
            'font-weight': '600+lighter',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should return inherited value with multiple `lighter` modifications', function () {
      const htmlText = [
        '<style>div { font-weight: 900; }</style>',
        '<style>span { font-weight: lighter; }</style>',
        '<div><span><span>span</span></span></div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'span',
          props: {
            'font-family': undefined,
            'font-weight': '900+lighter+lighter',
            'font-style': 'normal',
          },
        },
      ]);
    });
  });

  describe('`bolder`-keyword', function () {
    it('should return initial value with `bolder` modification', function () {
      const htmlText = [
        '<style>span { font-weight: bolder; }</style>',
        '<div><span>span</span></div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'span',
          props: {
            'font-family': undefined,
            'font-weight': 'normal+bolder',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should return inherited value with `bolder` modification', function () {
      const htmlText = [
        '<style>div { font-weight: 600; }</style>',
        '<style>span { font-weight: bolder; }</style>',
        '<div><span>span</span></div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'span',
          props: {
            'font-family': undefined,
            'font-weight': '600+bolder',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should return multiple hypothetical inherited values with `bolder` modification', function () {
      const htmlText = [
        '<style>div { font-weight: 600; }</style>',
        '<style>@media 3dglasses { div { font-weight: 800; } }</style>',
        '<style>span { font-weight: bolder; }</style>',
        '<div><span>span</span></div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'span',
          props: {
            'font-family': undefined,
            'font-weight': '800+bolder',
            'font-style': 'normal',
          },
        },
        {
          text: 'span',
          props: {
            'font-family': undefined,
            'font-weight': '600+bolder',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should return inherited value with multiple `bolder` modifications', function () {
      const htmlText = [
        '<style>div { font-weight: 200; }</style>',
        '<style>span { font-weight: bolder; }</style>',
        '<div><span><span>span</span></span></div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'span',
          props: {
            'font-family': undefined,
            'font-weight': '200+bolder+bolder',
            'font-style': 'normal',
          },
        },
      ]);
    });
  });

  describe('`lighter` and `bolder` combinations', function () {
    it('should return inherited value with `bolder` and `lighter` modification', function () {
      const htmlText = [
        '<style>div { font-weight: 200; }</style>',
        '<style>span { font-weight: bolder; }</style>',
        '<style>.inner { font-weight: lighter; }</style>',
        '<div><span><span class="inner">span</span></span></div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'span',
          props: {
            'font-family': undefined,
            'font-weight': '200+bolder+lighter',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should return inherited value with `lighter` and `bolder` modification', function () {
      const htmlText = [
        '<style>div { font-weight: 200; }</style>',
        '<style>span { font-weight: lighter; }</style>',
        '<style>.inner { font-weight: bolder; }</style>',
        '<div><span><span class="inner">span</span></span></div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'span',
          props: {
            'font-family': undefined,
            'font-weight': '200+lighter+bolder',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should handle `lighter` with a pseudo class', function () {
      const htmlText = [
        '<style>div { font-weight: 200; }</style>',
        '<style>span { font-weight: lighter; }</style>',
        '<style>.inner:hover { font-weight: bolder; }</style>',
        '<div><span><span class="inner">span</span></span></div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'span',
          props: {
            'font-family': undefined,
            'font-weight': '200+lighter+bolder',
            'font-style': 'normal',
          },
        },
        {
          text: 'span',
          props: {
            'font-family': undefined,
            'font-weight': '200+lighter+lighter',
            'font-style': 'normal',
          },
        },
      ]);
    });
  });

  describe('with text-transform', function () {
    it('should uppercase the extracted text content', function () {
      const htmlText = [
        '<style>div { text-transform: uppercase; }</style>',
        '<div>foo</div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        { text: 'FOO' },
      ]);
    });

    it('should lowercase the extracted text content', function () {
      const htmlText = [
        '<style>div { text-transform: lowercase; }</style>',
        '<div>FOO</div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        { text: 'foo' },
      ]);
    });

    it('should capitalize the extracted text content', function () {
      const htmlText = [
        '<style>div { text-transform: capitalize; }</style>',
        '<div>foo</div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        { text: 'Foo' },
      ]);
    });

    it('should apply to the content of a pseudo element', function () {
      const htmlText = [
        "<style>div::before { content: 'foo'; text-transform: uppercase; }</style>",
        '<div></div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        { text: 'FOO' },
      ]);
    });

    it('should apply to counters used in pseudo elements', function () {
      const htmlText = [
        '<style>html { counter-reset: section 20; }</style>',
        '<style>div::before { content: counter(section, lower-roman); text-transform: capitalize; }</style>',
        '<div></div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        { text: 'Xx' },
      ]);
    });

    it('should not apply to list indicators', function () {
      const htmlText = [
        '<ol style="list-style-type: lower-roman; text-transform: uppercase">',
        '<li>foo</li>',
        '</ol>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        { text: 'i.' },
        { text: 'FOO' },
      ]);
    });

    describe('used in a conditional', function () {
      it('should account for the fact that the transform should or should not apply', function () {
        const htmlText = [
          '<style>@media 3dglasses { div { text-transform: lowercase; } }</style>',
          '<div>FOO</div>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          { text: 'foo' },
          { text: 'FOO' },
        ]);
      });

      it('should not multiply if the text already has the right casing', function () {
        const htmlText = [
          '<style>@media 3dglasses { div { text-transform: lowercase; } }</style>',
          '<div>foo</div>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          { text: 'foo' },
        ]);
      });
    });
  });

  it('should take browser default stylesheet into account', function () {
    const htmlText = [
      '<style>h1 { font-family: font1; } span { font-family: font2; }</style>',
      '<h1>foo <span>bar</span></h1>',
    ].join('');

    return expect(htmlText, 'to satisfy computed font properties', [
      {
        text: 'bar',
        props: {
          'font-family': 'font2',
          'font-weight': 'bold',
          'font-style': 'normal',
        },
      },
      {
        text: 'foo ',
        props: {
          'font-family': 'font1',
          'font-weight': 'bold',
          'font-style': 'normal',
        },
      },
    ]);
  });

  describe('CSS pseudo elements', function () {
    it('should include the pseudo element name', function () {
      const htmlText = [
        '<style>h1:after { content: "thecontent"; font-family: font1 !important; }</style>',
        '<h1></h1>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'thecontent',
          pseudoElementName: 'after',
        },
      ]);
    });

    it('should pick up distinct styles on :after pseudo-element', function () {
      const htmlText = [
        '<style>h1:after { content: "after"; font-family: font1 !important; }</style>',
        '<h1>h1</h1>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'h1',
          props: {
            'font-family': undefined,
            'font-weight': 'bold',
            'font-style': 'normal',
          },
        },
        {
          text: 'after',
          props: {
            'font-family': 'font1',
            'font-weight': 'bold',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should support an ::after selector without anything else', function () {
      const htmlText = [
        '<style>::after { content: "after" }</style>',
        '<div></div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'after',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should support :after without content', function () {
      const htmlText = [
        '<style>h1:after { font-family: font1 !important; }</style>',
        '<h1></h1>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', []);
    });

    it('should not inherit the content property', function () {
      const htmlText = [
        '<style>h1 { content: "foo" }</style>',
        '<style>h1:after { font-family: font1 !important; }</style>',
        '<h1></h1>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', []);
    });

    describe('with quotes', function () {
      it('should include all start quote characters when open-quote is part of the content value', function () {
        const htmlText = [
          '<style>div:after { quotes: "<" ">"; }</style>',
          '<style>div:after { content: open-quote; font-family: font1 !important; }</style>',
          '<div></div>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: '<',
            props: {
              'font-family': 'font1',
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
        ]);
      });

      it('should include all end quote characters when close-quote is part of the content value', function () {
        const htmlText = [
          '<style>div:after { quotes: "<" ">" "[" "]"; }</style>',
          '<style>div:after { content: close-quote; font-family: font1 !important; }</style>',
          '<div></div>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: '>]',
            props: {
              'font-family': 'font1',
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
        ]);
      });

      it('should handle hypothetical values of quotes', function () {
        const htmlText = [
          '<style>div:after { quotes: "<" ">"; }</style>',
          '<style>@media 3dglasses { div:after { quotes: "(" ")"; } }</style>',
          '<style>div:after { content: open-quote; font-family: font1 !important; }</style>',
          '<div></div>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: '(',
            props: {
              'font-family': 'font1',
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
          {
            text: '<',
            props: {
              'font-family': 'font1',
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
        ]);
      });

      it('should assume a conservative set of the most common quote characters when the quotes property is not explicitly given', function () {
        const htmlText = ['<q></q>'].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: '«‹‘\'"',
            props: {
              'font-family': undefined,
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
          {
            text: '»›’\'"',
            props: {
              'font-family': undefined,
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
        ]);
      });
    });

    it('should override re-definition of prop on :after pseudo-element', function () {
      const htmlText = [
        '<style>h1::after { content: "after"; font-family: font1; }</style>',
        '<style>h1::after { content: "after"; font-family: font2; }</style>',
        '<h1>h1</h1>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'h1',
          props: {
            'font-family': undefined,
            'font-weight': 'bold',
            'font-style': 'normal',
          },
        },
        {
          text: 'after',
          props: {
            'font-family': 'font2',
            'font-weight': 'bold',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should take !important into account when re-defining prop on :after pseudo-element', function () {
      const htmlText = [
        '<style>h1:after { content: "after"; font-family: font1 !important; }</style>',
        '<style>h1:after { content: "after"; font-family: font2; }</style>',
        '<h1>h1</h1>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'h1',
          props: {
            'font-family': undefined,
            'font-weight': 'bold',
            'font-style': 'normal',
          },
        },
        {
          text: 'after',
          props: {
            'font-family': 'font1',
            'font-weight': 'bold',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should pick up multiple :after pseudo-elements', function () {
      const htmlText = [
        '<style>h1:after { content: "after"; font-family: font1 !important; }</style>',
        '<h1>h1</h1>',
        '<h1>h1</h1>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'h1',
          props: {
            'font-family': undefined,
            'font-weight': 'bold',
            'font-style': 'normal',
          },
        },
        {
          text: 'after',
          props: {
            'font-family': 'font1',
            'font-weight': 'bold',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should inherit from each distinct pseudo parent', function () {
      const htmlText = [
        '<style>.foo:after { content: "after"; font-family: font1 !important; }</style>',
        '<style>p { font-weight: 200; }</style>',
        '<style>article { font-weight: 600; }</style>',
        '<p class="foo">p</section>',
        '<article class="foo">article</atricle>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'p',
          props: {
            'font-family': undefined,
            'font-weight': '200',
            'font-style': 'normal',
          },
        },
        {
          text: 'after',
          props: {
            'font-family': 'font1',
            'font-weight': '200',
            'font-style': 'normal',
          },
        },
        {
          text: 'article',
          props: {
            'font-family': undefined,
            'font-weight': '600',
            'font-style': 'normal',
          },
        },
        {
          text: 'after',
          props: {
            'font-family': 'font1',
            'font-weight': '600',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should support content: attr(...)', function () {
      const htmlText = [
        '<style>div:after { content: attr(data-foo); font-family: font1; }</style>',
        '<div data-foo="bar"></div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'bar',
          props: {
            'font-family': 'font1',
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should support content: counter() with an explicit list-style', function () {
      const htmlText = [
        '<html><head>',
        '<style>html { counter-reset: section 1; }</style>',
        '<style>div:after { content: counter(section, upper-roman); font-family: font1; }</style>',
        '</head><body>',
        '<div>foo</div>',
        '</body></html>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'foo',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
        {
          text: 'I',
          props: {
            'font-family': 'font1',
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
      ]);
    });

    describe('with content: counters()', function () {
      it('should support the 2 argument form without an explicit counter style', function () {
        const htmlText = [
          '<html><head>',
          '<style>html { counter-reset: section 1; }</style>',
          '<style>div:after { content: counters(section, "."); font-family: font1; }</style>',
          '</head><body>',
          '<div></div>',
          '</body></html>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: '1.',
            props: {
              'font-family': 'font1',
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
        ]);
      });

      it('should support the 3 argument form with a built-in counter-style', function () {
        const htmlText = [
          '<html><head>',
          '<style>html { counter-reset: section 1; }</style>',
          '<style>div:after { content: counters(section, ".", upper-roman); font-family: font1; }</style>',
          '</head><body>',
          '<div></div>',
          '</body></html>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'I.',
            props: {
              'font-family': 'font1',
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
        ]);
      });

      it('should support the 3 argument form with a custom @counter-style', function () {
        const htmlText = [
          '<html><head>',
          '<style>html { counter-reset: section 1; }</style>',
          '<style>@counter-style circled-alpha { system: fixed; symbols: Ⓐ Ⓑ Ⓒ }</style>',
          '<style>div:after { content: counters(section, ".", circled-alpha); font-family: font1; }</style>',
          '</head><body>',
          '<div></div>',
          '</body>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'Ⓐ.',
            props: {
              'font-family': 'font1',
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
        ]);
      });

      it('should support the 3 argument form with a custom @counter-style that references other counters', function () {
        const htmlText = [
          '<style>@counter-style foobar { system: fixed; symbols: "foo" "bar"; }</style>',
          '<style>@counter-style circled-alpha { system: fixed; symbols: Ⓐ Ⓑ Ⓒ; fallback: foobar; }</style>',
          '<style>div:after { content: counters(section, ".", circled-alpha); font-family: font1; }</style>',
          '<div></div>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: '0.',
            props: {
              'font-family': 'font1',
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
        ]);
      });

      it('should support the 3 argument form with a custom @counter-style that references a chain of other counters', function () {
        const htmlText = [
          '<style>@counter-style foo { system: fixed; symbols: "foo"; fallback: decimal; }</style>',
          '<style>@counter-style bar { system: fixed; symbols: "bar"; fallback: foo; }</style>',
          '<style>@counter-style circled-alpha { system: fixed; symbols: Ⓐ Ⓑ Ⓒ; fallback: bar; }</style>',
          '<style>div:after { content: counters(section, ".", circled-alpha); font-family: font1; }</style>',
          '<div></div>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: '0.',
            props: {
              'font-family': 'font1',
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
        ]);
      });
    });

    describe('with @counter-style rules', function () {
      it('should include all the symbols of the counter when it is referenced by a list-style-type declaration', function () {
        const htmlText = [
          '<style>@counter-style circled-alpha { system: fixed; symbols: Ⓐ Ⓑ Ⓒ }</style>',
          '<style>div { font-family: font1; display: list-item; list-style-type: circled-alpha; }</style>',
          '<div>foo</div>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'Ⓐ',
            props: {
              'font-family': 'font1',
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
          {
            text: 'foo',
            props: {
              'font-family': 'font1',
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
        ]);
      });

      it('should support the full syntax of the symbols property', function () {
        const htmlText = [
          '<style>@counter-style circled-alpha { system: fixed; symbols: \'a\' b "c" url(foo.svg) "\\64" "\\"" \'\\\'\'; }</style>',
          '<style>li { font-family: font1; display: list-item; list-style-type: circled-alpha; }</style>',
          '<ol><li></li><li></li><li></li><li></li><li></li><li></li><li></li></ol>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'a',
            props: {
              'font-family': 'font1',
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
          {
            text: 'b',
            props: {
              'font-family': 'font1',
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
          {
            text: 'c',
            props: {
              'font-family': 'font1',
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
          {
            text: 'd',
            props: {
              'font-family': 'font1',
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
          {
            text: '"',
            props: {
              'font-family': 'font1',
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
          {
            text: "'",
            props: {
              'font-family': 'font1',
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
          {
            text: '7',
            props: {
              'font-family': 'font1',
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
        ]);
      });

      it('should pick up the text from all @counter-style properties', function () {
        const htmlText = [
          '<style>@counter-style circled-alpha { system: fixed; symbols: Ⓐ Ⓑ Ⓒ; prefix: "p"; suffix: "s"; pad: 5 "q"; }</style>',
          '<style>li { font-family: font1; list-style-type: circled-alpha; }</style>',
          '<ol><li></li></ol>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'pⒶsq',
            props: {
              'font-family': 'font1',
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
        ]);
      });

      it('should utilize the fallback counter', function () {
        const htmlText = [
          '<style>@counter-style circled-alpha { system: fixed; symbols: Ⓐ; fallback: upper-roman }</style>',
          '<style>div { font-family: font1; display: list-item; list-style-type: circled-alpha; }</style>',
          '<div>foo</div><div></div>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'Ⓐ',
            props: {
              'font-family': 'font1',
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
          {
            text: 'foo',
            props: {
              'font-family': 'font1',
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
          {
            text: 'II',
            props: {
              'font-family': 'font1',
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
        ]);
      });

      it("should utilize the fallback counter's fallback", function () {
        const htmlText = [
          '<style>@counter-style foo { system: fixed; symbols: Ⓐ; fallback: bar }</style>',
          '<style>@counter-style bar { system: fixed; symbols: X Y; fallback: baz }</style>',
          '<style>@counter-style baz { system: fixed; symbols: Æ Ø Å; fallback: upper-roman }</style>',
          '<style>li { list-style-type: foo }</style>',
          '<ol><li></li><li></li><li></li><li></li></ol>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          { text: 'Ⓐ' },
          { text: 'Y' },
          { text: 'Å' },
          { text: 'IV' },
        ]);
      });

      it('should trace conditional @counter-style declarations', function () {
        const htmlText = [
          '<style>@counter-style circled-alpha { system: fixed; symbols: Ⓐ Ⓑ Ⓒ }</style>',
          '<style>@media 3dglasses { @counter-style circled-alpha { system: fixed; symbols: Ⓓ Ⓔ Ⓕ } }</style>',
          '<style>li { font-family: font1; list-style-type: circled-alpha; }</style>',
          '<ol><li></li></ol>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'Ⓐ',
            props: {
              'font-family': 'font1',
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
          {
            text: 'Ⓓ',
            props: {
              'font-family': 'font1',
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
        ]);
      });

      it('should exclude impossible combinations when tracing conditional @counter-style declarations', function () {
        const htmlText = [
          '<style>@counter-style circled-alpha { system: fixed; symbols: Ⓐ Ⓑ Ⓒ }</style>',
          '<style>li { font-family: font1; list-style-type: circled-alpha; }</style>',
          '<style>@media 3dglasses { @counter-style circled-alpha { system: fixed; symbols: Ⓓ Ⓔ Ⓕ } }</style>',
          '<style>@media 3dglasses { li { font-family: font2; list-style-type: circled-alpha; } }</style>',
          '<ol><li></li></ol>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          // Would be nice to avoid this first one, since all the @media 3dglasses {...} will
          // kick in together, but that would require a more advanced predicate handling:
          {
            text: 'Ⓐ',
            props: {
              'font-family': 'font2',
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
          {
            text: 'Ⓓ',
            props: {
              'font-family': 'font2',
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
          {
            text: 'Ⓐ',
            props: {
              'font-family': 'font1',
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
        ]);
      });

      describe('and counter-increment', function () {
        it('should include the fallback counter if exercised', function () {
          const htmlText = [
            '<html><head>',
            '<style>@counter-style circled-alpha { system: fixed; symbols: Ⓐ Ⓑ Ⓒ Ⓓ Ⓔ Ⓕ; fallback: upper-roman }</style>',
            '<style>html { counter-reset: section 2; }</style>',
            '<style>div:before { content: counter(section, circled-alpha); }</style>',
            '<style>div { font-family: font1; counter-increment: section 2; }</style>',
            '</head><body>',
            '<div></div>',
            '<div></div>',
            '<div></div>',
            '</body></html>',
          ].join('');

          return expect(htmlText, 'to satisfy computed font properties', [
            {
              text: 'Ⓓ',
              props: {
                'font-family': 'font1',
                'font-weight': 'normal',
                'font-style': 'normal',
              },
            },
            {
              text: 'Ⓕ',
              props: {
                'font-family': 'font1',
                'font-weight': 'normal',
                'font-style': 'normal',
              },
            },
            {
              text: 'VIII',
              props: {
                'font-family': 'font1',
                'font-weight': 'normal',
                'font-style': 'normal',
              },
            },
          ]);
        });
      });
    });

    it('should support content: attr(...) mixed with quoted strings', function () {
      const htmlText = [
        '<style>div:after { content: "baz" attr(data-foo) "yadda"; font-family: font1; }</style>',
        '<div data-foo="bar"></div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'bazbaryadda',
          props: {
            'font-family': 'font1',
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should apply inherited pseudo-element properties from lower specificity selectors', function () {
      const htmlText = [
        '<style>div:after { content: "foo" !important; }</style>',
        '<style>.myClass:after { font-family: "myClass" }</style>',
        '<style>#myId:after { font-weight: 900 }</style>',
        '<div id="myId" class="myClass">text</div>',
        '<div class="myClass">text</div>',
        '<div >text</div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'text',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
        {
          text: 'foo',
          props: {
            'font-family': '"myClass"',
            'font-weight': '900',
            'font-style': 'normal',
          },
        },
        {
          text: 'foo',
          props: {
            'font-family': '"myClass"',
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
        {
          text: 'foo',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should support a combination of pseudo elements and media queries', function () {
      const htmlText = [
        '<style>h1:after { content: "foo"; font-family: font1 !important; }</style>',
        '<style>@media 3dglasses { h1:after { content: "bar"; font-family: font1 !important; } }</style>',
        '<h1>h1</h1>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'h1',
          props: {
            'font-family': undefined,
            'font-weight': 'bold',
            'font-style': 'normal',
          },
        },
        {
          text: 'bar',
          props: {
            'font-family': 'font1',
            'font-weight': 'bold',
            'font-style': 'normal',
          },
        },
        {
          text: 'foo',
          props: {
            'font-family': 'font1',
            'font-weight': 'bold',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should not confuse :before and :after properties', function () {
      const htmlText = [
        '<style>.after:after { content: "after"; font-family: font1 !important; }</style>',
        '<style>h1:before { content: "before"; font-family: font2; }</style>',
        '<h1 class="after">h1</h1>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'before',
          props: {
            'font-family': 'font2',
            'font-weight': 'bold',
            'font-style': 'normal',
          },
        },
        {
          text: 'h1',
          props: {
            'font-family': undefined,
            'font-weight': 'bold',
            'font-style': 'normal',
          },
        },
        {
          text: 'after',
          props: {
            'font-family': 'font1',
            'font-weight': 'bold',
            'font-style': 'normal',
          },
        },
      ]);
    });

    describe('with ::first-letter', function () {
      it('should do a separate trace and derive the right styling for the first letter', function () {
        const htmlText = [
          '<style>p::first-letter { font-weight: 700; }</style>',
          '<p>foo</p>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          { text: 'f', props: { 'font-weight': '700' } },
          { text: 'oo', props: { 'font-weight': 'normal' } },
        ]);
      });

      it('should ignore leading whitespace when identifying the first letter', function () {
        const htmlText = [
          '<style>p::first-letter { font-weight: 700; }</style>',
          '<p>  \n \t foo</p>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          { text: '    \t f', props: { 'font-weight': '700' } },
          { text: 'oo', props: { 'font-weight': 'normal' } },
        ]);
      });

      it('should not dive into child elements', function () {
        const htmlText = [
          '<style>p::first-letter { font-weight: 700; }</style>',
          '<p><div>foo</div></p>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          { text: 'foo', props: { 'font-weight': 'normal' } },
        ]);
      });

      it('should not extract text after a child element', function () {
        const htmlText = [
          '<style>p::first-letter { font-weight: 700; }</style>',
          '<p><div>foo</div>bar</p>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          { text: 'foo', props: { 'font-weight': 'normal' } },
          { text: 'bar', props: { 'font-weight': 'normal' } },
        ]);
      });

      it('should include a leading quote marker in the first letter trace', function () {
        const htmlText = [
          '<style>p::first-letter { font-weight: 700; }</style>',
          '<p>"foo</p>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          { text: '"f', props: { 'font-weight': '700' } },
          { text: 'oo', props: { 'font-weight': 'normal' } },
        ]);
      });

      it('should include a leading quote marker from ::before', function () {
        const htmlText = [
          "<style>p::before { content: '\"a'; }</style>",
          '<style>p::first-letter { font-weight: 700; }</style>',
          '<p>foo</p>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          { text: '"a', props: { 'font-weight': '700' } },
          { text: 'foo', props: { 'font-weight': 'normal' } },
        ]);
      });

      it('should retain the unrelated styling from ::before when combining with ::first-letter', function () {
        const htmlText = [
          "<style>p::before { content: 'a'; font-style: italic; }</style>",
          '<style>p::first-letter { font-weight: 700; }</style>',
          '<p>foo</p>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'a',
            props: { 'font-weight': '700', 'font-style': 'italic' },
          },
          {
            text: 'foo',
            props: { 'font-weight': 'normal', 'font-style': 'normal' },
          },
        ]);
      });

      it('should include a leading quote marker from ::after', function () {
        const htmlText = [
          "<style>p::after { content: '\"a'; }</style>",
          '<style>p::first-letter { font-weight: 700; }</style>',
          '<p></p>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          { text: '"a', props: { 'font-weight': '700' } },
        ]);
      });

      // This is counter-intuitive, but has been observed in both Chrome and Firefox
      it('should not combine a leading quote marker from ::before with a letter from the element', function () {
        const htmlText = [
          "<style>p::before { content: '\"'; }</style>",
          '<style>p::first-letter { font-weight: 700; }</style>',
          '<p>foo</p>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          { text: '"', props: { 'font-weight': '700' } },
          { text: 'foo', props: { 'font-weight': 'normal' } },
        ]);
      });

      it('should get the first letter from the ::before pseudo element', function () {
        const htmlText = [
          "<style>p::before { content: 'bar'; font-weight: 200; }</style>",
          '<style>p::first-letter { font-weight: 700; }</style>',
          '<p>foo</p>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          { text: 'b', props: { 'font-weight': '700' } },
          { text: 'ar', props: { 'font-weight': '200' } },
          { text: 'foo', props: { 'font-weight': 'normal' } },
        ]);
      });

      it('should get the first letter from the ::after pseudo element if it is the only content', function () {
        const htmlText = [
          "<style>p::after { content: 'foo'; font-weight: 200; }</style>",
          '<style>p::first-letter { font-weight: 700; }</style>',
          '<p></p>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          { text: 'f', props: { 'font-weight': '700' } },
          { text: 'oo', props: { 'font-weight': '200' } },
        ]);
      });

      it('should compose with other conditionals', function () {
        const htmlText = [
          "<style>@media 3dglasses { p::before { content: 'abc' } }</style>",
          '<style>p::first-letter { font-weight: 700; }</style>',
          '<p>foo</p>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          { text: 'a', props: { 'font-weight': '700' } },
          { text: 'f', props: { 'font-weight': '700' } },
          { text: 'bc', props: { 'font-weight': 'normal' } },
          { text: 'oo', props: { 'font-weight': 'normal' } },
        ]);
      });
    });

    describe('with ::first-line', function () {
      it('should pessimistically assume that all of the content is rendered in both the base and the ::first-line style', function () {
        const htmlText = [
          '<style>p::first-line { font-weight: 700; }</style>',
          '<p>foo bar quux</p>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          { text: 'foo bar quux', props: { 'font-weight': '700' } },
          { text: 'foo bar quux', props: { 'font-weight': 'normal' } },
        ]);
      });

      it('should have a lower precedence than ::first-letter, even when it occurs later in the cascade', function () {
        const htmlText = [
          '<style>div::first-letter { font-weight: 700; }</style>',
          '<style>div::first-line { font-weight: 200; font-style: italic; }</style>',
          '<div>foo</div>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'f',
            props: { 'font-weight': '700', 'font-style': 'italic' },
          },
          {
            text: 'f',
            props: { 'font-weight': '700', 'font-style': 'normal' },
          },
          {
            text: 'oo',
            props: { 'font-weight': '200', 'font-style': 'italic' },
          },
          {
            text: 'oo',
            props: { 'font-weight': 'normal', 'font-style': 'normal' },
          },
        ]);
      });

      it('should exclude content after the first linebreak from the ::first-line part, <br> case', function () {
        const htmlText = [
          '<style>p::first-line { font-weight: 700; }</style>',
          '<p>foo bar<br>quux</p>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          { text: 'foo bar', props: { 'font-weight': '700' } },
          { text: 'foo bar\nquux', props: { 'font-weight': 'normal' } },
        ]);
      });

      it('should not let a regular linebreak interfere with the ::first-line tracing', function () {
        const htmlText = [
          '<style>p::first-line { font-weight: 700; }</style>',
          '<p>foo\nbar<br>quux</p>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          { text: 'foo bar', props: { 'font-weight': '700' } },
          { text: 'foo bar\nquux', props: { 'font-weight': 'normal' } },
        ]);
      });

      it('should exclude content after the first linebreak from the ::first-line part, white-space:pre case', function () {
        const htmlText = [
          '<style>pre::first-line { font-weight: 700; }</style>',
          '<pre>foo bar\nquux</pre>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          { text: 'foo bar', props: { 'font-weight': '700' } },
          { text: 'foo bar\nquux', props: { 'font-weight': 'normal' } },
        ]);
      });

      it('should exclude content after the first linebreak from the ::first-line part, conditional white-space:pre case', function () {
        const htmlText = [
          '<style>div::first-line { font-weight: 700; }</style>',
          '<style>@media 3dglasses { div { white-space: pre; font-style: italic; } }</style>',
          '<div>foo bar\nquux</div>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'foo bar',
            props: { 'font-weight': '700', 'font-style': 'italic' },
          },
          {
            text: 'foo bar quux',
            props: { 'font-weight': '700', 'font-style': 'normal' },
          },
          {
            text: 'foo bar\nquux',
            props: { 'font-weight': 'normal', 'font-style': 'italic' },
          },
          {
            text: 'foo bar quux',
            props: { 'font-weight': 'normal', 'font-style': 'normal' },
          },
        ]);
      });

      it('should include ::before and ::after', function () {
        const htmlText = [
          '<style>p::first-line { font-weight: 700; }</style>',
          "<style>p::before { content: 'foo'; }</style>",
          "<style>p::after { content: 'quux'; }</style>",
          '<p>bar</p>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          { text: 'foo', props: { 'font-weight': '700' } },
          { text: 'bar', props: { 'font-weight': '700' } },
          { text: 'quux', props: { 'font-weight': '700' } },
          { text: 'foo', props: { 'font-weight': 'normal' } },
          { text: 'bar', props: { 'font-weight': 'normal' } },
          { text: 'quux', props: { 'font-weight': 'normal' } },
        ]);
      });
    });

    describe('with ::placeholder', function () {
      it('should apply to the placeholder text of an input', function () {
        const htmlText = [
          '<style>input::placeholder { font-family: foo; }</style>',
          '<input placeholder="foobar" value="hey">',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          { text: 'hey', props: { 'font-family': undefined } },
          { text: 'foobar', props: { 'font-family': 'foo' } },
        ]);
      });

      it('should compose with conditionals', function () {
        const htmlText = [
          '<style>@media 3dglasses { input::placeholder { font-family: foo; } }</style>',
          '<input placeholder="foobar" value="hey">',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          { text: 'hey', props: { 'font-family': undefined } },
          { text: 'foobar', props: { 'font-family': 'foo' } },
          { text: 'foobar', props: { 'font-family': undefined } },
        ]);
      });
    });
  });

  describe('with display:list-item', function () {
    it('should include the default list indicators in the subset', function () {
      const htmlText = ['<ol><li>foo</li></ol>'].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: '1.',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
        {
          text: 'foo',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should include the indicators when display:list-item and list-style-type are applied to an element', function () {
      const htmlText = [
        '<style>div { display: list-item; list-style-type: upper-roman; }</style>',
        '<div>foo</div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'I.',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
        {
          text: 'foo',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should recognize "display: list-item block;" as a list item', function () {
      const htmlText = [
        '<style>div { display: list-item block; list-style-type: upper-roman; }</style>',
        '<div>foo</div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'I.',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
        {
          text: 'foo',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should support list-style-type provided as a string', function () {
      const htmlText = [
        "<style>div { display: list-item; list-style-type: 'yeah'; }</style>",
        '<div>foo</div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'yeah',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
        {
          text: 'foo',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
      ]);
    });

    // https://developer.mozilla.org/en-US/docs/Web/CSS/list-style-type#symbols()
    describe('with a list-style-type provided as "anonymous" counter-style', function () {
      it('should trace the resulting symbols', async function () {
        const htmlText = [
          '<style>li { list-style-type: symbols(cyclic "*" "†" "‡"); }</style>',
          '<ol><li>foo</li><li>bar</li></ol>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          { text: '*' },
          { text: 'foo' },
          { text: '†' },
          { text: 'bar' },
        ]);
      });

      it('should not break with symbols()', async function () {
        const htmlText = [
          '<html><head><style>',
          'li { list-style-type: symbols(); }',
          '</style></head><body><ol><li>foo</li></ol></body></html>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          { text: '1' },
          { text: 'foo' },
        ]);
      });
    });

    it('should include the indicators when display:list-item and list-style are applied to an element', function () {
      const htmlText = [
        '<style>div { display: list-item; list-style: upper-roman inside; }</style>',
        '<div>foo</div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'I.',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
        {
          text: 'foo',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should include the indicators even with the display:list-item does not have text', function () {
      const htmlText = [
        '<style>div { display: list-item; list-style: upper-roman inside; }</style>',
        '<div></div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'I.',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should combine with conditionals', function () {
      const htmlText = [
        '<style>li { list-style-type: decimal; font-weight: 400 }</style>',
        '<style>@media 3dglasses { li { list-style-type: upper-roman; } } </style>',
        '<li>Hello</li>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'I.',
          props: {
            'font-family': undefined,
            'font-weight': '400',
            'font-style': 'normal',
          },
        },
        {
          text: '1.',
          props: {
            'font-family': undefined,
            'font-weight': '400',
            'font-style': 'normal',
          },
        },
        {
          text: 'Hello',
          props: {
            'font-family': undefined,
            'font-weight': '400',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should account for all possible list item numbers when one of the preceding items has a varying display', function () {
      const htmlText = [
        '<style media="3dglasses">.foo { display: none; }</style>',
        '<style>li:nth-child(2) { font-weight: 700; }</style>',
        '<ol><li></li><li class="foo"></li><li></li><li></li></ol>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: '1.',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
        {
          text: '2.',
          props: {
            'font-family': undefined,
            'font-weight': '700',
            'font-style': 'normal',
          },
        },
        {
          text: '2.3.',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
        {
          text: '3.4.',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
      ]);
    });

    describe('and the ::marker pseudo class', function () {
      describe('without content', function () {
        it('should apply the ::marker styling to the list-style-type and also include a fallback trace for browsers that do not support ::marker', function () {
          const htmlText = [
            '<style>ol li::marker { font-family: font1; font-weight: 700; }</style>',
            '<ol><li>foo</li></ol>',
          ].join('');

          return expect(htmlText, 'to satisfy computed font properties', [
            {
              text: '1.', // ol defaults to list-style-type: decimal
              props: {
                'font-family': undefined,
                'font-weight': 'normal',
                'font-style': 'normal',
              },
            },
            {
              text: 'foo',
              props: {
                'font-family': undefined,
                'font-weight': 'normal',
                'font-style': 'normal',
              },
            },
            {
              text: '1.', // ol defaults to list-style-type: decimal
              pseudoElementName: 'marker',
              props: {
                'font-family': 'font1',
                'font-weight': '700',
                'font-style': 'normal',
              },
            },
          ]);
        });

        it('should not apply the ::marker styling to a node that does not have display: list-item', function () {
          const htmlText = [
            '<style>ol li { display: block } ol li::marker { font-family: font1; font-weight: 700; }</style>',
            '<ol><li>foo</li></ol>',
          ].join('');

          return expect(htmlText, 'to satisfy computed font properties', [
            {
              text: 'foo',
              props: {
                'font-family': undefined,
                'font-weight': 'normal',
                'font-style': 'normal',
              },
            },
          ]);
        });
      });

      describe('with content', function () {
        it('should apply the ::marker styling to the content  and also include a fallback trace for browsers that do not support ::marker', function () {
          const htmlText = [
            '<style>ol li::marker { font-family: font1; font-weight: 700; content: "\\2713"; }</style>',
            '<ol><li>foo</li></ol>',
          ].join('');

          return expect(htmlText, 'to satisfy computed font properties', [
            {
              text: '1.', // ol defaults to list-style-type: decimal
              props: {
                'font-family': undefined,
                'font-weight': 'normal',
                'font-style': 'normal',
              },
            },
            {
              text: 'foo',
              props: {
                'font-family': undefined,
                'font-weight': 'normal',
                'font-style': 'normal',
              },
            },
            {
              text: '✓',
              pseudoElementName: 'marker',
              props: {
                'font-family': 'font1',
                'font-weight': '700',
                'font-style': 'normal',
              },
            },
          ]);
        });

        it('should not apply the ::marker styling to a node that does not have display: list-item', function () {
          const htmlText = [
            '<style>ol li { display: block } ol li::marker { font-family: font1; font-weight: 700; content: "\\2713"; }</style>',
            '<ol><li>foo</li></ol>',
          ].join('');

          return expect(htmlText, 'to satisfy computed font properties', [
            {
              text: 'foo',
              props: {
                'font-family': undefined,
                'font-weight': 'normal',
                'font-style': 'normal',
              },
            },
          ]);
        });
      });
    });
  });

  describe('CSS pseudo selectors', function () {
    it('should handle stand alone pseudo selector', function () {
      const htmlText = [
        '<style>:hover > span { font-family: font1; }</style>',
        '<div>foo<span>bar</span></div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'bar',
          props: {
            'font-family': 'font1',
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
        {
          text: 'bar',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
        {
          text: 'foo',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should multiply the styles when a pseudo class matches', function () {
      const htmlText = [
        '<style>div:hover { font-family: font1; font-weight: bold }</style>',
        '<div>foo</div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'foo',
          props: {
            'font-family': 'font1',
            'font-weight': 'bold',
            'font-style': 'normal',
          },
        },
        {
          text: 'foo',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should inherit non-pseudo class values from the non-pseudo node', function () {
      const htmlText = [
        '<style>div { font-family: font1; font-weight: 400 } div:hover { font-weight: 500 }</style>',
        '<div>foo</div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'foo',
          props: {
            'font-family': 'font1',
            'font-weight': '500',
            'font-style': 'normal',
          },
        },
        {
          text: 'foo',
          props: {
            'font-family': 'font1',
            'font-weight': '400',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should multiply pseudo class properties to children', function () {
      const htmlText = [
        '<style>div:hover { font-family: font1; }</style>',
        '<div>foo<span>bar</span></div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'bar',
          props: {
            'font-family': 'font1',
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
        {
          text: 'bar',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
        {
          text: 'foo',
          props: {
            'font-family': 'font1',
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
        {
          text: 'foo',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
      ]);
    });
  });

  describe('with CSS @media queries', function () {
    it('should include the possibility of the media query matching or not matching', function () {
      const htmlText = [
        '<style>div { font-family: font1; font-weight: 400 } @media (max-width: 600px) { div { font-weight: 500 } }</style>',
        '<div>foo</div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'foo',
          props: {
            'font-family': 'font1',
            'font-weight': '500',
            'font-style': 'normal',
          },
        },
        {
          text: 'foo',
          props: {
            'font-family': 'font1',
            'font-weight': '400',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should include the possibility of a media attribute matching or not matching', function () {
      const htmlText = [
        '<style>div { font-family: font1; font-weight: 400 }</style>',
        '<style media="projection">div { font-family: font2; font-weight: 800 }</style>',
        '<div>foo</div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'foo',
          props: {
            'font-family': 'font2',
            'font-weight': '800',
            'font-style': 'normal',
          },
        },
        {
          text: 'foo',
          props: {
            'font-family': 'font1',
            'font-weight': '400',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should trace two levels of media queries when a media attribute is present and the referenced stylesheet contains a @media rule', function () {
      const htmlText = [
        '<style>div { font-family: font1; font-weight: 400 }</style>',
        '<style media="projection">div { font-family: font2; font-weight: 800 } @media (max-width: 600px) { div { font-weight: 500 } }</style>',
        '<div>foo</div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'foo',
          props: {
            'font-style': 'normal',
            'font-weight': '800',
            'font-family': 'font2',
          },
        },
        {
          text: 'foo',
          props: {
            'font-style': 'normal',
            'font-weight': '500',
            'font-family': 'font2',
          },
        },
        {
          text: 'foo',
          props: {
            'font-style': 'normal',
            'font-weight': '400',
            'font-family': 'font1',
          },
        },
      ]);
    });

    it('should support nested @media queries', function () {
      const htmlText = [
        '<style>div { font-family: font1; font-weight: 400 }</style>',
        '<style>@media projection { div { font-family: font2; font-weight: 800 } @media (max-width: 600px) { div { font-weight: 500 } } }</style>',
        '<div>foo</div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'foo',
          props: {
            'font-style': 'normal',
            'font-weight': '800',
            'font-family': 'font2',
          },
        },
        {
          text: 'foo',
          props: {
            'font-style': 'normal',
            'font-weight': '500',
            'font-family': 'font2',
          },
        },
        {
          text: 'foo',
          props: {
            'font-style': 'normal',
            'font-weight': '400',
            'font-family': 'font1',
          },
        },
      ]);
    });

    it('should trace multiple levels of @import tagged with media lists', async function () {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/nestedCssImportWithMedia/'
        ),
      });

      const [htmlAsset] = await assetGraph.loadAssets('index.html');
      await assetGraph.populate();

      expect(
        fontTracer(htmlAsset.parseTree, {
          stylesheetsWithPredicates: gatherStylesheetsWithPredicates(
            htmlAsset.assetGraph,
            htmlAsset
          ),
          getCssRulesByProperty,
          htmlAsset,
        }),
        'to satisfy',
        [
          {
            text: 'foo',
            props: {
              'font-family': undefined,
              'font-weight': '500',
              'font-style': 'normal',
            },
          },
          {
            text: 'foo',
            props: {
              'font-family': undefined,
              'font-weight': '600',
              'font-style': 'normal',
            },
          },
          {
            text: 'foo',
            props: {
              'font-family': undefined,
              'font-weight': '700',
              'font-style': 'normal',
            },
          },
          {
            text: '        ',
            props: {
              'font-family': undefined,
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
          {
            text: ' ',
            props: {
              'font-family': undefined,
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
        ]
      );
    });
  });

  describe('with CSS @supports queries', function () {
    it('should include the possibility of the query matching or not matching', function () {
      const htmlText = [
        '<style>div { font-family: font1; font-weight: 400 } @supports (--foo: green) { div { font-weight: 500 } }</style>',
        '<div>foo</div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'foo',
          props: {
            'font-family': 'font1',
            'font-weight': '500',
            'font-style': 'normal',
          },
        },
        {
          text: 'foo',
          props: {
            'font-family': 'font1',
            'font-weight': '400',
            'font-style': 'normal',
          },
        },
      ]);
    });
  });

  describe('font-shorthand property', function () {
    it('should have shorthand value override previous longhand value', function () {
      const htmlText = [
        '<style>h1 { font-weight: normal; font: bold 10px "famfam"; }</style>',
        '<h1>foo</h1>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'foo',
          props: {
            'font-family': 'famfam',
            'font-weight': 'bold',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should have longhand value override previous shorthand value', function () {
      const htmlText = [
        '<style>h1 { font: bold 10px "famfam"; font-weight: normal; }</style>',
        '<h1>foo</h1>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'foo',
          props: {
            'font-family': 'famfam',
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
      ]);
    });
  });

  describe('with CSS animations', function () {
    it('should support the animation shorthand', function () {
      const htmlText = [
        '<style>@keyframes foo { 100% { font-weight: 400 } }</style>',
        '<style>h1 { font-weight: 100; animation: 3s ease-in 1s 2 reverse both foo; }</style>',
        '<h1>bar</h1>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'bar',
          props: {
            'font-family': undefined,
            'font-weight': '100',
            'font-style': 'normal',
          },
        },
        {
          text: 'bar',
          props: {
            'font-family': undefined,
            'font-weight': '200',
            'font-style': 'normal',
          },
        },
        {
          text: 'bar',
          props: {
            'font-family': undefined,
            'font-weight': '300',
            'font-style': 'normal',
          },
        },
        {
          text: 'bar',
          props: {
            'font-family': undefined,
            'font-weight': '400',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should pick up all values of font-style used in an animation', function () {
      const htmlText = [
        '<style>@keyframes foo { 50% { font-style: oblique; } 100% { font-style: italic; } }</style>',
        '<style>h1 { font-style: normal; animation-name: foo; }</style>',
        '<h1>bar</h1>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'bar',
          props: {
            'font-family': undefined,
            'font-weight': 'bold',
            'font-style': 'normal',
          },
        },
        {
          text: 'bar',
          props: {
            'font-family': undefined,
            'font-weight': 'bold',
            'font-style': 'oblique',
          },
        },
        {
          text: 'bar',
          props: {
            'font-family': undefined,
            'font-weight': 'bold',
            'font-style': 'italic',
          },
        },
      ]);
    });

    it('should support list-style-type being animated', function () {
      const htmlText = [
        '<style>@keyframes foo { 50% { list-style-type: decimal; } 100% { list-style-type: upper-roman; } }</style>',
        '<style>ol > li { list-style-type: "quux"; animation-name: foo; }</style>',
        '<ol><li>bar</li></ol>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'quux',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
        {
          text: '1.',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
        {
          text: 'I.',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
        {
          text: 'bar',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should trace the intermediate values of font-weight', function () {
      const htmlText = [
        '<style>@keyframes foo { 100% { font-weight: 400 } }</style>',
        '<style>h1 { font-weight: 100; animation-name: foo; }</style>',
        '<h1>bar</h1>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'bar',
          props: {
            'font-family': undefined,
            'font-weight': '100',
            'font-style': 'normal',
          },
        },
        {
          text: 'bar',
          props: {
            'font-family': undefined,
            'font-weight': '200',
            'font-style': 'normal',
          },
        },
        {
          text: 'bar',
          props: {
            'font-family': undefined,
            'font-weight': '300',
            'font-style': 'normal',
          },
        },
        {
          text: 'bar',
          props: {
            'font-family': undefined,
            'font-weight': '400',
            'font-style': 'normal',
          },
        },
      ]);
    });

    // This doesn't really make sense, but it works in browsers
    it('should support animating the content attribute', function () {
      const htmlText = [
        '<style>@keyframes foo { 100% { content: "bar"; } }</style>',
        '<style>div:before { content: "foo"; animation: 3s ease-in 1s 2 reverse both paused foo; }</style>',
        '<div></div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'foo',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
        {
          text: 'bar',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should handle conditional animations', function () {
      const htmlText = [
        '<style>@media 3dglasses { @keyframes foo { from { font-weight: 100; } to { font-weight: 400; } } }</style>',
        '<style>@keyframes foo { from { font-weight: 400; } to { font-weight: 700; } }</style>',
        '<style>h1 { font-weight: 400; animation-name: foo; }</style>',
        '<h1>bar</h1>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'bar',
          props: {
            'font-family': undefined,
            'font-weight': '400',
            'font-style': 'normal',
          },
        },
        {
          text: 'bar',
          props: {
            'font-family': undefined,
            'font-weight': '100',
            'font-style': 'normal',
          },
        },
        {
          text: 'bar',
          props: {
            'font-family': undefined,
            'font-weight': '200',
            'font-style': 'normal',
          },
        },
        {
          text: 'bar',
          props: {
            'font-family': undefined,
            'font-weight': '300',
            'font-style': 'normal',
          },
        },
        {
          text: 'bar',
          props: {
            'font-family': undefined,
            'font-weight': '500',
            'font-style': 'normal',
          },
        },
        {
          text: 'bar',
          props: {
            'font-family': undefined,
            'font-weight': '600',
            'font-style': 'normal',
          },
        },
        {
          text: 'bar',
          props: {
            'font-family': undefined,
            'font-weight': '700',
            'font-style': 'normal',
          },
        },
      ]);
    });
  });

  describe('with CSS transitions', function () {
    describe('with the transition shorthand', function () {
      it('should trace all intermediate values of font-weight', function () {
        const htmlText = [
          '<style>h1 { font-weight: 400; transition: width 2s, height 2s, font-weight 2s, transform 2s; }</style>',
          '<style>h1:hover { font-weight: 700; }</style>',
          '<h1>bar</h1>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'bar',
            props: {
              'font-family': undefined,
              'font-weight': '700',
              'font-style': 'normal',
            },
          },
          {
            text: 'bar',
            props: {
              'font-family': undefined,
              'font-weight': '400',
              'font-style': 'normal',
            },
          },
          {
            text: 'bar',
            props: {
              'font-family': undefined,
              'font-weight': '500',
              'font-style': 'normal',
            },
          },
          {
            text: 'bar',
            props: {
              'font-family': undefined,
              'font-weight': '600',
              'font-style': 'normal',
            },
          },
        ]);
      });
    });

    describe('with transition-property passed separately', function () {
      it('should trace all intermediate values of font-weight when explicitly passed', function () {
        const htmlText = [
          '<style>h1 { font-weight: 400; transition-property: font-weight; transition-duration: 4s; }</style>',
          '<style>h1:hover { font-weight: 700; }</style>',
          '<h1>bar</h1>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'bar',
            props: {
              'font-family': undefined,
              'font-weight': '700',
              'font-style': 'normal',
            },
          },
          {
            text: 'bar',
            props: {
              'font-family': undefined,
              'font-weight': '400',
              'font-style': 'normal',
            },
          },
          {
            text: 'bar',
            props: {
              'font-family': undefined,
              'font-weight': '500',
              'font-style': 'normal',
            },
          },
          {
            text: 'bar',
            props: {
              'font-family': undefined,
              'font-weight': '600',
              'font-style': 'normal',
            },
          },
        ]);
      });

      it('should trace all intermediate values of font-weight when `all` is passed', function () {
        const htmlText = [
          '<style>h1 { font-weight: 400; transition-property: all; transition-duration: 4s; }</style>',
          '<style>h1:hover { font-weight: 700; }</style>',
          '<h1>bar</h1>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'bar',
            props: {
              'font-family': undefined,
              'font-weight': '700',
              'font-style': 'normal',
            },
          },
          {
            text: 'bar',
            props: {
              'font-family': undefined,
              'font-weight': '400',
              'font-style': 'normal',
            },
          },
          {
            text: 'bar',
            props: {
              'font-family': undefined,
              'font-weight': '500',
              'font-style': 'normal',
            },
          },
          {
            text: 'bar',
            props: {
              'font-family': undefined,
              'font-weight': '600',
              'font-style': 'normal',
            },
          },
        ]);
      });

      it('should not trace intermediate values of font-weight when neither `all` nor `font-weight` is passed', function () {
        const htmlText = [
          '<style>h1 { font-weight: 400; transition-property: color; }</style>',
          '<style>h1:hover { font-weight: 700; }</style>',
          '<h1>bar</h1>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'bar',
            props: {
              'font-family': undefined,
              'font-weight': '700',
              'font-style': 'normal',
            },
          },
          {
            text: 'bar',
            props: {
              'font-family': undefined,
              'font-weight': '400',
              'font-style': 'normal',
            },
          },
        ]);
      });
    });
  });

  describe('with conditional comments', function () {
    describe('of the "if IE" kind where the contained HTML is technically part of the comment node', function () {
      it('should trace text inside the conditional comment', function () {
        const htmlText = [
          '<style>div { font-weight: 700; }</style>',
          '<div>',
          '  <!--[if IE]>',
          '    foo',
          '  <![endif]-->',
          '</div>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: '      foo  ',
            props: {
              'font-family': undefined,
              'font-weight': '700',
              'font-style': 'normal',
            },
          },
        ]);
      });

      it('should trace the DOM nodes inside the conditional comment', function () {
        const htmlText = [
          '<!--[if IE]>',
          '  <div>foo</div>',
          '<![endif]-->',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'foo',
            props: {
              'font-family': undefined,
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
          {
            text: '  ',
            props: {
              'font-family': undefined,
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
        ]);
      });

      it('should trace the DOM nodes inside the conditional comment in the context of the containing document', function () {
        const htmlText = [
          '<style>section div { font-weight: 700 }</style>',
          '<section>',
          '  <!--[if IE]>',
          '    <div>foo</div>',
          '  <![endif]-->',
          '</section>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'foo',
            props: {
              'font-family': undefined,
              'font-weight': '700',
              'font-style': 'normal',
            },
          },
          {
            text: '        ',
            props: {
              'font-family': undefined,
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
        ]);
      });

      it('should trace the DOM nodes inside the conditional comment as conditional irt. the number of list items', function () {
        const htmlText = [
          '<ol>',
          '  <!--[if IE]>',
          '    <li></li>',
          '  <![endif]-->',
          '  <li style="list-style-type: upper-roman"></li>',
          '</ol>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: '1.',
            props: {
              'font-family': undefined,
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
          {
            text: 'I.II.',
            props: {
              'font-family': undefined,
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
          {
            text: '          ',
            props: {
              'font-family': undefined,
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
        ]);
      });

      it('should treat contained stylesheets as conditionals', function () {
        const htmlText = [
          '<!--[if IE]>',
          '  <style>div { font-weight: 700; }</style>',
          '<![endif]-->',
          '<div>foo</div>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'foo',
            props: {
              'font-family': undefined,
              'font-weight': '700',
              'font-style': 'normal',
            },
          },
          {
            text: 'foo',
            props: {
              'font-family': undefined,
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
          {
            text: '  ',
            props: {
              'font-family': undefined,
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
        ]);
      });

      it('should trace stylesheets in multiple conditional comments with the same condition together', function () {
        const htmlText = [
          '<!--[if IE]>',
          '  <style>div { font-weight: 700; }</style>',
          '<![endif]-->',
          '<!--[if IE]>',
          '  <style>div { font-style: italic }</style>',
          '<![endif]-->',
          '<div>foo</div>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'foo',
            props: {
              'font-family': undefined,
              'font-weight': '700',
              'font-style': 'italic',
            },
          },
          {
            text: 'foo',
            props: {
              'font-family': undefined,
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
          {
            text: '    ',
            props: {
              'font-family': undefined,
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
        ]);
      });

      it('should trace stylesheets in multiple conditional comments with different conditions separately', function () {
        const htmlText = [
          '<!--[if IE > 6]>',
          '  <style>div { font-weight: 700; }</style>',
          '<![endif]-->',
          '<!--[if IE > 7]>',
          '  <style>div { font-style: italic }</style>',
          '<![endif]-->',
          '<div>foo</div>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'foo',
            props: {
              'font-family': undefined,
              'font-weight': '700',
              'font-style': 'italic',
            },
          },
          {
            text: 'foo',
            props: {
              'font-family': undefined,
              'font-weight': 'normal',
              'font-style': 'italic',
            },
          },
          {
            text: 'foo',
            props: {
              'font-family': undefined,
              'font-weight': '700',
              'font-style': 'normal',
            },
          },
          {
            text: 'foo',
            props: {
              'font-family': undefined,
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
          {
            text: '    ',
            props: {
              'font-family': undefined,
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
        ]);
      });
    });

    describe('of the "if !IE" kind where the contained HTML is technically part of the containing document', function () {
      it('should trace text inside the conditional comment', function () {
        const htmlText = [
          '<style>div { font-weight: 700; }</style>',
          '<div><!--[if !IE]>-->foo<!--<![endif]--></div>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'foo',
            props: {
              'font-family': undefined,
              'font-weight': '700',
              'font-style': 'normal',
            },
          },
        ]);
      });

      it('should trace the DOM nodes inside the conditional comment', function () {
        const htmlText = [
          '<!--[if !IE]>--><div>foo</div><!--<![endif]-->',
        ].join('\n');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'foo',
            props: {
              'font-family': undefined,
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
        ]);
      });

      it('should trace the DOM nodes inside the conditional comment in the context of the containing document', function () {
        const htmlText = [
          '<style>section div { font-weight: 700 }</style>',
          '<section>',
          '  <!--[if !IE]>-->',
          '    <div>foo</div>',
          '  <!--<![endif]-->',
          '</section>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'foo',
            props: {
              'font-family': undefined,
              'font-weight': '700',
              'font-style': 'normal',
            },
          },
          {
            text: '        ',
            props: {
              'font-family': undefined,
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
        ]);
      });

      it('should trace the DOM nodes inside the conditional comment as conditional irt. the number of list items', function () {
        const htmlText = [
          '<ol>',
          '  <!--[if !IE]>-->',
          '    <li></li>',
          '  <!--<![endif]-->',
          '  <li style="list-style-type: upper-roman"></li>',
          '</ol>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: '1.',
            props: {
              'font-family': undefined,
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
          {
            text: 'I.II.',
            props: {
              'font-family': undefined,
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
          {
            text: '          ',
            props: {
              'font-family': undefined,
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
        ]);
      });

      it('should treat contained stylesheets as conditionals', function () {
        const htmlText = [
          '<!--[if !IE]>--><style>div { font-weight: 700; }</style><!--<![endif]-->',
          '<div>foo</div>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'foo',
            props: {
              'font-family': undefined,
              'font-weight': '700',
              'font-style': 'normal',
            },
          },
          {
            text: 'foo',
            props: {
              'font-family': undefined,
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
        ]);
      });

      it('should trace stylesheets in multiple conditional comments with the same condition together', function () {
        const htmlText = [
          '<!--[if !IE]>--><style>div { font-weight: 700; }</style><!--<![endif]-->',
          '<!--[if !IE]>--><style>div { font-style: italic }</style><!--<![endif]-->',
          '<div>foo</div>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'foo',
            props: {
              'font-family': undefined,
              'font-weight': '700',
              'font-style': 'italic',
            },
          },
          {
            text: 'foo',
            props: {
              'font-family': undefined,
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
        ]);
      });
    });

    it('should treat !IE and IE as an impossible combination that should not generate all possible combinations', function () {
      const htmlText = [
        '<!--[if IE]><style>div { font-style: italic; }</style><![endif]-->',
        '<!--[if !IE]>--><style>div { font-weight: 700; }</style><!--<![endif]-->',
        '<div>foo</div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'foo',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'italic',
          },
        },
        {
          text: 'foo',
          props: {
            'font-family': undefined,
            'font-weight': '700',
            'font-style': 'normal',
          },
        },
      ]);
    });
  });

  describe('with <noscript>', function () {
    it('should trace text inside the element', function () {
      const htmlText = [
        '<style>div { font-weight: 700; }</style>',
        '<div><noscript>foo</noscript></div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'foo',
          props: {
            'font-family': undefined,
            'font-weight': '700',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should trace the DOM nodes inside the element', function () {
      const htmlText = ['<noscript><div>foo</div></noscript>'].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'foo',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should trace the DOM nodes inside the element in the context of the containing document', function () {
      const htmlText = [
        '<style>section noscript div { font-weight: 700 }</style>',
        '<section>',
        '  <noscript>',
        '    <div>foo</div>',
        '  </noscript>',
        '</section>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'foo',
          props: {
            'font-family': undefined,
            'font-weight': '700',
            'font-style': 'normal',
          },
        },
        {
          text: '        ',
          props: {
            'font-family': undefined,
            'font-style': 'normal',
            'font-weight': 'normal',
          },
        },
      ]);
    });

    it('should trace the DOM nodes inside the element as conditional irt. the number of list items', function () {
      const htmlText = [
        '<ol>',
        '  <noscript>',
        '    <li></li>',
        '  </noscript>',
        '  <li style="list-style-type: upper-roman"></li>',
        '</ol>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: '1.',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
        {
          text: 'I.II.',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
        {
          text: '          ',
          props: {
            'font-family': undefined,
            'font-style': 'normal',
            'font-weight': 'normal',
          },
        },
      ]);
    });

    it('should treat contained stylesheets as conditionals', function () {
      const htmlText = [
        '<noscript><style>div { font-weight: 700; }</style></noscript>',
        '<div>foo</div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'foo',
          props: {
            'font-family': undefined,
            'font-weight': '700',
            'font-style': 'normal',
          },
        },
        {
          text: 'foo',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should trace stylesheets in multiple <noscript> elements together', function () {
      const htmlText = [
        '<noscript><style>div { font-weight: 700; }</style></noscript>',
        '<noscript><style>div { font-style: italic }</style></noscript>',
        '<div>foo</div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'foo',
          props: {
            'font-family': undefined,
            'font-weight': '700',
            'font-style': 'italic',
          },
        },
        {
          text: 'foo',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
      ]);
    });
  });

  it('should include a hyphen when a node contains a soft hyphen', function () {
    const htmlText = ['<div>foo&shy;bar</div>'].join('');

    return expect(htmlText, 'to satisfy computed font properties', [
      { text: 'foo-bar' },
    ]);
  });

  describe('with a document that results in different renderings in Chrome and Firefox', function () {
    it('should produce a subset that accommodates both renderings', function () {
      const htmlText = ['<h1>foo<strong>bar</strong></h1>'].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'bar',
          props: {
            'font-family': undefined,
            'font-weight': 'bold+bolder',
            'font-style': 'normal',
          },
        },
        {
          text: 'bar',
          props: {
            'font-family': undefined,
            'font-weight': 'bold',
            'font-style': 'normal',
          },
        },
        {
          text: 'foo',
          props: {
            'font-family': undefined,
            'font-weight': 'bold',
            'font-style': 'normal',
          },
        },
      ]);
    });
  });

  it('should not die when there is a :host() selector', function () {
    const htmlText = [
      '<style>:host(.special-custom-element) { display: block; }</style><h1>foo</h1>',
    ].join('');

    return expect(htmlText, 'to satisfy computed font properties', [
      {
        text: 'foo',
        props: {
          'font-family': undefined,
          'font-style': 'normal',
          'font-weight': 'bold',
        },
      },
    ]);
  });

  describe('with calc(...)', function () {
    describe('and a trivially computable expression', function () {
      it('should replace the calc(...) with the result', function () {
        const htmlText = [
          '<style>div { font-weight: calc(123 + 577); }</style><div>foo</div>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'foo',
            props: {
              'font-family': undefined,
              'font-style': 'normal',
              'font-weight': '700',
            },
          },
        ]);
      });
    });
  });

  describe('with CSS custom properties', function () {
    it('should pick up variable values defined for :root', async function () {
      await expect(
        `
          <style>
            :root {
              --my-font: foo;
            }
            div {
              font-family: var(--my-font);
              color: var(--second-color);
            }
          </style>

          <div>bar</div>
        `,
        'to satisfy computed font properties',
        [
          {
            text: 'bar',
            props: {
              'font-family': 'foo',
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
          {
            text: '                                ',
            props: {
              'font-family': undefined,
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
        ]
      );
    });

    it('should follow the cascade when a property is defined multiple times, most specific last', async function () {
      await expect(
        `
          <style>
            :root {
              --my-font: foo;
            }

            #container {
              --my-font: bar;
            }

            div {
              font-family: var(--my-font);
            }
          </style>

          <div>
            quux
            <div id="container">baz</div>
            blah
          </div>
        `,
        'to satisfy computed font properties',
        [
          {
            text: 'baz',
            props: {
              'font-family': 'bar',
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
          {
            text: '             quux                          blah           ',
            props: {
              'font-family': 'foo',
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
          {
            text: '                                ',
            props: {
              'font-family': undefined,
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
        ]
      );
    });

    it('should follow the cascade when a property is defined multiple times, most specific first', async function () {
      await expect(
        `
          <style>
            #container {
              --my-font: bar;
            }

            :root {
              --my-font: foo;
            }

            div {
              font-family: var(--my-font);
            }
          </style>

          <div>
            quux
            <div id="container">baz</div>
            blah
          </div>
        `,
        'to satisfy computed font properties',
        [
          {
            text: 'baz',
            props: {
              'font-family': 'bar',
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
          {
            text: '             quux                          blah           ',
            props: {
              'font-family': 'foo',
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
          {
            text: '                                ',
            props: {
              'font-family': undefined,
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
        ]
      );
    });

    it('should support usage of custom properties in the definition of other custom properties', async function () {
      await expect(
        `
          <style>
            :root {
              --my-font: foo;
            }

            html {
              --the-actual-font: var(--my-font);
            }

            div {
              font-family: var(--the-actual-font);
            }
          </style>

          <div>bar</div>
        `,
        'to satisfy computed font properties',
        [
          {
            text: 'bar',
            props: {
              'font-family': 'foo',
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
          {
            text: '                                ',
            props: {
              'font-family': undefined,
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
        ]
      );
    });

    it('should trace both variants when a custom property is defined differently in @media blocks', async function () {
      await expect(
        `
          <style>
            @media 3dglasses {
              :root {
                --my-font: foo;
              }
            }
            @media projection {
              :root {
                --my-font: bar;
              }
            }

            div {
              font-family: var(--my-font);
            }
          </style>

          <div>quux</div>
        `,
        'to satisfy computed font properties',
        [
          {
            text: 'quux',
            props: {
              'font-family': 'bar',
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
          {
            text: 'quux',
            props: {
              'font-family': 'foo',
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
          {
            text: 'quux',
            props: {
              'font-family': undefined,
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
          {
            text: '                                ',
            props: {
              'font-family': undefined,
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
        ]
      );
    });

    it('should trace all variants when a custom property with multiple hypothetical values is used to define another one', async function () {
      await expect(
        `
          <style>
            :root {
              --my-font: bar;
            }

            @media 3dglasses {
              :root {
                --my-font: foo;
              }
            }

            div {
              --the-actual-font: var(--my-font);
              font-family: var(--the-actual-font);
            }
          </style>

          <div>baz</div>
        `,
        'to satisfy computed font properties',
        [
          {
            text: 'baz',
            props: {
              'font-family': 'foo',
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
          {
            text: 'baz',
            props: {
              'font-family': 'bar',
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
          {
            text: '                                ',
            props: {
              'font-family': undefined,
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
        ]
      );
    });

    it('should not break when expanding custom properties that lead to impossible predicate combinations', async function () {
      await expect(
        `
          <style>
            :root {
              --my-font: bar;
              font: normal 12px var(--my-font);
            }

            @media 3dglasses {
              :root {
                --my-font: foo;
                font: bold 14px var(--my-font);
              }
            }
          </style>

          <div>baz</div>
        `,
        'to satisfy computed font properties',
        [
          {
            text: 'baz',
            props: {
              'font-family': 'foo',
              'font-style': 'normal',
              'font-weight': 'bold',
            },
          },
          {
            text: 'baz',
            props: {
              'font-family': 'bar',
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
          {
            text: '                                ',
            props: {
              'font-family': 'foo',
              'font-style': 'normal',
              'font-weight': 'bold',
            },
          },
          {
            text: '                                ',
            props: {
              'font-family': 'bar',
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
        ]
      );
    });

    // Regression test for error: localFontPropRules[prop] is not iterable
    it('should not break when an inline style specifies a custom property that has not been defined yet', async function () {
      await expect(
        `<div style="--foo: bar;">foo</div>`,
        'to satisfy computed font properties',
        [
          {
            text: 'foo',
            props: {
              'font-family': undefined,
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
        ]
      );
    });

    describe('with a default value', function () {
      it('should use the default value when the custom property is not defined', async function () {
        await expect(
          `
            <style>
              div {
                font-family: var(--my-font, 'foo');
              }
            </style>

            <div>quux</div>
          `,
          'to satisfy computed font properties',
          [
            {
              text: 'quux',
              props: {
                'font-family': "'foo'",
                'font-style': 'normal',
                'font-weight': 'normal',
              },
            },
            {
              text: '                                      ',
              props: {
                'font-family': undefined,
                'font-style': 'normal',
                'font-weight': 'normal',
              },
            },
          ]
        );
      });

      it('should ignore the default value when the custom property is defined', async function () {
        await expect(
          `
            <style>
              :root {
                --my-font: 'bar';
              }

              div {
                font-family: var(--my-font, 'foo');
              }
            </style>

            <div>quux</div>
          `,
          'to satisfy computed font properties',
          [
            {
              text: 'quux',
              props: {
                'font-family': "'bar'",
                'font-style': 'normal',
                'font-weight': 'normal',
              },
            },
            {
              text: '                                      ',
              props: {
                'font-family': undefined,
                'font-style': 'normal',
                'font-weight': 'normal',
              },
            },
          ]
        );
      });
    });

    it('should fall back to the initial value when a referenced custom property is not defined and there is no default value', async function () {
      await expect(
        `
          <style>
            div {
              font-family: var(--my-font);
            }
          </style>

          <div>quux</div>
        `,
        'to satisfy computed font properties',
        [
          {
            text: 'quux',
            props: {
              'font-family': undefined,
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
          {
            text: '                                ',
            props: {
              'font-family': undefined,
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
        ]
      );
    });

    describe('with custom property look-alikes inside quoted strings', function () {
      it('should leave the content property alone', async function () {
        await expect(
          `
            <style>
              :root {
                --my-font: 'bar';
              }

              div::after {
                content: 'var(--my-font)';
              }
            </style>

            <div></div>
          `,
          'to satisfy computed font properties',
          [
            {
              text: 'var(--my-font)',
              props: {
                'font-family': undefined,
                'font-style': 'normal',
                'font-weight': 'normal',
              },
            },
            {
              text: '                                      ',
              props: {
                'font-family': undefined,
                'font-style': 'normal',
                'font-weight': 'normal',
              },
            },
          ]
        );
      });

      it('should leave the font-family property alone', async function () {
        await expect(
          `
            <style>
              :root {
                --my-font: 'bar';
              }

              div {
                font-family: 'var(--my-font)';
              }
            </style>

            <div>quux</div>
          `,
          'to satisfy computed font properties',
          [
            {
              text: 'quux',
              props: {
                'font-family': "'var(--my-font)'",
                'font-style': 'normal',
                'font-weight': 'normal',
              },
            },
            {
              text: '                                      ',
              props: {
                'font-family': undefined,
                'font-style': 'normal',
                'font-weight': 'normal',
              },
            },
          ]
        );
      });
    });

    describe('with circular references', function () {
      it('should expand to the initial value when a custom property is defined in terms of itself', async function () {
        await expect(
          `
            <style>
              :root {
                --my-font: var(--my-font);
              }
            </style>
            <div>quux</div>
          `,
          'to satisfy computed font properties',
          [
            {
              text: 'quux',
              props: {
                'font-family': undefined,
                'font-style': 'normal',
                'font-weight': 'normal',
              },
            },
            {
              text: '                                     ',
              props: {
                'font-family': undefined,
                'font-style': 'normal',
                'font-weight': 'normal',
              },
            },
          ]
        );
      });

      it('should expand to the initial value when there is a circular reference', async function () {
        await expect(
          `
            <style>
              :root {
                --my-font: var(--my-other-font);
                --my-other-font: var(--my-font);
              }
            </style>
            <div>quux</div>
          `,
          'to satisfy computed font properties',
          [
            {
              text: 'quux',
              props: {
                'font-family': undefined,
                'font-style': 'normal',
                'font-weight': 'normal',
              },
            },
            {
              text: '                                     ',
              props: {
                'font-family': undefined,
                'font-style': 'normal',
                'font-weight': 'normal',
              },
            },
          ]
        );
      });
    });

    describe('combined with CSS animations', function () {
      it('should pick up all values of font-style used in an animation', function () {
        const htmlText = [
          '<style>:root { --my-font-style: normal; }</style>',
          '<style>@keyframes foo { 50% { --my-font-style: oblique; } 100% { --my-font-style: italic; } }</style>',
          '<style>h1 { font-style: var(--my-font-style); animation-name: foo; }</style>',
          '<h1>bar</h1>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'bar',
            props: {
              'font-family': undefined,
              'font-weight': 'bold',
              'font-style': 'normal',
            },
          },
          {
            text: 'bar',
            props: {
              'font-family': undefined,
              'font-weight': 'bold',
              'font-style': 'oblique',
            },
          },
          {
            text: 'bar',
            props: {
              'font-family': undefined,
              'font-weight': 'bold',
              'font-style': 'italic',
            },
          },
        ]);
      });

      it.skip('should trace the intermediate values of font-weight', function () {
        const htmlText = [
          '<style>:root { --my-font-weight: 100 }</style>',
          '<style>@keyframes foo { 100% { --my-font-weight: 400 } }</style>',
          '<style>h1 { font-weight: var(--my-font-weight); animation-name: foo; }</style>',
          '<h1>bar</h1>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'bar',
            props: {
              'font-family': undefined,
              'font-weight': '100',
              'font-style': 'normal',
            },
          },
          {
            text: 'bar',
            props: {
              'font-family': undefined,
              'font-weight': '200',
              'font-style': 'normal',
            },
          },
          {
            text: 'bar',
            props: {
              'font-family': undefined,
              'font-weight': '300',
              'font-style': 'normal',
            },
          },
          {
            text: 'bar',
            props: {
              'font-family': undefined,
              'font-weight': 'normal',
              'font-style': 'normal',
            },
          },
        ]);
      });
    });

    describe('with custom properties in the font shorthand value', function () {
      it('should support a simple font-family value', function () {
        const htmlText = [
          '<style>:root { --my-prop: foo; }</style>',
          '<style>div { font: 12px var(--my-prop) }</style>',
          '<div>bar</div>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'bar',
            props: {
              'font-family': 'foo',
            },
          },
        ]);
      });

      it('should support a complex value', function () {
        const htmlText = [
          '<style>:root { --my-prop: ultra-expanded 12px foo; }</style>',
          '<style>div { font: var(--my-prop) }</style>',
          '<div>bar</div>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'bar',
            props: {
              'font-family': 'foo',
            },
          },
        ]);
      });
    });

    it('should support custom property expansion in the content property', function () {
      const htmlText = [
        "<style>:root { --my-prop: 'the value'; }</style>",
        "<style>@media projection { :root { --my-prop: 'the other value'; } }</style>",
        '<style>div:after { content: var(--my-prop) }</style>',
        '<div></div>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'the other value',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
        {
          text: 'the value',
          props: {
            'font-family': undefined,
            'font-weight': 'normal',
            'font-style': 'normal',
          },
        },
      ]);
    });

    it('should support custom property expansion in the counter-increment property', function () {
      const htmlText = [
        '<html><head>',
        '<style>:root { --my-increment: 10; }</style>',
        '<style>@media screen { :root { --my-increment: 8; } }</style>',
        '<style>html { counter-reset: section 0; }</style>',
        '<style>div:before { content: counter(section, decimal); }</style>',
        '<style>div { font-family: font1; counter-increment: section var(--my-increment); }</style>',
        '</head><body>',
        '<div></div>',
        '<div></div>',
        '</body></html>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        { text: '810' },
        { text: '161820' },
      ]);
    });

    describe('combined with calc(...)', function () {
      it('should calculate each hypothetical value', function () {
        const htmlText = [
          '<html><head>',
          '<style>:root { --my-font-weight-adjustment: 100; }</style>',
          '<style>@media screen { :root { --my-font-weight-adjustment: 200; } }</style>',
          '<style>div { font-family: font1; font-weight: calc(400 + var(--my-font-weight-adjustment, 0)) }</style>',
          '</head><body>',
          '<div>Hey</div>',
          '</body></html>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'Hey',
            props: {
              'font-weight': '600',
            },
          },
          {
            text: 'Hey',
            props: {
              'font-weight': '500',
            },
          },
        ]);
      });
    });
  });

  describe('with font-variation-settings', function () {
    it('should trace a directly applied value', function () {
      const htmlText = [
        '<style>div { font-family: foo; font-variation-settings: "fooo" 1000, "quux" 123; }</style>',
        '<body><div>Hello</div></body>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'Hello',
          props: {
            'font-family': 'foo',
            'font-variation-settings': '"fooo" 1000, "quux" 123',
          },
        },
      ]);
    });

    it('should be inherited from the parent element when not directly applied', function () {
      const htmlText = [
        '<style>div { font-family: foo; font-variation-settings: "fooo" 1000, "quux" 123; }</style>',
        '<body><div><span>Hello</span></div></body>',
      ].join('');

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'Hello',
          props: {
            'font-family': 'foo',
            'font-variation-settings': '"fooo" 1000, "quux" 123',
          },
        },
      ]);
    });

    describe('being used in a CSS animation', function () {
      it('should trace the value from each keyframe', function () {
        const htmlText = [
          `<style>
            div {
              font-family: foo;
              animation: 5s linear infinite alternate myanimation;
            }

            @keyframes myanimation {
              0% {
                font-variation-settings: "quux" 0;
              }
              100% {
                font-variation-settings: "quux" 1000;
              }
            }
          </style>`,
          '<body><div>Hello</div></body>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'Hello',
            props: {
              'font-family': 'foo',
              'font-variation-settings': 'normal',
            },
          },
          {
            text: 'Hello',
            props: {
              'font-family': 'foo',
              'font-variation-settings': '"quux" 0',
            },
          },
          {
            text: 'Hello',
            props: {
              'font-family': 'foo',
              'font-variation-settings': '"quux" 1000',
            },
          },
        ]);
      });
    });

    describe('containing calc(...)', function () {
      it('should evalulate simple expressions', function () {
        const htmlText = [
          '<style>div { font-family: foo; font-variation-settings: "fooo" calc(100 + 200), "quux" calc(500 - 200); }</style>',
          '<body><div><span>Hello</span></div></body>',
        ].join('');

        return expect(htmlText, 'to satisfy computed font properties', [
          {
            text: 'Hello',
            props: {
              'font-family': 'foo',
              'font-variation-settings': '"fooo" 300, "quux" 300',
            },
          },
        ]);
      });
    });
  });

  it('should include the predicates for each traced text', function () {
    const htmlText = [
      "<style>:root { --my-prop: 'the value'; }</style>",
      "<style>@media projection { :root { --my-prop: 'the other value'; } }</style>",
      '<style>div:after { content: var(--my-prop); }</style>',
      "<style>div:hover:after { content: 'how about now'; }</style>",
      '<div></div>',
    ].join('');

    return expect(htmlText, 'to satisfy computed font properties', [
      {
        text: 'how about now',
        predicates: expect.it('to equal', {
          'selectorWithPseudoClasses:div:hover:after': true,
        }),
      },
      {
        text: 'the other value',
        predicates: expect.it('to equal', {
          'selectorWithPseudoClasses:div:hover:after': false,
          'mediaQuery:projection': true,
        }),
      },
      {
        text: 'the value',
        predicates: expect.it('to equal', {
          'selectorWithPseudoClasses:div:hover:after': false,
          'mediaQuery:projection': false,
        }),
      },
    ]);
  });

  describe('when requesting another set of properties to be traced', function () {
    it('should include the extra properties', async function () {
      const assetGraph = new AssetGraph();

      const htmlAsset = assetGraph.addAsset({
        type: 'Html',
        text: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>span { font-size: 20px }</style>
            </head>
            <body><p>Foo <span>bar</span> quux</p></body>
          </html>
        `,
      });

      expect(
        fontTracer(htmlAsset.parseTree, {
          stylesheetsWithPredicates: gatherStylesheetsWithPredicates(
            htmlAsset.assetGraph,
            htmlAsset
          ),
          getCssRulesByProperty,
          htmlAsset,
          propsToReturn: ['font-size'],
        }),
        'to satisfy',
        [
          {
            text: 'bar',
            props: {
              'font-size': '20px',
              'font-weight': undefined,
            },
          },
          {
            text: 'Foo  quux',
            props: {
              'font-size': undefined,
            },
          },
          {
            text: '                    ',
            props: {
              'font-size': undefined,
            },
          },
          {
            text: '             ',
            props: {
              'font-size': undefined,
            },
          },
        ]
      );
    });
  });

  describe('when deduplicate:false is passed', function () {
    it('should include each text trace separately', async function () {
      const assetGraph = new AssetGraph();

      const htmlAsset = assetGraph.addAsset({
        type: 'Html',
        text: `<!DOCTYPE html><html><body><p>foo</p><p>foo</p></body></html>`,
      });

      expect(
        fontTracer(htmlAsset.parseTree, {
          stylesheetsWithPredicates: gatherStylesheetsWithPredicates(
            htmlAsset.assetGraph,
            htmlAsset
          ),
          getCssRulesByProperty,
          htmlAsset,
          deduplicate: false,
        }),
        'to satisfy',
        [
          {
            text: 'foo',
            node: expect.it((node) => {
              expect(
                Array.from(node.parentNode.childNodes).indexOf(node),
                'to equal',
                0
              );
            }),
            props: {
              'font-family': undefined,
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
          {
            text: 'foo',
            node: expect.it((node) => {
              expect(
                Array.from(node.parentNode.childNodes).indexOf(node),
                'to equal',
                1
              );
            }),
            props: {
              'font-family': undefined,
              'font-style': 'normal',
              'font-weight': 'normal',
            },
          },
        ]
      );
    });
  });

  // Awaiting https://github.com/Munter/subfont/pull/70
  describe('with XML namespaces', function () {
    it('should not consider a <title> inside a <math> to be display:none despite the default stylesheet', async function () {
      const htmlText =
        '<html><head><title>foo</title></head><body><math><title>bar</title></math></body></html>';

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'bar',
        },
      ]);
    });
  });

  describe('with SVG content', function () {
    it('should trace the content of a text element', function () {
      const svgText = `
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
          <text>Hello, world!</text>
        </svg>
      `;

      return expect(
        svgText,
        'when parsed as SVG to satisfy computed font properties',
        [
          {
            text: 'Hello, world!',
            props: {
              'font-family': undefined,
            },
          },
        ]
      );
    });

    it('should trace the content of a tspan element', function () {
      const svgText = `
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
          <text>Hello, <tspan>world</tspan>!</text>
        </svg>
      `;

      return expect(
        svgText,
        'when parsed as SVG to satisfy computed font properties',
        [
          {
            text: 'world',
            props: {
              'font-family': undefined,
            },
          },
          {
            text: 'Hello, !',
            props: {
              'font-family': undefined,
            },
          },
        ]
      );
    });

    it('should trace the content of a textPath element', function () {
      const svgText = `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <path id="MyPath" fill="none" stroke="red"
                d="M10,90 Q90,90 90,45 Q90,10 50,10 Q10,10 10,40 Q10,70 45,70 Q70,70 75,50" />
          <text><textPath href="#MyPath">Quick brown fox jumps over the lazy dog.</textPath></text>
        </svg>
      `;

      return expect(
        svgText,
        'when parsed as SVG to satisfy computed font properties',
        [
          {
            text: 'Quick brown fox jumps over the lazy dog.',
            props: {
              'font-family': undefined,
            },
          },
        ]
      );
    });

    it('should ignore text nodes found in non-text elements', function () {
      const svgText = `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <path id="MyPath" fill="none" stroke="red"
                d="M10,90 Q90,90 90,45 Q90,10 50,10 Q10,10 10,40 Q10,70 45,70 Q70,70 75,50" />
          <foo>
            Quick brown fox jumps over the lazy dog.
          </foo>
        </svg>
      `;

      return expect(
        svgText,
        'when parsed as SVG to satisfy computed font properties',
        []
      );
    });

    it('should trace font-related properties set in a style attribute', function () {
      const svgText = `
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
          <text style="font-family: foo; font-style: italic; font-weight: 700;">Hello, world!</text>
        </svg>
      `;

      return expect(
        svgText,
        'when parsed as SVG to satisfy computed font properties',
        [
          {
            text: 'Hello, world!',
            props: {
              'font-family': 'foo',
              'font-style': 'italic',
              'font-weight': '700',
            },
          },
        ]
      );
    });

    it('should trace font-related properties set in an inline stylesheet', function () {
      const svgText = `
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
          <defs>
            <style>
              text {
                font-family: foo;
                font-style: italic;
                font-weight: 700;
              }
            </style>
          </defs>
          <text>Hello, world!</text>
        </svg>
      `;

      return expect(
        svgText,
        'when parsed as SVG to satisfy computed font properties',
        [
          {
            text: 'Hello, world!',
            props: {
              'font-family': 'foo',
              'font-style': 'italic',
              'font-weight': '700',
            },
          },
        ]
      );
    });

    it('should trace font-related properties set in an inline stylesheet in the surrounding HTML', function () {
      const htmlText = `
        <html>
          <head>
            <style>
              text {
                font-family: foo;
                font-style: italic;
                font-weight: 700;
              }
            </style>
          </head>
          <body>
            <svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
              <text>Hello, world!</text>
            </svg>
          </body>
        </html>
      `;

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'Hello, world!',
          props: {
            'font-family': 'foo',
            'font-style': 'italic',
            'font-weight': '700',
          },
        },
        // Whitespace from <html> and <body>:
        {
          text: '                                        ',
        },
        {
          text: '           ',
        },
      ]);
    });

    it('should trace font-related properties set in an inline stylesheet in the surrounding HTML when they explicitly have the SVG namespace', function () {
      const htmlText = `
        <html>
          <head>
            <style>
              @namespace url(http://www.w3.org/2000/svg);

              text {
                font-family: foo;
                font-style: italic;
                font-weight: 700;
              }
            </style>
          </head>
          <body>
            <svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
              <text>Hello, world!</text>
            </svg>
          </body>
        </html>
      `;

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'Hello, world!',
          props: {
            'font-family': 'foo',
            'font-style': 'italic',
            'font-weight': '700',
          },
        },
        // Whitespace from <html> and <body>:
        {
          text: '                                        ',
        },
        {
          text: '           ',
        },
      ]);
    });

    it('should ignore font-related properties set in an inline stylesheet in the surrounding XML when they are explicitly namespaced to non-SVG', function () {
      const htmlText = `
        <html>
          <head>
            <style>
              @namespace url(http://www.w3.org/1999/xhtml);

              text {
                font-family: foo;
                font-style: italic;
                font-weight: 700;
              }
            </style>
          </head>
          <body>
            <svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
              <text>Hello, world!</text>
            </svg>
          </body>
        </html>
      `;

      return expect(htmlText, 'to satisfy computed font properties', [
        {
          text: 'Hello, world!',
          props: {
            'font-family': undefined,
            'font-style': 'normal',
            'font-weight': 'normal',
          },
        },
        // Whitespace from <html> and <body>:
        {
          text: '                                        ',
        },
        {
          text: '           ',
        },
      ]);
    });

    it('should support the font-{family,weight,style,variant,stretch} attributes', function () {
      const svgText = `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <text font-family="foo" font-weight="bold" font-style="italic" font-variant="small-caps" font-stretch="extra-expanded">Quick brown fox jumps over the lazy dog.</text>
        </svg>
      `;

      return expect(
        svgText,
        'when parsed as SVG to satisfy computed font properties',
        [
          {
            text: 'Quick brown fox jumps over the lazy dog.',
            props: {
              'font-family': 'foo',
              'font-weight': 'bold',
              'font-style': 'italic',
              'font-variant': 'small-caps',
              'font-stretch': 'extra-expanded',
            },
          },
        ]
      );
    });

    it('should support the font-{family,weight,style,variant,stretch} attributes set on an ancestor SVG element', function () {
      const svgText = `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" font-family="foo" font-weight="bold" font-style="italic" font-variant="small-caps" font-stretch="extra-expanded">
          <text><tspan>Quick brown fox jumps over the lazy dog.</tspan></text>
        </svg>
      `;

      return expect(
        svgText,
        'when parsed as SVG to satisfy computed font properties',
        [
          {
            text: 'Quick brown fox jumps over the lazy dog.',
            props: {
              'font-family': 'foo',
              'font-weight': 'bold',
              'font-style': 'italic',
              'font-variant': 'small-caps',
              'font-stretch': 'extra-expanded',
            },
          },
        ]
      );
    });

    it('should pick up the font-{family,weight,style,variant,stretch} attributes from the closest parent when they are specified on multiple elements', function () {
      const svgText = `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" font-family="foo" font-weight="bold" font-style="italic" font-variant="small-caps" font-stretch="extra-expanded">
          <text font-style="oblique"><tspan font-weight="100">Quick brown fox jumps over the lazy dog.</tspan></text>
        </svg>
      `;

      return expect(
        svgText,
        'when parsed as SVG to satisfy computed font properties',
        [
          {
            text: 'Quick brown fox jumps over the lazy dog.',
            props: {
              'font-family': 'foo',
              'font-weight': '100',
              'font-style': 'oblique',
              'font-variant': 'small-caps',
              'font-stretch': 'extra-expanded',
            },
          },
        ]
      );
    });

    it('should ignore the font-{family,weight,style,variant,stretch} attributes on parent HTML elements', function () {
      const svgText = `
        <html>
          <body font-family="foo" font-style="italic">
            <svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
              <text>Hello, world!</text>
            </svg>
          </body>
        </html>
      `;

      return expect(
        svgText,
        'when parsed as SVG to satisfy computed font properties',
        [
          {
            text: 'Hello, world!',
            props: {
              'font-family': undefined,
              'font-style': undefined,
            },
          },
          // Whitespace from <html> and <body>:
          {
            text: '                        ',
          },
          {
            text: '                    ',
          },
        ]
      );
    });

    it('should ignore the font-{family,weight,style,variant,stretch} attributes when the same properties are applied via CSS', function () {
      const svgText = `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <style>
              text {
                font-family: bar;
                font-weight: 100;
                font-style: normal;
                font-variant: normal;
                font-stretch: normal;
              }
            </style>
          </defs>
          <text font-family="foo" font-weight="bold" font-style="italic" font-variant="small-caps" font-stretch="extra-expanded">Quick brown fox jumps over the lazy dog.</text>
        </svg>
      `;

      return expect(
        svgText,
        'when parsed as SVG to satisfy computed font properties',
        [
          {
            text: 'Quick brown fox jumps over the lazy dog.',
            props: {
              'font-family': 'bar',
              'font-weight': '100',
              'font-style': 'normal',
              'font-variant': 'normal',
              'font-stretch': 'normal',
            },
          },
        ]
      );
    });
  });
});
