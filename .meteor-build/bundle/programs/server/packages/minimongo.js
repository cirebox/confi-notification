Package["core-runtime"].queue("minimongo",function () {/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EmitterPromise = Package.meteor.EmitterPromise;
var DiffSequence = Package['diff-sequence'].DiffSequence;
var ECMAScript = Package.ecmascript.ECMAScript;
var EJSON = Package.ejson.EJSON;
var GeoJSON = Package['geojson-utils'].GeoJSON;
var IdMap = Package['id-map'].IdMap;
var MongoID = Package['mongo-id'].MongoID;
var OrderedDict = Package['ordered-dict'].OrderedDict;
var Random = Package.random.Random;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var Decimal = Package['mongo-decimal'].Decimal;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var MinimongoTest, MinimongoError, LocalCollection, Minimongo;

var require = meteorInstall({"node_modules":{"meteor":{"minimongo":{"minimongo_server.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/minimongo_server.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reify_async_result__) {
  "use strict";
  try {
    module.link("./minimongo_common.js");
    let hasOwn, isNumericKey, isOperatorObject, pathsToTree, projectionDetails;
    module.link("./common.js", {
      hasOwn(v) {
        hasOwn = v;
      },
      isNumericKey(v) {
        isNumericKey = v;
      },
      isOperatorObject(v) {
        isOperatorObject = v;
      },
      pathsToTree(v) {
        pathsToTree = v;
      },
      projectionDetails(v) {
        projectionDetails = v;
      }
    }, 0);
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    Minimongo._pathsElidingNumericKeys = paths => paths.map(path => path.split('.').filter(part => !isNumericKey(part)).join('.'));

    // Returns true if the modifier applied to some document may change the result
    // of matching the document by selector
    // The modifier is always in a form of Object:
    //  - $set
    //    - 'a.b.22.z': value
    //    - 'foo.bar': 42
    //  - $unset
    //    - 'abc.d': 1
    Minimongo.Matcher.prototype.affectedByModifier = function (modifier) {
      // safe check for $set/$unset being objects
      modifier = Object.assign({
        $set: {},
        $unset: {}
      }, modifier);
      const meaningfulPaths = this._getPaths();
      const modifiedPaths = [].concat(Object.keys(modifier.$set), Object.keys(modifier.$unset));
      return modifiedPaths.some(path => {
        const mod = path.split('.');
        return meaningfulPaths.some(meaningfulPath => {
          const sel = meaningfulPath.split('.');
          let i = 0,
            j = 0;
          while (i < sel.length && j < mod.length) {
            if (isNumericKey(sel[i]) && isNumericKey(mod[j])) {
              // foo.4.bar selector affected by foo.4 modifier
              // foo.3.bar selector unaffected by foo.4 modifier
              if (sel[i] === mod[j]) {
                i++;
                j++;
              } else {
                return false;
              }
            } else if (isNumericKey(sel[i])) {
              // foo.4.bar selector unaffected by foo.bar modifier
              return false;
            } else if (isNumericKey(mod[j])) {
              j++;
            } else if (sel[i] === mod[j]) {
              i++;
              j++;
            } else {
              return false;
            }
          }

          // One is a prefix of another, taking numeric fields into account
          return true;
        });
      });
    };

    // @param modifier - Object: MongoDB-styled modifier with `$set`s and `$unsets`
    //                           only. (assumed to come from oplog)
    // @returns - Boolean: if after applying the modifier, selector can start
    //                     accepting the modified value.
    // NOTE: assumes that document affected by modifier didn't match this Matcher
    // before, so if modifier can't convince selector in a positive change it would
    // stay 'false'.
    // Currently doesn't support $-operators and numeric indices precisely.
    Minimongo.Matcher.prototype.canBecomeTrueByModifier = function (modifier) {
      if (!this.affectedByModifier(modifier)) {
        return false;
      }
      if (!this.isSimple()) {
        return true;
      }
      modifier = Object.assign({
        $set: {},
        $unset: {}
      }, modifier);
      const modifierPaths = [].concat(Object.keys(modifier.$set), Object.keys(modifier.$unset));
      if (this._getPaths().some(pathHasNumericKeys) || modifierPaths.some(pathHasNumericKeys)) {
        return true;
      }

      // check if there is a $set or $unset that indicates something is an
      // object rather than a scalar in the actual object where we saw $-operator
      // NOTE: it is correct since we allow only scalars in $-operators
      // Example: for selector {'a.b': {$gt: 5}} the modifier {'a.b.c':7} would
      // definitely set the result to false as 'a.b' appears to be an object.
      const expectedScalarIsObject = Object.keys(this._selector).some(path => {
        if (!isOperatorObject(this._selector[path])) {
          return false;
        }
        return modifierPaths.some(modifierPath => modifierPath.startsWith("".concat(path, ".")));
      });
      if (expectedScalarIsObject) {
        return false;
      }

      // See if we can apply the modifier on the ideally matching object. If it
      // still matches the selector, then the modifier could have turned the real
      // object in the database into something matching.
      const matchingDocument = EJSON.clone(this.matchingDocument());

      // The selector is too complex, anything can happen.
      if (matchingDocument === null) {
        return true;
      }
      try {
        LocalCollection._modify(matchingDocument, modifier);
      } catch (error) {
        // Couldn't set a property on a field which is a scalar or null in the
        // selector.
        // Example:
        // real document: { 'a.b': 3 }
        // selector: { 'a': 12 }
        // converted selector (ideal document): { 'a': 12 }
        // modifier: { $set: { 'a.b': 4 } }
        // We don't know what real document was like but from the error raised by
        // $set on a scalar field we can reason that the structure of real document
        // is completely different.
        if (error.name === 'MinimongoError' && error.setPropertyError) {
          return false;
        }
        throw error;
      }
      return this.documentMatches(matchingDocument).result;
    };

    // Knows how to combine a mongo selector and a fields projection to a new fields
    // projection taking into account active fields from the passed selector.
    // @returns Object - projection object (same as fields option of mongo cursor)
    Minimongo.Matcher.prototype.combineIntoProjection = function (projection) {
      const selectorPaths = Minimongo._pathsElidingNumericKeys(this._getPaths());

      // Special case for $where operator in the selector - projection should depend
      // on all fields of the document. getSelectorPaths returns a list of paths
      // selector depends on. If one of the paths is '' (empty string) representing
      // the root or the whole document, complete projection should be returned.
      if (selectorPaths.includes('')) {
        return {};
      }
      return combineImportantPathsIntoProjection(selectorPaths, projection);
    };

    // Returns an object that would match the selector if possible or null if the
    // selector is too complex for us to analyze
    // { 'a.b': { ans: 42 }, 'foo.bar': null, 'foo.baz': "something" }
    // => { a: { b: { ans: 42 } }, foo: { bar: null, baz: "something" } }
    Minimongo.Matcher.prototype.matchingDocument = function () {
      // check if it was computed before
      if (this._matchingDocument !== undefined) {
        return this._matchingDocument;
      }

      // If the analysis of this selector is too hard for our implementation
      // fallback to "YES"
      let fallback = false;
      this._matchingDocument = pathsToTree(this._getPaths(), path => {
        const valueSelector = this._selector[path];
        if (isOperatorObject(valueSelector)) {
          // if there is a strict equality, there is a good
          // chance we can use one of those as "matching"
          // dummy value
          if (valueSelector.$eq) {
            return valueSelector.$eq;
          }
          if (valueSelector.$in) {
            const matcher = new Minimongo.Matcher({
              placeholder: valueSelector
            });

            // Return anything from $in that matches the whole selector for this
            // path. If nothing matches, returns `undefined` as nothing can make
            // this selector into `true`.
            return valueSelector.$in.find(placeholder => matcher.documentMatches({
              placeholder
            }).result);
          }
          if (onlyContainsKeys(valueSelector, ['$gt', '$gte', '$lt', '$lte'])) {
            let lowerBound = -Infinity;
            let upperBound = Infinity;
            ['$lte', '$lt'].forEach(op => {
              if (hasOwn.call(valueSelector, op) && valueSelector[op] < upperBound) {
                upperBound = valueSelector[op];
              }
            });
            ['$gte', '$gt'].forEach(op => {
              if (hasOwn.call(valueSelector, op) && valueSelector[op] > lowerBound) {
                lowerBound = valueSelector[op];
              }
            });
            const middle = (lowerBound + upperBound) / 2;
            const matcher = new Minimongo.Matcher({
              placeholder: valueSelector
            });
            if (!matcher.documentMatches({
              placeholder: middle
            }).result && (middle === lowerBound || middle === upperBound)) {
              fallback = true;
            }
            return middle;
          }
          if (onlyContainsKeys(valueSelector, ['$nin', '$ne'])) {
            // Since this._isSimple makes sure $nin and $ne are not combined with
            // objects or arrays, we can confidently return an empty object as it
            // never matches any scalar.
            return {};
          }
          fallback = true;
        }
        return this._selector[path];
      }, x => x);
      if (fallback) {
        this._matchingDocument = null;
      }
      return this._matchingDocument;
    };

    // Minimongo.Sorter gets a similar method, which delegates to a Matcher it made
    // for this exact purpose.
    Minimongo.Sorter.prototype.affectedByModifier = function (modifier) {
      return this._selectorForAffectedByModifier.affectedByModifier(modifier);
    };
    Minimongo.Sorter.prototype.combineIntoProjection = function (projection) {
      return combineImportantPathsIntoProjection(Minimongo._pathsElidingNumericKeys(this._getPaths()), projection);
    };
    function combineImportantPathsIntoProjection(paths, projection) {
      const details = projectionDetails(projection);

      // merge the paths to include
      const tree = pathsToTree(paths, path => true, (node, path, fullPath) => true, details.tree);
      const mergedProjection = treeToPaths(tree);
      if (details.including) {
        // both selector and projection are pointing on fields to include
        // so we can just return the merged tree
        return mergedProjection;
      }

      // selector is pointing at fields to include
      // projection is pointing at fields to exclude
      // make sure we don't exclude important paths
      const mergedExclProjection = {};
      Object.keys(mergedProjection).forEach(path => {
        if (!mergedProjection[path]) {
          mergedExclProjection[path] = false;
        }
      });
      return mergedExclProjection;
    }
    function getPaths(selector) {
      return Object.keys(new Minimongo.Matcher(selector)._paths);

      // XXX remove it?
      // return Object.keys(selector).map(k => {
      //   // we don't know how to handle $where because it can be anything
      //   if (k === '$where') {
      //     return ''; // matches everything
      //   }

      //   // we branch from $or/$and/$nor operator
      //   if (['$or', '$and', '$nor'].includes(k)) {
      //     return selector[k].map(getPaths);
      //   }

      //   // the value is a literal or some comparison operator
      //   return k;
      // })
      //   .reduce((a, b) => a.concat(b), [])
      //   .filter((a, b, c) => c.indexOf(a) === b);
    }

    // A helper to ensure object has only certain keys
    function onlyContainsKeys(obj, keys) {
      return Object.keys(obj).every(k => keys.includes(k));
    }
    function pathHasNumericKeys(path) {
      return path.split('.').some(isNumericKey);
    }

    // Returns a set of key paths similar to
    // { 'foo.bar': 1, 'a.b.c': 1 }
    function treeToPaths(tree) {
      let prefix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
      const result = {};
      Object.keys(tree).forEach(key => {
        const value = tree[key];
        if (value === Object(value)) {
          Object.assign(result, treeToPaths(value, "".concat(prefix + key, ".")));
        } else {
          result[prefix + key] = value;
        }
      });
      return result;
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

},"common.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/common.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reify_async_result__) {
  "use strict";
  try {
    module.export({
      hasOwn: () => hasOwn,
      MiniMongoQueryError: () => MiniMongoQueryError,
      ELEMENT_OPERATORS: () => ELEMENT_OPERATORS,
      compileDocumentSelector: () => compileDocumentSelector,
      equalityElementMatcher: () => equalityElementMatcher,
      expandArraysInBranches: () => expandArraysInBranches,
      isIndexable: () => isIndexable,
      isNumericKey: () => isNumericKey,
      isOperatorObject: () => isOperatorObject,
      makeLookupFunction: () => makeLookupFunction,
      nothingMatcher: () => nothingMatcher,
      pathsToTree: () => pathsToTree,
      populateDocumentWithQueryFields: () => populateDocumentWithQueryFields,
      projectionDetails: () => projectionDetails,
      regexpElementMatcher: () => regexpElementMatcher
    });
    let LocalCollection;
    module.link("./local_collection.js", {
      default(v) {
        LocalCollection = v;
      }
    }, 0);
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    const hasOwn = Object.prototype.hasOwnProperty;
    class MiniMongoQueryError extends Error {}
    const ELEMENT_OPERATORS = {
      $lt: makeInequality(cmpValue => cmpValue < 0),
      $gt: makeInequality(cmpValue => cmpValue > 0),
      $lte: makeInequality(cmpValue => cmpValue <= 0),
      $gte: makeInequality(cmpValue => cmpValue >= 0),
      $mod: {
        compileElementSelector(operand) {
          if (!(Array.isArray(operand) && operand.length === 2 && typeof operand[0] === 'number' && typeof operand[1] === 'number')) {
            throw new MiniMongoQueryError('argument to $mod must be an array of two numbers');
          }

          // XXX could require to be ints or round or something
          const divisor = operand[0];
          const remainder = operand[1];
          return value => typeof value === 'number' && value % divisor === remainder;
        }
      },
      $in: {
        compileElementSelector(operand) {
          if (!Array.isArray(operand)) {
            throw new MiniMongoQueryError('$in needs an array');
          }
          const elementMatchers = operand.map(option => {
            if (option instanceof RegExp) {
              return regexpElementMatcher(option);
            }
            if (isOperatorObject(option)) {
              throw new MiniMongoQueryError('cannot nest $ under $in');
            }
            return equalityElementMatcher(option);
          });
          return value => {
            // Allow {a: {$in: [null]}} to match when 'a' does not exist.
            if (value === undefined) {
              value = null;
            }
            return elementMatchers.some(matcher => matcher(value));
          };
        }
      },
      $size: {
        // {a: [[5, 5]]} must match {a: {$size: 1}} but not {a: {$size: 2}}, so we
        // don't want to consider the element [5,5] in the leaf array [[5,5]] as a
        // possible value.
        dontExpandLeafArrays: true,
        compileElementSelector(operand) {
          if (typeof operand === 'string') {
            // Don't ask me why, but by experimentation, this seems to be what Mongo
            // does.
            operand = 0;
          } else if (typeof operand !== 'number') {
            throw new MiniMongoQueryError('$size needs a number');
          }
          return value => Array.isArray(value) && value.length === operand;
        }
      },
      $type: {
        // {a: [5]} must not match {a: {$type: 4}} (4 means array), but it should
        // match {a: {$type: 1}} (1 means number), and {a: [[5]]} must match {$a:
        // {$type: 4}}. Thus, when we see a leaf array, we *should* expand it but
        // should *not* include it itself.
        dontIncludeLeafArrays: true,
        compileElementSelector(operand) {
          if (typeof operand === 'string') {
            const operandAliasMap = {
              'double': 1,
              'string': 2,
              'object': 3,
              'array': 4,
              'binData': 5,
              'undefined': 6,
              'objectId': 7,
              'bool': 8,
              'date': 9,
              'null': 10,
              'regex': 11,
              'dbPointer': 12,
              'javascript': 13,
              'symbol': 14,
              'javascriptWithScope': 15,
              'int': 16,
              'timestamp': 17,
              'long': 18,
              'decimal': 19,
              'minKey': -1,
              'maxKey': 127
            };
            if (!hasOwn.call(operandAliasMap, operand)) {
              throw new MiniMongoQueryError("unknown string alias for $type: ".concat(operand));
            }
            operand = operandAliasMap[operand];
          } else if (typeof operand === 'number') {
            if (operand === 0 || operand < -1 || operand > 19 && operand !== 127) {
              throw new MiniMongoQueryError("Invalid numerical $type code: ".concat(operand));
            }
          } else {
            throw new MiniMongoQueryError('argument to $type is not a number or a string');
          }
          return value => value !== undefined && LocalCollection._f._type(value) === operand;
        }
      },
      $bitsAllSet: {
        compileElementSelector(operand) {
          const mask = getOperandBitmask(operand, '$bitsAllSet');
          return value => {
            const bitmask = getValueBitmask(value, mask.length);
            return bitmask && mask.every((byte, i) => (bitmask[i] & byte) === byte);
          };
        }
      },
      $bitsAnySet: {
        compileElementSelector(operand) {
          const mask = getOperandBitmask(operand, '$bitsAnySet');
          return value => {
            const bitmask = getValueBitmask(value, mask.length);
            return bitmask && mask.some((byte, i) => (~bitmask[i] & byte) !== byte);
          };
        }
      },
      $bitsAllClear: {
        compileElementSelector(operand) {
          const mask = getOperandBitmask(operand, '$bitsAllClear');
          return value => {
            const bitmask = getValueBitmask(value, mask.length);
            return bitmask && mask.every((byte, i) => !(bitmask[i] & byte));
          };
        }
      },
      $bitsAnyClear: {
        compileElementSelector(operand) {
          const mask = getOperandBitmask(operand, '$bitsAnyClear');
          return value => {
            const bitmask = getValueBitmask(value, mask.length);
            return bitmask && mask.some((byte, i) => (bitmask[i] & byte) !== byte);
          };
        }
      },
      $regex: {
        compileElementSelector(operand, valueSelector) {
          if (!(typeof operand === 'string' || operand instanceof RegExp)) {
            throw new MiniMongoQueryError('$regex has to be a string or RegExp');
          }
          let regexp;
          if (valueSelector.$options !== undefined) {
            // Options passed in $options (even the empty string) always overrides
            // options in the RegExp object itself.

            // Be clear that we only support the JS-supported options, not extended
            // ones (eg, Mongo supports x and s). Ideally we would implement x and s
            // by transforming the regexp, but not today...
            if (/[^gim]/.test(valueSelector.$options)) {
              throw new MiniMongoQueryError('Only the i, m, and g regexp options are supported');
            }
            const source = operand instanceof RegExp ? operand.source : operand;
            regexp = new RegExp(source, valueSelector.$options);
          } else if (operand instanceof RegExp) {
            regexp = operand;
          } else {
            regexp = new RegExp(operand);
          }
          return regexpElementMatcher(regexp);
        }
      },
      $elemMatch: {
        dontExpandLeafArrays: true,
        compileElementSelector(operand, valueSelector, matcher) {
          if (!LocalCollection._isPlainObject(operand)) {
            throw new MiniMongoQueryError('$elemMatch need an object');
          }
          const isDocMatcher = !isOperatorObject(Object.keys(operand).filter(key => !hasOwn.call(LOGICAL_OPERATORS, key)).reduce((a, b) => Object.assign(a, {
            [b]: operand[b]
          }), {}), true);
          let subMatcher;
          if (isDocMatcher) {
            // This is NOT the same as compileValueSelector(operand), and not just
            // because of the slightly different calling convention.
            // {$elemMatch: {x: 3}} means "an element has a field x:3", not
            // "consists only of a field x:3". Also, regexps and sub-$ are allowed.
            subMatcher = compileDocumentSelector(operand, matcher, {
              inElemMatch: true
            });
          } else {
            subMatcher = compileValueSelector(operand, matcher);
          }
          return value => {
            if (!Array.isArray(value)) {
              return false;
            }
            for (let i = 0; i < value.length; ++i) {
              const arrayElement = value[i];
              let arg;
              if (isDocMatcher) {
                // We can only match {$elemMatch: {b: 3}} against objects.
                // (We can also match against arrays, if there's numeric indices,
                // eg {$elemMatch: {'0.b': 3}} or {$elemMatch: {0: 3}}.)
                if (!isIndexable(arrayElement)) {
                  return false;
                }
                arg = arrayElement;
              } else {
                // dontIterate ensures that {a: {$elemMatch: {$gt: 5}}} matches
                // {a: [8]} but not {a: [[8]]}
                arg = [{
                  value: arrayElement,
                  dontIterate: true
                }];
              }
              // XXX support $near in $elemMatch by propagating $distance?
              if (subMatcher(arg).result) {
                return i; // specially understood to mean "use as arrayIndices"
              }
            }
            return false;
          };
        }
      }
    };
    // Operators that appear at the top level of a document selector.
    const LOGICAL_OPERATORS = {
      $and(subSelector, matcher, inElemMatch) {
        return andDocumentMatchers(compileArrayOfDocumentSelectors(subSelector, matcher, inElemMatch));
      },
      $or(subSelector, matcher, inElemMatch) {
        const matchers = compileArrayOfDocumentSelectors(subSelector, matcher, inElemMatch);

        // Special case: if there is only one matcher, use it directly, *preserving*
        // any arrayIndices it returns.
        if (matchers.length === 1) {
          return matchers[0];
        }
        return doc => {
          const result = matchers.some(fn => fn(doc).result);
          // $or does NOT set arrayIndices when it has multiple
          // sub-expressions. (Tested against MongoDB.)
          return {
            result
          };
        };
      },
      $nor(subSelector, matcher, inElemMatch) {
        const matchers = compileArrayOfDocumentSelectors(subSelector, matcher, inElemMatch);
        return doc => {
          const result = matchers.every(fn => !fn(doc).result);
          // Never set arrayIndices, because we only match if nothing in particular
          // 'matched' (and because this is consistent with MongoDB).
          return {
            result
          };
        };
      },
      $where(selectorValue, matcher) {
        // Record that *any* path may be used.
        matcher._recordPathUsed('');
        matcher._hasWhere = true;
        if (!(selectorValue instanceof Function)) {
          // XXX MongoDB seems to have more complex logic to decide where or or not
          // to add 'return'; not sure exactly what it is.
          selectorValue = Function('obj', "return ".concat(selectorValue));
        }

        // We make the document available as both `this` and `obj`.
        // // XXX not sure what we should do if this throws
        return doc => ({
          result: selectorValue.call(doc, doc)
        });
      },
      // This is just used as a comment in the query (in MongoDB, it also ends up in
      // query logs); it has no effect on the actual selection.
      $comment() {
        return () => ({
          result: true
        });
      }
    };

    // Operators that (unlike LOGICAL_OPERATORS) pertain to individual paths in a
    // document, but (unlike ELEMENT_OPERATORS) do not have a simple definition as
    // "match each branched value independently and combine with
    // convertElementMatcherToBranchedMatcher".
    const VALUE_OPERATORS = {
      $eq(operand) {
        return convertElementMatcherToBranchedMatcher(equalityElementMatcher(operand));
      },
      $not(operand, valueSelector, matcher) {
        return invertBranchedMatcher(compileValueSelector(operand, matcher));
      },
      $ne(operand) {
        return invertBranchedMatcher(convertElementMatcherToBranchedMatcher(equalityElementMatcher(operand)));
      },
      $nin(operand) {
        return invertBranchedMatcher(convertElementMatcherToBranchedMatcher(ELEMENT_OPERATORS.$in.compileElementSelector(operand)));
      },
      $exists(operand) {
        const exists = convertElementMatcherToBranchedMatcher(value => value !== undefined);
        return operand ? exists : invertBranchedMatcher(exists);
      },
      // $options just provides options for $regex; its logic is inside $regex
      $options(operand, valueSelector) {
        if (!hasOwn.call(valueSelector, '$regex')) {
          throw new MiniMongoQueryError('$options needs a $regex');
        }
        return everythingMatcher;
      },
      // $maxDistance is basically an argument to $near
      $maxDistance(operand, valueSelector) {
        if (!valueSelector.$near) {
          throw new MiniMongoQueryError('$maxDistance needs a $near');
        }
        return everythingMatcher;
      },
      $all(operand, valueSelector, matcher) {
        if (!Array.isArray(operand)) {
          throw new MiniMongoQueryError('$all requires array');
        }

        // Not sure why, but this seems to be what MongoDB does.
        if (operand.length === 0) {
          return nothingMatcher;
        }
        const branchedMatchers = operand.map(criterion => {
          // XXX handle $all/$elemMatch combination
          if (isOperatorObject(criterion)) {
            throw new MiniMongoQueryError('no $ expressions in $all');
          }

          // This is always a regexp or equality selector.
          return compileValueSelector(criterion, matcher);
        });

        // andBranchedMatchers does NOT require all selectors to return true on the
        // SAME branch.
        return andBranchedMatchers(branchedMatchers);
      },
      $near(operand, valueSelector, matcher, isRoot) {
        if (!isRoot) {
          throw new MiniMongoQueryError('$near can\'t be inside another $ operator');
        }
        matcher._hasGeoQuery = true;

        // There are two kinds of geodata in MongoDB: legacy coordinate pairs and
        // GeoJSON. They use different distance metrics, too. GeoJSON queries are
        // marked with a $geometry property, though legacy coordinates can be
        // matched using $geometry.
        let maxDistance, point, distance;
        if (LocalCollection._isPlainObject(operand) && hasOwn.call(operand, '$geometry')) {
          // GeoJSON "2dsphere" mode.
          maxDistance = operand.$maxDistance;
          point = operand.$geometry;
          distance = value => {
            // XXX: for now, we don't calculate the actual distance between, say,
            // polygon and circle. If people care about this use-case it will get
            // a priority.
            if (!value) {
              return null;
            }
            if (!value.type) {
              return GeoJSON.pointDistance(point, {
                type: 'Point',
                coordinates: pointToArray(value)
              });
            }
            if (value.type === 'Point') {
              return GeoJSON.pointDistance(point, value);
            }
            return GeoJSON.geometryWithinRadius(value, point, maxDistance) ? 0 : maxDistance + 1;
          };
        } else {
          maxDistance = valueSelector.$maxDistance;
          if (!isIndexable(operand)) {
            throw new MiniMongoQueryError('$near argument must be coordinate pair or GeoJSON');
          }
          point = pointToArray(operand);
          distance = value => {
            if (!isIndexable(value)) {
              return null;
            }
            return distanceCoordinatePairs(point, value);
          };
        }
        return branchedValues => {
          // There might be multiple points in the document that match the given
          // field. Only one of them needs to be within $maxDistance, but we need to
          // evaluate all of them and use the nearest one for the implicit sort
          // specifier. (That's why we can't just use ELEMENT_OPERATORS here.)
          //
          // Note: This differs from MongoDB's implementation, where a document will
          // actually show up *multiple times* in the result set, with one entry for
          // each within-$maxDistance branching point.
          const result = {
            result: false
          };
          expandArraysInBranches(branchedValues).every(branch => {
            // if operation is an update, don't skip branches, just return the first
            // one (#3599)
            let curDistance;
            if (!matcher._isUpdate) {
              if (!(typeof branch.value === 'object')) {
                return true;
              }
              curDistance = distance(branch.value);

              // Skip branches that aren't real points or are too far away.
              if (curDistance === null || curDistance > maxDistance) {
                return true;
              }

              // Skip anything that's a tie.
              if (result.distance !== undefined && result.distance <= curDistance) {
                return true;
              }
            }
            result.result = true;
            result.distance = curDistance;
            if (branch.arrayIndices) {
              result.arrayIndices = branch.arrayIndices;
            } else {
              delete result.arrayIndices;
            }
            return !matcher._isUpdate;
          });
          return result;
        };
      }
    };

    // NB: We are cheating and using this function to implement 'AND' for both
    // 'document matchers' and 'branched matchers'. They both return result objects
    // but the argument is different: for the former it's a whole doc, whereas for
    // the latter it's an array of 'branched values'.
    function andSomeMatchers(subMatchers) {
      if (subMatchers.length === 0) {
        return everythingMatcher;
      }
      if (subMatchers.length === 1) {
        return subMatchers[0];
      }
      return docOrBranches => {
        const match = {};
        match.result = subMatchers.every(fn => {
          const subResult = fn(docOrBranches);

          // Copy a 'distance' number out of the first sub-matcher that has
          // one. Yes, this means that if there are multiple $near fields in a
          // query, something arbitrary happens; this appears to be consistent with
          // Mongo.
          if (subResult.result && subResult.distance !== undefined && match.distance === undefined) {
            match.distance = subResult.distance;
          }

          // Similarly, propagate arrayIndices from sub-matchers... but to match
          // MongoDB behavior, this time the *last* sub-matcher with arrayIndices
          // wins.
          if (subResult.result && subResult.arrayIndices) {
            match.arrayIndices = subResult.arrayIndices;
          }
          return subResult.result;
        });

        // If we didn't actually match, forget any extra metadata we came up with.
        if (!match.result) {
          delete match.distance;
          delete match.arrayIndices;
        }
        return match;
      };
    }
    const andDocumentMatchers = andSomeMatchers;
    const andBranchedMatchers = andSomeMatchers;
    function compileArrayOfDocumentSelectors(selectors, matcher, inElemMatch) {
      if (!Array.isArray(selectors) || selectors.length === 0) {
        throw new MiniMongoQueryError('$and/$or/$nor must be nonempty array');
      }
      return selectors.map(subSelector => {
        if (!LocalCollection._isPlainObject(subSelector)) {
          throw new MiniMongoQueryError('$or/$and/$nor entries need to be full objects');
        }
        return compileDocumentSelector(subSelector, matcher, {
          inElemMatch
        });
      });
    }

    // Takes in a selector that could match a full document (eg, the original
    // selector). Returns a function mapping document->result object.
    //
    // matcher is the Matcher object we are compiling.
    //
    // If this is the root document selector (ie, not wrapped in $and or the like),
    // then isRoot is true. (This is used by $near.)
    function compileDocumentSelector(docSelector, matcher) {
      let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      const docMatchers = Object.keys(docSelector).map(key => {
        const subSelector = docSelector[key];
        if (key.substr(0, 1) === '$') {
          // Outer operators are either logical operators (they recurse back into
          // this function), or $where.
          if (!hasOwn.call(LOGICAL_OPERATORS, key)) {
            throw new MiniMongoQueryError("Unrecognized logical operator: ".concat(key));
          }
          matcher._isSimple = false;
          return LOGICAL_OPERATORS[key](subSelector, matcher, options.inElemMatch);
        }

        // Record this path, but only if we aren't in an elemMatcher, since in an
        // elemMatch this is a path inside an object in an array, not in the doc
        // root.
        if (!options.inElemMatch) {
          matcher._recordPathUsed(key);
        }

        // Don't add a matcher if subSelector is a function -- this is to match
        // the behavior of Meteor on the server (inherited from the node mongodb
        // driver), which is to ignore any part of a selector which is a function.
        if (typeof subSelector === 'function') {
          return undefined;
        }
        const lookUpByIndex = makeLookupFunction(key);
        const valueMatcher = compileValueSelector(subSelector, matcher, options.isRoot);
        return doc => valueMatcher(lookUpByIndex(doc));
      }).filter(Boolean);
      return andDocumentMatchers(docMatchers);
    }
    // Takes in a selector that could match a key-indexed value in a document; eg,
    // {$gt: 5, $lt: 9}, or a regular expression, or any non-expression object (to
    // indicate equality).  Returns a branched matcher: a function mapping
    // [branched value]->result object.
    function compileValueSelector(valueSelector, matcher, isRoot) {
      if (valueSelector instanceof RegExp) {
        matcher._isSimple = false;
        return convertElementMatcherToBranchedMatcher(regexpElementMatcher(valueSelector));
      }
      if (isOperatorObject(valueSelector)) {
        return operatorBranchedMatcher(valueSelector, matcher, isRoot);
      }
      return convertElementMatcherToBranchedMatcher(equalityElementMatcher(valueSelector));
    }

    // Given an element matcher (which evaluates a single value), returns a branched
    // value (which evaluates the element matcher on all the branches and returns a
    // more structured return value possibly including arrayIndices).
    function convertElementMatcherToBranchedMatcher(elementMatcher) {
      let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      return branches => {
        const expanded = options.dontExpandLeafArrays ? branches : expandArraysInBranches(branches, options.dontIncludeLeafArrays);
        const match = {};
        match.result = expanded.some(element => {
          let matched = elementMatcher(element.value);

          // Special case for $elemMatch: it means "true, and use this as an array
          // index if I didn't already have one".
          if (typeof matched === 'number') {
            // XXX This code dates from when we only stored a single array index
            // (for the outermost array). Should we be also including deeper array
            // indices from the $elemMatch match?
            if (!element.arrayIndices) {
              element.arrayIndices = [matched];
            }
            matched = true;
          }

          // If some element matched, and it's tagged with array indices, include
          // those indices in our result object.
          if (matched && element.arrayIndices) {
            match.arrayIndices = element.arrayIndices;
          }
          return matched;
        });
        return match;
      };
    }

    // Helpers for $near.
    function distanceCoordinatePairs(a, b) {
      const pointA = pointToArray(a);
      const pointB = pointToArray(b);
      return Math.hypot(pointA[0] - pointB[0], pointA[1] - pointB[1]);
    }

    // Takes something that is not an operator object and returns an element matcher
    // for equality with that thing.
    function equalityElementMatcher(elementSelector) {
      if (isOperatorObject(elementSelector)) {
        throw new MiniMongoQueryError('Can\'t create equalityValueSelector for operator object');
      }

      // Special-case: null and undefined are equal (if you got undefined in there
      // somewhere, or if you got it due to some branch being non-existent in the
      // weird special case), even though they aren't with EJSON.equals.
      // undefined or null
      if (elementSelector == null) {
        return value => value == null;
      }
      return value => LocalCollection._f._equal(elementSelector, value);
    }
    function everythingMatcher(docOrBranchedValues) {
      return {
        result: true
      };
    }
    function expandArraysInBranches(branches, skipTheArrays) {
      const branchesOut = [];
      branches.forEach(branch => {
        const thisIsArray = Array.isArray(branch.value);

        // We include the branch itself, *UNLESS* we it's an array that we're going
        // to iterate and we're told to skip arrays.  (That's right, we include some
        // arrays even skipTheArrays is true: these are arrays that were found via
        // explicit numerical indices.)
        if (!(skipTheArrays && thisIsArray && !branch.dontIterate)) {
          branchesOut.push({
            arrayIndices: branch.arrayIndices,
            value: branch.value
          });
        }
        if (thisIsArray && !branch.dontIterate) {
          branch.value.forEach((value, i) => {
            branchesOut.push({
              arrayIndices: (branch.arrayIndices || []).concat(i),
              value
            });
          });
        }
      });
      return branchesOut;
    }
    // Helpers for $bitsAllSet/$bitsAnySet/$bitsAllClear/$bitsAnyClear.
    function getOperandBitmask(operand, selector) {
      // numeric bitmask
      // You can provide a numeric bitmask to be matched against the operand field.
      // It must be representable as a non-negative 32-bit signed integer.
      // Otherwise, $bitsAllSet will return an error.
      if (Number.isInteger(operand) && operand >= 0) {
        return new Uint8Array(new Int32Array([operand]).buffer);
      }

      // bindata bitmask
      // You can also use an arbitrarily large BinData instance as a bitmask.
      if (EJSON.isBinary(operand)) {
        return new Uint8Array(operand.buffer);
      }

      // position list
      // If querying a list of bit positions, each <position> must be a non-negative
      // integer. Bit positions start at 0 from the least significant bit.
      if (Array.isArray(operand) && operand.every(x => Number.isInteger(x) && x >= 0)) {
        const buffer = new ArrayBuffer((Math.max(...operand) >> 3) + 1);
        const view = new Uint8Array(buffer);
        operand.forEach(x => {
          view[x >> 3] |= 1 << (x & 0x7);
        });
        return view;
      }

      // bad operand
      throw new MiniMongoQueryError("operand to ".concat(selector, " must be a numeric bitmask (representable as a ") + 'non-negative 32-bit signed integer), a bindata bitmask or an array with ' + 'bit positions (non-negative integers)');
    }
    function getValueBitmask(value, length) {
      // The field value must be either numerical or a BinData instance. Otherwise,
      // $bits... will not match the current document.

      // numerical
      if (Number.isSafeInteger(value)) {
        // $bits... will not match numerical values that cannot be represented as a
        // signed 64-bit integer. This can be the case if a value is either too
        // large or small to fit in a signed 64-bit integer, or if it has a
        // fractional component.
        const buffer = new ArrayBuffer(Math.max(length, 2 * Uint32Array.BYTES_PER_ELEMENT));
        let view = new Uint32Array(buffer, 0, 2);
        view[0] = value % ((1 << 16) * (1 << 16)) | 0;
        view[1] = value / ((1 << 16) * (1 << 16)) | 0;

        // sign extension
        if (value < 0) {
          view = new Uint8Array(buffer, 2);
          view.forEach((byte, i) => {
            view[i] = 0xff;
          });
        }
        return new Uint8Array(buffer);
      }

      // bindata
      if (EJSON.isBinary(value)) {
        return new Uint8Array(value.buffer);
      }

      // no match
      return false;
    }

    // Actually inserts a key value into the selector document
    // However, this checks there is no ambiguity in setting
    // the value for the given key, throws otherwise
    function insertIntoDocument(document, key, value) {
      Object.keys(document).forEach(existingKey => {
        if (existingKey.length > key.length && existingKey.indexOf("".concat(key, ".")) === 0 || key.length > existingKey.length && key.indexOf("".concat(existingKey, ".")) === 0) {
          throw new MiniMongoQueryError("cannot infer query fields to set, both paths '".concat(existingKey, "' and '").concat(key, "' are matched"));
        } else if (existingKey === key) {
          throw new MiniMongoQueryError("cannot infer query fields to set, path '".concat(key, "' is matched twice"));
        }
      });
      document[key] = value;
    }

    // Returns a branched matcher that matches iff the given matcher does not.
    // Note that this implicitly "deMorganizes" the wrapped function.  ie, it
    // means that ALL branch values need to fail to match innerBranchedMatcher.
    function invertBranchedMatcher(branchedMatcher) {
      return branchValues => {
        // We explicitly choose to strip arrayIndices here: it doesn't make sense to
        // say "update the array element that does not match something", at least
        // in mongo-land.
        return {
          result: !branchedMatcher(branchValues).result
        };
      };
    }
    function isIndexable(obj) {
      return Array.isArray(obj) || LocalCollection._isPlainObject(obj);
    }
    function isNumericKey(s) {
      return /^[0-9]+$/.test(s);
    }
    function isOperatorObject(valueSelector, inconsistentOK) {
      if (!LocalCollection._isPlainObject(valueSelector)) {
        return false;
      }
      let theseAreOperators = undefined;
      Object.keys(valueSelector).forEach(selKey => {
        const thisIsOperator = selKey.substr(0, 1) === '$' || selKey === 'diff';
        if (theseAreOperators === undefined) {
          theseAreOperators = thisIsOperator;
        } else if (theseAreOperators !== thisIsOperator) {
          if (!inconsistentOK) {
            throw new MiniMongoQueryError("Inconsistent operator: ".concat(JSON.stringify(valueSelector)));
          }
          theseAreOperators = false;
        }
      });
      return !!theseAreOperators; // {} has no operators
    }
    // Helper for $lt/$gt/$lte/$gte.
    function makeInequality(cmpValueComparator) {
      return {
        compileElementSelector(operand) {
          // Arrays never compare false with non-arrays for any inequality.
          // XXX This was behavior we observed in pre-release MongoDB 2.5, but
          //     it seems to have been reverted.
          //     See https://jira.mongodb.org/browse/SERVER-11444
          if (Array.isArray(operand)) {
            return () => false;
          }

          // Special case: consider undefined and null the same (so true with
          // $gte/$lte).
          if (operand === undefined) {
            operand = null;
          }
          const operandType = LocalCollection._f._type(operand);
          return value => {
            if (value === undefined) {
              value = null;
            }

            // Comparisons are never true among things of different type (except
            // null vs undefined).
            if (LocalCollection._f._type(value) !== operandType) {
              return false;
            }
            return cmpValueComparator(LocalCollection._f._cmp(value, operand));
          };
        }
      };
    }

    // makeLookupFunction(key) returns a lookup function.
    //
    // A lookup function takes in a document and returns an array of matching
    // branches.  If no arrays are found while looking up the key, this array will
    // have exactly one branches (possibly 'undefined', if some segment of the key
    // was not found).
    //
    // If arrays are found in the middle, this can have more than one element, since
    // we 'branch'. When we 'branch', if there are more key segments to look up,
    // then we only pursue branches that are plain objects (not arrays or scalars).
    // This means we can actually end up with no branches!
    //
    // We do *NOT* branch on arrays that are found at the end (ie, at the last
    // dotted member of the key). We just return that array; if you want to
    // effectively 'branch' over the array's values, post-process the lookup
    // function with expandArraysInBranches.
    //
    // Each branch is an object with keys:
    //  - value: the value at the branch
    //  - dontIterate: an optional bool; if true, it means that 'value' is an array
    //    that expandArraysInBranches should NOT expand. This specifically happens
    //    when there is a numeric index in the key, and ensures the
    //    perhaps-surprising MongoDB behavior where {'a.0': 5} does NOT
    //    match {a: [[5]]}.
    //  - arrayIndices: if any array indexing was done during lookup (either due to
    //    explicit numeric indices or implicit branching), this will be an array of
    //    the array indices used, from outermost to innermost; it is falsey or
    //    absent if no array index is used. If an explicit numeric index is used,
    //    the index will be followed in arrayIndices by the string 'x'.
    //
    //    Note: arrayIndices is used for two purposes. First, it is used to
    //    implement the '$' modifier feature, which only ever looks at its first
    //    element.
    //
    //    Second, it is used for sort key generation, which needs to be able to tell
    //    the difference between different paths. Moreover, it needs to
    //    differentiate between explicit and implicit branching, which is why
    //    there's the somewhat hacky 'x' entry: this means that explicit and
    //    implicit array lookups will have different full arrayIndices paths. (That
    //    code only requires that different paths have different arrayIndices; it
    //    doesn't actually 'parse' arrayIndices. As an alternative, arrayIndices
    //    could contain objects with flags like 'implicit', but I think that only
    //    makes the code surrounding them more complex.)
    //
    //    (By the way, this field ends up getting passed around a lot without
    //    cloning, so never mutate any arrayIndices field/var in this package!)
    //
    //
    // At the top level, you may only pass in a plain object or array.
    //
    // See the test 'minimongo - lookup' for some examples of what lookup functions
    // return.
    function makeLookupFunction(key) {
      let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      const parts = key.split('.');
      const firstPart = parts.length ? parts[0] : '';
      const lookupRest = parts.length > 1 && makeLookupFunction(parts.slice(1).join('.'), options);
      function buildResult(arrayIndices, dontIterate, value) {
        return arrayIndices && arrayIndices.length ? dontIterate ? [{
          arrayIndices,
          dontIterate,
          value
        }] : [{
          arrayIndices,
          value
        }] : dontIterate ? [{
          dontIterate,
          value
        }] : [{
          value
        }];
      }

      // Doc will always be a plain object or an array.
      // apply an explicit numeric index, an array.
      return (doc, arrayIndices) => {
        if (Array.isArray(doc)) {
          // If we're being asked to do an invalid lookup into an array (non-integer
          // or out-of-bounds), return no results (which is different from returning
          // a single undefined result, in that `null` equality checks won't match).
          if (!(isNumericKey(firstPart) && firstPart < doc.length)) {
            return [];
          }

          // Remember that we used this array index. Include an 'x' to indicate that
          // the previous index came from being considered as an explicit array
          // index (not branching).
          arrayIndices = arrayIndices ? arrayIndices.concat(+firstPart, 'x') : [+firstPart, 'x'];
        }

        // Do our first lookup.
        const firstLevel = doc[firstPart];

        // If there is no deeper to dig, return what we found.
        //
        // If what we found is an array, most value selectors will choose to treat
        // the elements of the array as matchable values in their own right, but
        // that's done outside of the lookup function. (Exceptions to this are $size
        // and stuff relating to $elemMatch.  eg, {a: {$size: 2}} does not match {a:
        // [[1, 2]]}.)
        //
        // That said, if we just did an *explicit* array lookup (on doc) to find
        // firstLevel, and firstLevel is an array too, we do NOT want value
        // selectors to iterate over it.  eg, {'a.0': 5} does not match {a: [[5]]}.
        // So in that case, we mark the return value as 'don't iterate'.
        if (!lookupRest) {
          return buildResult(arrayIndices, Array.isArray(doc) && Array.isArray(firstLevel), firstLevel);
        }

        // We need to dig deeper.  But if we can't, because what we've found is not
        // an array or plain object, we're done. If we just did a numeric index into
        // an array, we return nothing here (this is a change in Mongo 2.5 from
        // Mongo 2.4, where {'a.0.b': null} stopped matching {a: [5]}). Otherwise,
        // return a single `undefined` (which can, for example, match via equality
        // with `null`).
        if (!isIndexable(firstLevel)) {
          if (Array.isArray(doc)) {
            return [];
          }
          return buildResult(arrayIndices, false, undefined);
        }
        const result = [];
        const appendToResult = more => {
          result.push(...more);
        };

        // Dig deeper: look up the rest of the parts on whatever we've found.
        // (lookupRest is smart enough to not try to do invalid lookups into
        // firstLevel if it's an array.)
        appendToResult(lookupRest(firstLevel, arrayIndices));

        // If we found an array, then in *addition* to potentially treating the next
        // part as a literal integer lookup, we should also 'branch': try to look up
        // the rest of the parts on each array element in parallel.
        //
        // In this case, we *only* dig deeper into array elements that are plain
        // objects. (Recall that we only got this far if we have further to dig.)
        // This makes sense: we certainly don't dig deeper into non-indexable
        // objects. And it would be weird to dig into an array: it's simpler to have
        // a rule that explicit integer indexes only apply to an outer array, not to
        // an array you find after a branching search.
        //
        // In the special case of a numeric part in a *sort selector* (not a query
        // selector), we skip the branching: we ONLY allow the numeric part to mean
        // 'look up this index' in that case, not 'also look up this index in all
        // the elements of the array'.
        if (Array.isArray(firstLevel) && !(isNumericKey(parts[1]) && options.forSort)) {
          firstLevel.forEach((branch, arrayIndex) => {
            if (LocalCollection._isPlainObject(branch)) {
              appendToResult(lookupRest(branch, arrayIndices ? arrayIndices.concat(arrayIndex) : [arrayIndex]));
            }
          });
        }
        return result;
      };
    }
    // Object exported only for unit testing.
    // Use it to export private functions to test in Tinytest.
    MinimongoTest = {
      makeLookupFunction
    };
    MinimongoError = function (message) {
      let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      if (typeof message === 'string' && options.field) {
        message += " for field '".concat(options.field, "'");
      }
      const error = new Error(message);
      error.name = 'MinimongoError';
      return error;
    };
    function nothingMatcher(docOrBranchedValues) {
      return {
        result: false
      };
    }
    // Takes an operator object (an object with $ keys) and returns a branched
    // matcher for it.
    function operatorBranchedMatcher(valueSelector, matcher, isRoot) {
      // Each valueSelector works separately on the various branches.  So one
      // operator can match one branch and another can match another branch.  This
      // is OK.
      const operatorMatchers = Object.keys(valueSelector).map(operator => {
        const operand = valueSelector[operator];
        const simpleRange = ['$lt', '$lte', '$gt', '$gte'].includes(operator) && typeof operand === 'number';
        const simpleEquality = ['$ne', '$eq'].includes(operator) && operand !== Object(operand);
        const simpleInclusion = ['$in', '$nin'].includes(operator) && Array.isArray(operand) && !operand.some(x => x === Object(x));
        if (!(simpleRange || simpleInclusion || simpleEquality)) {
          matcher._isSimple = false;
        }
        if (hasOwn.call(VALUE_OPERATORS, operator)) {
          return VALUE_OPERATORS[operator](operand, valueSelector, matcher, isRoot);
        }
        if (hasOwn.call(ELEMENT_OPERATORS, operator)) {
          const options = ELEMENT_OPERATORS[operator];
          return convertElementMatcherToBranchedMatcher(options.compileElementSelector(operand, valueSelector, matcher), options);
        }
        throw new MiniMongoQueryError("Unrecognized operator: ".concat(operator));
      });
      return andBranchedMatchers(operatorMatchers);
    }

    // paths - Array: list of mongo style paths
    // newLeafFn - Function: of form function(path) should return a scalar value to
    //                       put into list created for that path
    // conflictFn - Function: of form function(node, path, fullPath) is called
    //                        when building a tree path for 'fullPath' node on
    //                        'path' was already a leaf with a value. Must return a
    //                        conflict resolution.
    // initial tree - Optional Object: starting tree.
    // @returns - Object: tree represented as a set of nested objects
    function pathsToTree(paths, newLeafFn, conflictFn) {
      let root = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
      paths.forEach(path => {
        const pathArray = path.split('.');
        let tree = root;

        // use .every just for iteration with break
        const success = pathArray.slice(0, -1).every((key, i) => {
          if (!hasOwn.call(tree, key)) {
            tree[key] = {};
          } else if (tree[key] !== Object(tree[key])) {
            tree[key] = conflictFn(tree[key], pathArray.slice(0, i + 1).join('.'), path);

            // break out of loop if we are failing for this path
            if (tree[key] !== Object(tree[key])) {
              return false;
            }
          }
          tree = tree[key];
          return true;
        });
        if (success) {
          const lastKey = pathArray[pathArray.length - 1];
          if (hasOwn.call(tree, lastKey)) {
            tree[lastKey] = conflictFn(tree[lastKey], path, path);
          } else {
            tree[lastKey] = newLeafFn(path);
          }
        }
      });
      return root;
    }
    // Makes sure we get 2 elements array and assume the first one to be x and
    // the second one to y no matter what user passes.
    // In case user passes { lon: x, lat: y } returns [x, y]
    function pointToArray(point) {
      return Array.isArray(point) ? point.slice() : [point.x, point.y];
    }

    // Creating a document from an upsert is quite tricky.
    // E.g. this selector: {"$or": [{"b.foo": {"$all": ["bar"]}}]}, should result
    // in: {"b.foo": "bar"}
    // But this selector: {"$or": [{"b": {"foo": {"$all": ["bar"]}}}]} should throw
    // an error

    // Some rules (found mainly with trial & error, so there might be more):
    // - handle all childs of $and (or implicit $and)
    // - handle $or nodes with exactly 1 child
    // - ignore $or nodes with more than 1 child
    // - ignore $nor and $not nodes
    // - throw when a value can not be set unambiguously
    // - every value for $all should be dealt with as separate $eq-s
    // - threat all children of $all as $eq setters (=> set if $all.length === 1,
    //   otherwise throw error)
    // - you can not mix '$'-prefixed keys and non-'$'-prefixed keys
    // - you can only have dotted keys on a root-level
    // - you can not have '$'-prefixed keys more than one-level deep in an object

    // Handles one key/value pair to put in the selector document
    function populateDocumentWithKeyValue(document, key, value) {
      if (value && Object.getPrototypeOf(value) === Object.prototype) {
        populateDocumentWithObject(document, key, value);
      } else if (!(value instanceof RegExp)) {
        insertIntoDocument(document, key, value);
      }
    }

    // Handles a key, value pair to put in the selector document
    // if the value is an object
    function populateDocumentWithObject(document, key, value) {
      const keys = Object.keys(value);
      const unprefixedKeys = keys.filter(op => op[0] !== '$');
      if (unprefixedKeys.length > 0 || !keys.length) {
        // Literal (possibly empty) object ( or empty object )
        // Don't allow mixing '$'-prefixed with non-'$'-prefixed fields
        if (keys.length !== unprefixedKeys.length) {
          throw new MiniMongoQueryError("unknown operator: ".concat(unprefixedKeys[0]));
        }
        validateObject(value, key);
        insertIntoDocument(document, key, value);
      } else {
        Object.keys(value).forEach(op => {
          const object = value[op];
          if (op === '$eq') {
            populateDocumentWithKeyValue(document, key, object);
          } else if (op === '$all') {
            // every value for $all should be dealt with as separate $eq-s
            object.forEach(element => populateDocumentWithKeyValue(document, key, element));
          }
        });
      }
    }

    // Fills a document with certain fields from an upsert selector
    function populateDocumentWithQueryFields(query) {
      let document = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      if (Object.getPrototypeOf(query) === Object.prototype) {
        // handle implicit $and
        Object.keys(query).forEach(key => {
          const value = query[key];
          if (key === '$and') {
            // handle explicit $and
            value.forEach(element => populateDocumentWithQueryFields(element, document));
          } else if (key === '$or') {
            // handle $or nodes with exactly 1 child
            if (value.length === 1) {
              populateDocumentWithQueryFields(value[0], document);
            }
          } else if (key[0] !== '$') {
            // Ignore other '$'-prefixed logical selectors
            populateDocumentWithKeyValue(document, key, value);
          }
        });
      } else {
        // Handle meteor-specific shortcut for selecting _id
        if (LocalCollection._selectorIsId(query)) {
          insertIntoDocument(document, '_id', query);
        }
      }
      return document;
    }
    function projectionDetails(fields) {
      // Find the non-_id keys (_id is handled specially because it is included
      // unless explicitly excluded). Sort the keys, so that our code to detect
      // overlaps like 'foo' and 'foo.bar' can assume that 'foo' comes first.
      let fieldsKeys = Object.keys(fields).sort();

      // If _id is the only field in the projection, do not remove it, since it is
      // required to determine if this is an exclusion or exclusion. Also keep an
      // inclusive _id, since inclusive _id follows the normal rules about mixing
      // inclusive and exclusive fields. If _id is not the only field in the
      // projection and is exclusive, remove it so it can be handled later by a
      // special case, since exclusive _id is always allowed.
      if (!(fieldsKeys.length === 1 && fieldsKeys[0] === '_id') && !(fieldsKeys.includes('_id') && fields._id)) {
        fieldsKeys = fieldsKeys.filter(key => key !== '_id');
      }
      let including = null; // Unknown

      fieldsKeys.forEach(keyPath => {
        const rule = !!fields[keyPath];
        if (including === null) {
          including = rule;
        }

        // This error message is copied from MongoDB shell
        if (including !== rule) {
          throw MinimongoError('You cannot currently mix including and excluding fields.');
        }
      });
      const projectionRulesTree = pathsToTree(fieldsKeys, path => including, (node, path, fullPath) => {
        // Check passed projection fields' keys: If you have two rules such as
        // 'foo.bar' and 'foo.bar.baz', then the result becomes ambiguous. If
        // that happens, there is a probability you are doing something wrong,
        // framework should notify you about such mistake earlier on cursor
        // compilation step than later during runtime.  Note, that real mongo
        // doesn't do anything about it and the later rule appears in projection
        // project, more priority it takes.
        //
        // Example, assume following in mongo shell:
        // > db.coll.insert({ a: { b: 23, c: 44 } })
        // > db.coll.find({}, { 'a': 1, 'a.b': 1 })
        // {"_id": ObjectId("520bfe456024608e8ef24af3"), "a": {"b": 23}}
        // > db.coll.find({}, { 'a.b': 1, 'a': 1 })
        // {"_id": ObjectId("520bfe456024608e8ef24af3"), "a": {"b": 23, "c": 44}}
        //
        // Note, how second time the return set of keys is different.
        const currentPath = fullPath;
        const anotherPath = path;
        throw MinimongoError("both ".concat(currentPath, " and ").concat(anotherPath, " found in fields option, ") + 'using both of them may trigger unexpected behavior. Did you mean to ' + 'use only one of them?');
      });
      return {
        including,
        tree: projectionRulesTree
      };
    }
    function regexpElementMatcher(regexp) {
      return value => {
        if (value instanceof RegExp) {
          return value.toString() === regexp.toString();
        }

        // Regexps only work against strings.
        if (typeof value !== 'string') {
          return false;
        }

        // Reset regexp's state to avoid inconsistent matching for objects with the
        // same value on consecutive calls of regexp.test. This happens only if the
        // regexp has the 'g' flag. Also note that ES6 introduces a new flag 'y' for
        // which we should *not* change the lastIndex but MongoDB doesn't support
        // either of these flags.
        regexp.lastIndex = 0;
        return regexp.test(value);
      };
    }
    // Validates the key in a path.
    // Objects that are nested more then 1 level cannot have dotted fields
    // or fields starting with '$'
    function validateKeyInPath(key, path) {
      if (key.includes('.')) {
        throw new Error("The dotted field '".concat(key, "' in '").concat(path, ".").concat(key, " is not valid for storage."));
      }
      if (key[0] === '$') {
        throw new Error("The dollar ($) prefixed field  '".concat(path, ".").concat(key, " is not valid for storage."));
      }
    }

    // Recursively validates an object that is nested more than one level deep
    function validateObject(object, path) {
      if (object && Object.getPrototypeOf(object) === Object.prototype) {
        Object.keys(object).forEach(key => {
          validateKeyInPath(key, path);
          validateObject(object[key], path + '.' + key);
        });
      }
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

},"constants.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/constants.js                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  getAsyncMethodName: () => getAsyncMethodName,
  ASYNC_COLLECTION_METHODS: () => ASYNC_COLLECTION_METHODS,
  ASYNC_CURSOR_METHODS: () => ASYNC_CURSOR_METHODS,
  CLIENT_ONLY_METHODS: () => CLIENT_ONLY_METHODS
});
function getAsyncMethodName(method) {
  return "".concat(method.replace('_', ''), "Async");
}
const ASYNC_COLLECTION_METHODS = ['_createCappedCollection', 'dropCollection', 'dropIndex',
/**
 * @summary Creates the specified index on the collection.
 * @locus server
 * @method createIndexAsync
 * @memberof Mongo.Collection
 * @instance
 * @param {Object} index A document that contains the field and value pairs where the field is the index key and the value describes the type of index for that field. For an ascending index on a field, specify a value of `1`; for descending index, specify a value of `-1`. Use `text` for text indexes.
 * @param {Object} [options] All options are listed in [MongoDB documentation](https://docs.mongodb.com/manual/reference/method/db.collection.createIndex/#options)
 * @param {String} options.name Name of the index
 * @param {Boolean} options.unique Define that the index values must be unique, more at [MongoDB documentation](https://docs.mongodb.com/manual/core/index-unique/)
 * @param {Boolean} options.sparse Define that the index is sparse, more at [MongoDB documentation](https://docs.mongodb.com/manual/core/index-sparse/)
 * @returns {Promise}
 */
'createIndex',
/**
 * @summary Finds the first document that matches the selector, as ordered by sort and skip options. Returns `undefined` if no matching document is found.
 * @locus Anywhere
 * @method findOneAsync
 * @memberof Mongo.Collection
 * @instance
 * @param {MongoSelector} [selector] A query describing the documents to find
 * @param {Object} [options]
 * @param {MongoSortSpecifier} options.sort Sort order (default: natural order)
 * @param {Number} options.skip Number of results to skip at the beginning
 * @param {MongoFieldSpecifier} options.fields Dictionary of fields to return or exclude.
 * @param {Boolean} options.reactive (Client only) Default true; pass false to disable reactivity
 * @param {Function} options.transform Overrides `transform` on the [`Collection`](#collections) for this cursor.  Pass `null` to disable transformation.
 * @param {String} options.readPreference (Server only) Specifies a custom MongoDB [`readPreference`](https://docs.mongodb.com/manual/core/read-preference) for fetching the document. Possible values are `primary`, `primaryPreferred`, `secondary`, `secondaryPreferred` and `nearest`.
 * @returns {Promise}
 */
'findOne',
/**
 * @summary Insert a document in the collection.  Returns its unique _id.
 * @locus Anywhere
 * @method  insertAsync
 * @memberof Mongo.Collection
 * @instance
 * @param {Object} doc The document to insert. May not yet have an _id attribute, in which case Meteor will generate one for you.
 * @return {Promise}
 */
'insert',
/**
 * @summary Remove documents from the collection
 * @locus Anywhere
 * @method removeAsync
 * @memberof Mongo.Collection
 * @instance
 * @param {MongoSelector} selector Specifies which documents to remove
 * @return {Promise}
 */
'remove',
/**
 * @summary Modify one or more documents in the collection. Returns the number of matched documents.
 * @locus Anywhere
 * @method updateAsync
 * @memberof Mongo.Collection
 * @instance
 * @param {MongoSelector} selector Specifies which documents to modify
 * @param {MongoModifier} modifier Specifies how to modify the documents
 * @param {Object} [options]
 * @param {Boolean} options.multi True to modify all matching documents; false to only modify one of the matching documents (the default).
 * @param {Boolean} options.upsert True to insert a document if no matching documents are found.
 * @param {Array} options.arrayFilters Optional. Used in combination with MongoDB [filtered positional operator](https://docs.mongodb.com/manual/reference/operator/update/positional-filtered/) to specify which elements to modify in an array field.
 * @return {Promise}
 */
'update',
/**
 * @summary Modify one or more documents in the collection, or insert one if no matching documents were found. Returns an object with keys `numberAffected` (the number of documents modified)  and `insertedId` (the unique _id of the document that was inserted, if any).
 * @locus Anywhere
 * @method upsertAsync
 * @memberof Mongo.Collection
 * @instance
 * @param {MongoSelector} selector Specifies which documents to modify
 * @param {MongoModifier} modifier Specifies how to modify the documents
 * @param {Object} [options]
 * @param {Boolean} options.multi True to modify all matching documents; false to only modify one of the matching documents (the default).
 * @return {Promise}
 */
'upsert'];
const ASYNC_CURSOR_METHODS = [
/**
 * @deprecated in 2.9
 * @summary Returns the number of documents that match a query. This method is
 *          [deprecated since MongoDB 4.0](https://www.mongodb.com/docs/v4.4/reference/command/count/);
 *          see `Collection.countDocuments` and
 *          `Collection.estimatedDocumentCount` for a replacement.
 * @memberOf Mongo.Cursor
 * @method  countAsync
 * @instance
 * @locus Anywhere
 * @returns {Promise}
 */
'count',
/**
 * @summary Return all matching documents as an Array.
 * @memberOf Mongo.Cursor
 * @method  fetchAsync
 * @instance
 * @locus Anywhere
 * @returns {Promise}
 */
'fetch',
/**
 * @summary Call `callback` once for each matching document, sequentially and
 *          synchronously.
 * @locus Anywhere
 * @method  forEachAsync
 * @instance
 * @memberOf Mongo.Cursor
 * @param {IterationCallback} callback Function to call. It will be called
 *                                     with three arguments: the document, a
 *                                     0-based index, and <em>cursor</em>
 *                                     itself.
 * @param {Any} [thisArg] An object which will be the value of `this` inside
 *                        `callback`.
 * @returns {Promise}
 */
'forEach',
/**
 * @summary Map callback over all matching documents.  Returns an Array.
 * @locus Anywhere
 * @method mapAsync
 * @instance
 * @memberOf Mongo.Cursor
 * @param {IterationCallback} callback Function to call. It will be called
 *                                     with three arguments: the document, a
 *                                     0-based index, and <em>cursor</em>
 *                                     itself.
 * @param {Any} [thisArg] An object which will be the value of `this` inside
 *                        `callback`.
 * @returns {Promise}
 */
'map'];
const CLIENT_ONLY_METHODS = ["findOne", "insert", "remove", "update", "upsert"];
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"cursor.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/cursor.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reify_async_result__) {
  "use strict";
  try {
    module.export({
      default: () => Cursor
    });
    let LocalCollection;
    module.link("./local_collection.js", {
      default(v) {
        LocalCollection = v;
      }
    }, 0);
    let hasOwn;
    module.link("./common.js", {
      hasOwn(v) {
        hasOwn = v;
      }
    }, 1);
    let ASYNC_CURSOR_METHODS, getAsyncMethodName;
    module.link("./constants", {
      ASYNC_CURSOR_METHODS(v) {
        ASYNC_CURSOR_METHODS = v;
      },
      getAsyncMethodName(v) {
        getAsyncMethodName = v;
      }
    }, 2);
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    class Cursor {
      // don't call this ctor directly.  use LocalCollection.find().
      constructor(collection, selector) {
        let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
        this.collection = collection;
        this.sorter = null;
        this.matcher = new Minimongo.Matcher(selector);
        if (LocalCollection._selectorIsIdPerhapsAsObject(selector)) {
          // stash for fast _id and { _id }
          this._selectorId = hasOwn.call(selector, '_id') ? selector._id : selector;
        } else {
          this._selectorId = undefined;
          if (this.matcher.hasGeoQuery() || options.sort) {
            this.sorter = new Minimongo.Sorter(options.sort || []);
          }
        }
        this.skip = options.skip || 0;
        this.limit = options.limit;
        this.fields = options.projection || options.fields;
        this._projectionFn = LocalCollection._compileProjection(this.fields || {});
        this._transform = LocalCollection.wrapTransform(options.transform);

        // by default, queries register w/ Tracker when it is available.
        if (typeof Tracker !== 'undefined') {
          this.reactive = options.reactive === undefined ? true : options.reactive;
        }
      }

      /**
       * @deprecated in 2.9
       * @summary Returns the number of documents that match a query. This method is
       *          [deprecated since MongoDB 4.0](https://www.mongodb.com/docs/v4.4/reference/command/count/);
       *          see `Collection.countDocuments` and
       *          `Collection.estimatedDocumentCount` for a replacement.
       * @memberOf Mongo.Cursor
       * @method  count
       * @instance
       * @locus Anywhere
       * @returns {Number}
       */
      count() {
        if (this.reactive) {
          // allow the observe to be unordered
          this._depend({
            added: true,
            removed: true
          }, true);
        }
        return this._getRawObjects({
          ordered: true
        }).length;
      }

      /**
       * @summary Return all matching documents as an Array.
       * @memberOf Mongo.Cursor
       * @method  fetch
       * @instance
       * @locus Anywhere
       * @returns {Object[]}
       */
      fetch() {
        const result = [];
        this.forEach(doc => {
          result.push(doc);
        });
        return result;
      }
      [Symbol.iterator]() {
        if (this.reactive) {
          this._depend({
            addedBefore: true,
            removed: true,
            changed: true,
            movedBefore: true
          });
        }
        let index = 0;
        const objects = this._getRawObjects({
          ordered: true
        });
        return {
          next: () => {
            if (index < objects.length) {
              // This doubles as a clone operation.
              let element = this._projectionFn(objects[index++]);
              if (this._transform) element = this._transform(element);
              return {
                value: element
              };
            }
            return {
              done: true
            };
          }
        };
      }
      [Symbol.asyncIterator]() {
        const syncResult = this[Symbol.iterator]();
        return {
          async next() {
            return Promise.resolve(syncResult.next());
          }
        };
      }

      /**
       * @callback IterationCallback
       * @param {Object} doc
       * @param {Number} index
       */
      /**
       * @summary Call `callback` once for each matching document, sequentially and
       *          synchronously.
       * @locus Anywhere
       * @method  forEach
       * @instance
       * @memberOf Mongo.Cursor
       * @param {IterationCallback} callback Function to call. It will be called
       *                                     with three arguments: the document, a
       *                                     0-based index, and <em>cursor</em>
       *                                     itself.
       * @param {Any} [thisArg] An object which will be the value of `this` inside
       *                        `callback`.
       */
      forEach(callback, thisArg) {
        if (this.reactive) {
          this._depend({
            addedBefore: true,
            removed: true,
            changed: true,
            movedBefore: true
          });
        }
        this._getRawObjects({
          ordered: true
        }).forEach((element, i) => {
          // This doubles as a clone operation.
          element = this._projectionFn(element);
          if (this._transform) {
            element = this._transform(element);
          }
          callback.call(thisArg, element, i, this);
        });
      }
      getTransform() {
        return this._transform;
      }

      /**
       * @summary Map callback over all matching documents.  Returns an Array.
       * @locus Anywhere
       * @method map
       * @instance
       * @memberOf Mongo.Cursor
       * @param {IterationCallback} callback Function to call. It will be called
       *                                     with three arguments: the document, a
       *                                     0-based index, and <em>cursor</em>
       *                                     itself.
       * @param {Any} [thisArg] An object which will be the value of `this` inside
       *                        `callback`.
       */
      map(callback, thisArg) {
        const result = [];
        this.forEach((doc, i) => {
          result.push(callback.call(thisArg, doc, i, this));
        });
        return result;
      }

      // options to contain:
      //  * callbacks for observe():
      //    - addedAt (document, atIndex)
      //    - added (document)
      //    - changedAt (newDocument, oldDocument, atIndex)
      //    - changed (newDocument, oldDocument)
      //    - removedAt (document, atIndex)
      //    - removed (document)
      //    - movedTo (document, oldIndex, newIndex)
      //
      // attributes available on returned query handle:
      //  * stop(): end updates
      //  * collection: the collection this query is querying
      //
      // iff x is a returned query handle, (x instanceof
      // LocalCollection.ObserveHandle) is true
      //
      // initial results delivered through added callback
      // XXX maybe callbacks should take a list of objects, to expose transactions?
      // XXX maybe support field limiting (to limit what you're notified on)

      /**
       * @summary Watch a query.  Receive callbacks as the result set changes.
       * @locus Anywhere
       * @memberOf Mongo.Cursor
       * @instance
       * @param {Object} callbacks Functions to call to deliver the result set as it
       *                           changes
       */
      observe(options) {
        return LocalCollection._observeFromObserveChanges(this, options);
      }

      /**
       * @summary Watch a query.  Receive callbacks as the result set changes.
       * @locus Anywhere
       * @memberOf Mongo.Cursor
       * @instance
       */
      observeAsync(options) {
        return new Promise(resolve => resolve(this.observe(options)));
      }

      /**
       * @summary Watch a query. Receive callbacks as the result set changes. Only
       *          the differences between the old and new documents are passed to
       *          the callbacks.
       * @locus Anywhere
       * @memberOf Mongo.Cursor
       * @instance
       * @param {Object} callbacks Functions to call to deliver the result set as it
       *                           changes
       */
      observeChanges(options) {
        const ordered = LocalCollection._observeChangesCallbacksAreOrdered(options);

        // there are several places that assume you aren't combining skip/limit with
        // unordered observe.  eg, update's EJSON.clone, and the "there are several"
        // comment in _modifyAndNotify
        // XXX allow skip/limit with unordered observe
        if (!options._allow_unordered && !ordered && (this.skip || this.limit)) {
          throw new Error("Must use an ordered observe with skip or limit (i.e. 'addedBefore' " + "for observeChanges or 'addedAt' for observe, instead of 'added').");
        }
        if (this.fields && (this.fields._id === 0 || this.fields._id === false)) {
          throw Error("You may not observe a cursor with {fields: {_id: 0}}");
        }
        const distances = this.matcher.hasGeoQuery() && ordered && new LocalCollection._IdMap();
        const query = {
          cursor: this,
          dirty: false,
          distances,
          matcher: this.matcher,
          // not fast pathed
          ordered,
          projectionFn: this._projectionFn,
          resultsSnapshot: null,
          sorter: ordered && this.sorter
        };
        let qid;

        // Non-reactive queries call added[Before] and then never call anything
        // else.
        if (this.reactive) {
          qid = this.collection.next_qid++;
          this.collection.queries[qid] = query;
        }
        query.results = this._getRawObjects({
          ordered,
          distances: query.distances
        });
        if (this.collection.paused) {
          query.resultsSnapshot = ordered ? [] : new LocalCollection._IdMap();
        }

        // wrap callbacks we were passed. callbacks only fire when not paused and
        // are never undefined
        // Filters out blacklisted fields according to cursor's projection.
        // XXX wrong place for this?

        // furthermore, callbacks enqueue until the operation we're working on is
        // done.
        const wrapCallback = fn => {
          if (!fn) {
            return () => {};
          }
          const self = this;
          return function /* args*/
          () {
            if (self.collection.paused) {
              return;
            }
            const args = arguments;
            self.collection._observeQueue.queueTask(() => {
              fn.apply(this, args);
            });
          };
        };
        query.added = wrapCallback(options.added);
        query.changed = wrapCallback(options.changed);
        query.removed = wrapCallback(options.removed);
        if (ordered) {
          query.addedBefore = wrapCallback(options.addedBefore);
          query.movedBefore = wrapCallback(options.movedBefore);
        }
        if (!options._suppress_initial && !this.collection.paused) {
          var _query$results, _query$results$size;
          const handler = doc => {
            const fields = EJSON.clone(doc);
            delete fields._id;
            if (ordered) {
              query.addedBefore(doc._id, this._projectionFn(fields), null);
            }
            query.added(doc._id, this._projectionFn(fields));
          };
          // it means it's just an array
          if (query.results.length) {
            for (const doc of query.results) {
              handler(doc);
            }
          }
          // it means it's an id map
          if ((_query$results = query.results) !== null && _query$results !== void 0 && (_query$results$size = _query$results.size) !== null && _query$results$size !== void 0 && _query$results$size.call(_query$results)) {
            query.results.forEach(handler);
          }
        }
        const handle = Object.assign(new LocalCollection.ObserveHandle(), {
          collection: this.collection,
          stop: () => {
            if (this.reactive) {
              delete this.collection.queries[qid];
            }
          },
          isReady: false,
          isReadyPromise: null
        });
        if (this.reactive && Tracker.active) {
          // XXX in many cases, the same observe will be recreated when
          // the current autorun is rerun.  we could save work by
          // letting it linger across rerun and potentially get
          // repurposed if the same observe is performed, using logic
          // similar to that of Meteor.subscribe.
          Tracker.onInvalidate(() => {
            handle.stop();
          });
        }

        // run the observe callbacks resulting from the initial contents
        // before we leave the observe.
        const drainResult = this.collection._observeQueue.drain();
        if (drainResult instanceof Promise) {
          handle.isReadyPromise = drainResult;
          drainResult.then(() => handle.isReady = true);
        } else {
          handle.isReady = true;
          handle.isReadyPromise = Promise.resolve();
        }
        return handle;
      }

      /**
       * @summary Watch a query. Receive callbacks as the result set changes. Only
       *          the differences between the old and new documents are passed to
       *          the callbacks.
       * @locus Anywhere
       * @memberOf Mongo.Cursor
       * @instance
       * @param {Object} callbacks Functions to call to deliver the result set as it
       *                           changes
       */
      observeChangesAsync(options) {
        return new Promise(resolve => {
          const handle = this.observeChanges(options);
          handle.isReadyPromise.then(() => resolve(handle));
        });
      }

      // XXX Maybe we need a version of observe that just calls a callback if
      // anything changed.
      _depend(changers, _allow_unordered) {
        if (Tracker.active) {
          const dependency = new Tracker.Dependency();
          const notify = dependency.changed.bind(dependency);
          dependency.depend();
          const options = {
            _allow_unordered,
            _suppress_initial: true
          };
          ['added', 'addedBefore', 'changed', 'movedBefore', 'removed'].forEach(fn => {
            if (changers[fn]) {
              options[fn] = notify;
            }
          });

          // observeChanges will stop() when this computation is invalidated
          this.observeChanges(options);
        }
      }
      _getCollectionName() {
        return this.collection.name;
      }

      // Returns a collection of matching objects, but doesn't deep copy them.
      //
      // If ordered is set, returns a sorted array, respecting sorter, skip, and
      // limit properties of the query provided that options.applySkipLimit is
      // not set to false (#1201). If sorter is falsey, no sort -- you get the
      // natural order.
      //
      // If ordered is not set, returns an object mapping from ID to doc (sorter,
      // skip and limit should not be set).
      //
      // If ordered is set and this cursor is a $near geoquery, then this function
      // will use an _IdMap to track each distance from the $near argument point in
      // order to use it as a sort key. If an _IdMap is passed in the 'distances'
      // argument, this function will clear it and use it for this purpose
      // (otherwise it will just create its own _IdMap). The observeChanges
      // implementation uses this to remember the distances after this function
      // returns.
      _getRawObjects() {
        let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        // By default this method will respect skip and limit because .fetch(),
        // .forEach() etc... expect this behaviour. It can be forced to ignore
        // skip and limit by setting applySkipLimit to false (.count() does this,
        // for example)
        const applySkipLimit = options.applySkipLimit !== false;

        // XXX use OrderedDict instead of array, and make IdMap and OrderedDict
        // compatible
        const results = options.ordered ? [] : new LocalCollection._IdMap();

        // fast path for single ID value
        if (this._selectorId !== undefined) {
          // If you have non-zero skip and ask for a single id, you get nothing.
          // This is so it matches the behavior of the '{_id: foo}' path.
          if (applySkipLimit && this.skip) {
            return results;
          }
          const selectedDoc = this.collection._docs.get(this._selectorId);
          if (selectedDoc) {
            if (options.ordered) {
              results.push(selectedDoc);
            } else {
              results.set(this._selectorId, selectedDoc);
            }
          }
          return results;
        }

        // slow path for arbitrary selector, sort, skip, limit

        // in the observeChanges case, distances is actually part of the "query"
        // (ie, live results set) object.  in other cases, distances is only used
        // inside this function.
        let distances;
        if (this.matcher.hasGeoQuery() && options.ordered) {
          if (options.distances) {
            distances = options.distances;
            distances.clear();
          } else {
            distances = new LocalCollection._IdMap();
          }
        }
        Meteor._runFresh(() => {
          this.collection._docs.forEach((doc, id) => {
            const matchResult = this.matcher.documentMatches(doc);
            if (matchResult.result) {
              if (options.ordered) {
                results.push(doc);
                if (distances && matchResult.distance !== undefined) {
                  distances.set(id, matchResult.distance);
                }
              } else {
                results.set(id, doc);
              }
            }

            // Override to ensure all docs are matched if ignoring skip & limit
            if (!applySkipLimit) {
              return true;
            }

            // Fast path for limited unsorted queries.
            // XXX 'length' check here seems wrong for ordered
            return !this.limit || this.skip || this.sorter || results.length !== this.limit;
          });
        });
        if (!options.ordered) {
          return results;
        }
        if (this.sorter) {
          results.sort(this.sorter.getComparator({
            distances
          }));
        }

        // Return the full set of results if there is no skip or limit or if we're
        // ignoring them
        if (!applySkipLimit || !this.limit && !this.skip) {
          return results;
        }
        return results.slice(this.skip, this.limit ? this.limit + this.skip : results.length);
      }
      _publishCursor(subscription) {
        // XXX minimongo should not depend on mongo-livedata!
        if (!Package.mongo) {
          throw new Error("Can't publish from Minimongo without the `mongo` package.");
        }
        if (!this.collection.name) {
          throw new Error("Can't publish a cursor from a collection without a name.");
        }
        return Package.mongo.Mongo.Collection._publishCursor(this, subscription, this.collection.name);
      }
    }
    // Implements async version of cursor methods to keep collections isomorphic
    ASYNC_CURSOR_METHODS.forEach(method => {
      const asyncName = getAsyncMethodName(method);
      Cursor.prototype[asyncName] = function () {
        try {
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          return Promise.resolve(this[method].apply(this, args));
        } catch (error) {
          return Promise.reject(error);
        }
      };
    });
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

},"local_collection.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/local_collection.js                                                                              //
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
      default: () => LocalCollection
    });
    let Cursor;
    module.link("./cursor.js", {
      default(v) {
        Cursor = v;
      }
    }, 0);
    let ObserveHandle;
    module.link("./observe_handle.js", {
      default(v) {
        ObserveHandle = v;
      }
    }, 1);
    let hasOwn, isIndexable, isNumericKey, isOperatorObject, populateDocumentWithQueryFields, projectionDetails;
    module.link("./common.js", {
      hasOwn(v) {
        hasOwn = v;
      },
      isIndexable(v) {
        isIndexable = v;
      },
      isNumericKey(v) {
        isNumericKey = v;
      },
      isOperatorObject(v) {
        isOperatorObject = v;
      },
      populateDocumentWithQueryFields(v) {
        populateDocumentWithQueryFields = v;
      },
      projectionDetails(v) {
        projectionDetails = v;
      }
    }, 2);
    let getAsyncMethodName;
    module.link("./constants", {
      getAsyncMethodName(v) {
        getAsyncMethodName = v;
      }
    }, 3);
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    class LocalCollection {
      constructor(name) {
        this.name = name;
        // _id -> document (also containing id)
        this._docs = new LocalCollection._IdMap();
        this._observeQueue = Meteor.isClient ? new Meteor._SynchronousQueue() : new Meteor._AsynchronousQueue();
        this.next_qid = 1; // live query id generator

        // qid -> live query object. keys:
        //  ordered: bool. ordered queries have addedBefore/movedBefore callbacks.
        //  results: array (ordered) or object (unordered) of current results
        //    (aliased with this._docs!)
        //  resultsSnapshot: snapshot of results. null if not paused.
        //  cursor: Cursor object for the query.
        //  selector, sorter, (callbacks): functions
        this.queries = Object.create(null);

        // null if not saving originals; an IdMap from id to original document value
        // if saving originals. See comments before saveOriginals().
        this._savedOriginals = null;

        // True when observers are paused and we should not send callbacks.
        this.paused = false;
      }
      countDocuments(selector, options) {
        return this.find(selector !== null && selector !== void 0 ? selector : {}, options).countAsync();
      }
      estimatedDocumentCount(options) {
        return this.find({}, options).countAsync();
      }

      // options may include sort, skip, limit, reactive
      // sort may be any of these forms:
      //     {a: 1, b: -1}
      //     [["a", "asc"], ["b", "desc"]]
      //     ["a", ["b", "desc"]]
      //   (in the first form you're beholden to key enumeration order in
      //   your javascript VM)
      //
      // reactive: if given, and false, don't register with Tracker (default
      // is true)
      //
      // XXX possibly should support retrieving a subset of fields? and
      // have it be a hint (ignored on the client, when not copying the
      // doc?)
      //
      // XXX sort does not yet support subkeys ('a.b') .. fix that!
      // XXX add one more sort form: "key"
      // XXX tests
      find(selector, options) {
        // default syntax for everything is to omit the selector argument.
        // but if selector is explicitly passed in as false or undefined, we
        // want a selector that matches nothing.
        if (arguments.length === 0) {
          selector = {};
        }
        return new LocalCollection.Cursor(this, selector, options);
      }
      findOne(selector) {
        let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        if (arguments.length === 0) {
          selector = {};
        }

        // NOTE: by setting limit 1 here, we end up using very inefficient
        // code that recomputes the whole query on each update. The upside is
        // that when you reactively depend on a findOne you only get
        // invalidated when the found object changes, not any object in the
        // collection. Most findOne will be by id, which has a fast path, so
        // this might not be a big deal. In most cases, invalidation causes
        // the called to re-query anyway, so this should be a net performance
        // improvement.
        options.limit = 1;
        return this.find(selector, options).fetch()[0];
      }
      async findOneAsync(selector) {
        let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        if (arguments.length === 0) {
          selector = {};
        }
        options.limit = 1;
        return (await this.find(selector, options).fetchAsync())[0];
      }
      prepareInsert(doc) {
        assertHasValidFieldNames(doc);

        // if you really want to use ObjectIDs, set this global.
        // Mongo.Collection specifies its own ids and does not use this code.
        if (!hasOwn.call(doc, '_id')) {
          doc._id = LocalCollection._useOID ? new MongoID.ObjectID() : Random.id();
        }
        const id = doc._id;
        if (this._docs.has(id)) {
          throw MinimongoError("Duplicate _id '".concat(id, "'"));
        }
        this._saveOriginal(id, undefined);
        this._docs.set(id, doc);
        return id;
      }

      // XXX possibly enforce that 'undefined' does not appear (we assume
      // this in our handling of null and $exists)
      insert(doc, callback) {
        doc = EJSON.clone(doc);
        const id = this.prepareInsert(doc);
        const queriesToRecompute = [];

        // trigger live queries that match
        for (const qid of Object.keys(this.queries)) {
          const query = this.queries[qid];
          if (query.dirty) {
            continue;
          }
          const matchResult = query.matcher.documentMatches(doc);
          if (matchResult.result) {
            if (query.distances && matchResult.distance !== undefined) {
              query.distances.set(id, matchResult.distance);
            }
            if (query.cursor.skip || query.cursor.limit) {
              queriesToRecompute.push(qid);
            } else {
              LocalCollection._insertInResultsSync(query, doc);
            }
          }
        }
        queriesToRecompute.forEach(qid => {
          if (this.queries[qid]) {
            this._recomputeResults(this.queries[qid]);
          }
        });
        this._observeQueue.drain();
        if (callback) {
          Meteor.defer(() => {
            callback(null, id);
          });
        }
        return id;
      }
      async insertAsync(doc, callback) {
        doc = EJSON.clone(doc);
        const id = this.prepareInsert(doc);
        const queriesToRecompute = [];

        // trigger live queries that match
        for (const qid of Object.keys(this.queries)) {
          const query = this.queries[qid];
          if (query.dirty) {
            continue;
          }
          const matchResult = query.matcher.documentMatches(doc);
          if (matchResult.result) {
            if (query.distances && matchResult.distance !== undefined) {
              query.distances.set(id, matchResult.distance);
            }
            if (query.cursor.skip || query.cursor.limit) {
              queriesToRecompute.push(qid);
            } else {
              await LocalCollection._insertInResultsAsync(query, doc);
            }
          }
        }
        queriesToRecompute.forEach(qid => {
          if (this.queries[qid]) {
            this._recomputeResults(this.queries[qid]);
          }
        });
        await this._observeQueue.drain();
        if (callback) {
          Meteor.defer(() => {
            callback(null, id);
          });
        }
        return id;
      }

      // Pause the observers. No callbacks from observers will fire until
      // 'resumeObservers' is called.
      pauseObservers() {
        // No-op if already paused.
        if (this.paused) {
          return;
        }

        // Set the 'paused' flag such that new observer messages don't fire.
        this.paused = true;

        // Take a snapshot of the query results for each query.
        Object.keys(this.queries).forEach(qid => {
          const query = this.queries[qid];
          query.resultsSnapshot = EJSON.clone(query.results);
        });
      }
      clearResultQueries(callback) {
        const result = this._docs.size();
        this._docs.clear();
        Object.keys(this.queries).forEach(qid => {
          const query = this.queries[qid];
          if (query.ordered) {
            query.results = [];
          } else {
            query.results.clear();
          }
        });
        if (callback) {
          Meteor.defer(() => {
            callback(null, result);
          });
        }
        return result;
      }
      prepareRemove(selector) {
        const matcher = new Minimongo.Matcher(selector);
        const remove = [];
        this._eachPossiblyMatchingDocSync(selector, (doc, id) => {
          if (matcher.documentMatches(doc).result) {
            remove.push(id);
          }
        });
        const queriesToRecompute = [];
        const queryRemove = [];
        for (let i = 0; i < remove.length; i++) {
          const removeId = remove[i];
          const removeDoc = this._docs.get(removeId);
          Object.keys(this.queries).forEach(qid => {
            const query = this.queries[qid];
            if (query.dirty) {
              return;
            }
            if (query.matcher.documentMatches(removeDoc).result) {
              if (query.cursor.skip || query.cursor.limit) {
                queriesToRecompute.push(qid);
              } else {
                queryRemove.push({
                  qid,
                  doc: removeDoc
                });
              }
            }
          });
          this._saveOriginal(removeId, removeDoc);
          this._docs.remove(removeId);
        }
        return {
          queriesToRecompute,
          queryRemove,
          remove
        };
      }
      remove(selector, callback) {
        // Easy special case: if we're not calling observeChanges callbacks and
        // we're not saving originals and we got asked to remove everything, then
        // just empty everything directly.
        if (this.paused && !this._savedOriginals && EJSON.equals(selector, {})) {
          return this.clearResultQueries(callback);
        }
        const {
          queriesToRecompute,
          queryRemove,
          remove
        } = this.prepareRemove(selector);

        // run live query callbacks _after_ we've removed the documents.
        queryRemove.forEach(remove => {
          const query = this.queries[remove.qid];
          if (query) {
            query.distances && query.distances.remove(remove.doc._id);
            LocalCollection._removeFromResultsSync(query, remove.doc);
          }
        });
        queriesToRecompute.forEach(qid => {
          const query = this.queries[qid];
          if (query) {
            this._recomputeResults(query);
          }
        });
        this._observeQueue.drain();
        const result = remove.length;
        if (callback) {
          Meteor.defer(() => {
            callback(null, result);
          });
        }
        return result;
      }
      async removeAsync(selector, callback) {
        // Easy special case: if we're not calling observeChanges callbacks and
        // we're not saving originals and we got asked to remove everything, then
        // just empty everything directly.
        if (this.paused && !this._savedOriginals && EJSON.equals(selector, {})) {
          return this.clearResultQueries(callback);
        }
        const {
          queriesToRecompute,
          queryRemove,
          remove
        } = this.prepareRemove(selector);

        // run live query callbacks _after_ we've removed the documents.
        for (const remove of queryRemove) {
          const query = this.queries[remove.qid];
          if (query) {
            query.distances && query.distances.remove(remove.doc._id);
            await LocalCollection._removeFromResultsAsync(query, remove.doc);
          }
        }
        queriesToRecompute.forEach(qid => {
          const query = this.queries[qid];
          if (query) {
            this._recomputeResults(query);
          }
        });
        await this._observeQueue.drain();
        const result = remove.length;
        if (callback) {
          Meteor.defer(() => {
            callback(null, result);
          });
        }
        return result;
      }

      // Resume the observers. Observers immediately receive change
      // notifications to bring them to the current state of the
      // database. Note that this is not just replaying all the changes that
      // happened during the pause, it is a smarter 'coalesced' diff.
      _resumeObservers() {
        // No-op if not paused.
        if (!this.paused) {
          return;
        }

        // Unset the 'paused' flag. Make sure to do this first, otherwise
        // observer methods won't actually fire when we trigger them.
        this.paused = false;
        Object.keys(this.queries).forEach(qid => {
          const query = this.queries[qid];
          if (query.dirty) {
            query.dirty = false;

            // re-compute results will perform `LocalCollection._diffQueryChanges`
            // automatically.
            this._recomputeResults(query, query.resultsSnapshot);
          } else {
            // Diff the current results against the snapshot and send to observers.
            // pass the query object for its observer callbacks.
            LocalCollection._diffQueryChanges(query.ordered, query.resultsSnapshot, query.results, query, {
              projectionFn: query.projectionFn
            });
          }
          query.resultsSnapshot = null;
        });
      }
      async resumeObserversServer() {
        this._resumeObservers();
        await this._observeQueue.drain();
      }
      resumeObserversClient() {
        this._resumeObservers();
        this._observeQueue.drain();
      }
      retrieveOriginals() {
        if (!this._savedOriginals) {
          throw new Error('Called retrieveOriginals without saveOriginals');
        }
        const originals = this._savedOriginals;
        this._savedOriginals = null;
        return originals;
      }

      // To track what documents are affected by a piece of code, call
      // saveOriginals() before it and retrieveOriginals() after it.
      // retrieveOriginals returns an object whose keys are the ids of the documents
      // that were affected since the call to saveOriginals(), and the values are
      // equal to the document's contents at the time of saveOriginals. (In the case
      // of an inserted document, undefined is the value.) You must alternate
      // between calls to saveOriginals() and retrieveOriginals().
      saveOriginals() {
        if (this._savedOriginals) {
          throw new Error('Called saveOriginals twice without retrieveOriginals');
        }
        this._savedOriginals = new LocalCollection._IdMap();
      }
      prepareUpdate(selector) {
        // Save the original results of any query that we might need to
        // _recomputeResults on, because _modifyAndNotify will mutate the objects in
        // it. (We don't need to save the original results of paused queries because
        // they already have a resultsSnapshot and we won't be diffing in
        // _recomputeResults.)
        const qidToOriginalResults = {};

        // We should only clone each document once, even if it appears in multiple
        // queries
        const docMap = new LocalCollection._IdMap();
        const idsMatched = LocalCollection._idsMatchedBySelector(selector);
        Object.keys(this.queries).forEach(qid => {
          const query = this.queries[qid];
          if ((query.cursor.skip || query.cursor.limit) && !this.paused) {
            // Catch the case of a reactive `count()` on a cursor with skip
            // or limit, which registers an unordered observe. This is a
            // pretty rare case, so we just clone the entire result set with
            // no optimizations for documents that appear in these result
            // sets and other queries.
            if (query.results instanceof LocalCollection._IdMap) {
              qidToOriginalResults[qid] = query.results.clone();
              return;
            }
            if (!(query.results instanceof Array)) {
              throw new Error('Assertion failed: query.results not an array');
            }

            // Clones a document to be stored in `qidToOriginalResults`
            // because it may be modified before the new and old result sets
            // are diffed. But if we know exactly which document IDs we're
            // going to modify, then we only need to clone those.
            const memoizedCloneIfNeeded = doc => {
              if (docMap.has(doc._id)) {
                return docMap.get(doc._id);
              }
              const docToMemoize = idsMatched && !idsMatched.some(id => EJSON.equals(id, doc._id)) ? doc : EJSON.clone(doc);
              docMap.set(doc._id, docToMemoize);
              return docToMemoize;
            };
            qidToOriginalResults[qid] = query.results.map(memoizedCloneIfNeeded);
          }
        });
        return qidToOriginalResults;
      }
      finishUpdate(_ref) {
        let {
          options,
          updateCount,
          callback,
          insertedId
        } = _ref;
        // Return the number of affected documents, or in the upsert case, an object
        // containing the number of affected docs and the id of the doc that was
        // inserted, if any.
        let result;
        if (options._returnObject) {
          result = {
            numberAffected: updateCount
          };
          if (insertedId !== undefined) {
            result.insertedId = insertedId;
          }
        } else {
          result = updateCount;
        }
        if (callback) {
          Meteor.defer(() => {
            callback(null, result);
          });
        }
        return result;
      }

      // XXX atomicity: if multi is true, and one modification fails, do
      // we rollback the whole operation, or what?
      async updateAsync(selector, mod, options, callback) {
        if (!callback && options instanceof Function) {
          callback = options;
          options = null;
        }
        if (!options) {
          options = {};
        }
        const matcher = new Minimongo.Matcher(selector, true);
        const qidToOriginalResults = this.prepareUpdate(selector);
        let recomputeQids = {};
        let updateCount = 0;
        await this._eachPossiblyMatchingDocAsync(selector, async (doc, id) => {
          const queryResult = matcher.documentMatches(doc);
          if (queryResult.result) {
            // XXX Should we save the original even if mod ends up being a no-op?
            this._saveOriginal(id, doc);
            recomputeQids = await this._modifyAndNotifyAsync(doc, mod, queryResult.arrayIndices);
            ++updateCount;
            if (!options.multi) {
              return false; // break
            }
          }
          return true;
        });
        Object.keys(recomputeQids).forEach(qid => {
          const query = this.queries[qid];
          if (query) {
            this._recomputeResults(query, qidToOriginalResults[qid]);
          }
        });
        await this._observeQueue.drain();

        // If we are doing an upsert, and we didn't modify any documents yet, then
        // it's time to do an insert. Figure out what document we are inserting, and
        // generate an id for it.
        let insertedId;
        if (updateCount === 0 && options.upsert) {
          const doc = LocalCollection._createUpsertDocument(selector, mod);
          if (!doc._id && options.insertedId) {
            doc._id = options.insertedId;
          }
          insertedId = await this.insertAsync(doc);
          updateCount = 1;
        }
        return this.finishUpdate({
          options,
          insertedId,
          updateCount,
          callback
        });
      }
      // XXX atomicity: if multi is true, and one modification fails, do
      // we rollback the whole operation, or what?
      update(selector, mod, options, callback) {
        if (!callback && options instanceof Function) {
          callback = options;
          options = null;
        }
        if (!options) {
          options = {};
        }
        const matcher = new Minimongo.Matcher(selector, true);
        const qidToOriginalResults = this.prepareUpdate(selector);
        let recomputeQids = {};
        let updateCount = 0;
        this._eachPossiblyMatchingDocSync(selector, (doc, id) => {
          const queryResult = matcher.documentMatches(doc);
          if (queryResult.result) {
            // XXX Should we save the original even if mod ends up being a no-op?
            this._saveOriginal(id, doc);
            recomputeQids = this._modifyAndNotifySync(doc, mod, queryResult.arrayIndices);
            ++updateCount;
            if (!options.multi) {
              return false; // break
            }
          }
          return true;
        });
        Object.keys(recomputeQids).forEach(qid => {
          const query = this.queries[qid];
          if (query) {
            this._recomputeResults(query, qidToOriginalResults[qid]);
          }
        });
        this._observeQueue.drain();

        // If we are doing an upsert, and we didn't modify any documents yet, then
        // it's time to do an insert. Figure out what document we are inserting, and
        // generate an id for it.
        let insertedId;
        if (updateCount === 0 && options.upsert) {
          const doc = LocalCollection._createUpsertDocument(selector, mod);
          if (!doc._id && options.insertedId) {
            doc._id = options.insertedId;
          }
          insertedId = this.insert(doc);
          updateCount = 1;
        }
        return this.finishUpdate({
          options,
          insertedId,
          updateCount,
          callback,
          selector,
          mod
        });
      }

      // A convenience wrapper on update. LocalCollection.upsert(sel, mod) is
      // equivalent to LocalCollection.update(sel, mod, {upsert: true,
      // _returnObject: true}).
      upsert(selector, mod, options, callback) {
        if (!callback && typeof options === 'function') {
          callback = options;
          options = {};
        }
        return this.update(selector, mod, Object.assign({}, options, {
          upsert: true,
          _returnObject: true
        }), callback);
      }
      upsertAsync(selector, mod, options, callback) {
        if (!callback && typeof options === 'function') {
          callback = options;
          options = {};
        }
        return this.updateAsync(selector, mod, Object.assign({}, options, {
          upsert: true,
          _returnObject: true
        }), callback);
      }

      // Iterates over a subset of documents that could match selector; calls
      // fn(doc, id) on each of them.  Specifically, if selector specifies
      // specific _id's, it only looks at those.  doc is *not* cloned: it is the
      // same object that is in _docs.
      async _eachPossiblyMatchingDocAsync(selector, fn) {
        const specificIds = LocalCollection._idsMatchedBySelector(selector);
        if (specificIds) {
          for (const id of specificIds) {
            const doc = this._docs.get(id);
            if (doc && !(await fn(doc, id))) {
              break;
            }
          }
        } else {
          await this._docs.forEachAsync(fn);
        }
      }
      _eachPossiblyMatchingDocSync(selector, fn) {
        const specificIds = LocalCollection._idsMatchedBySelector(selector);
        if (specificIds) {
          for (const id of specificIds) {
            const doc = this._docs.get(id);
            if (doc && !fn(doc, id)) {
              break;
            }
          }
        } else {
          this._docs.forEach(fn);
        }
      }
      _getMatchedDocAndModify(doc, mod, arrayIndices) {
        const matched_before = {};
        Object.keys(this.queries).forEach(qid => {
          const query = this.queries[qid];
          if (query.dirty) {
            return;
          }
          if (query.ordered) {
            matched_before[qid] = query.matcher.documentMatches(doc).result;
          } else {
            // Because we don't support skip or limit (yet) in unordered queries, we
            // can just do a direct lookup.
            matched_before[qid] = query.results.has(doc._id);
          }
        });
        return matched_before;
      }
      _modifyAndNotifySync(doc, mod, arrayIndices) {
        const matched_before = this._getMatchedDocAndModify(doc, mod, arrayIndices);
        const old_doc = EJSON.clone(doc);
        LocalCollection._modify(doc, mod, {
          arrayIndices
        });
        const recomputeQids = {};
        for (const qid of Object.keys(this.queries)) {
          const query = this.queries[qid];
          if (query.dirty) {
            continue;
          }
          const afterMatch = query.matcher.documentMatches(doc);
          const after = afterMatch.result;
          const before = matched_before[qid];
          if (after && query.distances && afterMatch.distance !== undefined) {
            query.distances.set(doc._id, afterMatch.distance);
          }
          if (query.cursor.skip || query.cursor.limit) {
            // We need to recompute any query where the doc may have been in the
            // cursor's window either before or after the update. (Note that if skip
            // or limit is set, "before" and "after" being true do not necessarily
            // mean that the document is in the cursor's output after skip/limit is
            // applied... but if they are false, then the document definitely is NOT
            // in the output. So it's safe to skip recompute if neither before or
            // after are true.)
            if (before || after) {
              recomputeQids[qid] = true;
            }
          } else if (before && !after) {
            LocalCollection._removeFromResultsSync(query, doc);
          } else if (!before && after) {
            LocalCollection._insertInResultsSync(query, doc);
          } else if (before && after) {
            LocalCollection._updateInResultsSync(query, doc, old_doc);
          }
        }
        return recomputeQids;
      }
      async _modifyAndNotifyAsync(doc, mod, arrayIndices) {
        const matched_before = this._getMatchedDocAndModify(doc, mod, arrayIndices);
        const old_doc = EJSON.clone(doc);
        LocalCollection._modify(doc, mod, {
          arrayIndices
        });
        const recomputeQids = {};
        for (const qid of Object.keys(this.queries)) {
          const query = this.queries[qid];
          if (query.dirty) {
            continue;
          }
          const afterMatch = query.matcher.documentMatches(doc);
          const after = afterMatch.result;
          const before = matched_before[qid];
          if (after && query.distances && afterMatch.distance !== undefined) {
            query.distances.set(doc._id, afterMatch.distance);
          }
          if (query.cursor.skip || query.cursor.limit) {
            // We need to recompute any query where the doc may have been in the
            // cursor's window either before or after the update. (Note that if skip
            // or limit is set, "before" and "after" being true do not necessarily
            // mean that the document is in the cursor's output after skip/limit is
            // applied... but if they are false, then the document definitely is NOT
            // in the output. So it's safe to skip recompute if neither before or
            // after are true.)
            if (before || after) {
              recomputeQids[qid] = true;
            }
          } else if (before && !after) {
            await LocalCollection._removeFromResultsAsync(query, doc);
          } else if (!before && after) {
            await LocalCollection._insertInResultsAsync(query, doc);
          } else if (before && after) {
            await LocalCollection._updateInResultsAsync(query, doc, old_doc);
          }
        }
        return recomputeQids;
      }

      // Recomputes the results of a query and runs observe callbacks for the
      // difference between the previous results and the current results (unless
      // paused). Used for skip/limit queries.
      //
      // When this is used by insert or remove, it can just use query.results for
      // the old results (and there's no need to pass in oldResults), because these
      // operations don't mutate the documents in the collection. Update needs to
      // pass in an oldResults which was deep-copied before the modifier was
      // applied.
      //
      // oldResults is guaranteed to be ignored if the query is not paused.
      _recomputeResults(query, oldResults) {
        if (this.paused) {
          // There's no reason to recompute the results now as we're still paused.
          // By flagging the query as "dirty", the recompute will be performed
          // when resumeObservers is called.
          query.dirty = true;
          return;
        }
        if (!this.paused && !oldResults) {
          oldResults = query.results;
        }
        if (query.distances) {
          query.distances.clear();
        }
        query.results = query.cursor._getRawObjects({
          distances: query.distances,
          ordered: query.ordered
        });
        if (!this.paused) {
          LocalCollection._diffQueryChanges(query.ordered, oldResults, query.results, query, {
            projectionFn: query.projectionFn
          });
        }
      }
      _saveOriginal(id, doc) {
        // Are we even trying to save originals?
        if (!this._savedOriginals) {
          return;
        }

        // Have we previously mutated the original (and so 'doc' is not actually
        // original)?  (Note the 'has' check rather than truth: we store undefined
        // here for inserted docs!)
        if (this._savedOriginals.has(id)) {
          return;
        }
        this._savedOriginals.set(id, EJSON.clone(doc));
      }
    }
    LocalCollection.Cursor = Cursor;
    LocalCollection.ObserveHandle = ObserveHandle;

    // XXX maybe move these into another ObserveHelpers package or something

    // _CachingChangeObserver is an object which receives observeChanges callbacks
    // and keeps a cache of the current cursor state up to date in this.docs. Users
    // of this class should read the docs field but not modify it. You should pass
    // the "applyChange" field as the callbacks to the underlying observeChanges
    // call. Optionally, you can specify your own observeChanges callbacks which are
    // invoked immediately before the docs field is updated; this object is made
    // available as `this` to those callbacks.
    LocalCollection._CachingChangeObserver = class _CachingChangeObserver {
      constructor() {
        let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        const orderedFromCallbacks = options.callbacks && LocalCollection._observeChangesCallbacksAreOrdered(options.callbacks);
        if (hasOwn.call(options, 'ordered')) {
          this.ordered = options.ordered;
          if (options.callbacks && options.ordered !== orderedFromCallbacks) {
            throw Error('ordered option doesn\'t match callbacks');
          }
        } else if (options.callbacks) {
          this.ordered = orderedFromCallbacks;
        } else {
          throw Error('must provide ordered or callbacks');
        }
        const callbacks = options.callbacks || {};
        if (this.ordered) {
          this.docs = new OrderedDict(MongoID.idStringify);
          this.applyChange = {
            addedBefore: (id, fields, before) => {
              // Take a shallow copy since the top-level properties can be changed
              const doc = _objectSpread({}, fields);
              doc._id = id;
              if (callbacks.addedBefore) {
                callbacks.addedBefore.call(this, id, EJSON.clone(fields), before);
              }

              // This line triggers if we provide added with movedBefore.
              if (callbacks.added) {
                callbacks.added.call(this, id, EJSON.clone(fields));
              }

              // XXX could `before` be a falsy ID?  Technically
              // idStringify seems to allow for them -- though
              // OrderedDict won't call stringify on a falsy arg.
              this.docs.putBefore(id, doc, before || null);
            },
            movedBefore: (id, before) => {
              if (callbacks.movedBefore) {
                callbacks.movedBefore.call(this, id, before);
              }
              this.docs.moveBefore(id, before || null);
            }
          };
        } else {
          this.docs = new LocalCollection._IdMap();
          this.applyChange = {
            added: (id, fields) => {
              // Take a shallow copy since the top-level properties can be changed
              const doc = _objectSpread({}, fields);
              if (callbacks.added) {
                callbacks.added.call(this, id, EJSON.clone(fields));
              }
              doc._id = id;
              this.docs.set(id, doc);
            }
          };
        }

        // The methods in _IdMap and OrderedDict used by these callbacks are
        // identical.
        this.applyChange.changed = (id, fields) => {
          const doc = this.docs.get(id);
          if (!doc) {
            throw new Error("Unknown id for changed: ".concat(id));
          }
          if (callbacks.changed) {
            callbacks.changed.call(this, id, EJSON.clone(fields));
          }
          DiffSequence.applyChanges(doc, fields);
        };
        this.applyChange.removed = id => {
          if (callbacks.removed) {
            callbacks.removed.call(this, id);
          }
          this.docs.remove(id);
        };
      }
    };
    LocalCollection._IdMap = class _IdMap extends IdMap {
      constructor() {
        super(MongoID.idStringify, MongoID.idParse);
      }
    };

    // Wrap a transform function to return objects that have the _id field
    // of the untransformed document. This ensures that subsystems such as
    // the observe-sequence package that call `observe` can keep track of
    // the documents identities.
    //
    // - Require that it returns objects
    // - If the return value has an _id field, verify that it matches the
    //   original _id field
    // - If the return value doesn't have an _id field, add it back.
    LocalCollection.wrapTransform = transform => {
      if (!transform) {
        return null;
      }

      // No need to doubly-wrap transforms.
      if (transform.__wrappedTransform__) {
        return transform;
      }
      const wrapped = doc => {
        if (!hasOwn.call(doc, '_id')) {
          // XXX do we ever have a transform on the oplog's collection? because that
          // collection has no _id.
          throw new Error('can only transform documents with _id');
        }
        const id = doc._id;

        // XXX consider making tracker a weak dependency and checking
        // Package.tracker here
        const transformed = Tracker.nonreactive(() => transform(doc));
        if (!LocalCollection._isPlainObject(transformed)) {
          throw new Error('transform must return object');
        }
        if (hasOwn.call(transformed, '_id')) {
          if (!EJSON.equals(transformed._id, id)) {
            throw new Error('transformed document can\'t have different _id');
          }
        } else {
          transformed._id = id;
        }
        return transformed;
      };
      wrapped.__wrappedTransform__ = true;
      return wrapped;
    };

    // XXX the sorted-query logic below is laughably inefficient. we'll
    // need to come up with a better datastructure for this.
    //
    // XXX the logic for observing with a skip or a limit is even more
    // laughably inefficient. we recompute the whole results every time!

    // This binary search puts a value between any equal values, and the first
    // lesser value.
    LocalCollection._binarySearch = (cmp, array, value) => {
      let first = 0;
      let range = array.length;
      while (range > 0) {
        const halfRange = Math.floor(range / 2);
        if (cmp(value, array[first + halfRange]) >= 0) {
          first += halfRange + 1;
          range -= halfRange + 1;
        } else {
          range = halfRange;
        }
      }
      return first;
    };
    LocalCollection._checkSupportedProjection = fields => {
      if (fields !== Object(fields) || Array.isArray(fields)) {
        throw MinimongoError('fields option must be an object');
      }
      Object.keys(fields).forEach(keyPath => {
        if (keyPath.split('.').includes('$')) {
          throw MinimongoError('Minimongo doesn\'t support $ operator in projections yet.');
        }
        const value = fields[keyPath];
        if (typeof value === 'object' && ['$elemMatch', '$meta', '$slice'].some(key => hasOwn.call(value, key))) {
          throw MinimongoError('Minimongo doesn\'t support operators in projections yet.');
        }
        if (![1, 0, true, false].includes(value)) {
          throw MinimongoError('Projection values should be one of 1, 0, true, or false');
        }
      });
    };

    // Knows how to compile a fields projection to a predicate function.
    // @returns - Function: a closure that filters out an object according to the
    //            fields projection rules:
    //            @param obj - Object: MongoDB-styled document
    //            @returns - Object: a document with the fields filtered out
    //                       according to projection rules. Doesn't retain subfields
    //                       of passed argument.
    LocalCollection._compileProjection = fields => {
      LocalCollection._checkSupportedProjection(fields);
      const _idProjection = fields._id === undefined ? true : fields._id;
      const details = projectionDetails(fields);

      // returns transformed doc according to ruleTree
      const transform = (doc, ruleTree) => {
        // Special case for "sets"
        if (Array.isArray(doc)) {
          return doc.map(subdoc => transform(subdoc, ruleTree));
        }
        const result = details.including ? {} : EJSON.clone(doc);
        Object.keys(ruleTree).forEach(key => {
          if (doc == null || !hasOwn.call(doc, key)) {
            return;
          }
          const rule = ruleTree[key];
          if (rule === Object(rule)) {
            // For sub-objects/subsets we branch
            if (doc[key] === Object(doc[key])) {
              result[key] = transform(doc[key], rule);
            }
          } else if (details.including) {
            // Otherwise we don't even touch this subfield
            result[key] = EJSON.clone(doc[key]);
          } else {
            delete result[key];
          }
        });
        return doc != null ? result : doc;
      };
      return doc => {
        const result = transform(doc, details.tree);
        if (_idProjection && hasOwn.call(doc, '_id')) {
          result._id = doc._id;
        }
        if (!_idProjection && hasOwn.call(result, '_id')) {
          delete result._id;
        }
        return result;
      };
    };

    // Calculates the document to insert in case we're doing an upsert and the
    // selector does not match any elements
    LocalCollection._createUpsertDocument = (selector, modifier) => {
      const selectorDocument = populateDocumentWithQueryFields(selector);
      const isModify = LocalCollection._isModificationMod(modifier);
      const newDoc = {};
      if (selectorDocument._id) {
        newDoc._id = selectorDocument._id;
        delete selectorDocument._id;
      }

      // This double _modify call is made to help with nested properties (see issue
      // #8631). We do this even if it's a replacement for validation purposes (e.g.
      // ambiguous id's)
      LocalCollection._modify(newDoc, {
        $set: selectorDocument
      });
      LocalCollection._modify(newDoc, modifier, {
        isInsert: true
      });
      if (isModify) {
        return newDoc;
      }

      // Replacement can take _id from query document
      const replacement = Object.assign({}, modifier);
      if (newDoc._id) {
        replacement._id = newDoc._id;
      }
      return replacement;
    };
    LocalCollection._diffObjects = (left, right, callbacks) => {
      return DiffSequence.diffObjects(left, right, callbacks);
    };

    // ordered: bool.
    // old_results and new_results: collections of documents.
    //    if ordered, they are arrays.
    //    if unordered, they are IdMaps
    LocalCollection._diffQueryChanges = (ordered, oldResults, newResults, observer, options) => DiffSequence.diffQueryChanges(ordered, oldResults, newResults, observer, options);
    LocalCollection._diffQueryOrderedChanges = (oldResults, newResults, observer, options) => DiffSequence.diffQueryOrderedChanges(oldResults, newResults, observer, options);
    LocalCollection._diffQueryUnorderedChanges = (oldResults, newResults, observer, options) => DiffSequence.diffQueryUnorderedChanges(oldResults, newResults, observer, options);
    LocalCollection._findInOrderedResults = (query, doc) => {
      if (!query.ordered) {
        throw new Error('Can\'t call _findInOrderedResults on unordered query');
      }
      for (let i = 0; i < query.results.length; i++) {
        if (query.results[i] === doc) {
          return i;
        }
      }
      throw Error('object missing from query');
    };

    // If this is a selector which explicitly constrains the match by ID to a finite
    // number of documents, returns a list of their IDs.  Otherwise returns
    // null. Note that the selector may have other restrictions so it may not even
    // match those document!  We care about $in and $and since those are generated
    // access-controlled update and remove.
    LocalCollection._idsMatchedBySelector = selector => {
      // Is the selector just an ID?
      if (LocalCollection._selectorIsId(selector)) {
        return [selector];
      }
      if (!selector) {
        return null;
      }

      // Do we have an _id clause?
      if (hasOwn.call(selector, '_id')) {
        // Is the _id clause just an ID?
        if (LocalCollection._selectorIsId(selector._id)) {
          return [selector._id];
        }

        // Is the _id clause {_id: {$in: ["x", "y", "z"]}}?
        if (selector._id && Array.isArray(selector._id.$in) && selector._id.$in.length && selector._id.$in.every(LocalCollection._selectorIsId)) {
          return selector._id.$in;
        }
        return null;
      }

      // If this is a top-level $and, and any of the clauses constrain their
      // documents, then the whole selector is constrained by any one clause's
      // constraint. (Well, by their intersection, but that seems unlikely.)
      if (Array.isArray(selector.$and)) {
        for (let i = 0; i < selector.$and.length; ++i) {
          const subIds = LocalCollection._idsMatchedBySelector(selector.$and[i]);
          if (subIds) {
            return subIds;
          }
        }
      }
      return null;
    };
    LocalCollection._insertInResultsSync = (query, doc) => {
      const fields = EJSON.clone(doc);
      delete fields._id;
      if (query.ordered) {
        if (!query.sorter) {
          query.addedBefore(doc._id, query.projectionFn(fields), null);
          query.results.push(doc);
        } else {
          const i = LocalCollection._insertInSortedList(query.sorter.getComparator({
            distances: query.distances
          }), query.results, doc);
          let next = query.results[i + 1];
          if (next) {
            next = next._id;
          } else {
            next = null;
          }
          query.addedBefore(doc._id, query.projectionFn(fields), next);
        }
        query.added(doc._id, query.projectionFn(fields));
      } else {
        query.added(doc._id, query.projectionFn(fields));
        query.results.set(doc._id, doc);
      }
    };
    LocalCollection._insertInResultsAsync = async (query, doc) => {
      const fields = EJSON.clone(doc);
      delete fields._id;
      if (query.ordered) {
        if (!query.sorter) {
          await query.addedBefore(doc._id, query.projectionFn(fields), null);
          query.results.push(doc);
        } else {
          const i = LocalCollection._insertInSortedList(query.sorter.getComparator({
            distances: query.distances
          }), query.results, doc);
          let next = query.results[i + 1];
          if (next) {
            next = next._id;
          } else {
            next = null;
          }
          await query.addedBefore(doc._id, query.projectionFn(fields), next);
        }
        await query.added(doc._id, query.projectionFn(fields));
      } else {
        await query.added(doc._id, query.projectionFn(fields));
        query.results.set(doc._id, doc);
      }
    };
    LocalCollection._insertInSortedList = (cmp, array, value) => {
      if (array.length === 0) {
        array.push(value);
        return 0;
      }
      const i = LocalCollection._binarySearch(cmp, array, value);
      array.splice(i, 0, value);
      return i;
    };
    LocalCollection._isModificationMod = mod => {
      let isModify = false;
      let isReplace = false;
      Object.keys(mod).forEach(key => {
        if (key.substr(0, 1) === '$') {
          isModify = true;
        } else {
          isReplace = true;
        }
      });
      if (isModify && isReplace) {
        throw new Error('Update parameter cannot have both modifier and non-modifier fields.');
      }
      return isModify;
    };

    // XXX maybe this should be EJSON.isObject, though EJSON doesn't know about
    // RegExp
    // XXX note that _type(undefined) === 3!!!!
    LocalCollection._isPlainObject = x => {
      return x && LocalCollection._f._type(x) === 3;
    };

    // XXX need a strategy for passing the binding of $ into this
    // function, from the compiled selector
    //
    // maybe just {key.up.to.just.before.dollarsign: array_index}
    //
    // XXX atomicity: if one modification fails, do we roll back the whole
    // change?
    //
    // options:
    //   - isInsert is set when _modify is being called to compute the document to
    //     insert as part of an upsert operation. We use this primarily to figure
    //     out when to set the fields in $setOnInsert, if present.
    LocalCollection._modify = function (doc, modifier) {
      let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      if (!LocalCollection._isPlainObject(modifier)) {
        throw MinimongoError('Modifier must be an object');
      }

      // Make sure the caller can't mutate our data structures.
      modifier = EJSON.clone(modifier);
      const isModifier = isOperatorObject(modifier);
      const newDoc = isModifier ? EJSON.clone(doc) : modifier;
      if (isModifier) {
        // apply modifiers to the doc.
        Object.keys(modifier).forEach(operator => {
          // Treat $setOnInsert as $set if this is an insert.
          const setOnInsert = options.isInsert && operator === '$setOnInsert';
          const modFunc = MODIFIERS[setOnInsert ? '$set' : operator];
          const operand = modifier[operator];
          if (!modFunc) {
            throw MinimongoError("Invalid modifier specified ".concat(operator));
          }
          Object.keys(operand).forEach(keypath => {
            const arg = operand[keypath];
            if (keypath === '') {
              throw MinimongoError('An empty update path is not valid.');
            }
            const keyparts = keypath.split('.');
            if (!keyparts.every(Boolean)) {
              throw MinimongoError("The update path '".concat(keypath, "' contains an empty field name, ") + 'which is not allowed.');
            }
            const target = findModTarget(newDoc, keyparts, {
              arrayIndices: options.arrayIndices,
              forbidArray: operator === '$rename',
              noCreate: NO_CREATE_MODIFIERS[operator]
            });
            modFunc(target, keyparts.pop(), arg, keypath, newDoc);
          });
        });
        if (doc._id && !EJSON.equals(doc._id, newDoc._id)) {
          throw MinimongoError("After applying the update to the document {_id: \"".concat(doc._id, "\", ...},") + ' the (immutable) field \'_id\' was found to have been altered to ' + "_id: \"".concat(newDoc._id, "\""));
        }
      } else {
        if (doc._id && modifier._id && !EJSON.equals(doc._id, modifier._id)) {
          throw MinimongoError("The _id field cannot be changed from {_id: \"".concat(doc._id, "\"} to ") + "{_id: \"".concat(modifier._id, "\"}"));
        }

        // replace the whole document
        assertHasValidFieldNames(modifier);
      }

      // move new document into place.
      Object.keys(doc).forEach(key => {
        // Note: this used to be for (var key in doc) however, this does not
        // work right in Opera. Deleting from a doc while iterating over it
        // would sometimes cause opera to skip some keys.
        if (key !== '_id') {
          delete doc[key];
        }
      });
      Object.keys(newDoc).forEach(key => {
        doc[key] = newDoc[key];
      });
    };
    LocalCollection._observeFromObserveChanges = (cursor, observeCallbacks) => {
      const transform = cursor.getTransform() || (doc => doc);
      let suppressed = !!observeCallbacks._suppress_initial;
      let observeChangesCallbacks;
      if (LocalCollection._observeCallbacksAreOrdered(observeCallbacks)) {
        // The "_no_indices" option sets all index arguments to -1 and skips the
        // linear scans required to generate them.  This lets observers that don't
        // need absolute indices benefit from the other features of this API --
        // relative order, transforms, and applyChanges -- without the speed hit.
        const indices = !observeCallbacks._no_indices;
        observeChangesCallbacks = {
          addedBefore(id, fields, before) {
            const check = suppressed || !(observeCallbacks.addedAt || observeCallbacks.added);
            if (check) {
              return;
            }
            const doc = transform(Object.assign(fields, {
              _id: id
            }));
            if (observeCallbacks.addedAt) {
              observeCallbacks.addedAt(doc, indices ? before ? this.docs.indexOf(before) : this.docs.size() : -1, before);
            } else {
              observeCallbacks.added(doc);
            }
          },
          changed(id, fields) {
            if (!(observeCallbacks.changedAt || observeCallbacks.changed)) {
              return;
            }
            let doc = EJSON.clone(this.docs.get(id));
            if (!doc) {
              throw new Error("Unknown id for changed: ".concat(id));
            }
            const oldDoc = transform(EJSON.clone(doc));
            DiffSequence.applyChanges(doc, fields);
            if (observeCallbacks.changedAt) {
              observeCallbacks.changedAt(transform(doc), oldDoc, indices ? this.docs.indexOf(id) : -1);
            } else {
              observeCallbacks.changed(transform(doc), oldDoc);
            }
          },
          movedBefore(id, before) {
            if (!observeCallbacks.movedTo) {
              return;
            }
            const from = indices ? this.docs.indexOf(id) : -1;
            let to = indices ? before ? this.docs.indexOf(before) : this.docs.size() : -1;

            // When not moving backwards, adjust for the fact that removing the
            // document slides everything back one slot.
            if (to > from) {
              --to;
            }
            observeCallbacks.movedTo(transform(EJSON.clone(this.docs.get(id))), from, to, before || null);
          },
          removed(id) {
            if (!(observeCallbacks.removedAt || observeCallbacks.removed)) {
              return;
            }

            // technically maybe there should be an EJSON.clone here, but it's about
            // to be removed from this.docs!
            const doc = transform(this.docs.get(id));
            if (observeCallbacks.removedAt) {
              observeCallbacks.removedAt(doc, indices ? this.docs.indexOf(id) : -1);
            } else {
              observeCallbacks.removed(doc);
            }
          }
        };
      } else {
        observeChangesCallbacks = {
          added(id, fields) {
            if (!suppressed && observeCallbacks.added) {
              observeCallbacks.added(transform(Object.assign(fields, {
                _id: id
              })));
            }
          },
          changed(id, fields) {
            if (observeCallbacks.changed) {
              const oldDoc = this.docs.get(id);
              const doc = EJSON.clone(oldDoc);
              DiffSequence.applyChanges(doc, fields);
              observeCallbacks.changed(transform(doc), transform(EJSON.clone(oldDoc)));
            }
          },
          removed(id) {
            if (observeCallbacks.removed) {
              observeCallbacks.removed(transform(this.docs.get(id)));
            }
          }
        };
      }
      const changeObserver = new LocalCollection._CachingChangeObserver({
        callbacks: observeChangesCallbacks
      });

      // CachingChangeObserver clones all received input on its callbacks
      // So we can mark it as safe to reduce the ejson clones.
      // This is tested by the `mongo-livedata - (extended) scribbling` tests
      changeObserver.applyChange._fromObserve = true;
      const handle = cursor.observeChanges(changeObserver.applyChange, {
        nonMutatingCallbacks: true
      });

      // If needed, re-enable callbacks as soon as the initial batch is ready.
      const setSuppressed = h => {
        var _h$isReadyPromise;
        if (h.isReady) suppressed = false;else (_h$isReadyPromise = h.isReadyPromise) === null || _h$isReadyPromise === void 0 ? void 0 : _h$isReadyPromise.then(() => suppressed = false);
      };
      // When we call cursor.observeChanges() it can be the on from
      // the mongo package (instead of the minimongo one) and it doesn't have isReady and isReadyPromise
      if (Meteor._isPromise(handle)) {
        handle.then(setSuppressed);
      } else {
        setSuppressed(handle);
      }
      return handle;
    };
    LocalCollection._observeCallbacksAreOrdered = callbacks => {
      if (callbacks.added && callbacks.addedAt) {
        throw new Error('Please specify only one of added() and addedAt()');
      }
      if (callbacks.changed && callbacks.changedAt) {
        throw new Error('Please specify only one of changed() and changedAt()');
      }
      if (callbacks.removed && callbacks.removedAt) {
        throw new Error('Please specify only one of removed() and removedAt()');
      }
      return !!(callbacks.addedAt || callbacks.changedAt || callbacks.movedTo || callbacks.removedAt);
    };
    LocalCollection._observeChangesCallbacksAreOrdered = callbacks => {
      if (callbacks.added && callbacks.addedBefore) {
        throw new Error('Please specify only one of added() and addedBefore()');
      }
      return !!(callbacks.addedBefore || callbacks.movedBefore);
    };
    LocalCollection._removeFromResultsSync = (query, doc) => {
      if (query.ordered) {
        const i = LocalCollection._findInOrderedResults(query, doc);
        query.removed(doc._id);
        query.results.splice(i, 1);
      } else {
        const id = doc._id; // in case callback mutates doc

        query.removed(doc._id);
        query.results.remove(id);
      }
    };
    LocalCollection._removeFromResultsAsync = async (query, doc) => {
      if (query.ordered) {
        const i = LocalCollection._findInOrderedResults(query, doc);
        await query.removed(doc._id);
        query.results.splice(i, 1);
      } else {
        const id = doc._id; // in case callback mutates doc

        await query.removed(doc._id);
        query.results.remove(id);
      }
    };

    // Is this selector just shorthand for lookup by _id?
    LocalCollection._selectorIsId = selector => typeof selector === 'number' || typeof selector === 'string' || selector instanceof MongoID.ObjectID;

    // Is the selector just lookup by _id (shorthand or not)?
    LocalCollection._selectorIsIdPerhapsAsObject = selector => LocalCollection._selectorIsId(selector) || LocalCollection._selectorIsId(selector && selector._id) && Object.keys(selector).length === 1;
    LocalCollection._updateInResultsSync = (query, doc, old_doc) => {
      if (!EJSON.equals(doc._id, old_doc._id)) {
        throw new Error('Can\'t change a doc\'s _id while updating');
      }
      const projectionFn = query.projectionFn;
      const changedFields = DiffSequence.makeChangedFields(projectionFn(doc), projectionFn(old_doc));
      if (!query.ordered) {
        if (Object.keys(changedFields).length) {
          query.changed(doc._id, changedFields);
          query.results.set(doc._id, doc);
        }
        return;
      }
      const old_idx = LocalCollection._findInOrderedResults(query, doc);
      if (Object.keys(changedFields).length) {
        query.changed(doc._id, changedFields);
      }
      if (!query.sorter) {
        return;
      }

      // just take it out and put it back in again, and see if the index changes
      query.results.splice(old_idx, 1);
      const new_idx = LocalCollection._insertInSortedList(query.sorter.getComparator({
        distances: query.distances
      }), query.results, doc);
      if (old_idx !== new_idx) {
        let next = query.results[new_idx + 1];
        if (next) {
          next = next._id;
        } else {
          next = null;
        }
        query.movedBefore && query.movedBefore(doc._id, next);
      }
    };
    LocalCollection._updateInResultsAsync = async (query, doc, old_doc) => {
      if (!EJSON.equals(doc._id, old_doc._id)) {
        throw new Error('Can\'t change a doc\'s _id while updating');
      }
      const projectionFn = query.projectionFn;
      const changedFields = DiffSequence.makeChangedFields(projectionFn(doc), projectionFn(old_doc));
      if (!query.ordered) {
        if (Object.keys(changedFields).length) {
          await query.changed(doc._id, changedFields);
          query.results.set(doc._id, doc);
        }
        return;
      }
      const old_idx = LocalCollection._findInOrderedResults(query, doc);
      if (Object.keys(changedFields).length) {
        await query.changed(doc._id, changedFields);
      }
      if (!query.sorter) {
        return;
      }

      // just take it out and put it back in again, and see if the index changes
      query.results.splice(old_idx, 1);
      const new_idx = LocalCollection._insertInSortedList(query.sorter.getComparator({
        distances: query.distances
      }), query.results, doc);
      if (old_idx !== new_idx) {
        let next = query.results[new_idx + 1];
        if (next) {
          next = next._id;
        } else {
          next = null;
        }
        query.movedBefore && (await query.movedBefore(doc._id, next));
      }
    };
    const MODIFIERS = {
      $currentDate(target, field, arg) {
        if (typeof arg === 'object' && hasOwn.call(arg, '$type')) {
          if (arg.$type !== 'date') {
            throw MinimongoError('Minimongo does currently only support the date type in ' + '$currentDate modifiers', {
              field
            });
          }
        } else if (arg !== true) {
          throw MinimongoError('Invalid $currentDate modifier', {
            field
          });
        }
        target[field] = new Date();
      },
      $inc(target, field, arg) {
        if (typeof arg !== 'number') {
          throw MinimongoError('Modifier $inc allowed for numbers only', {
            field
          });
        }
        if (field in target) {
          if (typeof target[field] !== 'number') {
            throw MinimongoError('Cannot apply $inc modifier to non-number', {
              field
            });
          }
          target[field] += arg;
        } else {
          target[field] = arg;
        }
      },
      $min(target, field, arg) {
        if (typeof arg !== 'number') {
          throw MinimongoError('Modifier $min allowed for numbers only', {
            field
          });
        }
        if (field in target) {
          if (typeof target[field] !== 'number') {
            throw MinimongoError('Cannot apply $min modifier to non-number', {
              field
            });
          }
          if (target[field] > arg) {
            target[field] = arg;
          }
        } else {
          target[field] = arg;
        }
      },
      $max(target, field, arg) {
        if (typeof arg !== 'number') {
          throw MinimongoError('Modifier $max allowed for numbers only', {
            field
          });
        }
        if (field in target) {
          if (typeof target[field] !== 'number') {
            throw MinimongoError('Cannot apply $max modifier to non-number', {
              field
            });
          }
          if (target[field] < arg) {
            target[field] = arg;
          }
        } else {
          target[field] = arg;
        }
      },
      $mul(target, field, arg) {
        if (typeof arg !== 'number') {
          throw MinimongoError('Modifier $mul allowed for numbers only', {
            field
          });
        }
        if (field in target) {
          if (typeof target[field] !== 'number') {
            throw MinimongoError('Cannot apply $mul modifier to non-number', {
              field
            });
          }
          target[field] *= arg;
        } else {
          target[field] = 0;
        }
      },
      $rename(target, field, arg, keypath, doc) {
        // no idea why mongo has this restriction..
        if (keypath === arg) {
          throw MinimongoError('$rename source must differ from target', {
            field
          });
        }
        if (target === null) {
          throw MinimongoError('$rename source field invalid', {
            field
          });
        }
        if (typeof arg !== 'string') {
          throw MinimongoError('$rename target must be a string', {
            field
          });
        }
        if (arg.includes('\0')) {
          // Null bytes are not allowed in Mongo field names
          // https://docs.mongodb.com/manual/reference/limits/#Restrictions-on-Field-Names
          throw MinimongoError('The \'to\' field for $rename cannot contain an embedded null byte', {
            field
          });
        }
        if (target === undefined) {
          return;
        }
        const object = target[field];
        delete target[field];
        const keyparts = arg.split('.');
        const target2 = findModTarget(doc, keyparts, {
          forbidArray: true
        });
        if (target2 === null) {
          throw MinimongoError('$rename target field invalid', {
            field
          });
        }
        target2[keyparts.pop()] = object;
      },
      $set(target, field, arg) {
        if (target !== Object(target)) {
          // not an array or an object
          const error = MinimongoError('Cannot set property on non-object field', {
            field
          });
          error.setPropertyError = true;
          throw error;
        }
        if (target === null) {
          const error = MinimongoError('Cannot set property on null', {
            field
          });
          error.setPropertyError = true;
          throw error;
        }
        assertHasValidFieldNames(arg);
        target[field] = arg;
      },
      $setOnInsert(target, field, arg) {
        // converted to `$set` in `_modify`
      },
      $unset(target, field, arg) {
        if (target !== undefined) {
          if (target instanceof Array) {
            if (field in target) {
              target[field] = null;
            }
          } else {
            delete target[field];
          }
        }
      },
      $push(target, field, arg) {
        if (target[field] === undefined) {
          target[field] = [];
        }
        if (!(target[field] instanceof Array)) {
          throw MinimongoError('Cannot apply $push modifier to non-array', {
            field
          });
        }
        if (!(arg && arg.$each)) {
          // Simple mode: not $each
          assertHasValidFieldNames(arg);
          target[field].push(arg);
          return;
        }

        // Fancy mode: $each (and maybe $slice and $sort and $position)
        const toPush = arg.$each;
        if (!(toPush instanceof Array)) {
          throw MinimongoError('$each must be an array', {
            field
          });
        }
        assertHasValidFieldNames(toPush);

        // Parse $position
        let position = undefined;
        if ('$position' in arg) {
          if (typeof arg.$position !== 'number') {
            throw MinimongoError('$position must be a numeric value', {
              field
            });
          }

          // XXX should check to make sure integer
          if (arg.$position < 0) {
            throw MinimongoError('$position in $push must be zero or positive', {
              field
            });
          }
          position = arg.$position;
        }

        // Parse $slice.
        let slice = undefined;
        if ('$slice' in arg) {
          if (typeof arg.$slice !== 'number') {
            throw MinimongoError('$slice must be a numeric value', {
              field
            });
          }

          // XXX should check to make sure integer
          slice = arg.$slice;
        }

        // Parse $sort.
        let sortFunction = undefined;
        if (arg.$sort) {
          if (slice === undefined) {
            throw MinimongoError('$sort requires $slice to be present', {
              field
            });
          }

          // XXX this allows us to use a $sort whose value is an array, but that's
          // actually an extension of the Node driver, so it won't work
          // server-side. Could be confusing!
          // XXX is it correct that we don't do geo-stuff here?
          sortFunction = new Minimongo.Sorter(arg.$sort).getComparator();
          toPush.forEach(element => {
            if (LocalCollection._f._type(element) !== 3) {
              throw MinimongoError('$push like modifiers using $sort require all elements to be ' + 'objects', {
                field
              });
            }
          });
        }

        // Actually push.
        if (position === undefined) {
          toPush.forEach(element => {
            target[field].push(element);
          });
        } else {
          const spliceArguments = [position, 0];
          toPush.forEach(element => {
            spliceArguments.push(element);
          });
          target[field].splice(...spliceArguments);
        }

        // Actually sort.
        if (sortFunction) {
          target[field].sort(sortFunction);
        }

        // Actually slice.
        if (slice !== undefined) {
          if (slice === 0) {
            target[field] = []; // differs from Array.slice!
          } else if (slice < 0) {
            target[field] = target[field].slice(slice);
          } else {
            target[field] = target[field].slice(0, slice);
          }
        }
      },
      $pushAll(target, field, arg) {
        if (!(typeof arg === 'object' && arg instanceof Array)) {
          throw MinimongoError('Modifier $pushAll/pullAll allowed for arrays only');
        }
        assertHasValidFieldNames(arg);
        const toPush = target[field];
        if (toPush === undefined) {
          target[field] = arg;
        } else if (!(toPush instanceof Array)) {
          throw MinimongoError('Cannot apply $pushAll modifier to non-array', {
            field
          });
        } else {
          toPush.push(...arg);
        }
      },
      $addToSet(target, field, arg) {
        let isEach = false;
        if (typeof arg === 'object') {
          // check if first key is '$each'
          const keys = Object.keys(arg);
          if (keys[0] === '$each') {
            isEach = true;
          }
        }
        const values = isEach ? arg.$each : [arg];
        assertHasValidFieldNames(values);
        const toAdd = target[field];
        if (toAdd === undefined) {
          target[field] = values;
        } else if (!(toAdd instanceof Array)) {
          throw MinimongoError('Cannot apply $addToSet modifier to non-array', {
            field
          });
        } else {
          values.forEach(value => {
            if (toAdd.some(element => LocalCollection._f._equal(value, element))) {
              return;
            }
            toAdd.push(value);
          });
        }
      },
      $pop(target, field, arg) {
        if (target === undefined) {
          return;
        }
        const toPop = target[field];
        if (toPop === undefined) {
          return;
        }
        if (!(toPop instanceof Array)) {
          throw MinimongoError('Cannot apply $pop modifier to non-array', {
            field
          });
        }
        if (typeof arg === 'number' && arg < 0) {
          toPop.splice(0, 1);
        } else {
          toPop.pop();
        }
      },
      $pull(target, field, arg) {
        if (target === undefined) {
          return;
        }
        const toPull = target[field];
        if (toPull === undefined) {
          return;
        }
        if (!(toPull instanceof Array)) {
          throw MinimongoError('Cannot apply $pull/pullAll modifier to non-array', {
            field
          });
        }
        let out;
        if (arg != null && typeof arg === 'object' && !(arg instanceof Array)) {
          // XXX would be much nicer to compile this once, rather than
          // for each document we modify.. but usually we're not
          // modifying that many documents, so we'll let it slide for
          // now

          // XXX Minimongo.Matcher isn't up for the job, because we need
          // to permit stuff like {$pull: {a: {$gt: 4}}}.. something
          // like {$gt: 4} is not normally a complete selector.
          // same issue as $elemMatch possibly?
          const matcher = new Minimongo.Matcher(arg);
          out = toPull.filter(element => !matcher.documentMatches(element).result);
        } else {
          out = toPull.filter(element => !LocalCollection._f._equal(element, arg));
        }
        target[field] = out;
      },
      $pullAll(target, field, arg) {
        if (!(typeof arg === 'object' && arg instanceof Array)) {
          throw MinimongoError('Modifier $pushAll/pullAll allowed for arrays only', {
            field
          });
        }
        if (target === undefined) {
          return;
        }
        const toPull = target[field];
        if (toPull === undefined) {
          return;
        }
        if (!(toPull instanceof Array)) {
          throw MinimongoError('Cannot apply $pull/pullAll modifier to non-array', {
            field
          });
        }
        target[field] = toPull.filter(object => !arg.some(element => LocalCollection._f._equal(object, element)));
      },
      $bit(target, field, arg) {
        // XXX mongo only supports $bit on integers, and we only support
        // native javascript numbers (doubles) so far, so we can't support $bit
        throw MinimongoError('$bit is not supported', {
          field
        });
      },
      $v() {
        // As discussed in https://github.com/meteor/meteor/issues/9623,
        // the `$v` operator is not needed by Meteor, but problems can occur if
        // it's not at least callable (as of Mongo >= 3.6). It's defined here as
        // a no-op to work around these problems.
      }
    };
    const NO_CREATE_MODIFIERS = {
      $pop: true,
      $pull: true,
      $pullAll: true,
      $rename: true,
      $unset: true
    };

    // Make sure field names do not contain Mongo restricted
    // characters ('.', '$', '\0').
    // https://docs.mongodb.com/manual/reference/limits/#Restrictions-on-Field-Names
    const invalidCharMsg = {
      $: 'start with \'$\'',
      '.': 'contain \'.\'',
      '\0': 'contain null bytes'
    };

    // checks if all field names in an object are valid
    function assertHasValidFieldNames(doc) {
      if (doc && typeof doc === 'object') {
        JSON.stringify(doc, (key, value) => {
          assertIsValidFieldName(key);
          return value;
        });
      }
    }
    function assertIsValidFieldName(key) {
      let match;
      if (typeof key === 'string' && (match = key.match(/^\$|\.|\0/))) {
        throw MinimongoError("Key ".concat(key, " must not ").concat(invalidCharMsg[match[0]]));
      }
    }

    // for a.b.c.2.d.e, keyparts should be ['a', 'b', 'c', '2', 'd', 'e'],
    // and then you would operate on the 'e' property of the returned
    // object.
    //
    // if options.noCreate is falsey, creates intermediate levels of
    // structure as necessary, like mkdir -p (and raises an exception if
    // that would mean giving a non-numeric property to an array.) if
    // options.noCreate is true, return undefined instead.
    //
    // may modify the last element of keyparts to signal to the caller that it needs
    // to use a different value to index into the returned object (for example,
    // ['a', '01'] -> ['a', 1]).
    //
    // if forbidArray is true, return null if the keypath goes through an array.
    //
    // if options.arrayIndices is set, use its first element for the (first) '$' in
    // the path.
    function findModTarget(doc, keyparts) {
      let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      let usedArrayIndex = false;
      for (let i = 0; i < keyparts.length; i++) {
        const last = i === keyparts.length - 1;
        let keypart = keyparts[i];
        if (!isIndexable(doc)) {
          if (options.noCreate) {
            return undefined;
          }
          const error = MinimongoError("cannot use the part '".concat(keypart, "' to traverse ").concat(doc));
          error.setPropertyError = true;
          throw error;
        }
        if (doc instanceof Array) {
          if (options.forbidArray) {
            return null;
          }
          if (keypart === '$') {
            if (usedArrayIndex) {
              throw MinimongoError('Too many positional (i.e. \'$\') elements');
            }
            if (!options.arrayIndices || !options.arrayIndices.length) {
              throw MinimongoError('The positional operator did not find the match needed from the ' + 'query');
            }
            keypart = options.arrayIndices[0];
            usedArrayIndex = true;
          } else if (isNumericKey(keypart)) {
            keypart = parseInt(keypart);
          } else {
            if (options.noCreate) {
              return undefined;
            }
            throw MinimongoError("can't append to array using string field name [".concat(keypart, "]"));
          }
          if (last) {
            keyparts[i] = keypart; // handle 'a.01'
          }
          if (options.noCreate && keypart >= doc.length) {
            return undefined;
          }
          while (doc.length < keypart) {
            doc.push(null);
          }
          if (!last) {
            if (doc.length === keypart) {
              doc.push({});
            } else if (typeof doc[keypart] !== 'object') {
              throw MinimongoError("can't modify field '".concat(keyparts[i + 1], "' of list value ") + JSON.stringify(doc[keypart]));
            }
          }
        } else {
          assertIsValidFieldName(keypart);
          if (!(keypart in doc)) {
            if (options.noCreate) {
              return undefined;
            }
            if (!last) {
              doc[keypart] = {};
            }
          }
        }
        if (last) {
          return doc;
        }
        doc = doc[keypart];
      }

      // notreached
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

},"matcher.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/matcher.js                                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reify_async_result__) {
  "use strict";
  try {
    var _Package$mongoDecima;
    module.export({
      default: () => Matcher
    });
    let LocalCollection;
    module.link("./local_collection.js", {
      default(v) {
        LocalCollection = v;
      }
    }, 0);
    let compileDocumentSelector, hasOwn, nothingMatcher;
    module.link("./common.js", {
      compileDocumentSelector(v) {
        compileDocumentSelector = v;
      },
      hasOwn(v) {
        hasOwn = v;
      },
      nothingMatcher(v) {
        nothingMatcher = v;
      }
    }, 1);
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    const Decimal = ((_Package$mongoDecima = Package['mongo-decimal']) === null || _Package$mongoDecima === void 0 ? void 0 : _Package$mongoDecima.Decimal) || class DecimalStub {};

    // The minimongo selector compiler!

    // Terminology:
    //  - a 'selector' is the EJSON object representing a selector
    //  - a 'matcher' is its compiled form (whether a full Minimongo.Matcher
    //    object or one of the component lambdas that matches parts of it)
    //  - a 'result object' is an object with a 'result' field and maybe
    //    distance and arrayIndices.
    //  - a 'branched value' is an object with a 'value' field and maybe
    //    'dontIterate' and 'arrayIndices'.
    //  - a 'document' is a top-level object that can be stored in a collection.
    //  - a 'lookup function' is a function that takes in a document and returns
    //    an array of 'branched values'.
    //  - a 'branched matcher' maps from an array of branched values to a result
    //    object.
    //  - an 'element matcher' maps from a single value to a bool.

    // Main entry point.
    //   var matcher = new Minimongo.Matcher({a: {$gt: 5}});
    //   if (matcher.documentMatches({a: 7})) ...
    class Matcher {
      constructor(selector, isUpdate) {
        // A set (object mapping string -> *) of all of the document paths looked
        // at by the selector. Also includes the empty string if it may look at any
        // path (eg, $where).
        this._paths = {};
        // Set to true if compilation finds a $near.
        this._hasGeoQuery = false;
        // Set to true if compilation finds a $where.
        this._hasWhere = false;
        // Set to false if compilation finds anything other than a simple equality
        // or one or more of '$gt', '$gte', '$lt', '$lte', '$ne', '$in', '$nin' used
        // with scalars as operands.
        this._isSimple = true;
        // Set to a dummy document which always matches this Matcher. Or set to null
        // if such document is too hard to find.
        this._matchingDocument = undefined;
        // A clone of the original selector. It may just be a function if the user
        // passed in a function; otherwise is definitely an object (eg, IDs are
        // translated into {_id: ID} first. Used by canBecomeTrueByModifier and
        // Sorter._useWithMatcher.
        this._selector = null;
        this._docMatcher = this._compileSelector(selector);
        // Set to true if selection is done for an update operation
        // Default is false
        // Used for $near array update (issue #3599)
        this._isUpdate = isUpdate;
      }
      documentMatches(doc) {
        if (doc !== Object(doc)) {
          throw Error('documentMatches needs a document');
        }
        return this._docMatcher(doc);
      }
      hasGeoQuery() {
        return this._hasGeoQuery;
      }
      hasWhere() {
        return this._hasWhere;
      }
      isSimple() {
        return this._isSimple;
      }

      // Given a selector, return a function that takes one argument, a
      // document. It returns a result object.
      _compileSelector(selector) {
        // you can pass a literal function instead of a selector
        if (selector instanceof Function) {
          this._isSimple = false;
          this._selector = selector;
          this._recordPathUsed('');
          return doc => ({
            result: !!selector.call(doc)
          });
        }

        // shorthand -- scalar _id
        if (LocalCollection._selectorIsId(selector)) {
          this._selector = {
            _id: selector
          };
          this._recordPathUsed('_id');
          return doc => ({
            result: EJSON.equals(doc._id, selector)
          });
        }

        // protect against dangerous selectors.  falsey and {_id: falsey} are both
        // likely programmer error, and not what you want, particularly for
        // destructive operations.
        if (!selector || hasOwn.call(selector, '_id') && !selector._id) {
          this._isSimple = false;
          return nothingMatcher;
        }

        // Top level can't be an array or true or binary.
        if (Array.isArray(selector) || EJSON.isBinary(selector) || typeof selector === 'boolean') {
          throw new Error("Invalid selector: ".concat(selector));
        }
        this._selector = EJSON.clone(selector);
        return compileDocumentSelector(selector, this, {
          isRoot: true
        });
      }

      // Returns a list of key paths the given selector is looking for. It includes
      // the empty string if there is a $where.
      _getPaths() {
        return Object.keys(this._paths);
      }
      _recordPathUsed(path) {
        this._paths[path] = true;
      }
    }
    // helpers used by compiled selector code
    LocalCollection._f = {
      // XXX for _all and _in, consider building 'inquery' at compile time..
      _type(v) {
        if (typeof v === 'number') {
          return 1;
        }
        if (typeof v === 'string') {
          return 2;
        }
        if (typeof v === 'boolean') {
          return 8;
        }
        if (Array.isArray(v)) {
          return 4;
        }
        if (v === null) {
          return 10;
        }

        // note that typeof(/x/) === "object"
        if (v instanceof RegExp) {
          return 11;
        }
        if (typeof v === 'function') {
          return 13;
        }
        if (v instanceof Date) {
          return 9;
        }
        if (EJSON.isBinary(v)) {
          return 5;
        }
        if (v instanceof MongoID.ObjectID) {
          return 7;
        }
        if (v instanceof Decimal) {
          return 1;
        }

        // object
        return 3;

        // XXX support some/all of these:
        // 14, symbol
        // 15, javascript code with scope
        // 16, 18: 32-bit/64-bit integer
        // 17, timestamp
        // 255, minkey
        // 127, maxkey
      },
      // deep equality test: use for literal document and array matches
      _equal(a, b) {
        return EJSON.equals(a, b, {
          keyOrderSensitive: true
        });
      },
      // maps a type code to a value that can be used to sort values of different
      // types
      _typeorder(t) {
        // http://www.mongodb.org/display/DOCS/What+is+the+Compare+Order+for+BSON+Types
        // XXX what is the correct sort position for Javascript code?
        // ('100' in the matrix below)
        // XXX minkey/maxkey
        return [-1,
        // (not a type)
        1,
        // number
        2,
        // string
        3,
        // object
        4,
        // array
        5,
        // binary
        -1,
        // deprecated
        6,
        // ObjectID
        7,
        // bool
        8,
        // Date
        0,
        // null
        9,
        // RegExp
        -1,
        // deprecated
        100,
        // JS code
        2,
        // deprecated (symbol)
        100,
        // JS code
        1,
        // 32-bit int
        8,
        // Mongo timestamp
        1 // 64-bit int
        ][t];
      },
      // compare two values of unknown type according to BSON ordering
      // semantics. (as an extension, consider 'undefined' to be less than
      // any other value.) return negative if a is less, positive if b is
      // less, or 0 if equal
      _cmp(a, b) {
        if (a === undefined) {
          return b === undefined ? 0 : -1;
        }
        if (b === undefined) {
          return 1;
        }
        let ta = LocalCollection._f._type(a);
        let tb = LocalCollection._f._type(b);
        const oa = LocalCollection._f._typeorder(ta);
        const ob = LocalCollection._f._typeorder(tb);
        if (oa !== ob) {
          return oa < ob ? -1 : 1;
        }

        // XXX need to implement this if we implement Symbol or integers, or
        // Timestamp
        if (ta !== tb) {
          throw Error('Missing type coercion logic in _cmp');
        }
        if (ta === 7) {
          // ObjectID
          // Convert to string.
          ta = tb = 2;
          a = a.toHexString();
          b = b.toHexString();
        }
        if (ta === 9) {
          // Date
          // Convert to millis.
          ta = tb = 1;
          a = isNaN(a) ? 0 : a.getTime();
          b = isNaN(b) ? 0 : b.getTime();
        }
        if (ta === 1) {
          // double
          if (a instanceof Decimal) {
            return a.minus(b).toNumber();
          } else {
            return a - b;
          }
        }
        if (tb === 2)
          // string
          return a < b ? -1 : a === b ? 0 : 1;
        if (ta === 3) {
          // Object
          // this could be much more efficient in the expected case ...
          const toArray = object => {
            const result = [];
            Object.keys(object).forEach(key => {
              result.push(key, object[key]);
            });
            return result;
          };
          return LocalCollection._f._cmp(toArray(a), toArray(b));
        }
        if (ta === 4) {
          // Array
          for (let i = 0;; i++) {
            if (i === a.length) {
              return i === b.length ? 0 : -1;
            }
            if (i === b.length) {
              return 1;
            }
            const s = LocalCollection._f._cmp(a[i], b[i]);
            if (s !== 0) {
              return s;
            }
          }
        }
        if (ta === 5) {
          // binary
          // Surprisingly, a small binary blob is always less than a large one in
          // Mongo.
          if (a.length !== b.length) {
            return a.length - b.length;
          }
          for (let i = 0; i < a.length; i++) {
            if (a[i] < b[i]) {
              return -1;
            }
            if (a[i] > b[i]) {
              return 1;
            }
          }
          return 0;
        }
        if (ta === 8) {
          // boolean
          if (a) {
            return b ? 0 : 1;
          }
          return b ? -1 : 0;
        }
        if (ta === 10)
          // null
          return 0;
        if (ta === 11)
          // regexp
          throw Error('Sorting not supported on regular expression'); // XXX

        // 13: javascript code
        // 14: symbol
        // 15: javascript code with scope
        // 16: 32-bit integer
        // 17: timestamp
        // 18: 64-bit integer
        // 255: minkey
        // 127: maxkey
        if (ta === 13)
          // javascript code
          throw Error('Sorting not supported on Javascript code'); // XXX

        throw Error('Unknown type to sort');
      }
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

},"minimongo_common.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/minimongo_common.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reify_async_result__) {
  "use strict";
  try {
    let LocalCollection_;
    module.link("./local_collection.js", {
      default(v) {
        LocalCollection_ = v;
      }
    }, 0);
    let Matcher;
    module.link("./matcher.js", {
      default(v) {
        Matcher = v;
      }
    }, 1);
    let Sorter;
    module.link("./sorter.js", {
      default(v) {
        Sorter = v;
      }
    }, 2);
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    LocalCollection = LocalCollection_;
    Minimongo = {
      LocalCollection: LocalCollection_,
      Matcher,
      Sorter
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

},"observe_handle.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/observe_handle.js                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => ObserveHandle
});
class ObserveHandle {}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sorter.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/sorter.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reify_async_result__) {
  "use strict";
  try {
    module.export({
      default: () => Sorter
    });
    let ELEMENT_OPERATORS, equalityElementMatcher, expandArraysInBranches, hasOwn, isOperatorObject, makeLookupFunction, regexpElementMatcher;
    module.link("./common.js", {
      ELEMENT_OPERATORS(v) {
        ELEMENT_OPERATORS = v;
      },
      equalityElementMatcher(v) {
        equalityElementMatcher = v;
      },
      expandArraysInBranches(v) {
        expandArraysInBranches = v;
      },
      hasOwn(v) {
        hasOwn = v;
      },
      isOperatorObject(v) {
        isOperatorObject = v;
      },
      makeLookupFunction(v) {
        makeLookupFunction = v;
      },
      regexpElementMatcher(v) {
        regexpElementMatcher = v;
      }
    }, 0);
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    class Sorter {
      constructor(spec) {
        this._sortSpecParts = [];
        this._sortFunction = null;
        const addSpecPart = (path, ascending) => {
          if (!path) {
            throw Error('sort keys must be non-empty');
          }
          if (path.charAt(0) === '$') {
            throw Error("unsupported sort key: ".concat(path));
          }
          this._sortSpecParts.push({
            ascending,
            lookup: makeLookupFunction(path, {
              forSort: true
            }),
            path
          });
        };
        if (spec instanceof Array) {
          spec.forEach(element => {
            if (typeof element === 'string') {
              addSpecPart(element, true);
            } else {
              addSpecPart(element[0], element[1] !== 'desc');
            }
          });
        } else if (typeof spec === 'object') {
          Object.keys(spec).forEach(key => {
            addSpecPart(key, spec[key] >= 0);
          });
        } else if (typeof spec === 'function') {
          this._sortFunction = spec;
        } else {
          throw Error("Bad sort specification: ".concat(JSON.stringify(spec)));
        }

        // If a function is specified for sorting, we skip the rest.
        if (this._sortFunction) {
          return;
        }

        // To implement affectedByModifier, we piggy-back on top of Matcher's
        // affectedByModifier code; we create a selector that is affected by the
        // same modifiers as this sort order. This is only implemented on the
        // server.
        if (this.affectedByModifier) {
          const selector = {};
          this._sortSpecParts.forEach(spec => {
            selector[spec.path] = 1;
          });
          this._selectorForAffectedByModifier = new Minimongo.Matcher(selector);
        }
        this._keyComparator = composeComparators(this._sortSpecParts.map((spec, i) => this._keyFieldComparator(i)));
      }
      getComparator(options) {
        // If sort is specified or have no distances, just use the comparator from
        // the source specification (which defaults to "everything is equal".
        // issue #3599
        // https://docs.mongodb.com/manual/reference/operator/query/near/#sort-operation
        // sort effectively overrides $near
        if (this._sortSpecParts.length || !options || !options.distances) {
          return this._getBaseComparator();
        }
        const distances = options.distances;

        // Return a comparator which compares using $near distances.
        return (a, b) => {
          if (!distances.has(a._id)) {
            throw Error("Missing distance for ".concat(a._id));
          }
          if (!distances.has(b._id)) {
            throw Error("Missing distance for ".concat(b._id));
          }
          return distances.get(a._id) - distances.get(b._id);
        };
      }

      // Takes in two keys: arrays whose lengths match the number of spec
      // parts. Returns negative, 0, or positive based on using the sort spec to
      // compare fields.
      _compareKeys(key1, key2) {
        if (key1.length !== this._sortSpecParts.length || key2.length !== this._sortSpecParts.length) {
          throw Error('Key has wrong length');
        }
        return this._keyComparator(key1, key2);
      }

      // Iterates over each possible "key" from doc (ie, over each branch), calling
      // 'cb' with the key.
      _generateKeysFromDoc(doc, cb) {
        if (this._sortSpecParts.length === 0) {
          throw new Error('can\'t generate keys without a spec');
        }
        const pathFromIndices = indices => "".concat(indices.join(','), ",");
        let knownPaths = null;

        // maps index -> ({'' -> value} or {path -> value})
        const valuesByIndexAndPath = this._sortSpecParts.map(spec => {
          // Expand any leaf arrays that we find, and ignore those arrays
          // themselves.  (We never sort based on an array itself.)
          let branches = expandArraysInBranches(spec.lookup(doc), true);

          // If there are no values for a key (eg, key goes to an empty array),
          // pretend we found one undefined value.
          if (!branches.length) {
            branches = [{
              value: void 0
            }];
          }
          const element = Object.create(null);
          let usedPaths = false;
          branches.forEach(branch => {
            if (!branch.arrayIndices) {
              // If there are no array indices for a branch, then it must be the
              // only branch, because the only thing that produces multiple branches
              // is the use of arrays.
              if (branches.length > 1) {
                throw Error('multiple branches but no array used?');
              }
              element[''] = branch.value;
              return;
            }
            usedPaths = true;
            const path = pathFromIndices(branch.arrayIndices);
            if (hasOwn.call(element, path)) {
              throw Error("duplicate path: ".concat(path));
            }
            element[path] = branch.value;

            // If two sort fields both go into arrays, they have to go into the
            // exact same arrays and we have to find the same paths.  This is
            // roughly the same condition that makes MongoDB throw this strange
            // error message.  eg, the main thing is that if sort spec is {a: 1,
            // b:1} then a and b cannot both be arrays.
            //
            // (In MongoDB it seems to be OK to have {a: 1, 'a.x.y': 1} where 'a'
            // and 'a.x.y' are both arrays, but we don't allow this for now.
            // #NestedArraySort
            // XXX achieve full compatibility here
            if (knownPaths && !hasOwn.call(knownPaths, path)) {
              throw Error('cannot index parallel arrays');
            }
          });
          if (knownPaths) {
            // Similarly to above, paths must match everywhere, unless this is a
            // non-array field.
            if (!hasOwn.call(element, '') && Object.keys(knownPaths).length !== Object.keys(element).length) {
              throw Error('cannot index parallel arrays!');
            }
          } else if (usedPaths) {
            knownPaths = {};
            Object.keys(element).forEach(path => {
              knownPaths[path] = true;
            });
          }
          return element;
        });
        if (!knownPaths) {
          // Easy case: no use of arrays.
          const soleKey = valuesByIndexAndPath.map(values => {
            if (!hasOwn.call(values, '')) {
              throw Error('no value in sole key case?');
            }
            return values[''];
          });
          cb(soleKey);
          return;
        }
        Object.keys(knownPaths).forEach(path => {
          const key = valuesByIndexAndPath.map(values => {
            if (hasOwn.call(values, '')) {
              return values[''];
            }
            if (!hasOwn.call(values, path)) {
              throw Error('missing path?');
            }
            return values[path];
          });
          cb(key);
        });
      }

      // Returns a comparator that represents the sort specification (but not
      // including a possible geoquery distance tie-breaker).
      _getBaseComparator() {
        if (this._sortFunction) {
          return this._sortFunction;
        }

        // If we're only sorting on geoquery distance and no specs, just say
        // everything is equal.
        if (!this._sortSpecParts.length) {
          return (doc1, doc2) => 0;
        }
        return (doc1, doc2) => {
          const key1 = this._getMinKeyFromDoc(doc1);
          const key2 = this._getMinKeyFromDoc(doc2);
          return this._compareKeys(key1, key2);
        };
      }

      // Finds the minimum key from the doc, according to the sort specs.  (We say
      // "minimum" here but this is with respect to the sort spec, so "descending"
      // sort fields mean we're finding the max for that field.)
      //
      // Note that this is NOT "find the minimum value of the first field, the
      // minimum value of the second field, etc"... it's "choose the
      // lexicographically minimum value of the key vector, allowing only keys which
      // you can find along the same paths".  ie, for a doc {a: [{x: 0, y: 5}, {x:
      // 1, y: 3}]} with sort spec {'a.x': 1, 'a.y': 1}, the only keys are [0,5] and
      // [1,3], and the minimum key is [0,5]; notably, [0,3] is NOT a key.
      _getMinKeyFromDoc(doc) {
        let minKey = null;
        this._generateKeysFromDoc(doc, key => {
          if (minKey === null) {
            minKey = key;
            return;
          }
          if (this._compareKeys(key, minKey) < 0) {
            minKey = key;
          }
        });
        return minKey;
      }
      _getPaths() {
        return this._sortSpecParts.map(part => part.path);
      }

      // Given an index 'i', returns a comparator that compares two key arrays based
      // on field 'i'.
      _keyFieldComparator(i) {
        const invert = !this._sortSpecParts[i].ascending;
        return (key1, key2) => {
          const compare = LocalCollection._f._cmp(key1[i], key2[i]);
          return invert ? -compare : compare;
        };
      }
    }
    // Given an array of comparators
    // (functions (a,b)->(negative or positive or zero)), returns a single
    // comparator which uses each comparator in order and returns the first
    // non-zero value.
    function composeComparators(comparatorArray) {
      return (a, b) => {
        for (let i = 0; i < comparatorArray.length; ++i) {
          const compare = comparatorArray[i](a, b);
          if (compare !== 0) {
            return compare;
          }
        }
        return 0;
      };
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

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});


/* Exports */
return {
  export: function () { return {
      LocalCollection: LocalCollection,
      Minimongo: Minimongo,
      MinimongoTest: MinimongoTest,
      MinimongoError: MinimongoError
    };},
  require: require,
  eagerModulePaths: [
    "/node_modules/meteor/minimongo/minimongo_server.js"
  ],
  mainModulePath: "/node_modules/meteor/minimongo/minimongo_server.js"
}});

//# sourceURL=meteor://💻app/packages/minimongo.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWluaW1vbmdvL21pbmltb25nb19zZXJ2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21pbmltb25nby9jb21tb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21pbmltb25nby9jb25zdGFudHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21pbmltb25nby9jdXJzb3IuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21pbmltb25nby9sb2NhbF9jb2xsZWN0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9taW5pbW9uZ28vbWF0Y2hlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWluaW1vbmdvL21pbmltb25nb19jb21tb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21pbmltb25nby9vYnNlcnZlX2hhbmRsZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWluaW1vbmdvL3NvcnRlci5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJsaW5rIiwiaGFzT3duIiwiaXNOdW1lcmljS2V5IiwiaXNPcGVyYXRvck9iamVjdCIsInBhdGhzVG9UcmVlIiwicHJvamVjdGlvbkRldGFpbHMiLCJ2IiwiX19yZWlmeVdhaXRGb3JEZXBzX18iLCJNaW5pbW9uZ28iLCJfcGF0aHNFbGlkaW5nTnVtZXJpY0tleXMiLCJwYXRocyIsIm1hcCIsInBhdGgiLCJzcGxpdCIsImZpbHRlciIsInBhcnQiLCJqb2luIiwiTWF0Y2hlciIsInByb3RvdHlwZSIsImFmZmVjdGVkQnlNb2RpZmllciIsIm1vZGlmaWVyIiwiT2JqZWN0IiwiYXNzaWduIiwiJHNldCIsIiR1bnNldCIsIm1lYW5pbmdmdWxQYXRocyIsIl9nZXRQYXRocyIsIm1vZGlmaWVkUGF0aHMiLCJjb25jYXQiLCJrZXlzIiwic29tZSIsIm1vZCIsIm1lYW5pbmdmdWxQYXRoIiwic2VsIiwiaSIsImoiLCJsZW5ndGgiLCJjYW5CZWNvbWVUcnVlQnlNb2RpZmllciIsImlzU2ltcGxlIiwibW9kaWZpZXJQYXRocyIsInBhdGhIYXNOdW1lcmljS2V5cyIsImV4cGVjdGVkU2NhbGFySXNPYmplY3QiLCJfc2VsZWN0b3IiLCJtb2RpZmllclBhdGgiLCJzdGFydHNXaXRoIiwibWF0Y2hpbmdEb2N1bWVudCIsIkVKU09OIiwiY2xvbmUiLCJMb2NhbENvbGxlY3Rpb24iLCJfbW9kaWZ5IiwiZXJyb3IiLCJuYW1lIiwic2V0UHJvcGVydHlFcnJvciIsImRvY3VtZW50TWF0Y2hlcyIsInJlc3VsdCIsImNvbWJpbmVJbnRvUHJvamVjdGlvbiIsInByb2plY3Rpb24iLCJzZWxlY3RvclBhdGhzIiwiaW5jbHVkZXMiLCJjb21iaW5lSW1wb3J0YW50UGF0aHNJbnRvUHJvamVjdGlvbiIsIl9tYXRjaGluZ0RvY3VtZW50IiwidW5kZWZpbmVkIiwiZmFsbGJhY2siLCJ2YWx1ZVNlbGVjdG9yIiwiJGVxIiwiJGluIiwibWF0Y2hlciIsInBsYWNlaG9sZGVyIiwiZmluZCIsIm9ubHlDb250YWluc0tleXMiLCJsb3dlckJvdW5kIiwiSW5maW5pdHkiLCJ1cHBlckJvdW5kIiwiZm9yRWFjaCIsIm9wIiwiY2FsbCIsIm1pZGRsZSIsIngiLCJTb3J0ZXIiLCJfc2VsZWN0b3JGb3JBZmZlY3RlZEJ5TW9kaWZpZXIiLCJkZXRhaWxzIiwidHJlZSIsIm5vZGUiLCJmdWxsUGF0aCIsIm1lcmdlZFByb2plY3Rpb24iLCJ0cmVlVG9QYXRocyIsImluY2x1ZGluZyIsIm1lcmdlZEV4Y2xQcm9qZWN0aW9uIiwiZ2V0UGF0aHMiLCJzZWxlY3RvciIsIl9wYXRocyIsIm9iaiIsImV2ZXJ5IiwiayIsInByZWZpeCIsImFyZ3VtZW50cyIsImtleSIsInZhbHVlIiwiX19yZWlmeV9hc3luY19yZXN1bHRfXyIsIl9yZWlmeUVycm9yIiwic2VsZiIsImFzeW5jIiwiZXhwb3J0IiwiTWluaU1vbmdvUXVlcnlFcnJvciIsIkVMRU1FTlRfT1BFUkFUT1JTIiwiY29tcGlsZURvY3VtZW50U2VsZWN0b3IiLCJlcXVhbGl0eUVsZW1lbnRNYXRjaGVyIiwiZXhwYW5kQXJyYXlzSW5CcmFuY2hlcyIsImlzSW5kZXhhYmxlIiwibWFrZUxvb2t1cEZ1bmN0aW9uIiwibm90aGluZ01hdGNoZXIiLCJwb3B1bGF0ZURvY3VtZW50V2l0aFF1ZXJ5RmllbGRzIiwicmVnZXhwRWxlbWVudE1hdGNoZXIiLCJkZWZhdWx0IiwiaGFzT3duUHJvcGVydHkiLCJFcnJvciIsIiRsdCIsIm1ha2VJbmVxdWFsaXR5IiwiY21wVmFsdWUiLCIkZ3QiLCIkbHRlIiwiJGd0ZSIsIiRtb2QiLCJjb21waWxlRWxlbWVudFNlbGVjdG9yIiwib3BlcmFuZCIsIkFycmF5IiwiaXNBcnJheSIsImRpdmlzb3IiLCJyZW1haW5kZXIiLCJlbGVtZW50TWF0Y2hlcnMiLCJvcHRpb24iLCJSZWdFeHAiLCIkc2l6ZSIsImRvbnRFeHBhbmRMZWFmQXJyYXlzIiwiJHR5cGUiLCJkb250SW5jbHVkZUxlYWZBcnJheXMiLCJvcGVyYW5kQWxpYXNNYXAiLCJfZiIsIl90eXBlIiwiJGJpdHNBbGxTZXQiLCJtYXNrIiwiZ2V0T3BlcmFuZEJpdG1hc2siLCJiaXRtYXNrIiwiZ2V0VmFsdWVCaXRtYXNrIiwiYnl0ZSIsIiRiaXRzQW55U2V0IiwiJGJpdHNBbGxDbGVhciIsIiRiaXRzQW55Q2xlYXIiLCIkcmVnZXgiLCJyZWdleHAiLCIkb3B0aW9ucyIsInRlc3QiLCJzb3VyY2UiLCIkZWxlbU1hdGNoIiwiX2lzUGxhaW5PYmplY3QiLCJpc0RvY01hdGNoZXIiLCJMT0dJQ0FMX09QRVJBVE9SUyIsInJlZHVjZSIsImEiLCJiIiwic3ViTWF0Y2hlciIsImluRWxlbU1hdGNoIiwiY29tcGlsZVZhbHVlU2VsZWN0b3IiLCJhcnJheUVsZW1lbnQiLCJhcmciLCJkb250SXRlcmF0ZSIsIiRhbmQiLCJzdWJTZWxlY3RvciIsImFuZERvY3VtZW50TWF0Y2hlcnMiLCJjb21waWxlQXJyYXlPZkRvY3VtZW50U2VsZWN0b3JzIiwiJG9yIiwibWF0Y2hlcnMiLCJkb2MiLCJmbiIsIiRub3IiLCIkd2hlcmUiLCJzZWxlY3RvclZhbHVlIiwiX3JlY29yZFBhdGhVc2VkIiwiX2hhc1doZXJlIiwiRnVuY3Rpb24iLCIkY29tbWVudCIsIlZBTFVFX09QRVJBVE9SUyIsImNvbnZlcnRFbGVtZW50TWF0Y2hlclRvQnJhbmNoZWRNYXRjaGVyIiwiJG5vdCIsImludmVydEJyYW5jaGVkTWF0Y2hlciIsIiRuZSIsIiRuaW4iLCIkZXhpc3RzIiwiZXhpc3RzIiwiZXZlcnl0aGluZ01hdGNoZXIiLCIkbWF4RGlzdGFuY2UiLCIkbmVhciIsIiRhbGwiLCJicmFuY2hlZE1hdGNoZXJzIiwiY3JpdGVyaW9uIiwiYW5kQnJhbmNoZWRNYXRjaGVycyIsImlzUm9vdCIsIl9oYXNHZW9RdWVyeSIsIm1heERpc3RhbmNlIiwicG9pbnQiLCJkaXN0YW5jZSIsIiRnZW9tZXRyeSIsInR5cGUiLCJHZW9KU09OIiwicG9pbnREaXN0YW5jZSIsImNvb3JkaW5hdGVzIiwicG9pbnRUb0FycmF5IiwiZ2VvbWV0cnlXaXRoaW5SYWRpdXMiLCJkaXN0YW5jZUNvb3JkaW5hdGVQYWlycyIsImJyYW5jaGVkVmFsdWVzIiwiYnJhbmNoIiwiY3VyRGlzdGFuY2UiLCJfaXNVcGRhdGUiLCJhcnJheUluZGljZXMiLCJhbmRTb21lTWF0Y2hlcnMiLCJzdWJNYXRjaGVycyIsImRvY09yQnJhbmNoZXMiLCJtYXRjaCIsInN1YlJlc3VsdCIsInNlbGVjdG9ycyIsImRvY1NlbGVjdG9yIiwib3B0aW9ucyIsImRvY01hdGNoZXJzIiwic3Vic3RyIiwiX2lzU2ltcGxlIiwibG9va1VwQnlJbmRleCIsInZhbHVlTWF0Y2hlciIsIkJvb2xlYW4iLCJvcGVyYXRvckJyYW5jaGVkTWF0Y2hlciIsImVsZW1lbnRNYXRjaGVyIiwiYnJhbmNoZXMiLCJleHBhbmRlZCIsImVsZW1lbnQiLCJtYXRjaGVkIiwicG9pbnRBIiwicG9pbnRCIiwiTWF0aCIsImh5cG90IiwiZWxlbWVudFNlbGVjdG9yIiwiX2VxdWFsIiwiZG9jT3JCcmFuY2hlZFZhbHVlcyIsInNraXBUaGVBcnJheXMiLCJicmFuY2hlc091dCIsInRoaXNJc0FycmF5IiwicHVzaCIsIk51bWJlciIsImlzSW50ZWdlciIsIlVpbnQ4QXJyYXkiLCJJbnQzMkFycmF5IiwiYnVmZmVyIiwiaXNCaW5hcnkiLCJBcnJheUJ1ZmZlciIsIm1heCIsInZpZXciLCJpc1NhZmVJbnRlZ2VyIiwiVWludDMyQXJyYXkiLCJCWVRFU19QRVJfRUxFTUVOVCIsImluc2VydEludG9Eb2N1bWVudCIsImRvY3VtZW50IiwiZXhpc3RpbmdLZXkiLCJpbmRleE9mIiwiYnJhbmNoZWRNYXRjaGVyIiwiYnJhbmNoVmFsdWVzIiwicyIsImluY29uc2lzdGVudE9LIiwidGhlc2VBcmVPcGVyYXRvcnMiLCJzZWxLZXkiLCJ0aGlzSXNPcGVyYXRvciIsIkpTT04iLCJzdHJpbmdpZnkiLCJjbXBWYWx1ZUNvbXBhcmF0b3IiLCJvcGVyYW5kVHlwZSIsIl9jbXAiLCJwYXJ0cyIsImZpcnN0UGFydCIsImxvb2t1cFJlc3QiLCJzbGljZSIsImJ1aWxkUmVzdWx0IiwiZmlyc3RMZXZlbCIsImFwcGVuZFRvUmVzdWx0IiwibW9yZSIsImZvclNvcnQiLCJhcnJheUluZGV4IiwiTWluaW1vbmdvVGVzdCIsIk1pbmltb25nb0Vycm9yIiwibWVzc2FnZSIsImZpZWxkIiwib3BlcmF0b3JNYXRjaGVycyIsIm9wZXJhdG9yIiwic2ltcGxlUmFuZ2UiLCJzaW1wbGVFcXVhbGl0eSIsInNpbXBsZUluY2x1c2lvbiIsIm5ld0xlYWZGbiIsImNvbmZsaWN0Rm4iLCJyb290IiwicGF0aEFycmF5Iiwic3VjY2VzcyIsImxhc3RLZXkiLCJ5IiwicG9wdWxhdGVEb2N1bWVudFdpdGhLZXlWYWx1ZSIsImdldFByb3RvdHlwZU9mIiwicG9wdWxhdGVEb2N1bWVudFdpdGhPYmplY3QiLCJ1bnByZWZpeGVkS2V5cyIsInZhbGlkYXRlT2JqZWN0Iiwib2JqZWN0IiwicXVlcnkiLCJfc2VsZWN0b3JJc0lkIiwiZmllbGRzIiwiZmllbGRzS2V5cyIsInNvcnQiLCJfaWQiLCJrZXlQYXRoIiwicnVsZSIsInByb2plY3Rpb25SdWxlc1RyZWUiLCJjdXJyZW50UGF0aCIsImFub3RoZXJQYXRoIiwidG9TdHJpbmciLCJsYXN0SW5kZXgiLCJ2YWxpZGF0ZUtleUluUGF0aCIsImdldEFzeW5jTWV0aG9kTmFtZSIsIkFTWU5DX0NPTExFQ1RJT05fTUVUSE9EUyIsIkFTWU5DX0NVUlNPUl9NRVRIT0RTIiwiQ0xJRU5UX09OTFlfTUVUSE9EUyIsIm1ldGhvZCIsInJlcGxhY2UiLCJDdXJzb3IiLCJjb25zdHJ1Y3RvciIsImNvbGxlY3Rpb24iLCJzb3J0ZXIiLCJfc2VsZWN0b3JJc0lkUGVyaGFwc0FzT2JqZWN0IiwiX3NlbGVjdG9ySWQiLCJoYXNHZW9RdWVyeSIsInNraXAiLCJsaW1pdCIsIl9wcm9qZWN0aW9uRm4iLCJfY29tcGlsZVByb2plY3Rpb24iLCJfdHJhbnNmb3JtIiwid3JhcFRyYW5zZm9ybSIsInRyYW5zZm9ybSIsIlRyYWNrZXIiLCJyZWFjdGl2ZSIsImNvdW50IiwiX2RlcGVuZCIsImFkZGVkIiwicmVtb3ZlZCIsIl9nZXRSYXdPYmplY3RzIiwib3JkZXJlZCIsImZldGNoIiwiU3ltYm9sIiwiaXRlcmF0b3IiLCJhZGRlZEJlZm9yZSIsImNoYW5nZWQiLCJtb3ZlZEJlZm9yZSIsImluZGV4Iiwib2JqZWN0cyIsIm5leHQiLCJkb25lIiwiYXN5bmNJdGVyYXRvciIsInN5bmNSZXN1bHQiLCJQcm9taXNlIiwicmVzb2x2ZSIsImNhbGxiYWNrIiwidGhpc0FyZyIsImdldFRyYW5zZm9ybSIsIm9ic2VydmUiLCJfb2JzZXJ2ZUZyb21PYnNlcnZlQ2hhbmdlcyIsIm9ic2VydmVBc3luYyIsIm9ic2VydmVDaGFuZ2VzIiwiX29ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzQXJlT3JkZXJlZCIsIl9hbGxvd191bm9yZGVyZWQiLCJkaXN0YW5jZXMiLCJfSWRNYXAiLCJjdXJzb3IiLCJkaXJ0eSIsInByb2plY3Rpb25GbiIsInJlc3VsdHNTbmFwc2hvdCIsInFpZCIsIm5leHRfcWlkIiwicXVlcmllcyIsInJlc3VsdHMiLCJwYXVzZWQiLCJ3cmFwQ2FsbGJhY2siLCJhcmdzIiwiX29ic2VydmVRdWV1ZSIsInF1ZXVlVGFzayIsImFwcGx5IiwiX3N1cHByZXNzX2luaXRpYWwiLCJfcXVlcnkkcmVzdWx0cyIsIl9xdWVyeSRyZXN1bHRzJHNpemUiLCJoYW5kbGVyIiwic2l6ZSIsImhhbmRsZSIsIk9ic2VydmVIYW5kbGUiLCJzdG9wIiwiaXNSZWFkeSIsImlzUmVhZHlQcm9taXNlIiwiYWN0aXZlIiwib25JbnZhbGlkYXRlIiwiZHJhaW5SZXN1bHQiLCJkcmFpbiIsInRoZW4iLCJvYnNlcnZlQ2hhbmdlc0FzeW5jIiwiY2hhbmdlcnMiLCJkZXBlbmRlbmN5IiwiRGVwZW5kZW5jeSIsIm5vdGlmeSIsImJpbmQiLCJkZXBlbmQiLCJfZ2V0Q29sbGVjdGlvbk5hbWUiLCJhcHBseVNraXBMaW1pdCIsInNlbGVjdGVkRG9jIiwiX2RvY3MiLCJnZXQiLCJzZXQiLCJjbGVhciIsIk1ldGVvciIsIl9ydW5GcmVzaCIsImlkIiwibWF0Y2hSZXN1bHQiLCJnZXRDb21wYXJhdG9yIiwiX3B1Ymxpc2hDdXJzb3IiLCJzdWJzY3JpcHRpb24iLCJQYWNrYWdlIiwibW9uZ28iLCJNb25nbyIsIkNvbGxlY3Rpb24iLCJhc3luY05hbWUiLCJfbGVuIiwiX2tleSIsInJlamVjdCIsIl9vYmplY3RTcHJlYWQiLCJpc0NsaWVudCIsIl9TeW5jaHJvbm91c1F1ZXVlIiwiX0FzeW5jaHJvbm91c1F1ZXVlIiwiY3JlYXRlIiwiX3NhdmVkT3JpZ2luYWxzIiwiY291bnREb2N1bWVudHMiLCJjb3VudEFzeW5jIiwiZXN0aW1hdGVkRG9jdW1lbnRDb3VudCIsImZpbmRPbmUiLCJmaW5kT25lQXN5bmMiLCJmZXRjaEFzeW5jIiwicHJlcGFyZUluc2VydCIsImFzc2VydEhhc1ZhbGlkRmllbGROYW1lcyIsIl91c2VPSUQiLCJNb25nb0lEIiwiT2JqZWN0SUQiLCJSYW5kb20iLCJoYXMiLCJfc2F2ZU9yaWdpbmFsIiwiaW5zZXJ0IiwicXVlcmllc1RvUmVjb21wdXRlIiwiX2luc2VydEluUmVzdWx0c1N5bmMiLCJfcmVjb21wdXRlUmVzdWx0cyIsImRlZmVyIiwiaW5zZXJ0QXN5bmMiLCJfaW5zZXJ0SW5SZXN1bHRzQXN5bmMiLCJwYXVzZU9ic2VydmVycyIsImNsZWFyUmVzdWx0UXVlcmllcyIsInByZXBhcmVSZW1vdmUiLCJyZW1vdmUiLCJfZWFjaFBvc3NpYmx5TWF0Y2hpbmdEb2NTeW5jIiwicXVlcnlSZW1vdmUiLCJyZW1vdmVJZCIsInJlbW92ZURvYyIsImVxdWFscyIsIl9yZW1vdmVGcm9tUmVzdWx0c1N5bmMiLCJyZW1vdmVBc3luYyIsIl9yZW1vdmVGcm9tUmVzdWx0c0FzeW5jIiwiX3Jlc3VtZU9ic2VydmVycyIsIl9kaWZmUXVlcnlDaGFuZ2VzIiwicmVzdW1lT2JzZXJ2ZXJzU2VydmVyIiwicmVzdW1lT2JzZXJ2ZXJzQ2xpZW50IiwicmV0cmlldmVPcmlnaW5hbHMiLCJvcmlnaW5hbHMiLCJzYXZlT3JpZ2luYWxzIiwicHJlcGFyZVVwZGF0ZSIsInFpZFRvT3JpZ2luYWxSZXN1bHRzIiwiZG9jTWFwIiwiaWRzTWF0Y2hlZCIsIl9pZHNNYXRjaGVkQnlTZWxlY3RvciIsIm1lbW9pemVkQ2xvbmVJZk5lZWRlZCIsImRvY1RvTWVtb2l6ZSIsImZpbmlzaFVwZGF0ZSIsIl9yZWYiLCJ1cGRhdGVDb3VudCIsImluc2VydGVkSWQiLCJfcmV0dXJuT2JqZWN0IiwibnVtYmVyQWZmZWN0ZWQiLCJ1cGRhdGVBc3luYyIsInJlY29tcHV0ZVFpZHMiLCJfZWFjaFBvc3NpYmx5TWF0Y2hpbmdEb2NBc3luYyIsInF1ZXJ5UmVzdWx0IiwiX21vZGlmeUFuZE5vdGlmeUFzeW5jIiwibXVsdGkiLCJ1cHNlcnQiLCJfY3JlYXRlVXBzZXJ0RG9jdW1lbnQiLCJ1cGRhdGUiLCJfbW9kaWZ5QW5kTm90aWZ5U3luYyIsInVwc2VydEFzeW5jIiwic3BlY2lmaWNJZHMiLCJmb3JFYWNoQXN5bmMiLCJfZ2V0TWF0Y2hlZERvY0FuZE1vZGlmeSIsIm1hdGNoZWRfYmVmb3JlIiwib2xkX2RvYyIsImFmdGVyTWF0Y2giLCJhZnRlciIsImJlZm9yZSIsIl91cGRhdGVJblJlc3VsdHNTeW5jIiwiX3VwZGF0ZUluUmVzdWx0c0FzeW5jIiwib2xkUmVzdWx0cyIsIl9DYWNoaW5nQ2hhbmdlT2JzZXJ2ZXIiLCJvcmRlcmVkRnJvbUNhbGxiYWNrcyIsImNhbGxiYWNrcyIsImRvY3MiLCJPcmRlcmVkRGljdCIsImlkU3RyaW5naWZ5IiwiYXBwbHlDaGFuZ2UiLCJwdXRCZWZvcmUiLCJtb3ZlQmVmb3JlIiwiRGlmZlNlcXVlbmNlIiwiYXBwbHlDaGFuZ2VzIiwiSWRNYXAiLCJpZFBhcnNlIiwiX193cmFwcGVkVHJhbnNmb3JtX18iLCJ3cmFwcGVkIiwidHJhbnNmb3JtZWQiLCJub25yZWFjdGl2ZSIsIl9iaW5hcnlTZWFyY2giLCJjbXAiLCJhcnJheSIsImZpcnN0IiwicmFuZ2UiLCJoYWxmUmFuZ2UiLCJmbG9vciIsIl9jaGVja1N1cHBvcnRlZFByb2plY3Rpb24iLCJfaWRQcm9qZWN0aW9uIiwicnVsZVRyZWUiLCJzdWJkb2MiLCJzZWxlY3RvckRvY3VtZW50IiwiaXNNb2RpZnkiLCJfaXNNb2RpZmljYXRpb25Nb2QiLCJuZXdEb2MiLCJpc0luc2VydCIsInJlcGxhY2VtZW50IiwiX2RpZmZPYmplY3RzIiwibGVmdCIsInJpZ2h0IiwiZGlmZk9iamVjdHMiLCJuZXdSZXN1bHRzIiwib2JzZXJ2ZXIiLCJkaWZmUXVlcnlDaGFuZ2VzIiwiX2RpZmZRdWVyeU9yZGVyZWRDaGFuZ2VzIiwiZGlmZlF1ZXJ5T3JkZXJlZENoYW5nZXMiLCJfZGlmZlF1ZXJ5VW5vcmRlcmVkQ2hhbmdlcyIsImRpZmZRdWVyeVVub3JkZXJlZENoYW5nZXMiLCJfZmluZEluT3JkZXJlZFJlc3VsdHMiLCJzdWJJZHMiLCJfaW5zZXJ0SW5Tb3J0ZWRMaXN0Iiwic3BsaWNlIiwiaXNSZXBsYWNlIiwiaXNNb2RpZmllciIsInNldE9uSW5zZXJ0IiwibW9kRnVuYyIsIk1PRElGSUVSUyIsImtleXBhdGgiLCJrZXlwYXJ0cyIsInRhcmdldCIsImZpbmRNb2RUYXJnZXQiLCJmb3JiaWRBcnJheSIsIm5vQ3JlYXRlIiwiTk9fQ1JFQVRFX01PRElGSUVSUyIsInBvcCIsIm9ic2VydmVDYWxsYmFja3MiLCJzdXBwcmVzc2VkIiwib2JzZXJ2ZUNoYW5nZXNDYWxsYmFja3MiLCJfb2JzZXJ2ZUNhbGxiYWNrc0FyZU9yZGVyZWQiLCJpbmRpY2VzIiwiX25vX2luZGljZXMiLCJjaGVjayIsImFkZGVkQXQiLCJjaGFuZ2VkQXQiLCJvbGREb2MiLCJtb3ZlZFRvIiwiZnJvbSIsInRvIiwicmVtb3ZlZEF0IiwiY2hhbmdlT2JzZXJ2ZXIiLCJfZnJvbU9ic2VydmUiLCJub25NdXRhdGluZ0NhbGxiYWNrcyIsInNldFN1cHByZXNzZWQiLCJoIiwiX2gkaXNSZWFkeVByb21pc2UiLCJfaXNQcm9taXNlIiwiY2hhbmdlZEZpZWxkcyIsIm1ha2VDaGFuZ2VkRmllbGRzIiwib2xkX2lkeCIsIm5ld19pZHgiLCIkY3VycmVudERhdGUiLCJEYXRlIiwiJGluYyIsIiRtaW4iLCIkbWF4IiwiJG11bCIsIiRyZW5hbWUiLCJ0YXJnZXQyIiwiJHNldE9uSW5zZXJ0IiwiJHB1c2giLCIkZWFjaCIsInRvUHVzaCIsInBvc2l0aW9uIiwiJHBvc2l0aW9uIiwiJHNsaWNlIiwic29ydEZ1bmN0aW9uIiwiJHNvcnQiLCJzcGxpY2VBcmd1bWVudHMiLCIkcHVzaEFsbCIsIiRhZGRUb1NldCIsImlzRWFjaCIsInZhbHVlcyIsInRvQWRkIiwiJHBvcCIsInRvUG9wIiwiJHB1bGwiLCJ0b1B1bGwiLCJvdXQiLCIkcHVsbEFsbCIsIiRiaXQiLCIkdiIsImludmFsaWRDaGFyTXNnIiwiJCIsImFzc2VydElzVmFsaWRGaWVsZE5hbWUiLCJ1c2VkQXJyYXlJbmRleCIsImxhc3QiLCJrZXlwYXJ0IiwicGFyc2VJbnQiLCJEZWNpbWFsIiwiX1BhY2thZ2UkbW9uZ29EZWNpbWEiLCJEZWNpbWFsU3R1YiIsImlzVXBkYXRlIiwiX2RvY01hdGNoZXIiLCJfY29tcGlsZVNlbGVjdG9yIiwiaGFzV2hlcmUiLCJrZXlPcmRlclNlbnNpdGl2ZSIsIl90eXBlb3JkZXIiLCJ0IiwidGEiLCJ0YiIsIm9hIiwib2IiLCJ0b0hleFN0cmluZyIsImlzTmFOIiwiZ2V0VGltZSIsIm1pbnVzIiwidG9OdW1iZXIiLCJ0b0FycmF5IiwiTG9jYWxDb2xsZWN0aW9uXyIsInNwZWMiLCJfc29ydFNwZWNQYXJ0cyIsIl9zb3J0RnVuY3Rpb24iLCJhZGRTcGVjUGFydCIsImFzY2VuZGluZyIsImNoYXJBdCIsImxvb2t1cCIsIl9rZXlDb21wYXJhdG9yIiwiY29tcG9zZUNvbXBhcmF0b3JzIiwiX2tleUZpZWxkQ29tcGFyYXRvciIsIl9nZXRCYXNlQ29tcGFyYXRvciIsIl9jb21wYXJlS2V5cyIsImtleTEiLCJrZXkyIiwiX2dlbmVyYXRlS2V5c0Zyb21Eb2MiLCJjYiIsInBhdGhGcm9tSW5kaWNlcyIsImtub3duUGF0aHMiLCJ2YWx1ZXNCeUluZGV4QW5kUGF0aCIsInVzZWRQYXRocyIsInNvbGVLZXkiLCJkb2MxIiwiZG9jMiIsIl9nZXRNaW5LZXlGcm9tRG9jIiwibWluS2V5IiwiaW52ZXJ0IiwiY29tcGFyZSIsImNvbXBhcmF0b3JBcnJheSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBQUFBLE1BQU0sQ0FBQ0MsSUFBSSxDQUFDLHVCQUF1QixDQUFDO0lBQUMsSUFBSUMsTUFBTSxFQUFDQyxZQUFZLEVBQUNDLGdCQUFnQixFQUFDQyxXQUFXLEVBQUNDLGlCQUFpQjtJQUFDTixNQUFNLENBQUNDLElBQUksQ0FBQyxhQUFhLEVBQUM7TUFBQ0MsTUFBTUEsQ0FBQ0ssQ0FBQyxFQUFDO1FBQUNMLE1BQU0sR0FBQ0ssQ0FBQztNQUFBLENBQUM7TUFBQ0osWUFBWUEsQ0FBQ0ksQ0FBQyxFQUFDO1FBQUNKLFlBQVksR0FBQ0ksQ0FBQztNQUFBLENBQUM7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QUNBO01BQ0E4b0IsbUJBQW1CQSxDQUFDeG5CLENBQUMsRUFBRTtRQUNyQixNQUFNd29CLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQ3hCLGNBQWMsQ0FBQ2huQixDQUFDLENBQUMsQ0FBQ21uQixTQUFTO1FBRWhELE9BQU8sQ0FBQ1EsSUFBSSxFQUFFQyxJQUFJLEtBQUs7VUFDckIsTUFBTWEsT0FBTyxHQUFHM25CLGVBQWUsQ0FBQ3lGLEVBQUUsQ0FBQ3VJLElBQUksQ0FBQzZZLElBQUksQ0FBQzNuQixDQUFDLENBQUMsRUFBRTRuQixJQUFJLENBQUM1bkIsQ0FBQyxDQUFDLENBQUM7VUFDekQsT0FBT3dvQixNQUFNLEdBQUcsQ0FBQ0MsT0FBTyxHQUFHQSxPQUFPO1FBQ3BDLENBQUM7TUFDSDtJQUNGO0lBRUE7SUFDQTtJQUNBO0lBQ0E7SUFDQSxTQUFTbEIsa0JBQWtCQSxDQUFDbUIsZUFBZSxFQUFFO01BQzNDLE9BQU8sQ0FBQzlnQixDQUFDLEVBQUVDLENBQUMsS0FBSztRQUNmLEtBQUssSUFBSTdILENBQUMsR0FBRyxDQUFDLEVBQUVBLENBQUMsR0FBRzBvQixlQUFlLENBQUN4b0IsTUFBTSxFQUFFLEVBQUVGLENBQUMsRUFBRTtVQUMvQyxNQUFNeW9CLE9BQU8sR0FBR0MsZUFBZSxDQUFDMW9CLENBQUMsQ0FBQyxDQUFDNEgsQ0FBQyxFQUFFQyxDQUFDLENBQUM7VUFDeEMsSUFBSTRnQixPQUFPLEtBQUssQ0FBQyxFQUFFO1lBQ2pCLE9BQU9BLE9BQU87VUFDaEI7UUFDRjtRQUVBLE9BQU8sQ0FBQztNQUNWLENBQUM7SUFDSDtJQUFDemtCLHNCQUFBO0VBQUEsU0FBQUMsV0FBQTtJQUFBLE9BQUFELHNCQUFBLENBQUFDLFdBQUE7RUFBQTtFQUFBRCxzQkFBQTtBQUFBO0VBQUFFLElBQUE7RUFBQUMsS0FBQTtBQUFBLEciLCJmaWxlIjoiL3BhY2thZ2VzL21pbmltb25nby5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAnLi9taW5pbW9uZ29fY29tbW9uLmpzJztcbmltcG9ydCB7XG4gIGhhc093bixcbiAgaXNOdW1lcmljS2V5LFxuICBpc09wZXJhdG9yT2JqZWN0LFxuICBwYXRoc1RvVHJlZSxcbiAgcHJvamVjdGlvbkRldGFpbHMsXG59IGZyb20gJy4vY29tbW9uLmpzJztcblxuTWluaW1vbmdvLl9wYXRoc0VsaWRpbmdOdW1lcmljS2V5cyA9IHBhdGhzID0+IHBhdGhzLm1hcChwYXRoID0+XG4gIHBhdGguc3BsaXQoJy4nKS5maWx0ZXIocGFydCA9PiAhaXNOdW1lcmljS2V5KHBhcnQpKS5qb2luKCcuJylcbik7XG5cbi8vIFJldHVybnMgdHJ1ZSBpZiB0aGUgbW9kaWZpZXIgYXBwbGllZCB0byBzb21lIGRvY3VtZW50IG1heSBjaGFuZ2UgdGhlIHJlc3VsdFxuLy8gb2YgbWF0Y2hpbmcgdGhlIGRvY3VtZW50IGJ5IHNlbGVjdG9yXG4vLyBUaGUgbW9kaWZpZXIgaXMgYWx3YXlzIGluIGEgZm9ybSBvZiBPYmplY3Q6XG4vLyAgLSAkc2V0XG4vLyAgICAtICdhLmIuMjIueic6IHZhbHVlXG4vLyAgICAtICdmb28uYmFyJzogNDJcbi8vICAtICR1bnNldFxuLy8gICAgLSAnYWJjLmQnOiAxXG5NaW5pbW9uZ28uTWF0Y2hlci5wcm90b3R5cGUuYWZmZWN0ZWRCeU1vZGlmaWVyID0gZnVuY3Rpb24obW9kaWZpZXIpIHtcbiAgLy8gc2FmZSBjaGVjayBmb3IgJHNldC8kdW5zZXQgYmVpbmcgb2JqZWN0c1xuICBtb2RpZmllciA9IE9iamVjdC5hc3NpZ24oeyRzZXQ6IHt9LCAkdW5zZXQ6IHt9fSwgbW9kaWZpZXIpO1xuXG4gIGNvbnN0IG1lYW5pbmdmdWxQYXRocyA9IHRoaXMuX2dldFBhdGhzKCk7XG4gIGNvbnN0IG1vZGlmaWVkUGF0aHMgPSBbXS5jb25jYXQoXG4gICAgT2JqZWN0LmtleXMobW9kaWZpZXIuJHNldCksXG4gICAgT2JqZWN0LmtleXMobW9kaWZpZXIuJHVuc2V0KVxuICApO1xuXG4gIHJldHVybiBtb2RpZmllZFBhdGhzLnNvbWUocGF0aCA9PiB7XG4gICAgY29uc3QgbW9kID0gcGF0aC5zcGxpdCgnLicpO1xuXG4gICAgcmV0dXJuIG1lYW5pbmdmdWxQYXRocy5zb21lKG1lYW5pbmdmdWxQYXRoID0+IHtcbiAgICAgIGNvbnN0IHNlbCA9IG1lYW5pbmdmdWxQYXRoLnNwbGl0KCcuJyk7XG5cbiAgICAgIGxldCBpID0gMCwgaiA9IDA7XG5cbiAgICAgIHdoaWxlIChpIDwgc2VsLmxlbmd0aCAmJiBqIDwgbW9kLmxlbmd0aCkge1xuICAgICAgICBpZiAoaXNOdW1lcmljS2V5KHNlbFtpXSkgJiYgaXNOdW1lcmljS2V5KG1vZFtqXSkpIHtcbiAgICAgICAgICAvLyBmb28uNC5iYXIgc2VsZWN0b3IgYWZmZWN0ZWQgYnkgZm9vLjQgbW9kaWZpZXJcbiAgICAgICAgICAvLyBmb28uMy5iYXIgc2VsZWN0b3IgdW5hZmZlY3RlZCBieSBmb28uNCBtb2RpZmllclxuICAgICAgICAgIGlmIChzZWxbaV0gPT09IG1vZFtqXSkge1xuICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgaisrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGlzTnVtZXJpY0tleShzZWxbaV0pKSB7XG4gICAgICAgICAgLy8gZm9vLjQuYmFyIHNlbGVjdG9yIHVuYWZmZWN0ZWQgYnkgZm9vLmJhciBtb2RpZmllclxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIGlmIChpc051bWVyaWNLZXkobW9kW2pdKSkge1xuICAgICAgICAgIGorKztcbiAgICAgICAgfSBlbHNlIGlmIChzZWxbaV0gPT09IG1vZFtqXSkge1xuICAgICAgICAgIGkrKztcbiAgICAgICAgICBqKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIE9uZSBpcyBhIHByZWZpeCBvZiBhbm90aGVyLCB0YWtpbmcgbnVtZXJpYyBmaWVsZHMgaW50byBhY2NvdW50XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG4vLyBAcGFyYW0gbW9kaWZpZXIgLSBPYmplY3Q6IE1vbmdvREItc3R5bGVkIG1vZGlmaWVyIHdpdGggYCRzZXRgcyBhbmQgYCR1bnNldHNgXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ubHkuIChhc3N1bWVkIHRvIGNvbWUgZnJvbSBvcGxvZylcbi8vIEByZXR1cm5zIC0gQm9vbGVhbjogaWYgYWZ0ZXIgYXBwbHlpbmcgdGhlIG1vZGlmaWVyLCBzZWxlY3RvciBjYW4gc3RhcnRcbi8vICAgICAgICAgICAgICAgICAgICAgYWNjZXB0aW5nIHRoZSBtb2RpZmllZCB2YWx1ZS5cbi8vIE5PVEU6IGFzc3VtZXMgdGhhdCBkb2N1bWVudCBhZmZlY3RlZCBieSBtb2RpZmllciBkaWRuJ3QgbWF0Y2ggdGhpcyBNYXRjaGVyXG4vLyBiZWZvcmUsIHNvIGlmIG1vZGlmaWVyIGNhbid0IGNvbnZpbmNlIHNlbGVjdG9yIGluIGEgcG9zaXRpdmUgY2hhbmdlIGl0IHdvdWxkXG4vLyBzdGF5ICdmYWxzZScuXG4vLyBDdXJyZW50bHkgZG9lc24ndCBzdXBwb3J0ICQtb3BlcmF0b3JzIGFuZCBudW1lcmljIGluZGljZXMgcHJlY2lzZWx5LlxuTWluaW1vbmdvLk1hdGNoZXIucHJvdG90eXBlLmNhbkJlY29tZVRydWVCeU1vZGlmaWVyID0gZnVuY3Rpb24obW9kaWZpZXIpIHtcbiAgaWYgKCF0aGlzLmFmZmVjdGVkQnlNb2RpZmllcihtb2RpZmllcikpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAoIXRoaXMuaXNTaW1wbGUoKSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgbW9kaWZpZXIgPSBPYmplY3QuYXNzaWduKHskc2V0OiB7fSwgJHVuc2V0OiB7fX0sIG1vZGlmaWVyKTtcblxuICBjb25zdCBtb2RpZmllclBhdGhzID0gW10uY29uY2F0KFxuICAgIE9iamVjdC5rZXlzKG1vZGlmaWVyLiRzZXQpLFxuICAgIE9iamVjdC5rZXlzKG1vZGlmaWVyLiR1bnNldClcbiAgKTtcblxuICBpZiAodGhpcy5fZ2V0UGF0aHMoKS5zb21lKHBhdGhIYXNOdW1lcmljS2V5cykgfHxcbiAgICAgIG1vZGlmaWVyUGF0aHMuc29tZShwYXRoSGFzTnVtZXJpY0tleXMpKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBjaGVjayBpZiB0aGVyZSBpcyBhICRzZXQgb3IgJHVuc2V0IHRoYXQgaW5kaWNhdGVzIHNvbWV0aGluZyBpcyBhblxuICAvLyBvYmplY3QgcmF0aGVyIHRoYW4gYSBzY2FsYXIgaW4gdGhlIGFjdHVhbCBvYmplY3Qgd2hlcmUgd2Ugc2F3ICQtb3BlcmF0b3JcbiAgLy8gTk9URTogaXQgaXMgY29ycmVjdCBzaW5jZSB3ZSBhbGxvdyBvbmx5IHNjYWxhcnMgaW4gJC1vcGVyYXRvcnNcbiAgLy8gRXhhbXBsZTogZm9yIHNlbGVjdG9yIHsnYS5iJzogeyRndDogNX19IHRoZSBtb2RpZmllciB7J2EuYi5jJzo3fSB3b3VsZFxuICAvLyBkZWZpbml0ZWx5IHNldCB0aGUgcmVzdWx0IHRvIGZhbHNlIGFzICdhLmInIGFwcGVhcnMgdG8gYmUgYW4gb2JqZWN0LlxuICBjb25zdCBleHBlY3RlZFNjYWxhcklzT2JqZWN0ID0gT2JqZWN0LmtleXModGhpcy5fc2VsZWN0b3IpLnNvbWUocGF0aCA9PiB7XG4gICAgaWYgKCFpc09wZXJhdG9yT2JqZWN0KHRoaXMuX3NlbGVjdG9yW3BhdGhdKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiBtb2RpZmllclBhdGhzLnNvbWUobW9kaWZpZXJQYXRoID0+XG4gICAgICBtb2RpZmllclBhdGguc3RhcnRzV2l0aChgJHtwYXRofS5gKVxuICAgICk7XG4gIH0pO1xuXG4gIGlmIChleHBlY3RlZFNjYWxhcklzT2JqZWN0KSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gU2VlIGlmIHdlIGNhbiBhcHBseSB0aGUgbW9kaWZpZXIgb24gdGhlIGlkZWFsbHkgbWF0Y2hpbmcgb2JqZWN0LiBJZiBpdFxuICAvLyBzdGlsbCBtYXRjaGVzIHRoZSBzZWxlY3RvciwgdGhlbiB0aGUgbW9kaWZpZXIgY291bGQgaGF2ZSB0dXJuZWQgdGhlIHJlYWxcbiAgLy8gb2JqZWN0IGluIHRoZSBkYXRhYmFzZSBpbnRvIHNvbWV0aGluZyBtYXRjaGluZy5cbiAgY29uc3QgbWF0Y2hpbmdEb2N1bWVudCA9IEVKU09OLmNsb25lKHRoaXMubWF0Y2hpbmdEb2N1bWVudCgpKTtcblxuICAvLyBUaGUgc2VsZWN0b3IgaXMgdG9vIGNvbXBsZXgsIGFueXRoaW5nIGNhbiBoYXBwZW4uXG4gIGlmIChtYXRjaGluZ0RvY3VtZW50ID09PSBudWxsKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICB0cnkge1xuICAgIExvY2FsQ29sbGVjdGlvbi5fbW9kaWZ5KG1hdGNoaW5nRG9jdW1lbnQsIG1vZGlmaWVyKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAvLyBDb3VsZG4ndCBzZXQgYSBwcm9wZXJ0eSBvbiBhIGZpZWxkIHdoaWNoIGlzIGEgc2NhbGFyIG9yIG51bGwgaW4gdGhlXG4gICAgLy8gc2VsZWN0b3IuXG4gICAgLy8gRXhhbXBsZTpcbiAgICAvLyByZWFsIGRvY3VtZW50OiB7ICdhLmInOiAzIH1cbiAgICAvLyBzZWxlY3RvcjogeyAnYSc6IDEyIH1cbiAgICAvLyBjb252ZXJ0ZWQgc2VsZWN0b3IgKGlkZWFsIGRvY3VtZW50KTogeyAnYSc6IDEyIH1cbiAgICAvLyBtb2RpZmllcjogeyAkc2V0OiB7ICdhLmInOiA0IH0gfVxuICAgIC8vIFdlIGRvbid0IGtub3cgd2hhdCByZWFsIGRvY3VtZW50IHdhcyBsaWtlIGJ1dCBmcm9tIHRoZSBlcnJvciByYWlzZWQgYnlcbiAgICAvLyAkc2V0IG9uIGEgc2NhbGFyIGZpZWxkIHdlIGNhbiByZWFzb24gdGhhdCB0aGUgc3RydWN0dXJlIG9mIHJlYWwgZG9jdW1lbnRcbiAgICAvLyBpcyBjb21wbGV0ZWx5IGRpZmZlcmVudC5cbiAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ01pbmltb25nb0Vycm9yJyAmJiBlcnJvci5zZXRQcm9wZXJ0eUVycm9yKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cblxuICByZXR1cm4gdGhpcy5kb2N1bWVudE1hdGNoZXMobWF0Y2hpbmdEb2N1bWVudCkucmVzdWx0O1xufTtcblxuLy8gS25vd3MgaG93IHRvIGNvbWJpbmUgYSBtb25nbyBzZWxlY3RvciBhbmQgYSBmaWVsZHMgcHJvamVjdGlvbiB0byBhIG5ldyBmaWVsZHNcbi8vIHByb2plY3Rpb24gdGFraW5nIGludG8gYWNjb3VudCBhY3RpdmUgZmllbGRzIGZyb20gdGhlIHBhc3NlZCBzZWxlY3Rvci5cbi8vIEByZXR1cm5zIE9iamVjdCAtIHByb2plY3Rpb24gb2JqZWN0IChzYW1lIGFzIGZpZWxkcyBvcHRpb24gb2YgbW9uZ28gY3Vyc29yKVxuTWluaW1vbmdvLk1hdGNoZXIucHJvdG90eXBlLmNvbWJpbmVJbnRvUHJvamVjdGlvbiA9IGZ1bmN0aW9uKHByb2plY3Rpb24pIHtcbiAgY29uc3Qgc2VsZWN0b3JQYXRocyA9IE1pbmltb25nby5fcGF0aHNFbGlkaW5nTnVtZXJpY0tleXModGhpcy5fZ2V0UGF0aHMoKSk7XG5cbiAgLy8gU3BlY2lhbCBjYXNlIGZvciAkd2hlcmUgb3BlcmF0b3IgaW4gdGhlIHNlbGVjdG9yIC0gcHJvamVjdGlvbiBzaG91bGQgZGVwZW5kXG4gIC8vIG9uIGFsbCBmaWVsZHMgb2YgdGhlIGRvY3VtZW50LiBnZXRTZWxlY3RvclBhdGhzIHJldHVybnMgYSBsaXN0IG9mIHBhdGhzXG4gIC8vIHNlbGVjdG9yIGRlcGVuZHMgb24uIElmIG9uZSBvZiB0aGUgcGF0aHMgaXMgJycgKGVtcHR5IHN0cmluZykgcmVwcmVzZW50aW5nXG4gIC8vIHRoZSByb290IG9yIHRoZSB3aG9sZSBkb2N1bWVudCwgY29tcGxldGUgcHJvamVjdGlvbiBzaG91bGQgYmUgcmV0dXJuZWQuXG4gIGlmIChzZWxlY3RvclBhdGhzLmluY2x1ZGVzKCcnKSkge1xuICAgIHJldHVybiB7fTtcbiAgfVxuXG4gIHJldHVybiBjb21iaW5lSW1wb3J0YW50UGF0aHNJbnRvUHJvamVjdGlvbihzZWxlY3RvclBhdGhzLCBwcm9qZWN0aW9uKTtcbn07XG5cbi8vIFJldHVybnMgYW4gb2JqZWN0IHRoYXQgd291bGQgbWF0Y2ggdGhlIHNlbGVjdG9yIGlmIHBvc3NpYmxlIG9yIG51bGwgaWYgdGhlXG4vLyBzZWxlY3RvciBpcyB0b28gY29tcGxleCBmb3IgdXMgdG8gYW5hbHl6ZVxuLy8geyAnYS5iJzogeyBhbnM6IDQyIH0sICdmb28uYmFyJzogbnVsbCwgJ2Zvby5iYXonOiBcInNvbWV0aGluZ1wiIH1cbi8vID0+IHsgYTogeyBiOiB7IGFuczogNDIgfSB9LCBmb286IHsgYmFyOiBudWxsLCBiYXo6IFwic29tZXRoaW5nXCIgfSB9XG5NaW5pbW9uZ28uTWF0Y2hlci5wcm90b3R5cGUubWF0Y2hpbmdEb2N1bWVudCA9IGZ1bmN0aW9uKCkge1xuICAvLyBjaGVjayBpZiBpdCB3YXMgY29tcHV0ZWQgYmVmb3JlXG4gIGlmICh0aGlzLl9tYXRjaGluZ0RvY3VtZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdGhpcy5fbWF0Y2hpbmdEb2N1bWVudDtcbiAgfVxuXG4gIC8vIElmIHRoZSBhbmFseXNpcyBvZiB0aGlzIHNlbGVjdG9yIGlzIHRvbyBoYXJkIGZvciBvdXIgaW1wbGVtZW50YXRpb25cbiAgLy8gZmFsbGJhY2sgdG8gXCJZRVNcIlxuICBsZXQgZmFsbGJhY2sgPSBmYWxzZTtcblxuICB0aGlzLl9tYXRjaGluZ0RvY3VtZW50ID0gcGF0aHNUb1RyZWUoXG4gICAgdGhpcy5fZ2V0UGF0aHMoKSxcbiAgICBwYXRoID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlU2VsZWN0b3IgPSB0aGlzLl9zZWxlY3RvcltwYXRoXTtcblxuICAgICAgaWYgKGlzT3BlcmF0b3JPYmplY3QodmFsdWVTZWxlY3RvcikpIHtcbiAgICAgICAgLy8gaWYgdGhlcmUgaXMgYSBzdHJpY3QgZXF1YWxpdHksIHRoZXJlIGlzIGEgZ29vZFxuICAgICAgICAvLyBjaGFuY2Ugd2UgY2FuIHVzZSBvbmUgb2YgdGhvc2UgYXMgXCJtYXRjaGluZ1wiXG4gICAgICAgIC8vIGR1bW15IHZhbHVlXG4gICAgICAgIGlmICh2YWx1ZVNlbGVjdG9yLiRlcSkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZVNlbGVjdG9yLiRlcTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2YWx1ZVNlbGVjdG9yLiRpbikge1xuICAgICAgICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgTWluaW1vbmdvLk1hdGNoZXIoe3BsYWNlaG9sZGVyOiB2YWx1ZVNlbGVjdG9yfSk7XG5cbiAgICAgICAgICAvLyBSZXR1cm4gYW55dGhpbmcgZnJvbSAkaW4gdGhhdCBtYXRjaGVzIHRoZSB3aG9sZSBzZWxlY3RvciBmb3IgdGhpc1xuICAgICAgICAgIC8vIHBhdGguIElmIG5vdGhpbmcgbWF0Y2hlcywgcmV0dXJucyBgdW5kZWZpbmVkYCBhcyBub3RoaW5nIGNhbiBtYWtlXG4gICAgICAgICAgLy8gdGhpcyBzZWxlY3RvciBpbnRvIGB0cnVlYC5cbiAgICAgICAgICByZXR1cm4gdmFsdWVTZWxlY3Rvci4kaW4uZmluZChwbGFjZWhvbGRlciA9PlxuICAgICAgICAgICAgbWF0Y2hlci5kb2N1bWVudE1hdGNoZXMoe3BsYWNlaG9sZGVyfSkucmVzdWx0XG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvbmx5Q29udGFpbnNLZXlzKHZhbHVlU2VsZWN0b3IsIFsnJGd0JywgJyRndGUnLCAnJGx0JywgJyRsdGUnXSkpIHtcbiAgICAgICAgICBsZXQgbG93ZXJCb3VuZCA9IC1JbmZpbml0eTtcbiAgICAgICAgICBsZXQgdXBwZXJCb3VuZCA9IEluZmluaXR5O1xuXG4gICAgICAgICAgWyckbHRlJywgJyRsdCddLmZvckVhY2gob3AgPT4ge1xuICAgICAgICAgICAgaWYgKGhhc093bi5jYWxsKHZhbHVlU2VsZWN0b3IsIG9wKSAmJlxuICAgICAgICAgICAgICAgIHZhbHVlU2VsZWN0b3Jbb3BdIDwgdXBwZXJCb3VuZCkge1xuICAgICAgICAgICAgICB1cHBlckJvdW5kID0gdmFsdWVTZWxlY3RvcltvcF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBbJyRndGUnLCAnJGd0J10uZm9yRWFjaChvcCA9PiB7XG4gICAgICAgICAgICBpZiAoaGFzT3duLmNhbGwodmFsdWVTZWxlY3Rvciwgb3ApICYmXG4gICAgICAgICAgICAgICAgdmFsdWVTZWxlY3RvcltvcF0gPiBsb3dlckJvdW5kKSB7XG4gICAgICAgICAgICAgIGxvd2VyQm91bmQgPSB2YWx1ZVNlbGVjdG9yW29wXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGNvbnN0IG1pZGRsZSA9IChsb3dlckJvdW5kICsgdXBwZXJCb3VuZCkgLyAyO1xuICAgICAgICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgTWluaW1vbmdvLk1hdGNoZXIoe3BsYWNlaG9sZGVyOiB2YWx1ZVNlbGVjdG9yfSk7XG5cbiAgICAgICAgICBpZiAoIW1hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKHtwbGFjZWhvbGRlcjogbWlkZGxlfSkucmVzdWx0ICYmXG4gICAgICAgICAgICAgIChtaWRkbGUgPT09IGxvd2VyQm91bmQgfHwgbWlkZGxlID09PSB1cHBlckJvdW5kKSkge1xuICAgICAgICAgICAgZmFsbGJhY2sgPSB0cnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBtaWRkbGU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob25seUNvbnRhaW5zS2V5cyh2YWx1ZVNlbGVjdG9yLCBbJyRuaW4nLCAnJG5lJ10pKSB7XG4gICAgICAgICAgLy8gU2luY2UgdGhpcy5faXNTaW1wbGUgbWFrZXMgc3VyZSAkbmluIGFuZCAkbmUgYXJlIG5vdCBjb21iaW5lZCB3aXRoXG4gICAgICAgICAgLy8gb2JqZWN0cyBvciBhcnJheXMsIHdlIGNhbiBjb25maWRlbnRseSByZXR1cm4gYW4gZW1wdHkgb2JqZWN0IGFzIGl0XG4gICAgICAgICAgLy8gbmV2ZXIgbWF0Y2hlcyBhbnkgc2NhbGFyLlxuICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZhbGxiYWNrID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMuX3NlbGVjdG9yW3BhdGhdO1xuICAgIH0sXG4gICAgeCA9PiB4KTtcblxuICBpZiAoZmFsbGJhY2spIHtcbiAgICB0aGlzLl9tYXRjaGluZ0RvY3VtZW50ID0gbnVsbDtcbiAgfVxuXG4gIHJldHVybiB0aGlzLl9tYXRjaGluZ0RvY3VtZW50O1xufTtcblxuLy8gTWluaW1vbmdvLlNvcnRlciBnZXRzIGEgc2ltaWxhciBtZXRob2QsIHdoaWNoIGRlbGVnYXRlcyB0byBhIE1hdGNoZXIgaXQgbWFkZVxuLy8gZm9yIHRoaXMgZXhhY3QgcHVycG9zZS5cbk1pbmltb25nby5Tb3J0ZXIucHJvdG90eXBlLmFmZmVjdGVkQnlNb2RpZmllciA9IGZ1bmN0aW9uKG1vZGlmaWVyKSB7XG4gIHJldHVybiB0aGlzLl9zZWxlY3RvckZvckFmZmVjdGVkQnlNb2RpZmllci5hZmZlY3RlZEJ5TW9kaWZpZXIobW9kaWZpZXIpO1xufTtcblxuTWluaW1vbmdvLlNvcnRlci5wcm90b3R5cGUuY29tYmluZUludG9Qcm9qZWN0aW9uID0gZnVuY3Rpb24ocHJvamVjdGlvbikge1xuICByZXR1cm4gY29tYmluZUltcG9ydGFudFBhdGhzSW50b1Byb2plY3Rpb24oXG4gICAgTWluaW1vbmdvLl9wYXRoc0VsaWRpbmdOdW1lcmljS2V5cyh0aGlzLl9nZXRQYXRocygpKSxcbiAgICBwcm9qZWN0aW9uXG4gICk7XG59O1xuXG5mdW5jdGlvbiBjb21iaW5lSW1wb3J0YW50UGF0aHNJbnRvUHJvamVjdGlvbihwYXRocywgcHJvamVjdGlvbikge1xuICBjb25zdCBkZXRhaWxzID0gcHJvamVjdGlvbkRldGFpbHMocHJvamVjdGlvbik7XG5cbiAgLy8gbWVyZ2UgdGhlIHBhdGhzIHRvIGluY2x1ZGVcbiAgY29uc3QgdHJlZSA9IHBhdGhzVG9UcmVlKFxuICAgIHBhdGhzLFxuICAgIHBhdGggPT4gdHJ1ZSxcbiAgICAobm9kZSwgcGF0aCwgZnVsbFBhdGgpID0+IHRydWUsXG4gICAgZGV0YWlscy50cmVlXG4gICk7XG4gIGNvbnN0IG1lcmdlZFByb2plY3Rpb24gPSB0cmVlVG9QYXRocyh0cmVlKTtcblxuICBpZiAoZGV0YWlscy5pbmNsdWRpbmcpIHtcbiAgICAvLyBib3RoIHNlbGVjdG9yIGFuZCBwcm9qZWN0aW9uIGFyZSBwb2ludGluZyBvbiBmaWVsZHMgdG8gaW5jbHVkZVxuICAgIC8vIHNvIHdlIGNhbiBqdXN0IHJldHVybiB0aGUgbWVyZ2VkIHRyZWVcbiAgICByZXR1cm4gbWVyZ2VkUHJvamVjdGlvbjtcbiAgfVxuXG4gIC8vIHNlbGVjdG9yIGlzIHBvaW50aW5nIGF0IGZpZWxkcyB0byBpbmNsdWRlXG4gIC8vIHByb2plY3Rpb24gaXMgcG9pbnRpbmcgYXQgZmllbGRzIHRvIGV4Y2x1ZGVcbiAgLy8gbWFrZSBzdXJlIHdlIGRvbid0IGV4Y2x1ZGUgaW1wb3J0YW50IHBhdGhzXG4gIGNvbnN0IG1lcmdlZEV4Y2xQcm9qZWN0aW9uID0ge307XG5cbiAgT2JqZWN0LmtleXMobWVyZ2VkUHJvamVjdGlvbikuZm9yRWFjaChwYXRoID0+IHtcbiAgICBpZiAoIW1lcmdlZFByb2plY3Rpb25bcGF0aF0pIHtcbiAgICAgIG1lcmdlZEV4Y2xQcm9qZWN0aW9uW3BhdGhdID0gZmFsc2U7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gbWVyZ2VkRXhjbFByb2plY3Rpb247XG59XG5cbmZ1bmN0aW9uIGdldFBhdGhzKHNlbGVjdG9yKSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyhuZXcgTWluaW1vbmdvLk1hdGNoZXIoc2VsZWN0b3IpLl9wYXRocyk7XG5cbiAgLy8gWFhYIHJlbW92ZSBpdD9cbiAgLy8gcmV0dXJuIE9iamVjdC5rZXlzKHNlbGVjdG9yKS5tYXAoayA9PiB7XG4gIC8vICAgLy8gd2UgZG9uJ3Qga25vdyBob3cgdG8gaGFuZGxlICR3aGVyZSBiZWNhdXNlIGl0IGNhbiBiZSBhbnl0aGluZ1xuICAvLyAgIGlmIChrID09PSAnJHdoZXJlJykge1xuICAvLyAgICAgcmV0dXJuICcnOyAvLyBtYXRjaGVzIGV2ZXJ5dGhpbmdcbiAgLy8gICB9XG5cbiAgLy8gICAvLyB3ZSBicmFuY2ggZnJvbSAkb3IvJGFuZC8kbm9yIG9wZXJhdG9yXG4gIC8vICAgaWYgKFsnJG9yJywgJyRhbmQnLCAnJG5vciddLmluY2x1ZGVzKGspKSB7XG4gIC8vICAgICByZXR1cm4gc2VsZWN0b3Jba10ubWFwKGdldFBhdGhzKTtcbiAgLy8gICB9XG5cbiAgLy8gICAvLyB0aGUgdmFsdWUgaXMgYSBsaXRlcmFsIG9yIHNvbWUgY29tcGFyaXNvbiBvcGVyYXRvclxuICAvLyAgIHJldHVybiBrO1xuICAvLyB9KVxuICAvLyAgIC5yZWR1Y2UoKGEsIGIpID0+IGEuY29uY2F0KGIpLCBbXSlcbiAgLy8gICAuZmlsdGVyKChhLCBiLCBjKSA9PiBjLmluZGV4T2YoYSkgPT09IGIpO1xufVxuXG4vLyBBIGhlbHBlciB0byBlbnN1cmUgb2JqZWN0IGhhcyBvbmx5IGNlcnRhaW4ga2V5c1xuZnVuY3Rpb24gb25seUNvbnRhaW5zS2V5cyhvYmosIGtleXMpIHtcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG9iaikuZXZlcnkoayA9PiBrZXlzLmluY2x1ZGVzKGspKTtcbn1cblxuZnVuY3Rpb24gcGF0aEhhc051bWVyaWNLZXlzKHBhdGgpIHtcbiAgcmV0dXJuIHBhdGguc3BsaXQoJy4nKS5zb21lKGlzTnVtZXJpY0tleSk7XG59XG5cbi8vIFJldHVybnMgYSBzZXQgb2Yga2V5IHBhdGhzIHNpbWlsYXIgdG9cbi8vIHsgJ2Zvby5iYXInOiAxLCAnYS5iLmMnOiAxIH1cbmZ1bmN0aW9uIHRyZWVUb1BhdGhzKHRyZWUsIHByZWZpeCA9ICcnKSB7XG4gIGNvbnN0IHJlc3VsdCA9IHt9O1xuXG4gIE9iamVjdC5rZXlzKHRyZWUpLmZvckVhY2goa2V5ID0+IHtcbiAgICBjb25zdCB2YWx1ZSA9IHRyZWVba2V5XTtcbiAgICBpZiAodmFsdWUgPT09IE9iamVjdCh2YWx1ZSkpIHtcbiAgICAgIE9iamVjdC5hc3NpZ24ocmVzdWx0LCB0cmVlVG9QYXRocyh2YWx1ZSwgYCR7cHJlZml4ICsga2V5fS5gKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdFtwcmVmaXggKyBrZXldID0gdmFsdWU7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gcmVzdWx0O1xufVxuIiwiaW1wb3J0IExvY2FsQ29sbGVjdGlvbiBmcm9tICcuL2xvY2FsX2NvbGxlY3Rpb24uanMnO1xuXG5leHBvcnQgY29uc3QgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuZXhwb3J0IGNsYXNzIE1pbmlNb25nb1F1ZXJ5RXJyb3IgZXh0ZW5kcyBFcnJvciB7fVxuLy8gRWFjaCBlbGVtZW50IHNlbGVjdG9yIGNvbnRhaW5zOlxuLy8gIC0gY29tcGlsZUVsZW1lbnRTZWxlY3RvciwgYSBmdW5jdGlvbiB3aXRoIGFyZ3M6XG4vLyAgICAtIG9wZXJhbmQgLSB0aGUgXCJyaWdodCBoYW5kIHNpZGVcIiBvZiB0aGUgb3BlcmF0b3Jcbi8vICAgIC0gdmFsdWVTZWxlY3RvciAtIHRoZSBcImNvbnRleHRcIiBmb3IgdGhlIG9wZXJhdG9yIChzbyB0aGF0ICRyZWdleCBjYW4gZmluZFxuLy8gICAgICAkb3B0aW9ucylcbi8vICAgIC0gbWF0Y2hlciAtIHRoZSBNYXRjaGVyIHRoaXMgaXMgZ29pbmcgaW50byAoc28gdGhhdCAkZWxlbU1hdGNoIGNhbiBjb21waWxlXG4vLyAgICAgIG1vcmUgdGhpbmdzKVxuLy8gICAgcmV0dXJuaW5nIGEgZnVuY3Rpb24gbWFwcGluZyBhIHNpbmdsZSB2YWx1ZSB0byBib29sLlxuLy8gIC0gZG9udEV4cGFuZExlYWZBcnJheXMsIGEgYm9vbCB3aGljaCBwcmV2ZW50cyBleHBhbmRBcnJheXNJbkJyYW5jaGVzIGZyb21cbi8vICAgIGJlaW5nIGNhbGxlZFxuLy8gIC0gZG9udEluY2x1ZGVMZWFmQXJyYXlzLCBhIGJvb2wgd2hpY2ggY2F1c2VzIGFuIGFyZ3VtZW50IHRvIGJlIHBhc3NlZCB0b1xuLy8gICAgZXhwYW5kQXJyYXlzSW5CcmFuY2hlcyBpZiBpdCBpcyBjYWxsZWRcbmV4cG9ydCBjb25zdCBFTEVNRU5UX09QRVJBVE9SUyA9IHtcbiAgJGx0OiBtYWtlSW5lcXVhbGl0eShjbXBWYWx1ZSA9PiBjbXBWYWx1ZSA8IDApLFxuICAkZ3Q6IG1ha2VJbmVxdWFsaXR5KGNtcFZhbHVlID0+IGNtcFZhbHVlID4gMCksXG4gICRsdGU6IG1ha2VJbmVxdWFsaXR5KGNtcFZhbHVlID0+IGNtcFZhbHVlIDw9IDApLFxuICAkZ3RlOiBtYWtlSW5lcXVhbGl0eShjbXBWYWx1ZSA9PiBjbXBWYWx1ZSA+PSAwKSxcbiAgJG1vZDoge1xuICAgIGNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZCkge1xuICAgICAgaWYgKCEoQXJyYXkuaXNBcnJheShvcGVyYW5kKSAmJiBvcGVyYW5kLmxlbmd0aCA9PT0gMlxuICAgICAgICAgICAgJiYgdHlwZW9mIG9wZXJhbmRbMF0gPT09ICdudW1iZXInXG4gICAgICAgICAgICAmJiB0eXBlb2Ygb3BlcmFuZFsxXSA9PT0gJ251bWJlcicpKSB7XG4gICAgICAgIHRocm93IG5ldyBNaW5pTW9uZ29RdWVyeUVycm9yKCdhcmd1bWVudCB0byAkbW9kIG11c3QgYmUgYW4gYXJyYXkgb2YgdHdvIG51bWJlcnMnKTtcbiAgICAgIH1cblxuICAgICAgLy8gWFhYIGNvdWxkIHJlcXVpcmUgdG8gYmUgaW50cyBvciByb3VuZCBvciBzb21ldGhpbmdcbiAgICAgIGNvbnN0IGRpdmlzb3IgPSBvcGVyYW5kWzBdO1xuICAgICAgY29uc3QgcmVtYWluZGVyID0gb3BlcmFuZFsxXTtcbiAgICAgIHJldHVybiB2YWx1ZSA9PiAoXG4gICAgICAgIHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgJiYgdmFsdWUgJSBkaXZpc29yID09PSByZW1haW5kZXJcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcbiAgJGluOiB7XG4gICAgY29tcGlsZUVsZW1lbnRTZWxlY3RvcihvcGVyYW5kKSB7XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkob3BlcmFuZCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IE1pbmlNb25nb1F1ZXJ5RXJyb3IoJyRpbiBuZWVkcyBhbiBhcnJheScpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBlbGVtZW50TWF0Y2hlcnMgPSBvcGVyYW5kLm1hcChvcHRpb24gPT4ge1xuICAgICAgICBpZiAob3B0aW9uIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICAgICAgcmV0dXJuIHJlZ2V4cEVsZW1lbnRNYXRjaGVyKG9wdGlvbik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaXNPcGVyYXRvck9iamVjdChvcHRpb24pKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IE1pbmlNb25nb1F1ZXJ5RXJyb3IoJ2Nhbm5vdCBuZXN0ICQgdW5kZXIgJGluJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXF1YWxpdHlFbGVtZW50TWF0Y2hlcihvcHRpb24pO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiB2YWx1ZSA9PiB7XG4gICAgICAgIC8vIEFsbG93IHthOiB7JGluOiBbbnVsbF19fSB0byBtYXRjaCB3aGVuICdhJyBkb2VzIG5vdCBleGlzdC5cbiAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB2YWx1ZSA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZWxlbWVudE1hdGNoZXJzLnNvbWUobWF0Y2hlciA9PiBtYXRjaGVyKHZhbHVlKSk7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG4gICRzaXplOiB7XG4gICAgLy8ge2E6IFtbNSwgNV1dfSBtdXN0IG1hdGNoIHthOiB7JHNpemU6IDF9fSBidXQgbm90IHthOiB7JHNpemU6IDJ9fSwgc28gd2VcbiAgICAvLyBkb24ndCB3YW50IHRvIGNvbnNpZGVyIHRoZSBlbGVtZW50IFs1LDVdIGluIHRoZSBsZWFmIGFycmF5IFtbNSw1XV0gYXMgYVxuICAgIC8vIHBvc3NpYmxlIHZhbHVlLlxuICAgIGRvbnRFeHBhbmRMZWFmQXJyYXlzOiB0cnVlLFxuICAgIGNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZCkge1xuICAgICAgaWYgKHR5cGVvZiBvcGVyYW5kID09PSAnc3RyaW5nJykge1xuICAgICAgICAvLyBEb24ndCBhc2sgbWUgd2h5LCBidXQgYnkgZXhwZXJpbWVudGF0aW9uLCB0aGlzIHNlZW1zIHRvIGJlIHdoYXQgTW9uZ29cbiAgICAgICAgLy8gZG9lcy5cbiAgICAgICAgb3BlcmFuZCA9IDA7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBvcGVyYW5kICE9PSAnbnVtYmVyJykge1xuICAgICAgICB0aHJvdyBuZXcgTWluaU1vbmdvUXVlcnlFcnJvcignJHNpemUgbmVlZHMgYSBudW1iZXInKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHZhbHVlID0+IEFycmF5LmlzQXJyYXkodmFsdWUpICYmIHZhbHVlLmxlbmd0aCA9PT0gb3BlcmFuZDtcbiAgICB9LFxuICB9LFxuICAkdHlwZToge1xuICAgIC8vIHthOiBbNV19IG11c3Qgbm90IG1hdGNoIHthOiB7JHR5cGU6IDR9fSAoNCBtZWFucyBhcnJheSksIGJ1dCBpdCBzaG91bGRcbiAgICAvLyBtYXRjaCB7YTogeyR0eXBlOiAxfX0gKDEgbWVhbnMgbnVtYmVyKSwgYW5kIHthOiBbWzVdXX0gbXVzdCBtYXRjaCB7JGE6XG4gICAgLy8geyR0eXBlOiA0fX0uIFRodXMsIHdoZW4gd2Ugc2VlIGEgbGVhZiBhcnJheSwgd2UgKnNob3VsZCogZXhwYW5kIGl0IGJ1dFxuICAgIC8vIHNob3VsZCAqbm90KiBpbmNsdWRlIGl0IGl0c2VsZi5cbiAgICBkb250SW5jbHVkZUxlYWZBcnJheXM6IHRydWUsXG4gICAgY29tcGlsZUVsZW1lbnRTZWxlY3RvcihvcGVyYW5kKSB7XG4gICAgICBpZiAodHlwZW9mIG9wZXJhbmQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGNvbnN0IG9wZXJhbmRBbGlhc01hcCA9IHtcbiAgICAgICAgICAnZG91YmxlJzogMSxcbiAgICAgICAgICAnc3RyaW5nJzogMixcbiAgICAgICAgICAnb2JqZWN0JzogMyxcbiAgICAgICAgICAnYXJyYXknOiA0LFxuICAgICAgICAgICdiaW5EYXRhJzogNSxcbiAgICAgICAgICAndW5kZWZpbmVkJzogNixcbiAgICAgICAgICAnb2JqZWN0SWQnOiA3LFxuICAgICAgICAgICdib29sJzogOCxcbiAgICAgICAgICAnZGF0ZSc6IDksXG4gICAgICAgICAgJ251bGwnOiAxMCxcbiAgICAgICAgICAncmVnZXgnOiAxMSxcbiAgICAgICAgICAnZGJQb2ludGVyJzogMTIsXG4gICAgICAgICAgJ2phdmFzY3JpcHQnOiAxMyxcbiAgICAgICAgICAnc3ltYm9sJzogMTQsXG4gICAgICAgICAgJ2phdmFzY3JpcHRXaXRoU2NvcGUnOiAxNSxcbiAgICAgICAgICAnaW50JzogMTYsXG4gICAgICAgICAgJ3RpbWVzdGFtcCc6IDE3LFxuICAgICAgICAgICdsb25nJzogMTgsXG4gICAgICAgICAgJ2RlY2ltYWwnOiAxOSxcbiAgICAgICAgICAnbWluS2V5JzogLTEsXG4gICAgICAgICAgJ21heEtleSc6IDEyNyxcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCFoYXNPd24uY2FsbChvcGVyYW5kQWxpYXNNYXAsIG9wZXJhbmQpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IE1pbmlNb25nb1F1ZXJ5RXJyb3IoYHVua25vd24gc3RyaW5nIGFsaWFzIGZvciAkdHlwZTogJHtvcGVyYW5kfWApO1xuICAgICAgICB9XG4gICAgICAgIG9wZXJhbmQgPSBvcGVyYW5kQWxpYXNNYXBbb3BlcmFuZF07XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBvcGVyYW5kID09PSAnbnVtYmVyJykge1xuICAgICAgICBpZiAob3BlcmFuZCA9PT0gMCB8fCBvcGVyYW5kIDwgLTFcbiAgICAgICAgICB8fCAob3BlcmFuZCA+IDE5ICYmIG9wZXJhbmQgIT09IDEyNykpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgTWluaU1vbmdvUXVlcnlFcnJvcihgSW52YWxpZCBudW1lcmljYWwgJHR5cGUgY29kZTogJHtvcGVyYW5kfWApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgTWluaU1vbmdvUXVlcnlFcnJvcignYXJndW1lbnQgdG8gJHR5cGUgaXMgbm90IGEgbnVtYmVyIG9yIGEgc3RyaW5nJyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB2YWx1ZSA9PiAoXG4gICAgICAgIHZhbHVlICE9PSB1bmRlZmluZWQgJiYgTG9jYWxDb2xsZWN0aW9uLl9mLl90eXBlKHZhbHVlKSA9PT0gb3BlcmFuZFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuICAkYml0c0FsbFNldDoge1xuICAgIGNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZCkge1xuICAgICAgY29uc3QgbWFzayA9IGdldE9wZXJhbmRCaXRtYXNrKG9wZXJhbmQsICckYml0c0FsbFNldCcpO1xuICAgICAgcmV0dXJuIHZhbHVlID0+IHtcbiAgICAgICAgY29uc3QgYml0bWFzayA9IGdldFZhbHVlQml0bWFzayh2YWx1ZSwgbWFzay5sZW5ndGgpO1xuICAgICAgICByZXR1cm4gYml0bWFzayAmJiBtYXNrLmV2ZXJ5KChieXRlLCBpKSA9PiAoYml0bWFza1tpXSAmIGJ5dGUpID09PSBieXRlKTtcbiAgICAgIH07XG4gICAgfSxcbiAgfSxcbiAgJGJpdHNBbnlTZXQ6IHtcbiAgICBjb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQpIHtcbiAgICAgIGNvbnN0IG1hc2sgPSBnZXRPcGVyYW5kQml0bWFzayhvcGVyYW5kLCAnJGJpdHNBbnlTZXQnKTtcbiAgICAgIHJldHVybiB2YWx1ZSA9PiB7XG4gICAgICAgIGNvbnN0IGJpdG1hc2sgPSBnZXRWYWx1ZUJpdG1hc2sodmFsdWUsIG1hc2subGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIGJpdG1hc2sgJiYgbWFzay5zb21lKChieXRlLCBpKSA9PiAofmJpdG1hc2tbaV0gJiBieXRlKSAhPT0gYnl0ZSk7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG4gICRiaXRzQWxsQ2xlYXI6IHtcbiAgICBjb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQpIHtcbiAgICAgIGNvbnN0IG1hc2sgPSBnZXRPcGVyYW5kQml0bWFzayhvcGVyYW5kLCAnJGJpdHNBbGxDbGVhcicpO1xuICAgICAgcmV0dXJuIHZhbHVlID0+IHtcbiAgICAgICAgY29uc3QgYml0bWFzayA9IGdldFZhbHVlQml0bWFzayh2YWx1ZSwgbWFzay5sZW5ndGgpO1xuICAgICAgICByZXR1cm4gYml0bWFzayAmJiBtYXNrLmV2ZXJ5KChieXRlLCBpKSA9PiAhKGJpdG1hc2tbaV0gJiBieXRlKSk7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG4gICRiaXRzQW55Q2xlYXI6IHtcbiAgICBjb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQpIHtcbiAgICAgIGNvbnN0IG1hc2sgPSBnZXRPcGVyYW5kQml0bWFzayhvcGVyYW5kLCAnJGJpdHNBbnlDbGVhcicpO1xuICAgICAgcmV0dXJuIHZhbHVlID0+IHtcbiAgICAgICAgY29uc3QgYml0bWFzayA9IGdldFZhbHVlQml0bWFzayh2YWx1ZSwgbWFzay5sZW5ndGgpO1xuICAgICAgICByZXR1cm4gYml0bWFzayAmJiBtYXNrLnNvbWUoKGJ5dGUsIGkpID0+IChiaXRtYXNrW2ldICYgYnl0ZSkgIT09IGJ5dGUpO1xuICAgICAgfTtcbiAgICB9LFxuICB9LFxuICAkcmVnZXg6IHtcbiAgICBjb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQsIHZhbHVlU2VsZWN0b3IpIHtcbiAgICAgIGlmICghKHR5cGVvZiBvcGVyYW5kID09PSAnc3RyaW5nJyB8fCBvcGVyYW5kIGluc3RhbmNlb2YgUmVnRXhwKSkge1xuICAgICAgICB0aHJvdyBuZXcgTWluaU1vbmdvUXVlcnlFcnJvcignJHJlZ2V4IGhhcyB0byBiZSBhIHN0cmluZyBvciBSZWdFeHAnKTtcbiAgICAgIH1cblxuICAgICAgbGV0IHJlZ2V4cDtcbiAgICAgIGlmICh2YWx1ZVNlbGVjdG9yLiRvcHRpb25zICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gT3B0aW9ucyBwYXNzZWQgaW4gJG9wdGlvbnMgKGV2ZW4gdGhlIGVtcHR5IHN0cmluZykgYWx3YXlzIG92ZXJyaWRlc1xuICAgICAgICAvLyBvcHRpb25zIGluIHRoZSBSZWdFeHAgb2JqZWN0IGl0c2VsZi5cblxuICAgICAgICAvLyBCZSBjbGVhciB0aGF0IHdlIG9ubHkgc3VwcG9ydCB0aGUgSlMtc3VwcG9ydGVkIG9wdGlvbnMsIG5vdCBleHRlbmRlZFxuICAgICAgICAvLyBvbmVzIChlZywgTW9uZ28gc3VwcG9ydHMgeCBhbmQgcykuIElkZWFsbHkgd2Ugd291bGQgaW1wbGVtZW50IHggYW5kIHNcbiAgICAgICAgLy8gYnkgdHJhbnNmb3JtaW5nIHRoZSByZWdleHAsIGJ1dCBub3QgdG9kYXkuLi5cbiAgICAgICAgaWYgKC9bXmdpbV0vLnRlc3QodmFsdWVTZWxlY3Rvci4kb3B0aW9ucykpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgTWluaU1vbmdvUXVlcnlFcnJvcignT25seSB0aGUgaSwgbSwgYW5kIGcgcmVnZXhwIG9wdGlvbnMgYXJlIHN1cHBvcnRlZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc291cmNlID0gb3BlcmFuZCBpbnN0YW5jZW9mIFJlZ0V4cCA/IG9wZXJhbmQuc291cmNlIDogb3BlcmFuZDtcbiAgICAgICAgcmVnZXhwID0gbmV3IFJlZ0V4cChzb3VyY2UsIHZhbHVlU2VsZWN0b3IuJG9wdGlvbnMpO1xuICAgICAgfSBlbHNlIGlmIChvcGVyYW5kIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICAgIHJlZ2V4cCA9IG9wZXJhbmQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZWdleHAgPSBuZXcgUmVnRXhwKG9wZXJhbmQpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVnZXhwRWxlbWVudE1hdGNoZXIocmVnZXhwKTtcbiAgICB9LFxuICB9LFxuICAkZWxlbU1hdGNoOiB7XG4gICAgZG9udEV4cGFuZExlYWZBcnJheXM6IHRydWUsXG4gICAgY29tcGlsZUVsZW1lbnRTZWxlY3RvcihvcGVyYW5kLCB2YWx1ZVNlbGVjdG9yLCBtYXRjaGVyKSB7XG4gICAgICBpZiAoIUxvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdChvcGVyYW5kKSkge1xuICAgICAgICB0aHJvdyBuZXcgTWluaU1vbmdvUXVlcnlFcnJvcignJGVsZW1NYXRjaCBuZWVkIGFuIG9iamVjdCcpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpc0RvY01hdGNoZXIgPSAhaXNPcGVyYXRvck9iamVjdChcbiAgICAgICAgT2JqZWN0LmtleXMob3BlcmFuZClcbiAgICAgICAgICAuZmlsdGVyKGtleSA9PiAhaGFzT3duLmNhbGwoTE9HSUNBTF9PUEVSQVRPUlMsIGtleSkpXG4gICAgICAgICAgLnJlZHVjZSgoYSwgYikgPT4gT2JqZWN0LmFzc2lnbihhLCB7W2JdOiBvcGVyYW5kW2JdfSksIHt9KSxcbiAgICAgICAgdHJ1ZSk7XG5cbiAgICAgIGxldCBzdWJNYXRjaGVyO1xuICAgICAgaWYgKGlzRG9jTWF0Y2hlcikge1xuICAgICAgICAvLyBUaGlzIGlzIE5PVCB0aGUgc2FtZSBhcyBjb21waWxlVmFsdWVTZWxlY3RvcihvcGVyYW5kKSwgYW5kIG5vdCBqdXN0XG4gICAgICAgIC8vIGJlY2F1c2Ugb2YgdGhlIHNsaWdodGx5IGRpZmZlcmVudCBjYWxsaW5nIGNvbnZlbnRpb24uXG4gICAgICAgIC8vIHskZWxlbU1hdGNoOiB7eDogM319IG1lYW5zIFwiYW4gZWxlbWVudCBoYXMgYSBmaWVsZCB4OjNcIiwgbm90XG4gICAgICAgIC8vIFwiY29uc2lzdHMgb25seSBvZiBhIGZpZWxkIHg6M1wiLiBBbHNvLCByZWdleHBzIGFuZCBzdWItJCBhcmUgYWxsb3dlZC5cbiAgICAgICAgc3ViTWF0Y2hlciA9XG4gICAgICAgICAgY29tcGlsZURvY3VtZW50U2VsZWN0b3Iob3BlcmFuZCwgbWF0Y2hlciwge2luRWxlbU1hdGNoOiB0cnVlfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdWJNYXRjaGVyID0gY29tcGlsZVZhbHVlU2VsZWN0b3Iob3BlcmFuZCwgbWF0Y2hlcik7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB2YWx1ZSA9PiB7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHZhbHVlLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgY29uc3QgYXJyYXlFbGVtZW50ID0gdmFsdWVbaV07XG4gICAgICAgICAgbGV0IGFyZztcbiAgICAgICAgICBpZiAoaXNEb2NNYXRjaGVyKSB7XG4gICAgICAgICAgICAvLyBXZSBjYW4gb25seSBtYXRjaCB7JGVsZW1NYXRjaDoge2I6IDN9fSBhZ2FpbnN0IG9iamVjdHMuXG4gICAgICAgICAgICAvLyAoV2UgY2FuIGFsc28gbWF0Y2ggYWdhaW5zdCBhcnJheXMsIGlmIHRoZXJlJ3MgbnVtZXJpYyBpbmRpY2VzLFxuICAgICAgICAgICAgLy8gZWcgeyRlbGVtTWF0Y2g6IHsnMC5iJzogM319IG9yIHskZWxlbU1hdGNoOiB7MDogM319LilcbiAgICAgICAgICAgIGlmICghaXNJbmRleGFibGUoYXJyYXlFbGVtZW50KSkge1xuICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGFyZyA9IGFycmF5RWxlbWVudDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gZG9udEl0ZXJhdGUgZW5zdXJlcyB0aGF0IHthOiB7JGVsZW1NYXRjaDogeyRndDogNX19fSBtYXRjaGVzXG4gICAgICAgICAgICAvLyB7YTogWzhdfSBidXQgbm90IHthOiBbWzhdXX1cbiAgICAgICAgICAgIGFyZyA9IFt7dmFsdWU6IGFycmF5RWxlbWVudCwgZG9udEl0ZXJhdGU6IHRydWV9XTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gWFhYIHN1cHBvcnQgJG5lYXIgaW4gJGVsZW1NYXRjaCBieSBwcm9wYWdhdGluZyAkZGlzdGFuY2U/XG4gICAgICAgICAgaWYgKHN1Yk1hdGNoZXIoYXJnKS5yZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBpOyAvLyBzcGVjaWFsbHkgdW5kZXJzdG9vZCB0byBtZWFuIFwidXNlIGFzIGFycmF5SW5kaWNlc1wiXG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfTtcbiAgICB9LFxuICB9LFxufTtcblxuLy8gT3BlcmF0b3JzIHRoYXQgYXBwZWFyIGF0IHRoZSB0b3AgbGV2ZWwgb2YgYSBkb2N1bWVudCBzZWxlY3Rvci5cbmNvbnN0IExPR0lDQUxfT1BFUkFUT1JTID0ge1xuICAkYW5kKHN1YlNlbGVjdG9yLCBtYXRjaGVyLCBpbkVsZW1NYXRjaCkge1xuICAgIHJldHVybiBhbmREb2N1bWVudE1hdGNoZXJzKFxuICAgICAgY29tcGlsZUFycmF5T2ZEb2N1bWVudFNlbGVjdG9ycyhzdWJTZWxlY3RvciwgbWF0Y2hlciwgaW5FbGVtTWF0Y2gpXG4gICAgKTtcbiAgfSxcblxuICAkb3Ioc3ViU2VsZWN0b3IsIG1hdGNoZXIsIGluRWxlbU1hdGNoKSB7XG4gICAgY29uc3QgbWF0Y2hlcnMgPSBjb21waWxlQXJyYXlPZkRvY3VtZW50U2VsZWN0b3JzKFxuICAgICAgc3ViU2VsZWN0b3IsXG4gICAgICBtYXRjaGVyLFxuICAgICAgaW5FbGVtTWF0Y2hcbiAgICApO1xuXG4gICAgLy8gU3BlY2lhbCBjYXNlOiBpZiB0aGVyZSBpcyBvbmx5IG9uZSBtYXRjaGVyLCB1c2UgaXQgZGlyZWN0bHksICpwcmVzZXJ2aW5nKlxuICAgIC8vIGFueSBhcnJheUluZGljZXMgaXQgcmV0dXJucy5cbiAgICBpZiAobWF0Y2hlcnMubGVuZ3RoID09PSAxKSB7XG4gICAgICByZXR1cm4gbWF0Y2hlcnNbMF07XG4gICAgfVxuXG4gICAgcmV0dXJuIGRvYyA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBtYXRjaGVycy5zb21lKGZuID0+IGZuKGRvYykucmVzdWx0KTtcbiAgICAgIC8vICRvciBkb2VzIE5PVCBzZXQgYXJyYXlJbmRpY2VzIHdoZW4gaXQgaGFzIG11bHRpcGxlXG4gICAgICAvLyBzdWItZXhwcmVzc2lvbnMuIChUZXN0ZWQgYWdhaW5zdCBNb25nb0RCLilcbiAgICAgIHJldHVybiB7cmVzdWx0fTtcbiAgICB9O1xuICB9LFxuXG4gICRub3Ioc3ViU2VsZWN0b3IsIG1hdGNoZXIsIGluRWxlbU1hdGNoKSB7XG4gICAgY29uc3QgbWF0Y2hlcnMgPSBjb21waWxlQXJyYXlPZkRvY3VtZW50U2VsZWN0b3JzKFxuICAgICAgc3ViU2VsZWN0b3IsXG4gICAgICBtYXRjaGVyLFxuICAgICAgaW5FbGVtTWF0Y2hcbiAgICApO1xuICAgIHJldHVybiBkb2MgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0ID0gbWF0Y2hlcnMuZXZlcnkoZm4gPT4gIWZuKGRvYykucmVzdWx0KTtcbiAgICAgIC8vIE5ldmVyIHNldCBhcnJheUluZGljZXMsIGJlY2F1c2Ugd2Ugb25seSBtYXRjaCBpZiBub3RoaW5nIGluIHBhcnRpY3VsYXJcbiAgICAgIC8vICdtYXRjaGVkJyAoYW5kIGJlY2F1c2UgdGhpcyBpcyBjb25zaXN0ZW50IHdpdGggTW9uZ29EQikuXG4gICAgICByZXR1cm4ge3Jlc3VsdH07XG4gICAgfTtcbiAgfSxcblxuICAkd2hlcmUoc2VsZWN0b3JWYWx1ZSwgbWF0Y2hlcikge1xuICAgIC8vIFJlY29yZCB0aGF0ICphbnkqIHBhdGggbWF5IGJlIHVzZWQuXG4gICAgbWF0Y2hlci5fcmVjb3JkUGF0aFVzZWQoJycpO1xuICAgIG1hdGNoZXIuX2hhc1doZXJlID0gdHJ1ZTtcblxuICAgIGlmICghKHNlbGVjdG9yVmFsdWUgaW5zdGFuY2VvZiBGdW5jdGlvbikpIHtcbiAgICAgIC8vIFhYWCBNb25nb0RCIHNlZW1zIHRvIGhhdmUgbW9yZSBjb21wbGV4IGxvZ2ljIHRvIGRlY2lkZSB3aGVyZSBvciBvciBub3RcbiAgICAgIC8vIHRvIGFkZCAncmV0dXJuJzsgbm90IHN1cmUgZXhhY3RseSB3aGF0IGl0IGlzLlxuICAgICAgc2VsZWN0b3JWYWx1ZSA9IEZ1bmN0aW9uKCdvYmonLCBgcmV0dXJuICR7c2VsZWN0b3JWYWx1ZX1gKTtcbiAgICB9XG5cbiAgICAvLyBXZSBtYWtlIHRoZSBkb2N1bWVudCBhdmFpbGFibGUgYXMgYm90aCBgdGhpc2AgYW5kIGBvYmpgLlxuICAgIC8vIC8vIFhYWCBub3Qgc3VyZSB3aGF0IHdlIHNob3VsZCBkbyBpZiB0aGlzIHRocm93c1xuICAgIHJldHVybiBkb2MgPT4gKHtyZXN1bHQ6IHNlbGVjdG9yVmFsdWUuY2FsbChkb2MsIGRvYyl9KTtcbiAgfSxcblxuICAvLyBUaGlzIGlzIGp1c3QgdXNlZCBhcyBhIGNvbW1lbnQgaW4gdGhlIHF1ZXJ5IChpbiBNb25nb0RCLCBpdCBhbHNvIGVuZHMgdXAgaW5cbiAgLy8gcXVlcnkgbG9ncyk7IGl0IGhhcyBubyBlZmZlY3Qgb24gdGhlIGFjdHVhbCBzZWxlY3Rpb24uXG4gICRjb21tZW50KCkge1xuICAgIHJldHVybiAoKSA9PiAoe3Jlc3VsdDogdHJ1ZX0pO1xuICB9LFxufTtcblxuLy8gT3BlcmF0b3JzIHRoYXQgKHVubGlrZSBMT0dJQ0FMX09QRVJBVE9SUykgcGVydGFpbiB0byBpbmRpdmlkdWFsIHBhdGhzIGluIGFcbi8vIGRvY3VtZW50LCBidXQgKHVubGlrZSBFTEVNRU5UX09QRVJBVE9SUykgZG8gbm90IGhhdmUgYSBzaW1wbGUgZGVmaW5pdGlvbiBhc1xuLy8gXCJtYXRjaCBlYWNoIGJyYW5jaGVkIHZhbHVlIGluZGVwZW5kZW50bHkgYW5kIGNvbWJpbmUgd2l0aFxuLy8gY29udmVydEVsZW1lbnRNYXRjaGVyVG9CcmFuY2hlZE1hdGNoZXJcIi5cbmNvbnN0IFZBTFVFX09QRVJBVE9SUyA9IHtcbiAgJGVxKG9wZXJhbmQpIHtcbiAgICByZXR1cm4gY29udmVydEVsZW1lbnRNYXRjaGVyVG9CcmFuY2hlZE1hdGNoZXIoXG4gICAgICBlcXVhbGl0eUVsZW1lbnRNYXRjaGVyKG9wZXJhbmQpXG4gICAgKTtcbiAgfSxcbiAgJG5vdChvcGVyYW5kLCB2YWx1ZVNlbGVjdG9yLCBtYXRjaGVyKSB7XG4gICAgcmV0dXJuIGludmVydEJyYW5jaGVkTWF0Y2hlcihjb21waWxlVmFsdWVTZWxlY3RvcihvcGVyYW5kLCBtYXRjaGVyKSk7XG4gIH0sXG4gICRuZShvcGVyYW5kKSB7XG4gICAgcmV0dXJuIGludmVydEJyYW5jaGVkTWF0Y2hlcihcbiAgICAgIGNvbnZlcnRFbGVtZW50TWF0Y2hlclRvQnJhbmNoZWRNYXRjaGVyKGVxdWFsaXR5RWxlbWVudE1hdGNoZXIob3BlcmFuZCkpXG4gICAgKTtcbiAgfSxcbiAgJG5pbihvcGVyYW5kKSB7XG4gICAgcmV0dXJuIGludmVydEJyYW5jaGVkTWF0Y2hlcihcbiAgICAgIGNvbnZlcnRFbGVtZW50TWF0Y2hlclRvQnJhbmNoZWRNYXRjaGVyKFxuICAgICAgICBFTEVNRU5UX09QRVJBVE9SUy4kaW4uY29tcGlsZUVsZW1lbnRTZWxlY3RvcihvcGVyYW5kKVxuICAgICAgKVxuICAgICk7XG4gIH0sXG4gICRleGlzdHMob3BlcmFuZCkge1xuICAgIGNvbnN0IGV4aXN0cyA9IGNvbnZlcnRFbGVtZW50TWF0Y2hlclRvQnJhbmNoZWRNYXRjaGVyKFxuICAgICAgdmFsdWUgPT4gdmFsdWUgIT09IHVuZGVmaW5lZFxuICAgICk7XG4gICAgcmV0dXJuIG9wZXJhbmQgPyBleGlzdHMgOiBpbnZlcnRCcmFuY2hlZE1hdGNoZXIoZXhpc3RzKTtcbiAgfSxcbiAgLy8gJG9wdGlvbnMganVzdCBwcm92aWRlcyBvcHRpb25zIGZvciAkcmVnZXg7IGl0cyBsb2dpYyBpcyBpbnNpZGUgJHJlZ2V4XG4gICRvcHRpb25zKG9wZXJhbmQsIHZhbHVlU2VsZWN0b3IpIHtcbiAgICBpZiAoIWhhc093bi5jYWxsKHZhbHVlU2VsZWN0b3IsICckcmVnZXgnKSkge1xuICAgICAgdGhyb3cgbmV3IE1pbmlNb25nb1F1ZXJ5RXJyb3IoJyRvcHRpb25zIG5lZWRzIGEgJHJlZ2V4Jyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGV2ZXJ5dGhpbmdNYXRjaGVyO1xuICB9LFxuICAvLyAkbWF4RGlzdGFuY2UgaXMgYmFzaWNhbGx5IGFuIGFyZ3VtZW50IHRvICRuZWFyXG4gICRtYXhEaXN0YW5jZShvcGVyYW5kLCB2YWx1ZVNlbGVjdG9yKSB7XG4gICAgaWYgKCF2YWx1ZVNlbGVjdG9yLiRuZWFyKSB7XG4gICAgICB0aHJvdyBuZXcgTWluaU1vbmdvUXVlcnlFcnJvcignJG1heERpc3RhbmNlIG5lZWRzIGEgJG5lYXInKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZXZlcnl0aGluZ01hdGNoZXI7XG4gIH0sXG4gICRhbGwob3BlcmFuZCwgdmFsdWVTZWxlY3RvciwgbWF0Y2hlcikge1xuICAgIGlmICghQXJyYXkuaXNBcnJheShvcGVyYW5kKSkge1xuICAgICAgdGhyb3cgbmV3IE1pbmlNb25nb1F1ZXJ5RXJyb3IoJyRhbGwgcmVxdWlyZXMgYXJyYXknKTtcbiAgICB9XG5cbiAgICAvLyBOb3Qgc3VyZSB3aHksIGJ1dCB0aGlzIHNlZW1zIHRvIGJlIHdoYXQgTW9uZ29EQiBkb2VzLlxuICAgIGlmIChvcGVyYW5kLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIG5vdGhpbmdNYXRjaGVyO1xuICAgIH1cblxuICAgIGNvbnN0IGJyYW5jaGVkTWF0Y2hlcnMgPSBvcGVyYW5kLm1hcChjcml0ZXJpb24gPT4ge1xuICAgICAgLy8gWFhYIGhhbmRsZSAkYWxsLyRlbGVtTWF0Y2ggY29tYmluYXRpb25cbiAgICAgIGlmIChpc09wZXJhdG9yT2JqZWN0KGNyaXRlcmlvbikpIHtcbiAgICAgICAgdGhyb3cgbmV3IE1pbmlNb25nb1F1ZXJ5RXJyb3IoJ25vICQgZXhwcmVzc2lvbnMgaW4gJGFsbCcpO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGlzIGlzIGFsd2F5cyBhIHJlZ2V4cCBvciBlcXVhbGl0eSBzZWxlY3Rvci5cbiAgICAgIHJldHVybiBjb21waWxlVmFsdWVTZWxlY3Rvcihjcml0ZXJpb24sIG1hdGNoZXIpO1xuICAgIH0pO1xuXG4gICAgLy8gYW5kQnJhbmNoZWRNYXRjaGVycyBkb2VzIE5PVCByZXF1aXJlIGFsbCBzZWxlY3RvcnMgdG8gcmV0dXJuIHRydWUgb24gdGhlXG4gICAgLy8gU0FNRSBicmFuY2guXG4gICAgcmV0dXJuIGFuZEJyYW5jaGVkTWF0Y2hlcnMoYnJhbmNoZWRNYXRjaGVycyk7XG4gIH0sXG4gICRuZWFyKG9wZXJhbmQsIHZhbHVlU2VsZWN0b3IsIG1hdGNoZXIsIGlzUm9vdCkge1xuICAgIGlmICghaXNSb290KSB7XG4gICAgICB0aHJvdyBuZXcgTWluaU1vbmdvUXVlcnlFcnJvcignJG5lYXIgY2FuXFwndCBiZSBpbnNpZGUgYW5vdGhlciAkIG9wZXJhdG9yJyk7XG4gICAgfVxuXG4gICAgbWF0Y2hlci5faGFzR2VvUXVlcnkgPSB0cnVlO1xuXG4gICAgLy8gVGhlcmUgYXJlIHR3byBraW5kcyBvZiBnZW9kYXRhIGluIE1vbmdvREI6IGxlZ2FjeSBjb29yZGluYXRlIHBhaXJzIGFuZFxuICAgIC8vIEdlb0pTT04uIFRoZXkgdXNlIGRpZmZlcmVudCBkaXN0YW5jZSBtZXRyaWNzLCB0b28uIEdlb0pTT04gcXVlcmllcyBhcmVcbiAgICAvLyBtYXJrZWQgd2l0aCBhICRnZW9tZXRyeSBwcm9wZXJ0eSwgdGhvdWdoIGxlZ2FjeSBjb29yZGluYXRlcyBjYW4gYmVcbiAgICAvLyBtYXRjaGVkIHVzaW5nICRnZW9tZXRyeS5cbiAgICBsZXQgbWF4RGlzdGFuY2UsIHBvaW50LCBkaXN0YW5jZTtcbiAgICBpZiAoTG9jYWxDb2xsZWN0aW9uLl9pc1BsYWluT2JqZWN0KG9wZXJhbmQpICYmIGhhc093bi5jYWxsKG9wZXJhbmQsICckZ2VvbWV0cnknKSkge1xuICAgICAgLy8gR2VvSlNPTiBcIjJkc3BoZXJlXCIgbW9kZS5cbiAgICAgIG1heERpc3RhbmNlID0gb3BlcmFuZC4kbWF4RGlzdGFuY2U7XG4gICAgICBwb2ludCA9IG9wZXJhbmQuJGdlb21ldHJ5O1xuICAgICAgZGlzdGFuY2UgPSB2YWx1ZSA9PiB7XG4gICAgICAgIC8vIFhYWDogZm9yIG5vdywgd2UgZG9uJ3QgY2FsY3VsYXRlIHRoZSBhY3R1YWwgZGlzdGFuY2UgYmV0d2Vlbiwgc2F5LFxuICAgICAgICAvLyBwb2x5Z29uIGFuZCBjaXJjbGUuIElmIHBlb3BsZSBjYXJlIGFib3V0IHRoaXMgdXNlLWNhc2UgaXQgd2lsbCBnZXRcbiAgICAgICAgLy8gYSBwcmlvcml0eS5cbiAgICAgICAgaWYgKCF2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF2YWx1ZS50eXBlKSB7XG4gICAgICAgICAgcmV0dXJuIEdlb0pTT04ucG9pbnREaXN0YW5jZShcbiAgICAgICAgICAgIHBvaW50LFxuICAgICAgICAgICAge3R5cGU6ICdQb2ludCcsIGNvb3JkaW5hdGVzOiBwb2ludFRvQXJyYXkodmFsdWUpfVxuICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodmFsdWUudHlwZSA9PT0gJ1BvaW50Jykge1xuICAgICAgICAgIHJldHVybiBHZW9KU09OLnBvaW50RGlzdGFuY2UocG9pbnQsIHZhbHVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBHZW9KU09OLmdlb21ldHJ5V2l0aGluUmFkaXVzKHZhbHVlLCBwb2ludCwgbWF4RGlzdGFuY2UpXG4gICAgICAgICAgPyAwXG4gICAgICAgICAgOiBtYXhEaXN0YW5jZSArIDE7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBtYXhEaXN0YW5jZSA9IHZhbHVlU2VsZWN0b3IuJG1heERpc3RhbmNlO1xuXG4gICAgICBpZiAoIWlzSW5kZXhhYmxlKG9wZXJhbmQpKSB7XG4gICAgICAgIHRocm93IG5ldyBNaW5pTW9uZ29RdWVyeUVycm9yKCckbmVhciBhcmd1bWVudCBtdXN0IGJlIGNvb3JkaW5hdGUgcGFpciBvciBHZW9KU09OJyk7XG4gICAgICB9XG5cbiAgICAgIHBvaW50ID0gcG9pbnRUb0FycmF5KG9wZXJhbmQpO1xuXG4gICAgICBkaXN0YW5jZSA9IHZhbHVlID0+IHtcbiAgICAgICAgaWYgKCFpc0luZGV4YWJsZSh2YWx1ZSkpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBkaXN0YW5jZUNvb3JkaW5hdGVQYWlycyhwb2ludCwgdmFsdWUpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gYnJhbmNoZWRWYWx1ZXMgPT4ge1xuICAgICAgLy8gVGhlcmUgbWlnaHQgYmUgbXVsdGlwbGUgcG9pbnRzIGluIHRoZSBkb2N1bWVudCB0aGF0IG1hdGNoIHRoZSBnaXZlblxuICAgICAgLy8gZmllbGQuIE9ubHkgb25lIG9mIHRoZW0gbmVlZHMgdG8gYmUgd2l0aGluICRtYXhEaXN0YW5jZSwgYnV0IHdlIG5lZWQgdG9cbiAgICAgIC8vIGV2YWx1YXRlIGFsbCBvZiB0aGVtIGFuZCB1c2UgdGhlIG5lYXJlc3Qgb25lIGZvciB0aGUgaW1wbGljaXQgc29ydFxuICAgICAgLy8gc3BlY2lmaWVyLiAoVGhhdCdzIHdoeSB3ZSBjYW4ndCBqdXN0IHVzZSBFTEVNRU5UX09QRVJBVE9SUyBoZXJlLilcbiAgICAgIC8vXG4gICAgICAvLyBOb3RlOiBUaGlzIGRpZmZlcnMgZnJvbSBNb25nb0RCJ3MgaW1wbGVtZW50YXRpb24sIHdoZXJlIGEgZG9jdW1lbnQgd2lsbFxuICAgICAgLy8gYWN0dWFsbHkgc2hvdyB1cCAqbXVsdGlwbGUgdGltZXMqIGluIHRoZSByZXN1bHQgc2V0LCB3aXRoIG9uZSBlbnRyeSBmb3JcbiAgICAgIC8vIGVhY2ggd2l0aGluLSRtYXhEaXN0YW5jZSBicmFuY2hpbmcgcG9pbnQuXG4gICAgICBjb25zdCByZXN1bHQgPSB7cmVzdWx0OiBmYWxzZX07XG4gICAgICBleHBhbmRBcnJheXNJbkJyYW5jaGVzKGJyYW5jaGVkVmFsdWVzKS5ldmVyeShicmFuY2ggPT4ge1xuICAgICAgICAvLyBpZiBvcGVyYXRpb24gaXMgYW4gdXBkYXRlLCBkb24ndCBza2lwIGJyYW5jaGVzLCBqdXN0IHJldHVybiB0aGUgZmlyc3RcbiAgICAgICAgLy8gb25lICgjMzU5OSlcbiAgICAgICAgbGV0IGN1ckRpc3RhbmNlO1xuICAgICAgICBpZiAoIW1hdGNoZXIuX2lzVXBkYXRlKSB7XG4gICAgICAgICAgaWYgKCEodHlwZW9mIGJyYW5jaC52YWx1ZSA9PT0gJ29iamVjdCcpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjdXJEaXN0YW5jZSA9IGRpc3RhbmNlKGJyYW5jaC52YWx1ZSk7XG5cbiAgICAgICAgICAvLyBTa2lwIGJyYW5jaGVzIHRoYXQgYXJlbid0IHJlYWwgcG9pbnRzIG9yIGFyZSB0b28gZmFyIGF3YXkuXG4gICAgICAgICAgaWYgKGN1ckRpc3RhbmNlID09PSBudWxsIHx8IGN1ckRpc3RhbmNlID4gbWF4RGlzdGFuY2UpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFNraXAgYW55dGhpbmcgdGhhdCdzIGEgdGllLlxuICAgICAgICAgIGlmIChyZXN1bHQuZGlzdGFuY2UgIT09IHVuZGVmaW5lZCAmJiByZXN1bHQuZGlzdGFuY2UgPD0gY3VyRGlzdGFuY2UpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJlc3VsdC5yZXN1bHQgPSB0cnVlO1xuICAgICAgICByZXN1bHQuZGlzdGFuY2UgPSBjdXJEaXN0YW5jZTtcblxuICAgICAgICBpZiAoYnJhbmNoLmFycmF5SW5kaWNlcykge1xuICAgICAgICAgIHJlc3VsdC5hcnJheUluZGljZXMgPSBicmFuY2guYXJyYXlJbmRpY2VzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlbGV0ZSByZXN1bHQuYXJyYXlJbmRpY2VzO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuICFtYXRjaGVyLl9pc1VwZGF0ZTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH0sXG59O1xuXG4vLyBOQjogV2UgYXJlIGNoZWF0aW5nIGFuZCB1c2luZyB0aGlzIGZ1bmN0aW9uIHRvIGltcGxlbWVudCAnQU5EJyBmb3IgYm90aFxuLy8gJ2RvY3VtZW50IG1hdGNoZXJzJyBhbmQgJ2JyYW5jaGVkIG1hdGNoZXJzJy4gVGhleSBib3RoIHJldHVybiByZXN1bHQgb2JqZWN0c1xuLy8gYnV0IHRoZSBhcmd1bWVudCBpcyBkaWZmZXJlbnQ6IGZvciB0aGUgZm9ybWVyIGl0J3MgYSB3aG9sZSBkb2MsIHdoZXJlYXMgZm9yXG4vLyB0aGUgbGF0dGVyIGl0J3MgYW4gYXJyYXkgb2YgJ2JyYW5jaGVkIHZhbHVlcycuXG5mdW5jdGlvbiBhbmRTb21lTWF0Y2hlcnMoc3ViTWF0Y2hlcnMpIHtcbiAgaWYgKHN1Yk1hdGNoZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBldmVyeXRoaW5nTWF0Y2hlcjtcbiAgfVxuXG4gIGlmIChzdWJNYXRjaGVycy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gc3ViTWF0Y2hlcnNbMF07XG4gIH1cblxuICByZXR1cm4gZG9jT3JCcmFuY2hlcyA9PiB7XG4gICAgY29uc3QgbWF0Y2ggPSB7fTtcbiAgICBtYXRjaC5yZXN1bHQgPSBzdWJNYXRjaGVycy5ldmVyeShmbiA9PiB7XG4gICAgICBjb25zdCBzdWJSZXN1bHQgPSBmbihkb2NPckJyYW5jaGVzKTtcblxuICAgICAgLy8gQ29weSBhICdkaXN0YW5jZScgbnVtYmVyIG91dCBvZiB0aGUgZmlyc3Qgc3ViLW1hdGNoZXIgdGhhdCBoYXNcbiAgICAgIC8vIG9uZS4gWWVzLCB0aGlzIG1lYW5zIHRoYXQgaWYgdGhlcmUgYXJlIG11bHRpcGxlICRuZWFyIGZpZWxkcyBpbiBhXG4gICAgICAvLyBxdWVyeSwgc29tZXRoaW5nIGFyYml0cmFyeSBoYXBwZW5zOyB0aGlzIGFwcGVhcnMgdG8gYmUgY29uc2lzdGVudCB3aXRoXG4gICAgICAvLyBNb25nby5cbiAgICAgIGlmIChzdWJSZXN1bHQucmVzdWx0ICYmXG4gICAgICAgICAgc3ViUmVzdWx0LmRpc3RhbmNlICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICBtYXRjaC5kaXN0YW5jZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG1hdGNoLmRpc3RhbmNlID0gc3ViUmVzdWx0LmRpc3RhbmNlO1xuICAgICAgfVxuXG4gICAgICAvLyBTaW1pbGFybHksIHByb3BhZ2F0ZSBhcnJheUluZGljZXMgZnJvbSBzdWItbWF0Y2hlcnMuLi4gYnV0IHRvIG1hdGNoXG4gICAgICAvLyBNb25nb0RCIGJlaGF2aW9yLCB0aGlzIHRpbWUgdGhlICpsYXN0KiBzdWItbWF0Y2hlciB3aXRoIGFycmF5SW5kaWNlc1xuICAgICAgLy8gd2lucy5cbiAgICAgIGlmIChzdWJSZXN1bHQucmVzdWx0ICYmIHN1YlJlc3VsdC5hcnJheUluZGljZXMpIHtcbiAgICAgICAgbWF0Y2guYXJyYXlJbmRpY2VzID0gc3ViUmVzdWx0LmFycmF5SW5kaWNlcztcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHN1YlJlc3VsdC5yZXN1bHQ7XG4gICAgfSk7XG5cbiAgICAvLyBJZiB3ZSBkaWRuJ3QgYWN0dWFsbHkgbWF0Y2gsIGZvcmdldCBhbnkgZXh0cmEgbWV0YWRhdGEgd2UgY2FtZSB1cCB3aXRoLlxuICAgIGlmICghbWF0Y2gucmVzdWx0KSB7XG4gICAgICBkZWxldGUgbWF0Y2guZGlzdGFuY2U7XG4gICAgICBkZWxldGUgbWF0Y2guYXJyYXlJbmRpY2VzO1xuICAgIH1cblxuICAgIHJldHVybiBtYXRjaDtcbiAgfTtcbn1cblxuY29uc3QgYW5kRG9jdW1lbnRNYXRjaGVycyA9IGFuZFNvbWVNYXRjaGVycztcbmNvbnN0IGFuZEJyYW5jaGVkTWF0Y2hlcnMgPSBhbmRTb21lTWF0Y2hlcnM7XG5cbmZ1bmN0aW9uIGNvbXBpbGVBcnJheU9mRG9jdW1lbnRTZWxlY3RvcnMoc2VsZWN0b3JzLCBtYXRjaGVyLCBpbkVsZW1NYXRjaCkge1xuICBpZiAoIUFycmF5LmlzQXJyYXkoc2VsZWN0b3JzKSB8fCBzZWxlY3RvcnMubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IE1pbmlNb25nb1F1ZXJ5RXJyb3IoJyRhbmQvJG9yLyRub3IgbXVzdCBiZSBub25lbXB0eSBhcnJheScpO1xuICB9XG5cbiAgcmV0dXJuIHNlbGVjdG9ycy5tYXAoc3ViU2VsZWN0b3IgPT4ge1xuICAgIGlmICghTG9jYWxDb2xsZWN0aW9uLl9pc1BsYWluT2JqZWN0KHN1YlNlbGVjdG9yKSkge1xuICAgICAgdGhyb3cgbmV3IE1pbmlNb25nb1F1ZXJ5RXJyb3IoJyRvci8kYW5kLyRub3IgZW50cmllcyBuZWVkIHRvIGJlIGZ1bGwgb2JqZWN0cycpO1xuICAgIH1cblxuICAgIHJldHVybiBjb21waWxlRG9jdW1lbnRTZWxlY3RvcihzdWJTZWxlY3RvciwgbWF0Y2hlciwge2luRWxlbU1hdGNofSk7XG4gIH0pO1xufVxuXG4vLyBUYWtlcyBpbiBhIHNlbGVjdG9yIHRoYXQgY291bGQgbWF0Y2ggYSBmdWxsIGRvY3VtZW50IChlZywgdGhlIG9yaWdpbmFsXG4vLyBzZWxlY3RvcikuIFJldHVybnMgYSBmdW5jdGlvbiBtYXBwaW5nIGRvY3VtZW50LT5yZXN1bHQgb2JqZWN0LlxuLy9cbi8vIG1hdGNoZXIgaXMgdGhlIE1hdGNoZXIgb2JqZWN0IHdlIGFyZSBjb21waWxpbmcuXG4vL1xuLy8gSWYgdGhpcyBpcyB0aGUgcm9vdCBkb2N1bWVudCBzZWxlY3RvciAoaWUsIG5vdCB3cmFwcGVkIGluICRhbmQgb3IgdGhlIGxpa2UpLFxuLy8gdGhlbiBpc1Jvb3QgaXMgdHJ1ZS4gKFRoaXMgaXMgdXNlZCBieSAkbmVhci4pXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZURvY3VtZW50U2VsZWN0b3IoZG9jU2VsZWN0b3IsIG1hdGNoZXIsIG9wdGlvbnMgPSB7fSkge1xuICBjb25zdCBkb2NNYXRjaGVycyA9IE9iamVjdC5rZXlzKGRvY1NlbGVjdG9yKS5tYXAoa2V5ID0+IHtcbiAgICBjb25zdCBzdWJTZWxlY3RvciA9IGRvY1NlbGVjdG9yW2tleV07XG5cbiAgICBpZiAoa2V5LnN1YnN0cigwLCAxKSA9PT0gJyQnKSB7XG4gICAgICAvLyBPdXRlciBvcGVyYXRvcnMgYXJlIGVpdGhlciBsb2dpY2FsIG9wZXJhdG9ycyAodGhleSByZWN1cnNlIGJhY2sgaW50b1xuICAgICAgLy8gdGhpcyBmdW5jdGlvbiksIG9yICR3aGVyZS5cbiAgICAgIGlmICghaGFzT3duLmNhbGwoTE9HSUNBTF9PUEVSQVRPUlMsIGtleSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IE1pbmlNb25nb1F1ZXJ5RXJyb3IoYFVucmVjb2duaXplZCBsb2dpY2FsIG9wZXJhdG9yOiAke2tleX1gKTtcbiAgICAgIH1cblxuICAgICAgbWF0Y2hlci5faXNTaW1wbGUgPSBmYWxzZTtcbiAgICAgIHJldHVybiBMT0dJQ0FMX09QRVJBVE9SU1trZXldKHN1YlNlbGVjdG9yLCBtYXRjaGVyLCBvcHRpb25zLmluRWxlbU1hdGNoKTtcbiAgICB9XG5cbiAgICAvLyBSZWNvcmQgdGhpcyBwYXRoLCBidXQgb25seSBpZiB3ZSBhcmVuJ3QgaW4gYW4gZWxlbU1hdGNoZXIsIHNpbmNlIGluIGFuXG4gICAgLy8gZWxlbU1hdGNoIHRoaXMgaXMgYSBwYXRoIGluc2lkZSBhbiBvYmplY3QgaW4gYW4gYXJyYXksIG5vdCBpbiB0aGUgZG9jXG4gICAgLy8gcm9vdC5cbiAgICBpZiAoIW9wdGlvbnMuaW5FbGVtTWF0Y2gpIHtcbiAgICAgIG1hdGNoZXIuX3JlY29yZFBhdGhVc2VkKGtleSk7XG4gICAgfVxuXG4gICAgLy8gRG9uJ3QgYWRkIGEgbWF0Y2hlciBpZiBzdWJTZWxlY3RvciBpcyBhIGZ1bmN0aW9uIC0tIHRoaXMgaXMgdG8gbWF0Y2hcbiAgICAvLyB0aGUgYmVoYXZpb3Igb2YgTWV0ZW9yIG9uIHRoZSBzZXJ2ZXIgKGluaGVyaXRlZCBmcm9tIHRoZSBub2RlIG1vbmdvZGJcbiAgICAvLyBkcml2ZXIpLCB3aGljaCBpcyB0byBpZ25vcmUgYW55IHBhcnQgb2YgYSBzZWxlY3RvciB3aGljaCBpcyBhIGZ1bmN0aW9uLlxuICAgIGlmICh0eXBlb2Ygc3ViU2VsZWN0b3IgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgbG9va1VwQnlJbmRleCA9IG1ha2VMb29rdXBGdW5jdGlvbihrZXkpO1xuICAgIGNvbnN0IHZhbHVlTWF0Y2hlciA9IGNvbXBpbGVWYWx1ZVNlbGVjdG9yKFxuICAgICAgc3ViU2VsZWN0b3IsXG4gICAgICBtYXRjaGVyLFxuICAgICAgb3B0aW9ucy5pc1Jvb3RcbiAgICApO1xuXG4gICAgcmV0dXJuIGRvYyA9PiB2YWx1ZU1hdGNoZXIobG9va1VwQnlJbmRleChkb2MpKTtcbiAgfSkuZmlsdGVyKEJvb2xlYW4pO1xuXG4gIHJldHVybiBhbmREb2N1bWVudE1hdGNoZXJzKGRvY01hdGNoZXJzKTtcbn1cblxuLy8gVGFrZXMgaW4gYSBzZWxlY3RvciB0aGF0IGNvdWxkIG1hdGNoIGEga2V5LWluZGV4ZWQgdmFsdWUgaW4gYSBkb2N1bWVudDsgZWcsXG4vLyB7JGd0OiA1LCAkbHQ6IDl9LCBvciBhIHJlZ3VsYXIgZXhwcmVzc2lvbiwgb3IgYW55IG5vbi1leHByZXNzaW9uIG9iamVjdCAodG9cbi8vIGluZGljYXRlIGVxdWFsaXR5KS4gIFJldHVybnMgYSBicmFuY2hlZCBtYXRjaGVyOiBhIGZ1bmN0aW9uIG1hcHBpbmdcbi8vIFticmFuY2hlZCB2YWx1ZV0tPnJlc3VsdCBvYmplY3QuXG5mdW5jdGlvbiBjb21waWxlVmFsdWVTZWxlY3Rvcih2YWx1ZVNlbGVjdG9yLCBtYXRjaGVyLCBpc1Jvb3QpIHtcbiAgaWYgKHZhbHVlU2VsZWN0b3IgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICBtYXRjaGVyLl9pc1NpbXBsZSA9IGZhbHNlO1xuICAgIHJldHVybiBjb252ZXJ0RWxlbWVudE1hdGNoZXJUb0JyYW5jaGVkTWF0Y2hlcihcbiAgICAgIHJlZ2V4cEVsZW1lbnRNYXRjaGVyKHZhbHVlU2VsZWN0b3IpXG4gICAgKTtcbiAgfVxuXG4gIGlmIChpc09wZXJhdG9yT2JqZWN0KHZhbHVlU2VsZWN0b3IpKSB7XG4gICAgcmV0dXJuIG9wZXJhdG9yQnJhbmNoZWRNYXRjaGVyKHZhbHVlU2VsZWN0b3IsIG1hdGNoZXIsIGlzUm9vdCk7XG4gIH1cblxuICByZXR1cm4gY29udmVydEVsZW1lbnRNYXRjaGVyVG9CcmFuY2hlZE1hdGNoZXIoXG4gICAgZXF1YWxpdHlFbGVtZW50TWF0Y2hlcih2YWx1ZVNlbGVjdG9yKVxuICApO1xufVxuXG4vLyBHaXZlbiBhbiBlbGVtZW50IG1hdGNoZXIgKHdoaWNoIGV2YWx1YXRlcyBhIHNpbmdsZSB2YWx1ZSksIHJldHVybnMgYSBicmFuY2hlZFxuLy8gdmFsdWUgKHdoaWNoIGV2YWx1YXRlcyB0aGUgZWxlbWVudCBtYXRjaGVyIG9uIGFsbCB0aGUgYnJhbmNoZXMgYW5kIHJldHVybnMgYVxuLy8gbW9yZSBzdHJ1Y3R1cmVkIHJldHVybiB2YWx1ZSBwb3NzaWJseSBpbmNsdWRpbmcgYXJyYXlJbmRpY2VzKS5cbmZ1bmN0aW9uIGNvbnZlcnRFbGVtZW50TWF0Y2hlclRvQnJhbmNoZWRNYXRjaGVyKGVsZW1lbnRNYXRjaGVyLCBvcHRpb25zID0ge30pIHtcbiAgcmV0dXJuIGJyYW5jaGVzID0+IHtcbiAgICBjb25zdCBleHBhbmRlZCA9IG9wdGlvbnMuZG9udEV4cGFuZExlYWZBcnJheXNcbiAgICAgID8gYnJhbmNoZXNcbiAgICAgIDogZXhwYW5kQXJyYXlzSW5CcmFuY2hlcyhicmFuY2hlcywgb3B0aW9ucy5kb250SW5jbHVkZUxlYWZBcnJheXMpO1xuXG4gICAgY29uc3QgbWF0Y2ggPSB7fTtcbiAgICBtYXRjaC5yZXN1bHQgPSBleHBhbmRlZC5zb21lKGVsZW1lbnQgPT4ge1xuICAgICAgbGV0IG1hdGNoZWQgPSBlbGVtZW50TWF0Y2hlcihlbGVtZW50LnZhbHVlKTtcblxuICAgICAgLy8gU3BlY2lhbCBjYXNlIGZvciAkZWxlbU1hdGNoOiBpdCBtZWFucyBcInRydWUsIGFuZCB1c2UgdGhpcyBhcyBhbiBhcnJheVxuICAgICAgLy8gaW5kZXggaWYgSSBkaWRuJ3QgYWxyZWFkeSBoYXZlIG9uZVwiLlxuICAgICAgaWYgKHR5cGVvZiBtYXRjaGVkID09PSAnbnVtYmVyJykge1xuICAgICAgICAvLyBYWFggVGhpcyBjb2RlIGRhdGVzIGZyb20gd2hlbiB3ZSBvbmx5IHN0b3JlZCBhIHNpbmdsZSBhcnJheSBpbmRleFxuICAgICAgICAvLyAoZm9yIHRoZSBvdXRlcm1vc3QgYXJyYXkpLiBTaG91bGQgd2UgYmUgYWxzbyBpbmNsdWRpbmcgZGVlcGVyIGFycmF5XG4gICAgICAgIC8vIGluZGljZXMgZnJvbSB0aGUgJGVsZW1NYXRjaCBtYXRjaD9cbiAgICAgICAgaWYgKCFlbGVtZW50LmFycmF5SW5kaWNlcykge1xuICAgICAgICAgIGVsZW1lbnQuYXJyYXlJbmRpY2VzID0gW21hdGNoZWRdO1xuICAgICAgICB9XG5cbiAgICAgICAgbWF0Y2hlZCA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHNvbWUgZWxlbWVudCBtYXRjaGVkLCBhbmQgaXQncyB0YWdnZWQgd2l0aCBhcnJheSBpbmRpY2VzLCBpbmNsdWRlXG4gICAgICAvLyB0aG9zZSBpbmRpY2VzIGluIG91ciByZXN1bHQgb2JqZWN0LlxuICAgICAgaWYgKG1hdGNoZWQgJiYgZWxlbWVudC5hcnJheUluZGljZXMpIHtcbiAgICAgICAgbWF0Y2guYXJyYXlJbmRpY2VzID0gZWxlbWVudC5hcnJheUluZGljZXM7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBtYXRjaGVkO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG1hdGNoO1xuICB9O1xufVxuXG4vLyBIZWxwZXJzIGZvciAkbmVhci5cbmZ1bmN0aW9uIGRpc3RhbmNlQ29vcmRpbmF0ZVBhaXJzKGEsIGIpIHtcbiAgY29uc3QgcG9pbnRBID0gcG9pbnRUb0FycmF5KGEpO1xuICBjb25zdCBwb2ludEIgPSBwb2ludFRvQXJyYXkoYik7XG5cbiAgcmV0dXJuIE1hdGguaHlwb3QocG9pbnRBWzBdIC0gcG9pbnRCWzBdLCBwb2ludEFbMV0gLSBwb2ludEJbMV0pO1xufVxuXG4vLyBUYWtlcyBzb21ldGhpbmcgdGhhdCBpcyBub3QgYW4gb3BlcmF0b3Igb2JqZWN0IGFuZCByZXR1cm5zIGFuIGVsZW1lbnQgbWF0Y2hlclxuLy8gZm9yIGVxdWFsaXR5IHdpdGggdGhhdCB0aGluZy5cbmV4cG9ydCBmdW5jdGlvbiBlcXVhbGl0eUVsZW1lbnRNYXRjaGVyKGVsZW1lbnRTZWxlY3Rvcikge1xuICBpZiAoaXNPcGVyYXRvck9iamVjdChlbGVtZW50U2VsZWN0b3IpKSB7XG4gICAgdGhyb3cgbmV3IE1pbmlNb25nb1F1ZXJ5RXJyb3IoJ0NhblxcJ3QgY3JlYXRlIGVxdWFsaXR5VmFsdWVTZWxlY3RvciBmb3Igb3BlcmF0b3Igb2JqZWN0Jyk7XG4gIH1cblxuICAvLyBTcGVjaWFsLWNhc2U6IG51bGwgYW5kIHVuZGVmaW5lZCBhcmUgZXF1YWwgKGlmIHlvdSBnb3QgdW5kZWZpbmVkIGluIHRoZXJlXG4gIC8vIHNvbWV3aGVyZSwgb3IgaWYgeW91IGdvdCBpdCBkdWUgdG8gc29tZSBicmFuY2ggYmVpbmcgbm9uLWV4aXN0ZW50IGluIHRoZVxuICAvLyB3ZWlyZCBzcGVjaWFsIGNhc2UpLCBldmVuIHRob3VnaCB0aGV5IGFyZW4ndCB3aXRoIEVKU09OLmVxdWFscy5cbiAgLy8gdW5kZWZpbmVkIG9yIG51bGxcbiAgaWYgKGVsZW1lbnRTZWxlY3RvciA9PSBudWxsKSB7XG4gICAgcmV0dXJuIHZhbHVlID0+IHZhbHVlID09IG51bGw7XG4gIH1cblxuICByZXR1cm4gdmFsdWUgPT4gTG9jYWxDb2xsZWN0aW9uLl9mLl9lcXVhbChlbGVtZW50U2VsZWN0b3IsIHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gZXZlcnl0aGluZ01hdGNoZXIoZG9jT3JCcmFuY2hlZFZhbHVlcykge1xuICByZXR1cm4ge3Jlc3VsdDogdHJ1ZX07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBleHBhbmRBcnJheXNJbkJyYW5jaGVzKGJyYW5jaGVzLCBza2lwVGhlQXJyYXlzKSB7XG4gIGNvbnN0IGJyYW5jaGVzT3V0ID0gW107XG5cbiAgYnJhbmNoZXMuZm9yRWFjaChicmFuY2ggPT4ge1xuICAgIGNvbnN0IHRoaXNJc0FycmF5ID0gQXJyYXkuaXNBcnJheShicmFuY2gudmFsdWUpO1xuXG4gICAgLy8gV2UgaW5jbHVkZSB0aGUgYnJhbmNoIGl0c2VsZiwgKlVOTEVTUyogd2UgaXQncyBhbiBhcnJheSB0aGF0IHdlJ3JlIGdvaW5nXG4gICAgLy8gdG8gaXRlcmF0ZSBhbmQgd2UncmUgdG9sZCB0byBza2lwIGFycmF5cy4gIChUaGF0J3MgcmlnaHQsIHdlIGluY2x1ZGUgc29tZVxuICAgIC8vIGFycmF5cyBldmVuIHNraXBUaGVBcnJheXMgaXMgdHJ1ZTogdGhlc2UgYXJlIGFycmF5cyB0aGF0IHdlcmUgZm91bmQgdmlhXG4gICAgLy8gZXhwbGljaXQgbnVtZXJpY2FsIGluZGljZXMuKVxuICAgIGlmICghKHNraXBUaGVBcnJheXMgJiYgdGhpc0lzQXJyYXkgJiYgIWJyYW5jaC5kb250SXRlcmF0ZSkpIHtcbiAgICAgIGJyYW5jaGVzT3V0LnB1c2goe2FycmF5SW5kaWNlczogYnJhbmNoLmFycmF5SW5kaWNlcywgdmFsdWU6IGJyYW5jaC52YWx1ZX0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzSXNBcnJheSAmJiAhYnJhbmNoLmRvbnRJdGVyYXRlKSB7XG4gICAgICBicmFuY2gudmFsdWUuZm9yRWFjaCgodmFsdWUsIGkpID0+IHtcbiAgICAgICAgYnJhbmNoZXNPdXQucHVzaCh7XG4gICAgICAgICAgYXJyYXlJbmRpY2VzOiAoYnJhbmNoLmFycmF5SW5kaWNlcyB8fCBbXSkuY29uY2F0KGkpLFxuICAgICAgICAgIHZhbHVlXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gYnJhbmNoZXNPdXQ7XG59XG5cbi8vIEhlbHBlcnMgZm9yICRiaXRzQWxsU2V0LyRiaXRzQW55U2V0LyRiaXRzQWxsQ2xlYXIvJGJpdHNBbnlDbGVhci5cbmZ1bmN0aW9uIGdldE9wZXJhbmRCaXRtYXNrKG9wZXJhbmQsIHNlbGVjdG9yKSB7XG4gIC8vIG51bWVyaWMgYml0bWFza1xuICAvLyBZb3UgY2FuIHByb3ZpZGUgYSBudW1lcmljIGJpdG1hc2sgdG8gYmUgbWF0Y2hlZCBhZ2FpbnN0IHRoZSBvcGVyYW5kIGZpZWxkLlxuICAvLyBJdCBtdXN0IGJlIHJlcHJlc2VudGFibGUgYXMgYSBub24tbmVnYXRpdmUgMzItYml0IHNpZ25lZCBpbnRlZ2VyLlxuICAvLyBPdGhlcndpc2UsICRiaXRzQWxsU2V0IHdpbGwgcmV0dXJuIGFuIGVycm9yLlxuICBpZiAoTnVtYmVyLmlzSW50ZWdlcihvcGVyYW5kKSAmJiBvcGVyYW5kID49IDApIHtcbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkobmV3IEludDMyQXJyYXkoW29wZXJhbmRdKS5idWZmZXIpO1xuICB9XG5cbiAgLy8gYmluZGF0YSBiaXRtYXNrXG4gIC8vIFlvdSBjYW4gYWxzbyB1c2UgYW4gYXJiaXRyYXJpbHkgbGFyZ2UgQmluRGF0YSBpbnN0YW5jZSBhcyBhIGJpdG1hc2suXG4gIGlmIChFSlNPTi5pc0JpbmFyeShvcGVyYW5kKSkge1xuICAgIHJldHVybiBuZXcgVWludDhBcnJheShvcGVyYW5kLmJ1ZmZlcik7XG4gIH1cblxuICAvLyBwb3NpdGlvbiBsaXN0XG4gIC8vIElmIHF1ZXJ5aW5nIGEgbGlzdCBvZiBiaXQgcG9zaXRpb25zLCBlYWNoIDxwb3NpdGlvbj4gbXVzdCBiZSBhIG5vbi1uZWdhdGl2ZVxuICAvLyBpbnRlZ2VyLiBCaXQgcG9zaXRpb25zIHN0YXJ0IGF0IDAgZnJvbSB0aGUgbGVhc3Qgc2lnbmlmaWNhbnQgYml0LlxuICBpZiAoQXJyYXkuaXNBcnJheShvcGVyYW5kKSAmJlxuICAgICAgb3BlcmFuZC5ldmVyeSh4ID0+IE51bWJlci5pc0ludGVnZXIoeCkgJiYgeCA+PSAwKSkge1xuICAgIGNvbnN0IGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcigoTWF0aC5tYXgoLi4ub3BlcmFuZCkgPj4gMykgKyAxKTtcbiAgICBjb25zdCB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyKTtcblxuICAgIG9wZXJhbmQuZm9yRWFjaCh4ID0+IHtcbiAgICAgIHZpZXdbeCA+PiAzXSB8PSAxIDw8ICh4ICYgMHg3KTtcbiAgICB9KTtcblxuICAgIHJldHVybiB2aWV3O1xuICB9XG5cbiAgLy8gYmFkIG9wZXJhbmRcbiAgdGhyb3cgbmV3IE1pbmlNb25nb1F1ZXJ5RXJyb3IoXG4gICAgYG9wZXJhbmQgdG8gJHtzZWxlY3Rvcn0gbXVzdCBiZSBhIG51bWVyaWMgYml0bWFzayAocmVwcmVzZW50YWJsZSBhcyBhIGAgK1xuICAgICdub24tbmVnYXRpdmUgMzItYml0IHNpZ25lZCBpbnRlZ2VyKSwgYSBiaW5kYXRhIGJpdG1hc2sgb3IgYW4gYXJyYXkgd2l0aCAnICtcbiAgICAnYml0IHBvc2l0aW9ucyAobm9uLW5lZ2F0aXZlIGludGVnZXJzKSdcbiAgKTtcbn1cblxuZnVuY3Rpb24gZ2V0VmFsdWVCaXRtYXNrKHZhbHVlLCBsZW5ndGgpIHtcbiAgLy8gVGhlIGZpZWxkIHZhbHVlIG11c3QgYmUgZWl0aGVyIG51bWVyaWNhbCBvciBhIEJpbkRhdGEgaW5zdGFuY2UuIE90aGVyd2lzZSxcbiAgLy8gJGJpdHMuLi4gd2lsbCBub3QgbWF0Y2ggdGhlIGN1cnJlbnQgZG9jdW1lbnQuXG5cbiAgLy8gbnVtZXJpY2FsXG4gIGlmIChOdW1iZXIuaXNTYWZlSW50ZWdlcih2YWx1ZSkpIHtcbiAgICAvLyAkYml0cy4uLiB3aWxsIG5vdCBtYXRjaCBudW1lcmljYWwgdmFsdWVzIHRoYXQgY2Fubm90IGJlIHJlcHJlc2VudGVkIGFzIGFcbiAgICAvLyBzaWduZWQgNjQtYml0IGludGVnZXIuIFRoaXMgY2FuIGJlIHRoZSBjYXNlIGlmIGEgdmFsdWUgaXMgZWl0aGVyIHRvb1xuICAgIC8vIGxhcmdlIG9yIHNtYWxsIHRvIGZpdCBpbiBhIHNpZ25lZCA2NC1iaXQgaW50ZWdlciwgb3IgaWYgaXQgaGFzIGFcbiAgICAvLyBmcmFjdGlvbmFsIGNvbXBvbmVudC5cbiAgICBjb25zdCBidWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIoXG4gICAgICBNYXRoLm1heChsZW5ndGgsIDIgKiBVaW50MzJBcnJheS5CWVRFU19QRVJfRUxFTUVOVClcbiAgICApO1xuXG4gICAgbGV0IHZpZXcgPSBuZXcgVWludDMyQXJyYXkoYnVmZmVyLCAwLCAyKTtcbiAgICB2aWV3WzBdID0gdmFsdWUgJSAoKDEgPDwgMTYpICogKDEgPDwgMTYpKSB8IDA7XG4gICAgdmlld1sxXSA9IHZhbHVlIC8gKCgxIDw8IDE2KSAqICgxIDw8IDE2KSkgfCAwO1xuXG4gICAgLy8gc2lnbiBleHRlbnNpb25cbiAgICBpZiAodmFsdWUgPCAwKSB7XG4gICAgICB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyLCAyKTtcbiAgICAgIHZpZXcuZm9yRWFjaCgoYnl0ZSwgaSkgPT4ge1xuICAgICAgICB2aWV3W2ldID0gMHhmZjtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgVWludDhBcnJheShidWZmZXIpO1xuICB9XG5cbiAgLy8gYmluZGF0YVxuICBpZiAoRUpTT04uaXNCaW5hcnkodmFsdWUpKSB7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KHZhbHVlLmJ1ZmZlcik7XG4gIH1cblxuICAvLyBubyBtYXRjaFxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8vIEFjdHVhbGx5IGluc2VydHMgYSBrZXkgdmFsdWUgaW50byB0aGUgc2VsZWN0b3IgZG9jdW1lbnRcbi8vIEhvd2V2ZXIsIHRoaXMgY2hlY2tzIHRoZXJlIGlzIG5vIGFtYmlndWl0eSBpbiBzZXR0aW5nXG4vLyB0aGUgdmFsdWUgZm9yIHRoZSBnaXZlbiBrZXksIHRocm93cyBvdGhlcndpc2VcbmZ1bmN0aW9uIGluc2VydEludG9Eb2N1bWVudChkb2N1bWVudCwga2V5LCB2YWx1ZSkge1xuICBPYmplY3Qua2V5cyhkb2N1bWVudCkuZm9yRWFjaChleGlzdGluZ0tleSA9PiB7XG4gICAgaWYgKFxuICAgICAgKGV4aXN0aW5nS2V5Lmxlbmd0aCA+IGtleS5sZW5ndGggJiYgZXhpc3RpbmdLZXkuaW5kZXhPZihgJHtrZXl9LmApID09PSAwKSB8fFxuICAgICAgKGtleS5sZW5ndGggPiBleGlzdGluZ0tleS5sZW5ndGggJiYga2V5LmluZGV4T2YoYCR7ZXhpc3RpbmdLZXl9LmApID09PSAwKVxuICAgICkge1xuICAgICAgdGhyb3cgbmV3IE1pbmlNb25nb1F1ZXJ5RXJyb3IoXG4gICAgICAgIGBjYW5ub3QgaW5mZXIgcXVlcnkgZmllbGRzIHRvIHNldCwgYm90aCBwYXRocyAnJHtleGlzdGluZ0tleX0nIGFuZCAnJHtrZXl9JyBhcmUgbWF0Y2hlZGBcbiAgICAgICk7XG4gICAgfSBlbHNlIGlmIChleGlzdGluZ0tleSA9PT0ga2V5KSB7XG4gICAgICB0aHJvdyBuZXcgTWluaU1vbmdvUXVlcnlFcnJvcihcbiAgICAgICAgYGNhbm5vdCBpbmZlciBxdWVyeSBmaWVsZHMgdG8gc2V0LCBwYXRoICcke2tleX0nIGlzIG1hdGNoZWQgdHdpY2VgXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgZG9jdW1lbnRba2V5XSA9IHZhbHVlO1xufVxuXG4vLyBSZXR1cm5zIGEgYnJhbmNoZWQgbWF0Y2hlciB0aGF0IG1hdGNoZXMgaWZmIHRoZSBnaXZlbiBtYXRjaGVyIGRvZXMgbm90LlxuLy8gTm90ZSB0aGF0IHRoaXMgaW1wbGljaXRseSBcImRlTW9yZ2FuaXplc1wiIHRoZSB3cmFwcGVkIGZ1bmN0aW9uLiAgaWUsIGl0XG4vLyBtZWFucyB0aGF0IEFMTCBicmFuY2ggdmFsdWVzIG5lZWQgdG8gZmFpbCB0byBtYXRjaCBpbm5lckJyYW5jaGVkTWF0Y2hlci5cbmZ1bmN0aW9uIGludmVydEJyYW5jaGVkTWF0Y2hlcihicmFuY2hlZE1hdGNoZXIpIHtcbiAgcmV0dXJuIGJyYW5jaFZhbHVlcyA9PiB7XG4gICAgLy8gV2UgZXhwbGljaXRseSBjaG9vc2UgdG8gc3RyaXAgYXJyYXlJbmRpY2VzIGhlcmU6IGl0IGRvZXNuJ3QgbWFrZSBzZW5zZSB0b1xuICAgIC8vIHNheSBcInVwZGF0ZSB0aGUgYXJyYXkgZWxlbWVudCB0aGF0IGRvZXMgbm90IG1hdGNoIHNvbWV0aGluZ1wiLCBhdCBsZWFzdFxuICAgIC8vIGluIG1vbmdvLWxhbmQuXG4gICAgcmV0dXJuIHtyZXN1bHQ6ICFicmFuY2hlZE1hdGNoZXIoYnJhbmNoVmFsdWVzKS5yZXN1bHR9O1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNJbmRleGFibGUob2JqKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KG9iaikgfHwgTG9jYWxDb2xsZWN0aW9uLl9pc1BsYWluT2JqZWN0KG9iaik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc051bWVyaWNLZXkocykge1xuICByZXR1cm4gL15bMC05XSskLy50ZXN0KHMpO1xufVxuXG4vLyBSZXR1cm5zIHRydWUgaWYgdGhpcyBpcyBhbiBvYmplY3Qgd2l0aCBhdCBsZWFzdCBvbmUga2V5IGFuZCBhbGwga2V5cyBiZWdpblxuLy8gd2l0aCAkLiAgVW5sZXNzIGluY29uc2lzdGVudE9LIGlzIHNldCwgdGhyb3dzIGlmIHNvbWUga2V5cyBiZWdpbiB3aXRoICQgYW5kXG4vLyBvdGhlcnMgZG9uJ3QuXG5leHBvcnQgZnVuY3Rpb24gaXNPcGVyYXRvck9iamVjdCh2YWx1ZVNlbGVjdG9yLCBpbmNvbnNpc3RlbnRPSykge1xuICBpZiAoIUxvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdCh2YWx1ZVNlbGVjdG9yKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGxldCB0aGVzZUFyZU9wZXJhdG9ycyA9IHVuZGVmaW5lZDtcbiAgT2JqZWN0LmtleXModmFsdWVTZWxlY3RvcikuZm9yRWFjaChzZWxLZXkgPT4ge1xuICAgIGNvbnN0IHRoaXNJc09wZXJhdG9yID0gc2VsS2V5LnN1YnN0cigwLCAxKSA9PT0gJyQnIHx8IHNlbEtleSA9PT0gJ2RpZmYnO1xuXG4gICAgaWYgKHRoZXNlQXJlT3BlcmF0b3JzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoZXNlQXJlT3BlcmF0b3JzID0gdGhpc0lzT3BlcmF0b3I7XG4gICAgfSBlbHNlIGlmICh0aGVzZUFyZU9wZXJhdG9ycyAhPT0gdGhpc0lzT3BlcmF0b3IpIHtcbiAgICAgIGlmICghaW5jb25zaXN0ZW50T0spIHtcbiAgICAgICAgdGhyb3cgbmV3IE1pbmlNb25nb1F1ZXJ5RXJyb3IoXG4gICAgICAgICAgYEluY29uc2lzdGVudCBvcGVyYXRvcjogJHtKU09OLnN0cmluZ2lmeSh2YWx1ZVNlbGVjdG9yKX1gXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIHRoZXNlQXJlT3BlcmF0b3JzID0gZmFsc2U7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gISF0aGVzZUFyZU9wZXJhdG9yczsgLy8ge30gaGFzIG5vIG9wZXJhdG9yc1xufVxuXG4vLyBIZWxwZXIgZm9yICRsdC8kZ3QvJGx0ZS8kZ3RlLlxuZnVuY3Rpb24gbWFrZUluZXF1YWxpdHkoY21wVmFsdWVDb21wYXJhdG9yKSB7XG4gIHJldHVybiB7XG4gICAgY29tcGlsZUVsZW1lbnRTZWxlY3RvcihvcGVyYW5kKSB7XG4gICAgICAvLyBBcnJheXMgbmV2ZXIgY29tcGFyZSBmYWxzZSB3aXRoIG5vbi1hcnJheXMgZm9yIGFueSBpbmVxdWFsaXR5LlxuICAgICAgLy8gWFhYIFRoaXMgd2FzIGJlaGF2aW9yIHdlIG9ic2VydmVkIGluIHByZS1yZWxlYXNlIE1vbmdvREIgMi41LCBidXRcbiAgICAgIC8vICAgICBpdCBzZWVtcyB0byBoYXZlIGJlZW4gcmV2ZXJ0ZWQuXG4gICAgICAvLyAgICAgU2VlIGh0dHBzOi8vamlyYS5tb25nb2RiLm9yZy9icm93c2UvU0VSVkVSLTExNDQ0XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShvcGVyYW5kKSkge1xuICAgICAgICByZXR1cm4gKCkgPT4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIC8vIFNwZWNpYWwgY2FzZTogY29uc2lkZXIgdW5kZWZpbmVkIGFuZCBudWxsIHRoZSBzYW1lIChzbyB0cnVlIHdpdGhcbiAgICAgIC8vICRndGUvJGx0ZSkuXG4gICAgICBpZiAob3BlcmFuZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG9wZXJhbmQgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBvcGVyYW5kVHlwZSA9IExvY2FsQ29sbGVjdGlvbi5fZi5fdHlwZShvcGVyYW5kKTtcblxuICAgICAgcmV0dXJuIHZhbHVlID0+IHtcbiAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB2YWx1ZSA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDb21wYXJpc29ucyBhcmUgbmV2ZXIgdHJ1ZSBhbW9uZyB0aGluZ3Mgb2YgZGlmZmVyZW50IHR5cGUgKGV4Y2VwdFxuICAgICAgICAvLyBudWxsIHZzIHVuZGVmaW5lZCkuXG4gICAgICAgIGlmIChMb2NhbENvbGxlY3Rpb24uX2YuX3R5cGUodmFsdWUpICE9PSBvcGVyYW5kVHlwZSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjbXBWYWx1ZUNvbXBhcmF0b3IoTG9jYWxDb2xsZWN0aW9uLl9mLl9jbXAodmFsdWUsIG9wZXJhbmQpKTtcbiAgICAgIH07XG4gICAgfSxcbiAgfTtcbn1cblxuLy8gbWFrZUxvb2t1cEZ1bmN0aW9uKGtleSkgcmV0dXJucyBhIGxvb2t1cCBmdW5jdGlvbi5cbi8vXG4vLyBBIGxvb2t1cCBmdW5jdGlvbiB0YWtlcyBpbiBhIGRvY3VtZW50IGFuZCByZXR1cm5zIGFuIGFycmF5IG9mIG1hdGNoaW5nXG4vLyBicmFuY2hlcy4gIElmIG5vIGFycmF5cyBhcmUgZm91bmQgd2hpbGUgbG9va2luZyB1cCB0aGUga2V5LCB0aGlzIGFycmF5IHdpbGxcbi8vIGhhdmUgZXhhY3RseSBvbmUgYnJhbmNoZXMgKHBvc3NpYmx5ICd1bmRlZmluZWQnLCBpZiBzb21lIHNlZ21lbnQgb2YgdGhlIGtleVxuLy8gd2FzIG5vdCBmb3VuZCkuXG4vL1xuLy8gSWYgYXJyYXlzIGFyZSBmb3VuZCBpbiB0aGUgbWlkZGxlLCB0aGlzIGNhbiBoYXZlIG1vcmUgdGhhbiBvbmUgZWxlbWVudCwgc2luY2Vcbi8vIHdlICdicmFuY2gnLiBXaGVuIHdlICdicmFuY2gnLCBpZiB0aGVyZSBhcmUgbW9yZSBrZXkgc2VnbWVudHMgdG8gbG9vayB1cCxcbi8vIHRoZW4gd2Ugb25seSBwdXJzdWUgYnJhbmNoZXMgdGhhdCBhcmUgcGxhaW4gb2JqZWN0cyAobm90IGFycmF5cyBvciBzY2FsYXJzKS5cbi8vIFRoaXMgbWVhbnMgd2UgY2FuIGFjdHVhbGx5IGVuZCB1cCB3aXRoIG5vIGJyYW5jaGVzIVxuLy9cbi8vIFdlIGRvICpOT1QqIGJyYW5jaCBvbiBhcnJheXMgdGhhdCBhcmUgZm91bmQgYXQgdGhlIGVuZCAoaWUsIGF0IHRoZSBsYXN0XG4vLyBkb3R0ZWQgbWVtYmVyIG9mIHRoZSBrZXkpLiBXZSBqdXN0IHJldHVybiB0aGF0IGFycmF5OyBpZiB5b3Ugd2FudCB0b1xuLy8gZWZmZWN0aXZlbHkgJ2JyYW5jaCcgb3ZlciB0aGUgYXJyYXkncyB2YWx1ZXMsIHBvc3QtcHJvY2VzcyB0aGUgbG9va3VwXG4vLyBmdW5jdGlvbiB3aXRoIGV4cGFuZEFycmF5c0luQnJhbmNoZXMuXG4vL1xuLy8gRWFjaCBicmFuY2ggaXMgYW4gb2JqZWN0IHdpdGgga2V5czpcbi8vICAtIHZhbHVlOiB0aGUgdmFsdWUgYXQgdGhlIGJyYW5jaFxuLy8gIC0gZG9udEl0ZXJhdGU6IGFuIG9wdGlvbmFsIGJvb2w7IGlmIHRydWUsIGl0IG1lYW5zIHRoYXQgJ3ZhbHVlJyBpcyBhbiBhcnJheVxuLy8gICAgdGhhdCBleHBhbmRBcnJheXNJbkJyYW5jaGVzIHNob3VsZCBOT1QgZXhwYW5kLiBUaGlzIHNwZWNpZmljYWxseSBoYXBwZW5zXG4vLyAgICB3aGVuIHRoZXJlIGlzIGEgbnVtZXJpYyBpbmRleCBpbiB0aGUga2V5LCBhbmQgZW5zdXJlcyB0aGVcbi8vICAgIHBlcmhhcHMtc3VycHJpc2luZyBNb25nb0RCIGJlaGF2aW9yIHdoZXJlIHsnYS4wJzogNX0gZG9lcyBOT1Rcbi8vICAgIG1hdGNoIHthOiBbWzVdXX0uXG4vLyAgLSBhcnJheUluZGljZXM6IGlmIGFueSBhcnJheSBpbmRleGluZyB3YXMgZG9uZSBkdXJpbmcgbG9va3VwIChlaXRoZXIgZHVlIHRvXG4vLyAgICBleHBsaWNpdCBudW1lcmljIGluZGljZXMgb3IgaW1wbGljaXQgYnJhbmNoaW5nKSwgdGhpcyB3aWxsIGJlIGFuIGFycmF5IG9mXG4vLyAgICB0aGUgYXJyYXkgaW5kaWNlcyB1c2VkLCBmcm9tIG91dGVybW9zdCB0byBpbm5lcm1vc3Q7IGl0IGlzIGZhbHNleSBvclxuLy8gICAgYWJzZW50IGlmIG5vIGFycmF5IGluZGV4IGlzIHVzZWQuIElmIGFuIGV4cGxpY2l0IG51bWVyaWMgaW5kZXggaXMgdXNlZCxcbi8vICAgIHRoZSBpbmRleCB3aWxsIGJlIGZvbGxvd2VkIGluIGFycmF5SW5kaWNlcyBieSB0aGUgc3RyaW5nICd4Jy5cbi8vXG4vLyAgICBOb3RlOiBhcnJheUluZGljZXMgaXMgdXNlZCBmb3IgdHdvIHB1cnBvc2VzLiBGaXJzdCwgaXQgaXMgdXNlZCB0b1xuLy8gICAgaW1wbGVtZW50IHRoZSAnJCcgbW9kaWZpZXIgZmVhdHVyZSwgd2hpY2ggb25seSBldmVyIGxvb2tzIGF0IGl0cyBmaXJzdFxuLy8gICAgZWxlbWVudC5cbi8vXG4vLyAgICBTZWNvbmQsIGl0IGlzIHVzZWQgZm9yIHNvcnQga2V5IGdlbmVyYXRpb24sIHdoaWNoIG5lZWRzIHRvIGJlIGFibGUgdG8gdGVsbFxuLy8gICAgdGhlIGRpZmZlcmVuY2UgYmV0d2VlbiBkaWZmZXJlbnQgcGF0aHMuIE1vcmVvdmVyLCBpdCBuZWVkcyB0b1xuLy8gICAgZGlmZmVyZW50aWF0ZSBiZXR3ZWVuIGV4cGxpY2l0IGFuZCBpbXBsaWNpdCBicmFuY2hpbmcsIHdoaWNoIGlzIHdoeVxuLy8gICAgdGhlcmUncyB0aGUgc29tZXdoYXQgaGFja3kgJ3gnIGVudHJ5OiB0aGlzIG1lYW5zIHRoYXQgZXhwbGljaXQgYW5kXG4vLyAgICBpbXBsaWNpdCBhcnJheSBsb29rdXBzIHdpbGwgaGF2ZSBkaWZmZXJlbnQgZnVsbCBhcnJheUluZGljZXMgcGF0aHMuIChUaGF0XG4vLyAgICBjb2RlIG9ubHkgcmVxdWlyZXMgdGhhdCBkaWZmZXJlbnQgcGF0aHMgaGF2ZSBkaWZmZXJlbnQgYXJyYXlJbmRpY2VzOyBpdFxuLy8gICAgZG9lc24ndCBhY3R1YWxseSAncGFyc2UnIGFycmF5SW5kaWNlcy4gQXMgYW4gYWx0ZXJuYXRpdmUsIGFycmF5SW5kaWNlc1xuLy8gICAgY291bGQgY29udGFpbiBvYmplY3RzIHdpdGggZmxhZ3MgbGlrZSAnaW1wbGljaXQnLCBidXQgSSB0aGluayB0aGF0IG9ubHlcbi8vICAgIG1ha2VzIHRoZSBjb2RlIHN1cnJvdW5kaW5nIHRoZW0gbW9yZSBjb21wbGV4Lilcbi8vXG4vLyAgICAoQnkgdGhlIHdheSwgdGhpcyBmaWVsZCBlbmRzIHVwIGdldHRpbmcgcGFzc2VkIGFyb3VuZCBhIGxvdCB3aXRob3V0XG4vLyAgICBjbG9uaW5nLCBzbyBuZXZlciBtdXRhdGUgYW55IGFycmF5SW5kaWNlcyBmaWVsZC92YXIgaW4gdGhpcyBwYWNrYWdlISlcbi8vXG4vL1xuLy8gQXQgdGhlIHRvcCBsZXZlbCwgeW91IG1heSBvbmx5IHBhc3MgaW4gYSBwbGFpbiBvYmplY3Qgb3IgYXJyYXkuXG4vL1xuLy8gU2VlIHRoZSB0ZXN0ICdtaW5pbW9uZ28gLSBsb29rdXAnIGZvciBzb21lIGV4YW1wbGVzIG9mIHdoYXQgbG9va3VwIGZ1bmN0aW9uc1xuLy8gcmV0dXJuLlxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VMb29rdXBGdW5jdGlvbihrZXksIG9wdGlvbnMgPSB7fSkge1xuICBjb25zdCBwYXJ0cyA9IGtleS5zcGxpdCgnLicpO1xuICBjb25zdCBmaXJzdFBhcnQgPSBwYXJ0cy5sZW5ndGggPyBwYXJ0c1swXSA6ICcnO1xuICBjb25zdCBsb29rdXBSZXN0ID0gKFxuICAgIHBhcnRzLmxlbmd0aCA+IDEgJiZcbiAgICBtYWtlTG9va3VwRnVuY3Rpb24ocGFydHMuc2xpY2UoMSkuam9pbignLicpLCBvcHRpb25zKVxuICApO1xuXG4gIGZ1bmN0aW9uIGJ1aWxkUmVzdWx0KGFycmF5SW5kaWNlcywgZG9udEl0ZXJhdGUsIHZhbHVlKSB7XG4gICAgcmV0dXJuIGFycmF5SW5kaWNlcyAmJiBhcnJheUluZGljZXMubGVuZ3RoXG4gICAgICA/IGRvbnRJdGVyYXRlXG4gICAgICAgID8gW3sgYXJyYXlJbmRpY2VzLCBkb250SXRlcmF0ZSwgdmFsdWUgfV1cbiAgICAgICAgOiBbeyBhcnJheUluZGljZXMsIHZhbHVlIH1dXG4gICAgICA6IGRvbnRJdGVyYXRlXG4gICAgICAgID8gW3sgZG9udEl0ZXJhdGUsIHZhbHVlIH1dXG4gICAgICAgIDogW3sgdmFsdWUgfV07XG4gIH1cblxuICAvLyBEb2Mgd2lsbCBhbHdheXMgYmUgYSBwbGFpbiBvYmplY3Qgb3IgYW4gYXJyYXkuXG4gIC8vIGFwcGx5IGFuIGV4cGxpY2l0IG51bWVyaWMgaW5kZXgsIGFuIGFycmF5LlxuICByZXR1cm4gKGRvYywgYXJyYXlJbmRpY2VzKSA9PiB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZG9jKSkge1xuICAgICAgLy8gSWYgd2UncmUgYmVpbmcgYXNrZWQgdG8gZG8gYW4gaW52YWxpZCBsb29rdXAgaW50byBhbiBhcnJheSAobm9uLWludGVnZXJcbiAgICAgIC8vIG9yIG91dC1vZi1ib3VuZHMpLCByZXR1cm4gbm8gcmVzdWx0cyAod2hpY2ggaXMgZGlmZmVyZW50IGZyb20gcmV0dXJuaW5nXG4gICAgICAvLyBhIHNpbmdsZSB1bmRlZmluZWQgcmVzdWx0LCBpbiB0aGF0IGBudWxsYCBlcXVhbGl0eSBjaGVja3Mgd29uJ3QgbWF0Y2gpLlxuICAgICAgaWYgKCEoaXNOdW1lcmljS2V5KGZpcnN0UGFydCkgJiYgZmlyc3RQYXJ0IDwgZG9jLmxlbmd0aCkpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgfVxuXG4gICAgICAvLyBSZW1lbWJlciB0aGF0IHdlIHVzZWQgdGhpcyBhcnJheSBpbmRleC4gSW5jbHVkZSBhbiAneCcgdG8gaW5kaWNhdGUgdGhhdFxuICAgICAgLy8gdGhlIHByZXZpb3VzIGluZGV4IGNhbWUgZnJvbSBiZWluZyBjb25zaWRlcmVkIGFzIGFuIGV4cGxpY2l0IGFycmF5XG4gICAgICAvLyBpbmRleCAobm90IGJyYW5jaGluZykuXG4gICAgICBhcnJheUluZGljZXMgPSBhcnJheUluZGljZXMgPyBhcnJheUluZGljZXMuY29uY2F0KCtmaXJzdFBhcnQsICd4JykgOiBbK2ZpcnN0UGFydCwgJ3gnXTtcbiAgICB9XG5cbiAgICAvLyBEbyBvdXIgZmlyc3QgbG9va3VwLlxuICAgIGNvbnN0IGZpcnN0TGV2ZWwgPSBkb2NbZmlyc3RQYXJ0XTtcblxuICAgIC8vIElmIHRoZXJlIGlzIG5vIGRlZXBlciB0byBkaWcsIHJldHVybiB3aGF0IHdlIGZvdW5kLlxuICAgIC8vXG4gICAgLy8gSWYgd2hhdCB3ZSBmb3VuZCBpcyBhbiBhcnJheSwgbW9zdCB2YWx1ZSBzZWxlY3RvcnMgd2lsbCBjaG9vc2UgdG8gdHJlYXRcbiAgICAvLyB0aGUgZWxlbWVudHMgb2YgdGhlIGFycmF5IGFzIG1hdGNoYWJsZSB2YWx1ZXMgaW4gdGhlaXIgb3duIHJpZ2h0LCBidXRcbiAgICAvLyB0aGF0J3MgZG9uZSBvdXRzaWRlIG9mIHRoZSBsb29rdXAgZnVuY3Rpb24uIChFeGNlcHRpb25zIHRvIHRoaXMgYXJlICRzaXplXG4gICAgLy8gYW5kIHN0dWZmIHJlbGF0aW5nIHRvICRlbGVtTWF0Y2guICBlZywge2E6IHskc2l6ZTogMn19IGRvZXMgbm90IG1hdGNoIHthOlxuICAgIC8vIFtbMSwgMl1dfS4pXG4gICAgLy9cbiAgICAvLyBUaGF0IHNhaWQsIGlmIHdlIGp1c3QgZGlkIGFuICpleHBsaWNpdCogYXJyYXkgbG9va3VwIChvbiBkb2MpIHRvIGZpbmRcbiAgICAvLyBmaXJzdExldmVsLCBhbmQgZmlyc3RMZXZlbCBpcyBhbiBhcnJheSB0b28sIHdlIGRvIE5PVCB3YW50IHZhbHVlXG4gICAgLy8gc2VsZWN0b3JzIHRvIGl0ZXJhdGUgb3ZlciBpdC4gIGVnLCB7J2EuMCc6IDV9IGRvZXMgbm90IG1hdGNoIHthOiBbWzVdXX0uXG4gICAgLy8gU28gaW4gdGhhdCBjYXNlLCB3ZSBtYXJrIHRoZSByZXR1cm4gdmFsdWUgYXMgJ2Rvbid0IGl0ZXJhdGUnLlxuICAgIGlmICghbG9va3VwUmVzdCkge1xuICAgICAgcmV0dXJuIGJ1aWxkUmVzdWx0KFxuICAgICAgICBhcnJheUluZGljZXMsXG4gICAgICAgIEFycmF5LmlzQXJyYXkoZG9jKSAmJiBBcnJheS5pc0FycmF5KGZpcnN0TGV2ZWwpLFxuICAgICAgICBmaXJzdExldmVsLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICAvLyBXZSBuZWVkIHRvIGRpZyBkZWVwZXIuICBCdXQgaWYgd2UgY2FuJ3QsIGJlY2F1c2Ugd2hhdCB3ZSd2ZSBmb3VuZCBpcyBub3RcbiAgICAvLyBhbiBhcnJheSBvciBwbGFpbiBvYmplY3QsIHdlJ3JlIGRvbmUuIElmIHdlIGp1c3QgZGlkIGEgbnVtZXJpYyBpbmRleCBpbnRvXG4gICAgLy8gYW4gYXJyYXksIHdlIHJldHVybiBub3RoaW5nIGhlcmUgKHRoaXMgaXMgYSBjaGFuZ2UgaW4gTW9uZ28gMi41IGZyb21cbiAgICAvLyBNb25nbyAyLjQsIHdoZXJlIHsnYS4wLmInOiBudWxsfSBzdG9wcGVkIG1hdGNoaW5nIHthOiBbNV19KS4gT3RoZXJ3aXNlLFxuICAgIC8vIHJldHVybiBhIHNpbmdsZSBgdW5kZWZpbmVkYCAod2hpY2ggY2FuLCBmb3IgZXhhbXBsZSwgbWF0Y2ggdmlhIGVxdWFsaXR5XG4gICAgLy8gd2l0aCBgbnVsbGApLlxuICAgIGlmICghaXNJbmRleGFibGUoZmlyc3RMZXZlbCkpIHtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGRvYykpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gYnVpbGRSZXN1bHQoYXJyYXlJbmRpY2VzLCBmYWxzZSwgdW5kZWZpbmVkKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSBbXTtcbiAgICBjb25zdCBhcHBlbmRUb1Jlc3VsdCA9IG1vcmUgPT4ge1xuICAgICAgcmVzdWx0LnB1c2goLi4ubW9yZSk7XG4gICAgfTtcblxuICAgIC8vIERpZyBkZWVwZXI6IGxvb2sgdXAgdGhlIHJlc3Qgb2YgdGhlIHBhcnRzIG9uIHdoYXRldmVyIHdlJ3ZlIGZvdW5kLlxuICAgIC8vIChsb29rdXBSZXN0IGlzIHNtYXJ0IGVub3VnaCB0byBub3QgdHJ5IHRvIGRvIGludmFsaWQgbG9va3VwcyBpbnRvXG4gICAgLy8gZmlyc3RMZXZlbCBpZiBpdCdzIGFuIGFycmF5LilcbiAgICBhcHBlbmRUb1Jlc3VsdChsb29rdXBSZXN0KGZpcnN0TGV2ZWwsIGFycmF5SW5kaWNlcykpO1xuXG4gICAgLy8gSWYgd2UgZm91bmQgYW4gYXJyYXksIHRoZW4gaW4gKmFkZGl0aW9uKiB0byBwb3RlbnRpYWxseSB0cmVhdGluZyB0aGUgbmV4dFxuICAgIC8vIHBhcnQgYXMgYSBsaXRlcmFsIGludGVnZXIgbG9va3VwLCB3ZSBzaG91bGQgYWxzbyAnYnJhbmNoJzogdHJ5IHRvIGxvb2sgdXBcbiAgICAvLyB0aGUgcmVzdCBvZiB0aGUgcGFydHMgb24gZWFjaCBhcnJheSBlbGVtZW50IGluIHBhcmFsbGVsLlxuICAgIC8vXG4gICAgLy8gSW4gdGhpcyBjYXNlLCB3ZSAqb25seSogZGlnIGRlZXBlciBpbnRvIGFycmF5IGVsZW1lbnRzIHRoYXQgYXJlIHBsYWluXG4gICAgLy8gb2JqZWN0cy4gKFJlY2FsbCB0aGF0IHdlIG9ubHkgZ290IHRoaXMgZmFyIGlmIHdlIGhhdmUgZnVydGhlciB0byBkaWcuKVxuICAgIC8vIFRoaXMgbWFrZXMgc2Vuc2U6IHdlIGNlcnRhaW5seSBkb24ndCBkaWcgZGVlcGVyIGludG8gbm9uLWluZGV4YWJsZVxuICAgIC8vIG9iamVjdHMuIEFuZCBpdCB3b3VsZCBiZSB3ZWlyZCB0byBkaWcgaW50byBhbiBhcnJheTogaXQncyBzaW1wbGVyIHRvIGhhdmVcbiAgICAvLyBhIHJ1bGUgdGhhdCBleHBsaWNpdCBpbnRlZ2VyIGluZGV4ZXMgb25seSBhcHBseSB0byBhbiBvdXRlciBhcnJheSwgbm90IHRvXG4gICAgLy8gYW4gYXJyYXkgeW91IGZpbmQgYWZ0ZXIgYSBicmFuY2hpbmcgc2VhcmNoLlxuICAgIC8vXG4gICAgLy8gSW4gdGhlIHNwZWNpYWwgY2FzZSBvZiBhIG51bWVyaWMgcGFydCBpbiBhICpzb3J0IHNlbGVjdG9yKiAobm90IGEgcXVlcnlcbiAgICAvLyBzZWxlY3RvciksIHdlIHNraXAgdGhlIGJyYW5jaGluZzogd2UgT05MWSBhbGxvdyB0aGUgbnVtZXJpYyBwYXJ0IHRvIG1lYW5cbiAgICAvLyAnbG9vayB1cCB0aGlzIGluZGV4JyBpbiB0aGF0IGNhc2UsIG5vdCAnYWxzbyBsb29rIHVwIHRoaXMgaW5kZXggaW4gYWxsXG4gICAgLy8gdGhlIGVsZW1lbnRzIG9mIHRoZSBhcnJheScuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZmlyc3RMZXZlbCkgJiZcbiAgICAgICAgIShpc051bWVyaWNLZXkocGFydHNbMV0pICYmIG9wdGlvbnMuZm9yU29ydCkpIHtcbiAgICAgIGZpcnN0TGV2ZWwuZm9yRWFjaCgoYnJhbmNoLCBhcnJheUluZGV4KSA9PiB7XG4gICAgICAgIGlmIChMb2NhbENvbGxlY3Rpb24uX2lzUGxhaW5PYmplY3QoYnJhbmNoKSkge1xuICAgICAgICAgIGFwcGVuZFRvUmVzdWx0KGxvb2t1cFJlc3QoYnJhbmNoLCBhcnJheUluZGljZXMgPyBhcnJheUluZGljZXMuY29uY2F0KGFycmF5SW5kZXgpIDogW2FycmF5SW5kZXhdKSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG59XG5cbi8vIE9iamVjdCBleHBvcnRlZCBvbmx5IGZvciB1bml0IHRlc3RpbmcuXG4vLyBVc2UgaXQgdG8gZXhwb3J0IHByaXZhdGUgZnVuY3Rpb25zIHRvIHRlc3QgaW4gVGlueXRlc3QuXG5NaW5pbW9uZ29UZXN0ID0ge21ha2VMb29rdXBGdW5jdGlvbn07XG5NaW5pbW9uZ29FcnJvciA9IChtZXNzYWdlLCBvcHRpb25zID0ge30pID0+IHtcbiAgaWYgKHR5cGVvZiBtZXNzYWdlID09PSAnc3RyaW5nJyAmJiBvcHRpb25zLmZpZWxkKSB7XG4gICAgbWVzc2FnZSArPSBgIGZvciBmaWVsZCAnJHtvcHRpb25zLmZpZWxkfSdgO1xuICB9XG5cbiAgY29uc3QgZXJyb3IgPSBuZXcgRXJyb3IobWVzc2FnZSk7XG4gIGVycm9yLm5hbWUgPSAnTWluaW1vbmdvRXJyb3InO1xuICByZXR1cm4gZXJyb3I7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gbm90aGluZ01hdGNoZXIoZG9jT3JCcmFuY2hlZFZhbHVlcykge1xuICByZXR1cm4ge3Jlc3VsdDogZmFsc2V9O1xufVxuXG4vLyBUYWtlcyBhbiBvcGVyYXRvciBvYmplY3QgKGFuIG9iamVjdCB3aXRoICQga2V5cykgYW5kIHJldHVybnMgYSBicmFuY2hlZFxuLy8gbWF0Y2hlciBmb3IgaXQuXG5mdW5jdGlvbiBvcGVyYXRvckJyYW5jaGVkTWF0Y2hlcih2YWx1ZVNlbGVjdG9yLCBtYXRjaGVyLCBpc1Jvb3QpIHtcbiAgLy8gRWFjaCB2YWx1ZVNlbGVjdG9yIHdvcmtzIHNlcGFyYXRlbHkgb24gdGhlIHZhcmlvdXMgYnJhbmNoZXMuICBTbyBvbmVcbiAgLy8gb3BlcmF0b3IgY2FuIG1hdGNoIG9uZSBicmFuY2ggYW5kIGFub3RoZXIgY2FuIG1hdGNoIGFub3RoZXIgYnJhbmNoLiAgVGhpc1xuICAvLyBpcyBPSy5cbiAgY29uc3Qgb3BlcmF0b3JNYXRjaGVycyA9IE9iamVjdC5rZXlzKHZhbHVlU2VsZWN0b3IpLm1hcChvcGVyYXRvciA9PiB7XG4gICAgY29uc3Qgb3BlcmFuZCA9IHZhbHVlU2VsZWN0b3Jbb3BlcmF0b3JdO1xuXG4gICAgY29uc3Qgc2ltcGxlUmFuZ2UgPSAoXG4gICAgICBbJyRsdCcsICckbHRlJywgJyRndCcsICckZ3RlJ10uaW5jbHVkZXMob3BlcmF0b3IpICYmXG4gICAgICB0eXBlb2Ygb3BlcmFuZCA9PT0gJ251bWJlcidcbiAgICApO1xuXG4gICAgY29uc3Qgc2ltcGxlRXF1YWxpdHkgPSAoXG4gICAgICBbJyRuZScsICckZXEnXS5pbmNsdWRlcyhvcGVyYXRvcikgJiZcbiAgICAgIG9wZXJhbmQgIT09IE9iamVjdChvcGVyYW5kKVxuICAgICk7XG5cbiAgICBjb25zdCBzaW1wbGVJbmNsdXNpb24gPSAoXG4gICAgICBbJyRpbicsICckbmluJ10uaW5jbHVkZXMob3BlcmF0b3IpXG4gICAgICAmJiBBcnJheS5pc0FycmF5KG9wZXJhbmQpXG4gICAgICAmJiAhb3BlcmFuZC5zb21lKHggPT4geCA9PT0gT2JqZWN0KHgpKVxuICAgICk7XG5cbiAgICBpZiAoIShzaW1wbGVSYW5nZSB8fCBzaW1wbGVJbmNsdXNpb24gfHwgc2ltcGxlRXF1YWxpdHkpKSB7XG4gICAgICBtYXRjaGVyLl9pc1NpbXBsZSA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmIChoYXNPd24uY2FsbChWQUxVRV9PUEVSQVRPUlMsIG9wZXJhdG9yKSkge1xuICAgICAgcmV0dXJuIFZBTFVFX09QRVJBVE9SU1tvcGVyYXRvcl0ob3BlcmFuZCwgdmFsdWVTZWxlY3RvciwgbWF0Y2hlciwgaXNSb290KTtcbiAgICB9XG5cbiAgICBpZiAoaGFzT3duLmNhbGwoRUxFTUVOVF9PUEVSQVRPUlMsIG9wZXJhdG9yKSkge1xuICAgICAgY29uc3Qgb3B0aW9ucyA9IEVMRU1FTlRfT1BFUkFUT1JTW29wZXJhdG9yXTtcbiAgICAgIHJldHVybiBjb252ZXJ0RWxlbWVudE1hdGNoZXJUb0JyYW5jaGVkTWF0Y2hlcihcbiAgICAgICAgb3B0aW9ucy5jb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQsIHZhbHVlU2VsZWN0b3IsIG1hdGNoZXIpLFxuICAgICAgICBvcHRpb25zXG4gICAgICApO1xuICAgIH1cblxuICAgIHRocm93IG5ldyBNaW5pTW9uZ29RdWVyeUVycm9yKGBVbnJlY29nbml6ZWQgb3BlcmF0b3I6ICR7b3BlcmF0b3J9YCk7XG4gIH0pO1xuXG4gIHJldHVybiBhbmRCcmFuY2hlZE1hdGNoZXJzKG9wZXJhdG9yTWF0Y2hlcnMpO1xufVxuXG4vLyBwYXRocyAtIEFycmF5OiBsaXN0IG9mIG1vbmdvIHN0eWxlIHBhdGhzXG4vLyBuZXdMZWFmRm4gLSBGdW5jdGlvbjogb2YgZm9ybSBmdW5jdGlvbihwYXRoKSBzaG91bGQgcmV0dXJuIGEgc2NhbGFyIHZhbHVlIHRvXG4vLyAgICAgICAgICAgICAgICAgICAgICAgcHV0IGludG8gbGlzdCBjcmVhdGVkIGZvciB0aGF0IHBhdGhcbi8vIGNvbmZsaWN0Rm4gLSBGdW5jdGlvbjogb2YgZm9ybSBmdW5jdGlvbihub2RlLCBwYXRoLCBmdWxsUGF0aCkgaXMgY2FsbGVkXG4vLyAgICAgICAgICAgICAgICAgICAgICAgIHdoZW4gYnVpbGRpbmcgYSB0cmVlIHBhdGggZm9yICdmdWxsUGF0aCcgbm9kZSBvblxuLy8gICAgICAgICAgICAgICAgICAgICAgICAncGF0aCcgd2FzIGFscmVhZHkgYSBsZWFmIHdpdGggYSB2YWx1ZS4gTXVzdCByZXR1cm4gYVxuLy8gICAgICAgICAgICAgICAgICAgICAgICBjb25mbGljdCByZXNvbHV0aW9uLlxuLy8gaW5pdGlhbCB0cmVlIC0gT3B0aW9uYWwgT2JqZWN0OiBzdGFydGluZyB0cmVlLlxuLy8gQHJldHVybnMgLSBPYmplY3Q6IHRyZWUgcmVwcmVzZW50ZWQgYXMgYSBzZXQgb2YgbmVzdGVkIG9iamVjdHNcbmV4cG9ydCBmdW5jdGlvbiBwYXRoc1RvVHJlZShwYXRocywgbmV3TGVhZkZuLCBjb25mbGljdEZuLCByb290ID0ge30pIHtcbiAgcGF0aHMuZm9yRWFjaChwYXRoID0+IHtcbiAgICBjb25zdCBwYXRoQXJyYXkgPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgbGV0IHRyZWUgPSByb290O1xuXG4gICAgLy8gdXNlIC5ldmVyeSBqdXN0IGZvciBpdGVyYXRpb24gd2l0aCBicmVha1xuICAgIGNvbnN0IHN1Y2Nlc3MgPSBwYXRoQXJyYXkuc2xpY2UoMCwgLTEpLmV2ZXJ5KChrZXksIGkpID0+IHtcbiAgICAgIGlmICghaGFzT3duLmNhbGwodHJlZSwga2V5KSkge1xuICAgICAgICB0cmVlW2tleV0gPSB7fTtcbiAgICAgIH0gZWxzZSBpZiAodHJlZVtrZXldICE9PSBPYmplY3QodHJlZVtrZXldKSkge1xuICAgICAgICB0cmVlW2tleV0gPSBjb25mbGljdEZuKFxuICAgICAgICAgIHRyZWVba2V5XSxcbiAgICAgICAgICBwYXRoQXJyYXkuc2xpY2UoMCwgaSArIDEpLmpvaW4oJy4nKSxcbiAgICAgICAgICBwYXRoXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gYnJlYWsgb3V0IG9mIGxvb3AgaWYgd2UgYXJlIGZhaWxpbmcgZm9yIHRoaXMgcGF0aFxuICAgICAgICBpZiAodHJlZVtrZXldICE9PSBPYmplY3QodHJlZVtrZXldKSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0cmVlID0gdHJlZVtrZXldO1xuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcblxuICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICBjb25zdCBsYXN0S2V5ID0gcGF0aEFycmF5W3BhdGhBcnJheS5sZW5ndGggLSAxXTtcbiAgICAgIGlmIChoYXNPd24uY2FsbCh0cmVlLCBsYXN0S2V5KSkge1xuICAgICAgICB0cmVlW2xhc3RLZXldID0gY29uZmxpY3RGbih0cmVlW2xhc3RLZXldLCBwYXRoLCBwYXRoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRyZWVbbGFzdEtleV0gPSBuZXdMZWFmRm4ocGF0aCk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gcm9vdDtcbn1cblxuLy8gTWFrZXMgc3VyZSB3ZSBnZXQgMiBlbGVtZW50cyBhcnJheSBhbmQgYXNzdW1lIHRoZSBmaXJzdCBvbmUgdG8gYmUgeCBhbmRcbi8vIHRoZSBzZWNvbmQgb25lIHRvIHkgbm8gbWF0dGVyIHdoYXQgdXNlciBwYXNzZXMuXG4vLyBJbiBjYXNlIHVzZXIgcGFzc2VzIHsgbG9uOiB4LCBsYXQ6IHkgfSByZXR1cm5zIFt4LCB5XVxuZnVuY3Rpb24gcG9pbnRUb0FycmF5KHBvaW50KSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KHBvaW50KSA/IHBvaW50LnNsaWNlKCkgOiBbcG9pbnQueCwgcG9pbnQueV07XG59XG5cbi8vIENyZWF0aW5nIGEgZG9jdW1lbnQgZnJvbSBhbiB1cHNlcnQgaXMgcXVpdGUgdHJpY2t5LlxuLy8gRS5nLiB0aGlzIHNlbGVjdG9yOiB7XCIkb3JcIjogW3tcImIuZm9vXCI6IHtcIiRhbGxcIjogW1wiYmFyXCJdfX1dfSwgc2hvdWxkIHJlc3VsdFxuLy8gaW46IHtcImIuZm9vXCI6IFwiYmFyXCJ9XG4vLyBCdXQgdGhpcyBzZWxlY3Rvcjoge1wiJG9yXCI6IFt7XCJiXCI6IHtcImZvb1wiOiB7XCIkYWxsXCI6IFtcImJhclwiXX19fV19IHNob3VsZCB0aHJvd1xuLy8gYW4gZXJyb3JcblxuLy8gU29tZSBydWxlcyAoZm91bmQgbWFpbmx5IHdpdGggdHJpYWwgJiBlcnJvciwgc28gdGhlcmUgbWlnaHQgYmUgbW9yZSk6XG4vLyAtIGhhbmRsZSBhbGwgY2hpbGRzIG9mICRhbmQgKG9yIGltcGxpY2l0ICRhbmQpXG4vLyAtIGhhbmRsZSAkb3Igbm9kZXMgd2l0aCBleGFjdGx5IDEgY2hpbGRcbi8vIC0gaWdub3JlICRvciBub2RlcyB3aXRoIG1vcmUgdGhhbiAxIGNoaWxkXG4vLyAtIGlnbm9yZSAkbm9yIGFuZCAkbm90IG5vZGVzXG4vLyAtIHRocm93IHdoZW4gYSB2YWx1ZSBjYW4gbm90IGJlIHNldCB1bmFtYmlndW91c2x5XG4vLyAtIGV2ZXJ5IHZhbHVlIGZvciAkYWxsIHNob3VsZCBiZSBkZWFsdCB3aXRoIGFzIHNlcGFyYXRlICRlcS1zXG4vLyAtIHRocmVhdCBhbGwgY2hpbGRyZW4gb2YgJGFsbCBhcyAkZXEgc2V0dGVycyAoPT4gc2V0IGlmICRhbGwubGVuZ3RoID09PSAxLFxuLy8gICBvdGhlcndpc2UgdGhyb3cgZXJyb3IpXG4vLyAtIHlvdSBjYW4gbm90IG1peCAnJCctcHJlZml4ZWQga2V5cyBhbmQgbm9uLSckJy1wcmVmaXhlZCBrZXlzXG4vLyAtIHlvdSBjYW4gb25seSBoYXZlIGRvdHRlZCBrZXlzIG9uIGEgcm9vdC1sZXZlbFxuLy8gLSB5b3UgY2FuIG5vdCBoYXZlICckJy1wcmVmaXhlZCBrZXlzIG1vcmUgdGhhbiBvbmUtbGV2ZWwgZGVlcCBpbiBhbiBvYmplY3RcblxuLy8gSGFuZGxlcyBvbmUga2V5L3ZhbHVlIHBhaXIgdG8gcHV0IGluIHRoZSBzZWxlY3RvciBkb2N1bWVudFxuZnVuY3Rpb24gcG9wdWxhdGVEb2N1bWVudFdpdGhLZXlWYWx1ZShkb2N1bWVudCwga2V5LCB2YWx1ZSkge1xuICBpZiAodmFsdWUgJiYgT2JqZWN0LmdldFByb3RvdHlwZU9mKHZhbHVlKSA9PT0gT2JqZWN0LnByb3RvdHlwZSkge1xuICAgIHBvcHVsYXRlRG9jdW1lbnRXaXRoT2JqZWN0KGRvY3VtZW50LCBrZXksIHZhbHVlKTtcbiAgfSBlbHNlIGlmICghKHZhbHVlIGluc3RhbmNlb2YgUmVnRXhwKSkge1xuICAgIGluc2VydEludG9Eb2N1bWVudChkb2N1bWVudCwga2V5LCB2YWx1ZSk7XG4gIH1cbn1cblxuLy8gSGFuZGxlcyBhIGtleSwgdmFsdWUgcGFpciB0byBwdXQgaW4gdGhlIHNlbGVjdG9yIGRvY3VtZW50XG4vLyBpZiB0aGUgdmFsdWUgaXMgYW4gb2JqZWN0XG5mdW5jdGlvbiBwb3B1bGF0ZURvY3VtZW50V2l0aE9iamVjdChkb2N1bWVudCwga2V5LCB2YWx1ZSkge1xuICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXModmFsdWUpO1xuICBjb25zdCB1bnByZWZpeGVkS2V5cyA9IGtleXMuZmlsdGVyKG9wID0+IG9wWzBdICE9PSAnJCcpO1xuXG4gIGlmICh1bnByZWZpeGVkS2V5cy5sZW5ndGggPiAwIHx8ICFrZXlzLmxlbmd0aCkge1xuICAgIC8vIExpdGVyYWwgKHBvc3NpYmx5IGVtcHR5KSBvYmplY3QgKCBvciBlbXB0eSBvYmplY3QgKVxuICAgIC8vIERvbid0IGFsbG93IG1peGluZyAnJCctcHJlZml4ZWQgd2l0aCBub24tJyQnLXByZWZpeGVkIGZpZWxkc1xuICAgIGlmIChrZXlzLmxlbmd0aCAhPT0gdW5wcmVmaXhlZEtleXMubGVuZ3RoKSB7XG4gICAgICB0aHJvdyBuZXcgTWluaU1vbmdvUXVlcnlFcnJvcihgdW5rbm93biBvcGVyYXRvcjogJHt1bnByZWZpeGVkS2V5c1swXX1gKTtcbiAgICB9XG5cbiAgICB2YWxpZGF0ZU9iamVjdCh2YWx1ZSwga2V5KTtcbiAgICBpbnNlcnRJbnRvRG9jdW1lbnQoZG9jdW1lbnQsIGtleSwgdmFsdWUpO1xuICB9IGVsc2Uge1xuICAgIE9iamVjdC5rZXlzKHZhbHVlKS5mb3JFYWNoKG9wID0+IHtcbiAgICAgIGNvbnN0IG9iamVjdCA9IHZhbHVlW29wXTtcblxuICAgICAgaWYgKG9wID09PSAnJGVxJykge1xuICAgICAgICBwb3B1bGF0ZURvY3VtZW50V2l0aEtleVZhbHVlKGRvY3VtZW50LCBrZXksIG9iamVjdCk7XG4gICAgICB9IGVsc2UgaWYgKG9wID09PSAnJGFsbCcpIHtcbiAgICAgICAgLy8gZXZlcnkgdmFsdWUgZm9yICRhbGwgc2hvdWxkIGJlIGRlYWx0IHdpdGggYXMgc2VwYXJhdGUgJGVxLXNcbiAgICAgICAgb2JqZWN0LmZvckVhY2goZWxlbWVudCA9PlxuICAgICAgICAgIHBvcHVsYXRlRG9jdW1lbnRXaXRoS2V5VmFsdWUoZG9jdW1lbnQsIGtleSwgZWxlbWVudClcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG4vLyBGaWxscyBhIGRvY3VtZW50IHdpdGggY2VydGFpbiBmaWVsZHMgZnJvbSBhbiB1cHNlcnQgc2VsZWN0b3JcbmV4cG9ydCBmdW5jdGlvbiBwb3B1bGF0ZURvY3VtZW50V2l0aFF1ZXJ5RmllbGRzKHF1ZXJ5LCBkb2N1bWVudCA9IHt9KSB7XG4gIGlmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YocXVlcnkpID09PSBPYmplY3QucHJvdG90eXBlKSB7XG4gICAgLy8gaGFuZGxlIGltcGxpY2l0ICRhbmRcbiAgICBPYmplY3Qua2V5cyhxdWVyeSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgY29uc3QgdmFsdWUgPSBxdWVyeVtrZXldO1xuXG4gICAgICBpZiAoa2V5ID09PSAnJGFuZCcpIHtcbiAgICAgICAgLy8gaGFuZGxlIGV4cGxpY2l0ICRhbmRcbiAgICAgICAgdmFsdWUuZm9yRWFjaChlbGVtZW50ID0+XG4gICAgICAgICAgcG9wdWxhdGVEb2N1bWVudFdpdGhRdWVyeUZpZWxkcyhlbGVtZW50LCBkb2N1bWVudClcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSBpZiAoa2V5ID09PSAnJG9yJykge1xuICAgICAgICAvLyBoYW5kbGUgJG9yIG5vZGVzIHdpdGggZXhhY3RseSAxIGNoaWxkXG4gICAgICAgIGlmICh2YWx1ZS5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICBwb3B1bGF0ZURvY3VtZW50V2l0aFF1ZXJ5RmllbGRzKHZhbHVlWzBdLCBkb2N1bWVudCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoa2V5WzBdICE9PSAnJCcpIHtcbiAgICAgICAgLy8gSWdub3JlIG90aGVyICckJy1wcmVmaXhlZCBsb2dpY2FsIHNlbGVjdG9yc1xuICAgICAgICBwb3B1bGF0ZURvY3VtZW50V2l0aEtleVZhbHVlKGRvY3VtZW50LCBrZXksIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBIYW5kbGUgbWV0ZW9yLXNwZWNpZmljIHNob3J0Y3V0IGZvciBzZWxlY3RpbmcgX2lkXG4gICAgaWYgKExvY2FsQ29sbGVjdGlvbi5fc2VsZWN0b3JJc0lkKHF1ZXJ5KSkge1xuICAgICAgaW5zZXJ0SW50b0RvY3VtZW50KGRvY3VtZW50LCAnX2lkJywgcXVlcnkpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBkb2N1bWVudDtcbn1cblxuLy8gVHJhdmVyc2VzIHRoZSBrZXlzIG9mIHBhc3NlZCBwcm9qZWN0aW9uIGFuZCBjb25zdHJ1Y3RzIGEgdHJlZSB3aGVyZSBhbGxcbi8vIGxlYXZlcyBhcmUgZWl0aGVyIGFsbCBUcnVlIG9yIGFsbCBGYWxzZVxuLy8gQHJldHVybnMgT2JqZWN0OlxuLy8gIC0gdHJlZSAtIE9iamVjdCAtIHRyZWUgcmVwcmVzZW50YXRpb24gb2Yga2V5cyBpbnZvbHZlZCBpbiBwcm9qZWN0aW9uXG4vLyAgKGV4Y2VwdGlvbiBmb3IgJ19pZCcgYXMgaXQgaXMgYSBzcGVjaWFsIGNhc2UgaGFuZGxlZCBzZXBhcmF0ZWx5KVxuLy8gIC0gaW5jbHVkaW5nIC0gQm9vbGVhbiAtIFwidGFrZSBvbmx5IGNlcnRhaW4gZmllbGRzXCIgdHlwZSBvZiBwcm9qZWN0aW9uXG5leHBvcnQgZnVuY3Rpb24gcHJvamVjdGlvbkRldGFpbHMoZmllbGRzKSB7XG4gIC8vIEZpbmQgdGhlIG5vbi1faWQga2V5cyAoX2lkIGlzIGhhbmRsZWQgc3BlY2lhbGx5IGJlY2F1c2UgaXQgaXMgaW5jbHVkZWRcbiAgLy8gdW5sZXNzIGV4cGxpY2l0bHkgZXhjbHVkZWQpLiBTb3J0IHRoZSBrZXlzLCBzbyB0aGF0IG91ciBjb2RlIHRvIGRldGVjdFxuICAvLyBvdmVybGFwcyBsaWtlICdmb28nIGFuZCAnZm9vLmJhcicgY2FuIGFzc3VtZSB0aGF0ICdmb28nIGNvbWVzIGZpcnN0LlxuICBsZXQgZmllbGRzS2V5cyA9IE9iamVjdC5rZXlzKGZpZWxkcykuc29ydCgpO1xuXG4gIC8vIElmIF9pZCBpcyB0aGUgb25seSBmaWVsZCBpbiB0aGUgcHJvamVjdGlvbiwgZG8gbm90IHJlbW92ZSBpdCwgc2luY2UgaXQgaXNcbiAgLy8gcmVxdWlyZWQgdG8gZGV0ZXJtaW5lIGlmIHRoaXMgaXMgYW4gZXhjbHVzaW9uIG9yIGV4Y2x1c2lvbi4gQWxzbyBrZWVwIGFuXG4gIC8vIGluY2x1c2l2ZSBfaWQsIHNpbmNlIGluY2x1c2l2ZSBfaWQgZm9sbG93cyB0aGUgbm9ybWFsIHJ1bGVzIGFib3V0IG1peGluZ1xuICAvLyBpbmNsdXNpdmUgYW5kIGV4Y2x1c2l2ZSBmaWVsZHMuIElmIF9pZCBpcyBub3QgdGhlIG9ubHkgZmllbGQgaW4gdGhlXG4gIC8vIHByb2plY3Rpb24gYW5kIGlzIGV4Y2x1c2l2ZSwgcmVtb3ZlIGl0IHNvIGl0IGNhbiBiZSBoYW5kbGVkIGxhdGVyIGJ5IGFcbiAgLy8gc3BlY2lhbCBjYXNlLCBzaW5jZSBleGNsdXNpdmUgX2lkIGlzIGFsd2F5cyBhbGxvd2VkLlxuICBpZiAoIShmaWVsZHNLZXlzLmxlbmd0aCA9PT0gMSAmJiBmaWVsZHNLZXlzWzBdID09PSAnX2lkJykgJiZcbiAgICAgICEoZmllbGRzS2V5cy5pbmNsdWRlcygnX2lkJykgJiYgZmllbGRzLl9pZCkpIHtcbiAgICBmaWVsZHNLZXlzID0gZmllbGRzS2V5cy5maWx0ZXIoa2V5ID0+IGtleSAhPT0gJ19pZCcpO1xuICB9XG5cbiAgbGV0IGluY2x1ZGluZyA9IG51bGw7IC8vIFVua25vd25cblxuICBmaWVsZHNLZXlzLmZvckVhY2goa2V5UGF0aCA9PiB7XG4gICAgY29uc3QgcnVsZSA9ICEhZmllbGRzW2tleVBhdGhdO1xuXG4gICAgaWYgKGluY2x1ZGluZyA9PT0gbnVsbCkge1xuICAgICAgaW5jbHVkaW5nID0gcnVsZTtcbiAgICB9XG5cbiAgICAvLyBUaGlzIGVycm9yIG1lc3NhZ2UgaXMgY29waWVkIGZyb20gTW9uZ29EQiBzaGVsbFxuICAgIGlmIChpbmNsdWRpbmcgIT09IHJ1bGUpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAnWW91IGNhbm5vdCBjdXJyZW50bHkgbWl4IGluY2x1ZGluZyBhbmQgZXhjbHVkaW5nIGZpZWxkcy4nXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgY29uc3QgcHJvamVjdGlvblJ1bGVzVHJlZSA9IHBhdGhzVG9UcmVlKFxuICAgIGZpZWxkc0tleXMsXG4gICAgcGF0aCA9PiBpbmNsdWRpbmcsXG4gICAgKG5vZGUsIHBhdGgsIGZ1bGxQYXRoKSA9PiB7XG4gICAgICAvLyBDaGVjayBwYXNzZWQgcHJvamVjdGlvbiBmaWVsZHMnIGtleXM6IElmIHlvdSBoYXZlIHR3byBydWxlcyBzdWNoIGFzXG4gICAgICAvLyAnZm9vLmJhcicgYW5kICdmb28uYmFyLmJheicsIHRoZW4gdGhlIHJlc3VsdCBiZWNvbWVzIGFtYmlndW91cy4gSWZcbiAgICAgIC8vIHRoYXQgaGFwcGVucywgdGhlcmUgaXMgYSBwcm9iYWJpbGl0eSB5b3UgYXJlIGRvaW5nIHNvbWV0aGluZyB3cm9uZyxcbiAgICAgIC8vIGZyYW1ld29yayBzaG91bGQgbm90aWZ5IHlvdSBhYm91dCBzdWNoIG1pc3Rha2UgZWFybGllciBvbiBjdXJzb3JcbiAgICAgIC8vIGNvbXBpbGF0aW9uIHN0ZXAgdGhhbiBsYXRlciBkdXJpbmcgcnVudGltZS4gIE5vdGUsIHRoYXQgcmVhbCBtb25nb1xuICAgICAgLy8gZG9lc24ndCBkbyBhbnl0aGluZyBhYm91dCBpdCBhbmQgdGhlIGxhdGVyIHJ1bGUgYXBwZWFycyBpbiBwcm9qZWN0aW9uXG4gICAgICAvLyBwcm9qZWN0LCBtb3JlIHByaW9yaXR5IGl0IHRha2VzLlxuICAgICAgLy9cbiAgICAgIC8vIEV4YW1wbGUsIGFzc3VtZSBmb2xsb3dpbmcgaW4gbW9uZ28gc2hlbGw6XG4gICAgICAvLyA+IGRiLmNvbGwuaW5zZXJ0KHsgYTogeyBiOiAyMywgYzogNDQgfSB9KVxuICAgICAgLy8gPiBkYi5jb2xsLmZpbmQoe30sIHsgJ2EnOiAxLCAnYS5iJzogMSB9KVxuICAgICAgLy8ge1wiX2lkXCI6IE9iamVjdElkKFwiNTIwYmZlNDU2MDI0NjA4ZThlZjI0YWYzXCIpLCBcImFcIjoge1wiYlwiOiAyM319XG4gICAgICAvLyA+IGRiLmNvbGwuZmluZCh7fSwgeyAnYS5iJzogMSwgJ2EnOiAxIH0pXG4gICAgICAvLyB7XCJfaWRcIjogT2JqZWN0SWQoXCI1MjBiZmU0NTYwMjQ2MDhlOGVmMjRhZjNcIiksIFwiYVwiOiB7XCJiXCI6IDIzLCBcImNcIjogNDR9fVxuICAgICAgLy9cbiAgICAgIC8vIE5vdGUsIGhvdyBzZWNvbmQgdGltZSB0aGUgcmV0dXJuIHNldCBvZiBrZXlzIGlzIGRpZmZlcmVudC5cbiAgICAgIGNvbnN0IGN1cnJlbnRQYXRoID0gZnVsbFBhdGg7XG4gICAgICBjb25zdCBhbm90aGVyUGF0aCA9IHBhdGg7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgYGJvdGggJHtjdXJyZW50UGF0aH0gYW5kICR7YW5vdGhlclBhdGh9IGZvdW5kIGluIGZpZWxkcyBvcHRpb24sIGAgK1xuICAgICAgICAndXNpbmcgYm90aCBvZiB0aGVtIG1heSB0cmlnZ2VyIHVuZXhwZWN0ZWQgYmVoYXZpb3IuIERpZCB5b3UgbWVhbiB0byAnICtcbiAgICAgICAgJ3VzZSBvbmx5IG9uZSBvZiB0aGVtPydcbiAgICAgICk7XG4gICAgfSk7XG5cbiAgcmV0dXJuIHtpbmNsdWRpbmcsIHRyZWU6IHByb2plY3Rpb25SdWxlc1RyZWV9O1xufVxuXG4vLyBUYWtlcyBhIFJlZ0V4cCBvYmplY3QgYW5kIHJldHVybnMgYW4gZWxlbWVudCBtYXRjaGVyLlxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2V4cEVsZW1lbnRNYXRjaGVyKHJlZ2V4cCkge1xuICByZXR1cm4gdmFsdWUgPT4ge1xuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgcmV0dXJuIHZhbHVlLnRvU3RyaW5nKCkgPT09IHJlZ2V4cC50b1N0cmluZygpO1xuICAgIH1cblxuICAgIC8vIFJlZ2V4cHMgb25seSB3b3JrIGFnYWluc3Qgc3RyaW5ncy5cbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIFJlc2V0IHJlZ2V4cCdzIHN0YXRlIHRvIGF2b2lkIGluY29uc2lzdGVudCBtYXRjaGluZyBmb3Igb2JqZWN0cyB3aXRoIHRoZVxuICAgIC8vIHNhbWUgdmFsdWUgb24gY29uc2VjdXRpdmUgY2FsbHMgb2YgcmVnZXhwLnRlc3QuIFRoaXMgaGFwcGVucyBvbmx5IGlmIHRoZVxuICAgIC8vIHJlZ2V4cCBoYXMgdGhlICdnJyBmbGFnLiBBbHNvIG5vdGUgdGhhdCBFUzYgaW50cm9kdWNlcyBhIG5ldyBmbGFnICd5JyBmb3JcbiAgICAvLyB3aGljaCB3ZSBzaG91bGQgKm5vdCogY2hhbmdlIHRoZSBsYXN0SW5kZXggYnV0IE1vbmdvREIgZG9lc24ndCBzdXBwb3J0XG4gICAgLy8gZWl0aGVyIG9mIHRoZXNlIGZsYWdzLlxuICAgIHJlZ2V4cC5sYXN0SW5kZXggPSAwO1xuXG4gICAgcmV0dXJuIHJlZ2V4cC50ZXN0KHZhbHVlKTtcbiAgfTtcbn1cblxuLy8gVmFsaWRhdGVzIHRoZSBrZXkgaW4gYSBwYXRoLlxuLy8gT2JqZWN0cyB0aGF0IGFyZSBuZXN0ZWQgbW9yZSB0aGVuIDEgbGV2ZWwgY2Fubm90IGhhdmUgZG90dGVkIGZpZWxkc1xuLy8gb3IgZmllbGRzIHN0YXJ0aW5nIHdpdGggJyQnXG5mdW5jdGlvbiB2YWxpZGF0ZUtleUluUGF0aChrZXksIHBhdGgpIHtcbiAgaWYgKGtleS5pbmNsdWRlcygnLicpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYFRoZSBkb3R0ZWQgZmllbGQgJyR7a2V5fScgaW4gJyR7cGF0aH0uJHtrZXl9IGlzIG5vdCB2YWxpZCBmb3Igc3RvcmFnZS5gXG4gICAgKTtcbiAgfVxuXG4gIGlmIChrZXlbMF0gPT09ICckJykge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBUaGUgZG9sbGFyICgkKSBwcmVmaXhlZCBmaWVsZCAgJyR7cGF0aH0uJHtrZXl9IGlzIG5vdCB2YWxpZCBmb3Igc3RvcmFnZS5gXG4gICAgKTtcbiAgfVxufVxuXG4vLyBSZWN1cnNpdmVseSB2YWxpZGF0ZXMgYW4gb2JqZWN0IHRoYXQgaXMgbmVzdGVkIG1vcmUgdGhhbiBvbmUgbGV2ZWwgZGVlcFxuZnVuY3Rpb24gdmFsaWRhdGVPYmplY3Qob2JqZWN0LCBwYXRoKSB7XG4gIGlmIChvYmplY3QgJiYgT2JqZWN0LmdldFByb3RvdHlwZU9mKG9iamVjdCkgPT09IE9iamVjdC5wcm90b3R5cGUpIHtcbiAgICBPYmplY3Qua2V5cyhvYmplY3QpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgIHZhbGlkYXRlS2V5SW5QYXRoKGtleSwgcGF0aCk7XG4gICAgICB2YWxpZGF0ZU9iamVjdChvYmplY3Rba2V5XSwgcGF0aCArICcuJyArIGtleSk7XG4gICAgfSk7XG4gIH1cbn1cbiIsIi8qKiBFeHBvcnRlZCB2YWx1ZXMgYXJlIGFsc28gdXNlZCBpbiB0aGUgbW9uZ28gcGFja2FnZS4gKi9cblxuLyoqIEBwYXJhbSB7c3RyaW5nfSBtZXRob2QgKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBc3luY01ldGhvZE5hbWUobWV0aG9kKSB7XG4gIHJldHVybiBgJHttZXRob2QucmVwbGFjZSgnXycsICcnKX1Bc3luY2A7XG59XG5cbmV4cG9ydCBjb25zdCBBU1lOQ19DT0xMRUNUSU9OX01FVEhPRFMgPSBbXG4gICdfY3JlYXRlQ2FwcGVkQ29sbGVjdGlvbicsXG4gICdkcm9wQ29sbGVjdGlvbicsXG4gICdkcm9wSW5kZXgnLFxuICAvKipcbiAgICogQHN1bW1hcnkgQ3JlYXRlcyB0aGUgc3BlY2lmaWVkIGluZGV4IG9uIHRoZSBjb2xsZWN0aW9uLlxuICAgKiBAbG9jdXMgc2VydmVyXG4gICAqIEBtZXRob2QgY3JlYXRlSW5kZXhBc3luY1xuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtPYmplY3R9IGluZGV4IEEgZG9jdW1lbnQgdGhhdCBjb250YWlucyB0aGUgZmllbGQgYW5kIHZhbHVlIHBhaXJzIHdoZXJlIHRoZSBmaWVsZCBpcyB0aGUgaW5kZXgga2V5IGFuZCB0aGUgdmFsdWUgZGVzY3JpYmVzIHRoZSB0eXBlIG9mIGluZGV4IGZvciB0aGF0IGZpZWxkLiBGb3IgYW4gYXNjZW5kaW5nIGluZGV4IG9uIGEgZmllbGQsIHNwZWNpZnkgYSB2YWx1ZSBvZiBgMWA7IGZvciBkZXNjZW5kaW5nIGluZGV4LCBzcGVjaWZ5IGEgdmFsdWUgb2YgYC0xYC4gVXNlIGB0ZXh0YCBmb3IgdGV4dCBpbmRleGVzLlxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIEFsbCBvcHRpb25zIGFyZSBsaXN0ZWQgaW4gW01vbmdvREIgZG9jdW1lbnRhdGlvbl0oaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL21hbnVhbC9yZWZlcmVuY2UvbWV0aG9kL2RiLmNvbGxlY3Rpb24uY3JlYXRlSW5kZXgvI29wdGlvbnMpXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRpb25zLm5hbWUgTmFtZSBvZiB0aGUgaW5kZXhcbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLnVuaXF1ZSBEZWZpbmUgdGhhdCB0aGUgaW5kZXggdmFsdWVzIG11c3QgYmUgdW5pcXVlLCBtb3JlIGF0IFtNb25nb0RCIGRvY3VtZW50YXRpb25dKGh0dHBzOi8vZG9jcy5tb25nb2RiLmNvbS9tYW51YWwvY29yZS9pbmRleC11bmlxdWUvKVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMuc3BhcnNlIERlZmluZSB0aGF0IHRoZSBpbmRleCBpcyBzcGFyc2UsIG1vcmUgYXQgW01vbmdvREIgZG9jdW1lbnRhdGlvbl0oaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL21hbnVhbC9jb3JlL2luZGV4LXNwYXJzZS8pXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKi9cbiAgJ2NyZWF0ZUluZGV4JyxcbiAgLyoqXG4gICAqIEBzdW1tYXJ5IEZpbmRzIHRoZSBmaXJzdCBkb2N1bWVudCB0aGF0IG1hdGNoZXMgdGhlIHNlbGVjdG9yLCBhcyBvcmRlcmVkIGJ5IHNvcnQgYW5kIHNraXAgb3B0aW9ucy4gUmV0dXJucyBgdW5kZWZpbmVkYCBpZiBubyBtYXRjaGluZyBkb2N1bWVudCBpcyBmb3VuZC5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgZmluZE9uZUFzeW5jXG4gICAqIEBtZW1iZXJvZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge01vbmdvU2VsZWN0b3J9IFtzZWxlY3Rvcl0gQSBxdWVyeSBkZXNjcmliaW5nIHRoZSBkb2N1bWVudHMgdG8gZmluZFxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gICAqIEBwYXJhbSB7TW9uZ29Tb3J0U3BlY2lmaWVyfSBvcHRpb25zLnNvcnQgU29ydCBvcmRlciAoZGVmYXVsdDogbmF0dXJhbCBvcmRlcilcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdGlvbnMuc2tpcCBOdW1iZXIgb2YgcmVzdWx0cyB0byBza2lwIGF0IHRoZSBiZWdpbm5pbmdcbiAgICogQHBhcmFtIHtNb25nb0ZpZWxkU3BlY2lmaWVyfSBvcHRpb25zLmZpZWxkcyBEaWN0aW9uYXJ5IG9mIGZpZWxkcyB0byByZXR1cm4gb3IgZXhjbHVkZS5cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLnJlYWN0aXZlIChDbGllbnQgb25seSkgRGVmYXVsdCB0cnVlOyBwYXNzIGZhbHNlIHRvIGRpc2FibGUgcmVhY3Rpdml0eVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBvcHRpb25zLnRyYW5zZm9ybSBPdmVycmlkZXMgYHRyYW5zZm9ybWAgb24gdGhlIFtgQ29sbGVjdGlvbmBdKCNjb2xsZWN0aW9ucykgZm9yIHRoaXMgY3Vyc29yLiAgUGFzcyBgbnVsbGAgdG8gZGlzYWJsZSB0cmFuc2Zvcm1hdGlvbi5cbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdGlvbnMucmVhZFByZWZlcmVuY2UgKFNlcnZlciBvbmx5KSBTcGVjaWZpZXMgYSBjdXN0b20gTW9uZ29EQiBbYHJlYWRQcmVmZXJlbmNlYF0oaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL21hbnVhbC9jb3JlL3JlYWQtcHJlZmVyZW5jZSkgZm9yIGZldGNoaW5nIHRoZSBkb2N1bWVudC4gUG9zc2libGUgdmFsdWVzIGFyZSBgcHJpbWFyeWAsIGBwcmltYXJ5UHJlZmVycmVkYCwgYHNlY29uZGFyeWAsIGBzZWNvbmRhcnlQcmVmZXJyZWRgIGFuZCBgbmVhcmVzdGAuXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKi9cbiAgJ2ZpbmRPbmUnLFxuICAvKipcbiAgICogQHN1bW1hcnkgSW5zZXJ0IGEgZG9jdW1lbnQgaW4gdGhlIGNvbGxlY3Rpb24uICBSZXR1cm5zIGl0cyB1bmlxdWUgX2lkLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1ldGhvZCAgaW5zZXJ0QXN5bmNcbiAgICogQG1lbWJlcm9mIE1vbmdvLkNvbGxlY3Rpb25cbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgVGhlIGRvY3VtZW50IHRvIGluc2VydC4gTWF5IG5vdCB5ZXQgaGF2ZSBhbiBfaWQgYXR0cmlidXRlLCBpbiB3aGljaCBjYXNlIE1ldGVvciB3aWxsIGdlbmVyYXRlIG9uZSBmb3IgeW91LlxuICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgKi9cbiAgJ2luc2VydCcsXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBSZW1vdmUgZG9jdW1lbnRzIGZyb20gdGhlIGNvbGxlY3Rpb25cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgcmVtb3ZlQXN5bmNcbiAgICogQG1lbWJlcm9mIE1vbmdvLkNvbGxlY3Rpb25cbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7TW9uZ29TZWxlY3Rvcn0gc2VsZWN0b3IgU3BlY2lmaWVzIHdoaWNoIGRvY3VtZW50cyB0byByZW1vdmVcbiAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICovXG4gICdyZW1vdmUnLFxuICAvKipcbiAgICogQHN1bW1hcnkgTW9kaWZ5IG9uZSBvciBtb3JlIGRvY3VtZW50cyBpbiB0aGUgY29sbGVjdGlvbi4gUmV0dXJucyB0aGUgbnVtYmVyIG9mIG1hdGNoZWQgZG9jdW1lbnRzLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1ldGhvZCB1cGRhdGVBc3luY1xuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtNb25nb1NlbGVjdG9yfSBzZWxlY3RvciBTcGVjaWZpZXMgd2hpY2ggZG9jdW1lbnRzIHRvIG1vZGlmeVxuICAgKiBAcGFyYW0ge01vbmdvTW9kaWZpZXJ9IG1vZGlmaWVyIFNwZWNpZmllcyBob3cgdG8gbW9kaWZ5IHRoZSBkb2N1bWVudHNcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMubXVsdGkgVHJ1ZSB0byBtb2RpZnkgYWxsIG1hdGNoaW5nIGRvY3VtZW50czsgZmFsc2UgdG8gb25seSBtb2RpZnkgb25lIG9mIHRoZSBtYXRjaGluZyBkb2N1bWVudHMgKHRoZSBkZWZhdWx0KS5cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLnVwc2VydCBUcnVlIHRvIGluc2VydCBhIGRvY3VtZW50IGlmIG5vIG1hdGNoaW5nIGRvY3VtZW50cyBhcmUgZm91bmQuXG4gICAqIEBwYXJhbSB7QXJyYXl9IG9wdGlvbnMuYXJyYXlGaWx0ZXJzIE9wdGlvbmFsLiBVc2VkIGluIGNvbWJpbmF0aW9uIHdpdGggTW9uZ29EQiBbZmlsdGVyZWQgcG9zaXRpb25hbCBvcGVyYXRvcl0oaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL21hbnVhbC9yZWZlcmVuY2Uvb3BlcmF0b3IvdXBkYXRlL3Bvc2l0aW9uYWwtZmlsdGVyZWQvKSB0byBzcGVjaWZ5IHdoaWNoIGVsZW1lbnRzIHRvIG1vZGlmeSBpbiBhbiBhcnJheSBmaWVsZC5cbiAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICovXG4gICd1cGRhdGUnLFxuICAvKipcbiAgICogQHN1bW1hcnkgTW9kaWZ5IG9uZSBvciBtb3JlIGRvY3VtZW50cyBpbiB0aGUgY29sbGVjdGlvbiwgb3IgaW5zZXJ0IG9uZSBpZiBubyBtYXRjaGluZyBkb2N1bWVudHMgd2VyZSBmb3VuZC4gUmV0dXJucyBhbiBvYmplY3Qgd2l0aCBrZXlzIGBudW1iZXJBZmZlY3RlZGAgKHRoZSBudW1iZXIgb2YgZG9jdW1lbnRzIG1vZGlmaWVkKSAgYW5kIGBpbnNlcnRlZElkYCAodGhlIHVuaXF1ZSBfaWQgb2YgdGhlIGRvY3VtZW50IHRoYXQgd2FzIGluc2VydGVkLCBpZiBhbnkpLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1ldGhvZCB1cHNlcnRBc3luY1xuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtNb25nb1NlbGVjdG9yfSBzZWxlY3RvciBTcGVjaWZpZXMgd2hpY2ggZG9jdW1lbnRzIHRvIG1vZGlmeVxuICAgKiBAcGFyYW0ge01vbmdvTW9kaWZpZXJ9IG1vZGlmaWVyIFNwZWNpZmllcyBob3cgdG8gbW9kaWZ5IHRoZSBkb2N1bWVudHNcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMubXVsdGkgVHJ1ZSB0byBtb2RpZnkgYWxsIG1hdGNoaW5nIGRvY3VtZW50czsgZmFsc2UgdG8gb25seSBtb2RpZnkgb25lIG9mIHRoZSBtYXRjaGluZyBkb2N1bWVudHMgKHRoZSBkZWZhdWx0KS5cbiAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICovXG4gICd1cHNlcnQnLFxuXTtcblxuZXhwb3J0IGNvbnN0IEFTWU5DX0NVUlNPUl9NRVRIT0RTID0gW1xuICAvKipcbiAgICogQGRlcHJlY2F0ZWQgaW4gMi45XG4gICAqIEBzdW1tYXJ5IFJldHVybnMgdGhlIG51bWJlciBvZiBkb2N1bWVudHMgdGhhdCBtYXRjaCBhIHF1ZXJ5LiBUaGlzIG1ldGhvZCBpc1xuICAgKiAgICAgICAgICBbZGVwcmVjYXRlZCBzaW5jZSBNb25nb0RCIDQuMF0oaHR0cHM6Ly93d3cubW9uZ29kYi5jb20vZG9jcy92NC40L3JlZmVyZW5jZS9jb21tYW5kL2NvdW50Lyk7XG4gICAqICAgICAgICAgIHNlZSBgQ29sbGVjdGlvbi5jb3VudERvY3VtZW50c2AgYW5kXG4gICAqICAgICAgICAgIGBDb2xsZWN0aW9uLmVzdGltYXRlZERvY3VtZW50Q291bnRgIGZvciBhIHJlcGxhY2VtZW50LlxuICAgKiBAbWVtYmVyT2YgTW9uZ28uQ3Vyc29yXG4gICAqIEBtZXRob2QgIGNvdW50QXN5bmNcbiAgICogQGluc3RhbmNlXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICovXG4gICdjb3VudCcsXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBSZXR1cm4gYWxsIG1hdGNoaW5nIGRvY3VtZW50cyBhcyBhbiBBcnJheS5cbiAgICogQG1lbWJlck9mIE1vbmdvLkN1cnNvclxuICAgKiBAbWV0aG9kICBmZXRjaEFzeW5jXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAqL1xuICAnZmV0Y2gnLFxuICAvKipcbiAgICogQHN1bW1hcnkgQ2FsbCBgY2FsbGJhY2tgIG9uY2UgZm9yIGVhY2ggbWF0Y2hpbmcgZG9jdW1lbnQsIHNlcXVlbnRpYWxseSBhbmRcbiAgICogICAgICAgICAgc3luY2hyb25vdXNseS5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgIGZvckVhY2hBc3luY1xuICAgKiBAaW5zdGFuY2VcbiAgICogQG1lbWJlck9mIE1vbmdvLkN1cnNvclxuICAgKiBAcGFyYW0ge0l0ZXJhdGlvbkNhbGxiYWNrfSBjYWxsYmFjayBGdW5jdGlvbiB0byBjYWxsLiBJdCB3aWxsIGJlIGNhbGxlZFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aXRoIHRocmVlIGFyZ3VtZW50czogdGhlIGRvY3VtZW50LCBhXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDAtYmFzZWQgaW5kZXgsIGFuZCA8ZW0+Y3Vyc29yPC9lbT5cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRzZWxmLlxuICAgKiBAcGFyYW0ge0FueX0gW3RoaXNBcmddIEFuIG9iamVjdCB3aGljaCB3aWxsIGJlIHRoZSB2YWx1ZSBvZiBgdGhpc2AgaW5zaWRlXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgYGNhbGxiYWNrYC5cbiAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAqL1xuICAnZm9yRWFjaCcsXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBNYXAgY2FsbGJhY2sgb3ZlciBhbGwgbWF0Y2hpbmcgZG9jdW1lbnRzLiAgUmV0dXJucyBhbiBBcnJheS5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgbWFwQXN5bmNcbiAgICogQGluc3RhbmNlXG4gICAqIEBtZW1iZXJPZiBNb25nby5DdXJzb3JcbiAgICogQHBhcmFtIHtJdGVyYXRpb25DYWxsYmFja30gY2FsbGJhY2sgRnVuY3Rpb24gdG8gY2FsbC4gSXQgd2lsbCBiZSBjYWxsZWRcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2l0aCB0aHJlZSBhcmd1bWVudHM6IHRoZSBkb2N1bWVudCwgYVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAwLWJhc2VkIGluZGV4LCBhbmQgPGVtPmN1cnNvcjwvZW0+XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0c2VsZi5cbiAgICogQHBhcmFtIHtBbnl9IFt0aGlzQXJnXSBBbiBvYmplY3Qgd2hpY2ggd2lsbCBiZSB0aGUgdmFsdWUgb2YgYHRoaXNgIGluc2lkZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgIGBjYWxsYmFja2AuXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKi9cbiAgJ21hcCcsXG5dO1xuXG5leHBvcnQgY29uc3QgQ0xJRU5UX09OTFlfTUVUSE9EUyA9IFtcImZpbmRPbmVcIiwgXCJpbnNlcnRcIiwgXCJyZW1vdmVcIiwgXCJ1cGRhdGVcIiwgXCJ1cHNlcnRcIl07XG4iLCJpbXBvcnQgTG9jYWxDb2xsZWN0aW9uIGZyb20gJy4vbG9jYWxfY29sbGVjdGlvbi5qcyc7XG5pbXBvcnQgeyBoYXNPd24gfSBmcm9tICcuL2NvbW1vbi5qcyc7XG5pbXBvcnQgeyBBU1lOQ19DVVJTT1JfTUVUSE9EUywgZ2V0QXN5bmNNZXRob2ROYW1lIH0gZnJvbSAnLi9jb25zdGFudHMnO1xuXG4vLyBDdXJzb3I6IGEgc3BlY2lmaWNhdGlvbiBmb3IgYSBwYXJ0aWN1bGFyIHN1YnNldCBvZiBkb2N1bWVudHMsIHcvIGEgZGVmaW5lZFxuLy8gb3JkZXIsIGxpbWl0LCBhbmQgb2Zmc2V0LiAgY3JlYXRpbmcgYSBDdXJzb3Igd2l0aCBMb2NhbENvbGxlY3Rpb24uZmluZCgpLFxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ3Vyc29yIHtcbiAgLy8gZG9uJ3QgY2FsbCB0aGlzIGN0b3IgZGlyZWN0bHkuICB1c2UgTG9jYWxDb2xsZWN0aW9uLmZpbmQoKS5cbiAgY29uc3RydWN0b3IoY29sbGVjdGlvbiwgc2VsZWN0b3IsIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMuY29sbGVjdGlvbiA9IGNvbGxlY3Rpb247XG4gICAgdGhpcy5zb3J0ZXIgPSBudWxsO1xuICAgIHRoaXMubWF0Y2hlciA9IG5ldyBNaW5pbW9uZ28uTWF0Y2hlcihzZWxlY3Rvcik7XG5cbiAgICBpZiAoTG9jYWxDb2xsZWN0aW9uLl9zZWxlY3RvcklzSWRQZXJoYXBzQXNPYmplY3Qoc2VsZWN0b3IpKSB7XG4gICAgICAvLyBzdGFzaCBmb3IgZmFzdCBfaWQgYW5kIHsgX2lkIH1cbiAgICAgIHRoaXMuX3NlbGVjdG9ySWQgPSBoYXNPd24uY2FsbChzZWxlY3RvciwgJ19pZCcpID8gc2VsZWN0b3IuX2lkIDogc2VsZWN0b3I7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3NlbGVjdG9ySWQgPSB1bmRlZmluZWQ7XG5cbiAgICAgIGlmICh0aGlzLm1hdGNoZXIuaGFzR2VvUXVlcnkoKSB8fCBvcHRpb25zLnNvcnQpIHtcbiAgICAgICAgdGhpcy5zb3J0ZXIgPSBuZXcgTWluaW1vbmdvLlNvcnRlcihvcHRpb25zLnNvcnQgfHwgW10pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuc2tpcCA9IG9wdGlvbnMuc2tpcCB8fCAwO1xuICAgIHRoaXMubGltaXQgPSBvcHRpb25zLmxpbWl0O1xuICAgIHRoaXMuZmllbGRzID0gb3B0aW9ucy5wcm9qZWN0aW9uIHx8IG9wdGlvbnMuZmllbGRzO1xuXG4gICAgdGhpcy5fcHJvamVjdGlvbkZuID0gTG9jYWxDb2xsZWN0aW9uLl9jb21waWxlUHJvamVjdGlvbih0aGlzLmZpZWxkcyB8fCB7fSk7XG5cbiAgICB0aGlzLl90cmFuc2Zvcm0gPSBMb2NhbENvbGxlY3Rpb24ud3JhcFRyYW5zZm9ybShvcHRpb25zLnRyYW5zZm9ybSk7XG5cbiAgICAvLyBieSBkZWZhdWx0LCBxdWVyaWVzIHJlZ2lzdGVyIHcvIFRyYWNrZXIgd2hlbiBpdCBpcyBhdmFpbGFibGUuXG4gICAgaWYgKHR5cGVvZiBUcmFja2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgdGhpcy5yZWFjdGl2ZSA9IG9wdGlvbnMucmVhY3RpdmUgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBvcHRpb25zLnJlYWN0aXZlO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAZGVwcmVjYXRlZCBpbiAyLjlcbiAgICogQHN1bW1hcnkgUmV0dXJucyB0aGUgbnVtYmVyIG9mIGRvY3VtZW50cyB0aGF0IG1hdGNoIGEgcXVlcnkuIFRoaXMgbWV0aG9kIGlzXG4gICAqICAgICAgICAgIFtkZXByZWNhdGVkIHNpbmNlIE1vbmdvREIgNC4wXShodHRwczovL3d3dy5tb25nb2RiLmNvbS9kb2NzL3Y0LjQvcmVmZXJlbmNlL2NvbW1hbmQvY291bnQvKTtcbiAgICogICAgICAgICAgc2VlIGBDb2xsZWN0aW9uLmNvdW50RG9jdW1lbnRzYCBhbmRcbiAgICogICAgICAgICAgYENvbGxlY3Rpb24uZXN0aW1hdGVkRG9jdW1lbnRDb3VudGAgZm9yIGEgcmVwbGFjZW1lbnQuXG4gICAqIEBtZW1iZXJPZiBNb25nby5DdXJzb3JcbiAgICogQG1ldGhvZCAgY291bnRcbiAgICogQGluc3RhbmNlXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAcmV0dXJucyB7TnVtYmVyfVxuICAgKi9cbiAgY291bnQoKSB7XG4gICAgaWYgKHRoaXMucmVhY3RpdmUpIHtcbiAgICAgIC8vIGFsbG93IHRoZSBvYnNlcnZlIHRvIGJlIHVub3JkZXJlZFxuICAgICAgdGhpcy5fZGVwZW5kKHsgYWRkZWQ6IHRydWUsIHJlbW92ZWQ6IHRydWUgfSwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX2dldFJhd09iamVjdHMoe1xuICAgICAgb3JkZXJlZDogdHJ1ZSxcbiAgICB9KS5sZW5ndGg7XG4gIH1cblxuICAvKipcbiAgICogQHN1bW1hcnkgUmV0dXJuIGFsbCBtYXRjaGluZyBkb2N1bWVudHMgYXMgYW4gQXJyYXkuXG4gICAqIEBtZW1iZXJPZiBNb25nby5DdXJzb3JcbiAgICogQG1ldGhvZCAgZmV0Y2hcbiAgICogQGluc3RhbmNlXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAcmV0dXJucyB7T2JqZWN0W119XG4gICAqL1xuICBmZXRjaCgpIHtcbiAgICBjb25zdCByZXN1bHQgPSBbXTtcblxuICAgIHRoaXMuZm9yRWFjaChkb2MgPT4ge1xuICAgICAgcmVzdWx0LnB1c2goZG9jKTtcbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBbU3ltYm9sLml0ZXJhdG9yXSgpIHtcbiAgICBpZiAodGhpcy5yZWFjdGl2ZSkge1xuICAgICAgdGhpcy5fZGVwZW5kKHtcbiAgICAgICAgYWRkZWRCZWZvcmU6IHRydWUsXG4gICAgICAgIHJlbW92ZWQ6IHRydWUsXG4gICAgICAgIGNoYW5nZWQ6IHRydWUsXG4gICAgICAgIG1vdmVkQmVmb3JlOiB0cnVlLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgbGV0IGluZGV4ID0gMDtcbiAgICBjb25zdCBvYmplY3RzID0gdGhpcy5fZ2V0UmF3T2JqZWN0cyh7IG9yZGVyZWQ6IHRydWUgfSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmV4dDogKCkgPT4ge1xuICAgICAgICBpZiAoaW5kZXggPCBvYmplY3RzLmxlbmd0aCkge1xuICAgICAgICAgIC8vIFRoaXMgZG91YmxlcyBhcyBhIGNsb25lIG9wZXJhdGlvbi5cbiAgICAgICAgICBsZXQgZWxlbWVudCA9IHRoaXMuX3Byb2plY3Rpb25GbihvYmplY3RzW2luZGV4KytdKTtcblxuICAgICAgICAgIGlmICh0aGlzLl90cmFuc2Zvcm0pIGVsZW1lbnQgPSB0aGlzLl90cmFuc2Zvcm0oZWxlbWVudCk7XG5cbiAgICAgICAgICByZXR1cm4geyB2YWx1ZTogZWxlbWVudCB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHsgZG9uZTogdHJ1ZSB9O1xuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpIHtcbiAgICBjb25zdCBzeW5jUmVzdWx0ID0gdGhpc1tTeW1ib2wuaXRlcmF0b3JdKCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGFzeW5jIG5leHQoKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoc3luY1Jlc3VsdC5uZXh0KCkpO1xuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEBjYWxsYmFjayBJdGVyYXRpb25DYWxsYmFja1xuICAgKiBAcGFyYW0ge09iamVjdH0gZG9jXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBpbmRleFxuICAgKi9cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IENhbGwgYGNhbGxiYWNrYCBvbmNlIGZvciBlYWNoIG1hdGNoaW5nIGRvY3VtZW50LCBzZXF1ZW50aWFsbHkgYW5kXG4gICAqICAgICAgICAgIHN5bmNocm9ub3VzbHkuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWV0aG9kICBmb3JFYWNoXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAbWVtYmVyT2YgTW9uZ28uQ3Vyc29yXG4gICAqIEBwYXJhbSB7SXRlcmF0aW9uQ2FsbGJhY2t9IGNhbGxiYWNrIEZ1bmN0aW9uIHRvIGNhbGwuIEl0IHdpbGwgYmUgY2FsbGVkXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpdGggdGhyZWUgYXJndW1lbnRzOiB0aGUgZG9jdW1lbnQsIGFcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMC1iYXNlZCBpbmRleCwgYW5kIDxlbT5jdXJzb3I8L2VtPlxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdHNlbGYuXG4gICAqIEBwYXJhbSB7QW55fSBbdGhpc0FyZ10gQW4gb2JqZWN0IHdoaWNoIHdpbGwgYmUgdGhlIHZhbHVlIG9mIGB0aGlzYCBpbnNpZGVcbiAgICogICAgICAgICAgICAgICAgICAgICAgICBgY2FsbGJhY2tgLlxuICAgKi9cbiAgZm9yRWFjaChjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIGlmICh0aGlzLnJlYWN0aXZlKSB7XG4gICAgICB0aGlzLl9kZXBlbmQoe1xuICAgICAgICBhZGRlZEJlZm9yZTogdHJ1ZSxcbiAgICAgICAgcmVtb3ZlZDogdHJ1ZSxcbiAgICAgICAgY2hhbmdlZDogdHJ1ZSxcbiAgICAgICAgbW92ZWRCZWZvcmU6IHRydWUsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLl9nZXRSYXdPYmplY3RzKHsgb3JkZXJlZDogdHJ1ZSB9KS5mb3JFYWNoKChlbGVtZW50LCBpKSA9PiB7XG4gICAgICAvLyBUaGlzIGRvdWJsZXMgYXMgYSBjbG9uZSBvcGVyYXRpb24uXG4gICAgICBlbGVtZW50ID0gdGhpcy5fcHJvamVjdGlvbkZuKGVsZW1lbnQpO1xuXG4gICAgICBpZiAodGhpcy5fdHJhbnNmb3JtKSB7XG4gICAgICAgIGVsZW1lbnQgPSB0aGlzLl90cmFuc2Zvcm0oZWxlbWVudCk7XG4gICAgICB9XG5cbiAgICAgIGNhbGxiYWNrLmNhbGwodGhpc0FyZywgZWxlbWVudCwgaSwgdGhpcyk7XG4gICAgfSk7XG4gIH1cblxuICBnZXRUcmFuc2Zvcm0oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3RyYW5zZm9ybTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBNYXAgY2FsbGJhY2sgb3ZlciBhbGwgbWF0Y2hpbmcgZG9jdW1lbnRzLiAgUmV0dXJucyBhbiBBcnJheS5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgbWFwXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAbWVtYmVyT2YgTW9uZ28uQ3Vyc29yXG4gICAqIEBwYXJhbSB7SXRlcmF0aW9uQ2FsbGJhY2t9IGNhbGxiYWNrIEZ1bmN0aW9uIHRvIGNhbGwuIEl0IHdpbGwgYmUgY2FsbGVkXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpdGggdGhyZWUgYXJndW1lbnRzOiB0aGUgZG9jdW1lbnQsIGFcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMC1iYXNlZCBpbmRleCwgYW5kIDxlbT5jdXJzb3I8L2VtPlxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdHNlbGYuXG4gICAqIEBwYXJhbSB7QW55fSBbdGhpc0FyZ10gQW4gb2JqZWN0IHdoaWNoIHdpbGwgYmUgdGhlIHZhbHVlIG9mIGB0aGlzYCBpbnNpZGVcbiAgICogICAgICAgICAgICAgICAgICAgICAgICBgY2FsbGJhY2tgLlxuICAgKi9cbiAgbWFwKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgY29uc3QgcmVzdWx0ID0gW107XG5cbiAgICB0aGlzLmZvckVhY2goKGRvYywgaSkgPT4ge1xuICAgICAgcmVzdWx0LnB1c2goY2FsbGJhY2suY2FsbCh0aGlzQXJnLCBkb2MsIGksIHRoaXMpKTtcbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvLyBvcHRpb25zIHRvIGNvbnRhaW46XG4gIC8vICAqIGNhbGxiYWNrcyBmb3Igb2JzZXJ2ZSgpOlxuICAvLyAgICAtIGFkZGVkQXQgKGRvY3VtZW50LCBhdEluZGV4KVxuICAvLyAgICAtIGFkZGVkIChkb2N1bWVudClcbiAgLy8gICAgLSBjaGFuZ2VkQXQgKG5ld0RvY3VtZW50LCBvbGREb2N1bWVudCwgYXRJbmRleClcbiAgLy8gICAgLSBjaGFuZ2VkIChuZXdEb2N1bWVudCwgb2xkRG9jdW1lbnQpXG4gIC8vICAgIC0gcmVtb3ZlZEF0IChkb2N1bWVudCwgYXRJbmRleClcbiAgLy8gICAgLSByZW1vdmVkIChkb2N1bWVudClcbiAgLy8gICAgLSBtb3ZlZFRvIChkb2N1bWVudCwgb2xkSW5kZXgsIG5ld0luZGV4KVxuICAvL1xuICAvLyBhdHRyaWJ1dGVzIGF2YWlsYWJsZSBvbiByZXR1cm5lZCBxdWVyeSBoYW5kbGU6XG4gIC8vICAqIHN0b3AoKTogZW5kIHVwZGF0ZXNcbiAgLy8gICogY29sbGVjdGlvbjogdGhlIGNvbGxlY3Rpb24gdGhpcyBxdWVyeSBpcyBxdWVyeWluZ1xuICAvL1xuICAvLyBpZmYgeCBpcyBhIHJldHVybmVkIHF1ZXJ5IGhhbmRsZSwgKHggaW5zdGFuY2VvZlxuICAvLyBMb2NhbENvbGxlY3Rpb24uT2JzZXJ2ZUhhbmRsZSkgaXMgdHJ1ZVxuICAvL1xuICAvLyBpbml0aWFsIHJlc3VsdHMgZGVsaXZlcmVkIHRocm91Z2ggYWRkZWQgY2FsbGJhY2tcbiAgLy8gWFhYIG1heWJlIGNhbGxiYWNrcyBzaG91bGQgdGFrZSBhIGxpc3Qgb2Ygb2JqZWN0cywgdG8gZXhwb3NlIHRyYW5zYWN0aW9ucz9cbiAgLy8gWFhYIG1heWJlIHN1cHBvcnQgZmllbGQgbGltaXRpbmcgKHRvIGxpbWl0IHdoYXQgeW91J3JlIG5vdGlmaWVkIG9uKVxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBXYXRjaCBhIHF1ZXJ5LiAgUmVjZWl2ZSBjYWxsYmFja3MgYXMgdGhlIHJlc3VsdCBzZXQgY2hhbmdlcy5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBNb25nby5DdXJzb3JcbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBjYWxsYmFja3MgRnVuY3Rpb25zIHRvIGNhbGwgdG8gZGVsaXZlciB0aGUgcmVzdWx0IHNldCBhcyBpdFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYW5nZXNcbiAgICovXG4gIG9ic2VydmUob3B0aW9ucykge1xuICAgIHJldHVybiBMb2NhbENvbGxlY3Rpb24uX29ic2VydmVGcm9tT2JzZXJ2ZUNoYW5nZXModGhpcywgb3B0aW9ucyk7XG4gIH1cblxuICAvKipcbiAgICogQHN1bW1hcnkgV2F0Y2ggYSBxdWVyeS4gIFJlY2VpdmUgY2FsbGJhY2tzIGFzIHRoZSByZXN1bHQgc2V0IGNoYW5nZXMuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgTW9uZ28uQ3Vyc29yXG4gICAqIEBpbnN0YW5jZVxuICAgKi9cbiAgb2JzZXJ2ZUFzeW5jKG9wdGlvbnMpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiByZXNvbHZlKHRoaXMub2JzZXJ2ZShvcHRpb25zKSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFdhdGNoIGEgcXVlcnkuIFJlY2VpdmUgY2FsbGJhY2tzIGFzIHRoZSByZXN1bHQgc2V0IGNoYW5nZXMuIE9ubHlcbiAgICogICAgICAgICAgdGhlIGRpZmZlcmVuY2VzIGJldHdlZW4gdGhlIG9sZCBhbmQgbmV3IGRvY3VtZW50cyBhcmUgcGFzc2VkIHRvXG4gICAqICAgICAgICAgIHRoZSBjYWxsYmFja3MuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgTW9uZ28uQ3Vyc29yXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge09iamVjdH0gY2FsbGJhY2tzIEZ1bmN0aW9ucyB0byBjYWxsIHRvIGRlbGl2ZXIgdGhlIHJlc3VsdCBzZXQgYXMgaXRcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFuZ2VzXG4gICAqL1xuICBvYnNlcnZlQ2hhbmdlcyhvcHRpb25zKSB7XG4gICAgY29uc3Qgb3JkZXJlZCA9IExvY2FsQ29sbGVjdGlvbi5fb2JzZXJ2ZUNoYW5nZXNDYWxsYmFja3NBcmVPcmRlcmVkKG9wdGlvbnMpO1xuXG4gICAgLy8gdGhlcmUgYXJlIHNldmVyYWwgcGxhY2VzIHRoYXQgYXNzdW1lIHlvdSBhcmVuJ3QgY29tYmluaW5nIHNraXAvbGltaXQgd2l0aFxuICAgIC8vIHVub3JkZXJlZCBvYnNlcnZlLiAgZWcsIHVwZGF0ZSdzIEVKU09OLmNsb25lLCBhbmQgdGhlIFwidGhlcmUgYXJlIHNldmVyYWxcIlxuICAgIC8vIGNvbW1lbnQgaW4gX21vZGlmeUFuZE5vdGlmeVxuICAgIC8vIFhYWCBhbGxvdyBza2lwL2xpbWl0IHdpdGggdW5vcmRlcmVkIG9ic2VydmVcbiAgICBpZiAoIW9wdGlvbnMuX2FsbG93X3Vub3JkZXJlZCAmJiAhb3JkZXJlZCAmJiAodGhpcy5za2lwIHx8IHRoaXMubGltaXQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIFwiTXVzdCB1c2UgYW4gb3JkZXJlZCBvYnNlcnZlIHdpdGggc2tpcCBvciBsaW1pdCAoaS5lLiAnYWRkZWRCZWZvcmUnIFwiICtcbiAgICAgICAgICBcImZvciBvYnNlcnZlQ2hhbmdlcyBvciAnYWRkZWRBdCcgZm9yIG9ic2VydmUsIGluc3RlYWQgb2YgJ2FkZGVkJykuXCJcbiAgICAgICk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZmllbGRzICYmICh0aGlzLmZpZWxkcy5faWQgPT09IDAgfHwgdGhpcy5maWVsZHMuX2lkID09PSBmYWxzZSkpIHtcbiAgICAgIHRocm93IEVycm9yKFwiWW91IG1heSBub3Qgb2JzZXJ2ZSBhIGN1cnNvciB3aXRoIHtmaWVsZHM6IHtfaWQ6IDB9fVwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBkaXN0YW5jZXMgPVxuICAgICAgdGhpcy5tYXRjaGVyLmhhc0dlb1F1ZXJ5KCkgJiYgb3JkZXJlZCAmJiBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcCgpO1xuXG4gICAgY29uc3QgcXVlcnkgPSB7XG4gICAgICBjdXJzb3I6IHRoaXMsXG4gICAgICBkaXJ0eTogZmFsc2UsXG4gICAgICBkaXN0YW5jZXMsXG4gICAgICBtYXRjaGVyOiB0aGlzLm1hdGNoZXIsIC8vIG5vdCBmYXN0IHBhdGhlZFxuICAgICAgb3JkZXJlZCxcbiAgICAgIHByb2plY3Rpb25GbjogdGhpcy5fcHJvamVjdGlvbkZuLFxuICAgICAgcmVzdWx0c1NuYXBzaG90OiBudWxsLFxuICAgICAgc29ydGVyOiBvcmRlcmVkICYmIHRoaXMuc29ydGVyLFxuICAgIH07XG5cbiAgICBsZXQgcWlkO1xuXG4gICAgLy8gTm9uLXJlYWN0aXZlIHF1ZXJpZXMgY2FsbCBhZGRlZFtCZWZvcmVdIGFuZCB0aGVuIG5ldmVyIGNhbGwgYW55dGhpbmdcbiAgICAvLyBlbHNlLlxuICAgIGlmICh0aGlzLnJlYWN0aXZlKSB7XG4gICAgICBxaWQgPSB0aGlzLmNvbGxlY3Rpb24ubmV4dF9xaWQrKztcbiAgICAgIHRoaXMuY29sbGVjdGlvbi5xdWVyaWVzW3FpZF0gPSBxdWVyeTtcbiAgICB9XG5cbiAgICBxdWVyeS5yZXN1bHRzID0gdGhpcy5fZ2V0UmF3T2JqZWN0cyh7XG4gICAgICBvcmRlcmVkLFxuICAgICAgZGlzdGFuY2VzOiBxdWVyeS5kaXN0YW5jZXMsXG4gICAgfSk7XG5cbiAgICBpZiAodGhpcy5jb2xsZWN0aW9uLnBhdXNlZCkge1xuICAgICAgcXVlcnkucmVzdWx0c1NuYXBzaG90ID0gb3JkZXJlZCA/IFtdIDogbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXAoKTtcbiAgICB9XG5cbiAgICAvLyB3cmFwIGNhbGxiYWNrcyB3ZSB3ZXJlIHBhc3NlZC4gY2FsbGJhY2tzIG9ubHkgZmlyZSB3aGVuIG5vdCBwYXVzZWQgYW5kXG4gICAgLy8gYXJlIG5ldmVyIHVuZGVmaW5lZFxuICAgIC8vIEZpbHRlcnMgb3V0IGJsYWNrbGlzdGVkIGZpZWxkcyBhY2NvcmRpbmcgdG8gY3Vyc29yJ3MgcHJvamVjdGlvbi5cbiAgICAvLyBYWFggd3JvbmcgcGxhY2UgZm9yIHRoaXM/XG5cbiAgICAvLyBmdXJ0aGVybW9yZSwgY2FsbGJhY2tzIGVucXVldWUgdW50aWwgdGhlIG9wZXJhdGlvbiB3ZSdyZSB3b3JraW5nIG9uIGlzXG4gICAgLy8gZG9uZS5cbiAgICBjb25zdCB3cmFwQ2FsbGJhY2sgPSAoZm4pID0+IHtcbiAgICAgIGlmICghZm4pIHtcbiAgICAgICAgcmV0dXJuICgpID0+IHt9O1xuICAgICAgfVxuXG4gICAgICBjb25zdCBzZWxmID0gdGhpcztcblxuICAgICAgcmV0dXJuIGZ1bmN0aW9uICgvKiBhcmdzKi8pIHtcbiAgICAgICAgaWYgKHNlbGYuY29sbGVjdGlvbi5wYXVzZWQpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBhcmdzID0gYXJndW1lbnRzO1xuXG4gICAgICAgIHNlbGYuY29sbGVjdGlvbi5fb2JzZXJ2ZVF1ZXVlLnF1ZXVlVGFzaygoKSA9PiB7XG4gICAgICAgICAgZm4uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICB9O1xuXG4gICAgcXVlcnkuYWRkZWQgPSB3cmFwQ2FsbGJhY2sob3B0aW9ucy5hZGRlZCk7XG4gICAgcXVlcnkuY2hhbmdlZCA9IHdyYXBDYWxsYmFjayhvcHRpb25zLmNoYW5nZWQpO1xuICAgIHF1ZXJ5LnJlbW92ZWQgPSB3cmFwQ2FsbGJhY2sob3B0aW9ucy5yZW1vdmVkKTtcblxuICAgIGlmIChvcmRlcmVkKSB7XG4gICAgICBxdWVyeS5hZGRlZEJlZm9yZSA9IHdyYXBDYWxsYmFjayhvcHRpb25zLmFkZGVkQmVmb3JlKTtcbiAgICAgIHF1ZXJ5Lm1vdmVkQmVmb3JlID0gd3JhcENhbGxiYWNrKG9wdGlvbnMubW92ZWRCZWZvcmUpO1xuICAgIH1cblxuICAgIGlmICghb3B0aW9ucy5fc3VwcHJlc3NfaW5pdGlhbCAmJiAhdGhpcy5jb2xsZWN0aW9uLnBhdXNlZCkge1xuICAgICAgY29uc3QgaGFuZGxlciA9IChkb2MpID0+IHtcbiAgICAgICAgY29uc3QgZmllbGRzID0gRUpTT04uY2xvbmUoZG9jKTtcblxuICAgICAgICBkZWxldGUgZmllbGRzLl9pZDtcblxuICAgICAgICBpZiAob3JkZXJlZCkge1xuICAgICAgICAgIHF1ZXJ5LmFkZGVkQmVmb3JlKGRvYy5faWQsIHRoaXMuX3Byb2plY3Rpb25GbihmaWVsZHMpLCBudWxsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHF1ZXJ5LmFkZGVkKGRvYy5faWQsIHRoaXMuX3Byb2plY3Rpb25GbihmaWVsZHMpKTtcbiAgICAgIH07XG4gICAgICAvLyBpdCBtZWFucyBpdCdzIGp1c3QgYW4gYXJyYXlcbiAgICAgIGlmIChxdWVyeS5yZXN1bHRzLmxlbmd0aCkge1xuICAgICAgICBmb3IgKGNvbnN0IGRvYyBvZiBxdWVyeS5yZXN1bHRzKSB7XG4gICAgICAgICAgaGFuZGxlcihkb2MpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBpdCBtZWFucyBpdCdzIGFuIGlkIG1hcFxuICAgICAgaWYgKHF1ZXJ5LnJlc3VsdHM/LnNpemU/LigpKSB7XG4gICAgICAgIHF1ZXJ5LnJlc3VsdHMuZm9yRWFjaChoYW5kbGVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBoYW5kbGUgPSBPYmplY3QuYXNzaWduKG5ldyBMb2NhbENvbGxlY3Rpb24uT2JzZXJ2ZUhhbmRsZSgpLCB7XG4gICAgICBjb2xsZWN0aW9uOiB0aGlzLmNvbGxlY3Rpb24sXG4gICAgICBzdG9wOiAoKSA9PiB7XG4gICAgICAgIGlmICh0aGlzLnJlYWN0aXZlKSB7XG4gICAgICAgICAgZGVsZXRlIHRoaXMuY29sbGVjdGlvbi5xdWVyaWVzW3FpZF07XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBpc1JlYWR5OiBmYWxzZSxcbiAgICAgIGlzUmVhZHlQcm9taXNlOiBudWxsLFxuICAgIH0pO1xuXG4gICAgaWYgKHRoaXMucmVhY3RpdmUgJiYgVHJhY2tlci5hY3RpdmUpIHtcbiAgICAgIC8vIFhYWCBpbiBtYW55IGNhc2VzLCB0aGUgc2FtZSBvYnNlcnZlIHdpbGwgYmUgcmVjcmVhdGVkIHdoZW5cbiAgICAgIC8vIHRoZSBjdXJyZW50IGF1dG9ydW4gaXMgcmVydW4uICB3ZSBjb3VsZCBzYXZlIHdvcmsgYnlcbiAgICAgIC8vIGxldHRpbmcgaXQgbGluZ2VyIGFjcm9zcyByZXJ1biBhbmQgcG90ZW50aWFsbHkgZ2V0XG4gICAgICAvLyByZXB1cnBvc2VkIGlmIHRoZSBzYW1lIG9ic2VydmUgaXMgcGVyZm9ybWVkLCB1c2luZyBsb2dpY1xuICAgICAgLy8gc2ltaWxhciB0byB0aGF0IG9mIE1ldGVvci5zdWJzY3JpYmUuXG4gICAgICBUcmFja2VyLm9uSW52YWxpZGF0ZSgoKSA9PiB7XG4gICAgICAgIGhhbmRsZS5zdG9wKCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBydW4gdGhlIG9ic2VydmUgY2FsbGJhY2tzIHJlc3VsdGluZyBmcm9tIHRoZSBpbml0aWFsIGNvbnRlbnRzXG4gICAgLy8gYmVmb3JlIHdlIGxlYXZlIHRoZSBvYnNlcnZlLlxuICAgIGNvbnN0IGRyYWluUmVzdWx0ID0gdGhpcy5jb2xsZWN0aW9uLl9vYnNlcnZlUXVldWUuZHJhaW4oKTtcblxuICAgIGlmIChkcmFpblJlc3VsdCBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgIGhhbmRsZS5pc1JlYWR5UHJvbWlzZSA9IGRyYWluUmVzdWx0O1xuICAgICAgZHJhaW5SZXN1bHQudGhlbigoKSA9PiAoaGFuZGxlLmlzUmVhZHkgPSB0cnVlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGhhbmRsZS5pc1JlYWR5ID0gdHJ1ZTtcbiAgICAgIGhhbmRsZS5pc1JlYWR5UHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cblxuICAgIHJldHVybiBoYW5kbGU7XG4gIH1cblxuICAvKipcbiAgICogQHN1bW1hcnkgV2F0Y2ggYSBxdWVyeS4gUmVjZWl2ZSBjYWxsYmFja3MgYXMgdGhlIHJlc3VsdCBzZXQgY2hhbmdlcy4gT25seVxuICAgKiAgICAgICAgICB0aGUgZGlmZmVyZW5jZXMgYmV0d2VlbiB0aGUgb2xkIGFuZCBuZXcgZG9jdW1lbnRzIGFyZSBwYXNzZWQgdG9cbiAgICogICAgICAgICAgdGhlIGNhbGxiYWNrcy5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBNb25nby5DdXJzb3JcbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBjYWxsYmFja3MgRnVuY3Rpb25zIHRvIGNhbGwgdG8gZGVsaXZlciB0aGUgcmVzdWx0IHNldCBhcyBpdFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYW5nZXNcbiAgICovXG4gIG9ic2VydmVDaGFuZ2VzQXN5bmMob3B0aW9ucykge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgY29uc3QgaGFuZGxlID0gdGhpcy5vYnNlcnZlQ2hhbmdlcyhvcHRpb25zKTtcbiAgICAgIGhhbmRsZS5pc1JlYWR5UHJvbWlzZS50aGVuKCgpID0+IHJlc29sdmUoaGFuZGxlKSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBYWFggTWF5YmUgd2UgbmVlZCBhIHZlcnNpb24gb2Ygb2JzZXJ2ZSB0aGF0IGp1c3QgY2FsbHMgYSBjYWxsYmFjayBpZlxuICAvLyBhbnl0aGluZyBjaGFuZ2VkLlxuICBfZGVwZW5kKGNoYW5nZXJzLCBfYWxsb3dfdW5vcmRlcmVkKSB7XG4gICAgaWYgKFRyYWNrZXIuYWN0aXZlKSB7XG4gICAgICBjb25zdCBkZXBlbmRlbmN5ID0gbmV3IFRyYWNrZXIuRGVwZW5kZW5jeSgpO1xuICAgICAgY29uc3Qgbm90aWZ5ID0gZGVwZW5kZW5jeS5jaGFuZ2VkLmJpbmQoZGVwZW5kZW5jeSk7XG5cbiAgICAgIGRlcGVuZGVuY3kuZGVwZW5kKCk7XG5cbiAgICAgIGNvbnN0IG9wdGlvbnMgPSB7IF9hbGxvd191bm9yZGVyZWQsIF9zdXBwcmVzc19pbml0aWFsOiB0cnVlIH07XG5cbiAgICAgIFsnYWRkZWQnLCAnYWRkZWRCZWZvcmUnLCAnY2hhbmdlZCcsICdtb3ZlZEJlZm9yZScsICdyZW1vdmVkJ10uZm9yRWFjaChcbiAgICAgICAgZm4gPT4ge1xuICAgICAgICAgIGlmIChjaGFuZ2Vyc1tmbl0pIHtcbiAgICAgICAgICAgIG9wdGlvbnNbZm5dID0gbm90aWZ5O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgKTtcblxuICAgICAgLy8gb2JzZXJ2ZUNoYW5nZXMgd2lsbCBzdG9wKCkgd2hlbiB0aGlzIGNvbXB1dGF0aW9uIGlzIGludmFsaWRhdGVkXG4gICAgICB0aGlzLm9ic2VydmVDaGFuZ2VzKG9wdGlvbnMpO1xuICAgIH1cbiAgfVxuXG4gIF9nZXRDb2xsZWN0aW9uTmFtZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jb2xsZWN0aW9uLm5hbWU7XG4gIH1cblxuICAvLyBSZXR1cm5zIGEgY29sbGVjdGlvbiBvZiBtYXRjaGluZyBvYmplY3RzLCBidXQgZG9lc24ndCBkZWVwIGNvcHkgdGhlbS5cbiAgLy9cbiAgLy8gSWYgb3JkZXJlZCBpcyBzZXQsIHJldHVybnMgYSBzb3J0ZWQgYXJyYXksIHJlc3BlY3Rpbmcgc29ydGVyLCBza2lwLCBhbmRcbiAgLy8gbGltaXQgcHJvcGVydGllcyBvZiB0aGUgcXVlcnkgcHJvdmlkZWQgdGhhdCBvcHRpb25zLmFwcGx5U2tpcExpbWl0IGlzXG4gIC8vIG5vdCBzZXQgdG8gZmFsc2UgKCMxMjAxKS4gSWYgc29ydGVyIGlzIGZhbHNleSwgbm8gc29ydCAtLSB5b3UgZ2V0IHRoZVxuICAvLyBuYXR1cmFsIG9yZGVyLlxuICAvL1xuICAvLyBJZiBvcmRlcmVkIGlzIG5vdCBzZXQsIHJldHVybnMgYW4gb2JqZWN0IG1hcHBpbmcgZnJvbSBJRCB0byBkb2MgKHNvcnRlcixcbiAgLy8gc2tpcCBhbmQgbGltaXQgc2hvdWxkIG5vdCBiZSBzZXQpLlxuICAvL1xuICAvLyBJZiBvcmRlcmVkIGlzIHNldCBhbmQgdGhpcyBjdXJzb3IgaXMgYSAkbmVhciBnZW9xdWVyeSwgdGhlbiB0aGlzIGZ1bmN0aW9uXG4gIC8vIHdpbGwgdXNlIGFuIF9JZE1hcCB0byB0cmFjayBlYWNoIGRpc3RhbmNlIGZyb20gdGhlICRuZWFyIGFyZ3VtZW50IHBvaW50IGluXG4gIC8vIG9yZGVyIHRvIHVzZSBpdCBhcyBhIHNvcnQga2V5LiBJZiBhbiBfSWRNYXAgaXMgcGFzc2VkIGluIHRoZSAnZGlzdGFuY2VzJ1xuICAvLyBhcmd1bWVudCwgdGhpcyBmdW5jdGlvbiB3aWxsIGNsZWFyIGl0IGFuZCB1c2UgaXQgZm9yIHRoaXMgcHVycG9zZVxuICAvLyAob3RoZXJ3aXNlIGl0IHdpbGwganVzdCBjcmVhdGUgaXRzIG93biBfSWRNYXApLiBUaGUgb2JzZXJ2ZUNoYW5nZXNcbiAgLy8gaW1wbGVtZW50YXRpb24gdXNlcyB0aGlzIHRvIHJlbWVtYmVyIHRoZSBkaXN0YW5jZXMgYWZ0ZXIgdGhpcyBmdW5jdGlvblxuICAvLyByZXR1cm5zLlxuICBfZ2V0UmF3T2JqZWN0cyhvcHRpb25zID0ge30pIHtcbiAgICAvLyBCeSBkZWZhdWx0IHRoaXMgbWV0aG9kIHdpbGwgcmVzcGVjdCBza2lwIGFuZCBsaW1pdCBiZWNhdXNlIC5mZXRjaCgpLFxuICAgIC8vIC5mb3JFYWNoKCkgZXRjLi4uIGV4cGVjdCB0aGlzIGJlaGF2aW91ci4gSXQgY2FuIGJlIGZvcmNlZCB0byBpZ25vcmVcbiAgICAvLyBza2lwIGFuZCBsaW1pdCBieSBzZXR0aW5nIGFwcGx5U2tpcExpbWl0IHRvIGZhbHNlICguY291bnQoKSBkb2VzIHRoaXMsXG4gICAgLy8gZm9yIGV4YW1wbGUpXG4gICAgY29uc3QgYXBwbHlTa2lwTGltaXQgPSBvcHRpb25zLmFwcGx5U2tpcExpbWl0ICE9PSBmYWxzZTtcblxuICAgIC8vIFhYWCB1c2UgT3JkZXJlZERpY3QgaW5zdGVhZCBvZiBhcnJheSwgYW5kIG1ha2UgSWRNYXAgYW5kIE9yZGVyZWREaWN0XG4gICAgLy8gY29tcGF0aWJsZVxuICAgIGNvbnN0IHJlc3VsdHMgPSBvcHRpb25zLm9yZGVyZWQgPyBbXSA6IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwKCk7XG5cbiAgICAvLyBmYXN0IHBhdGggZm9yIHNpbmdsZSBJRCB2YWx1ZVxuICAgIGlmICh0aGlzLl9zZWxlY3RvcklkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIElmIHlvdSBoYXZlIG5vbi16ZXJvIHNraXAgYW5kIGFzayBmb3IgYSBzaW5nbGUgaWQsIHlvdSBnZXQgbm90aGluZy5cbiAgICAgIC8vIFRoaXMgaXMgc28gaXQgbWF0Y2hlcyB0aGUgYmVoYXZpb3Igb2YgdGhlICd7X2lkOiBmb299JyBwYXRoLlxuICAgICAgaWYgKGFwcGx5U2tpcExpbWl0ICYmIHRoaXMuc2tpcCkge1xuICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgIH1cblxuICAgICAgY29uc3Qgc2VsZWN0ZWREb2MgPSB0aGlzLmNvbGxlY3Rpb24uX2RvY3MuZ2V0KHRoaXMuX3NlbGVjdG9ySWQpO1xuICAgICAgaWYgKHNlbGVjdGVkRG9jKSB7XG4gICAgICAgIGlmIChvcHRpb25zLm9yZGVyZWQpIHtcbiAgICAgICAgICByZXN1bHRzLnB1c2goc2VsZWN0ZWREb2MpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdHMuc2V0KHRoaXMuX3NlbGVjdG9ySWQsIHNlbGVjdGVkRG9jKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgfVxuXG4gICAgLy8gc2xvdyBwYXRoIGZvciBhcmJpdHJhcnkgc2VsZWN0b3IsIHNvcnQsIHNraXAsIGxpbWl0XG5cbiAgICAvLyBpbiB0aGUgb2JzZXJ2ZUNoYW5nZXMgY2FzZSwgZGlzdGFuY2VzIGlzIGFjdHVhbGx5IHBhcnQgb2YgdGhlIFwicXVlcnlcIlxuICAgIC8vIChpZSwgbGl2ZSByZXN1bHRzIHNldCkgb2JqZWN0LiAgaW4gb3RoZXIgY2FzZXMsIGRpc3RhbmNlcyBpcyBvbmx5IHVzZWRcbiAgICAvLyBpbnNpZGUgdGhpcyBmdW5jdGlvbi5cbiAgICBsZXQgZGlzdGFuY2VzO1xuICAgIGlmICh0aGlzLm1hdGNoZXIuaGFzR2VvUXVlcnkoKSAmJiBvcHRpb25zLm9yZGVyZWQpIHtcbiAgICAgIGlmIChvcHRpb25zLmRpc3RhbmNlcykge1xuICAgICAgICBkaXN0YW5jZXMgPSBvcHRpb25zLmRpc3RhbmNlcztcbiAgICAgICAgZGlzdGFuY2VzLmNsZWFyKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkaXN0YW5jZXMgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIE1ldGVvci5fcnVuRnJlc2goKCkgPT4ge1xuICAgICAgdGhpcy5jb2xsZWN0aW9uLl9kb2NzLmZvckVhY2goKGRvYywgaWQpID0+IHtcbiAgICAgICAgY29uc3QgbWF0Y2hSZXN1bHQgPSB0aGlzLm1hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKGRvYyk7XG4gICAgICAgIGlmIChtYXRjaFJlc3VsdC5yZXN1bHQpIHtcbiAgICAgICAgICBpZiAob3B0aW9ucy5vcmRlcmVkKSB7XG4gICAgICAgICAgICByZXN1bHRzLnB1c2goZG9jKTtcblxuICAgICAgICAgICAgaWYgKGRpc3RhbmNlcyAmJiBtYXRjaFJlc3VsdC5kaXN0YW5jZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIGRpc3RhbmNlcy5zZXQoaWQsIG1hdGNoUmVzdWx0LmRpc3RhbmNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0cy5zZXQoaWQsIGRvYyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gT3ZlcnJpZGUgdG8gZW5zdXJlIGFsbCBkb2NzIGFyZSBtYXRjaGVkIGlmIGlnbm9yaW5nIHNraXAgJiBsaW1pdFxuICAgICAgICBpZiAoIWFwcGx5U2tpcExpbWl0KSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGYXN0IHBhdGggZm9yIGxpbWl0ZWQgdW5zb3J0ZWQgcXVlcmllcy5cbiAgICAgICAgLy8gWFhYICdsZW5ndGgnIGNoZWNrIGhlcmUgc2VlbXMgd3JvbmcgZm9yIG9yZGVyZWRcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAhdGhpcy5saW1pdCB8fCB0aGlzLnNraXAgfHwgdGhpcy5zb3J0ZXIgfHwgcmVzdWx0cy5sZW5ndGggIT09IHRoaXMubGltaXRcbiAgICAgICAgKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgaWYgKCFvcHRpb25zLm9yZGVyZWQpIHtcbiAgICAgIHJldHVybiByZXN1bHRzO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnNvcnRlcikge1xuICAgICAgcmVzdWx0cy5zb3J0KHRoaXMuc29ydGVyLmdldENvbXBhcmF0b3IoeyBkaXN0YW5jZXMgfSkpO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB0aGUgZnVsbCBzZXQgb2YgcmVzdWx0cyBpZiB0aGVyZSBpcyBubyBza2lwIG9yIGxpbWl0IG9yIGlmIHdlJ3JlXG4gICAgLy8gaWdub3JpbmcgdGhlbVxuICAgIGlmICghYXBwbHlTa2lwTGltaXQgfHwgKCF0aGlzLmxpbWl0ICYmICF0aGlzLnNraXApKSB7XG4gICAgICByZXR1cm4gcmVzdWx0cztcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0cy5zbGljZShcbiAgICAgIHRoaXMuc2tpcCxcbiAgICAgIHRoaXMubGltaXQgPyB0aGlzLmxpbWl0ICsgdGhpcy5za2lwIDogcmVzdWx0cy5sZW5ndGhcbiAgICApO1xuICB9XG5cbiAgX3B1Ymxpc2hDdXJzb3Ioc3Vic2NyaXB0aW9uKSB7XG4gICAgLy8gWFhYIG1pbmltb25nbyBzaG91bGQgbm90IGRlcGVuZCBvbiBtb25nby1saXZlZGF0YSFcbiAgICBpZiAoIVBhY2thZ2UubW9uZ28pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgXCJDYW4ndCBwdWJsaXNoIGZyb20gTWluaW1vbmdvIHdpdGhvdXQgdGhlIGBtb25nb2AgcGFja2FnZS5cIlxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuY29sbGVjdGlvbi5uYW1lKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIFwiQ2FuJ3QgcHVibGlzaCBhIGN1cnNvciBmcm9tIGEgY29sbGVjdGlvbiB3aXRob3V0IGEgbmFtZS5cIlxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gUGFja2FnZS5tb25nby5Nb25nby5Db2xsZWN0aW9uLl9wdWJsaXNoQ3Vyc29yKFxuICAgICAgdGhpcyxcbiAgICAgIHN1YnNjcmlwdGlvbixcbiAgICAgIHRoaXMuY29sbGVjdGlvbi5uYW1lXG4gICAgKTtcbiAgfVxufVxuXG4vLyBJbXBsZW1lbnRzIGFzeW5jIHZlcnNpb24gb2YgY3Vyc29yIG1ldGhvZHMgdG8ga2VlcCBjb2xsZWN0aW9ucyBpc29tb3JwaGljXG5BU1lOQ19DVVJTT1JfTUVUSE9EUy5mb3JFYWNoKG1ldGhvZCA9PiB7XG4gIGNvbnN0IGFzeW5jTmFtZSA9IGdldEFzeW5jTWV0aG9kTmFtZShtZXRob2QpO1xuICBDdXJzb3IucHJvdG90eXBlW2FzeW5jTmFtZV0gPSBmdW5jdGlvbiguLi5hcmdzKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpc1ttZXRob2RdLmFwcGx5KHRoaXMsIGFyZ3MpKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycm9yKTtcbiAgICB9XG4gIH07XG59KTtcbiIsImltcG9ydCBDdXJzb3IgZnJvbSAnLi9jdXJzb3IuanMnO1xuaW1wb3J0IE9ic2VydmVIYW5kbGUgZnJvbSAnLi9vYnNlcnZlX2hhbmRsZS5qcyc7XG5pbXBvcnQge1xuICBoYXNPd24sXG4gIGlzSW5kZXhhYmxlLFxuICBpc051bWVyaWNLZXksXG4gIGlzT3BlcmF0b3JPYmplY3QsXG4gIHBvcHVsYXRlRG9jdW1lbnRXaXRoUXVlcnlGaWVsZHMsXG4gIHByb2plY3Rpb25EZXRhaWxzLFxufSBmcm9tICcuL2NvbW1vbi5qcyc7XG5cbmltcG9ydCB7IGdldEFzeW5jTWV0aG9kTmFtZSB9IGZyb20gJy4vY29uc3RhbnRzJztcblxuLy8gWFhYIHR5cGUgY2hlY2tpbmcgb24gc2VsZWN0b3JzIChncmFjZWZ1bCBlcnJvciBpZiBtYWxmb3JtZWQpXG5cbi8vIExvY2FsQ29sbGVjdGlvbjogYSBzZXQgb2YgZG9jdW1lbnRzIHRoYXQgc3VwcG9ydHMgcXVlcmllcyBhbmQgbW9kaWZpZXJzLlxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTG9jYWxDb2xsZWN0aW9uIHtcbiAgY29uc3RydWN0b3IobmFtZSkge1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgLy8gX2lkIC0+IGRvY3VtZW50IChhbHNvIGNvbnRhaW5pbmcgaWQpXG4gICAgdGhpcy5fZG9jcyA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuXG4gICAgdGhpcy5fb2JzZXJ2ZVF1ZXVlID0gTWV0ZW9yLmlzQ2xpZW50XG4gICAgICA/IG5ldyBNZXRlb3IuX1N5bmNocm9ub3VzUXVldWUoKVxuICAgICAgOiBuZXcgTWV0ZW9yLl9Bc3luY2hyb25vdXNRdWV1ZSgpO1xuXG4gICAgdGhpcy5uZXh0X3FpZCA9IDE7IC8vIGxpdmUgcXVlcnkgaWQgZ2VuZXJhdG9yXG5cbiAgICAvLyBxaWQgLT4gbGl2ZSBxdWVyeSBvYmplY3QuIGtleXM6XG4gICAgLy8gIG9yZGVyZWQ6IGJvb2wuIG9yZGVyZWQgcXVlcmllcyBoYXZlIGFkZGVkQmVmb3JlL21vdmVkQmVmb3JlIGNhbGxiYWNrcy5cbiAgICAvLyAgcmVzdWx0czogYXJyYXkgKG9yZGVyZWQpIG9yIG9iamVjdCAodW5vcmRlcmVkKSBvZiBjdXJyZW50IHJlc3VsdHNcbiAgICAvLyAgICAoYWxpYXNlZCB3aXRoIHRoaXMuX2RvY3MhKVxuICAgIC8vICByZXN1bHRzU25hcHNob3Q6IHNuYXBzaG90IG9mIHJlc3VsdHMuIG51bGwgaWYgbm90IHBhdXNlZC5cbiAgICAvLyAgY3Vyc29yOiBDdXJzb3Igb2JqZWN0IGZvciB0aGUgcXVlcnkuXG4gICAgLy8gIHNlbGVjdG9yLCBzb3J0ZXIsIChjYWxsYmFja3MpOiBmdW5jdGlvbnNcbiAgICB0aGlzLnF1ZXJpZXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgLy8gbnVsbCBpZiBub3Qgc2F2aW5nIG9yaWdpbmFsczsgYW4gSWRNYXAgZnJvbSBpZCB0byBvcmlnaW5hbCBkb2N1bWVudCB2YWx1ZVxuICAgIC8vIGlmIHNhdmluZyBvcmlnaW5hbHMuIFNlZSBjb21tZW50cyBiZWZvcmUgc2F2ZU9yaWdpbmFscygpLlxuICAgIHRoaXMuX3NhdmVkT3JpZ2luYWxzID0gbnVsbDtcblxuICAgIC8vIFRydWUgd2hlbiBvYnNlcnZlcnMgYXJlIHBhdXNlZCBhbmQgd2Ugc2hvdWxkIG5vdCBzZW5kIGNhbGxiYWNrcy5cbiAgICB0aGlzLnBhdXNlZCA9IGZhbHNlO1xuICB9XG5cbiAgY291bnREb2N1bWVudHMoc2VsZWN0b3IsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gdGhpcy5maW5kKHNlbGVjdG9yID8/IHt9LCBvcHRpb25zKS5jb3VudEFzeW5jKCk7XG4gIH1cblxuICBlc3RpbWF0ZWREb2N1bWVudENvdW50KG9wdGlvbnMpIHtcbiAgICByZXR1cm4gdGhpcy5maW5kKHt9LCBvcHRpb25zKS5jb3VudEFzeW5jKCk7XG4gIH1cblxuICAvLyBvcHRpb25zIG1heSBpbmNsdWRlIHNvcnQsIHNraXAsIGxpbWl0LCByZWFjdGl2ZVxuICAvLyBzb3J0IG1heSBiZSBhbnkgb2YgdGhlc2UgZm9ybXM6XG4gIC8vICAgICB7YTogMSwgYjogLTF9XG4gIC8vICAgICBbW1wiYVwiLCBcImFzY1wiXSwgW1wiYlwiLCBcImRlc2NcIl1dXG4gIC8vICAgICBbXCJhXCIsIFtcImJcIiwgXCJkZXNjXCJdXVxuICAvLyAgIChpbiB0aGUgZmlyc3QgZm9ybSB5b3UncmUgYmVob2xkZW4gdG8ga2V5IGVudW1lcmF0aW9uIG9yZGVyIGluXG4gIC8vICAgeW91ciBqYXZhc2NyaXB0IFZNKVxuICAvL1xuICAvLyByZWFjdGl2ZTogaWYgZ2l2ZW4sIGFuZCBmYWxzZSwgZG9uJ3QgcmVnaXN0ZXIgd2l0aCBUcmFja2VyIChkZWZhdWx0XG4gIC8vIGlzIHRydWUpXG4gIC8vXG4gIC8vIFhYWCBwb3NzaWJseSBzaG91bGQgc3VwcG9ydCByZXRyaWV2aW5nIGEgc3Vic2V0IG9mIGZpZWxkcz8gYW5kXG4gIC8vIGhhdmUgaXQgYmUgYSBoaW50IChpZ25vcmVkIG9uIHRoZSBjbGllbnQsIHdoZW4gbm90IGNvcHlpbmcgdGhlXG4gIC8vIGRvYz8pXG4gIC8vXG4gIC8vIFhYWCBzb3J0IGRvZXMgbm90IHlldCBzdXBwb3J0IHN1YmtleXMgKCdhLmInKSAuLiBmaXggdGhhdCFcbiAgLy8gWFhYIGFkZCBvbmUgbW9yZSBzb3J0IGZvcm06IFwia2V5XCJcbiAgLy8gWFhYIHRlc3RzXG4gIGZpbmQoc2VsZWN0b3IsIG9wdGlvbnMpIHtcbiAgICAvLyBkZWZhdWx0IHN5bnRheCBmb3IgZXZlcnl0aGluZyBpcyB0byBvbWl0IHRoZSBzZWxlY3RvciBhcmd1bWVudC5cbiAgICAvLyBidXQgaWYgc2VsZWN0b3IgaXMgZXhwbGljaXRseSBwYXNzZWQgaW4gYXMgZmFsc2Ugb3IgdW5kZWZpbmVkLCB3ZVxuICAgIC8vIHdhbnQgYSBzZWxlY3RvciB0aGF0IG1hdGNoZXMgbm90aGluZy5cbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgc2VsZWN0b3IgPSB7fTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IExvY2FsQ29sbGVjdGlvbi5DdXJzb3IodGhpcywgc2VsZWN0b3IsIG9wdGlvbnMpO1xuICB9XG5cbiAgZmluZE9uZShzZWxlY3Rvciwgb3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHNlbGVjdG9yID0ge307XG4gICAgfVxuXG4gICAgLy8gTk9URTogYnkgc2V0dGluZyBsaW1pdCAxIGhlcmUsIHdlIGVuZCB1cCB1c2luZyB2ZXJ5IGluZWZmaWNpZW50XG4gICAgLy8gY29kZSB0aGF0IHJlY29tcHV0ZXMgdGhlIHdob2xlIHF1ZXJ5IG9uIGVhY2ggdXBkYXRlLiBUaGUgdXBzaWRlIGlzXG4gICAgLy8gdGhhdCB3aGVuIHlvdSByZWFjdGl2ZWx5IGRlcGVuZCBvbiBhIGZpbmRPbmUgeW91IG9ubHkgZ2V0XG4gICAgLy8gaW52YWxpZGF0ZWQgd2hlbiB0aGUgZm91bmQgb2JqZWN0IGNoYW5nZXMsIG5vdCBhbnkgb2JqZWN0IGluIHRoZVxuICAgIC8vIGNvbGxlY3Rpb24uIE1vc3QgZmluZE9uZSB3aWxsIGJlIGJ5IGlkLCB3aGljaCBoYXMgYSBmYXN0IHBhdGgsIHNvXG4gICAgLy8gdGhpcyBtaWdodCBub3QgYmUgYSBiaWcgZGVhbC4gSW4gbW9zdCBjYXNlcywgaW52YWxpZGF0aW9uIGNhdXNlc1xuICAgIC8vIHRoZSBjYWxsZWQgdG8gcmUtcXVlcnkgYW55d2F5LCBzbyB0aGlzIHNob3VsZCBiZSBhIG5ldCBwZXJmb3JtYW5jZVxuICAgIC8vIGltcHJvdmVtZW50LlxuICAgIG9wdGlvbnMubGltaXQgPSAxO1xuXG4gICAgcmV0dXJuIHRoaXMuZmluZChzZWxlY3Rvciwgb3B0aW9ucykuZmV0Y2goKVswXTtcbiAgfVxuICBhc3luYyBmaW5kT25lQXN5bmMoc2VsZWN0b3IsIG9wdGlvbnMgPSB7fSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICBzZWxlY3RvciA9IHt9O1xuICAgIH1cbiAgICBvcHRpb25zLmxpbWl0ID0gMTtcbiAgICByZXR1cm4gKGF3YWl0IHRoaXMuZmluZChzZWxlY3Rvciwgb3B0aW9ucykuZmV0Y2hBc3luYygpKVswXTtcbiAgfVxuICBwcmVwYXJlSW5zZXJ0KGRvYykge1xuICAgIGFzc2VydEhhc1ZhbGlkRmllbGROYW1lcyhkb2MpO1xuXG4gICAgLy8gaWYgeW91IHJlYWxseSB3YW50IHRvIHVzZSBPYmplY3RJRHMsIHNldCB0aGlzIGdsb2JhbC5cbiAgICAvLyBNb25nby5Db2xsZWN0aW9uIHNwZWNpZmllcyBpdHMgb3duIGlkcyBhbmQgZG9lcyBub3QgdXNlIHRoaXMgY29kZS5cbiAgICBpZiAoIWhhc093bi5jYWxsKGRvYywgJ19pZCcpKSB7XG4gICAgICBkb2MuX2lkID0gTG9jYWxDb2xsZWN0aW9uLl91c2VPSUQgPyBuZXcgTW9uZ29JRC5PYmplY3RJRCgpIDogUmFuZG9tLmlkKCk7XG4gICAgfVxuXG4gICAgY29uc3QgaWQgPSBkb2MuX2lkO1xuXG4gICAgaWYgKHRoaXMuX2RvY3MuaGFzKGlkKSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoYER1cGxpY2F0ZSBfaWQgJyR7aWR9J2ApO1xuICAgIH1cblxuICAgIHRoaXMuX3NhdmVPcmlnaW5hbChpZCwgdW5kZWZpbmVkKTtcbiAgICB0aGlzLl9kb2NzLnNldChpZCwgZG9jKTtcblxuICAgIHJldHVybiBpZDtcbiAgfVxuXG4gIC8vIFhYWCBwb3NzaWJseSBlbmZvcmNlIHRoYXQgJ3VuZGVmaW5lZCcgZG9lcyBub3QgYXBwZWFyICh3ZSBhc3N1bWVcbiAgLy8gdGhpcyBpbiBvdXIgaGFuZGxpbmcgb2YgbnVsbCBhbmQgJGV4aXN0cylcbiAgaW5zZXJ0KGRvYywgY2FsbGJhY2spIHtcbiAgICBkb2MgPSBFSlNPTi5jbG9uZShkb2MpO1xuICAgIGNvbnN0IGlkID0gdGhpcy5wcmVwYXJlSW5zZXJ0KGRvYyk7XG4gICAgY29uc3QgcXVlcmllc1RvUmVjb21wdXRlID0gW107XG5cbiAgICAvLyB0cmlnZ2VyIGxpdmUgcXVlcmllcyB0aGF0IG1hdGNoXG4gICAgZm9yIChjb25zdCBxaWQgb2YgT2JqZWN0LmtleXModGhpcy5xdWVyaWVzKSkge1xuICAgICAgY29uc3QgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbcWlkXTtcblxuICAgICAgaWYgKHF1ZXJ5LmRpcnR5KSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBtYXRjaFJlc3VsdCA9IHF1ZXJ5Lm1hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKGRvYyk7XG5cbiAgICAgIGlmIChtYXRjaFJlc3VsdC5yZXN1bHQpIHtcbiAgICAgICAgaWYgKHF1ZXJ5LmRpc3RhbmNlcyAmJiBtYXRjaFJlc3VsdC5kaXN0YW5jZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcXVlcnkuZGlzdGFuY2VzLnNldChpZCwgbWF0Y2hSZXN1bHQuZGlzdGFuY2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHF1ZXJ5LmN1cnNvci5za2lwIHx8IHF1ZXJ5LmN1cnNvci5saW1pdCkge1xuICAgICAgICAgIHF1ZXJpZXNUb1JlY29tcHV0ZS5wdXNoKHFpZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgTG9jYWxDb2xsZWN0aW9uLl9pbnNlcnRJblJlc3VsdHNTeW5jKHF1ZXJ5LCBkb2MpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcXVlcmllc1RvUmVjb21wdXRlLmZvckVhY2gocWlkID0+IHtcbiAgICAgIGlmICh0aGlzLnF1ZXJpZXNbcWlkXSkge1xuICAgICAgICB0aGlzLl9yZWNvbXB1dGVSZXN1bHRzKHRoaXMucXVlcmllc1txaWRdKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMuX29ic2VydmVRdWV1ZS5kcmFpbigpO1xuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgTWV0ZW9yLmRlZmVyKCgpID0+IHtcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgaWQpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIGFzeW5jIGluc2VydEFzeW5jKGRvYywgY2FsbGJhY2spIHtcbiAgICBkb2MgPSBFSlNPTi5jbG9uZShkb2MpO1xuICAgIGNvbnN0IGlkID0gdGhpcy5wcmVwYXJlSW5zZXJ0KGRvYyk7XG4gICAgY29uc3QgcXVlcmllc1RvUmVjb21wdXRlID0gW107XG5cbiAgICAvLyB0cmlnZ2VyIGxpdmUgcXVlcmllcyB0aGF0IG1hdGNoXG4gICAgZm9yIChjb25zdCBxaWQgb2YgT2JqZWN0LmtleXModGhpcy5xdWVyaWVzKSkge1xuICAgICAgY29uc3QgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbcWlkXTtcblxuICAgICAgaWYgKHF1ZXJ5LmRpcnR5KSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBtYXRjaFJlc3VsdCA9IHF1ZXJ5Lm1hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKGRvYyk7XG5cbiAgICAgIGlmIChtYXRjaFJlc3VsdC5yZXN1bHQpIHtcbiAgICAgICAgaWYgKHF1ZXJ5LmRpc3RhbmNlcyAmJiBtYXRjaFJlc3VsdC5kaXN0YW5jZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcXVlcnkuZGlzdGFuY2VzLnNldChpZCwgbWF0Y2hSZXN1bHQuZGlzdGFuY2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHF1ZXJ5LmN1cnNvci5za2lwIHx8IHF1ZXJ5LmN1cnNvci5saW1pdCkge1xuICAgICAgICAgIHF1ZXJpZXNUb1JlY29tcHV0ZS5wdXNoKHFpZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXdhaXQgTG9jYWxDb2xsZWN0aW9uLl9pbnNlcnRJblJlc3VsdHNBc3luYyhxdWVyeSwgZG9jKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHF1ZXJpZXNUb1JlY29tcHV0ZS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICBpZiAodGhpcy5xdWVyaWVzW3FpZF0pIHtcbiAgICAgICAgdGhpcy5fcmVjb21wdXRlUmVzdWx0cyh0aGlzLnF1ZXJpZXNbcWlkXSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBhd2FpdCB0aGlzLl9vYnNlcnZlUXVldWUuZHJhaW4oKTtcbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIE1ldGVvci5kZWZlcigoKSA9PiB7XG4gICAgICAgIGNhbGxiYWNrKG51bGwsIGlkKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBpZDtcbiAgfVxuXG4gIC8vIFBhdXNlIHRoZSBvYnNlcnZlcnMuIE5vIGNhbGxiYWNrcyBmcm9tIG9ic2VydmVycyB3aWxsIGZpcmUgdW50aWxcbiAgLy8gJ3Jlc3VtZU9ic2VydmVycycgaXMgY2FsbGVkLlxuICBwYXVzZU9ic2VydmVycygpIHtcbiAgICAvLyBOby1vcCBpZiBhbHJlYWR5IHBhdXNlZC5cbiAgICBpZiAodGhpcy5wYXVzZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBTZXQgdGhlICdwYXVzZWQnIGZsYWcgc3VjaCB0aGF0IG5ldyBvYnNlcnZlciBtZXNzYWdlcyBkb24ndCBmaXJlLlxuICAgIHRoaXMucGF1c2VkID0gdHJ1ZTtcblxuICAgIC8vIFRha2UgYSBzbmFwc2hvdCBvZiB0aGUgcXVlcnkgcmVzdWx0cyBmb3IgZWFjaCBxdWVyeS5cbiAgICBPYmplY3Qua2V5cyh0aGlzLnF1ZXJpZXMpLmZvckVhY2gocWlkID0+IHtcbiAgICAgIGNvbnN0IHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW3FpZF07XG4gICAgICBxdWVyeS5yZXN1bHRzU25hcHNob3QgPSBFSlNPTi5jbG9uZShxdWVyeS5yZXN1bHRzKTtcbiAgICB9KTtcbiAgfVxuXG4gIGNsZWFyUmVzdWx0UXVlcmllcyhjYWxsYmFjaykge1xuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuX2RvY3Muc2l6ZSgpO1xuXG4gICAgdGhpcy5fZG9jcy5jbGVhcigpO1xuXG4gICAgT2JqZWN0LmtleXModGhpcy5xdWVyaWVzKS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1txaWRdO1xuXG4gICAgICBpZiAocXVlcnkub3JkZXJlZCkge1xuICAgICAgICBxdWVyeS5yZXN1bHRzID0gW107XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBxdWVyeS5yZXN1bHRzLmNsZWFyKCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIE1ldGVvci5kZWZlcigoKSA9PiB7XG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cblxuICBwcmVwYXJlUmVtb3ZlKHNlbGVjdG9yKSB7XG4gICAgY29uc3QgbWF0Y2hlciA9IG5ldyBNaW5pbW9uZ28uTWF0Y2hlcihzZWxlY3Rvcik7XG4gICAgY29uc3QgcmVtb3ZlID0gW107XG5cbiAgICB0aGlzLl9lYWNoUG9zc2libHlNYXRjaGluZ0RvY1N5bmMoc2VsZWN0b3IsIChkb2MsIGlkKSA9PiB7XG4gICAgICBpZiAobWF0Y2hlci5kb2N1bWVudE1hdGNoZXMoZG9jKS5yZXN1bHQpIHtcbiAgICAgICAgcmVtb3ZlLnB1c2goaWQpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgcXVlcmllc1RvUmVjb21wdXRlID0gW107XG4gICAgY29uc3QgcXVlcnlSZW1vdmUgPSBbXTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmVtb3ZlLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCByZW1vdmVJZCA9IHJlbW92ZVtpXTtcbiAgICAgIGNvbnN0IHJlbW92ZURvYyA9IHRoaXMuX2RvY3MuZ2V0KHJlbW92ZUlkKTtcblxuICAgICAgT2JqZWN0LmtleXModGhpcy5xdWVyaWVzKS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICAgIGNvbnN0IHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW3FpZF07XG5cbiAgICAgICAgaWYgKHF1ZXJ5LmRpcnR5KSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHF1ZXJ5Lm1hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKHJlbW92ZURvYykucmVzdWx0KSB7XG4gICAgICAgICAgaWYgKHF1ZXJ5LmN1cnNvci5za2lwIHx8IHF1ZXJ5LmN1cnNvci5saW1pdCkge1xuICAgICAgICAgICAgcXVlcmllc1RvUmVjb21wdXRlLnB1c2gocWlkKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcXVlcnlSZW1vdmUucHVzaCh7cWlkLCBkb2M6IHJlbW92ZURvY30pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuX3NhdmVPcmlnaW5hbChyZW1vdmVJZCwgcmVtb3ZlRG9jKTtcbiAgICAgIHRoaXMuX2RvY3MucmVtb3ZlKHJlbW92ZUlkKTtcbiAgICB9XG5cbiAgICByZXR1cm4geyBxdWVyaWVzVG9SZWNvbXB1dGUsIHF1ZXJ5UmVtb3ZlLCByZW1vdmUgfTtcbiAgfVxuXG4gIHJlbW92ZShzZWxlY3RvciwgY2FsbGJhY2spIHtcbiAgICAvLyBFYXN5IHNwZWNpYWwgY2FzZTogaWYgd2UncmUgbm90IGNhbGxpbmcgb2JzZXJ2ZUNoYW5nZXMgY2FsbGJhY2tzIGFuZFxuICAgIC8vIHdlJ3JlIG5vdCBzYXZpbmcgb3JpZ2luYWxzIGFuZCB3ZSBnb3QgYXNrZWQgdG8gcmVtb3ZlIGV2ZXJ5dGhpbmcsIHRoZW5cbiAgICAvLyBqdXN0IGVtcHR5IGV2ZXJ5dGhpbmcgZGlyZWN0bHkuXG4gICAgaWYgKHRoaXMucGF1c2VkICYmICF0aGlzLl9zYXZlZE9yaWdpbmFscyAmJiBFSlNPTi5lcXVhbHMoc2VsZWN0b3IsIHt9KSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2xlYXJSZXN1bHRRdWVyaWVzKGNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICBjb25zdCB7IHF1ZXJpZXNUb1JlY29tcHV0ZSwgcXVlcnlSZW1vdmUsIHJlbW92ZSB9ID0gdGhpcy5wcmVwYXJlUmVtb3ZlKHNlbGVjdG9yKTtcblxuICAgIC8vIHJ1biBsaXZlIHF1ZXJ5IGNhbGxiYWNrcyBfYWZ0ZXJfIHdlJ3ZlIHJlbW92ZWQgdGhlIGRvY3VtZW50cy5cbiAgICBxdWVyeVJlbW92ZS5mb3JFYWNoKHJlbW92ZSA9PiB7XG4gICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1tyZW1vdmUucWlkXTtcblxuICAgICAgaWYgKHF1ZXJ5KSB7XG4gICAgICAgIHF1ZXJ5LmRpc3RhbmNlcyAmJiBxdWVyeS5kaXN0YW5jZXMucmVtb3ZlKHJlbW92ZS5kb2MuX2lkKTtcbiAgICAgICAgTG9jYWxDb2xsZWN0aW9uLl9yZW1vdmVGcm9tUmVzdWx0c1N5bmMocXVlcnksIHJlbW92ZS5kb2MpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcXVlcmllc1RvUmVjb21wdXRlLmZvckVhY2gocWlkID0+IHtcbiAgICAgIGNvbnN0IHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW3FpZF07XG5cbiAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICB0aGlzLl9yZWNvbXB1dGVSZXN1bHRzKHF1ZXJ5KTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMuX29ic2VydmVRdWV1ZS5kcmFpbigpO1xuXG4gICAgY29uc3QgcmVzdWx0ID0gcmVtb3ZlLmxlbmd0aDtcblxuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgTWV0ZW9yLmRlZmVyKCgpID0+IHtcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBhc3luYyByZW1vdmVBc3luYyhzZWxlY3RvciwgY2FsbGJhY2spIHtcbiAgICAvLyBFYXN5IHNwZWNpYWwgY2FzZTogaWYgd2UncmUgbm90IGNhbGxpbmcgb2JzZXJ2ZUNoYW5nZXMgY2FsbGJhY2tzIGFuZFxuICAgIC8vIHdlJ3JlIG5vdCBzYXZpbmcgb3JpZ2luYWxzIGFuZCB3ZSBnb3QgYXNrZWQgdG8gcmVtb3ZlIGV2ZXJ5dGhpbmcsIHRoZW5cbiAgICAvLyBqdXN0IGVtcHR5IGV2ZXJ5dGhpbmcgZGlyZWN0bHkuXG4gICAgaWYgKHRoaXMucGF1c2VkICYmICF0aGlzLl9zYXZlZE9yaWdpbmFscyAmJiBFSlNPTi5lcXVhbHMoc2VsZWN0b3IsIHt9KSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2xlYXJSZXN1bHRRdWVyaWVzKGNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICBjb25zdCB7IHF1ZXJpZXNUb1JlY29tcHV0ZSwgcXVlcnlSZW1vdmUsIHJlbW92ZSB9ID0gdGhpcy5wcmVwYXJlUmVtb3ZlKHNlbGVjdG9yKTtcblxuICAgIC8vIHJ1biBsaXZlIHF1ZXJ5IGNhbGxiYWNrcyBfYWZ0ZXJfIHdlJ3ZlIHJlbW92ZWQgdGhlIGRvY3VtZW50cy5cbiAgICBmb3IgKGNvbnN0IHJlbW92ZSBvZiBxdWVyeVJlbW92ZSkge1xuICAgICAgY29uc3QgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbcmVtb3ZlLnFpZF07XG5cbiAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICBxdWVyeS5kaXN0YW5jZXMgJiYgcXVlcnkuZGlzdGFuY2VzLnJlbW92ZShyZW1vdmUuZG9jLl9pZCk7XG4gICAgICAgIGF3YWl0IExvY2FsQ29sbGVjdGlvbi5fcmVtb3ZlRnJvbVJlc3VsdHNBc3luYyhxdWVyeSwgcmVtb3ZlLmRvYyk7XG4gICAgICB9XG4gICAgfVxuICAgIHF1ZXJpZXNUb1JlY29tcHV0ZS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1txaWRdO1xuXG4gICAgICBpZiAocXVlcnkpIHtcbiAgICAgICAgdGhpcy5fcmVjb21wdXRlUmVzdWx0cyhxdWVyeSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBhd2FpdCB0aGlzLl9vYnNlcnZlUXVldWUuZHJhaW4oKTtcblxuICAgIGNvbnN0IHJlc3VsdCA9IHJlbW92ZS5sZW5ndGg7XG5cbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIE1ldGVvci5kZWZlcigoKSA9PiB7XG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLy8gUmVzdW1lIHRoZSBvYnNlcnZlcnMuIE9ic2VydmVycyBpbW1lZGlhdGVseSByZWNlaXZlIGNoYW5nZVxuICAvLyBub3RpZmljYXRpb25zIHRvIGJyaW5nIHRoZW0gdG8gdGhlIGN1cnJlbnQgc3RhdGUgb2YgdGhlXG4gIC8vIGRhdGFiYXNlLiBOb3RlIHRoYXQgdGhpcyBpcyBub3QganVzdCByZXBsYXlpbmcgYWxsIHRoZSBjaGFuZ2VzIHRoYXRcbiAgLy8gaGFwcGVuZWQgZHVyaW5nIHRoZSBwYXVzZSwgaXQgaXMgYSBzbWFydGVyICdjb2FsZXNjZWQnIGRpZmYuXG4gIF9yZXN1bWVPYnNlcnZlcnMoKSB7XG4gICAgLy8gTm8tb3AgaWYgbm90IHBhdXNlZC5cbiAgICBpZiAoIXRoaXMucGF1c2VkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gVW5zZXQgdGhlICdwYXVzZWQnIGZsYWcuIE1ha2Ugc3VyZSB0byBkbyB0aGlzIGZpcnN0LCBvdGhlcndpc2VcbiAgICAvLyBvYnNlcnZlciBtZXRob2RzIHdvbid0IGFjdHVhbGx5IGZpcmUgd2hlbiB3ZSB0cmlnZ2VyIHRoZW0uXG4gICAgdGhpcy5wYXVzZWQgPSBmYWxzZTtcblxuICAgIE9iamVjdC5rZXlzKHRoaXMucXVlcmllcykuZm9yRWFjaChxaWQgPT4ge1xuICAgICAgY29uc3QgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbcWlkXTtcblxuICAgICAgaWYgKHF1ZXJ5LmRpcnR5KSB7XG4gICAgICAgIHF1ZXJ5LmRpcnR5ID0gZmFsc2U7XG5cbiAgICAgICAgLy8gcmUtY29tcHV0ZSByZXN1bHRzIHdpbGwgcGVyZm9ybSBgTG9jYWxDb2xsZWN0aW9uLl9kaWZmUXVlcnlDaGFuZ2VzYFxuICAgICAgICAvLyBhdXRvbWF0aWNhbGx5LlxuICAgICAgICB0aGlzLl9yZWNvbXB1dGVSZXN1bHRzKHF1ZXJ5LCBxdWVyeS5yZXN1bHRzU25hcHNob3QpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRGlmZiB0aGUgY3VycmVudCByZXN1bHRzIGFnYWluc3QgdGhlIHNuYXBzaG90IGFuZCBzZW5kIHRvIG9ic2VydmVycy5cbiAgICAgICAgLy8gcGFzcyB0aGUgcXVlcnkgb2JqZWN0IGZvciBpdHMgb2JzZXJ2ZXIgY2FsbGJhY2tzLlxuICAgICAgICBMb2NhbENvbGxlY3Rpb24uX2RpZmZRdWVyeUNoYW5nZXMoXG4gICAgICAgICAgcXVlcnkub3JkZXJlZCxcbiAgICAgICAgICBxdWVyeS5yZXN1bHRzU25hcHNob3QsXG4gICAgICAgICAgcXVlcnkucmVzdWx0cyxcbiAgICAgICAgICBxdWVyeSxcbiAgICAgICAgICB7cHJvamVjdGlvbkZuOiBxdWVyeS5wcm9qZWN0aW9uRm59XG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIHF1ZXJ5LnJlc3VsdHNTbmFwc2hvdCA9IG51bGw7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyByZXN1bWVPYnNlcnZlcnNTZXJ2ZXIoKSB7XG4gICAgdGhpcy5fcmVzdW1lT2JzZXJ2ZXJzKCk7XG4gICAgYXdhaXQgdGhpcy5fb2JzZXJ2ZVF1ZXVlLmRyYWluKCk7XG4gIH1cbiAgcmVzdW1lT2JzZXJ2ZXJzQ2xpZW50KCkge1xuICAgIHRoaXMuX3Jlc3VtZU9ic2VydmVycygpO1xuICAgIHRoaXMuX29ic2VydmVRdWV1ZS5kcmFpbigpO1xuICB9XG5cbiAgcmV0cmlldmVPcmlnaW5hbHMoKSB7XG4gICAgaWYgKCF0aGlzLl9zYXZlZE9yaWdpbmFscykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYWxsZWQgcmV0cmlldmVPcmlnaW5hbHMgd2l0aG91dCBzYXZlT3JpZ2luYWxzJyk7XG4gICAgfVxuXG4gICAgY29uc3Qgb3JpZ2luYWxzID0gdGhpcy5fc2F2ZWRPcmlnaW5hbHM7XG5cbiAgICB0aGlzLl9zYXZlZE9yaWdpbmFscyA9IG51bGw7XG5cbiAgICByZXR1cm4gb3JpZ2luYWxzO1xuICB9XG5cbiAgLy8gVG8gdHJhY2sgd2hhdCBkb2N1bWVudHMgYXJlIGFmZmVjdGVkIGJ5IGEgcGllY2Ugb2YgY29kZSwgY2FsbFxuICAvLyBzYXZlT3JpZ2luYWxzKCkgYmVmb3JlIGl0IGFuZCByZXRyaWV2ZU9yaWdpbmFscygpIGFmdGVyIGl0LlxuICAvLyByZXRyaWV2ZU9yaWdpbmFscyByZXR1cm5zIGFuIG9iamVjdCB3aG9zZSBrZXlzIGFyZSB0aGUgaWRzIG9mIHRoZSBkb2N1bWVudHNcbiAgLy8gdGhhdCB3ZXJlIGFmZmVjdGVkIHNpbmNlIHRoZSBjYWxsIHRvIHNhdmVPcmlnaW5hbHMoKSwgYW5kIHRoZSB2YWx1ZXMgYXJlXG4gIC8vIGVxdWFsIHRvIHRoZSBkb2N1bWVudCdzIGNvbnRlbnRzIGF0IHRoZSB0aW1lIG9mIHNhdmVPcmlnaW5hbHMuIChJbiB0aGUgY2FzZVxuICAvLyBvZiBhbiBpbnNlcnRlZCBkb2N1bWVudCwgdW5kZWZpbmVkIGlzIHRoZSB2YWx1ZS4pIFlvdSBtdXN0IGFsdGVybmF0ZVxuICAvLyBiZXR3ZWVuIGNhbGxzIHRvIHNhdmVPcmlnaW5hbHMoKSBhbmQgcmV0cmlldmVPcmlnaW5hbHMoKS5cbiAgc2F2ZU9yaWdpbmFscygpIHtcbiAgICBpZiAodGhpcy5fc2F2ZWRPcmlnaW5hbHMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2FsbGVkIHNhdmVPcmlnaW5hbHMgdHdpY2Ugd2l0aG91dCByZXRyaWV2ZU9yaWdpbmFscycpO1xuICAgIH1cblxuICAgIHRoaXMuX3NhdmVkT3JpZ2luYWxzID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gIH1cblxuICBwcmVwYXJlVXBkYXRlKHNlbGVjdG9yKSB7XG4gICAgLy8gU2F2ZSB0aGUgb3JpZ2luYWwgcmVzdWx0cyBvZiBhbnkgcXVlcnkgdGhhdCB3ZSBtaWdodCBuZWVkIHRvXG4gICAgLy8gX3JlY29tcHV0ZVJlc3VsdHMgb24sIGJlY2F1c2UgX21vZGlmeUFuZE5vdGlmeSB3aWxsIG11dGF0ZSB0aGUgb2JqZWN0cyBpblxuICAgIC8vIGl0LiAoV2UgZG9uJ3QgbmVlZCB0byBzYXZlIHRoZSBvcmlnaW5hbCByZXN1bHRzIG9mIHBhdXNlZCBxdWVyaWVzIGJlY2F1c2VcbiAgICAvLyB0aGV5IGFscmVhZHkgaGF2ZSBhIHJlc3VsdHNTbmFwc2hvdCBhbmQgd2Ugd29uJ3QgYmUgZGlmZmluZyBpblxuICAgIC8vIF9yZWNvbXB1dGVSZXN1bHRzLilcbiAgICBjb25zdCBxaWRUb09yaWdpbmFsUmVzdWx0cyA9IHt9O1xuXG4gICAgLy8gV2Ugc2hvdWxkIG9ubHkgY2xvbmUgZWFjaCBkb2N1bWVudCBvbmNlLCBldmVuIGlmIGl0IGFwcGVhcnMgaW4gbXVsdGlwbGVcbiAgICAvLyBxdWVyaWVzXG4gICAgY29uc3QgZG9jTWFwID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gICAgY29uc3QgaWRzTWF0Y2hlZCA9IExvY2FsQ29sbGVjdGlvbi5faWRzTWF0Y2hlZEJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuXG4gICAgT2JqZWN0LmtleXModGhpcy5xdWVyaWVzKS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1txaWRdO1xuXG4gICAgICBpZiAoKHF1ZXJ5LmN1cnNvci5za2lwIHx8IHF1ZXJ5LmN1cnNvci5saW1pdCkgJiYgISB0aGlzLnBhdXNlZCkge1xuICAgICAgICAvLyBDYXRjaCB0aGUgY2FzZSBvZiBhIHJlYWN0aXZlIGBjb3VudCgpYCBvbiBhIGN1cnNvciB3aXRoIHNraXBcbiAgICAgICAgLy8gb3IgbGltaXQsIHdoaWNoIHJlZ2lzdGVycyBhbiB1bm9yZGVyZWQgb2JzZXJ2ZS4gVGhpcyBpcyBhXG4gICAgICAgIC8vIHByZXR0eSByYXJlIGNhc2UsIHNvIHdlIGp1c3QgY2xvbmUgdGhlIGVudGlyZSByZXN1bHQgc2V0IHdpdGhcbiAgICAgICAgLy8gbm8gb3B0aW1pemF0aW9ucyBmb3IgZG9jdW1lbnRzIHRoYXQgYXBwZWFyIGluIHRoZXNlIHJlc3VsdFxuICAgICAgICAvLyBzZXRzIGFuZCBvdGhlciBxdWVyaWVzLlxuICAgICAgICBpZiAocXVlcnkucmVzdWx0cyBpbnN0YW5jZW9mIExvY2FsQ29sbGVjdGlvbi5fSWRNYXApIHtcbiAgICAgICAgICBxaWRUb09yaWdpbmFsUmVzdWx0c1txaWRdID0gcXVlcnkucmVzdWx0cy5jbG9uZSgpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghKHF1ZXJ5LnJlc3VsdHMgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Fzc2VydGlvbiBmYWlsZWQ6IHF1ZXJ5LnJlc3VsdHMgbm90IGFuIGFycmF5Jyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDbG9uZXMgYSBkb2N1bWVudCB0byBiZSBzdG9yZWQgaW4gYHFpZFRvT3JpZ2luYWxSZXN1bHRzYFxuICAgICAgICAvLyBiZWNhdXNlIGl0IG1heSBiZSBtb2RpZmllZCBiZWZvcmUgdGhlIG5ldyBhbmQgb2xkIHJlc3VsdCBzZXRzXG4gICAgICAgIC8vIGFyZSBkaWZmZWQuIEJ1dCBpZiB3ZSBrbm93IGV4YWN0bHkgd2hpY2ggZG9jdW1lbnQgSURzIHdlJ3JlXG4gICAgICAgIC8vIGdvaW5nIHRvIG1vZGlmeSwgdGhlbiB3ZSBvbmx5IG5lZWQgdG8gY2xvbmUgdGhvc2UuXG4gICAgICAgIGNvbnN0IG1lbW9pemVkQ2xvbmVJZk5lZWRlZCA9IGRvYyA9PiB7XG4gICAgICAgICAgaWYgKGRvY01hcC5oYXMoZG9jLl9pZCkpIHtcbiAgICAgICAgICAgIHJldHVybiBkb2NNYXAuZ2V0KGRvYy5faWQpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IGRvY1RvTWVtb2l6ZSA9IChcbiAgICAgICAgICAgIGlkc01hdGNoZWQgJiZcbiAgICAgICAgICAgICFpZHNNYXRjaGVkLnNvbWUoaWQgPT4gRUpTT04uZXF1YWxzKGlkLCBkb2MuX2lkKSlcbiAgICAgICAgICApID8gZG9jIDogRUpTT04uY2xvbmUoZG9jKTtcblxuICAgICAgICAgIGRvY01hcC5zZXQoZG9jLl9pZCwgZG9jVG9NZW1vaXplKTtcblxuICAgICAgICAgIHJldHVybiBkb2NUb01lbW9pemU7XG4gICAgICAgIH07XG5cbiAgICAgICAgcWlkVG9PcmlnaW5hbFJlc3VsdHNbcWlkXSA9IHF1ZXJ5LnJlc3VsdHMubWFwKG1lbW9pemVkQ2xvbmVJZk5lZWRlZCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcWlkVG9PcmlnaW5hbFJlc3VsdHM7XG4gIH1cblxuICBmaW5pc2hVcGRhdGUoeyBvcHRpb25zLCB1cGRhdGVDb3VudCwgY2FsbGJhY2ssIGluc2VydGVkSWQgfSkge1xuXG5cbiAgICAvLyBSZXR1cm4gdGhlIG51bWJlciBvZiBhZmZlY3RlZCBkb2N1bWVudHMsIG9yIGluIHRoZSB1cHNlcnQgY2FzZSwgYW4gb2JqZWN0XG4gICAgLy8gY29udGFpbmluZyB0aGUgbnVtYmVyIG9mIGFmZmVjdGVkIGRvY3MgYW5kIHRoZSBpZCBvZiB0aGUgZG9jIHRoYXQgd2FzXG4gICAgLy8gaW5zZXJ0ZWQsIGlmIGFueS5cbiAgICBsZXQgcmVzdWx0O1xuICAgIGlmIChvcHRpb25zLl9yZXR1cm5PYmplY3QpIHtcbiAgICAgIHJlc3VsdCA9IHsgbnVtYmVyQWZmZWN0ZWQ6IHVwZGF0ZUNvdW50IH07XG5cbiAgICAgIGlmIChpbnNlcnRlZElkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVzdWx0Lmluc2VydGVkSWQgPSBpbnNlcnRlZElkO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQgPSB1cGRhdGVDb3VudDtcbiAgICB9XG5cbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIE1ldGVvci5kZWZlcigoKSA9PiB7XG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLy8gWFhYIGF0b21pY2l0eTogaWYgbXVsdGkgaXMgdHJ1ZSwgYW5kIG9uZSBtb2RpZmljYXRpb24gZmFpbHMsIGRvXG4gIC8vIHdlIHJvbGxiYWNrIHRoZSB3aG9sZSBvcGVyYXRpb24sIG9yIHdoYXQ/XG4gIGFzeW5jIHVwZGF0ZUFzeW5jKHNlbGVjdG9yLCBtb2QsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCEgY2FsbGJhY2sgJiYgb3B0aW9ucyBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICBvcHRpb25zID0gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG5cbiAgICBjb25zdCBtYXRjaGVyID0gbmV3IE1pbmltb25nby5NYXRjaGVyKHNlbGVjdG9yLCB0cnVlKTtcblxuICAgIGNvbnN0IHFpZFRvT3JpZ2luYWxSZXN1bHRzID0gdGhpcy5wcmVwYXJlVXBkYXRlKHNlbGVjdG9yKTtcblxuICAgIGxldCByZWNvbXB1dGVRaWRzID0ge307XG5cbiAgICBsZXQgdXBkYXRlQ291bnQgPSAwO1xuXG4gICAgYXdhaXQgdGhpcy5fZWFjaFBvc3NpYmx5TWF0Y2hpbmdEb2NBc3luYyhzZWxlY3RvciwgYXN5bmMgKGRvYywgaWQpID0+IHtcbiAgICAgIGNvbnN0IHF1ZXJ5UmVzdWx0ID0gbWF0Y2hlci5kb2N1bWVudE1hdGNoZXMoZG9jKTtcblxuICAgICAgaWYgKHF1ZXJ5UmVzdWx0LnJlc3VsdCkge1xuICAgICAgICAvLyBYWFggU2hvdWxkIHdlIHNhdmUgdGhlIG9yaWdpbmFsIGV2ZW4gaWYgbW9kIGVuZHMgdXAgYmVpbmcgYSBuby1vcD9cbiAgICAgICAgdGhpcy5fc2F2ZU9yaWdpbmFsKGlkLCBkb2MpO1xuICAgICAgICByZWNvbXB1dGVRaWRzID0gYXdhaXQgdGhpcy5fbW9kaWZ5QW5kTm90aWZ5QXN5bmMoXG4gICAgICAgICAgZG9jLFxuICAgICAgICAgIG1vZCxcbiAgICAgICAgICBxdWVyeVJlc3VsdC5hcnJheUluZGljZXNcbiAgICAgICAgKTtcblxuICAgICAgICArK3VwZGF0ZUNvdW50O1xuXG4gICAgICAgIGlmICghb3B0aW9ucy5tdWx0aSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8gYnJlYWtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcblxuICAgIE9iamVjdC5rZXlzKHJlY29tcHV0ZVFpZHMpLmZvckVhY2gocWlkID0+IHtcbiAgICAgIGNvbnN0IHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW3FpZF07XG5cbiAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICB0aGlzLl9yZWNvbXB1dGVSZXN1bHRzKHF1ZXJ5LCBxaWRUb09yaWdpbmFsUmVzdWx0c1txaWRdKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGF3YWl0IHRoaXMuX29ic2VydmVRdWV1ZS5kcmFpbigpO1xuXG4gICAgLy8gSWYgd2UgYXJlIGRvaW5nIGFuIHVwc2VydCwgYW5kIHdlIGRpZG4ndCBtb2RpZnkgYW55IGRvY3VtZW50cyB5ZXQsIHRoZW5cbiAgICAvLyBpdCdzIHRpbWUgdG8gZG8gYW4gaW5zZXJ0LiBGaWd1cmUgb3V0IHdoYXQgZG9jdW1lbnQgd2UgYXJlIGluc2VydGluZywgYW5kXG4gICAgLy8gZ2VuZXJhdGUgYW4gaWQgZm9yIGl0LlxuICAgIGxldCBpbnNlcnRlZElkO1xuICAgIGlmICh1cGRhdGVDb3VudCA9PT0gMCAmJiBvcHRpb25zLnVwc2VydCkge1xuICAgICAgY29uc3QgZG9jID0gTG9jYWxDb2xsZWN0aW9uLl9jcmVhdGVVcHNlcnREb2N1bWVudChzZWxlY3RvciwgbW9kKTtcbiAgICAgIGlmICghZG9jLl9pZCAmJiBvcHRpb25zLmluc2VydGVkSWQpIHtcbiAgICAgICAgZG9jLl9pZCA9IG9wdGlvbnMuaW5zZXJ0ZWRJZDtcbiAgICAgIH1cblxuICAgICAgaW5zZXJ0ZWRJZCA9IGF3YWl0IHRoaXMuaW5zZXJ0QXN5bmMoZG9jKTtcbiAgICAgIHVwZGF0ZUNvdW50ID0gMTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5maW5pc2hVcGRhdGUoe1xuICAgICAgb3B0aW9ucyxcbiAgICAgIGluc2VydGVkSWQsXG4gICAgICB1cGRhdGVDb3VudCxcbiAgICAgIGNhbGxiYWNrLFxuICAgIH0pO1xuICB9XG4gIC8vIFhYWCBhdG9taWNpdHk6IGlmIG11bHRpIGlzIHRydWUsIGFuZCBvbmUgbW9kaWZpY2F0aW9uIGZhaWxzLCBkb1xuICAvLyB3ZSByb2xsYmFjayB0aGUgd2hvbGUgb3BlcmF0aW9uLCBvciB3aGF0P1xuICB1cGRhdGUoc2VsZWN0b3IsIG1vZCwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBpZiAoISBjYWxsYmFjayAmJiBvcHRpb25zIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgIG9wdGlvbnMgPSBudWxsO1xuICAgIH1cblxuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cblxuICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgTWluaW1vbmdvLk1hdGNoZXIoc2VsZWN0b3IsIHRydWUpO1xuXG4gICAgY29uc3QgcWlkVG9PcmlnaW5hbFJlc3VsdHMgPSB0aGlzLnByZXBhcmVVcGRhdGUoc2VsZWN0b3IpO1xuXG4gICAgbGV0IHJlY29tcHV0ZVFpZHMgPSB7fTtcblxuICAgIGxldCB1cGRhdGVDb3VudCA9IDA7XG5cbiAgICB0aGlzLl9lYWNoUG9zc2libHlNYXRjaGluZ0RvY1N5bmMoc2VsZWN0b3IsIChkb2MsIGlkKSA9PiB7XG4gICAgICBjb25zdCBxdWVyeVJlc3VsdCA9IG1hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKGRvYyk7XG5cbiAgICAgIGlmIChxdWVyeVJlc3VsdC5yZXN1bHQpIHtcbiAgICAgICAgLy8gWFhYIFNob3VsZCB3ZSBzYXZlIHRoZSBvcmlnaW5hbCBldmVuIGlmIG1vZCBlbmRzIHVwIGJlaW5nIGEgbm8tb3A/XG4gICAgICAgIHRoaXMuX3NhdmVPcmlnaW5hbChpZCwgZG9jKTtcbiAgICAgICAgcmVjb21wdXRlUWlkcyA9IHRoaXMuX21vZGlmeUFuZE5vdGlmeVN5bmMoXG4gICAgICAgICAgZG9jLFxuICAgICAgICAgIG1vZCxcbiAgICAgICAgICBxdWVyeVJlc3VsdC5hcnJheUluZGljZXNcbiAgICAgICAgKTtcblxuICAgICAgICArK3VwZGF0ZUNvdW50O1xuXG4gICAgICAgIGlmICghb3B0aW9ucy5tdWx0aSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8gYnJlYWtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcblxuICAgIE9iamVjdC5rZXlzKHJlY29tcHV0ZVFpZHMpLmZvckVhY2gocWlkID0+IHtcbiAgICAgIGNvbnN0IHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW3FpZF07XG4gICAgICBpZiAocXVlcnkpIHtcbiAgICAgICAgdGhpcy5fcmVjb21wdXRlUmVzdWx0cyhxdWVyeSwgcWlkVG9PcmlnaW5hbFJlc3VsdHNbcWlkXSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLl9vYnNlcnZlUXVldWUuZHJhaW4oKTtcblxuXG4gICAgLy8gSWYgd2UgYXJlIGRvaW5nIGFuIHVwc2VydCwgYW5kIHdlIGRpZG4ndCBtb2RpZnkgYW55IGRvY3VtZW50cyB5ZXQsIHRoZW5cbiAgICAvLyBpdCdzIHRpbWUgdG8gZG8gYW4gaW5zZXJ0LiBGaWd1cmUgb3V0IHdoYXQgZG9jdW1lbnQgd2UgYXJlIGluc2VydGluZywgYW5kXG4gICAgLy8gZ2VuZXJhdGUgYW4gaWQgZm9yIGl0LlxuICAgIGxldCBpbnNlcnRlZElkO1xuICAgIGlmICh1cGRhdGVDb3VudCA9PT0gMCAmJiBvcHRpb25zLnVwc2VydCkge1xuICAgICAgY29uc3QgZG9jID0gTG9jYWxDb2xsZWN0aW9uLl9jcmVhdGVVcHNlcnREb2N1bWVudChzZWxlY3RvciwgbW9kKTtcbiAgICAgIGlmICghZG9jLl9pZCAmJiBvcHRpb25zLmluc2VydGVkSWQpIHtcbiAgICAgICAgZG9jLl9pZCA9IG9wdGlvbnMuaW5zZXJ0ZWRJZDtcbiAgICAgIH1cblxuICAgICAgaW5zZXJ0ZWRJZCA9IHRoaXMuaW5zZXJ0KGRvYyk7XG4gICAgICB1cGRhdGVDb3VudCA9IDE7XG4gICAgfVxuXG5cbiAgICByZXR1cm4gdGhpcy5maW5pc2hVcGRhdGUoe1xuICAgICAgb3B0aW9ucyxcbiAgICAgIGluc2VydGVkSWQsXG4gICAgICB1cGRhdGVDb3VudCxcbiAgICAgIGNhbGxiYWNrLFxuICAgICAgc2VsZWN0b3IsXG4gICAgICBtb2QsXG4gICAgfSk7XG4gIH1cblxuICAvLyBBIGNvbnZlbmllbmNlIHdyYXBwZXIgb24gdXBkYXRlLiBMb2NhbENvbGxlY3Rpb24udXBzZXJ0KHNlbCwgbW9kKSBpc1xuICAvLyBlcXVpdmFsZW50IHRvIExvY2FsQ29sbGVjdGlvbi51cGRhdGUoc2VsLCBtb2QsIHt1cHNlcnQ6IHRydWUsXG4gIC8vIF9yZXR1cm5PYmplY3Q6IHRydWV9KS5cbiAgdXBzZXJ0KHNlbGVjdG9yLCBtb2QsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCFjYWxsYmFjayAmJiB0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnVwZGF0ZShcbiAgICAgIHNlbGVjdG9yLFxuICAgICAgbW9kLFxuICAgICAgT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucywge3Vwc2VydDogdHJ1ZSwgX3JldHVybk9iamVjdDogdHJ1ZX0pLFxuICAgICAgY2FsbGJhY2tcbiAgICApO1xuICB9XG5cbiAgdXBzZXJ0QXN5bmMoc2VsZWN0b3IsIG1vZCwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBpZiAoIWNhbGxiYWNrICYmIHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICBvcHRpb25zID0ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMudXBkYXRlQXN5bmMoXG4gICAgICBzZWxlY3RvcixcbiAgICAgIG1vZCxcbiAgICAgIE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMsIHt1cHNlcnQ6IHRydWUsIF9yZXR1cm5PYmplY3Q6IHRydWV9KSxcbiAgICAgIGNhbGxiYWNrXG4gICAgKTtcbiAgfVxuXG4gIC8vIEl0ZXJhdGVzIG92ZXIgYSBzdWJzZXQgb2YgZG9jdW1lbnRzIHRoYXQgY291bGQgbWF0Y2ggc2VsZWN0b3I7IGNhbGxzXG4gIC8vIGZuKGRvYywgaWQpIG9uIGVhY2ggb2YgdGhlbS4gIFNwZWNpZmljYWxseSwgaWYgc2VsZWN0b3Igc3BlY2lmaWVzXG4gIC8vIHNwZWNpZmljIF9pZCdzLCBpdCBvbmx5IGxvb2tzIGF0IHRob3NlLiAgZG9jIGlzICpub3QqIGNsb25lZDogaXQgaXMgdGhlXG4gIC8vIHNhbWUgb2JqZWN0IHRoYXQgaXMgaW4gX2RvY3MuXG4gIGFzeW5jIF9lYWNoUG9zc2libHlNYXRjaGluZ0RvY0FzeW5jKHNlbGVjdG9yLCBmbikge1xuICAgIGNvbnN0IHNwZWNpZmljSWRzID0gTG9jYWxDb2xsZWN0aW9uLl9pZHNNYXRjaGVkQnlTZWxlY3RvcihzZWxlY3Rvcik7XG5cbiAgICBpZiAoc3BlY2lmaWNJZHMpIHtcbiAgICAgIGZvciAoY29uc3QgaWQgb2Ygc3BlY2lmaWNJZHMpIHtcbiAgICAgICAgY29uc3QgZG9jID0gdGhpcy5fZG9jcy5nZXQoaWQpO1xuXG4gICAgICAgIGlmIChkb2MgJiYgISAoYXdhaXQgZm4oZG9jLCBpZCkpKSB7XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBhd2FpdCB0aGlzLl9kb2NzLmZvckVhY2hBc3luYyhmbik7XG4gICAgfVxuICB9XG4gIF9lYWNoUG9zc2libHlNYXRjaGluZ0RvY1N5bmMoc2VsZWN0b3IsIGZuKSB7XG4gICAgY29uc3Qgc3BlY2lmaWNJZHMgPSBMb2NhbENvbGxlY3Rpb24uX2lkc01hdGNoZWRCeVNlbGVjdG9yKHNlbGVjdG9yKTtcblxuICAgIGlmIChzcGVjaWZpY0lkcykge1xuICAgICAgZm9yIChjb25zdCBpZCBvZiBzcGVjaWZpY0lkcykge1xuICAgICAgICBjb25zdCBkb2MgPSB0aGlzLl9kb2NzLmdldChpZCk7XG5cbiAgICAgICAgaWYgKGRvYyAmJiAhZm4oZG9jLCBpZCkpIHtcbiAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2RvY3MuZm9yRWFjaChmbik7XG4gICAgfVxuICB9XG5cbiAgX2dldE1hdGNoZWREb2NBbmRNb2RpZnkoZG9jLCBtb2QsIGFycmF5SW5kaWNlcykge1xuICAgIGNvbnN0IG1hdGNoZWRfYmVmb3JlID0ge307XG5cbiAgICBPYmplY3Qua2V5cyh0aGlzLnF1ZXJpZXMpLmZvckVhY2gocWlkID0+IHtcbiAgICAgIGNvbnN0IHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW3FpZF07XG5cbiAgICAgIGlmIChxdWVyeS5kaXJ0eSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChxdWVyeS5vcmRlcmVkKSB7XG4gICAgICAgIG1hdGNoZWRfYmVmb3JlW3FpZF0gPSBxdWVyeS5tYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyhkb2MpLnJlc3VsdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEJlY2F1c2Ugd2UgZG9uJ3Qgc3VwcG9ydCBza2lwIG9yIGxpbWl0ICh5ZXQpIGluIHVub3JkZXJlZCBxdWVyaWVzLCB3ZVxuICAgICAgICAvLyBjYW4ganVzdCBkbyBhIGRpcmVjdCBsb29rdXAuXG4gICAgICAgIG1hdGNoZWRfYmVmb3JlW3FpZF0gPSBxdWVyeS5yZXN1bHRzLmhhcyhkb2MuX2lkKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBtYXRjaGVkX2JlZm9yZTtcbiAgfVxuXG4gIF9tb2RpZnlBbmROb3RpZnlTeW5jKGRvYywgbW9kLCBhcnJheUluZGljZXMpIHtcblxuICAgIGNvbnN0IG1hdGNoZWRfYmVmb3JlID0gdGhpcy5fZ2V0TWF0Y2hlZERvY0FuZE1vZGlmeShkb2MsIG1vZCwgYXJyYXlJbmRpY2VzKTtcblxuICAgIGNvbnN0IG9sZF9kb2MgPSBFSlNPTi5jbG9uZShkb2MpO1xuICAgIExvY2FsQ29sbGVjdGlvbi5fbW9kaWZ5KGRvYywgbW9kLCB7YXJyYXlJbmRpY2VzfSk7XG5cbiAgICBjb25zdCByZWNvbXB1dGVRaWRzID0ge307XG5cbiAgICBmb3IgKGNvbnN0IHFpZCBvZiBPYmplY3Qua2V5cyh0aGlzLnF1ZXJpZXMpKSB7XG4gICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1txaWRdO1xuXG4gICAgICBpZiAocXVlcnkuZGlydHkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGFmdGVyTWF0Y2ggPSBxdWVyeS5tYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyhkb2MpO1xuICAgICAgY29uc3QgYWZ0ZXIgPSBhZnRlck1hdGNoLnJlc3VsdDtcbiAgICAgIGNvbnN0IGJlZm9yZSA9IG1hdGNoZWRfYmVmb3JlW3FpZF07XG5cbiAgICAgIGlmIChhZnRlciAmJiBxdWVyeS5kaXN0YW5jZXMgJiYgYWZ0ZXJNYXRjaC5kaXN0YW5jZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHF1ZXJ5LmRpc3RhbmNlcy5zZXQoZG9jLl9pZCwgYWZ0ZXJNYXRjaC5kaXN0YW5jZSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChxdWVyeS5jdXJzb3Iuc2tpcCB8fCBxdWVyeS5jdXJzb3IubGltaXQpIHtcbiAgICAgICAgLy8gV2UgbmVlZCB0byByZWNvbXB1dGUgYW55IHF1ZXJ5IHdoZXJlIHRoZSBkb2MgbWF5IGhhdmUgYmVlbiBpbiB0aGVcbiAgICAgICAgLy8gY3Vyc29yJ3Mgd2luZG93IGVpdGhlciBiZWZvcmUgb3IgYWZ0ZXIgdGhlIHVwZGF0ZS4gKE5vdGUgdGhhdCBpZiBza2lwXG4gICAgICAgIC8vIG9yIGxpbWl0IGlzIHNldCwgXCJiZWZvcmVcIiBhbmQgXCJhZnRlclwiIGJlaW5nIHRydWUgZG8gbm90IG5lY2Vzc2FyaWx5XG4gICAgICAgIC8vIG1lYW4gdGhhdCB0aGUgZG9jdW1lbnQgaXMgaW4gdGhlIGN1cnNvcidzIG91dHB1dCBhZnRlciBza2lwL2xpbWl0IGlzXG4gICAgICAgIC8vIGFwcGxpZWQuLi4gYnV0IGlmIHRoZXkgYXJlIGZhbHNlLCB0aGVuIHRoZSBkb2N1bWVudCBkZWZpbml0ZWx5IGlzIE5PVFxuICAgICAgICAvLyBpbiB0aGUgb3V0cHV0LiBTbyBpdCdzIHNhZmUgdG8gc2tpcCByZWNvbXB1dGUgaWYgbmVpdGhlciBiZWZvcmUgb3JcbiAgICAgICAgLy8gYWZ0ZXIgYXJlIHRydWUuKVxuICAgICAgICBpZiAoYmVmb3JlIHx8IGFmdGVyKSB7XG4gICAgICAgICAgcmVjb21wdXRlUWlkc1txaWRdID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChiZWZvcmUgJiYgIWFmdGVyKSB7XG4gICAgICAgIExvY2FsQ29sbGVjdGlvbi5fcmVtb3ZlRnJvbVJlc3VsdHNTeW5jKHF1ZXJ5LCBkb2MpO1xuICAgICAgfSBlbHNlIGlmICghYmVmb3JlICYmIGFmdGVyKSB7XG4gICAgICAgIExvY2FsQ29sbGVjdGlvbi5faW5zZXJ0SW5SZXN1bHRzU3luYyhxdWVyeSwgZG9jKTtcbiAgICAgIH0gZWxzZSBpZiAoYmVmb3JlICYmIGFmdGVyKSB7XG4gICAgICAgIExvY2FsQ29sbGVjdGlvbi5fdXBkYXRlSW5SZXN1bHRzU3luYyhxdWVyeSwgZG9jLCBvbGRfZG9jKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlY29tcHV0ZVFpZHM7XG4gIH1cblxuICBhc3luYyBfbW9kaWZ5QW5kTm90aWZ5QXN5bmMoZG9jLCBtb2QsIGFycmF5SW5kaWNlcykge1xuXG4gICAgY29uc3QgbWF0Y2hlZF9iZWZvcmUgPSB0aGlzLl9nZXRNYXRjaGVkRG9jQW5kTW9kaWZ5KGRvYywgbW9kLCBhcnJheUluZGljZXMpO1xuXG4gICAgY29uc3Qgb2xkX2RvYyA9IEVKU09OLmNsb25lKGRvYyk7XG4gICAgTG9jYWxDb2xsZWN0aW9uLl9tb2RpZnkoZG9jLCBtb2QsIHthcnJheUluZGljZXN9KTtcblxuICAgIGNvbnN0IHJlY29tcHV0ZVFpZHMgPSB7fTtcbiAgICBmb3IgKGNvbnN0IHFpZCBvZiBPYmplY3Qua2V5cyh0aGlzLnF1ZXJpZXMpKSB7XG4gICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1txaWRdO1xuXG4gICAgICBpZiAocXVlcnkuZGlydHkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGFmdGVyTWF0Y2ggPSBxdWVyeS5tYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyhkb2MpO1xuICAgICAgY29uc3QgYWZ0ZXIgPSBhZnRlck1hdGNoLnJlc3VsdDtcbiAgICAgIGNvbnN0IGJlZm9yZSA9IG1hdGNoZWRfYmVmb3JlW3FpZF07XG5cbiAgICAgIGlmIChhZnRlciAmJiBxdWVyeS5kaXN0YW5jZXMgJiYgYWZ0ZXJNYXRjaC5kaXN0YW5jZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHF1ZXJ5LmRpc3RhbmNlcy5zZXQoZG9jLl9pZCwgYWZ0ZXJNYXRjaC5kaXN0YW5jZSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChxdWVyeS5jdXJzb3Iuc2tpcCB8fCBxdWVyeS5jdXJzb3IubGltaXQpIHtcbiAgICAgICAgLy8gV2UgbmVlZCB0byByZWNvbXB1dGUgYW55IHF1ZXJ5IHdoZXJlIHRoZSBkb2MgbWF5IGhhdmUgYmVlbiBpbiB0aGVcbiAgICAgICAgLy8gY3Vyc29yJ3Mgd2luZG93IGVpdGhlciBiZWZvcmUgb3IgYWZ0ZXIgdGhlIHVwZGF0ZS4gKE5vdGUgdGhhdCBpZiBza2lwXG4gICAgICAgIC8vIG9yIGxpbWl0IGlzIHNldCwgXCJiZWZvcmVcIiBhbmQgXCJhZnRlclwiIGJlaW5nIHRydWUgZG8gbm90IG5lY2Vzc2FyaWx5XG4gICAgICAgIC8vIG1lYW4gdGhhdCB0aGUgZG9jdW1lbnQgaXMgaW4gdGhlIGN1cnNvcidzIG91dHB1dCBhZnRlciBza2lwL2xpbWl0IGlzXG4gICAgICAgIC8vIGFwcGxpZWQuLi4gYnV0IGlmIHRoZXkgYXJlIGZhbHNlLCB0aGVuIHRoZSBkb2N1bWVudCBkZWZpbml0ZWx5IGlzIE5PVFxuICAgICAgICAvLyBpbiB0aGUgb3V0cHV0LiBTbyBpdCdzIHNhZmUgdG8gc2tpcCByZWNvbXB1dGUgaWYgbmVpdGhlciBiZWZvcmUgb3JcbiAgICAgICAgLy8gYWZ0ZXIgYXJlIHRydWUuKVxuICAgICAgICBpZiAoYmVmb3JlIHx8IGFmdGVyKSB7XG4gICAgICAgICAgcmVjb21wdXRlUWlkc1txaWRdID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChiZWZvcmUgJiYgIWFmdGVyKSB7XG4gICAgICAgIGF3YWl0IExvY2FsQ29sbGVjdGlvbi5fcmVtb3ZlRnJvbVJlc3VsdHNBc3luYyhxdWVyeSwgZG9jKTtcbiAgICAgIH0gZWxzZSBpZiAoIWJlZm9yZSAmJiBhZnRlcikge1xuICAgICAgICBhd2FpdCBMb2NhbENvbGxlY3Rpb24uX2luc2VydEluUmVzdWx0c0FzeW5jKHF1ZXJ5LCBkb2MpO1xuICAgICAgfSBlbHNlIGlmIChiZWZvcmUgJiYgYWZ0ZXIpIHtcbiAgICAgICAgYXdhaXQgTG9jYWxDb2xsZWN0aW9uLl91cGRhdGVJblJlc3VsdHNBc3luYyhxdWVyeSwgZG9jLCBvbGRfZG9jKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlY29tcHV0ZVFpZHM7XG4gIH1cblxuICAvLyBSZWNvbXB1dGVzIHRoZSByZXN1bHRzIG9mIGEgcXVlcnkgYW5kIHJ1bnMgb2JzZXJ2ZSBjYWxsYmFja3MgZm9yIHRoZVxuICAvLyBkaWZmZXJlbmNlIGJldHdlZW4gdGhlIHByZXZpb3VzIHJlc3VsdHMgYW5kIHRoZSBjdXJyZW50IHJlc3VsdHMgKHVubGVzc1xuICAvLyBwYXVzZWQpLiBVc2VkIGZvciBza2lwL2xpbWl0IHF1ZXJpZXMuXG4gIC8vXG4gIC8vIFdoZW4gdGhpcyBpcyB1c2VkIGJ5IGluc2VydCBvciByZW1vdmUsIGl0IGNhbiBqdXN0IHVzZSBxdWVyeS5yZXN1bHRzIGZvclxuICAvLyB0aGUgb2xkIHJlc3VsdHMgKGFuZCB0aGVyZSdzIG5vIG5lZWQgdG8gcGFzcyBpbiBvbGRSZXN1bHRzKSwgYmVjYXVzZSB0aGVzZVxuICAvLyBvcGVyYXRpb25zIGRvbid0IG11dGF0ZSB0aGUgZG9jdW1lbnRzIGluIHRoZSBjb2xsZWN0aW9uLiBVcGRhdGUgbmVlZHMgdG9cbiAgLy8gcGFzcyBpbiBhbiBvbGRSZXN1bHRzIHdoaWNoIHdhcyBkZWVwLWNvcGllZCBiZWZvcmUgdGhlIG1vZGlmaWVyIHdhc1xuICAvLyBhcHBsaWVkLlxuICAvL1xuICAvLyBvbGRSZXN1bHRzIGlzIGd1YXJhbnRlZWQgdG8gYmUgaWdub3JlZCBpZiB0aGUgcXVlcnkgaXMgbm90IHBhdXNlZC5cbiAgX3JlY29tcHV0ZVJlc3VsdHMocXVlcnksIG9sZFJlc3VsdHMpIHtcbiAgICBpZiAodGhpcy5wYXVzZWQpIHtcbiAgICAgIC8vIFRoZXJlJ3Mgbm8gcmVhc29uIHRvIHJlY29tcHV0ZSB0aGUgcmVzdWx0cyBub3cgYXMgd2UncmUgc3RpbGwgcGF1c2VkLlxuICAgICAgLy8gQnkgZmxhZ2dpbmcgdGhlIHF1ZXJ5IGFzIFwiZGlydHlcIiwgdGhlIHJlY29tcHV0ZSB3aWxsIGJlIHBlcmZvcm1lZFxuICAgICAgLy8gd2hlbiByZXN1bWVPYnNlcnZlcnMgaXMgY2FsbGVkLlxuICAgICAgcXVlcnkuZGlydHkgPSB0cnVlO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5wYXVzZWQgJiYgIW9sZFJlc3VsdHMpIHtcbiAgICAgIG9sZFJlc3VsdHMgPSBxdWVyeS5yZXN1bHRzO1xuICAgIH1cblxuICAgIGlmIChxdWVyeS5kaXN0YW5jZXMpIHtcbiAgICAgIHF1ZXJ5LmRpc3RhbmNlcy5jbGVhcigpO1xuICAgIH1cblxuICAgIHF1ZXJ5LnJlc3VsdHMgPSBxdWVyeS5jdXJzb3IuX2dldFJhd09iamVjdHMoe1xuICAgICAgZGlzdGFuY2VzOiBxdWVyeS5kaXN0YW5jZXMsXG4gICAgICBvcmRlcmVkOiBxdWVyeS5vcmRlcmVkXG4gICAgfSk7XG5cbiAgICBpZiAoIXRoaXMucGF1c2VkKSB7XG4gICAgICBMb2NhbENvbGxlY3Rpb24uX2RpZmZRdWVyeUNoYW5nZXMoXG4gICAgICAgIHF1ZXJ5Lm9yZGVyZWQsXG4gICAgICAgIG9sZFJlc3VsdHMsXG4gICAgICAgIHF1ZXJ5LnJlc3VsdHMsXG4gICAgICAgIHF1ZXJ5LFxuICAgICAgICB7cHJvamVjdGlvbkZuOiBxdWVyeS5wcm9qZWN0aW9uRm59XG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIF9zYXZlT3JpZ2luYWwoaWQsIGRvYykge1xuICAgIC8vIEFyZSB3ZSBldmVuIHRyeWluZyB0byBzYXZlIG9yaWdpbmFscz9cbiAgICBpZiAoIXRoaXMuX3NhdmVkT3JpZ2luYWxzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSGF2ZSB3ZSBwcmV2aW91c2x5IG11dGF0ZWQgdGhlIG9yaWdpbmFsIChhbmQgc28gJ2RvYycgaXMgbm90IGFjdHVhbGx5XG4gICAgLy8gb3JpZ2luYWwpPyAgKE5vdGUgdGhlICdoYXMnIGNoZWNrIHJhdGhlciB0aGFuIHRydXRoOiB3ZSBzdG9yZSB1bmRlZmluZWRcbiAgICAvLyBoZXJlIGZvciBpbnNlcnRlZCBkb2NzISlcbiAgICBpZiAodGhpcy5fc2F2ZWRPcmlnaW5hbHMuaGFzKGlkKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuX3NhdmVkT3JpZ2luYWxzLnNldChpZCwgRUpTT04uY2xvbmUoZG9jKSk7XG4gIH1cbn1cblxuTG9jYWxDb2xsZWN0aW9uLkN1cnNvciA9IEN1cnNvcjtcblxuTG9jYWxDb2xsZWN0aW9uLk9ic2VydmVIYW5kbGUgPSBPYnNlcnZlSGFuZGxlO1xuXG4vLyBYWFggbWF5YmUgbW92ZSB0aGVzZSBpbnRvIGFub3RoZXIgT2JzZXJ2ZUhlbHBlcnMgcGFja2FnZSBvciBzb21ldGhpbmdcblxuLy8gX0NhY2hpbmdDaGFuZ2VPYnNlcnZlciBpcyBhbiBvYmplY3Qgd2hpY2ggcmVjZWl2ZXMgb2JzZXJ2ZUNoYW5nZXMgY2FsbGJhY2tzXG4vLyBhbmQga2VlcHMgYSBjYWNoZSBvZiB0aGUgY3VycmVudCBjdXJzb3Igc3RhdGUgdXAgdG8gZGF0ZSBpbiB0aGlzLmRvY3MuIFVzZXJzXG4vLyBvZiB0aGlzIGNsYXNzIHNob3VsZCByZWFkIHRoZSBkb2NzIGZpZWxkIGJ1dCBub3QgbW9kaWZ5IGl0LiBZb3Ugc2hvdWxkIHBhc3Ncbi8vIHRoZSBcImFwcGx5Q2hhbmdlXCIgZmllbGQgYXMgdGhlIGNhbGxiYWNrcyB0byB0aGUgdW5kZXJseWluZyBvYnNlcnZlQ2hhbmdlc1xuLy8gY2FsbC4gT3B0aW9uYWxseSwgeW91IGNhbiBzcGVjaWZ5IHlvdXIgb3duIG9ic2VydmVDaGFuZ2VzIGNhbGxiYWNrcyB3aGljaCBhcmVcbi8vIGludm9rZWQgaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBkb2NzIGZpZWxkIGlzIHVwZGF0ZWQ7IHRoaXMgb2JqZWN0IGlzIG1hZGVcbi8vIGF2YWlsYWJsZSBhcyBgdGhpc2AgdG8gdGhvc2UgY2FsbGJhY2tzLlxuTG9jYWxDb2xsZWN0aW9uLl9DYWNoaW5nQ2hhbmdlT2JzZXJ2ZXIgPSBjbGFzcyBfQ2FjaGluZ0NoYW5nZU9ic2VydmVyIHtcbiAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3Qgb3JkZXJlZEZyb21DYWxsYmFja3MgPSAoXG4gICAgICBvcHRpb25zLmNhbGxiYWNrcyAmJlxuICAgICAgTG9jYWxDb2xsZWN0aW9uLl9vYnNlcnZlQ2hhbmdlc0NhbGxiYWNrc0FyZU9yZGVyZWQob3B0aW9ucy5jYWxsYmFja3MpXG4gICAgKTtcblxuICAgIGlmIChoYXNPd24uY2FsbChvcHRpb25zLCAnb3JkZXJlZCcpKSB7XG4gICAgICB0aGlzLm9yZGVyZWQgPSBvcHRpb25zLm9yZGVyZWQ7XG5cbiAgICAgIGlmIChvcHRpb25zLmNhbGxiYWNrcyAmJiBvcHRpb25zLm9yZGVyZWQgIT09IG9yZGVyZWRGcm9tQ2FsbGJhY2tzKSB7XG4gICAgICAgIHRocm93IEVycm9yKCdvcmRlcmVkIG9wdGlvbiBkb2VzblxcJ3QgbWF0Y2ggY2FsbGJhY2tzJyk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChvcHRpb25zLmNhbGxiYWNrcykge1xuICAgICAgdGhpcy5vcmRlcmVkID0gb3JkZXJlZEZyb21DYWxsYmFja3M7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IEVycm9yKCdtdXN0IHByb3ZpZGUgb3JkZXJlZCBvciBjYWxsYmFja3MnKTtcbiAgICB9XG5cbiAgICBjb25zdCBjYWxsYmFja3MgPSBvcHRpb25zLmNhbGxiYWNrcyB8fCB7fTtcblxuICAgIGlmICh0aGlzLm9yZGVyZWQpIHtcbiAgICAgIHRoaXMuZG9jcyA9IG5ldyBPcmRlcmVkRGljdChNb25nb0lELmlkU3RyaW5naWZ5KTtcbiAgICAgIHRoaXMuYXBwbHlDaGFuZ2UgPSB7XG4gICAgICAgIGFkZGVkQmVmb3JlOiAoaWQsIGZpZWxkcywgYmVmb3JlKSA9PiB7XG4gICAgICAgICAgLy8gVGFrZSBhIHNoYWxsb3cgY29weSBzaW5jZSB0aGUgdG9wLWxldmVsIHByb3BlcnRpZXMgY2FuIGJlIGNoYW5nZWRcbiAgICAgICAgICBjb25zdCBkb2MgPSB7IC4uLmZpZWxkcyB9O1xuXG4gICAgICAgICAgZG9jLl9pZCA9IGlkO1xuXG4gICAgICAgICAgaWYgKGNhbGxiYWNrcy5hZGRlZEJlZm9yZSkge1xuICAgICAgICAgICAgY2FsbGJhY2tzLmFkZGVkQmVmb3JlLmNhbGwodGhpcywgaWQsIEVKU09OLmNsb25lKGZpZWxkcyksIGJlZm9yZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gVGhpcyBsaW5lIHRyaWdnZXJzIGlmIHdlIHByb3ZpZGUgYWRkZWQgd2l0aCBtb3ZlZEJlZm9yZS5cbiAgICAgICAgICBpZiAoY2FsbGJhY2tzLmFkZGVkKSB7XG4gICAgICAgICAgICBjYWxsYmFja3MuYWRkZWQuY2FsbCh0aGlzLCBpZCwgRUpTT04uY2xvbmUoZmllbGRzKSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gWFhYIGNvdWxkIGBiZWZvcmVgIGJlIGEgZmFsc3kgSUQ/ICBUZWNobmljYWxseVxuICAgICAgICAgIC8vIGlkU3RyaW5naWZ5IHNlZW1zIHRvIGFsbG93IGZvciB0aGVtIC0tIHRob3VnaFxuICAgICAgICAgIC8vIE9yZGVyZWREaWN0IHdvbid0IGNhbGwgc3RyaW5naWZ5IG9uIGEgZmFsc3kgYXJnLlxuICAgICAgICAgIHRoaXMuZG9jcy5wdXRCZWZvcmUoaWQsIGRvYywgYmVmb3JlIHx8IG51bGwpO1xuICAgICAgICB9LFxuICAgICAgICBtb3ZlZEJlZm9yZTogKGlkLCBiZWZvcmUpID0+IHtcbiAgICAgICAgICBpZiAoY2FsbGJhY2tzLm1vdmVkQmVmb3JlKSB7XG4gICAgICAgICAgICBjYWxsYmFja3MubW92ZWRCZWZvcmUuY2FsbCh0aGlzLCBpZCwgYmVmb3JlKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLmRvY3MubW92ZUJlZm9yZShpZCwgYmVmb3JlIHx8IG51bGwpO1xuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5kb2NzID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gICAgICB0aGlzLmFwcGx5Q2hhbmdlID0ge1xuICAgICAgICBhZGRlZDogKGlkLCBmaWVsZHMpID0+IHtcbiAgICAgICAgICAvLyBUYWtlIGEgc2hhbGxvdyBjb3B5IHNpbmNlIHRoZSB0b3AtbGV2ZWwgcHJvcGVydGllcyBjYW4gYmUgY2hhbmdlZFxuICAgICAgICAgIGNvbnN0IGRvYyA9IHsgLi4uZmllbGRzIH07XG5cbiAgICAgICAgICBpZiAoY2FsbGJhY2tzLmFkZGVkKSB7XG4gICAgICAgICAgICBjYWxsYmFja3MuYWRkZWQuY2FsbCh0aGlzLCBpZCwgRUpTT04uY2xvbmUoZmllbGRzKSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZG9jLl9pZCA9IGlkO1xuXG4gICAgICAgICAgdGhpcy5kb2NzLnNldChpZCwgIGRvYyk7XG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIFRoZSBtZXRob2RzIGluIF9JZE1hcCBhbmQgT3JkZXJlZERpY3QgdXNlZCBieSB0aGVzZSBjYWxsYmFja3MgYXJlXG4gICAgLy8gaWRlbnRpY2FsLlxuICAgIHRoaXMuYXBwbHlDaGFuZ2UuY2hhbmdlZCA9IChpZCwgZmllbGRzKSA9PiB7XG4gICAgICBjb25zdCBkb2MgPSB0aGlzLmRvY3MuZ2V0KGlkKTtcblxuICAgICAgaWYgKCFkb2MpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGlkIGZvciBjaGFuZ2VkOiAke2lkfWApO1xuICAgICAgfVxuXG4gICAgICBpZiAoY2FsbGJhY2tzLmNoYW5nZWQpIHtcbiAgICAgICAgY2FsbGJhY2tzLmNoYW5nZWQuY2FsbCh0aGlzLCBpZCwgRUpTT04uY2xvbmUoZmllbGRzKSk7XG4gICAgICB9XG5cbiAgICAgIERpZmZTZXF1ZW5jZS5hcHBseUNoYW5nZXMoZG9jLCBmaWVsZHMpO1xuICAgIH07XG5cbiAgICB0aGlzLmFwcGx5Q2hhbmdlLnJlbW92ZWQgPSBpZCA9PiB7XG4gICAgICBpZiAoY2FsbGJhY2tzLnJlbW92ZWQpIHtcbiAgICAgICAgY2FsbGJhY2tzLnJlbW92ZWQuY2FsbCh0aGlzLCBpZCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuZG9jcy5yZW1vdmUoaWQpO1xuICAgIH07XG4gIH1cbn07XG5cbkxvY2FsQ29sbGVjdGlvbi5fSWRNYXAgPSBjbGFzcyBfSWRNYXAgZXh0ZW5kcyBJZE1hcCB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKE1vbmdvSUQuaWRTdHJpbmdpZnksIE1vbmdvSUQuaWRQYXJzZSk7XG4gIH1cbn07XG5cbi8vIFdyYXAgYSB0cmFuc2Zvcm0gZnVuY3Rpb24gdG8gcmV0dXJuIG9iamVjdHMgdGhhdCBoYXZlIHRoZSBfaWQgZmllbGRcbi8vIG9mIHRoZSB1bnRyYW5zZm9ybWVkIGRvY3VtZW50LiBUaGlzIGVuc3VyZXMgdGhhdCBzdWJzeXN0ZW1zIHN1Y2ggYXNcbi8vIHRoZSBvYnNlcnZlLXNlcXVlbmNlIHBhY2thZ2UgdGhhdCBjYWxsIGBvYnNlcnZlYCBjYW4ga2VlcCB0cmFjayBvZlxuLy8gdGhlIGRvY3VtZW50cyBpZGVudGl0aWVzLlxuLy9cbi8vIC0gUmVxdWlyZSB0aGF0IGl0IHJldHVybnMgb2JqZWN0c1xuLy8gLSBJZiB0aGUgcmV0dXJuIHZhbHVlIGhhcyBhbiBfaWQgZmllbGQsIHZlcmlmeSB0aGF0IGl0IG1hdGNoZXMgdGhlXG4vLyAgIG9yaWdpbmFsIF9pZCBmaWVsZFxuLy8gLSBJZiB0aGUgcmV0dXJuIHZhbHVlIGRvZXNuJ3QgaGF2ZSBhbiBfaWQgZmllbGQsIGFkZCBpdCBiYWNrLlxuTG9jYWxDb2xsZWN0aW9uLndyYXBUcmFuc2Zvcm0gPSB0cmFuc2Zvcm0gPT4ge1xuICBpZiAoIXRyYW5zZm9ybSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gTm8gbmVlZCB0byBkb3VibHktd3JhcCB0cmFuc2Zvcm1zLlxuICBpZiAodHJhbnNmb3JtLl9fd3JhcHBlZFRyYW5zZm9ybV9fKSB7XG4gICAgcmV0dXJuIHRyYW5zZm9ybTtcbiAgfVxuXG4gIGNvbnN0IHdyYXBwZWQgPSBkb2MgPT4ge1xuICAgIGlmICghaGFzT3duLmNhbGwoZG9jLCAnX2lkJykpIHtcbiAgICAgIC8vIFhYWCBkbyB3ZSBldmVyIGhhdmUgYSB0cmFuc2Zvcm0gb24gdGhlIG9wbG9nJ3MgY29sbGVjdGlvbj8gYmVjYXVzZSB0aGF0XG4gICAgICAvLyBjb2xsZWN0aW9uIGhhcyBubyBfaWQuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NhbiBvbmx5IHRyYW5zZm9ybSBkb2N1bWVudHMgd2l0aCBfaWQnKTtcbiAgICB9XG5cbiAgICBjb25zdCBpZCA9IGRvYy5faWQ7XG5cbiAgICAvLyBYWFggY29uc2lkZXIgbWFraW5nIHRyYWNrZXIgYSB3ZWFrIGRlcGVuZGVuY3kgYW5kIGNoZWNraW5nXG4gICAgLy8gUGFja2FnZS50cmFja2VyIGhlcmVcbiAgICBjb25zdCB0cmFuc2Zvcm1lZCA9IFRyYWNrZXIubm9ucmVhY3RpdmUoKCkgPT4gdHJhbnNmb3JtKGRvYykpO1xuXG4gICAgaWYgKCFMb2NhbENvbGxlY3Rpb24uX2lzUGxhaW5PYmplY3QodHJhbnNmb3JtZWQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3RyYW5zZm9ybSBtdXN0IHJldHVybiBvYmplY3QnKTtcbiAgICB9XG5cbiAgICBpZiAoaGFzT3duLmNhbGwodHJhbnNmb3JtZWQsICdfaWQnKSkge1xuICAgICAgaWYgKCFFSlNPTi5lcXVhbHModHJhbnNmb3JtZWQuX2lkLCBpZCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd0cmFuc2Zvcm1lZCBkb2N1bWVudCBjYW5cXCd0IGhhdmUgZGlmZmVyZW50IF9pZCcpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0cmFuc2Zvcm1lZC5faWQgPSBpZDtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJhbnNmb3JtZWQ7XG4gIH07XG5cbiAgd3JhcHBlZC5fX3dyYXBwZWRUcmFuc2Zvcm1fXyA9IHRydWU7XG5cbiAgcmV0dXJuIHdyYXBwZWQ7XG59O1xuXG4vLyBYWFggdGhlIHNvcnRlZC1xdWVyeSBsb2dpYyBiZWxvdyBpcyBsYXVnaGFibHkgaW5lZmZpY2llbnQuIHdlJ2xsXG4vLyBuZWVkIHRvIGNvbWUgdXAgd2l0aCBhIGJldHRlciBkYXRhc3RydWN0dXJlIGZvciB0aGlzLlxuLy9cbi8vIFhYWCB0aGUgbG9naWMgZm9yIG9ic2VydmluZyB3aXRoIGEgc2tpcCBvciBhIGxpbWl0IGlzIGV2ZW4gbW9yZVxuLy8gbGF1Z2hhYmx5IGluZWZmaWNpZW50LiB3ZSByZWNvbXB1dGUgdGhlIHdob2xlIHJlc3VsdHMgZXZlcnkgdGltZSFcblxuLy8gVGhpcyBiaW5hcnkgc2VhcmNoIHB1dHMgYSB2YWx1ZSBiZXR3ZWVuIGFueSBlcXVhbCB2YWx1ZXMsIGFuZCB0aGUgZmlyc3Rcbi8vIGxlc3NlciB2YWx1ZS5cbkxvY2FsQ29sbGVjdGlvbi5fYmluYXJ5U2VhcmNoID0gKGNtcCwgYXJyYXksIHZhbHVlKSA9PiB7XG4gIGxldCBmaXJzdCA9IDA7XG4gIGxldCByYW5nZSA9IGFycmF5Lmxlbmd0aDtcblxuICB3aGlsZSAocmFuZ2UgPiAwKSB7XG4gICAgY29uc3QgaGFsZlJhbmdlID0gTWF0aC5mbG9vcihyYW5nZSAvIDIpO1xuXG4gICAgaWYgKGNtcCh2YWx1ZSwgYXJyYXlbZmlyc3QgKyBoYWxmUmFuZ2VdKSA+PSAwKSB7XG4gICAgICBmaXJzdCArPSBoYWxmUmFuZ2UgKyAxO1xuICAgICAgcmFuZ2UgLT0gaGFsZlJhbmdlICsgMTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmFuZ2UgPSBoYWxmUmFuZ2U7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZpcnN0O1xufTtcblxuTG9jYWxDb2xsZWN0aW9uLl9jaGVja1N1cHBvcnRlZFByb2plY3Rpb24gPSBmaWVsZHMgPT4ge1xuICBpZiAoZmllbGRzICE9PSBPYmplY3QoZmllbGRzKSB8fCBBcnJheS5pc0FycmF5KGZpZWxkcykpIHtcbiAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignZmllbGRzIG9wdGlvbiBtdXN0IGJlIGFuIG9iamVjdCcpO1xuICB9XG5cbiAgT2JqZWN0LmtleXMoZmllbGRzKS5mb3JFYWNoKGtleVBhdGggPT4ge1xuICAgIGlmIChrZXlQYXRoLnNwbGl0KCcuJykuaW5jbHVkZXMoJyQnKSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICdNaW5pbW9uZ28gZG9lc25cXCd0IHN1cHBvcnQgJCBvcGVyYXRvciBpbiBwcm9qZWN0aW9ucyB5ZXQuJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICBjb25zdCB2YWx1ZSA9IGZpZWxkc1trZXlQYXRoXTtcblxuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmXG4gICAgICAgIFsnJGVsZW1NYXRjaCcsICckbWV0YScsICckc2xpY2UnXS5zb21lKGtleSA9PlxuICAgICAgICAgIGhhc093bi5jYWxsKHZhbHVlLCBrZXkpXG4gICAgICAgICkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAnTWluaW1vbmdvIGRvZXNuXFwndCBzdXBwb3J0IG9wZXJhdG9ycyBpbiBwcm9qZWN0aW9ucyB5ZXQuJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAoIVsxLCAwLCB0cnVlLCBmYWxzZV0uaW5jbHVkZXModmFsdWUpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgJ1Byb2plY3Rpb24gdmFsdWVzIHNob3VsZCBiZSBvbmUgb2YgMSwgMCwgdHJ1ZSwgb3IgZmFsc2UnXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG59O1xuXG4vLyBLbm93cyBob3cgdG8gY29tcGlsZSBhIGZpZWxkcyBwcm9qZWN0aW9uIHRvIGEgcHJlZGljYXRlIGZ1bmN0aW9uLlxuLy8gQHJldHVybnMgLSBGdW5jdGlvbjogYSBjbG9zdXJlIHRoYXQgZmlsdGVycyBvdXQgYW4gb2JqZWN0IGFjY29yZGluZyB0byB0aGVcbi8vICAgICAgICAgICAgZmllbGRzIHByb2plY3Rpb24gcnVsZXM6XG4vLyAgICAgICAgICAgIEBwYXJhbSBvYmogLSBPYmplY3Q6IE1vbmdvREItc3R5bGVkIGRvY3VtZW50XG4vLyAgICAgICAgICAgIEByZXR1cm5zIC0gT2JqZWN0OiBhIGRvY3VtZW50IHdpdGggdGhlIGZpZWxkcyBmaWx0ZXJlZCBvdXRcbi8vICAgICAgICAgICAgICAgICAgICAgICBhY2NvcmRpbmcgdG8gcHJvamVjdGlvbiBydWxlcy4gRG9lc24ndCByZXRhaW4gc3ViZmllbGRzXG4vLyAgICAgICAgICAgICAgICAgICAgICAgb2YgcGFzc2VkIGFyZ3VtZW50LlxuTG9jYWxDb2xsZWN0aW9uLl9jb21waWxlUHJvamVjdGlvbiA9IGZpZWxkcyA9PiB7XG4gIExvY2FsQ29sbGVjdGlvbi5fY2hlY2tTdXBwb3J0ZWRQcm9qZWN0aW9uKGZpZWxkcyk7XG5cbiAgY29uc3QgX2lkUHJvamVjdGlvbiA9IGZpZWxkcy5faWQgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBmaWVsZHMuX2lkO1xuICBjb25zdCBkZXRhaWxzID0gcHJvamVjdGlvbkRldGFpbHMoZmllbGRzKTtcblxuICAvLyByZXR1cm5zIHRyYW5zZm9ybWVkIGRvYyBhY2NvcmRpbmcgdG8gcnVsZVRyZWVcbiAgY29uc3QgdHJhbnNmb3JtID0gKGRvYywgcnVsZVRyZWUpID0+IHtcbiAgICAvLyBTcGVjaWFsIGNhc2UgZm9yIFwic2V0c1wiXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZG9jKSkge1xuICAgICAgcmV0dXJuIGRvYy5tYXAoc3ViZG9jID0+IHRyYW5zZm9ybShzdWJkb2MsIHJ1bGVUcmVlKSk7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzdWx0ID0gZGV0YWlscy5pbmNsdWRpbmcgPyB7fSA6IEVKU09OLmNsb25lKGRvYyk7XG5cbiAgICBPYmplY3Qua2V5cyhydWxlVHJlZSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgaWYgKGRvYyA9PSBudWxsIHx8ICFoYXNPd24uY2FsbChkb2MsIGtleSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBydWxlID0gcnVsZVRyZWVba2V5XTtcblxuICAgICAgaWYgKHJ1bGUgPT09IE9iamVjdChydWxlKSkge1xuICAgICAgICAvLyBGb3Igc3ViLW9iamVjdHMvc3Vic2V0cyB3ZSBicmFuY2hcbiAgICAgICAgaWYgKGRvY1trZXldID09PSBPYmplY3QoZG9jW2tleV0pKSB7XG4gICAgICAgICAgcmVzdWx0W2tleV0gPSB0cmFuc2Zvcm0oZG9jW2tleV0sIHJ1bGUpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGRldGFpbHMuaW5jbHVkaW5nKSB7XG4gICAgICAgIC8vIE90aGVyd2lzZSB3ZSBkb24ndCBldmVuIHRvdWNoIHRoaXMgc3ViZmllbGRcbiAgICAgICAgcmVzdWx0W2tleV0gPSBFSlNPTi5jbG9uZShkb2Nba2V5XSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWxldGUgcmVzdWx0W2tleV07XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZG9jICE9IG51bGwgPyByZXN1bHQgOiBkb2M7XG4gIH07XG5cbiAgcmV0dXJuIGRvYyA9PiB7XG4gICAgY29uc3QgcmVzdWx0ID0gdHJhbnNmb3JtKGRvYywgZGV0YWlscy50cmVlKTtcblxuICAgIGlmIChfaWRQcm9qZWN0aW9uICYmIGhhc093bi5jYWxsKGRvYywgJ19pZCcpKSB7XG4gICAgICByZXN1bHQuX2lkID0gZG9jLl9pZDtcbiAgICB9XG5cbiAgICBpZiAoIV9pZFByb2plY3Rpb24gJiYgaGFzT3duLmNhbGwocmVzdWx0LCAnX2lkJykpIHtcbiAgICAgIGRlbGV0ZSByZXN1bHQuX2lkO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG59O1xuXG4vLyBDYWxjdWxhdGVzIHRoZSBkb2N1bWVudCB0byBpbnNlcnQgaW4gY2FzZSB3ZSdyZSBkb2luZyBhbiB1cHNlcnQgYW5kIHRoZVxuLy8gc2VsZWN0b3IgZG9lcyBub3QgbWF0Y2ggYW55IGVsZW1lbnRzXG5Mb2NhbENvbGxlY3Rpb24uX2NyZWF0ZVVwc2VydERvY3VtZW50ID0gKHNlbGVjdG9yLCBtb2RpZmllcikgPT4ge1xuICBjb25zdCBzZWxlY3RvckRvY3VtZW50ID0gcG9wdWxhdGVEb2N1bWVudFdpdGhRdWVyeUZpZWxkcyhzZWxlY3Rvcik7XG4gIGNvbnN0IGlzTW9kaWZ5ID0gTG9jYWxDb2xsZWN0aW9uLl9pc01vZGlmaWNhdGlvbk1vZChtb2RpZmllcik7XG5cbiAgY29uc3QgbmV3RG9jID0ge307XG5cbiAgaWYgKHNlbGVjdG9yRG9jdW1lbnQuX2lkKSB7XG4gICAgbmV3RG9jLl9pZCA9IHNlbGVjdG9yRG9jdW1lbnQuX2lkO1xuICAgIGRlbGV0ZSBzZWxlY3RvckRvY3VtZW50Ll9pZDtcbiAgfVxuXG4gIC8vIFRoaXMgZG91YmxlIF9tb2RpZnkgY2FsbCBpcyBtYWRlIHRvIGhlbHAgd2l0aCBuZXN0ZWQgcHJvcGVydGllcyAoc2VlIGlzc3VlXG4gIC8vICM4NjMxKS4gV2UgZG8gdGhpcyBldmVuIGlmIGl0J3MgYSByZXBsYWNlbWVudCBmb3IgdmFsaWRhdGlvbiBwdXJwb3NlcyAoZS5nLlxuICAvLyBhbWJpZ3VvdXMgaWQncylcbiAgTG9jYWxDb2xsZWN0aW9uLl9tb2RpZnkobmV3RG9jLCB7JHNldDogc2VsZWN0b3JEb2N1bWVudH0pO1xuICBMb2NhbENvbGxlY3Rpb24uX21vZGlmeShuZXdEb2MsIG1vZGlmaWVyLCB7aXNJbnNlcnQ6IHRydWV9KTtcblxuICBpZiAoaXNNb2RpZnkpIHtcbiAgICByZXR1cm4gbmV3RG9jO1xuICB9XG5cbiAgLy8gUmVwbGFjZW1lbnQgY2FuIHRha2UgX2lkIGZyb20gcXVlcnkgZG9jdW1lbnRcbiAgY29uc3QgcmVwbGFjZW1lbnQgPSBPYmplY3QuYXNzaWduKHt9LCBtb2RpZmllcik7XG4gIGlmIChuZXdEb2MuX2lkKSB7XG4gICAgcmVwbGFjZW1lbnQuX2lkID0gbmV3RG9jLl9pZDtcbiAgfVxuXG4gIHJldHVybiByZXBsYWNlbWVudDtcbn07XG5cbkxvY2FsQ29sbGVjdGlvbi5fZGlmZk9iamVjdHMgPSAobGVmdCwgcmlnaHQsIGNhbGxiYWNrcykgPT4ge1xuICByZXR1cm4gRGlmZlNlcXVlbmNlLmRpZmZPYmplY3RzKGxlZnQsIHJpZ2h0LCBjYWxsYmFja3MpO1xufTtcblxuLy8gb3JkZXJlZDogYm9vbC5cbi8vIG9sZF9yZXN1bHRzIGFuZCBuZXdfcmVzdWx0czogY29sbGVjdGlvbnMgb2YgZG9jdW1lbnRzLlxuLy8gICAgaWYgb3JkZXJlZCwgdGhleSBhcmUgYXJyYXlzLlxuLy8gICAgaWYgdW5vcmRlcmVkLCB0aGV5IGFyZSBJZE1hcHNcbkxvY2FsQ29sbGVjdGlvbi5fZGlmZlF1ZXJ5Q2hhbmdlcyA9IChvcmRlcmVkLCBvbGRSZXN1bHRzLCBuZXdSZXN1bHRzLCBvYnNlcnZlciwgb3B0aW9ucykgPT5cbiAgRGlmZlNlcXVlbmNlLmRpZmZRdWVyeUNoYW5nZXMob3JkZXJlZCwgb2xkUmVzdWx0cywgbmV3UmVzdWx0cywgb2JzZXJ2ZXIsIG9wdGlvbnMpXG47XG5cbkxvY2FsQ29sbGVjdGlvbi5fZGlmZlF1ZXJ5T3JkZXJlZENoYW5nZXMgPSAob2xkUmVzdWx0cywgbmV3UmVzdWx0cywgb2JzZXJ2ZXIsIG9wdGlvbnMpID0+XG4gIERpZmZTZXF1ZW5jZS5kaWZmUXVlcnlPcmRlcmVkQ2hhbmdlcyhvbGRSZXN1bHRzLCBuZXdSZXN1bHRzLCBvYnNlcnZlciwgb3B0aW9ucylcbjtcblxuTG9jYWxDb2xsZWN0aW9uLl9kaWZmUXVlcnlVbm9yZGVyZWRDaGFuZ2VzID0gKG9sZFJlc3VsdHMsIG5ld1Jlc3VsdHMsIG9ic2VydmVyLCBvcHRpb25zKSA9PlxuICBEaWZmU2VxdWVuY2UuZGlmZlF1ZXJ5VW5vcmRlcmVkQ2hhbmdlcyhvbGRSZXN1bHRzLCBuZXdSZXN1bHRzLCBvYnNlcnZlciwgb3B0aW9ucylcbjtcblxuTG9jYWxDb2xsZWN0aW9uLl9maW5kSW5PcmRlcmVkUmVzdWx0cyA9IChxdWVyeSwgZG9jKSA9PiB7XG4gIGlmICghcXVlcnkub3JkZXJlZCkge1xuICAgIHRocm93IG5ldyBFcnJvcignQ2FuXFwndCBjYWxsIF9maW5kSW5PcmRlcmVkUmVzdWx0cyBvbiB1bm9yZGVyZWQgcXVlcnknKTtcbiAgfVxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcXVlcnkucmVzdWx0cy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChxdWVyeS5yZXN1bHRzW2ldID09PSBkb2MpIHtcbiAgICAgIHJldHVybiBpO1xuICAgIH1cbiAgfVxuXG4gIHRocm93IEVycm9yKCdvYmplY3QgbWlzc2luZyBmcm9tIHF1ZXJ5Jyk7XG59O1xuXG4vLyBJZiB0aGlzIGlzIGEgc2VsZWN0b3Igd2hpY2ggZXhwbGljaXRseSBjb25zdHJhaW5zIHRoZSBtYXRjaCBieSBJRCB0byBhIGZpbml0ZVxuLy8gbnVtYmVyIG9mIGRvY3VtZW50cywgcmV0dXJucyBhIGxpc3Qgb2YgdGhlaXIgSURzLiAgT3RoZXJ3aXNlIHJldHVybnNcbi8vIG51bGwuIE5vdGUgdGhhdCB0aGUgc2VsZWN0b3IgbWF5IGhhdmUgb3RoZXIgcmVzdHJpY3Rpb25zIHNvIGl0IG1heSBub3QgZXZlblxuLy8gbWF0Y2ggdGhvc2UgZG9jdW1lbnQhICBXZSBjYXJlIGFib3V0ICRpbiBhbmQgJGFuZCBzaW5jZSB0aG9zZSBhcmUgZ2VuZXJhdGVkXG4vLyBhY2Nlc3MtY29udHJvbGxlZCB1cGRhdGUgYW5kIHJlbW92ZS5cbkxvY2FsQ29sbGVjdGlvbi5faWRzTWF0Y2hlZEJ5U2VsZWN0b3IgPSBzZWxlY3RvciA9PiB7XG4gIC8vIElzIHRoZSBzZWxlY3RvciBqdXN0IGFuIElEP1xuICBpZiAoTG9jYWxDb2xsZWN0aW9uLl9zZWxlY3RvcklzSWQoc2VsZWN0b3IpKSB7XG4gICAgcmV0dXJuIFtzZWxlY3Rvcl07XG4gIH1cblxuICBpZiAoIXNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBEbyB3ZSBoYXZlIGFuIF9pZCBjbGF1c2U/XG4gIGlmIChoYXNPd24uY2FsbChzZWxlY3RvciwgJ19pZCcpKSB7XG4gICAgLy8gSXMgdGhlIF9pZCBjbGF1c2UganVzdCBhbiBJRD9cbiAgICBpZiAoTG9jYWxDb2xsZWN0aW9uLl9zZWxlY3RvcklzSWQoc2VsZWN0b3IuX2lkKSkge1xuICAgICAgcmV0dXJuIFtzZWxlY3Rvci5faWRdO1xuICAgIH1cblxuICAgIC8vIElzIHRoZSBfaWQgY2xhdXNlIHtfaWQ6IHskaW46IFtcInhcIiwgXCJ5XCIsIFwielwiXX19P1xuICAgIGlmIChzZWxlY3Rvci5faWRcbiAgICAgICAgJiYgQXJyYXkuaXNBcnJheShzZWxlY3Rvci5faWQuJGluKVxuICAgICAgICAmJiBzZWxlY3Rvci5faWQuJGluLmxlbmd0aFxuICAgICAgICAmJiBzZWxlY3Rvci5faWQuJGluLmV2ZXJ5KExvY2FsQ29sbGVjdGlvbi5fc2VsZWN0b3JJc0lkKSkge1xuICAgICAgcmV0dXJuIHNlbGVjdG9yLl9pZC4kaW47XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBJZiB0aGlzIGlzIGEgdG9wLWxldmVsICRhbmQsIGFuZCBhbnkgb2YgdGhlIGNsYXVzZXMgY29uc3RyYWluIHRoZWlyXG4gIC8vIGRvY3VtZW50cywgdGhlbiB0aGUgd2hvbGUgc2VsZWN0b3IgaXMgY29uc3RyYWluZWQgYnkgYW55IG9uZSBjbGF1c2Unc1xuICAvLyBjb25zdHJhaW50LiAoV2VsbCwgYnkgdGhlaXIgaW50ZXJzZWN0aW9uLCBidXQgdGhhdCBzZWVtcyB1bmxpa2VseS4pXG4gIGlmIChBcnJheS5pc0FycmF5KHNlbGVjdG9yLiRhbmQpKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzZWxlY3Rvci4kYW5kLmxlbmd0aDsgKytpKSB7XG4gICAgICBjb25zdCBzdWJJZHMgPSBMb2NhbENvbGxlY3Rpb24uX2lkc01hdGNoZWRCeVNlbGVjdG9yKHNlbGVjdG9yLiRhbmRbaV0pO1xuXG4gICAgICBpZiAoc3ViSWRzKSB7XG4gICAgICAgIHJldHVybiBzdWJJZHM7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59O1xuXG5Mb2NhbENvbGxlY3Rpb24uX2luc2VydEluUmVzdWx0c1N5bmMgPSAocXVlcnksIGRvYykgPT4ge1xuICBjb25zdCBmaWVsZHMgPSBFSlNPTi5jbG9uZShkb2MpO1xuXG4gIGRlbGV0ZSBmaWVsZHMuX2lkO1xuXG4gIGlmIChxdWVyeS5vcmRlcmVkKSB7XG4gICAgaWYgKCFxdWVyeS5zb3J0ZXIpIHtcbiAgICAgIHF1ZXJ5LmFkZGVkQmVmb3JlKGRvYy5faWQsIHF1ZXJ5LnByb2plY3Rpb25GbihmaWVsZHMpLCBudWxsKTtcbiAgICAgIHF1ZXJ5LnJlc3VsdHMucHVzaChkb2MpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBpID0gTG9jYWxDb2xsZWN0aW9uLl9pbnNlcnRJblNvcnRlZExpc3QoXG4gICAgICAgIHF1ZXJ5LnNvcnRlci5nZXRDb21wYXJhdG9yKHtkaXN0YW5jZXM6IHF1ZXJ5LmRpc3RhbmNlc30pLFxuICAgICAgICBxdWVyeS5yZXN1bHRzLFxuICAgICAgICBkb2NcbiAgICAgICk7XG5cbiAgICAgIGxldCBuZXh0ID0gcXVlcnkucmVzdWx0c1tpICsgMV07XG4gICAgICBpZiAobmV4dCkge1xuICAgICAgICBuZXh0ID0gbmV4dC5faWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXh0ID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcXVlcnkuYWRkZWRCZWZvcmUoZG9jLl9pZCwgcXVlcnkucHJvamVjdGlvbkZuKGZpZWxkcyksIG5leHQpO1xuICAgIH1cblxuICAgIHF1ZXJ5LmFkZGVkKGRvYy5faWQsIHF1ZXJ5LnByb2plY3Rpb25GbihmaWVsZHMpKTtcbiAgfSBlbHNlIHtcbiAgICBxdWVyeS5hZGRlZChkb2MuX2lkLCBxdWVyeS5wcm9qZWN0aW9uRm4oZmllbGRzKSk7XG4gICAgcXVlcnkucmVzdWx0cy5zZXQoZG9jLl9pZCwgZG9jKTtcbiAgfVxufTtcblxuTG9jYWxDb2xsZWN0aW9uLl9pbnNlcnRJblJlc3VsdHNBc3luYyA9IGFzeW5jIChxdWVyeSwgZG9jKSA9PiB7XG4gIGNvbnN0IGZpZWxkcyA9IEVKU09OLmNsb25lKGRvYyk7XG5cbiAgZGVsZXRlIGZpZWxkcy5faWQ7XG5cbiAgaWYgKHF1ZXJ5Lm9yZGVyZWQpIHtcbiAgICBpZiAoIXF1ZXJ5LnNvcnRlcikge1xuICAgICAgYXdhaXQgcXVlcnkuYWRkZWRCZWZvcmUoZG9jLl9pZCwgcXVlcnkucHJvamVjdGlvbkZuKGZpZWxkcyksIG51bGwpO1xuICAgICAgcXVlcnkucmVzdWx0cy5wdXNoKGRvYyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGkgPSBMb2NhbENvbGxlY3Rpb24uX2luc2VydEluU29ydGVkTGlzdChcbiAgICAgICAgcXVlcnkuc29ydGVyLmdldENvbXBhcmF0b3Ioe2Rpc3RhbmNlczogcXVlcnkuZGlzdGFuY2VzfSksXG4gICAgICAgIHF1ZXJ5LnJlc3VsdHMsXG4gICAgICAgIGRvY1xuICAgICAgKTtcblxuICAgICAgbGV0IG5leHQgPSBxdWVyeS5yZXN1bHRzW2kgKyAxXTtcbiAgICAgIGlmIChuZXh0KSB7XG4gICAgICAgIG5leHQgPSBuZXh0Ll9pZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5leHQgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICBhd2FpdCBxdWVyeS5hZGRlZEJlZm9yZShkb2MuX2lkLCBxdWVyeS5wcm9qZWN0aW9uRm4oZmllbGRzKSwgbmV4dCk7XG4gICAgfVxuXG4gICAgYXdhaXQgcXVlcnkuYWRkZWQoZG9jLl9pZCwgcXVlcnkucHJvamVjdGlvbkZuKGZpZWxkcykpO1xuICB9IGVsc2Uge1xuICAgIGF3YWl0IHF1ZXJ5LmFkZGVkKGRvYy5faWQsIHF1ZXJ5LnByb2plY3Rpb25GbihmaWVsZHMpKTtcbiAgICBxdWVyeS5yZXN1bHRzLnNldChkb2MuX2lkLCBkb2MpO1xuICB9XG59O1xuXG5Mb2NhbENvbGxlY3Rpb24uX2luc2VydEluU29ydGVkTGlzdCA9IChjbXAsIGFycmF5LCB2YWx1ZSkgPT4ge1xuICBpZiAoYXJyYXkubGVuZ3RoID09PSAwKSB7XG4gICAgYXJyYXkucHVzaCh2YWx1ZSk7XG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBjb25zdCBpID0gTG9jYWxDb2xsZWN0aW9uLl9iaW5hcnlTZWFyY2goY21wLCBhcnJheSwgdmFsdWUpO1xuXG4gIGFycmF5LnNwbGljZShpLCAwLCB2YWx1ZSk7XG5cbiAgcmV0dXJuIGk7XG59O1xuXG5Mb2NhbENvbGxlY3Rpb24uX2lzTW9kaWZpY2F0aW9uTW9kID0gbW9kID0+IHtcbiAgbGV0IGlzTW9kaWZ5ID0gZmFsc2U7XG4gIGxldCBpc1JlcGxhY2UgPSBmYWxzZTtcblxuICBPYmplY3Qua2V5cyhtb2QpLmZvckVhY2goa2V5ID0+IHtcbiAgICBpZiAoa2V5LnN1YnN0cigwLCAxKSA9PT0gJyQnKSB7XG4gICAgICBpc01vZGlmeSA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlzUmVwbGFjZSA9IHRydWU7XG4gICAgfVxuICB9KTtcblxuICBpZiAoaXNNb2RpZnkgJiYgaXNSZXBsYWNlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgJ1VwZGF0ZSBwYXJhbWV0ZXIgY2Fubm90IGhhdmUgYm90aCBtb2RpZmllciBhbmQgbm9uLW1vZGlmaWVyIGZpZWxkcy4nXG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiBpc01vZGlmeTtcbn07XG5cbi8vIFhYWCBtYXliZSB0aGlzIHNob3VsZCBiZSBFSlNPTi5pc09iamVjdCwgdGhvdWdoIEVKU09OIGRvZXNuJ3Qga25vdyBhYm91dFxuLy8gUmVnRXhwXG4vLyBYWFggbm90ZSB0aGF0IF90eXBlKHVuZGVmaW5lZCkgPT09IDMhISEhXG5Mb2NhbENvbGxlY3Rpb24uX2lzUGxhaW5PYmplY3QgPSB4ID0+IHtcbiAgcmV0dXJuIHggJiYgTG9jYWxDb2xsZWN0aW9uLl9mLl90eXBlKHgpID09PSAzO1xufTtcblxuLy8gWFhYIG5lZWQgYSBzdHJhdGVneSBmb3IgcGFzc2luZyB0aGUgYmluZGluZyBvZiAkIGludG8gdGhpc1xuLy8gZnVuY3Rpb24sIGZyb20gdGhlIGNvbXBpbGVkIHNlbGVjdG9yXG4vL1xuLy8gbWF5YmUganVzdCB7a2V5LnVwLnRvLmp1c3QuYmVmb3JlLmRvbGxhcnNpZ246IGFycmF5X2luZGV4fVxuLy9cbi8vIFhYWCBhdG9taWNpdHk6IGlmIG9uZSBtb2RpZmljYXRpb24gZmFpbHMsIGRvIHdlIHJvbGwgYmFjayB0aGUgd2hvbGVcbi8vIGNoYW5nZT9cbi8vXG4vLyBvcHRpb25zOlxuLy8gICAtIGlzSW5zZXJ0IGlzIHNldCB3aGVuIF9tb2RpZnkgaXMgYmVpbmcgY2FsbGVkIHRvIGNvbXB1dGUgdGhlIGRvY3VtZW50IHRvXG4vLyAgICAgaW5zZXJ0IGFzIHBhcnQgb2YgYW4gdXBzZXJ0IG9wZXJhdGlvbi4gV2UgdXNlIHRoaXMgcHJpbWFyaWx5IHRvIGZpZ3VyZVxuLy8gICAgIG91dCB3aGVuIHRvIHNldCB0aGUgZmllbGRzIGluICRzZXRPbkluc2VydCwgaWYgcHJlc2VudC5cbkxvY2FsQ29sbGVjdGlvbi5fbW9kaWZ5ID0gKGRvYywgbW9kaWZpZXIsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBpZiAoIUxvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdChtb2RpZmllcikpIHtcbiAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignTW9kaWZpZXIgbXVzdCBiZSBhbiBvYmplY3QnKTtcbiAgfVxuXG4gIC8vIE1ha2Ugc3VyZSB0aGUgY2FsbGVyIGNhbid0IG11dGF0ZSBvdXIgZGF0YSBzdHJ1Y3R1cmVzLlxuICBtb2RpZmllciA9IEVKU09OLmNsb25lKG1vZGlmaWVyKTtcblxuICBjb25zdCBpc01vZGlmaWVyID0gaXNPcGVyYXRvck9iamVjdChtb2RpZmllcik7XG4gIGNvbnN0IG5ld0RvYyA9IGlzTW9kaWZpZXIgPyBFSlNPTi5jbG9uZShkb2MpIDogbW9kaWZpZXI7XG5cbiAgaWYgKGlzTW9kaWZpZXIpIHtcbiAgICAvLyBhcHBseSBtb2RpZmllcnMgdG8gdGhlIGRvYy5cbiAgICBPYmplY3Qua2V5cyhtb2RpZmllcikuZm9yRWFjaChvcGVyYXRvciA9PiB7XG4gICAgICAvLyBUcmVhdCAkc2V0T25JbnNlcnQgYXMgJHNldCBpZiB0aGlzIGlzIGFuIGluc2VydC5cbiAgICAgIGNvbnN0IHNldE9uSW5zZXJ0ID0gb3B0aW9ucy5pc0luc2VydCAmJiBvcGVyYXRvciA9PT0gJyRzZXRPbkluc2VydCc7XG4gICAgICBjb25zdCBtb2RGdW5jID0gTU9ESUZJRVJTW3NldE9uSW5zZXJ0ID8gJyRzZXQnIDogb3BlcmF0b3JdO1xuICAgICAgY29uc3Qgb3BlcmFuZCA9IG1vZGlmaWVyW29wZXJhdG9yXTtcblxuICAgICAgaWYgKCFtb2RGdW5jKSB7XG4gICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKGBJbnZhbGlkIG1vZGlmaWVyIHNwZWNpZmllZCAke29wZXJhdG9yfWApO1xuICAgICAgfVxuXG4gICAgICBPYmplY3Qua2V5cyhvcGVyYW5kKS5mb3JFYWNoKGtleXBhdGggPT4ge1xuICAgICAgICBjb25zdCBhcmcgPSBvcGVyYW5kW2tleXBhdGhdO1xuXG4gICAgICAgIGlmIChrZXlwYXRoID09PSAnJykge1xuICAgICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCdBbiBlbXB0eSB1cGRhdGUgcGF0aCBpcyBub3QgdmFsaWQuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBrZXlwYXJ0cyA9IGtleXBhdGguc3BsaXQoJy4nKTtcblxuICAgICAgICBpZiAoIWtleXBhcnRzLmV2ZXJ5KEJvb2xlYW4pKSB7XG4gICAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICAgICBgVGhlIHVwZGF0ZSBwYXRoICcke2tleXBhdGh9JyBjb250YWlucyBhbiBlbXB0eSBmaWVsZCBuYW1lLCBgICtcbiAgICAgICAgICAgICd3aGljaCBpcyBub3QgYWxsb3dlZC4nXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHRhcmdldCA9IGZpbmRNb2RUYXJnZXQobmV3RG9jLCBrZXlwYXJ0cywge1xuICAgICAgICAgIGFycmF5SW5kaWNlczogb3B0aW9ucy5hcnJheUluZGljZXMsXG4gICAgICAgICAgZm9yYmlkQXJyYXk6IG9wZXJhdG9yID09PSAnJHJlbmFtZScsXG4gICAgICAgICAgbm9DcmVhdGU6IE5PX0NSRUFURV9NT0RJRklFUlNbb3BlcmF0b3JdXG4gICAgICAgIH0pO1xuXG4gICAgICAgIG1vZEZ1bmModGFyZ2V0LCBrZXlwYXJ0cy5wb3AoKSwgYXJnLCBrZXlwYXRoLCBuZXdEb2MpO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBpZiAoZG9jLl9pZCAmJiAhRUpTT04uZXF1YWxzKGRvYy5faWQsIG5ld0RvYy5faWQpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgYEFmdGVyIGFwcGx5aW5nIHRoZSB1cGRhdGUgdG8gdGhlIGRvY3VtZW50IHtfaWQ6IFwiJHtkb2MuX2lkfVwiLCAuLi59LGAgK1xuICAgICAgICAnIHRoZSAoaW1tdXRhYmxlKSBmaWVsZCBcXCdfaWRcXCcgd2FzIGZvdW5kIHRvIGhhdmUgYmVlbiBhbHRlcmVkIHRvICcgK1xuICAgICAgICBgX2lkOiBcIiR7bmV3RG9jLl9pZH1cImBcbiAgICAgICk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChkb2MuX2lkICYmIG1vZGlmaWVyLl9pZCAmJiAhRUpTT04uZXF1YWxzKGRvYy5faWQsIG1vZGlmaWVyLl9pZCkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICBgVGhlIF9pZCBmaWVsZCBjYW5ub3QgYmUgY2hhbmdlZCBmcm9tIHtfaWQ6IFwiJHtkb2MuX2lkfVwifSB0byBgICtcbiAgICAgICAgYHtfaWQ6IFwiJHttb2RpZmllci5faWR9XCJ9YFxuICAgICAgKTtcbiAgICB9XG5cbiAgICAvLyByZXBsYWNlIHRoZSB3aG9sZSBkb2N1bWVudFxuICAgIGFzc2VydEhhc1ZhbGlkRmllbGROYW1lcyhtb2RpZmllcik7XG4gIH1cblxuICAvLyBtb3ZlIG5ldyBkb2N1bWVudCBpbnRvIHBsYWNlLlxuICBPYmplY3Qua2V5cyhkb2MpLmZvckVhY2goa2V5ID0+IHtcbiAgICAvLyBOb3RlOiB0aGlzIHVzZWQgdG8gYmUgZm9yICh2YXIga2V5IGluIGRvYykgaG93ZXZlciwgdGhpcyBkb2VzIG5vdFxuICAgIC8vIHdvcmsgcmlnaHQgaW4gT3BlcmEuIERlbGV0aW5nIGZyb20gYSBkb2Mgd2hpbGUgaXRlcmF0aW5nIG92ZXIgaXRcbiAgICAvLyB3b3VsZCBzb21ldGltZXMgY2F1c2Ugb3BlcmEgdG8gc2tpcCBzb21lIGtleXMuXG4gICAgaWYgKGtleSAhPT0gJ19pZCcpIHtcbiAgICAgIGRlbGV0ZSBkb2Nba2V5XTtcbiAgICB9XG4gIH0pO1xuXG4gIE9iamVjdC5rZXlzKG5ld0RvYykuZm9yRWFjaChrZXkgPT4ge1xuICAgIGRvY1trZXldID0gbmV3RG9jW2tleV07XG4gIH0pO1xufTtcblxuTG9jYWxDb2xsZWN0aW9uLl9vYnNlcnZlRnJvbU9ic2VydmVDaGFuZ2VzID0gKGN1cnNvciwgb2JzZXJ2ZUNhbGxiYWNrcykgPT4ge1xuICBjb25zdCB0cmFuc2Zvcm0gPSBjdXJzb3IuZ2V0VHJhbnNmb3JtKCkgfHwgKGRvYyA9PiBkb2MpO1xuICBsZXQgc3VwcHJlc3NlZCA9ICEhb2JzZXJ2ZUNhbGxiYWNrcy5fc3VwcHJlc3NfaW5pdGlhbDtcblxuICBsZXQgb2JzZXJ2ZUNoYW5nZXNDYWxsYmFja3M7XG4gIGlmIChMb2NhbENvbGxlY3Rpb24uX29ic2VydmVDYWxsYmFja3NBcmVPcmRlcmVkKG9ic2VydmVDYWxsYmFja3MpKSB7XG4gICAgLy8gVGhlIFwiX25vX2luZGljZXNcIiBvcHRpb24gc2V0cyBhbGwgaW5kZXggYXJndW1lbnRzIHRvIC0xIGFuZCBza2lwcyB0aGVcbiAgICAvLyBsaW5lYXIgc2NhbnMgcmVxdWlyZWQgdG8gZ2VuZXJhdGUgdGhlbS4gIFRoaXMgbGV0cyBvYnNlcnZlcnMgdGhhdCBkb24ndFxuICAgIC8vIG5lZWQgYWJzb2x1dGUgaW5kaWNlcyBiZW5lZml0IGZyb20gdGhlIG90aGVyIGZlYXR1cmVzIG9mIHRoaXMgQVBJIC0tXG4gICAgLy8gcmVsYXRpdmUgb3JkZXIsIHRyYW5zZm9ybXMsIGFuZCBhcHBseUNoYW5nZXMgLS0gd2l0aG91dCB0aGUgc3BlZWQgaGl0LlxuICAgIGNvbnN0IGluZGljZXMgPSAhb2JzZXJ2ZUNhbGxiYWNrcy5fbm9faW5kaWNlcztcblxuICAgIG9ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzID0ge1xuICAgICAgYWRkZWRCZWZvcmUoaWQsIGZpZWxkcywgYmVmb3JlKSB7XG4gICAgICAgIGNvbnN0IGNoZWNrID0gc3VwcHJlc3NlZCB8fCAhKG9ic2VydmVDYWxsYmFja3MuYWRkZWRBdCB8fCBvYnNlcnZlQ2FsbGJhY2tzLmFkZGVkKVxuICAgICAgICBpZiAoY2hlY2spIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBkb2MgPSB0cmFuc2Zvcm0oT2JqZWN0LmFzc2lnbihmaWVsZHMsIHtfaWQ6IGlkfSkpO1xuXG4gICAgICAgIGlmIChvYnNlcnZlQ2FsbGJhY2tzLmFkZGVkQXQpIHtcbiAgICAgICAgICBvYnNlcnZlQ2FsbGJhY2tzLmFkZGVkQXQoXG4gICAgICAgICAgICAgIGRvYyxcbiAgICAgICAgICAgICAgaW5kaWNlc1xuICAgICAgICAgICAgICAgICAgPyBiZWZvcmVcbiAgICAgICAgICAgICAgICAgICAgICA/IHRoaXMuZG9jcy5pbmRleE9mKGJlZm9yZSlcbiAgICAgICAgICAgICAgICAgICAgICA6IHRoaXMuZG9jcy5zaXplKClcbiAgICAgICAgICAgICAgICAgIDogLTEsXG4gICAgICAgICAgICAgIGJlZm9yZVxuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb2JzZXJ2ZUNhbGxiYWNrcy5hZGRlZChkb2MpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgY2hhbmdlZChpZCwgZmllbGRzKSB7XG5cbiAgICAgICAgaWYgKCEob2JzZXJ2ZUNhbGxiYWNrcy5jaGFuZ2VkQXQgfHwgb2JzZXJ2ZUNhbGxiYWNrcy5jaGFuZ2VkKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBkb2MgPSBFSlNPTi5jbG9uZSh0aGlzLmRvY3MuZ2V0KGlkKSk7XG4gICAgICAgIGlmICghZG9jKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGlkIGZvciBjaGFuZ2VkOiAke2lkfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb2xkRG9jID0gdHJhbnNmb3JtKEVKU09OLmNsb25lKGRvYykpO1xuXG4gICAgICAgIERpZmZTZXF1ZW5jZS5hcHBseUNoYW5nZXMoZG9jLCBmaWVsZHMpO1xuXG4gICAgICAgIGlmIChvYnNlcnZlQ2FsbGJhY2tzLmNoYW5nZWRBdCkge1xuICAgICAgICAgIG9ic2VydmVDYWxsYmFja3MuY2hhbmdlZEF0KFxuICAgICAgICAgICAgICB0cmFuc2Zvcm0oZG9jKSxcbiAgICAgICAgICAgICAgb2xkRG9jLFxuICAgICAgICAgICAgICBpbmRpY2VzID8gdGhpcy5kb2NzLmluZGV4T2YoaWQpIDogLTFcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG9ic2VydmVDYWxsYmFja3MuY2hhbmdlZCh0cmFuc2Zvcm0oZG9jKSwgb2xkRG9jKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIG1vdmVkQmVmb3JlKGlkLCBiZWZvcmUpIHtcbiAgICAgICAgaWYgKCFvYnNlcnZlQ2FsbGJhY2tzLm1vdmVkVG8pIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBmcm9tID0gaW5kaWNlcyA/IHRoaXMuZG9jcy5pbmRleE9mKGlkKSA6IC0xO1xuICAgICAgICBsZXQgdG8gPSBpbmRpY2VzXG4gICAgICAgICAgICA/IGJlZm9yZVxuICAgICAgICAgICAgICAgID8gdGhpcy5kb2NzLmluZGV4T2YoYmVmb3JlKVxuICAgICAgICAgICAgICAgIDogdGhpcy5kb2NzLnNpemUoKVxuICAgICAgICAgICAgOiAtMTtcblxuICAgICAgICAvLyBXaGVuIG5vdCBtb3ZpbmcgYmFja3dhcmRzLCBhZGp1c3QgZm9yIHRoZSBmYWN0IHRoYXQgcmVtb3ZpbmcgdGhlXG4gICAgICAgIC8vIGRvY3VtZW50IHNsaWRlcyBldmVyeXRoaW5nIGJhY2sgb25lIHNsb3QuXG4gICAgICAgIGlmICh0byA+IGZyb20pIHtcbiAgICAgICAgICAtLXRvO1xuICAgICAgICB9XG5cbiAgICAgICAgb2JzZXJ2ZUNhbGxiYWNrcy5tb3ZlZFRvKFxuICAgICAgICAgICAgdHJhbnNmb3JtKEVKU09OLmNsb25lKHRoaXMuZG9jcy5nZXQoaWQpKSksXG4gICAgICAgICAgICBmcm9tLFxuICAgICAgICAgICAgdG8sXG4gICAgICAgICAgICBiZWZvcmUgfHwgbnVsbFxuICAgICAgICApO1xuICAgICAgfSxcbiAgICAgIHJlbW92ZWQoaWQpIHtcbiAgICAgICAgaWYgKCEob2JzZXJ2ZUNhbGxiYWNrcy5yZW1vdmVkQXQgfHwgb2JzZXJ2ZUNhbGxiYWNrcy5yZW1vdmVkKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHRlY2huaWNhbGx5IG1heWJlIHRoZXJlIHNob3VsZCBiZSBhbiBFSlNPTi5jbG9uZSBoZXJlLCBidXQgaXQncyBhYm91dFxuICAgICAgICAvLyB0byBiZSByZW1vdmVkIGZyb20gdGhpcy5kb2NzIVxuICAgICAgICBjb25zdCBkb2MgPSB0cmFuc2Zvcm0odGhpcy5kb2NzLmdldChpZCkpO1xuXG4gICAgICAgIGlmIChvYnNlcnZlQ2FsbGJhY2tzLnJlbW92ZWRBdCkge1xuICAgICAgICAgIG9ic2VydmVDYWxsYmFja3MucmVtb3ZlZEF0KGRvYywgaW5kaWNlcyA/IHRoaXMuZG9jcy5pbmRleE9mKGlkKSA6IC0xKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvYnNlcnZlQ2FsbGJhY2tzLnJlbW92ZWQoZG9jKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIG9ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzID0ge1xuICAgICAgYWRkZWQoaWQsIGZpZWxkcykge1xuICAgICAgICBpZiAoIXN1cHByZXNzZWQgJiYgb2JzZXJ2ZUNhbGxiYWNrcy5hZGRlZCkge1xuICAgICAgICAgIG9ic2VydmVDYWxsYmFja3MuYWRkZWQodHJhbnNmb3JtKE9iamVjdC5hc3NpZ24oZmllbGRzLCB7X2lkOiBpZH0pKSk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBjaGFuZ2VkKGlkLCBmaWVsZHMpIHtcbiAgICAgICAgaWYgKG9ic2VydmVDYWxsYmFja3MuY2hhbmdlZCkge1xuICAgICAgICAgIGNvbnN0IG9sZERvYyA9IHRoaXMuZG9jcy5nZXQoaWQpO1xuICAgICAgICAgIGNvbnN0IGRvYyA9IEVKU09OLmNsb25lKG9sZERvYyk7XG5cbiAgICAgICAgICBEaWZmU2VxdWVuY2UuYXBwbHlDaGFuZ2VzKGRvYywgZmllbGRzKTtcblxuICAgICAgICAgIG9ic2VydmVDYWxsYmFja3MuY2hhbmdlZChcbiAgICAgICAgICAgICAgdHJhbnNmb3JtKGRvYyksXG4gICAgICAgICAgICAgIHRyYW5zZm9ybShFSlNPTi5jbG9uZShvbGREb2MpKVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICByZW1vdmVkKGlkKSB7XG4gICAgICAgIGlmIChvYnNlcnZlQ2FsbGJhY2tzLnJlbW92ZWQpIHtcbiAgICAgICAgICBvYnNlcnZlQ2FsbGJhY2tzLnJlbW92ZWQodHJhbnNmb3JtKHRoaXMuZG9jcy5nZXQoaWQpKSk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IGNoYW5nZU9ic2VydmVyID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fQ2FjaGluZ0NoYW5nZU9ic2VydmVyKHtcbiAgICBjYWxsYmFja3M6IG9ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzXG4gIH0pO1xuXG4gIC8vIENhY2hpbmdDaGFuZ2VPYnNlcnZlciBjbG9uZXMgYWxsIHJlY2VpdmVkIGlucHV0IG9uIGl0cyBjYWxsYmFja3NcbiAgLy8gU28gd2UgY2FuIG1hcmsgaXQgYXMgc2FmZSB0byByZWR1Y2UgdGhlIGVqc29uIGNsb25lcy5cbiAgLy8gVGhpcyBpcyB0ZXN0ZWQgYnkgdGhlIGBtb25nby1saXZlZGF0YSAtIChleHRlbmRlZCkgc2NyaWJibGluZ2AgdGVzdHNcbiAgY2hhbmdlT2JzZXJ2ZXIuYXBwbHlDaGFuZ2UuX2Zyb21PYnNlcnZlID0gdHJ1ZTtcbiAgY29uc3QgaGFuZGxlID0gY3Vyc29yLm9ic2VydmVDaGFuZ2VzKGNoYW5nZU9ic2VydmVyLmFwcGx5Q2hhbmdlLFxuICAgICAgeyBub25NdXRhdGluZ0NhbGxiYWNrczogdHJ1ZSB9KTtcblxuICAvLyBJZiBuZWVkZWQsIHJlLWVuYWJsZSBjYWxsYmFja3MgYXMgc29vbiBhcyB0aGUgaW5pdGlhbCBiYXRjaCBpcyByZWFkeS5cbiAgY29uc3Qgc2V0U3VwcHJlc3NlZCA9IChoKSA9PiB7XG4gICAgaWYgKGguaXNSZWFkeSkgc3VwcHJlc3NlZCA9IGZhbHNlO1xuICAgIGVsc2UgaC5pc1JlYWR5UHJvbWlzZT8udGhlbigoKSA9PiAoc3VwcHJlc3NlZCA9IGZhbHNlKSk7XG4gIH07XG4gIC8vIFdoZW4gd2UgY2FsbCBjdXJzb3Iub2JzZXJ2ZUNoYW5nZXMoKSBpdCBjYW4gYmUgdGhlIG9uIGZyb21cbiAgLy8gdGhlIG1vbmdvIHBhY2thZ2UgKGluc3RlYWQgb2YgdGhlIG1pbmltb25nbyBvbmUpIGFuZCBpdCBkb2Vzbid0IGhhdmUgaXNSZWFkeSBhbmQgaXNSZWFkeVByb21pc2VcbiAgaWYgKE1ldGVvci5faXNQcm9taXNlKGhhbmRsZSkpIHtcbiAgICBoYW5kbGUudGhlbihzZXRTdXBwcmVzc2VkKTtcbiAgfSBlbHNlIHtcbiAgICBzZXRTdXBwcmVzc2VkKGhhbmRsZSk7XG4gIH1cbiAgcmV0dXJuIGhhbmRsZTtcbn07XG5cbkxvY2FsQ29sbGVjdGlvbi5fb2JzZXJ2ZUNhbGxiYWNrc0FyZU9yZGVyZWQgPSBjYWxsYmFja3MgPT4ge1xuICBpZiAoY2FsbGJhY2tzLmFkZGVkICYmIGNhbGxiYWNrcy5hZGRlZEF0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdQbGVhc2Ugc3BlY2lmeSBvbmx5IG9uZSBvZiBhZGRlZCgpIGFuZCBhZGRlZEF0KCknKTtcbiAgfVxuXG4gIGlmIChjYWxsYmFja3MuY2hhbmdlZCAmJiBjYWxsYmFja3MuY2hhbmdlZEF0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdQbGVhc2Ugc3BlY2lmeSBvbmx5IG9uZSBvZiBjaGFuZ2VkKCkgYW5kIGNoYW5nZWRBdCgpJyk7XG4gIH1cblxuICBpZiAoY2FsbGJhY2tzLnJlbW92ZWQgJiYgY2FsbGJhY2tzLnJlbW92ZWRBdCkge1xuICAgIHRocm93IG5ldyBFcnJvcignUGxlYXNlIHNwZWNpZnkgb25seSBvbmUgb2YgcmVtb3ZlZCgpIGFuZCByZW1vdmVkQXQoKScpO1xuICB9XG5cbiAgcmV0dXJuICEhKFxuICAgIGNhbGxiYWNrcy5hZGRlZEF0IHx8XG4gICAgY2FsbGJhY2tzLmNoYW5nZWRBdCB8fFxuICAgIGNhbGxiYWNrcy5tb3ZlZFRvIHx8XG4gICAgY2FsbGJhY2tzLnJlbW92ZWRBdFxuICApO1xufTtcblxuTG9jYWxDb2xsZWN0aW9uLl9vYnNlcnZlQ2hhbmdlc0NhbGxiYWNrc0FyZU9yZGVyZWQgPSBjYWxsYmFja3MgPT4ge1xuICBpZiAoY2FsbGJhY2tzLmFkZGVkICYmIGNhbGxiYWNrcy5hZGRlZEJlZm9yZSkge1xuICAgIHRocm93IG5ldyBFcnJvcignUGxlYXNlIHNwZWNpZnkgb25seSBvbmUgb2YgYWRkZWQoKSBhbmQgYWRkZWRCZWZvcmUoKScpO1xuICB9XG5cbiAgcmV0dXJuICEhKGNhbGxiYWNrcy5hZGRlZEJlZm9yZSB8fCBjYWxsYmFja3MubW92ZWRCZWZvcmUpO1xufTtcblxuTG9jYWxDb2xsZWN0aW9uLl9yZW1vdmVGcm9tUmVzdWx0c1N5bmMgPSAocXVlcnksIGRvYykgPT4ge1xuICBpZiAocXVlcnkub3JkZXJlZCkge1xuICAgIGNvbnN0IGkgPSBMb2NhbENvbGxlY3Rpb24uX2ZpbmRJbk9yZGVyZWRSZXN1bHRzKHF1ZXJ5LCBkb2MpO1xuXG4gICAgcXVlcnkucmVtb3ZlZChkb2MuX2lkKTtcbiAgICBxdWVyeS5yZXN1bHRzLnNwbGljZShpLCAxKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBpZCA9IGRvYy5faWQ7ICAvLyBpbiBjYXNlIGNhbGxiYWNrIG11dGF0ZXMgZG9jXG5cbiAgICBxdWVyeS5yZW1vdmVkKGRvYy5faWQpO1xuICAgIHF1ZXJ5LnJlc3VsdHMucmVtb3ZlKGlkKTtcbiAgfVxufTtcblxuTG9jYWxDb2xsZWN0aW9uLl9yZW1vdmVGcm9tUmVzdWx0c0FzeW5jID0gYXN5bmMgKHF1ZXJ5LCBkb2MpID0+IHtcbiAgaWYgKHF1ZXJ5Lm9yZGVyZWQpIHtcbiAgICBjb25zdCBpID0gTG9jYWxDb2xsZWN0aW9uLl9maW5kSW5PcmRlcmVkUmVzdWx0cyhxdWVyeSwgZG9jKTtcblxuICAgIGF3YWl0IHF1ZXJ5LnJlbW92ZWQoZG9jLl9pZCk7XG4gICAgcXVlcnkucmVzdWx0cy5zcGxpY2UoaSwgMSk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgaWQgPSBkb2MuX2lkOyAgLy8gaW4gY2FzZSBjYWxsYmFjayBtdXRhdGVzIGRvY1xuXG4gICAgYXdhaXQgcXVlcnkucmVtb3ZlZChkb2MuX2lkKTtcbiAgICBxdWVyeS5yZXN1bHRzLnJlbW92ZShpZCk7XG4gIH1cbn07XG5cbi8vIElzIHRoaXMgc2VsZWN0b3IganVzdCBzaG9ydGhhbmQgZm9yIGxvb2t1cCBieSBfaWQ/XG5Mb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZCA9IHNlbGVjdG9yID0+XG4gIHR5cGVvZiBzZWxlY3RvciA9PT0gJ251bWJlcicgfHxcbiAgdHlwZW9mIHNlbGVjdG9yID09PSAnc3RyaW5nJyB8fFxuICBzZWxlY3RvciBpbnN0YW5jZW9mIE1vbmdvSUQuT2JqZWN0SURcbjtcblxuLy8gSXMgdGhlIHNlbGVjdG9yIGp1c3QgbG9va3VwIGJ5IF9pZCAoc2hvcnRoYW5kIG9yIG5vdCk/XG5Mb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZFBlcmhhcHNBc09iamVjdCA9IHNlbGVjdG9yID0+XG4gIExvY2FsQ29sbGVjdGlvbi5fc2VsZWN0b3JJc0lkKHNlbGVjdG9yKSB8fFxuICBMb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZChzZWxlY3RvciAmJiBzZWxlY3Rvci5faWQpICYmXG4gIE9iamVjdC5rZXlzKHNlbGVjdG9yKS5sZW5ndGggPT09IDFcbjtcblxuTG9jYWxDb2xsZWN0aW9uLl91cGRhdGVJblJlc3VsdHNTeW5jID0gKHF1ZXJ5LCBkb2MsIG9sZF9kb2MpID0+IHtcbiAgaWYgKCFFSlNPTi5lcXVhbHMoZG9jLl9pZCwgb2xkX2RvYy5faWQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDYW5cXCd0IGNoYW5nZSBhIGRvY1xcJ3MgX2lkIHdoaWxlIHVwZGF0aW5nJyk7XG4gIH1cblxuICBjb25zdCBwcm9qZWN0aW9uRm4gPSBxdWVyeS5wcm9qZWN0aW9uRm47XG4gIGNvbnN0IGNoYW5nZWRGaWVsZHMgPSBEaWZmU2VxdWVuY2UubWFrZUNoYW5nZWRGaWVsZHMoXG4gICAgcHJvamVjdGlvbkZuKGRvYyksXG4gICAgcHJvamVjdGlvbkZuKG9sZF9kb2MpXG4gICk7XG5cbiAgaWYgKCFxdWVyeS5vcmRlcmVkKSB7XG4gICAgaWYgKE9iamVjdC5rZXlzKGNoYW5nZWRGaWVsZHMpLmxlbmd0aCkge1xuICAgICAgcXVlcnkuY2hhbmdlZChkb2MuX2lkLCBjaGFuZ2VkRmllbGRzKTtcbiAgICAgIHF1ZXJ5LnJlc3VsdHMuc2V0KGRvYy5faWQsIGRvYyk7XG4gICAgfVxuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3Qgb2xkX2lkeCA9IExvY2FsQ29sbGVjdGlvbi5fZmluZEluT3JkZXJlZFJlc3VsdHMocXVlcnksIGRvYyk7XG5cbiAgaWYgKE9iamVjdC5rZXlzKGNoYW5nZWRGaWVsZHMpLmxlbmd0aCkge1xuICAgIHF1ZXJ5LmNoYW5nZWQoZG9jLl9pZCwgY2hhbmdlZEZpZWxkcyk7XG4gIH1cblxuICBpZiAoIXF1ZXJ5LnNvcnRlcikge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGp1c3QgdGFrZSBpdCBvdXQgYW5kIHB1dCBpdCBiYWNrIGluIGFnYWluLCBhbmQgc2VlIGlmIHRoZSBpbmRleCBjaGFuZ2VzXG4gIHF1ZXJ5LnJlc3VsdHMuc3BsaWNlKG9sZF9pZHgsIDEpO1xuXG4gIGNvbnN0IG5ld19pZHggPSBMb2NhbENvbGxlY3Rpb24uX2luc2VydEluU29ydGVkTGlzdChcbiAgICBxdWVyeS5zb3J0ZXIuZ2V0Q29tcGFyYXRvcih7ZGlzdGFuY2VzOiBxdWVyeS5kaXN0YW5jZXN9KSxcbiAgICBxdWVyeS5yZXN1bHRzLFxuICAgIGRvY1xuICApO1xuXG4gIGlmIChvbGRfaWR4ICE9PSBuZXdfaWR4KSB7XG4gICAgbGV0IG5leHQgPSBxdWVyeS5yZXN1bHRzW25ld19pZHggKyAxXTtcbiAgICBpZiAobmV4dCkge1xuICAgICAgbmV4dCA9IG5leHQuX2lkO1xuICAgIH0gZWxzZSB7XG4gICAgICBuZXh0ID0gbnVsbDtcbiAgICB9XG5cbiAgICBxdWVyeS5tb3ZlZEJlZm9yZSAmJiBxdWVyeS5tb3ZlZEJlZm9yZShkb2MuX2lkLCBuZXh0KTtcbiAgfVxufTtcblxuTG9jYWxDb2xsZWN0aW9uLl91cGRhdGVJblJlc3VsdHNBc3luYyA9IGFzeW5jIChxdWVyeSwgZG9jLCBvbGRfZG9jKSA9PiB7XG4gIGlmICghRUpTT04uZXF1YWxzKGRvYy5faWQsIG9sZF9kb2MuX2lkKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignQ2FuXFwndCBjaGFuZ2UgYSBkb2NcXCdzIF9pZCB3aGlsZSB1cGRhdGluZycpO1xuICB9XG5cbiAgY29uc3QgcHJvamVjdGlvbkZuID0gcXVlcnkucHJvamVjdGlvbkZuO1xuICBjb25zdCBjaGFuZ2VkRmllbGRzID0gRGlmZlNlcXVlbmNlLm1ha2VDaGFuZ2VkRmllbGRzKFxuICAgIHByb2plY3Rpb25Gbihkb2MpLFxuICAgIHByb2plY3Rpb25GbihvbGRfZG9jKVxuICApO1xuXG4gIGlmICghcXVlcnkub3JkZXJlZCkge1xuICAgIGlmIChPYmplY3Qua2V5cyhjaGFuZ2VkRmllbGRzKS5sZW5ndGgpIHtcbiAgICAgIGF3YWl0IHF1ZXJ5LmNoYW5nZWQoZG9jLl9pZCwgY2hhbmdlZEZpZWxkcyk7XG4gICAgICBxdWVyeS5yZXN1bHRzLnNldChkb2MuX2lkLCBkb2MpO1xuICAgIH1cblxuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IG9sZF9pZHggPSBMb2NhbENvbGxlY3Rpb24uX2ZpbmRJbk9yZGVyZWRSZXN1bHRzKHF1ZXJ5LCBkb2MpO1xuXG4gIGlmIChPYmplY3Qua2V5cyhjaGFuZ2VkRmllbGRzKS5sZW5ndGgpIHtcbiAgICBhd2FpdCBxdWVyeS5jaGFuZ2VkKGRvYy5faWQsIGNoYW5nZWRGaWVsZHMpO1xuICB9XG5cbiAgaWYgKCFxdWVyeS5zb3J0ZXIpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBqdXN0IHRha2UgaXQgb3V0IGFuZCBwdXQgaXQgYmFjayBpbiBhZ2FpbiwgYW5kIHNlZSBpZiB0aGUgaW5kZXggY2hhbmdlc1xuICBxdWVyeS5yZXN1bHRzLnNwbGljZShvbGRfaWR4LCAxKTtcblxuICBjb25zdCBuZXdfaWR4ID0gTG9jYWxDb2xsZWN0aW9uLl9pbnNlcnRJblNvcnRlZExpc3QoXG4gICAgcXVlcnkuc29ydGVyLmdldENvbXBhcmF0b3Ioe2Rpc3RhbmNlczogcXVlcnkuZGlzdGFuY2VzfSksXG4gICAgcXVlcnkucmVzdWx0cyxcbiAgICBkb2NcbiAgKTtcblxuICBpZiAob2xkX2lkeCAhPT0gbmV3X2lkeCkge1xuICAgIGxldCBuZXh0ID0gcXVlcnkucmVzdWx0c1tuZXdfaWR4ICsgMV07XG4gICAgaWYgKG5leHQpIHtcbiAgICAgIG5leHQgPSBuZXh0Ll9pZDtcbiAgICB9IGVsc2Uge1xuICAgICAgbmV4dCA9IG51bGw7XG4gICAgfVxuXG4gICAgcXVlcnkubW92ZWRCZWZvcmUgJiYgYXdhaXQgcXVlcnkubW92ZWRCZWZvcmUoZG9jLl9pZCwgbmV4dCk7XG4gIH1cbn07XG5cbmNvbnN0IE1PRElGSUVSUyA9IHtcbiAgJGN1cnJlbnREYXRlKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIGlmICh0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBoYXNPd24uY2FsbChhcmcsICckdHlwZScpKSB7XG4gICAgICBpZiAoYXJnLiR0eXBlICE9PSAnZGF0ZScpIHtcbiAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICAgJ01pbmltb25nbyBkb2VzIGN1cnJlbnRseSBvbmx5IHN1cHBvcnQgdGhlIGRhdGUgdHlwZSBpbiAnICtcbiAgICAgICAgICAnJGN1cnJlbnREYXRlIG1vZGlmaWVycycsXG4gICAgICAgICAge2ZpZWxkfVxuICAgICAgICApO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoYXJnICE9PSB0cnVlKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignSW52YWxpZCAkY3VycmVudERhdGUgbW9kaWZpZXInLCB7ZmllbGR9KTtcbiAgICB9XG5cbiAgICB0YXJnZXRbZmllbGRdID0gbmV3IERhdGUoKTtcbiAgfSxcbiAgJGluYyh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICBpZiAodHlwZW9mIGFyZyAhPT0gJ251bWJlcicpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCdNb2RpZmllciAkaW5jIGFsbG93ZWQgZm9yIG51bWJlcnMgb25seScsIHtmaWVsZH0pO1xuICAgIH1cblxuICAgIGlmIChmaWVsZCBpbiB0YXJnZXQpIHtcbiAgICAgIGlmICh0eXBlb2YgdGFyZ2V0W2ZpZWxkXSAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICAgJ0Nhbm5vdCBhcHBseSAkaW5jIG1vZGlmaWVyIHRvIG5vbi1udW1iZXInLFxuICAgICAgICAgIHtmaWVsZH1cbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgdGFyZ2V0W2ZpZWxkXSArPSBhcmc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRhcmdldFtmaWVsZF0gPSBhcmc7XG4gICAgfVxuICB9LFxuICAkbWluKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIGlmICh0eXBlb2YgYXJnICE9PSAnbnVtYmVyJykge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJ01vZGlmaWVyICRtaW4gYWxsb3dlZCBmb3IgbnVtYmVycyBvbmx5Jywge2ZpZWxkfSk7XG4gICAgfVxuXG4gICAgaWYgKGZpZWxkIGluIHRhcmdldCkge1xuICAgICAgaWYgKHR5cGVvZiB0YXJnZXRbZmllbGRdICE9PSAnbnVtYmVyJykge1xuICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgICAnQ2Fubm90IGFwcGx5ICRtaW4gbW9kaWZpZXIgdG8gbm9uLW51bWJlcicsXG4gICAgICAgICAge2ZpZWxkfVxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBpZiAodGFyZ2V0W2ZpZWxkXSA+IGFyZykge1xuICAgICAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICAgIH1cbiAgfSxcbiAgJG1heCh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICBpZiAodHlwZW9mIGFyZyAhPT0gJ251bWJlcicpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCdNb2RpZmllciAkbWF4IGFsbG93ZWQgZm9yIG51bWJlcnMgb25seScsIHtmaWVsZH0pO1xuICAgIH1cblxuICAgIGlmIChmaWVsZCBpbiB0YXJnZXQpIHtcbiAgICAgIGlmICh0eXBlb2YgdGFyZ2V0W2ZpZWxkXSAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICAgJ0Nhbm5vdCBhcHBseSAkbWF4IG1vZGlmaWVyIHRvIG5vbi1udW1iZXInLFxuICAgICAgICAgIHtmaWVsZH1cbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRhcmdldFtmaWVsZF0gPCBhcmcpIHtcbiAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IGFyZztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGFyZ2V0W2ZpZWxkXSA9IGFyZztcbiAgICB9XG4gIH0sXG4gICRtdWwodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgaWYgKHR5cGVvZiBhcmcgIT09ICdudW1iZXInKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignTW9kaWZpZXIgJG11bCBhbGxvd2VkIGZvciBudW1iZXJzIG9ubHknLCB7ZmllbGR9KTtcbiAgICB9XG5cbiAgICBpZiAoZmllbGQgaW4gdGFyZ2V0KSB7XG4gICAgICBpZiAodHlwZW9mIHRhcmdldFtmaWVsZF0gIT09ICdudW1iZXInKSB7XG4gICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAgICdDYW5ub3QgYXBwbHkgJG11bCBtb2RpZmllciB0byBub24tbnVtYmVyJyxcbiAgICAgICAgICB7ZmllbGR9XG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIHRhcmdldFtmaWVsZF0gKj0gYXJnO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YXJnZXRbZmllbGRdID0gMDtcbiAgICB9XG4gIH0sXG4gICRyZW5hbWUodGFyZ2V0LCBmaWVsZCwgYXJnLCBrZXlwYXRoLCBkb2MpIHtcbiAgICAvLyBubyBpZGVhIHdoeSBtb25nbyBoYXMgdGhpcyByZXN0cmljdGlvbi4uXG4gICAgaWYgKGtleXBhdGggPT09IGFyZykge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJyRyZW5hbWUgc291cmNlIG11c3QgZGlmZmVyIGZyb20gdGFyZ2V0Jywge2ZpZWxkfSk7XG4gICAgfVxuXG4gICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJyRyZW5hbWUgc291cmNlIGZpZWxkIGludmFsaWQnLCB7ZmllbGR9KTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGFyZyAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCckcmVuYW1lIHRhcmdldCBtdXN0IGJlIGEgc3RyaW5nJywge2ZpZWxkfSk7XG4gICAgfVxuXG4gICAgaWYgKGFyZy5pbmNsdWRlcygnXFwwJykpIHtcbiAgICAgIC8vIE51bGwgYnl0ZXMgYXJlIG5vdCBhbGxvd2VkIGluIE1vbmdvIGZpZWxkIG5hbWVzXG4gICAgICAvLyBodHRwczovL2RvY3MubW9uZ29kYi5jb20vbWFudWFsL3JlZmVyZW5jZS9saW1pdHMvI1Jlc3RyaWN0aW9ucy1vbi1GaWVsZC1OYW1lc1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICdUaGUgXFwndG9cXCcgZmllbGQgZm9yICRyZW5hbWUgY2Fubm90IGNvbnRhaW4gYW4gZW1iZWRkZWQgbnVsbCBieXRlJyxcbiAgICAgICAge2ZpZWxkfVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAodGFyZ2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBvYmplY3QgPSB0YXJnZXRbZmllbGRdO1xuXG4gICAgZGVsZXRlIHRhcmdldFtmaWVsZF07XG5cbiAgICBjb25zdCBrZXlwYXJ0cyA9IGFyZy5zcGxpdCgnLicpO1xuICAgIGNvbnN0IHRhcmdldDIgPSBmaW5kTW9kVGFyZ2V0KGRvYywga2V5cGFydHMsIHtmb3JiaWRBcnJheTogdHJ1ZX0pO1xuXG4gICAgaWYgKHRhcmdldDIgPT09IG51bGwpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCckcmVuYW1lIHRhcmdldCBmaWVsZCBpbnZhbGlkJywge2ZpZWxkfSk7XG4gICAgfVxuXG4gICAgdGFyZ2V0MltrZXlwYXJ0cy5wb3AoKV0gPSBvYmplY3Q7XG4gIH0sXG4gICRzZXQodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgaWYgKHRhcmdldCAhPT0gT2JqZWN0KHRhcmdldCkpIHsgLy8gbm90IGFuIGFycmF5IG9yIGFuIG9iamVjdFxuICAgICAgY29uc3QgZXJyb3IgPSBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgJ0Nhbm5vdCBzZXQgcHJvcGVydHkgb24gbm9uLW9iamVjdCBmaWVsZCcsXG4gICAgICAgIHtmaWVsZH1cbiAgICAgICk7XG4gICAgICBlcnJvci5zZXRQcm9wZXJ0eUVycm9yID0gdHJ1ZTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cblxuICAgIGlmICh0YXJnZXQgPT09IG51bGwpIHtcbiAgICAgIGNvbnN0IGVycm9yID0gTWluaW1vbmdvRXJyb3IoJ0Nhbm5vdCBzZXQgcHJvcGVydHkgb24gbnVsbCcsIHtmaWVsZH0pO1xuICAgICAgZXJyb3Iuc2V0UHJvcGVydHlFcnJvciA9IHRydWU7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG5cbiAgICBhc3NlcnRIYXNWYWxpZEZpZWxkTmFtZXMoYXJnKTtcblxuICAgIHRhcmdldFtmaWVsZF0gPSBhcmc7XG4gIH0sXG4gICRzZXRPbkluc2VydCh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAvLyBjb252ZXJ0ZWQgdG8gYCRzZXRgIGluIGBfbW9kaWZ5YFxuICB9LFxuICAkdW5zZXQodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgaWYgKHRhcmdldCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAodGFyZ2V0IGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgaWYgKGZpZWxkIGluIHRhcmdldCkge1xuICAgICAgICAgIHRhcmdldFtmaWVsZF0gPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWxldGUgdGFyZ2V0W2ZpZWxkXTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gICRwdXNoKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIGlmICh0YXJnZXRbZmllbGRdID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRhcmdldFtmaWVsZF0gPSBbXTtcbiAgICB9XG5cbiAgICBpZiAoISh0YXJnZXRbZmllbGRdIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignQ2Fubm90IGFwcGx5ICRwdXNoIG1vZGlmaWVyIHRvIG5vbi1hcnJheScsIHtmaWVsZH0pO1xuICAgIH1cblxuICAgIGlmICghKGFyZyAmJiBhcmcuJGVhY2gpKSB7XG4gICAgICAvLyBTaW1wbGUgbW9kZTogbm90ICRlYWNoXG4gICAgICBhc3NlcnRIYXNWYWxpZEZpZWxkTmFtZXMoYXJnKTtcblxuICAgICAgdGFyZ2V0W2ZpZWxkXS5wdXNoKGFyZyk7XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBGYW5jeSBtb2RlOiAkZWFjaCAoYW5kIG1heWJlICRzbGljZSBhbmQgJHNvcnQgYW5kICRwb3NpdGlvbilcbiAgICBjb25zdCB0b1B1c2ggPSBhcmcuJGVhY2g7XG4gICAgaWYgKCEodG9QdXNoIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignJGVhY2ggbXVzdCBiZSBhbiBhcnJheScsIHtmaWVsZH0pO1xuICAgIH1cblxuICAgIGFzc2VydEhhc1ZhbGlkRmllbGROYW1lcyh0b1B1c2gpO1xuXG4gICAgLy8gUGFyc2UgJHBvc2l0aW9uXG4gICAgbGV0IHBvc2l0aW9uID0gdW5kZWZpbmVkO1xuICAgIGlmICgnJHBvc2l0aW9uJyBpbiBhcmcpIHtcbiAgICAgIGlmICh0eXBlb2YgYXJnLiRwb3NpdGlvbiAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJyRwb3NpdGlvbiBtdXN0IGJlIGEgbnVtZXJpYyB2YWx1ZScsIHtmaWVsZH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBYWFggc2hvdWxkIGNoZWNrIHRvIG1ha2Ugc3VyZSBpbnRlZ2VyXG4gICAgICBpZiAoYXJnLiRwb3NpdGlvbiA8IDApIHtcbiAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICAgJyRwb3NpdGlvbiBpbiAkcHVzaCBtdXN0IGJlIHplcm8gb3IgcG9zaXRpdmUnLFxuICAgICAgICAgIHtmaWVsZH1cbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgcG9zaXRpb24gPSBhcmcuJHBvc2l0aW9uO1xuICAgIH1cblxuICAgIC8vIFBhcnNlICRzbGljZS5cbiAgICBsZXQgc2xpY2UgPSB1bmRlZmluZWQ7XG4gICAgaWYgKCckc2xpY2UnIGluIGFyZykge1xuICAgICAgaWYgKHR5cGVvZiBhcmcuJHNsaWNlICE9PSAnbnVtYmVyJykge1xuICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignJHNsaWNlIG11c3QgYmUgYSBudW1lcmljIHZhbHVlJywge2ZpZWxkfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFhYWCBzaG91bGQgY2hlY2sgdG8gbWFrZSBzdXJlIGludGVnZXJcbiAgICAgIHNsaWNlID0gYXJnLiRzbGljZTtcbiAgICB9XG5cbiAgICAvLyBQYXJzZSAkc29ydC5cbiAgICBsZXQgc29ydEZ1bmN0aW9uID0gdW5kZWZpbmVkO1xuICAgIGlmIChhcmcuJHNvcnQpIHtcbiAgICAgIGlmIChzbGljZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCckc29ydCByZXF1aXJlcyAkc2xpY2UgdG8gYmUgcHJlc2VudCcsIHtmaWVsZH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBYWFggdGhpcyBhbGxvd3MgdXMgdG8gdXNlIGEgJHNvcnQgd2hvc2UgdmFsdWUgaXMgYW4gYXJyYXksIGJ1dCB0aGF0J3NcbiAgICAgIC8vIGFjdHVhbGx5IGFuIGV4dGVuc2lvbiBvZiB0aGUgTm9kZSBkcml2ZXIsIHNvIGl0IHdvbid0IHdvcmtcbiAgICAgIC8vIHNlcnZlci1zaWRlLiBDb3VsZCBiZSBjb25mdXNpbmchXG4gICAgICAvLyBYWFggaXMgaXQgY29ycmVjdCB0aGF0IHdlIGRvbid0IGRvIGdlby1zdHVmZiBoZXJlP1xuICAgICAgc29ydEZ1bmN0aW9uID0gbmV3IE1pbmltb25nby5Tb3J0ZXIoYXJnLiRzb3J0KS5nZXRDb21wYXJhdG9yKCk7XG5cbiAgICAgIHRvUHVzaC5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICBpZiAoTG9jYWxDb2xsZWN0aW9uLl9mLl90eXBlKGVsZW1lbnQpICE9PSAzKSB7XG4gICAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICAgICAnJHB1c2ggbGlrZSBtb2RpZmllcnMgdXNpbmcgJHNvcnQgcmVxdWlyZSBhbGwgZWxlbWVudHMgdG8gYmUgJyArXG4gICAgICAgICAgICAnb2JqZWN0cycsXG4gICAgICAgICAgICB7ZmllbGR9XG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gQWN0dWFsbHkgcHVzaC5cbiAgICBpZiAocG9zaXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgdG9QdXNoLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgIHRhcmdldFtmaWVsZF0ucHVzaChlbGVtZW50KTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBzcGxpY2VBcmd1bWVudHMgPSBbcG9zaXRpb24sIDBdO1xuXG4gICAgICB0b1B1c2guZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgc3BsaWNlQXJndW1lbnRzLnB1c2goZWxlbWVudCk7XG4gICAgICB9KTtcblxuICAgICAgdGFyZ2V0W2ZpZWxkXS5zcGxpY2UoLi4uc3BsaWNlQXJndW1lbnRzKTtcbiAgICB9XG5cbiAgICAvLyBBY3R1YWxseSBzb3J0LlxuICAgIGlmIChzb3J0RnVuY3Rpb24pIHtcbiAgICAgIHRhcmdldFtmaWVsZF0uc29ydChzb3J0RnVuY3Rpb24pO1xuICAgIH1cblxuICAgIC8vIEFjdHVhbGx5IHNsaWNlLlxuICAgIGlmIChzbGljZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAoc2xpY2UgPT09IDApIHtcbiAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IFtdOyAvLyBkaWZmZXJzIGZyb20gQXJyYXkuc2xpY2UhXG4gICAgICB9IGVsc2UgaWYgKHNsaWNlIDwgMCkge1xuICAgICAgICB0YXJnZXRbZmllbGRdID0gdGFyZ2V0W2ZpZWxkXS5zbGljZShzbGljZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0YXJnZXRbZmllbGRdID0gdGFyZ2V0W2ZpZWxkXS5zbGljZSgwLCBzbGljZSk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICAkcHVzaEFsbCh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICBpZiAoISh0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCdNb2RpZmllciAkcHVzaEFsbC9wdWxsQWxsIGFsbG93ZWQgZm9yIGFycmF5cyBvbmx5Jyk7XG4gICAgfVxuXG4gICAgYXNzZXJ0SGFzVmFsaWRGaWVsZE5hbWVzKGFyZyk7XG5cbiAgICBjb25zdCB0b1B1c2ggPSB0YXJnZXRbZmllbGRdO1xuXG4gICAgaWYgKHRvUHVzaCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICAgIH0gZWxzZSBpZiAoISh0b1B1c2ggaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAnQ2Fubm90IGFwcGx5ICRwdXNoQWxsIG1vZGlmaWVyIHRvIG5vbi1hcnJheScsXG4gICAgICAgIHtmaWVsZH1cbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRvUHVzaC5wdXNoKC4uLmFyZyk7XG4gICAgfVxuICB9LFxuICAkYWRkVG9TZXQodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgbGV0IGlzRWFjaCA9IGZhbHNlO1xuXG4gICAgaWYgKHR5cGVvZiBhcmcgPT09ICdvYmplY3QnKSB7XG4gICAgICAvLyBjaGVjayBpZiBmaXJzdCBrZXkgaXMgJyRlYWNoJ1xuICAgICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKGFyZyk7XG4gICAgICBpZiAoa2V5c1swXSA9PT0gJyRlYWNoJykge1xuICAgICAgICBpc0VhY2ggPSB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHZhbHVlcyA9IGlzRWFjaCA/IGFyZy4kZWFjaCA6IFthcmddO1xuXG4gICAgYXNzZXJ0SGFzVmFsaWRGaWVsZE5hbWVzKHZhbHVlcyk7XG5cbiAgICBjb25zdCB0b0FkZCA9IHRhcmdldFtmaWVsZF07XG4gICAgaWYgKHRvQWRkID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRhcmdldFtmaWVsZF0gPSB2YWx1ZXM7XG4gICAgfSBlbHNlIGlmICghKHRvQWRkIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgJ0Nhbm5vdCBhcHBseSAkYWRkVG9TZXQgbW9kaWZpZXIgdG8gbm9uLWFycmF5JyxcbiAgICAgICAge2ZpZWxkfVxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWVzLmZvckVhY2godmFsdWUgPT4ge1xuICAgICAgICBpZiAodG9BZGQuc29tZShlbGVtZW50ID0+IExvY2FsQ29sbGVjdGlvbi5fZi5fZXF1YWwodmFsdWUsIGVsZW1lbnQpKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRvQWRkLnB1c2godmFsdWUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9LFxuICAkcG9wKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIGlmICh0YXJnZXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHRvUG9wID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgIGlmICh0b1BvcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCEodG9Qb3AgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCdDYW5ub3QgYXBwbHkgJHBvcCBtb2RpZmllciB0byBub24tYXJyYXknLCB7ZmllbGR9KTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGFyZyA9PT0gJ251bWJlcicgJiYgYXJnIDwgMCkge1xuICAgICAgdG9Qb3Auc3BsaWNlKDAsIDEpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0b1BvcC5wb3AoKTtcbiAgICB9XG4gIH0sXG4gICRwdWxsKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIGlmICh0YXJnZXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHRvUHVsbCA9IHRhcmdldFtmaWVsZF07XG4gICAgaWYgKHRvUHVsbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCEodG9QdWxsIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgJ0Nhbm5vdCBhcHBseSAkcHVsbC9wdWxsQWxsIG1vZGlmaWVyIHRvIG5vbi1hcnJheScsXG4gICAgICAgIHtmaWVsZH1cbiAgICAgICk7XG4gICAgfVxuXG4gICAgbGV0IG91dDtcbiAgICBpZiAoYXJnICE9IG51bGwgJiYgdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgIShhcmcgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgIC8vIFhYWCB3b3VsZCBiZSBtdWNoIG5pY2VyIHRvIGNvbXBpbGUgdGhpcyBvbmNlLCByYXRoZXIgdGhhblxuICAgICAgLy8gZm9yIGVhY2ggZG9jdW1lbnQgd2UgbW9kaWZ5Li4gYnV0IHVzdWFsbHkgd2UncmUgbm90XG4gICAgICAvLyBtb2RpZnlpbmcgdGhhdCBtYW55IGRvY3VtZW50cywgc28gd2UnbGwgbGV0IGl0IHNsaWRlIGZvclxuICAgICAgLy8gbm93XG5cbiAgICAgIC8vIFhYWCBNaW5pbW9uZ28uTWF0Y2hlciBpc24ndCB1cCBmb3IgdGhlIGpvYiwgYmVjYXVzZSB3ZSBuZWVkXG4gICAgICAvLyB0byBwZXJtaXQgc3R1ZmYgbGlrZSB7JHB1bGw6IHthOiB7JGd0OiA0fX19Li4gc29tZXRoaW5nXG4gICAgICAvLyBsaWtlIHskZ3Q6IDR9IGlzIG5vdCBub3JtYWxseSBhIGNvbXBsZXRlIHNlbGVjdG9yLlxuICAgICAgLy8gc2FtZSBpc3N1ZSBhcyAkZWxlbU1hdGNoIHBvc3NpYmx5P1xuICAgICAgY29uc3QgbWF0Y2hlciA9IG5ldyBNaW5pbW9uZ28uTWF0Y2hlcihhcmcpO1xuXG4gICAgICBvdXQgPSB0b1B1bGwuZmlsdGVyKGVsZW1lbnQgPT4gIW1hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKGVsZW1lbnQpLnJlc3VsdCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCA9IHRvUHVsbC5maWx0ZXIoZWxlbWVudCA9PiAhTG9jYWxDb2xsZWN0aW9uLl9mLl9lcXVhbChlbGVtZW50LCBhcmcpKTtcbiAgICB9XG5cbiAgICB0YXJnZXRbZmllbGRdID0gb3V0O1xuICB9LFxuICAkcHVsbEFsbCh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICBpZiAoISh0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAnTW9kaWZpZXIgJHB1c2hBbGwvcHVsbEFsbCBhbGxvd2VkIGZvciBhcnJheXMgb25seScsXG4gICAgICAgIHtmaWVsZH1cbiAgICAgICk7XG4gICAgfVxuXG4gICAgaWYgKHRhcmdldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdG9QdWxsID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgIGlmICh0b1B1bGwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghKHRvUHVsbCBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICdDYW5ub3QgYXBwbHkgJHB1bGwvcHVsbEFsbCBtb2RpZmllciB0byBub24tYXJyYXknLFxuICAgICAgICB7ZmllbGR9XG4gICAgICApO1xuICAgIH1cblxuICAgIHRhcmdldFtmaWVsZF0gPSB0b1B1bGwuZmlsdGVyKG9iamVjdCA9PlxuICAgICAgIWFyZy5zb21lKGVsZW1lbnQgPT4gTG9jYWxDb2xsZWN0aW9uLl9mLl9lcXVhbChvYmplY3QsIGVsZW1lbnQpKVxuICAgICk7XG4gIH0sXG4gICRiaXQodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgLy8gWFhYIG1vbmdvIG9ubHkgc3VwcG9ydHMgJGJpdCBvbiBpbnRlZ2VycywgYW5kIHdlIG9ubHkgc3VwcG9ydFxuICAgIC8vIG5hdGl2ZSBqYXZhc2NyaXB0IG51bWJlcnMgKGRvdWJsZXMpIHNvIGZhciwgc28gd2UgY2FuJ3Qgc3VwcG9ydCAkYml0XG4gICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJyRiaXQgaXMgbm90IHN1cHBvcnRlZCcsIHtmaWVsZH0pO1xuICB9LFxuICAkdigpIHtcbiAgICAvLyBBcyBkaXNjdXNzZWQgaW4gaHR0cHM6Ly9naXRodWIuY29tL21ldGVvci9tZXRlb3IvaXNzdWVzLzk2MjMsXG4gICAgLy8gdGhlIGAkdmAgb3BlcmF0b3IgaXMgbm90IG5lZWRlZCBieSBNZXRlb3IsIGJ1dCBwcm9ibGVtcyBjYW4gb2NjdXIgaWZcbiAgICAvLyBpdCdzIG5vdCBhdCBsZWFzdCBjYWxsYWJsZSAoYXMgb2YgTW9uZ28gPj0gMy42KS4gSXQncyBkZWZpbmVkIGhlcmUgYXNcbiAgICAvLyBhIG5vLW9wIHRvIHdvcmsgYXJvdW5kIHRoZXNlIHByb2JsZW1zLlxuICB9XG59O1xuXG5jb25zdCBOT19DUkVBVEVfTU9ESUZJRVJTID0ge1xuICAkcG9wOiB0cnVlLFxuICAkcHVsbDogdHJ1ZSxcbiAgJHB1bGxBbGw6IHRydWUsXG4gICRyZW5hbWU6IHRydWUsXG4gICR1bnNldDogdHJ1ZVxufTtcblxuLy8gTWFrZSBzdXJlIGZpZWxkIG5hbWVzIGRvIG5vdCBjb250YWluIE1vbmdvIHJlc3RyaWN0ZWRcbi8vIGNoYXJhY3RlcnMgKCcuJywgJyQnLCAnXFwwJykuXG4vLyBodHRwczovL2RvY3MubW9uZ29kYi5jb20vbWFudWFsL3JlZmVyZW5jZS9saW1pdHMvI1Jlc3RyaWN0aW9ucy1vbi1GaWVsZC1OYW1lc1xuY29uc3QgaW52YWxpZENoYXJNc2cgPSB7XG4gICQ6ICdzdGFydCB3aXRoIFxcJyRcXCcnLFxuICAnLic6ICdjb250YWluIFxcJy5cXCcnLFxuICAnXFwwJzogJ2NvbnRhaW4gbnVsbCBieXRlcydcbn07XG5cbi8vIGNoZWNrcyBpZiBhbGwgZmllbGQgbmFtZXMgaW4gYW4gb2JqZWN0IGFyZSB2YWxpZFxuZnVuY3Rpb24gYXNzZXJ0SGFzVmFsaWRGaWVsZE5hbWVzKGRvYykge1xuICBpZiAoZG9jICYmIHR5cGVvZiBkb2MgPT09ICdvYmplY3QnKSB7XG4gICAgSlNPTi5zdHJpbmdpZnkoZG9jLCAoa2V5LCB2YWx1ZSkgPT4ge1xuICAgICAgYXNzZXJ0SXNWYWxpZEZpZWxkTmFtZShrZXkpO1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGFzc2VydElzVmFsaWRGaWVsZE5hbWUoa2V5KSB7XG4gIGxldCBtYXRjaDtcbiAgaWYgKHR5cGVvZiBrZXkgPT09ICdzdHJpbmcnICYmIChtYXRjaCA9IGtleS5tYXRjaCgvXlxcJHxcXC58XFwwLykpKSB7XG4gICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoYEtleSAke2tleX0gbXVzdCBub3QgJHtpbnZhbGlkQ2hhck1zZ1ttYXRjaFswXV19YCk7XG4gIH1cbn1cblxuLy8gZm9yIGEuYi5jLjIuZC5lLCBrZXlwYXJ0cyBzaG91bGQgYmUgWydhJywgJ2InLCAnYycsICcyJywgJ2QnLCAnZSddLFxuLy8gYW5kIHRoZW4geW91IHdvdWxkIG9wZXJhdGUgb24gdGhlICdlJyBwcm9wZXJ0eSBvZiB0aGUgcmV0dXJuZWRcbi8vIG9iamVjdC5cbi8vXG4vLyBpZiBvcHRpb25zLm5vQ3JlYXRlIGlzIGZhbHNleSwgY3JlYXRlcyBpbnRlcm1lZGlhdGUgbGV2ZWxzIG9mXG4vLyBzdHJ1Y3R1cmUgYXMgbmVjZXNzYXJ5LCBsaWtlIG1rZGlyIC1wIChhbmQgcmFpc2VzIGFuIGV4Y2VwdGlvbiBpZlxuLy8gdGhhdCB3b3VsZCBtZWFuIGdpdmluZyBhIG5vbi1udW1lcmljIHByb3BlcnR5IHRvIGFuIGFycmF5LikgaWZcbi8vIG9wdGlvbnMubm9DcmVhdGUgaXMgdHJ1ZSwgcmV0dXJuIHVuZGVmaW5lZCBpbnN0ZWFkLlxuLy9cbi8vIG1heSBtb2RpZnkgdGhlIGxhc3QgZWxlbWVudCBvZiBrZXlwYXJ0cyB0byBzaWduYWwgdG8gdGhlIGNhbGxlciB0aGF0IGl0IG5lZWRzXG4vLyB0byB1c2UgYSBkaWZmZXJlbnQgdmFsdWUgdG8gaW5kZXggaW50byB0aGUgcmV0dXJuZWQgb2JqZWN0IChmb3IgZXhhbXBsZSxcbi8vIFsnYScsICcwMSddIC0+IFsnYScsIDFdKS5cbi8vXG4vLyBpZiBmb3JiaWRBcnJheSBpcyB0cnVlLCByZXR1cm4gbnVsbCBpZiB0aGUga2V5cGF0aCBnb2VzIHRocm91Z2ggYW4gYXJyYXkuXG4vL1xuLy8gaWYgb3B0aW9ucy5hcnJheUluZGljZXMgaXMgc2V0LCB1c2UgaXRzIGZpcnN0IGVsZW1lbnQgZm9yIHRoZSAoZmlyc3QpICckJyBpblxuLy8gdGhlIHBhdGguXG5mdW5jdGlvbiBmaW5kTW9kVGFyZ2V0KGRvYywga2V5cGFydHMsIG9wdGlvbnMgPSB7fSkge1xuICBsZXQgdXNlZEFycmF5SW5kZXggPSBmYWxzZTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGtleXBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgbGFzdCA9IGkgPT09IGtleXBhcnRzLmxlbmd0aCAtIDE7XG4gICAgbGV0IGtleXBhcnQgPSBrZXlwYXJ0c1tpXTtcblxuICAgIGlmICghaXNJbmRleGFibGUoZG9jKSkge1xuICAgICAgaWYgKG9wdGlvbnMubm9DcmVhdGUpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZXJyb3IgPSBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgYGNhbm5vdCB1c2UgdGhlIHBhcnQgJyR7a2V5cGFydH0nIHRvIHRyYXZlcnNlICR7ZG9jfWBcbiAgICAgICk7XG4gICAgICBlcnJvci5zZXRQcm9wZXJ0eUVycm9yID0gdHJ1ZTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cblxuICAgIGlmIChkb2MgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgaWYgKG9wdGlvbnMuZm9yYmlkQXJyYXkpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGlmIChrZXlwYXJ0ID09PSAnJCcpIHtcbiAgICAgICAgaWYgKHVzZWRBcnJheUluZGV4KSB7XG4gICAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJ1RvbyBtYW55IHBvc2l0aW9uYWwgKGkuZS4gXFwnJFxcJykgZWxlbWVudHMnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghb3B0aW9ucy5hcnJheUluZGljZXMgfHwgIW9wdGlvbnMuYXJyYXlJbmRpY2VzLmxlbmd0aCkge1xuICAgICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAgICAgJ1RoZSBwb3NpdGlvbmFsIG9wZXJhdG9yIGRpZCBub3QgZmluZCB0aGUgbWF0Y2ggbmVlZGVkIGZyb20gdGhlICcgK1xuICAgICAgICAgICAgJ3F1ZXJ5J1xuICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBrZXlwYXJ0ID0gb3B0aW9ucy5hcnJheUluZGljZXNbMF07XG4gICAgICAgIHVzZWRBcnJheUluZGV4ID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoaXNOdW1lcmljS2V5KGtleXBhcnQpKSB7XG4gICAgICAgIGtleXBhcnQgPSBwYXJzZUludChrZXlwYXJ0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChvcHRpb25zLm5vQ3JlYXRlKSB7XG4gICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAgIGBjYW4ndCBhcHBlbmQgdG8gYXJyYXkgdXNpbmcgc3RyaW5nIGZpZWxkIG5hbWUgWyR7a2V5cGFydH1dYFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBpZiAobGFzdCkge1xuICAgICAgICBrZXlwYXJ0c1tpXSA9IGtleXBhcnQ7IC8vIGhhbmRsZSAnYS4wMSdcbiAgICAgIH1cblxuICAgICAgaWYgKG9wdGlvbnMubm9DcmVhdGUgJiYga2V5cGFydCA+PSBkb2MubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIHdoaWxlIChkb2MubGVuZ3RoIDwga2V5cGFydCkge1xuICAgICAgICBkb2MucHVzaChudWxsKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFsYXN0KSB7XG4gICAgICAgIGlmIChkb2MubGVuZ3RoID09PSBrZXlwYXJ0KSB7XG4gICAgICAgICAgZG9jLnB1c2goe30pO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBkb2Nba2V5cGFydF0gIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICAgICBgY2FuJ3QgbW9kaWZ5IGZpZWxkICcke2tleXBhcnRzW2kgKyAxXX0nIG9mIGxpc3QgdmFsdWUgYCArXG4gICAgICAgICAgICBKU09OLnN0cmluZ2lmeShkb2Nba2V5cGFydF0pXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBhc3NlcnRJc1ZhbGlkRmllbGROYW1lKGtleXBhcnQpO1xuXG4gICAgICBpZiAoIShrZXlwYXJ0IGluIGRvYykpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMubm9DcmVhdGUpIHtcbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFsYXN0KSB7XG4gICAgICAgICAgZG9jW2tleXBhcnRdID0ge307XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobGFzdCkge1xuICAgICAgcmV0dXJuIGRvYztcbiAgICB9XG5cbiAgICBkb2MgPSBkb2Nba2V5cGFydF07XG4gIH1cblxuICAvLyBub3RyZWFjaGVkXG59XG4iLCJpbXBvcnQgTG9jYWxDb2xsZWN0aW9uIGZyb20gJy4vbG9jYWxfY29sbGVjdGlvbi5qcyc7XG5pbXBvcnQge1xuICBjb21waWxlRG9jdW1lbnRTZWxlY3RvcixcbiAgaGFzT3duLFxuICBub3RoaW5nTWF0Y2hlcixcbn0gZnJvbSAnLi9jb21tb24uanMnO1xuXG5jb25zdCBEZWNpbWFsID0gUGFja2FnZVsnbW9uZ28tZGVjaW1hbCddPy5EZWNpbWFsIHx8IGNsYXNzIERlY2ltYWxTdHViIHt9XG5cbi8vIFRoZSBtaW5pbW9uZ28gc2VsZWN0b3IgY29tcGlsZXIhXG5cbi8vIFRlcm1pbm9sb2d5OlxuLy8gIC0gYSAnc2VsZWN0b3InIGlzIHRoZSBFSlNPTiBvYmplY3QgcmVwcmVzZW50aW5nIGEgc2VsZWN0b3Jcbi8vICAtIGEgJ21hdGNoZXInIGlzIGl0cyBjb21waWxlZCBmb3JtICh3aGV0aGVyIGEgZnVsbCBNaW5pbW9uZ28uTWF0Y2hlclxuLy8gICAgb2JqZWN0IG9yIG9uZSBvZiB0aGUgY29tcG9uZW50IGxhbWJkYXMgdGhhdCBtYXRjaGVzIHBhcnRzIG9mIGl0KVxuLy8gIC0gYSAncmVzdWx0IG9iamVjdCcgaXMgYW4gb2JqZWN0IHdpdGggYSAncmVzdWx0JyBmaWVsZCBhbmQgbWF5YmVcbi8vICAgIGRpc3RhbmNlIGFuZCBhcnJheUluZGljZXMuXG4vLyAgLSBhICdicmFuY2hlZCB2YWx1ZScgaXMgYW4gb2JqZWN0IHdpdGggYSAndmFsdWUnIGZpZWxkIGFuZCBtYXliZVxuLy8gICAgJ2RvbnRJdGVyYXRlJyBhbmQgJ2FycmF5SW5kaWNlcycuXG4vLyAgLSBhICdkb2N1bWVudCcgaXMgYSB0b3AtbGV2ZWwgb2JqZWN0IHRoYXQgY2FuIGJlIHN0b3JlZCBpbiBhIGNvbGxlY3Rpb24uXG4vLyAgLSBhICdsb29rdXAgZnVuY3Rpb24nIGlzIGEgZnVuY3Rpb24gdGhhdCB0YWtlcyBpbiBhIGRvY3VtZW50IGFuZCByZXR1cm5zXG4vLyAgICBhbiBhcnJheSBvZiAnYnJhbmNoZWQgdmFsdWVzJy5cbi8vICAtIGEgJ2JyYW5jaGVkIG1hdGNoZXInIG1hcHMgZnJvbSBhbiBhcnJheSBvZiBicmFuY2hlZCB2YWx1ZXMgdG8gYSByZXN1bHRcbi8vICAgIG9iamVjdC5cbi8vICAtIGFuICdlbGVtZW50IG1hdGNoZXInIG1hcHMgZnJvbSBhIHNpbmdsZSB2YWx1ZSB0byBhIGJvb2wuXG5cbi8vIE1haW4gZW50cnkgcG9pbnQuXG4vLyAgIHZhciBtYXRjaGVyID0gbmV3IE1pbmltb25nby5NYXRjaGVyKHthOiB7JGd0OiA1fX0pO1xuLy8gICBpZiAobWF0Y2hlci5kb2N1bWVudE1hdGNoZXMoe2E6IDd9KSkgLi4uXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNYXRjaGVyIHtcbiAgY29uc3RydWN0b3Ioc2VsZWN0b3IsIGlzVXBkYXRlKSB7XG4gICAgLy8gQSBzZXQgKG9iamVjdCBtYXBwaW5nIHN0cmluZyAtPiAqKSBvZiBhbGwgb2YgdGhlIGRvY3VtZW50IHBhdGhzIGxvb2tlZFxuICAgIC8vIGF0IGJ5IHRoZSBzZWxlY3Rvci4gQWxzbyBpbmNsdWRlcyB0aGUgZW1wdHkgc3RyaW5nIGlmIGl0IG1heSBsb29rIGF0IGFueVxuICAgIC8vIHBhdGggKGVnLCAkd2hlcmUpLlxuICAgIHRoaXMuX3BhdGhzID0ge307XG4gICAgLy8gU2V0IHRvIHRydWUgaWYgY29tcGlsYXRpb24gZmluZHMgYSAkbmVhci5cbiAgICB0aGlzLl9oYXNHZW9RdWVyeSA9IGZhbHNlO1xuICAgIC8vIFNldCB0byB0cnVlIGlmIGNvbXBpbGF0aW9uIGZpbmRzIGEgJHdoZXJlLlxuICAgIHRoaXMuX2hhc1doZXJlID0gZmFsc2U7XG4gICAgLy8gU2V0IHRvIGZhbHNlIGlmIGNvbXBpbGF0aW9uIGZpbmRzIGFueXRoaW5nIG90aGVyIHRoYW4gYSBzaW1wbGUgZXF1YWxpdHlcbiAgICAvLyBvciBvbmUgb3IgbW9yZSBvZiAnJGd0JywgJyRndGUnLCAnJGx0JywgJyRsdGUnLCAnJG5lJywgJyRpbicsICckbmluJyB1c2VkXG4gICAgLy8gd2l0aCBzY2FsYXJzIGFzIG9wZXJhbmRzLlxuICAgIHRoaXMuX2lzU2ltcGxlID0gdHJ1ZTtcbiAgICAvLyBTZXQgdG8gYSBkdW1teSBkb2N1bWVudCB3aGljaCBhbHdheXMgbWF0Y2hlcyB0aGlzIE1hdGNoZXIuIE9yIHNldCB0byBudWxsXG4gICAgLy8gaWYgc3VjaCBkb2N1bWVudCBpcyB0b28gaGFyZCB0byBmaW5kLlxuICAgIHRoaXMuX21hdGNoaW5nRG9jdW1lbnQgPSB1bmRlZmluZWQ7XG4gICAgLy8gQSBjbG9uZSBvZiB0aGUgb3JpZ2luYWwgc2VsZWN0b3IuIEl0IG1heSBqdXN0IGJlIGEgZnVuY3Rpb24gaWYgdGhlIHVzZXJcbiAgICAvLyBwYXNzZWQgaW4gYSBmdW5jdGlvbjsgb3RoZXJ3aXNlIGlzIGRlZmluaXRlbHkgYW4gb2JqZWN0IChlZywgSURzIGFyZVxuICAgIC8vIHRyYW5zbGF0ZWQgaW50byB7X2lkOiBJRH0gZmlyc3QuIFVzZWQgYnkgY2FuQmVjb21lVHJ1ZUJ5TW9kaWZpZXIgYW5kXG4gICAgLy8gU29ydGVyLl91c2VXaXRoTWF0Y2hlci5cbiAgICB0aGlzLl9zZWxlY3RvciA9IG51bGw7XG4gICAgdGhpcy5fZG9jTWF0Y2hlciA9IHRoaXMuX2NvbXBpbGVTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgLy8gU2V0IHRvIHRydWUgaWYgc2VsZWN0aW9uIGlzIGRvbmUgZm9yIGFuIHVwZGF0ZSBvcGVyYXRpb25cbiAgICAvLyBEZWZhdWx0IGlzIGZhbHNlXG4gICAgLy8gVXNlZCBmb3IgJG5lYXIgYXJyYXkgdXBkYXRlIChpc3N1ZSAjMzU5OSlcbiAgICB0aGlzLl9pc1VwZGF0ZSA9IGlzVXBkYXRlO1xuICB9XG5cbiAgZG9jdW1lbnRNYXRjaGVzKGRvYykge1xuICAgIGlmIChkb2MgIT09IE9iamVjdChkb2MpKSB7XG4gICAgICB0aHJvdyBFcnJvcignZG9jdW1lbnRNYXRjaGVzIG5lZWRzIGEgZG9jdW1lbnQnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fZG9jTWF0Y2hlcihkb2MpO1xuICB9XG5cbiAgaGFzR2VvUXVlcnkoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2hhc0dlb1F1ZXJ5O1xuICB9XG5cbiAgaGFzV2hlcmUoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2hhc1doZXJlO1xuICB9XG5cbiAgaXNTaW1wbGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2lzU2ltcGxlO1xuICB9XG5cbiAgLy8gR2l2ZW4gYSBzZWxlY3RvciwgcmV0dXJuIGEgZnVuY3Rpb24gdGhhdCB0YWtlcyBvbmUgYXJndW1lbnQsIGFcbiAgLy8gZG9jdW1lbnQuIEl0IHJldHVybnMgYSByZXN1bHQgb2JqZWN0LlxuICBfY29tcGlsZVNlbGVjdG9yKHNlbGVjdG9yKSB7XG4gICAgLy8geW91IGNhbiBwYXNzIGEgbGl0ZXJhbCBmdW5jdGlvbiBpbnN0ZWFkIG9mIGEgc2VsZWN0b3JcbiAgICBpZiAoc2VsZWN0b3IgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgdGhpcy5faXNTaW1wbGUgPSBmYWxzZTtcbiAgICAgIHRoaXMuX3NlbGVjdG9yID0gc2VsZWN0b3I7XG4gICAgICB0aGlzLl9yZWNvcmRQYXRoVXNlZCgnJyk7XG5cbiAgICAgIHJldHVybiBkb2MgPT4gKHtyZXN1bHQ6ICEhc2VsZWN0b3IuY2FsbChkb2MpfSk7XG4gICAgfVxuXG4gICAgLy8gc2hvcnRoYW5kIC0tIHNjYWxhciBfaWRcbiAgICBpZiAoTG9jYWxDb2xsZWN0aW9uLl9zZWxlY3RvcklzSWQoc2VsZWN0b3IpKSB7XG4gICAgICB0aGlzLl9zZWxlY3RvciA9IHtfaWQ6IHNlbGVjdG9yfTtcbiAgICAgIHRoaXMuX3JlY29yZFBhdGhVc2VkKCdfaWQnKTtcblxuICAgICAgcmV0dXJuIGRvYyA9PiAoe3Jlc3VsdDogRUpTT04uZXF1YWxzKGRvYy5faWQsIHNlbGVjdG9yKX0pO1xuICAgIH1cblxuICAgIC8vIHByb3RlY3QgYWdhaW5zdCBkYW5nZXJvdXMgc2VsZWN0b3JzLiAgZmFsc2V5IGFuZCB7X2lkOiBmYWxzZXl9IGFyZSBib3RoXG4gICAgLy8gbGlrZWx5IHByb2dyYW1tZXIgZXJyb3IsIGFuZCBub3Qgd2hhdCB5b3Ugd2FudCwgcGFydGljdWxhcmx5IGZvclxuICAgIC8vIGRlc3RydWN0aXZlIG9wZXJhdGlvbnMuXG4gICAgaWYgKCFzZWxlY3RvciB8fCBoYXNPd24uY2FsbChzZWxlY3RvciwgJ19pZCcpICYmICFzZWxlY3Rvci5faWQpIHtcbiAgICAgIHRoaXMuX2lzU2ltcGxlID0gZmFsc2U7XG4gICAgICByZXR1cm4gbm90aGluZ01hdGNoZXI7XG4gICAgfVxuXG4gICAgLy8gVG9wIGxldmVsIGNhbid0IGJlIGFuIGFycmF5IG9yIHRydWUgb3IgYmluYXJ5LlxuICAgIGlmIChBcnJheS5pc0FycmF5KHNlbGVjdG9yKSB8fFxuICAgICAgICBFSlNPTi5pc0JpbmFyeShzZWxlY3RvcikgfHxcbiAgICAgICAgdHlwZW9mIHNlbGVjdG9yID09PSAnYm9vbGVhbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBzZWxlY3RvcjogJHtzZWxlY3Rvcn1gKTtcbiAgICB9XG5cbiAgICB0aGlzLl9zZWxlY3RvciA9IEVKU09OLmNsb25lKHNlbGVjdG9yKTtcblxuICAgIHJldHVybiBjb21waWxlRG9jdW1lbnRTZWxlY3RvcihzZWxlY3RvciwgdGhpcywge2lzUm9vdDogdHJ1ZX0pO1xuICB9XG5cbiAgLy8gUmV0dXJucyBhIGxpc3Qgb2Yga2V5IHBhdGhzIHRoZSBnaXZlbiBzZWxlY3RvciBpcyBsb29raW5nIGZvci4gSXQgaW5jbHVkZXNcbiAgLy8gdGhlIGVtcHR5IHN0cmluZyBpZiB0aGVyZSBpcyBhICR3aGVyZS5cbiAgX2dldFBhdGhzKCkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl9wYXRocyk7XG4gIH1cblxuICBfcmVjb3JkUGF0aFVzZWQocGF0aCkge1xuICAgIHRoaXMuX3BhdGhzW3BhdGhdID0gdHJ1ZTtcbiAgfVxufVxuXG4vLyBoZWxwZXJzIHVzZWQgYnkgY29tcGlsZWQgc2VsZWN0b3IgY29kZVxuTG9jYWxDb2xsZWN0aW9uLl9mID0ge1xuICAvLyBYWFggZm9yIF9hbGwgYW5kIF9pbiwgY29uc2lkZXIgYnVpbGRpbmcgJ2lucXVlcnknIGF0IGNvbXBpbGUgdGltZS4uXG4gIF90eXBlKHYpIHtcbiAgICBpZiAodHlwZW9mIHYgPT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHYgPT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gMjtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHYgPT09ICdib29sZWFuJykge1xuICAgICAgcmV0dXJuIDg7XG4gICAgfVxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkodikpIHtcbiAgICAgIHJldHVybiA0O1xuICAgIH1cblxuICAgIGlmICh2ID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gMTA7XG4gICAgfVxuXG4gICAgLy8gbm90ZSB0aGF0IHR5cGVvZigveC8pID09PSBcIm9iamVjdFwiXG4gICAgaWYgKHYgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgIHJldHVybiAxMTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHYgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiAxMztcbiAgICB9XG5cbiAgICBpZiAodiBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICAgIHJldHVybiA5O1xuICAgIH1cblxuICAgIGlmIChFSlNPTi5pc0JpbmFyeSh2KSkge1xuICAgICAgcmV0dXJuIDU7XG4gICAgfVxuXG4gICAgaWYgKHYgaW5zdGFuY2VvZiBNb25nb0lELk9iamVjdElEKSB7XG4gICAgICByZXR1cm4gNztcbiAgICB9XG5cbiAgICBpZiAodiBpbnN0YW5jZW9mIERlY2ltYWwpIHtcbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIC8vIG9iamVjdFxuICAgIHJldHVybiAzO1xuXG4gICAgLy8gWFhYIHN1cHBvcnQgc29tZS9hbGwgb2YgdGhlc2U6XG4gICAgLy8gMTQsIHN5bWJvbFxuICAgIC8vIDE1LCBqYXZhc2NyaXB0IGNvZGUgd2l0aCBzY29wZVxuICAgIC8vIDE2LCAxODogMzItYml0LzY0LWJpdCBpbnRlZ2VyXG4gICAgLy8gMTcsIHRpbWVzdGFtcFxuICAgIC8vIDI1NSwgbWlua2V5XG4gICAgLy8gMTI3LCBtYXhrZXlcbiAgfSxcblxuICAvLyBkZWVwIGVxdWFsaXR5IHRlc3Q6IHVzZSBmb3IgbGl0ZXJhbCBkb2N1bWVudCBhbmQgYXJyYXkgbWF0Y2hlc1xuICBfZXF1YWwoYSwgYikge1xuICAgIHJldHVybiBFSlNPTi5lcXVhbHMoYSwgYiwge2tleU9yZGVyU2Vuc2l0aXZlOiB0cnVlfSk7XG4gIH0sXG5cbiAgLy8gbWFwcyBhIHR5cGUgY29kZSB0byBhIHZhbHVlIHRoYXQgY2FuIGJlIHVzZWQgdG8gc29ydCB2YWx1ZXMgb2YgZGlmZmVyZW50XG4gIC8vIHR5cGVzXG4gIF90eXBlb3JkZXIodCkge1xuICAgIC8vIGh0dHA6Ly93d3cubW9uZ29kYi5vcmcvZGlzcGxheS9ET0NTL1doYXQraXMrdGhlK0NvbXBhcmUrT3JkZXIrZm9yK0JTT04rVHlwZXNcbiAgICAvLyBYWFggd2hhdCBpcyB0aGUgY29ycmVjdCBzb3J0IHBvc2l0aW9uIGZvciBKYXZhc2NyaXB0IGNvZGU/XG4gICAgLy8gKCcxMDAnIGluIHRoZSBtYXRyaXggYmVsb3cpXG4gICAgLy8gWFhYIG1pbmtleS9tYXhrZXlcbiAgICByZXR1cm4gW1xuICAgICAgLTEsICAvLyAobm90IGEgdHlwZSlcbiAgICAgIDEsICAgLy8gbnVtYmVyXG4gICAgICAyLCAgIC8vIHN0cmluZ1xuICAgICAgMywgICAvLyBvYmplY3RcbiAgICAgIDQsICAgLy8gYXJyYXlcbiAgICAgIDUsICAgLy8gYmluYXJ5XG4gICAgICAtMSwgIC8vIGRlcHJlY2F0ZWRcbiAgICAgIDYsICAgLy8gT2JqZWN0SURcbiAgICAgIDcsICAgLy8gYm9vbFxuICAgICAgOCwgICAvLyBEYXRlXG4gICAgICAwLCAgIC8vIG51bGxcbiAgICAgIDksICAgLy8gUmVnRXhwXG4gICAgICAtMSwgIC8vIGRlcHJlY2F0ZWRcbiAgICAgIDEwMCwgLy8gSlMgY29kZVxuICAgICAgMiwgICAvLyBkZXByZWNhdGVkIChzeW1ib2wpXG4gICAgICAxMDAsIC8vIEpTIGNvZGVcbiAgICAgIDEsICAgLy8gMzItYml0IGludFxuICAgICAgOCwgICAvLyBNb25nbyB0aW1lc3RhbXBcbiAgICAgIDEgICAgLy8gNjQtYml0IGludFxuICAgIF1bdF07XG4gIH0sXG5cbiAgLy8gY29tcGFyZSB0d28gdmFsdWVzIG9mIHVua25vd24gdHlwZSBhY2NvcmRpbmcgdG8gQlNPTiBvcmRlcmluZ1xuICAvLyBzZW1hbnRpY3MuIChhcyBhbiBleHRlbnNpb24sIGNvbnNpZGVyICd1bmRlZmluZWQnIHRvIGJlIGxlc3MgdGhhblxuICAvLyBhbnkgb3RoZXIgdmFsdWUuKSByZXR1cm4gbmVnYXRpdmUgaWYgYSBpcyBsZXNzLCBwb3NpdGl2ZSBpZiBiIGlzXG4gIC8vIGxlc3MsIG9yIDAgaWYgZXF1YWxcbiAgX2NtcChhLCBiKSB7XG4gICAgaWYgKGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGIgPT09IHVuZGVmaW5lZCA/IDAgOiAtMTtcbiAgICB9XG5cbiAgICBpZiAoYiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBsZXQgdGEgPSBMb2NhbENvbGxlY3Rpb24uX2YuX3R5cGUoYSk7XG4gICAgbGV0IHRiID0gTG9jYWxDb2xsZWN0aW9uLl9mLl90eXBlKGIpO1xuXG4gICAgY29uc3Qgb2EgPSBMb2NhbENvbGxlY3Rpb24uX2YuX3R5cGVvcmRlcih0YSk7XG4gICAgY29uc3Qgb2IgPSBMb2NhbENvbGxlY3Rpb24uX2YuX3R5cGVvcmRlcih0Yik7XG5cbiAgICBpZiAob2EgIT09IG9iKSB7XG4gICAgICByZXR1cm4gb2EgPCBvYiA/IC0xIDogMTtcbiAgICB9XG5cbiAgICAvLyBYWFggbmVlZCB0byBpbXBsZW1lbnQgdGhpcyBpZiB3ZSBpbXBsZW1lbnQgU3ltYm9sIG9yIGludGVnZXJzLCBvclxuICAgIC8vIFRpbWVzdGFtcFxuICAgIGlmICh0YSAhPT0gdGIpIHtcbiAgICAgIHRocm93IEVycm9yKCdNaXNzaW5nIHR5cGUgY29lcmNpb24gbG9naWMgaW4gX2NtcCcpO1xuICAgIH1cblxuICAgIGlmICh0YSA9PT0gNykgeyAvLyBPYmplY3RJRFxuICAgICAgLy8gQ29udmVydCB0byBzdHJpbmcuXG4gICAgICB0YSA9IHRiID0gMjtcbiAgICAgIGEgPSBhLnRvSGV4U3RyaW5nKCk7XG4gICAgICBiID0gYi50b0hleFN0cmluZygpO1xuICAgIH1cblxuICAgIGlmICh0YSA9PT0gOSkgeyAvLyBEYXRlXG4gICAgICAvLyBDb252ZXJ0IHRvIG1pbGxpcy5cbiAgICAgIHRhID0gdGIgPSAxO1xuICAgICAgYSA9IGlzTmFOKGEpID8gMCA6IGEuZ2V0VGltZSgpO1xuICAgICAgYiA9IGlzTmFOKGIpID8gMCA6IGIuZ2V0VGltZSgpO1xuICAgIH1cblxuICAgIGlmICh0YSA9PT0gMSkgeyAvLyBkb3VibGVcbiAgICAgIGlmIChhIGluc3RhbmNlb2YgRGVjaW1hbCkge1xuICAgICAgICByZXR1cm4gYS5taW51cyhiKS50b051bWJlcigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGEgLSBiO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0YiA9PT0gMikgLy8gc3RyaW5nXG4gICAgICByZXR1cm4gYSA8IGIgPyAtMSA6IGEgPT09IGIgPyAwIDogMTtcblxuICAgIGlmICh0YSA9PT0gMykgeyAvLyBPYmplY3RcbiAgICAgIC8vIHRoaXMgY291bGQgYmUgbXVjaCBtb3JlIGVmZmljaWVudCBpbiB0aGUgZXhwZWN0ZWQgY2FzZSAuLi5cbiAgICAgIGNvbnN0IHRvQXJyYXkgPSBvYmplY3QgPT4ge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBbXTtcblxuICAgICAgICBPYmplY3Qua2V5cyhvYmplY3QpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICByZXN1bHQucHVzaChrZXksIG9iamVjdFtrZXldKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH07XG5cbiAgICAgIHJldHVybiBMb2NhbENvbGxlY3Rpb24uX2YuX2NtcCh0b0FycmF5KGEpLCB0b0FycmF5KGIpKTtcbiAgICB9XG5cbiAgICBpZiAodGEgPT09IDQpIHsgLy8gQXJyYXlcbiAgICAgIGZvciAobGV0IGkgPSAwOyA7IGkrKykge1xuICAgICAgICBpZiAoaSA9PT0gYS5sZW5ndGgpIHtcbiAgICAgICAgICByZXR1cm4gaSA9PT0gYi5sZW5ndGggPyAwIDogLTE7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaSA9PT0gYi5sZW5ndGgpIHtcbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHMgPSBMb2NhbENvbGxlY3Rpb24uX2YuX2NtcChhW2ldLCBiW2ldKTtcbiAgICAgICAgaWYgKHMgIT09IDApIHtcbiAgICAgICAgICByZXR1cm4gcztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0YSA9PT0gNSkgeyAvLyBiaW5hcnlcbiAgICAgIC8vIFN1cnByaXNpbmdseSwgYSBzbWFsbCBiaW5hcnkgYmxvYiBpcyBhbHdheXMgbGVzcyB0aGFuIGEgbGFyZ2Ugb25lIGluXG4gICAgICAvLyBNb25nby5cbiAgICAgIGlmIChhLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGEubGVuZ3RoIC0gYi5sZW5ndGg7XG4gICAgICB9XG5cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYS5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoYVtpXSA8IGJbaV0pIHtcbiAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYVtpXSA+IGJbaV0pIHtcbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBpZiAodGEgPT09IDgpIHsgLy8gYm9vbGVhblxuICAgICAgaWYgKGEpIHtcbiAgICAgICAgcmV0dXJuIGIgPyAwIDogMTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGIgPyAtMSA6IDA7XG4gICAgfVxuXG4gICAgaWYgKHRhID09PSAxMCkgLy8gbnVsbFxuICAgICAgcmV0dXJuIDA7XG5cbiAgICBpZiAodGEgPT09IDExKSAvLyByZWdleHBcbiAgICAgIHRocm93IEVycm9yKCdTb3J0aW5nIG5vdCBzdXBwb3J0ZWQgb24gcmVndWxhciBleHByZXNzaW9uJyk7IC8vIFhYWFxuXG4gICAgLy8gMTM6IGphdmFzY3JpcHQgY29kZVxuICAgIC8vIDE0OiBzeW1ib2xcbiAgICAvLyAxNTogamF2YXNjcmlwdCBjb2RlIHdpdGggc2NvcGVcbiAgICAvLyAxNjogMzItYml0IGludGVnZXJcbiAgICAvLyAxNzogdGltZXN0YW1wXG4gICAgLy8gMTg6IDY0LWJpdCBpbnRlZ2VyXG4gICAgLy8gMjU1OiBtaW5rZXlcbiAgICAvLyAxMjc6IG1heGtleVxuICAgIGlmICh0YSA9PT0gMTMpIC8vIGphdmFzY3JpcHQgY29kZVxuICAgICAgdGhyb3cgRXJyb3IoJ1NvcnRpbmcgbm90IHN1cHBvcnRlZCBvbiBKYXZhc2NyaXB0IGNvZGUnKTsgLy8gWFhYXG5cbiAgICB0aHJvdyBFcnJvcignVW5rbm93biB0eXBlIHRvIHNvcnQnKTtcbiAgfSxcbn07XG4iLCJpbXBvcnQgTG9jYWxDb2xsZWN0aW9uXyBmcm9tICcuL2xvY2FsX2NvbGxlY3Rpb24uanMnO1xuaW1wb3J0IE1hdGNoZXIgZnJvbSAnLi9tYXRjaGVyLmpzJztcbmltcG9ydCBTb3J0ZXIgZnJvbSAnLi9zb3J0ZXIuanMnO1xuXG5Mb2NhbENvbGxlY3Rpb24gPSBMb2NhbENvbGxlY3Rpb25fO1xuTWluaW1vbmdvID0ge1xuICAgIExvY2FsQ29sbGVjdGlvbjogTG9jYWxDb2xsZWN0aW9uXyxcbiAgICBNYXRjaGVyLFxuICAgIFNvcnRlclxufTtcbiIsIi8vIE9ic2VydmVIYW5kbGU6IHRoZSByZXR1cm4gdmFsdWUgb2YgYSBsaXZlIHF1ZXJ5LlxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgT2JzZXJ2ZUhhbmRsZSB7fVxuIiwiaW1wb3J0IHtcbiAgRUxFTUVOVF9PUEVSQVRPUlMsXG4gIGVxdWFsaXR5RWxlbWVudE1hdGNoZXIsXG4gIGV4cGFuZEFycmF5c0luQnJhbmNoZXMsXG4gIGhhc093bixcbiAgaXNPcGVyYXRvck9iamVjdCxcbiAgbWFrZUxvb2t1cEZ1bmN0aW9uLFxuICByZWdleHBFbGVtZW50TWF0Y2hlcixcbn0gZnJvbSAnLi9jb21tb24uanMnO1xuXG4vLyBHaXZlIGEgc29ydCBzcGVjLCB3aGljaCBjYW4gYmUgaW4gYW55IG9mIHRoZXNlIGZvcm1zOlxuLy8gICB7XCJrZXkxXCI6IDEsIFwia2V5MlwiOiAtMX1cbi8vICAgW1tcImtleTFcIiwgXCJhc2NcIl0sIFtcImtleTJcIiwgXCJkZXNjXCJdXVxuLy8gICBbXCJrZXkxXCIsIFtcImtleTJcIiwgXCJkZXNjXCJdXVxuLy9cbi8vICguLiB3aXRoIHRoZSBmaXJzdCBmb3JtIGJlaW5nIGRlcGVuZGVudCBvbiB0aGUga2V5IGVudW1lcmF0aW9uXG4vLyBiZWhhdmlvciBvZiB5b3VyIGphdmFzY3JpcHQgVk0sIHdoaWNoIHVzdWFsbHkgZG9lcyB3aGF0IHlvdSBtZWFuIGluXG4vLyB0aGlzIGNhc2UgaWYgdGhlIGtleSBuYW1lcyBkb24ndCBsb29rIGxpa2UgaW50ZWdlcnMgLi4pXG4vL1xuLy8gcmV0dXJuIGEgZnVuY3Rpb24gdGhhdCB0YWtlcyB0d28gb2JqZWN0cywgYW5kIHJldHVybnMgLTEgaWYgdGhlXG4vLyBmaXJzdCBvYmplY3QgY29tZXMgZmlyc3QgaW4gb3JkZXIsIDEgaWYgdGhlIHNlY29uZCBvYmplY3QgY29tZXNcbi8vIGZpcnN0LCBvciAwIGlmIG5laXRoZXIgb2JqZWN0IGNvbWVzIGJlZm9yZSB0aGUgb3RoZXIuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNvcnRlciB7XG4gIGNvbnN0cnVjdG9yKHNwZWMpIHtcbiAgICB0aGlzLl9zb3J0U3BlY1BhcnRzID0gW107XG4gICAgdGhpcy5fc29ydEZ1bmN0aW9uID0gbnVsbDtcblxuICAgIGNvbnN0IGFkZFNwZWNQYXJ0ID0gKHBhdGgsIGFzY2VuZGluZykgPT4ge1xuICAgICAgaWYgKCFwYXRoKSB7XG4gICAgICAgIHRocm93IEVycm9yKCdzb3J0IGtleXMgbXVzdCBiZSBub24tZW1wdHknKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBhdGguY2hhckF0KDApID09PSAnJCcpIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoYHVuc3VwcG9ydGVkIHNvcnQga2V5OiAke3BhdGh9YCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX3NvcnRTcGVjUGFydHMucHVzaCh7XG4gICAgICAgIGFzY2VuZGluZyxcbiAgICAgICAgbG9va3VwOiBtYWtlTG9va3VwRnVuY3Rpb24ocGF0aCwge2ZvclNvcnQ6IHRydWV9KSxcbiAgICAgICAgcGF0aFxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIGlmIChzcGVjIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgIHNwZWMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBlbGVtZW50ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIGFkZFNwZWNQYXJ0KGVsZW1lbnQsIHRydWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGFkZFNwZWNQYXJ0KGVsZW1lbnRbMF0sIGVsZW1lbnRbMV0gIT09ICdkZXNjJyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHNwZWMgPT09ICdvYmplY3QnKSB7XG4gICAgICBPYmplY3Qua2V5cyhzcGVjKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgIGFkZFNwZWNQYXJ0KGtleSwgc3BlY1trZXldID49IDApO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2Ygc3BlYyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5fc29ydEZ1bmN0aW9uID0gc3BlYztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgRXJyb3IoYEJhZCBzb3J0IHNwZWNpZmljYXRpb246ICR7SlNPTi5zdHJpbmdpZnkoc3BlYyl9YCk7XG4gICAgfVxuXG4gICAgLy8gSWYgYSBmdW5jdGlvbiBpcyBzcGVjaWZpZWQgZm9yIHNvcnRpbmcsIHdlIHNraXAgdGhlIHJlc3QuXG4gICAgaWYgKHRoaXMuX3NvcnRGdW5jdGlvbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFRvIGltcGxlbWVudCBhZmZlY3RlZEJ5TW9kaWZpZXIsIHdlIHBpZ2d5LWJhY2sgb24gdG9wIG9mIE1hdGNoZXInc1xuICAgIC8vIGFmZmVjdGVkQnlNb2RpZmllciBjb2RlOyB3ZSBjcmVhdGUgYSBzZWxlY3RvciB0aGF0IGlzIGFmZmVjdGVkIGJ5IHRoZVxuICAgIC8vIHNhbWUgbW9kaWZpZXJzIGFzIHRoaXMgc29ydCBvcmRlci4gVGhpcyBpcyBvbmx5IGltcGxlbWVudGVkIG9uIHRoZVxuICAgIC8vIHNlcnZlci5cbiAgICBpZiAodGhpcy5hZmZlY3RlZEJ5TW9kaWZpZXIpIHtcbiAgICAgIGNvbnN0IHNlbGVjdG9yID0ge307XG5cbiAgICAgIHRoaXMuX3NvcnRTcGVjUGFydHMuZm9yRWFjaChzcGVjID0+IHtcbiAgICAgICAgc2VsZWN0b3Jbc3BlYy5wYXRoXSA9IDE7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5fc2VsZWN0b3JGb3JBZmZlY3RlZEJ5TW9kaWZpZXIgPSBuZXcgTWluaW1vbmdvLk1hdGNoZXIoc2VsZWN0b3IpO1xuICAgIH1cblxuICAgIHRoaXMuX2tleUNvbXBhcmF0b3IgPSBjb21wb3NlQ29tcGFyYXRvcnMoXG4gICAgICB0aGlzLl9zb3J0U3BlY1BhcnRzLm1hcCgoc3BlYywgaSkgPT4gdGhpcy5fa2V5RmllbGRDb21wYXJhdG9yKGkpKVxuICAgICk7XG4gIH1cblxuICBnZXRDb21wYXJhdG9yKG9wdGlvbnMpIHtcbiAgICAvLyBJZiBzb3J0IGlzIHNwZWNpZmllZCBvciBoYXZlIG5vIGRpc3RhbmNlcywganVzdCB1c2UgdGhlIGNvbXBhcmF0b3IgZnJvbVxuICAgIC8vIHRoZSBzb3VyY2Ugc3BlY2lmaWNhdGlvbiAod2hpY2ggZGVmYXVsdHMgdG8gXCJldmVyeXRoaW5nIGlzIGVxdWFsXCIuXG4gICAgLy8gaXNzdWUgIzM1OTlcbiAgICAvLyBodHRwczovL2RvY3MubW9uZ29kYi5jb20vbWFudWFsL3JlZmVyZW5jZS9vcGVyYXRvci9xdWVyeS9uZWFyLyNzb3J0LW9wZXJhdGlvblxuICAgIC8vIHNvcnQgZWZmZWN0aXZlbHkgb3ZlcnJpZGVzICRuZWFyXG4gICAgaWYgKHRoaXMuX3NvcnRTcGVjUGFydHMubGVuZ3RoIHx8ICFvcHRpb25zIHx8ICFvcHRpb25zLmRpc3RhbmNlcykge1xuICAgICAgcmV0dXJuIHRoaXMuX2dldEJhc2VDb21wYXJhdG9yKCk7XG4gICAgfVxuXG4gICAgY29uc3QgZGlzdGFuY2VzID0gb3B0aW9ucy5kaXN0YW5jZXM7XG5cbiAgICAvLyBSZXR1cm4gYSBjb21wYXJhdG9yIHdoaWNoIGNvbXBhcmVzIHVzaW5nICRuZWFyIGRpc3RhbmNlcy5cbiAgICByZXR1cm4gKGEsIGIpID0+IHtcbiAgICAgIGlmICghZGlzdGFuY2VzLmhhcyhhLl9pZCkpIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoYE1pc3NpbmcgZGlzdGFuY2UgZm9yICR7YS5faWR9YCk7XG4gICAgICB9XG5cbiAgICAgIGlmICghZGlzdGFuY2VzLmhhcyhiLl9pZCkpIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoYE1pc3NpbmcgZGlzdGFuY2UgZm9yICR7Yi5faWR9YCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBkaXN0YW5jZXMuZ2V0KGEuX2lkKSAtIGRpc3RhbmNlcy5nZXQoYi5faWQpO1xuICAgIH07XG4gIH1cblxuICAvLyBUYWtlcyBpbiB0d28ga2V5czogYXJyYXlzIHdob3NlIGxlbmd0aHMgbWF0Y2ggdGhlIG51bWJlciBvZiBzcGVjXG4gIC8vIHBhcnRzLiBSZXR1cm5zIG5lZ2F0aXZlLCAwLCBvciBwb3NpdGl2ZSBiYXNlZCBvbiB1c2luZyB0aGUgc29ydCBzcGVjIHRvXG4gIC8vIGNvbXBhcmUgZmllbGRzLlxuICBfY29tcGFyZUtleXMoa2V5MSwga2V5Mikge1xuICAgIGlmIChrZXkxLmxlbmd0aCAhPT0gdGhpcy5fc29ydFNwZWNQYXJ0cy5sZW5ndGggfHxcbiAgICAgICAga2V5Mi5sZW5ndGggIT09IHRoaXMuX3NvcnRTcGVjUGFydHMubGVuZ3RoKSB7XG4gICAgICB0aHJvdyBFcnJvcignS2V5IGhhcyB3cm9uZyBsZW5ndGgnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fa2V5Q29tcGFyYXRvcihrZXkxLCBrZXkyKTtcbiAgfVxuXG4gIC8vIEl0ZXJhdGVzIG92ZXIgZWFjaCBwb3NzaWJsZSBcImtleVwiIGZyb20gZG9jIChpZSwgb3ZlciBlYWNoIGJyYW5jaCksIGNhbGxpbmdcbiAgLy8gJ2NiJyB3aXRoIHRoZSBrZXkuXG4gIF9nZW5lcmF0ZUtleXNGcm9tRG9jKGRvYywgY2IpIHtcbiAgICBpZiAodGhpcy5fc29ydFNwZWNQYXJ0cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignY2FuXFwndCBnZW5lcmF0ZSBrZXlzIHdpdGhvdXQgYSBzcGVjJyk7XG4gICAgfVxuXG4gICAgY29uc3QgcGF0aEZyb21JbmRpY2VzID0gaW5kaWNlcyA9PiBgJHtpbmRpY2VzLmpvaW4oJywnKX0sYDtcblxuICAgIGxldCBrbm93blBhdGhzID0gbnVsbDtcblxuICAgIC8vIG1hcHMgaW5kZXggLT4gKHsnJyAtPiB2YWx1ZX0gb3Ige3BhdGggLT4gdmFsdWV9KVxuICAgIGNvbnN0IHZhbHVlc0J5SW5kZXhBbmRQYXRoID0gdGhpcy5fc29ydFNwZWNQYXJ0cy5tYXAoc3BlYyA9PiB7XG4gICAgICAvLyBFeHBhbmQgYW55IGxlYWYgYXJyYXlzIHRoYXQgd2UgZmluZCwgYW5kIGlnbm9yZSB0aG9zZSBhcnJheXNcbiAgICAgIC8vIHRoZW1zZWx2ZXMuICAoV2UgbmV2ZXIgc29ydCBiYXNlZCBvbiBhbiBhcnJheSBpdHNlbGYuKVxuICAgICAgbGV0IGJyYW5jaGVzID0gZXhwYW5kQXJyYXlzSW5CcmFuY2hlcyhzcGVjLmxvb2t1cChkb2MpLCB0cnVlKTtcblxuICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vIHZhbHVlcyBmb3IgYSBrZXkgKGVnLCBrZXkgZ29lcyB0byBhbiBlbXB0eSBhcnJheSksXG4gICAgICAvLyBwcmV0ZW5kIHdlIGZvdW5kIG9uZSB1bmRlZmluZWQgdmFsdWUuXG4gICAgICBpZiAoIWJyYW5jaGVzLmxlbmd0aCkge1xuICAgICAgICBicmFuY2hlcyA9IFt7IHZhbHVlOiB2b2lkIDAgfV07XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGVsZW1lbnQgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgbGV0IHVzZWRQYXRocyA9IGZhbHNlO1xuXG4gICAgICBicmFuY2hlcy5mb3JFYWNoKGJyYW5jaCA9PiB7XG4gICAgICAgIGlmICghYnJhbmNoLmFycmF5SW5kaWNlcykge1xuICAgICAgICAgIC8vIElmIHRoZXJlIGFyZSBubyBhcnJheSBpbmRpY2VzIGZvciBhIGJyYW5jaCwgdGhlbiBpdCBtdXN0IGJlIHRoZVxuICAgICAgICAgIC8vIG9ubHkgYnJhbmNoLCBiZWNhdXNlIHRoZSBvbmx5IHRoaW5nIHRoYXQgcHJvZHVjZXMgbXVsdGlwbGUgYnJhbmNoZXNcbiAgICAgICAgICAvLyBpcyB0aGUgdXNlIG9mIGFycmF5cy5cbiAgICAgICAgICBpZiAoYnJhbmNoZXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoJ211bHRpcGxlIGJyYW5jaGVzIGJ1dCBubyBhcnJheSB1c2VkPycpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGVsZW1lbnRbJyddID0gYnJhbmNoLnZhbHVlO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHVzZWRQYXRocyA9IHRydWU7XG5cbiAgICAgICAgY29uc3QgcGF0aCA9IHBhdGhGcm9tSW5kaWNlcyhicmFuY2guYXJyYXlJbmRpY2VzKTtcblxuICAgICAgICBpZiAoaGFzT3duLmNhbGwoZWxlbWVudCwgcGF0aCkpIHtcbiAgICAgICAgICB0aHJvdyBFcnJvcihgZHVwbGljYXRlIHBhdGg6ICR7cGF0aH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGVsZW1lbnRbcGF0aF0gPSBicmFuY2gudmFsdWU7XG5cbiAgICAgICAgLy8gSWYgdHdvIHNvcnQgZmllbGRzIGJvdGggZ28gaW50byBhcnJheXMsIHRoZXkgaGF2ZSB0byBnbyBpbnRvIHRoZVxuICAgICAgICAvLyBleGFjdCBzYW1lIGFycmF5cyBhbmQgd2UgaGF2ZSB0byBmaW5kIHRoZSBzYW1lIHBhdGhzLiAgVGhpcyBpc1xuICAgICAgICAvLyByb3VnaGx5IHRoZSBzYW1lIGNvbmRpdGlvbiB0aGF0IG1ha2VzIE1vbmdvREIgdGhyb3cgdGhpcyBzdHJhbmdlXG4gICAgICAgIC8vIGVycm9yIG1lc3NhZ2UuICBlZywgdGhlIG1haW4gdGhpbmcgaXMgdGhhdCBpZiBzb3J0IHNwZWMgaXMge2E6IDEsXG4gICAgICAgIC8vIGI6MX0gdGhlbiBhIGFuZCBiIGNhbm5vdCBib3RoIGJlIGFycmF5cy5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gKEluIE1vbmdvREIgaXQgc2VlbXMgdG8gYmUgT0sgdG8gaGF2ZSB7YTogMSwgJ2EueC55JzogMX0gd2hlcmUgJ2EnXG4gICAgICAgIC8vIGFuZCAnYS54LnknIGFyZSBib3RoIGFycmF5cywgYnV0IHdlIGRvbid0IGFsbG93IHRoaXMgZm9yIG5vdy5cbiAgICAgICAgLy8gI05lc3RlZEFycmF5U29ydFxuICAgICAgICAvLyBYWFggYWNoaWV2ZSBmdWxsIGNvbXBhdGliaWxpdHkgaGVyZVxuICAgICAgICBpZiAoa25vd25QYXRocyAmJiAhaGFzT3duLmNhbGwoa25vd25QYXRocywgcGF0aCkpIHtcbiAgICAgICAgICB0aHJvdyBFcnJvcignY2Fubm90IGluZGV4IHBhcmFsbGVsIGFycmF5cycpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgaWYgKGtub3duUGF0aHMpIHtcbiAgICAgICAgLy8gU2ltaWxhcmx5IHRvIGFib3ZlLCBwYXRocyBtdXN0IG1hdGNoIGV2ZXJ5d2hlcmUsIHVubGVzcyB0aGlzIGlzIGFcbiAgICAgICAgLy8gbm9uLWFycmF5IGZpZWxkLlxuICAgICAgICBpZiAoIWhhc093bi5jYWxsKGVsZW1lbnQsICcnKSAmJlxuICAgICAgICAgICAgT2JqZWN0LmtleXMoa25vd25QYXRocykubGVuZ3RoICE9PSBPYmplY3Qua2V5cyhlbGVtZW50KS5sZW5ndGgpIHtcbiAgICAgICAgICB0aHJvdyBFcnJvcignY2Fubm90IGluZGV4IHBhcmFsbGVsIGFycmF5cyEnKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh1c2VkUGF0aHMpIHtcbiAgICAgICAga25vd25QYXRocyA9IHt9O1xuXG4gICAgICAgIE9iamVjdC5rZXlzKGVsZW1lbnQpLmZvckVhY2gocGF0aCA9PiB7XG4gICAgICAgICAga25vd25QYXRoc1twYXRoXSA9IHRydWU7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZWxlbWVudDtcbiAgICB9KTtcblxuICAgIGlmICgha25vd25QYXRocykge1xuICAgICAgLy8gRWFzeSBjYXNlOiBubyB1c2Ugb2YgYXJyYXlzLlxuICAgICAgY29uc3Qgc29sZUtleSA9IHZhbHVlc0J5SW5kZXhBbmRQYXRoLm1hcCh2YWx1ZXMgPT4ge1xuICAgICAgICBpZiAoIWhhc093bi5jYWxsKHZhbHVlcywgJycpKSB7XG4gICAgICAgICAgdGhyb3cgRXJyb3IoJ25vIHZhbHVlIGluIHNvbGUga2V5IGNhc2U/Jyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmFsdWVzWycnXTtcbiAgICAgIH0pO1xuXG4gICAgICBjYihzb2xlS2V5KTtcblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIE9iamVjdC5rZXlzKGtub3duUGF0aHMpLmZvckVhY2gocGF0aCA9PiB7XG4gICAgICBjb25zdCBrZXkgPSB2YWx1ZXNCeUluZGV4QW5kUGF0aC5tYXAodmFsdWVzID0+IHtcbiAgICAgICAgaWYgKGhhc093bi5jYWxsKHZhbHVlcywgJycpKSB7XG4gICAgICAgICAgcmV0dXJuIHZhbHVlc1snJ107XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWhhc093bi5jYWxsKHZhbHVlcywgcGF0aCkpIHtcbiAgICAgICAgICB0aHJvdyBFcnJvcignbWlzc2luZyBwYXRoPycpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHZhbHVlc1twYXRoXTtcbiAgICAgIH0pO1xuXG4gICAgICBjYihrZXkpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gUmV0dXJucyBhIGNvbXBhcmF0b3IgdGhhdCByZXByZXNlbnRzIHRoZSBzb3J0IHNwZWNpZmljYXRpb24gKGJ1dCBub3RcbiAgLy8gaW5jbHVkaW5nIGEgcG9zc2libGUgZ2VvcXVlcnkgZGlzdGFuY2UgdGllLWJyZWFrZXIpLlxuICBfZ2V0QmFzZUNvbXBhcmF0b3IoKSB7XG4gICAgaWYgKHRoaXMuX3NvcnRGdW5jdGlvbikge1xuICAgICAgcmV0dXJuIHRoaXMuX3NvcnRGdW5jdGlvbjtcbiAgICB9XG5cbiAgICAvLyBJZiB3ZSdyZSBvbmx5IHNvcnRpbmcgb24gZ2VvcXVlcnkgZGlzdGFuY2UgYW5kIG5vIHNwZWNzLCBqdXN0IHNheVxuICAgIC8vIGV2ZXJ5dGhpbmcgaXMgZXF1YWwuXG4gICAgaWYgKCF0aGlzLl9zb3J0U3BlY1BhcnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIChkb2MxLCBkb2MyKSA9PiAwO1xuICAgIH1cblxuICAgIHJldHVybiAoZG9jMSwgZG9jMikgPT4ge1xuICAgICAgY29uc3Qga2V5MSA9IHRoaXMuX2dldE1pbktleUZyb21Eb2MoZG9jMSk7XG4gICAgICBjb25zdCBrZXkyID0gdGhpcy5fZ2V0TWluS2V5RnJvbURvYyhkb2MyKTtcbiAgICAgIHJldHVybiB0aGlzLl9jb21wYXJlS2V5cyhrZXkxLCBrZXkyKTtcbiAgICB9O1xuICB9XG5cbiAgLy8gRmluZHMgdGhlIG1pbmltdW0ga2V5IGZyb20gdGhlIGRvYywgYWNjb3JkaW5nIHRvIHRoZSBzb3J0IHNwZWNzLiAgKFdlIHNheVxuICAvLyBcIm1pbmltdW1cIiBoZXJlIGJ1dCB0aGlzIGlzIHdpdGggcmVzcGVjdCB0byB0aGUgc29ydCBzcGVjLCBzbyBcImRlc2NlbmRpbmdcIlxuICAvLyBzb3J0IGZpZWxkcyBtZWFuIHdlJ3JlIGZpbmRpbmcgdGhlIG1heCBmb3IgdGhhdCBmaWVsZC4pXG4gIC8vXG4gIC8vIE5vdGUgdGhhdCB0aGlzIGlzIE5PVCBcImZpbmQgdGhlIG1pbmltdW0gdmFsdWUgb2YgdGhlIGZpcnN0IGZpZWxkLCB0aGVcbiAgLy8gbWluaW11bSB2YWx1ZSBvZiB0aGUgc2Vjb25kIGZpZWxkLCBldGNcIi4uLiBpdCdzIFwiY2hvb3NlIHRoZVxuICAvLyBsZXhpY29ncmFwaGljYWxseSBtaW5pbXVtIHZhbHVlIG9mIHRoZSBrZXkgdmVjdG9yLCBhbGxvd2luZyBvbmx5IGtleXMgd2hpY2hcbiAgLy8geW91IGNhbiBmaW5kIGFsb25nIHRoZSBzYW1lIHBhdGhzXCIuICBpZSwgZm9yIGEgZG9jIHthOiBbe3g6IDAsIHk6IDV9LCB7eDpcbiAgLy8gMSwgeTogM31dfSB3aXRoIHNvcnQgc3BlYyB7J2EueCc6IDEsICdhLnknOiAxfSwgdGhlIG9ubHkga2V5cyBhcmUgWzAsNV0gYW5kXG4gIC8vIFsxLDNdLCBhbmQgdGhlIG1pbmltdW0ga2V5IGlzIFswLDVdOyBub3RhYmx5LCBbMCwzXSBpcyBOT1QgYSBrZXkuXG4gIF9nZXRNaW5LZXlGcm9tRG9jKGRvYykge1xuICAgIGxldCBtaW5LZXkgPSBudWxsO1xuXG4gICAgdGhpcy5fZ2VuZXJhdGVLZXlzRnJvbURvYyhkb2MsIGtleSA9PiB7XG4gICAgICBpZiAobWluS2V5ID09PSBudWxsKSB7XG4gICAgICAgIG1pbktleSA9IGtleTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fY29tcGFyZUtleXMoa2V5LCBtaW5LZXkpIDwgMCkge1xuICAgICAgICBtaW5LZXkgPSBrZXk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbWluS2V5O1xuICB9XG5cbiAgX2dldFBhdGhzKCkge1xuICAgIHJldHVybiB0aGlzLl9zb3J0U3BlY1BhcnRzLm1hcChwYXJ0ID0+IHBhcnQucGF0aCk7XG4gIH1cblxuICAvLyBHaXZlbiBhbiBpbmRleCAnaScsIHJldHVybnMgYSBjb21wYXJhdG9yIHRoYXQgY29tcGFyZXMgdHdvIGtleSBhcnJheXMgYmFzZWRcbiAgLy8gb24gZmllbGQgJ2knLlxuICBfa2V5RmllbGRDb21wYXJhdG9yKGkpIHtcbiAgICBjb25zdCBpbnZlcnQgPSAhdGhpcy5fc29ydFNwZWNQYXJ0c1tpXS5hc2NlbmRpbmc7XG5cbiAgICByZXR1cm4gKGtleTEsIGtleTIpID0+IHtcbiAgICAgIGNvbnN0IGNvbXBhcmUgPSBMb2NhbENvbGxlY3Rpb24uX2YuX2NtcChrZXkxW2ldLCBrZXkyW2ldKTtcbiAgICAgIHJldHVybiBpbnZlcnQgPyAtY29tcGFyZSA6IGNvbXBhcmU7XG4gICAgfTtcbiAgfVxufVxuXG4vLyBHaXZlbiBhbiBhcnJheSBvZiBjb21wYXJhdG9yc1xuLy8gKGZ1bmN0aW9ucyAoYSxiKS0+KG5lZ2F0aXZlIG9yIHBvc2l0aXZlIG9yIHplcm8pKSwgcmV0dXJucyBhIHNpbmdsZVxuLy8gY29tcGFyYXRvciB3aGljaCB1c2VzIGVhY2ggY29tcGFyYXRvciBpbiBvcmRlciBhbmQgcmV0dXJucyB0aGUgZmlyc3Rcbi8vIG5vbi16ZXJvIHZhbHVlLlxuZnVuY3Rpb24gY29tcG9zZUNvbXBhcmF0b3JzKGNvbXBhcmF0b3JBcnJheSkge1xuICByZXR1cm4gKGEsIGIpID0+IHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvbXBhcmF0b3JBcnJheS5sZW5ndGg7ICsraSkge1xuICAgICAgY29uc3QgY29tcGFyZSA9IGNvbXBhcmF0b3JBcnJheVtpXShhLCBiKTtcbiAgICAgIGlmIChjb21wYXJlICE9PSAwKSB7XG4gICAgICAgIHJldHVybiBjb21wYXJlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiAwO1xuICB9O1xufVxuIl19
