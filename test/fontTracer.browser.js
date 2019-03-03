/* global fontTracer */
const puppeteer = require('puppeteer');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-resemble'));
const urlTools = require('urltools');
const pathModule = require('path');

async function transferResults(jsHandle) {
  const results = await jsHandle.jsonValue();
  for (const [i, result] of results.entries()) {
    const resultHandle = await jsHandle.getProperty(String(i));
    const elementHandle = await resultHandle.getProperty('node');
    result.node = elementHandle;
  }
  return results;
}

describe('fontTracer.browser', function() {
  let browser, page;
  beforeEach(async function() {
    browser = await puppeteer.launch();
    page = await browser.newPage();
    await page.setViewport({
      width: 200,
      height: 200
    });
  });

  afterEach(async function() {
    await browser.close();
  });

  it('should trace a test case', async function() {
    const fileName = pathModule.resolve(
      __dirname,
      '..',
      'testdata',
      'nestedCssImportWithMedia',
      'index.html'
    );

    await page.goto(urlTools.fsFilePathToFileUrl(fileName));
    await page.addScriptTag({
      url: urlTools.fsFilePathToFileUrl(
        pathModule.resolve(
          fileName,
          '..',
          '..',
          '..',
          'dist',
          'fontTracer.browser.js'
        )
      )
    });
    const jsHandle = await page.evaluateHandle(() => fontTracer(document));
    const results = await transferResults(jsHandle);

    expect(results, 'to satisfy', [
      {
        text: 'foo',
        props: { 'font-style': 'normal', 'font-weight': '500' }
      },
      {
        text: '        ',
        props: { 'font-style': 'normal', 'font-weight': 'normal' }
      },
      {
        text: ' ',
        props: { 'font-style': 'normal', 'font-weight': 'normal' }
      }
    ]);
  });

  it('should produce screenshot', async function() {
    const fileName = pathModule.resolve(
      __dirname,
      '..',
      'testdata',
      'screenshot',
      'index.html'
    );

    await page.goto(urlTools.fsFilePathToFileUrl(fileName));
    await page.addScriptTag({
      url: urlTools.fsFilePathToFileUrl(
        pathModule.resolve(
          fileName,
          '..',
          '..',
          '..',
          'dist',
          'fontTracer.browser.js'
        )
      )
    });
    const jsHandle = await page.evaluateHandle(() => fontTracer(document));
    const results = await transferResults(jsHandle);

    const elementHandle = results[0].node;
    const boundingBox = await elementHandle.boundingBox();

    const div = await page.evaluateHandle(
      (boundingBox, padding = 0) => {
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.boxSizing = 'border-box';
        div.style.borderColor = 'red';
        div.style.width = `${boundingBox.width + padding * 2}px`;
        div.style.height = `${boundingBox.height + padding * 2}px`;
        div.style.left = `${boundingBox.x - padding}px`;
        div.style.top = `${boundingBox.y - padding}px`;
        div.style.borderWidth = '2px';
        div.style.borderStyle = 'dotted';
        document.body.appendChild(div);
        return div;
      },
      boundingBox,
      2
    );

    const screenshot = await page.screenshot();
    expect(
      screenshot,
      'to resemble',
      pathModule.resolve(
        __dirname,
        '..',
        'testdata',
        'screenshot',
        'expected.png'
      )
    );

    await page.evaluateHandle(div => {
      div.parentElement.removeChild(div);
    }, div);
  });
});
