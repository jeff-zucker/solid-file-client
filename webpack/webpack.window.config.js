/* Browser bundle that exposes solid-file-client as window.SolidFileClient */

const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const { context, mode, entry, module: _module, devtool } = require('./webpack.common.config');

const outputDir = './dist/browser';

module.exports = {
  context,
  mode,
  entry,
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(outputDir),
    // libraryExport: 'default',
    library: 'SolidFileClient',
    libraryTarget: 'umd',
  },
  module: _module,
  plugins: [new CleanWebpackPlugin([outputDir])],
  devtool,
  externals: {
  	'rdflib': {
  		commonjs: 'rdflib',
  		commonjs2: 'rdflib',
  		amd: 'rdflib',
  		root: '$rdf'
  	},

  	'solid-auth-client': {
  		commonjs: 'solid-auth-client',
  		commonjs2: 'solid-auth-client',
  		amd: 'solid-auth-client',
  		root: ['solid', 'auth']
  	},
    'solid-auth-cli' : 'null'
  },
};
