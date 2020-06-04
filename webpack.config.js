const path = require('path');
module.exports = {
    mode: 'development',
    entry: path.join(__dirname, 'client', 'main.jsx'),
    output: {
        path: path.join(__dirname, 'public', 'assets', 'js'),
        filename: 'bundle.js',
        publicPath: '/public/assets/js/'
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader"
                }
            },
        ]
    },
};