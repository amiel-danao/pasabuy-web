const path = require('path');

module.exports = {
  // The entry point file described above
  entry: {
    index: './public/src/index.js',
    orders: './public/src/orders.js',
    inventory: './public/src/inventory.js',
    waves: './public/src/waves.js',
    sidebarmenu: './public/src/sidebarmenu.js',
    custom: './public/src/custom.js',
    dashboard: './public/src/dashboard.js',
    login: './public/src/login.js'
  },
  // The location of the build folder described above
  output: {
    path: path.resolve(__dirname, 'public/dist/js'),
    filename: '[name].js',
    hotUpdateChunkFilename: 'hot/[runtime]-[name]-hot-update.js',
    hotUpdateMainFilename: 'hot/[runtime]-hot-update.json'
    //publicPath: '',
  },
  // Optional and for development only. This provides the ability to
  // map the built code back to the original source format when debugging.
  devtool: 'source-map',
  //devtool: 'eval-source-map',
  devServer: {
        static: {
            directory: path.join(__dirname, 'public'),
        },
        compress: true,
        port: 5000,
        open: true,
        hot: true,
        devMiddleware: {
            publicPath: '/dist/',
            writeToDisk: true,
        },
        client: {
          logging: 'none',
        }
    }
};
