import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  entry: './script.js',
  output: {
    filename: 'bundle.js', // Output file name
    path: resolve(__dirname, 'dist'), // Output directory
  },
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.js$/, // Matches JavaScript files
        exclude: /node_modules/, // Exclude node_modules
        use: {
          loader: 'babel-loader', // Transpiles modern JS
        },
      },
    ],
  },
  devtool: 'source-map', // For easier debugging
};
