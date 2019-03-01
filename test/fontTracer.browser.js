const puppeteer = require('puppeteer');
const expect = require('unexpected');
const urlTools = require('urltools');
const pathModule = require('path');

describe('fontTracer.browser', function() {
  it('should trace a test case', async function() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const resultPromise = new Promise(resolve =>
      page.on('console', msg =>
        resolve(Promise.all(msg.args().map(a => a.jsonValue())))
      )
    );
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
    await page.addScriptTag({
      content: 'console.log(fontTracer(document));'
    });
    const result = await resultPromise;
    await browser.close();
    expect(result, 'to equal', [
      [
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
      ]
    ]);
  });
});
