Package["core-runtime"].queue("boilerplate-generator",function () {/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EmitterPromise = Package.meteor.EmitterPromise;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var Boilerplate;

var require = meteorInstall({"node_modules":{"meteor":{"boilerplate-generator":{"generator.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/boilerplate-generator/generator.js                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reify_async_result__) {
  "use strict";
  try {
    let _objectSpread;
    module.link("@babel/runtime/helpers/objectSpread2", {
      default(v) {
        _objectSpread = v;
      }
    }, 0);
    module.export({
      Boilerplate: () => Boilerplate
    });
    let readFileSync;
    module.link("fs", {
      readFileSync(v) {
        readFileSync = v;
      }
    }, 0);
    let createStream;
    module.link("combined-stream2", {
      create(v) {
        createStream = v;
      }
    }, 1);
    let modernHeadTemplate, modernCloseTemplate;
    module.link("./template-web.browser", {
      headTemplate(v) {
        modernHeadTemplate = v;
      },
      closeTemplate(v) {
        modernCloseTemplate = v;
      }
    }, 2);
    let cordovaHeadTemplate, cordovaCloseTemplate;
    module.link("./template-web.cordova", {
      headTemplate(v) {
        cordovaHeadTemplate = v;
      },
      closeTemplate(v) {
        cordovaCloseTemplate = v;
      }
    }, 3);
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    // Copied from webapp_server
    const readUtf8FileSync = filename => readFileSync(filename, 'utf8');
    const identity = value => value;
    function appendToStream(chunk, stream) {
      if (typeof chunk === "string") {
        stream.append(Buffer.from(chunk, "utf8"));
      } else if (Buffer.isBuffer(chunk) || typeof chunk.read === "function") {
        stream.append(chunk);
      }
    }
    class Boilerplate {
      constructor(arch, manifest) {
        let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
        const {
          headTemplate,
          closeTemplate
        } = getTemplate(arch);
        this.headTemplate = headTemplate;
        this.closeTemplate = closeTemplate;
        this.baseData = null;
        this._generateBoilerplateFromManifest(manifest, options);
      }
      toHTML(extraData) {
        throw new Error("The Boilerplate#toHTML method has been removed. " + "Please use Boilerplate#toHTMLStream instead.");
      }

      // Returns a Promise that resolves to a string of HTML.
      toHTMLAsync(extraData) {
        return new Promise((resolve, reject) => {
          const stream = this.toHTMLStream(extraData);
          const chunks = [];
          stream.on("data", chunk => chunks.push(chunk));
          stream.on("end", () => {
            resolve(Buffer.concat(chunks).toString("utf8"));
          });
          stream.on("error", reject);
        });
      }

      // The 'extraData' argument can be used to extend 'self.baseData'. Its
      // purpose is to allow you to specify data that you might not know at
      // the time that you construct the Boilerplate object. (e.g. it is used
      // by 'webapp' to specify data that is only known at request-time).
      // this returns a stream
      toHTMLStream(extraData) {
        if (!this.baseData || !this.headTemplate || !this.closeTemplate) {
          throw new Error('Boilerplate did not instantiate correctly.');
        }
        const data = _objectSpread(_objectSpread({}, this.baseData), extraData);
        const start = "<!DOCTYPE html>\n" + this.headTemplate(data);
        const {
          body,
          dynamicBody
        } = data;
        const end = this.closeTemplate(data);
        const response = createStream();
        appendToStream(start, response);
        if (body) {
          appendToStream(body, response);
        }
        if (dynamicBody) {
          appendToStream(dynamicBody, response);
        }
        appendToStream(end, response);
        return response;
      }

      // XXX Exported to allow client-side only changes to rebuild the boilerplate
      // without requiring a full server restart.
      // Produces an HTML string with given manifest and boilerplateSource.
      // Optionally takes urlMapper in case urls from manifest need to be prefixed
      // or rewritten.
      // Optionally takes pathMapper for resolving relative file system paths.
      // Optionally allows to override fields of the data context.
      _generateBoilerplateFromManifest(manifest) {
        let {
          urlMapper = identity,
          pathMapper = identity,
          baseDataExtension,
          inline
        } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        const boilerplateBaseData = _objectSpread({
          css: [],
          js: [],
          head: '',
          body: '',
          meteorManifest: JSON.stringify(manifest)
        }, baseDataExtension);
        manifest.forEach(item => {
          const urlPath = urlMapper(item.url);
          const itemObj = {
            url: urlPath
          };
          if (inline) {
            itemObj.scriptContent = readUtf8FileSync(pathMapper(item.path));
            itemObj.inline = true;
          } else if (item.sri) {
            itemObj.sri = item.sri;
          }
          if (item.type === 'css' && item.where === 'client') {
            boilerplateBaseData.css.push(itemObj);
          }
          if (item.type === 'js' && item.where === 'client' &&
          // Dynamic JS modules should not be loaded eagerly in the
          // initial HTML of the app.
          !item.path.startsWith('dynamic/')) {
            boilerplateBaseData.js.push(itemObj);
          }
          if (item.type === 'head') {
            boilerplateBaseData.head = readUtf8FileSync(pathMapper(item.path));
          }
          if (item.type === 'body') {
            boilerplateBaseData.body = readUtf8FileSync(pathMapper(item.path));
          }
        });
        this.baseData = boilerplateBaseData;
      }
    }
    ;

    // Returns a template function that, when called, produces the boilerplate
    // html as a string.
    function getTemplate(arch) {
      const prefix = arch.split(".", 2).join(".");
      if (prefix === "web.browser") {
        return {
          headTemplate: modernHeadTemplate,
          closeTemplate: modernCloseTemplate
        };
      }
      if (prefix === "web.cordova") {
        return {
          headTemplate: cordovaHeadTemplate,
          closeTemplate: cordovaCloseTemplate
        };
      }
      throw new Error("Unsupported arch: " + arch);
    }
    __reify_async_result__();
  } catch (_reifyError) {
    return __reify_async_result__(_reifyError);
  }
  __reify_async_result__()
}, {
  self: this,
  async: false
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"template-web.browser.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/boilerplate-generator/template-web.browser.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reify_async_result__) {
  "use strict";
  try {
    module.export({
      headTemplate: () => headTemplate,
      closeTemplate: () => closeTemplate
    });
    let template;
    module.link("./template", {
      default(v) {
        template = v;
      }
    }, 0);
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    const sri = (sri, mode) => sri && mode ? " integrity=\"sha512-".concat(sri, "\" crossorigin=\"").concat(mode, "\"") : '';
    const headTemplate = _ref => {
      let {
        css,
        htmlAttributes,
        bundledJsCssUrlRewriteHook,
        sriMode,
        head,
        dynamicHead
      } = _ref;
      var headSections = head.split(/<meteor-bundled-css[^<>]*>/, 2);
      var cssBundle = [...(css || []).map(file => template('  <link rel="stylesheet" type="text/css" class="__meteor-css__" href="<%- href %>"<%= sri %>>')({
        href: bundledJsCssUrlRewriteHook(file.url),
        sri: sri(file.sri, sriMode)
      }))].join('\n');
      return ['<html' + Object.keys(htmlAttributes || {}).map(key => template(' <%= attrName %>="<%- attrValue %>"')({
        attrName: key,
        attrValue: htmlAttributes[key]
      })).join('') + '>', '<head>', headSections.length === 1 ? [cssBundle, headSections[0]].join('\n') : [headSections[0], cssBundle, headSections[1]].join('\n'), dynamicHead, '</head>', '<body>'].join('\n');
    };
    const closeTemplate = _ref2 => {
      let {
        meteorRuntimeConfig,
        meteorRuntimeHash,
        rootUrlPathPrefix,
        inlineScriptsAllowed,
        js,
        additionalStaticJs,
        bundledJsCssUrlRewriteHook,
        sriMode
      } = _ref2;
      return ['', inlineScriptsAllowed ? template('  <script type="text/javascript">__meteor_runtime_config__ = JSON.parse(decodeURIComponent(<%= conf %>))</script>')({
        conf: meteorRuntimeConfig
      }) : template('  <script type="text/javascript" src="<%- src %>/meteor_runtime_config.js?hash=<%- hash %>"></script>')({
        src: rootUrlPathPrefix,
        hash: meteorRuntimeHash
      }), '', ...(js || []).map(file => template('  <script type="text/javascript" src="<%- src %>"<%= sri %>></script>')({
        src: bundledJsCssUrlRewriteHook(file.url),
        sri: sri(file.sri, sriMode)
      })), ...(additionalStaticJs || []).map(_ref3 => {
        let {
          contents,
          pathname
        } = _ref3;
        return inlineScriptsAllowed ? template('  <script><%= contents %></script>')({
          contents
        }) : template('  <script type="text/javascript" src="<%- src %>"></script>')({
          src: rootUrlPathPrefix + pathname
        });
      }), '', '', '</body>', '</html>'].join('\n');
    };
    __reify_async_result__();
  } catch (_reifyError) {
    return __reify_async_result__(_reifyError);
  }
  __reify_async_result__()
}, {
  self: this,
  async: false
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"template-web.cordova.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/boilerplate-generator/template-web.cordova.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reify_async_result__) {
  "use strict";
  try {
    module.export({
      headTemplate: () => headTemplate,
      closeTemplate: () => closeTemplate
    });
    let template;
    module.link("./template", {
      default(v) {
        template = v;
      }
    }, 0);
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    const headTemplate = _ref => {
      let {
        meteorRuntimeConfig,
        rootUrlPathPrefix,
        inlineScriptsAllowed,
        css,
        js,
        additionalStaticJs,
        htmlAttributes,
        bundledJsCssUrlRewriteHook,
        head,
        dynamicHead
      } = _ref;
      var headSections = head.split(/<meteor-bundled-css[^<>]*>/, 2);
      var cssBundle = [
      // We are explicitly not using bundledJsCssUrlRewriteHook: in cordova we serve assets up directly from disk, so rewriting the URL does not make sense
      ...(css || []).map(file => template('  <link rel="stylesheet" type="text/css" class="__meteor-css__" href="<%- href %>">')({
        href: file.url
      }))].join('\n');
      return ['<html>', '<head>', '  <meta charset="utf-8">', '  <meta name="format-detection" content="telephone=no">', '  <meta name="viewport" content="user-scalable=no, initial-scale=1, maximum-scale=1, minimum-scale=1, width=device-width, height=device-height, viewport-fit=cover">', '  <meta name="msapplication-tap-highlight" content="no">', '  <meta http-equiv="Content-Security-Policy" content="default-src * android-webview-video-poster: gap: data: blob: \'unsafe-inline\' \'unsafe-eval\' ws: wss:;">', headSections.length === 1 ? [cssBundle, headSections[0]].join('\n') : [headSections[0], cssBundle, headSections[1]].join('\n'), '  <script type="text/javascript">', template('    __meteor_runtime_config__ = JSON.parse(decodeURIComponent(<%= conf %>));')({
        conf: meteorRuntimeConfig
      }), '    if (/Android/i.test(navigator.userAgent)) {',
      // When Android app is emulated, it cannot connect to localhost,
      // instead it should connect to 10.0.2.2
      // (unless we\'re using an http proxy; then it works!)
      '      if (!__meteor_runtime_config__.httpProxyPort) {', '        __meteor_runtime_config__.ROOT_URL = (__meteor_runtime_config__.ROOT_URL || \'\').replace(/localhost/i, \'10.0.2.2\');', '        __meteor_runtime_config__.DDP_DEFAULT_CONNECTION_URL = (__meteor_runtime_config__.DDP_DEFAULT_CONNECTION_URL || \'\').replace(/localhost/i, \'10.0.2.2\');', '      }', '    }', '  </script>', '', '  <script type="text/javascript" src="/cordova.js"></script>', ...(js || []).map(file => template('  <script type="text/javascript" src="<%- src %>"></script>')({
        src: file.url
      })), ...(additionalStaticJs || []).map(_ref2 => {
        let {
          contents,
          pathname
        } = _ref2;
        return inlineScriptsAllowed ? template('  <script><%= contents %></script>')({
          contents
        }) : template('  <script type="text/javascript" src="<%- src %>"></script>')({
          src: rootUrlPathPrefix + pathname
        });
      }), '', '</head>', '', '<body>'].join('\n');
    };
    function closeTemplate() {
      return "</body>\n</html>";
    }
    __reify_async_result__();
  } catch (_reifyError) {
    return __reify_async_result__(_reifyError);
  }
  __reify_async_result__()
}, {
  self: this,
  async: false
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"template.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/boilerplate-generator/template.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => template
});
/**
 * Internal full-featured implementation of lodash.template (inspired by v4.5.0)
 * embedded to eliminate the external dependency while preserving functionality.
 *
 * MIT License (c) JS Foundation and other contributors <https://js.foundation/>
 * Adapted for Meteor boilerplate-generator (only the pieces required by template were extracted).
 */

// ---------------------------------------------------------------------------
// Utility & regex definitions (mirroring lodash pieces used by template)
// ---------------------------------------------------------------------------

const reEmptyStringLeading = /\b__p \+= '';/g;
const reEmptyStringMiddle = /\b(__p \+=) '' \+/g;
const reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;
const reEscape = /<%-([\s\S]+?)%>/g; // escape delimiter
const reEvaluate = /<%([\s\S]+?)%>/g; // evaluate delimiter
const reInterpolate = /<%=([\s\S]+?)%>/g; // interpolate delimiter
const reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g; // ES6 template literal capture
const reUnescapedString = /['\\\n\r\u2028\u2029]/g; // string literal escapes

// HTML escape
const htmlEscapes = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};
const reHasUnescapedHtml = /[&<>"']/;
function escapeHtml(string) {
  return string && reHasUnescapedHtml.test(string) ? string.replace(/[&<>"']/g, chr => htmlEscapes[chr]) : string || '';
}

// Escape characters for inclusion into a string literal
const escapes = {
  "'": "'",
  '\\': '\\',
  '\n': 'n',
  '\r': 'r',
  "\u2028": 'u2028',
  "\u2029": 'u2029'
};
function escapeStringChar(match) {
  return '\\' + escapes[match];
}

// Basic Object helpers ------------------------------------------------------
function isObject(value) {
  return value != null && typeof value === 'object';
}
function toStringSafe(value) {
  return value == null ? '' : value + '';
}
function baseValues(object, props) {
  return props.map(k => object[k]);
}
function attempt(fn) {
  try {
    return fn();
  } catch (e) {
    return e;
  }
}
function isError(value) {
  return value instanceof Error || isObject(value) && value.name === 'Error';
}

// ---------------------------------------------------------------------------
// Main template implementation
// ---------------------------------------------------------------------------
let templateCounter = -1; // used for sourceURL generation

function _template(string) {
  string = toStringSafe(string);
  const imports = {
    '_': {
      escape: escapeHtml
    }
  };
  const importKeys = Object.keys(imports);
  const importValues = baseValues(imports, importKeys);
  let index = 0;
  let isEscaping;
  let isEvaluating;
  let source = "__p += '";

  // Build combined regex of delimiters
  const reDelimiters = RegExp(reEscape.source + '|' + reInterpolate.source + '|' + reEsTemplate.source + '|' + reEvaluate.source + '|$', 'g');
  const sourceURL = "//# sourceURL=lodash.templateSources[".concat(++templateCounter, "]\n");

  // Tokenize
  string.replace(reDelimiters, function (match, escapeValue, interpolateValue, esTemplateValue, evaluateValue, offset) {
    interpolateValue || (interpolateValue = esTemplateValue);
    // Append preceding string portion with escaped literal chars
    source += string.slice(index, offset).replace(reUnescapedString, escapeStringChar);
    if (escapeValue) {
      isEscaping = true;
      source += "' +\n__e(" + escapeValue + ") +\n'";
    }
    if (evaluateValue) {
      isEvaluating = true;
      source += "';\n" + evaluateValue + ";\n__p += '";
    }
    if (interpolateValue) {
      source += "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
    }
    index = offset + match.length;
    return match;
  });
  source += "';\n";
  source = 'with (obj) {\n' + source + '\n}\n';

  // Remove unnecessary concatenations
  source = (isEvaluating ? source.replace(reEmptyStringLeading, '') : source).replace(reEmptyStringMiddle, '$1').replace(reEmptyStringTrailing, '$1;');

  // Frame as function body
  source = 'function(obj) {\n' + 'obj || (obj = {});\n' + "var __t, __p = ''" + (isEscaping ? ', __e = _.escape' : '') + (isEvaluating ? ', __j = Array.prototype.join;\nfunction print() { __p += __j.call(arguments, \'\') }\n' : ';\n') + source + 'return __p\n}';

  // Actual compile step
  const result = attempt(function () {
    return Function(importKeys, sourceURL + 'return ' + source).apply(undefined, importValues); // eslint-disable-line no-new-func
  });
  if (isError(result)) {
    result.source = source; // expose for debugging if error
    throw result;
  }
  // Expose compiled source
  result.source = source;
  return result;
}
function template(text) {
  return _template(text);
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"combined-stream2":{"package.json":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/boilerplate-generator/node_modules/combined-stream2/package.json                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "combined-stream2",
  "version": "1.1.2",
  "main": "index.js"
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/boilerplate-generator/node_modules/combined-stream2/index.js                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});


/* Exports */
return {
  export: function () { return {
      Boilerplate: Boilerplate
    };},
  require: require,
  eagerModulePaths: [
    "/node_modules/meteor/boilerplate-generator/generator.js"
  ],
  mainModulePath: "/node_modules/meteor/boilerplate-generator/generator.js"
}});

//# sourceURL=meteor://💻app/packages/boilerplate-generator.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYm9pbGVycGxhdGUtZ2VuZXJhdG9yL2dlbmVyYXRvci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYm9pbGVycGxhdGUtZ2VuZXJhdG9yL3RlbXBsYXRlLXdlYi5icm93c2VyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9ib2lsZXJwbGF0ZS1nZW5lcmF0b3IvdGVtcGxhdGUtd2ViLmNvcmRvdmEuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL2JvaWxlcnBsYXRlLWdlbmVyYXRvci90ZW1wbGF0ZS5qcyJdLCJuYW1lcyI6WyJfb2JqZWN0U3ByZWFkIiwibW9kdWxlIiwibGluayIsImRlZmF1bHQiLCJ2IiwiZXhwb3J0IiwiQm9pbGVycGxhdGUiLCJyZWFkRmlsZVN5bmMiLCJjcmVhdGVTdHJlYW0iLCJjcmVhdGUiLCJtb2Rlcm5IZWFkVGVtcGxhdGUiLCJtb2Rlcm5DbG9zZVRlbXBsYXRlIiwiaGVhZFRlbXBsYXRlIiwiY2xvc2VUZW1wbGF0ZSIsImNvcmRvdmFIZWFkVGVtcGxhdGUiLCJjb3Jkb3ZhQ2xvc2VUZW1wbGF0ZSIsIl9fcmVpZnlXYWl0Rm9yRGVwc19fIiwicmVhZFV0ZjhGaWxlU3luYyIsImZpbGVuYW1lIiwiaWRlbnRpdHkiLCJ2YWx1ZSIsImFwcGVuZFRvU3RyZWFtIiwiY2h1bmsiLCJzdHJlYW0iLCJhcHBlbmQiLCJCdWZmZXIiLCJmcm9tIiwiaXNCdWZmZXIiLCJyZWFkIiwiY29uc3RydWN0b3IiLCJhcmNoIiwibWFuaWZlc3QiLCJvcHRpb25zIiwiYXJndW1lbnRzIiwibGVuZ3RoIiwidW5kZWZpbmVkIiwiZ2V0VGVtcGxhdGUiLCJiYXNlRGF0YSIsIl9nZW5lcmF0ZUJvaWxlcnBsYXRlRnJvbU1hbmlmZXN0IiwidG9IVE1MIiwiZXh0cmFEYXRhIiwiRXJyb3IiLCJ0b0hUTUxBc3luYyIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwidG9IVE1MU3RyZWFtIiwiY2h1bmtzIiwib24iLCJwdXNoIiwiY29uY2F0IiwidG9TdHJpbmciLCJkYXRhIiwic3RhcnQiLCJib2R5IiwiZHluYW1pY0JvZHkiLCJlbmQiLCJyZXNwb25zZSIsInVybE1hcHBlciIsInBhdGhNYXBwZXIiLCJiYXNlRGF0YUV4dGVuc2lvbiIsImlubGluZSIsImJvaWxlcnBsYXRlQmFzZURhdGEiLCJjc3MiLCJqcyIsImhlYWQiLCJtZXRlb3JNYW5pZmVzdCIsIkpTT04iLCJzdHJpbmdpZnkiLCJmb3JFYWNoIiwiaXRlbSIsInVybFBhdGgiLCJ1cmwiLCJpdGVtT2JqIiwic2NyaXB0Q29udGVudCIsInBhdGgiLCJzcmkiLCJ0eXBlIiwid2hlcmUiLCJzdGFydHNXaXRoIiwicHJlZml4Iiwic3BsaXQiLCJqb2luIiwiX19yZWlmeV9hc3luY19yZXN1bHRfXyIsIl9yZWlmeUVycm9yIiwic2VsZiIsImFzeW5jIiwidGVtcGxhdGUiLCJtb2RlIiwiX3JlZiIsImh0bWxBdHRyaWJ1dGVzIiwiYnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2siLCJzcmlNb2RlIiwiZHluYW1pY0hlYWQiLCJoZWFkU2VjdGlvbnMiLCJjc3NCdW5kbGUiLCJtYXAiLCJmaWxlIiwiaHJlZiIsIk9iamVjdCIsImtleXMiLCJrZXkiLCJhdHRyTmFtZSIsImF0dHJWYWx1ZSIsIl9yZWYyIiwibWV0ZW9yUnVudGltZUNvbmZpZyIsIm1ldGVvclJ1bnRpbWVIYXNoIiwicm9vdFVybFBhdGhQcmVmaXgiLCJpbmxpbmVTY3JpcHRzQWxsb3dlZCIsImFkZGl0aW9uYWxTdGF0aWNKcyIsImNvbmYiLCJzcmMiLCJoYXNoIiwiX3JlZjMiLCJjb250ZW50cyIsInBhdGhuYW1lIiwicmVFbXB0eVN0cmluZ0xlYWRpbmciLCJyZUVtcHR5U3RyaW5nTWlkZGxlIiwicmVFbXB0eVN0cmluZ1RyYWlsaW5nIiwicmVFc2NhcGUiLCJyZUV2YWx1YXRlIiwicmVJbnRlcnBvbGF0ZSIsInJlRXNUZW1wbGF0ZSIsInJlVW5lc2NhcGVkU3RyaW5nIiwiaHRtbEVzY2FwZXMiLCJyZUhhc1VuZXNjYXBlZEh0bWwiLCJlc2NhcGVIdG1sIiwic3RyaW5nIiwidGVzdCIsInJlcGxhY2UiLCJjaHIiLCJlc2NhcGVzIiwiZXNjYXBlU3RyaW5nQ2hhciIsIm1hdGNoIiwiaXNPYmplY3QiLCJ0b1N0cmluZ1NhZmUiLCJiYXNlVmFsdWVzIiwib2JqZWN0IiwicHJvcHMiLCJrIiwiYXR0ZW1wdCIsImZuIiwiZSIsImlzRXJyb3IiLCJuYW1lIiwidGVtcGxhdGVDb3VudGVyIiwiX3RlbXBsYXRlIiwiaW1wb3J0cyIsImVzY2FwZSIsImltcG9ydEtleXMiLCJpbXBvcnRWYWx1ZXMiLCJpbmRleCIsImlzRXNjYXBpbmciLCJpc0V2YWx1YXRpbmciLCJzb3VyY2UiLCJyZURlbGltaXRlcnMiLCJSZWdFeHAiLCJzb3VyY2VVUkwiLCJlc2NhcGVWYWx1ZSIsImludGVycG9sYXRlVmFsdWUiLCJlc1RlbXBsYXRlVmFsdWUiLCJldmFsdWF0ZVZhbHVlIiwib2Zmc2V0Iiwic2xpY2UiLCJyZXN1bHQiLCJGdW5jdGlvbiIsImFwcGx5IiwidGV4dCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFBQSxJQUFJQSxhQUFhO0lBQUNDLE1BQU0sQ0FBQ0MsSUFBSSxDQUFDLHNDQUFzQyxFQUFDO01BQUNDLE9BQU9BLENBQUNDLENBQUMsRUFBQztRQUFDSixhQUFhLEdBQUNJLENBQUM7TUFBQTtJQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7SUFBckdILE1BQU0sQ0FBQ0ksTUFBTSxDQUFDO01BQUNDLFdBQVcsRUFBQ0EsQ0FBQSxLQUFJQTtJQUFXLENBQUMsQ0FBQztJQUFDLElBQUlDLFlBQVk7SUFBQ04sTUFBTSxDQUFDQyxJQUFJLENBQUMsSUFBSSxFQUFDO01BQUNLLFlBQVlBLENBQUNILENBQUMsRUFBQztRQUFDRyxZQUFZLEdBQUNILENBQUM7TUFBQTtJQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7SUFBQyxJQUFJSSxZQUFZO0lBQUNQLE1BQU0sQ0FBQ0Ms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QUNWLE1BQU0sR0FBR0EsTUFBTSxDQUFDLENBQUM7SUFDeEIsTUFBTVUsTUFBTTtFQUNkO0VBQ0E7RUFDQUEsTUFBTSxDQUFDVixNQUFNLEdBQUdBLE1BQU07RUFDdEIsT0FBT1UsTUFBTTtBQUNmO0FBRWUsU0FBUzdFLFFBQVFBLENBQUNnRixJQUFJLEVBQUU7RUFDckMsT0FBT3JCLFNBQVMsQ0FBQ3FCLElBQUksQ0FBQztBQUN4QixDIiwiZmlsZSI6Ii9wYWNrYWdlcy9ib2lsZXJwbGF0ZS1nZW5lcmF0b3IuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge3JlYWRGaWxlU3luY30gZnJvbSAnZnMnO1xuaW1wb3J0IHsgY3JlYXRlIGFzIGNyZWF0ZVN0cmVhbSB9IGZyb20gXCJjb21iaW5lZC1zdHJlYW0yXCI7XG5cbmltcG9ydCB7IGhlYWRUZW1wbGF0ZSBhcyBtb2Rlcm5IZWFkVGVtcGxhdGUsIGNsb3NlVGVtcGxhdGUgYXMgbW9kZXJuQ2xvc2VUZW1wbGF0ZSB9IGZyb20gJy4vdGVtcGxhdGUtd2ViLmJyb3dzZXInO1xuaW1wb3J0IHsgaGVhZFRlbXBsYXRlIGFzIGNvcmRvdmFIZWFkVGVtcGxhdGUsIGNsb3NlVGVtcGxhdGUgYXMgY29yZG92YUNsb3NlVGVtcGxhdGUgfSBmcm9tICcuL3RlbXBsYXRlLXdlYi5jb3Jkb3ZhJztcblxuLy8gQ29waWVkIGZyb20gd2ViYXBwX3NlcnZlclxuY29uc3QgcmVhZFV0ZjhGaWxlU3luYyA9IGZpbGVuYW1lID0+IHJlYWRGaWxlU3luYyhmaWxlbmFtZSwgJ3V0ZjgnKTtcblxuY29uc3QgaWRlbnRpdHkgPSB2YWx1ZSA9PiB2YWx1ZTtcblxuZnVuY3Rpb24gYXBwZW5kVG9TdHJlYW0oY2h1bmssIHN0cmVhbSkge1xuICBpZiAodHlwZW9mIGNodW5rID09PSBcInN0cmluZ1wiKSB7XG4gICAgc3RyZWFtLmFwcGVuZChCdWZmZXIuZnJvbShjaHVuaywgXCJ1dGY4XCIpKTtcbiAgfSBlbHNlIGlmIChCdWZmZXIuaXNCdWZmZXIoY2h1bmspIHx8XG4gICAgICAgICAgICAgdHlwZW9mIGNodW5rLnJlYWQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIHN0cmVhbS5hcHBlbmQoY2h1bmspO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBCb2lsZXJwbGF0ZSB7XG4gIGNvbnN0cnVjdG9yKGFyY2gsIG1hbmlmZXN0LCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCB7IGhlYWRUZW1wbGF0ZSwgY2xvc2VUZW1wbGF0ZSB9ID0gZ2V0VGVtcGxhdGUoYXJjaCk7XG4gICAgdGhpcy5oZWFkVGVtcGxhdGUgPSBoZWFkVGVtcGxhdGU7XG4gICAgdGhpcy5jbG9zZVRlbXBsYXRlID0gY2xvc2VUZW1wbGF0ZTtcbiAgICB0aGlzLmJhc2VEYXRhID0gbnVsbDtcblxuICAgIHRoaXMuX2dlbmVyYXRlQm9pbGVycGxhdGVGcm9tTWFuaWZlc3QoXG4gICAgICBtYW5pZmVzdCxcbiAgICAgIG9wdGlvbnNcbiAgICApO1xuICB9XG5cbiAgdG9IVE1MKGV4dHJhRGF0YSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIFwiVGhlIEJvaWxlcnBsYXRlI3RvSFRNTCBtZXRob2QgaGFzIGJlZW4gcmVtb3ZlZC4gXCIgK1xuICAgICAgICBcIlBsZWFzZSB1c2UgQm9pbGVycGxhdGUjdG9IVE1MU3RyZWFtIGluc3RlYWQuXCJcbiAgICApO1xuICB9XG5cbiAgLy8gUmV0dXJucyBhIFByb21pc2UgdGhhdCByZXNvbHZlcyB0byBhIHN0cmluZyBvZiBIVE1MLlxuICB0b0hUTUxBc3luYyhleHRyYURhdGEpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3Qgc3RyZWFtID0gdGhpcy50b0hUTUxTdHJlYW0oZXh0cmFEYXRhKTtcbiAgICAgIGNvbnN0IGNodW5rcyA9IFtdO1xuICAgICAgc3RyZWFtLm9uKFwiZGF0YVwiLCBjaHVuayA9PiBjaHVua3MucHVzaChjaHVuaykpO1xuICAgICAgc3RyZWFtLm9uKFwiZW5kXCIsICgpID0+IHtcbiAgICAgICAgcmVzb2x2ZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoXCJ1dGY4XCIpKTtcbiAgICAgIH0pO1xuICAgICAgc3RyZWFtLm9uKFwiZXJyb3JcIiwgcmVqZWN0KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIFRoZSAnZXh0cmFEYXRhJyBhcmd1bWVudCBjYW4gYmUgdXNlZCB0byBleHRlbmQgJ3NlbGYuYmFzZURhdGEnLiBJdHNcbiAgLy8gcHVycG9zZSBpcyB0byBhbGxvdyB5b3UgdG8gc3BlY2lmeSBkYXRhIHRoYXQgeW91IG1pZ2h0IG5vdCBrbm93IGF0XG4gIC8vIHRoZSB0aW1lIHRoYXQgeW91IGNvbnN0cnVjdCB0aGUgQm9pbGVycGxhdGUgb2JqZWN0LiAoZS5nLiBpdCBpcyB1c2VkXG4gIC8vIGJ5ICd3ZWJhcHAnIHRvIHNwZWNpZnkgZGF0YSB0aGF0IGlzIG9ubHkga25vd24gYXQgcmVxdWVzdC10aW1lKS5cbiAgLy8gdGhpcyByZXR1cm5zIGEgc3RyZWFtXG4gIHRvSFRNTFN0cmVhbShleHRyYURhdGEpIHtcbiAgICBpZiAoIXRoaXMuYmFzZURhdGEgfHwgIXRoaXMuaGVhZFRlbXBsYXRlIHx8ICF0aGlzLmNsb3NlVGVtcGxhdGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQm9pbGVycGxhdGUgZGlkIG5vdCBpbnN0YW50aWF0ZSBjb3JyZWN0bHkuJyk7XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YSA9IHsuLi50aGlzLmJhc2VEYXRhLCAuLi5leHRyYURhdGF9O1xuICAgIGNvbnN0IHN0YXJ0ID0gXCI8IURPQ1RZUEUgaHRtbD5cXG5cIiArIHRoaXMuaGVhZFRlbXBsYXRlKGRhdGEpO1xuXG4gICAgY29uc3QgeyBib2R5LCBkeW5hbWljQm9keSB9ID0gZGF0YTtcblxuICAgIGNvbnN0IGVuZCA9IHRoaXMuY2xvc2VUZW1wbGF0ZShkYXRhKTtcbiAgICBjb25zdCByZXNwb25zZSA9IGNyZWF0ZVN0cmVhbSgpO1xuXG4gICAgYXBwZW5kVG9TdHJlYW0oc3RhcnQsIHJlc3BvbnNlKTtcblxuICAgIGlmIChib2R5KSB7XG4gICAgICBhcHBlbmRUb1N0cmVhbShib2R5LCByZXNwb25zZSk7XG4gICAgfVxuXG4gICAgaWYgKGR5bmFtaWNCb2R5KSB7XG4gICAgICBhcHBlbmRUb1N0cmVhbShkeW5hbWljQm9keSwgcmVzcG9uc2UpO1xuICAgIH1cblxuICAgIGFwcGVuZFRvU3RyZWFtKGVuZCwgcmVzcG9uc2UpO1xuXG4gICAgcmV0dXJuIHJlc3BvbnNlO1xuICB9XG5cbiAgLy8gWFhYIEV4cG9ydGVkIHRvIGFsbG93IGNsaWVudC1zaWRlIG9ubHkgY2hhbmdlcyB0byByZWJ1aWxkIHRoZSBib2lsZXJwbGF0ZVxuICAvLyB3aXRob3V0IHJlcXVpcmluZyBhIGZ1bGwgc2VydmVyIHJlc3RhcnQuXG4gIC8vIFByb2R1Y2VzIGFuIEhUTUwgc3RyaW5nIHdpdGggZ2l2ZW4gbWFuaWZlc3QgYW5kIGJvaWxlcnBsYXRlU291cmNlLlxuICAvLyBPcHRpb25hbGx5IHRha2VzIHVybE1hcHBlciBpbiBjYXNlIHVybHMgZnJvbSBtYW5pZmVzdCBuZWVkIHRvIGJlIHByZWZpeGVkXG4gIC8vIG9yIHJld3JpdHRlbi5cbiAgLy8gT3B0aW9uYWxseSB0YWtlcyBwYXRoTWFwcGVyIGZvciByZXNvbHZpbmcgcmVsYXRpdmUgZmlsZSBzeXN0ZW0gcGF0aHMuXG4gIC8vIE9wdGlvbmFsbHkgYWxsb3dzIHRvIG92ZXJyaWRlIGZpZWxkcyBvZiB0aGUgZGF0YSBjb250ZXh0LlxuICBfZ2VuZXJhdGVCb2lsZXJwbGF0ZUZyb21NYW5pZmVzdChtYW5pZmVzdCwge1xuICAgIHVybE1hcHBlciA9IGlkZW50aXR5LFxuICAgIHBhdGhNYXBwZXIgPSBpZGVudGl0eSxcbiAgICBiYXNlRGF0YUV4dGVuc2lvbixcbiAgICBpbmxpbmUsXG4gIH0gPSB7fSkge1xuXG4gICAgY29uc3QgYm9pbGVycGxhdGVCYXNlRGF0YSA9IHtcbiAgICAgIGNzczogW10sXG4gICAgICBqczogW10sXG4gICAgICBoZWFkOiAnJyxcbiAgICAgIGJvZHk6ICcnLFxuICAgICAgbWV0ZW9yTWFuaWZlc3Q6IEpTT04uc3RyaW5naWZ5KG1hbmlmZXN0KSxcbiAgICAgIC4uLmJhc2VEYXRhRXh0ZW5zaW9uLFxuICAgIH07XG5cbiAgICBtYW5pZmVzdC5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgY29uc3QgdXJsUGF0aCA9IHVybE1hcHBlcihpdGVtLnVybCk7XG4gICAgICBjb25zdCBpdGVtT2JqID0geyB1cmw6IHVybFBhdGggfTtcblxuICAgICAgaWYgKGlubGluZSkge1xuICAgICAgICBpdGVtT2JqLnNjcmlwdENvbnRlbnQgPSByZWFkVXRmOEZpbGVTeW5jKFxuICAgICAgICAgIHBhdGhNYXBwZXIoaXRlbS5wYXRoKSk7XG4gICAgICAgIGl0ZW1PYmouaW5saW5lID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoaXRlbS5zcmkpIHtcbiAgICAgICAgaXRlbU9iai5zcmkgPSBpdGVtLnNyaTtcbiAgICAgIH1cblxuICAgICAgaWYgKGl0ZW0udHlwZSA9PT0gJ2NzcycgJiYgaXRlbS53aGVyZSA9PT0gJ2NsaWVudCcpIHtcbiAgICAgICAgYm9pbGVycGxhdGVCYXNlRGF0YS5jc3MucHVzaChpdGVtT2JqKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGl0ZW0udHlwZSA9PT0gJ2pzJyAmJiBpdGVtLndoZXJlID09PSAnY2xpZW50JyAmJlxuICAgICAgICAvLyBEeW5hbWljIEpTIG1vZHVsZXMgc2hvdWxkIG5vdCBiZSBsb2FkZWQgZWFnZXJseSBpbiB0aGVcbiAgICAgICAgLy8gaW5pdGlhbCBIVE1MIG9mIHRoZSBhcHAuXG4gICAgICAgICFpdGVtLnBhdGguc3RhcnRzV2l0aCgnZHluYW1pYy8nKSkge1xuICAgICAgICBib2lsZXJwbGF0ZUJhc2VEYXRhLmpzLnB1c2goaXRlbU9iaik7XG4gICAgICB9XG5cbiAgICAgIGlmIChpdGVtLnR5cGUgPT09ICdoZWFkJykge1xuICAgICAgICBib2lsZXJwbGF0ZUJhc2VEYXRhLmhlYWQgPVxuICAgICAgICAgIHJlYWRVdGY4RmlsZVN5bmMocGF0aE1hcHBlcihpdGVtLnBhdGgpKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGl0ZW0udHlwZSA9PT0gJ2JvZHknKSB7XG4gICAgICAgIGJvaWxlcnBsYXRlQmFzZURhdGEuYm9keSA9XG4gICAgICAgICAgcmVhZFV0ZjhGaWxlU3luYyhwYXRoTWFwcGVyKGl0ZW0ucGF0aCkpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5iYXNlRGF0YSA9IGJvaWxlcnBsYXRlQmFzZURhdGE7XG4gIH1cbn07XG5cbi8vIFJldHVybnMgYSB0ZW1wbGF0ZSBmdW5jdGlvbiB0aGF0LCB3aGVuIGNhbGxlZCwgcHJvZHVjZXMgdGhlIGJvaWxlcnBsYXRlXG4vLyBodG1sIGFzIGEgc3RyaW5nLlxuZnVuY3Rpb24gZ2V0VGVtcGxhdGUoYXJjaCkge1xuICBjb25zdCBwcmVmaXggPSBhcmNoLnNwbGl0KFwiLlwiLCAyKS5qb2luKFwiLlwiKTtcblxuICBpZiAocHJlZml4ID09PSBcIndlYi5icm93c2VyXCIpIHtcbiAgICByZXR1cm4geyBoZWFkVGVtcGxhdGU6IG1vZGVybkhlYWRUZW1wbGF0ZSwgY2xvc2VUZW1wbGF0ZTogbW9kZXJuQ2xvc2VUZW1wbGF0ZSB9O1xuICB9XG5cbiAgaWYgKHByZWZpeCA9PT0gXCJ3ZWIuY29yZG92YVwiKSB7XG4gICAgcmV0dXJuIHsgaGVhZFRlbXBsYXRlOiBjb3Jkb3ZhSGVhZFRlbXBsYXRlLCBjbG9zZVRlbXBsYXRlOiBjb3Jkb3ZhQ2xvc2VUZW1wbGF0ZSB9O1xuICB9XG5cbiAgdGhyb3cgbmV3IEVycm9yKFwiVW5zdXBwb3J0ZWQgYXJjaDogXCIgKyBhcmNoKTtcbn1cbiIsImltcG9ydCB0ZW1wbGF0ZSBmcm9tICcuL3RlbXBsYXRlJztcblxuY29uc3Qgc3JpID0gKHNyaSwgbW9kZSkgPT5cbiAgKHNyaSAmJiBtb2RlKSA/IGAgaW50ZWdyaXR5PVwic2hhNTEyLSR7c3JpfVwiIGNyb3Nzb3JpZ2luPVwiJHttb2RlfVwiYCA6ICcnO1xuXG5leHBvcnQgY29uc3QgaGVhZFRlbXBsYXRlID0gKHtcbiAgY3NzLFxuICBodG1sQXR0cmlidXRlcyxcbiAgYnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2ssXG4gIHNyaU1vZGUsXG4gIGhlYWQsXG4gIGR5bmFtaWNIZWFkLFxufSkgPT4ge1xuICB2YXIgaGVhZFNlY3Rpb25zID0gaGVhZC5zcGxpdCgvPG1ldGVvci1idW5kbGVkLWNzc1tePD5dKj4vLCAyKTtcbiAgdmFyIGNzc0J1bmRsZSA9IFsuLi4oY3NzIHx8IFtdKS5tYXAoZmlsZSA9PlxuICAgIHRlbXBsYXRlKCcgIDxsaW5rIHJlbD1cInN0eWxlc2hlZXRcIiB0eXBlPVwidGV4dC9jc3NcIiBjbGFzcz1cIl9fbWV0ZW9yLWNzc19fXCIgaHJlZj1cIjwlLSBocmVmICU+XCI8JT0gc3JpICU+PicpKHtcbiAgICAgIGhyZWY6IGJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rKGZpbGUudXJsKSxcbiAgICAgIHNyaTogc3JpKGZpbGUuc3JpLCBzcmlNb2RlKSxcbiAgICB9KVxuICApXS5qb2luKCdcXG4nKTtcblxuICByZXR1cm4gW1xuICAgICc8aHRtbCcgKyBPYmplY3Qua2V5cyhodG1sQXR0cmlidXRlcyB8fCB7fSkubWFwKFxuICAgICAga2V5ID0+IHRlbXBsYXRlKCcgPCU9IGF0dHJOYW1lICU+PVwiPCUtIGF0dHJWYWx1ZSAlPlwiJykoe1xuICAgICAgICBhdHRyTmFtZToga2V5LFxuICAgICAgICBhdHRyVmFsdWU6IGh0bWxBdHRyaWJ1dGVzW2tleV0sXG4gICAgICB9KVxuICAgICkuam9pbignJykgKyAnPicsXG5cbiAgICAnPGhlYWQ+JyxcblxuICAgIChoZWFkU2VjdGlvbnMubGVuZ3RoID09PSAxKVxuICAgICAgPyBbY3NzQnVuZGxlLCBoZWFkU2VjdGlvbnNbMF1dLmpvaW4oJ1xcbicpXG4gICAgICA6IFtoZWFkU2VjdGlvbnNbMF0sIGNzc0J1bmRsZSwgaGVhZFNlY3Rpb25zWzFdXS5qb2luKCdcXG4nKSxcblxuICAgIGR5bmFtaWNIZWFkLFxuICAgICc8L2hlYWQ+JyxcbiAgICAnPGJvZHk+JyxcbiAgXS5qb2luKCdcXG4nKTtcbn07XG5cbi8vIFRlbXBsYXRlIGZ1bmN0aW9uIGZvciByZW5kZXJpbmcgdGhlIGJvaWxlcnBsYXRlIGh0bWwgZm9yIGJyb3dzZXJzXG5leHBvcnQgY29uc3QgY2xvc2VUZW1wbGF0ZSA9ICh7XG4gIG1ldGVvclJ1bnRpbWVDb25maWcsXG4gIG1ldGVvclJ1bnRpbWVIYXNoLFxuICByb290VXJsUGF0aFByZWZpeCxcbiAgaW5saW5lU2NyaXB0c0FsbG93ZWQsXG4gIGpzLFxuICBhZGRpdGlvbmFsU3RhdGljSnMsXG4gIGJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rLFxuICBzcmlNb2RlLFxufSkgPT4gW1xuICAnJyxcbiAgaW5saW5lU2NyaXB0c0FsbG93ZWRcbiAgICA/IHRlbXBsYXRlKCcgIDxzY3JpcHQgdHlwZT1cInRleHQvamF2YXNjcmlwdFwiPl9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18gPSBKU09OLnBhcnNlKGRlY29kZVVSSUNvbXBvbmVudCg8JT0gY29uZiAlPikpPC9zY3JpcHQ+Jykoe1xuICAgICAgY29uZjogbWV0ZW9yUnVudGltZUNvbmZpZyxcbiAgICB9KVxuICAgIDogdGVtcGxhdGUoJyAgPHNjcmlwdCB0eXBlPVwidGV4dC9qYXZhc2NyaXB0XCIgc3JjPVwiPCUtIHNyYyAlPi9tZXRlb3JfcnVudGltZV9jb25maWcuanM/aGFzaD08JS0gaGFzaCAlPlwiPjwvc2NyaXB0PicpKHtcbiAgICAgIHNyYzogcm9vdFVybFBhdGhQcmVmaXgsXG4gICAgICBoYXNoOiBtZXRlb3JSdW50aW1lSGFzaCxcbiAgICB9KSxcbiAgJycsXG5cbiAgLi4uKGpzIHx8IFtdKS5tYXAoZmlsZSA9PlxuICAgIHRlbXBsYXRlKCcgIDxzY3JpcHQgdHlwZT1cInRleHQvamF2YXNjcmlwdFwiIHNyYz1cIjwlLSBzcmMgJT5cIjwlPSBzcmkgJT4+PC9zY3JpcHQ+Jykoe1xuICAgICAgc3JjOiBidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayhmaWxlLnVybCksXG4gICAgICBzcmk6IHNyaShmaWxlLnNyaSwgc3JpTW9kZSksXG4gICAgfSlcbiAgKSxcblxuICAuLi4oYWRkaXRpb25hbFN0YXRpY0pzIHx8IFtdKS5tYXAoKHsgY29udGVudHMsIHBhdGhuYW1lIH0pID0+IChcbiAgICBpbmxpbmVTY3JpcHRzQWxsb3dlZFxuICAgICAgPyB0ZW1wbGF0ZSgnICA8c2NyaXB0PjwlPSBjb250ZW50cyAlPjwvc2NyaXB0PicpKHtcbiAgICAgICAgY29udGVudHMsXG4gICAgICB9KVxuICAgICAgOiB0ZW1wbGF0ZSgnICA8c2NyaXB0IHR5cGU9XCJ0ZXh0L2phdmFzY3JpcHRcIiBzcmM9XCI8JS0gc3JjICU+XCI+PC9zY3JpcHQ+Jykoe1xuICAgICAgICBzcmM6IHJvb3RVcmxQYXRoUHJlZml4ICsgcGF0aG5hbWUsXG4gICAgICB9KVxuICApKSxcblxuICAnJyxcbiAgJycsXG4gICc8L2JvZHk+JyxcbiAgJzwvaHRtbD4nXG5dLmpvaW4oJ1xcbicpO1xuIiwiaW1wb3J0IHRlbXBsYXRlIGZyb20gJy4vdGVtcGxhdGUnO1xuXG4vLyBUZW1wbGF0ZSBmdW5jdGlvbiBmb3IgcmVuZGVyaW5nIHRoZSBib2lsZXJwbGF0ZSBodG1sIGZvciBjb3Jkb3ZhXG5leHBvcnQgY29uc3QgaGVhZFRlbXBsYXRlID0gKHtcbiAgbWV0ZW9yUnVudGltZUNvbmZpZyxcbiAgcm9vdFVybFBhdGhQcmVmaXgsXG4gIGlubGluZVNjcmlwdHNBbGxvd2VkLFxuICBjc3MsXG4gIGpzLFxuICBhZGRpdGlvbmFsU3RhdGljSnMsXG4gIGh0bWxBdHRyaWJ1dGVzLFxuICBidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayxcbiAgaGVhZCxcbiAgZHluYW1pY0hlYWQsXG59KSA9PiB7XG4gIHZhciBoZWFkU2VjdGlvbnMgPSBoZWFkLnNwbGl0KC88bWV0ZW9yLWJ1bmRsZWQtY3NzW148Pl0qPi8sIDIpO1xuICB2YXIgY3NzQnVuZGxlID0gW1xuICAgIC8vIFdlIGFyZSBleHBsaWNpdGx5IG5vdCB1c2luZyBidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vazogaW4gY29yZG92YSB3ZSBzZXJ2ZSBhc3NldHMgdXAgZGlyZWN0bHkgZnJvbSBkaXNrLCBzbyByZXdyaXRpbmcgdGhlIFVSTCBkb2VzIG5vdCBtYWtlIHNlbnNlXG4gICAgLi4uKGNzcyB8fCBbXSkubWFwKGZpbGUgPT5cbiAgICAgIHRlbXBsYXRlKCcgIDxsaW5rIHJlbD1cInN0eWxlc2hlZXRcIiB0eXBlPVwidGV4dC9jc3NcIiBjbGFzcz1cIl9fbWV0ZW9yLWNzc19fXCIgaHJlZj1cIjwlLSBocmVmICU+XCI+Jykoe1xuICAgICAgICBocmVmOiBmaWxlLnVybCxcbiAgICAgIH0pXG4gICldLmpvaW4oJ1xcbicpO1xuXG4gIHJldHVybiBbXG4gICAgJzxodG1sPicsXG4gICAgJzxoZWFkPicsXG4gICAgJyAgPG1ldGEgY2hhcnNldD1cInV0Zi04XCI+JyxcbiAgICAnICA8bWV0YSBuYW1lPVwiZm9ybWF0LWRldGVjdGlvblwiIGNvbnRlbnQ9XCJ0ZWxlcGhvbmU9bm9cIj4nLFxuICAgICcgIDxtZXRhIG5hbWU9XCJ2aWV3cG9ydFwiIGNvbnRlbnQ9XCJ1c2VyLXNjYWxhYmxlPW5vLCBpbml0aWFsLXNjYWxlPTEsIG1heGltdW0tc2NhbGU9MSwgbWluaW11bS1zY2FsZT0xLCB3aWR0aD1kZXZpY2Utd2lkdGgsIGhlaWdodD1kZXZpY2UtaGVpZ2h0LCB2aWV3cG9ydC1maXQ9Y292ZXJcIj4nLFxuICAgICcgIDxtZXRhIG5hbWU9XCJtc2FwcGxpY2F0aW9uLXRhcC1oaWdobGlnaHRcIiBjb250ZW50PVwibm9cIj4nLFxuICAgICcgIDxtZXRhIGh0dHAtZXF1aXY9XCJDb250ZW50LVNlY3VyaXR5LVBvbGljeVwiIGNvbnRlbnQ9XCJkZWZhdWx0LXNyYyAqIGFuZHJvaWQtd2Vidmlldy12aWRlby1wb3N0ZXI6IGdhcDogZGF0YTogYmxvYjogXFwndW5zYWZlLWlubGluZVxcJyBcXCd1bnNhZmUtZXZhbFxcJyB3czogd3NzOjtcIj4nLFxuXG4gIChoZWFkU2VjdGlvbnMubGVuZ3RoID09PSAxKVxuICAgID8gW2Nzc0J1bmRsZSwgaGVhZFNlY3Rpb25zWzBdXS5qb2luKCdcXG4nKVxuICAgIDogW2hlYWRTZWN0aW9uc1swXSwgY3NzQnVuZGxlLCBoZWFkU2VjdGlvbnNbMV1dLmpvaW4oJ1xcbicpLFxuXG4gICAgJyAgPHNjcmlwdCB0eXBlPVwidGV4dC9qYXZhc2NyaXB0XCI+JyxcbiAgICB0ZW1wbGF0ZSgnICAgIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18gPSBKU09OLnBhcnNlKGRlY29kZVVSSUNvbXBvbmVudCg8JT0gY29uZiAlPikpOycpKHtcbiAgICAgIGNvbmY6IG1ldGVvclJ1bnRpbWVDb25maWcsXG4gICAgfSksXG4gICAgJyAgICBpZiAoL0FuZHJvaWQvaS50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpKSB7JyxcbiAgICAvLyBXaGVuIEFuZHJvaWQgYXBwIGlzIGVtdWxhdGVkLCBpdCBjYW5ub3QgY29ubmVjdCB0byBsb2NhbGhvc3QsXG4gICAgLy8gaW5zdGVhZCBpdCBzaG91bGQgY29ubmVjdCB0byAxMC4wLjIuMlxuICAgIC8vICh1bmxlc3Mgd2VcXCdyZSB1c2luZyBhbiBodHRwIHByb3h5OyB0aGVuIGl0IHdvcmtzISlcbiAgICAnICAgICAgaWYgKCFfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLmh0dHBQcm94eVBvcnQpIHsnLFxuICAgICcgICAgICAgIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uUk9PVF9VUkwgPSAoX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTCB8fCBcXCdcXCcpLnJlcGxhY2UoL2xvY2FsaG9zdC9pLCBcXCcxMC4wLjIuMlxcJyk7JyxcbiAgICAnICAgICAgICBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLkREUF9ERUZBVUxUX0NPTk5FQ1RJT05fVVJMID0gKF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uRERQX0RFRkFVTFRfQ09OTkVDVElPTl9VUkwgfHwgXFwnXFwnKS5yZXBsYWNlKC9sb2NhbGhvc3QvaSwgXFwnMTAuMC4yLjJcXCcpOycsXG4gICAgJyAgICAgIH0nLFxuICAgICcgICAgfScsXG4gICAgJyAgPC9zY3JpcHQ+JyxcbiAgICAnJyxcbiAgICAnICA8c2NyaXB0IHR5cGU9XCJ0ZXh0L2phdmFzY3JpcHRcIiBzcmM9XCIvY29yZG92YS5qc1wiPjwvc2NyaXB0PicsXG5cbiAgICAuLi4oanMgfHwgW10pLm1hcChmaWxlID0+XG4gICAgICB0ZW1wbGF0ZSgnICA8c2NyaXB0IHR5cGU9XCJ0ZXh0L2phdmFzY3JpcHRcIiBzcmM9XCI8JS0gc3JjICU+XCI+PC9zY3JpcHQ+Jykoe1xuICAgICAgICBzcmM6IGZpbGUudXJsLFxuICAgICAgfSlcbiAgICApLFxuXG4gICAgLi4uKGFkZGl0aW9uYWxTdGF0aWNKcyB8fCBbXSkubWFwKCh7IGNvbnRlbnRzLCBwYXRobmFtZSB9KSA9PiAoXG4gICAgICBpbmxpbmVTY3JpcHRzQWxsb3dlZFxuICAgICAgICA/IHRlbXBsYXRlKCcgIDxzY3JpcHQ+PCU9IGNvbnRlbnRzICU+PC9zY3JpcHQ+Jykoe1xuICAgICAgICAgIGNvbnRlbnRzLFxuICAgICAgICB9KVxuICAgICAgICA6IHRlbXBsYXRlKCcgIDxzY3JpcHQgdHlwZT1cInRleHQvamF2YXNjcmlwdFwiIHNyYz1cIjwlLSBzcmMgJT5cIj48L3NjcmlwdD4nKSh7XG4gICAgICAgICAgc3JjOiByb290VXJsUGF0aFByZWZpeCArIHBhdGhuYW1lXG4gICAgICAgIH0pXG4gICAgKSksXG4gICAgJycsXG4gICAgJzwvaGVhZD4nLFxuICAgICcnLFxuICAgICc8Ym9keT4nLFxuICBdLmpvaW4oJ1xcbicpO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNsb3NlVGVtcGxhdGUoKSB7XG4gIHJldHVybiBcIjwvYm9keT5cXG48L2h0bWw+XCI7XG59XG4iLCIvKipcbiAqIEludGVybmFsIGZ1bGwtZmVhdHVyZWQgaW1wbGVtZW50YXRpb24gb2YgbG9kYXNoLnRlbXBsYXRlIChpbnNwaXJlZCBieSB2NC41LjApXG4gKiBlbWJlZGRlZCB0byBlbGltaW5hdGUgdGhlIGV4dGVybmFsIGRlcGVuZGVuY3kgd2hpbGUgcHJlc2VydmluZyBmdW5jdGlvbmFsaXR5LlxuICpcbiAqIE1JVCBMaWNlbnNlIChjKSBKUyBGb3VuZGF0aW9uIGFuZCBvdGhlciBjb250cmlidXRvcnMgPGh0dHBzOi8vanMuZm91bmRhdGlvbi8+XG4gKiBBZGFwdGVkIGZvciBNZXRlb3IgYm9pbGVycGxhdGUtZ2VuZXJhdG9yIChvbmx5IHRoZSBwaWVjZXMgcmVxdWlyZWQgYnkgdGVtcGxhdGUgd2VyZSBleHRyYWN0ZWQpLlxuICovXG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gVXRpbGl0eSAmIHJlZ2V4IGRlZmluaXRpb25zIChtaXJyb3JpbmcgbG9kYXNoIHBpZWNlcyB1c2VkIGJ5IHRlbXBsYXRlKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmNvbnN0IHJlRW1wdHlTdHJpbmdMZWFkaW5nID0gL1xcYl9fcCBcXCs9ICcnOy9nO1xuY29uc3QgcmVFbXB0eVN0cmluZ01pZGRsZSA9IC9cXGIoX19wIFxcKz0pICcnIFxcKy9nO1xuY29uc3QgcmVFbXB0eVN0cmluZ1RyYWlsaW5nID0gLyhfX2VcXCguKj9cXCl8XFxiX190XFwpKSBcXCtcXG4nJzsvZztcblxuY29uc3QgcmVFc2NhcGUgPSAvPCUtKFtcXHNcXFNdKz8pJT4vZzsgICAgICAgICAgICAgIC8vIGVzY2FwZSBkZWxpbWl0ZXJcbmNvbnN0IHJlRXZhbHVhdGUgPSAvPCUoW1xcc1xcU10rPyklPi9nOyAgICAgICAgICAgICAgLy8gZXZhbHVhdGUgZGVsaW1pdGVyXG5jb25zdCByZUludGVycG9sYXRlID0gLzwlPShbXFxzXFxTXSs/KSU+L2c7ICAgICAgICAgIC8vIGludGVycG9sYXRlIGRlbGltaXRlclxuY29uc3QgcmVFc1RlbXBsYXRlID0gL1xcJFxceyhbXlxcXFx9XSooPzpcXFxcLlteXFxcXH1dKikqKVxcfS9nOyAvLyBFUzYgdGVtcGxhdGUgbGl0ZXJhbCBjYXB0dXJlXG5jb25zdCByZVVuZXNjYXBlZFN0cmluZyA9IC9bJ1xcXFxcXG5cXHJcXHUyMDI4XFx1MjAyOV0vZzsgLy8gc3RyaW5nIGxpdGVyYWwgZXNjYXBlc1xuXG4vLyBIVE1MIGVzY2FwZVxuY29uc3QgaHRtbEVzY2FwZXMgPSB7ICcmJzogJyZhbXA7JywgJzwnOiAnJmx0OycsICc+JzogJyZndDsnLCAnXCInOiAnJnF1b3Q7JywgXCInXCI6ICcmIzM5OycgfTtcbmNvbnN0IHJlSGFzVW5lc2NhcGVkSHRtbCA9IC9bJjw+XCInXS87XG5cbmZ1bmN0aW9uIGVzY2FwZUh0bWwoc3RyaW5nKSB7XG4gIHJldHVybiBzdHJpbmcgJiYgcmVIYXNVbmVzY2FwZWRIdG1sLnRlc3Qoc3RyaW5nKVxuICAgID8gc3RyaW5nLnJlcGxhY2UoL1smPD5cIiddL2csIGNociA9PiBodG1sRXNjYXBlc1tjaHJdKVxuICAgIDogKHN0cmluZyB8fCAnJyk7XG59XG5cbi8vIEVzY2FwZSBjaGFyYWN0ZXJzIGZvciBpbmNsdXNpb24gaW50byBhIHN0cmluZyBsaXRlcmFsXG5jb25zdCBlc2NhcGVzID0geyBcIidcIjogXCInXCIsICdcXFxcJzogJ1xcXFwnLCAnXFxuJzogJ24nLCAnXFxyJzogJ3InLCAnXFx1MjAyOCc6ICd1MjAyOCcsICdcXHUyMDI5JzogJ3UyMDI5JyB9O1xuZnVuY3Rpb24gZXNjYXBlU3RyaW5nQ2hhcihtYXRjaCkgeyByZXR1cm4gJ1xcXFwnICsgZXNjYXBlc1ttYXRjaF07IH1cblxuLy8gQmFzaWMgT2JqZWN0IGhlbHBlcnMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5mdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgIT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnOyB9XG5mdW5jdGlvbiB0b1N0cmluZ1NhZmUodmFsdWUpIHsgcmV0dXJuIHZhbHVlID09IG51bGwgPyAnJyA6ICh2YWx1ZSArICcnKTsgfVxuZnVuY3Rpb24gYmFzZVZhbHVlcyhvYmplY3QsIHByb3BzKSB7IHJldHVybiBwcm9wcy5tYXAoayA9PiBvYmplY3Rba10pOyB9XG5cblxuZnVuY3Rpb24gYXR0ZW1wdChmbikge1xuICB0cnkgeyByZXR1cm4gZm4oKTsgfSBjYXRjaCAoZSkgeyByZXR1cm4gZTsgfVxufVxuZnVuY3Rpb24gaXNFcnJvcih2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBFcnJvciB8fCAoaXNPYmplY3QodmFsdWUpICYmIHZhbHVlLm5hbWUgPT09ICdFcnJvcicpOyB9XG5cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBNYWluIHRlbXBsYXRlIGltcGxlbWVudGF0aW9uXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmxldCB0ZW1wbGF0ZUNvdW50ZXIgPSAtMTsgLy8gdXNlZCBmb3Igc291cmNlVVJMIGdlbmVyYXRpb25cblxuZnVuY3Rpb24gX3RlbXBsYXRlKHN0cmluZykge1xuICBzdHJpbmcgPSB0b1N0cmluZ1NhZmUoc3RyaW5nKTtcblxuICBjb25zdCBpbXBvcnRzID0geyAnXyc6IHsgZXNjYXBlOiBlc2NhcGVIdG1sIH0gfTtcbiAgY29uc3QgaW1wb3J0S2V5cyA9IE9iamVjdC5rZXlzKGltcG9ydHMpO1xuICBjb25zdCBpbXBvcnRWYWx1ZXMgPSBiYXNlVmFsdWVzKGltcG9ydHMsIGltcG9ydEtleXMpO1xuXG4gIGxldCBpbmRleCA9IDA7XG4gIGxldCBpc0VzY2FwaW5nO1xuICBsZXQgaXNFdmFsdWF0aW5nO1xuICBsZXQgc291cmNlID0gXCJfX3AgKz0gJ1wiO1xuXG5cbiAgLy8gQnVpbGQgY29tYmluZWQgcmVnZXggb2YgZGVsaW1pdGVyc1xuICBjb25zdCByZURlbGltaXRlcnMgPSBSZWdFeHAoXG4gICAgcmVFc2NhcGUuc291cmNlICsgJ3wnICtcbiAgICByZUludGVycG9sYXRlLnNvdXJjZSArICd8JyArXG4gICAgcmVFc1RlbXBsYXRlLnNvdXJjZSArICd8JyArXG4gICAgcmVFdmFsdWF0ZS5zb3VyY2UgKyAnfCQnXG4gICwgJ2cnKTtcblxuICBjb25zdCBzb3VyY2VVUkwgPSBgLy8jIHNvdXJjZVVSTD1sb2Rhc2gudGVtcGxhdGVTb3VyY2VzWyR7Kyt0ZW1wbGF0ZUNvdW50ZXJ9XVxcbmA7XG5cbiAgLy8gVG9rZW5pemVcbiAgc3RyaW5nLnJlcGxhY2UocmVEZWxpbWl0ZXJzLCBmdW5jdGlvbihtYXRjaCwgZXNjYXBlVmFsdWUsIGludGVycG9sYXRlVmFsdWUsIGVzVGVtcGxhdGVWYWx1ZSwgZXZhbHVhdGVWYWx1ZSwgb2Zmc2V0KSB7XG4gICAgaW50ZXJwb2xhdGVWYWx1ZSB8fCAoaW50ZXJwb2xhdGVWYWx1ZSA9IGVzVGVtcGxhdGVWYWx1ZSk7XG4gICAgLy8gQXBwZW5kIHByZWNlZGluZyBzdHJpbmcgcG9ydGlvbiB3aXRoIGVzY2FwZWQgbGl0ZXJhbCBjaGFyc1xuICAgIHNvdXJjZSArPSBzdHJpbmcuc2xpY2UoaW5kZXgsIG9mZnNldCkucmVwbGFjZShyZVVuZXNjYXBlZFN0cmluZywgZXNjYXBlU3RyaW5nQ2hhcik7XG4gICAgaWYgKGVzY2FwZVZhbHVlKSB7XG4gICAgICBpc0VzY2FwaW5nID0gdHJ1ZTtcbiAgICAgIHNvdXJjZSArPSBcIicgK1xcbl9fZShcIiArIGVzY2FwZVZhbHVlICsgXCIpICtcXG4nXCI7XG4gICAgfVxuICAgIGlmIChldmFsdWF0ZVZhbHVlKSB7XG4gICAgICBpc0V2YWx1YXRpbmcgPSB0cnVlO1xuICAgICAgc291cmNlICs9IFwiJztcXG5cIiArIGV2YWx1YXRlVmFsdWUgKyBcIjtcXG5fX3AgKz0gJ1wiO1xuICAgIH1cbiAgICBpZiAoaW50ZXJwb2xhdGVWYWx1ZSkge1xuICAgICAgc291cmNlICs9IFwiJyArXFxuKChfX3QgPSAoXCIgKyBpbnRlcnBvbGF0ZVZhbHVlICsgXCIpKSA9PSBudWxsID8gJycgOiBfX3QpICtcXG4nXCI7XG4gICAgfVxuICAgIGluZGV4ID0gb2Zmc2V0ICsgbWF0Y2gubGVuZ3RoO1xuICAgIHJldHVybiBtYXRjaDtcbiAgfSk7XG5cbiAgc291cmNlICs9IFwiJztcXG5cIjtcblxuICBzb3VyY2UgPSAnd2l0aCAob2JqKSB7XFxuJyArIHNvdXJjZSArICdcXG59XFxuJztcblxuICAvLyBSZW1vdmUgdW5uZWNlc3NhcnkgY29uY2F0ZW5hdGlvbnNcbiAgc291cmNlID0gKGlzRXZhbHVhdGluZyA/IHNvdXJjZS5yZXBsYWNlKHJlRW1wdHlTdHJpbmdMZWFkaW5nLCAnJykgOiBzb3VyY2UpXG4gICAgLnJlcGxhY2UocmVFbXB0eVN0cmluZ01pZGRsZSwgJyQxJylcbiAgICAucmVwbGFjZShyZUVtcHR5U3RyaW5nVHJhaWxpbmcsICckMTsnKTtcblxuICAvLyBGcmFtZSBhcyBmdW5jdGlvbiBib2R5XG4gIHNvdXJjZSA9ICdmdW5jdGlvbihvYmopIHtcXG4nICtcbiAgICAnb2JqIHx8IChvYmogPSB7fSk7XFxuJyArXG4gICAgXCJ2YXIgX190LCBfX3AgPSAnJ1wiICtcbiAgICAoaXNFc2NhcGluZyA/ICcsIF9fZSA9IF8uZXNjYXBlJyA6ICcnKSArXG4gICAgKGlzRXZhbHVhdGluZ1xuICAgICAgPyAnLCBfX2ogPSBBcnJheS5wcm90b3R5cGUuam9pbjtcXG5mdW5jdGlvbiBwcmludCgpIHsgX19wICs9IF9fai5jYWxsKGFyZ3VtZW50cywgXFwnXFwnKSB9XFxuJ1xuICAgICAgOiAnO1xcbidcbiAgICApICtcbiAgICBzb3VyY2UgK1xuICAgICdyZXR1cm4gX19wXFxufSc7XG5cbiAgLy8gQWN0dWFsIGNvbXBpbGUgc3RlcFxuICBjb25zdCByZXN1bHQgPSBhdHRlbXB0KGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBGdW5jdGlvbihpbXBvcnRLZXlzLCBzb3VyY2VVUkwgKyAncmV0dXJuICcgKyBzb3VyY2UpLmFwcGx5KHVuZGVmaW5lZCwgaW1wb3J0VmFsdWVzKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1uZXctZnVuY1xuICB9KTtcblxuICBpZiAoaXNFcnJvcihyZXN1bHQpKSB7XG4gICAgcmVzdWx0LnNvdXJjZSA9IHNvdXJjZTsgLy8gZXhwb3NlIGZvciBkZWJ1Z2dpbmcgaWYgZXJyb3JcbiAgICB0aHJvdyByZXN1bHQ7XG4gIH1cbiAgLy8gRXhwb3NlIGNvbXBpbGVkIHNvdXJjZVxuICByZXN1bHQuc291cmNlID0gc291cmNlO1xuICByZXR1cm4gcmVzdWx0O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB0ZW1wbGF0ZSh0ZXh0KSB7XG4gIHJldHVybiBfdGVtcGxhdGUodGV4dCk7XG59XG4iXX0=
