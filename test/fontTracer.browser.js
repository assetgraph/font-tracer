/* global fontTracer */
const puppeteer = require('puppeteer');
const expect = require('unexpected');
const urlTools = require('urltools');
const pathModule = require('path');

describe('fontTracer.browser', function() {
  it('should trace a test case', async function() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
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
    const result = await page.evaluate(() => fontTracer(document));
    expect(result, 'to satisfy', [
      {
        node: expect.it('to be an object'),
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

    await browser.close();
  });
});
