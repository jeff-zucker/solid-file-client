module.exports = {
  entry: './js/index.js',
  mode: 'production',
  output: {
    path: `${__dirname}/dist`,
    filename: 'index.js',
    libraryTarget: 'var',
    library: 'SolidFileClient',
  },
};
