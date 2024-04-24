const path = require('path');

module.exports = {
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/'  // This is typically used to specify the public URL of the output directory
  },
  module: {
    rules: [
      {
	 test: /\.(js|jsx|ts|tsx)$/, // this line ensures all these file types are handled
	 exclude: /node_modules/,
	 use: {
	   loader: 'babel-loader',
	   options: {
	     presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript']
	   }
	 }
      },
      // other loaders such as for CSS
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'] // Add '.ts' and '.tsx' as resolvable extensions.
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),  // Points to where your index.html and other static assets are
    },
    compress: true,
    port: 3000,
    open: true,  // Automatically open the browser
    hot: true,    // Enable Hot Module Replacement
    historyApiFallback: true
  }
};
