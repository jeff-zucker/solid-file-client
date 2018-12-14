const path = require('path');

const basicConfig = {
  entry: './src/index.js',
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['*', '.js'],
  },
};

const serverConfig = {
  ...basicConfig,
  target: 'node', // in order to ignore built-in modules like path, fs, etc.
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.node.js',
  },
};

const clientConfig = {
  ...basicConfig,
  target: 'web',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    library: 'SolidFileClient',
  },
};

module.exports = [serverConfig, clientConfig];
