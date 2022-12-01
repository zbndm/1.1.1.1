import { port } from "./source/utilities/routes";
// import * as defaultsDeep from 'lodash.defaultsdeep'
const defaultsDeep = require("lodash.defaultsdeep");
import webpack, {
  DefinePlugin,
  NamedModulesPlugin,
  HotModuleReplacementPlugin,
  NoEmitOnErrorsPlugin,
  SourceMapDevToolPlugin
} from "webpack";
import * as HtmlWebpackPlugin from "html-webpack-plugin";
import * as CleanWebpackPlugin from "clean-webpack-plugin";
import * as CopyWebpackPlugin from "copy-webpack-plugin";
import * as OptimizeCSSAssetsPlugin from "optimize-css-assets-webpack-plugin";
import { format as formatURL } from "url";
import localeDefinitions from "./source/utilities/i18n/lang";

const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

const environment = (process.env.NODE_ENV ||
  "development") as webpack.Configuration["mode"];
const path = require("path");
const joinP = path.join.bind(null, __dirname);
const fs = require("fs");

const exclude = /node_modules/;

interface CustomConfiguration extends webpack.Configuration {
  entry: {
    [index: string]: string[];
  };
  plugins: webpack.Plugin[];
}

const $: CustomConfiguration = {
  mode: environment,
  entry: {
    site: ["./source/pages/index.ts"],
    dns: ["./source/pages/dns.ts"],
    help: ["./source/pages/help.ts"],
    purgeCache: ["./source/pages/purge-cache.ts"],
    faq: ["./source/pages/faq.ts"],
    family: ["./source/pages/family.ts"],
    beta: ["./source/pages/beta.ts"]
  },
  plugins: []
};

$.resolve = {
  extensions: [".js", ".json", ".ts", ".tsx"],
  modules: [joinP("source"), joinP("node_modules")]
};

$.output = {
  publicPath: "/",
  // publicPath: '',
  path: joinP("build"),
  filename: "[name]-[hash].js",
  library: "[name]-[hash]",
  libraryTarget: "umd"
};

export interface BundleDefinition {
  [index: string]: string | object;
}

const bundleDefinitions: BundleDefinition = {
  "process.env": {
    NODE_ENV: JSON.stringify(environment)
  }
};

$.plugins = [
  new DefinePlugin(bundleDefinitions),
  new ForkTsCheckerWebpackPlugin({
    tsconfig: joinP("source/tsconfig.json")
  }),
  new CopyWebpackPlugin([
    {
      to: "media",
      from: joinP("source/media")
    }
  ])
];

if (environment === "development") {
  $.devtool = "cheap-module-source-map";

  $.plugins.push(new NamedModulesPlugin(), new NoEmitOnErrorsPlugin());
}

let styleLoader = {
  loader: "style-loader",
  options: {
    sourceMap: true
  }
};

if (environment === "production") {
  styleLoader = MiniCssExtractPlugin.loader;

  $.plugins.unshift(new CleanWebpackPlugin($.output.path!));

  $.plugins.push(
    new SourceMapDevToolPlugin({
      filename: "[name]-[hash].map"
    }),
    new MiniCssExtractPlugin({
      filename: "[name]-[hash].css",
      chunkFilename: "[id].css"
    }),
    new UglifyJsPlugin({
      sourceMap: true,
      cache: true,
      parallel: true,
      uglifyOptions: {
        output: {
          comments: false
        }
      }
    }),
    new OptimizeCSSAssetsPlugin()
  );
}

let htmlMinify: boolean | { [index: string]: boolean } = false;

if (environment !== "development") {
  htmlMinify = {
    html5: true,
    minifyJS: true,
    minifyCSS: true,
    collapseWhitespace: true,
    preserveLineBreaks: false,
    removeComments: false
  };
}

const locales = [
  {
    path: "",
    code: "en-US",
    label: "English"
  },
  {
    path: "es-ES/",
    code: "es-ES",
    label: "Español"
  },
  {
    path: "fr-FR/",
    code: "fr-FR",
    label: "Français"
  },
  {
    path: "de-DE/",
    code: "de-DE",
    label: "Deutsch"
  },
  {
    path: "pt-BR/",
    code: "pt-BR",
    label: "Português"
  },
  {
    path: "nl-NL/",
    code: "nl-NL",
    label: "Nederlands"
  },
  {
    path: "tr-TR/",
    code: "tr-TR",
    label: "Türkçe"
  },
  {
    path: "zh-Hans/",
    code: "zh-Hans",
    label: "简体中文"
  },
  {
    path: "zh-Hant/",
    code: "zh-Hant",
    label: "繁體中文"
  },
  {
    path: "ja-JP/",
    code: "ja-JP",
    label: "日本語"
  },
  {
    path: "ko-KR/",
    code: "ko-KR",
    label: "한국어"
  },
  {
    path: "id-ID/",
    code: "id-ID",
    label: "Indonesian"
  }
];

// HACK: For many many reasons, Pug, html-loader, and html-webpack-plugin are incompatible.

const pugLoaders = locales.map(locale => {
  const mergedDefinitions = defaultsDeep(
    localeDefinitions[locale.code],
    localeDefinitions["en-US"]
  );

  return {
    test: /\.pug$/,
    exclude,
    include: new RegExp(`${locale.code}.*/(dns/)?index\.pug$`),
    use: [
      {
        loader: "html-loader",
        options: {
          minimize: htmlMinify,
          attrs: ["img:src", "video:src"]
        }
      },
      {
        loader: "pug-html-loader",
        options: {
          pretty: false,
          data: {
            htmlWebpackPlugin: {
              options: {
                t: (key: string) => mergedDefinitions[key],
                locale,
                locales,
                formatURL,
                NODE_ENV: environment
              }
            }
          }
        }
      }
    ]
  };
});

$.plugins.push(
  ...locales.map(locale => {
    return new HtmlWebpackPlugin({
      favicon: "source/media/favicon.ico",
      template: joinP(`source/pages/${locale.code}/index.pug`),
      filename: `${locale.path}index.html`,
      chunks: ["site"]
    });
  })
);

$.plugins.push(
  ...locales.map(locale => {
    return new HtmlWebpackPlugin({
      favicon: "source/media/favicon.ico",
      template: joinP(`source/pages/${locale.code}/faq/index.pug`),
      filename: `${locale.path}faq/index.html`,
      chunks: ["faq"]
    });
  })
);

$.plugins.push(
  ...locales.map(locale => {
    return new HtmlWebpackPlugin({
      favicon: "source/media/favicon.ico",
      template: joinP(`source/pages/${locale.code}/dns/index.pug`),
      filename: `${locale.path}dns/index.html`,
      chunks: ["dns"]
    });
  })
);

$.plugins.push(
  ...locales.map(locale => {
    return new HtmlWebpackPlugin({
      favicon: "source/media/favicon.ico",
      template: joinP(`source/pages/${locale.code}/family/index.pug`),
      filename: `${locale.path}family/index.html`,
      chunks: ["family"]
    });
  })
);

$.plugins.push(
  ...locales.map(locale => {
    return new HtmlWebpackPlugin({
      favicon: "source/media/favicon.ico",
      template: joinP(`source/pages/${locale.code}/beta/index.pug`),
      filename: `${locale.path}beta/index.html`,
      chunks: ["beta"]
    });
  })
);

$.plugins.push(
  ...locales.map(locale => {
    return new HtmlWebpackPlugin({
      favicon: "source/media/favicon.ico",
      template: joinP(`source/pages/${locale.code}/help/index.pug`),
      filename: `${locale.path}help/index.html`,
      chunks: ["help"]
    });
  })
);

$.plugins.push(
  ...locales.map(locale => {
    return new HtmlWebpackPlugin({
      favicon: "source/media/favicon.ico",
      template: joinP(`source/pages/${locale.code}/purge-cache/index.pug`),
      filename: `${locale.path}purge-cache/index.html`,
      chunks: ["purgeCache"]
    });
  })
);

$.plugins.push(
  new HtmlWebpackPlugin({
    template: "source/pages/404.html",
    filename: "404.html"
  })
);

$.module = {
  rules: [
    {
      test: /\.tsx?$/,
      exclude,
      use: [
        {
          loader: "ts-loader",
          options: {
            transpileOnly: true, // Type checking done via plugin.
            configFile: joinP("source/tsconfig.json")
          }
        }
      ]
    },
    ...pugLoaders,
    {
      test: /\.(png|jpg|gif|mp4)$/,
      use: [
        {
          loader: "file-loader",
          options: {
            // name: '[path][name].[ext]'
          }
        }
      ]
    },
    {
      test: /\.svg$/,
      loader: "svg-inline-loader",
      exclude
    },
    {
      test: /\.css$/,
      use: [
        styleLoader,
        {
          loader: "css-loader",
          options: {
            sourceMap: true
          }
        }
      ],
      exclude
    },
    {
      test: /\.styl$/,
      exclude,
      use: [
        styleLoader,
        {
          loader: "css-loader",
          options: {
            sourceMap: true
          }
        },
        {
          loader: "stylus-loader",
          options: {
            sourceMap: true
          }
        }
      ]
    }
  ]
};

export default $;
