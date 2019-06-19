/* Shared webpack configuration */

const path = require('path');

module.exports = {
  context: path.resolve(__dirname, '..'),
  mode: 'production',
  entry: {
    'solid-file-client': './lib/index.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      },
	  {
        test: path.resolve(__dirname, 'node_modules/solid-auth-cli/browser/index.js'),
        use: 'null-loader'
      },
    ],
  },
  devtool: 'source-map',
};
