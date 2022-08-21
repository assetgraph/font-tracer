### v3.5.0 (2022-08-21)

- [Implement primitive expansion of calc\(...\)](https://github.com/assetgraph/font-tracer/commit/b983fe915e29e6d6c43fc70dcfe28bf4afeeb905) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Add postcssValueVarNodeGenerator \(missing from previous commit\)](https://github.com/assetgraph/font-tracer/commit/c0c8c90bf383d5dad1d451dc6008d39e8ca57c87) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Deal with custom properties referenced inside other CSS functions, eg. calc](https://github.com/assetgraph/font-tracer/commit/65dd7e6dda6063008380ca9e7e7ea397e8a61c11) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Fix typo in test description](https://github.com/assetgraph/font-tracer/commit/4a4e5d62a6f7ed46ff4052f6d99e6d3b03efca3d) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v3.4.1 (2022-08-20)

- [Make font-variation-settings come out as 'normal' instead of undefined per default](https://github.com/assetgraph/font-tracer/commit/27c8817d47b29c4de19402d7fba1edc394e90099) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v3.4.0 (2022-08-20)

- [Trace font-variation-settings by default](https://github.com/assetgraph/font-tracer/commit/b822b2f84406245cadd45b0bf2234eca0681e24f) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Fix: Use all of propsToReturn when deduplicating](https://github.com/assetgraph/font-tracer/commit/05e4d2759c2fd5beca39f86695adcc45548a3b3e) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v3.3.0 (2022-08-07)

#### Pull requests

- [#203](https://github.com/assetgraph/font-tracer/pull/203) Upgrade puppeteer to version 16.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))

#### Commits to master

- [Trace the ::marker pseudo element Fixes Munter\/subfont\#166](https://github.com/assetgraph/font-tracer/commit/18c6902c72c476ebfe062d757e1b8f4b2fdb1f87) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Fix CHANGELOG generation in preversion script now that an npm env var changed](https://github.com/assetgraph/font-tracer/commit/c9a7e7684644953b7046b555342ae8ee38dc136c) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v3.2.0 (2022-07-09)

#### Pull requests

- [#201](https://github.com/assetgraph/font-tracer/pull/201) Upgrade puppeteer to version 15.1.1 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#200](https://github.com/assetgraph/font-tracer/pull/200) Upgrade prettier to version 2.7.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#197](https://github.com/assetgraph/font-tracer/pull/197) Upgrade puppeteer to version 14.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#196](https://github.com/assetgraph/font-tracer/pull/196) Upgrade sinon to version 14.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#195](https://github.com/assetgraph/font-tracer/pull/195) Upgrade unexpected to version 13.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#185](https://github.com/assetgraph/font-tracer/pull/185) Upgrade sinon to version 13.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))

#### Commits to master

- [Avoid a combinatorial explosion of predicates when many custom CSS properties unrelated to fonts are in play. https:\/\/github.com\/Munter\/subfont\/issues\/159](https://github.com/assetgraph/font-tracer/commit/50e385350340236b08511ff2ac6048d7c6dccd54) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Try to fix broken tests](https://github.com/assetgraph/font-tracer/commit/4e84cfeb13c434f54479c8ae7da6443b9ea01a3c) ([Andreas Lind](mailto:andreas.lind@workday.com))
- [npm i --save-dev eslint-plugin-n && npm uninstall eslint-plugin-node && npm i --save-dev eslint@latest](https://github.com/assetgraph/font-tracer/commit/0376b535a7b231bf8482d1aa1bb4e1c6c4670430) ([Andreas Lind](mailto:andreas.lind@workday.com))
- [Update eslint-config-standard to version 17.0.0](https://github.com/assetgraph/font-tracer/commit/5fd38f460baf0c35c7040ac6137a41f78520cb9c) ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))

### v3.1.0 (2022-01-11)

#### Pull requests

- [#181](https://github.com/assetgraph/font-tracer/pull/181) Upgrade puppeteer to version 13.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#180](https://github.com/assetgraph/font-tracer/pull/180) Upgrade eslint-plugin-mocha to version 10.0.1 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#176](https://github.com/assetgraph/font-tracer/pull/176) Upgrade prettier to version 2.5.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#178](https://github.com/assetgraph/font-tracer/pull/178) Upgrade puppeteer to version 12.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#169](https://github.com/assetgraph/font-tracer/pull/169) Upgrade sinon to version 12.0.1 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#168](https://github.com/assetgraph/font-tracer/pull/168) Upgrade puppeteer to version 11.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))

#### Commits to master

- [Update counteraction to ^1.3.1](https://github.com/assetgraph/font-tracer/commit/81969a8e36a6924d56d0539dfb0d2a88c8ae4cb4) ([Andreas Lind](mailto:andreas.lind@workday.com))
- [Replace test\/mocha.opts with .mocharc.yml](https://github.com/assetgraph/font-tracer/commit/4164e58c0984293516ffe2b1644956beb2e28596) ([Andreas Lind](mailto:andreas.lind@workday.com))
- [Use a generator to visit all declarations in scope to avoid excessive copying in getComputedStyle](https://github.com/assetgraph/font-tracer/commit/9a7655f24d845ba5fd3f3142c3e194790724217b) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v3.0.1 (2021-10-22)

#### Pull requests

- [#153](https://github.com/assetgraph/font-tracer/pull/153) Upgrade puppeteer to version 10.4.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#165](https://github.com/assetgraph/font-tracer/pull/165) Upgrade eslint-plugin-promise to version 5.1.1 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))

#### Commits to master

- [Update eslint and eslint-plugin-import](https://github.com/assetgraph/font-tracer/commit/8a8fc488074283084e5a0f7ca77918abf77911df) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Fix test](https://github.com/assetgraph/font-tracer/commit/ff35d34da147c8ee315830f1a26cc8f205713cbc) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Try with a prepare script instead](https://github.com/assetgraph/font-tracer/commit/3371d9155d95b39dd22899d95b28c5a294ab931b) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Try switching to test:ci](https://github.com/assetgraph/font-tracer/commit/a797be9160dc2bdd122930232694ea39484542d4) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Disable for node.js 16 due to missing prebuilt canvas](https://github.com/assetgraph/font-tracer/commit/22e78e9f965678c7feb76ddf29b6734896d91a65) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [+4 more](https://github.com/assetgraph/font-tracer/compare/v3.0.0...v3.0.1)

### v3.0.0 (2021-09-05)

#### Pull requests

- [#120](https://github.com/assetgraph/font-tracer/pull/120) Upgrade sinon to version 11.1.1 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#121](https://github.com/assetgraph/font-tracer/pull/121) Upgrade eslint-plugin-mocha to version 9.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#111](https://github.com/assetgraph/font-tracer/pull/111) Upgrade puppeteer to version 9.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#109](https://github.com/assetgraph/font-tracer/pull/109) Upgrade subfont to version 6.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#100](https://github.com/assetgraph/font-tracer/pull/100) Upgrade sinon to version 10.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#92](https://github.com/assetgraph/font-tracer/pull/92) Upgrade puppeteer to version 8.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#86](https://github.com/assetgraph/font-tracer/pull/86) Upgrade magicpen-prism to version 5.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#82](https://github.com/assetgraph/font-tracer/pull/82) Upgrade puppeteer to version 7.0.1 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#80](https://github.com/assetgraph/font-tracer/pull/80) Upgrade puppeteer to version 6.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#56](https://github.com/assetgraph/font-tracer/pull/56) Upgrade eslint-config-standard to version 16.0.2 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#66](https://github.com/assetgraph/font-tracer/pull/66) Upgrade eslint-config-prettier to version 7.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#62](https://github.com/assetgraph/font-tracer/pull/62) Upgrade eslint-plugin-standard to version 5.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#49](https://github.com/assetgraph/font-tracer/pull/49) Upgrade eslint-config-standard to version 15.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#45](https://github.com/assetgraph/font-tracer/pull/45) Upgrade eslint-plugin-mocha to version 8.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))

#### Commits to master

- [Support font-{family,weight,style,variant,stretch} attributes in SVG](https://github.com/assetgraph/font-tracer/commit/f2f6bd0d9aa7e7f5be9c68ba8a01e0671e556f2f) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Breaking change: htmlAsset =&gt; asset](https://github.com/assetgraph/font-tracer/commit/3756e3325012426a39549c03e36294d7c807a98f) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Add support for tracing text out of SVG DOMs](https://github.com/assetgraph/font-tracer/commit/4750c79df47adbe1e5ff51491243d3f6c0f0eaf0) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Also trace font-variant and font-stretch by default](https://github.com/assetgraph/font-tracer/commit/67f17a622300b26f948aa5cbfa4ba45853f6ed4a) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [prettier --write '\*\*\/\*.{js,json,md}'](https://github.com/assetgraph/font-tracer/commit/3cbf3baa89641f912b5a0b1e038e9799a8e67ef5) ([Andreas Lind](mailto:andreas.lind@workday.com))
- [+13 more](https://github.com/assetgraph/font-tracer/compare/v2.0.1...v3.0.0)

### v2.0.1 (2020-07-04)

#### Pull requests

- [#44](https://github.com/assetgraph/font-tracer/pull/44) Upgrade puppeteer to version 5.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#42](https://github.com/assetgraph/font-tracer/pull/42) Upgrade mocha to version 8.0.1 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#43](https://github.com/assetgraph/font-tracer/pull/43) Upgrade puppeteer to version 4.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#41](https://github.com/assetgraph/font-tracer/pull/41) Upgrade subfont to version 5.0.1 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#40](https://github.com/assetgraph/font-tracer/pull/40) Upgrade eslint-plugin-mocha to version 7.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#39](https://github.com/assetgraph/font-tracer/pull/39) Upgrade eslint to version 7.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))

#### Commits to master

- [Update dev dependencies](https://github.com/assetgraph/font-tracer/commit/911e8a0938a1079758698081bbba09aece91f6e9) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Update dependencies](https://github.com/assetgraph/font-tracer/commit/fb3d1fdbe3f7bfee688415d50b047b27f1a1b8e8) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Travis: Stay on node.js 13 for now](https://github.com/assetgraph/font-tracer/commit/204ff8b1c415aa96ceb788a9401078954cf79f98) ([Andreas Lind](mailto:andreas.lind@peakon.com))

### v2.0.0 (2020-04-17)

#### Pull requests

- [#35](https://github.com/assetgraph/font-tracer/pull/35) Upgrade rollup to version 2.0.2 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#34](https://github.com/assetgraph/font-tracer/pull/34) Upgrade sinon to version 9.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#33](https://github.com/assetgraph/font-tracer/pull/33) Upgrade mocha to version 7.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#32](https://github.com/assetgraph/font-tracer/pull/32) Upgrade magicpen-prism to version 4.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#31](https://github.com/assetgraph/font-tracer/pull/31) Upgrade eslint-plugin-node to version 11.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#29](https://github.com/assetgraph/font-tracer/pull/29) Upgrade nyc to version 15.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#30](https://github.com/assetgraph/font-tracer/pull/30) Upgrade sinon to version 8.0.1 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))

#### Commits to master

- [Unsupport node.js 8](https://github.com/assetgraph/font-tracer/commit/0b77267cb8a1318d7133a70126ec9aab701b3f93) ([Andreas Lind](mailto:andreas.lind@peakon.com))
- [Update puppeteer to version 3.0.0](https://github.com/assetgraph/font-tracer/commit/bf099517e09851063b66b7b3ea66accb358cf6a2) ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [Try to fix the Travis config](https://github.com/assetgraph/font-tracer/commit/913e3b7f4ab71f25c6bc0c6ec18b12e745c1cb47) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Test with node 12, and only run lint on it](https://github.com/assetgraph/font-tracer/commit/2589e0b878814e7fab9c3edc18f6696b093c019d) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [prettier --write '\*\*\/\*.js'](https://github.com/assetgraph/font-tracer/commit/d344e681a8c62f78f2e00a35d767bb49278d1ec8) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [+2 more](https://github.com/assetgraph/font-tracer/compare/v1.3.2...v2.0.0)

### v1.3.2 (2019-11-19)

- [#28](https://github.com/assetgraph/font-tracer/pull/28) Move the counter-related stuff into a separate package ([Andreas Lind](mailto:andreaslindpetersen@gmail.com), [Andreas Lind](mailto:andreaslindpetersen@gmail.com), [Andreas Lind](mailto:andreaslindpetersen@gmail.com), [Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v1.3.0 (2019-11-16)

- [Add support for list-style-type: symbols\(...\), a limited inline @counter-style](https://github.com/assetgraph/font-tracer/commit/1a0e7615835578a76282f05c79da07feabebe123) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v1.2.2 (2019-11-16)

- [Unskip test that works with subfont 4.0.4's getCssRules...](https://github.com/assetgraph/font-tracer/commit/c3204cd288d3a3a353fd94a656552e9aa3c2d91d) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Update subfont to ^4.0.4](https://github.com/assetgraph/font-tracer/commit/b80f9f8c9f87a760cbb6a826bf227c5c579d500d) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v1.2.1 (2019-11-14)

- [Fixed boolean logic bug](https://github.com/assetgraph/font-tracer/commit/af47651a479e8c3c746140e729766c44ed41ebf4) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v1.2.0 (2019-11-14)

#### Pull requests

- [#27](https://github.com/assetgraph/font-tracer/pull/27) Upgrade prettier to version 1.19.1 ([Andreas Lind](mailto:andreaslindpetersen@gmail.com), [depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#25](https://github.com/assetgraph/font-tracer/pull/25) Upgrade subfont to version 4.0.1 ([Andreas Lind](mailto:andreaslindpetersen@gmail.com), [depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#26](https://github.com/assetgraph/font-tracer/pull/26) Upgrade puppeteer to version 2.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#24](https://github.com/assetgraph/font-tracer/pull/24) Upgrade eslint-plugin-node to version 10.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#23](https://github.com/assetgraph/font-tracer/pull/23) Upgrade eslint-config-standard to version 14.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#22](https://github.com/assetgraph/font-tracer/pull/22) Upgrade assetgraph to version 6.0.0 ([Andreas Lind](mailto:andreaslindpetersen@gmail.com), [Andreas Lind](mailto:andreaslindpetersen@gmail.com), [depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#21](https://github.com/assetgraph/font-tracer/pull/21) Upgrade eslint-plugin-mocha to version 6.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#20](https://github.com/assetgraph/font-tracer/pull/20) Upgrade eslint-config-standard to version 13.0.1 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#18](https://github.com/assetgraph/font-tracer/pull/18) Upgrade eslint-config-prettier to version 6.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#17](https://github.com/assetgraph/font-tracer/pull/17) Upgrade unexpected-resemble to version 4.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#16](https://github.com/assetgraph/font-tracer/pull/16) Upgrade eslint to version 6.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#15](https://github.com/assetgraph/font-tracer/pull/15) Upgrade eslint-config-prettier to version 5.0.0 ([depfu[bot]](mailto:depfu[bot]@users.noreply.github.com))
- [#14](https://github.com/assetgraph/font-tracer/pull/14) Upgrade prettier to version 1.18.2 ([Andreas Lind](mailto:andreaslindpetersen@gmail.com), [depfu[bot]](mailto:depfu[bot]@users.noreply.github.com))
- [#13](https://github.com/assetgraph/font-tracer/pull/13) Upgrade rollup-plugin-node-resolve to version 5.0.1 ([depfu[bot]](mailto:depfu[bot]@users.noreply.github.com))
- [#12](https://github.com/assetgraph/font-tracer/pull/12) Upgrade rollup-plugin-commonjs to version 10.0.0 ([depfu[bot]](mailto:depfu[bot]@users.noreply.github.com))
- [#9](https://github.com/assetgraph/font-tracer/pull/9) Upgrade eslint-plugin-node to version 9.0.1 ([depfu[bot]](mailto:depfu[bot]@users.noreply.github.com))
- [#8](https://github.com/assetgraph/font-tracer/pull/8) Upgrade nyc to version 14.0.0 ([depfu[bot]](mailto:depfu[bot]@users.noreply.github.com))
- [#7](https://github.com/assetgraph/font-tracer/pull/7) Upgrade prettier to version 1.17.0 ([depfu[bot]](mailto:depfu[bot]@users.noreply.github.com))
- [#5](https://github.com/assetgraph/font-tracer/pull/5) Upgrade rollup-plugin-json to version 4.0.0 ([depfu[bot]](mailto:depfu[bot]@users.noreply.github.com))

#### Commits to master

- [Require the namespaceURI of a CSS rule \(if given\) to match that of the element](https://github.com/assetgraph/font-tracer/commit/0c77cd1a536f8ba5f55cf140ae5a3e410001395d) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Don't break when not tracing the display property](https://github.com/assetgraph/font-tracer/commit/88eba0c6a3e425c9dbf46557a78eca9ccc0e9685) ([Andreas Lind](mailto:andreas.lind@peakon.com))
- [Switch to postcss-value-parser](https://github.com/assetgraph/font-tracer/commit/aa864b6480bb9d17e86ede601bb9de21fcecd4d7) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Move expansion of text-transform to a separate function](https://github.com/assetgraph/font-tracer/commit/2213c668a97be0a42749cf654a1c3c4f28bbde06) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Use \_.flatMap](https://github.com/assetgraph/font-tracer/commit/ab727ee89a5f257bf34c663f78e79907d9e2d6cd) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [+6 more](https://github.com/assetgraph/font-tracer/compare/v1.1.0...v1.2.0)

### v1.1.0 (2019-03-16)

#### Pull requests

- [#1](https://github.com/assetgraph/font-tracer/pull/1) Include node in trace ([Andreas Lind](mailto:andreaslindpetersen@gmail.com), [Andreas Lind](mailto:andreaslindpetersen@gmail.com), [Andreas Lind](mailto:andreaslindpetersen@gmail.com), [Andreas Lind](mailto:andreaslindpetersen@gmail.com), [Andreas Lind](mailto:andreaslindpetersen@gmail.com), [Andreas Lind](mailto:andreaslindpetersen@gmail.com), [Andreas Lind](mailto:andreaslindpetersen@gmail.com), [Andreas Lind](mailto:andreaslindpetersen@gmail.com), [Andreas Lind](mailto:andreaslindpetersen@gmail.com), [Andreas Lind](mailto:andreaslindpetersen@gmail.com))

#### Commits to master

- [Exclude elements with display:none](https://github.com/assetgraph/font-tracer/commit/c51406e242b031fd27ced5c47de747f0d86d65e5) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Don't die on permission errors when gathereing stylesheets in the headless browser](https://github.com/assetgraph/font-tracer/commit/123b090fd9bc65a57a84781ccc0f77c5d1e523d2) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Add vscode launch config for running the test suite](https://github.com/assetgraph/font-tracer/commit/ee29042899bf8a73956d203ca1941514f6ca758b) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Try to make the browser test more robust](https://github.com/assetgraph/font-tracer/commit/d326f8fb2f92ed76f41df2428f212086f4cffa64) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v1.0.1 (2019-03-01)

- [Add missing direct dependency](https://github.com/assetgraph/font-tracer/commit/3eb3a0276f6816746702a7fa35eafc5c5cad1ae3) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v1.0.0 (2019-03-01)

- [prettier & eslint: Ignore the dist dir](https://github.com/assetgraph/font-tracer/commit/849242bd47dab636e3fd99c0c7d620baf143ea52) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Configure nyc to only instrument lib\/\*](https://github.com/assetgraph/font-tracer/commit/7982031c82519ad54e5f1788d70eb64e87a89eec) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Set mocha's timeout to 30s](https://github.com/assetgraph/font-tracer/commit/690cbbf6e80966d75603d6b2c2cdb3ba96088916) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Whip up a test of the browser build](https://github.com/assetgraph/font-tracer/commit/d00ae71c40c94918c88743179d468f3ef3555d1a) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [Fix browser build](https://github.com/assetgraph/font-tracer/commit/0faad5c0d2aae119946609d3e973521fd7ab98d0) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [+14 more](https://github.com/assetgraph/font-tracer/compare/0faad5c0d2aae119946609d3e973521fd7ab98d0...v1.0.0)
