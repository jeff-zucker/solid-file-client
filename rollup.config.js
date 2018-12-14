import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import replace from 'rollup-plugin-replace';
import { uglify } from 'rollup-plugin-uglify';
import commonJs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import json from 'rollup-plugin-json';

import { minify } from 'uglify-es';
// experimental minifier for ES modules
// https://github.com/TrySound/rollup-plugin-uglify#warning

const pkg = require('./package.json');

const productionPlugins = [
  babel({
    runtimeHelpers: true,
    exclude: 'node_modules/**', // only transpile our source code
  }),
  replace({
    'process.env.NODE_ENV': "'production'",
  }),
  resolve({
    browser: true,
    modulesOnly: true,
  }),
  commonJs(),
  json(),
  uglify(
    {
      compress: {
        pure_getters: true,
        unsafe: true,
      },
      output: {
        comments: false,
        semicolons: false,
      },
      mangle: {
        reserved: ['payload', 'type', 'meta'],
      },
    },
    minify,
  ),
];

// minified production builds
const umdProduction = {
  input: 'src/index.js',
  output: [
    {
      name: 'SolidFileClient',
      file: pkg.browser,
      format: 'umd',
      exports: 'named',
      sourcemap: true,
    }, // Universal Modules
  ],
  plugins: productionPlugins,
};

const cjsProduction = {
  input: 'src/index.js',
  output: [
    {
      file: `${pkg.main}/solid-file-client.min.js`,
      format: 'cjs',
      exports: 'named',
      sourcemap: true,
    }, // CommonJS Modules
  ],
  plugins: productionPlugins,
};

// full source development builds
const development = {
  input: 'src/index.js',
  output: [
    { file: `${pkg.main}/solid-file-client.js`, format: 'cjs', exports: 'named' }, // CommonJS Modules
    { file: pkg.module, format: 'es', exports: 'named', sourcemap: true }, // ES Modules
  ],
  plugins: [
    babel({
      runtimeHelpers: true,
      exclude: 'node_modules/**', // only transpile our source code
    }),
    replace({
      'process.env.NODE_ENV': '"development"',
    }),
    resolve({
      browser: true,
      modulesOnly: true,
    }),
    commonJs(),
  ],
};

// point user to needed build
const root = `"use strict";module.exports="production"===process.env.NODE_ENV?require("./solid-file-client.min.js"):require("./solid-file-client.js");`;

const rootFile = folder => {
  mkdirSync(join('dist', folder));
  writeFileSync(join('dist', folder, 'index.js'), root);
};

export default (() => {
  // generate root mapping files
  mkdirSync('dist');
  rootFile('cjs');

  return [development, umdProduction, cjsProduction];
})();
