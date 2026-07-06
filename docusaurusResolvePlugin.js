// eslint-disable-next-line
module.exports = function (context, options) {
  return {
    name: 'custom-docusaurus-plugin',
    // eslint-disable-next-line
    configureWebpack(config, isServer, utils) {
      return {
        resolve: {
          alias: {
            path: require.resolve('path-browserify'),
          },
          fallback: {
            fs: false,
            ws: false,
            bufferutil: false,
            "utf-8-validate": false,
          },
        },
      };
    },
  };
};