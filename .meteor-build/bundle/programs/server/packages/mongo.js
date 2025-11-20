Package["core-runtime"].queue("mongo",function () {/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var EmitterPromise = Package.meteor.EmitterPromise;
var NpmModuleMongodb = Package['npm-mongo'].NpmModuleMongodb;
var NpmModuleMongodbVersion = Package['npm-mongo'].NpmModuleMongodbVersion;
var AllowDeny = Package['allow-deny'].AllowDeny;
var Random = Package.random.Random;
var EJSON = Package.ejson.EJSON;
var LocalCollection = Package.minimongo.LocalCollection;
var Minimongo = Package.minimongo.Minimongo;
var DDP = Package['ddp-client'].DDP;
var DDPServer = Package['ddp-server'].DDPServer;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var DiffSequence = Package['diff-sequence'].DiffSequence;
var MongoID = Package['mongo-id'].MongoID;
var check = Package.check.check;
var Match = Package.check.Match;
var ECMAScript = Package.ecmascript.ECMAScript;
var Log = Package.logging.Log;
var Decimal = Package['mongo-decimal'].Decimal;
var MaxHeap = Package['binary-heap'].MaxHeap;
var MinHeap = Package['binary-heap'].MinHeap;
var MinMaxHeap = Package['binary-heap'].MinMaxHeap;
var Hook = Package['callback-hook'].Hook;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var MongoInternals, callback, Mongo, ObserveMultiplexer;

var require = meteorInstall({"node_modules":{"meteor":{"mongo":{"mongo_driver.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/mongo_driver.js                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module1, __reifyWaitForDeps__, __reify_async_result__) {
  "use strict";
  try {
    module1.export({
      listenAll: () => listenAll,
      forEachTrigger: () => forEachTrigger
    });
    let OplogHandle;
    module1.link("./oplog_tailing", {
      OplogHandle(v) {
        OplogHandle = v;
      }
    }, 0);
    let MongoConnection;
    module1.link("./mongo_connection", {
      MongoConnection(v) {
        MongoConnection = v;
      }
    }, 1);
    let OplogObserveDriver;
    module1.link("./oplog_observe_driver", {
      OplogObserveDriver(v) {
        OplogObserveDriver = v;
      }
    }, 2);
    let MongoDB;
    module1.link("./mongo_common", {
      MongoDB(v) {
        MongoDB = v;
      }
    }, 3);
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    MongoInternals = global.MongoInternals = {};
    MongoInternals.__packageName = 'mongo';
    MongoInternals.NpmModules = {
      mongodb: {
        version: NpmModuleMongodbVersion,
        module: MongoDB
      }
    };

    // Older version of what is now available via
    // MongoInternals.NpmModules.mongodb.module.  It was never documented, but
    // people do use it.
    // XXX COMPAT WITH 1.0.3.2
    MongoInternals.NpmModule = new Proxy(MongoDB, {
      get(target, propertyKey, receiver) {
        if (propertyKey === 'ObjectID') {
          Meteor.deprecate("Accessing 'MongoInternals.NpmModule.ObjectID' directly is deprecated. " + "Use 'MongoInternals.NpmModule.ObjectId' instead.");
        }
        return Reflect.get(target, propertyKey, receiver);
      }
    });
    MongoInternals.OplogHandle = OplogHandle;
    MongoInternals.Connection = MongoConnection;
    MongoInternals.OplogObserveDriver = OplogObserveDriver;

    // This is used to add or remove EJSON from the beginning of everything nested
    // inside an EJSON custom type. It should only be called on pure JSON!

    // Ensure that EJSON.clone keeps a Timestamp as a Timestamp (instead of just
    // doing a structural clone).
    // XXX how ok is this? what if there are multiple copies of MongoDB loaded?
    MongoDB.Timestamp.prototype.clone = function () {
      // Timestamps should be immutable.
      return this;
    };

    // Listen for the invalidation messages that will trigger us to poll the
    // database for changes. If this selector specifies specific IDs, specify them
    // here, so that updates to different specific IDs don't cause us to poll.
    // listenCallback is the same kind of (notification, complete) callback passed
    // to InvalidationCrossbar.listen.

    const listenAll = async function (cursorDescription, listenCallback) {
      const listeners = [];
      await forEachTrigger(cursorDescription, function (trigger) {
        listeners.push(DDPServer._InvalidationCrossbar.listen(trigger, listenCallback));
      });
      return {
        stop: function () {
          listeners.forEach(function (listener) {
            listener.stop();
          });
        }
      };
    };
    const forEachTrigger = async function (cursorDescription, triggerCallback) {
      const key = {
        collection: cursorDescription.collectionName
      };
      const specificIds = LocalCollection._idsMatchedBySelector(cursorDescription.selector);
      if (specificIds) {
        for (const id of specificIds) {
          await triggerCallback(Object.assign({
            id: id
          }, key));
        }
        await triggerCallback(Object.assign({
          dropCollection: true,
          id: null
        }, key));
      } else {
        await triggerCallback(key);
      }
      // Everyone cares about the database being dropped.
      await triggerCallback({
        dropDatabase: true
      });
    };
    // XXX We probably need to find a better way to expose this. Right now
    // it's only used by tests, but in fact you need it in normal
    // operation to interact with capped collections.
    MongoInternals.MongoTimestamp = MongoDB.Timestamp;
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

},"oplog_tailing.ts":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/oplog_tailing.ts                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reify_async_result__) {
  "use strict";
  try {
    module.export({
      OPLOG_COLLECTION: () => OPLOG_COLLECTION,
      OplogHandle: () => OplogHandle,
      idForOp: () => idForOp
    });
    let isEmpty;
    module.link("lodash.isempty", {
      default(v) {
        isEmpty = v;
      }
    }, 0);
    let Meteor;
    module.link("meteor/meteor", {
      Meteor(v) {
        Meteor = v;
      }
    }, 1);
    let CursorDescription;
    module.link("./cursor_description", {
      CursorDescription(v) {
        CursorDescription = v;
      }
    }, 2);
    let MongoConnection;
    module.link("./mongo_connection", {
      MongoConnection(v) {
        MongoConnection = v;
      }
    }, 3);
    let NpmModuleMongodb;
    module.link("meteor/npm-mongo", {
      NpmModuleMongodb(v) {
        NpmModuleMongodb = v;
      }
    }, 4);
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    const {
      Long
    } = NpmModuleMongodb;
    const OPLOG_COLLECTION = 'oplog.rs';
    let TOO_FAR_BEHIND = +(process.env.METEOR_OPLOG_TOO_FAR_BEHIND || 2000);
    const TAIL_TIMEOUT = +(process.env.METEOR_OPLOG_TAIL_TIMEOUT || 30000);
    class OplogHandle {
      constructor(oplogUrl, dbName) {
        var _Meteor$settings, _Meteor$settings$pack, _Meteor$settings$pack2, _Meteor$settings2, _Meteor$settings2$pac, _Meteor$settings2$pac2;
        this._oplogUrl = void 0;
        this._dbName = void 0;
        this._oplogLastEntryConnection = void 0;
        this._oplogTailConnection = void 0;
        this._oplogOptions = void 0;
        this._stopped = void 0;
        this._tailHandle = void 0;
        this._readyPromiseResolver = void 0;
        this._readyPromise = void 0;
        this._crossbar = void 0;
        this._catchingUpResolvers = void 0;
        this._lastProcessedTS = void 0;
        this._onSkippedEntriesHook = void 0;
        this._startTrailingPromise = void 0;
        this._resolveTimeout = void 0;
        this._entryQueue = new Meteor._DoubleEndedQueue();
        this._workerActive = false;
        this._workerPromise = null;
        this._oplogUrl = oplogUrl;
        this._dbName = dbName;
        this._resolveTimeout = null;
        this._oplogLastEntryConnection = null;
        this._oplogTailConnection = null;
        this._stopped = false;
        this._tailHandle = null;
        this._readyPromiseResolver = null;
        this._readyPromise = new Promise(r => this._readyPromiseResolver = r);
        this._crossbar = new DDPServer._Crossbar({
          factPackage: "mongo-livedata",
          factName: "oplog-watchers"
        });
        const includeCollections = (_Meteor$settings = Meteor.settings) === null || _Meteor$settings === void 0 ? void 0 : (_Meteor$settings$pack = _Meteor$settings.packages) === null || _Meteor$settings$pack === void 0 ? void 0 : (_Meteor$settings$pack2 = _Meteor$settings$pack.mongo) === null || _Meteor$settings$pack2 === void 0 ? void 0 : _Meteor$settings$pack2.oplogIncludeCollections;
        const excludeCollections = (_Meteor$settings2 = Meteor.settings) === null || _Meteor$settings2 === void 0 ? void 0 : (_Meteor$settings2$pac = _Meteor$settings2.packages) === null || _Meteor$settings2$pac === void 0 ? void 0 : (_Meteor$settings2$pac2 = _Meteor$settings2$pac.mongo) === null || _Meteor$settings2$pac2 === void 0 ? void 0 : _Meteor$settings2$pac2.oplogExcludeCollections;
        if (includeCollections !== null && includeCollections !== void 0 && includeCollections.length && excludeCollections !== null && excludeCollections !== void 0 && excludeCollections.length) {
          throw new Error("Can't use both mongo oplog settings oplogIncludeCollections and oplogExcludeCollections at the same time.");
        }
        this._oplogOptions = {
          includeCollections,
          excludeCollections
        };
        this._catchingUpResolvers = [];
        this._lastProcessedTS = null;
        this._onSkippedEntriesHook = new Hook({
          debugPrintExceptions: "onSkippedEntries callback"
        });
        this._startTrailingPromise = this._startTailing();
      }
      _getOplogSelector(lastProcessedTS) {
        var _this$_oplogOptions$e, _this$_oplogOptions$i;
        const oplogCriteria = [{
          $or: [{
            op: {
              $in: ["i", "u", "d"]
            }
          }, {
            op: "c",
            "o.drop": {
              $exists: true
            }
          }, {
            op: "c",
            "o.dropDatabase": 1
          }, {
            op: "c",
            "o.applyOps": {
              $exists: true
            }
          }]
        }];
        const nsRegex = new RegExp("^(?:" + [
        // @ts-ignore
        Meteor._escapeRegExp(this._dbName + "."),
        // @ts-ignore
        Meteor._escapeRegExp("admin.$cmd")].join("|") + ")");
        if ((_this$_oplogOptions$e = this._oplogOptions.excludeCollections) !== null && _this$_oplogOptions$e !== void 0 && _this$_oplogOptions$e.length) {
          oplogCriteria.push({
            ns: {
              $regex: nsRegex,
              $nin: this._oplogOptions.excludeCollections.map(collName => "".concat(this._dbName, ".").concat(collName))
            }
          });
        } else if ((_this$_oplogOptions$i = this._oplogOptions.includeCollections) !== null && _this$_oplogOptions$i !== void 0 && _this$_oplogOptions$i.length) {
          oplogCriteria.push({
            $or: [{
              ns: /^admin\.\$cmd/
            }, {
              ns: {
                $in: this._oplogOptions.includeCollections.map(collName => "".concat(this._dbName, ".").concat(collName))
              }
            }]
          });
        } else {
          oplogCriteria.push({
            ns: nsRegex
          });
        }
        if (lastProcessedTS) {
          oplogCriteria.push({
            ts: {
              $gt: lastProcessedTS
            }
          });
        }
        return {
          $and: oplogCriteria
        };
      }
      async stop() {
        if (this._stopped) return;
        this._stopped = true;
        if (this._tailHandle) {
          await this._tailHandle.stop();
        }
      }
      async _onOplogEntry(trigger, callback) {
        if (this._stopped) {
          throw new Error("Called onOplogEntry on stopped handle!");
        }
        await this._readyPromise;
        const originalCallback = callback;
        /**
         * This depends on AsynchronousQueue tasks being wrapped in `bindEnvironment` too.
         *
         * @todo Check after we simplify the `bindEnvironment` implementation if we can remove the second wrap.
         */
        callback = Meteor.bindEnvironment(function (notification) {
          originalCallback(notification);
        },
        // @ts-ignore
        function (err) {
          Meteor._debug("Error in oplog callback", err);
        });
        const listenHandle = this._crossbar.listen(trigger, callback);
        return {
          stop: async function () {
            await listenHandle.stop();
          }
        };
      }
      onOplogEntry(trigger, callback) {
        return this._onOplogEntry(trigger, callback);
      }
      onSkippedEntries(callback) {
        if (this._stopped) {
          throw new Error("Called onSkippedEntries on stopped handle!");
        }
        return this._onSkippedEntriesHook.register(callback);
      }
      async _waitUntilCaughtUp() {
        if (this._stopped) {
          throw new Error("Called waitUntilCaughtUp on stopped handle!");
        }
        await this._readyPromise;
        let lastEntry = null;
        while (!this._stopped) {
          const oplogSelector = this._getOplogSelector();
          try {
            lastEntry = await this._oplogLastEntryConnection.findOneAsync(OPLOG_COLLECTION, oplogSelector, {
              projection: {
                ts: 1
              },
              sort: {
                $natural: -1
              }
            });
            break;
          } catch (e) {
            Meteor._debug("Got exception while reading last entry", e);
            // @ts-ignore
            await Meteor.sleep(100);
          }
        }
        if (this._stopped) return;
        if (!lastEntry) return;
        const ts = lastEntry.ts;
        if (!ts) {
          throw Error("oplog entry without ts: " + JSON.stringify(lastEntry));
        }
        if (this._lastProcessedTS && ts.lessThanOrEqual(this._lastProcessedTS)) {
          return;
        }
        let insertAfter = this._catchingUpResolvers.length;
        while (insertAfter - 1 > 0 && this._catchingUpResolvers[insertAfter - 1].ts.greaterThan(ts)) {
          insertAfter--;
        }
        let promiseResolver = null;
        const promiseToAwait = new Promise(r => promiseResolver = r);
        clearTimeout(this._resolveTimeout);
        this._resolveTimeout = setTimeout(() => {
          console.error("Meteor: oplog catching up took too long", {
            ts
          });
        }, 10000);
        this._catchingUpResolvers.splice(insertAfter, 0, {
          ts,
          resolver: promiseResolver
        });
        await promiseToAwait;
        clearTimeout(this._resolveTimeout);
      }
      async waitUntilCaughtUp() {
        return this._waitUntilCaughtUp();
      }
      async _startTailing() {
        const mongodbUri = require('mongodb-uri');
        if (mongodbUri.parse(this._oplogUrl).database !== 'local') {
          throw new Error("$MONGO_OPLOG_URL must be set to the 'local' database of a Mongo replica set");
        }
        this._oplogTailConnection = new MongoConnection(this._oplogUrl, {
          maxPoolSize: 1,
          minPoolSize: 1
        });
        this._oplogLastEntryConnection = new MongoConnection(this._oplogUrl, {
          maxPoolSize: 1,
          minPoolSize: 1
        });
        try {
          const isMasterDoc = await this._oplogLastEntryConnection.db.admin().command({
            ismaster: 1
          });
          if (!(isMasterDoc && isMasterDoc.setName)) {
            throw new Error("$MONGO_OPLOG_URL must be set to the 'local' database of a Mongo replica set");
          }
          const lastOplogEntry = await this._oplogLastEntryConnection.findOneAsync(OPLOG_COLLECTION, {}, {
            sort: {
              $natural: -1
            },
            projection: {
              ts: 1
            }
          });
          const oplogSelector = this._getOplogSelector(lastOplogEntry === null || lastOplogEntry === void 0 ? void 0 : lastOplogEntry.ts);
          if (lastOplogEntry) {
            this._lastProcessedTS = lastOplogEntry.ts;
          }
          const cursorDescription = new CursorDescription(OPLOG_COLLECTION, oplogSelector, {
            tailable: true
          });
          this._tailHandle = this._oplogTailConnection.tail(cursorDescription, doc => {
            this._entryQueue.push(doc);
            this._maybeStartWorker();
          }, TAIL_TIMEOUT);
          this._readyPromiseResolver();
        } catch (error) {
          console.error('Error in _startTailing:', error);
          throw error;
        }
      }
      _maybeStartWorker() {
        if (this._workerPromise) return;
        this._workerActive = true;
        // Convert to a proper promise-based queue processor
        this._workerPromise = (async () => {
          try {
            while (!this._stopped && !this._entryQueue.isEmpty()) {
              // Are we too far behind? Just tell our observers that they need to
              // repoll, and drop our queue.
              if (this._entryQueue.length > TOO_FAR_BEHIND) {
                const lastEntry = this._entryQueue.pop();
                this._entryQueue.clear();
                this._onSkippedEntriesHook.each(callback => {
                  callback();
                  return true;
                });
                // Free any waitUntilCaughtUp() calls that were waiting for us to
                // pass something that we just skipped.
                this._setLastProcessedTS(lastEntry.ts);
                continue;
              }
              // Process next batch from the queue
              const doc = this._entryQueue.shift();
              try {
                await handleDoc(this, doc);
                // Process any waiting fence callbacks
                if (doc.ts) {
                  this._setLastProcessedTS(doc.ts);
                }
              } catch (e) {
                // Keep processing queue even if one entry fails
                console.error('Error processing oplog entry:', e);
              }
            }
          } finally {
            this._workerPromise = null;
            this._workerActive = false;
          }
        })();
      }
      _setLastProcessedTS(ts) {
        this._lastProcessedTS = ts;
        while (!isEmpty(this._catchingUpResolvers) && this._catchingUpResolvers[0].ts.lessThanOrEqual(this._lastProcessedTS)) {
          const sequencer = this._catchingUpResolvers.shift();
          sequencer.resolver();
        }
      }
      _defineTooFarBehind(value) {
        TOO_FAR_BEHIND = value;
      }
      _resetTooFarBehind() {
        TOO_FAR_BEHIND = +(process.env.METEOR_OPLOG_TOO_FAR_BEHIND || 2000);
      }
    }
    function idForOp(op) {
      if (op.op === 'd' || op.op === 'i') {
        return op.o._id;
      } else if (op.op === 'u') {
        return op.o2._id;
      } else if (op.op === 'c') {
        throw Error("Operator 'c' doesn't supply an object with id: " + JSON.stringify(op));
      } else {
        throw Error("Unknown op: " + JSON.stringify(op));
      }
    }
    async function handleDoc(handle, doc) {
      if (doc.ns === "admin.$cmd") {
        if (doc.o.applyOps) {
          // This was a successful transaction, so we need to apply the
          // operations that were involved.
          let nextTimestamp = doc.ts;
          for (const op of doc.o.applyOps) {
            // See https://github.com/meteor/meteor/issues/10420.
            if (!op.ts) {
              op.ts = nextTimestamp;
              nextTimestamp = nextTimestamp.add(Long.ONE);
            }
            await handleDoc(handle, op);
          }
          return;
        }
        throw new Error("Unknown command " + JSON.stringify(doc));
      }
      const trigger = {
        dropCollection: false,
        dropDatabase: false,
        op: doc
      };
      if (typeof doc.ns === "string" && doc.ns.startsWith(handle._dbName + ".")) {
        trigger.collection = doc.ns.slice(handle._dbName.length + 1);
      }
      // Is it a special command and the collection name is hidden
      // somewhere in operator?
      if (trigger.collection === "$cmd") {
        if (doc.o.dropDatabase) {
          delete trigger.collection;
          trigger.dropDatabase = true;
        } else if ("drop" in doc.o) {
          trigger.collection = doc.o.drop;
          trigger.dropCollection = true;
          trigger.id = null;
        } else if ("create" in doc.o && "idIndex" in doc.o) {
          // A collection got implicitly created within a transaction. There's
          // no need to do anything about it.
        } else {
          throw Error("Unknown command " + JSON.stringify(doc));
        }
      } else {
        // All other ops have an id.
        trigger.id = idForOp(doc);
      }
      await handle._crossbar.fire(trigger);
      await new Promise(resolve => setImmediate(resolve));
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

},"observe_multiplex.ts":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/observe_multiplex.ts                                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reify_async_result__) {
  "use strict";
  try {
    let _objectWithoutProperties;
    module.link("@babel/runtime/helpers/objectWithoutProperties", {
      default(v) {
        _objectWithoutProperties = v;
      }
    }, 0);
    const _excluded = ["_id"];
    module.export({
      ObserveMultiplexer: () => ObserveMultiplexer
    });
    let isEmpty;
    module.link("lodash.isempty", {
      default(v) {
        isEmpty = v;
      }
    }, 0);
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    class ObserveMultiplexer {
      constructor(_ref) {
        var _this = this;
        let {
          ordered,
          onStop = () => {}
        } = _ref;
        this._ordered = void 0;
        this._onStop = void 0;
        this._queue = void 0;
        this._handles = void 0;
        this._resolver = void 0;
        this._readyPromise = void 0;
        this._isReady = void 0;
        this._cache = void 0;
        this._addHandleTasksScheduledButNotPerformed = void 0;
        if (ordered === undefined) throw Error("must specify ordered");
        // @ts-ignore
        Package["facts-base"] && Package["facts-base"].Facts.incrementServerFact("mongo-livedata", "observe-multiplexers", 1);
        this._ordered = ordered;
        this._onStop = onStop;
        this._queue = new Meteor._AsynchronousQueue();
        this._handles = {};
        this._resolver = null;
        this._isReady = false;
        this._readyPromise = new Promise(r => this._resolver = r).then(() => this._isReady = true);
        // @ts-ignore
        this._cache = new LocalCollection._CachingChangeObserver({
          ordered
        });
        this._addHandleTasksScheduledButNotPerformed = 0;
        this.callbackNames().forEach(callbackName => {
          this[callbackName] = function () {
            for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
              args[_key] = arguments[_key];
            }
            _this._applyCallback(callbackName, args);
          };
        });
      }
      addHandleAndSendInitialAdds(handle) {
        return this._addHandleAndSendInitialAdds(handle);
      }
      async _addHandleAndSendInitialAdds(handle) {
        ++this._addHandleTasksScheduledButNotPerformed;
        // @ts-ignore
        Package["facts-base"] && Package["facts-base"].Facts.incrementServerFact("mongo-livedata", "observe-handles", 1);
        await this._queue.runTask(async () => {
          this._handles[handle._id] = handle;
          await this._sendAdds(handle);
          --this._addHandleTasksScheduledButNotPerformed;
        });
        await this._readyPromise;
      }
      async removeHandle(id) {
        if (!this._ready()) throw new Error("Can't remove handles until the multiplex is ready");
        delete this._handles[id];
        // @ts-ignore
        Package["facts-base"] && Package["facts-base"].Facts.incrementServerFact("mongo-livedata", "observe-handles", -1);
        if (isEmpty(this._handles) && this._addHandleTasksScheduledButNotPerformed === 0) {
          await this._stop();
        }
      }
      async _stop() {
        let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        if (!this._ready() && !options.fromQueryError) throw Error("surprising _stop: not ready");
        await this._onStop();
        // @ts-ignore
        Package["facts-base"] && Package["facts-base"].Facts.incrementServerFact("mongo-livedata", "observe-multiplexers", -1);
        this._handles = null;
      }
      async ready() {
        await this._queue.queueTask(() => {
          if (this._ready()) throw Error("can't make ObserveMultiplex ready twice!");
          if (!this._resolver) {
            throw new Error("Missing resolver");
          }
          this._resolver();
          this._isReady = true;
        });
      }
      async queryError(err) {
        await this._queue.runTask(() => {
          if (this._ready()) throw Error("can't claim query has an error after it worked!");
          this._stop({
            fromQueryError: true
          });
          throw err;
        });
      }
      async onFlush(cb) {
        await this._queue.queueTask(async () => {
          if (!this._ready()) throw Error("only call onFlush on a multiplexer that will be ready");
          await cb();
        });
      }
      callbackNames() {
        return this._ordered ? ["addedBefore", "changed", "movedBefore", "removed"] : ["added", "changed", "removed"];
      }
      _ready() {
        return !!this._isReady;
      }
      _applyCallback(callbackName, args) {
        this._queue.queueTask(async () => {
          if (!this._handles) return;
          await this._cache.applyChange[callbackName].apply(null, args);
          if (!this._ready() && callbackName !== "added" && callbackName !== "addedBefore") {
            throw new Error("Got ".concat(callbackName, " during initial adds"));
          }
          for (const handleId of Object.keys(this._handles)) {
            const handle = this._handles && this._handles[handleId];
            if (!handle) return;
            const callback = handle["_".concat(callbackName)];
            if (!callback) continue;
            const result = callback.apply(null, handle.nonMutatingCallbacks ? args : EJSON.clone(args));
            if (result && Meteor._isPromise(result)) {
              result.catch(error => {
                console.error("Error in observeChanges callback ".concat(callbackName, ":"), error);
              });
            }
            handle.initialAddsSent.then(result);
          }
        });
      }
      async _sendAdds(handle) {
        const add = this._ordered ? handle._addedBefore : handle._added;
        if (!add) return;
        const addPromises = [];
        // note: docs may be an _IdMap or an OrderedDict
        this._cache.docs.forEach((doc, id) => {
          if (!(handle._id in this._handles)) {
            throw Error("handle got removed before sending initial adds!");
          }
          const _ref2 = handle.nonMutatingCallbacks ? doc : EJSON.clone(doc),
            {
              _id
            } = _ref2,
            fields = _objectWithoutProperties(_ref2, _excluded);
          const promise = new Promise((resolve, reject) => {
            try {
              const r = this._ordered ? add(id, fields, null) : add(id, fields);
              resolve(r);
            } catch (error) {
              reject(error);
            }
          });
          addPromises.push(promise);
        });
        await Promise.allSettled(addPromises).then(p => {
          p.forEach(result => {
            if (result.status === "rejected") {
              console.error("Error in adds for handle: ".concat(result.reason));
            }
          });
        });
        handle.initialAddsSentResolver();
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

},"doc_fetcher.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/doc_fetcher.js                                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  DocFetcher: () => DocFetcher
});
class DocFetcher {
  constructor(mongoConnection) {
    this._mongoConnection = mongoConnection;
    // Map from op -> [callback]
    this._callbacksForOp = new Map();
  }

  // Fetches document "id" from collectionName, returning it or null if not
  // found.
  //
  // If you make multiple calls to fetch() with the same op reference,
  // DocFetcher may assume that they all return the same document. (It does
  // not check to see if collectionName/id match.)
  //
  // You may assume that callback is never called synchronously (and in fact
  // OplogObserveDriver does so).
  async fetch(collectionName, id, op, callback) {
    const self = this;
    check(collectionName, String);
    check(op, Object);

    // If there's already an in-progress fetch for this cache key, yield until
    // it's done and return whatever it returns.
    if (self._callbacksForOp.has(op)) {
      self._callbacksForOp.get(op).push(callback);
      return;
    }
    const callbacks = [callback];
    self._callbacksForOp.set(op, callbacks);
    try {
      var doc = (await self._mongoConnection.findOneAsync(collectionName, {
        _id: id
      })) || null;
      // Return doc to all relevant callbacks. Note that this array can
      // continue to grow during callback excecution.
      while (callbacks.length > 0) {
        // Clone the document so that the various calls to fetch don't return
        // objects that are intertwingled with each other. Clone before
        // popping the future, so that if clone throws, the error gets passed
        // to the next callback.
        callbacks.pop()(null, EJSON.clone(doc));
      }
    } catch (e) {
      while (callbacks.length > 0) {
        callbacks.pop()(e);
      }
    } finally {
      // XXX consider keeping the doc around for a period of time before
      // removing from the cache
      self._callbacksForOp.delete(op);
    }
  }
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"polling_observe_driver.ts":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/polling_observe_driver.ts                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reify_async_result__) {
  "use strict";
  try {
    module.export({
      PollingObserveDriver: () => PollingObserveDriver
    });
    let throttle;
    module.link("lodash.throttle", {
      default(v) {
        throttle = v;
      }
    }, 0);
    let listenAll;
    module.link("./mongo_driver", {
      listenAll(v) {
        listenAll = v;
      }
    }, 1);
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    const POLLING_THROTTLE_MS = +(process.env.METEOR_POLLING_THROTTLE_MS || '') || 50;
    const POLLING_INTERVAL_MS = +(process.env.METEOR_POLLING_INTERVAL_MS || '') || 10 * 1000;
    /**
     * @class PollingObserveDriver
     *
     * One of two observe driver implementations.
     *
     * Characteristics:
     * - Caches the results of a query
     * - Reruns the query when necessary
     * - Suitable for cases where oplog tailing is not available or practical
     */
    class PollingObserveDriver {
      constructor(options) {
        this._options = void 0;
        this._cursorDescription = void 0;
        this._mongoHandle = void 0;
        this._ordered = void 0;
        this._multiplexer = void 0;
        this._stopCallbacks = void 0;
        this._stopped = void 0;
        this._cursor = void 0;
        this._results = void 0;
        this._pollsScheduledButNotStarted = void 0;
        this._pendingWrites = void 0;
        this._ensurePollIsScheduled = void 0;
        this._taskQueue = void 0;
        this._testOnlyPollCallback = void 0;
        this._options = options;
        this._cursorDescription = options.cursorDescription;
        this._mongoHandle = options.mongoHandle;
        this._ordered = options.ordered;
        this._multiplexer = options.multiplexer;
        this._stopCallbacks = [];
        this._stopped = false;
        this._cursor = this._mongoHandle._createAsynchronousCursor(this._cursorDescription);
        this._results = null;
        this._pollsScheduledButNotStarted = 0;
        this._pendingWrites = [];
        this._ensurePollIsScheduled = throttle(this._unthrottledEnsurePollIsScheduled.bind(this), this._cursorDescription.options.pollingThrottleMs || POLLING_THROTTLE_MS);
        this._taskQueue = new Meteor._AsynchronousQueue();
      }
      async _init() {
        var _Package$factsBase;
        const options = this._options;
        const listenersHandle = await listenAll(this._cursorDescription, notification => {
          const fence = DDPServer._getCurrentFence();
          if (fence) {
            this._pendingWrites.push(fence.beginWrite());
          }
          if (this._pollsScheduledButNotStarted === 0) {
            this._ensurePollIsScheduled();
          }
        });
        this._stopCallbacks.push(async () => {
          await listenersHandle.stop();
        });
        if (options._testOnlyPollCallback) {
          this._testOnlyPollCallback = options._testOnlyPollCallback;
        } else {
          const pollingInterval = this._cursorDescription.options.pollingIntervalMs || this._cursorDescription.options._pollingInterval || POLLING_INTERVAL_MS;
          const intervalHandle = Meteor.setInterval(this._ensurePollIsScheduled.bind(this), pollingInterval);
          this._stopCallbacks.push(() => {
            Meteor.clearInterval(intervalHandle);
          });
        }
        await this._unthrottledEnsurePollIsScheduled();
        (_Package$factsBase = Package['facts-base']) === null || _Package$factsBase === void 0 ? void 0 : _Package$factsBase.Facts.incrementServerFact("mongo-livedata", "observe-drivers-polling", 1);
      }
      async _unthrottledEnsurePollIsScheduled() {
        if (this._pollsScheduledButNotStarted > 0) return;
        ++this._pollsScheduledButNotStarted;
        await this._taskQueue.runTask(async () => {
          await this._pollMongo();
        });
      }
      _suspendPolling() {
        ++this._pollsScheduledButNotStarted;
        this._taskQueue.runTask(() => {});
        if (this._pollsScheduledButNotStarted !== 1) {
          throw new Error("_pollsScheduledButNotStarted is ".concat(this._pollsScheduledButNotStarted));
        }
      }
      async _resumePolling() {
        if (this._pollsScheduledButNotStarted !== 1) {
          throw new Error("_pollsScheduledButNotStarted is ".concat(this._pollsScheduledButNotStarted));
        }
        await this._taskQueue.runTask(async () => {
          await this._pollMongo();
        });
      }
      async _pollMongo() {
        var _this$_testOnlyPollCa;
        --this._pollsScheduledButNotStarted;
        if (this._stopped) return;
        let first = false;
        let newResults;
        let oldResults = this._results;
        if (!oldResults) {
          first = true;
          oldResults = this._ordered ? [] : new LocalCollection._IdMap();
        }
        (_this$_testOnlyPollCa = this._testOnlyPollCallback) === null || _this$_testOnlyPollCa === void 0 ? void 0 : _this$_testOnlyPollCa.call(this);
        const writesForCycle = this._pendingWrites;
        this._pendingWrites = [];
        try {
          newResults = await this._cursor.getRawObjects(this._ordered);
        } catch (e) {
          if (first && typeof e.code === 'number') {
            await this._multiplexer.queryError(new Error("Exception while polling query ".concat(JSON.stringify(this._cursorDescription), ": ").concat(e.message)));
          }
          Array.prototype.push.apply(this._pendingWrites, writesForCycle);
          Meteor._debug("Exception while polling query ".concat(JSON.stringify(this._cursorDescription)), e);
          return;
        }
        if (!this._stopped) {
          LocalCollection._diffQueryChanges(this._ordered, oldResults, newResults, this._multiplexer);
        }
        if (first) this._multiplexer.ready();
        this._results = newResults;
        await this._multiplexer.onFlush(async () => {
          for (const w of writesForCycle) {
            await w.committed();
          }
        });
      }
      async stop() {
        var _Package$factsBase2;
        this._stopped = true;
        for (const callback of this._stopCallbacks) {
          await callback();
        }
        for (const w of this._pendingWrites) {
          await w.committed();
        }
        (_Package$factsBase2 = Package['facts-base']) === null || _Package$factsBase2 === void 0 ? void 0 : _Package$factsBase2.Facts.incrementServerFact("mongo-livedata", "observe-drivers-polling", -1);
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

},"oplog_observe_driver.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/oplog_observe_driver.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reify_async_result__) {
  "use strict";
  try {
    let _asyncIterator;
    module.link("@babel/runtime/helpers/asyncIterator", {
      default(v) {
        _asyncIterator = v;
      }
    }, 0);
    module.export({
      OplogObserveDriver: () => OplogObserveDriver
    });
    let has;
    module.link("lodash.has", {
      default(v) {
        has = v;
      }
    }, 0);
    let isEmpty;
    module.link("lodash.isempty", {
      default(v) {
        isEmpty = v;
      }
    }, 1);
    let oplogV2V1Converter;
    module.link("./oplog_v2_converter", {
      oplogV2V1Converter(v) {
        oplogV2V1Converter = v;
      }
    }, 2);
    let check, Match;
    module.link("meteor/check", {
      check(v) {
        check = v;
      },
      Match(v) {
        Match = v;
      }
    }, 3);
    let CursorDescription;
    module.link("./cursor_description", {
      CursorDescription(v) {
        CursorDescription = v;
      }
    }, 4);
    let forEachTrigger, listenAll;
    module.link("./mongo_driver", {
      forEachTrigger(v) {
        forEachTrigger = v;
      },
      listenAll(v) {
        listenAll = v;
      }
    }, 5);
    let Cursor;
    module.link("./cursor", {
      Cursor(v) {
        Cursor = v;
      }
    }, 6);
    let LocalCollection;
    module.link("meteor/minimongo/local_collection", {
      default(v) {
        LocalCollection = v;
      }
    }, 7);
    let idForOp;
    module.link("./oplog_tailing", {
      idForOp(v) {
        idForOp = v;
      }
    }, 8);
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    var PHASE = {
      QUERYING: "QUERYING",
      FETCHING: "FETCHING",
      STEADY: "STEADY"
    };

    // Exception thrown by _needToPollQuery which unrolls the stack up to the
    // enclosing call to finishIfNeedToPollQuery.
    var SwitchedToQuery = function () {};
    var finishIfNeedToPollQuery = function (f) {
      return function () {
        try {
          f.apply(this, arguments);
        } catch (e) {
          if (!(e instanceof SwitchedToQuery)) throw e;
        }
      };
    };
    var currentId = 0;

    /**
     * @class OplogObserveDriver
     * An alternative to PollingObserveDriver which follows the MongoDB operation log
     * instead of re-polling the query.
     *
     * Characteristics:
     * - Follows the MongoDB operation log
     * - Directly observes database changes
     * - More efficient than polling for most use cases
     * - Requires access to MongoDB oplog
     *
     * Interface:
     * - Construction initiates observeChanges callbacks and ready() invocation to the ObserveMultiplexer
     * - Observation can be terminated via the stop() method
     */
    const OplogObserveDriver = function (options) {
      const self = this;
      self._usesOplog = true; // tests look at this

      self._id = currentId;
      currentId++;
      self._cursorDescription = options.cursorDescription;
      self._mongoHandle = options.mongoHandle;
      self._multiplexer = options.multiplexer;
      if (options.ordered) {
        throw Error("OplogObserveDriver only supports unordered observeChanges");
      }
      const sorter = options.sorter;
      // We don't support $near and other geo-queries so it's OK to initialize the
      // comparator only once in the constructor.
      const comparator = sorter && sorter.getComparator();
      if (options.cursorDescription.options.limit) {
        // There are several properties ordered driver implements:
        // - _limit is a positive number
        // - _comparator is a function-comparator by which the query is ordered
        // - _unpublishedBuffer is non-null Min/Max Heap,
        //                      the empty buffer in STEADY phase implies that the
        //                      everything that matches the queries selector fits
        //                      into published set.
        // - _published - Max Heap (also implements IdMap methods)

        const heapOptions = {
          IdMap: LocalCollection._IdMap
        };
        self._limit = self._cursorDescription.options.limit;
        self._comparator = comparator;
        self._sorter = sorter;
        self._unpublishedBuffer = new MinMaxHeap(comparator, heapOptions);
        // We need something that can find Max value in addition to IdMap interface
        self._published = new MaxHeap(comparator, heapOptions);
      } else {
        self._limit = 0;
        self._comparator = null;
        self._sorter = null;
        self._unpublishedBuffer = null;
        // Memory Growth
        self._published = new LocalCollection._IdMap();
      }

      // Indicates if it is safe to insert a new document at the end of the buffer
      // for this query. i.e. it is known that there are no documents matching the
      // selector those are not in published or buffer.
      self._safeAppendToBuffer = false;
      self._stopped = false;
      self._stopHandles = [];
      self._addStopHandles = function (newStopHandles) {
        const expectedPattern = Match.ObjectIncluding({
          stop: Function
        });
        // Single item or array
        check(newStopHandles, Match.OneOf([expectedPattern], expectedPattern));
        self._stopHandles.push(newStopHandles);
      };
      Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-drivers-oplog", 1);
      self._registerPhaseChange(PHASE.QUERYING);
      self._matcher = options.matcher;
      // we are now using projection, not fields in the cursor description even if you pass {fields}
      // in the cursor construction
      const projection = self._cursorDescription.options.fields || self._cursorDescription.options.projection || {};
      self._projectionFn = LocalCollection._compileProjection(projection);
      // Projection function, result of combining important fields for selector and
      // existing fields projection
      self._sharedProjection = self._matcher.combineIntoProjection(projection);
      if (sorter) self._sharedProjection = sorter.combineIntoProjection(self._sharedProjection);
      self._sharedProjectionFn = LocalCollection._compileProjection(self._sharedProjection);
      self._needToFetch = new LocalCollection._IdMap();
      self._currentlyFetching = null;
      self._fetchGeneration = 0;
      self._requeryWhenDoneThisQuery = false;
      self._writesToCommitWhenWeReachSteady = [];
    };
    Object.assign(OplogObserveDriver.prototype, {
      _init: async function () {
        const self = this;

        // If the oplog handle tells us that it skipped some entries (because it got
        // behind, say), re-poll.
        self._addStopHandles(self._mongoHandle._oplogHandle.onSkippedEntries(finishIfNeedToPollQuery(function () {
          return self._needToPollQuery();
        })));
        await forEachTrigger(self._cursorDescription, async function (trigger) {
          self._addStopHandles(await self._mongoHandle._oplogHandle.onOplogEntry(trigger, function (notification) {
            finishIfNeedToPollQuery(function () {
              const op = notification.op;
              if (notification.dropCollection || notification.dropDatabase) {
                // Note: this call is not allowed to block on anything (especially
                // on waiting for oplog entries to catch up) because that will block
                // onOplogEntry!
                return self._needToPollQuery();
              } else {
                // All other operators should be handled depending on phase
                if (self._phase === PHASE.QUERYING) {
                  return self._handleOplogEntryQuerying(op);
                } else {
                  return self._handleOplogEntrySteadyOrFetching(op);
                }
              }
            })();
          }));
        });

        // XXX ordering w.r.t. everything else?
        self._addStopHandles(await listenAll(self._cursorDescription, function () {
          // If we're not in a pre-fire write fence, we don't have to do anything.
          const fence = DDPServer._getCurrentFence();
          if (!fence || fence.fired) return;
          if (fence._oplogObserveDrivers) {
            fence._oplogObserveDrivers[self._id] = self;
            return;
          }
          fence._oplogObserveDrivers = {};
          fence._oplogObserveDrivers[self._id] = self;
          fence.onBeforeFire(async function () {
            const drivers = fence._oplogObserveDrivers;
            delete fence._oplogObserveDrivers;

            // This fence cannot fire until we've caught up to "this point" in the
            // oplog, and all observers made it back to the steady state.
            await self._mongoHandle._oplogHandle.waitUntilCaughtUp();
            for (const driver of Object.values(drivers)) {
              if (driver._stopped) continue;
              const write = await fence.beginWrite();
              if (driver._phase === PHASE.STEADY) {
                // Make sure that all of the callbacks have made it through the
                // multiplexer and been delivered to ObserveHandles before committing
                // writes.
                await driver._multiplexer.onFlush(write.committed);
              } else {
                driver._writesToCommitWhenWeReachSteady.push(write);
              }
            }
          });
        }));

        // When Mongo fails over, we need to repoll the query, in case we processed an
        // oplog entry that got rolled back.
        self._addStopHandles(self._mongoHandle._onFailover(finishIfNeedToPollQuery(function () {
          return self._needToPollQuery();
        })));

        // Give _observeChanges a chance to add the new ObserveHandle to our
        // multiplexer, so that the added calls get streamed.
        return self._runInitialQuery();
      },
      _addPublished: function (id, doc) {
        var self = this;
        Meteor._noYieldsAllowed(function () {
          var fields = Object.assign({}, doc);
          delete fields._id;
          self._published.set(id, self._sharedProjectionFn(doc));
          self._multiplexer.added(id, self._projectionFn(fields));

          // After adding this document, the published set might be overflowed
          // (exceeding capacity specified by limit). If so, push the maximum
          // element to the buffer, we might want to save it in memory to reduce the
          // amount of Mongo lookups in the future.
          if (self._limit && self._published.size() > self._limit) {
            // XXX in theory the size of published is no more than limit+1
            if (self._published.size() !== self._limit + 1) {
              throw new Error("After adding to published, " + (self._published.size() - self._limit) + " documents are overflowing the set");
            }
            var overflowingDocId = self._published.maxElementId();
            var overflowingDoc = self._published.get(overflowingDocId);
            if (EJSON.equals(overflowingDocId, id)) {
              throw new Error("The document just added is overflowing the published set");
            }
            self._published.remove(overflowingDocId);
            self._multiplexer.removed(overflowingDocId);
            self._addBuffered(overflowingDocId, overflowingDoc);
          }
        });
      },
      _removePublished: function (id) {
        var self = this;
        Meteor._noYieldsAllowed(function () {
          self._published.remove(id);
          self._multiplexer.removed(id);
          if (!self._limit || self._published.size() === self._limit) return;
          if (self._published.size() > self._limit) throw Error("self._published got too big");

          // OK, we are publishing less than the limit. Maybe we should look in the
          // buffer to find the next element past what we were publishing before.

          if (!self._unpublishedBuffer.empty()) {
            // There's something in the buffer; move the first thing in it to
            // _published.
            var newDocId = self._unpublishedBuffer.minElementId();
            var newDoc = self._unpublishedBuffer.get(newDocId);
            self._removeBuffered(newDocId);
            self._addPublished(newDocId, newDoc);
            return;
          }

          // There's nothing in the buffer.  This could mean one of a few things.

          // (a) We could be in the middle of re-running the query (specifically, we
          // could be in _publishNewResults). In that case, _unpublishedBuffer is
          // empty because we clear it at the beginning of _publishNewResults. In
          // this case, our caller already knows the entire answer to the query and
          // we don't need to do anything fancy here.  Just return.
          if (self._phase === PHASE.QUERYING) return;

          // (b) We're pretty confident that the union of _published and
          // _unpublishedBuffer contain all documents that match selector. Because
          // _unpublishedBuffer is empty, that means we're confident that _published
          // contains all documents that match selector. So we have nothing to do.
          if (self._safeAppendToBuffer) return;

          // (c) Maybe there are other documents out there that should be in our
          // buffer. But in that case, when we emptied _unpublishedBuffer in
          // _removeBuffered, we should have called _needToPollQuery, which will
          // either put something in _unpublishedBuffer or set _safeAppendToBuffer
          // (or both), and it will put us in QUERYING for that whole time. So in
          // fact, we shouldn't be able to get here.

          throw new Error("Buffer inexplicably empty");
        });
      },
      _changePublished: function (id, oldDoc, newDoc) {
        var self = this;
        Meteor._noYieldsAllowed(function () {
          self._published.set(id, self._sharedProjectionFn(newDoc));
          var projectedNew = self._projectionFn(newDoc);
          var projectedOld = self._projectionFn(oldDoc);
          var changed = DiffSequence.makeChangedFields(projectedNew, projectedOld);
          if (!isEmpty(changed)) self._multiplexer.changed(id, changed);
        });
      },
      _addBuffered: function (id, doc) {
        var self = this;
        Meteor._noYieldsAllowed(function () {
          self._unpublishedBuffer.set(id, self._sharedProjectionFn(doc));

          // If something is overflowing the buffer, we just remove it from cache
          if (self._unpublishedBuffer.size() > self._limit) {
            var maxBufferedId = self._unpublishedBuffer.maxElementId();
            self._unpublishedBuffer.remove(maxBufferedId);

            // Since something matching is removed from cache (both published set and
            // buffer), set flag to false
            self._safeAppendToBuffer = false;
          }
        });
      },
      // Is called either to remove the doc completely from matching set or to move
      // it to the published set later.
      _removeBuffered: function (id) {
        var self = this;
        Meteor._noYieldsAllowed(function () {
          self._unpublishedBuffer.remove(id);
          // To keep the contract "buffer is never empty in STEADY phase unless the
          // everything matching fits into published" true, we poll everything as
          // soon as we see the buffer becoming empty.
          if (!self._unpublishedBuffer.size() && !self._safeAppendToBuffer) self._needToPollQuery();
        });
      },
      // Called when a document has joined the "Matching" results set.
      // Takes responsibility of keeping _unpublishedBuffer in sync with _published
      // and the effect of limit enforced.
      _addMatching: function (doc) {
        var self = this;
        Meteor._noYieldsAllowed(function () {
          var id = doc._id;
          if (self._published.has(id)) throw Error("tried to add something already published " + id);
          if (self._limit && self._unpublishedBuffer.has(id)) throw Error("tried to add something already existed in buffer " + id);
          var limit = self._limit;
          var comparator = self._comparator;
          var maxPublished = limit && self._published.size() > 0 ? self._published.get(self._published.maxElementId()) : null;
          var maxBuffered = limit && self._unpublishedBuffer.size() > 0 ? self._unpublishedBuffer.get(self._unpublishedBuffer.maxElementId()) : null;
          // The query is unlimited or didn't publish enough documents yet or the
          // new document would fit into published set pushing the maximum element
          // out, then we need to publish the doc.
          var toPublish = !limit || self._published.size() < limit || comparator(doc, maxPublished) < 0;

          // Otherwise we might need to buffer it (only in case of limited query).
          // Buffering is allowed if the buffer is not filled up yet and all
          // matching docs are either in the published set or in the buffer.
          var canAppendToBuffer = !toPublish && self._safeAppendToBuffer && self._unpublishedBuffer.size() < limit;

          // Or if it is small enough to be safely inserted to the middle or the
          // beginning of the buffer.
          var canInsertIntoBuffer = !toPublish && maxBuffered && comparator(doc, maxBuffered) <= 0;
          var toBuffer = canAppendToBuffer || canInsertIntoBuffer;
          if (toPublish) {
            self._addPublished(id, doc);
          } else if (toBuffer) {
            self._addBuffered(id, doc);
          } else {
            // dropping it and not saving to the cache
            self._safeAppendToBuffer = false;
          }
        });
      },
      // Called when a document leaves the "Matching" results set.
      // Takes responsibility of keeping _unpublishedBuffer in sync with _published
      // and the effect of limit enforced.
      _removeMatching: function (id) {
        var self = this;
        Meteor._noYieldsAllowed(function () {
          if (!self._published.has(id) && !self._limit) throw Error("tried to remove something matching but not cached " + id);
          if (self._published.has(id)) {
            self._removePublished(id);
          } else if (self._unpublishedBuffer.has(id)) {
            self._removeBuffered(id);
          }
        });
      },
      _handleDoc: function (id, newDoc) {
        var self = this;
        Meteor._noYieldsAllowed(function () {
          var matchesNow = newDoc && self._matcher.documentMatches(newDoc).result;
          var publishedBefore = self._published.has(id);
          var bufferedBefore = self._limit && self._unpublishedBuffer.has(id);
          var cachedBefore = publishedBefore || bufferedBefore;
          if (matchesNow && !cachedBefore) {
            self._addMatching(newDoc);
          } else if (cachedBefore && !matchesNow) {
            self._removeMatching(id);
          } else if (cachedBefore && matchesNow) {
            var oldDoc = self._published.get(id);
            var comparator = self._comparator;
            var minBuffered = self._limit && self._unpublishedBuffer.size() && self._unpublishedBuffer.get(self._unpublishedBuffer.minElementId());
            var maxBuffered;
            if (publishedBefore) {
              // Unlimited case where the document stays in published once it
              // matches or the case when we don't have enough matching docs to
              // publish or the changed but matching doc will stay in published
              // anyways.
              //
              // XXX: We rely on the emptiness of buffer. Be sure to maintain the
              // fact that buffer can't be empty if there are matching documents not
              // published. Notably, we don't want to schedule repoll and continue
              // relying on this property.
              var staysInPublished = !self._limit || self._unpublishedBuffer.size() === 0 || comparator(newDoc, minBuffered) <= 0;
              if (staysInPublished) {
                self._changePublished(id, oldDoc, newDoc);
              } else {
                // after the change doc doesn't stay in the published, remove it
                self._removePublished(id);
                // but it can move into buffered now, check it
                maxBuffered = self._unpublishedBuffer.get(self._unpublishedBuffer.maxElementId());
                var toBuffer = self._safeAppendToBuffer || maxBuffered && comparator(newDoc, maxBuffered) <= 0;
                if (toBuffer) {
                  self._addBuffered(id, newDoc);
                } else {
                  // Throw away from both published set and buffer
                  self._safeAppendToBuffer = false;
                }
              }
            } else if (bufferedBefore) {
              oldDoc = self._unpublishedBuffer.get(id);
              // remove the old version manually instead of using _removeBuffered so
              // we don't trigger the querying immediately.  if we end this block
              // with the buffer empty, we will need to trigger the query poll
              // manually too.
              self._unpublishedBuffer.remove(id);
              var maxPublished = self._published.get(self._published.maxElementId());
              maxBuffered = self._unpublishedBuffer.size() && self._unpublishedBuffer.get(self._unpublishedBuffer.maxElementId());

              // the buffered doc was updated, it could move to published
              var toPublish = comparator(newDoc, maxPublished) < 0;

              // or stays in buffer even after the change
              var staysInBuffer = !toPublish && self._safeAppendToBuffer || !toPublish && maxBuffered && comparator(newDoc, maxBuffered) <= 0;
              if (toPublish) {
                self._addPublished(id, newDoc);
              } else if (staysInBuffer) {
                // stays in buffer but changes
                self._unpublishedBuffer.set(id, newDoc);
              } else {
                // Throw away from both published set and buffer
                self._safeAppendToBuffer = false;
                // Normally this check would have been done in _removeBuffered but
                // we didn't use it, so we need to do it ourself now.
                if (!self._unpublishedBuffer.size()) {
                  self._needToPollQuery();
                }
              }
            } else {
              throw new Error("cachedBefore implies either of publishedBefore or bufferedBefore is true.");
            }
          }
        });
      },
      _fetchModifiedDocuments: function () {
        var self = this;
        self._registerPhaseChange(PHASE.FETCHING);
        // Defer, because nothing called from the oplog entry handler may yield,
        // but fetch() yields.
        Meteor.defer(finishIfNeedToPollQuery(async function () {
          while (!self._stopped && !self._needToFetch.empty()) {
            if (self._phase === PHASE.QUERYING) {
              // While fetching, we decided to go into QUERYING mode, and then we
              // saw another oplog entry, so _needToFetch is not empty. But we
              // shouldn't fetch these documents until AFTER the query is done.
              break;
            }

            // Being in steady phase here would be surprising.
            if (self._phase !== PHASE.FETCHING) throw new Error("phase in fetchModifiedDocuments: " + self._phase);
            self._currentlyFetching = self._needToFetch;
            var thisGeneration = ++self._fetchGeneration;
            self._needToFetch = new LocalCollection._IdMap();

            // Create an array of promises for all the fetch operations
            const fetchPromises = [];
            self._currentlyFetching.forEach(function (op, id) {
              const fetchPromise = new Promise((resolve, reject) => {
                self._mongoHandle._docFetcher.fetch(self._cursorDescription.collectionName, id, op, finishIfNeedToPollQuery(function (err, doc) {
                  if (err) {
                    Meteor._debug('Got exception while fetching documents', err);
                    // If we get an error from the fetcher (eg, trouble
                    // connecting to Mongo), let's just abandon the fetch phase
                    // altogether and fall back to polling. It's not like we're
                    // getting live updates anyway.
                    if (self._phase !== PHASE.QUERYING) {
                      self._needToPollQuery();
                    }
                    resolve();
                    return;
                  }
                  if (!self._stopped && self._phase === PHASE.FETCHING && self._fetchGeneration === thisGeneration) {
                    // We re-check the generation in case we've had an explicit
                    // _pollQuery call (eg, in another fiber) which should
                    // effectively cancel this round of fetches.  (_pollQuery
                    // increments the generation.)
                    try {
                      self._handleDoc(id, doc);
                      resolve();
                    } catch (err) {
                      reject(err);
                    }
                  } else {
                    resolve();
                  }
                }));
              });
              fetchPromises.push(fetchPromise);
            });
            // Wait for all fetch operations to complete
            try {
              const results = await Promise.allSettled(fetchPromises);
              const errors = results.filter(result => result.status === 'rejected').map(result => result.reason);
              if (errors.length > 0) {
                Meteor._debug('Some fetch queries failed:', errors);
              }
            } catch (err) {
              Meteor._debug('Got an exception in a fetch query', err);
            }
            // Exit now if we've had a _pollQuery call (here or in another fiber).
            if (self._phase === PHASE.QUERYING) return;
            self._currentlyFetching = null;
          }
          // We're done fetching, so we can be steady, unless we've had a
          // _pollQuery call (here or in another fiber).
          if (self._phase !== PHASE.QUERYING) await self._beSteady();
        }));
      },
      _beSteady: async function () {
        var self = this;
        self._registerPhaseChange(PHASE.STEADY);
        var writes = self._writesToCommitWhenWeReachSteady || [];
        self._writesToCommitWhenWeReachSteady = [];
        await self._multiplexer.onFlush(async function () {
          try {
            for (const w of writes) {
              await w.committed();
            }
          } catch (e) {
            console.error("_beSteady error", {
              writes
            }, e);
          }
        });
      },
      _handleOplogEntryQuerying: function (op) {
        var self = this;
        Meteor._noYieldsAllowed(function () {
          self._needToFetch.set(idForOp(op), op);
        });
      },
      _handleOplogEntrySteadyOrFetching: function (op) {
        var self = this;
        Meteor._noYieldsAllowed(function () {
          var id = idForOp(op);
          // If we're already fetching this one, or about to, we can't optimize;
          // make sure that we fetch it again if necessary.

          if (self._phase === PHASE.FETCHING && (self._currentlyFetching && self._currentlyFetching.has(id) || self._needToFetch.has(id))) {
            self._needToFetch.set(id, op);
            return;
          }
          if (op.op === 'd') {
            if (self._published.has(id) || self._limit && self._unpublishedBuffer.has(id)) self._removeMatching(id);
          } else if (op.op === 'i') {
            if (self._published.has(id)) throw new Error("insert found for already-existing ID in published");
            if (self._unpublishedBuffer && self._unpublishedBuffer.has(id)) throw new Error("insert found for already-existing ID in buffer");

            // XXX what if selector yields?  for now it can't but later it could
            // have $where
            if (self._matcher.documentMatches(op.o).result) self._addMatching(op.o);
          } else if (op.op === 'u') {
            // we are mapping the new oplog format on mongo 5
            // to what we know better, $set
            op.o = oplogV2V1Converter(op.o);
            // Is this a modifier ($set/$unset, which may require us to poll the
            // database to figure out if the whole document matches the selector) or
            // a replacement (in which case we can just directly re-evaluate the
            // selector)?
            // oplog format has changed on mongodb 5, we have to support both now
            // diff is the format in Mongo 5+ (oplog v2)
            var isReplace = !has(op.o, '$set') && !has(op.o, 'diff') && !has(op.o, '$unset');
            // If this modifier modifies something inside an EJSON custom type (ie,
            // anything with EJSON$), then we can't try to use
            // LocalCollection._modify, since that just mutates the EJSON encoding,
            // not the actual object.
            var canDirectlyModifyDoc = !isReplace && modifierCanBeDirectlyApplied(op.o);
            var publishedBefore = self._published.has(id);
            var bufferedBefore = self._limit && self._unpublishedBuffer.has(id);
            if (isReplace) {
              self._handleDoc(id, Object.assign({
                _id: id
              }, op.o));
            } else if ((publishedBefore || bufferedBefore) && canDirectlyModifyDoc) {
              // Oh great, we actually know what the document is, so we can apply
              // this directly.
              var newDoc = self._published.has(id) ? self._published.get(id) : self._unpublishedBuffer.get(id);
              newDoc = EJSON.clone(newDoc);
              newDoc._id = id;
              try {
                LocalCollection._modify(newDoc, op.o);
              } catch (e) {
                if (e.name !== "MinimongoError") throw e;
                // We didn't understand the modifier.  Re-fetch.
                self._needToFetch.set(id, op);
                if (self._phase === PHASE.STEADY) {
                  self._fetchModifiedDocuments();
                }
                return;
              }
              self._handleDoc(id, self._sharedProjectionFn(newDoc));
            } else if (!canDirectlyModifyDoc || self._matcher.canBecomeTrueByModifier(op.o) || self._sorter && self._sorter.affectedByModifier(op.o)) {
              self._needToFetch.set(id, op);
              if (self._phase === PHASE.STEADY) self._fetchModifiedDocuments();
            }
          } else {
            throw Error("XXX SURPRISING OPERATION: " + op);
          }
        });
      },
      async _runInitialQueryAsync() {
        var self = this;
        if (self._stopped) throw new Error("oplog stopped surprisingly early");
        await self._runQuery({
          initial: true
        }); // yields

        if (self._stopped) return; // can happen on queryError

        // Allow observeChanges calls to return. (After this, it's possible for
        // stop() to be called.)
        await self._multiplexer.ready();
        await self._doneQuerying(); // yields
      },
      // Yields!
      _runInitialQuery: function () {
        return this._runInitialQueryAsync();
      },
      // In various circumstances, we may just want to stop processing the oplog and
      // re-run the initial query, just as if we were a PollingObserveDriver.
      //
      // This function may not block, because it is called from an oplog entry
      // handler.
      //
      // XXX We should call this when we detect that we've been in FETCHING for "too
      // long".
      //
      // XXX We should call this when we detect Mongo failover (since that might
      // mean that some of the oplog entries we have processed have been rolled
      // back). The Node Mongo driver is in the middle of a bunch of huge
      // refactorings, including the way that it notifies you when primary
      // changes. Will put off implementing this until driver 1.4 is out.
      _pollQuery: function () {
        var self = this;
        Meteor._noYieldsAllowed(function () {
          if (self._stopped) return;

          // Yay, we get to forget about all the things we thought we had to fetch.
          self._needToFetch = new LocalCollection._IdMap();
          self._currentlyFetching = null;
          ++self._fetchGeneration; // ignore any in-flight fetches
          self._registerPhaseChange(PHASE.QUERYING);

          // Defer so that we don't yield.  We don't need finishIfNeedToPollQuery
          // here because SwitchedToQuery is not thrown in QUERYING mode.
          Meteor.defer(async function () {
            await self._runQuery();
            await self._doneQuerying();
          });
        });
      },
      // Yields!
      async _runQueryAsync(options) {
        var self = this;
        options = options || {};
        var newResults, newBuffer;

        // This while loop is just to retry failures.
        while (true) {
          // If we've been stopped, we don't have to run anything any more.
          if (self._stopped) return;
          newResults = new LocalCollection._IdMap();
          newBuffer = new LocalCollection._IdMap();

          // Query 2x documents as the half excluded from the original query will go
          // into unpublished buffer to reduce additional Mongo lookups in cases
          // when documents are removed from the published set and need a
          // replacement.
          // XXX needs more thought on non-zero skip
          // XXX 2 is a "magic number" meaning there is an extra chunk of docs for
          // buffer if such is needed.
          var cursor = self._cursorForQuery({
            limit: self._limit * 2
          });
          try {
            await cursor.forEach(function (doc, i) {
              // yields
              if (!self._limit || i < self._limit) {
                newResults.set(doc._id, doc);
              } else {
                newBuffer.set(doc._id, doc);
              }
            });
            break;
          } catch (e) {
            if (options.initial && typeof e.code === 'number') {
              // This is an error document sent to us by mongod, not a connection
              // error generated by the client. And we've never seen this query work
              // successfully. Probably it's a bad selector or something, so we
              // should NOT retry. Instead, we should halt the observe (which ends
              // up calling `stop` on us).
              await self._multiplexer.queryError(e);
              return;
            }

            // During failover (eg) if we get an exception we should log and retry
            // instead of crashing.
            Meteor._debug("Got exception while polling query", e);
            await Meteor._sleepForMs(100);
          }
        }
        if (self._stopped) return;
        self._publishNewResults(newResults, newBuffer);
      },
      // Yields!
      _runQuery: function (options) {
        return this._runQueryAsync(options);
      },
      // Transitions to QUERYING and runs another query, or (if already in QUERYING)
      // ensures that we will query again later.
      //
      // This function may not block, because it is called from an oplog entry
      // handler. However, if we were not already in the QUERYING phase, it throws
      // an exception that is caught by the closest surrounding
      // finishIfNeedToPollQuery call; this ensures that we don't continue running
      // close that was designed for another phase inside PHASE.QUERYING.
      //
      // (It's also necessary whenever logic in this file yields to check that other
      // phases haven't put us into QUERYING mode, though; eg,
      // _fetchModifiedDocuments does this.)
      _needToPollQuery: function () {
        var self = this;
        Meteor._noYieldsAllowed(function () {
          if (self._stopped) return;

          // If we're not already in the middle of a query, we can query now
          // (possibly pausing FETCHING).
          if (self._phase !== PHASE.QUERYING) {
            self._pollQuery();
            throw new SwitchedToQuery();
          }

          // We're currently in QUERYING. Set a flag to ensure that we run another
          // query when we're done.
          self._requeryWhenDoneThisQuery = true;
        });
      },
      // Yields!
      _doneQuerying: async function () {
        var self = this;
        if (self._stopped) return;
        await self._mongoHandle._oplogHandle.waitUntilCaughtUp();
        if (self._stopped) return;
        if (self._phase !== PHASE.QUERYING) throw Error("Phase unexpectedly " + self._phase);
        if (self._requeryWhenDoneThisQuery) {
          self._requeryWhenDoneThisQuery = false;
          self._pollQuery();
        } else if (self._needToFetch.empty()) {
          await self._beSteady();
        } else {
          self._fetchModifiedDocuments();
        }
      },
      _cursorForQuery: function (optionsOverwrite) {
        var self = this;
        return Meteor._noYieldsAllowed(function () {
          // The query we run is almost the same as the cursor we are observing,
          // with a few changes. We need to read all the fields that are relevant to
          // the selector, not just the fields we are going to publish (that's the
          // "shared" projection). And we don't want to apply any transform in the
          // cursor, because observeChanges shouldn't use the transform.
          var options = Object.assign({}, self._cursorDescription.options);

          // Allow the caller to modify the options. Useful to specify different
          // skip and limit values.
          Object.assign(options, optionsOverwrite);
          options.fields = self._sharedProjection;
          delete options.transform;
          // We are NOT deep cloning fields or selector here, which should be OK.
          var description = new CursorDescription(self._cursorDescription.collectionName, self._cursorDescription.selector, options);
          return new Cursor(self._mongoHandle, description);
        });
      },
      // Replace self._published with newResults (both are IdMaps), invoking observe
      // callbacks on the multiplexer.
      // Replace self._unpublishedBuffer with newBuffer.
      //
      // XXX This is very similar to LocalCollection._diffQueryUnorderedChanges. We
      // should really: (a) Unify IdMap and OrderedDict into Unordered/OrderedDict
      // (b) Rewrite diff.js to use these classes instead of arrays and objects.
      _publishNewResults: function (newResults, newBuffer) {
        var self = this;
        Meteor._noYieldsAllowed(function () {
          // If the query is limited and there is a buffer, shut down so it doesn't
          // stay in a way.
          if (self._limit) {
            self._unpublishedBuffer.clear();
          }

          // First remove anything that's gone. Be careful not to modify
          // self._published while iterating over it.
          var idsToRemove = [];
          self._published.forEach(function (doc, id) {
            if (!newResults.has(id)) idsToRemove.push(id);
          });
          idsToRemove.forEach(function (id) {
            self._removePublished(id);
          });

          // Now do adds and changes.
          // If self has a buffer and limit, the new fetched result will be
          // limited correctly as the query has sort specifier.
          newResults.forEach(function (doc, id) {
            self._handleDoc(id, doc);
          });

          // Sanity-check that everything we tried to put into _published ended up
          // there.
          // XXX if this is slow, remove it later
          if (self._published.size() !== newResults.size()) {
            Meteor._debug('The Mongo server and the Meteor query disagree on how ' + 'many documents match your query. Cursor description: ', self._cursorDescription);
          }
          self._published.forEach(function (doc, id) {
            if (!newResults.has(id)) throw Error("_published has a doc that newResults doesn't; " + id);
          });

          // Finally, replace the buffer
          newBuffer.forEach(function (doc, id) {
            self._addBuffered(id, doc);
          });
          self._safeAppendToBuffer = newBuffer.size() < self._limit;
        });
      },
      // This stop function is invoked from the onStop of the ObserveMultiplexer, so
      // it shouldn't actually be possible to call it until the multiplexer is
      // ready.
      //
      // It's important to check self._stopped after every call in this file that
      // can yield!
      _stop: async function () {
        var self = this;
        if (self._stopped) return;
        self._stopped = true;

        // Note: we *don't* use multiplexer.onFlush here because this stop
        // callback is actually invoked by the multiplexer itself when it has
        // determined that there are no handles left. So nothing is actually going
        // to get flushed (and it's probably not valid to call methods on the
        // dying multiplexer).
        for (const w of self._writesToCommitWhenWeReachSteady) {
          await w.committed();
        }
        self._writesToCommitWhenWeReachSteady = null;

        // Proactively drop references to potentially big things.
        self._published = null;
        self._unpublishedBuffer = null;
        self._needToFetch = null;
        self._currentlyFetching = null;
        self._oplogEntryHandle = null;
        self._listenersHandle = null;
        Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-drivers-oplog", -1);
        var _iteratorAbruptCompletion = false;
        var _didIteratorError = false;
        var _iteratorError;
        try {
          for (var _iterator = _asyncIterator(self._stopHandles), _step; _iteratorAbruptCompletion = !(_step = await _iterator.next()).done; _iteratorAbruptCompletion = false) {
            const handle = _step.value;
            {
              await handle.stop();
            }
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (_iteratorAbruptCompletion && _iterator.return != null) {
              await _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      },
      stop: async function () {
        const self = this;
        return await self._stop();
      },
      _registerPhaseChange: function (phase) {
        var self = this;
        Meteor._noYieldsAllowed(function () {
          var now = new Date();
          if (self._phase) {
            var timeDiff = now - self._phaseStartTime;
            Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "time-spent-in-" + self._phase + "-phase", timeDiff);
          }
          self._phase = phase;
          self._phaseStartTime = now;
        });
      }
    });

    // Does our oplog tailing code support this cursor? For now, we are being very
    // conservative and allowing only simple queries with simple options.
    // (This is a "static method".)
    OplogObserveDriver.cursorSupported = function (cursorDescription, matcher) {
      // First, check the options.
      var options = cursorDescription.options;

      // Did the user say no explicitly?
      // underscored version of the option is COMPAT with 1.2
      if (options.disableOplog || options._disableOplog) return false;

      // skip is not supported: to support it we would need to keep track of all
      // "skipped" documents or at least their ids.
      // limit w/o a sort specifier is not supported: current implementation needs a
      // deterministic way to order documents.
      if (options.skip || options.limit && !options.sort) return false;

      // If a fields projection option is given check if it is supported by
      // minimongo (some operators are not supported).
      const fields = options.fields || options.projection;
      if (fields) {
        try {
          LocalCollection._checkSupportedProjection(fields);
        } catch (e) {
          if (e.name === "MinimongoError") {
            return false;
          } else {
            throw e;
          }
        }
      }

      // We don't allow the following selectors:
      //   - $where (not confident that we provide the same JS environment
      //             as Mongo, and can yield!)
      //   - $near (has "interesting" properties in MongoDB, like the possibility
      //            of returning an ID multiple times, though even polling maybe
      //            have a bug there)
      //           XXX: once we support it, we would need to think more on how we
      //           initialize the comparators when we create the driver.
      return !matcher.hasWhere() && !matcher.hasGeoQuery();
    };
    var modifierCanBeDirectlyApplied = function (modifier) {
      return Object.entries(modifier).every(function (_ref) {
        let [operation, fields] = _ref;
        return Object.entries(fields).every(function (_ref2) {
          let [field, value] = _ref2;
          return !/EJSON\$/.test(field);
        });
      });
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

},"oplog_v2_converter.ts":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/oplog_v2_converter.ts                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module1, __reifyWaitForDeps__, __reify_async_result__) {
  "use strict";
  try {
    module1.export({
      oplogV2V1Converter: () => oplogV2V1Converter
    });
    let EJSON;
    module1.link("meteor/ejson", {
      EJSON(v) {
        EJSON = v;
      }
    }, 0);
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    const arrayOperatorKeyRegex = /^(a|[su]\d+)$/;
    /**
     * Checks if a field is an array operator key of form 'a' or 's1' or 'u1' etc
     */
    function isArrayOperatorKey(field) {
      return arrayOperatorKeyRegex.test(field);
    }
    /**
     * Type guard to check if an operator is a valid array operator.
     * Array operators have 'a: true' and keys that match the arrayOperatorKeyRegex
     */
    function isArrayOperator(operator) {
      return operator !== null && typeof operator === 'object' && 'a' in operator && operator.a === true && Object.keys(operator).every(isArrayOperatorKey);
    }
    /**
     * Joins two parts of a field path with a dot.
     * Returns the key itself if prefix is empty.
     */
    function join(prefix, key) {
      return prefix ? "".concat(prefix, ".").concat(key) : key;
    }
    /**
     * Recursively flattens an object into a target object with dot notation paths.
     * Handles special cases:
     * - Arrays are assigned directly
     * - Custom EJSON types are preserved
     * - Mongo.ObjectIDs are preserved
     * - Plain objects are recursively flattened
     * - Empty objects are assigned directly
     */
    function flattenObjectInto(target, source, prefix) {
      if (Array.isArray(source) || typeof source !== 'object' || source === null || source instanceof Mongo.ObjectID || EJSON._isCustomType(source)) {
        target[prefix] = source;
        return;
      }
      const entries = Object.entries(source);
      if (entries.length) {
        entries.forEach(_ref => {
          let [key, value] = _ref;
          flattenObjectInto(target, value, join(prefix, key));
        });
      } else {
        target[prefix] = source;
      }
    }
    /**
     * Converts an oplog diff to a series of $set and $unset operations.
     * Handles several types of operations:
     * - Direct unsets via 'd' field
     * - Nested sets via 'i' field
     * - Top-level sets via 'u' field
     * - Array operations and nested objects via 's' prefixed fields
     *
     * Preserves the structure of EJSON custom types and ObjectIDs while
     * flattening paths into dot notation for MongoDB updates.
     */
    function convertOplogDiff(oplogEntry, diff) {
      let prefix = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
      Object.entries(diff).forEach(_ref2 => {
        let [diffKey, value] = _ref2;
        if (diffKey === 'd') {
          var _oplogEntry$$unset;
          // Handle `$unset`s
          (_oplogEntry$$unset = oplogEntry.$unset) !== null && _oplogEntry$$unset !== void 0 ? _oplogEntry$$unset : oplogEntry.$unset = {};
          Object.keys(value).forEach(key => {
            oplogEntry.$unset[join(prefix, key)] = true;
          });
        } else if (diffKey === 'i') {
          var _oplogEntry$$set;
          // Handle (potentially) nested `$set`s
          (_oplogEntry$$set = oplogEntry.$set) !== null && _oplogEntry$$set !== void 0 ? _oplogEntry$$set : oplogEntry.$set = {};
          flattenObjectInto(oplogEntry.$set, value, prefix);
        } else if (diffKey === 'u') {
          var _oplogEntry$$set2;
          // Handle flat `$set`s
          (_oplogEntry$$set2 = oplogEntry.$set) !== null && _oplogEntry$$set2 !== void 0 ? _oplogEntry$$set2 : oplogEntry.$set = {};
          Object.entries(value).forEach(_ref3 => {
            let [key, fieldValue] = _ref3;
            oplogEntry.$set[join(prefix, key)] = fieldValue;
          });
        } else if (diffKey.startsWith('s')) {
          // Handle s-fields (array operations and nested objects)
          const key = diffKey.slice(1);
          if (isArrayOperator(value)) {
            // Array operator
            Object.entries(value).forEach(_ref4 => {
              let [position, fieldValue] = _ref4;
              if (position === 'a') return;
              const positionKey = join(prefix, "".concat(key, ".").concat(position.slice(1)));
              if (position[0] === 's') {
                convertOplogDiff(oplogEntry, fieldValue, positionKey);
              } else if (fieldValue === null) {
                var _oplogEntry$$unset2;
                (_oplogEntry$$unset2 = oplogEntry.$unset) !== null && _oplogEntry$$unset2 !== void 0 ? _oplogEntry$$unset2 : oplogEntry.$unset = {};
                oplogEntry.$unset[positionKey] = true;
              } else {
                var _oplogEntry$$set3;
                (_oplogEntry$$set3 = oplogEntry.$set) !== null && _oplogEntry$$set3 !== void 0 ? _oplogEntry$$set3 : oplogEntry.$set = {};
                oplogEntry.$set[positionKey] = fieldValue;
              }
            });
          } else if (key) {
            // Nested object
            convertOplogDiff(oplogEntry, value, join(prefix, key));
          }
        }
      });
    }
    /**
     * Converts a MongoDB v2 oplog entry to v1 format.
     * Returns the original entry unchanged if it's not a v2 oplog entry
     * or doesn't contain a diff field.
     *
     * The converted entry will contain $set and $unset operations that are
     * equivalent to the v2 diff format, with paths flattened to dot notation
     * and special handling for EJSON custom types and ObjectIDs.
     */
    function oplogV2V1Converter(oplogEntry) {
      if (oplogEntry.$v !== 2 || !oplogEntry.diff) {
        return oplogEntry;
      }
      const convertedOplogEntry = {
        $v: 2
      };
      convertOplogDiff(convertedOplogEntry, oplogEntry.diff);
      return convertedOplogEntry;
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

},"cursor_description.ts":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/cursor_description.ts                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  CursorDescription: () => CursorDescription
});
class CursorDescription {
  constructor(collectionName, selector, options) {
    this.collectionName = void 0;
    this.selector = void 0;
    this.options = void 0;
    this.collectionName = collectionName;
    // @ts-ignore
    this.selector = Mongo.Collection._rewriteSelector(selector);
    this.options = options || {};
  }
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"mongo_connection.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/mongo_connection.js                                                                                  //
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
      MongoConnection: () => MongoConnection
    });
    let Meteor;
    module.link("meteor/meteor", {
      Meteor(v) {
        Meteor = v;
      }
    }, 0);
    let CLIENT_ONLY_METHODS, getAsyncMethodName;
    module.link("meteor/minimongo/constants", {
      CLIENT_ONLY_METHODS(v) {
        CLIENT_ONLY_METHODS = v;
      },
      getAsyncMethodName(v) {
        getAsyncMethodName = v;
      }
    }, 1);
    let MiniMongoQueryError;
    module.link("meteor/minimongo/common", {
      MiniMongoQueryError(v) {
        MiniMongoQueryError = v;
      }
    }, 2);
    let path;
    module.link("path", {
      default(v) {
        path = v;
      }
    }, 3);
    let AsynchronousCursor;
    module.link("./asynchronous_cursor", {
      AsynchronousCursor(v) {
        AsynchronousCursor = v;
      }
    }, 4);
    let Cursor;
    module.link("./cursor", {
      Cursor(v) {
        Cursor = v;
      }
    }, 5);
    let CursorDescription;
    module.link("./cursor_description", {
      CursorDescription(v) {
        CursorDescription = v;
      }
    }, 6);
    let DocFetcher;
    module.link("./doc_fetcher", {
      DocFetcher(v) {
        DocFetcher = v;
      }
    }, 7);
    let MongoDB, replaceMeteorAtomWithMongo, replaceTypes, transformResult;
    module.link("./mongo_common", {
      MongoDB(v) {
        MongoDB = v;
      },
      replaceMeteorAtomWithMongo(v) {
        replaceMeteorAtomWithMongo = v;
      },
      replaceTypes(v) {
        replaceTypes = v;
      },
      transformResult(v) {
        transformResult = v;
      }
    }, 8);
    let ObserveHandle;
    module.link("./observe_handle", {
      ObserveHandle(v) {
        ObserveHandle = v;
      }
    }, 9);
    let ObserveMultiplexer;
    module.link("./observe_multiplex", {
      ObserveMultiplexer(v) {
        ObserveMultiplexer = v;
      }
    }, 10);
    let OplogObserveDriver;
    module.link("./oplog_observe_driver", {
      OplogObserveDriver(v) {
        OplogObserveDriver = v;
      }
    }, 11);
    let OPLOG_COLLECTION, OplogHandle;
    module.link("./oplog_tailing", {
      OPLOG_COLLECTION(v) {
        OPLOG_COLLECTION = v;
      },
      OplogHandle(v) {
        OplogHandle = v;
      }
    }, 12);
    let PollingObserveDriver;
    module.link("./polling_observe_driver", {
      PollingObserveDriver(v) {
        PollingObserveDriver = v;
      }
    }, 13);
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    const FILE_ASSET_SUFFIX = 'Asset';
    const ASSETS_FOLDER = 'assets';
    const APP_FOLDER = 'app';
    const oplogCollectionWarnings = [];
    const MongoConnection = function (url, options) {
      var _Meteor$settings, _Meteor$settings$pack, _Meteor$settings$pack2;
      var self = this;
      options = options || {};
      self._observeMultiplexers = {};
      self._onFailoverHook = new Hook();
      const userOptions = _objectSpread(_objectSpread({}, Mongo._connectionOptions || {}), ((_Meteor$settings = Meteor.settings) === null || _Meteor$settings === void 0 ? void 0 : (_Meteor$settings$pack = _Meteor$settings.packages) === null || _Meteor$settings$pack === void 0 ? void 0 : (_Meteor$settings$pack2 = _Meteor$settings$pack.mongo) === null || _Meteor$settings$pack2 === void 0 ? void 0 : _Meteor$settings$pack2.options) || {});
      var mongoOptions = Object.assign({
        ignoreUndefined: true
      }, userOptions);

      // Internally the oplog connections specify their own maxPoolSize
      // which we don't want to overwrite with any user defined value
      if ('maxPoolSize' in options) {
        // If we just set this for "server", replSet will override it. If we just
        // set it for replSet, it will be ignored if we're not using a replSet.
        mongoOptions.maxPoolSize = options.maxPoolSize;
      }
      if ('minPoolSize' in options) {
        mongoOptions.minPoolSize = options.minPoolSize;
      }

      // Transform options like "tlsCAFileAsset": "filename.pem" into
      // "tlsCAFile": "/<fullpath>/filename.pem"
      Object.entries(mongoOptions || {}).filter(_ref => {
        let [key] = _ref;
        return key && key.endsWith(FILE_ASSET_SUFFIX);
      }).forEach(_ref2 => {
        let [key, value] = _ref2;
        const optionName = key.replace(FILE_ASSET_SUFFIX, '');
        mongoOptions[optionName] = path.join(Assets.getServerDir(), ASSETS_FOLDER, APP_FOLDER, value);
        delete mongoOptions[key];
      });
      self.db = null;
      self._oplogHandle = null;
      self._docFetcher = null;
      mongoOptions.driverInfo = {
        name: 'Meteor',
        version: Meteor.release
      };
      self.client = new MongoDB.MongoClient(url, mongoOptions);
      self.db = self.client.db();
      self.client.on('serverDescriptionChanged', Meteor.bindEnvironment(event => {
        // When the connection is no longer against the primary node, execute all
        // failover hooks. This is important for the driver as it has to re-pool the
        // query when it happens.
        if (event.previousDescription.type !== 'RSPrimary' && event.newDescription.type === 'RSPrimary') {
          self._onFailoverHook.each(callback => {
            callback();
            return true;
          });
        }
      }));
      if (options.oplogUrl && !Package['disable-oplog']) {
        self._oplogHandle = new OplogHandle(options.oplogUrl, self.db.databaseName);
        self._docFetcher = new DocFetcher(self);
      }
    };
    MongoConnection.prototype._close = async function () {
      var self = this;
      if (!self.db) throw Error("close called before Connection created?");

      // XXX probably untested
      var oplogHandle = self._oplogHandle;
      self._oplogHandle = null;
      if (oplogHandle) await oplogHandle.stop();

      // Use Future.wrap so that errors get thrown. This happens to
      // work even outside a fiber since the 'close' method is not
      // actually asynchronous.
      await self.client.close();
    };
    MongoConnection.prototype.close = function () {
      return this._close();
    };
    MongoConnection.prototype._setOplogHandle = function (oplogHandle) {
      this._oplogHandle = oplogHandle;
      return this;
    };

    // Returns the Mongo Collection object; may yield.
    MongoConnection.prototype.rawCollection = function (collectionName) {
      var self = this;
      if (!self.db) throw Error("rawCollection called before Connection created?");
      return self.db.collection(collectionName);
    };
    MongoConnection.prototype.createCappedCollectionAsync = async function (collectionName, byteSize, maxDocuments) {
      var self = this;
      if (!self.db) throw Error("createCappedCollectionAsync called before Connection created?");
      await self.db.createCollection(collectionName, {
        capped: true,
        size: byteSize,
        max: maxDocuments
      });
    };

    // This should be called synchronously with a write, to create a
    // transaction on the current write fence, if any. After we can read
    // the write, and after observers have been notified (or at least,
    // after the observer notifiers have added themselves to the write
    // fence), you should call 'committed()' on the object returned.
    MongoConnection.prototype._maybeBeginWrite = function () {
      const fence = DDPServer._getCurrentFence();
      if (fence) {
        return fence.beginWrite();
      } else {
        return {
          committed: function () {}
        };
      }
    };

    // Internal interface: adds a callback which is called when the Mongo primary
    // changes. Returns a stop handle.
    MongoConnection.prototype._onFailover = function (callback) {
      return this._onFailoverHook.register(callback);
    };
    MongoConnection.prototype.insertAsync = async function (collection_name, document) {
      const self = this;
      if (collection_name === "___meteor_failure_test_collection") {
        const e = new Error("Failure test");
        e._expectedByTest = true;
        throw e;
      }
      if (!(LocalCollection._isPlainObject(document) && !EJSON._isCustomType(document))) {
        throw new Error("Only plain objects may be inserted into MongoDB");
      }
      var write = self._maybeBeginWrite();
      var refresh = async function () {
        await Meteor.refresh({
          collection: collection_name,
          id: document._id
        });
      };
      return self.rawCollection(collection_name).insertOne(replaceTypes(document, replaceMeteorAtomWithMongo), {
        safe: true
      }).then(async _ref3 => {
        let {
          insertedId
        } = _ref3;
        await refresh();
        await write.committed();
        return insertedId;
      }).catch(async e => {
        await write.committed();
        throw e;
      });
    };

    // Cause queries that may be affected by the selector to poll in this write
    // fence.
    MongoConnection.prototype._refresh = async function (collectionName, selector) {
      var refreshKey = {
        collection: collectionName
      };
      // If we know which documents we're removing, don't poll queries that are
      // specific to other documents. (Note that multiple notifications here should
      // not cause multiple polls, since all our listener is doing is enqueueing a
      // poll.)
      var specificIds = LocalCollection._idsMatchedBySelector(selector);
      if (specificIds) {
        for (const id of specificIds) {
          await Meteor.refresh(Object.assign({
            id: id
          }, refreshKey));
        }
        ;
      } else {
        await Meteor.refresh(refreshKey);
      }
    };
    MongoConnection.prototype.removeAsync = async function (collection_name, selector) {
      var self = this;
      if (collection_name === "___meteor_failure_test_collection") {
        var e = new Error("Failure test");
        e._expectedByTest = true;
        throw e;
      }
      var write = self._maybeBeginWrite();
      var refresh = async function () {
        await self._refresh(collection_name, selector);
      };
      return self.rawCollection(collection_name).deleteMany(replaceTypes(selector, replaceMeteorAtomWithMongo), {
        safe: true
      }).then(async _ref4 => {
        let {
          deletedCount
        } = _ref4;
        await refresh();
        await write.committed();
        return transformResult({
          result: {
            modifiedCount: deletedCount
          }
        }).numberAffected;
      }).catch(async err => {
        await write.committed();
        throw err;
      });
    };
    MongoConnection.prototype.dropCollectionAsync = async function (collectionName) {
      var self = this;
      var write = self._maybeBeginWrite();
      var refresh = function () {
        return Meteor.refresh({
          collection: collectionName,
          id: null,
          dropCollection: true
        });
      };
      return self.rawCollection(collectionName).drop().then(async result => {
        await refresh();
        await write.committed();
        return result;
      }).catch(async e => {
        await write.committed();
        throw e;
      });
    };

    // For testing only.  Slightly better than `c.rawDatabase().dropDatabase()`
    // because it lets the test's fence wait for it to be complete.
    MongoConnection.prototype.dropDatabaseAsync = async function () {
      var self = this;
      var write = self._maybeBeginWrite();
      var refresh = async function () {
        await Meteor.refresh({
          dropDatabase: true
        });
      };
      try {
        await self.db._dropDatabase();
        await refresh();
        await write.committed();
      } catch (e) {
        await write.committed();
        throw e;
      }
    };
    MongoConnection.prototype.updateAsync = async function (collection_name, selector, mod, options) {
      var self = this;
      if (collection_name === "___meteor_failure_test_collection") {
        var e = new Error("Failure test");
        e._expectedByTest = true;
        throw e;
      }

      // explicit safety check. null and undefined can crash the mongo
      // driver. Although the node driver and minimongo do 'support'
      // non-object modifier in that they don't crash, they are not
      // meaningful operations and do not do anything. Defensively throw an
      // error here.
      if (!mod || typeof mod !== 'object') {
        const error = new Error("Invalid modifier. Modifier must be an object.");
        throw error;
      }
      if (!(LocalCollection._isPlainObject(mod) && !EJSON._isCustomType(mod))) {
        const error = new Error("Only plain objects may be used as replacement" + " documents in MongoDB");
        throw error;
      }
      if (!options) options = {};
      var write = self._maybeBeginWrite();
      var refresh = async function () {
        await self._refresh(collection_name, selector);
      };
      var collection = self.rawCollection(collection_name);
      var mongoOpts = {
        safe: true
      };
      // Add support for filtered positional operator
      if (options.arrayFilters !== undefined) mongoOpts.arrayFilters = options.arrayFilters;
      // explictly enumerate options that minimongo supports
      if (options.upsert) mongoOpts.upsert = true;
      if (options.multi) mongoOpts.multi = true;
      // Lets you get a more more full result from MongoDB. Use with caution:
      // might not work with C.upsert (as opposed to C.update({upsert:true}) or
      // with simulated upsert.
      if (options.fullResult) mongoOpts.fullResult = true;
      var mongoSelector = replaceTypes(selector, replaceMeteorAtomWithMongo);
      var mongoMod = replaceTypes(mod, replaceMeteorAtomWithMongo);
      var isModify = LocalCollection._isModificationMod(mongoMod);
      if (options._forbidReplace && !isModify) {
        var err = new Error("Invalid modifier. Replacements are forbidden.");
        throw err;
      }

      // We've already run replaceTypes/replaceMeteorAtomWithMongo on
      // selector and mod.  We assume it doesn't matter, as far as
      // the behavior of modifiers is concerned, whether `_modify`
      // is run on EJSON or on mongo-converted EJSON.

      // Run this code up front so that it fails fast if someone uses
      // a Mongo update operator we don't support.
      let knownId;
      if (options.upsert) {
        try {
          let newDoc = LocalCollection._createUpsertDocument(selector, mod);
          knownId = newDoc._id;
        } catch (err) {
          throw err;
        }
      }
      if (options.upsert && !isModify && !knownId && options.insertedId && !(options.insertedId instanceof Mongo.ObjectID && options.generatedId)) {
        // In case of an upsert with a replacement, where there is no _id defined
        // in either the query or the replacement doc, mongo will generate an id itself.
        // Therefore we need this special strategy if we want to control the id ourselves.

        // We don't need to do this when:
        // - This is not a replacement, so we can add an _id to $setOnInsert
        // - The id is defined by query or mod we can just add it to the replacement doc
        // - The user did not specify any id preference and the id is a Mongo ObjectId,
        //     then we can just let Mongo generate the id
        return await simulateUpsertWithInsertedId(collection, mongoSelector, mongoMod, options).then(async result => {
          await refresh();
          await write.committed();
          if (result && !options._returnObject) {
            return result.numberAffected;
          } else {
            return result;
          }
        });
      } else {
        if (options.upsert && !knownId && options.insertedId && isModify) {
          if (!mongoMod.hasOwnProperty('$setOnInsert')) {
            mongoMod.$setOnInsert = {};
          }
          knownId = options.insertedId;
          Object.assign(mongoMod.$setOnInsert, replaceTypes({
            _id: options.insertedId
          }, replaceMeteorAtomWithMongo));
        }
        const strings = Object.keys(mongoMod).filter(key => !key.startsWith("$"));
        let updateMethod = strings.length > 0 ? 'replaceOne' : 'updateMany';
        updateMethod = updateMethod === 'updateMany' && !mongoOpts.multi ? 'updateOne' : updateMethod;
        return collection[updateMethod].bind(collection)(mongoSelector, mongoMod, mongoOpts).then(async result => {
          var meteorResult = transformResult({
            result
          });
          if (meteorResult && options._returnObject) {
            // If this was an upsertAsync() call, and we ended up
            // inserting a new doc and we know its id, then
            // return that id as well.
            if (options.upsert && meteorResult.insertedId) {
              if (knownId) {
                meteorResult.insertedId = knownId;
              } else if (meteorResult.insertedId instanceof MongoDB.ObjectId) {
                meteorResult.insertedId = new Mongo.ObjectID(meteorResult.insertedId.toHexString());
              }
            }
            await refresh();
            await write.committed();
            return meteorResult;
          } else {
            await refresh();
            await write.committed();
            return meteorResult.numberAffected;
          }
        }).catch(async err => {
          await write.committed();
          throw err;
        });
      }
    };

    // exposed for testing
    MongoConnection._isCannotChangeIdError = function (err) {
      // Mongo 3.2.* returns error as next Object:
      // {name: String, code: Number, errmsg: String}
      // Older Mongo returns:
      // {name: String, code: Number, err: String}
      var error = err.errmsg || err.err;

      // We don't use the error code here
      // because the error code we observed it producing (16837) appears to be
      // a far more generic error code based on examining the source.
      if (error.indexOf('The _id field cannot be changed') === 0 || error.indexOf("the (immutable) field '_id' was found to have been altered to _id") !== -1) {
        return true;
      }
      return false;
    };

    // XXX MongoConnection.upsertAsync() does not return the id of the inserted document
    // unless you set it explicitly in the selector or modifier (as a replacement
    // doc).
    MongoConnection.prototype.upsertAsync = async function (collectionName, selector, mod, options) {
      var self = this;
      if (typeof options === "function" && !callback) {
        callback = options;
        options = {};
      }
      return self.updateAsync(collectionName, selector, mod, Object.assign({}, options, {
        upsert: true,
        _returnObject: true
      }));
    };
    MongoConnection.prototype.find = function (collectionName, selector, options) {
      var self = this;
      if (arguments.length === 1) selector = {};
      return new Cursor(self, new CursorDescription(collectionName, selector, options));
    };
    MongoConnection.prototype.findOneAsync = async function (collection_name, selector, options) {
      var self = this;
      if (arguments.length === 1) {
        selector = {};
      }
      options = options || {};
      options.limit = 1;
      const results = await self.find(collection_name, selector, options).fetch();
      return results[0];
    };

    // We'll actually design an index API later. For now, we just pass through to
    // Mongo's, but make it synchronous.
    MongoConnection.prototype.createIndexAsync = async function (collectionName, index, options) {
      var self = this;

      // We expect this function to be called at startup, not from within a method,
      // so we don't interact with the write fence.
      var collection = self.rawCollection(collectionName);
      await collection.createIndex(index, options);
    };

    // just to be consistent with the other methods
    MongoConnection.prototype.createIndex = MongoConnection.prototype.createIndexAsync;
    MongoConnection.prototype.countDocuments = function (collectionName) {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }
      args = args.map(arg => replaceTypes(arg, replaceMeteorAtomWithMongo));
      const collection = this.rawCollection(collectionName);
      return collection.countDocuments(...args);
    };
    MongoConnection.prototype.estimatedDocumentCount = function (collectionName) {
      for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }
      args = args.map(arg => replaceTypes(arg, replaceMeteorAtomWithMongo));
      const collection = this.rawCollection(collectionName);
      return collection.estimatedDocumentCount(...args);
    };
    MongoConnection.prototype.ensureIndexAsync = MongoConnection.prototype.createIndexAsync;
    MongoConnection.prototype.dropIndexAsync = async function (collectionName, index) {
      var self = this;

      // This function is only used by test code, not within a method, so we don't
      // interact with the write fence.
      var collection = self.rawCollection(collectionName);
      var indexName = await collection.dropIndex(index);
    };
    CLIENT_ONLY_METHODS.forEach(function (m) {
      MongoConnection.prototype[m] = function () {
        throw new Error("".concat(m, " +  is not available on the server. Please use ").concat(getAsyncMethodName(m), "() instead."));
      };
    });
    var NUM_OPTIMISTIC_TRIES = 3;
    var simulateUpsertWithInsertedId = async function (collection, selector, mod, options) {
      // STRATEGY: First try doing an upsert with a generated ID.
      // If this throws an error about changing the ID on an existing document
      // then without affecting the database, we know we should probably try
      // an update without the generated ID. If it affected 0 documents,
      // then without affecting the database, we the document that first
      // gave the error is probably removed and we need to try an insert again
      // We go back to step one and repeat.
      // Like all "optimistic write" schemes, we rely on the fact that it's
      // unlikely our writes will continue to be interfered with under normal
      // circumstances (though sufficiently heavy contention with writers
      // disagreeing on the existence of an object will cause writes to fail
      // in theory).

      var insertedId = options.insertedId; // must exist
      var mongoOptsForUpdate = {
        safe: true,
        multi: options.multi
      };
      var mongoOptsForInsert = {
        safe: true,
        upsert: true
      };
      var replacementWithId = Object.assign(replaceTypes({
        _id: insertedId
      }, replaceMeteorAtomWithMongo), mod);
      var tries = NUM_OPTIMISTIC_TRIES;
      var doUpdate = async function () {
        tries--;
        if (!tries) {
          throw new Error("Upsert failed after " + NUM_OPTIMISTIC_TRIES + " tries.");
        } else {
          let method = collection.updateMany;
          if (!Object.keys(mod).some(key => key.startsWith("$"))) {
            method = collection.replaceOne.bind(collection);
          }
          return method(selector, mod, mongoOptsForUpdate).then(result => {
            if (result && (result.modifiedCount || result.upsertedCount)) {
              return {
                numberAffected: result.modifiedCount || result.upsertedCount,
                insertedId: result.upsertedId || undefined
              };
            } else {
              return doConditionalInsert();
            }
          });
        }
      };
      var doConditionalInsert = function () {
        return collection.replaceOne(selector, replacementWithId, mongoOptsForInsert).then(result => ({
          numberAffected: result.upsertedCount,
          insertedId: result.upsertedId
        })).catch(err => {
          if (MongoConnection._isCannotChangeIdError(err)) {
            return doUpdate();
          } else {
            throw err;
          }
        });
      };
      return doUpdate();
    };

    // observeChanges for tailable cursors on capped collections.
    //
    // Some differences from normal cursors:
    //   - Will never produce anything other than 'added' or 'addedBefore'. If you
    //     do update a document that has already been produced, this will not notice
    //     it.
    //   - If you disconnect and reconnect from Mongo, it will essentially restart
    //     the query, which will lead to duplicate results. This is pretty bad,
    //     but if you include a field called 'ts' which is inserted as
    //     new MongoInternals.MongoTimestamp(0, 0) (which is initialized to the
    //     current Mongo-style timestamp), we'll be able to find the place to
    //     restart properly. (This field is specifically understood by Mongo with an
    //     optimization which allows it to find the right place to start without
    //     an index on ts. It's how the oplog works.)
    //   - No callbacks are triggered synchronously with the call (there's no
    //     differentiation between "initial data" and "later changes"; everything
    //     that matches the query gets sent asynchronously).
    //   - De-duplication is not implemented.
    //   - Does not yet interact with the write fence. Probably, this should work by
    //     ignoring removes (which don't work on capped collections) and updates
    //     (which don't affect tailable cursors), and just keeping track of the ID
    //     of the inserted object, and closing the write fence once you get to that
    //     ID (or timestamp?).  This doesn't work well if the document doesn't match
    //     the query, though.  On the other hand, the write fence can close
    //     immediately if it does not match the query. So if we trust minimongo
    //     enough to accurately evaluate the query against the write fence, we
    //     should be able to do this...  Of course, minimongo doesn't even support
    //     Mongo Timestamps yet.
    MongoConnection.prototype._observeChangesTailable = function (cursorDescription, ordered, callbacks) {
      var self = this;

      // Tailable cursors only ever call added/addedBefore callbacks, so it's an
      // error if you didn't provide them.
      if (ordered && !callbacks.addedBefore || !ordered && !callbacks.added) {
        throw new Error("Can't observe an " + (ordered ? "ordered" : "unordered") + " tailable cursor without a " + (ordered ? "addedBefore" : "added") + " callback");
      }
      return self.tail(cursorDescription, function (doc) {
        var id = doc._id;
        delete doc._id;
        // The ts is an implementation detail. Hide it.
        delete doc.ts;
        if (ordered) {
          callbacks.addedBefore(id, doc, null);
        } else {
          callbacks.added(id, doc);
        }
      });
    };
    MongoConnection.prototype._createAsynchronousCursor = function (cursorDescription) {
      let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var self = this;
      const {
        selfForIteration,
        useTransform
      } = options;
      options = {
        selfForIteration,
        useTransform
      };
      var collection = self.rawCollection(cursorDescription.collectionName);
      var cursorOptions = cursorDescription.options;
      var mongoOptions = {
        sort: cursorOptions.sort,
        limit: cursorOptions.limit,
        skip: cursorOptions.skip,
        projection: cursorOptions.fields || cursorOptions.projection,
        readPreference: cursorOptions.readPreference
      };

      // Do we want a tailable cursor (which only works on capped collections)?
      if (cursorOptions.tailable) {
        mongoOptions.numberOfRetries = -1;
      }
      var dbCursor = collection.find(replaceTypes(cursorDescription.selector, replaceMeteorAtomWithMongo), mongoOptions);

      // Do we want a tailable cursor (which only works on capped collections)?
      if (cursorOptions.tailable) {
        // We want a tailable cursor...
        dbCursor.addCursorFlag("tailable", true);
        // ... and for the server to wait a bit if any getMore has no data (rather
        // than making us put the relevant sleeps in the client)...
        dbCursor.addCursorFlag("awaitData", true);

        // And if this is on the oplog collection and the cursor specifies a 'ts',
        // then set the undocumented oplog replay flag, which does a special scan to
        // find the first document (instead of creating an index on ts). This is a
        // very hard-coded Mongo flag which only works on the oplog collection and
        // only works with the ts field.
        if (cursorDescription.collectionName === OPLOG_COLLECTION && cursorDescription.selector.ts) {
          dbCursor.addCursorFlag("oplogReplay", true);
        }
      }
      if (typeof cursorOptions.maxTimeMs !== 'undefined') {
        dbCursor = dbCursor.maxTimeMS(cursorOptions.maxTimeMs);
      }
      if (typeof cursorOptions.hint !== 'undefined') {
        dbCursor = dbCursor.hint(cursorOptions.hint);
      }
      return new AsynchronousCursor(dbCursor, cursorDescription, options, collection);
    };

    // Tails the cursor described by cursorDescription, most likely on the
    // oplog. Calls docCallback with each document found. Ignores errors and just
    // restarts the tail on error.
    //
    // If timeoutMS is set, then if we don't get a new document every timeoutMS,
    // kill and restart the cursor. This is primarily a workaround for #8598.
    MongoConnection.prototype.tail = function (cursorDescription, docCallback, timeoutMS) {
      var self = this;
      if (!cursorDescription.options.tailable) throw new Error("Can only tail a tailable cursor");
      var cursor = self._createAsynchronousCursor(cursorDescription);
      var stopped = false;
      var lastTS;
      Meteor.defer(async function loop() {
        var doc = null;
        while (true) {
          if (stopped) return;
          try {
            doc = await cursor._nextObjectPromiseWithTimeout(timeoutMS);
          } catch (err) {
            // We should not ignore errors here unless we want to spend a lot of time debugging
            console.error(err);
            // There's no good way to figure out if this was actually an error from
            // Mongo, or just client-side (including our own timeout error). Ah
            // well. But either way, we need to retry the cursor (unless the failure
            // was because the observe got stopped).
            doc = null;
          }
          // Since we awaited a promise above, we need to check again to see if
          // we've been stopped before calling the callback.
          if (stopped) return;
          if (doc) {
            // If a tailable cursor contains a "ts" field, use it to recreate the
            // cursor on error. ("ts" is a standard that Mongo uses internally for
            // the oplog, and there's a special flag that lets you do binary search
            // on it instead of needing to use an index.)
            lastTS = doc.ts;
            docCallback(doc);
          } else {
            var newSelector = Object.assign({}, cursorDescription.selector);
            if (lastTS) {
              newSelector.ts = {
                $gt: lastTS
              };
            }
            cursor = self._createAsynchronousCursor(new CursorDescription(cursorDescription.collectionName, newSelector, cursorDescription.options));
            // Mongo failover takes many seconds.  Retry in a bit.  (Without this
            // setTimeout, we peg the CPU at 100% and never notice the actual
            // failover.
            setTimeout(loop, 100);
            break;
          }
        }
      });
      return {
        stop: function () {
          stopped = true;
          cursor.close();
        }
      };
    };
    Object.assign(MongoConnection.prototype, {
      _observeChanges: async function (cursorDescription, ordered, callbacks, nonMutatingCallbacks) {
        var _self$_oplogHandle;
        var self = this;
        const collectionName = cursorDescription.collectionName;
        if (cursorDescription.options.tailable) {
          return self._observeChangesTailable(cursorDescription, ordered, callbacks);
        }

        // You may not filter out _id when observing changes, because the id is a core
        // part of the observeChanges API.
        const fieldsOptions = cursorDescription.options.projection || cursorDescription.options.fields;
        if (fieldsOptions && (fieldsOptions._id === 0 || fieldsOptions._id === false)) {
          throw Error("You may not observe a cursor with {fields: {_id: 0}}");
        }
        var observeKey = EJSON.stringify(Object.assign({
          ordered: ordered
        }, cursorDescription));
        var multiplexer, observeDriver;
        var firstHandle = false;

        // Find a matching ObserveMultiplexer, or create a new one. This next block is
        // guaranteed to not yield (and it doesn't call anything that can observe a
        // new query), so no other calls to this function can interleave with it.
        if (observeKey in self._observeMultiplexers) {
          multiplexer = self._observeMultiplexers[observeKey];
        } else {
          firstHandle = true;
          // Create a new ObserveMultiplexer.
          multiplexer = new ObserveMultiplexer({
            ordered: ordered,
            onStop: function () {
              delete self._observeMultiplexers[observeKey];
              return observeDriver.stop();
            }
          });
        }
        var observeHandle = new ObserveHandle(multiplexer, callbacks, nonMutatingCallbacks);
        const oplogOptions = (self === null || self === void 0 ? void 0 : (_self$_oplogHandle = self._oplogHandle) === null || _self$_oplogHandle === void 0 ? void 0 : _self$_oplogHandle._oplogOptions) || {};
        const {
          includeCollections,
          excludeCollections
        } = oplogOptions;
        if (firstHandle) {
          var matcher, sorter;
          var canUseOplog = [function () {
            // At a bare minimum, using the oplog requires us to have an oplog, to
            // want unordered callbacks, and to not want a callback on the polls
            // that won't happen.
            return self._oplogHandle && !ordered && !callbacks._testOnlyPollCallback;
          }, function () {
            // We also need to check, if the collection of this Cursor is actually being "watched" by the Oplog handle
            // if not, we have to fallback to long polling
            if (excludeCollections !== null && excludeCollections !== void 0 && excludeCollections.length && excludeCollections.includes(collectionName)) {
              if (!oplogCollectionWarnings.includes(collectionName)) {
                console.warn("Meteor.settings.packages.mongo.oplogExcludeCollections includes the collection ".concat(collectionName, " - your subscriptions will only use long polling!"));
                oplogCollectionWarnings.push(collectionName); // we only want to show the warnings once per collection!
              }
              return false;
            }
            if (includeCollections !== null && includeCollections !== void 0 && includeCollections.length && !includeCollections.includes(collectionName)) {
              if (!oplogCollectionWarnings.includes(collectionName)) {
                console.warn("Meteor.settings.packages.mongo.oplogIncludeCollections does not include the collection ".concat(collectionName, " - your subscriptions will only use long polling!"));
                oplogCollectionWarnings.push(collectionName); // we only want to show the warnings once per collection!
              }
              return false;
            }
            return true;
          }, function () {
            // We need to be able to compile the selector. Fall back to polling for
            // some newfangled $selector that minimongo doesn't support yet.
            try {
              matcher = new Minimongo.Matcher(cursorDescription.selector);
              return true;
            } catch (e) {
              // XXX make all compilation errors MinimongoError or something
              //     so that this doesn't ignore unrelated exceptions
              if (Meteor.isClient && e instanceof MiniMongoQueryError) {
                throw e;
              }
              return false;
            }
          }, function () {
            // ... and the selector itself needs to support oplog.
            return OplogObserveDriver.cursorSupported(cursorDescription, matcher);
          }, function () {
            // And we need to be able to compile the sort, if any.  eg, can't be
            // {$natural: 1}.
            if (!cursorDescription.options.sort) return true;
            try {
              sorter = new Minimongo.Sorter(cursorDescription.options.sort);
              return true;
            } catch (e) {
              // XXX make all compilation errors MinimongoError or something
              //     so that this doesn't ignore unrelated exceptions
              return false;
            }
          }].every(f => f()); // invoke each function and check if all return true

          var driverClass = canUseOplog ? OplogObserveDriver : PollingObserveDriver;
          observeDriver = new driverClass({
            cursorDescription: cursorDescription,
            mongoHandle: self,
            multiplexer: multiplexer,
            ordered: ordered,
            matcher: matcher,
            // ignored by polling
            sorter: sorter,
            // ignored by polling
            _testOnlyPollCallback: callbacks._testOnlyPollCallback
          });
          if (observeDriver._init) {
            await observeDriver._init();
          }

          // This field is only set for use in tests.
          multiplexer._observeDriver = observeDriver;
        }
        self._observeMultiplexers[observeKey] = multiplexer;
        // Blocks until the initial adds have been sent.
        await multiplexer.addHandleAndSendInitialAdds(observeHandle);
        return observeHandle;
      }
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

},"mongo_common.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/mongo_common.js                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reify_async_result__) {
  "use strict";
  try {
    module.export({
      MongoDB: () => MongoDB,
      writeCallback: () => writeCallback,
      transformResult: () => transformResult,
      replaceMeteorAtomWithMongo: () => replaceMeteorAtomWithMongo,
      replaceTypes: () => replaceTypes,
      replaceMongoAtomWithMeteor: () => replaceMongoAtomWithMeteor,
      replaceNames: () => replaceNames
    });
    let clone;
    module.link("lodash.clone", {
      default(v) {
        clone = v;
      }
    }, 0);
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    const MongoDB = Object.assign(NpmModuleMongodb, {
      ObjectID: NpmModuleMongodb.ObjectId
    });
    const writeCallback = function (write, refresh, callback) {
      return function (err, result) {
        if (!err) {
          // XXX We don't have to run this on error, right?
          try {
            refresh();
          } catch (refreshErr) {
            if (callback) {
              callback(refreshErr);
              return;
            } else {
              throw refreshErr;
            }
          }
        }
        write.committed();
        if (callback) {
          callback(err, result);
        } else if (err) {
          throw err;
        }
      };
    };
    const transformResult = function (driverResult) {
      var meteorResult = {
        numberAffected: 0
      };
      if (driverResult) {
        var mongoResult = driverResult.result;
        // On updates with upsert:true, the inserted values come as a list of
        // upserted values -- even with options.multi, when the upsert does insert,
        // it only inserts one element.
        if (mongoResult.upsertedCount) {
          meteorResult.numberAffected = mongoResult.upsertedCount;
          if (mongoResult.upsertedId) {
            meteorResult.insertedId = mongoResult.upsertedId;
          }
        } else {
          // n was used before Mongo 5.0, in Mongo 5.0 we are not receiving this n
          // field and so we are using modifiedCount instead
          meteorResult.numberAffected = mongoResult.n || mongoResult.matchedCount || mongoResult.modifiedCount;
        }
      }
      return meteorResult;
    };
    const replaceMeteorAtomWithMongo = function (document) {
      if (EJSON.isBinary(document)) {
        // This does more copies than we'd like, but is necessary because
        // MongoDB.BSON only looks like it takes a Uint8Array (and doesn't actually
        // serialize it correctly).
        return new MongoDB.Binary(Buffer.from(document));
      }
      if (document instanceof MongoDB.Binary) {
        return document;
      }
      if (document instanceof Mongo.ObjectID) {
        return new MongoDB.ObjectId(document.toHexString());
      }
      if (document instanceof MongoDB.ObjectId) {
        return new MongoDB.ObjectId(document.toHexString());
      }
      if (document instanceof MongoDB.Timestamp) {
        // For now, the Meteor representation of a Mongo timestamp type (not a date!
        // this is a weird internal thing used in the oplog!) is the same as the
        // Mongo representation. We need to do this explicitly or else we would do a
        // structural clone and lose the prototype.
        return document;
      }
      if (document instanceof Decimal) {
        return MongoDB.Decimal128.fromString(document.toString());
      }
      if (EJSON._isCustomType(document)) {
        return replaceNames(makeMongoLegal, EJSON.toJSONValue(document));
      }
      // It is not ordinarily possible to stick dollar-sign keys into mongo
      // so we don't bother checking for things that need escaping at this time.
      return undefined;
    };
    const replaceTypes = function (document, atomTransformer) {
      if (typeof document !== 'object' || document === null) return document;
      var replacedTopLevelAtom = atomTransformer(document);
      if (replacedTopLevelAtom !== undefined) return replacedTopLevelAtom;
      var ret = document;
      Object.entries(document).forEach(function (_ref) {
        let [key, val] = _ref;
        var valReplaced = replaceTypes(val, atomTransformer);
        if (val !== valReplaced) {
          // Lazy clone. Shallow copy.
          if (ret === document) ret = clone(document);
          ret[key] = valReplaced;
        }
      });
      return ret;
    };
    const replaceMongoAtomWithMeteor = function (document) {
      if (document instanceof MongoDB.Binary) {
        // for backwards compatibility
        if (document.sub_type !== 0) {
          return document;
        }
        var buffer = document.value(true);
        return new Uint8Array(buffer);
      }
      if (document instanceof MongoDB.ObjectId) {
        return new Mongo.ObjectID(document.toHexString());
      }
      if (document instanceof MongoDB.Decimal128) {
        return Decimal(document.toString());
      }
      if (document["EJSON$type"] && document["EJSON$value"] && Object.keys(document).length === 2) {
        return EJSON.fromJSONValue(replaceNames(unmakeMongoLegal, document));
      }
      if (document instanceof MongoDB.Timestamp) {
        // For now, the Meteor representation of a Mongo timestamp type (not a date!
        // this is a weird internal thing used in the oplog!) is the same as the
        // Mongo representation. We need to do this explicitly or else we would do a
        // structural clone and lose the prototype.
        return document;
      }
      return undefined;
    };
    const makeMongoLegal = name => "EJSON" + name;
    const unmakeMongoLegal = name => name.substr(5);
    function replaceNames(filter, thing) {
      if (typeof thing === "object" && thing !== null) {
        if (Array.isArray(thing)) {
          return thing.map(replaceNames.bind(null, filter));
        }
        var ret = {};
        Object.entries(thing).forEach(function (_ref2) {
          let [key, value] = _ref2;
          ret[filter(key)] = replaceNames(filter, value);
        });
        return ret;
      }
      return thing;
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

},"asynchronous_cursor.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/asynchronous_cursor.js                                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reify_async_result__) {
  "use strict";
  try {
    module.export({
      AsynchronousCursor: () => AsynchronousCursor
    });
    let LocalCollection;
    module.link("meteor/minimongo/local_collection", {
      default(v) {
        LocalCollection = v;
      }
    }, 0);
    let replaceMongoAtomWithMeteor, replaceTypes;
    module.link("./mongo_common", {
      replaceMongoAtomWithMeteor(v) {
        replaceMongoAtomWithMeteor = v;
      },
      replaceTypes(v) {
        replaceTypes = v;
      }
    }, 1);
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    class AsynchronousCursor {
      constructor(dbCursor, cursorDescription, options) {
        this._closing = false;
        this._pendingNext = null;
        this._dbCursor = dbCursor;
        this._cursorDescription = cursorDescription;
        this._selfForIteration = options.selfForIteration || this;
        if (options.useTransform && cursorDescription.options.transform) {
          this._transform = LocalCollection.wrapTransform(cursorDescription.options.transform);
        } else {
          this._transform = null;
        }
        this._visitedIds = new LocalCollection._IdMap();
      }
      [Symbol.asyncIterator]() {
        var cursor = this;
        return {
          async next() {
            const value = await cursor._nextObjectPromise();
            return {
              done: !value,
              value
            };
          }
        };
      }

      // Returns a Promise for the next object from the underlying cursor (before
      // the Mongo->Meteor type replacement).
      async _rawNextObjectPromise() {
        if (this._closing) {
          // Prevent next() after close is called
          return null;
        }
        try {
          this._pendingNext = this._dbCursor.next();
          const result = await this._pendingNext;
          this._pendingNext = null;
          return result;
        } catch (e) {
          console.error(e);
        } finally {
          this._pendingNext = null;
        }
      }

      // Returns a Promise for the next object from the cursor, skipping those whose
      // IDs we've already seen and replacing Mongo atoms with Meteor atoms.
      async _nextObjectPromise() {
        while (true) {
          var doc = await this._rawNextObjectPromise();
          if (!doc) return null;
          doc = replaceTypes(doc, replaceMongoAtomWithMeteor);
          if (!this._cursorDescription.options.tailable && '_id' in doc) {
            // Did Mongo give us duplicate documents in the same cursor? If so,
            // ignore this one. (Do this before the transform, since transform might
            // return some unrelated value.) We don't do this for tailable cursors,
            // because we want to maintain O(1) memory usage. And if there isn't _id
            // for some reason (maybe it's the oplog), then we don't do this either.
            // (Be careful to do this for falsey but existing _id, though.)
            if (this._visitedIds.has(doc._id)) continue;
            this._visitedIds.set(doc._id, true);
          }
          if (this._transform) doc = this._transform(doc);
          return doc;
        }
      }

      // Returns a promise which is resolved with the next object (like with
      // _nextObjectPromise) or rejected if the cursor doesn't return within
      // timeoutMS ms.
      _nextObjectPromiseWithTimeout(timeoutMS) {
        const nextObjectPromise = this._nextObjectPromise();
        if (!timeoutMS) {
          return nextObjectPromise;
        }
        const timeoutPromise = new Promise(resolve => {
          // On timeout, close the cursor.
          const timeoutId = setTimeout(() => {
            resolve(this.close());
          }, timeoutMS);

          // If the `_nextObjectPromise` returned first, cancel the timeout.
          nextObjectPromise.finally(() => {
            clearTimeout(timeoutId);
          });
        });
        return Promise.race([nextObjectPromise, timeoutPromise]);
      }
      async forEach(callback, thisArg) {
        // Get back to the beginning.
        this._rewind();
        let idx = 0;
        while (true) {
          const doc = await this._nextObjectPromise();
          if (!doc) return;
          await callback.call(thisArg, doc, idx++, this._selfForIteration);
        }
      }
      async map(callback, thisArg) {
        const results = [];
        await this.forEach(async (doc, index) => {
          results.push(await callback.call(thisArg, doc, index, this._selfForIteration));
        });
        return results;
      }
      _rewind() {
        // known to be synchronous
        this._dbCursor.rewind();
        this._visitedIds = new LocalCollection._IdMap();
      }

      // Mostly usable for tailable cursors.
      async close() {
        this._closing = true;
        // If there's a pending next(), wait for it to finish or abort
        if (this._pendingNext) {
          try {
            await this._pendingNext;
          } catch (e) {
            // ignore
          }
        }
        this._dbCursor.close();
      }
      fetch() {
        return this.map(doc => doc);
      }

      /**
       * FIXME: (node:34680) [MONGODB DRIVER] Warning: cursor.count is deprecated and will be
       *  removed in the next major version, please use `collection.estimatedDocumentCount` or
       *  `collection.countDocuments` instead.
       */
      count() {
        return this._dbCursor.count();
      }

      // This method is NOT wrapped in Cursor.
      async getRawObjects(ordered) {
        var self = this;
        if (ordered) {
          return self.fetch();
        } else {
          var results = new LocalCollection._IdMap();
          await self.forEach(function (doc) {
            results.set(doc._id, doc);
          });
          return results;
        }
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

},"cursor.ts":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/cursor.ts                                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reify_async_result__) {
  "use strict";
  try {
    module.export({
      Cursor: () => Cursor
    });
    let ASYNC_CURSOR_METHODS, getAsyncMethodName;
    module.link("meteor/minimongo/constants", {
      ASYNC_CURSOR_METHODS(v) {
        ASYNC_CURSOR_METHODS = v;
      },
      getAsyncMethodName(v) {
        getAsyncMethodName = v;
      }
    }, 0);
    let replaceMeteorAtomWithMongo, replaceTypes;
    module.link("./mongo_common", {
      replaceMeteorAtomWithMongo(v) {
        replaceMeteorAtomWithMongo = v;
      },
      replaceTypes(v) {
        replaceTypes = v;
      }
    }, 1);
    let LocalCollection;
    module.link("meteor/minimongo/local_collection", {
      default(v) {
        LocalCollection = v;
      }
    }, 2);
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    class Cursor {
      constructor(mongo, cursorDescription) {
        this._mongo = void 0;
        this._cursorDescription = void 0;
        this._synchronousCursor = void 0;
        this._mongo = mongo;
        this._cursorDescription = cursorDescription;
        this._synchronousCursor = null;
      }
      async countAsync() {
        const collection = this._mongo.rawCollection(this._cursorDescription.collectionName);
        return await collection.countDocuments(replaceTypes(this._cursorDescription.selector, replaceMeteorAtomWithMongo), replaceTypes(this._cursorDescription.options, replaceMeteorAtomWithMongo));
      }
      count() {
        throw new Error("count() is not available on the server. Please use countAsync() instead.");
      }
      getTransform() {
        return this._cursorDescription.options.transform;
      }
      _publishCursor(sub) {
        const collection = this._cursorDescription.collectionName;
        return Mongo.Collection._publishCursor(this, sub, collection);
      }
      _getCollectionName() {
        return this._cursorDescription.collectionName;
      }
      observe(callbacks) {
        return LocalCollection._observeFromObserveChanges(this, callbacks);
      }
      async observeAsync(callbacks) {
        return new Promise(resolve => resolve(this.observe(callbacks)));
      }
      observeChanges(callbacks) {
        let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        const ordered = LocalCollection._observeChangesCallbacksAreOrdered(callbacks);
        return this._mongo._observeChanges(this._cursorDescription, ordered, callbacks, options.nonMutatingCallbacks);
      }
      async observeChangesAsync(callbacks) {
        let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        return this.observeChanges(callbacks, options);
      }
    }
    // Add cursor methods dynamically
    [...ASYNC_CURSOR_METHODS, Symbol.iterator, Symbol.asyncIterator].forEach(methodName => {
      if (methodName === 'count') return;
      Cursor.prototype[methodName] = function () {
        const cursor = setupAsynchronousCursor(this, methodName);
        return cursor[methodName](...arguments);
      };
      if (methodName === Symbol.iterator || methodName === Symbol.asyncIterator) return;
      const methodNameAsync = getAsyncMethodName(methodName);
      Cursor.prototype[methodNameAsync] = function () {
        return this[methodName](...arguments);
      };
    });
    function setupAsynchronousCursor(cursor, method) {
      if (cursor._cursorDescription.options.tailable) {
        throw new Error("Cannot call ".concat(String(method), " on a tailable cursor"));
      }
      if (!cursor._synchronousCursor) {
        cursor._synchronousCursor = cursor._mongo._createAsynchronousCursor(cursor._cursorDescription, {
          selfForIteration: cursor,
          useTransform: true
        });
      }
      return cursor._synchronousCursor;
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

},"local_collection_driver.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/local_collection_driver.js                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  LocalCollectionDriver: () => LocalCollectionDriver
});
const LocalCollectionDriver = new class LocalCollectionDriver {
  constructor() {
    this.noConnCollections = Object.create(null);
  }
  open(name, conn) {
    if (!name) {
      return new LocalCollection();
    }
    if (!conn) {
      return ensureCollection(name, this.noConnCollections);
    }
    if (!conn._mongo_livedata_collections) {
      conn._mongo_livedata_collections = Object.create(null);
    }

    // XXX is there a way to keep track of a connection's collections without
    // dangling it off the connection object?
    return ensureCollection(name, conn._mongo_livedata_collections);
  }
}();
function ensureCollection(name, collections) {
  return name in collections ? collections[name] : collections[name] = new LocalCollection(name);
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"remote_collection_driver.ts":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/remote_collection_driver.ts                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reify_async_result__) {
  "use strict";
  try {
    module.export({
      RemoteCollectionDriver: () => RemoteCollectionDriver
    });
    let once;
    module.link("lodash.once", {
      default(v) {
        once = v;
      }
    }, 0);
    let ASYNC_COLLECTION_METHODS, getAsyncMethodName, CLIENT_ONLY_METHODS;
    module.link("meteor/minimongo/constants", {
      ASYNC_COLLECTION_METHODS(v) {
        ASYNC_COLLECTION_METHODS = v;
      },
      getAsyncMethodName(v) {
        getAsyncMethodName = v;
      },
      CLIENT_ONLY_METHODS(v) {
        CLIENT_ONLY_METHODS = v;
      }
    }, 1);
    let MongoConnection;
    module.link("./mongo_connection", {
      MongoConnection(v) {
        MongoConnection = v;
      }
    }, 2);
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    class RemoteCollectionDriver {
      constructor(mongoUrl, options) {
        this.mongo = void 0;
        this.mongo = new MongoConnection(mongoUrl, options);
      }
      open(name) {
        const ret = {};
        // Handle remote collection methods
        RemoteCollectionDriver.REMOTE_COLLECTION_METHODS.forEach(method => {
          // Type assertion needed because we know these methods exist on MongoConnection
          const mongoMethod = this.mongo[method];
          ret[method] = mongoMethod.bind(this.mongo, name);
          if (!ASYNC_COLLECTION_METHODS.includes(method)) return;
          const asyncMethodName = getAsyncMethodName(method);
          ret[asyncMethodName] = function () {
            return ret[method](...arguments);
          };
        });
        // Handle client-only methods
        CLIENT_ONLY_METHODS.forEach(method => {
          ret[method] = function () {
            throw new Error("".concat(method, " is not available on the server. Please use ").concat(getAsyncMethodName(method), "() instead."));
          };
        });
        return ret;
      }
    }
    // Assign the class to MongoInternals
    RemoteCollectionDriver.REMOTE_COLLECTION_METHODS = ['createCappedCollectionAsync', 'dropIndexAsync', 'ensureIndexAsync', 'createIndexAsync', 'countDocuments', 'dropCollectionAsync', 'estimatedDocumentCount', 'find', 'findOneAsync', 'insertAsync', 'rawCollection', 'removeAsync', 'updateAsync', 'upsertAsync'];
    MongoInternals.RemoteCollectionDriver = RemoteCollectionDriver;
    // Create the singleton RemoteCollectionDriver only on demand
    MongoInternals.defaultRemoteCollectionDriver = once(() => {
      const connectionOptions = {};
      const mongoUrl = process.env.MONGO_URL;
      if (!mongoUrl) {
        throw new Error("MONGO_URL must be set in environment");
      }
      if (process.env.MONGO_OPLOG_URL) {
        connectionOptions.oplogUrl = process.env.MONGO_OPLOG_URL;
      }
      const driver = new RemoteCollectionDriver(mongoUrl, connectionOptions);
      // Initialize database connection on startup
      Meteor.startup(async () => {
        await driver.mongo.client.connect();
      });
      return driver;
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

},"collection":{"collection.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/collection/collection.js                                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module1, __reifyWaitForDeps__, __reify_async_result__) {
  "use strict";
  try {
    let _objectSpread;
    module1.link("@babel/runtime/helpers/objectSpread2", {
      default(v) {
        _objectSpread = v;
      }
    }, 0);
    let normalizeProjection;
    module1.link("../mongo_utils", {
      normalizeProjection(v) {
        normalizeProjection = v;
      }
    }, 0);
    let AsyncMethods;
    module1.link("./methods_async", {
      AsyncMethods(v) {
        AsyncMethods = v;
      }
    }, 1);
    let SyncMethods;
    module1.link("./methods_sync", {
      SyncMethods(v) {
        SyncMethods = v;
      }
    }, 2);
    let IndexMethods;
    module1.link("./methods_index", {
      IndexMethods(v) {
        IndexMethods = v;
      }
    }, 3);
    let ID_GENERATORS, normalizeOptions, setupAutopublish, setupConnection, setupDriver, setupMutationMethods, validateCollectionName;
    module1.link("./collection_utils", {
      ID_GENERATORS(v) {
        ID_GENERATORS = v;
      },
      normalizeOptions(v) {
        normalizeOptions = v;
      },
      setupAutopublish(v) {
        setupAutopublish = v;
      },
      setupConnection(v) {
        setupConnection = v;
      },
      setupDriver(v) {
        setupDriver = v;
      },
      setupMutationMethods(v) {
        setupMutationMethods = v;
      },
      validateCollectionName(v) {
        validateCollectionName = v;
      }
    }, 4);
    let ReplicationMethods;
    module1.link("./methods_replication", {
      ReplicationMethods(v) {
        ReplicationMethods = v;
      }
    }, 5);
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    /**
     * @summary Namespace for MongoDB-related items
     * @namespace
     */
    Mongo = {};

    /**
     * @summary Constructor for a Collection
     * @locus Anywhere
     * @instancename collection
     * @class
     * @param {String} name The name of the collection.  If null, creates an unmanaged (unsynchronized) local collection.
     * @param {Object} [options]
     * @param {Object} options.connection The server connection that will manage this collection. Uses the default connection if not specified.  Pass the return value of calling [`DDP.connect`](#DDP-connect) to specify a different server. Pass `null` to specify no connection. Unmanaged (`name` is null) collections cannot specify a connection.
     * @param {String} options.idGeneration The method of generating the `_id` fields of new documents in this collection.  Possible values:
    
     - **`'STRING'`**: random strings
     - **`'MONGO'`**:  random [`Mongo.ObjectID`](#mongo_object_id) values
    
    The default id generation technique is `'STRING'`.
     * @param {Function} options.transform An optional transformation function. Documents will be passed through this function before being returned from `fetch` or `findOneAsync`, and before being passed to callbacks of `observe`, `map`, `forEach`, `allow`, and `deny`. Transforms are *not* applied for the callbacks of `observeChanges` or to cursors returned from publish functions.
     * @param {Boolean} options.defineMutationMethods Set to `false` to skip setting up the mutation methods that enable insert/update/remove from client code. Default `true`.
     */
    // Main Collection constructor
    Mongo.Collection = function Collection(name, options) {
      var _ID_GENERATORS$option, _ID_GENERATORS;
      name = validateCollectionName(name);
      options = normalizeOptions(options);
      this._makeNewID = (_ID_GENERATORS$option = (_ID_GENERATORS = ID_GENERATORS)[options.idGeneration]) === null || _ID_GENERATORS$option === void 0 ? void 0 : _ID_GENERATORS$option.call(_ID_GENERATORS, name);
      this._transform = LocalCollection.wrapTransform(options.transform);
      this.resolverType = options.resolverType;
      this._connection = setupConnection(name, options);
      const driver = setupDriver(name, this._connection, options);
      this._driver = driver;
      this._collection = driver.open(name, this._connection);
      this._name = name;
      this._settingUpReplicationPromise = this._maybeSetUpReplication(name, options);
      setupMutationMethods(this, name, options);
      setupAutopublish(this, name, options);
      Mongo._collections.set(name, this);
    };
    Object.assign(Mongo.Collection.prototype, {
      _getFindSelector(args) {
        if (args.length == 0) return {};else return args[0];
      },
      _getFindOptions(args) {
        const [, options] = args || [];
        const newOptions = normalizeProjection(options);
        var self = this;
        if (args.length < 2) {
          return {
            transform: self._transform
          };
        } else {
          check(newOptions, Match.Optional(Match.ObjectIncluding({
            projection: Match.Optional(Match.OneOf(Object, undefined)),
            sort: Match.Optional(Match.OneOf(Object, Array, Function, undefined)),
            limit: Match.Optional(Match.OneOf(Number, undefined)),
            skip: Match.Optional(Match.OneOf(Number, undefined))
          })));
          return _objectSpread({
            transform: self._transform
          }, newOptions);
        }
      }
    });
    Object.assign(Mongo.Collection, {
      async _publishCursor(cursor, sub, collection) {
        var observeHandle = await cursor.observeChanges({
          added: function (id, fields) {
            sub.added(collection, id, fields);
          },
          changed: function (id, fields) {
            sub.changed(collection, id, fields);
          },
          removed: function (id) {
            sub.removed(collection, id);
          }
        },
        // Publications don't mutate the documents
        // This is tested by the `livedata - publish callbacks clone` test
        {
          nonMutatingCallbacks: true
        });

        // We don't call sub.ready() here: it gets called in livedata_server, after
        // possibly calling _publishCursor on multiple returned cursors.

        // register stop callback (expects lambda w/ no args).
        sub.onStop(async function () {
          return await observeHandle.stop();
        });

        // return the observeHandle in case it needs to be stopped early
        return observeHandle;
      },
      // protect against dangerous selectors.  falsey and {_id: falsey} are both
      // likely programmer error, and not what you want, particularly for destructive
      // operations. If a falsey _id is sent in, a new string _id will be
      // generated and returned; if a fallbackId is provided, it will be returned
      // instead.
      _rewriteSelector(selector) {
        let {
          fallbackId
        } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        // shorthand -- scalars match _id
        if (LocalCollection._selectorIsId(selector)) selector = {
          _id: selector
        };
        if (Array.isArray(selector)) {
          // This is consistent with the Mongo console itself; if we don't do this
          // check passing an empty array ends up selecting all items
          throw new Error("Mongo selector can't be an array.");
        }
        if (!selector || '_id' in selector && !selector._id) {
          // can't match anything
          return {
            _id: fallbackId || Random.id()
          };
        }
        return selector;
      }
    });
    Object.assign(Mongo.Collection.prototype, ReplicationMethods, SyncMethods, AsyncMethods, IndexMethods);
    Object.assign(Mongo.Collection.prototype, {
      // Determine if this collection is simply a minimongo representation of a real
      // database on another server
      _isRemoteCollection() {
        // XXX see #MeteorServerNull
        return this._connection && this._connection !== Meteor.server;
      },
      async dropCollectionAsync() {
        var self = this;
        if (!self._collection.dropCollectionAsync) throw new Error('Can only call dropCollectionAsync on server collections');
        await self._collection.dropCollectionAsync();
      },
      async createCappedCollectionAsync(byteSize, maxDocuments) {
        var self = this;
        if (!(await self._collection.createCappedCollectionAsync)) throw new Error('Can only call createCappedCollectionAsync on server collections');
        await self._collection.createCappedCollectionAsync(byteSize, maxDocuments);
      },
      /**
       * @summary Returns the [`Collection`](http://mongodb.github.io/node-mongodb-native/3.0/api/Collection.html) object corresponding to this collection from the [npm `mongodb` driver module](https://www.npmjs.com/package/mongodb) which is wrapped by `Mongo.Collection`.
       * @locus Server
       * @memberof Mongo.Collection
       * @instance
       */
      rawCollection() {
        var self = this;
        if (!self._collection.rawCollection) {
          throw new Error('Can only call rawCollection on server collections');
        }
        return self._collection.rawCollection();
      },
      /**
       * @summary Returns the [`Db`](http://mongodb.github.io/node-mongodb-native/3.0/api/Db.html) object corresponding to this collection's database connection from the [npm `mongodb` driver module](https://www.npmjs.com/package/mongodb) which is wrapped by `Mongo.Collection`.
       * @locus Server
       * @memberof Mongo.Collection
       * @instance
       */
      rawDatabase() {
        var self = this;
        if (!(self._driver.mongo && self._driver.mongo.db)) {
          throw new Error('Can only call rawDatabase on server collections');
        }
        return self._driver.mongo.db;
      }
    });
    Object.assign(Mongo, {
      /**
       * @summary Retrieve a Meteor collection instance by name. Only collections defined with [`new Mongo.Collection(...)`](#collections) are available with this method. For plain MongoDB collections, you'll want to look at [`rawDatabase()`](#Mongo-Collection-rawDatabase).
       * @locus Anywhere
       * @memberof Mongo
       * @static
       * @param {string} name Name of your collection as it was defined with `new Mongo.Collection()`.
       * @returns {Mongo.Collection | undefined}
       */
      getCollection(name) {
        return this._collections.get(name);
      },
      /**
       * @summary A record of all defined Mongo.Collection instances, indexed by collection name.
       * @type {Map<string, Mongo.Collection>}
       * @memberof Mongo
       * @protected
       */
      _collections: new Map()
    });

    /**
     * @summary Create a Mongo-style `ObjectID`.  If you don't specify a `hexString`, the `ObjectID` will be generated randomly (not using MongoDB's ID construction rules).
     * @locus Anywhere
     * @class
     * @param {String} [hexString] Optional.  The 24-character hexadecimal contents of the ObjectID to create
     */
    Mongo.ObjectID = MongoID.ObjectID;

    /**
     * @summary To create a cursor, use find. To access the documents in a cursor, use forEach, map, or fetch.
     * @class
     * @instanceName cursor
     */
    Mongo.Cursor = LocalCollection.Cursor;

    /**
     * @deprecated in 0.9.1
     */
    Mongo.Collection.Cursor = Mongo.Cursor;

    /**
     * @deprecated in 0.9.1
     */
    Mongo.Collection.ObjectID = Mongo.ObjectID;

    /**
     * @deprecated in 0.9.1
     */
    Meteor.Collection = Mongo.Collection;

    // Allow deny stuff is now in the allow-deny package
    Object.assign(Mongo.Collection.prototype, AllowDeny.CollectionPrototype);
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

},"collection_utils.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/collection/collection_utils.js                                                                       //
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
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    module.export({
      ID_GENERATORS: () => ID_GENERATORS,
      setupConnection: () => setupConnection,
      setupDriver: () => setupDriver,
      setupAutopublish: () => setupAutopublish,
      setupMutationMethods: () => setupMutationMethods,
      validateCollectionName: () => validateCollectionName,
      normalizeOptions: () => normalizeOptions
    });
    const ID_GENERATORS = {
      MONGO(name) {
        return function () {
          const src = name ? DDP.randomStream('/collection/' + name) : Random.insecure;
          return new Mongo.ObjectID(src.hexString(24));
        };
      },
      STRING(name) {
        return function () {
          const src = name ? DDP.randomStream('/collection/' + name) : Random.insecure;
          return src.id();
        };
      }
    };
    function setupConnection(name, options) {
      if (!name || options.connection === null) return null;
      if (options.connection) return options.connection;
      return Meteor.isClient ? Meteor.connection : Meteor.server;
    }
    function setupDriver(name, connection, options) {
      if (options._driver) return options._driver;
      if (name && connection === Meteor.server && typeof MongoInternals !== 'undefined' && MongoInternals.defaultRemoteCollectionDriver) {
        return MongoInternals.defaultRemoteCollectionDriver();
      }
      const {
        LocalCollectionDriver
      } = require('../local_collection_driver.js');
      return LocalCollectionDriver;
    }
    function setupAutopublish(collection, name, options) {
      if (Package.autopublish && !options._preventAutopublish && collection._connection && collection._connection.publish) {
        collection._connection.publish(null, () => collection.find(), {
          is_auto: true
        });
      }
    }
    function setupMutationMethods(collection, name, options) {
      if (options.defineMutationMethods === false) return;
      try {
        collection._defineMutationMethods({
          useExisting: options._suppressSameNameError === true
        });
      } catch (error) {
        if (error.message === "A method named '/".concat(name, "/insertAsync' is already defined")) {
          throw new Error("There is already a collection named \"".concat(name, "\""));
        }
        throw error;
      }
    }
    function validateCollectionName(name) {
      if (!name && name !== null) {
        Meteor._debug('Warning: creating anonymous collection. It will not be ' + 'saved or synchronized over the network. (Pass null for ' + 'the collection name to turn off this warning.)');
        name = null;
      }
      if (name !== null && typeof name !== 'string') {
        throw new Error('First argument to new Mongo.Collection must be a string or null');
      }
      return name;
    }
    function normalizeOptions(options) {
      if (options && options.methods) {
        // Backwards compatibility hack with original signature
        options = {
          connection: options
        };
      }
      // Backwards compatibility: "connection" used to be called "manager".
      if (options && options.manager && !options.connection) {
        options.connection = options.manager;
      }
      const cleanedOptions = Object.fromEntries(Object.entries(options || {}).filter(_ref => {
        let [_, v] = _ref;
        return v !== undefined;
      }));

      // 2) Spread defaults first, then only the defined overrides
      return _objectSpread({
        connection: undefined,
        idGeneration: 'STRING',
        transform: null,
        _driver: undefined,
        _preventAutopublish: false
      }, cleanedOptions);
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

},"methods_async.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/collection/methods_async.js                                                                          //
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
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    module.export({
      AsyncMethods: () => AsyncMethods
    });
    const AsyncMethods = {
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
       * @returns {Object}
       */
      findOneAsync() {
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }
        return this._collection.findOneAsync(this._getFindSelector(args), this._getFindOptions(args));
      },
      _insertAsync(doc) {
        let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        // Make sure we were passed a document to insert
        if (!doc) {
          throw new Error('insert requires an argument');
        }

        // Make a shallow clone of the document, preserving its prototype.
        doc = Object.create(Object.getPrototypeOf(doc), Object.getOwnPropertyDescriptors(doc));
        if ('_id' in doc) {
          if (!doc._id || !(typeof doc._id === 'string' || doc._id instanceof Mongo.ObjectID)) {
            throw new Error('Meteor requires document _id fields to be non-empty strings or ObjectIDs');
          }
        } else {
          let generateId = true;

          // Don't generate the id if we're the client and the 'outermost' call
          // This optimization saves us passing both the randomSeed and the id
          // Passing both is redundant.
          if (this._isRemoteCollection()) {
            const enclosing = DDP._CurrentMethodInvocation.get();
            if (!enclosing) {
              generateId = false;
            }
          }
          if (generateId) {
            doc._id = this._makeNewID();
          }
        }

        // On inserts, always return the id that we generated; on all other
        // operations, just return the result from the collection.
        var chooseReturnValueFromCollectionResult = function (result) {
          if (Meteor._isPromise(result)) return result;
          if (doc._id) {
            return doc._id;
          }

          // XXX what is this for??
          // It's some iteraction between the callback to _callMutatorMethod and
          // the return value conversion
          doc._id = result;
          return result;
        };
        if (this._isRemoteCollection()) {
          const promise = this._callMutatorMethodAsync('insertAsync', [doc], options);
          promise.then(chooseReturnValueFromCollectionResult);
          promise.stubPromise = promise.stubPromise.then(chooseReturnValueFromCollectionResult);
          promise.serverPromise = promise.serverPromise.then(chooseReturnValueFromCollectionResult);
          return promise;
        }

        // it's my collection.  descend into the collection object
        // and propagate any exception.
        return this._collection.insertAsync(doc).then(chooseReturnValueFromCollectionResult);
      },
      /**
       * @summary Insert a document in the collection.  Returns a promise that will return the document's unique _id when solved.
       * @locus Anywhere
       * @method  insert
       * @memberof Mongo.Collection
       * @instance
       * @param {Object} doc The document to insert. May not yet have an _id attribute, in which case Meteor will generate one for you.
       */
      insertAsync(doc, options) {
        return this._insertAsync(doc, options);
      },
      /**
       * @summary Modify one or more documents in the collection. Returns the number of matched documents.
       * @locus Anywhere
       * @method update
       * @memberof Mongo.Collection
       * @instance
       * @param {MongoSelector} selector Specifies which documents to modify
       * @param {MongoModifier} modifier Specifies how to modify the documents
       * @param {Object} [options]
       * @param {Boolean} options.multi True to modify all matching documents; false to only modify one of the matching documents (the default).
       * @param {Boolean} options.upsert True to insert a document if no matching documents are found.
       * @param {Array} options.arrayFilters Optional. Used in combination with MongoDB [filtered positional operator](https://docs.mongodb.com/manual/reference/operator/update/positional-filtered/) to specify which elements to modify in an array field.
       */
      updateAsync(selector, modifier) {
        // We've already popped off the callback, so we are left with an array
        // of one or zero items
        const options = _objectSpread({}, (arguments.length <= 2 ? undefined : arguments[2]) || null);
        let insertedId;
        if (options && options.upsert) {
          // set `insertedId` if absent.  `insertedId` is a Meteor extension.
          if (options.insertedId) {
            if (!(typeof options.insertedId === 'string' || options.insertedId instanceof Mongo.ObjectID)) throw new Error('insertedId must be string or ObjectID');
            insertedId = options.insertedId;
          } else if (!selector || !selector._id) {
            insertedId = this._makeNewID();
            options.generatedId = true;
            options.insertedId = insertedId;
          }
        }
        selector = Mongo.Collection._rewriteSelector(selector, {
          fallbackId: insertedId
        });
        if (this._isRemoteCollection()) {
          const args = [selector, modifier, options];
          return this._callMutatorMethodAsync('updateAsync', args, options);
        }

        // it's my collection.  descend into the collection object
        // and propagate any exception.
        // If the user provided a callback and the collection implements this
        // operation asynchronously, then queryRet will be undefined, and the
        // result will be returned through the callback instead.

        return this._collection.updateAsync(selector, modifier, options);
      },
      /**
       * @summary Asynchronously removes documents from the collection.
       * @locus Anywhere
       * @method remove
       * @memberof Mongo.Collection
       * @instance
       * @param {MongoSelector} selector Specifies which documents to remove
       */
      removeAsync(selector) {
        let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        selector = Mongo.Collection._rewriteSelector(selector);
        if (this._isRemoteCollection()) {
          return this._callMutatorMethodAsync('removeAsync', [selector], options);
        }

        // it's my collection.  descend into the collection1 object
        // and propagate any exception.
        return this._collection.removeAsync(selector);
      },
      /**
       * @summary Asynchronously modifies one or more documents in the collection, or insert one if no matching documents were found. Returns an object with keys `numberAffected` (the number of documents modified)  and `insertedId` (the unique _id of the document that was inserted, if any).
       * @locus Anywhere
       * @method upsert
       * @memberof Mongo.Collection
       * @instance
       * @param {MongoSelector} selector Specifies which documents to modify
       * @param {MongoModifier} modifier Specifies how to modify the documents
       * @param {Object} [options]
       * @param {Boolean} options.multi True to modify all matching documents; false to only modify one of the matching documents (the default).
       */
      async upsertAsync(selector, modifier, options) {
        return this.updateAsync(selector, modifier, _objectSpread(_objectSpread({}, options), {}, {
          _returnObject: true,
          upsert: true
        }));
      },
      /**
       * @summary Gets the number of documents matching the filter. For a fast count of the total documents in a collection see `estimatedDocumentCount`.
       * @locus Anywhere
       * @method countDocuments
       * @memberof Mongo.Collection
       * @instance
       * @param {MongoSelector} [selector] A query describing the documents to count
       * @param {Object} [options] All options are listed in [MongoDB documentation](https://mongodb.github.io/node-mongodb-native/4.11/interfaces/CountDocumentsOptions.html). Please note that not all of them are available on the client.
       * @returns {Promise<number>}
       */
      countDocuments() {
        return this._collection.countDocuments(...arguments);
      },
      /**
       * @summary Gets an estimate of the count of documents in a collection using collection metadata. For an exact count of the documents in a collection see `countDocuments`.
       * @locus Anywhere
       * @method estimatedDocumentCount
       * @memberof Mongo.Collection
       * @instance
       * @param {Object} [options] All options are listed in [MongoDB documentation](https://mongodb.github.io/node-mongodb-native/4.11/interfaces/EstimatedDocumentCountOptions.html). Please note that not all of them are available on the client.
       * @returns {Promise<number>}
       */
      estimatedDocumentCount() {
        return this._collection.estimatedDocumentCount(...arguments);
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

},"methods_index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/collection/methods_index.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reify_async_result__) {
  "use strict";
  try {
    module.export({
      IndexMethods: () => IndexMethods
    });
    let Log;
    module.link("meteor/logging", {
      Log(v) {
        Log = v;
      }
    }, 0);
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    const IndexMethods = {
      // We'll actually design an index API later. For now, we just pass through to
      // Mongo's, but make it synchronous.
      /**
       * @summary Asynchronously creates the specified index on the collection.
       * @locus server
       * @method ensureIndexAsync
       * @deprecated in 3.0
       * @memberof Mongo.Collection
       * @instance
       * @param {Object} index A document that contains the field and value pairs where the field is the index key and the value describes the type of index for that field. For an ascending index on a field, specify a value of `1`; for descending index, specify a value of `-1`. Use `text` for text indexes.
       * @param {Object} [options] All options are listed in [MongoDB documentation](https://docs.mongodb.com/manual/reference/method/db.collection.createIndex/#options)
       * @param {String} options.name Name of the index
       * @param {Boolean} options.unique Define that the index values must be unique, more at [MongoDB documentation](https://docs.mongodb.com/manual/core/index-unique/)
       * @param {Boolean} options.sparse Define that the index is sparse, more at [MongoDB documentation](https://docs.mongodb.com/manual/core/index-sparse/)
       */
      async ensureIndexAsync(index, options) {
        var self = this;
        if (!self._collection.ensureIndexAsync || !self._collection.createIndexAsync) throw new Error('Can only call createIndexAsync on server collections');
        if (self._collection.createIndexAsync) {
          await self._collection.createIndexAsync(index, options);
        } else {
          Log.debug("ensureIndexAsync has been deprecated, please use the new 'createIndexAsync' instead".concat(options !== null && options !== void 0 && options.name ? ", index name: ".concat(options.name) : ", index: ".concat(JSON.stringify(index))));
          await self._collection.ensureIndexAsync(index, options);
        }
      },
      /**
       * @summary Asynchronously creates the specified index on the collection.
       * @locus server
       * @method createIndexAsync
       * @memberof Mongo.Collection
       * @instance
       * @param {Object} index A document that contains the field and value pairs where the field is the index key and the value describes the type of index for that field. For an ascending index on a field, specify a value of `1`; for descending index, specify a value of `-1`. Use `text` for text indexes.
       * @param {Object} [options] All options are listed in [MongoDB documentation](https://docs.mongodb.com/manual/reference/method/db.collection.createIndex/#options)
       * @param {String} options.name Name of the index
       * @param {Boolean} options.unique Define that the index values must be unique, more at [MongoDB documentation](https://docs.mongodb.com/manual/core/index-unique/)
       * @param {Boolean} options.sparse Define that the index is sparse, more at [MongoDB documentation](https://docs.mongodb.com/manual/core/index-sparse/)
       */
      async createIndexAsync(index, options) {
        var self = this;
        if (!self._collection.createIndexAsync) throw new Error('Can only call createIndexAsync on server collections');
        try {
          await self._collection.createIndexAsync(index, options);
        } catch (e) {
          var _Meteor$settings, _Meteor$settings$pack, _Meteor$settings$pack2;
          if (e.message.includes('An equivalent index already exists with the same name but different options.') && (_Meteor$settings = Meteor.settings) !== null && _Meteor$settings !== void 0 && (_Meteor$settings$pack = _Meteor$settings.packages) !== null && _Meteor$settings$pack !== void 0 && (_Meteor$settings$pack2 = _Meteor$settings$pack.mongo) !== null && _Meteor$settings$pack2 !== void 0 && _Meteor$settings$pack2.reCreateIndexOnOptionMismatch) {
            Log.info("Re-creating index ".concat(index, " for ").concat(self._name, " due to options mismatch."));
            await self._collection.dropIndexAsync(index);
            await self._collection.createIndexAsync(index, options);
          } else {
            console.error(e);
            throw new Meteor.Error("An error occurred when creating an index for collection \"".concat(self._name, ": ").concat(e.message));
          }
        }
      },
      /**
       * @summary Asynchronously creates the specified index on the collection.
       * @locus server
       * @method createIndex
       * @memberof Mongo.Collection
       * @instance
       * @param {Object} index A document that contains the field and value pairs where the field is the index key and the value describes the type of index for that field. For an ascending index on a field, specify a value of `1`; for descending index, specify a value of `-1`. Use `text` for text indexes.
       * @param {Object} [options] All options are listed in [MongoDB documentation](https://docs.mongodb.com/manual/reference/method/db.collection.createIndex/#options)
       * @param {String} options.name Name of the index
       * @param {Boolean} options.unique Define that the index values must be unique, more at [MongoDB documentation](https://docs.mongodb.com/manual/core/index-unique/)
       * @param {Boolean} options.sparse Define that the index is sparse, more at [MongoDB documentation](https://docs.mongodb.com/manual/core/index-sparse/)
       */
      createIndex(index, options) {
        return this.createIndexAsync(index, options);
      },
      async dropIndexAsync(index) {
        var self = this;
        if (!self._collection.dropIndexAsync) throw new Error('Can only call dropIndexAsync on server collections');
        await self._collection.dropIndexAsync(index);
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

},"methods_replication.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/collection/methods_replication.js                                                                    //
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
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    module.export({
      ReplicationMethods: () => ReplicationMethods
    });
    const ReplicationMethods = {
      async _maybeSetUpReplication(name) {
        var _registerStoreResult, _registerStoreResult$;
        const self = this;
        if (!(self._connection && self._connection.registerStoreClient && self._connection.registerStoreServer)) {
          return;
        }
        const wrappedStoreCommon = {
          // Called around method stub invocations to capture the original versions
          // of modified documents.
          saveOriginals() {
            self._collection.saveOriginals();
          },
          retrieveOriginals() {
            return self._collection.retrieveOriginals();
          },
          // To be able to get back to the collection from the store.
          _getCollection() {
            return self;
          }
        };
        const wrappedStoreClient = _objectSpread({
          // Called at the beginning of a batch of updates. batchSize is the number
          // of update calls to expect.
          //
          // XXX This interface is pretty janky. reset probably ought to go back to
          // being its own function, and callers shouldn't have to calculate
          // batchSize. The optimization of not calling pause/remove should be
          // delayed until later: the first call to update() should buffer its
          // message, and then we can either directly apply it at endUpdate time if
          // it was the only update, or do pauseObservers/apply/apply at the next
          // update() if there's another one.
          async beginUpdate(batchSize, reset) {
            // pause observers so users don't see flicker when updating several
            // objects at once (including the post-reconnect reset-and-reapply
            // stage), and so that a re-sorting of a query can take advantage of the
            // full _diffQuery moved calculation instead of applying change one at a
            // time.
            if (batchSize > 1 || reset) self._collection.pauseObservers();
            if (reset) await self._collection.remove({});
          },
          // Apply an update.
          // XXX better specify this interface (not in terms of a wire message)?
          update(msg) {
            var mongoId = MongoID.idParse(msg.id);
            var doc = self._collection._docs.get(mongoId);

            //When the server's mergebox is disabled for a collection, the client must gracefully handle it when:
            // *We receive an added message for a document that is already there. Instead, it will be changed
            // *We reeive a change message for a document that is not there. Instead, it will be added
            // *We receive a removed messsage for a document that is not there. Instead, noting wil happen.

            //Code is derived from client-side code originally in peerlibrary:control-mergebox
            //https://github.com/peerlibrary/meteor-control-mergebox/blob/master/client.coffee

            //For more information, refer to discussion "Initial support for publication strategies in livedata server":
            //https://github.com/meteor/meteor/pull/11151
            if (Meteor.isClient) {
              if (msg.msg === 'added' && doc) {
                msg.msg = 'changed';
              } else if (msg.msg === 'removed' && !doc) {
                return;
              } else if (msg.msg === 'changed' && !doc) {
                msg.msg = 'added';
                const _ref = msg.fields;
                for (let field in _ref) {
                  const value = _ref[field];
                  if (value === void 0) {
                    delete msg.fields[field];
                  }
                }
              }
            }
            // Is this a "replace the whole doc" message coming from the quiescence
            // of method writes to an object? (Note that 'undefined' is a valid
            // value meaning "remove it".)
            if (msg.msg === 'replace') {
              var replace = msg.replace;
              if (!replace) {
                if (doc) self._collection.remove(mongoId);
              } else if (!doc) {
                self._collection.insert(replace);
              } else {
                // XXX check that replace has no $ ops
                self._collection.update(mongoId, replace);
              }
              return;
            } else if (msg.msg === 'added') {
              if (doc) {
                throw new Error('Expected not to find a document already present for an add');
              }
              self._collection.insert(_objectSpread({
                _id: mongoId
              }, msg.fields));
            } else if (msg.msg === 'removed') {
              if (!doc) throw new Error('Expected to find a document already present for removed');
              self._collection.remove(mongoId);
            } else if (msg.msg === 'changed') {
              if (!doc) throw new Error('Expected to find a document to change');
              const keys = Object.keys(msg.fields);
              if (keys.length > 0) {
                var modifier = {};
                keys.forEach(key => {
                  const value = msg.fields[key];
                  if (EJSON.equals(doc[key], value)) {
                    return;
                  }
                  if (typeof value === 'undefined') {
                    if (!modifier.$unset) {
                      modifier.$unset = {};
                    }
                    modifier.$unset[key] = 1;
                  } else {
                    if (!modifier.$set) {
                      modifier.$set = {};
                    }
                    modifier.$set[key] = value;
                  }
                });
                if (Object.keys(modifier).length > 0) {
                  self._collection.update(mongoId, modifier);
                }
              }
            } else {
              throw new Error("I don't know how to deal with this message");
            }
          },
          // Called at the end of a batch of updates.livedata_connection.js:1287
          endUpdate() {
            self._collection.resumeObserversClient();
          },
          // Used to preserve current versions of documents across a store reset.
          getDoc(id) {
            return self.findOne(id);
          }
        }, wrappedStoreCommon);
        const wrappedStoreServer = _objectSpread({
          async beginUpdate(batchSize, reset) {
            if (batchSize > 1 || reset) self._collection.pauseObservers();
            if (reset) await self._collection.removeAsync({});
          },
          async update(msg) {
            var mongoId = MongoID.idParse(msg.id);
            var doc = self._collection._docs.get(mongoId);

            // Is this a "replace the whole doc" message coming from the quiescence
            // of method writes to an object? (Note that 'undefined' is a valid
            // value meaning "remove it".)
            if (msg.msg === 'replace') {
              var replace = msg.replace;
              if (!replace) {
                if (doc) await self._collection.removeAsync(mongoId);
              } else if (!doc) {
                await self._collection.insertAsync(replace);
              } else {
                // XXX check that replace has no $ ops
                await self._collection.updateAsync(mongoId, replace);
              }
              return;
            } else if (msg.msg === 'added') {
              if (doc) {
                throw new Error('Expected not to find a document already present for an add');
              }
              await self._collection.insertAsync(_objectSpread({
                _id: mongoId
              }, msg.fields));
            } else if (msg.msg === 'removed') {
              if (!doc) throw new Error('Expected to find a document already present for removed');
              await self._collection.removeAsync(mongoId);
            } else if (msg.msg === 'changed') {
              if (!doc) throw new Error('Expected to find a document to change');
              const keys = Object.keys(msg.fields);
              if (keys.length > 0) {
                var modifier = {};
                keys.forEach(key => {
                  const value = msg.fields[key];
                  if (EJSON.equals(doc[key], value)) {
                    return;
                  }
                  if (typeof value === 'undefined') {
                    if (!modifier.$unset) {
                      modifier.$unset = {};
                    }
                    modifier.$unset[key] = 1;
                  } else {
                    if (!modifier.$set) {
                      modifier.$set = {};
                    }
                    modifier.$set[key] = value;
                  }
                });
                if (Object.keys(modifier).length > 0) {
                  await self._collection.updateAsync(mongoId, modifier);
                }
              }
            } else {
              throw new Error("I don't know how to deal with this message");
            }
          },
          // Called at the end of a batch of updates.
          async endUpdate() {
            await self._collection.resumeObserversServer();
          },
          // Used to preserve current versions of documents across a store reset.
          async getDoc(id) {
            return self.findOneAsync(id);
          }
        }, wrappedStoreCommon);

        // OK, we're going to be a slave, replicating some remote
        // database, except possibly with some temporary divergence while
        // we have unacknowledged RPC's.
        let registerStoreResult;
        if (Meteor.isClient) {
          registerStoreResult = self._connection.registerStoreClient(name, wrappedStoreClient);
        } else {
          registerStoreResult = self._connection.registerStoreServer(name, wrappedStoreServer);
        }
        const message = "There is already a collection named \"".concat(name, "\"");
        const logWarn = () => {
          console.warn ? console.warn(message) : console.log(message);
        };
        if (!registerStoreResult) {
          return logWarn();
        }
        return (_registerStoreResult = registerStoreResult) === null || _registerStoreResult === void 0 ? void 0 : (_registerStoreResult$ = _registerStoreResult.then) === null || _registerStoreResult$ === void 0 ? void 0 : _registerStoreResult$.call(_registerStoreResult, ok => {
          if (!ok) {
            logWarn();
          }
        });
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

},"methods_sync.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/collection/methods_sync.js                                                                           //
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
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    module.export({
      SyncMethods: () => SyncMethods
    });
    const SyncMethods = {
      /**
       * @summary Find the documents in a collection that match the selector.
       * @locus Anywhere
       * @method find
       * @memberof Mongo.Collection
       * @instance
       * @param {MongoSelector} [selector] A query describing the documents to find
       * @param {Object} [options]
       * @param {MongoSortSpecifier} options.sort Sort order (default: natural order)
       * @param {Number} options.skip Number of results to skip at the beginning
       * @param {Number} options.limit Maximum number of results to return
       * @param {MongoFieldSpecifier} options.fields Dictionary of fields to return or exclude.
       * @param {Boolean} options.reactive (Client only) Default `true`; pass `false` to disable reactivity
       * @param {Function} options.transform Overrides `transform` on the  [`Collection`](#collections) for this cursor.  Pass `null` to disable transformation.
       * @param {Boolean} options.disableOplog (Server only) Pass true to disable oplog-tailing on this query. This affects the way server processes calls to `observe` on this query. Disabling the oplog can be useful when working with data that updates in large batches.
       * @param {Number} options.pollingIntervalMs (Server only) When oplog is disabled (through the use of `disableOplog` or when otherwise not available), the frequency (in milliseconds) of how often to poll this query when observing on the server. Defaults to 10000ms (10 seconds).
       * @param {Number} options.pollingThrottleMs (Server only) When oplog is disabled (through the use of `disableOplog` or when otherwise not available), the minimum time (in milliseconds) to allow between re-polling when observing on the server. Increasing this will save CPU and mongo load at the expense of slower updates to users. Decreasing this is not recommended. Defaults to 50ms.
       * @param {Number} options.maxTimeMs (Server only) If set, instructs MongoDB to set a time limit for this cursor's operations. If the operation reaches the specified time limit (in milliseconds) without the having been completed, an exception will be thrown. Useful to prevent an (accidental or malicious) unoptimized query from causing a full collection scan that would disrupt other database users, at the expense of needing to handle the resulting error.
       * @param {String|Object} options.hint (Server only) Overrides MongoDB's default index selection and query optimization process. Specify an index to force its use, either by its name or index specification. You can also specify `{ $natural : 1 }` to force a forwards collection scan, or `{ $natural : -1 }` for a reverse collection scan. Setting this is only recommended for advanced users.
       * @param {String} options.readPreference (Server only) Specifies a custom MongoDB [`readPreference`](https://docs.mongodb.com/manual/core/read-preference) for this particular cursor. Possible values are `primary`, `primaryPreferred`, `secondary`, `secondaryPreferred` and `nearest`.
       * @returns {Mongo.Cursor}
       */
      find() {
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }
        // Collection.find() (return all docs) behaves differently
        // from Collection.find(undefined) (return 0 docs).  so be
        // careful about the length of arguments.
        return this._collection.find(this._getFindSelector(args), this._getFindOptions(args));
      },
      /**
       * @summary Finds the first document that matches the selector, as ordered by sort and skip options. Returns `undefined` if no matching document is found.
       * @locus Anywhere
       * @method findOne
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
       * @returns {Object}
       */
      findOne() {
        for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
          args[_key2] = arguments[_key2];
        }
        return this._collection.findOne(this._getFindSelector(args), this._getFindOptions(args));
      },
      // 'insert' immediately returns the inserted document's new _id.
      // The others return values immediately if you are in a stub, an in-memory
      // unmanaged collection, or a mongo-backed collection and you don't pass a
      // callback. 'update' and 'remove' return the number of affected
      // documents. 'upsert' returns an object with keys 'numberAffected' and, if an
      // insert happened, 'insertedId'.
      //
      // Otherwise, the semantics are exactly like other methods: they take
      // a callback as an optional last argument; if no callback is
      // provided, they block until the operation is complete, and throw an
      // exception if it fails; if a callback is provided, then they don't
      // necessarily block, and they call the callback when they finish with error and
      // result arguments.  (The insert method provides the document ID as its result;
      // update and remove provide the number of affected docs as the result; upsert
      // provides an object with numberAffected and maybe insertedId.)
      //
      // On the client, blocking is impossible, so if a callback
      // isn't provided, they just return immediately and any error
      // information is lost.
      //
      // There's one more tweak. On the client, if you don't provide a
      // callback, then if there is an error, a message will be logged with
      // Meteor._debug.
      //
      // The intent (though this is actually determined by the underlying
      // drivers) is that the operations should be done synchronously, not
      // generating their result until the database has acknowledged
      // them. In the future maybe we should provide a flag to turn this
      // off.

      _insert(doc, callback) {
        // Make sure we were passed a document to insert
        if (!doc) {
          throw new Error('insert requires an argument');
        }

        // Make a shallow clone of the document, preserving its prototype.
        doc = Object.create(Object.getPrototypeOf(doc), Object.getOwnPropertyDescriptors(doc));
        if ('_id' in doc) {
          if (!doc._id || !(typeof doc._id === 'string' || doc._id instanceof Mongo.ObjectID)) {
            throw new Error('Meteor requires document _id fields to be non-empty strings or ObjectIDs');
          }
        } else {
          let generateId = true;

          // Don't generate the id if we're the client and the 'outermost' call
          // This optimization saves us passing both the randomSeed and the id
          // Passing both is redundant.
          if (this._isRemoteCollection()) {
            const enclosing = DDP._CurrentMethodInvocation.get();
            if (!enclosing) {
              generateId = false;
            }
          }
          if (generateId) {
            doc._id = this._makeNewID();
          }
        }

        // On inserts, always return the id that we generated; on all other
        // operations, just return the result from the collection.
        var chooseReturnValueFromCollectionResult = function (result) {
          if (Meteor._isPromise(result)) return result;
          if (doc._id) {
            return doc._id;
          }

          // XXX what is this for??
          // It's some iteraction between the callback to _callMutatorMethod and
          // the return value conversion
          doc._id = result;
          return result;
        };
        const wrappedCallback = wrapCallback(callback, chooseReturnValueFromCollectionResult);
        if (this._isRemoteCollection()) {
          const result = this._callMutatorMethod('insert', [doc], wrappedCallback);
          return chooseReturnValueFromCollectionResult(result);
        }

        // it's my collection.  descend into the collection object
        // and propagate any exception.
        try {
          // If the user provided a callback and the collection implements this
          // operation asynchronously, then queryRet will be undefined, and the
          // result will be returned through the callback instead.
          let result;
          if (!!wrappedCallback) {
            this._collection.insert(doc, wrappedCallback);
          } else {
            // If we don't have the callback, we assume the user is using the promise.
            // We can't just pass this._collection.insert to the promisify because it would lose the context.
            result = this._collection.insert(doc);
          }
          return chooseReturnValueFromCollectionResult(result);
        } catch (e) {
          if (callback) {
            callback(e);
            return null;
          }
          throw e;
        }
      },
      /**
       * @summary Insert a document in the collection.  Returns its unique _id.
       * @locus Anywhere
       * @method  insert
       * @memberof Mongo.Collection
       * @instance
       * @param {Object} doc The document to insert. May not yet have an _id attribute, in which case Meteor will generate one for you.
       * @param {Function} [callback] Optional.  If present, called with an error object as the first argument and, if no error, the _id as the second.
       */
      insert(doc, callback) {
        return this._insert(doc, callback);
      },
      /**
       * @summary Asynchronously modifies one or more documents in the collection. Returns the number of matched documents.
       * @locus Anywhere
       * @method update
       * @memberof Mongo.Collection
       * @instance
       * @param {MongoSelector} selector Specifies which documents to modify
       * @param {MongoModifier} modifier Specifies how to modify the documents
       * @param {Object} [options]
       * @param {Boolean} options.multi True to modify all matching documents; false to only modify one of the matching documents (the default).
       * @param {Boolean} options.upsert True to insert a document if no matching documents are found.
       * @param {Array} options.arrayFilters Optional. Used in combination with MongoDB [filtered positional operator](https://docs.mongodb.com/manual/reference/operator/update/positional-filtered/) to specify which elements to modify in an array field.
       * @param {Function} [callback] Optional.  If present, called with an error object as the first argument and, if no error, the number of affected documents as the second.
       */
      update(selector, modifier) {
        for (var _len3 = arguments.length, optionsAndCallback = new Array(_len3 > 2 ? _len3 - 2 : 0), _key3 = 2; _key3 < _len3; _key3++) {
          optionsAndCallback[_key3 - 2] = arguments[_key3];
        }
        const callback = popCallbackFromArgs(optionsAndCallback);

        // We've already popped off the callback, so we are left with an array
        // of one or zero items
        const options = _objectSpread({}, optionsAndCallback[0] || null);
        let insertedId;
        if (options && options.upsert) {
          // set `insertedId` if absent.  `insertedId` is a Meteor extension.
          if (options.insertedId) {
            if (!(typeof options.insertedId === 'string' || options.insertedId instanceof Mongo.ObjectID)) throw new Error('insertedId must be string or ObjectID');
            insertedId = options.insertedId;
          } else if (!selector || !selector._id) {
            insertedId = this._makeNewID();
            options.generatedId = true;
            options.insertedId = insertedId;
          }
        }
        selector = Mongo.Collection._rewriteSelector(selector, {
          fallbackId: insertedId
        });
        const wrappedCallback = wrapCallback(callback);
        if (this._isRemoteCollection()) {
          const args = [selector, modifier, options];
          return this._callMutatorMethod('update', args, callback);
        }

        // it's my collection.  descend into the collection object
        // and propagate any exception.
        // If the user provided a callback and the collection implements this
        // operation asynchronously, then queryRet will be undefined, and the
        // result will be returned through the callback instead.
        //console.log({callback, options, selector, modifier, coll: this._collection});
        try {
          // If the user provided a callback and the collection implements this
          // operation asynchronously, then queryRet will be undefined, and the
          // result will be returned through the callback instead.
          return this._collection.update(selector, modifier, options, wrappedCallback);
        } catch (e) {
          if (callback) {
            callback(e);
            return null;
          }
          throw e;
        }
      },
      /**
       * @summary Remove documents from the collection
       * @locus Anywhere
       * @method remove
       * @memberof Mongo.Collection
       * @instance
       * @param {MongoSelector} selector Specifies which documents to remove
       * @param {Function} [callback] Optional.  If present, called with an error object as the first argument and, if no error, the number of affected documents as the second.
       */
      remove(selector, callback) {
        selector = Mongo.Collection._rewriteSelector(selector);
        if (this._isRemoteCollection()) {
          return this._callMutatorMethod('remove', [selector], callback);
        }

        // it's my collection.  descend into the collection1 object
        // and propagate any exception.
        return this._collection.remove(selector);
      },
      /**
       * @summary Asynchronously modifies one or more documents in the collection, or insert one if no matching documents were found. Returns an object with keys `numberAffected` (the number of documents modified)  and `insertedId` (the unique _id of the document that was inserted, if any).
       * @locus Anywhere
       * @method upsert
       * @memberof Mongo.Collection
       * @instance
       * @param {MongoSelector} selector Specifies which documents to modify
       * @param {MongoModifier} modifier Specifies how to modify the documents
       * @param {Object} [options]
       * @param {Boolean} options.multi True to modify all matching documents; false to only modify one of the matching documents (the default).
       * @param {Function} [callback] Optional.  If present, called with an error object as the first argument and, if no error, the number of affected documents as the second.
       */
      upsert(selector, modifier, options, callback) {
        if (!callback && typeof options === 'function') {
          callback = options;
          options = {};
        }
        return this.update(selector, modifier, _objectSpread(_objectSpread({}, options), {}, {
          _returnObject: true,
          upsert: true
        }));
      }
    };
    // Convert the callback to not return a result if there is an error
    function wrapCallback(callback, convertResult) {
      return callback && function (error, result) {
        if (error) {
          callback(error);
        } else if (typeof convertResult === 'function') {
          callback(error, convertResult(result));
        } else {
          callback(error, result);
        }
      };
    }
    function popCallbackFromArgs(args) {
      // Pull off any callback (or perhaps a 'callback' variable that was passed
      // in undefined, like how 'upsert' does it).
      if (args.length && (args[args.length - 1] === undefined || args[args.length - 1] instanceof Function)) {
        return args.pop();
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

}},"connection_options.ts":function module(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/connection_options.ts                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/**
 * @summary Allows for user specified connection options
 * @example http://mongodb.github.io/node-mongodb-native/3.0/reference/connecting/connection-settings/
 * @locus Server
 * @param {Object} options User specified Mongo connection options
 */
Mongo.setConnectionOptions = function setConnectionOptions(options) {
  check(options, Object);
  Mongo._connectionOptions = options;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"mongo_utils.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/mongo_utils.js                                                                                       //
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
    let _objectWithoutProperties;
    module.link("@babel/runtime/helpers/objectWithoutProperties", {
      default(v) {
        _objectWithoutProperties = v;
      }
    }, 1);
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    const _excluded = ["fields", "projection"];
    module.export({
      normalizeProjection: () => normalizeProjection
    });
    const normalizeProjection = options => {
      // transform fields key in projection
      const _ref = options || {},
        {
          fields,
          projection
        } = _ref,
        otherOptions = _objectWithoutProperties(_ref, _excluded);
      // TODO: enable this comment when deprecating the fields option
      // Log.debug(`fields option has been deprecated, please use the new 'projection' instead`)

      return _objectSpread(_objectSpread({}, otherOptions), projection || fields ? {
        projection: fields || projection
      } : {});
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

},"observe_handle.ts":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/observe_handle.ts                                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  ObserveHandle: () => ObserveHandle
});
let nextObserveHandleId = 1;
/**
 * The "observe handle" returned from observeChanges.
 * Contains a reference to an ObserveMultiplexer.
 * Used to stop observation and clean up resources.
 */
class ObserveHandle {
  constructor(multiplexer, callbacks, nonMutatingCallbacks) {
    this._id = void 0;
    this._multiplexer = void 0;
    this.nonMutatingCallbacks = void 0;
    this._stopped = void 0;
    this.initialAddsSentResolver = () => {};
    this.initialAddsSent = void 0;
    this._added = void 0;
    this._addedBefore = void 0;
    this._changed = void 0;
    this._movedBefore = void 0;
    this._removed = void 0;
    /**
     * Using property syntax and arrow function syntax to avoid binding the wrong context on callbacks.
     */
    this.stop = async () => {
      if (this._stopped) return;
      this._stopped = true;
      await this._multiplexer.removeHandle(this._id);
    };
    this._multiplexer = multiplexer;
    multiplexer.callbackNames().forEach(name => {
      if (callbacks[name]) {
        this["_".concat(name)] = callbacks[name];
        return;
      }
      if (name === "addedBefore" && callbacks.added) {
        this._addedBefore = async function (id, fields, before) {
          await callbacks.added(id, fields);
        };
      }
    });
    this._stopped = false;
    this._id = nextObserveHandleId++;
    this.nonMutatingCallbacks = nonMutatingCallbacks;
    this.initialAddsSent = new Promise(resolve => {
      const ready = () => {
        resolve();
        this.initialAddsSent = Promise.resolve();
      };
      const timeout = setTimeout(ready, 30000);
      this.initialAddsSentResolver = () => {
        ready();
        clearTimeout(timeout);
      };
    });
  }
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"lodash.isempty":{"package.json":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/mongo/node_modules/lodash.isempty/package.json                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "lodash.isempty",
  "version": "4.4.0"
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/mongo/node_modules/lodash.isempty/index.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"lodash.clone":{"package.json":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/mongo/node_modules/lodash.clone/package.json                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "lodash.clone",
  "version": "4.5.0"
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/mongo/node_modules/lodash.clone/index.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"lodash.has":{"package.json":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/mongo/node_modules/lodash.has/package.json                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "lodash.has",
  "version": "4.5.2"
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/mongo/node_modules/lodash.has/index.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"lodash.throttle":{"package.json":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/mongo/node_modules/lodash.throttle/package.json                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "lodash.throttle",
  "version": "4.1.1"
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/mongo/node_modules/lodash.throttle/index.js                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"mongodb-uri":{"package.json":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/mongo/node_modules/mongodb-uri/package.json                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "mongodb-uri",
  "version": "0.9.7",
  "main": "mongodb-uri"
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"mongodb-uri.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/mongo/node_modules/mongodb-uri/mongodb-uri.js                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"lodash.once":{"package.json":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/mongo/node_modules/lodash.once/package.json                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "lodash.once",
  "version": "4.1.1"
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/mongo/node_modules/lodash.once/index.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json",
    ".ts"
  ]
});


/* Exports */
return {
  export: function () { return {
      MongoInternals: MongoInternals,
      Mongo: Mongo,
      ObserveMultiplexer: ObserveMultiplexer
    };},
  require: require,
  eagerModulePaths: [
    "/node_modules/meteor/mongo/mongo_driver.js",
    "/node_modules/meteor/mongo/oplog_tailing.ts",
    "/node_modules/meteor/mongo/observe_multiplex.ts",
    "/node_modules/meteor/mongo/doc_fetcher.js",
    "/node_modules/meteor/mongo/polling_observe_driver.ts",
    "/node_modules/meteor/mongo/oplog_observe_driver.js",
    "/node_modules/meteor/mongo/oplog_v2_converter.ts",
    "/node_modules/meteor/mongo/cursor_description.ts",
    "/node_modules/meteor/mongo/mongo_connection.js",
    "/node_modules/meteor/mongo/mongo_common.js",
    "/node_modules/meteor/mongo/asynchronous_cursor.js",
    "/node_modules/meteor/mongo/cursor.ts",
    "/node_modules/meteor/mongo/local_collection_driver.js",
    "/node_modules/meteor/mongo/remote_collection_driver.ts",
    "/node_modules/meteor/mongo/collection/collection.js",
    "/node_modules/meteor/mongo/connection_options.ts"
  ]
}});

//# sourceURL=meteor://💻app/packages/mongo.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vbW9uZ29fZHJpdmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9vcGxvZ190YWlsaW5nLnRzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9vYnNlcnZlX211bHRpcGxleC50cyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vZG9jX2ZldGNoZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21vbmdvL3BvbGxpbmdfb2JzZXJ2ZV9kcml2ZXIudHMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21vbmdvL29wbG9nX29ic2VydmVfZHJpdmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9vcGxvZ192Ml9jb252ZXJ0ZXIudHMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21vbmdvL2N1cnNvcl9kZXNjcmlwdGlvbi50cyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vbW9uZ29fY29ubmVjdGlvbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vbW9uZ29fY29tbW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9hc3luY2hyb25vdXNfY3Vyc29yLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9jdXJzb3IudHMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21vbmdvL2xvY2FsX2NvbGxlY3Rpb25fZHJpdmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9yZW1vdGVfY29sbGVjdGlvbl9kcml2ZXIudHMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21vbmdvL2NvbGxlY3Rpb24vY29sbGVjdGlvbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vY29sbGVjdGlvbi9jb2xsZWN0aW9uX3V0aWxzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9jb2xsZWN0aW9uL21ldGhvZHNfYXN5bmMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21vbmdvL2NvbGxlY3Rpb24vbWV0aG9kc19pbmRleC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vY29sbGVjdGlvbi9tZXRob2RzX3JlcGxpY2F0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9jb2xsZWN0aW9uL21ldGhvZHNfc3luYy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vY29ubmVjdGlvbl9vcHRpb25zLnRzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9tb25nb191dGlscy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vb2JzZXJ2ZV9oYW5kbGUudHMiXSwibmFtZXMiOlsibW9kdWxlMSIsImV4cG9ydCIsImxpc3RlbkFsbCIsImZvckVhY2hUcmlnZ2VyIiwiT3Bsb2dIYW5kbGUiLCJsaW5rIiwidiIsIk1vbmdvQ29ubmVjdGlvbiIsIk9wbG9nT2JzZXJ2ZURyaXZlciIsIk1vbmdvREIiLCJfX3JlaWZ5V2FpdEZvckRlcHNfXyIsIk1vbmdvSW50ZXJuYWxzIiwiZ2xvYmFsIiwiX19wYWNrYWdlTmFtZSIsIk5wbU1vZHVsZXMiLCJtb25nb2RiIiwidmVyc2lvbiIsIk5wbU1vZHVsZU1vbmdvZGJWZXJzaW9uIiwibW9kdWxlIiwiTnBtTW9kdWxlIiwiUHJveHkiLCJnZXQiLCJ0YXJnZXQiLCJwcm9wZXJ0eUtleSIsInJlY2VpdmVyIiwiTWV0ZW9yIiwiZGVwcmVjYXRlIiwiUmVmbGVjdCIsIkNvbm5lY3Rpb24iLCJUaW1lc3RhbXAiLCJwcm90b3R5cGUiLCJjbG9uZSIsImN1cnNvckRlc2NyaXB0aW9uIiwibGlzdGVuQ2FsbGJhY2siLCJsaXN0ZW5lcnMiLCJ0cmlnZ2VyIiwicHVzaCIsIkREUFNlcnZlciIsIl9JbnZhbGlkYXRpb25Dcm9zc2JhciIsImxpc3RlbiIsInN0b3AiLCJmb3JFYWNoIiwibGlzdGVuZXIiLCJ0cmlnZ2VyQ2FsbGJhY2siLCJrZXkiLCJjb2xsZWN0aW9uIiwiY29sbGVjdGlvbk5hbWUiLCJzcGVjaWZpY0lkcyIsIkxvY2FsQ29sbGVjdGlvbiIsIl9pZHNNYXRjaGVkQnlTZWxlY3RvciIsInNlbGVjdG9yIiwiaWQiLCJPYmplY3QiLCJhc3NpZ24iLCJkcm9wQ29sbGVjdGlvbiIsImRyb3BEYXRhYmFzZSIsIk1vbmdvVGltZXN0YW1wIiwiX19yZWlmeV9hc3luY19yZXN1bHRfXyIsIl9yZWlmeUVycm9yIiwic2VsZiIsImFzeW5jIiwiT1BMT0dfQ09MTEVDVElPTiIsImlkRm9yT3AiLCJpc0VtcHR5IiwiZGVmYXVsdCIsIkN1cnNvckRlc2NyaXB0aW9uIiwiTnBtTW9kdWxlTW9uZ29kYiIsIkxvbmciLCJUT09fRkFSX0JFSElORCIsInByb2Nlc3MiLCJlbnYiLCJNRVRFT1JfT1BMT0dfVE9PX0ZBUl9CRUhJTkQiLCJUQUlMX1RJTUVPVVQiLCJNRVRFT1JfT1BMT0dfVEFJTF9USU1FT1VUIiwiY29uc3RydWN0b3IiLCJvcGxvZ1VybCIsImRiTmFtZSIsIl9NZXRlb3Ikc2V0dGluZ3MiLCJfTWV0ZW9yJHNldHRpbmdzJHBhY2siLCJfTWV0ZW9yJHNldHRpbmdzJHBhY2syIiwiX01ldGVvciRzZXR0aW5nczIiLCJfTWV0ZW9yJHNldHRpbmdzMiRwYWMiLCJfTWV0ZW9yJHNldHRpbmdzMiRwYWMyIiwiX29wbG9nVXJsIiwiX2RiTmFtZSIsIl9vcGxvZ0xhc3RFbnRyeUNvbm5lY3Rpb24iLCJfb3Bsb2dUYWlsQ29ubmVjdGlvbiIsIl9vcGxvZ09wdGlvbnMiLCJfc3RvcHBlZCIsIl90YWlsSGFuZGxlIiwiX3JlYWR5UHJvbWlzZVJlc29sdmVyIiwiX3JlYWR5UHJvbWlzZSIsIl9jcm9zc2JhciIsIl9jYXRjaGluZ1VwUmVzb2x2ZXJzIiwiX2xhc3RQcm9jZXNzZWRUUyIsIl9vblNraXBwZWRFbnRyaWVzSG9vayIsIl9zdGFydFRyYWlsaW5nUHJvbWlzZSIsIl9yZXNvbHZlVGltZW91dCIsIl9lbnRyeVF1ZXVlIiwiX0RvdWJsZUVuZGVkUXVldWUiLCJfd29ya2VyQWN0aXZlIiwiX3dvcmtlclByb21pc2UiLCJQcm9taXNlIiwiciIsIl9Dcm9zc2JhciIsImZhY3RQYWNrYWdlIiwiZmFjdE5hbWUiLCJpbmNsdWRlQ29sbGVjdGlvbnMiLCJzZXR0aW5ncyIsInBhY2thZ2VzIiwibW9uZ28iLCJvcGxvZ0luY2x1ZGVDb2xsZWN0aW9ucyIsImV4Y2x1ZGVDb2xsZWN0aW9ucyIsIm9wbG9nRXhjbHVkZUNvbGxlY3Rpb25zIiwibGVuZ3RoIiwiRXJyb3IiLCJIb29rIiwiZGVidWdQcmludEV4Y2VwdGlvbnMiLCJfc3RhcnRUYWlsaW5nIiwiX2dldE9wbG9nU2VsZWN0b3IiLCJsYXN0UHJvY2Vzc2VkVFMiLCJfdGhpcyRfb3Bsb2dPcHRpb25zJGUiLCJfdGhpcyRfb3Bsb2dPcHRpb25zJGkiLCJvcGxvZ0NyaXRlcmlhIiwiJG9yIiwib3AiLCIkaW4iLCIkZXhpc3RzIiwibnNSZWdleCIsIlJlZ0V4cCIsIl9lc2NhcGVSZWdFeHAiLCJqb2luIiwibnMiLCIkcmVnZXgiLCIkbmluIiwibWFwIiwiY29sbE5hbWUiLCJjb25jYXQiLCJ0cyIsIiRndCIsIiRhbmQiLCJfb25PcGxvZ0VudHJ5IiwiY2FsbGJhY2siLCJvcmlnaW5hbENhbGxiYWNrIiwiYmluZEVudmlyb25tZW50Iiwibm90aWZpY2F0aW9uIiwiZXJyIiwiX2RlYnVnIiwibGlzdGVuSGFuZGxlIiwib25PcGxvZ0VudHJ5Iiwib25Ta2lwcGVkRW50cmllcyIsInJlZ2lzdGVyIiwiX3dhaXRVbnRpbENhdWdodFVwIiwibGFzdEVudHJ5Iiwib3Bsb2dTZWxlY3RvciIsImZpbmRPbmVBc3luYyIsInByb2plY3Rpb24iLCJzb3J0IiwiJG5hdHVyYWwiLCJlIiwic2xlZXAiLCJKU09OIiwic3RyaW5naWZ5IiwibGVzc1RoYW5PckVxdWFsIiwiaW5zZXJ0QWZ0ZXIiLCJncmVhdGVyVGhhbiIsInByb21pc2VSZXNvbHZlciIsInByb21pc2VUb0F3YWl0IiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsImNvbnNvbGUiLCJlcnJvciIsInNwbGljZSIsInJlc29sdmVyIiwid2FpdFVudGlsQ2F1Z2h0VXAiLCJtb25nb2RiVXJpIiwicmVxdWlyZSIsInBhcnNlIiwiZGF0YWJhc2UiLCJtYXhQb29sU2l6ZSIsIm1pblBvb2xTaXplIiwiaXNNYXN0ZXJEb2MiLCJkYiIsImFkbWluIiwiY29tbWFuZCIsImlzbWFzdGVyIiwic2V0TmFtZSIsImxhc3RPcGxvZ0VudHJ5IiwidGFpbGFibGUiLCJ0YWlsIiwiZG9jIiwiX21heWJlU3RhcnRXb3JrZXIiLCJwb3AiLCJjbGVhciIsImVhY2giLCJfc2V0TGFzdFByb2Nlc3NlZFRTIiwic2hpZnQiLCJoYW5kbGVEb2MiLCJzZXF1ZW5jZXIiLCJfZGVmaW5lVG9vRmFyQmVoaW5kIiwidmFsdWUiLCJfcmVzZXRUb29GYXJCZWhpbmQiLCJvIiwiX2lkIiwibzIiLCJoYW5kbGUiLCJhcHBseU9wcyIsIm5leHRUaW1lc3RhbXAiLCJhZGQiLCJPTkUiLCJzdGFydHNXaXRoIiwic2xpY2UiLCJkcm9wIiwiZmlyZSIsInJlc29sdmUiLCJzZXRJbW1lZGlhdGUiLCJfb2JqZWN0V2l0aG91dFByb3BlcnRpZXMiLCJfZXhjbHVkZWQiLCJPYnNlcnZlTXVsdGlwbGV4ZXIiLCJfcmVmIiwiX3RoaXMiLCJvcmRlcmVkIiwib25TdG9wIiwiX29yZGVyZWQiLCJfb25TdG9wIiwiX3F1ZXVlIiwiX2hhbmRsZXMiLCJfcmVzb2x2ZXIiLCJfaXNSZWFkeSIsIl9jYWNoZSIsIl9hZGRIYW5kbGVUYXNrc1NjaGVkdWxlZEJ1dE5vdFBlcmZvcm1lZCIsInVuZGVmaW5lZCIsIlBhY2thZ2UiLCJGYWN0cyIsImluY3JlbWVudFNlcnZlckZhY3QiLCJfQXN5bmNocm9ub3VzUXVldWUiLCJ0aGVuIiwiX0NhY2hpbmdDaGFuZ2VPYnNlcnZlciIsImNhbGxiYWNrTmFtZXMiLCJjYWxsYmFja05hbWUiLCJfbGVuIiwiYXJndW1lbnRzIiwiYXJncyIsIkFycmF5IiwiX2tleSIsIl9hcHBseUNhbGxiYWNrIiwiYWRkSGFuZGxlQW5kU2VuZEluaXRpYWxBZGRzIiwiX2FkZEhhbmRsZUFuZFNlbmRJbml0aWFsQWRkcyIsInJ1blRhc2siLCJfc2VuZEFkZHMiLCJyZW1vdmVIYW5kbGUiLCJfcmVhZHkiLCJfc3RvcCIsIm9wdGlvbnMiLCJmcm9tUXVlcnlFcnJvciIsInJlYWR5IiwicXVldWVUYXNrIiwicXVlcnlFcnJvciIsIm9uRmx1c2giLCJjYiIsImFwcGx5Q2hhbmdlIiwiYXBwbHkiLCJoYW5kbGVJZCIsImtleXMiLCJyZXN1bHQiLCJub25NdXRhdGluZ0NhbGxiYWNrcyIsIkVKU09OIiwiX2lzUHJvbWlzZSIsImNhdGNoIiwiaW5pdGlhbEFkZHNTZW50IiwiX2FkZGVkQmVmb3JlIiwiX2FkZGVkIiwiYWRkUHJvbWlzZXMiLCJkb2NzIiwiX3JlZjIiLCJmaWVsZHMiLCJwcm9taXNlIiwicmVqZWN0IiwiYWxsU2V0dGxlZCIsInAiLCJzdGF0dXMiLCJyZWFzb24iLCJpbml0aWFsQWRkc1NlbnRSZXNvbHZlciIsIkRvY0ZldGNoZXIiLCJtb25nb0Nvbm5lY3Rpb24iLCJfbW9uZ29Db25uZWN0aW9uIiwiX2NhbGxiYWNrc0Zvck9wIiwiTWFwIiwiZmV0Y2giLCJjaGVjayIsIlN0cmluZyIsImhhcyIsImNhbGxiYWNrcyIsInNldCIsImRlbGV0ZSIsIlBvbGxpbmdPYnNlcnZlRHJpdmVyIiwidGhyb3R0bGUiLCJQT0xMSU5HX1RIUk9UVExFX01TIiwiTUVURU9SX1BPTExJTkdfVEhST1RUTEVfTVMiLCJQT0xMSU5HX0lOVEVSVkFMX01TIiwiTUVURU9SX1BPTExJTkdfSU5URVJWQUxfTVMiLCJfb3B0aW9ucyIsIl9jdXJzb3JEZXNjcmlwdGlvbiIsIl9tb25nb0hhbmRsZSIsIl9tdWx0aXBsZXhlciIsIl9zdG9wQ2FsbGJhY2tzIiwiX2N1cnNvciIsIl9yZXN1bHRzIiwiX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCIsIl9wZW5kaW5nV3JpdGVzIiwiX2Vuc3VyZVBvbGxJc1NjaGVkdWxlZCIsIl90YXNrUXVldWUiLCJfdGVzdE9ubHlQb2xsQ2FsbGJhY2siLCJtb25nb0hhbmRsZSIsIm11bHRpcGxleGVyIiwiX2NyZWF0ZUFzeW5jaHJvbm91c0N1cnNvciIsIl91bnRocm90dGxlZEVuc3VyZVBvbGxJc1NjaGVkdWxlZCIsImJpbmQiLCJwb2xsaW5nVGhyb3R0bGVNcyIsIl9pbml0IiwiX1BhY2thZ2UkZmFjdHNCYXNlIiwibGlzdGVuZXJzSGFuZGxlIiwiZmVuY2UiLCJfZ2V0Q3VycmVudEZlbmNlIiwiYmVnaW5Xcml0ZSIsInBvbGxpbmdJbnRlcnZhbCIsInBvbGxpbmdJbnRlcnZhbE1zIiwiX3BvbGxpbmdJbnRlcnZhbCIsImludGVydmFsSGFuZGxlIiwic2V0SW50ZXJ2YWwiLCJjbGVhckludGVydmFsIiwiX3BvbGxNb25nbyIsIl9zdXNwZW5kUG9sbGluZyIsIl9yZXN1bWVQb2xsaW5nIiwiX3RoaXMkX3Rlc3RPbmx5UG9sbENhIiwiZmlyc3QiLCJuZXdSZXN1bHRzIiwib2xkUmVzdWx0cyIsIl9JZE1hcCIsImNhbGwiLCJ3cml0ZXNGb3JDeWNsZSIsImdldFJhd09iamVjdHMiLCJjb2RlIiwibWVzc2FnZSIsIl9kaWZmUXVlcnlDaGFuZ2VzIiwidyIsImNvbW1pdHRlZCIsIl9QYWNrYWdlJGZhY3RzQmFzZTIiLCJfYXN5bmNJdGVyYXRvciIsIm9wbG9nVjJWMUNvbnZlcnRlciIsIk1hdGNoIiwiQ3Vyc29yIiwiUEhBU0UiLCJRVUVSWUlORyIsIkZFVENISU5HIiwiU1RFQURZIiwiU3dpdGNoZWRUb1F1ZXJ5IiwiZmluaXNoSWZOZWVkVG9Qb2xsUXVlcnkiLCJmIiwiY3VycmVudElkIiwiX3VzZXNPcGxvZyIsInNvcnRlciIsImNvbXBhcmF0b3IiLCJnZXRDb21wYXJhdG9yIiwibGltaXQiLCJoZWFwT3B0aW9ucyIsIklkTWFwIiwiX2xpbWl0IiwiX2NvbXBhcmF0b3IiLCJfc29ydGVyIiwiX3VucHVibGlzaGVkQnVmZmVyIiwiTWluTWF4SGVhcCIsIl9wdWJsaXNoZWQiLCJNYXhIZWFwIiwiX3NhZmVBcHBlbmRUb0J1ZmZlciIsIl9zdG9wSGFuZGxlcyIsIl9hZGRTdG9wSGFuZGxlcyIsIm5ld1N0b3BIYW5kbGVzIiwiZXhwZWN0ZWRQYXR0ZXJuIiwiT2JqZWN0SW5jbHVkaW5nIiwiRnVuY3Rpb24iLCJPbmVPZiIsIl9yZWdpc3RlclBoYXNlQ2hhbmdlIiwiX21hdGNoZXIiLCJtYXRjaGVyIiwiX3Byb2plY3Rpb25GbiIsIl9jb21waWxlUHJvamVjdGlvbiIsIl9zaGFyZWRQcm9qZWN0aW9uIiwiY29tYmluZUludG9Qcm9qZWN0aW9uIiwiX3NoYXJlZFByb2plY3Rpb25GbiIsIl9uZWVkVG9GZXRjaCIsIl9jdXJyZW50bHlGZXRjaGluZyIsIl9mZXRjaEdlbmVyYXRpb24iLCJfcmVxdWVyeVdoZW5Eb25lVGhpc1F1ZXJ5IiwiX3dyaXRlc1RvQ29tbWl0V2hlbldlUmVhY2hTdGVhZHkiLCJfb3Bsb2dIYW5kbGUiLCJfbmVlZFRvUG9sbFF1ZXJ5IiwiX3BoYXNlIiwiX2hhbmRsZU9wbG9nRW50cnlRdWVyeWluZyIsIl9oYW5kbGVPcGxvZ0VudHJ5U3RlYWR5T3JGZXRjaGluZyIsImZpcmVkIiwiX29wbG9nT2JzZXJ2ZURyaXZlcnMiLCJvbkJlZm9yZUZpcmUiLCJkcml2ZXJzIiwiZHJpdmVyIiwidmFsdWVzIiwid3JpdGUiLCJfb25GYWlsb3ZlciIsIl9ydW5Jbml0aWFsUXVlcnkiLCJfYWRkUHVibGlzaGVkIiwiX25vWWllbGRzQWxsb3dlZCIsImFkZGVkIiwic2l6ZSIsIm92ZXJmbG93aW5nRG9jSWQiLCJtYXhFbGVtZW50SWQiLCJvdmVyZmxvd2luZ0RvYyIsImVxdWFscyIsInJlbW92ZSIsInJlbW92ZWQiLCJfYWRkQnVmZmVyZWQiLCJfcmVtb3ZlUHVibGlzaGVkIiwiZW1wdHkiLCJuZXdEb2NJZCIsIm1pbkVsZW1lbnRJZCIsIm5ld0RvYyIsIl9yZW1vdmVCdWZmZXJlZCIsIl9jaGFuZ2VQdWJsaXNoZWQiLCJvbGREb2MiLCJwcm9qZWN0ZWROZXciLCJwcm9qZWN0ZWRPbGQiLCJjaGFuZ2VkIiwiRGlmZlNlcXVlbmNlIiwibWFrZUNoYW5nZWRGaWVsZHMiLCJtYXhCdWZmZXJlZElkIiwiX2FkZE1hdGNoaW5nIiwibWF4UHVibGlzaGVkIiwibWF4QnVmZmVyZWQiLCJ0b1B1Ymxpc2giLCJjYW5BcHBlbmRUb0J1ZmZlciIsImNhbkluc2VydEludG9CdWZmZXIiLCJ0b0J1ZmZlciIsIl9yZW1vdmVNYXRjaGluZyIsIl9oYW5kbGVEb2MiLCJtYXRjaGVzTm93IiwiZG9jdW1lbnRNYXRjaGVzIiwicHVibGlzaGVkQmVmb3JlIiwiYnVmZmVyZWRCZWZvcmUiLCJjYWNoZWRCZWZvcmUiLCJtaW5CdWZmZXJlZCIsInN0YXlzSW5QdWJsaXNoZWQiLCJzdGF5c0luQnVmZmVyIiwiX2ZldGNoTW9kaWZpZWREb2N1bWVudHMiLCJkZWZlciIsInRoaXNHZW5lcmF0aW9uIiwiZmV0Y2hQcm9taXNlcyIsImZldGNoUHJvbWlzZSIsIl9kb2NGZXRjaGVyIiwicmVzdWx0cyIsImVycm9ycyIsImZpbHRlciIsIl9iZVN0ZWFkeSIsIndyaXRlcyIsImlzUmVwbGFjZSIsImNhbkRpcmVjdGx5TW9kaWZ5RG9jIiwibW9kaWZpZXJDYW5CZURpcmVjdGx5QXBwbGllZCIsIl9tb2RpZnkiLCJuYW1lIiwiY2FuQmVjb21lVHJ1ZUJ5TW9kaWZpZXIiLCJhZmZlY3RlZEJ5TW9kaWZpZXIiLCJfcnVuSW5pdGlhbFF1ZXJ5QXN5bmMiLCJfcnVuUXVlcnkiLCJpbml0aWFsIiwiX2RvbmVRdWVyeWluZyIsIl9wb2xsUXVlcnkiLCJfcnVuUXVlcnlBc3luYyIsIm5ld0J1ZmZlciIsImN1cnNvciIsIl9jdXJzb3JGb3JRdWVyeSIsImkiLCJfc2xlZXBGb3JNcyIsIl9wdWJsaXNoTmV3UmVzdWx0cyIsIm9wdGlvbnNPdmVyd3JpdGUiLCJ0cmFuc2Zvcm0iLCJkZXNjcmlwdGlvbiIsImlkc1RvUmVtb3ZlIiwiX29wbG9nRW50cnlIYW5kbGUiLCJfbGlzdGVuZXJzSGFuZGxlIiwiX2l0ZXJhdG9yQWJydXB0Q29tcGxldGlvbiIsIl9kaWRJdGVyYXRvckVycm9yIiwiX2l0ZXJhdG9yRXJyb3IiLCJfaXRlcmF0b3IiLCJfc3RlcCIsIm5leHQiLCJkb25lIiwicmV0dXJuIiwicGhhc2UiLCJub3ciLCJEYXRlIiwidGltZURpZmYiLCJfcGhhc2VTdGFydFRpbWUiLCJjdXJzb3JTdXBwb3J0ZWQiLCJkaXNhYmxlT3Bsb2ciLCJfZGlzYWJsZU9wbG9nIiwic2tpcCIsIl9jaGVja1N1cHBvcnRlZFByb2plY3Rpb24iLCJoYXNXaGVyZSIsImhhc0dlb1F1ZXJ5IiwibW9kaWZpZXIiLCJlbnRyaWVzIiwiZXZlcnkiLCJvcGVyYXRpb24iLCJmaWVsZCIsInRlc3QiLCJhcnJheU9wZXJhdG9yS2V5UmVnZXgiLCJpc0FycmF5T3BlcmF0b3JLZXkiLCJpc0FycmF5T3BlcmF0b3IiLCJvcGVyYXRvciIsImEiLCJwcmVmaXgiLCJmbGF0dGVuT2JqZWN0SW50byIsInNvdXJjZSIsImlzQXJyYXkiLCJNb25nbyIsIk9iamVjdElEIiwiX2lzQ3VzdG9tVHlwZSIsImNvbnZlcnRPcGxvZ0RpZmYiLCJvcGxvZ0VudHJ5IiwiZGlmZiIsImRpZmZLZXkiLCJfb3Bsb2dFbnRyeSQkdW5zZXQiLCIkdW5zZXQiLCJfb3Bsb2dFbnRyeSQkc2V0IiwiJHNldCIsIl9vcGxvZ0VudHJ5JCRzZXQyIiwiX3JlZjMiLCJmaWVsZFZhbHVlIiwiX3JlZjQiLCJwb3NpdGlvbiIsInBvc2l0aW9uS2V5IiwiX29wbG9nRW50cnkkJHVuc2V0MiIsIl9vcGxvZ0VudHJ5JCRzZXQzIiwiJHYiLCJjb252ZXJ0ZWRPcGxvZ0VudHJ5IiwiQ29sbGVjdGlvbiIsIl9yZXdyaXRlU2VsZWN0b3IiLCJfb2JqZWN0U3ByZWFkIiwiQ0xJRU5UX09OTFlfTUVUSE9EUyIsImdldEFzeW5jTWV0aG9kTmFtZSIsIk1pbmlNb25nb1F1ZXJ5RXJyb3IiLCJwYXRoIiwiQXN5bmNocm9ub3VzQ3Vyc29yIiwicmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28iLCJyZXBsYWNlVHlwZXMiLCJ0cmFuc2Zvcm1SZXN1bHQiLCJPYnNlcnZlSGFuZGxlIiwiRklMRV9BU1NFVF9TVUZGSVgiLCJBU1NFVFNfRk9MREVSIiwiQVBQX0ZPTERFUiIsIm9wbG9nQ29sbGVjdGlvbldhcm5pbmdzIiwidXJsIiwiX29ic2VydmVNdWx0aXBsZXhlcnMiLCJfb25GYWlsb3Zlckhvb2siLCJ1c2VyT3B0aW9ucyIsIl9jb25uZWN0aW9uT3B0aW9ucyIsIm1vbmdvT3B0aW9ucyIsImlnbm9yZVVuZGVmaW5lZCIsImVuZHNXaXRoIiwib3B0aW9uTmFtZSIsInJlcGxhY2UiLCJBc3NldHMiLCJnZXRTZXJ2ZXJEaXIiLCJkcml2ZXJJbmZvIiwicmVsZWFzZSIsImNsaWVudCIsIk1vbmdvQ2xpZW50Iiwib24iLCJldmVudCIsInByZXZpb3VzRGVzY3JpcHRpb24iLCJ0eXBlIiwibmV3RGVzY3JpcHRpb24iLCJkYXRhYmFzZU5hbWUiLCJfY2xvc2UiLCJvcGxvZ0hhbmRsZSIsImNsb3NlIiwiX3NldE9wbG9nSGFuZGxlIiwicmF3Q29sbGVjdGlvbiIsImNyZWF0ZUNhcHBlZENvbGxlY3Rpb25Bc3luYyIsImJ5dGVTaXplIiwibWF4RG9jdW1lbnRzIiwiY3JlYXRlQ29sbGVjdGlvbiIsImNhcHBlZCIsIm1heCIsIl9tYXliZUJlZ2luV3JpdGUiLCJpbnNlcnRBc3luYyIsImNvbGxlY3Rpb25fbmFtZSIsImRvY3VtZW50IiwiX2V4cGVjdGVkQnlUZXN0IiwiX2lzUGxhaW5PYmplY3QiLCJyZWZyZXNoIiwiaW5zZXJ0T25lIiwic2FmZSIsImluc2VydGVkSWQiLCJfcmVmcmVzaCIsInJlZnJlc2hLZXkiLCJyZW1vdmVBc3luYyIsImRlbGV0ZU1hbnkiLCJkZWxldGVkQ291bnQiLCJtb2RpZmllZENvdW50IiwibnVtYmVyQWZmZWN0ZWQiLCJkcm9wQ29sbGVjdGlvbkFzeW5jIiwiZHJvcERhdGFiYXNlQXN5bmMiLCJfZHJvcERhdGFiYXNlIiwidXBkYXRlQXN5bmMiLCJtb2QiLCJtb25nb09wdHMiLCJhcnJheUZpbHRlcnMiLCJ1cHNlcnQiLCJtdWx0aSIsImZ1bGxSZXN1bHQiLCJtb25nb1NlbGVjdG9yIiwibW9uZ29Nb2QiLCJpc01vZGlmeSIsIl9pc01vZGlmaWNhdGlvbk1vZCIsIl9mb3JiaWRSZXBsYWNlIiwia25vd25JZCIsIl9jcmVhdGVVcHNlcnREb2N1bWVudCIsImdlbmVyYXRlZElkIiwic2ltdWxhdGVVcHNlcnRXaXRoSW5zZXJ0ZWRJZCIsIl9yZXR1cm5PYmplY3QiLCJoYXNPd25Qcm9wZXJ0eSIsIiRzZXRPbkluc2VydCIsInN0cmluZ3MiLCJ1cGRhdGVNZXRob2QiLCJtZXRlb3JSZXN1bHQiLCJPYmplY3RJZCIsInRvSGV4U3RyaW5nIiwiX2lzQ2Fubm90Q2hhbmdlSWRFcnJvciIsImVycm1zZyIsImluZGV4T2YiLCJ1cHNlcnRBc3luYyIsImZpbmQiLCJjcmVhdGVJbmRleEFzeW5jIiwiaW5kZXgiLCJjcmVhdGVJbmRleCIsImNvdW50RG9jdW1lbnRzIiwiYXJnIiwiZXN0aW1hdGVkRG9jdW1lbnRDb3VudCIsIl9sZW4yIiwiX2tleTIiLCJlbnN1cmVJbmRleEFzeW5jIiwiZHJvcEluZGV4QXN5bmMiLCJpbmRleE5hbWUiLCJkcm9wSW5kZXgiLCJtIiwiTlVNX09QVElNSVNUSUNfVFJJRVMiLCJtb25nb09wdHNGb3JVcGRhdGUiLCJtb25nb09wdHNGb3JJbnNlcnQiLCJyZXBsYWNlbWVudFdpdGhJZCIsInRyaWVzIiwiZG9VcGRhdGUiLCJtZXRob2QiLCJ1cGRhdGVNYW55Iiwic29tZSIsInJlcGxhY2VPbmUiLCJ1cHNlcnRlZENvdW50IiwidXBzZXJ0ZWRJZCIsImRvQ29uZGl0aW9uYWxJbnNlcnQiLCJfb2JzZXJ2ZUNoYW5nZXNUYWlsYWJsZSIsImFkZGVkQmVmb3JlIiwic2VsZkZvckl0ZXJhdGlvbiIsInVzZVRyYW5zZm9ybSIsImN1cnNvck9wdGlvbnMiLCJyZWFkUHJlZmVyZW5jZSIsIm51bWJlck9mUmV0cmllcyIsImRiQ3Vyc29yIiwiYWRkQ3Vyc29yRmxhZyIsIm1heFRpbWVNcyIsIm1heFRpbWVNUyIsImhpbnQiLCJkb2NDYWxsYmFjayIsInRpbWVvdXRNUyIsInN0b3BwZWQiLCJsYXN0VFMiLCJsb29wIiwiX25leHRPYmplY3RQcm9taXNlV2l0aFRpbWVvdXQiLCJuZXdTZWxlY3RvciIsIl9vYnNlcnZlQ2hhbmdlcyIsIl9zZWxmJF9vcGxvZ0hhbmRsZSIsImZpZWxkc09wdGlvbnMiLCJvYnNlcnZlS2V5Iiwib2JzZXJ2ZURyaXZlciIsImZpcnN0SGFuZGxlIiwib2JzZXJ2ZUhhbmRsZSIsIm9wbG9nT3B0aW9ucyIsImNhblVzZU9wbG9nIiwiaW5jbHVkZXMiLCJ3YXJuIiwiTWluaW1vbmdvIiwiTWF0Y2hlciIsImlzQ2xpZW50IiwiU29ydGVyIiwiZHJpdmVyQ2xhc3MiLCJfb2JzZXJ2ZURyaXZlciIsIndyaXRlQ2FsbGJhY2siLCJyZXBsYWNlTW9uZ29BdG9tV2l0aE1ldGVvciIsInJlcGxhY2VOYW1lcyIsInJlZnJlc2hFcnIiLCJkcml2ZXJSZXN1bHQiLCJtb25nb1Jlc3VsdCIsIm4iLCJtYXRjaGVkQ291bnQiLCJpc0JpbmFyeSIsIkJpbmFyeSIsIkJ1ZmZlciIsImZyb20iLCJEZWNpbWFsIiwiRGVjaW1hbDEyOCIsImZyb21TdHJpbmciLCJ0b1N0cmluZyIsIm1ha2VNb25nb0xlZ2FsIiwidG9KU09OVmFsdWUiLCJhdG9tVHJhbnNmb3JtZXIiLCJyZXBsYWNlZFRvcExldmVsQXRvbSIsInJldCIsInZhbCIsInZhbFJlcGxhY2VkIiwic3ViX3R5cGUiLCJidWZmZXIiLCJVaW50OEFycmF5IiwiZnJvbUpTT05WYWx1ZSIsInVubWFrZU1vbmdvTGVnYWwiLCJzdWJzdHIiLCJ0aGluZyIsIl9jbG9zaW5nIiwiX3BlbmRpbmdOZXh0IiwiX2RiQ3Vyc29yIiwiX3NlbGZGb3JJdGVyYXRpb24iLCJfdHJhbnNmb3JtIiwid3JhcFRyYW5zZm9ybSIsIl92aXNpdGVkSWRzIiwiU3ltYm9sIiwiYXN5bmNJdGVyYXRvciIsIl9uZXh0T2JqZWN0UHJvbWlzZSIsIl9yYXdOZXh0T2JqZWN0UHJvbWlzZSIsIm5leHRPYmplY3RQcm9taXNlIiwidGltZW91dFByb21pc2UiLCJ0aW1lb3V0SWQiLCJmaW5hbGx5IiwicmFjZSIsInRoaXNBcmciLCJfcmV3aW5kIiwiaWR4IiwicmV3aW5kIiwiY291bnQiLCJBU1lOQ19DVVJTT1JfTUVUSE9EUyIsIl9tb25nbyIsIl9zeW5jaHJvbm91c0N1cnNvciIsImNvdW50QXN5bmMiLCJnZXRUcmFuc2Zvcm0iLCJfcHVibGlzaEN1cnNvciIsInN1YiIsIl9nZXRDb2xsZWN0aW9uTmFtZSIsIm9ic2VydmUiLCJfb2JzZXJ2ZUZyb21PYnNlcnZlQ2hhbmdlcyIsIm9ic2VydmVBc3luYyIsIm9ic2VydmVDaGFuZ2VzIiwiX29ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzQXJlT3JkZXJlZCIsIm9ic2VydmVDaGFuZ2VzQXN5bmMiLCJpdGVyYXRvciIsIm1ldGhvZE5hbWUiLCJzZXR1cEFzeW5jaHJvbm91c0N1cnNvciIsIm1ldGhvZE5hbWVBc3luYyIsIkxvY2FsQ29sbGVjdGlvbkRyaXZlciIsIm5vQ29ubkNvbGxlY3Rpb25zIiwiY3JlYXRlIiwib3BlbiIsImNvbm4iLCJlbnN1cmVDb2xsZWN0aW9uIiwiX21vbmdvX2xpdmVkYXRhX2NvbGxlY3Rpb25zIiwiY29sbGVjdGlvbnMiLCJSZW1vdGVDb2xsZWN0aW9uRHJpdmVyIiwib25jZSIsIkFTWU5DX0NPTExFQ1RJT05fTUVUSE9EUyIsIm1vbmdvVXJsIiwiUkVNT1RFX0NPTExFQ1RJT05fTUVUSE9EUyIsIm1vbmdvTWV0aG9kIiwiYXN5bmNNZXRob2ROYW1lIiwiZGVmYXVsdFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIiLCJjb25uZWN0aW9uT3B0aW9ucyIsIk1PTkdPX1VSTCIsIk1PTkdPX09QTE9HX1VSTCIsInN0YXJ0dXAiLCJjb25uZWN0Iiwibm9ybWFsaXplUHJvamVjdGlvbiIsIkFzeW5jTWV0aG9kcyIsIlN5bmNNZXRob2RzIiwiSW5kZXhNZXRob2RzIiwiSURfR0VORVJBVE9SUyIsIm5vcm1hbGl6ZU9wdGlvbnMiLCJzZXR1cEF1dG9wdWJsaXNoIiwic2V0dXBDb25uZWN0aW9uIiwic2V0dXBEcml2ZXIiLCJzZXR1cE11dGF0aW9uTWV0aG9kcyIsInZhbGlkYXRlQ29sbGVjdGlvbk5hbWUiLCJSZXBsaWNhdGlvbk1ldGhvZHMiLCJfSURfR0VORVJBVE9SUyRvcHRpb24iLCJfSURfR0VORVJBVE9SUyIsIl9tYWtlTmV3SUQiLCJpZEdlbmVyYXRpb24iLCJyZXNvbHZlclR5cGUiLCJfY29ubmVjdGlvbiIsIl9kcml2ZXIiLCJfY29sbGVjdGlvbiIsIl9uYW1lIiwiX3NldHRpbmdVcFJlcGxpY2F0aW9uUHJvbWlzZSIsIl9tYXliZVNldFVwUmVwbGljYXRpb24iLCJfY29sbGVjdGlvbnMiLCJfZ2V0RmluZFNlbGVjdG9yIiwiX2dldEZpbmRPcHRpb25zIiwibmV3T3B0aW9ucyIsIk9wdGlvbmFsIiwiTnVtYmVyIiwiZmFsbGJhY2tJZCIsIl9zZWxlY3RvcklzSWQiLCJSYW5kb20iLCJfaXNSZW1vdGVDb2xsZWN0aW9uIiwic2VydmVyIiwicmF3RGF0YWJhc2UiLCJnZXRDb2xsZWN0aW9uIiwiTW9uZ29JRCIsIkFsbG93RGVueSIsIkNvbGxlY3Rpb25Qcm90b3R5cGUiLCJNT05HTyIsInNyYyIsIkREUCIsInJhbmRvbVN0cmVhbSIsImluc2VjdXJlIiwiaGV4U3RyaW5nIiwiU1RSSU5HIiwiY29ubmVjdGlvbiIsImF1dG9wdWJsaXNoIiwiX3ByZXZlbnRBdXRvcHVibGlzaCIsInB1Ymxpc2giLCJpc19hdXRvIiwiZGVmaW5lTXV0YXRpb25NZXRob2RzIiwiX2RlZmluZU11dGF0aW9uTWV0aG9kcyIsInVzZUV4aXN0aW5nIiwiX3N1cHByZXNzU2FtZU5hbWVFcnJvciIsIm1ldGhvZHMiLCJtYW5hZ2VyIiwiY2xlYW5lZE9wdGlvbnMiLCJmcm9tRW50cmllcyIsIl8iLCJfaW5zZXJ0QXN5bmMiLCJnZXRQcm90b3R5cGVPZiIsImdldE93blByb3BlcnR5RGVzY3JpcHRvcnMiLCJnZW5lcmF0ZUlkIiwiZW5jbG9zaW5nIiwiX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uIiwiY2hvb3NlUmV0dXJuVmFsdWVGcm9tQ29sbGVjdGlvblJlc3VsdCIsIl9jYWxsTXV0YXRvck1ldGhvZEFzeW5jIiwic3R1YlByb21pc2UiLCJzZXJ2ZXJQcm9taXNlIiwiTG9nIiwiZGVidWciLCJyZUNyZWF0ZUluZGV4T25PcHRpb25NaXNtYXRjaCIsImluZm8iLCJfcmVnaXN0ZXJTdG9yZVJlc3VsdCIsIl9yZWdpc3RlclN0b3JlUmVzdWx0JCIsInJlZ2lzdGVyU3RvcmVDbGllbnQiLCJyZWdpc3RlclN0b3JlU2VydmVyIiwid3JhcHBlZFN0b3JlQ29tbW9uIiwic2F2ZU9yaWdpbmFscyIsInJldHJpZXZlT3JpZ2luYWxzIiwiX2dldENvbGxlY3Rpb24iLCJ3cmFwcGVkU3RvcmVDbGllbnQiLCJiZWdpblVwZGF0ZSIsImJhdGNoU2l6ZSIsInJlc2V0IiwicGF1c2VPYnNlcnZlcnMiLCJ1cGRhdGUiLCJtc2ciLCJtb25nb0lkIiwiaWRQYXJzZSIsIl9kb2NzIiwiaW5zZXJ0IiwiZW5kVXBkYXRlIiwicmVzdW1lT2JzZXJ2ZXJzQ2xpZW50IiwiZ2V0RG9jIiwiZmluZE9uZSIsIndyYXBwZWRTdG9yZVNlcnZlciIsInJlc3VtZU9ic2VydmVyc1NlcnZlciIsInJlZ2lzdGVyU3RvcmVSZXN1bHQiLCJsb2dXYXJuIiwibG9nIiwib2siLCJfaW5zZXJ0Iiwid3JhcHBlZENhbGxiYWNrIiwid3JhcENhbGxiYWNrIiwiX2NhbGxNdXRhdG9yTWV0aG9kIiwiX2xlbjMiLCJvcHRpb25zQW5kQ2FsbGJhY2siLCJfa2V5MyIsInBvcENhbGxiYWNrRnJvbUFyZ3MiLCJjb252ZXJ0UmVzdWx0Iiwic2V0Q29ubmVjdGlvbk9wdGlvbnMiLCJvdGhlck9wdGlvbnMiLCJuZXh0T2JzZXJ2ZUhhbmRsZUlkIiwiX2NoYW5nZWQiLCJfbW92ZWRCZWZvcmUiLCJfcmVtb3ZlZCIsImJlZm9yZSIsInRpbWVvdXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBQUFBLE9BQU8sQ0FBQ0MsTUFBTSxDQUFDO01BQUNDLFNBQVMsRUFBQ0EsQ0FBQSxLQUFJQSxTQUFTO01BQUNDLGNBQWMsRUFBQ0EsQ0FBQSxLQUFJQTtJQUFjLENBQUMsQ0FBQztJQUFDLElBQUlDLFdBQVc7SUFBQ0osT0FBTyxDQUFDSyxJQUFJLENBQUMsaUJBQWlCLEVBQUM7TUFBQ0QsV0FBV0EsQ0FBQ0UsQ0FBQyxFQUFDO1FBQUNGLFdBQVcsR0FBQ0UsQ0FBQztNQUFBO0lBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztJQUFDLElBQUlDLGVBQWU7SUFBQ1AsT0FBTyxDQUFDSyxJQUFJLENBQUMsb0JBQW9CLEVBQUM7TUFBQ0UsZUFBZUEsQ0FBQ0QsQ0FBQyxFQUFDO1FBQUNDLGVBQWUsR0FBQ0QsQ0FBQztNQUFBO0lBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztJQUFDLElBQUlFLGtCQUFrQjtJQUFDUixPQUFPLENBQUNLLElBQUksQ0FBQyx3QkFBd0IsRUFBQztNQUFDRyxrQkFBa0JBLENBQUNGLENBQUMsRUFBQztRQUFDRSxrQkFBa0IsR0FBQ0YsQ0FBQztNQUFBO0lBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztJQUFDLElBQUlHLE9BQU87SUFBQ1QsT0FBTyxDQUFDSyxJQUFJLENBQUMsZ0JBQWdCLEVBQUM7TUFBQ0ksT0FBT0EsQ0FBQ0gsQ0FBQyxFQUFDO1FBQUNHLE9BQU8sR0FBQ0gsQ0FBQztNQUFBO0lBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztJQUFDLElBQUlJLG9CQUFvQixDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU1BLG9CQUFvQixDQUFDLENBQUMsRUFBRSxDQUFDO0lBSzllQyxjQUFjLEdBQUdDLE1BQU0sQ0FBQ0QsY0FBYyxHQUFHLENBQUMsQ0FBQztJQUUzQ0EsY0FBYyxDQUFDRSxhQUFhLEdBQUcsT0FBTztJQUV0Q0YsY0FBYyxDQUFDRyxVQUFVLEdBQUc7TUFDMUJDLE9BQU8sRUFBRTtRQUNQQyxPQUFPLEVBQUVDLHVCQUF1QjtRQUNoQ0MsTUFBTSxFQUFFVDtNQUNWO0lBQ0YsQ0FBQzs7SUFFRDtJQUNBO0lBQ0E7SUFDQTtJQUNBRSxjQUFjLENBQUNRLFNBQVMsR0FBRyxJQUFJQyxLQUFLLENBQUNYLE9BQU8sRUFBRTtNQUM1Q1ksR0FBR0EsQ0FBQ0MsTUFBTSxFQUFFQyxXQUFXLEVBQUVDLFFBQVEsRUFBRTtRQUNqQyxJQUFJRCxXQUFXLEtBQUssVUFBVSxFQUFFO1VBQzlCRSxNQUFNLENBQUNDLFNBQVMsQ0FDZCw2SEFFRixDQUFDO1FBQ0g7UUFDQSxPQUFPQyxPQUFPLENBQUNOLEdBQUcsQ0FBQ0MsTUFBTSxFQUFFQyxXQUFXLEVBQUVDLFFBQVEsQ0FBQztNQUNuRDtJQUNGLENBQUMsQ0FBQztJQUVGYixjQUFjLENBQUNQLFdBQVcsR0FBR0EsV0FBVztJQUV4Q08sY0FBYyxDQUFDaUIsVUFBVSxHQUFHckIsZUFBZTtJQUUzQ0ksY0FBYyxDQUFDSCxrQkFBa0IsR0FBR0Esa0JBQWtCOztJQUV0RDtJQUNBOztJQUdBO0lBQ0E7SUFDQTtJQUNBQyxPQUFPLENBQUNvQixTQUFTLENBQUNDLFNBQVMsQ0FBQ0MsS0FBSyxHQUFHLFlBQVk7TUFDOUM7TUFDQSxPQUFPLElBQUk7SUFDYixDQUFDOztJQUVEO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7O0lBRU8sTUFBTTdCLFNBQVMsR0FBRyxlQUFBQSxDQUFnQjhCLGlCQUFpQixFQUFFQyxjQUFjLEVBQUU7TUFDMUUsTUFBTUMsU0FBUyxHQUFHLEVBQUU7TUFDcEIsTUFBTS9CLGNBQWMsQ0FBQzZCLGlCQUFpQixFQUFFLFVBQVVHLE9BQU8sRUFBRTtRQUN6REQsU0FBUyxDQUFDRSxJQUFJLENBQUNDLFNBQVMsQ0FBQ0MscUJBQXFCLENBQUNDLE1BQU0sQ0FDbkRKLE9BQU8sRUFBRUYsY0FBYyxDQUFDLENBQUM7TUFDN0IsQ0FBQyxDQUFDO01BRUYsT0FBTztRQUNMTyxJQUFJLEVBQUUsU0FBQUEsQ0FBQSxFQUFZO1VBQ2hCTixTQUFTLENBQUNPLE9BQU8sQ0FBQyxVQUFVQyxRQUFRLEVBQUU7WUFDcENBLFFBQVEsQ0FBQ0YsSUFBSSxDQUFDLENBQUM7VUFDakIsQ0FBQyxDQUFDO1FBQ0o7TUFDRixDQUFDO0lBQ0gsQ0FBQztJQUVNLE1BQU1yQyxjQUFjLEdBQUcsZUFBQUEsQ0FBZ0I2QixpQkFBaUIsRUFBRVcsZUFBZSxFQUFFO01BQ2hGLE1BQU1DLEdBQUcsR0FBRztRQUFDQyxVQUFVLEVBQUViLGlCQUFpQixDQUFDYztNQUFjLENBQUM7TUFDMUQsTUFBTUMsV0FBVyxHQUFHQyxlQUFlLENBQUNDLHFCQUFxQixDQUN2RGpCLGlCQUFpQixDQUFDa0IsUUFBUSxDQUFDO01BQzdCLElBQUlILFdBQVcsRUFBRTtRQUNmLEtBQUssTUFBTUksRUFBRSxJQUFJSixXQUFXLEVBQUU7VUFDNUIsTUFBTUosZUFBZSxDQUFDUyxNQUFNLENBQUNDLE1BQU0sQ0FBQztZQUFDRixFQUFFLEVBQUVBO1VBQUUsQ0FBQyxFQUFFUCxHQUFHLENBQUMsQ0FBQztRQUNyRDtRQUNBLE1BQU1ELGVBQWUsQ0FBQ1MsTUFBTSxDQUFDQyxNQUFNLENBQUM7VUFBQ0MsY0FBYyxFQUFFLElBQUk7VUFBRUgsRUFBRSxFQUFFO1FBQUksQ0FBQyxFQUFFUCxHQUFHLENBQUMsQ0FBQztNQUM3RSxDQUFDLE1BQU07UUFDTCxNQUFNRCxlQUFlLENBQUNDLEdBQUcsQ0FBQztNQUM1QjtNQUNBO01BQ0EsTUFBTUQsZUFBZSxDQUFDO1FBQUVZLFlBQVksRUFBRTtNQUFLLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBSUQ7SUFDQTtJQUNBO0lBQ0E1QyxjQUFjLENBQUM2QyxjQUFjLEdBQUcvQyxPQUFPLENBQUNvQixTQUFTO0lBQUM0QixzQkFBQTtFQUFBLFNBQUFDLFdBQUE7SUFBQSxPQUFBRCxzQkFBQSxDQUFBQyxXQUFBO0VBQUE7RUFBQUQsc0JBQUE7QUFBQTtFQUFBRSxJQUFBO0VBQUFDLEtBQUE7QUFBQSxHOzs7Ozs7Ozs7Ozs7OztJQzdGbEQxQyxNQUFBLENBQU9qQixNQUFBLENBQU87TUFBQTRELGdCQUFNLEVBQUFBLENBQUEsS0FBZ0JBLGdCQUFDO01BQUF6RCxXQUFBLEVBQUFBLENBQUEsS0FBQUEsV0FBQTtNQUFBMEQsT0FBQSxFQUFBQSxDQUFBLEtBQUFBO0lBQUE7SUFBQSxJQUFBQyxPQUFBO0lBQUE3QyxNQUFBLENBQUFiLElBQUE7TUFBQTJELFFBQUExRCxDQUFBO1FBQUF5RCxPQUFBLEdBQUF6RCxDQUFBO01BQUE7SUFBQTtJQUFBLElBQUFtQixNQUFBO0lBQUFQLE1BQUEsQ0FBQWIsSUFBQTtNQUFBb0IsT0FBQW5CLENBQUE7UUFBQW1CLE1BQUEsR0FBQW5CLENBQUE7TUFBQTtJQUFBO0lBQUEsSUFBQTJELGlCQUFBO0lBQUEvQyxNQUFBLENBQUFiLElBQUE7TUFBQTRELGtCQUFBM0QsQ0FBQTtRQUFBMkQsaUJBQUEsR0FBQTNELENBQUE7TUFBQTtJQUFBO0lBQUEsSUFBQUMsZUFBQTtJQUFBVyxNQUFBLENBQUFiLElBQUE7TUFBQUUsZ0JBQUFELENBQUE7UUFBQUMsZUFBQSxHQUFBRCxDQUFBO01BQUE7SUFBQTtJQUFBLElBQUE0RCxnQkFBQTtJQUFBaEQsTUFBQSxDQUFBYixJQUFBO01BQUE2RCxpQkFBQTVELENBQUE7UUFBQTRELGdCQUFBLEdBQUE1RCxDQUFBO01BQUE7SUFBQTtJQUFBLElBQUFJLG9CQUFBLFdBQUFBLG9CQUFBO0lBTXJDLE1BQU07TUFBRXlEO0lBQUksQ0FBRSxHQUFHRCxnQkFBZ0I7SUFFMUIsTUFBTUwsZ0JBQWdCLEdBQUcsVUFBVTtJQUUxQyxJQUFJTyxjQUFjLEdBQUcsRUFBRUMsT0FBTyxDQUFDQyxHQUFHLENBQUNDLDJCQUEyQixJQUFJLElBQUksQ0FBQztJQUN2RSxNQUFNQyxZQUFZLEdBQUcsRUFBRUgsT0FBTyxDQUFDQyxHQUFHLENBQUNHLHlCQUF5QixJQUFJLEtBQUssQ0FBQztJQXVCaEUsTUFBT3JFLFdBQVc7TUF3QnRCc0UsWUFBWUMsUUFBZ0IsRUFBRUMsTUFBYztRQUFBLElBQUFDLGdCQUFBLEVBQUFDLHFCQUFBLEVBQUFDLHNCQUFBLEVBQUFDLGlCQUFBLEVBQUFDLHFCQUFBLEVBQUFDLHNCQUFBO1FBQUEsS0F2QnBDQyxTQUFTO1FBQUEsS0FDVkMsT0FBTztRQUFBLEtBQ05DLHlCQUF5QjtRQUFBLEtBQ3pCQyxvQkFBb0I7UUFBQSxLQUNwQkMsYUFBYTtRQUFBLEtBSWJDLFFBQVE7UUFBQSxLQUNSQyxXQUFXO1FBQUEsS0FDWEMscUJBQXFCO1FBQUEsS0FDckJDLGFBQWE7UUFBQSxLQUNkQyxTQUFTO1FBQUEsS0FDUkMsb0JBQW9CO1FBQUEsS0FDcEJDLGdCQUFnQjtRQUFBLEtBQ2hCQyxxQkFBcUI7UUFBQSxLQUNyQkMscUJBQXFCO1FBQUEsS0FDckJDLGVBQWU7UUFBQSxLQUVmQyxXQUFXLEdBQUcsSUFBSXpFLE1BQU0sQ0FBQzBFLGlCQUFpQixFQUFFO1FBQUEsS0FDNUNDLGFBQWEsR0FBRyxLQUFLO1FBQUEsS0FDckJDLGNBQWMsR0FBeUIsSUFBSTtRQUdqRCxJQUFJLENBQUNsQixTQUFTLEdBQUdSLFFBQVE7UUFDekIsSUFBSSxDQUFDUyxPQUFPLEdBQUdSLE1BQU07UUFFckIsSUFBSSxDQUFDcUIsZUFBZSxHQUFHLElBQUk7UUFDM0IsSUFBSSxDQUFDWix5QkFBeUIsR0FBRyxJQUFJO1FBQ3JDLElBQUksQ0FBQ0Msb0JBQW9CLEdBQUcsSUFBSTtRQUNoQyxJQUFJLENBQUNFLFFBQVEsR0FBRyxLQUFLO1FBQ3JCLElBQUksQ0FBQ0MsV0FBVyxHQUFHLElBQUk7UUFDdkIsSUFBSSxDQUFDQyxxQkFBcUIsR0FBRyxJQUFJO1FBQ2pDLElBQUksQ0FBQ0MsYUFBYSxHQUFHLElBQUlXLE9BQU8sQ0FBQ0MsQ0FBQyxJQUFJLElBQUksQ0FBQ2IscUJBQXFCLEdBQUdhLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUNYLFNBQVMsR0FBRyxJQUFJdkQsU0FBUyxDQUFDbUUsU0FBUyxDQUFDO1VBQ3ZDQyxXQUFXLEVBQUUsZ0JBQWdCO1VBQUVDLFFBQVEsRUFBRTtTQUMxQyxDQUFDO1FBRUYsTUFBTUMsa0JBQWtCLElBQUE5QixnQkFBQSxHQUN0QnBELE1BQU0sQ0FBQ21GLFFBQVEsY0FBQS9CLGdCQUFBLHdCQUFBQyxxQkFBQSxHQUFmRCxnQkFBQSxDQUFpQmdDLFFBQVEsY0FBQS9CLHFCQUFBLHdCQUFBQyxzQkFBQSxHQUF6QkQscUJBQUEsQ0FBMkJnQyxLQUFLLGNBQUEvQixzQkFBQSx1QkFBaENBLHNCQUFBLENBQWtDZ0MsdUJBQXVCO1FBQzNELE1BQU1DLGtCQUFrQixJQUFBaEMsaUJBQUEsR0FDdEJ2RCxNQUFNLENBQUNtRixRQUFRLGNBQUE1QixpQkFBQSx3QkFBQUMscUJBQUEsR0FBZkQsaUJBQUEsQ0FBaUI2QixRQUFRLGNBQUE1QixxQkFBQSx3QkFBQUMsc0JBQUEsR0FBekJELHFCQUFBLENBQTJCNkIsS0FBSyxjQUFBNUIsc0JBQUEsdUJBQWhDQSxzQkFBQSxDQUFrQytCLHVCQUF1QjtRQUMzRCxJQUFJTixrQkFBa0IsYUFBbEJBLGtCQUFrQixlQUFsQkEsa0JBQWtCLENBQUVPLE1BQU0sSUFBSUYsa0JBQWtCLGFBQWxCQSxrQkFBa0IsZUFBbEJBLGtCQUFrQixDQUFFRSxNQUFNLEVBQUU7VUFDNUQsTUFBTSxJQUFJQyxLQUFLLENBQ2IsMkdBQTJHLENBQzVHO1FBQ0g7UUFDQSxJQUFJLENBQUM1QixhQUFhLEdBQUc7VUFBRW9CLGtCQUFrQjtVQUFFSztRQUFrQixDQUFFO1FBRS9ELElBQUksQ0FBQ25CLG9CQUFvQixHQUFHLEVBQUU7UUFDOUIsSUFBSSxDQUFDQyxnQkFBZ0IsR0FBRyxJQUFJO1FBRTVCLElBQUksQ0FBQ0MscUJBQXFCLEdBQUcsSUFBSXFCLElBQUksQ0FBQztVQUNwQ0Msb0JBQW9CLEVBQUU7U0FDdkIsQ0FBQztRQUVGLElBQUksQ0FBQ3JCLHFCQUFxQixHQUFHLElBQUksQ0FBQ3NCLGFBQWEsRUFBRTtNQUNuRDtNQUVRQyxpQkFBaUJBLENBQUNDLGVBQXFCO1FBQUEsSUFBQUMscUJBQUEsRUFBQUMscUJBQUE7UUFDN0MsTUFBTUMsYUFBYSxHQUFRLENBQ3pCO1VBQ0VDLEdBQUcsRUFBRSxDQUNIO1lBQUVDLEVBQUUsRUFBRTtjQUFFQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUc7WUFBQztVQUFFLENBQUUsRUFDaEM7WUFBRUQsRUFBRSxFQUFFLEdBQUc7WUFBRSxRQUFRLEVBQUU7Y0FBRUUsT0FBTyxFQUFFO1lBQUk7VUFBRSxDQUFFLEVBQ3hDO1lBQUVGLEVBQUUsRUFBRSxHQUFHO1lBQUUsZ0JBQWdCLEVBQUU7VUFBQyxDQUFFLEVBQ2hDO1lBQUVBLEVBQUUsRUFBRSxHQUFHO1lBQUUsWUFBWSxFQUFFO2NBQUVFLE9BQU8sRUFBRTtZQUFJO1VBQUUsQ0FBRTtTQUUvQyxDQUNGO1FBRUQsTUFBTUMsT0FBTyxHQUFHLElBQUlDLE1BQU0sQ0FDeEIsTUFBTSxHQUNKO1FBQ0U7UUFDQXhHLE1BQU0sQ0FBQ3lHLGFBQWEsQ0FBQyxJQUFJLENBQUM5QyxPQUFPLEdBQUcsR0FBRyxDQUFDO1FBQ3hDO1FBQ0EzRCxNQUFNLENBQUN5RyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQ25DLENBQUNDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FDWCxHQUFHLENBQ047UUFFRCxLQUFBVixxQkFBQSxHQUFJLElBQUksQ0FBQ2xDLGFBQWEsQ0FBQ3lCLGtCQUFrQixjQUFBUyxxQkFBQSxlQUFyQ0EscUJBQUEsQ0FBdUNQLE1BQU0sRUFBRTtVQUNqRFMsYUFBYSxDQUFDdkYsSUFBSSxDQUFDO1lBQ2pCZ0csRUFBRSxFQUFFO2NBQ0ZDLE1BQU0sRUFBRUwsT0FBTztjQUNmTSxJQUFJLEVBQUUsSUFBSSxDQUFDL0MsYUFBYSxDQUFDeUIsa0JBQWtCLENBQUN1QixHQUFHLENBQzVDQyxRQUFnQixPQUFBQyxNQUFBLENBQVEsSUFBSSxDQUFDckQsT0FBTyxPQUFBcUQsTUFBQSxDQUFJRCxRQUFRLENBQUU7O1dBR3hELENBQUM7UUFDSixDQUFDLE1BQU0sS0FBQWQscUJBQUEsR0FBSSxJQUFJLENBQUNuQyxhQUFhLENBQUNvQixrQkFBa0IsY0FBQWUscUJBQUEsZUFBckNBLHFCQUFBLENBQXVDUixNQUFNLEVBQUU7VUFDeERTLGFBQWEsQ0FBQ3ZGLElBQUksQ0FBQztZQUNqQndGLEdBQUcsRUFBRSxDQUNIO2NBQUVRLEVBQUUsRUFBRTtZQUFlLENBQUUsRUFDdkI7Y0FDRUEsRUFBRSxFQUFFO2dCQUNGTixHQUFHLEVBQUUsSUFBSSxDQUFDdkMsYUFBYSxDQUFDb0Isa0JBQWtCLENBQUM0QixHQUFHLENBQzNDQyxRQUFnQixPQUFBQyxNQUFBLENBQVEsSUFBSSxDQUFDckQsT0FBTyxPQUFBcUQsTUFBQSxDQUFJRCxRQUFRLENBQUU7O2FBR3hEO1dBRUosQ0FBQztRQUNKLENBQUMsTUFBTTtVQUNMYixhQUFhLENBQUN2RixJQUFJLENBQUM7WUFDakJnRyxFQUFFLEVBQUVKO1dBQ0wsQ0FBQztRQUNKO1FBQ0EsSUFBR1IsZUFBZSxFQUFFO1VBQ2xCRyxhQUFhLENBQUN2RixJQUFJLENBQUM7WUFDakJzRyxFQUFFLEVBQUU7Y0FBRUMsR0FBRyxFQUFFbkI7WUFBZTtXQUMzQixDQUFDO1FBQ0o7UUFFQSxPQUFPO1VBQ0xvQixJQUFJLEVBQUVqQjtTQUNQO01BQ0g7TUFFQSxNQUFNbkYsSUFBSUEsQ0FBQTtRQUNSLElBQUksSUFBSSxDQUFDZ0QsUUFBUSxFQUFFO1FBQ25CLElBQUksQ0FBQ0EsUUFBUSxHQUFHLElBQUk7UUFDcEIsSUFBSSxJQUFJLENBQUNDLFdBQVcsRUFBRTtVQUNwQixNQUFNLElBQUksQ0FBQ0EsV0FBVyxDQUFDakQsSUFBSSxFQUFFO1FBQy9CO01BQ0Y7TUFFQSxNQUFNcUcsYUFBYUEsQ0FBQzFHLE9BQXFCLEVBQUUyRyxRQUFrQjtRQUMzRCxJQUFJLElBQUksQ0FBQ3RELFFBQVEsRUFBRTtVQUNqQixNQUFNLElBQUkyQixLQUFLLENBQUMsd0NBQXdDLENBQUM7UUFDM0Q7UUFFQSxNQUFNLElBQUksQ0FBQ3hCLGFBQWE7UUFFeEIsTUFBTW9ELGdCQUFnQixHQUFHRCxRQUFRO1FBRWpDOzs7OztRQUtBQSxRQUFRLEdBQUdySCxNQUFNLENBQUN1SCxlQUFlLENBQy9CLFVBQVVDLFlBQWlCO1VBQ3pCRixnQkFBZ0IsQ0FBQ0UsWUFBWSxDQUFDO1FBQ2hDLENBQUM7UUFDRDtRQUNBLFVBQVVDLEdBQUc7VUFDWHpILE1BQU0sQ0FBQzBILE1BQU0sQ0FBQyx5QkFBeUIsRUFBRUQsR0FBRyxDQUFDO1FBQy9DLENBQUMsQ0FDRjtRQUVELE1BQU1FLFlBQVksR0FBRyxJQUFJLENBQUN4RCxTQUFTLENBQUNyRCxNQUFNLENBQUNKLE9BQU8sRUFBRTJHLFFBQVEsQ0FBQztRQUM3RCxPQUFPO1VBQ0x0RyxJQUFJLEVBQUUsZUFBQUEsQ0FBQSxFQUFLO1lBQ1QsTUFBTTRHLFlBQVksQ0FBQzVHLElBQUksRUFBRTtVQUMzQjtTQUNEO01BQ0g7TUFFQTZHLFlBQVlBLENBQUNsSCxPQUFxQixFQUFFMkcsUUFBa0I7UUFDcEQsT0FBTyxJQUFJLENBQUNELGFBQWEsQ0FBQzFHLE9BQU8sRUFBRTJHLFFBQVEsQ0FBQztNQUM5QztNQUVBUSxnQkFBZ0JBLENBQUNSLFFBQWtCO1FBQ2pDLElBQUksSUFBSSxDQUFDdEQsUUFBUSxFQUFFO1VBQ2pCLE1BQU0sSUFBSTJCLEtBQUssQ0FBQyw0Q0FBNEMsQ0FBQztRQUMvRDtRQUNBLE9BQU8sSUFBSSxDQUFDcEIscUJBQXFCLENBQUN3RCxRQUFRLENBQUNULFFBQVEsQ0FBQztNQUN0RDtNQUVBLE1BQU1VLGtCQUFrQkEsQ0FBQTtRQUN0QixJQUFJLElBQUksQ0FBQ2hFLFFBQVEsRUFBRTtVQUNqQixNQUFNLElBQUkyQixLQUFLLENBQUMsNkNBQTZDLENBQUM7UUFDaEU7UUFFQSxNQUFNLElBQUksQ0FBQ3hCLGFBQWE7UUFFeEIsSUFBSThELFNBQVMsR0FBc0IsSUFBSTtRQUV2QyxPQUFPLENBQUMsSUFBSSxDQUFDakUsUUFBUSxFQUFFO1VBQ3JCLE1BQU1rRSxhQUFhLEdBQUcsSUFBSSxDQUFDbkMsaUJBQWlCLEVBQUU7VUFDOUMsSUFBSTtZQUNGa0MsU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDcEUseUJBQXlCLENBQUNzRSxZQUFZLENBQzNEOUYsZ0JBQWdCLEVBQ2hCNkYsYUFBYSxFQUNiO2NBQUVFLFVBQVUsRUFBRTtnQkFBRWxCLEVBQUUsRUFBRTtjQUFDLENBQUU7Y0FBRW1CLElBQUksRUFBRTtnQkFBRUMsUUFBUSxFQUFFLENBQUM7Y0FBQztZQUFFLENBQUUsQ0FDbEQ7WUFDRDtVQUNGLENBQUMsQ0FBQyxPQUFPQyxDQUFDLEVBQUU7WUFDVnRJLE1BQU0sQ0FBQzBILE1BQU0sQ0FBQyx3Q0FBd0MsRUFBRVksQ0FBQyxDQUFDO1lBQzFEO1lBQ0EsTUFBTXRJLE1BQU0sQ0FBQ3VJLEtBQUssQ0FBQyxHQUFHLENBQUM7VUFDekI7UUFDRjtRQUVBLElBQUksSUFBSSxDQUFDeEUsUUFBUSxFQUFFO1FBRW5CLElBQUksQ0FBQ2lFLFNBQVMsRUFBRTtRQUVoQixNQUFNZixFQUFFLEdBQUdlLFNBQVMsQ0FBQ2YsRUFBRTtRQUN2QixJQUFJLENBQUNBLEVBQUUsRUFBRTtVQUNQLE1BQU12QixLQUFLLENBQUMsMEJBQTBCLEdBQUc4QyxJQUFJLENBQUNDLFNBQVMsQ0FBQ1QsU0FBUyxDQUFDLENBQUM7UUFDckU7UUFFQSxJQUFJLElBQUksQ0FBQzNELGdCQUFnQixJQUFJNEMsRUFBRSxDQUFDeUIsZUFBZSxDQUFDLElBQUksQ0FBQ3JFLGdCQUFnQixDQUFDLEVBQUU7VUFDdEU7UUFDRjtRQUVBLElBQUlzRSxXQUFXLEdBQUcsSUFBSSxDQUFDdkUsb0JBQW9CLENBQUNxQixNQUFNO1FBRWxELE9BQU9rRCxXQUFXLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUN2RSxvQkFBb0IsQ0FBQ3VFLFdBQVcsR0FBRyxDQUFDLENBQUMsQ0FBQzFCLEVBQUUsQ0FBQzJCLFdBQVcsQ0FBQzNCLEVBQUUsQ0FBQyxFQUFFO1VBQzNGMEIsV0FBVyxFQUFFO1FBQ2Y7UUFFQSxJQUFJRSxlQUFlLEdBQUcsSUFBSTtRQUUxQixNQUFNQyxjQUFjLEdBQUcsSUFBSWpFLE9BQU8sQ0FBQ0MsQ0FBQyxJQUFJK0QsZUFBZSxHQUFHL0QsQ0FBQyxDQUFDO1FBRTVEaUUsWUFBWSxDQUFDLElBQUksQ0FBQ3ZFLGVBQWUsQ0FBQztRQUVsQyxJQUFJLENBQUNBLGVBQWUsR0FBR3dFLFVBQVUsQ0FBQyxNQUFLO1VBQ3JDQyxPQUFPLENBQUNDLEtBQUssQ0FBQyx5Q0FBeUMsRUFBRTtZQUFFakM7VUFBRSxDQUFFLENBQUM7UUFDbEUsQ0FBQyxFQUFFLEtBQUssQ0FBQztRQUVULElBQUksQ0FBQzdDLG9CQUFvQixDQUFDK0UsTUFBTSxDQUFDUixXQUFXLEVBQUUsQ0FBQyxFQUFFO1VBQUUxQixFQUFFO1VBQUVtQyxRQUFRLEVBQUVQO1FBQWdCLENBQUUsQ0FBQztRQUVwRixNQUFNQyxjQUFjO1FBRXBCQyxZQUFZLENBQUMsSUFBSSxDQUFDdkUsZUFBZSxDQUFDO01BQ3BDO01BRUEsTUFBTTZFLGlCQUFpQkEsQ0FBQTtRQUNyQixPQUFPLElBQUksQ0FBQ3RCLGtCQUFrQixFQUFFO01BQ2xDO01BRUEsTUFBTWxDLGFBQWFBLENBQUE7UUFDakIsTUFBTXlELFVBQVUsR0FBR0MsT0FBTyxDQUFDLGFBQWEsQ0FBQztRQUN6QyxJQUFJRCxVQUFVLENBQUNFLEtBQUssQ0FBQyxJQUFJLENBQUM5RixTQUFTLENBQUMsQ0FBQytGLFFBQVEsS0FBSyxPQUFPLEVBQUU7VUFDekQsTUFBTSxJQUFJL0QsS0FBSyxDQUFDLDZFQUE2RSxDQUFDO1FBQ2hHO1FBRUEsSUFBSSxDQUFDN0Isb0JBQW9CLEdBQUcsSUFBSS9FLGVBQWUsQ0FDN0MsSUFBSSxDQUFDNEUsU0FBUyxFQUFFO1VBQUVnRyxXQUFXLEVBQUUsQ0FBQztVQUFFQyxXQUFXLEVBQUU7UUFBQyxDQUFFLENBQ25EO1FBQ0QsSUFBSSxDQUFDL0YseUJBQXlCLEdBQUcsSUFBSTlFLGVBQWUsQ0FDbEQsSUFBSSxDQUFDNEUsU0FBUyxFQUFFO1VBQUVnRyxXQUFXLEVBQUUsQ0FBQztVQUFFQyxXQUFXLEVBQUU7UUFBQyxDQUFFLENBQ25EO1FBRUQsSUFBSTtVQUNGLE1BQU1DLFdBQVcsR0FBRyxNQUFNLElBQUksQ0FBQ2hHLHlCQUEwQixDQUFDaUcsRUFBRSxDQUN6REMsS0FBSyxFQUFFLENBQ1BDLE9BQU8sQ0FBQztZQUFFQyxRQUFRLEVBQUU7VUFBQyxDQUFFLENBQUM7VUFFM0IsSUFBSSxFQUFFSixXQUFXLElBQUlBLFdBQVcsQ0FBQ0ssT0FBTyxDQUFDLEVBQUU7WUFDekMsTUFBTSxJQUFJdkUsS0FBSyxDQUFDLDZFQUE2RSxDQUFDO1VBQ2hHO1VBRUEsTUFBTXdFLGNBQWMsR0FBRyxNQUFNLElBQUksQ0FBQ3RHLHlCQUF5QixDQUFDc0UsWUFBWSxDQUN0RTlGLGdCQUFnQixFQUNoQixFQUFFLEVBQ0Y7WUFBRWdHLElBQUksRUFBRTtjQUFFQyxRQUFRLEVBQUUsQ0FBQztZQUFDLENBQUU7WUFBRUYsVUFBVSxFQUFFO2NBQUVsQixFQUFFLEVBQUU7WUFBQztVQUFFLENBQUUsQ0FDbEQ7VUFFRCxNQUFNZ0IsYUFBYSxHQUFHLElBQUksQ0FBQ25DLGlCQUFpQixDQUFDb0UsY0FBYyxhQUFkQSxjQUFjLHVCQUFkQSxjQUFjLENBQUVqRCxFQUFFLENBQUM7VUFDaEUsSUFBSWlELGNBQWMsRUFBRTtZQUNsQixJQUFJLENBQUM3RixnQkFBZ0IsR0FBRzZGLGNBQWMsQ0FBQ2pELEVBQUU7VUFDM0M7VUFFQSxNQUFNMUcsaUJBQWlCLEdBQUcsSUFBSWlDLGlCQUFpQixDQUM3Q0osZ0JBQWdCLEVBQ2hCNkYsYUFBYSxFQUNiO1lBQUVrQyxRQUFRLEVBQUU7VUFBSSxDQUFFLENBQ25CO1VBRUQsSUFBSSxDQUFDbkcsV0FBVyxHQUFHLElBQUksQ0FBQ0gsb0JBQW9CLENBQUN1RyxJQUFJLENBQy9DN0osaUJBQWlCLEVBQ2hCOEosR0FBUSxJQUFJO1lBQ1gsSUFBSSxDQUFDNUYsV0FBVyxDQUFDOUQsSUFBSSxDQUFDMEosR0FBRyxDQUFDO1lBQzFCLElBQUksQ0FBQ0MsaUJBQWlCLEVBQUU7VUFDMUIsQ0FBQyxFQUNEdkgsWUFBWSxDQUNiO1VBRUQsSUFBSSxDQUFDa0IscUJBQXNCLEVBQUU7UUFDL0IsQ0FBQyxDQUFDLE9BQU9pRixLQUFLLEVBQUU7VUFDZEQsT0FBTyxDQUFDQyxLQUFLLENBQUMseUJBQXlCLEVBQUVBLEtBQUssQ0FBQztVQUMvQyxNQUFNQSxLQUFLO1FBQ2I7TUFDRjtNQUVRb0IsaUJBQWlCQSxDQUFBO1FBQ3ZCLElBQUksSUFBSSxDQUFDMUYsY0FBYyxFQUFFO1FBQ3pCLElBQUksQ0FBQ0QsYUFBYSxHQUFHLElBQUk7UUFFekI7UUFDQSxJQUFJLENBQUNDLGNBQWMsR0FBRyxDQUFDLFlBQVc7VUFDaEMsSUFBSTtZQUNGLE9BQU8sQ0FBQyxJQUFJLENBQUNiLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQ1UsV0FBVyxDQUFDbkMsT0FBTyxFQUFFLEVBQUU7Y0FDcEQ7Y0FDQTtjQUNBLElBQUksSUFBSSxDQUFDbUMsV0FBVyxDQUFDZ0IsTUFBTSxHQUFHOUMsY0FBYyxFQUFFO2dCQUM1QyxNQUFNcUYsU0FBUyxHQUFHLElBQUksQ0FBQ3ZELFdBQVcsQ0FBQzhGLEdBQUcsRUFBRTtnQkFDeEMsSUFBSSxDQUFDOUYsV0FBVyxDQUFDK0YsS0FBSyxFQUFFO2dCQUV4QixJQUFJLENBQUNsRyxxQkFBcUIsQ0FBQ21HLElBQUksQ0FBRXBELFFBQWtCLElBQUk7a0JBQ3JEQSxRQUFRLEVBQUU7a0JBQ1YsT0FBTyxJQUFJO2dCQUNiLENBQUMsQ0FBQztnQkFFRjtnQkFDQTtnQkFDQSxJQUFJLENBQUNxRCxtQkFBbUIsQ0FBQzFDLFNBQVMsQ0FBQ2YsRUFBRSxDQUFDO2dCQUN0QztjQUNGO2NBRUE7Y0FDQSxNQUFNb0QsR0FBRyxHQUFHLElBQUksQ0FBQzVGLFdBQVcsQ0FBQ2tHLEtBQUssRUFBRTtjQUVwQyxJQUFJO2dCQUNGLE1BQU1DLFNBQVMsQ0FBQyxJQUFJLEVBQUVQLEdBQUcsQ0FBQztnQkFDMUI7Z0JBQ0EsSUFBSUEsR0FBRyxDQUFDcEQsRUFBRSxFQUFFO2tCQUNWLElBQUksQ0FBQ3lELG1CQUFtQixDQUFDTCxHQUFHLENBQUNwRCxFQUFFLENBQUM7Z0JBQ2xDO2NBQ0YsQ0FBQyxDQUFDLE9BQU9xQixDQUFDLEVBQUU7Z0JBQ1Y7Z0JBQ0FXLE9BQU8sQ0FBQ0MsS0FBSyxDQUFDLCtCQUErQixFQUFFWixDQUFDLENBQUM7Y0FDbkQ7WUFDRjtVQUNGLENBQUMsU0FBUztZQUNSLElBQUksQ0FBQzFELGNBQWMsR0FBRyxJQUFJO1lBQzFCLElBQUksQ0FBQ0QsYUFBYSxHQUFHLEtBQUs7VUFDNUI7UUFDRixDQUFDLEVBQUMsQ0FBRTtNQUNOO01BRUErRixtQkFBbUJBLENBQUN6RCxFQUFPO1FBQ3pCLElBQUksQ0FBQzVDLGdCQUFnQixHQUFHNEMsRUFBRTtRQUMxQixPQUFPLENBQUMzRSxPQUFPLENBQUMsSUFBSSxDQUFDOEIsb0JBQW9CLENBQUMsSUFBSSxJQUFJLENBQUNBLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDNkMsRUFBRSxDQUFDeUIsZUFBZSxDQUFDLElBQUksQ0FBQ3JFLGdCQUFnQixDQUFDLEVBQUU7VUFDcEgsTUFBTXdHLFNBQVMsR0FBRyxJQUFJLENBQUN6RyxvQkFBb0IsQ0FBQ3VHLEtBQUssRUFBRztVQUNwREUsU0FBUyxDQUFDekIsUUFBUSxFQUFFO1FBQ3RCO01BQ0Y7TUFFQTBCLG1CQUFtQkEsQ0FBQ0MsS0FBYTtRQUMvQnBJLGNBQWMsR0FBR29JLEtBQUs7TUFDeEI7TUFFQUMsa0JBQWtCQSxDQUFBO1FBQ2hCckksY0FBYyxHQUFHLEVBQUVDLE9BQU8sQ0FBQ0MsR0FBRyxDQUFDQywyQkFBMkIsSUFBSSxJQUFJLENBQUM7TUFDckU7O0lBR0ksU0FBVVQsT0FBT0EsQ0FBQytELEVBQWM7TUFDcEMsSUFBSUEsRUFBRSxDQUFDQSxFQUFFLEtBQUssR0FBRyxJQUFJQSxFQUFFLENBQUNBLEVBQUUsS0FBSyxHQUFHLEVBQUU7UUFDbEMsT0FBT0EsRUFBRSxDQUFDNkUsQ0FBQyxDQUFDQyxHQUFHO01BQ2pCLENBQUMsTUFBTSxJQUFJOUUsRUFBRSxDQUFDQSxFQUFFLEtBQUssR0FBRyxFQUFFO1FBQ3hCLE9BQU9BLEVBQUUsQ0FBQytFLEVBQUUsQ0FBQ0QsR0FBRztNQUNsQixDQUFDLE1BQU0sSUFBSTlFLEVBQUUsQ0FBQ0EsRUFBRSxLQUFLLEdBQUcsRUFBRTtRQUN4QixNQUFNVixLQUFLLENBQUMsaURBQWlELEdBQUc4QyxJQUFJLENBQUNDLFNBQVMsQ0FBQ3JDLEVBQUUsQ0FBQyxDQUFDO01BQ3JGLENBQUMsTUFBTTtRQUNMLE1BQU1WLEtBQUssQ0FBQyxjQUFjLEdBQUc4QyxJQUFJLENBQUNDLFNBQVMsQ0FBQ3JDLEVBQUUsQ0FBQyxDQUFDO01BQ2xEO0lBQ0Y7SUFFQSxlQUFld0UsU0FBU0EsQ0FBQ1EsTUFBbUIsRUFBRWYsR0FBZTtNQUMzRCxJQUFJQSxHQUFHLENBQUMxRCxFQUFFLEtBQUssWUFBWSxFQUFFO1FBQzNCLElBQUkwRCxHQUFHLENBQUNZLENBQUMsQ0FBQ0ksUUFBUSxFQUFFO1VBQ2xCO1VBQ0E7VUFDQSxJQUFJQyxhQUFhLEdBQUdqQixHQUFHLENBQUNwRCxFQUFFO1VBQzFCLEtBQUssTUFBTWIsRUFBRSxJQUFJaUUsR0FBRyxDQUFDWSxDQUFDLENBQUNJLFFBQVEsRUFBRTtZQUMvQjtZQUNBLElBQUksQ0FBQ2pGLEVBQUUsQ0FBQ2EsRUFBRSxFQUFFO2NBQ1ZiLEVBQUUsQ0FBQ2EsRUFBRSxHQUFHcUUsYUFBYTtjQUNyQkEsYUFBYSxHQUFHQSxhQUFhLENBQUNDLEdBQUcsQ0FBQzdJLElBQUksQ0FBQzhJLEdBQUcsQ0FBQztZQUM3QztZQUNBLE1BQU1aLFNBQVMsQ0FBQ1EsTUFBTSxFQUFFaEYsRUFBRSxDQUFDO1VBQzdCO1VBQ0E7UUFDRjtRQUNBLE1BQU0sSUFBSVYsS0FBSyxDQUFDLGtCQUFrQixHQUFHOEMsSUFBSSxDQUFDQyxTQUFTLENBQUM0QixHQUFHLENBQUMsQ0FBQztNQUMzRDtNQUVBLE1BQU0zSixPQUFPLEdBQWlCO1FBQzVCbUIsY0FBYyxFQUFFLEtBQUs7UUFDckJDLFlBQVksRUFBRSxLQUFLO1FBQ25Cc0UsRUFBRSxFQUFFaUU7T0FDTDtNQUVELElBQUksT0FBT0EsR0FBRyxDQUFDMUQsRUFBRSxLQUFLLFFBQVEsSUFBSTBELEdBQUcsQ0FBQzFELEVBQUUsQ0FBQzhFLFVBQVUsQ0FBQ0wsTUFBTSxDQUFDekgsT0FBTyxHQUFHLEdBQUcsQ0FBQyxFQUFFO1FBQ3pFakQsT0FBTyxDQUFDVSxVQUFVLEdBQUdpSixHQUFHLENBQUMxRCxFQUFFLENBQUMrRSxLQUFLLENBQUNOLE1BQU0sQ0FBQ3pILE9BQU8sQ0FBQzhCLE1BQU0sR0FBRyxDQUFDLENBQUM7TUFDOUQ7TUFFQTtNQUNBO01BQ0EsSUFBSS9FLE9BQU8sQ0FBQ1UsVUFBVSxLQUFLLE1BQU0sRUFBRTtRQUNqQyxJQUFJaUosR0FBRyxDQUFDWSxDQUFDLENBQUNuSixZQUFZLEVBQUU7VUFDdEIsT0FBT3BCLE9BQU8sQ0FBQ1UsVUFBVTtVQUN6QlYsT0FBTyxDQUFDb0IsWUFBWSxHQUFHLElBQUk7UUFDN0IsQ0FBQyxNQUFNLElBQUksTUFBTSxJQUFJdUksR0FBRyxDQUFDWSxDQUFDLEVBQUU7VUFDMUJ2SyxPQUFPLENBQUNVLFVBQVUsR0FBR2lKLEdBQUcsQ0FBQ1ksQ0FBQyxDQUFDVSxJQUFJO1VBQy9CakwsT0FBTyxDQUFDbUIsY0FBYyxHQUFHLElBQUk7VUFDN0JuQixPQUFPLENBQUNnQixFQUFFLEdBQUcsSUFBSTtRQUNuQixDQUFDLE1BQU0sSUFBSSxRQUFRLElBQUkySSxHQUFHLENBQUNZLENBQUMsSUFBSSxTQUFTLElBQUlaLEdBQUcsQ0FBQ1ksQ0FBQyxFQUFFO1VBQ2xEO1VBQ0E7UUFBQSxDQUNELE1BQU07VUFDTCxNQUFNdkYsS0FBSyxDQUFDLGtCQUFrQixHQUFHOEMsSUFBSSxDQUFDQyxTQUFTLENBQUM0QixHQUFHLENBQUMsQ0FBQztRQUN2RDtNQUNGLENBQUMsTUFBTTtRQUNMO1FBQ0EzSixPQUFPLENBQUNnQixFQUFFLEdBQUdXLE9BQU8sQ0FBQ2dJLEdBQUcsQ0FBQztNQUMzQjtNQUVBLE1BQU1lLE1BQU0sQ0FBQ2pILFNBQVMsQ0FBQ3lILElBQUksQ0FBQ2xMLE9BQU8sQ0FBQztNQUVwQyxNQUFNLElBQUltRSxPQUFPLENBQUNnSCxPQUFPLElBQUlDLFlBQVksQ0FBQ0QsT0FBTyxDQUFDLENBQUM7SUFDckQ7SUFBQzdKLHNCQUFBO0VBQUEsU0FBQUMsV0FBQTtJQUFBLE9BQUFELHNCQUFBLENBQUFDLFdBQUE7RUFBQTtFQUFBRCxzQkFBQTtBQUFBO0VBQUFFLElBQUE7RUFBQUMsS0FBQTtBQUFBLEc7Ozs7Ozs7Ozs7Ozs7O0lDdGNELElBQUE0Six3QkFBb0I7SUFBQXRNLE1BQUEsQ0FBZ0JiLElBQUM7TUFBQTJELFFBQUExRCxDQUFBO1FBQUFrTix3QkFBQSxHQUFBbE4sQ0FBQTtNQUFBO0lBQUE7SUFBQSxNQUFBbU4sU0FBQTtJQUFyQ3ZNLE1BQUEsQ0FBT2pCLE1BQUEsQ0FBTztNQUFBeU4sa0JBQU0sRUFBQUEsQ0FBQSxLQUFpQkE7SUFBQTtJQUFBLElBQUEzSixPQUFBO0lBQUE3QyxNQUFBLENBQUFiLElBQUE7TUFBQTJELFFBQUExRCxDQUFBO1FBQUF5RCxPQUFBLEdBQUF6RCxDQUFBO01BQUE7SUFBQTtJQUFBLElBQUFJLG9CQUFBLFdBQUFBLG9CQUFBO0lBcUIvQixNQUFPZ04sa0JBQWtCO01BVzdCaEosWUFBQWlKLElBQUEsRUFBcUU7UUFBQSxJQUFBQyxLQUFBO1FBQUEsSUFBekQ7VUFBRUMsT0FBTztVQUFFQyxNQUFNLEdBQUdBLENBQUEsS0FBSyxDQUFFO1FBQUMsQ0FBNkIsR0FBQUgsSUFBQTtRQUFBLEtBVnBESSxRQUFRO1FBQUEsS0FDUkMsT0FBTztRQUFBLEtBQ2hCQyxNQUFNO1FBQUEsS0FDTkMsUUFBUTtRQUFBLEtBQ1JDLFNBQVM7UUFBQSxLQUNBeEksYUFBYTtRQUFBLEtBQ3RCeUksUUFBUTtRQUFBLEtBQ1JDLE1BQU07UUFBQSxLQUNOQyx1Q0FBdUM7UUFHN0MsSUFBSVQsT0FBTyxLQUFLVSxTQUFTLEVBQUUsTUFBTXBILEtBQUssQ0FBQyxzQkFBc0IsQ0FBQztRQUU5RDtRQUNBcUgsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUNuQkEsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDQyxLQUFLLENBQUNDLG1CQUFtQixDQUM3QyxnQkFBZ0IsRUFDaEIsc0JBQXNCLEVBQ3RCLENBQUMsQ0FDRjtRQUVILElBQUksQ0FBQ1gsUUFBUSxHQUFHRixPQUFPO1FBQ3ZCLElBQUksQ0FBQ0csT0FBTyxHQUFHRixNQUFNO1FBQ3JCLElBQUksQ0FBQ0csTUFBTSxHQUFHLElBQUl4TSxNQUFNLENBQUNrTixrQkFBa0IsRUFBRTtRQUM3QyxJQUFJLENBQUNULFFBQVEsR0FBRyxFQUFFO1FBQ2xCLElBQUksQ0FBQ0MsU0FBUyxHQUFHLElBQUk7UUFDckIsSUFBSSxDQUFDQyxRQUFRLEdBQUcsS0FBSztRQUNyQixJQUFJLENBQUN6SSxhQUFhLEdBQUcsSUFBSVcsT0FBTyxDQUFFQyxDQUFDLElBQU0sSUFBSSxDQUFDNEgsU0FBUyxHQUFHNUgsQ0FBRSxDQUFDLENBQUNxSSxJQUFJLENBQ2hFLE1BQU8sSUFBSSxDQUFDUixRQUFRLEdBQUcsSUFBSyxDQUM3QjtRQUNEO1FBQ0EsSUFBSSxDQUFDQyxNQUFNLEdBQUcsSUFBSXJMLGVBQWUsQ0FBQzZMLHNCQUFzQixDQUFDO1VBQUVoQjtRQUFPLENBQUUsQ0FBQztRQUNyRSxJQUFJLENBQUNTLHVDQUF1QyxHQUFHLENBQUM7UUFFaEQsSUFBSSxDQUFDUSxhQUFhLEVBQUUsQ0FBQ3JNLE9BQU8sQ0FBRXNNLFlBQVksSUFBSTtVQUMzQyxJQUFZLENBQUNBLFlBQVksQ0FBQyxHQUFHLFlBQW1CO1lBQUEsU0FBQUMsSUFBQSxHQUFBQyxTQUFBLENBQUEvSCxNQUFBLEVBQWZnSSxJQUFXLE9BQUFDLEtBQUEsQ0FBQUgsSUFBQSxHQUFBSSxJQUFBLE1BQUFBLElBQUEsR0FBQUosSUFBQSxFQUFBSSxJQUFBO2NBQVhGLElBQVcsQ0FBQUUsSUFBQSxJQUFBSCxTQUFBLENBQUFHLElBQUE7WUFBQTtZQUMzQ3hCLEtBQUksQ0FBQ3lCLGNBQWMsQ0FBQ04sWUFBWSxFQUFFRyxJQUFJLENBQUM7VUFDekMsQ0FBQztRQUNILENBQUMsQ0FBQztNQUNKO01BRUFJLDJCQUEyQkEsQ0FBQ3pDLE1BQXFCO1FBQy9DLE9BQU8sSUFBSSxDQUFDMEMsNEJBQTRCLENBQUMxQyxNQUFNLENBQUM7TUFDbEQ7TUFFQSxNQUFNMEMsNEJBQTRCQSxDQUFDMUMsTUFBcUI7UUFDdEQsRUFBRSxJQUFJLENBQUN5Qix1Q0FBdUM7UUFFOUM7UUFDQUUsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUNuQkEsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDQyxLQUFLLENBQUNDLG1CQUFtQixDQUM3QyxnQkFBZ0IsRUFDaEIsaUJBQWlCLEVBQ2pCLENBQUMsQ0FDRjtRQUVILE1BQU0sSUFBSSxDQUFDVCxNQUFNLENBQUN1QixPQUFPLENBQUMsWUFBVztVQUNuQyxJQUFJLENBQUN0QixRQUFTLENBQUNyQixNQUFNLENBQUNGLEdBQUcsQ0FBQyxHQUFHRSxNQUFNO1VBQ25DLE1BQU0sSUFBSSxDQUFDNEMsU0FBUyxDQUFDNUMsTUFBTSxDQUFDO1VBQzVCLEVBQUUsSUFBSSxDQUFDeUIsdUNBQXVDO1FBQ2hELENBQUMsQ0FBQztRQUVGLE1BQU0sSUFBSSxDQUFDM0ksYUFBYTtNQUMxQjtNQUVBLE1BQU0rSixZQUFZQSxDQUFDdk0sRUFBVTtRQUMzQixJQUFJLENBQUMsSUFBSSxDQUFDd00sTUFBTSxFQUFFLEVBQ2hCLE1BQU0sSUFBSXhJLEtBQUssQ0FBQyxtREFBbUQsQ0FBQztRQUV0RSxPQUFPLElBQUksQ0FBQytHLFFBQVMsQ0FBQy9LLEVBQUUsQ0FBQztRQUV6QjtRQUNBcUwsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUNuQkEsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDQyxLQUFLLENBQUNDLG1CQUFtQixDQUM3QyxnQkFBZ0IsRUFDaEIsaUJBQWlCLEVBQ2pCLENBQUMsQ0FBQyxDQUNIO1FBRUgsSUFDRTNLLE9BQU8sQ0FBQyxJQUFJLENBQUNtSyxRQUFRLENBQUMsSUFDdEIsSUFBSSxDQUFDSSx1Q0FBdUMsS0FBSyxDQUFDLEVBQ2xEO1VBQ0EsTUFBTSxJQUFJLENBQUNzQixLQUFLLEVBQUU7UUFDcEI7TUFDRjtNQUVBLE1BQU1BLEtBQUtBLENBQUEsRUFBMkM7UUFBQSxJQUExQ0MsT0FBQSxHQUFBWixTQUFBLENBQUEvSCxNQUFBLFFBQUErSCxTQUFBLFFBQUFWLFNBQUEsR0FBQVUsU0FBQSxNQUF3QyxFQUFFO1FBQ3BELElBQUksQ0FBQyxJQUFJLENBQUNVLE1BQU0sRUFBRSxJQUFJLENBQUNFLE9BQU8sQ0FBQ0MsY0FBYyxFQUMzQyxNQUFNM0ksS0FBSyxDQUFDLDZCQUE2QixDQUFDO1FBRTVDLE1BQU0sSUFBSSxDQUFDNkcsT0FBTyxFQUFFO1FBRXBCO1FBQ0FRLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFDbkJBLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQ0MsS0FBSyxDQUFDQyxtQkFBbUIsQ0FDN0MsZ0JBQWdCLEVBQ2hCLHNCQUFzQixFQUN0QixDQUFDLENBQUMsQ0FDSDtRQUVILElBQUksQ0FBQ1IsUUFBUSxHQUFHLElBQUk7TUFDdEI7TUFFQSxNQUFNNkIsS0FBS0EsQ0FBQTtRQUNULE1BQU0sSUFBSSxDQUFDOUIsTUFBTSxDQUFDK0IsU0FBUyxDQUFDLE1BQUs7VUFDL0IsSUFBSSxJQUFJLENBQUNMLE1BQU0sRUFBRSxFQUNmLE1BQU14SSxLQUFLLENBQUMsMENBQTBDLENBQUM7VUFFekQsSUFBSSxDQUFDLElBQUksQ0FBQ2dILFNBQVMsRUFBRTtZQUNuQixNQUFNLElBQUloSCxLQUFLLENBQUMsa0JBQWtCLENBQUM7VUFDckM7VUFFQSxJQUFJLENBQUNnSCxTQUFTLEVBQUU7VUFDaEIsSUFBSSxDQUFDQyxRQUFRLEdBQUcsSUFBSTtRQUN0QixDQUFDLENBQUM7TUFDSjtNQUVBLE1BQU02QixVQUFVQSxDQUFDL0csR0FBVTtRQUN6QixNQUFNLElBQUksQ0FBQytFLE1BQU0sQ0FBQ3VCLE9BQU8sQ0FBQyxNQUFLO1VBQzdCLElBQUksSUFBSSxDQUFDRyxNQUFNLEVBQUUsRUFDZixNQUFNeEksS0FBSyxDQUFDLGlEQUFpRCxDQUFDO1VBQ2hFLElBQUksQ0FBQ3lJLEtBQUssQ0FBQztZQUFFRSxjQUFjLEVBQUU7VUFBSSxDQUFFLENBQUM7VUFDcEMsTUFBTTVHLEdBQUc7UUFDWCxDQUFDLENBQUM7TUFDSjtNQUVBLE1BQU1nSCxPQUFPQSxDQUFDQyxFQUFjO1FBQzFCLE1BQU0sSUFBSSxDQUFDbEMsTUFBTSxDQUFDK0IsU0FBUyxDQUFDLFlBQVc7VUFDckMsSUFBSSxDQUFDLElBQUksQ0FBQ0wsTUFBTSxFQUFFLEVBQ2hCLE1BQU14SSxLQUFLLENBQUMsdURBQXVELENBQUM7VUFDdEUsTUFBTWdKLEVBQUUsRUFBRTtRQUNaLENBQUMsQ0FBQztNQUNKO01BRUFyQixhQUFhQSxDQUFBO1FBQ1gsT0FBTyxJQUFJLENBQUNmLFFBQVEsR0FDaEIsQ0FBQyxhQUFhLEVBQUUsU0FBUyxFQUFFLGFBQWEsRUFBRSxTQUFTLENBQUMsR0FDcEQsQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQztNQUNyQztNQUVBNEIsTUFBTUEsQ0FBQTtRQUNKLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQ3ZCLFFBQVE7TUFDeEI7TUFFQWlCLGNBQWNBLENBQUNOLFlBQW9CLEVBQUVHLElBQVc7UUFDOUMsSUFBSSxDQUFDakIsTUFBTSxDQUFDK0IsU0FBUyxDQUFDLFlBQVc7VUFDL0IsSUFBSSxDQUFDLElBQUksQ0FBQzlCLFFBQVEsRUFBRTtVQUVwQixNQUFNLElBQUksQ0FBQ0csTUFBTSxDQUFDK0IsV0FBVyxDQUFDckIsWUFBWSxDQUFDLENBQUNzQixLQUFLLENBQUMsSUFBSSxFQUFFbkIsSUFBSSxDQUFDO1VBQzdELElBQ0UsQ0FBQyxJQUFJLENBQUNTLE1BQU0sRUFBRSxJQUNkWixZQUFZLEtBQUssT0FBTyxJQUN4QkEsWUFBWSxLQUFLLGFBQWEsRUFDOUI7WUFDQSxNQUFNLElBQUk1SCxLQUFLLFFBQUFzQixNQUFBLENBQVFzRyxZQUFZLHlCQUFzQixDQUFDO1VBQzVEO1VBRUEsS0FBSyxNQUFNdUIsUUFBUSxJQUFJbE4sTUFBTSxDQUFDbU4sSUFBSSxDQUFDLElBQUksQ0FBQ3JDLFFBQVEsQ0FBQyxFQUFFO1lBQ2pELE1BQU1yQixNQUFNLEdBQUcsSUFBSSxDQUFDcUIsUUFBUSxJQUFJLElBQUksQ0FBQ0EsUUFBUSxDQUFDb0MsUUFBUSxDQUFDO1lBRXZELElBQUksQ0FBQ3pELE1BQU0sRUFBRTtZQUViLE1BQU0vRCxRQUFRLEdBQUkrRCxNQUFjLEtBQUFwRSxNQUFBLENBQUtzRyxZQUFZLEVBQUc7WUFFcEQsSUFBSSxDQUFDakcsUUFBUSxFQUFFO1lBRWYsTUFBTTBILE1BQU0sR0FBRzFILFFBQVEsQ0FBQ3VILEtBQUssQ0FDM0IsSUFBSSxFQUNKeEQsTUFBTSxDQUFDNEQsb0JBQW9CLEdBQUd2QixJQUFJLEdBQUd3QixLQUFLLENBQUMzTyxLQUFLLENBQUNtTixJQUFJLENBQUMsQ0FDdkQ7WUFFRCxJQUFJc0IsTUFBTSxJQUFJL08sTUFBTSxDQUFDa1AsVUFBVSxDQUFDSCxNQUFNLENBQUMsRUFBRTtjQUN2Q0EsTUFBTSxDQUFDSSxLQUFLLENBQUVqRyxLQUFLLElBQUk7Z0JBQ3JCRCxPQUFPLENBQUNDLEtBQUsscUNBQUFsQyxNQUFBLENBQ3lCc0csWUFBWSxRQUNoRHBFLEtBQUssQ0FDTjtjQUNILENBQUMsQ0FBQztZQUNKO1lBQ0FrQyxNQUFNLENBQUNnRSxlQUFlLENBQUNqQyxJQUFJLENBQUM0QixNQUFNLENBQUM7VUFDckM7UUFDRixDQUFDLENBQUM7TUFDSjtNQUVBLE1BQU1mLFNBQVNBLENBQUM1QyxNQUFxQjtRQUNuQyxNQUFNRyxHQUFHLEdBQUcsSUFBSSxDQUFDZSxRQUFRLEdBQUdsQixNQUFNLENBQUNpRSxZQUFZLEdBQUdqRSxNQUFNLENBQUNrRSxNQUFNO1FBQy9ELElBQUksQ0FBQy9ELEdBQUcsRUFBRTtRQUVWLE1BQU1nRSxXQUFXLEdBQTZCLEVBQUU7UUFFaEQ7UUFDQSxJQUFJLENBQUMzQyxNQUFNLENBQUM0QyxJQUFJLENBQUN4TyxPQUFPLENBQUMsQ0FBQ3FKLEdBQVEsRUFBRTNJLEVBQVUsS0FBSTtVQUNoRCxJQUFJLEVBQUUwSixNQUFNLENBQUNGLEdBQUcsSUFBSSxJQUFJLENBQUN1QixRQUFTLENBQUMsRUFBRTtZQUNuQyxNQUFNL0csS0FBSyxDQUFDLGlEQUFpRCxDQUFDO1VBQ2hFO1VBRUEsTUFBQStKLEtBQUEsR0FBMkJyRSxNQUFNLENBQUM0RCxvQkFBb0IsR0FDbEQzRSxHQUFHLEdBQ0g0RSxLQUFLLENBQUMzTyxLQUFLLENBQUMrSixHQUFHLENBQUM7WUFGZDtjQUFFYTtZQUFjLENBQUUsR0FBQXVFLEtBQUE7WUFBUkMsTUFBTSxHQUFBM0Qsd0JBQUEsQ0FBQTBELEtBQUEsRUFBQXpELFNBQUE7VUFJdEIsTUFBTTJELE9BQU8sR0FBRyxJQUFJOUssT0FBTyxDQUFPLENBQUNnSCxPQUFPLEVBQUUrRCxNQUFNLEtBQUk7WUFDcEQsSUFBSTtjQUNGLE1BQU05SyxDQUFDLEdBQUcsSUFBSSxDQUFDd0gsUUFBUSxHQUFHZixHQUFHLENBQUM3SixFQUFFLEVBQUVnTyxNQUFNLEVBQUUsSUFBSSxDQUFDLEdBQUduRSxHQUFHLENBQUM3SixFQUFFLEVBQUVnTyxNQUFNLENBQUM7Y0FDakU3RCxPQUFPLENBQUMvRyxDQUFDLENBQUM7WUFDWixDQUFDLENBQUMsT0FBT29FLEtBQUssRUFBRTtjQUNkMEcsTUFBTSxDQUFDMUcsS0FBSyxDQUFDO1lBQ2Y7VUFDRixDQUFDLENBQUM7VUFFRnFHLFdBQVcsQ0FBQzVPLElBQUksQ0FBQ2dQLE9BQU8sQ0FBQztRQUMzQixDQUFDLENBQUM7UUFFRixNQUFNOUssT0FBTyxDQUFDZ0wsVUFBVSxDQUFDTixXQUFXLENBQUMsQ0FBQ3BDLElBQUksQ0FBRTJDLENBQUMsSUFBSTtVQUMvQ0EsQ0FBQyxDQUFDOU8sT0FBTyxDQUFFK04sTUFBTSxJQUFJO1lBQ25CLElBQUlBLE1BQU0sQ0FBQ2dCLE1BQU0sS0FBSyxVQUFVLEVBQUU7Y0FDaEM5RyxPQUFPLENBQUNDLEtBQUssOEJBQUFsQyxNQUFBLENBQThCK0gsTUFBTSxDQUFDaUIsTUFBTSxDQUFFLENBQUM7WUFDN0Q7VUFDRixDQUFDLENBQUM7UUFDSixDQUFDLENBQUM7UUFFRjVFLE1BQU0sQ0FBQzZFLHVCQUF1QixFQUFFO01BQ2xDOztJQUNEak8sc0JBQUE7RUFBQSxTQUFBQyxXQUFBO0lBQUEsT0FBQUQsc0JBQUEsQ0FBQUMsV0FBQTtFQUFBO0VBQUFELHNCQUFBO0FBQUE7RUFBQUUsSUFBQTtFQUFBQyxLQUFBO0FBQUEsRzs7Ozs7Ozs7Ozs7QUNyUEQxQyxNQUFNLENBQUNqQixNQUFNLENBQUM7RUFBQzBSLFVBQVUsRUFBQ0EsQ0FBQSxLQUFJQTtBQUFVLENBQUMsQ0FBQztBQUFuQyxNQUFNQSxVQUFVLENBQUM7RUFDdEJqTixXQUFXQSxDQUFDa04sZUFBZSxFQUFFO0lBQzNCLElBQUksQ0FBQ0MsZ0JBQWdCLEdBQUdELGVBQWU7SUFDdkM7SUFDQSxJQUFJLENBQUNFLGVBQWUsR0FBRyxJQUFJQyxHQUFHLENBQUMsQ0FBQztFQUNsQzs7RUFFQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQSxNQUFNQyxLQUFLQSxDQUFDbFAsY0FBYyxFQUFFSyxFQUFFLEVBQUUwRSxFQUFFLEVBQUVpQixRQUFRLEVBQUU7SUFDNUMsTUFBTW5GLElBQUksR0FBRyxJQUFJO0lBR2pCc08sS0FBSyxDQUFDblAsY0FBYyxFQUFFb1AsTUFBTSxDQUFDO0lBQzdCRCxLQUFLLENBQUNwSyxFQUFFLEVBQUV6RSxNQUFNLENBQUM7O0lBR2pCO0lBQ0E7SUFDQSxJQUFJTyxJQUFJLENBQUNtTyxlQUFlLENBQUNLLEdBQUcsQ0FBQ3RLLEVBQUUsQ0FBQyxFQUFFO01BQ2hDbEUsSUFBSSxDQUFDbU8sZUFBZSxDQUFDelEsR0FBRyxDQUFDd0csRUFBRSxDQUFDLENBQUN6RixJQUFJLENBQUMwRyxRQUFRLENBQUM7TUFDM0M7SUFDRjtJQUVBLE1BQU1zSixTQUFTLEdBQUcsQ0FBQ3RKLFFBQVEsQ0FBQztJQUM1Qm5GLElBQUksQ0FBQ21PLGVBQWUsQ0FBQ08sR0FBRyxDQUFDeEssRUFBRSxFQUFFdUssU0FBUyxDQUFDO0lBRXZDLElBQUk7TUFDRixJQUFJdEcsR0FBRyxHQUNMLENBQUMsTUFBTW5JLElBQUksQ0FBQ2tPLGdCQUFnQixDQUFDbEksWUFBWSxDQUFDN0csY0FBYyxFQUFFO1FBQ3hENkosR0FBRyxFQUFFeEo7TUFDUCxDQUFDLENBQUMsS0FBSyxJQUFJO01BQ2I7TUFDQTtNQUNBLE9BQU9pUCxTQUFTLENBQUNsTCxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQzNCO1FBQ0E7UUFDQTtRQUNBO1FBQ0FrTCxTQUFTLENBQUNwRyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRTBFLEtBQUssQ0FBQzNPLEtBQUssQ0FBQytKLEdBQUcsQ0FBQyxDQUFDO01BQ3pDO0lBQ0YsQ0FBQyxDQUFDLE9BQU8vQixDQUFDLEVBQUU7TUFDVixPQUFPcUksU0FBUyxDQUFDbEwsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUMzQmtMLFNBQVMsQ0FBQ3BHLEdBQUcsQ0FBQyxDQUFDLENBQUNqQyxDQUFDLENBQUM7TUFDcEI7SUFDRixDQUFDLFNBQVM7TUFDUjtNQUNBO01BQ0FwRyxJQUFJLENBQUNtTyxlQUFlLENBQUNRLE1BQU0sQ0FBQ3pLLEVBQUUsQ0FBQztJQUNqQztFQUNGO0FBQ0YsQzs7Ozs7Ozs7Ozs7Ozs7SUMxREEzRyxNQUFBLENBQU9qQixNQUFBO01BQVFzUyxvQkFBTSxFQUFBQSxDQUFBLEtBQWtCQTtJQUFBO0lBQUEsSUFBQUMsUUFBQTtJQUFBdFIsTUFBQSxDQUFBYixJQUFBO01BQUEyRCxRQUFBMUQsQ0FBQTtRQUFBa1MsUUFBQSxHQUFBbFMsQ0FBQTtNQUFBO0lBQUE7SUFBQSxJQUFBSixTQUFBO0lBQUFnQixNQUFBLENBQUFiLElBQUE7TUFBQUgsVUFBQUksQ0FBQTtRQUFBSixTQUFBLEdBQUFJLENBQUE7TUFBQTtJQUFBO0lBQUEsSUFBQUksb0JBQUEsV0FBQUEsb0JBQUE7SUFZdkMsTUFBTStSLG1CQUFtQixHQUFHLEVBQUVwTyxPQUFPLENBQUNDLEdBQUcsQ0FBQ29PLDBCQUEwQixJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUU7SUFDakYsTUFBTUMsbUJBQW1CLEdBQUcsRUFBRXRPLE9BQU8sQ0FBQ0MsR0FBRyxDQUFDc08sMEJBQTBCLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxHQUFHLElBQUk7SUFFeEY7Ozs7Ozs7Ozs7SUFVTSxNQUFPTCxvQkFBb0I7TUFnQi9CN04sWUFBWW1MLE9BQW9DO1FBQUEsS0FmeENnRCxRQUFRO1FBQUEsS0FDUkMsa0JBQWtCO1FBQUEsS0FDbEJDLFlBQVk7UUFBQSxLQUNaaEYsUUFBUTtRQUFBLEtBQ1JpRixZQUFZO1FBQUEsS0FDWkMsY0FBYztRQUFBLEtBQ2R6TixRQUFRO1FBQUEsS0FDUjBOLE9BQU87UUFBQSxLQUNQQyxRQUFRO1FBQUEsS0FDUkMsNEJBQTRCO1FBQUEsS0FDNUJDLGNBQWM7UUFBQSxLQUNkQyxzQkFBc0I7UUFBQSxLQUN0QkMsVUFBVTtRQUFBLEtBQ1ZDLHFCQUFxQjtRQUczQixJQUFJLENBQUNYLFFBQVEsR0FBR2hELE9BQU87UUFDdkIsSUFBSSxDQUFDaUQsa0JBQWtCLEdBQUdqRCxPQUFPLENBQUM3TixpQkFBaUI7UUFDbkQsSUFBSSxDQUFDK1EsWUFBWSxHQUFHbEQsT0FBTyxDQUFDNEQsV0FBVztRQUN2QyxJQUFJLENBQUMxRixRQUFRLEdBQUc4QixPQUFPLENBQUNoQyxPQUFPO1FBQy9CLElBQUksQ0FBQ21GLFlBQVksR0FBR25ELE9BQU8sQ0FBQzZELFdBQVc7UUFDdkMsSUFBSSxDQUFDVCxjQUFjLEdBQUcsRUFBRTtRQUN4QixJQUFJLENBQUN6TixRQUFRLEdBQUcsS0FBSztRQUVyQixJQUFJLENBQUMwTixPQUFPLEdBQUcsSUFBSSxDQUFDSCxZQUFZLENBQUNZLHlCQUF5QixDQUN4RCxJQUFJLENBQUNiLGtCQUFrQixDQUFDO1FBRTFCLElBQUksQ0FBQ0ssUUFBUSxHQUFHLElBQUk7UUFDcEIsSUFBSSxDQUFDQyw0QkFBNEIsR0FBRyxDQUFDO1FBQ3JDLElBQUksQ0FBQ0MsY0FBYyxHQUFHLEVBQUU7UUFFeEIsSUFBSSxDQUFDQyxzQkFBc0IsR0FBR2QsUUFBUSxDQUNwQyxJQUFJLENBQUNvQixpQ0FBaUMsQ0FBQ0MsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUNqRCxJQUFJLENBQUNmLGtCQUFrQixDQUFDakQsT0FBTyxDQUFDaUUsaUJBQWlCLElBQUlyQixtQkFBbUIsQ0FDekU7UUFFRCxJQUFJLENBQUNjLFVBQVUsR0FBRyxJQUFLOVIsTUFBYyxDQUFDa04sa0JBQWtCLEVBQUU7TUFDNUQ7TUFFQSxNQUFNb0YsS0FBS0EsQ0FBQTtRQUFBLElBQUFDLGtCQUFBO1FBQ1QsTUFBTW5FLE9BQU8sR0FBRyxJQUFJLENBQUNnRCxRQUFRO1FBQzdCLE1BQU1vQixlQUFlLEdBQUcsTUFBTS9ULFNBQVMsQ0FDckMsSUFBSSxDQUFDNFMsa0JBQWtCLEVBQ3RCN0osWUFBaUIsSUFBSTtVQUNwQixNQUFNaUwsS0FBSyxHQUFJN1IsU0FBaUIsQ0FBQzhSLGdCQUFnQixFQUFFO1VBQ25ELElBQUlELEtBQUssRUFBRTtZQUNULElBQUksQ0FBQ2IsY0FBYyxDQUFDalIsSUFBSSxDQUFDOFIsS0FBSyxDQUFDRSxVQUFVLEVBQUUsQ0FBQztVQUM5QztVQUNBLElBQUksSUFBSSxDQUFDaEIsNEJBQTRCLEtBQUssQ0FBQyxFQUFFO1lBQzNDLElBQUksQ0FBQ0Usc0JBQXNCLEVBQUU7VUFDL0I7UUFDRixDQUFDLENBQ0Y7UUFFRCxJQUFJLENBQUNMLGNBQWMsQ0FBQzdRLElBQUksQ0FBQyxZQUFXO1VBQUcsTUFBTTZSLGVBQWUsQ0FBQ3pSLElBQUksRUFBRTtRQUFFLENBQUMsQ0FBQztRQUV2RSxJQUFJcU4sT0FBTyxDQUFDMkQscUJBQXFCLEVBQUU7VUFDakMsSUFBSSxDQUFDQSxxQkFBcUIsR0FBRzNELE9BQU8sQ0FBQzJELHFCQUFxQjtRQUM1RCxDQUFDLE1BQU07VUFDTCxNQUFNYSxlQUFlLEdBQ25CLElBQUksQ0FBQ3ZCLGtCQUFrQixDQUFDakQsT0FBTyxDQUFDeUUsaUJBQWlCLElBQ2pELElBQUksQ0FBQ3hCLGtCQUFrQixDQUFDakQsT0FBTyxDQUFDMEUsZ0JBQWdCLElBQ2hENUIsbUJBQW1CO1VBRXJCLE1BQU02QixjQUFjLEdBQUcvUyxNQUFNLENBQUNnVCxXQUFXLENBQ3ZDLElBQUksQ0FBQ25CLHNCQUFzQixDQUFDTyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQ3RDUSxlQUFlLENBQ2hCO1VBRUQsSUFBSSxDQUFDcEIsY0FBYyxDQUFDN1EsSUFBSSxDQUFDLE1BQUs7WUFDNUJYLE1BQU0sQ0FBQ2lULGFBQWEsQ0FBQ0YsY0FBYyxDQUFDO1VBQ3RDLENBQUMsQ0FBQztRQUNKO1FBRUEsTUFBTSxJQUFJLENBQUNaLGlDQUFpQyxFQUFFO1FBRTdDLENBQUFJLGtCQUFBLEdBQUF4RixPQUFPLENBQUMsWUFBWSxDQUFTLGNBQUF3RixrQkFBQSx1QkFBN0JBLGtCQUFBLENBQStCdkYsS0FBSyxDQUFDQyxtQkFBbUIsQ0FDdkQsZ0JBQWdCLEVBQUUseUJBQXlCLEVBQUUsQ0FBQyxDQUFDO01BQ25EO01BRUEsTUFBTWtGLGlDQUFpQ0EsQ0FBQTtRQUNyQyxJQUFJLElBQUksQ0FBQ1IsNEJBQTRCLEdBQUcsQ0FBQyxFQUFFO1FBQzNDLEVBQUUsSUFBSSxDQUFDQSw0QkFBNEI7UUFDbkMsTUFBTSxJQUFJLENBQUNHLFVBQVUsQ0FBQy9ELE9BQU8sQ0FBQyxZQUFXO1VBQ3ZDLE1BQU0sSUFBSSxDQUFDbUYsVUFBVSxFQUFFO1FBQ3pCLENBQUMsQ0FBQztNQUNKO01BRUFDLGVBQWVBLENBQUE7UUFDYixFQUFFLElBQUksQ0FBQ3hCLDRCQUE0QjtRQUNuQyxJQUFJLENBQUNHLFVBQVUsQ0FBQy9ELE9BQU8sQ0FBQyxNQUFLLENBQUUsQ0FBQyxDQUFDO1FBRWpDLElBQUksSUFBSSxDQUFDNEQsNEJBQTRCLEtBQUssQ0FBQyxFQUFFO1VBQzNDLE1BQU0sSUFBSWpNLEtBQUssb0NBQUFzQixNQUFBLENBQW9DLElBQUksQ0FBQzJLLDRCQUE0QixDQUFFLENBQUM7UUFDekY7TUFDRjtNQUVBLE1BQU15QixjQUFjQSxDQUFBO1FBQ2xCLElBQUksSUFBSSxDQUFDekIsNEJBQTRCLEtBQUssQ0FBQyxFQUFFO1VBQzNDLE1BQU0sSUFBSWpNLEtBQUssb0NBQUFzQixNQUFBLENBQW9DLElBQUksQ0FBQzJLLDRCQUE0QixDQUFFLENBQUM7UUFDekY7UUFDQSxNQUFNLElBQUksQ0FBQ0csVUFBVSxDQUFDL0QsT0FBTyxDQUFDLFlBQVc7VUFDdkMsTUFBTSxJQUFJLENBQUNtRixVQUFVLEVBQUU7UUFDekIsQ0FBQyxDQUFDO01BQ0o7TUFFQSxNQUFNQSxVQUFVQSxDQUFBO1FBQUEsSUFBQUcscUJBQUE7UUFDZCxFQUFFLElBQUksQ0FBQzFCLDRCQUE0QjtRQUVuQyxJQUFJLElBQUksQ0FBQzVOLFFBQVEsRUFBRTtRQUVuQixJQUFJdVAsS0FBSyxHQUFHLEtBQUs7UUFDakIsSUFBSUMsVUFBVTtRQUNkLElBQUlDLFVBQVUsR0FBRyxJQUFJLENBQUM5QixRQUFRO1FBRTlCLElBQUksQ0FBQzhCLFVBQVUsRUFBRTtVQUNmRixLQUFLLEdBQUcsSUFBSTtVQUNaRSxVQUFVLEdBQUcsSUFBSSxDQUFDbEgsUUFBUSxHQUFHLEVBQUUsR0FBRyxJQUFLL0ssZUFBdUIsQ0FBQ2tTLE1BQU0sQ0FBTixDQUFNO1FBQ3ZFO1FBRUEsQ0FBQUoscUJBQUEsT0FBSSxDQUFDdEIscUJBQXFCLGNBQUFzQixxQkFBQSx1QkFBMUJBLHFCQUFBLENBQUFLLElBQUEsS0FBNEIsQ0FBRTtRQUU5QixNQUFNQyxjQUFjLEdBQUcsSUFBSSxDQUFDL0IsY0FBYztRQUMxQyxJQUFJLENBQUNBLGNBQWMsR0FBRyxFQUFFO1FBRXhCLElBQUk7VUFDRjJCLFVBQVUsR0FBRyxNQUFNLElBQUksQ0FBQzlCLE9BQU8sQ0FBQ21DLGFBQWEsQ0FBQyxJQUFJLENBQUN0SCxRQUFRLENBQUM7UUFDOUQsQ0FBQyxDQUFDLE9BQU9oRSxDQUFNLEVBQUU7VUFDZixJQUFJZ0wsS0FBSyxJQUFJLE9BQU9oTCxDQUFDLENBQUN1TCxJQUFLLEtBQUssUUFBUSxFQUFFO1lBQ3hDLE1BQU0sSUFBSSxDQUFDdEMsWUFBWSxDQUFDL0MsVUFBVSxDQUNoQyxJQUFJOUksS0FBSyxrQ0FBQXNCLE1BQUEsQ0FFTHdCLElBQUksQ0FBQ0MsU0FBUyxDQUFDLElBQUksQ0FBQzRJLGtCQUFrQixDQUN4QyxRQUFBckssTUFBQSxDQUFLc0IsQ0FBQyxDQUFDd0wsT0FBTyxDQUFFLENBQ2pCLENBQ0Y7VUFDSDtVQUVBcEcsS0FBSyxDQUFDck4sU0FBUyxDQUFDTSxJQUFJLENBQUNpTyxLQUFLLENBQUMsSUFBSSxDQUFDZ0QsY0FBYyxFQUFFK0IsY0FBYyxDQUFDO1VBQy9EM1QsTUFBTSxDQUFDMEgsTUFBTSxrQ0FBQVYsTUFBQSxDQUNYd0IsSUFBSSxDQUFDQyxTQUFTLENBQUMsSUFBSSxDQUFDNEksa0JBQWtCLENBQUMsR0FBSS9JLENBQUMsQ0FBQztVQUMvQztRQUNGO1FBRUEsSUFBSSxDQUFDLElBQUksQ0FBQ3ZFLFFBQVEsRUFBRTtVQUNqQnhDLGVBQXVCLENBQUN3UyxpQkFBaUIsQ0FDeEMsSUFBSSxDQUFDekgsUUFBUSxFQUFFa0gsVUFBVSxFQUFFRCxVQUFVLEVBQUUsSUFBSSxDQUFDaEMsWUFBWSxDQUFDO1FBQzdEO1FBRUEsSUFBSStCLEtBQUssRUFBRSxJQUFJLENBQUMvQixZQUFZLENBQUNqRCxLQUFLLEVBQUU7UUFFcEMsSUFBSSxDQUFDb0QsUUFBUSxHQUFHNkIsVUFBVTtRQUUxQixNQUFNLElBQUksQ0FBQ2hDLFlBQVksQ0FBQzlDLE9BQU8sQ0FBQyxZQUFXO1VBQ3pDLEtBQUssTUFBTXVGLENBQUMsSUFBSUwsY0FBYyxFQUFFO1lBQzlCLE1BQU1LLENBQUMsQ0FBQ0MsU0FBUyxFQUFFO1VBQ3JCO1FBQ0YsQ0FBQyxDQUFDO01BQ0o7TUFFQSxNQUFNbFQsSUFBSUEsQ0FBQTtRQUFBLElBQUFtVCxtQkFBQTtRQUNSLElBQUksQ0FBQ25RLFFBQVEsR0FBRyxJQUFJO1FBRXBCLEtBQUssTUFBTXNELFFBQVEsSUFBSSxJQUFJLENBQUNtSyxjQUFjLEVBQUU7VUFDMUMsTUFBTW5LLFFBQVEsRUFBRTtRQUNsQjtRQUVBLEtBQUssTUFBTTJNLENBQUMsSUFBSSxJQUFJLENBQUNwQyxjQUFjLEVBQUU7VUFDbkMsTUFBTW9DLENBQUMsQ0FBQ0MsU0FBUyxFQUFFO1FBQ3JCO1FBRUMsQ0FBQUMsbUJBQUEsR0FBQW5ILE9BQU8sQ0FBQyxZQUFZLENBQVMsY0FBQW1ILG1CQUFBLHVCQUE3QkEsbUJBQUEsQ0FBK0JsSCxLQUFLLENBQUNDLG1CQUFtQixDQUN2RCxnQkFBZ0IsRUFBRSx5QkFBeUIsRUFBRSxDQUFDLENBQUMsQ0FBQztNQUNwRDs7SUFDRGpMLHNCQUFBO0VBQUEsU0FBQUMsV0FBQTtJQUFBLE9BQUFELHNCQUFBLENBQUFDLFdBQUE7RUFBQTtFQUFBRCxzQkFBQTtBQUFBO0VBQUFFLElBQUE7RUFBQUMsS0FBQTtBQUFBLEc7Ozs7Ozs7Ozs7Ozs7O0lDeE1ELElBQUlnUyxjQUFjO0lBQUMxVSxNQUFNLENBQUNiLElBQUksQ0FBQyxzQ0FBc0MsRUFBQztNQUFDMkQsT0FBT0EsQ0FBQzFELENBQUMsRUFBQztRQUFDc1YsY0FBYyxHQUFDdFYsQ0FBQztNQUFBO0lBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztJQUF2R1ksTUFBTSxDQUFDakIsTUFBTSxDQUFDO01BQUNPLGtCQUFrQixFQUFDQSxDQUFBLEtBQUlBO0lBQWtCLENBQUMsQ0FBQztJQUFDLElBQUkyUixHQUFHO0lBQUNqUixNQUFNLENBQUNiLElBQUksQ0FBQyxZQUFZLEVBQUM7TUFBQzJELE9BQU9BLENBQUMxRCxDQUFDLEVBQUM7UUFBQzZSLEdBQUcsR0FBQzdSLENBQUM7TUFBQTtJQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7SUFBQyxJQUFJeUQsT0FBTztJQUFDN0MsTUFBTSxDQUFDYixJQUFJLENBQUMsZ0JBQWdCLEVBQUM7TUFBQzJELE9BQU9BLENBQUMxRCxDQUFDLEVBQUM7UUFBQ3lELE9BQU8sR0FBQ3pELENBQUM7TUFBQTtJQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7SUFBQyxJQUFJdVYsa0JBQWtCO0lBQUMzVSxNQUFNLENBQUNiLElBQUksQ0FBQyxzQkFBc0IsRUFBQztNQUFDd1Ysa0JBQWtCQSxDQUFDdlYsQ0FBQyxFQUFDO1FBQUN1VixrQkFBa0IsR0FBQ3ZWLENBQUM7TUFBQTtJQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7SUFBQyxJQUFJMlIsS0FBSyxFQUFDNkQsS0FBSztJQUFDNVUsTUFBTSxDQUFDYixJQUFJLENBQUMsY0FBYyxFQUFDO01BQUM0UixLQUFLQSxDQUFDM1IsQ0FBQyxFQUFDO1FBQUMyUixLQUFLLEdBQUMzUixDQUFDO01BQUEsQ0FBQztNQUFDd1YsS0FBS0EsQ0FBQ3hWLENBQUMsRUFBQztRQUFDd1YsS0FBSyxHQUFDeFYsQ0FBQztNQUFBO0lBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztJQUFDLElBQUkyRCxpQkFBaUI7SUFBQy9DLE1BQU0sQ0FBQ2IsSUFBSSxDQUFDLHNCQUFzQixFQUFDO01BQUM0RCxpQkFBaUJBLENBQUMzRCxDQUFDLEVBQUM7UUFBQzJELGlCQUFpQixHQUFDM0QsQ0FBQztNQUFBO0lBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztJQUFDLElBQUlILGNBQWMsRUFBQ0QsU0FBUztJQUFDZ0IsTUFBTSxDQUFDYixJQUFJLENBQUMsZ0JBQWdCLEVBQUM7TUFBQ0YsY0FBY0EsQ0FBQ0csQ0FBQyxFQUFDO1FBQUNILGNBQWMsR0FBQ0csQ0FBQztNQUFBLENBQUM7TUFBQ0osU0FBU0EsQ0FBQ0ksQ0FBQyxFQUFDO1FBQUNKLFNBQVMsR0FBQ0ksQ0FBQztNQUFBO0lBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztJQUFDLElBQUl5VixNQUFNO0lBQUM3VSxNQUFNLENBQUNiLElBQUksQ0FBQyxVQUFVLEVBQUM7TUFBQzBWLE1BQU1BLENBQUN6VixDQUFDLEVBQUM7UUFBQ3lWLE1BQU0sR0FBQ3pWLENBQUM7TUFBQTtJQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7SUFBQyxJQUFJMEMsZUFBZTtJQUFDOUIsTUFBTSxDQUFDYixJQUFJLENBQUMsbUNBQW1DLEVBQUM7TUFBQzJELE9BQU9BLENBQUMxRCxDQUFDLEVBQUM7UUFBQzBDLGVBQWUsR0FBQzFDLENBQUM7TUFBQTtJQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7SUFBQyxJQUFJd0QsT0FBTztJQUFDNUMsTUFBTSxDQUFDYixJQUFJLENBQUMsaUJBQWlCLEVBQUM7TUFBQ3lELE9BQU9BLENBQUN4RCxDQUFDLEVBQUM7UUFBQ3dELE9BQU8sR0FBQ3hELENBQUM7TUFBQTtJQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7SUFBQyxJQUFJSSxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNQSxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQVU5M0IsSUFBSXNWLEtBQUssR0FBRztNQUNWQyxRQUFRLEVBQUUsVUFBVTtNQUNwQkMsUUFBUSxFQUFFLFVBQVU7TUFDcEJDLE1BQU0sRUFBRTtJQUNWLENBQUM7O0lBRUQ7SUFDQTtJQUNBLElBQUlDLGVBQWUsR0FBRyxTQUFBQSxDQUFBLEVBQVksQ0FBQyxDQUFDO0lBQ3BDLElBQUlDLHVCQUF1QixHQUFHLFNBQUFBLENBQVVDLENBQUMsRUFBRTtNQUN6QyxPQUFPLFlBQVk7UUFDakIsSUFBSTtVQUNGQSxDQUFDLENBQUNqRyxLQUFLLENBQUMsSUFBSSxFQUFFcEIsU0FBUyxDQUFDO1FBQzFCLENBQUMsQ0FBQyxPQUFPbEYsQ0FBQyxFQUFFO1VBQ1YsSUFBSSxFQUFFQSxDQUFDLFlBQVlxTSxlQUFlLENBQUMsRUFDakMsTUFBTXJNLENBQUM7UUFDWDtNQUNGLENBQUM7SUFDSCxDQUFDO0lBRUQsSUFBSXdNLFNBQVMsR0FBRyxDQUFDOztJQUVqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7SUFDTyxNQUFNL1Ysa0JBQWtCLEdBQUcsU0FBQUEsQ0FBVXFQLE9BQU8sRUFBRTtNQUNuRCxNQUFNbE0sSUFBSSxHQUFHLElBQUk7TUFDakJBLElBQUksQ0FBQzZTLFVBQVUsR0FBRyxJQUFJLENBQUMsQ0FBRTs7TUFFekI3UyxJQUFJLENBQUNnSixHQUFHLEdBQUc0SixTQUFTO01BQ3BCQSxTQUFTLEVBQUU7TUFFWDVTLElBQUksQ0FBQ21QLGtCQUFrQixHQUFHakQsT0FBTyxDQUFDN04saUJBQWlCO01BQ25EMkIsSUFBSSxDQUFDb1AsWUFBWSxHQUFHbEQsT0FBTyxDQUFDNEQsV0FBVztNQUN2QzlQLElBQUksQ0FBQ3FQLFlBQVksR0FBR25ELE9BQU8sQ0FBQzZELFdBQVc7TUFFdkMsSUFBSTdELE9BQU8sQ0FBQ2hDLE9BQU8sRUFBRTtRQUNuQixNQUFNMUcsS0FBSyxDQUFDLDJEQUEyRCxDQUFDO01BQzFFO01BRUEsTUFBTXNQLE1BQU0sR0FBRzVHLE9BQU8sQ0FBQzRHLE1BQU07TUFDN0I7TUFDQTtNQUNBLE1BQU1DLFVBQVUsR0FBR0QsTUFBTSxJQUFJQSxNQUFNLENBQUNFLGFBQWEsQ0FBQyxDQUFDO01BRW5ELElBQUk5RyxPQUFPLENBQUM3TixpQkFBaUIsQ0FBQzZOLE9BQU8sQ0FBQytHLEtBQUssRUFBRTtRQUMzQztRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBOztRQUVBLE1BQU1DLFdBQVcsR0FBRztVQUFFQyxLQUFLLEVBQUU5VCxlQUFlLENBQUNrUztRQUFPLENBQUM7UUFDckR2UixJQUFJLENBQUNvVCxNQUFNLEdBQUdwVCxJQUFJLENBQUNtUCxrQkFBa0IsQ0FBQ2pELE9BQU8sQ0FBQytHLEtBQUs7UUFDbkRqVCxJQUFJLENBQUNxVCxXQUFXLEdBQUdOLFVBQVU7UUFDN0IvUyxJQUFJLENBQUNzVCxPQUFPLEdBQUdSLE1BQU07UUFDckI5UyxJQUFJLENBQUN1VCxrQkFBa0IsR0FBRyxJQUFJQyxVQUFVLENBQUNULFVBQVUsRUFBRUcsV0FBVyxDQUFDO1FBQ2pFO1FBQ0FsVCxJQUFJLENBQUN5VCxVQUFVLEdBQUcsSUFBSUMsT0FBTyxDQUFDWCxVQUFVLEVBQUVHLFdBQVcsQ0FBQztNQUN4RCxDQUFDLE1BQU07UUFDTGxULElBQUksQ0FBQ29ULE1BQU0sR0FBRyxDQUFDO1FBQ2ZwVCxJQUFJLENBQUNxVCxXQUFXLEdBQUcsSUFBSTtRQUN2QnJULElBQUksQ0FBQ3NULE9BQU8sR0FBRyxJQUFJO1FBQ25CdFQsSUFBSSxDQUFDdVQsa0JBQWtCLEdBQUcsSUFBSTtRQUM5QjtRQUNBdlQsSUFBSSxDQUFDeVQsVUFBVSxHQUFHLElBQUlwVSxlQUFlLENBQUNrUyxNQUFNLENBQUQsQ0FBQztNQUM5Qzs7TUFFQTtNQUNBO01BQ0E7TUFDQXZSLElBQUksQ0FBQzJULG1CQUFtQixHQUFHLEtBQUs7TUFFaEMzVCxJQUFJLENBQUM2QixRQUFRLEdBQUcsS0FBSztNQUNyQjdCLElBQUksQ0FBQzRULFlBQVksR0FBRyxFQUFFO01BQ3RCNVQsSUFBSSxDQUFDNlQsZUFBZSxHQUFHLFVBQVVDLGNBQWMsRUFBRTtRQUMvQyxNQUFNQyxlQUFlLEdBQUc1QixLQUFLLENBQUM2QixlQUFlLENBQUM7VUFBRW5WLElBQUksRUFBRW9WO1FBQVMsQ0FBQyxDQUFDO1FBQ2pFO1FBQ0EzRixLQUFLLENBQUN3RixjQUFjLEVBQUUzQixLQUFLLENBQUMrQixLQUFLLENBQUMsQ0FBQ0gsZUFBZSxDQUFDLEVBQUVBLGVBQWUsQ0FBQyxDQUFDO1FBQ3RFL1QsSUFBSSxDQUFDNFQsWUFBWSxDQUFDblYsSUFBSSxDQUFDcVYsY0FBYyxDQUFDO01BQ3hDLENBQUM7TUFFRGpKLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSUEsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDQyxLQUFLLENBQUNDLG1CQUFtQixDQUN0RSxnQkFBZ0IsRUFBRSx1QkFBdUIsRUFBRSxDQUFDLENBQUM7TUFFL0MvSyxJQUFJLENBQUNtVSxvQkFBb0IsQ0FBQzlCLEtBQUssQ0FBQ0MsUUFBUSxDQUFDO01BRXpDdFMsSUFBSSxDQUFDb1UsUUFBUSxHQUFHbEksT0FBTyxDQUFDbUksT0FBTztNQUMvQjtNQUNBO01BQ0EsTUFBTXBPLFVBQVUsR0FBR2pHLElBQUksQ0FBQ21QLGtCQUFrQixDQUFDakQsT0FBTyxDQUFDc0IsTUFBTSxJQUFJeE4sSUFBSSxDQUFDbVAsa0JBQWtCLENBQUNqRCxPQUFPLENBQUNqRyxVQUFVLElBQUksQ0FBQyxDQUFDO01BQzdHakcsSUFBSSxDQUFDc1UsYUFBYSxHQUFHalYsZUFBZSxDQUFDa1Ysa0JBQWtCLENBQUN0TyxVQUFVLENBQUM7TUFDbkU7TUFDQTtNQUNBakcsSUFBSSxDQUFDd1UsaUJBQWlCLEdBQUd4VSxJQUFJLENBQUNvVSxRQUFRLENBQUNLLHFCQUFxQixDQUFDeE8sVUFBVSxDQUFDO01BQ3hFLElBQUk2TSxNQUFNLEVBQ1I5UyxJQUFJLENBQUN3VSxpQkFBaUIsR0FBRzFCLE1BQU0sQ0FBQzJCLHFCQUFxQixDQUFDelUsSUFBSSxDQUFDd1UsaUJBQWlCLENBQUM7TUFDL0V4VSxJQUFJLENBQUMwVSxtQkFBbUIsR0FBR3JWLGVBQWUsQ0FBQ2tWLGtCQUFrQixDQUMzRHZVLElBQUksQ0FBQ3dVLGlCQUFpQixDQUFDO01BRXpCeFUsSUFBSSxDQUFDMlUsWUFBWSxHQUFHLElBQUl0VixlQUFlLENBQUNrUyxNQUFNLENBQUQsQ0FBQztNQUM5Q3ZSLElBQUksQ0FBQzRVLGtCQUFrQixHQUFHLElBQUk7TUFDOUI1VSxJQUFJLENBQUM2VSxnQkFBZ0IsR0FBRyxDQUFDO01BRXpCN1UsSUFBSSxDQUFDOFUseUJBQXlCLEdBQUcsS0FBSztNQUN0QzlVLElBQUksQ0FBQytVLGdDQUFnQyxHQUFHLEVBQUU7SUFDM0MsQ0FBQztJQUVGdFYsTUFBTSxDQUFDQyxNQUFNLENBQUM3QyxrQkFBa0IsQ0FBQ3NCLFNBQVMsRUFBRTtNQUMxQ2lTLEtBQUssRUFBRSxlQUFBQSxDQUFBLEVBQWlCO1FBQ3RCLE1BQU1wUSxJQUFJLEdBQUcsSUFBSTs7UUFFakI7UUFDQTtRQUNBQSxJQUFJLENBQUM2VCxlQUFlLENBQUM3VCxJQUFJLENBQUNvUCxZQUFZLENBQUM0RixZQUFZLENBQUNyUCxnQkFBZ0IsQ0FDbEUrTSx1QkFBdUIsQ0FBQyxZQUFZO1VBQ2xDLE9BQU8xUyxJQUFJLENBQUNpVixnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2hDLENBQUMsQ0FDSCxDQUFDLENBQUM7UUFFRixNQUFNelksY0FBYyxDQUFDd0QsSUFBSSxDQUFDbVAsa0JBQWtCLEVBQUUsZ0JBQWdCM1EsT0FBTyxFQUFFO1VBQ3JFd0IsSUFBSSxDQUFDNlQsZUFBZSxDQUFDLE1BQU03VCxJQUFJLENBQUNvUCxZQUFZLENBQUM0RixZQUFZLENBQUN0UCxZQUFZLENBQ3BFbEgsT0FBTyxFQUFFLFVBQVU4RyxZQUFZLEVBQUU7WUFDL0JvTix1QkFBdUIsQ0FBQyxZQUFZO2NBQ2xDLE1BQU14TyxFQUFFLEdBQUdvQixZQUFZLENBQUNwQixFQUFFO2NBQzFCLElBQUlvQixZQUFZLENBQUMzRixjQUFjLElBQUkyRixZQUFZLENBQUMxRixZQUFZLEVBQUU7Z0JBQzVEO2dCQUNBO2dCQUNBO2dCQUNBLE9BQU9JLElBQUksQ0FBQ2lWLGdCQUFnQixDQUFDLENBQUM7Y0FDaEMsQ0FBQyxNQUFNO2dCQUNMO2dCQUNBLElBQUlqVixJQUFJLENBQUNrVixNQUFNLEtBQUs3QyxLQUFLLENBQUNDLFFBQVEsRUFBRTtrQkFDbEMsT0FBT3RTLElBQUksQ0FBQ21WLHlCQUF5QixDQUFDalIsRUFBRSxDQUFDO2dCQUMzQyxDQUFDLE1BQU07a0JBQ0wsT0FBT2xFLElBQUksQ0FBQ29WLGlDQUFpQyxDQUFDbFIsRUFBRSxDQUFDO2dCQUNuRDtjQUNGO1lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztVQUNOLENBQ0YsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDOztRQUVGO1FBQ0FsRSxJQUFJLENBQUM2VCxlQUFlLENBQUMsTUFBTXRYLFNBQVMsQ0FDbEN5RCxJQUFJLENBQUNtUCxrQkFBa0IsRUFBRSxZQUFZO1VBQ25DO1VBQ0EsTUFBTW9CLEtBQUssR0FBRzdSLFNBQVMsQ0FBQzhSLGdCQUFnQixDQUFDLENBQUM7VUFDMUMsSUFBSSxDQUFDRCxLQUFLLElBQUlBLEtBQUssQ0FBQzhFLEtBQUssRUFDdkI7VUFFRixJQUFJOUUsS0FBSyxDQUFDK0Usb0JBQW9CLEVBQUU7WUFDOUIvRSxLQUFLLENBQUMrRSxvQkFBb0IsQ0FBQ3RWLElBQUksQ0FBQ2dKLEdBQUcsQ0FBQyxHQUFHaEosSUFBSTtZQUMzQztVQUNGO1VBRUF1USxLQUFLLENBQUMrRSxvQkFBb0IsR0FBRyxDQUFDLENBQUM7VUFDL0IvRSxLQUFLLENBQUMrRSxvQkFBb0IsQ0FBQ3RWLElBQUksQ0FBQ2dKLEdBQUcsQ0FBQyxHQUFHaEosSUFBSTtVQUUzQ3VRLEtBQUssQ0FBQ2dGLFlBQVksQ0FBQyxrQkFBa0I7WUFDbkMsTUFBTUMsT0FBTyxHQUFHakYsS0FBSyxDQUFDK0Usb0JBQW9CO1lBQzFDLE9BQU8vRSxLQUFLLENBQUMrRSxvQkFBb0I7O1lBRWpDO1lBQ0E7WUFDQSxNQUFNdFYsSUFBSSxDQUFDb1AsWUFBWSxDQUFDNEYsWUFBWSxDQUFDN04saUJBQWlCLENBQUMsQ0FBQztZQUV4RCxLQUFLLE1BQU1zTyxNQUFNLElBQUloVyxNQUFNLENBQUNpVyxNQUFNLENBQUNGLE9BQU8sQ0FBQyxFQUFFO2NBQzNDLElBQUlDLE1BQU0sQ0FBQzVULFFBQVEsRUFDakI7Y0FFRixNQUFNOFQsS0FBSyxHQUFHLE1BQU1wRixLQUFLLENBQUNFLFVBQVUsQ0FBQyxDQUFDO2NBQ3RDLElBQUlnRixNQUFNLENBQUNQLE1BQU0sS0FBSzdDLEtBQUssQ0FBQ0csTUFBTSxFQUFFO2dCQUNsQztnQkFDQTtnQkFDQTtnQkFDQSxNQUFNaUQsTUFBTSxDQUFDcEcsWUFBWSxDQUFDOUMsT0FBTyxDQUFDb0osS0FBSyxDQUFDNUQsU0FBUyxDQUFDO2NBQ3BELENBQUMsTUFBTTtnQkFDTDBELE1BQU0sQ0FBQ1YsZ0NBQWdDLENBQUN0VyxJQUFJLENBQUNrWCxLQUFLLENBQUM7Y0FDckQ7WUFDRjtVQUNGLENBQUMsQ0FBQztRQUNKLENBQ0YsQ0FBQyxDQUFDOztRQUVGO1FBQ0E7UUFDQTNWLElBQUksQ0FBQzZULGVBQWUsQ0FBQzdULElBQUksQ0FBQ29QLFlBQVksQ0FBQ3dHLFdBQVcsQ0FBQ2xELHVCQUF1QixDQUN4RSxZQUFZO1VBQ1YsT0FBTzFTLElBQUksQ0FBQ2lWLGdCQUFnQixDQUFDLENBQUM7UUFDaEMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7UUFFTjtRQUNBO1FBQ0EsT0FBT2pWLElBQUksQ0FBQzZWLGdCQUFnQixDQUFDLENBQUM7TUFDaEMsQ0FBQztNQUNEQyxhQUFhLEVBQUUsU0FBQUEsQ0FBVXRXLEVBQUUsRUFBRTJJLEdBQUcsRUFBRTtRQUNoQyxJQUFJbkksSUFBSSxHQUFHLElBQUk7UUFDZmxDLE1BQU0sQ0FBQ2lZLGdCQUFnQixDQUFDLFlBQVk7VUFDbEMsSUFBSXZJLE1BQU0sR0FBRy9OLE1BQU0sQ0FBQ0MsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFeUksR0FBRyxDQUFDO1VBQ25DLE9BQU9xRixNQUFNLENBQUN4RSxHQUFHO1VBQ2pCaEosSUFBSSxDQUFDeVQsVUFBVSxDQUFDL0UsR0FBRyxDQUFDbFAsRUFBRSxFQUFFUSxJQUFJLENBQUMwVSxtQkFBbUIsQ0FBQ3ZNLEdBQUcsQ0FBQyxDQUFDO1VBQ3REbkksSUFBSSxDQUFDcVAsWUFBWSxDQUFDMkcsS0FBSyxDQUFDeFcsRUFBRSxFQUFFUSxJQUFJLENBQUNzVSxhQUFhLENBQUM5RyxNQUFNLENBQUMsQ0FBQzs7VUFFdkQ7VUFDQTtVQUNBO1VBQ0E7VUFDQSxJQUFJeE4sSUFBSSxDQUFDb1QsTUFBTSxJQUFJcFQsSUFBSSxDQUFDeVQsVUFBVSxDQUFDd0MsSUFBSSxDQUFDLENBQUMsR0FBR2pXLElBQUksQ0FBQ29ULE1BQU0sRUFBRTtZQUN2RDtZQUNBLElBQUlwVCxJQUFJLENBQUN5VCxVQUFVLENBQUN3QyxJQUFJLENBQUMsQ0FBQyxLQUFLalcsSUFBSSxDQUFDb1QsTUFBTSxHQUFHLENBQUMsRUFBRTtjQUM5QyxNQUFNLElBQUk1UCxLQUFLLENBQUMsNkJBQTZCLElBQzVCeEQsSUFBSSxDQUFDeVQsVUFBVSxDQUFDd0MsSUFBSSxDQUFDLENBQUMsR0FBR2pXLElBQUksQ0FBQ29ULE1BQU0sQ0FBQyxHQUN0QyxvQ0FBb0MsQ0FBQztZQUN2RDtZQUVBLElBQUk4QyxnQkFBZ0IsR0FBR2xXLElBQUksQ0FBQ3lULFVBQVUsQ0FBQzBDLFlBQVksQ0FBQyxDQUFDO1lBQ3JELElBQUlDLGNBQWMsR0FBR3BXLElBQUksQ0FBQ3lULFVBQVUsQ0FBQy9WLEdBQUcsQ0FBQ3dZLGdCQUFnQixDQUFDO1lBRTFELElBQUluSixLQUFLLENBQUNzSixNQUFNLENBQUNILGdCQUFnQixFQUFFMVcsRUFBRSxDQUFDLEVBQUU7Y0FDdEMsTUFBTSxJQUFJZ0UsS0FBSyxDQUFDLDBEQUEwRCxDQUFDO1lBQzdFO1lBRUF4RCxJQUFJLENBQUN5VCxVQUFVLENBQUM2QyxNQUFNLENBQUNKLGdCQUFnQixDQUFDO1lBQ3hDbFcsSUFBSSxDQUFDcVAsWUFBWSxDQUFDa0gsT0FBTyxDQUFDTCxnQkFBZ0IsQ0FBQztZQUMzQ2xXLElBQUksQ0FBQ3dXLFlBQVksQ0FBQ04sZ0JBQWdCLEVBQUVFLGNBQWMsQ0FBQztVQUNyRDtRQUNGLENBQUMsQ0FBQztNQUNKLENBQUM7TUFDREssZ0JBQWdCLEVBQUUsU0FBQUEsQ0FBVWpYLEVBQUUsRUFBRTtRQUM5QixJQUFJUSxJQUFJLEdBQUcsSUFBSTtRQUNmbEMsTUFBTSxDQUFDaVksZ0JBQWdCLENBQUMsWUFBWTtVQUNsQy9WLElBQUksQ0FBQ3lULFVBQVUsQ0FBQzZDLE1BQU0sQ0FBQzlXLEVBQUUsQ0FBQztVQUMxQlEsSUFBSSxDQUFDcVAsWUFBWSxDQUFDa0gsT0FBTyxDQUFDL1csRUFBRSxDQUFDO1VBQzdCLElBQUksQ0FBRVEsSUFBSSxDQUFDb1QsTUFBTSxJQUFJcFQsSUFBSSxDQUFDeVQsVUFBVSxDQUFDd0MsSUFBSSxDQUFDLENBQUMsS0FBS2pXLElBQUksQ0FBQ29ULE1BQU0sRUFDekQ7VUFFRixJQUFJcFQsSUFBSSxDQUFDeVQsVUFBVSxDQUFDd0MsSUFBSSxDQUFDLENBQUMsR0FBR2pXLElBQUksQ0FBQ29ULE1BQU0sRUFDdEMsTUFBTTVQLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQzs7VUFFNUM7VUFDQTs7VUFFQSxJQUFJLENBQUN4RCxJQUFJLENBQUN1VCxrQkFBa0IsQ0FBQ21ELEtBQUssQ0FBQyxDQUFDLEVBQUU7WUFDcEM7WUFDQTtZQUNBLElBQUlDLFFBQVEsR0FBRzNXLElBQUksQ0FBQ3VULGtCQUFrQixDQUFDcUQsWUFBWSxDQUFDLENBQUM7WUFDckQsSUFBSUMsTUFBTSxHQUFHN1csSUFBSSxDQUFDdVQsa0JBQWtCLENBQUM3VixHQUFHLENBQUNpWixRQUFRLENBQUM7WUFDbEQzVyxJQUFJLENBQUM4VyxlQUFlLENBQUNILFFBQVEsQ0FBQztZQUM5QjNXLElBQUksQ0FBQzhWLGFBQWEsQ0FBQ2EsUUFBUSxFQUFFRSxNQUFNLENBQUM7WUFDcEM7VUFDRjs7VUFFQTs7VUFFQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0EsSUFBSTdXLElBQUksQ0FBQ2tWLE1BQU0sS0FBSzdDLEtBQUssQ0FBQ0MsUUFBUSxFQUNoQzs7VUFFRjtVQUNBO1VBQ0E7VUFDQTtVQUNBLElBQUl0UyxJQUFJLENBQUMyVCxtQkFBbUIsRUFDMUI7O1VBRUY7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBOztVQUVBLE1BQU0sSUFBSW5RLEtBQUssQ0FBQywyQkFBMkIsQ0FBQztRQUM5QyxDQUFDLENBQUM7TUFDSixDQUFDO01BQ0R1VCxnQkFBZ0IsRUFBRSxTQUFBQSxDQUFVdlgsRUFBRSxFQUFFd1gsTUFBTSxFQUFFSCxNQUFNLEVBQUU7UUFDOUMsSUFBSTdXLElBQUksR0FBRyxJQUFJO1FBQ2ZsQyxNQUFNLENBQUNpWSxnQkFBZ0IsQ0FBQyxZQUFZO1VBQ2xDL1YsSUFBSSxDQUFDeVQsVUFBVSxDQUFDL0UsR0FBRyxDQUFDbFAsRUFBRSxFQUFFUSxJQUFJLENBQUMwVSxtQkFBbUIsQ0FBQ21DLE1BQU0sQ0FBQyxDQUFDO1VBQ3pELElBQUlJLFlBQVksR0FBR2pYLElBQUksQ0FBQ3NVLGFBQWEsQ0FBQ3VDLE1BQU0sQ0FBQztVQUM3QyxJQUFJSyxZQUFZLEdBQUdsWCxJQUFJLENBQUNzVSxhQUFhLENBQUMwQyxNQUFNLENBQUM7VUFDN0MsSUFBSUcsT0FBTyxHQUFHQyxZQUFZLENBQUNDLGlCQUFpQixDQUMxQ0osWUFBWSxFQUFFQyxZQUFZLENBQUM7VUFDN0IsSUFBSSxDQUFDOVcsT0FBTyxDQUFDK1csT0FBTyxDQUFDLEVBQ25CblgsSUFBSSxDQUFDcVAsWUFBWSxDQUFDOEgsT0FBTyxDQUFDM1gsRUFBRSxFQUFFMlgsT0FBTyxDQUFDO1FBQzFDLENBQUMsQ0FBQztNQUNKLENBQUM7TUFDRFgsWUFBWSxFQUFFLFNBQUFBLENBQVVoWCxFQUFFLEVBQUUySSxHQUFHLEVBQUU7UUFDL0IsSUFBSW5JLElBQUksR0FBRyxJQUFJO1FBQ2ZsQyxNQUFNLENBQUNpWSxnQkFBZ0IsQ0FBQyxZQUFZO1VBQ2xDL1YsSUFBSSxDQUFDdVQsa0JBQWtCLENBQUM3RSxHQUFHLENBQUNsUCxFQUFFLEVBQUVRLElBQUksQ0FBQzBVLG1CQUFtQixDQUFDdk0sR0FBRyxDQUFDLENBQUM7O1VBRTlEO1VBQ0EsSUFBSW5JLElBQUksQ0FBQ3VULGtCQUFrQixDQUFDMEMsSUFBSSxDQUFDLENBQUMsR0FBR2pXLElBQUksQ0FBQ29ULE1BQU0sRUFBRTtZQUNoRCxJQUFJa0UsYUFBYSxHQUFHdFgsSUFBSSxDQUFDdVQsa0JBQWtCLENBQUM0QyxZQUFZLENBQUMsQ0FBQztZQUUxRG5XLElBQUksQ0FBQ3VULGtCQUFrQixDQUFDK0MsTUFBTSxDQUFDZ0IsYUFBYSxDQUFDOztZQUU3QztZQUNBO1lBQ0F0WCxJQUFJLENBQUMyVCxtQkFBbUIsR0FBRyxLQUFLO1VBQ2xDO1FBQ0YsQ0FBQyxDQUFDO01BQ0osQ0FBQztNQUNEO01BQ0E7TUFDQW1ELGVBQWUsRUFBRSxTQUFBQSxDQUFVdFgsRUFBRSxFQUFFO1FBQzdCLElBQUlRLElBQUksR0FBRyxJQUFJO1FBQ2ZsQyxNQUFNLENBQUNpWSxnQkFBZ0IsQ0FBQyxZQUFZO1VBQ2xDL1YsSUFBSSxDQUFDdVQsa0JBQWtCLENBQUMrQyxNQUFNLENBQUM5VyxFQUFFLENBQUM7VUFDbEM7VUFDQTtVQUNBO1VBQ0EsSUFBSSxDQUFFUSxJQUFJLENBQUN1VCxrQkFBa0IsQ0FBQzBDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBRWpXLElBQUksQ0FBQzJULG1CQUFtQixFQUNoRTNULElBQUksQ0FBQ2lWLGdCQUFnQixDQUFDLENBQUM7UUFDM0IsQ0FBQyxDQUFDO01BQ0osQ0FBQztNQUNEO01BQ0E7TUFDQTtNQUNBc0MsWUFBWSxFQUFFLFNBQUFBLENBQVVwUCxHQUFHLEVBQUU7UUFDM0IsSUFBSW5JLElBQUksR0FBRyxJQUFJO1FBQ2ZsQyxNQUFNLENBQUNpWSxnQkFBZ0IsQ0FBQyxZQUFZO1VBQ2xDLElBQUl2VyxFQUFFLEdBQUcySSxHQUFHLENBQUNhLEdBQUc7VUFDaEIsSUFBSWhKLElBQUksQ0FBQ3lULFVBQVUsQ0FBQ2pGLEdBQUcsQ0FBQ2hQLEVBQUUsQ0FBQyxFQUN6QixNQUFNZ0UsS0FBSyxDQUFDLDJDQUEyQyxHQUFHaEUsRUFBRSxDQUFDO1VBQy9ELElBQUlRLElBQUksQ0FBQ29ULE1BQU0sSUFBSXBULElBQUksQ0FBQ3VULGtCQUFrQixDQUFDL0UsR0FBRyxDQUFDaFAsRUFBRSxDQUFDLEVBQ2hELE1BQU1nRSxLQUFLLENBQUMsbURBQW1ELEdBQUdoRSxFQUFFLENBQUM7VUFFdkUsSUFBSXlULEtBQUssR0FBR2pULElBQUksQ0FBQ29ULE1BQU07VUFDdkIsSUFBSUwsVUFBVSxHQUFHL1MsSUFBSSxDQUFDcVQsV0FBVztVQUNqQyxJQUFJbUUsWUFBWSxHQUFJdkUsS0FBSyxJQUFJalQsSUFBSSxDQUFDeVQsVUFBVSxDQUFDd0MsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQ3JEalcsSUFBSSxDQUFDeVQsVUFBVSxDQUFDL1YsR0FBRyxDQUFDc0MsSUFBSSxDQUFDeVQsVUFBVSxDQUFDMEMsWUFBWSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUk7VUFDNUQsSUFBSXNCLFdBQVcsR0FBSXhFLEtBQUssSUFBSWpULElBQUksQ0FBQ3VULGtCQUFrQixDQUFDMEMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQzFEalcsSUFBSSxDQUFDdVQsa0JBQWtCLENBQUM3VixHQUFHLENBQUNzQyxJQUFJLENBQUN1VCxrQkFBa0IsQ0FBQzRDLFlBQVksQ0FBQyxDQUFDLENBQUMsR0FDbkUsSUFBSTtVQUNSO1VBQ0E7VUFDQTtVQUNBLElBQUl1QixTQUFTLEdBQUcsQ0FBRXpFLEtBQUssSUFBSWpULElBQUksQ0FBQ3lULFVBQVUsQ0FBQ3dDLElBQUksQ0FBQyxDQUFDLEdBQUdoRCxLQUFLLElBQ3ZERixVQUFVLENBQUM1SyxHQUFHLEVBQUVxUCxZQUFZLENBQUMsR0FBRyxDQUFDOztVQUVuQztVQUNBO1VBQ0E7VUFDQSxJQUFJRyxpQkFBaUIsR0FBRyxDQUFDRCxTQUFTLElBQUkxWCxJQUFJLENBQUMyVCxtQkFBbUIsSUFDNUQzVCxJQUFJLENBQUN1VCxrQkFBa0IsQ0FBQzBDLElBQUksQ0FBQyxDQUFDLEdBQUdoRCxLQUFLOztVQUV4QztVQUNBO1VBQ0EsSUFBSTJFLG1CQUFtQixHQUFHLENBQUNGLFNBQVMsSUFBSUQsV0FBVyxJQUNqRDFFLFVBQVUsQ0FBQzVLLEdBQUcsRUFBRXNQLFdBQVcsQ0FBQyxJQUFJLENBQUM7VUFFbkMsSUFBSUksUUFBUSxHQUFHRixpQkFBaUIsSUFBSUMsbUJBQW1CO1VBRXZELElBQUlGLFNBQVMsRUFBRTtZQUNiMVgsSUFBSSxDQUFDOFYsYUFBYSxDQUFDdFcsRUFBRSxFQUFFMkksR0FBRyxDQUFDO1VBQzdCLENBQUMsTUFBTSxJQUFJMFAsUUFBUSxFQUFFO1lBQ25CN1gsSUFBSSxDQUFDd1csWUFBWSxDQUFDaFgsRUFBRSxFQUFFMkksR0FBRyxDQUFDO1VBQzVCLENBQUMsTUFBTTtZQUNMO1lBQ0FuSSxJQUFJLENBQUMyVCxtQkFBbUIsR0FBRyxLQUFLO1VBQ2xDO1FBQ0YsQ0FBQyxDQUFDO01BQ0osQ0FBQztNQUNEO01BQ0E7TUFDQTtNQUNBbUUsZUFBZSxFQUFFLFNBQUFBLENBQVV0WSxFQUFFLEVBQUU7UUFDN0IsSUFBSVEsSUFBSSxHQUFHLElBQUk7UUFDZmxDLE1BQU0sQ0FBQ2lZLGdCQUFnQixDQUFDLFlBQVk7VUFDbEMsSUFBSSxDQUFFL1YsSUFBSSxDQUFDeVQsVUFBVSxDQUFDakYsR0FBRyxDQUFDaFAsRUFBRSxDQUFDLElBQUksQ0FBRVEsSUFBSSxDQUFDb1QsTUFBTSxFQUM1QyxNQUFNNVAsS0FBSyxDQUFDLG9EQUFvRCxHQUFHaEUsRUFBRSxDQUFDO1VBRXhFLElBQUlRLElBQUksQ0FBQ3lULFVBQVUsQ0FBQ2pGLEdBQUcsQ0FBQ2hQLEVBQUUsQ0FBQyxFQUFFO1lBQzNCUSxJQUFJLENBQUN5VyxnQkFBZ0IsQ0FBQ2pYLEVBQUUsQ0FBQztVQUMzQixDQUFDLE1BQU0sSUFBSVEsSUFBSSxDQUFDdVQsa0JBQWtCLENBQUMvRSxHQUFHLENBQUNoUCxFQUFFLENBQUMsRUFBRTtZQUMxQ1EsSUFBSSxDQUFDOFcsZUFBZSxDQUFDdFgsRUFBRSxDQUFDO1VBQzFCO1FBQ0YsQ0FBQyxDQUFDO01BQ0osQ0FBQztNQUNEdVksVUFBVSxFQUFFLFNBQUFBLENBQVV2WSxFQUFFLEVBQUVxWCxNQUFNLEVBQUU7UUFDaEMsSUFBSTdXLElBQUksR0FBRyxJQUFJO1FBQ2ZsQyxNQUFNLENBQUNpWSxnQkFBZ0IsQ0FBQyxZQUFZO1VBQ2xDLElBQUlpQyxVQUFVLEdBQUduQixNQUFNLElBQUk3VyxJQUFJLENBQUNvVSxRQUFRLENBQUM2RCxlQUFlLENBQUNwQixNQUFNLENBQUMsQ0FBQ2hLLE1BQU07VUFFdkUsSUFBSXFMLGVBQWUsR0FBR2xZLElBQUksQ0FBQ3lULFVBQVUsQ0FBQ2pGLEdBQUcsQ0FBQ2hQLEVBQUUsQ0FBQztVQUM3QyxJQUFJMlksY0FBYyxHQUFHblksSUFBSSxDQUFDb1QsTUFBTSxJQUFJcFQsSUFBSSxDQUFDdVQsa0JBQWtCLENBQUMvRSxHQUFHLENBQUNoUCxFQUFFLENBQUM7VUFDbkUsSUFBSTRZLFlBQVksR0FBR0YsZUFBZSxJQUFJQyxjQUFjO1VBRXBELElBQUlILFVBQVUsSUFBSSxDQUFDSSxZQUFZLEVBQUU7WUFDL0JwWSxJQUFJLENBQUN1WCxZQUFZLENBQUNWLE1BQU0sQ0FBQztVQUMzQixDQUFDLE1BQU0sSUFBSXVCLFlBQVksSUFBSSxDQUFDSixVQUFVLEVBQUU7WUFDdENoWSxJQUFJLENBQUM4WCxlQUFlLENBQUN0WSxFQUFFLENBQUM7VUFDMUIsQ0FBQyxNQUFNLElBQUk0WSxZQUFZLElBQUlKLFVBQVUsRUFBRTtZQUNyQyxJQUFJaEIsTUFBTSxHQUFHaFgsSUFBSSxDQUFDeVQsVUFBVSxDQUFDL1YsR0FBRyxDQUFDOEIsRUFBRSxDQUFDO1lBQ3BDLElBQUl1VCxVQUFVLEdBQUcvUyxJQUFJLENBQUNxVCxXQUFXO1lBQ2pDLElBQUlnRixXQUFXLEdBQUdyWSxJQUFJLENBQUNvVCxNQUFNLElBQUlwVCxJQUFJLENBQUN1VCxrQkFBa0IsQ0FBQzBDLElBQUksQ0FBQyxDQUFDLElBQzdEalcsSUFBSSxDQUFDdVQsa0JBQWtCLENBQUM3VixHQUFHLENBQUNzQyxJQUFJLENBQUN1VCxrQkFBa0IsQ0FBQ3FELFlBQVksQ0FBQyxDQUFDLENBQUM7WUFDckUsSUFBSWEsV0FBVztZQUVmLElBQUlTLGVBQWUsRUFBRTtjQUNuQjtjQUNBO2NBQ0E7Y0FDQTtjQUNBO2NBQ0E7Y0FDQTtjQUNBO2NBQ0E7Y0FDQSxJQUFJSSxnQkFBZ0IsR0FBRyxDQUFFdFksSUFBSSxDQUFDb1QsTUFBTSxJQUNsQ3BULElBQUksQ0FBQ3VULGtCQUFrQixDQUFDMEMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQ3BDbEQsVUFBVSxDQUFDOEQsTUFBTSxFQUFFd0IsV0FBVyxDQUFDLElBQUksQ0FBQztjQUV0QyxJQUFJQyxnQkFBZ0IsRUFBRTtnQkFDcEJ0WSxJQUFJLENBQUMrVyxnQkFBZ0IsQ0FBQ3ZYLEVBQUUsRUFBRXdYLE1BQU0sRUFBRUgsTUFBTSxDQUFDO2NBQzNDLENBQUMsTUFBTTtnQkFDTDtnQkFDQTdXLElBQUksQ0FBQ3lXLGdCQUFnQixDQUFDalgsRUFBRSxDQUFDO2dCQUN6QjtnQkFDQWlZLFdBQVcsR0FBR3pYLElBQUksQ0FBQ3VULGtCQUFrQixDQUFDN1YsR0FBRyxDQUN2Q3NDLElBQUksQ0FBQ3VULGtCQUFrQixDQUFDNEMsWUFBWSxDQUFDLENBQUMsQ0FBQztnQkFFekMsSUFBSTBCLFFBQVEsR0FBRzdYLElBQUksQ0FBQzJULG1CQUFtQixJQUNoQzhELFdBQVcsSUFBSTFFLFVBQVUsQ0FBQzhELE1BQU0sRUFBRVksV0FBVyxDQUFDLElBQUksQ0FBRTtnQkFFM0QsSUFBSUksUUFBUSxFQUFFO2tCQUNaN1gsSUFBSSxDQUFDd1csWUFBWSxDQUFDaFgsRUFBRSxFQUFFcVgsTUFBTSxDQUFDO2dCQUMvQixDQUFDLE1BQU07a0JBQ0w7a0JBQ0E3VyxJQUFJLENBQUMyVCxtQkFBbUIsR0FBRyxLQUFLO2dCQUNsQztjQUNGO1lBQ0YsQ0FBQyxNQUFNLElBQUl3RSxjQUFjLEVBQUU7Y0FDekJuQixNQUFNLEdBQUdoWCxJQUFJLENBQUN1VCxrQkFBa0IsQ0FBQzdWLEdBQUcsQ0FBQzhCLEVBQUUsQ0FBQztjQUN4QztjQUNBO2NBQ0E7Y0FDQTtjQUNBUSxJQUFJLENBQUN1VCxrQkFBa0IsQ0FBQytDLE1BQU0sQ0FBQzlXLEVBQUUsQ0FBQztjQUVsQyxJQUFJZ1ksWUFBWSxHQUFHeFgsSUFBSSxDQUFDeVQsVUFBVSxDQUFDL1YsR0FBRyxDQUNwQ3NDLElBQUksQ0FBQ3lULFVBQVUsQ0FBQzBDLFlBQVksQ0FBQyxDQUFDLENBQUM7Y0FDakNzQixXQUFXLEdBQUd6WCxJQUFJLENBQUN1VCxrQkFBa0IsQ0FBQzBDLElBQUksQ0FBQyxDQUFDLElBQ3RDalcsSUFBSSxDQUFDdVQsa0JBQWtCLENBQUM3VixHQUFHLENBQ3pCc0MsSUFBSSxDQUFDdVQsa0JBQWtCLENBQUM0QyxZQUFZLENBQUMsQ0FBQyxDQUFDOztjQUUvQztjQUNBLElBQUl1QixTQUFTLEdBQUczRSxVQUFVLENBQUM4RCxNQUFNLEVBQUVXLFlBQVksQ0FBQyxHQUFHLENBQUM7O2NBRXBEO2NBQ0EsSUFBSWUsYUFBYSxHQUFJLENBQUViLFNBQVMsSUFBSTFYLElBQUksQ0FBQzJULG1CQUFtQixJQUNyRCxDQUFDK0QsU0FBUyxJQUFJRCxXQUFXLElBQ3pCMUUsVUFBVSxDQUFDOEQsTUFBTSxFQUFFWSxXQUFXLENBQUMsSUFBSSxDQUFFO2NBRTVDLElBQUlDLFNBQVMsRUFBRTtnQkFDYjFYLElBQUksQ0FBQzhWLGFBQWEsQ0FBQ3RXLEVBQUUsRUFBRXFYLE1BQU0sQ0FBQztjQUNoQyxDQUFDLE1BQU0sSUFBSTBCLGFBQWEsRUFBRTtnQkFDeEI7Z0JBQ0F2WSxJQUFJLENBQUN1VCxrQkFBa0IsQ0FBQzdFLEdBQUcsQ0FBQ2xQLEVBQUUsRUFBRXFYLE1BQU0sQ0FBQztjQUN6QyxDQUFDLE1BQU07Z0JBQ0w7Z0JBQ0E3VyxJQUFJLENBQUMyVCxtQkFBbUIsR0FBRyxLQUFLO2dCQUNoQztnQkFDQTtnQkFDQSxJQUFJLENBQUUzVCxJQUFJLENBQUN1VCxrQkFBa0IsQ0FBQzBDLElBQUksQ0FBQyxDQUFDLEVBQUU7a0JBQ3BDalcsSUFBSSxDQUFDaVYsZ0JBQWdCLENBQUMsQ0FBQztnQkFDekI7Y0FDRjtZQUNGLENBQUMsTUFBTTtjQUNMLE1BQU0sSUFBSXpSLEtBQUssQ0FBQywyRUFBMkUsQ0FBQztZQUM5RjtVQUNGO1FBQ0YsQ0FBQyxDQUFDO01BQ0osQ0FBQztNQUNEZ1YsdUJBQXVCLEVBQUUsU0FBQUEsQ0FBQSxFQUFZO1FBQ25DLElBQUl4WSxJQUFJLEdBQUcsSUFBSTtRQUNmQSxJQUFJLENBQUNtVSxvQkFBb0IsQ0FBQzlCLEtBQUssQ0FBQ0UsUUFBUSxDQUFDO1FBQ3pDO1FBQ0E7UUFDQXpVLE1BQU0sQ0FBQzJhLEtBQUssQ0FBQy9GLHVCQUF1QixDQUFDLGtCQUFrQjtVQUNyRCxPQUFPLENBQUMxUyxJQUFJLENBQUM2QixRQUFRLElBQUksQ0FBQzdCLElBQUksQ0FBQzJVLFlBQVksQ0FBQytCLEtBQUssQ0FBQyxDQUFDLEVBQUU7WUFDbkQsSUFBSTFXLElBQUksQ0FBQ2tWLE1BQU0sS0FBSzdDLEtBQUssQ0FBQ0MsUUFBUSxFQUFFO2NBQ2xDO2NBQ0E7Y0FDQTtjQUNBO1lBQ0Y7O1lBRUE7WUFDQSxJQUFJdFMsSUFBSSxDQUFDa1YsTUFBTSxLQUFLN0MsS0FBSyxDQUFDRSxRQUFRLEVBQ2hDLE1BQU0sSUFBSS9PLEtBQUssQ0FBQyxtQ0FBbUMsR0FBR3hELElBQUksQ0FBQ2tWLE1BQU0sQ0FBQztZQUVwRWxWLElBQUksQ0FBQzRVLGtCQUFrQixHQUFHNVUsSUFBSSxDQUFDMlUsWUFBWTtZQUMzQyxJQUFJK0QsY0FBYyxHQUFHLEVBQUUxWSxJQUFJLENBQUM2VSxnQkFBZ0I7WUFDNUM3VSxJQUFJLENBQUMyVSxZQUFZLEdBQUcsSUFBSXRWLGVBQWUsQ0FBQ2tTLE1BQU0sQ0FBRCxDQUFDOztZQUU5QztZQUNBLE1BQU1vSCxhQUFhLEdBQUcsRUFBRTtZQUV4QjNZLElBQUksQ0FBQzRVLGtCQUFrQixDQUFDOVYsT0FBTyxDQUFDLFVBQVVvRixFQUFFLEVBQUUxRSxFQUFFLEVBQUU7Y0FDaEQsTUFBTW9aLFlBQVksR0FBRyxJQUFJalcsT0FBTyxDQUFDLENBQUNnSCxPQUFPLEVBQUUrRCxNQUFNLEtBQUs7Z0JBQ3BEMU4sSUFBSSxDQUFDb1AsWUFBWSxDQUFDeUosV0FBVyxDQUFDeEssS0FBSyxDQUNqQ3JPLElBQUksQ0FBQ21QLGtCQUFrQixDQUFDaFEsY0FBYyxFQUN0Q0ssRUFBRSxFQUNGMEUsRUFBRSxFQUNGd08sdUJBQXVCLENBQUMsVUFBU25OLEdBQUcsRUFBRTRDLEdBQUcsRUFBRTtrQkFDekMsSUFBSTVDLEdBQUcsRUFBRTtvQkFDUHpILE1BQU0sQ0FBQzBILE1BQU0sQ0FBQyx3Q0FBd0MsRUFBRUQsR0FBRyxDQUFDO29CQUM1RDtvQkFDQTtvQkFDQTtvQkFDQTtvQkFDQSxJQUFJdkYsSUFBSSxDQUFDa1YsTUFBTSxLQUFLN0MsS0FBSyxDQUFDQyxRQUFRLEVBQUU7c0JBQ2xDdFMsSUFBSSxDQUFDaVYsZ0JBQWdCLENBQUMsQ0FBQztvQkFDekI7b0JBQ0F0TCxPQUFPLENBQUMsQ0FBQztvQkFDVDtrQkFDRjtrQkFFQSxJQUNFLENBQUMzSixJQUFJLENBQUM2QixRQUFRLElBQ2Q3QixJQUFJLENBQUNrVixNQUFNLEtBQUs3QyxLQUFLLENBQUNFLFFBQVEsSUFDOUJ2UyxJQUFJLENBQUM2VSxnQkFBZ0IsS0FBSzZELGNBQWMsRUFDeEM7b0JBQ0E7b0JBQ0E7b0JBQ0E7b0JBQ0E7b0JBQ0EsSUFBSTtzQkFDRjFZLElBQUksQ0FBQytYLFVBQVUsQ0FBQ3ZZLEVBQUUsRUFBRTJJLEdBQUcsQ0FBQztzQkFDeEJ3QixPQUFPLENBQUMsQ0FBQztvQkFDWCxDQUFDLENBQUMsT0FBT3BFLEdBQUcsRUFBRTtzQkFDWm1JLE1BQU0sQ0FBQ25JLEdBQUcsQ0FBQztvQkFDYjtrQkFDRixDQUFDLE1BQU07b0JBQ0xvRSxPQUFPLENBQUMsQ0FBQztrQkFDWDtnQkFDRixDQUFDLENBQ0gsQ0FBQztjQUNILENBQUMsQ0FBQztjQUNGZ1AsYUFBYSxDQUFDbGEsSUFBSSxDQUFDbWEsWUFBWSxDQUFDO1lBQ2xDLENBQUMsQ0FBQztZQUNGO1lBQ0EsSUFBSTtjQUNGLE1BQU1FLE9BQU8sR0FBRyxNQUFNblcsT0FBTyxDQUFDZ0wsVUFBVSxDQUFDZ0wsYUFBYSxDQUFDO2NBQ3ZELE1BQU1JLE1BQU0sR0FBR0QsT0FBTyxDQUNuQkUsTUFBTSxDQUFDbk0sTUFBTSxJQUFJQSxNQUFNLENBQUNnQixNQUFNLEtBQUssVUFBVSxDQUFDLENBQzlDakosR0FBRyxDQUFDaUksTUFBTSxJQUFJQSxNQUFNLENBQUNpQixNQUFNLENBQUM7Y0FFL0IsSUFBSWlMLE1BQU0sQ0FBQ3hWLE1BQU0sR0FBRyxDQUFDLEVBQUU7Z0JBQ3JCekYsTUFBTSxDQUFDMEgsTUFBTSxDQUFDLDRCQUE0QixFQUFFdVQsTUFBTSxDQUFDO2NBQ3JEO1lBQ0YsQ0FBQyxDQUFDLE9BQU94VCxHQUFHLEVBQUU7Y0FDWnpILE1BQU0sQ0FBQzBILE1BQU0sQ0FBQyxtQ0FBbUMsRUFBRUQsR0FBRyxDQUFDO1lBQ3pEO1lBQ0E7WUFDQSxJQUFJdkYsSUFBSSxDQUFDa1YsTUFBTSxLQUFLN0MsS0FBSyxDQUFDQyxRQUFRLEVBQ2hDO1lBQ0Z0UyxJQUFJLENBQUM0VSxrQkFBa0IsR0FBRyxJQUFJO1VBQ2hDO1VBQ0E7VUFDQTtVQUNBLElBQUk1VSxJQUFJLENBQUNrVixNQUFNLEtBQUs3QyxLQUFLLENBQUNDLFFBQVEsRUFDaEMsTUFBTXRTLElBQUksQ0FBQ2laLFNBQVMsQ0FBQyxDQUFDO1FBQzFCLENBQUMsQ0FBQyxDQUFDO01BQ0wsQ0FBQztNQUNEQSxTQUFTLEVBQUUsZUFBQUEsQ0FBQSxFQUFrQjtRQUMzQixJQUFJalosSUFBSSxHQUFHLElBQUk7UUFDZkEsSUFBSSxDQUFDbVUsb0JBQW9CLENBQUM5QixLQUFLLENBQUNHLE1BQU0sQ0FBQztRQUN2QyxJQUFJMEcsTUFBTSxHQUFHbFosSUFBSSxDQUFDK1UsZ0NBQWdDLElBQUksRUFBRTtRQUN4RC9VLElBQUksQ0FBQytVLGdDQUFnQyxHQUFHLEVBQUU7UUFDMUMsTUFBTS9VLElBQUksQ0FBQ3FQLFlBQVksQ0FBQzlDLE9BQU8sQ0FBQyxrQkFBa0I7VUFDaEQsSUFBSTtZQUNGLEtBQUssTUFBTXVGLENBQUMsSUFBSW9ILE1BQU0sRUFBRTtjQUN0QixNQUFNcEgsQ0FBQyxDQUFDQyxTQUFTLENBQUMsQ0FBQztZQUNyQjtVQUNGLENBQUMsQ0FBQyxPQUFPM0wsQ0FBQyxFQUFFO1lBQ1ZXLE9BQU8sQ0FBQ0MsS0FBSyxDQUFDLGlCQUFpQixFQUFFO2NBQUNrUztZQUFNLENBQUMsRUFBRTlTLENBQUMsQ0FBQztVQUMvQztRQUNGLENBQUMsQ0FBQztNQUNKLENBQUM7TUFDRCtPLHlCQUF5QixFQUFFLFNBQUFBLENBQVVqUixFQUFFLEVBQUU7UUFDdkMsSUFBSWxFLElBQUksR0FBRyxJQUFJO1FBQ2ZsQyxNQUFNLENBQUNpWSxnQkFBZ0IsQ0FBQyxZQUFZO1VBQ2xDL1YsSUFBSSxDQUFDMlUsWUFBWSxDQUFDakcsR0FBRyxDQUFDdk8sT0FBTyxDQUFDK0QsRUFBRSxDQUFDLEVBQUVBLEVBQUUsQ0FBQztRQUN4QyxDQUFDLENBQUM7TUFDSixDQUFDO01BQ0RrUixpQ0FBaUMsRUFBRSxTQUFBQSxDQUFVbFIsRUFBRSxFQUFFO1FBQy9DLElBQUlsRSxJQUFJLEdBQUcsSUFBSTtRQUNmbEMsTUFBTSxDQUFDaVksZ0JBQWdCLENBQUMsWUFBWTtVQUNsQyxJQUFJdlcsRUFBRSxHQUFHVyxPQUFPLENBQUMrRCxFQUFFLENBQUM7VUFDcEI7VUFDQTs7VUFFQSxJQUFJbEUsSUFBSSxDQUFDa1YsTUFBTSxLQUFLN0MsS0FBSyxDQUFDRSxRQUFRLEtBQzVCdlMsSUFBSSxDQUFDNFUsa0JBQWtCLElBQUk1VSxJQUFJLENBQUM0VSxrQkFBa0IsQ0FBQ3BHLEdBQUcsQ0FBQ2hQLEVBQUUsQ0FBQyxJQUMzRFEsSUFBSSxDQUFDMlUsWUFBWSxDQUFDbkcsR0FBRyxDQUFDaFAsRUFBRSxDQUFDLENBQUMsRUFBRTtZQUMvQlEsSUFBSSxDQUFDMlUsWUFBWSxDQUFDakcsR0FBRyxDQUFDbFAsRUFBRSxFQUFFMEUsRUFBRSxDQUFDO1lBQzdCO1VBQ0Y7VUFFQSxJQUFJQSxFQUFFLENBQUNBLEVBQUUsS0FBSyxHQUFHLEVBQUU7WUFDakIsSUFBSWxFLElBQUksQ0FBQ3lULFVBQVUsQ0FBQ2pGLEdBQUcsQ0FBQ2hQLEVBQUUsQ0FBQyxJQUN0QlEsSUFBSSxDQUFDb1QsTUFBTSxJQUFJcFQsSUFBSSxDQUFDdVQsa0JBQWtCLENBQUMvRSxHQUFHLENBQUNoUCxFQUFFLENBQUUsRUFDbERRLElBQUksQ0FBQzhYLGVBQWUsQ0FBQ3RZLEVBQUUsQ0FBQztVQUM1QixDQUFDLE1BQU0sSUFBSTBFLEVBQUUsQ0FBQ0EsRUFBRSxLQUFLLEdBQUcsRUFBRTtZQUN4QixJQUFJbEUsSUFBSSxDQUFDeVQsVUFBVSxDQUFDakYsR0FBRyxDQUFDaFAsRUFBRSxDQUFDLEVBQ3pCLE1BQU0sSUFBSWdFLEtBQUssQ0FBQyxtREFBbUQsQ0FBQztZQUN0RSxJQUFJeEQsSUFBSSxDQUFDdVQsa0JBQWtCLElBQUl2VCxJQUFJLENBQUN1VCxrQkFBa0IsQ0FBQy9FLEdBQUcsQ0FBQ2hQLEVBQUUsQ0FBQyxFQUM1RCxNQUFNLElBQUlnRSxLQUFLLENBQUMsZ0RBQWdELENBQUM7O1lBRW5FO1lBQ0E7WUFDQSxJQUFJeEQsSUFBSSxDQUFDb1UsUUFBUSxDQUFDNkQsZUFBZSxDQUFDL1QsRUFBRSxDQUFDNkUsQ0FBQyxDQUFDLENBQUM4RCxNQUFNLEVBQzVDN00sSUFBSSxDQUFDdVgsWUFBWSxDQUFDclQsRUFBRSxDQUFDNkUsQ0FBQyxDQUFDO1VBQzNCLENBQUMsTUFBTSxJQUFJN0UsRUFBRSxDQUFDQSxFQUFFLEtBQUssR0FBRyxFQUFFO1lBQ3hCO1lBQ0E7WUFDQUEsRUFBRSxDQUFDNkUsQ0FBQyxHQUFHbUosa0JBQWtCLENBQUNoTyxFQUFFLENBQUM2RSxDQUFDLENBQUM7WUFDL0I7WUFDQTtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0EsSUFBSW9RLFNBQVMsR0FBRyxDQUFDM0ssR0FBRyxDQUFDdEssRUFBRSxDQUFDNkUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUN5RixHQUFHLENBQUN0SyxFQUFFLENBQUM2RSxDQUFDLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQ3lGLEdBQUcsQ0FBQ3RLLEVBQUUsQ0FBQzZFLENBQUMsRUFBRSxRQUFRLENBQUM7WUFDaEY7WUFDQTtZQUNBO1lBQ0E7WUFDQSxJQUFJcVEsb0JBQW9CLEdBQ3RCLENBQUNELFNBQVMsSUFBSUUsNEJBQTRCLENBQUNuVixFQUFFLENBQUM2RSxDQUFDLENBQUM7WUFFbEQsSUFBSW1QLGVBQWUsR0FBR2xZLElBQUksQ0FBQ3lULFVBQVUsQ0FBQ2pGLEdBQUcsQ0FBQ2hQLEVBQUUsQ0FBQztZQUM3QyxJQUFJMlksY0FBYyxHQUFHblksSUFBSSxDQUFDb1QsTUFBTSxJQUFJcFQsSUFBSSxDQUFDdVQsa0JBQWtCLENBQUMvRSxHQUFHLENBQUNoUCxFQUFFLENBQUM7WUFFbkUsSUFBSTJaLFNBQVMsRUFBRTtjQUNiblosSUFBSSxDQUFDK1gsVUFBVSxDQUFDdlksRUFBRSxFQUFFQyxNQUFNLENBQUNDLE1BQU0sQ0FBQztnQkFBQ3NKLEdBQUcsRUFBRXhKO2NBQUUsQ0FBQyxFQUFFMEUsRUFBRSxDQUFDNkUsQ0FBQyxDQUFDLENBQUM7WUFDckQsQ0FBQyxNQUFNLElBQUksQ0FBQ21QLGVBQWUsSUFBSUMsY0FBYyxLQUNsQ2lCLG9CQUFvQixFQUFFO2NBQy9CO2NBQ0E7Y0FDQSxJQUFJdkMsTUFBTSxHQUFHN1csSUFBSSxDQUFDeVQsVUFBVSxDQUFDakYsR0FBRyxDQUFDaFAsRUFBRSxDQUFDLEdBQ2hDUSxJQUFJLENBQUN5VCxVQUFVLENBQUMvVixHQUFHLENBQUM4QixFQUFFLENBQUMsR0FBR1EsSUFBSSxDQUFDdVQsa0JBQWtCLENBQUM3VixHQUFHLENBQUM4QixFQUFFLENBQUM7Y0FDN0RxWCxNQUFNLEdBQUc5SixLQUFLLENBQUMzTyxLQUFLLENBQUN5WSxNQUFNLENBQUM7Y0FFNUJBLE1BQU0sQ0FBQzdOLEdBQUcsR0FBR3hKLEVBQUU7Y0FDZixJQUFJO2dCQUNGSCxlQUFlLENBQUNpYSxPQUFPLENBQUN6QyxNQUFNLEVBQUUzUyxFQUFFLENBQUM2RSxDQUFDLENBQUM7Y0FDdkMsQ0FBQyxDQUFDLE9BQU8zQyxDQUFDLEVBQUU7Z0JBQ1YsSUFBSUEsQ0FBQyxDQUFDbVQsSUFBSSxLQUFLLGdCQUFnQixFQUM3QixNQUFNblQsQ0FBQztnQkFDVDtnQkFDQXBHLElBQUksQ0FBQzJVLFlBQVksQ0FBQ2pHLEdBQUcsQ0FBQ2xQLEVBQUUsRUFBRTBFLEVBQUUsQ0FBQztnQkFDN0IsSUFBSWxFLElBQUksQ0FBQ2tWLE1BQU0sS0FBSzdDLEtBQUssQ0FBQ0csTUFBTSxFQUFFO2tCQUNoQ3hTLElBQUksQ0FBQ3dZLHVCQUF1QixDQUFDLENBQUM7Z0JBQ2hDO2dCQUNBO2NBQ0Y7Y0FDQXhZLElBQUksQ0FBQytYLFVBQVUsQ0FBQ3ZZLEVBQUUsRUFBRVEsSUFBSSxDQUFDMFUsbUJBQW1CLENBQUNtQyxNQUFNLENBQUMsQ0FBQztZQUN2RCxDQUFDLE1BQU0sSUFBSSxDQUFDdUMsb0JBQW9CLElBQ3JCcFosSUFBSSxDQUFDb1UsUUFBUSxDQUFDb0YsdUJBQXVCLENBQUN0VixFQUFFLENBQUM2RSxDQUFDLENBQUMsSUFDMUMvSSxJQUFJLENBQUNzVCxPQUFPLElBQUl0VCxJQUFJLENBQUNzVCxPQUFPLENBQUNtRyxrQkFBa0IsQ0FBQ3ZWLEVBQUUsQ0FBQzZFLENBQUMsQ0FBRSxFQUFFO2NBQ2xFL0ksSUFBSSxDQUFDMlUsWUFBWSxDQUFDakcsR0FBRyxDQUFDbFAsRUFBRSxFQUFFMEUsRUFBRSxDQUFDO2NBQzdCLElBQUlsRSxJQUFJLENBQUNrVixNQUFNLEtBQUs3QyxLQUFLLENBQUNHLE1BQU0sRUFDOUJ4UyxJQUFJLENBQUN3WSx1QkFBdUIsQ0FBQyxDQUFDO1lBQ2xDO1VBQ0YsQ0FBQyxNQUFNO1lBQ0wsTUFBTWhWLEtBQUssQ0FBQyw0QkFBNEIsR0FBR1UsRUFBRSxDQUFDO1VBQ2hEO1FBQ0YsQ0FBQyxDQUFDO01BQ0osQ0FBQztNQUVELE1BQU13VixxQkFBcUJBLENBQUEsRUFBRztRQUM1QixJQUFJMVosSUFBSSxHQUFHLElBQUk7UUFDZixJQUFJQSxJQUFJLENBQUM2QixRQUFRLEVBQ2YsTUFBTSxJQUFJMkIsS0FBSyxDQUFDLGtDQUFrQyxDQUFDO1FBRXJELE1BQU14RCxJQUFJLENBQUMyWixTQUFTLENBQUM7VUFBQ0MsT0FBTyxFQUFFO1FBQUksQ0FBQyxDQUFDLENBQUMsQ0FBRTs7UUFFeEMsSUFBSTVaLElBQUksQ0FBQzZCLFFBQVEsRUFDZixPQUFPLENBQUU7O1FBRVg7UUFDQTtRQUNBLE1BQU03QixJQUFJLENBQUNxUCxZQUFZLENBQUNqRCxLQUFLLENBQUMsQ0FBQztRQUUvQixNQUFNcE0sSUFBSSxDQUFDNlosYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFFO01BQy9CLENBQUM7TUFFRDtNQUNBaEUsZ0JBQWdCLEVBQUUsU0FBQUEsQ0FBQSxFQUFZO1FBQzVCLE9BQU8sSUFBSSxDQUFDNkQscUJBQXFCLENBQUMsQ0FBQztNQUNyQyxDQUFDO01BRUQ7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBSSxVQUFVLEVBQUUsU0FBQUEsQ0FBQSxFQUFZO1FBQ3RCLElBQUk5WixJQUFJLEdBQUcsSUFBSTtRQUNmbEMsTUFBTSxDQUFDaVksZ0JBQWdCLENBQUMsWUFBWTtVQUNsQyxJQUFJL1YsSUFBSSxDQUFDNkIsUUFBUSxFQUNmOztVQUVGO1VBQ0E3QixJQUFJLENBQUMyVSxZQUFZLEdBQUcsSUFBSXRWLGVBQWUsQ0FBQ2tTLE1BQU0sQ0FBRCxDQUFDO1VBQzlDdlIsSUFBSSxDQUFDNFUsa0JBQWtCLEdBQUcsSUFBSTtVQUM5QixFQUFFNVUsSUFBSSxDQUFDNlUsZ0JBQWdCLENBQUMsQ0FBRTtVQUMxQjdVLElBQUksQ0FBQ21VLG9CQUFvQixDQUFDOUIsS0FBSyxDQUFDQyxRQUFRLENBQUM7O1VBRXpDO1VBQ0E7VUFDQXhVLE1BQU0sQ0FBQzJhLEtBQUssQ0FBQyxrQkFBa0I7WUFDN0IsTUFBTXpZLElBQUksQ0FBQzJaLFNBQVMsQ0FBQyxDQUFDO1lBQ3RCLE1BQU0zWixJQUFJLENBQUM2WixhQUFhLENBQUMsQ0FBQztVQUM1QixDQUFDLENBQUM7UUFDSixDQUFDLENBQUM7TUFDSixDQUFDO01BRUQ7TUFDQSxNQUFNRSxjQUFjQSxDQUFDN04sT0FBTyxFQUFFO1FBQzVCLElBQUlsTSxJQUFJLEdBQUcsSUFBSTtRQUNma00sT0FBTyxHQUFHQSxPQUFPLElBQUksQ0FBQyxDQUFDO1FBQ3ZCLElBQUltRixVQUFVLEVBQUUySSxTQUFTOztRQUV6QjtRQUNBLE9BQU8sSUFBSSxFQUFFO1VBQ1g7VUFDQSxJQUFJaGEsSUFBSSxDQUFDNkIsUUFBUSxFQUNmO1VBRUZ3UCxVQUFVLEdBQUcsSUFBSWhTLGVBQWUsQ0FBQ2tTLE1BQU0sQ0FBRCxDQUFDO1VBQ3ZDeUksU0FBUyxHQUFHLElBQUkzYSxlQUFlLENBQUNrUyxNQUFNLENBQUQsQ0FBQzs7VUFFdEM7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQSxJQUFJMEksTUFBTSxHQUFHamEsSUFBSSxDQUFDa2EsZUFBZSxDQUFDO1lBQUVqSCxLQUFLLEVBQUVqVCxJQUFJLENBQUNvVCxNQUFNLEdBQUc7VUFBRSxDQUFDLENBQUM7VUFDN0QsSUFBSTtZQUNGLE1BQU02RyxNQUFNLENBQUNuYixPQUFPLENBQUMsVUFBVXFKLEdBQUcsRUFBRWdTLENBQUMsRUFBRTtjQUFHO2NBQ3hDLElBQUksQ0FBQ25hLElBQUksQ0FBQ29ULE1BQU0sSUFBSStHLENBQUMsR0FBR25hLElBQUksQ0FBQ29ULE1BQU0sRUFBRTtnQkFDbkMvQixVQUFVLENBQUMzQyxHQUFHLENBQUN2RyxHQUFHLENBQUNhLEdBQUcsRUFBRWIsR0FBRyxDQUFDO2NBQzlCLENBQUMsTUFBTTtnQkFDTDZSLFNBQVMsQ0FBQ3RMLEdBQUcsQ0FBQ3ZHLEdBQUcsQ0FBQ2EsR0FBRyxFQUFFYixHQUFHLENBQUM7Y0FDN0I7WUFDRixDQUFDLENBQUM7WUFDRjtVQUNGLENBQUMsQ0FBQyxPQUFPL0IsQ0FBQyxFQUFFO1lBQ1YsSUFBSThGLE9BQU8sQ0FBQzBOLE9BQU8sSUFBSSxPQUFPeFQsQ0FBQyxDQUFDdUwsSUFBSyxLQUFLLFFBQVEsRUFBRTtjQUNsRDtjQUNBO2NBQ0E7Y0FDQTtjQUNBO2NBQ0EsTUFBTTNSLElBQUksQ0FBQ3FQLFlBQVksQ0FBQy9DLFVBQVUsQ0FBQ2xHLENBQUMsQ0FBQztjQUNyQztZQUNGOztZQUVBO1lBQ0E7WUFDQXRJLE1BQU0sQ0FBQzBILE1BQU0sQ0FBQyxtQ0FBbUMsRUFBRVksQ0FBQyxDQUFDO1lBQ3JELE1BQU10SSxNQUFNLENBQUNzYyxXQUFXLENBQUMsR0FBRyxDQUFDO1VBQy9CO1FBQ0Y7UUFFQSxJQUFJcGEsSUFBSSxDQUFDNkIsUUFBUSxFQUNmO1FBRUY3QixJQUFJLENBQUNxYSxrQkFBa0IsQ0FBQ2hKLFVBQVUsRUFBRTJJLFNBQVMsQ0FBQztNQUNoRCxDQUFDO01BRUQ7TUFDQUwsU0FBUyxFQUFFLFNBQUFBLENBQVV6TixPQUFPLEVBQUU7UUFDNUIsT0FBTyxJQUFJLENBQUM2TixjQUFjLENBQUM3TixPQUFPLENBQUM7TUFDckMsQ0FBQztNQUVEO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBK0ksZ0JBQWdCLEVBQUUsU0FBQUEsQ0FBQSxFQUFZO1FBQzVCLElBQUlqVixJQUFJLEdBQUcsSUFBSTtRQUNmbEMsTUFBTSxDQUFDaVksZ0JBQWdCLENBQUMsWUFBWTtVQUNsQyxJQUFJL1YsSUFBSSxDQUFDNkIsUUFBUSxFQUNmOztVQUVGO1VBQ0E7VUFDQSxJQUFJN0IsSUFBSSxDQUFDa1YsTUFBTSxLQUFLN0MsS0FBSyxDQUFDQyxRQUFRLEVBQUU7WUFDbEN0UyxJQUFJLENBQUM4WixVQUFVLENBQUMsQ0FBQztZQUNqQixNQUFNLElBQUlySCxlQUFlLENBQUQsQ0FBQztVQUMzQjs7VUFFQTtVQUNBO1VBQ0F6UyxJQUFJLENBQUM4VSx5QkFBeUIsR0FBRyxJQUFJO1FBQ3ZDLENBQUMsQ0FBQztNQUNKLENBQUM7TUFFRDtNQUNBK0UsYUFBYSxFQUFFLGVBQUFBLENBQUEsRUFBa0I7UUFDL0IsSUFBSTdaLElBQUksR0FBRyxJQUFJO1FBRWYsSUFBSUEsSUFBSSxDQUFDNkIsUUFBUSxFQUNmO1FBRUYsTUFBTTdCLElBQUksQ0FBQ29QLFlBQVksQ0FBQzRGLFlBQVksQ0FBQzdOLGlCQUFpQixDQUFDLENBQUM7UUFFeEQsSUFBSW5ILElBQUksQ0FBQzZCLFFBQVEsRUFDZjtRQUVGLElBQUk3QixJQUFJLENBQUNrVixNQUFNLEtBQUs3QyxLQUFLLENBQUNDLFFBQVEsRUFDaEMsTUFBTTlPLEtBQUssQ0FBQyxxQkFBcUIsR0FBR3hELElBQUksQ0FBQ2tWLE1BQU0sQ0FBQztRQUVsRCxJQUFJbFYsSUFBSSxDQUFDOFUseUJBQXlCLEVBQUU7VUFDbEM5VSxJQUFJLENBQUM4VSx5QkFBeUIsR0FBRyxLQUFLO1VBQ3RDOVUsSUFBSSxDQUFDOFosVUFBVSxDQUFDLENBQUM7UUFDbkIsQ0FBQyxNQUFNLElBQUk5WixJQUFJLENBQUMyVSxZQUFZLENBQUMrQixLQUFLLENBQUMsQ0FBQyxFQUFFO1VBQ3BDLE1BQU0xVyxJQUFJLENBQUNpWixTQUFTLENBQUMsQ0FBQztRQUN4QixDQUFDLE1BQU07VUFDTGpaLElBQUksQ0FBQ3dZLHVCQUF1QixDQUFDLENBQUM7UUFDaEM7TUFDRixDQUFDO01BRUQwQixlQUFlLEVBQUUsU0FBQUEsQ0FBVUksZ0JBQWdCLEVBQUU7UUFDM0MsSUFBSXRhLElBQUksR0FBRyxJQUFJO1FBQ2YsT0FBT2xDLE1BQU0sQ0FBQ2lZLGdCQUFnQixDQUFDLFlBQVk7VUFDekM7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBLElBQUk3SixPQUFPLEdBQUd6TSxNQUFNLENBQUNDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRU0sSUFBSSxDQUFDbVAsa0JBQWtCLENBQUNqRCxPQUFPLENBQUM7O1VBRWhFO1VBQ0E7VUFDQXpNLE1BQU0sQ0FBQ0MsTUFBTSxDQUFDd00sT0FBTyxFQUFFb08sZ0JBQWdCLENBQUM7VUFFeENwTyxPQUFPLENBQUNzQixNQUFNLEdBQUd4TixJQUFJLENBQUN3VSxpQkFBaUI7VUFDdkMsT0FBT3RJLE9BQU8sQ0FBQ3FPLFNBQVM7VUFDeEI7VUFDQSxJQUFJQyxXQUFXLEdBQUcsSUFBSWxhLGlCQUFpQixDQUNyQ04sSUFBSSxDQUFDbVAsa0JBQWtCLENBQUNoUSxjQUFjLEVBQ3RDYSxJQUFJLENBQUNtUCxrQkFBa0IsQ0FBQzVQLFFBQVEsRUFDaEMyTSxPQUFPLENBQUM7VUFDVixPQUFPLElBQUlrRyxNQUFNLENBQUNwUyxJQUFJLENBQUNvUCxZQUFZLEVBQUVvTCxXQUFXLENBQUM7UUFDbkQsQ0FBQyxDQUFDO01BQ0osQ0FBQztNQUdEO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0FILGtCQUFrQixFQUFFLFNBQUFBLENBQVVoSixVQUFVLEVBQUUySSxTQUFTLEVBQUU7UUFDbkQsSUFBSWhhLElBQUksR0FBRyxJQUFJO1FBQ2ZsQyxNQUFNLENBQUNpWSxnQkFBZ0IsQ0FBQyxZQUFZO1VBRWxDO1VBQ0E7VUFDQSxJQUFJL1YsSUFBSSxDQUFDb1QsTUFBTSxFQUFFO1lBQ2ZwVCxJQUFJLENBQUN1VCxrQkFBa0IsQ0FBQ2pMLEtBQUssQ0FBQyxDQUFDO1VBQ2pDOztVQUVBO1VBQ0E7VUFDQSxJQUFJbVMsV0FBVyxHQUFHLEVBQUU7VUFDcEJ6YSxJQUFJLENBQUN5VCxVQUFVLENBQUMzVSxPQUFPLENBQUMsVUFBVXFKLEdBQUcsRUFBRTNJLEVBQUUsRUFBRTtZQUN6QyxJQUFJLENBQUM2UixVQUFVLENBQUM3QyxHQUFHLENBQUNoUCxFQUFFLENBQUMsRUFDckJpYixXQUFXLENBQUNoYyxJQUFJLENBQUNlLEVBQUUsQ0FBQztVQUN4QixDQUFDLENBQUM7VUFDRmliLFdBQVcsQ0FBQzNiLE9BQU8sQ0FBQyxVQUFVVSxFQUFFLEVBQUU7WUFDaENRLElBQUksQ0FBQ3lXLGdCQUFnQixDQUFDalgsRUFBRSxDQUFDO1VBQzNCLENBQUMsQ0FBQzs7VUFFRjtVQUNBO1VBQ0E7VUFDQTZSLFVBQVUsQ0FBQ3ZTLE9BQU8sQ0FBQyxVQUFVcUosR0FBRyxFQUFFM0ksRUFBRSxFQUFFO1lBQ3BDUSxJQUFJLENBQUMrWCxVQUFVLENBQUN2WSxFQUFFLEVBQUUySSxHQUFHLENBQUM7VUFDMUIsQ0FBQyxDQUFDOztVQUVGO1VBQ0E7VUFDQTtVQUNBLElBQUluSSxJQUFJLENBQUN5VCxVQUFVLENBQUN3QyxJQUFJLENBQUMsQ0FBQyxLQUFLNUUsVUFBVSxDQUFDNEUsSUFBSSxDQUFDLENBQUMsRUFBRTtZQUNoRG5ZLE1BQU0sQ0FBQzBILE1BQU0sQ0FBQyx3REFBd0QsR0FDcEUsdURBQXVELEVBQ3ZEeEYsSUFBSSxDQUFDbVAsa0JBQWtCLENBQUM7VUFDNUI7VUFFQW5QLElBQUksQ0FBQ3lULFVBQVUsQ0FBQzNVLE9BQU8sQ0FBQyxVQUFVcUosR0FBRyxFQUFFM0ksRUFBRSxFQUFFO1lBQ3pDLElBQUksQ0FBQzZSLFVBQVUsQ0FBQzdDLEdBQUcsQ0FBQ2hQLEVBQUUsQ0FBQyxFQUNyQixNQUFNZ0UsS0FBSyxDQUFDLGdEQUFnRCxHQUFHaEUsRUFBRSxDQUFDO1VBQ3RFLENBQUMsQ0FBQzs7VUFFRjtVQUNBd2EsU0FBUyxDQUFDbGIsT0FBTyxDQUFDLFVBQVVxSixHQUFHLEVBQUUzSSxFQUFFLEVBQUU7WUFDbkNRLElBQUksQ0FBQ3dXLFlBQVksQ0FBQ2hYLEVBQUUsRUFBRTJJLEdBQUcsQ0FBQztVQUM1QixDQUFDLENBQUM7VUFFRm5JLElBQUksQ0FBQzJULG1CQUFtQixHQUFHcUcsU0FBUyxDQUFDL0QsSUFBSSxDQUFDLENBQUMsR0FBR2pXLElBQUksQ0FBQ29ULE1BQU07UUFDM0QsQ0FBQyxDQUFDO01BQ0osQ0FBQztNQUVEO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBbkgsS0FBSyxFQUFFLGVBQUFBLENBQUEsRUFBaUI7UUFDdEIsSUFBSWpNLElBQUksR0FBRyxJQUFJO1FBQ2YsSUFBSUEsSUFBSSxDQUFDNkIsUUFBUSxFQUNmO1FBQ0Y3QixJQUFJLENBQUM2QixRQUFRLEdBQUcsSUFBSTs7UUFFcEI7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBLEtBQUssTUFBTWlRLENBQUMsSUFBSTlSLElBQUksQ0FBQytVLGdDQUFnQyxFQUFFO1VBQ3JELE1BQU1qRCxDQUFDLENBQUNDLFNBQVMsQ0FBQyxDQUFDO1FBQ3JCO1FBQ0EvUixJQUFJLENBQUMrVSxnQ0FBZ0MsR0FBRyxJQUFJOztRQUU1QztRQUNBL1UsSUFBSSxDQUFDeVQsVUFBVSxHQUFHLElBQUk7UUFDdEJ6VCxJQUFJLENBQUN1VCxrQkFBa0IsR0FBRyxJQUFJO1FBQzlCdlQsSUFBSSxDQUFDMlUsWUFBWSxHQUFHLElBQUk7UUFDeEIzVSxJQUFJLENBQUM0VSxrQkFBa0IsR0FBRyxJQUFJO1FBQzlCNVUsSUFBSSxDQUFDMGEsaUJBQWlCLEdBQUcsSUFBSTtRQUM3QjFhLElBQUksQ0FBQzJhLGdCQUFnQixHQUFHLElBQUk7UUFFNUI5UCxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUlBLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQ0MsS0FBSyxDQUFDQyxtQkFBbUIsQ0FDcEUsZ0JBQWdCLEVBQUUsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFBQyxJQUFBNlAseUJBQUE7UUFBQSxJQUFBQyxpQkFBQTtRQUFBLElBQUFDLGNBQUE7UUFBQTtVQUVuRCxTQUFBQyxTQUFBLEdBQUE5SSxjQUFBLENBQTJCalMsSUFBSSxDQUFDNFQsWUFBWSxHQUFBb0gsS0FBQSxFQUFBSix5QkFBQSxLQUFBSSxLQUFBLFNBQUFELFNBQUEsQ0FBQUUsSUFBQSxJQUFBQyxJQUFBLEVBQUFOLHlCQUFBLFVBQUU7WUFBQSxNQUE3QjFSLE1BQU0sR0FBQThSLEtBQUEsQ0FBQW5TLEtBQUE7WUFBQTtjQUNyQixNQUFNSyxNQUFNLENBQUNySyxJQUFJLENBQUMsQ0FBQztZQUFDO1VBQ3RCO1FBQUMsU0FBQTBHLEdBQUE7VUFBQXNWLGlCQUFBO1VBQUFDLGNBQUEsR0FBQXZWLEdBQUE7UUFBQTtVQUFBO1lBQUEsSUFBQXFWLHlCQUFBLElBQUFHLFNBQUEsQ0FBQUksTUFBQTtjQUFBLE1BQUFKLFNBQUEsQ0FBQUksTUFBQTtZQUFBO1VBQUE7WUFBQSxJQUFBTixpQkFBQTtjQUFBLE1BQUFDLGNBQUE7WUFBQTtVQUFBO1FBQUE7TUFDSCxDQUFDO01BQ0RqYyxJQUFJLEVBQUUsZUFBQUEsQ0FBQSxFQUFpQjtRQUNyQixNQUFNbUIsSUFBSSxHQUFHLElBQUk7UUFDakIsT0FBTyxNQUFNQSxJQUFJLENBQUNpTSxLQUFLLENBQUMsQ0FBQztNQUMzQixDQUFDO01BRURrSSxvQkFBb0IsRUFBRSxTQUFBQSxDQUFVaUgsS0FBSyxFQUFFO1FBQ3JDLElBQUlwYixJQUFJLEdBQUcsSUFBSTtRQUNmbEMsTUFBTSxDQUFDaVksZ0JBQWdCLENBQUMsWUFBWTtVQUNsQyxJQUFJc0YsR0FBRyxHQUFHLElBQUlDLElBQUksQ0FBRCxDQUFDO1VBRWxCLElBQUl0YixJQUFJLENBQUNrVixNQUFNLEVBQUU7WUFDZixJQUFJcUcsUUFBUSxHQUFHRixHQUFHLEdBQUdyYixJQUFJLENBQUN3YixlQUFlO1lBQ3pDM1EsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJQSxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUNDLEtBQUssQ0FBQ0MsbUJBQW1CLENBQ3RFLGdCQUFnQixFQUFFLGdCQUFnQixHQUFHL0ssSUFBSSxDQUFDa1YsTUFBTSxHQUFHLFFBQVEsRUFBRXFHLFFBQVEsQ0FBQztVQUMxRTtVQUVBdmIsSUFBSSxDQUFDa1YsTUFBTSxHQUFHa0csS0FBSztVQUNuQnBiLElBQUksQ0FBQ3diLGVBQWUsR0FBR0gsR0FBRztRQUM1QixDQUFDLENBQUM7TUFDSjtJQUNGLENBQUMsQ0FBQzs7SUFFRjtJQUNBO0lBQ0E7SUFDQXhlLGtCQUFrQixDQUFDNGUsZUFBZSxHQUFHLFVBQVVwZCxpQkFBaUIsRUFBRWdXLE9BQU8sRUFBRTtNQUN6RTtNQUNBLElBQUluSSxPQUFPLEdBQUc3TixpQkFBaUIsQ0FBQzZOLE9BQU87O01BRXZDO01BQ0E7TUFDQSxJQUFJQSxPQUFPLENBQUN3UCxZQUFZLElBQUl4UCxPQUFPLENBQUN5UCxhQUFhLEVBQy9DLE9BQU8sS0FBSzs7TUFFZDtNQUNBO01BQ0E7TUFDQTtNQUNBLElBQUl6UCxPQUFPLENBQUMwUCxJQUFJLElBQUsxUCxPQUFPLENBQUMrRyxLQUFLLElBQUksQ0FBQy9HLE9BQU8sQ0FBQ2hHLElBQUssRUFBRSxPQUFPLEtBQUs7O01BRWxFO01BQ0E7TUFDQSxNQUFNc0gsTUFBTSxHQUFHdEIsT0FBTyxDQUFDc0IsTUFBTSxJQUFJdEIsT0FBTyxDQUFDakcsVUFBVTtNQUNuRCxJQUFJdUgsTUFBTSxFQUFFO1FBQ1YsSUFBSTtVQUNGbk8sZUFBZSxDQUFDd2MseUJBQXlCLENBQUNyTyxNQUFNLENBQUM7UUFDbkQsQ0FBQyxDQUFDLE9BQU9wSCxDQUFDLEVBQUU7VUFDVixJQUFJQSxDQUFDLENBQUNtVCxJQUFJLEtBQUssZ0JBQWdCLEVBQUU7WUFDL0IsT0FBTyxLQUFLO1VBQ2QsQ0FBQyxNQUFNO1lBQ0wsTUFBTW5ULENBQUM7VUFDVDtRQUNGO01BQ0Y7O01BRUE7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBLE9BQU8sQ0FBQ2lPLE9BQU8sQ0FBQ3lILFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQ3pILE9BQU8sQ0FBQzBILFdBQVcsQ0FBQyxDQUFDO0lBQ3RELENBQUM7SUFFRCxJQUFJMUMsNEJBQTRCLEdBQUcsU0FBQUEsQ0FBVTJDLFFBQVEsRUFBRTtNQUNyRCxPQUFPdmMsTUFBTSxDQUFDd2MsT0FBTyxDQUFDRCxRQUFRLENBQUMsQ0FBQ0UsS0FBSyxDQUFDLFVBQUFsUyxJQUFBLEVBQStCO1FBQUEsSUFBckIsQ0FBQ21TLFNBQVMsRUFBRTNPLE1BQU0sQ0FBQyxHQUFBeEQsSUFBQTtRQUNqRSxPQUFPdkssTUFBTSxDQUFDd2MsT0FBTyxDQUFDek8sTUFBTSxDQUFDLENBQUMwTyxLQUFLLENBQUMsVUFBQTNPLEtBQUEsRUFBMEI7VUFBQSxJQUFoQixDQUFDNk8sS0FBSyxFQUFFdlQsS0FBSyxDQUFDLEdBQUEwRSxLQUFBO1VBQzFELE9BQU8sQ0FBQyxTQUFTLENBQUM4TyxJQUFJLENBQUNELEtBQUssQ0FBQztRQUMvQixDQUFDLENBQUM7TUFDSixDQUFDLENBQUM7SUFDSixDQUFDO0lBQUN0YyxzQkFBQTtFQUFBLFNBQUFDLFdBQUE7SUFBQSxPQUFBRCxzQkFBQSxDQUFBQyxXQUFBO0VBQUE7RUFBQUQsc0JBQUE7QUFBQTtFQUFBRSxJQUFBO0VBQUFDLEtBQUE7QUFBQSxHOzs7Ozs7Ozs7Ozs7OztJQ2hqQ0Y1RCxPQUFBLENBQUFDLE1BQUE7TUFBQTRWLGtCQUFBLEVBQUFBLENBQUEsS0FBQUE7SUFBQTtJQUFBLElBQUFuRixLQUFBO0lBQUExUSxPQUFBLENBQUFLLElBQUE7TUFBQXFRLE1BQUFwUSxDQUFBO1FBQUFvUSxLQUFBLEdBQUFwUSxDQUFBO01BQUE7SUFBQTtJQUFBLElBQUFJLG9CQUFBLFdBQUFBLG9CQUFBO0lBNERBLE1BQU11ZixxQkFBcUIsR0FBRyxlQUFlO0lBRTdDOzs7SUFHQSxTQUFTQyxrQkFBa0JBLENBQUNILEtBQWE7TUFDdkMsT0FBT0UscUJBQXFCLENBQUNELElBQUksQ0FBQ0QsS0FBSyxDQUFDO0lBQzFDO0lBRUE7Ozs7SUFJQSxTQUFTSSxlQUFlQSxDQUFDQyxRQUFpQjtNQUN4QyxPQUNFQSxRQUFRLEtBQUssSUFBSSxJQUNqQixPQUFPQSxRQUFRLEtBQUssUUFBUSxJQUM1QixHQUFHLElBQUlBLFFBQVEsSUFDZEEsUUFBMEIsQ0FBQ0MsQ0FBQyxLQUFLLElBQUksSUFDdENqZCxNQUFNLENBQUNtTixJQUFJLENBQUM2UCxRQUFRLENBQUMsQ0FBQ1AsS0FBSyxDQUFDSyxrQkFBa0IsQ0FBQztJQUVuRDtJQUVBOzs7O0lBSUEsU0FBUy9YLElBQUlBLENBQUNtWSxNQUFjLEVBQUUxZCxHQUFXO01BQ3ZDLE9BQU8wZCxNQUFNLE1BQUE3WCxNQUFBLENBQU02WCxNQUFNLE9BQUE3WCxNQUFBLENBQUk3RixHQUFHLElBQUtBLEdBQUc7SUFDMUM7SUFFQTs7Ozs7Ozs7O0lBU0EsU0FBUzJkLGlCQUFpQkEsQ0FDeEJqZixNQUEyQixFQUMzQmtmLE1BQVcsRUFDWEYsTUFBYztNQUVkLElBQ0VuUixLQUFLLENBQUNzUixPQUFPLENBQUNELE1BQU0sQ0FBQyxJQUNyQixPQUFPQSxNQUFNLEtBQUssUUFBUSxJQUMxQkEsTUFBTSxLQUFLLElBQUksSUFDZkEsTUFBTSxZQUFZRSxLQUFLLENBQUNDLFFBQVEsSUFDaENqUSxLQUFLLENBQUNrUSxhQUFhLENBQUNKLE1BQU0sQ0FBQyxFQUMzQjtRQUNBbGYsTUFBTSxDQUFDZ2YsTUFBTSxDQUFDLEdBQUdFLE1BQU07UUFDdkI7TUFDRjtNQUVBLE1BQU1aLE9BQU8sR0FBR3hjLE1BQU0sQ0FBQ3djLE9BQU8sQ0FBQ1ksTUFBTSxDQUFDO01BQ3RDLElBQUlaLE9BQU8sQ0FBQzFZLE1BQU0sRUFBRTtRQUNsQjBZLE9BQU8sQ0FBQ25kLE9BQU8sQ0FBQ2tMLElBQUEsSUFBaUI7VUFBQSxJQUFoQixDQUFDL0ssR0FBRyxFQUFFNEosS0FBSyxDQUFDLEdBQUFtQixJQUFBO1VBQzNCNFMsaUJBQWlCLENBQUNqZixNQUFNLEVBQUVrTCxLQUFLLEVBQUVyRSxJQUFJLENBQUNtWSxNQUFNLEVBQUUxZCxHQUFHLENBQUMsQ0FBQztRQUNyRCxDQUFDLENBQUM7TUFDSixDQUFDLE1BQU07UUFDTHRCLE1BQU0sQ0FBQ2dmLE1BQU0sQ0FBQyxHQUFHRSxNQUFNO01BQ3pCO0lBQ0Y7SUFFQTs7Ozs7Ozs7Ozs7SUFXQSxTQUFTSyxnQkFBZ0JBLENBQ3ZCQyxVQUFzQixFQUN0QkMsSUFBZSxFQUNKO01BQUEsSUFBWFQsTUFBTSxHQUFBclIsU0FBQSxDQUFBL0gsTUFBQSxRQUFBK0gsU0FBQSxRQUFBVixTQUFBLEdBQUFVLFNBQUEsTUFBRyxFQUFFO01BRVg3TCxNQUFNLENBQUN3YyxPQUFPLENBQUNtQixJQUFJLENBQUMsQ0FBQ3RlLE9BQU8sQ0FBQ3lPLEtBQUEsSUFBcUI7UUFBQSxJQUFwQixDQUFDOFAsT0FBTyxFQUFFeFUsS0FBSyxDQUFDLEdBQUEwRSxLQUFBO1FBQzVDLElBQUk4UCxPQUFPLEtBQUssR0FBRyxFQUFFO1VBQUEsSUFBQUMsa0JBQUE7VUFDbkI7VUFDQSxDQUFBQSxrQkFBQSxHQUFBSCxVQUFVLENBQUNJLE1BQU0sY0FBQUQsa0JBQUEsY0FBQUEsa0JBQUEsR0FBakJILFVBQVUsQ0FBQ0ksTUFBTSxHQUFLLEVBQUU7VUFDeEI5ZCxNQUFNLENBQUNtTixJQUFJLENBQUMvRCxLQUFLLENBQUMsQ0FBQy9KLE9BQU8sQ0FBQ0csR0FBRyxJQUFHO1lBQy9Ca2UsVUFBVSxDQUFDSSxNQUFPLENBQUMvWSxJQUFJLENBQUNtWSxNQUFNLEVBQUUxZCxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUk7VUFDOUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxNQUFNLElBQUlvZSxPQUFPLEtBQUssR0FBRyxFQUFFO1VBQUEsSUFBQUcsZ0JBQUE7VUFDMUI7VUFDQSxDQUFBQSxnQkFBQSxHQUFBTCxVQUFVLENBQUNNLElBQUksY0FBQUQsZ0JBQUEsY0FBQUEsZ0JBQUEsR0FBZkwsVUFBVSxDQUFDTSxJQUFJLEdBQUssRUFBRTtVQUN0QmIsaUJBQWlCLENBQUNPLFVBQVUsQ0FBQ00sSUFBSSxFQUFFNVUsS0FBSyxFQUFFOFQsTUFBTSxDQUFDO1FBQ25ELENBQUMsTUFBTSxJQUFJVSxPQUFPLEtBQUssR0FBRyxFQUFFO1VBQUEsSUFBQUssaUJBQUE7VUFDMUI7VUFDQSxDQUFBQSxpQkFBQSxHQUFBUCxVQUFVLENBQUNNLElBQUksY0FBQUMsaUJBQUEsY0FBQUEsaUJBQUEsR0FBZlAsVUFBVSxDQUFDTSxJQUFJLEdBQUssRUFBRTtVQUN0QmhlLE1BQU0sQ0FBQ3djLE9BQU8sQ0FBQ3BULEtBQUssQ0FBQyxDQUFDL0osT0FBTyxDQUFDNmUsS0FBQSxJQUFzQjtZQUFBLElBQXJCLENBQUMxZSxHQUFHLEVBQUUyZSxVQUFVLENBQUMsR0FBQUQsS0FBQTtZQUM5Q1IsVUFBVSxDQUFDTSxJQUFLLENBQUNqWixJQUFJLENBQUNtWSxNQUFNLEVBQUUxZCxHQUFHLENBQUMsQ0FBQyxHQUFHMmUsVUFBVTtVQUNsRCxDQUFDLENBQUM7UUFDSixDQUFDLE1BQU0sSUFBSVAsT0FBTyxDQUFDOVQsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1VBQ2xDO1VBQ0EsTUFBTXRLLEdBQUcsR0FBR29lLE9BQU8sQ0FBQzdULEtBQUssQ0FBQyxDQUFDLENBQUM7VUFDNUIsSUFBSWdULGVBQWUsQ0FBQzNULEtBQUssQ0FBQyxFQUFFO1lBQzFCO1lBQ0FwSixNQUFNLENBQUN3YyxPQUFPLENBQUNwVCxLQUFLLENBQUMsQ0FBQy9KLE9BQU8sQ0FBQytlLEtBQUEsSUFBMkI7Y0FBQSxJQUExQixDQUFDQyxRQUFRLEVBQUVGLFVBQVUsQ0FBQyxHQUFBQyxLQUFBO2NBQ25ELElBQUlDLFFBQVEsS0FBSyxHQUFHLEVBQUU7Y0FFdEIsTUFBTUMsV0FBVyxHQUFHdlosSUFBSSxDQUFDbVksTUFBTSxLQUFBN1gsTUFBQSxDQUFLN0YsR0FBRyxPQUFBNkYsTUFBQSxDQUFJZ1osUUFBUSxDQUFDdFUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUM7Y0FDL0QsSUFBSXNVLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUU7Z0JBQ3ZCWixnQkFBZ0IsQ0FBQ0MsVUFBVSxFQUFFUyxVQUFVLEVBQUVHLFdBQVcsQ0FBQztjQUN2RCxDQUFDLE1BQU0sSUFBSUgsVUFBVSxLQUFLLElBQUksRUFBRTtnQkFBQSxJQUFBSSxtQkFBQTtnQkFDOUIsQ0FBQUEsbUJBQUEsR0FBQWIsVUFBVSxDQUFDSSxNQUFNLGNBQUFTLG1CQUFBLGNBQUFBLG1CQUFBLEdBQWpCYixVQUFVLENBQUNJLE1BQU0sR0FBSyxFQUFFO2dCQUN4QkosVUFBVSxDQUFDSSxNQUFNLENBQUNRLFdBQVcsQ0FBQyxHQUFHLElBQUk7Y0FDdkMsQ0FBQyxNQUFNO2dCQUFBLElBQUFFLGlCQUFBO2dCQUNMLENBQUFBLGlCQUFBLEdBQUFkLFVBQVUsQ0FBQ00sSUFBSSxjQUFBUSxpQkFBQSxjQUFBQSxpQkFBQSxHQUFmZCxVQUFVLENBQUNNLElBQUksR0FBSyxFQUFFO2dCQUN0Qk4sVUFBVSxDQUFDTSxJQUFJLENBQUNNLFdBQVcsQ0FBQyxHQUFHSCxVQUFVO2NBQzNDO1lBQ0YsQ0FBQyxDQUFDO1VBQ0osQ0FBQyxNQUFNLElBQUkzZSxHQUFHLEVBQUU7WUFDZDtZQUNBaWUsZ0JBQWdCLENBQUNDLFVBQVUsRUFBRXRVLEtBQUssRUFBRXJFLElBQUksQ0FBQ21ZLE1BQU0sRUFBRTFkLEdBQUcsQ0FBQyxDQUFDO1VBQ3hEO1FBQ0Y7TUFDRixDQUFDLENBQUM7SUFDSjtJQUVBOzs7Ozs7Ozs7SUFTTSxTQUFVaVQsa0JBQWtCQSxDQUFDaUwsVUFBc0I7TUFDdkQsSUFBSUEsVUFBVSxDQUFDZSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUNmLFVBQVUsQ0FBQ0MsSUFBSSxFQUFFO1FBQzNDLE9BQU9ELFVBQVU7TUFDbkI7TUFFQSxNQUFNZ0IsbUJBQW1CLEdBQWU7UUFBRUQsRUFBRSxFQUFFO01BQUMsQ0FBRTtNQUNqRGhCLGdCQUFnQixDQUFDaUIsbUJBQW1CLEVBQUVoQixVQUFVLENBQUNDLElBQUksQ0FBQztNQUN0RCxPQUFPZSxtQkFBbUI7SUFDNUI7SUFBQ3JlLHNCQUFBO0VBQUEsU0FBQUMsV0FBQTtJQUFBLE9BQUFELHNCQUFBLENBQUFDLFdBQUE7RUFBQTtFQUFBRCxzQkFBQTtBQUFBO0VBQUFFLElBQUE7RUFBQUMsS0FBQTtBQUFBLEc7Ozs7Ozs7Ozs7O0FDL0xEMUMsTUFBQSxDQUFBakIsTUFBQTtFQUFBZ0UsaUJBQUEsRUFBQUEsQ0FBQSxLQUFBQTtBQUFBO0FBUU0sTUFBT0EsaUJBQWlCO0VBSzVCUyxZQUFZNUIsY0FBc0IsRUFBRUksUUFBYSxFQUFFMk0sT0FBdUI7SUFBQSxLQUoxRS9NLGNBQWM7SUFBQSxLQUNkSSxRQUFRO0lBQUEsS0FDUjJNLE9BQU87SUFHTCxJQUFJLENBQUMvTSxjQUFjLEdBQUdBLGNBQWM7SUFDcEM7SUFDQSxJQUFJLENBQUNJLFFBQVEsR0FBR3dkLEtBQUssQ0FBQ3FCLFVBQVUsQ0FBQ0MsZ0JBQWdCLENBQUM5ZSxRQUFRLENBQUM7SUFDM0QsSUFBSSxDQUFDMk0sT0FBTyxHQUFHQSxPQUFPLElBQUksRUFBRTtFQUM5Qjs7Ozs7Ozs7Ozs7Ozs7O0lDOUJGLElBQUlvUyxhQUFhO0lBQUMvZ0IsTUFBTSxDQUFDYixJQUFJLENBQUMsc0NBQXNDLEVBQUM7TUFBQzJELE9BQU9BLENBQUMxRCxDQUFDLEVBQUM7UUFBQzJoQixhQUFhLEdBQUMzaEIsQ0FBQztNQUFBO0lBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztJQUFyR1ksTUFBTSxDQUFDakIsTUFBTSxDQUFDO01BQUNNLGVBQWUsRUFBQ0EsQ0FBQSxLQUFJQTtJQUFlLENBQUMsQ0FBQztJQUFDLElBQUlrQixNQUFNO0lBQUNQLE1BQU0sQ0FBQ2IsSUFBSSxDQUFDLGVBQWUsRUFBQztNQUFDb0IsTUFBTUEsQ0FBQ25CLENBQUMsRUFBQztRQUFDbUIsTUFBTSxHQUFDbkIsQ0FBQztNQUFBO0lBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztJQUFDLElBQUk0aEIsbUJBQW1CLEVBQUNDLGtCQUFrQjtJQUFDamhCLE1BQU0sQ0FBQ2IsSUFBSSxDQUFDLDRCQUE0QixFQUFDO01BQUM2aEIsbUJBQW1CQSxDQUFDNWhCLENBQUMsRUFBQztRQUFDNGhCLG1CQUFtQixHQUFDNWhCLENBQUM7TUFBQSxDQUFDO01BQUM2aEIsa0JBQWtCQSxDQUFDN2hCLENBQUMsRUFBQztRQUFDNmhCLGtCQUFrQixHQUFDN2hCLENBQUM7TUFBQTtJQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7SUFBQyxJQUFJOGhCLG1CQUFtQjtJQUFDbGhCLE1BQU0sQ0FBQ2IsSUFBSSxDQUFDLHlCQUF5QixFQUFDO01BQUMraEIsbUJBQW1CQSxDQUFDOWhCLENBQUMsRUFBQztRQUFDOGhCLG1CQUFtQixHQUFDOWhCLENBQUM7TUFBQTtJQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7SUFBQyxJQUFJK2hCLElBQUk7SUFBQ25oQixNQUFNLENBQUNiLElBQUksQ0FBQyxNQUFNLEVBQUM7TUFBQzJELE9BQU9BLENBQUMxRCxDQUFDLEVBQUM7UUFBQytoQixJQUFJLEdBQUMvaEIsQ0FBQztNQUFBO0lBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztJQUFDLElBQUlnaUIsa0JBQWtCO0lBQUNwaEIsTUFBTSxDQUFDYixJQUFJLENBQUMsdUJBQXVCLEVBQUM7TUFBQ2lpQixrQkFBa0JBLENBQUNoaUIsQ0FBQyxFQUFDO1FBQUNnaUIsa0JBQWtCLEdBQUNoaUIsQ0FBQztNQUFBO0lBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztJQUFDLElBQUl5VixNQUFNO0lBQUM3VSxNQUFNLENBQUNiLElBQUksQ0FBQyxVQUFVLEVBQUM7TUFBQzBWLE1BQU1BLENBQUN6VixDQUFDLEVBQUM7UUFBQ3lWLE1BQU0sR0FBQ3pWLENBQUM7TUFBQTtJQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7SUFBQyxJQUFJMkQsaUJBQWlCO0lBQUMvQyxNQUFNLENBQUNiLElBQUksQ0FBQyxzQkFBc0IsRUFBQztNQUFDNEQsaUJBQWlCQSxDQUFDM0QsQ0FBQyxFQUFDO1FBQUMyRCxpQkFBaUIsR0FBQzNELENBQUM7TUFBQTtJQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7SUFBQyxJQUFJcVIsVUFBVTtJQUFDelEsTUFBTSxDQUFDYixJQUFJLENBQUMsZUFBZSxFQUFDO01BQUNzUixVQUFVQSxDQUFDclIsQ0FBQyxFQUFDO1FBQUNxUixVQUFVLEdBQUNyUixDQUFDO01BQUE7SUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDO0lBQUMsSUFBSUcsT0FBTyxFQUFDOGhCLDBCQUEwQixFQUFDQyxZQUFZLEVBQUNDLGVBQWU7SUFBQ3ZoQixNQUFNLENBQUNiLElBQUksQ0FBQyxnQkFBZ0IsRUFBQztNQUFDSSxPQUFPQSxDQUFDSCxDQUFDLEVBQUM7UUFBQ0csT0FBTyxHQUFDSCxDQUFDO01BQUEsQ0FBQztNQUFDaWlCLDBCQUEwQkEsQ0FBQ2ppQixDQUFDLEVBQUM7UUFBQ2lpQiwwQkFBMEIsR0FBQ2ppQixDQUFDO01BQUEsQ0FBQztNQUFDa2lCLFlBQVlBLENBQUNsaUIsQ0FBQyxFQUFDO1FBQUNraUIsWUFBWSxHQUFDbGlCLENBQUM7TUFBQSxDQUFDO01BQUNtaUIsZUFBZUEsQ0FBQ25pQixDQUFDLEVBQUM7UUFBQ21pQixlQUFlLEdBQUNuaUIsQ0FBQztNQUFBO0lBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztJQUFDLElBQUlvaUIsYUFBYTtJQUFDeGhCLE1BQU0sQ0FBQ2IsSUFBSSxDQUFDLGtCQUFrQixFQUFDO01BQUNxaUIsYUFBYUEsQ0FBQ3BpQixDQUFDLEVBQUM7UUFBQ29pQixhQUFhLEdBQUNwaUIsQ0FBQztNQUFBO0lBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztJQUFDLElBQUlvTixrQkFBa0I7SUFBQ3hNLE1BQU0sQ0FBQ2IsSUFBSSxDQUFDLHFCQUFxQixFQUFDO01BQUNxTixrQkFBa0JBLENBQUNwTixDQUFDLEVBQUM7UUFBQ29OLGtCQUFrQixHQUFDcE4sQ0FBQztNQUFBO0lBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQztJQUFDLElBQUlFLGtCQUFrQjtJQUFDVSxNQUFNLENBQUNiLElBQUksQ0FBQyx3QkFBd0IsRUFBQztNQUFDRyxrQkFBa0JBLENBQUNGLENBQUMsRUFBQztRQUFDRSxrQkFBa0IsR0FBQ0YsQ0FBQztNQUFBO0lBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQztJQUFDLElBQUl1RCxnQkFBZ0IsRUFBQ3pELFdBQVc7SUFBQ2MsTUFBTSxDQUFDYixJQUFJLENBQUMsaUJBQWlCLEVBQUM7TUFBQ3dELGdCQUFnQkEsQ0FBQ3ZELENBQUMsRUFBQztRQUFDdUQsZ0JBQWdCLEdBQUN2RCxDQUFDO01BQUEsQ0FBQztNQUFDRixXQUFXQSxDQUFDRSxDQUFDLEVBQUM7UUFBQ0YsV0FBVyxHQUFDRSxDQUFDO01BQUE7SUFBQyxDQUFDLEVBQUMsRUFBRSxDQUFDO0lBQUMsSUFBSWlTLG9CQUFvQjtJQUFDclIsTUFBTSxDQUFDYixJQUFJLENBQUMsMEJBQTBCLEVBQUM7TUFBQ2tTLG9CQUFvQkEsQ0FBQ2pTLENBQUMsRUFBQztRQUFDaVMsb0JBQW9CLEdBQUNqUyxDQUFDO01BQUE7SUFBQyxDQUFDLEVBQUMsRUFBRSxDQUFDO0lBQUMsSUFBSUksb0JBQW9CLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTUEsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFlcHBELE1BQU1paUIsaUJBQWlCLEdBQUcsT0FBTztJQUNqQyxNQUFNQyxhQUFhLEdBQUcsUUFBUTtJQUM5QixNQUFNQyxVQUFVLEdBQUcsS0FBSztJQUV4QixNQUFNQyx1QkFBdUIsR0FBRyxFQUFFO0lBRTNCLE1BQU12aUIsZUFBZSxHQUFHLFNBQUFBLENBQVV3aUIsR0FBRyxFQUFFbFQsT0FBTyxFQUFFO01BQUEsSUFBQWhMLGdCQUFBLEVBQUFDLHFCQUFBLEVBQUFDLHNCQUFBO01BQ3JELElBQUlwQixJQUFJLEdBQUcsSUFBSTtNQUNma00sT0FBTyxHQUFHQSxPQUFPLElBQUksQ0FBQyxDQUFDO01BQ3ZCbE0sSUFBSSxDQUFDcWYsb0JBQW9CLEdBQUcsQ0FBQyxDQUFDO01BQzlCcmYsSUFBSSxDQUFDc2YsZUFBZSxHQUFHLElBQUk3YixJQUFJLENBQUQsQ0FBQztNQUUvQixNQUFNOGIsV0FBVyxHQUFBakIsYUFBQSxDQUFBQSxhQUFBLEtBQ1h2QixLQUFLLENBQUN5QyxrQkFBa0IsSUFBSSxDQUFDLENBQUMsR0FDOUIsRUFBQXRlLGdCQUFBLEdBQUFwRCxNQUFNLENBQUNtRixRQUFRLGNBQUEvQixnQkFBQSx3QkFBQUMscUJBQUEsR0FBZkQsZ0JBQUEsQ0FBaUJnQyxRQUFRLGNBQUEvQixxQkFBQSx3QkFBQUMsc0JBQUEsR0FBekJELHFCQUFBLENBQTJCZ0MsS0FBSyxjQUFBL0Isc0JBQUEsdUJBQWhDQSxzQkFBQSxDQUFrQzhLLE9BQU8sS0FBSSxDQUFDLENBQUMsQ0FDcEQ7TUFFRCxJQUFJdVQsWUFBWSxHQUFHaGdCLE1BQU0sQ0FBQ0MsTUFBTSxDQUFDO1FBQy9CZ2dCLGVBQWUsRUFBRTtNQUNuQixDQUFDLEVBQUVILFdBQVcsQ0FBQzs7TUFJZjtNQUNBO01BQ0EsSUFBSSxhQUFhLElBQUlyVCxPQUFPLEVBQUU7UUFDNUI7UUFDQTtRQUNBdVQsWUFBWSxDQUFDalksV0FBVyxHQUFHMEUsT0FBTyxDQUFDMUUsV0FBVztNQUNoRDtNQUNBLElBQUksYUFBYSxJQUFJMEUsT0FBTyxFQUFFO1FBQzVCdVQsWUFBWSxDQUFDaFksV0FBVyxHQUFHeUUsT0FBTyxDQUFDekUsV0FBVztNQUNoRDs7TUFFQTtNQUNBO01BQ0FoSSxNQUFNLENBQUN3YyxPQUFPLENBQUN3RCxZQUFZLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FDL0J6RyxNQUFNLENBQUNoUCxJQUFBO1FBQUEsSUFBQyxDQUFDL0ssR0FBRyxDQUFDLEdBQUErSyxJQUFBO1FBQUEsT0FBSy9LLEdBQUcsSUFBSUEsR0FBRyxDQUFDMGdCLFFBQVEsQ0FBQ1gsaUJBQWlCLENBQUM7TUFBQSxFQUFDLENBQ3pEbGdCLE9BQU8sQ0FBQ3lPLEtBQUEsSUFBa0I7UUFBQSxJQUFqQixDQUFDdE8sR0FBRyxFQUFFNEosS0FBSyxDQUFDLEdBQUEwRSxLQUFBO1FBQ3BCLE1BQU1xUyxVQUFVLEdBQUczZ0IsR0FBRyxDQUFDNGdCLE9BQU8sQ0FBQ2IsaUJBQWlCLEVBQUUsRUFBRSxDQUFDO1FBQ3JEUyxZQUFZLENBQUNHLFVBQVUsQ0FBQyxHQUFHbEIsSUFBSSxDQUFDbGEsSUFBSSxDQUFDc2IsTUFBTSxDQUFDQyxZQUFZLENBQUMsQ0FBQyxFQUN4RGQsYUFBYSxFQUFFQyxVQUFVLEVBQUVyVyxLQUFLLENBQUM7UUFDbkMsT0FBTzRXLFlBQVksQ0FBQ3hnQixHQUFHLENBQUM7TUFDMUIsQ0FBQyxDQUFDO01BRUplLElBQUksQ0FBQzJILEVBQUUsR0FBRyxJQUFJO01BQ2QzSCxJQUFJLENBQUNnVixZQUFZLEdBQUcsSUFBSTtNQUN4QmhWLElBQUksQ0FBQzZZLFdBQVcsR0FBRyxJQUFJO01BRXZCNEcsWUFBWSxDQUFDTyxVQUFVLEdBQUc7UUFDeEJ6RyxJQUFJLEVBQUUsUUFBUTtRQUNkbGMsT0FBTyxFQUFFUyxNQUFNLENBQUNtaUI7TUFDbEIsQ0FBQztNQUVEamdCLElBQUksQ0FBQ2tnQixNQUFNLEdBQUcsSUFBSXBqQixPQUFPLENBQUNxakIsV0FBVyxDQUFDZixHQUFHLEVBQUVLLFlBQVksQ0FBQztNQUN4RHpmLElBQUksQ0FBQzJILEVBQUUsR0FBRzNILElBQUksQ0FBQ2tnQixNQUFNLENBQUN2WSxFQUFFLENBQUMsQ0FBQztNQUUxQjNILElBQUksQ0FBQ2tnQixNQUFNLENBQUNFLEVBQUUsQ0FBQywwQkFBMEIsRUFBRXRpQixNQUFNLENBQUN1SCxlQUFlLENBQUNnYixLQUFLLElBQUk7UUFDekU7UUFDQTtRQUNBO1FBQ0EsSUFDRUEsS0FBSyxDQUFDQyxtQkFBbUIsQ0FBQ0MsSUFBSSxLQUFLLFdBQVcsSUFDOUNGLEtBQUssQ0FBQ0csY0FBYyxDQUFDRCxJQUFJLEtBQUssV0FBVyxFQUN6QztVQUNBdmdCLElBQUksQ0FBQ3NmLGVBQWUsQ0FBQy9XLElBQUksQ0FBQ3BELFFBQVEsSUFBSTtZQUNwQ0EsUUFBUSxDQUFDLENBQUM7WUFDVixPQUFPLElBQUk7VUFDYixDQUFDLENBQUM7UUFDSjtNQUNGLENBQUMsQ0FBQyxDQUFDO01BRUgsSUFBSStHLE9BQU8sQ0FBQ2xMLFFBQVEsSUFBSSxDQUFFNkosT0FBTyxDQUFDLGVBQWUsQ0FBQyxFQUFFO1FBQ2xEN0ssSUFBSSxDQUFDZ1YsWUFBWSxHQUFHLElBQUl2WSxXQUFXLENBQUN5UCxPQUFPLENBQUNsTCxRQUFRLEVBQUVoQixJQUFJLENBQUMySCxFQUFFLENBQUM4WSxZQUFZLENBQUM7UUFDM0V6Z0IsSUFBSSxDQUFDNlksV0FBVyxHQUFHLElBQUk3SyxVQUFVLENBQUNoTyxJQUFJLENBQUM7TUFDekM7SUFFRixDQUFDO0lBRURwRCxlQUFlLENBQUN1QixTQUFTLENBQUN1aUIsTUFBTSxHQUFHLGtCQUFpQjtNQUNsRCxJQUFJMWdCLElBQUksR0FBRyxJQUFJO01BRWYsSUFBSSxDQUFFQSxJQUFJLENBQUMySCxFQUFFLEVBQ1gsTUFBTW5FLEtBQUssQ0FBQyx5Q0FBeUMsQ0FBQzs7TUFFeEQ7TUFDQSxJQUFJbWQsV0FBVyxHQUFHM2dCLElBQUksQ0FBQ2dWLFlBQVk7TUFDbkNoVixJQUFJLENBQUNnVixZQUFZLEdBQUcsSUFBSTtNQUN4QixJQUFJMkwsV0FBVyxFQUNiLE1BQU1BLFdBQVcsQ0FBQzloQixJQUFJLENBQUMsQ0FBQzs7TUFFMUI7TUFDQTtNQUNBO01BQ0EsTUFBTW1CLElBQUksQ0FBQ2tnQixNQUFNLENBQUNVLEtBQUssQ0FBQyxDQUFDO0lBQzNCLENBQUM7SUFFRGhrQixlQUFlLENBQUN1QixTQUFTLENBQUN5aUIsS0FBSyxHQUFHLFlBQVk7TUFDNUMsT0FBTyxJQUFJLENBQUNGLE1BQU0sQ0FBQyxDQUFDO0lBQ3RCLENBQUM7SUFFRDlqQixlQUFlLENBQUN1QixTQUFTLENBQUMwaUIsZUFBZSxHQUFHLFVBQVNGLFdBQVcsRUFBRTtNQUNoRSxJQUFJLENBQUMzTCxZQUFZLEdBQUcyTCxXQUFXO01BQy9CLE9BQU8sSUFBSTtJQUNiLENBQUM7O0lBRUQ7SUFDQS9qQixlQUFlLENBQUN1QixTQUFTLENBQUMyaUIsYUFBYSxHQUFHLFVBQVUzaEIsY0FBYyxFQUFFO01BQ2xFLElBQUlhLElBQUksR0FBRyxJQUFJO01BRWYsSUFBSSxDQUFFQSxJQUFJLENBQUMySCxFQUFFLEVBQ1gsTUFBTW5FLEtBQUssQ0FBQyxpREFBaUQsQ0FBQztNQUVoRSxPQUFPeEQsSUFBSSxDQUFDMkgsRUFBRSxDQUFDekksVUFBVSxDQUFDQyxjQUFjLENBQUM7SUFDM0MsQ0FBQztJQUVEdkMsZUFBZSxDQUFDdUIsU0FBUyxDQUFDNGlCLDJCQUEyQixHQUFHLGdCQUN0RDVoQixjQUFjLEVBQUU2aEIsUUFBUSxFQUFFQyxZQUFZLEVBQUU7TUFDeEMsSUFBSWpoQixJQUFJLEdBQUcsSUFBSTtNQUVmLElBQUksQ0FBRUEsSUFBSSxDQUFDMkgsRUFBRSxFQUNYLE1BQU1uRSxLQUFLLENBQUMsK0RBQStELENBQUM7TUFHOUUsTUFBTXhELElBQUksQ0FBQzJILEVBQUUsQ0FBQ3VaLGdCQUFnQixDQUFDL2hCLGNBQWMsRUFDM0M7UUFBRWdpQixNQUFNLEVBQUUsSUFBSTtRQUFFbEwsSUFBSSxFQUFFK0ssUUFBUTtRQUFFSSxHQUFHLEVBQUVIO01BQWEsQ0FBQyxDQUFDO0lBQ3hELENBQUM7O0lBRUQ7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBcmtCLGVBQWUsQ0FBQ3VCLFNBQVMsQ0FBQ2tqQixnQkFBZ0IsR0FBRyxZQUFZO01BQ3ZELE1BQU05USxLQUFLLEdBQUc3UixTQUFTLENBQUM4UixnQkFBZ0IsQ0FBQyxDQUFDO01BQzFDLElBQUlELEtBQUssRUFBRTtRQUNULE9BQU9BLEtBQUssQ0FBQ0UsVUFBVSxDQUFDLENBQUM7TUFDM0IsQ0FBQyxNQUFNO1FBQ0wsT0FBTztVQUFDc0IsU0FBUyxFQUFFLFNBQUFBLENBQUEsRUFBWSxDQUFDO1FBQUMsQ0FBQztNQUNwQztJQUNGLENBQUM7O0lBRUQ7SUFDQTtJQUNBblYsZUFBZSxDQUFDdUIsU0FBUyxDQUFDeVgsV0FBVyxHQUFHLFVBQVV6USxRQUFRLEVBQUU7TUFDMUQsT0FBTyxJQUFJLENBQUNtYSxlQUFlLENBQUMxWixRQUFRLENBQUNULFFBQVEsQ0FBQztJQUNoRCxDQUFDO0lBRUR2SSxlQUFlLENBQUN1QixTQUFTLENBQUNtakIsV0FBVyxHQUFHLGdCQUFnQkMsZUFBZSxFQUFFQyxRQUFRLEVBQUU7TUFDakYsTUFBTXhoQixJQUFJLEdBQUcsSUFBSTtNQUVqQixJQUFJdWhCLGVBQWUsS0FBSyxtQ0FBbUMsRUFBRTtRQUMzRCxNQUFNbmIsQ0FBQyxHQUFHLElBQUk1QyxLQUFLLENBQUMsY0FBYyxDQUFDO1FBQ25DNEMsQ0FBQyxDQUFDcWIsZUFBZSxHQUFHLElBQUk7UUFDeEIsTUFBTXJiLENBQUM7TUFDVDtNQUVBLElBQUksRUFBRS9HLGVBQWUsQ0FBQ3FpQixjQUFjLENBQUNGLFFBQVEsQ0FBQyxJQUM1QyxDQUFDelUsS0FBSyxDQUFDa1EsYUFBYSxDQUFDdUUsUUFBUSxDQUFDLENBQUMsRUFBRTtRQUNqQyxNQUFNLElBQUloZSxLQUFLLENBQUMsaURBQWlELENBQUM7TUFDcEU7TUFFQSxJQUFJbVMsS0FBSyxHQUFHM1YsSUFBSSxDQUFDcWhCLGdCQUFnQixDQUFDLENBQUM7TUFDbkMsSUFBSU0sT0FBTyxHQUFHLGVBQUFBLENBQUEsRUFBa0I7UUFDOUIsTUFBTTdqQixNQUFNLENBQUM2akIsT0FBTyxDQUFDO1VBQUN6aUIsVUFBVSxFQUFFcWlCLGVBQWU7VUFBRS9oQixFQUFFLEVBQUVnaUIsUUFBUSxDQUFDeFk7UUFBSSxDQUFDLENBQUM7TUFDeEUsQ0FBQztNQUNELE9BQU9oSixJQUFJLENBQUM4Z0IsYUFBYSxDQUFDUyxlQUFlLENBQUMsQ0FBQ0ssU0FBUyxDQUNsRC9DLFlBQVksQ0FBQzJDLFFBQVEsRUFBRTVDLDBCQUEwQixDQUFDLEVBQ2xEO1FBQ0VpRCxJQUFJLEVBQUU7TUFDUixDQUNGLENBQUMsQ0FBQzVXLElBQUksQ0FBQyxNQUFBMFMsS0FBQSxJQUF3QjtRQUFBLElBQWpCO1VBQUNtRTtRQUFVLENBQUMsR0FBQW5FLEtBQUE7UUFDeEIsTUFBTWdFLE9BQU8sQ0FBQyxDQUFDO1FBQ2YsTUFBTWhNLEtBQUssQ0FBQzVELFNBQVMsQ0FBQyxDQUFDO1FBQ3ZCLE9BQU8rUCxVQUFVO01BQ25CLENBQUMsQ0FBQyxDQUFDN1UsS0FBSyxDQUFDLE1BQU03RyxDQUFDLElBQUk7UUFDbEIsTUFBTXVQLEtBQUssQ0FBQzVELFNBQVMsQ0FBQyxDQUFDO1FBQ3ZCLE1BQU0zTCxDQUFDO01BQ1QsQ0FBQyxDQUFDO0lBQ0osQ0FBQzs7SUFHRDtJQUNBO0lBQ0F4SixlQUFlLENBQUN1QixTQUFTLENBQUM0akIsUUFBUSxHQUFHLGdCQUFnQjVpQixjQUFjLEVBQUVJLFFBQVEsRUFBRTtNQUM3RSxJQUFJeWlCLFVBQVUsR0FBRztRQUFDOWlCLFVBQVUsRUFBRUM7TUFBYyxDQUFDO01BQzdDO01BQ0E7TUFDQTtNQUNBO01BQ0EsSUFBSUMsV0FBVyxHQUFHQyxlQUFlLENBQUNDLHFCQUFxQixDQUFDQyxRQUFRLENBQUM7TUFDakUsSUFBSUgsV0FBVyxFQUFFO1FBQ2YsS0FBSyxNQUFNSSxFQUFFLElBQUlKLFdBQVcsRUFBRTtVQUM1QixNQUFNdEIsTUFBTSxDQUFDNmpCLE9BQU8sQ0FBQ2xpQixNQUFNLENBQUNDLE1BQU0sQ0FBQztZQUFDRixFQUFFLEVBQUVBO1VBQUUsQ0FBQyxFQUFFd2lCLFVBQVUsQ0FBQyxDQUFDO1FBQzNEO1FBQUM7TUFDSCxDQUFDLE1BQU07UUFDTCxNQUFNbGtCLE1BQU0sQ0FBQzZqQixPQUFPLENBQUNLLFVBQVUsQ0FBQztNQUNsQztJQUNGLENBQUM7SUFFRHBsQixlQUFlLENBQUN1QixTQUFTLENBQUM4akIsV0FBVyxHQUFHLGdCQUFnQlYsZUFBZSxFQUFFaGlCLFFBQVEsRUFBRTtNQUNqRixJQUFJUyxJQUFJLEdBQUcsSUFBSTtNQUVmLElBQUl1aEIsZUFBZSxLQUFLLG1DQUFtQyxFQUFFO1FBQzNELElBQUluYixDQUFDLEdBQUcsSUFBSTVDLEtBQUssQ0FBQyxjQUFjLENBQUM7UUFDakM0QyxDQUFDLENBQUNxYixlQUFlLEdBQUcsSUFBSTtRQUN4QixNQUFNcmIsQ0FBQztNQUNUO01BRUEsSUFBSXVQLEtBQUssR0FBRzNWLElBQUksQ0FBQ3FoQixnQkFBZ0IsQ0FBQyxDQUFDO01BQ25DLElBQUlNLE9BQU8sR0FBRyxlQUFBQSxDQUFBLEVBQWtCO1FBQzlCLE1BQU0zaEIsSUFBSSxDQUFDK2hCLFFBQVEsQ0FBQ1IsZUFBZSxFQUFFaGlCLFFBQVEsQ0FBQztNQUNoRCxDQUFDO01BRUQsT0FBT1MsSUFBSSxDQUFDOGdCLGFBQWEsQ0FBQ1MsZUFBZSxDQUFDLENBQ3ZDVyxVQUFVLENBQUNyRCxZQUFZLENBQUN0ZixRQUFRLEVBQUVxZiwwQkFBMEIsQ0FBQyxFQUFFO1FBQzlEaUQsSUFBSSxFQUFFO01BQ1IsQ0FBQyxDQUFDLENBQ0Q1VyxJQUFJLENBQUMsTUFBQTRTLEtBQUEsSUFBNEI7UUFBQSxJQUFyQjtVQUFFc0U7UUFBYSxDQUFDLEdBQUF0RSxLQUFBO1FBQzNCLE1BQU04RCxPQUFPLENBQUMsQ0FBQztRQUNmLE1BQU1oTSxLQUFLLENBQUM1RCxTQUFTLENBQUMsQ0FBQztRQUN2QixPQUFPK00sZUFBZSxDQUFDO1VBQUVqUyxNQUFNLEVBQUc7WUFBQ3VWLGFBQWEsRUFBR0Q7VUFBWTtRQUFFLENBQUMsQ0FBQyxDQUFDRSxjQUFjO01BQ3BGLENBQUMsQ0FBQyxDQUFDcFYsS0FBSyxDQUFDLE1BQU8xSCxHQUFHLElBQUs7UUFDdEIsTUFBTW9RLEtBQUssQ0FBQzVELFNBQVMsQ0FBQyxDQUFDO1FBQ3ZCLE1BQU14TSxHQUFHO01BQ1gsQ0FBQyxDQUFDO0lBQ04sQ0FBQztJQUVEM0ksZUFBZSxDQUFDdUIsU0FBUyxDQUFDbWtCLG1CQUFtQixHQUFHLGdCQUFlbmpCLGNBQWMsRUFBRTtNQUM3RSxJQUFJYSxJQUFJLEdBQUcsSUFBSTtNQUdmLElBQUkyVixLQUFLLEdBQUczVixJQUFJLENBQUNxaEIsZ0JBQWdCLENBQUMsQ0FBQztNQUNuQyxJQUFJTSxPQUFPLEdBQUcsU0FBQUEsQ0FBQSxFQUFXO1FBQ3ZCLE9BQU83akIsTUFBTSxDQUFDNmpCLE9BQU8sQ0FBQztVQUNwQnppQixVQUFVLEVBQUVDLGNBQWM7VUFDMUJLLEVBQUUsRUFBRSxJQUFJO1VBQ1JHLGNBQWMsRUFBRTtRQUNsQixDQUFDLENBQUM7TUFDSixDQUFDO01BRUQsT0FBT0ssSUFBSSxDQUNSOGdCLGFBQWEsQ0FBQzNoQixjQUFjLENBQUMsQ0FDN0JzSyxJQUFJLENBQUMsQ0FBQyxDQUNOd0IsSUFBSSxDQUFDLE1BQU00QixNQUFNLElBQUk7UUFDcEIsTUFBTThVLE9BQU8sQ0FBQyxDQUFDO1FBQ2YsTUFBTWhNLEtBQUssQ0FBQzVELFNBQVMsQ0FBQyxDQUFDO1FBQ3ZCLE9BQU9sRixNQUFNO01BQ2YsQ0FBQyxDQUFDLENBQ0RJLEtBQUssQ0FBQyxNQUFNN0csQ0FBQyxJQUFJO1FBQ2hCLE1BQU11UCxLQUFLLENBQUM1RCxTQUFTLENBQUMsQ0FBQztRQUN2QixNQUFNM0wsQ0FBQztNQUNULENBQUMsQ0FBQztJQUNOLENBQUM7O0lBRUQ7SUFDQTtJQUNBeEosZUFBZSxDQUFDdUIsU0FBUyxDQUFDb2tCLGlCQUFpQixHQUFHLGtCQUFrQjtNQUM5RCxJQUFJdmlCLElBQUksR0FBRyxJQUFJO01BRWYsSUFBSTJWLEtBQUssR0FBRzNWLElBQUksQ0FBQ3FoQixnQkFBZ0IsQ0FBQyxDQUFDO01BQ25DLElBQUlNLE9BQU8sR0FBRyxlQUFBQSxDQUFBLEVBQWtCO1FBQzlCLE1BQU03akIsTUFBTSxDQUFDNmpCLE9BQU8sQ0FBQztVQUFFL2hCLFlBQVksRUFBRTtRQUFLLENBQUMsQ0FBQztNQUM5QyxDQUFDO01BRUQsSUFBSTtRQUNGLE1BQU1JLElBQUksQ0FBQzJILEVBQUUsQ0FBQzZhLGFBQWEsQ0FBQyxDQUFDO1FBQzdCLE1BQU1iLE9BQU8sQ0FBQyxDQUFDO1FBQ2YsTUFBTWhNLEtBQUssQ0FBQzVELFNBQVMsQ0FBQyxDQUFDO01BQ3pCLENBQUMsQ0FBQyxPQUFPM0wsQ0FBQyxFQUFFO1FBQ1YsTUFBTXVQLEtBQUssQ0FBQzVELFNBQVMsQ0FBQyxDQUFDO1FBQ3ZCLE1BQU0zTCxDQUFDO01BQ1Q7SUFDRixDQUFDO0lBRUR4SixlQUFlLENBQUN1QixTQUFTLENBQUNza0IsV0FBVyxHQUFHLGdCQUFnQmxCLGVBQWUsRUFBRWhpQixRQUFRLEVBQUVtakIsR0FBRyxFQUFFeFcsT0FBTyxFQUFFO01BQy9GLElBQUlsTSxJQUFJLEdBQUcsSUFBSTtNQUVmLElBQUl1aEIsZUFBZSxLQUFLLG1DQUFtQyxFQUFFO1FBQzNELElBQUluYixDQUFDLEdBQUcsSUFBSTVDLEtBQUssQ0FBQyxjQUFjLENBQUM7UUFDakM0QyxDQUFDLENBQUNxYixlQUFlLEdBQUcsSUFBSTtRQUN4QixNQUFNcmIsQ0FBQztNQUNUOztNQUVBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQSxJQUFJLENBQUNzYyxHQUFHLElBQUksT0FBT0EsR0FBRyxLQUFLLFFBQVEsRUFBRTtRQUNuQyxNQUFNMWIsS0FBSyxHQUFHLElBQUl4RCxLQUFLLENBQUMsK0NBQStDLENBQUM7UUFFeEUsTUFBTXdELEtBQUs7TUFDYjtNQUVBLElBQUksRUFBRTNILGVBQWUsQ0FBQ3FpQixjQUFjLENBQUNnQixHQUFHLENBQUMsSUFBSSxDQUFDM1YsS0FBSyxDQUFDa1EsYUFBYSxDQUFDeUYsR0FBRyxDQUFDLENBQUMsRUFBRTtRQUN2RSxNQUFNMWIsS0FBSyxHQUFHLElBQUl4RCxLQUFLLENBQ3JCLCtDQUErQyxHQUMvQyx1QkFBdUIsQ0FBQztRQUUxQixNQUFNd0QsS0FBSztNQUNiO01BRUEsSUFBSSxDQUFDa0YsT0FBTyxFQUFFQSxPQUFPLEdBQUcsQ0FBQyxDQUFDO01BRTFCLElBQUl5SixLQUFLLEdBQUczVixJQUFJLENBQUNxaEIsZ0JBQWdCLENBQUMsQ0FBQztNQUNuQyxJQUFJTSxPQUFPLEdBQUcsZUFBQUEsQ0FBQSxFQUFrQjtRQUM5QixNQUFNM2hCLElBQUksQ0FBQytoQixRQUFRLENBQUNSLGVBQWUsRUFBRWhpQixRQUFRLENBQUM7TUFDaEQsQ0FBQztNQUVELElBQUlMLFVBQVUsR0FBR2MsSUFBSSxDQUFDOGdCLGFBQWEsQ0FBQ1MsZUFBZSxDQUFDO01BQ3BELElBQUlvQixTQUFTLEdBQUc7UUFBQ2QsSUFBSSxFQUFFO01BQUksQ0FBQztNQUM1QjtNQUNBLElBQUkzVixPQUFPLENBQUMwVyxZQUFZLEtBQUtoWSxTQUFTLEVBQUUrWCxTQUFTLENBQUNDLFlBQVksR0FBRzFXLE9BQU8sQ0FBQzBXLFlBQVk7TUFDckY7TUFDQSxJQUFJMVcsT0FBTyxDQUFDMlcsTUFBTSxFQUFFRixTQUFTLENBQUNFLE1BQU0sR0FBRyxJQUFJO01BQzNDLElBQUkzVyxPQUFPLENBQUM0VyxLQUFLLEVBQUVILFNBQVMsQ0FBQ0csS0FBSyxHQUFHLElBQUk7TUFDekM7TUFDQTtNQUNBO01BQ0EsSUFBSTVXLE9BQU8sQ0FBQzZXLFVBQVUsRUFBRUosU0FBUyxDQUFDSSxVQUFVLEdBQUcsSUFBSTtNQUVuRCxJQUFJQyxhQUFhLEdBQUduRSxZQUFZLENBQUN0ZixRQUFRLEVBQUVxZiwwQkFBMEIsQ0FBQztNQUN0RSxJQUFJcUUsUUFBUSxHQUFHcEUsWUFBWSxDQUFDNkQsR0FBRyxFQUFFOUQsMEJBQTBCLENBQUM7TUFFNUQsSUFBSXNFLFFBQVEsR0FBRzdqQixlQUFlLENBQUM4akIsa0JBQWtCLENBQUNGLFFBQVEsQ0FBQztNQUUzRCxJQUFJL1csT0FBTyxDQUFDa1gsY0FBYyxJQUFJLENBQUNGLFFBQVEsRUFBRTtRQUN2QyxJQUFJM2QsR0FBRyxHQUFHLElBQUkvQixLQUFLLENBQUMsK0NBQStDLENBQUM7UUFDcEUsTUFBTStCLEdBQUc7TUFDWDs7TUFFQTtNQUNBO01BQ0E7TUFDQTs7TUFFQTtNQUNBO01BQ0EsSUFBSThkLE9BQU87TUFDWCxJQUFJblgsT0FBTyxDQUFDMlcsTUFBTSxFQUFFO1FBQ2xCLElBQUk7VUFDRixJQUFJaE0sTUFBTSxHQUFHeFgsZUFBZSxDQUFDaWtCLHFCQUFxQixDQUFDL2pCLFFBQVEsRUFBRW1qQixHQUFHLENBQUM7VUFDakVXLE9BQU8sR0FBR3hNLE1BQU0sQ0FBQzdOLEdBQUc7UUFDdEIsQ0FBQyxDQUFDLE9BQU96RCxHQUFHLEVBQUU7VUFDWixNQUFNQSxHQUFHO1FBQ1g7TUFDRjtNQUNBLElBQUkyRyxPQUFPLENBQUMyVyxNQUFNLElBQ2hCLENBQUVLLFFBQVEsSUFDVixDQUFFRyxPQUFPLElBQ1RuWCxPQUFPLENBQUM0VixVQUFVLElBQ2xCLEVBQUc1VixPQUFPLENBQUM0VixVQUFVLFlBQVkvRSxLQUFLLENBQUNDLFFBQVEsSUFDN0M5USxPQUFPLENBQUNxWCxXQUFXLENBQUMsRUFBRTtRQUN4QjtRQUNBO1FBQ0E7O1FBRUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBLE9BQU8sTUFBTUMsNEJBQTRCLENBQUN0a0IsVUFBVSxFQUFFOGpCLGFBQWEsRUFBRUMsUUFBUSxFQUFFL1csT0FBTyxDQUFDLENBQ3BGakIsSUFBSSxDQUFDLE1BQU00QixNQUFNLElBQUk7VUFDcEIsTUFBTThVLE9BQU8sQ0FBQyxDQUFDO1VBQ2YsTUFBTWhNLEtBQUssQ0FBQzVELFNBQVMsQ0FBQyxDQUFDO1VBQ3ZCLElBQUlsRixNQUFNLElBQUksQ0FBRVgsT0FBTyxDQUFDdVgsYUFBYSxFQUFFO1lBQ3JDLE9BQU81VyxNQUFNLENBQUN3VixjQUFjO1VBQzlCLENBQUMsTUFBTTtZQUNMLE9BQU94VixNQUFNO1VBQ2Y7UUFDRixDQUFDLENBQUM7TUFDTixDQUFDLE1BQU07UUFDTCxJQUFJWCxPQUFPLENBQUMyVyxNQUFNLElBQUksQ0FBQ1EsT0FBTyxJQUFJblgsT0FBTyxDQUFDNFYsVUFBVSxJQUFJb0IsUUFBUSxFQUFFO1VBQ2hFLElBQUksQ0FBQ0QsUUFBUSxDQUFDUyxjQUFjLENBQUMsY0FBYyxDQUFDLEVBQUU7WUFDNUNULFFBQVEsQ0FBQ1UsWUFBWSxHQUFHLENBQUMsQ0FBQztVQUM1QjtVQUNBTixPQUFPLEdBQUduWCxPQUFPLENBQUM0VixVQUFVO1VBQzVCcmlCLE1BQU0sQ0FBQ0MsTUFBTSxDQUFDdWpCLFFBQVEsQ0FBQ1UsWUFBWSxFQUFFOUUsWUFBWSxDQUFDO1lBQUM3VixHQUFHLEVBQUVrRCxPQUFPLENBQUM0VjtVQUFVLENBQUMsRUFBRWxELDBCQUEwQixDQUFDLENBQUM7UUFDM0c7UUFFQSxNQUFNZ0YsT0FBTyxHQUFHbmtCLE1BQU0sQ0FBQ21OLElBQUksQ0FBQ3FXLFFBQVEsQ0FBQyxDQUFDakssTUFBTSxDQUFFL1osR0FBRyxJQUFLLENBQUNBLEdBQUcsQ0FBQ3NLLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMzRSxJQUFJc2EsWUFBWSxHQUFHRCxPQUFPLENBQUNyZ0IsTUFBTSxHQUFHLENBQUMsR0FBRyxZQUFZLEdBQUcsWUFBWTtRQUNuRXNnQixZQUFZLEdBQ1ZBLFlBQVksS0FBSyxZQUFZLElBQUksQ0FBQ2xCLFNBQVMsQ0FBQ0csS0FBSyxHQUM3QyxXQUFXLEdBQ1hlLFlBQVk7UUFDbEIsT0FBTzNrQixVQUFVLENBQUMya0IsWUFBWSxDQUFDLENBQzVCM1QsSUFBSSxDQUFDaFIsVUFBVSxDQUFDLENBQUM4akIsYUFBYSxFQUFFQyxRQUFRLEVBQUVOLFNBQVMsQ0FBQyxDQUNwRDFYLElBQUksQ0FBQyxNQUFNNEIsTUFBTSxJQUFJO1VBQ3BCLElBQUlpWCxZQUFZLEdBQUdoRixlQUFlLENBQUM7WUFBQ2pTO1VBQU0sQ0FBQyxDQUFDO1VBQzVDLElBQUlpWCxZQUFZLElBQUk1WCxPQUFPLENBQUN1WCxhQUFhLEVBQUU7WUFDekM7WUFDQTtZQUNBO1lBQ0EsSUFBSXZYLE9BQU8sQ0FBQzJXLE1BQU0sSUFBSWlCLFlBQVksQ0FBQ2hDLFVBQVUsRUFBRTtjQUM3QyxJQUFJdUIsT0FBTyxFQUFFO2dCQUNYUyxZQUFZLENBQUNoQyxVQUFVLEdBQUd1QixPQUFPO2NBQ25DLENBQUMsTUFBTSxJQUFJUyxZQUFZLENBQUNoQyxVQUFVLFlBQVlobEIsT0FBTyxDQUFDaW5CLFFBQVEsRUFBRTtnQkFDOURELFlBQVksQ0FBQ2hDLFVBQVUsR0FBRyxJQUFJL0UsS0FBSyxDQUFDQyxRQUFRLENBQUM4RyxZQUFZLENBQUNoQyxVQUFVLENBQUNrQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2NBQ3JGO1lBQ0Y7WUFDQSxNQUFNckMsT0FBTyxDQUFDLENBQUM7WUFDZixNQUFNaE0sS0FBSyxDQUFDNUQsU0FBUyxDQUFDLENBQUM7WUFDdkIsT0FBTytSLFlBQVk7VUFDckIsQ0FBQyxNQUFNO1lBQ0wsTUFBTW5DLE9BQU8sQ0FBQyxDQUFDO1lBQ2YsTUFBTWhNLEtBQUssQ0FBQzVELFNBQVMsQ0FBQyxDQUFDO1lBQ3ZCLE9BQU8rUixZQUFZLENBQUN6QixjQUFjO1VBQ3BDO1FBQ0YsQ0FBQyxDQUFDLENBQUNwVixLQUFLLENBQUMsTUFBTzFILEdBQUcsSUFBSztVQUN0QixNQUFNb1EsS0FBSyxDQUFDNUQsU0FBUyxDQUFDLENBQUM7VUFDdkIsTUFBTXhNLEdBQUc7UUFDWCxDQUFDLENBQUM7TUFDTjtJQUNGLENBQUM7O0lBRUQ7SUFDQTNJLGVBQWUsQ0FBQ3FuQixzQkFBc0IsR0FBRyxVQUFVMWUsR0FBRyxFQUFFO01BRXREO01BQ0E7TUFDQTtNQUNBO01BQ0EsSUFBSXlCLEtBQUssR0FBR3pCLEdBQUcsQ0FBQzJlLE1BQU0sSUFBSTNlLEdBQUcsQ0FBQ0EsR0FBRzs7TUFFakM7TUFDQTtNQUNBO01BQ0EsSUFBSXlCLEtBQUssQ0FBQ21kLE9BQU8sQ0FBQyxpQ0FBaUMsQ0FBQyxLQUFLLENBQUMsSUFDckRuZCxLQUFLLENBQUNtZCxPQUFPLENBQUMsbUVBQW1FLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRTtRQUM5RixPQUFPLElBQUk7TUFDYjtNQUVBLE9BQU8sS0FBSztJQUNkLENBQUM7O0lBRUQ7SUFDQTtJQUNBO0lBQ0F2bkIsZUFBZSxDQUFDdUIsU0FBUyxDQUFDaW1CLFdBQVcsR0FBRyxnQkFBZ0JqbEIsY0FBYyxFQUFFSSxRQUFRLEVBQUVtakIsR0FBRyxFQUFFeFcsT0FBTyxFQUFFO01BQzlGLElBQUlsTSxJQUFJLEdBQUcsSUFBSTtNQUlmLElBQUksT0FBT2tNLE9BQU8sS0FBSyxVQUFVLElBQUksQ0FBRS9HLFFBQVEsRUFBRTtRQUMvQ0EsUUFBUSxHQUFHK0csT0FBTztRQUNsQkEsT0FBTyxHQUFHLENBQUMsQ0FBQztNQUNkO01BRUEsT0FBT2xNLElBQUksQ0FBQ3lpQixXQUFXLENBQUN0akIsY0FBYyxFQUFFSSxRQUFRLEVBQUVtakIsR0FBRyxFQUNuRGpqQixNQUFNLENBQUNDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRXdNLE9BQU8sRUFBRTtRQUN6QjJXLE1BQU0sRUFBRSxJQUFJO1FBQ1pZLGFBQWEsRUFBRTtNQUNqQixDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFRDdtQixlQUFlLENBQUN1QixTQUFTLENBQUNrbUIsSUFBSSxHQUFHLFVBQVVsbEIsY0FBYyxFQUFFSSxRQUFRLEVBQUUyTSxPQUFPLEVBQUU7TUFDNUUsSUFBSWxNLElBQUksR0FBRyxJQUFJO01BRWYsSUFBSXNMLFNBQVMsQ0FBQy9ILE1BQU0sS0FBSyxDQUFDLEVBQ3hCaEUsUUFBUSxHQUFHLENBQUMsQ0FBQztNQUVmLE9BQU8sSUFBSTZTLE1BQU0sQ0FDZnBTLElBQUksRUFBRSxJQUFJTSxpQkFBaUIsQ0FBQ25CLGNBQWMsRUFBRUksUUFBUSxFQUFFMk0sT0FBTyxDQUFDLENBQUM7SUFDbkUsQ0FBQztJQUVEdFAsZUFBZSxDQUFDdUIsU0FBUyxDQUFDNkgsWUFBWSxHQUFHLGdCQUFnQnViLGVBQWUsRUFBRWhpQixRQUFRLEVBQUUyTSxPQUFPLEVBQUU7TUFDM0YsSUFBSWxNLElBQUksR0FBRyxJQUFJO01BQ2YsSUFBSXNMLFNBQVMsQ0FBQy9ILE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDMUJoRSxRQUFRLEdBQUcsQ0FBQyxDQUFDO01BQ2Y7TUFFQTJNLE9BQU8sR0FBR0EsT0FBTyxJQUFJLENBQUMsQ0FBQztNQUN2QkEsT0FBTyxDQUFDK0csS0FBSyxHQUFHLENBQUM7TUFFakIsTUFBTTZGLE9BQU8sR0FBRyxNQUFNOVksSUFBSSxDQUFDcWtCLElBQUksQ0FBQzlDLGVBQWUsRUFBRWhpQixRQUFRLEVBQUUyTSxPQUFPLENBQUMsQ0FBQ21DLEtBQUssQ0FBQyxDQUFDO01BRTNFLE9BQU95SyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ25CLENBQUM7O0lBRUQ7SUFDQTtJQUNBbGMsZUFBZSxDQUFDdUIsU0FBUyxDQUFDbW1CLGdCQUFnQixHQUFHLGdCQUFnQm5sQixjQUFjLEVBQUVvbEIsS0FBSyxFQUNyQnJZLE9BQU8sRUFBRTtNQUNwRSxJQUFJbE0sSUFBSSxHQUFHLElBQUk7O01BRWY7TUFDQTtNQUNBLElBQUlkLFVBQVUsR0FBR2MsSUFBSSxDQUFDOGdCLGFBQWEsQ0FBQzNoQixjQUFjLENBQUM7TUFDbkQsTUFBTUQsVUFBVSxDQUFDc2xCLFdBQVcsQ0FBQ0QsS0FBSyxFQUFFclksT0FBTyxDQUFDO0lBQzlDLENBQUM7O0lBRUQ7SUFDQXRQLGVBQWUsQ0FBQ3VCLFNBQVMsQ0FBQ3FtQixXQUFXLEdBQ25DNW5CLGVBQWUsQ0FBQ3VCLFNBQVMsQ0FBQ21tQixnQkFBZ0I7SUFFNUMxbkIsZUFBZSxDQUFDdUIsU0FBUyxDQUFDc21CLGNBQWMsR0FBRyxVQUFVdGxCLGNBQWMsRUFBVztNQUFBLFNBQUFrTSxJQUFBLEdBQUFDLFNBQUEsQ0FBQS9ILE1BQUEsRUFBTmdJLElBQUksT0FBQUMsS0FBQSxDQUFBSCxJQUFBLE9BQUFBLElBQUEsV0FBQUksSUFBQSxNQUFBQSxJQUFBLEdBQUFKLElBQUEsRUFBQUksSUFBQTtRQUFKRixJQUFJLENBQUFFLElBQUEsUUFBQUgsU0FBQSxDQUFBRyxJQUFBO01BQUE7TUFDMUVGLElBQUksR0FBR0EsSUFBSSxDQUFDM0csR0FBRyxDQUFDOGYsR0FBRyxJQUFJN0YsWUFBWSxDQUFDNkYsR0FBRyxFQUFFOUYsMEJBQTBCLENBQUMsQ0FBQztNQUNyRSxNQUFNMWYsVUFBVSxHQUFHLElBQUksQ0FBQzRoQixhQUFhLENBQUMzaEIsY0FBYyxDQUFDO01BQ3JELE9BQU9ELFVBQVUsQ0FBQ3VsQixjQUFjLENBQUMsR0FBR2xaLElBQUksQ0FBQztJQUMzQyxDQUFDO0lBRUQzTyxlQUFlLENBQUN1QixTQUFTLENBQUN3bUIsc0JBQXNCLEdBQUcsVUFBVXhsQixjQUFjLEVBQVc7TUFBQSxTQUFBeWxCLEtBQUEsR0FBQXRaLFNBQUEsQ0FBQS9ILE1BQUEsRUFBTmdJLElBQUksT0FBQUMsS0FBQSxDQUFBb1osS0FBQSxPQUFBQSxLQUFBLFdBQUFDLEtBQUEsTUFBQUEsS0FBQSxHQUFBRCxLQUFBLEVBQUFDLEtBQUE7UUFBSnRaLElBQUksQ0FBQXNaLEtBQUEsUUFBQXZaLFNBQUEsQ0FBQXVaLEtBQUE7TUFBQTtNQUNsRnRaLElBQUksR0FBR0EsSUFBSSxDQUFDM0csR0FBRyxDQUFDOGYsR0FBRyxJQUFJN0YsWUFBWSxDQUFDNkYsR0FBRyxFQUFFOUYsMEJBQTBCLENBQUMsQ0FBQztNQUNyRSxNQUFNMWYsVUFBVSxHQUFHLElBQUksQ0FBQzRoQixhQUFhLENBQUMzaEIsY0FBYyxDQUFDO01BQ3JELE9BQU9ELFVBQVUsQ0FBQ3lsQixzQkFBc0IsQ0FBQyxHQUFHcFosSUFBSSxDQUFDO0lBQ25ELENBQUM7SUFFRDNPLGVBQWUsQ0FBQ3VCLFNBQVMsQ0FBQzJtQixnQkFBZ0IsR0FBR2xvQixlQUFlLENBQUN1QixTQUFTLENBQUNtbUIsZ0JBQWdCO0lBRXZGMW5CLGVBQWUsQ0FBQ3VCLFNBQVMsQ0FBQzRtQixjQUFjLEdBQUcsZ0JBQWdCNWxCLGNBQWMsRUFBRW9sQixLQUFLLEVBQUU7TUFDaEYsSUFBSXZrQixJQUFJLEdBQUcsSUFBSTs7TUFHZjtNQUNBO01BQ0EsSUFBSWQsVUFBVSxHQUFHYyxJQUFJLENBQUM4Z0IsYUFBYSxDQUFDM2hCLGNBQWMsQ0FBQztNQUNuRCxJQUFJNmxCLFNBQVMsR0FBSSxNQUFNOWxCLFVBQVUsQ0FBQytsQixTQUFTLENBQUNWLEtBQUssQ0FBQztJQUNwRCxDQUFDO0lBR0RoRyxtQkFBbUIsQ0FBQ3pmLE9BQU8sQ0FBQyxVQUFVb21CLENBQUMsRUFBRTtNQUN2Q3RvQixlQUFlLENBQUN1QixTQUFTLENBQUMrbUIsQ0FBQyxDQUFDLEdBQUcsWUFBWTtRQUN6QyxNQUFNLElBQUkxaEIsS0FBSyxJQUFBc0IsTUFBQSxDQUNWb2dCLENBQUMscURBQUFwZ0IsTUFBQSxDQUFrRDBaLGtCQUFrQixDQUN0RTBHLENBQ0YsQ0FBQyxnQkFDSCxDQUFDO01BQ0gsQ0FBQztJQUNILENBQUMsQ0FBQztJQUdGLElBQUlDLG9CQUFvQixHQUFHLENBQUM7SUFJNUIsSUFBSTNCLDRCQUE0QixHQUFHLGVBQUFBLENBQWdCdGtCLFVBQVUsRUFBRUssUUFBUSxFQUFFbWpCLEdBQUcsRUFBRXhXLE9BQU8sRUFBRTtNQUNyRjtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7O01BRUEsSUFBSTRWLFVBQVUsR0FBRzVWLE9BQU8sQ0FBQzRWLFVBQVUsQ0FBQyxDQUFDO01BQ3JDLElBQUlzRCxrQkFBa0IsR0FBRztRQUN2QnZELElBQUksRUFBRSxJQUFJO1FBQ1ZpQixLQUFLLEVBQUU1VyxPQUFPLENBQUM0VztNQUNqQixDQUFDO01BQ0QsSUFBSXVDLGtCQUFrQixHQUFHO1FBQ3ZCeEQsSUFBSSxFQUFFLElBQUk7UUFDVmdCLE1BQU0sRUFBRTtNQUNWLENBQUM7TUFFRCxJQUFJeUMsaUJBQWlCLEdBQUc3bEIsTUFBTSxDQUFDQyxNQUFNLENBQ25DbWYsWUFBWSxDQUFDO1FBQUM3VixHQUFHLEVBQUU4WTtNQUFVLENBQUMsRUFBRWxELDBCQUEwQixDQUFDLEVBQzNEOEQsR0FBRyxDQUFDO01BRU4sSUFBSTZDLEtBQUssR0FBR0osb0JBQW9CO01BRWhDLElBQUlLLFFBQVEsR0FBRyxlQUFBQSxDQUFBLEVBQWtCO1FBQy9CRCxLQUFLLEVBQUU7UUFDUCxJQUFJLENBQUVBLEtBQUssRUFBRTtVQUNYLE1BQU0sSUFBSS9oQixLQUFLLENBQUMsc0JBQXNCLEdBQUcyaEIsb0JBQW9CLEdBQUcsU0FBUyxDQUFDO1FBQzVFLENBQUMsTUFBTTtVQUNMLElBQUlNLE1BQU0sR0FBR3ZtQixVQUFVLENBQUN3bUIsVUFBVTtVQUNsQyxJQUFHLENBQUNqbUIsTUFBTSxDQUFDbU4sSUFBSSxDQUFDOFYsR0FBRyxDQUFDLENBQUNpRCxJQUFJLENBQUMxbUIsR0FBRyxJQUFJQSxHQUFHLENBQUNzSyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQztZQUNwRGtjLE1BQU0sR0FBR3ZtQixVQUFVLENBQUMwbUIsVUFBVSxDQUFDMVYsSUFBSSxDQUFDaFIsVUFBVSxDQUFDO1VBQ2pEO1VBQ0EsT0FBT3VtQixNQUFNLENBQ1hsbUIsUUFBUSxFQUNSbWpCLEdBQUcsRUFDSDBDLGtCQUFrQixDQUFDLENBQUNuYSxJQUFJLENBQUM0QixNQUFNLElBQUk7WUFDbkMsSUFBSUEsTUFBTSxLQUFLQSxNQUFNLENBQUN1VixhQUFhLElBQUl2VixNQUFNLENBQUNnWixhQUFhLENBQUMsRUFBRTtjQUM1RCxPQUFPO2dCQUNMeEQsY0FBYyxFQUFFeFYsTUFBTSxDQUFDdVYsYUFBYSxJQUFJdlYsTUFBTSxDQUFDZ1osYUFBYTtnQkFDNUQvRCxVQUFVLEVBQUVqVixNQUFNLENBQUNpWixVQUFVLElBQUlsYjtjQUNuQyxDQUFDO1lBQ0gsQ0FBQyxNQUFNO2NBQ0wsT0FBT21iLG1CQUFtQixDQUFDLENBQUM7WUFDOUI7VUFDRixDQUFDLENBQUM7UUFDSjtNQUNGLENBQUM7TUFFRCxJQUFJQSxtQkFBbUIsR0FBRyxTQUFBQSxDQUFBLEVBQVc7UUFDbkMsT0FBTzdtQixVQUFVLENBQUMwbUIsVUFBVSxDQUFDcm1CLFFBQVEsRUFBRStsQixpQkFBaUIsRUFBRUQsa0JBQWtCLENBQUMsQ0FDMUVwYSxJQUFJLENBQUM0QixNQUFNLEtBQUs7VUFDZndWLGNBQWMsRUFBRXhWLE1BQU0sQ0FBQ2daLGFBQWE7VUFDcEMvRCxVQUFVLEVBQUVqVixNQUFNLENBQUNpWjtRQUNyQixDQUFDLENBQUMsQ0FBQyxDQUFDN1ksS0FBSyxDQUFDMUgsR0FBRyxJQUFJO1VBQ2YsSUFBSTNJLGVBQWUsQ0FBQ3FuQixzQkFBc0IsQ0FBQzFlLEdBQUcsQ0FBQyxFQUFFO1lBQy9DLE9BQU9pZ0IsUUFBUSxDQUFDLENBQUM7VUFDbkIsQ0FBQyxNQUFNO1lBQ0wsTUFBTWpnQixHQUFHO1VBQ1g7UUFDRixDQUFDLENBQUM7TUFFTixDQUFDO01BQ0QsT0FBT2lnQixRQUFRLENBQUMsQ0FBQztJQUNuQixDQUFDOztJQUVEO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E1b0IsZUFBZSxDQUFDdUIsU0FBUyxDQUFDNm5CLHVCQUF1QixHQUFHLFVBQ2xEM25CLGlCQUFpQixFQUFFNkwsT0FBTyxFQUFFdUUsU0FBUyxFQUFFO01BQ3ZDLElBQUl6TyxJQUFJLEdBQUcsSUFBSTs7TUFFZjtNQUNBO01BQ0EsSUFBS2tLLE9BQU8sSUFBSSxDQUFDdUUsU0FBUyxDQUFDd1gsV0FBVyxJQUNuQyxDQUFDL2IsT0FBTyxJQUFJLENBQUN1RSxTQUFTLENBQUN1SCxLQUFNLEVBQUU7UUFDaEMsTUFBTSxJQUFJeFMsS0FBSyxDQUFDLG1CQUFtQixJQUFJMEcsT0FBTyxHQUFHLFNBQVMsR0FBRyxXQUFXLENBQUMsR0FDckUsNkJBQTZCLElBQzVCQSxPQUFPLEdBQUcsYUFBYSxHQUFHLE9BQU8sQ0FBQyxHQUFHLFdBQVcsQ0FBQztNQUN4RDtNQUVBLE9BQU9sSyxJQUFJLENBQUNrSSxJQUFJLENBQUM3SixpQkFBaUIsRUFBRSxVQUFVOEosR0FBRyxFQUFFO1FBQ2pELElBQUkzSSxFQUFFLEdBQUcySSxHQUFHLENBQUNhLEdBQUc7UUFDaEIsT0FBT2IsR0FBRyxDQUFDYSxHQUFHO1FBQ2Q7UUFDQSxPQUFPYixHQUFHLENBQUNwRCxFQUFFO1FBQ2IsSUFBSW1GLE9BQU8sRUFBRTtVQUNYdUUsU0FBUyxDQUFDd1gsV0FBVyxDQUFDem1CLEVBQUUsRUFBRTJJLEdBQUcsRUFBRSxJQUFJLENBQUM7UUFDdEMsQ0FBQyxNQUFNO1VBQ0xzRyxTQUFTLENBQUN1SCxLQUFLLENBQUN4VyxFQUFFLEVBQUUySSxHQUFHLENBQUM7UUFDMUI7TUFDRixDQUFDLENBQUM7SUFDSixDQUFDO0lBRUR2TCxlQUFlLENBQUN1QixTQUFTLENBQUM2Uix5QkFBeUIsR0FBRyxVQUNwRDNSLGlCQUFpQixFQUFnQjtNQUFBLElBQWQ2TixPQUFPLEdBQUFaLFNBQUEsQ0FBQS9ILE1BQUEsUUFBQStILFNBQUEsUUFBQVYsU0FBQSxHQUFBVSxTQUFBLE1BQUcsQ0FBQyxDQUFDO01BQy9CLElBQUl0TCxJQUFJLEdBQUcsSUFBSTtNQUNmLE1BQU07UUFBRWttQixnQkFBZ0I7UUFBRUM7TUFBYSxDQUFDLEdBQUdqYSxPQUFPO01BQ2xEQSxPQUFPLEdBQUc7UUFBRWdhLGdCQUFnQjtRQUFFQztNQUFhLENBQUM7TUFFNUMsSUFBSWpuQixVQUFVLEdBQUdjLElBQUksQ0FBQzhnQixhQUFhLENBQUN6aUIsaUJBQWlCLENBQUNjLGNBQWMsQ0FBQztNQUNyRSxJQUFJaW5CLGFBQWEsR0FBRy9uQixpQkFBaUIsQ0FBQzZOLE9BQU87TUFDN0MsSUFBSXVULFlBQVksR0FBRztRQUNqQnZaLElBQUksRUFBRWtnQixhQUFhLENBQUNsZ0IsSUFBSTtRQUN4QitNLEtBQUssRUFBRW1ULGFBQWEsQ0FBQ25ULEtBQUs7UUFDMUIySSxJQUFJLEVBQUV3SyxhQUFhLENBQUN4SyxJQUFJO1FBQ3hCM1YsVUFBVSxFQUFFbWdCLGFBQWEsQ0FBQzVZLE1BQU0sSUFBSTRZLGFBQWEsQ0FBQ25nQixVQUFVO1FBQzVEb2dCLGNBQWMsRUFBRUQsYUFBYSxDQUFDQztNQUNoQyxDQUFDOztNQUVEO01BQ0EsSUFBSUQsYUFBYSxDQUFDbmUsUUFBUSxFQUFFO1FBQzFCd1gsWUFBWSxDQUFDNkcsZUFBZSxHQUFHLENBQUMsQ0FBQztNQUNuQztNQUVBLElBQUlDLFFBQVEsR0FBR3JuQixVQUFVLENBQUNtbEIsSUFBSSxDQUM1QnhGLFlBQVksQ0FBQ3hnQixpQkFBaUIsQ0FBQ2tCLFFBQVEsRUFBRXFmLDBCQUEwQixDQUFDLEVBQ3BFYSxZQUFZLENBQUM7O01BRWY7TUFDQSxJQUFJMkcsYUFBYSxDQUFDbmUsUUFBUSxFQUFFO1FBQzFCO1FBQ0FzZSxRQUFRLENBQUNDLGFBQWEsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDO1FBQ3hDO1FBQ0E7UUFDQUQsUUFBUSxDQUFDQyxhQUFhLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQzs7UUFFekM7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBLElBQUlub0IsaUJBQWlCLENBQUNjLGNBQWMsS0FBS2UsZ0JBQWdCLElBQ3ZEN0IsaUJBQWlCLENBQUNrQixRQUFRLENBQUN3RixFQUFFLEVBQUU7VUFDL0J3aEIsUUFBUSxDQUFDQyxhQUFhLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQztRQUM3QztNQUNGO01BRUEsSUFBSSxPQUFPSixhQUFhLENBQUNLLFNBQVMsS0FBSyxXQUFXLEVBQUU7UUFDbERGLFFBQVEsR0FBR0EsUUFBUSxDQUFDRyxTQUFTLENBQUNOLGFBQWEsQ0FBQ0ssU0FBUyxDQUFDO01BQ3hEO01BQ0EsSUFBSSxPQUFPTCxhQUFhLENBQUNPLElBQUksS0FBSyxXQUFXLEVBQUU7UUFDN0NKLFFBQVEsR0FBR0EsUUFBUSxDQUFDSSxJQUFJLENBQUNQLGFBQWEsQ0FBQ08sSUFBSSxDQUFDO01BQzlDO01BRUEsT0FBTyxJQUFJaEksa0JBQWtCLENBQUM0SCxRQUFRLEVBQUVsb0IsaUJBQWlCLEVBQUU2TixPQUFPLEVBQUVoTixVQUFVLENBQUM7SUFDakYsQ0FBQzs7SUFFRDtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQXRDLGVBQWUsQ0FBQ3VCLFNBQVMsQ0FBQytKLElBQUksR0FBRyxVQUFVN0osaUJBQWlCLEVBQUV1b0IsV0FBVyxFQUFFQyxTQUFTLEVBQUU7TUFDcEYsSUFBSTdtQixJQUFJLEdBQUcsSUFBSTtNQUNmLElBQUksQ0FBQzNCLGlCQUFpQixDQUFDNk4sT0FBTyxDQUFDakUsUUFBUSxFQUNyQyxNQUFNLElBQUl6RSxLQUFLLENBQUMsaUNBQWlDLENBQUM7TUFFcEQsSUFBSXlXLE1BQU0sR0FBR2phLElBQUksQ0FBQ2dRLHlCQUF5QixDQUFDM1IsaUJBQWlCLENBQUM7TUFFOUQsSUFBSXlvQixPQUFPLEdBQUcsS0FBSztNQUNuQixJQUFJQyxNQUFNO01BRVZqcEIsTUFBTSxDQUFDMmEsS0FBSyxDQUFDLGVBQWV1TyxJQUFJQSxDQUFBLEVBQUc7UUFDakMsSUFBSTdlLEdBQUcsR0FBRyxJQUFJO1FBQ2QsT0FBTyxJQUFJLEVBQUU7VUFDWCxJQUFJMmUsT0FBTyxFQUNUO1VBQ0YsSUFBSTtZQUNGM2UsR0FBRyxHQUFHLE1BQU04UixNQUFNLENBQUNnTiw2QkFBNkIsQ0FBQ0osU0FBUyxDQUFDO1VBQzdELENBQUMsQ0FBQyxPQUFPdGhCLEdBQUcsRUFBRTtZQUNaO1lBQ0F3QixPQUFPLENBQUNDLEtBQUssQ0FBQ3pCLEdBQUcsQ0FBQztZQUNsQjtZQUNBO1lBQ0E7WUFDQTtZQUNBNEMsR0FBRyxHQUFHLElBQUk7VUFDWjtVQUNBO1VBQ0E7VUFDQSxJQUFJMmUsT0FBTyxFQUNUO1VBQ0YsSUFBSTNlLEdBQUcsRUFBRTtZQUNQO1lBQ0E7WUFDQTtZQUNBO1lBQ0E0ZSxNQUFNLEdBQUc1ZSxHQUFHLENBQUNwRCxFQUFFO1lBQ2Y2aEIsV0FBVyxDQUFDemUsR0FBRyxDQUFDO1VBQ2xCLENBQUMsTUFBTTtZQUNMLElBQUkrZSxXQUFXLEdBQUd6bkIsTUFBTSxDQUFDQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUVyQixpQkFBaUIsQ0FBQ2tCLFFBQVEsQ0FBQztZQUMvRCxJQUFJd25CLE1BQU0sRUFBRTtjQUNWRyxXQUFXLENBQUNuaUIsRUFBRSxHQUFHO2dCQUFDQyxHQUFHLEVBQUUraEI7Y0FBTSxDQUFDO1lBQ2hDO1lBQ0E5TSxNQUFNLEdBQUdqYSxJQUFJLENBQUNnUSx5QkFBeUIsQ0FBQyxJQUFJMVAsaUJBQWlCLENBQzNEakMsaUJBQWlCLENBQUNjLGNBQWMsRUFDaEMrbkIsV0FBVyxFQUNYN29CLGlCQUFpQixDQUFDNk4sT0FBTyxDQUFDLENBQUM7WUFDN0I7WUFDQTtZQUNBO1lBQ0FwRixVQUFVLENBQUNrZ0IsSUFBSSxFQUFFLEdBQUcsQ0FBQztZQUNyQjtVQUNGO1FBQ0Y7TUFDRixDQUFDLENBQUM7TUFFRixPQUFPO1FBQ0xub0IsSUFBSSxFQUFFLFNBQUFBLENBQUEsRUFBWTtVQUNoQmlvQixPQUFPLEdBQUcsSUFBSTtVQUNkN00sTUFBTSxDQUFDMkcsS0FBSyxDQUFDLENBQUM7UUFDaEI7TUFDRixDQUFDO0lBQ0gsQ0FBQztJQUVEbmhCLE1BQU0sQ0FBQ0MsTUFBTSxDQUFDOUMsZUFBZSxDQUFDdUIsU0FBUyxFQUFFO01BQ3ZDZ3BCLGVBQWUsRUFBRSxlQUFBQSxDQUNmOW9CLGlCQUFpQixFQUFFNkwsT0FBTyxFQUFFdUUsU0FBUyxFQUFFM0Isb0JBQW9CLEVBQUU7UUFBQSxJQUFBc2Esa0JBQUE7UUFDN0QsSUFBSXBuQixJQUFJLEdBQUcsSUFBSTtRQUNmLE1BQU1iLGNBQWMsR0FBR2QsaUJBQWlCLENBQUNjLGNBQWM7UUFFdkQsSUFBSWQsaUJBQWlCLENBQUM2TixPQUFPLENBQUNqRSxRQUFRLEVBQUU7VUFDdEMsT0FBT2pJLElBQUksQ0FBQ2dtQix1QkFBdUIsQ0FBQzNuQixpQkFBaUIsRUFBRTZMLE9BQU8sRUFBRXVFLFNBQVMsQ0FBQztRQUM1RTs7UUFFQTtRQUNBO1FBQ0EsTUFBTTRZLGFBQWEsR0FBR2hwQixpQkFBaUIsQ0FBQzZOLE9BQU8sQ0FBQ2pHLFVBQVUsSUFBSTVILGlCQUFpQixDQUFDNk4sT0FBTyxDQUFDc0IsTUFBTTtRQUM5RixJQUFJNlosYUFBYSxLQUNkQSxhQUFhLENBQUNyZSxHQUFHLEtBQUssQ0FBQyxJQUN0QnFlLGFBQWEsQ0FBQ3JlLEdBQUcsS0FBSyxLQUFLLENBQUMsRUFBRTtVQUNoQyxNQUFNeEYsS0FBSyxDQUFDLHNEQUFzRCxDQUFDO1FBQ3JFO1FBRUEsSUFBSThqQixVQUFVLEdBQUd2YSxLQUFLLENBQUN4RyxTQUFTLENBQzlCOUcsTUFBTSxDQUFDQyxNQUFNLENBQUM7VUFBQ3dLLE9BQU8sRUFBRUE7UUFBTyxDQUFDLEVBQUU3TCxpQkFBaUIsQ0FBQyxDQUFDO1FBRXZELElBQUkwUixXQUFXLEVBQUV3WCxhQUFhO1FBQzlCLElBQUlDLFdBQVcsR0FBRyxLQUFLOztRQUV2QjtRQUNBO1FBQ0E7UUFDQSxJQUFJRixVQUFVLElBQUl0bkIsSUFBSSxDQUFDcWYsb0JBQW9CLEVBQUU7VUFDM0N0UCxXQUFXLEdBQUcvUCxJQUFJLENBQUNxZixvQkFBb0IsQ0FBQ2lJLFVBQVUsQ0FBQztRQUNyRCxDQUFDLE1BQU07VUFDTEUsV0FBVyxHQUFHLElBQUk7VUFDbEI7VUFDQXpYLFdBQVcsR0FBRyxJQUFJaEcsa0JBQWtCLENBQUM7WUFDbkNHLE9BQU8sRUFBRUEsT0FBTztZQUNoQkMsTUFBTSxFQUFFLFNBQUFBLENBQUEsRUFBWTtjQUNsQixPQUFPbkssSUFBSSxDQUFDcWYsb0JBQW9CLENBQUNpSSxVQUFVLENBQUM7Y0FDNUMsT0FBT0MsYUFBYSxDQUFDMW9CLElBQUksQ0FBQyxDQUFDO1lBQzdCO1VBQ0YsQ0FBQyxDQUFDO1FBQ0o7UUFFQSxJQUFJNG9CLGFBQWEsR0FBRyxJQUFJMUksYUFBYSxDQUFDaFAsV0FBVyxFQUMvQ3RCLFNBQVMsRUFDVDNCLG9CQUNGLENBQUM7UUFFRCxNQUFNNGEsWUFBWSxHQUFHLENBQUExbkIsSUFBSSxhQUFKQSxJQUFJLHdCQUFBb25CLGtCQUFBLEdBQUpwbkIsSUFBSSxDQUFFZ1YsWUFBWSxjQUFBb1Msa0JBQUEsdUJBQWxCQSxrQkFBQSxDQUFvQnhsQixhQUFhLEtBQUksQ0FBQyxDQUFDO1FBQzVELE1BQU07VUFBRW9CLGtCQUFrQjtVQUFFSztRQUFtQixDQUFDLEdBQUdxa0IsWUFBWTtRQUMvRCxJQUFJRixXQUFXLEVBQUU7VUFFZixJQUFJblQsT0FBTyxFQUFFdkIsTUFBTTtVQUNuQixJQUFJNlUsV0FBVyxHQUFHLENBQ2hCLFlBQVk7WUFDVjtZQUNBO1lBQ0E7WUFDQSxPQUFPM25CLElBQUksQ0FBQ2dWLFlBQVksSUFBSSxDQUFDOUssT0FBTyxJQUNsQyxDQUFDdUUsU0FBUyxDQUFDb0IscUJBQXFCO1VBQ3BDLENBQUMsRUFDRCxZQUFZO1lBQ1Y7WUFDQTtZQUNBLElBQUl4TSxrQkFBa0IsYUFBbEJBLGtCQUFrQixlQUFsQkEsa0JBQWtCLENBQUVFLE1BQU0sSUFBSUYsa0JBQWtCLENBQUN1a0IsUUFBUSxDQUFDem9CLGNBQWMsQ0FBQyxFQUFFO2NBQzdFLElBQUksQ0FBQ2dnQix1QkFBdUIsQ0FBQ3lJLFFBQVEsQ0FBQ3pvQixjQUFjLENBQUMsRUFBRTtnQkFDckQ0SCxPQUFPLENBQUM4Z0IsSUFBSSxtRkFBQS9pQixNQUFBLENBQW1GM0YsY0FBYyxzREFBbUQsQ0FBQztnQkFDaktnZ0IsdUJBQXVCLENBQUMxZ0IsSUFBSSxDQUFDVSxjQUFjLENBQUMsQ0FBQyxDQUFDO2NBQ2hEO2NBQ0EsT0FBTyxLQUFLO1lBQ2Q7WUFDQSxJQUFJNkQsa0JBQWtCLGFBQWxCQSxrQkFBa0IsZUFBbEJBLGtCQUFrQixDQUFFTyxNQUFNLElBQUksQ0FBQ1Asa0JBQWtCLENBQUM0a0IsUUFBUSxDQUFDem9CLGNBQWMsQ0FBQyxFQUFFO2NBQzlFLElBQUksQ0FBQ2dnQix1QkFBdUIsQ0FBQ3lJLFFBQVEsQ0FBQ3pvQixjQUFjLENBQUMsRUFBRTtnQkFDckQ0SCxPQUFPLENBQUM4Z0IsSUFBSSwyRkFBQS9pQixNQUFBLENBQTJGM0YsY0FBYyxzREFBbUQsQ0FBQztnQkFDektnZ0IsdUJBQXVCLENBQUMxZ0IsSUFBSSxDQUFDVSxjQUFjLENBQUMsQ0FBQyxDQUFDO2NBQ2hEO2NBQ0EsT0FBTyxLQUFLO1lBQ2Q7WUFDQSxPQUFPLElBQUk7VUFDYixDQUFDLEVBQ0QsWUFBWTtZQUNWO1lBQ0E7WUFDQSxJQUFJO2NBQ0ZrVixPQUFPLEdBQUcsSUFBSXlULFNBQVMsQ0FBQ0MsT0FBTyxDQUFDMXBCLGlCQUFpQixDQUFDa0IsUUFBUSxDQUFDO2NBQzNELE9BQU8sSUFBSTtZQUNiLENBQUMsQ0FBQyxPQUFPNkcsQ0FBQyxFQUFFO2NBQ1Y7Y0FDQTtjQUNBLElBQUl0SSxNQUFNLENBQUNrcUIsUUFBUSxJQUFJNWhCLENBQUMsWUFBWXFZLG1CQUFtQixFQUFFO2dCQUN2RCxNQUFNclksQ0FBQztjQUNUO2NBQ0EsT0FBTyxLQUFLO1lBQ2Q7VUFDRixDQUFDLEVBQ0QsWUFBWTtZQUNWO1lBQ0EsT0FBT3ZKLGtCQUFrQixDQUFDNGUsZUFBZSxDQUFDcGQsaUJBQWlCLEVBQUVnVyxPQUFPLENBQUM7VUFDdkUsQ0FBQyxFQUNELFlBQVk7WUFDVjtZQUNBO1lBQ0EsSUFBSSxDQUFDaFcsaUJBQWlCLENBQUM2TixPQUFPLENBQUNoRyxJQUFJLEVBQ2pDLE9BQU8sSUFBSTtZQUNiLElBQUk7Y0FDRjRNLE1BQU0sR0FBRyxJQUFJZ1YsU0FBUyxDQUFDRyxNQUFNLENBQUM1cEIsaUJBQWlCLENBQUM2TixPQUFPLENBQUNoRyxJQUFJLENBQUM7Y0FDN0QsT0FBTyxJQUFJO1lBQ2IsQ0FBQyxDQUFDLE9BQU9FLENBQUMsRUFBRTtjQUNWO2NBQ0E7Y0FDQSxPQUFPLEtBQUs7WUFDZDtVQUNGLENBQUMsQ0FDRixDQUFDOFYsS0FBSyxDQUFDdkosQ0FBQyxJQUFJQSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRTs7VUFFcEIsSUFBSXVWLFdBQVcsR0FBR1AsV0FBVyxHQUFHOXFCLGtCQUFrQixHQUFHK1Isb0JBQW9CO1VBQ3pFMlksYUFBYSxHQUFHLElBQUlXLFdBQVcsQ0FBQztZQUM5QjdwQixpQkFBaUIsRUFBRUEsaUJBQWlCO1lBQ3BDeVIsV0FBVyxFQUFFOVAsSUFBSTtZQUNqQitQLFdBQVcsRUFBRUEsV0FBVztZQUN4QjdGLE9BQU8sRUFBRUEsT0FBTztZQUNoQm1LLE9BQU8sRUFBRUEsT0FBTztZQUFHO1lBQ25CdkIsTUFBTSxFQUFFQSxNQUFNO1lBQUc7WUFDakJqRCxxQkFBcUIsRUFBRXBCLFNBQVMsQ0FBQ29CO1VBQ25DLENBQUMsQ0FBQztVQUVGLElBQUkwWCxhQUFhLENBQUNuWCxLQUFLLEVBQUU7WUFDdkIsTUFBTW1YLGFBQWEsQ0FBQ25YLEtBQUssQ0FBQyxDQUFDO1VBQzdCOztVQUVBO1VBQ0FMLFdBQVcsQ0FBQ29ZLGNBQWMsR0FBR1osYUFBYTtRQUM1QztRQUNBdm5CLElBQUksQ0FBQ3FmLG9CQUFvQixDQUFDaUksVUFBVSxDQUFDLEdBQUd2WCxXQUFXO1FBQ25EO1FBQ0EsTUFBTUEsV0FBVyxDQUFDcEUsMkJBQTJCLENBQUM4YixhQUFhLENBQUM7UUFFNUQsT0FBT0EsYUFBYTtNQUN0QjtJQUVGLENBQUMsQ0FBQztJQUFDM25CLHNCQUFBO0VBQUEsU0FBQUMsV0FBQTtJQUFBLE9BQUFELHNCQUFBLENBQUFDLFdBQUE7RUFBQTtFQUFBRCxzQkFBQTtBQUFBO0VBQUFFLElBQUE7RUFBQUMsS0FBQTtBQUFBLEc7Ozs7Ozs7Ozs7Ozs7O0lDNzZCSDFDLE1BQU0sQ0FBQ2pCLE1BQU0sQ0FBQztNQUFDUSxPQUFPLEVBQUNBLENBQUEsS0FBSUEsT0FBTztNQUFDc3JCLGFBQWEsRUFBQ0EsQ0FBQSxLQUFJQSxhQUFhO01BQUN0SixlQUFlLEVBQUNBLENBQUEsS0FBSUEsZUFBZTtNQUFDRiwwQkFBMEIsRUFBQ0EsQ0FBQSxLQUFJQSwwQkFBMEI7TUFBQ0MsWUFBWSxFQUFDQSxDQUFBLEtBQUlBLFlBQVk7TUFBQ3dKLDBCQUEwQixFQUFDQSxDQUFBLEtBQUlBLDBCQUEwQjtNQUFDQyxZQUFZLEVBQUNBLENBQUEsS0FBSUE7SUFBWSxDQUFDLENBQUM7SUFBQyxJQUFJbHFCLEtBQUs7SUFBQ2IsTUFBTSxDQUFDYixJQUFJLENBQUMsY0FBYyxFQUFDO01BQUMyRCxPQUFPQSxDQUFDMUQsQ0FBQyxFQUFDO1FBQUN5QixLQUFLLEdBQUN6QixDQUFDO01BQUE7SUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDO0lBQUMsSUFBSUksb0JBQW9CLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTUEsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFHNVksTUFBTUQsT0FBTyxHQUFHMkMsTUFBTSxDQUFDQyxNQUFNLENBQUNhLGdCQUFnQixFQUFFO01BQ3JEeWMsUUFBUSxFQUFFemMsZ0JBQWdCLENBQUN3akI7SUFDN0IsQ0FBQyxDQUFDO0lBa0JLLE1BQU1xRSxhQUFhLEdBQUcsU0FBQUEsQ0FBVXpTLEtBQUssRUFBRWdNLE9BQU8sRUFBRXhjLFFBQVEsRUFBRTtNQUMvRCxPQUFPLFVBQVVJLEdBQUcsRUFBRXNILE1BQU0sRUFBRTtRQUM1QixJQUFJLENBQUV0SCxHQUFHLEVBQUU7VUFDVDtVQUNBLElBQUk7WUFDRm9jLE9BQU8sQ0FBQyxDQUFDO1VBQ1gsQ0FBQyxDQUFDLE9BQU80RyxVQUFVLEVBQUU7WUFDbkIsSUFBSXBqQixRQUFRLEVBQUU7Y0FDWkEsUUFBUSxDQUFDb2pCLFVBQVUsQ0FBQztjQUNwQjtZQUNGLENBQUMsTUFBTTtjQUNMLE1BQU1BLFVBQVU7WUFDbEI7VUFDRjtRQUNGO1FBQ0E1UyxLQUFLLENBQUM1RCxTQUFTLENBQUMsQ0FBQztRQUNqQixJQUFJNU0sUUFBUSxFQUFFO1VBQ1pBLFFBQVEsQ0FBQ0ksR0FBRyxFQUFFc0gsTUFBTSxDQUFDO1FBQ3ZCLENBQUMsTUFBTSxJQUFJdEgsR0FBRyxFQUFFO1VBQ2QsTUFBTUEsR0FBRztRQUNYO01BQ0YsQ0FBQztJQUNILENBQUM7SUFHTSxNQUFNdVosZUFBZSxHQUFHLFNBQUFBLENBQVUwSixZQUFZLEVBQUU7TUFDckQsSUFBSTFFLFlBQVksR0FBRztRQUFFekIsY0FBYyxFQUFFO01BQUUsQ0FBQztNQUN4QyxJQUFJbUcsWUFBWSxFQUFFO1FBQ2hCLElBQUlDLFdBQVcsR0FBR0QsWUFBWSxDQUFDM2IsTUFBTTtRQUNyQztRQUNBO1FBQ0E7UUFDQSxJQUFJNGIsV0FBVyxDQUFDNUMsYUFBYSxFQUFFO1VBQzdCL0IsWUFBWSxDQUFDekIsY0FBYyxHQUFHb0csV0FBVyxDQUFDNUMsYUFBYTtVQUV2RCxJQUFJNEMsV0FBVyxDQUFDM0MsVUFBVSxFQUFFO1lBQzFCaEMsWUFBWSxDQUFDaEMsVUFBVSxHQUFHMkcsV0FBVyxDQUFDM0MsVUFBVTtVQUNsRDtRQUNGLENBQUMsTUFBTTtVQUNMO1VBQ0E7VUFDQWhDLFlBQVksQ0FBQ3pCLGNBQWMsR0FBR29HLFdBQVcsQ0FBQ0MsQ0FBQyxJQUFJRCxXQUFXLENBQUNFLFlBQVksSUFBSUYsV0FBVyxDQUFDckcsYUFBYTtRQUN0RztNQUNGO01BRUEsT0FBTzBCLFlBQVk7SUFDckIsQ0FBQztJQUVNLE1BQU1sRiwwQkFBMEIsR0FBRyxTQUFBQSxDQUFVNEMsUUFBUSxFQUFFO01BQzVELElBQUl6VSxLQUFLLENBQUM2YixRQUFRLENBQUNwSCxRQUFRLENBQUMsRUFBRTtRQUM1QjtRQUNBO1FBQ0E7UUFDQSxPQUFPLElBQUkxa0IsT0FBTyxDQUFDK3JCLE1BQU0sQ0FBQ0MsTUFBTSxDQUFDQyxJQUFJLENBQUN2SCxRQUFRLENBQUMsQ0FBQztNQUNsRDtNQUNBLElBQUlBLFFBQVEsWUFBWTFrQixPQUFPLENBQUMrckIsTUFBTSxFQUFFO1FBQ3RDLE9BQU9ySCxRQUFRO01BQ2pCO01BQ0EsSUFBSUEsUUFBUSxZQUFZekUsS0FBSyxDQUFDQyxRQUFRLEVBQUU7UUFDdEMsT0FBTyxJQUFJbGdCLE9BQU8sQ0FBQ2luQixRQUFRLENBQUN2QyxRQUFRLENBQUN3QyxXQUFXLENBQUMsQ0FBQyxDQUFDO01BQ3JEO01BQ0EsSUFBSXhDLFFBQVEsWUFBWTFrQixPQUFPLENBQUNpbkIsUUFBUSxFQUFFO1FBQ3hDLE9BQU8sSUFBSWpuQixPQUFPLENBQUNpbkIsUUFBUSxDQUFDdkMsUUFBUSxDQUFDd0MsV0FBVyxDQUFDLENBQUMsQ0FBQztNQUNyRDtNQUNBLElBQUl4QyxRQUFRLFlBQVkxa0IsT0FBTyxDQUFDb0IsU0FBUyxFQUFFO1FBQ3pDO1FBQ0E7UUFDQTtRQUNBO1FBQ0EsT0FBT3NqQixRQUFRO01BQ2pCO01BQ0EsSUFBSUEsUUFBUSxZQUFZd0gsT0FBTyxFQUFFO1FBQy9CLE9BQU9sc0IsT0FBTyxDQUFDbXNCLFVBQVUsQ0FBQ0MsVUFBVSxDQUFDMUgsUUFBUSxDQUFDMkgsUUFBUSxDQUFDLENBQUMsQ0FBQztNQUMzRDtNQUNBLElBQUlwYyxLQUFLLENBQUNrUSxhQUFhLENBQUN1RSxRQUFRLENBQUMsRUFBRTtRQUNqQyxPQUFPOEcsWUFBWSxDQUFDYyxjQUFjLEVBQUVyYyxLQUFLLENBQUNzYyxXQUFXLENBQUM3SCxRQUFRLENBQUMsQ0FBQztNQUNsRTtNQUNBO01BQ0E7TUFDQSxPQUFPNVcsU0FBUztJQUNsQixDQUFDO0lBRU0sTUFBTWlVLFlBQVksR0FBRyxTQUFBQSxDQUFVMkMsUUFBUSxFQUFFOEgsZUFBZSxFQUFFO01BQy9ELElBQUksT0FBTzlILFFBQVEsS0FBSyxRQUFRLElBQUlBLFFBQVEsS0FBSyxJQUFJLEVBQ25ELE9BQU9BLFFBQVE7TUFFakIsSUFBSStILG9CQUFvQixHQUFHRCxlQUFlLENBQUM5SCxRQUFRLENBQUM7TUFDcEQsSUFBSStILG9CQUFvQixLQUFLM2UsU0FBUyxFQUNwQyxPQUFPMmUsb0JBQW9CO01BRTdCLElBQUlDLEdBQUcsR0FBR2hJLFFBQVE7TUFDbEIvaEIsTUFBTSxDQUFDd2MsT0FBTyxDQUFDdUYsUUFBUSxDQUFDLENBQUMxaUIsT0FBTyxDQUFDLFVBQUFrTCxJQUFBLEVBQXNCO1FBQUEsSUFBWixDQUFDL0ssR0FBRyxFQUFFd3FCLEdBQUcsQ0FBQyxHQUFBemYsSUFBQTtRQUNuRCxJQUFJMGYsV0FBVyxHQUFHN0ssWUFBWSxDQUFDNEssR0FBRyxFQUFFSCxlQUFlLENBQUM7UUFDcEQsSUFBSUcsR0FBRyxLQUFLQyxXQUFXLEVBQUU7VUFDdkI7VUFDQSxJQUFJRixHQUFHLEtBQUtoSSxRQUFRLEVBQ2xCZ0ksR0FBRyxHQUFHcHJCLEtBQUssQ0FBQ29qQixRQUFRLENBQUM7VUFDdkJnSSxHQUFHLENBQUN2cUIsR0FBRyxDQUFDLEdBQUd5cUIsV0FBVztRQUN4QjtNQUNGLENBQUMsQ0FBQztNQUNGLE9BQU9GLEdBQUc7SUFDWixDQUFDO0lBRU0sTUFBTW5CLDBCQUEwQixHQUFHLFNBQUFBLENBQVU3RyxRQUFRLEVBQUU7TUFDNUQsSUFBSUEsUUFBUSxZQUFZMWtCLE9BQU8sQ0FBQytyQixNQUFNLEVBQUU7UUFDdEM7UUFDQSxJQUFJckgsUUFBUSxDQUFDbUksUUFBUSxLQUFLLENBQUMsRUFBRTtVQUMzQixPQUFPbkksUUFBUTtRQUNqQjtRQUNBLElBQUlvSSxNQUFNLEdBQUdwSSxRQUFRLENBQUMzWSxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQ2pDLE9BQU8sSUFBSWdoQixVQUFVLENBQUNELE1BQU0sQ0FBQztNQUMvQjtNQUNBLElBQUlwSSxRQUFRLFlBQVkxa0IsT0FBTyxDQUFDaW5CLFFBQVEsRUFBRTtRQUN4QyxPQUFPLElBQUloSCxLQUFLLENBQUNDLFFBQVEsQ0FBQ3dFLFFBQVEsQ0FBQ3dDLFdBQVcsQ0FBQyxDQUFDLENBQUM7TUFDbkQ7TUFDQSxJQUFJeEMsUUFBUSxZQUFZMWtCLE9BQU8sQ0FBQ21zQixVQUFVLEVBQUU7UUFDMUMsT0FBT0QsT0FBTyxDQUFDeEgsUUFBUSxDQUFDMkgsUUFBUSxDQUFDLENBQUMsQ0FBQztNQUNyQztNQUNBLElBQUkzSCxRQUFRLENBQUMsWUFBWSxDQUFDLElBQUlBLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSS9oQixNQUFNLENBQUNtTixJQUFJLENBQUM0VSxRQUFRLENBQUMsQ0FBQ2plLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDM0YsT0FBT3dKLEtBQUssQ0FBQytjLGFBQWEsQ0FBQ3hCLFlBQVksQ0FBQ3lCLGdCQUFnQixFQUFFdkksUUFBUSxDQUFDLENBQUM7TUFDdEU7TUFDQSxJQUFJQSxRQUFRLFlBQVkxa0IsT0FBTyxDQUFDb0IsU0FBUyxFQUFFO1FBQ3pDO1FBQ0E7UUFDQTtRQUNBO1FBQ0EsT0FBT3NqQixRQUFRO01BQ2pCO01BQ0EsT0FBTzVXLFNBQVM7SUFDbEIsQ0FBQztJQUVELE1BQU13ZSxjQUFjLEdBQUc3UCxJQUFJLElBQUksT0FBTyxHQUFHQSxJQUFJO0lBQzdDLE1BQU13USxnQkFBZ0IsR0FBR3hRLElBQUksSUFBSUEsSUFBSSxDQUFDeVEsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUV4QyxTQUFTMUIsWUFBWUEsQ0FBQ3RQLE1BQU0sRUFBRWlSLEtBQUssRUFBRTtNQUMxQyxJQUFJLE9BQU9BLEtBQUssS0FBSyxRQUFRLElBQUlBLEtBQUssS0FBSyxJQUFJLEVBQUU7UUFDL0MsSUFBSXplLEtBQUssQ0FBQ3NSLE9BQU8sQ0FBQ21OLEtBQUssQ0FBQyxFQUFFO1VBQ3hCLE9BQU9BLEtBQUssQ0FBQ3JsQixHQUFHLENBQUMwakIsWUFBWSxDQUFDcFksSUFBSSxDQUFDLElBQUksRUFBRThJLE1BQU0sQ0FBQyxDQUFDO1FBQ25EO1FBQ0EsSUFBSXdRLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDWi9wQixNQUFNLENBQUN3YyxPQUFPLENBQUNnTyxLQUFLLENBQUMsQ0FBQ25yQixPQUFPLENBQUMsVUFBQXlPLEtBQUEsRUFBd0I7VUFBQSxJQUFkLENBQUN0TyxHQUFHLEVBQUU0SixLQUFLLENBQUMsR0FBQTBFLEtBQUE7VUFDbERpYyxHQUFHLENBQUN4USxNQUFNLENBQUMvWixHQUFHLENBQUMsQ0FBQyxHQUFHcXBCLFlBQVksQ0FBQ3RQLE1BQU0sRUFBRW5RLEtBQUssQ0FBQztRQUNoRCxDQUFDLENBQUM7UUFDRixPQUFPMmdCLEdBQUc7TUFDWjtNQUNBLE9BQU9TLEtBQUs7SUFDZDtJQUFDbnFCLHNCQUFBO0VBQUEsU0FBQUMsV0FBQTtJQUFBLE9BQUFELHNCQUFBLENBQUFDLFdBQUE7RUFBQTtFQUFBRCxzQkFBQTtBQUFBO0VBQUFFLElBQUE7RUFBQUMsS0FBQTtBQUFBLEc7Ozs7Ozs7Ozs7Ozs7O0lDektEMUMsTUFBTSxDQUFDakIsTUFBTSxDQUFDO01BQUNxaUIsa0JBQWtCLEVBQUNBLENBQUEsS0FBSUE7SUFBa0IsQ0FBQyxDQUFDO0lBQUMsSUFBSXRmLGVBQWU7SUFBQzlCLE1BQU0sQ0FBQ2IsSUFBSSxDQUFDLG1DQUFtQyxFQUFDO01BQUMyRCxPQUFPQSxDQUFDMUQsQ0FBQyxFQUFDO1FBQUMwQyxlQUFlLEdBQUMxQyxDQUFDO01BQUE7SUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDO0lBQUMsSUFBSTByQiwwQkFBMEIsRUFBQ3hKLFlBQVk7SUFBQ3RoQixNQUFNLENBQUNiLElBQUksQ0FBQyxnQkFBZ0IsRUFBQztNQUFDMnJCLDBCQUEwQkEsQ0FBQzFyQixDQUFDLEVBQUM7UUFBQzByQiwwQkFBMEIsR0FBQzFyQixDQUFDO01BQUEsQ0FBQztNQUFDa2lCLFlBQVlBLENBQUNsaUIsQ0FBQyxFQUFDO1FBQUNraUIsWUFBWSxHQUFDbGlCLENBQUM7TUFBQTtJQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7SUFBQyxJQUFJSSxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNQSxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQVNqWSxNQUFNNGhCLGtCQUFrQixDQUFDO01BRzlCNWQsV0FBV0EsQ0FBQ3dsQixRQUFRLEVBQUVsb0IsaUJBQWlCLEVBQUU2TixPQUFPLEVBQUU7UUFBQSxLQUZsRGdlLFFBQVEsR0FBRyxLQUFLO1FBQUEsS0FDaEJDLFlBQVksR0FBRyxJQUFJO1FBRWpCLElBQUksQ0FBQ0MsU0FBUyxHQUFHN0QsUUFBUTtRQUN6QixJQUFJLENBQUNwWCxrQkFBa0IsR0FBRzlRLGlCQUFpQjtRQUUzQyxJQUFJLENBQUNnc0IsaUJBQWlCLEdBQUduZSxPQUFPLENBQUNnYSxnQkFBZ0IsSUFBSSxJQUFJO1FBQ3pELElBQUloYSxPQUFPLENBQUNpYSxZQUFZLElBQUk5bkIsaUJBQWlCLENBQUM2TixPQUFPLENBQUNxTyxTQUFTLEVBQUU7VUFDL0QsSUFBSSxDQUFDK1AsVUFBVSxHQUFHanJCLGVBQWUsQ0FBQ2tyQixhQUFhLENBQzdDbHNCLGlCQUFpQixDQUFDNk4sT0FBTyxDQUFDcU8sU0FBUyxDQUFDO1FBQ3hDLENBQUMsTUFBTTtVQUNMLElBQUksQ0FBQytQLFVBQVUsR0FBRyxJQUFJO1FBQ3hCO1FBRUEsSUFBSSxDQUFDRSxXQUFXLEdBQUcsSUFBSW5yQixlQUFlLENBQUNrUyxNQUFNLENBQUQsQ0FBQztNQUMvQztNQUVBLENBQUNrWixNQUFNLENBQUNDLGFBQWEsSUFBSTtRQUN2QixJQUFJelEsTUFBTSxHQUFHLElBQUk7UUFDakIsT0FBTztVQUNMLE1BQU1nQixJQUFJQSxDQUFBLEVBQUc7WUFDWCxNQUFNcFMsS0FBSyxHQUFHLE1BQU1vUixNQUFNLENBQUMwUSxrQkFBa0IsQ0FBQyxDQUFDO1lBQy9DLE9BQU87Y0FBRXpQLElBQUksRUFBRSxDQUFDclMsS0FBSztjQUFFQTtZQUFNLENBQUM7VUFDaEM7UUFDRixDQUFDO01BQ0g7O01BRUE7TUFDQTtNQUNBLE1BQU0raEIscUJBQXFCQSxDQUFBLEVBQUc7UUFDNUIsSUFBSSxJQUFJLENBQUNWLFFBQVEsRUFBRTtVQUNqQjtVQUNBLE9BQU8sSUFBSTtRQUNiO1FBQ0EsSUFBSTtVQUNGLElBQUksQ0FBQ0MsWUFBWSxHQUFHLElBQUksQ0FBQ0MsU0FBUyxDQUFDblAsSUFBSSxDQUFDLENBQUM7VUFDekMsTUFBTXBPLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQ3NkLFlBQVk7VUFDdEMsSUFBSSxDQUFDQSxZQUFZLEdBQUcsSUFBSTtVQUN4QixPQUFPdGQsTUFBTTtRQUNmLENBQUMsQ0FBQyxPQUFPekcsQ0FBQyxFQUFFO1VBQ1ZXLE9BQU8sQ0FBQ0MsS0FBSyxDQUFDWixDQUFDLENBQUM7UUFDbEIsQ0FBQyxTQUFTO1VBQ1IsSUFBSSxDQUFDK2pCLFlBQVksR0FBRyxJQUFJO1FBQzFCO01BQ0Y7O01BRUE7TUFDQTtNQUNBLE1BQU1RLGtCQUFrQkEsQ0FBQSxFQUFJO1FBQzFCLE9BQU8sSUFBSSxFQUFFO1VBQ1gsSUFBSXhpQixHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUN5aUIscUJBQXFCLENBQUMsQ0FBQztVQUU1QyxJQUFJLENBQUN6aUIsR0FBRyxFQUFFLE9BQU8sSUFBSTtVQUNyQkEsR0FBRyxHQUFHMFcsWUFBWSxDQUFDMVcsR0FBRyxFQUFFa2dCLDBCQUEwQixDQUFDO1VBRW5ELElBQUksQ0FBQyxJQUFJLENBQUNsWixrQkFBa0IsQ0FBQ2pELE9BQU8sQ0FBQ2pFLFFBQVEsSUFBSSxLQUFLLElBQUlFLEdBQUcsRUFBRTtZQUM3RDtZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0E7WUFDQSxJQUFJLElBQUksQ0FBQ3FpQixXQUFXLENBQUNoYyxHQUFHLENBQUNyRyxHQUFHLENBQUNhLEdBQUcsQ0FBQyxFQUFFO1lBQ25DLElBQUksQ0FBQ3doQixXQUFXLENBQUM5YixHQUFHLENBQUN2RyxHQUFHLENBQUNhLEdBQUcsRUFBRSxJQUFJLENBQUM7VUFDckM7VUFFQSxJQUFJLElBQUksQ0FBQ3NoQixVQUFVLEVBQ2pCbmlCLEdBQUcsR0FBRyxJQUFJLENBQUNtaUIsVUFBVSxDQUFDbmlCLEdBQUcsQ0FBQztVQUU1QixPQUFPQSxHQUFHO1FBQ1o7TUFDRjs7TUFFQTtNQUNBO01BQ0E7TUFDQThlLDZCQUE2QkEsQ0FBQ0osU0FBUyxFQUFFO1FBQ3ZDLE1BQU1nRSxpQkFBaUIsR0FBRyxJQUFJLENBQUNGLGtCQUFrQixDQUFDLENBQUM7UUFDbkQsSUFBSSxDQUFDOUQsU0FBUyxFQUFFO1VBQ2QsT0FBT2dFLGlCQUFpQjtRQUMxQjtRQUVBLE1BQU1DLGNBQWMsR0FBRyxJQUFJbm9CLE9BQU8sQ0FBQ2dILE9BQU8sSUFBSTtVQUM1QztVQUNBLE1BQU1vaEIsU0FBUyxHQUFHamtCLFVBQVUsQ0FBQyxNQUFNO1lBQ2pDNkMsT0FBTyxDQUFDLElBQUksQ0FBQ2lYLEtBQUssQ0FBQyxDQUFDLENBQUM7VUFDdkIsQ0FBQyxFQUFFaUcsU0FBUyxDQUFDOztVQUViO1VBQ0FnRSxpQkFBaUIsQ0FBQ0csT0FBTyxDQUFDLE1BQU07WUFDOUJua0IsWUFBWSxDQUFDa2tCLFNBQVMsQ0FBQztVQUN6QixDQUFDLENBQUM7UUFDSixDQUFDLENBQUM7UUFFRixPQUFPcG9CLE9BQU8sQ0FBQ3NvQixJQUFJLENBQUMsQ0FBQ0osaUJBQWlCLEVBQUVDLGNBQWMsQ0FBQyxDQUFDO01BQzFEO01BRUEsTUFBTWhzQixPQUFPQSxDQUFDcUcsUUFBUSxFQUFFK2xCLE9BQU8sRUFBRTtRQUMvQjtRQUNBLElBQUksQ0FBQ0MsT0FBTyxDQUFDLENBQUM7UUFFZCxJQUFJQyxHQUFHLEdBQUcsQ0FBQztRQUNYLE9BQU8sSUFBSSxFQUFFO1VBQ1gsTUFBTWpqQixHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUN3aUIsa0JBQWtCLENBQUMsQ0FBQztVQUMzQyxJQUFJLENBQUN4aUIsR0FBRyxFQUFFO1VBQ1YsTUFBTWhELFFBQVEsQ0FBQ3FNLElBQUksQ0FBQzBaLE9BQU8sRUFBRS9pQixHQUFHLEVBQUVpakIsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDZixpQkFBaUIsQ0FBQztRQUNsRTtNQUNGO01BRUEsTUFBTXpsQixHQUFHQSxDQUFDTyxRQUFRLEVBQUUrbEIsT0FBTyxFQUFFO1FBQzNCLE1BQU1wUyxPQUFPLEdBQUcsRUFBRTtRQUNsQixNQUFNLElBQUksQ0FBQ2hhLE9BQU8sQ0FBQyxPQUFPcUosR0FBRyxFQUFFb2MsS0FBSyxLQUFLO1VBQ3ZDekwsT0FBTyxDQUFDcmEsSUFBSSxDQUFDLE1BQU0wRyxRQUFRLENBQUNxTSxJQUFJLENBQUMwWixPQUFPLEVBQUUvaUIsR0FBRyxFQUFFb2MsS0FBSyxFQUFFLElBQUksQ0FBQzhGLGlCQUFpQixDQUFDLENBQUM7UUFDaEYsQ0FBQyxDQUFDO1FBRUYsT0FBT3ZSLE9BQU87TUFDaEI7TUFFQXFTLE9BQU9BLENBQUEsRUFBRztRQUNSO1FBQ0EsSUFBSSxDQUFDZixTQUFTLENBQUNpQixNQUFNLENBQUMsQ0FBQztRQUV2QixJQUFJLENBQUNiLFdBQVcsR0FBRyxJQUFJbnJCLGVBQWUsQ0FBQ2tTLE1BQU0sQ0FBRCxDQUFDO01BQy9DOztNQUVBO01BQ0EsTUFBTXFQLEtBQUtBLENBQUEsRUFBRztRQUNaLElBQUksQ0FBQ3NKLFFBQVEsR0FBRyxJQUFJO1FBQ3BCO1FBQ0EsSUFBSSxJQUFJLENBQUNDLFlBQVksRUFBRTtVQUNyQixJQUFJO1lBQ0YsTUFBTSxJQUFJLENBQUNBLFlBQVk7VUFDekIsQ0FBQyxDQUFDLE9BQU8vakIsQ0FBQyxFQUFFO1lBQ1Y7VUFBQTtRQUVKO1FBQ0EsSUFBSSxDQUFDZ2tCLFNBQVMsQ0FBQ3hKLEtBQUssQ0FBQyxDQUFDO01BQ3hCO01BRUF2UyxLQUFLQSxDQUFBLEVBQUc7UUFDTixPQUFPLElBQUksQ0FBQ3pKLEdBQUcsQ0FBQ3VELEdBQUcsSUFBSUEsR0FBRyxDQUFDO01BQzdCOztNQUVBO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7TUFDRW1qQixLQUFLQSxDQUFBLEVBQUc7UUFDTixPQUFPLElBQUksQ0FBQ2xCLFNBQVMsQ0FBQ2tCLEtBQUssQ0FBQyxDQUFDO01BQy9COztNQUVBO01BQ0EsTUFBTTVaLGFBQWFBLENBQUN4SCxPQUFPLEVBQUU7UUFDM0IsSUFBSWxLLElBQUksR0FBRyxJQUFJO1FBQ2YsSUFBSWtLLE9BQU8sRUFBRTtVQUNYLE9BQU9sSyxJQUFJLENBQUNxTyxLQUFLLENBQUMsQ0FBQztRQUNyQixDQUFDLE1BQU07VUFDTCxJQUFJeUssT0FBTyxHQUFHLElBQUl6WixlQUFlLENBQUNrUyxNQUFNLENBQUQsQ0FBQztVQUN4QyxNQUFNdlIsSUFBSSxDQUFDbEIsT0FBTyxDQUFDLFVBQVVxSixHQUFHLEVBQUU7WUFDaEMyUSxPQUFPLENBQUNwSyxHQUFHLENBQUN2RyxHQUFHLENBQUNhLEdBQUcsRUFBRWIsR0FBRyxDQUFDO1VBQzNCLENBQUMsQ0FBQztVQUNGLE9BQU8yUSxPQUFPO1FBQ2hCO01BQ0Y7SUFDRjtJQUFDaFosc0JBQUE7RUFBQSxTQUFBQyxXQUFBO0lBQUEsT0FBQUQsc0JBQUEsQ0FBQUMsV0FBQTtFQUFBO0VBQUFELHNCQUFBO0FBQUE7RUFBQUUsSUFBQTtFQUFBQyxLQUFBO0FBQUEsRzs7Ozs7Ozs7Ozs7Ozs7SUMvS0QxQyxNQUFBLENBQU9qQixNQUFFO01BQUE4VixNQUFBLEVBQUFBLENBQUEsS0FBQUE7SUFBc0I7SUFBQSxJQUFBbVosb0JBQTBCLEVBQUEvTSxrQkFBQTtJQUFBamhCLE1BQTRCLENBQUNiLElBQUE7TUFBQTZ1QixxQkFBQTV1QixDQUFBO1FBQUE0dUIsb0JBQUEsR0FBQTV1QixDQUFBO01BQUE7TUFBQTZoQixtQkFBQTdoQixDQUFBO1FBQUE2aEIsa0JBQUEsR0FBQTdoQixDQUFBO01BQUE7SUFBQTtJQUFBLElBQUFpaUIsMEJBQUEsRUFBQUMsWUFBQTtJQUFBdGhCLE1BQUEsQ0FBQWIsSUFBQTtNQUFBa2lCLDJCQUFBamlCLENBQUE7UUFBQWlpQiwwQkFBQSxHQUFBamlCLENBQUE7TUFBQTtNQUFBa2lCLGFBQUFsaUIsQ0FBQTtRQUFBa2lCLFlBQUEsR0FBQWxpQixDQUFBO01BQUE7SUFBQTtJQUFBLElBQUEwQyxlQUFBO0lBQUE5QixNQUFBLENBQUFiLElBQUE7TUFBQTJELFFBQUExRCxDQUFBO1FBQUEwQyxlQUFBLEdBQUExQyxDQUFBO01BQUE7SUFBQTtJQUFBLElBQUFJLG9CQUFBLFdBQUFBLG9CQUFBO0lBMEJoRixNQUFPcVYsTUFBTTtNQUtqQnJSLFlBQVlvQyxLQUFxQixFQUFFOUUsaUJBQW9DO1FBQUEsS0FKaEVtdEIsTUFBTTtRQUFBLEtBQ05yYyxrQkFBa0I7UUFBQSxLQUNsQnNjLGtCQUFrQjtRQUd2QixJQUFJLENBQUNELE1BQU0sR0FBR3JvQixLQUFLO1FBQ25CLElBQUksQ0FBQ2dNLGtCQUFrQixHQUFHOVEsaUJBQWlCO1FBQzNDLElBQUksQ0FBQ290QixrQkFBa0IsR0FBRyxJQUFJO01BQ2hDO01BRUEsTUFBTUMsVUFBVUEsQ0FBQTtRQUNkLE1BQU14c0IsVUFBVSxHQUFHLElBQUksQ0FBQ3NzQixNQUFNLENBQUMxSyxhQUFhLENBQUMsSUFBSSxDQUFDM1Isa0JBQWtCLENBQUNoUSxjQUFjLENBQUM7UUFDcEYsT0FBTyxNQUFNRCxVQUFVLENBQUN1bEIsY0FBYyxDQUNwQzVGLFlBQVksQ0FBQyxJQUFJLENBQUMxUCxrQkFBa0IsQ0FBQzVQLFFBQVEsRUFBRXFmLDBCQUEwQixDQUFDLEVBQzFFQyxZQUFZLENBQUMsSUFBSSxDQUFDMVAsa0JBQWtCLENBQUNqRCxPQUFPLEVBQUUwUywwQkFBMEIsQ0FBQyxDQUMxRTtNQUNIO01BRUEwTSxLQUFLQSxDQUFBO1FBQ0gsTUFBTSxJQUFJOW5CLEtBQUssQ0FDYiwwRUFBMEUsQ0FDM0U7TUFDSDtNQUVBbW9CLFlBQVlBLENBQUE7UUFDVixPQUFPLElBQUksQ0FBQ3hjLGtCQUFrQixDQUFDakQsT0FBTyxDQUFDcU8sU0FBUztNQUNsRDtNQUVBcVIsY0FBY0EsQ0FBQ0MsR0FBUTtRQUNyQixNQUFNM3NCLFVBQVUsR0FBRyxJQUFJLENBQUNpUSxrQkFBa0IsQ0FBQ2hRLGNBQWM7UUFDekQsT0FBTzRkLEtBQUssQ0FBQ3FCLFVBQVUsQ0FBQ3dOLGNBQWMsQ0FBQyxJQUFJLEVBQUVDLEdBQUcsRUFBRTNzQixVQUFVLENBQUM7TUFDL0Q7TUFFQTRzQixrQkFBa0JBLENBQUE7UUFDaEIsT0FBTyxJQUFJLENBQUMzYyxrQkFBa0IsQ0FBQ2hRLGNBQWM7TUFDL0M7TUFFQTRzQixPQUFPQSxDQUFDdGQsU0FBOEI7UUFDcEMsT0FBT3BQLGVBQWUsQ0FBQzJzQiwwQkFBMEIsQ0FBQyxJQUFJLEVBQUV2ZCxTQUFTLENBQUM7TUFDcEU7TUFFQSxNQUFNd2QsWUFBWUEsQ0FBQ3hkLFNBQThCO1FBQy9DLE9BQU8sSUFBSTlMLE9BQU8sQ0FBQ2dILE9BQU8sSUFBSUEsT0FBTyxDQUFDLElBQUksQ0FBQ29pQixPQUFPLENBQUN0ZCxTQUFTLENBQUMsQ0FBQyxDQUFDO01BQ2pFO01BRUF5ZCxjQUFjQSxDQUFDemQsU0FBcUMsRUFBa0Q7UUFBQSxJQUFoRHZDLE9BQUEsR0FBQVosU0FBQSxDQUFBL0gsTUFBQSxRQUFBK0gsU0FBQSxRQUFBVixTQUFBLEdBQUFVLFNBQUEsTUFBOEMsRUFBRTtRQUNwRyxNQUFNcEIsT0FBTyxHQUFHN0ssZUFBZSxDQUFDOHNCLGtDQUFrQyxDQUFDMWQsU0FBUyxDQUFDO1FBQzdFLE9BQU8sSUFBSSxDQUFDK2MsTUFBTSxDQUFDckUsZUFBZSxDQUNoQyxJQUFJLENBQUNoWSxrQkFBa0IsRUFDdkJqRixPQUFPLEVBQ1B1RSxTQUFTLEVBQ1R2QyxPQUFPLENBQUNZLG9CQUFvQixDQUM3QjtNQUNIO01BRUEsTUFBTXNmLG1CQUFtQkEsQ0FBQzNkLFNBQXFDLEVBQWtEO1FBQUEsSUFBaER2QyxPQUFBLEdBQUFaLFNBQUEsQ0FBQS9ILE1BQUEsUUFBQStILFNBQUEsUUFBQVYsU0FBQSxHQUFBVSxTQUFBLE1BQThDLEVBQUU7UUFDL0csT0FBTyxJQUFJLENBQUM0Z0IsY0FBYyxDQUFDemQsU0FBUyxFQUFFdkMsT0FBTyxDQUFDO01BQ2hEOztJQUdGO0lBQ0EsQ0FBQyxHQUFHcWYsb0JBQW9CLEVBQUVkLE1BQU0sQ0FBQzRCLFFBQVEsRUFBRTVCLE1BQU0sQ0FBQ0MsYUFBYSxDQUFDLENBQUM1ckIsT0FBTyxDQUFDd3RCLFVBQVUsSUFBRztNQUNwRixJQUFJQSxVQUFVLEtBQUssT0FBTyxFQUFFO01BRTNCbGEsTUFBTSxDQUFDalUsU0FBaUIsQ0FBQ211QixVQUFVLENBQUMsR0FBRyxZQUEwQztRQUNoRixNQUFNclMsTUFBTSxHQUFHc1MsdUJBQXVCLENBQUMsSUFBSSxFQUFFRCxVQUFVLENBQUM7UUFDeEQsT0FBT3JTLE1BQU0sQ0FBQ3FTLFVBQVUsQ0FBQyxDQUFDLEdBQUFoaEIsU0FBTyxDQUFDO01BQ3BDLENBQUM7TUFFRCxJQUFJZ2hCLFVBQVUsS0FBSzdCLE1BQU0sQ0FBQzRCLFFBQVEsSUFBSUMsVUFBVSxLQUFLN0IsTUFBTSxDQUFDQyxhQUFhLEVBQUU7TUFFM0UsTUFBTThCLGVBQWUsR0FBR2hPLGtCQUFrQixDQUFDOE4sVUFBVSxDQUFDO01BRXJEbGEsTUFBTSxDQUFDalUsU0FBaUIsQ0FBQ3F1QixlQUFlLENBQUMsR0FBRyxZQUEwQztRQUNyRixPQUFPLElBQUksQ0FBQ0YsVUFBVSxDQUFDLENBQUMsR0FBQWhoQixTQUFPLENBQUM7TUFDbEMsQ0FBQztJQUNILENBQUMsQ0FBQztJQUVGLFNBQVNpaEIsdUJBQXVCQSxDQUFDdFMsTUFBbUIsRUFBRXdMLE1BQXVCO01BQzNFLElBQUl4TCxNQUFNLENBQUM5SyxrQkFBa0IsQ0FBQ2pELE9BQU8sQ0FBQ2pFLFFBQVEsRUFBRTtRQUM5QyxNQUFNLElBQUl6RSxLQUFLLGdCQUFBc0IsTUFBQSxDQUFnQnlKLE1BQU0sQ0FBQ2tYLE1BQU0sQ0FBQywwQkFBdUIsQ0FBQztNQUN2RTtNQUVBLElBQUksQ0FBQ3hMLE1BQU0sQ0FBQ3dSLGtCQUFrQixFQUFFO1FBQzlCeFIsTUFBTSxDQUFDd1Isa0JBQWtCLEdBQUd4UixNQUFNLENBQUN1UixNQUFNLENBQUN4Yix5QkFBeUIsQ0FDakVpSyxNQUFNLENBQUM5SyxrQkFBa0IsRUFDekI7VUFDRStXLGdCQUFnQixFQUFFak0sTUFBTTtVQUN4QmtNLFlBQVksRUFBRTtTQUNmLENBQ0Y7TUFDSDtNQUVBLE9BQU9sTSxNQUFNLENBQUN3UixrQkFBa0I7SUFDbEM7SUFBQzNyQixzQkFBQTtFQUFBLFNBQUFDLFdBQUE7SUFBQSxPQUFBRCxzQkFBQSxDQUFBQyxXQUFBO0VBQUE7RUFBQUQsc0JBQUE7QUFBQTtFQUFBRSxJQUFBO0VBQUFDLEtBQUE7QUFBQSxHOzs7Ozs7Ozs7OztBQ3pIRDFDLE1BQU0sQ0FBQ2pCLE1BQU0sQ0FBQztFQUFDbXdCLHFCQUFxQixFQUFDQSxDQUFBLEtBQUlBO0FBQXFCLENBQUMsQ0FBQztBQUN6RCxNQUFNQSxxQkFBcUIsR0FBRyxJQUFLLE1BQU1BLHFCQUFxQixDQUFDO0VBQ3BFMXJCLFdBQVdBLENBQUEsRUFBRztJQUNaLElBQUksQ0FBQzJyQixpQkFBaUIsR0FBR2p0QixNQUFNLENBQUNrdEIsTUFBTSxDQUFDLElBQUksQ0FBQztFQUM5QztFQUVBQyxJQUFJQSxDQUFDclQsSUFBSSxFQUFFc1QsSUFBSSxFQUFFO0lBQ2YsSUFBSSxDQUFFdFQsSUFBSSxFQUFFO01BQ1YsT0FBTyxJQUFJbGEsZUFBZSxDQUFELENBQUM7SUFDNUI7SUFFQSxJQUFJLENBQUV3dEIsSUFBSSxFQUFFO01BQ1YsT0FBT0MsZ0JBQWdCLENBQUN2VCxJQUFJLEVBQUUsSUFBSSxDQUFDbVQsaUJBQWlCLENBQUM7SUFDdkQ7SUFFQSxJQUFJLENBQUVHLElBQUksQ0FBQ0UsMkJBQTJCLEVBQUU7TUFDdENGLElBQUksQ0FBQ0UsMkJBQTJCLEdBQUd0dEIsTUFBTSxDQUFDa3RCLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDeEQ7O0lBRUE7SUFDQTtJQUNBLE9BQU9HLGdCQUFnQixDQUFDdlQsSUFBSSxFQUFFc1QsSUFBSSxDQUFDRSwyQkFBMkIsQ0FBQztFQUNqRTtBQUNGLENBQUMsRUFBQztBQUVGLFNBQVNELGdCQUFnQkEsQ0FBQ3ZULElBQUksRUFBRXlULFdBQVcsRUFBRTtFQUMzQyxPQUFRelQsSUFBSSxJQUFJeVQsV0FBVyxHQUN2QkEsV0FBVyxDQUFDelQsSUFBSSxDQUFDLEdBQ2pCeVQsV0FBVyxDQUFDelQsSUFBSSxDQUFDLEdBQUcsSUFBSWxhLGVBQWUsQ0FBQ2thLElBQUksQ0FBQztBQUNuRCxDOzs7Ozs7Ozs7Ozs7OztJQzdCQWhjLE1BQUEsQ0FBT2pCLE1BQUk7TUFBQTJ3QixzQkFBb0IsRUFBQUEsQ0FBQSxLQUFBQTtJQUFBO0lBQUEsSUFBQUMsSUFBQTtJQUFBM3ZCLE1BQUEsQ0FBQWIsSUFBQTtNQUFBMkQsUUFBQTFELENBQUE7UUFBQXV3QixJQUFBLEdBQUF2d0IsQ0FBQTtNQUFBO0lBQUE7SUFBQSxJQUFBd3dCLHdCQUFBLEVBQUEzTyxrQkFBQSxFQUFBRCxtQkFBQTtJQUFBaGhCLE1BQUEsQ0FBQWIsSUFBQTtNQUFBeXdCLHlCQUFBeHdCLENBQUE7UUFBQXd3Qix3QkFBQSxHQUFBeHdCLENBQUE7TUFBQTtNQUFBNmhCLG1CQUFBN2hCLENBQUE7UUFBQTZoQixrQkFBQSxHQUFBN2hCLENBQUE7TUFBQTtNQUFBNGhCLG9CQUFBNWhCLENBQUE7UUFBQTRoQixtQkFBQSxHQUFBNWhCLENBQUE7TUFBQTtJQUFBO0lBQUEsSUFBQUMsZUFBQTtJQUFBVyxNQUFBLENBQUFiLElBQUE7TUFBQUUsZ0JBQUFELENBQUE7UUFBQUMsZUFBQSxHQUFBRCxDQUFBO01BQUE7SUFBQTtJQUFBLElBQUFJLG9CQUFBLFdBQUFBLG9CQUFBO0lBaUQvQixNQUFNa3dCLHNCQUFzQjtNQW9CMUJsc0IsWUFBWXFzQixRQUFnQixFQUFFbGhCLE9BQTJCO1FBQUEsS0FuQnhDL0ksS0FBSztRQW9CcEIsSUFBSSxDQUFDQSxLQUFLLEdBQUcsSUFBSXZHLGVBQWUsQ0FBQ3d3QixRQUFRLEVBQUVsaEIsT0FBTyxDQUFDO01BQ3JEO01BRU8wZ0IsSUFBSUEsQ0FBQ3JULElBQVk7UUFDdEIsTUFBTWlRLEdBQUcsR0FBdUIsRUFBRTtRQUVsQztRQUNBeUQsc0JBQXNCLENBQUNJLHlCQUF5QixDQUFDdnVCLE9BQU8sQ0FBRTJtQixNQUFNLElBQUk7VUFDbEU7VUFDQSxNQUFNNkgsV0FBVyxHQUFHLElBQUksQ0FBQ25xQixLQUFLLENBQUNzaUIsTUFBTSxDQUF3QjtVQUM3RCtELEdBQUcsQ0FBQy9ELE1BQU0sQ0FBQyxHQUFHNkgsV0FBVyxDQUFDcGQsSUFBSSxDQUFDLElBQUksQ0FBQy9NLEtBQUssRUFBRW9XLElBQUksQ0FBQztVQUVoRCxJQUFJLENBQUM0VCx3QkFBd0IsQ0FBQ3ZGLFFBQVEsQ0FBQ25DLE1BQU0sQ0FBQyxFQUFFO1VBRWhELE1BQU04SCxlQUFlLEdBQUcvTyxrQkFBa0IsQ0FBQ2lILE1BQU0sQ0FBQztVQUNsRCtELEdBQUcsQ0FBQytELGVBQWUsQ0FBQyxHQUFHO1lBQUEsT0FBd0IvRCxHQUFHLENBQUMvRCxNQUFNLENBQUMsQ0FBQyxHQUFBbmEsU0FBTyxDQUFDO1VBQUE7UUFDckUsQ0FBQyxDQUFDO1FBRUY7UUFDQWlULG1CQUFtQixDQUFDemYsT0FBTyxDQUFFMm1CLE1BQU0sSUFBSTtVQUNyQytELEdBQUcsQ0FBQy9ELE1BQU0sQ0FBQyxHQUFHLFlBQThCO1lBQzFDLE1BQU0sSUFBSWppQixLQUFLLElBQUFzQixNQUFBLENBQ1YyZ0IsTUFBTSxrREFBQTNnQixNQUFBLENBQStDMFosa0JBQWtCLENBQ3hFaUgsTUFBTSxDQUNQLGdCQUFhLENBQ2Y7VUFDSCxDQUFDO1FBQ0gsQ0FBQyxDQUFDO1FBRUYsT0FBTytELEdBQUc7TUFDWjs7SUFHRjtJQXRETXlELHNCQUFzQixDQUdGSSx5QkFBeUIsR0FBRyxDQUNsRCw2QkFBNkIsRUFDN0IsZ0JBQWdCLEVBQ2hCLGtCQUFrQixFQUNsQixrQkFBa0IsRUFDbEIsZ0JBQWdCLEVBQ2hCLHFCQUFxQixFQUNyQix3QkFBd0IsRUFDeEIsTUFBTSxFQUNOLGNBQWMsRUFDZCxhQUFhLEVBQ2IsZUFBZSxFQUNmLGFBQWEsRUFDYixhQUFhLEVBQ2IsYUFBYSxDQUNMO0lBcUNacndCLGNBQWMsQ0FBQ2l3QixzQkFBc0IsR0FBR0Esc0JBQXNCO0lBRTlEO0lBQ0Fqd0IsY0FBYyxDQUFDd3dCLDZCQUE2QixHQUFHTixJQUFJLENBQUMsTUFBNkI7TUFDL0UsTUFBTU8saUJBQWlCLEdBQXVCLEVBQUU7TUFDaEQsTUFBTUwsUUFBUSxHQUFHMXNCLE9BQU8sQ0FBQ0MsR0FBRyxDQUFDK3NCLFNBQVM7TUFFdEMsSUFBSSxDQUFDTixRQUFRLEVBQUU7UUFDYixNQUFNLElBQUk1cEIsS0FBSyxDQUFDLHNDQUFzQyxDQUFDO01BQ3pEO01BRUEsSUFBSTlDLE9BQU8sQ0FBQ0MsR0FBRyxDQUFDZ3RCLGVBQWUsRUFBRTtRQUMvQkYsaUJBQWlCLENBQUN6c0IsUUFBUSxHQUFHTixPQUFPLENBQUNDLEdBQUcsQ0FBQ2d0QixlQUFlO01BQzFEO01BRUEsTUFBTWxZLE1BQU0sR0FBRyxJQUFJd1gsc0JBQXNCLENBQUNHLFFBQVEsRUFBRUssaUJBQWlCLENBQUM7TUFFdEU7TUFDQTN2QixNQUFNLENBQUM4dkIsT0FBTyxDQUFDLFlBQTBCO1FBQ3ZDLE1BQU1uWSxNQUFNLENBQUN0UyxLQUFLLENBQUMrYyxNQUFNLENBQUMyTixPQUFPLEVBQUU7TUFDckMsQ0FBQyxDQUFDO01BRUYsT0FBT3BZLE1BQU07SUFDZixDQUFDLENBQUM7SUFBQzNWLHNCQUFBO0VBQUEsU0FBQUMsV0FBQTtJQUFBLE9BQUFELHNCQUFBLENBQUFDLFdBQUE7RUFBQTtFQUFBRCxzQkFBQTtBQUFBO0VBQUFFLElBQUE7RUFBQUMsS0FBQTtBQUFBLEc7Ozs7Ozs7Ozs7Ozs7O0lDL0hILElBQUlxZSxhQUFhO0lBQUNqaUIsT0FBTyxDQUFDSyxJQUFJLENBQUMsc0NBQXNDLEVBQUM7TUFBQzJELE9BQU9BLENBQUMxRCxDQUFDLEVBQUM7UUFBQzJoQixhQUFhLEdBQUMzaEIsQ0FBQztNQUFBO0lBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztJQUF0RyxJQUFJbXhCLG1CQUFtQjtJQUFDenhCLE9BQU8sQ0FBQ0ssSUFBSSxDQUFDLGdCQUFnQixFQUFDO01BQUNveEIsbUJBQW1CQSxDQUFDbnhCLENBQUMsRUFBQztRQUFDbXhCLG1CQUFtQixHQUFDbnhCLENBQUM7TUFBQTtJQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7SUFBQyxJQUFJb3hCLFlBQVk7SUFBQzF4QixPQUFPLENBQUNLLElBQUksQ0FBQyxpQkFBaUIsRUFBQztNQUFDcXhCLFlBQVlBLENBQUNweEIsQ0FBQyxFQUFDO1FBQUNveEIsWUFBWSxHQUFDcHhCLENBQUM7TUFBQTtJQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7SUFBQyxJQUFJcXhCLFdBQVc7SUFBQzN4QixPQUFPLENBQUNLLElBQUksQ0FBQyxnQkFBZ0IsRUFBQztNQUFDc3hCLFdBQVdBLENBQUNyeEIsQ0FBQyxFQUFDO1FBQUNxeEIsV0FBVyxHQUFDcnhCLENBQUM7TUFBQTtJQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7SUFBQyxJQUFJc3hCLFlBQVk7SUFBQzV4QixPQUFPLENBQUNLLElBQUksQ0FBQyxpQkFBaUIsRUFBQztNQUFDdXhCLFlBQVlBLENBQUN0eEIsQ0FBQyxFQUFDO1FBQUNzeEIsWUFBWSxHQUFDdHhCLENBQUM7TUFBQTtJQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7SUFBQyxJQUFJdXhCLGFBQWEsRUFBQ0MsZ0JBQWdCLEVBQUNDLGdCQUFnQixFQUFDQyxlQUFlLEVBQUNDLFdBQVcsRUFBQ0Msb0JBQW9CLEVBQUNDLHNCQUFzQjtJQUFDbnlCLE9BQU8sQ0FBQ0ssSUFBSSxDQUFDLG9CQUFvQixFQUFDO01BQUN3eEIsYUFBYUEsQ0FBQ3Z4QixDQUFDLEVBQUM7UUFBQ3V4QixhQUFhLEdBQUN2eEIsQ0FBQztNQUFBLENBQUM7TUFBQ3d4QixnQkFBZ0JBLENBQUN4eEIsQ0FBQyxFQUFDO1FBQUN3eEIsZ0JBQWdCLEdBQUN4eEIsQ0FBQztNQUFBLENBQUM7TUFBQ3l4QixnQkFBZ0JBLENBQUN6eEIsQ0FBQyxFQUFDO1FBQUN5eEIsZ0JBQWdCLEdBQUN6eEIsQ0FBQztNQUFBLENBQUM7TUFBQzB4QixlQUFlQSxDQUFDMXhCLENBQUMsRUFBQztRQUFDMHhCLGVBQWUsR0FBQzF4QixDQUFDO01BQUEsQ0FBQztNQUFDMnhCLFdBQVdBLENBQUMzeEIsQ0FBQyxFQUFDO1FBQUMyeEIsV0FBVyxHQUFDM3hCLENBQUM7TUFBQSxDQUFDO01BQUM0eEIsb0JBQW9CQSxDQUFDNXhCLENBQUMsRUFBQztRQUFDNHhCLG9CQUFvQixHQUFDNXhCLENBQUM7TUFBQSxDQUFDO01BQUM2eEIsc0JBQXNCQSxDQUFDN3hCLENBQUMsRUFBQztRQUFDNnhCLHNCQUFzQixHQUFDN3hCLENBQUM7TUFBQTtJQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7SUFBQyxJQUFJOHhCLGtCQUFrQjtJQUFDcHlCLE9BQU8sQ0FBQ0ssSUFBSSxDQUFDLHVCQUF1QixFQUFDO01BQUMreEIsa0JBQWtCQSxDQUFDOXhCLENBQUMsRUFBQztRQUFDOHhCLGtCQUFrQixHQUFDOXhCLENBQUM7TUFBQTtJQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7SUFBQyxJQUFJSSxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNQSxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQWUxOEI7QUFDQTtBQUNBO0FBQ0E7SUFDQWdnQixLQUFLLEdBQUcsQ0FBQyxDQUFDOztJQUVWO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7SUFDQTtJQUNBQSxLQUFLLENBQUNxQixVQUFVLEdBQUcsU0FBU0EsVUFBVUEsQ0FBQzdFLElBQUksRUFBRXJOLE9BQU8sRUFBRTtNQUFBLElBQUF3aUIscUJBQUEsRUFBQUMsY0FBQTtNQUNwRHBWLElBQUksR0FBR2lWLHNCQUFzQixDQUFDalYsSUFBSSxDQUFDO01BRW5Dck4sT0FBTyxHQUFHaWlCLGdCQUFnQixDQUFDamlCLE9BQU8sQ0FBQztNQUVuQyxJQUFJLENBQUMwaUIsVUFBVSxJQUFBRixxQkFBQSxHQUFHLENBQUFDLGNBQUEsR0FBQVQsYUFBYSxFQUFDaGlCLE9BQU8sQ0FBQzJpQixZQUFZLENBQUMsY0FBQUgscUJBQUEsdUJBQW5DQSxxQkFBQSxDQUFBbGQsSUFBQSxDQUFBbWQsY0FBQSxFQUFzQ3BWLElBQUksQ0FBQztNQUU3RCxJQUFJLENBQUMrUSxVQUFVLEdBQUdqckIsZUFBZSxDQUFDa3JCLGFBQWEsQ0FBQ3JlLE9BQU8sQ0FBQ3FPLFNBQVMsQ0FBQztNQUNsRSxJQUFJLENBQUN1VSxZQUFZLEdBQUc1aUIsT0FBTyxDQUFDNGlCLFlBQVk7TUFFeEMsSUFBSSxDQUFDQyxXQUFXLEdBQUdWLGVBQWUsQ0FBQzlVLElBQUksRUFBRXJOLE9BQU8sQ0FBQztNQUVqRCxNQUFNdUosTUFBTSxHQUFHNlksV0FBVyxDQUFDL1UsSUFBSSxFQUFFLElBQUksQ0FBQ3dWLFdBQVcsRUFBRTdpQixPQUFPLENBQUM7TUFDM0QsSUFBSSxDQUFDOGlCLE9BQU8sR0FBR3ZaLE1BQU07TUFFckIsSUFBSSxDQUFDd1osV0FBVyxHQUFHeFosTUFBTSxDQUFDbVgsSUFBSSxDQUFDclQsSUFBSSxFQUFFLElBQUksQ0FBQ3dWLFdBQVcsQ0FBQztNQUN0RCxJQUFJLENBQUNHLEtBQUssR0FBRzNWLElBQUk7TUFFakIsSUFBSSxDQUFDNFYsNEJBQTRCLEdBQUcsSUFBSSxDQUFDQyxzQkFBc0IsQ0FBQzdWLElBQUksRUFBRXJOLE9BQU8sQ0FBQztNQUU5RXFpQixvQkFBb0IsQ0FBQyxJQUFJLEVBQUVoVixJQUFJLEVBQUVyTixPQUFPLENBQUM7TUFFekNraUIsZ0JBQWdCLENBQUMsSUFBSSxFQUFFN1UsSUFBSSxFQUFFck4sT0FBTyxDQUFDO01BRXJDNlEsS0FBSyxDQUFDc1MsWUFBWSxDQUFDM2dCLEdBQUcsQ0FBQzZLLElBQUksRUFBRSxJQUFJLENBQUM7SUFDcEMsQ0FBQztJQUVEOVosTUFBTSxDQUFDQyxNQUFNLENBQUNxZCxLQUFLLENBQUNxQixVQUFVLENBQUNqZ0IsU0FBUyxFQUFFO01BQ3hDbXhCLGdCQUFnQkEsQ0FBQy9qQixJQUFJLEVBQUU7UUFDckIsSUFBSUEsSUFBSSxDQUFDaEksTUFBTSxJQUFJLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQzNCLE9BQU9nSSxJQUFJLENBQUMsQ0FBQyxDQUFDO01BQ3JCLENBQUM7TUFFRGdrQixlQUFlQSxDQUFDaGtCLElBQUksRUFBRTtRQUNwQixNQUFNLEdBQUdXLE9BQU8sQ0FBQyxHQUFHWCxJQUFJLElBQUksRUFBRTtRQUM5QixNQUFNaWtCLFVBQVUsR0FBRzFCLG1CQUFtQixDQUFDNWhCLE9BQU8sQ0FBQztRQUUvQyxJQUFJbE0sSUFBSSxHQUFHLElBQUk7UUFDZixJQUFJdUwsSUFBSSxDQUFDaEksTUFBTSxHQUFHLENBQUMsRUFBRTtVQUNuQixPQUFPO1lBQUVnWCxTQUFTLEVBQUV2YSxJQUFJLENBQUNzcUI7VUFBVyxDQUFDO1FBQ3ZDLENBQUMsTUFBTTtVQUNMaGMsS0FBSyxDQUNIa2hCLFVBQVUsRUFDVnJkLEtBQUssQ0FBQ3NkLFFBQVEsQ0FDWnRkLEtBQUssQ0FBQzZCLGVBQWUsQ0FBQztZQUNwQi9OLFVBQVUsRUFBRWtNLEtBQUssQ0FBQ3NkLFFBQVEsQ0FBQ3RkLEtBQUssQ0FBQytCLEtBQUssQ0FBQ3pVLE1BQU0sRUFBRW1MLFNBQVMsQ0FBQyxDQUFDO1lBQzFEMUUsSUFBSSxFQUFFaU0sS0FBSyxDQUFDc2QsUUFBUSxDQUNsQnRkLEtBQUssQ0FBQytCLEtBQUssQ0FBQ3pVLE1BQU0sRUFBRStMLEtBQUssRUFBRXlJLFFBQVEsRUFBRXJKLFNBQVMsQ0FDaEQsQ0FBQztZQUNEcUksS0FBSyxFQUFFZCxLQUFLLENBQUNzZCxRQUFRLENBQUN0ZCxLQUFLLENBQUMrQixLQUFLLENBQUN3YixNQUFNLEVBQUU5a0IsU0FBUyxDQUFDLENBQUM7WUFDckRnUixJQUFJLEVBQUV6SixLQUFLLENBQUNzZCxRQUFRLENBQUN0ZCxLQUFLLENBQUMrQixLQUFLLENBQUN3YixNQUFNLEVBQUU5a0IsU0FBUyxDQUFDO1VBQ3JELENBQUMsQ0FDSCxDQUNGLENBQUM7VUFFRCxPQUFBMFQsYUFBQTtZQUNFL0QsU0FBUyxFQUFFdmEsSUFBSSxDQUFDc3FCO1VBQVUsR0FDdkJrRixVQUFVO1FBRWpCO01BQ0Y7SUFDRixDQUFDLENBQUM7SUFFRi92QixNQUFNLENBQUNDLE1BQU0sQ0FBQ3FkLEtBQUssQ0FBQ3FCLFVBQVUsRUFBRTtNQUM5QixNQUFNd04sY0FBY0EsQ0FBQzNSLE1BQU0sRUFBRTRSLEdBQUcsRUFBRTNzQixVQUFVLEVBQUU7UUFDNUMsSUFBSXVvQixhQUFhLEdBQUcsTUFBTXhOLE1BQU0sQ0FBQ2lTLGNBQWMsQ0FDM0M7VUFDRWxXLEtBQUssRUFBRSxTQUFBQSxDQUFTeFcsRUFBRSxFQUFFZ08sTUFBTSxFQUFFO1lBQzFCcWUsR0FBRyxDQUFDN1YsS0FBSyxDQUFDOVcsVUFBVSxFQUFFTSxFQUFFLEVBQUVnTyxNQUFNLENBQUM7VUFDbkMsQ0FBQztVQUNEMkosT0FBTyxFQUFFLFNBQUFBLENBQVMzWCxFQUFFLEVBQUVnTyxNQUFNLEVBQUU7WUFDNUJxZSxHQUFHLENBQUMxVSxPQUFPLENBQUNqWSxVQUFVLEVBQUVNLEVBQUUsRUFBRWdPLE1BQU0sQ0FBQztVQUNyQyxDQUFDO1VBQ0QrSSxPQUFPLEVBQUUsU0FBQUEsQ0FBUy9XLEVBQUUsRUFBRTtZQUNwQnFzQixHQUFHLENBQUN0VixPQUFPLENBQUNyWCxVQUFVLEVBQUVNLEVBQUUsQ0FBQztVQUM3QjtRQUNGLENBQUM7UUFDRDtRQUNBO1FBQ0E7VUFBRXNOLG9CQUFvQixFQUFFO1FBQUssQ0FDakMsQ0FBQzs7UUFFRDtRQUNBOztRQUVBO1FBQ0ErZSxHQUFHLENBQUMxaEIsTUFBTSxDQUFDLGtCQUFpQjtVQUMxQixPQUFPLE1BQU1zZCxhQUFhLENBQUM1b0IsSUFBSSxDQUFDLENBQUM7UUFDbkMsQ0FBQyxDQUFDOztRQUVGO1FBQ0EsT0FBTzRvQixhQUFhO01BQ3RCLENBQUM7TUFFRDtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0FwSixnQkFBZ0JBLENBQUM5ZSxRQUFRLEVBQXVCO1FBQUEsSUFBckI7VUFBRW93QjtRQUFXLENBQUMsR0FBQXJrQixTQUFBLENBQUEvSCxNQUFBLFFBQUErSCxTQUFBLFFBQUFWLFNBQUEsR0FBQVUsU0FBQSxNQUFHLENBQUMsQ0FBQztRQUM1QztRQUNBLElBQUlqTSxlQUFlLENBQUN1d0IsYUFBYSxDQUFDcndCLFFBQVEsQ0FBQyxFQUFFQSxRQUFRLEdBQUc7VUFBRXlKLEdBQUcsRUFBRXpKO1FBQVMsQ0FBQztRQUV6RSxJQUFJaU0sS0FBSyxDQUFDc1IsT0FBTyxDQUFDdmQsUUFBUSxDQUFDLEVBQUU7VUFDM0I7VUFDQTtVQUNBLE1BQU0sSUFBSWlFLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQztRQUN0RDtRQUVBLElBQUksQ0FBQ2pFLFFBQVEsSUFBSyxLQUFLLElBQUlBLFFBQVEsSUFBSSxDQUFDQSxRQUFRLENBQUN5SixHQUFJLEVBQUU7VUFDckQ7VUFDQSxPQUFPO1lBQUVBLEdBQUcsRUFBRTJtQixVQUFVLElBQUlFLE1BQU0sQ0FBQ3J3QixFQUFFLENBQUM7VUFBRSxDQUFDO1FBQzNDO1FBRUEsT0FBT0QsUUFBUTtNQUNqQjtJQUNGLENBQUMsQ0FBQztJQUVGRSxNQUFNLENBQUNDLE1BQU0sQ0FBQ3FkLEtBQUssQ0FBQ3FCLFVBQVUsQ0FBQ2pnQixTQUFTLEVBQUVzd0Isa0JBQWtCLEVBQUVULFdBQVcsRUFBRUQsWUFBWSxFQUFFRSxZQUFZLENBQUM7SUFFdEd4dUIsTUFBTSxDQUFDQyxNQUFNLENBQUNxZCxLQUFLLENBQUNxQixVQUFVLENBQUNqZ0IsU0FBUyxFQUFFO01BQ3hDO01BQ0E7TUFDQTJ4QixtQkFBbUJBLENBQUEsRUFBRztRQUNwQjtRQUNBLE9BQU8sSUFBSSxDQUFDZixXQUFXLElBQUksSUFBSSxDQUFDQSxXQUFXLEtBQUtqeEIsTUFBTSxDQUFDaXlCLE1BQU07TUFDL0QsQ0FBQztNQUVELE1BQU16TixtQkFBbUJBLENBQUEsRUFBRztRQUMxQixJQUFJdGlCLElBQUksR0FBRyxJQUFJO1FBQ2YsSUFBSSxDQUFDQSxJQUFJLENBQUNpdkIsV0FBVyxDQUFDM00sbUJBQW1CLEVBQ3ZDLE1BQU0sSUFBSTllLEtBQUssQ0FBQyx5REFBeUQsQ0FBQztRQUM3RSxNQUFNeEQsSUFBSSxDQUFDaXZCLFdBQVcsQ0FBQzNNLG1CQUFtQixDQUFDLENBQUM7TUFDN0MsQ0FBQztNQUVELE1BQU12QiwyQkFBMkJBLENBQUNDLFFBQVEsRUFBRUMsWUFBWSxFQUFFO1FBQ3hELElBQUlqaEIsSUFBSSxHQUFHLElBQUk7UUFDZixJQUFJLEVBQUUsTUFBTUEsSUFBSSxDQUFDaXZCLFdBQVcsQ0FBQ2xPLDJCQUEyQixHQUN0RCxNQUFNLElBQUl2ZCxLQUFLLENBQ2IsaUVBQ0YsQ0FBQztRQUNILE1BQU14RCxJQUFJLENBQUNpdkIsV0FBVyxDQUFDbE8sMkJBQTJCLENBQUNDLFFBQVEsRUFBRUMsWUFBWSxDQUFDO01BQzVFLENBQUM7TUFFRDtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7TUFDRUgsYUFBYUEsQ0FBQSxFQUFHO1FBQ2QsSUFBSTlnQixJQUFJLEdBQUcsSUFBSTtRQUNmLElBQUksQ0FBQ0EsSUFBSSxDQUFDaXZCLFdBQVcsQ0FBQ25PLGFBQWEsRUFBRTtVQUNuQyxNQUFNLElBQUl0ZCxLQUFLLENBQUMsbURBQW1ELENBQUM7UUFDdEU7UUFDQSxPQUFPeEQsSUFBSSxDQUFDaXZCLFdBQVcsQ0FBQ25PLGFBQWEsQ0FBQyxDQUFDO01BQ3pDLENBQUM7TUFFRDtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7TUFDRWtQLFdBQVdBLENBQUEsRUFBRztRQUNaLElBQUlod0IsSUFBSSxHQUFHLElBQUk7UUFDZixJQUFJLEVBQUVBLElBQUksQ0FBQ2d2QixPQUFPLENBQUM3ckIsS0FBSyxJQUFJbkQsSUFBSSxDQUFDZ3ZCLE9BQU8sQ0FBQzdyQixLQUFLLENBQUN3RSxFQUFFLENBQUMsRUFBRTtVQUNsRCxNQUFNLElBQUluRSxLQUFLLENBQUMsaURBQWlELENBQUM7UUFDcEU7UUFDQSxPQUFPeEQsSUFBSSxDQUFDZ3ZCLE9BQU8sQ0FBQzdyQixLQUFLLENBQUN3RSxFQUFFO01BQzlCO0lBQ0YsQ0FBQyxDQUFDO0lBRUZsSSxNQUFNLENBQUNDLE1BQU0sQ0FBQ3FkLEtBQUssRUFBRTtNQUNuQjtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO01BQ0VrVCxhQUFhQSxDQUFDMVcsSUFBSSxFQUFFO1FBQ2xCLE9BQU8sSUFBSSxDQUFDOFYsWUFBWSxDQUFDM3hCLEdBQUcsQ0FBQzZiLElBQUksQ0FBQztNQUNwQyxDQUFDO01BRUQ7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO01BQ0U4VixZQUFZLEVBQUUsSUFBSWpoQixHQUFHLENBQUM7SUFDeEIsQ0FBQyxDQUFDOztJQUlGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtJQUNBMk8sS0FBSyxDQUFDQyxRQUFRLEdBQUdrVCxPQUFPLENBQUNsVCxRQUFROztJQUVqQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0lBQ0FELEtBQUssQ0FBQzNLLE1BQU0sR0FBRy9TLGVBQWUsQ0FBQytTLE1BQU07O0lBRXJDO0FBQ0E7QUFDQTtJQUNBMkssS0FBSyxDQUFDcUIsVUFBVSxDQUFDaE0sTUFBTSxHQUFHMkssS0FBSyxDQUFDM0ssTUFBTTs7SUFFdEM7QUFDQTtBQUNBO0lBQ0EySyxLQUFLLENBQUNxQixVQUFVLENBQUNwQixRQUFRLEdBQUdELEtBQUssQ0FBQ0MsUUFBUTs7SUFFMUM7QUFDQTtBQUNBO0lBQ0FsZixNQUFNLENBQUNzZ0IsVUFBVSxHQUFHckIsS0FBSyxDQUFDcUIsVUFBVTs7SUFHcEM7SUFDQTNlLE1BQU0sQ0FBQ0MsTUFBTSxDQUFDcWQsS0FBSyxDQUFDcUIsVUFBVSxDQUFDamdCLFNBQVMsRUFBRWd5QixTQUFTLENBQUNDLG1CQUFtQixDQUFDO0lBQUN0d0Isc0JBQUE7RUFBQSxTQUFBQyxXQUFBO0lBQUEsT0FBQUQsc0JBQUEsQ0FBQUMsV0FBQTtFQUFBO0VBQUFELHNCQUFBO0FBQUE7RUFBQUUsSUFBQTtFQUFBQyxLQUFBO0FBQUEsRzs7Ozs7Ozs7Ozs7Ozs7SUM1UXpFLElBQUlxZSxhQUFhO0lBQUMvZ0IsTUFBTSxDQUFDYixJQUFJLENBQUMsc0NBQXNDLEVBQUM7TUFBQzJELE9BQU9BLENBQUMxRCxDQUFDLEVBQUM7UUFBQzJoQixhQUFhLEdBQUMzaEIsQ0FBQztNQUFBO0lBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztJQUFDLElBQUlJLG9CQUFvQixDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU1BLG9CQUFvQixDQUFDLENBQUMsRUFBRSxDQUFDO0lBQWxLUSxNQUFNLENBQUNqQixNQUFNLENBQUM7TUFBQzR4QixhQUFhLEVBQUNBLENBQUEsS0FBSUEsYUFBYTtNQUFDRyxlQUFlLEVBQUNBLENBQUEsS0FBSUEsZUFBZTtNQUFDQyxXQUFXLEVBQUNBLENBQUEsS0FBSUEsV0FBVztNQUFDRixnQkFBZ0IsRUFBQ0EsQ0FBQSxLQUFJQSxnQkFBZ0I7TUFBQ0csb0JBQW9CLEVBQUNBLENBQUEsS0FBSUEsb0JBQW9CO01BQUNDLHNCQUFzQixFQUFDQSxDQUFBLEtBQUlBLHNCQUFzQjtNQUFDTCxnQkFBZ0IsRUFBQ0EsQ0FBQSxLQUFJQTtJQUFnQixDQUFDLENBQUM7SUFBclIsTUFBTUQsYUFBYSxHQUFHO01BQzNCbUMsS0FBS0EsQ0FBQzlXLElBQUksRUFBRTtRQUNWLE9BQU8sWUFBVztVQUNoQixNQUFNK1csR0FBRyxHQUFHL1csSUFBSSxHQUFHZ1gsR0FBRyxDQUFDQyxZQUFZLENBQUMsY0FBYyxHQUFHalgsSUFBSSxDQUFDLEdBQUdzVyxNQUFNLENBQUNZLFFBQVE7VUFDNUUsT0FBTyxJQUFJMVQsS0FBSyxDQUFDQyxRQUFRLENBQUNzVCxHQUFHLENBQUNJLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM5QyxDQUFDO01BQ0gsQ0FBQztNQUNEQyxNQUFNQSxDQUFDcFgsSUFBSSxFQUFFO1FBQ1gsT0FBTyxZQUFXO1VBQ2hCLE1BQU0rVyxHQUFHLEdBQUcvVyxJQUFJLEdBQUdnWCxHQUFHLENBQUNDLFlBQVksQ0FBQyxjQUFjLEdBQUdqWCxJQUFJLENBQUMsR0FBR3NXLE1BQU0sQ0FBQ1ksUUFBUTtVQUM1RSxPQUFPSCxHQUFHLENBQUM5d0IsRUFBRSxDQUFDLENBQUM7UUFDakIsQ0FBQztNQUNIO0lBQ0YsQ0FBQztJQUVNLFNBQVM2dUIsZUFBZUEsQ0FBQzlVLElBQUksRUFBRXJOLE9BQU8sRUFBRTtNQUM3QyxJQUFJLENBQUNxTixJQUFJLElBQUlyTixPQUFPLENBQUMwa0IsVUFBVSxLQUFLLElBQUksRUFBRSxPQUFPLElBQUk7TUFDckQsSUFBSTFrQixPQUFPLENBQUMwa0IsVUFBVSxFQUFFLE9BQU8xa0IsT0FBTyxDQUFDMGtCLFVBQVU7TUFDakQsT0FBTzl5QixNQUFNLENBQUNrcUIsUUFBUSxHQUFHbHFCLE1BQU0sQ0FBQzh5QixVQUFVLEdBQUc5eUIsTUFBTSxDQUFDaXlCLE1BQU07SUFDNUQ7SUFFTyxTQUFTekIsV0FBV0EsQ0FBQy9VLElBQUksRUFBRXFYLFVBQVUsRUFBRTFrQixPQUFPLEVBQUU7TUFDckQsSUFBSUEsT0FBTyxDQUFDOGlCLE9BQU8sRUFBRSxPQUFPOWlCLE9BQU8sQ0FBQzhpQixPQUFPO01BRTNDLElBQUl6VixJQUFJLElBQ05xWCxVQUFVLEtBQUs5eUIsTUFBTSxDQUFDaXlCLE1BQU0sSUFDNUIsT0FBTy95QixjQUFjLEtBQUssV0FBVyxJQUNyQ0EsY0FBYyxDQUFDd3dCLDZCQUE2QixFQUFFO1FBQzlDLE9BQU94d0IsY0FBYyxDQUFDd3dCLDZCQUE2QixDQUFDLENBQUM7TUFDdkQ7TUFFQSxNQUFNO1FBQUVmO01BQXNCLENBQUMsR0FBR3BsQixPQUFPLENBQUMsK0JBQStCLENBQUM7TUFDMUUsT0FBT29sQixxQkFBcUI7SUFDOUI7SUFFTyxTQUFTMkIsZ0JBQWdCQSxDQUFDbHZCLFVBQVUsRUFBRXFhLElBQUksRUFBRXJOLE9BQU8sRUFBRTtNQUMxRCxJQUFJckIsT0FBTyxDQUFDZ21CLFdBQVcsSUFDckIsQ0FBQzNrQixPQUFPLENBQUM0a0IsbUJBQW1CLElBQzVCNXhCLFVBQVUsQ0FBQzZ2QixXQUFXLElBQ3RCN3ZCLFVBQVUsQ0FBQzZ2QixXQUFXLENBQUNnQyxPQUFPLEVBQUU7UUFDaEM3eEIsVUFBVSxDQUFDNnZCLFdBQVcsQ0FBQ2dDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTTd4QixVQUFVLENBQUNtbEIsSUFBSSxDQUFDLENBQUMsRUFBRTtVQUM1RDJNLE9BQU8sRUFBRTtRQUNYLENBQUMsQ0FBQztNQUNKO0lBQ0Y7SUFFTyxTQUFTekMsb0JBQW9CQSxDQUFDcnZCLFVBQVUsRUFBRXFhLElBQUksRUFBRXJOLE9BQU8sRUFBRTtNQUM5RCxJQUFJQSxPQUFPLENBQUMra0IscUJBQXFCLEtBQUssS0FBSyxFQUFFO01BRTdDLElBQUk7UUFDRi94QixVQUFVLENBQUNneUIsc0JBQXNCLENBQUM7VUFDaENDLFdBQVcsRUFBRWpsQixPQUFPLENBQUNrbEIsc0JBQXNCLEtBQUs7UUFDbEQsQ0FBQyxDQUFDO01BQ0osQ0FBQyxDQUFDLE9BQU9wcUIsS0FBSyxFQUFFO1FBQ2QsSUFBSUEsS0FBSyxDQUFDNEssT0FBTyx5QkFBQTlNLE1BQUEsQ0FBeUJ5VSxJQUFJLHFDQUFrQyxFQUFFO1VBQ2hGLE1BQU0sSUFBSS9WLEtBQUssMENBQUFzQixNQUFBLENBQXlDeVUsSUFBSSxPQUFHLENBQUM7UUFDbEU7UUFDQSxNQUFNdlMsS0FBSztNQUNiO0lBQ0Y7SUFFTyxTQUFTd25CLHNCQUFzQkEsQ0FBQ2pWLElBQUksRUFBRTtNQUMzQyxJQUFJLENBQUNBLElBQUksSUFBSUEsSUFBSSxLQUFLLElBQUksRUFBRTtRQUMxQnpiLE1BQU0sQ0FBQzBILE1BQU0sQ0FDWCx5REFBeUQsR0FDekQseURBQXlELEdBQ3pELGdEQUNGLENBQUM7UUFDRCtULElBQUksR0FBRyxJQUFJO01BQ2I7TUFFQSxJQUFJQSxJQUFJLEtBQUssSUFBSSxJQUFJLE9BQU9BLElBQUksS0FBSyxRQUFRLEVBQUU7UUFDN0MsTUFBTSxJQUFJL1YsS0FBSyxDQUNiLGlFQUNGLENBQUM7TUFDSDtNQUVBLE9BQU8rVixJQUFJO0lBQ2I7SUFFTyxTQUFTNFUsZ0JBQWdCQSxDQUFDamlCLE9BQU8sRUFBRTtNQUN4QyxJQUFJQSxPQUFPLElBQUlBLE9BQU8sQ0FBQ21sQixPQUFPLEVBQUU7UUFDOUI7UUFDQW5sQixPQUFPLEdBQUc7VUFBRTBrQixVQUFVLEVBQUUxa0I7UUFBUSxDQUFDO01BQ25DO01BQ0E7TUFDQSxJQUFJQSxPQUFPLElBQUlBLE9BQU8sQ0FBQ29sQixPQUFPLElBQUksQ0FBQ3BsQixPQUFPLENBQUMwa0IsVUFBVSxFQUFFO1FBQ3JEMWtCLE9BQU8sQ0FBQzBrQixVQUFVLEdBQUcxa0IsT0FBTyxDQUFDb2xCLE9BQU87TUFDdEM7TUFFQSxNQUFNQyxjQUFjLEdBQUc5eEIsTUFBTSxDQUFDK3hCLFdBQVcsQ0FDdkMveEIsTUFBTSxDQUFDd2MsT0FBTyxDQUFDL1AsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM4TSxNQUFNLENBQUNoUCxJQUFBO1FBQUEsSUFBQyxDQUFDeW5CLENBQUMsRUFBRTkwQixDQUFDLENBQUMsR0FBQXFOLElBQUE7UUFBQSxPQUFLck4sQ0FBQyxLQUFLaU8sU0FBUztNQUFBLEVBQ2xFLENBQUM7O01BRUQ7TUFDQSxPQUFBMFQsYUFBQTtRQUNFc1MsVUFBVSxFQUFFaG1CLFNBQVM7UUFDckJpa0IsWUFBWSxFQUFFLFFBQVE7UUFDdEJ0VSxTQUFTLEVBQUUsSUFBSTtRQUNmeVUsT0FBTyxFQUFFcGtCLFNBQVM7UUFDbEJrbUIsbUJBQW1CLEVBQUU7TUFBSyxHQUN2QlMsY0FBYztJQUVyQjtJQUFDenhCLHNCQUFBO0VBQUEsU0FBQUMsV0FBQTtJQUFBLE9BQUFELHNCQUFBLENBQUFDLFdBQUE7RUFBQTtFQUFBRCxzQkFBQTtBQUFBO0VBQUFFLElBQUE7RUFBQUMsS0FBQTtBQUFBLEc7Ozs7Ozs7Ozs7Ozs7O0lDdkdELElBQUlxZSxhQUFhO0lBQUMvZ0IsTUFBTSxDQUFDYixJQUFJLENBQUMsc0NBQXNDLEVBQUM7TUFBQzJELE9BQU9BLENBQUMxRCxDQUFDLEVBQUM7UUFBQzJoQixhQUFhLEdBQUMzaEIsQ0FBQztNQUFBO0lBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztJQUFDLElBQUlJLG9CQUFvQixDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU1BLG9CQUFvQixDQUFDLENBQUMsRUFBRSxDQUFDO0lBQWxLUSxNQUFNLENBQUNqQixNQUFNLENBQUM7TUFBQ3l4QixZQUFZLEVBQUNBLENBQUEsS0FBSUE7SUFBWSxDQUFDLENBQUM7SUFBdkMsTUFBTUEsWUFBWSxHQUFHO01BQzFCO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO01BQ0UvbkIsWUFBWUEsQ0FBQSxFQUFVO1FBQUEsU0FBQXFGLElBQUEsR0FBQUMsU0FBQSxDQUFBL0gsTUFBQSxFQUFOZ0ksSUFBSSxPQUFBQyxLQUFBLENBQUFILElBQUEsR0FBQUksSUFBQSxNQUFBQSxJQUFBLEdBQUFKLElBQUEsRUFBQUksSUFBQTtVQUFKRixJQUFJLENBQUFFLElBQUEsSUFBQUgsU0FBQSxDQUFBRyxJQUFBO1FBQUE7UUFDbEIsT0FBTyxJQUFJLENBQUN3akIsV0FBVyxDQUFDanBCLFlBQVksQ0FDbEMsSUFBSSxDQUFDc3BCLGdCQUFnQixDQUFDL2pCLElBQUksQ0FBQyxFQUMzQixJQUFJLENBQUNna0IsZUFBZSxDQUFDaGtCLElBQUksQ0FDM0IsQ0FBQztNQUNILENBQUM7TUFFRG1tQixZQUFZQSxDQUFDdnBCLEdBQUcsRUFBZ0I7UUFBQSxJQUFkK0QsT0FBTyxHQUFBWixTQUFBLENBQUEvSCxNQUFBLFFBQUErSCxTQUFBLFFBQUFWLFNBQUEsR0FBQVUsU0FBQSxNQUFHLENBQUMsQ0FBQztRQUM1QjtRQUNBLElBQUksQ0FBQ25ELEdBQUcsRUFBRTtVQUNSLE1BQU0sSUFBSTNFLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQztRQUNoRDs7UUFFQTtRQUNBMkUsR0FBRyxHQUFHMUksTUFBTSxDQUFDa3RCLE1BQU0sQ0FDakJsdEIsTUFBTSxDQUFDa3lCLGNBQWMsQ0FBQ3hwQixHQUFHLENBQUMsRUFDMUIxSSxNQUFNLENBQUNteUIseUJBQXlCLENBQUN6cEIsR0FBRyxDQUN0QyxDQUFDO1FBRUQsSUFBSSxLQUFLLElBQUlBLEdBQUcsRUFBRTtVQUNoQixJQUNFLENBQUNBLEdBQUcsQ0FBQ2EsR0FBRyxJQUNSLEVBQUUsT0FBT2IsR0FBRyxDQUFDYSxHQUFHLEtBQUssUUFBUSxJQUFJYixHQUFHLENBQUNhLEdBQUcsWUFBWStULEtBQUssQ0FBQ0MsUUFBUSxDQUFDLEVBQ25FO1lBQ0EsTUFBTSxJQUFJeFosS0FBSyxDQUNiLDBFQUNGLENBQUM7VUFDSDtRQUNGLENBQUMsTUFBTTtVQUNMLElBQUlxdUIsVUFBVSxHQUFHLElBQUk7O1VBRXJCO1VBQ0E7VUFDQTtVQUNBLElBQUksSUFBSSxDQUFDL0IsbUJBQW1CLENBQUMsQ0FBQyxFQUFFO1lBQzlCLE1BQU1nQyxTQUFTLEdBQUd2QixHQUFHLENBQUN3Qix3QkFBd0IsQ0FBQ3IwQixHQUFHLENBQUMsQ0FBQztZQUNwRCxJQUFJLENBQUNvMEIsU0FBUyxFQUFFO2NBQ2RELFVBQVUsR0FBRyxLQUFLO1lBQ3BCO1VBQ0Y7VUFFQSxJQUFJQSxVQUFVLEVBQUU7WUFDZDFwQixHQUFHLENBQUNhLEdBQUcsR0FBRyxJQUFJLENBQUM0bEIsVUFBVSxDQUFDLENBQUM7VUFDN0I7UUFDRjs7UUFFQTtRQUNBO1FBQ0EsSUFBSW9ELHFDQUFxQyxHQUFHLFNBQUFBLENBQVNubEIsTUFBTSxFQUFFO1VBQzNELElBQUkvTyxNQUFNLENBQUNrUCxVQUFVLENBQUNILE1BQU0sQ0FBQyxFQUFFLE9BQU9BLE1BQU07VUFFNUMsSUFBSTFFLEdBQUcsQ0FBQ2EsR0FBRyxFQUFFO1lBQ1gsT0FBT2IsR0FBRyxDQUFDYSxHQUFHO1VBQ2hCOztVQUVBO1VBQ0E7VUFDQTtVQUNBYixHQUFHLENBQUNhLEdBQUcsR0FBRzZELE1BQU07VUFFaEIsT0FBT0EsTUFBTTtRQUNmLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQ2lqQixtQkFBbUIsQ0FBQyxDQUFDLEVBQUU7VUFDOUIsTUFBTXJpQixPQUFPLEdBQUcsSUFBSSxDQUFDd2tCLHVCQUF1QixDQUFDLGFBQWEsRUFBRSxDQUFDOXBCLEdBQUcsQ0FBQyxFQUFFK0QsT0FBTyxDQUFDO1VBQzNFdUIsT0FBTyxDQUFDeEMsSUFBSSxDQUFDK21CLHFDQUFxQyxDQUFDO1VBQ25EdmtCLE9BQU8sQ0FBQ3lrQixXQUFXLEdBQUd6a0IsT0FBTyxDQUFDeWtCLFdBQVcsQ0FBQ2puQixJQUFJLENBQUMrbUIscUNBQXFDLENBQUM7VUFDckZ2a0IsT0FBTyxDQUFDMGtCLGFBQWEsR0FBRzFrQixPQUFPLENBQUMwa0IsYUFBYSxDQUFDbG5CLElBQUksQ0FBQyttQixxQ0FBcUMsQ0FBQztVQUN6RixPQUFPdmtCLE9BQU87UUFDaEI7O1FBRUE7UUFDQTtRQUNBLE9BQU8sSUFBSSxDQUFDd2hCLFdBQVcsQ0FBQzNOLFdBQVcsQ0FBQ25aLEdBQUcsQ0FBQyxDQUNyQzhDLElBQUksQ0FBQyttQixxQ0FBcUMsQ0FBQztNQUNoRCxDQUFDO01BRUQ7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtNQUNFMVEsV0FBV0EsQ0FBQ25aLEdBQUcsRUFBRStELE9BQU8sRUFBRTtRQUN4QixPQUFPLElBQUksQ0FBQ3dsQixZQUFZLENBQUN2cEIsR0FBRyxFQUFFK0QsT0FBTyxDQUFDO01BQ3hDLENBQUM7TUFHRDtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtNQUNFdVcsV0FBV0EsQ0FBQ2xqQixRQUFRLEVBQUV5YyxRQUFRLEVBQXlCO1FBRXJEO1FBQ0E7UUFDQSxNQUFNOVAsT0FBTyxHQUFBb1MsYUFBQSxLQUFTLENBQUFoVCxTQUFBLENBQUEvSCxNQUFBLFFBQUFxSCxTQUFBLEdBQUFVLFNBQUEsUUFBeUIsSUFBSSxDQUFHO1FBQ3RELElBQUl3VyxVQUFVO1FBQ2QsSUFBSTVWLE9BQU8sSUFBSUEsT0FBTyxDQUFDMlcsTUFBTSxFQUFFO1VBQzdCO1VBQ0EsSUFBSTNXLE9BQU8sQ0FBQzRWLFVBQVUsRUFBRTtZQUN0QixJQUNFLEVBQ0UsT0FBTzVWLE9BQU8sQ0FBQzRWLFVBQVUsS0FBSyxRQUFRLElBQ3RDNVYsT0FBTyxDQUFDNFYsVUFBVSxZQUFZL0UsS0FBSyxDQUFDQyxRQUFRLENBQzdDLEVBRUQsTUFBTSxJQUFJeFosS0FBSyxDQUFDLHVDQUF1QyxDQUFDO1lBQzFEc2UsVUFBVSxHQUFHNVYsT0FBTyxDQUFDNFYsVUFBVTtVQUNqQyxDQUFDLE1BQU0sSUFBSSxDQUFDdmlCLFFBQVEsSUFBSSxDQUFDQSxRQUFRLENBQUN5SixHQUFHLEVBQUU7WUFDckM4WSxVQUFVLEdBQUcsSUFBSSxDQUFDOE0sVUFBVSxDQUFDLENBQUM7WUFDOUIxaUIsT0FBTyxDQUFDcVgsV0FBVyxHQUFHLElBQUk7WUFDMUJyWCxPQUFPLENBQUM0VixVQUFVLEdBQUdBLFVBQVU7VUFDakM7UUFDRjtRQUVBdmlCLFFBQVEsR0FBR3dkLEtBQUssQ0FBQ3FCLFVBQVUsQ0FBQ0MsZ0JBQWdCLENBQUM5ZSxRQUFRLEVBQUU7VUFDckRvd0IsVUFBVSxFQUFFN047UUFDZCxDQUFDLENBQUM7UUFFRixJQUFJLElBQUksQ0FBQ2dPLG1CQUFtQixDQUFDLENBQUMsRUFBRTtVQUM5QixNQUFNdmtCLElBQUksR0FBRyxDQUFDaE0sUUFBUSxFQUFFeWMsUUFBUSxFQUFFOVAsT0FBTyxDQUFDO1VBRTFDLE9BQU8sSUFBSSxDQUFDK2xCLHVCQUF1QixDQUFDLGFBQWEsRUFBRTFtQixJQUFJLEVBQUVXLE9BQU8sQ0FBQztRQUNuRTs7UUFFQTtRQUNBO1FBQ0E7UUFDQTtRQUNBOztRQUVBLE9BQU8sSUFBSSxDQUFDK2lCLFdBQVcsQ0FBQ3hNLFdBQVcsQ0FDakNsakIsUUFBUSxFQUNSeWMsUUFBUSxFQUNSOVAsT0FDRixDQUFDO01BQ0gsQ0FBQztNQUVEO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7TUFDRStWLFdBQVdBLENBQUMxaUIsUUFBUSxFQUFnQjtRQUFBLElBQWQyTSxPQUFPLEdBQUFaLFNBQUEsQ0FBQS9ILE1BQUEsUUFBQStILFNBQUEsUUFBQVYsU0FBQSxHQUFBVSxTQUFBLE1BQUcsQ0FBQyxDQUFDO1FBQ2hDL0wsUUFBUSxHQUFHd2QsS0FBSyxDQUFDcUIsVUFBVSxDQUFDQyxnQkFBZ0IsQ0FBQzllLFFBQVEsQ0FBQztRQUV0RCxJQUFJLElBQUksQ0FBQ3V3QixtQkFBbUIsQ0FBQyxDQUFDLEVBQUU7VUFDOUIsT0FBTyxJQUFJLENBQUNtQyx1QkFBdUIsQ0FBQyxhQUFhLEVBQUUsQ0FBQzF5QixRQUFRLENBQUMsRUFBRTJNLE9BQU8sQ0FBQztRQUN6RTs7UUFFQTtRQUNBO1FBQ0EsT0FBTyxJQUFJLENBQUMraUIsV0FBVyxDQUFDaE4sV0FBVyxDQUFDMWlCLFFBQVEsQ0FBQztNQUMvQyxDQUFDO01BRUQ7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtNQUNFLE1BQU02a0IsV0FBV0EsQ0FBQzdrQixRQUFRLEVBQUV5YyxRQUFRLEVBQUU5UCxPQUFPLEVBQUU7UUFDN0MsT0FBTyxJQUFJLENBQUN1VyxXQUFXLENBQ3JCbGpCLFFBQVEsRUFDUnljLFFBQVEsRUFBQXNDLGFBQUEsQ0FBQUEsYUFBQSxLQUVIcFMsT0FBTztVQUNWdVgsYUFBYSxFQUFFLElBQUk7VUFDbkJaLE1BQU0sRUFBRTtRQUFJLEVBQ2IsQ0FBQztNQUNOLENBQUM7TUFFRDtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtNQUNFNEIsY0FBY0EsQ0FBQSxFQUFVO1FBQ3RCLE9BQU8sSUFBSSxDQUFDd0ssV0FBVyxDQUFDeEssY0FBYyxDQUFDLEdBQUFuWixTQUFPLENBQUM7TUFDakQsQ0FBQztNQUVEO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtNQUNFcVosc0JBQXNCQSxDQUFBLEVBQVU7UUFDOUIsT0FBTyxJQUFJLENBQUNzSyxXQUFXLENBQUN0SyxzQkFBc0IsQ0FBQyxHQUFBclosU0FBTyxDQUFDO01BQ3pEO0lBQ0YsQ0FBQztJQUFBeEwsc0JBQUE7RUFBQSxTQUFBQyxXQUFBO0lBQUEsT0FBQUQsc0JBQUEsQ0FBQUMsV0FBQTtFQUFBO0VBQUFELHNCQUFBO0FBQUE7RUFBQUUsSUFBQTtFQUFBQyxLQUFBO0FBQUEsRzs7Ozs7Ozs7Ozs7Ozs7SUMzT0QxQyxNQUFNLENBQUNqQixNQUFNLENBQUM7TUFBQzJ4QixZQUFZLEVBQUNBLENBQUEsS0FBSUE7SUFBWSxDQUFDLENBQUM7SUFBQyxJQUFJbUUsR0FBRztJQUFDNzBCLE1BQU0sQ0FBQ2IsSUFBSSxDQUFDLGdCQUFnQixFQUFDO01BQUMwMUIsR0FBR0EsQ0FBQ3oxQixDQUFDLEVBQUM7UUFBQ3kxQixHQUFHLEdBQUN6MUIsQ0FBQztNQUFBO0lBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztJQUFDLElBQUlJLG9CQUFvQixDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU1BLG9CQUFvQixDQUFDLENBQUMsRUFBRSxDQUFDO0lBRTVKLE1BQU1reEIsWUFBWSxHQUFHO01BQzFCO01BQ0E7TUFDQTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtNQUNFLE1BQU1uSixnQkFBZ0JBLENBQUNQLEtBQUssRUFBRXJZLE9BQU8sRUFBRTtRQUNyQyxJQUFJbE0sSUFBSSxHQUFHLElBQUk7UUFDZixJQUFJLENBQUNBLElBQUksQ0FBQ2l2QixXQUFXLENBQUNuSyxnQkFBZ0IsSUFBSSxDQUFDOWtCLElBQUksQ0FBQ2l2QixXQUFXLENBQUMzSyxnQkFBZ0IsRUFDMUUsTUFBTSxJQUFJOWdCLEtBQUssQ0FBQyxzREFBc0QsQ0FBQztRQUN6RSxJQUFJeEQsSUFBSSxDQUFDaXZCLFdBQVcsQ0FBQzNLLGdCQUFnQixFQUFFO1VBQ3JDLE1BQU10a0IsSUFBSSxDQUFDaXZCLFdBQVcsQ0FBQzNLLGdCQUFnQixDQUFDQyxLQUFLLEVBQUVyWSxPQUFPLENBQUM7UUFDekQsQ0FBQyxNQUFNO1VBQ0xrbUIsR0FBRyxDQUFDQyxLQUFLLHVGQUFBdnRCLE1BQUEsQ0FBd0ZvSCxPQUFPLGFBQVBBLE9BQU8sZUFBUEEsT0FBTyxDQUFFcU4sSUFBSSxvQkFBQXpVLE1BQUEsQ0FBcUJvSCxPQUFPLENBQUNxTixJQUFJLGdCQUFBelUsTUFBQSxDQUFtQndCLElBQUksQ0FBQ0MsU0FBUyxDQUFDZ2UsS0FBSyxDQUFDLENBQUcsQ0FBRyxDQUFDO1VBQzlMLE1BQU12a0IsSUFBSSxDQUFDaXZCLFdBQVcsQ0FBQ25LLGdCQUFnQixDQUFDUCxLQUFLLEVBQUVyWSxPQUFPLENBQUM7UUFDekQ7TUFDRixDQUFDO01BRUQ7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO01BQ0UsTUFBTW9ZLGdCQUFnQkEsQ0FBQ0MsS0FBSyxFQUFFclksT0FBTyxFQUFFO1FBQ3JDLElBQUlsTSxJQUFJLEdBQUcsSUFBSTtRQUNmLElBQUksQ0FBQ0EsSUFBSSxDQUFDaXZCLFdBQVcsQ0FBQzNLLGdCQUFnQixFQUNwQyxNQUFNLElBQUk5Z0IsS0FBSyxDQUFDLHNEQUFzRCxDQUFDO1FBRXpFLElBQUk7VUFDRixNQUFNeEQsSUFBSSxDQUFDaXZCLFdBQVcsQ0FBQzNLLGdCQUFnQixDQUFDQyxLQUFLLEVBQUVyWSxPQUFPLENBQUM7UUFDekQsQ0FBQyxDQUFDLE9BQU85RixDQUFDLEVBQUU7VUFBQSxJQUFBbEYsZ0JBQUEsRUFBQUMscUJBQUEsRUFBQUMsc0JBQUE7VUFDVixJQUNFZ0YsQ0FBQyxDQUFDd0wsT0FBTyxDQUFDZ1csUUFBUSxDQUNoQiw4RUFDRixDQUFDLEtBQUExbUIsZ0JBQUEsR0FDRHBELE1BQU0sQ0FBQ21GLFFBQVEsY0FBQS9CLGdCQUFBLGdCQUFBQyxxQkFBQSxHQUFmRCxnQkFBQSxDQUFpQmdDLFFBQVEsY0FBQS9CLHFCQUFBLGdCQUFBQyxzQkFBQSxHQUF6QkQscUJBQUEsQ0FBMkJnQyxLQUFLLGNBQUEvQixzQkFBQSxlQUFoQ0Esc0JBQUEsQ0FBa0NreEIsNkJBQTZCLEVBQy9EO1lBQ0FGLEdBQUcsQ0FBQ0csSUFBSSxzQkFBQXp0QixNQUFBLENBQXVCeWYsS0FBSyxXQUFBemYsTUFBQSxDQUFVOUUsSUFBSSxDQUFDa3ZCLEtBQUssOEJBQTRCLENBQUM7WUFDckYsTUFBTWx2QixJQUFJLENBQUNpdkIsV0FBVyxDQUFDbEssY0FBYyxDQUFDUixLQUFLLENBQUM7WUFDNUMsTUFBTXZrQixJQUFJLENBQUNpdkIsV0FBVyxDQUFDM0ssZ0JBQWdCLENBQUNDLEtBQUssRUFBRXJZLE9BQU8sQ0FBQztVQUN6RCxDQUFDLE1BQU07WUFDTG5GLE9BQU8sQ0FBQ0MsS0FBSyxDQUFDWixDQUFDLENBQUM7WUFDaEIsTUFBTSxJQUFJdEksTUFBTSxDQUFDMEYsS0FBSyw4REFBQXNCLE1BQUEsQ0FBOEQ5RSxJQUFJLENBQUNrdkIsS0FBSyxRQUFBcHFCLE1BQUEsQ0FBT3NCLENBQUMsQ0FBQ3dMLE9BQU8sQ0FBRyxDQUFDO1VBQ3BIO1FBQ0Y7TUFDRixDQUFDO01BRUQ7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO01BQ0U0UyxXQUFXQSxDQUFDRCxLQUFLLEVBQUVyWSxPQUFPLEVBQUM7UUFDekIsT0FBTyxJQUFJLENBQUNvWSxnQkFBZ0IsQ0FBQ0MsS0FBSyxFQUFFclksT0FBTyxDQUFDO01BQzlDLENBQUM7TUFFRCxNQUFNNlksY0FBY0EsQ0FBQ1IsS0FBSyxFQUFFO1FBQzFCLElBQUl2a0IsSUFBSSxHQUFHLElBQUk7UUFDZixJQUFJLENBQUNBLElBQUksQ0FBQ2l2QixXQUFXLENBQUNsSyxjQUFjLEVBQ2xDLE1BQU0sSUFBSXZoQixLQUFLLENBQUMsb0RBQW9ELENBQUM7UUFDdkUsTUFBTXhELElBQUksQ0FBQ2l2QixXQUFXLENBQUNsSyxjQUFjLENBQUNSLEtBQUssQ0FBQztNQUM5QztJQUNGLENBQUM7SUFBQXprQixzQkFBQTtFQUFBLFNBQUFDLFdBQUE7SUFBQSxPQUFBRCxzQkFBQSxDQUFBQyxXQUFBO0VBQUE7RUFBQUQsc0JBQUE7QUFBQTtFQUFBRSxJQUFBO0VBQUFDLEtBQUE7QUFBQSxHOzs7Ozs7Ozs7Ozs7OztJQ3hGRCxJQUFJcWUsYUFBYTtJQUFDL2dCLE1BQU0sQ0FBQ2IsSUFBSSxDQUFDLHNDQUFzQyxFQUFDO01BQUMyRCxPQUFPQSxDQUFDMUQsQ0FBQyxFQUFDO1FBQUMyaEIsYUFBYSxHQUFDM2hCLENBQUM7TUFBQTtJQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7SUFBQyxJQUFJSSxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNQSxvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUFsS1EsTUFBTSxDQUFDakIsTUFBTSxDQUFDO01BQUNteUIsa0JBQWtCLEVBQUNBLENBQUEsS0FBSUE7SUFBa0IsQ0FBQyxDQUFDO0lBQW5ELE1BQU1BLGtCQUFrQixHQUFHO01BQ2hDLE1BQU1XLHNCQUFzQkEsQ0FBQzdWLElBQUksRUFBRTtRQUFBLElBQUFpWixvQkFBQSxFQUFBQyxxQkFBQTtRQUNqQyxNQUFNenlCLElBQUksR0FBRyxJQUFJO1FBQ2pCLElBQ0UsRUFDRUEsSUFBSSxDQUFDK3VCLFdBQVcsSUFDaEIvdUIsSUFBSSxDQUFDK3VCLFdBQVcsQ0FBQzJELG1CQUFtQixJQUNwQzF5QixJQUFJLENBQUMrdUIsV0FBVyxDQUFDNEQsbUJBQW1CLENBQ3JDLEVBQ0Q7VUFDQTtRQUNGO1FBR0EsTUFBTUMsa0JBQWtCLEdBQUc7VUFDekI7VUFDQTtVQUNBQyxhQUFhQSxDQUFBLEVBQUc7WUFDZDd5QixJQUFJLENBQUNpdkIsV0FBVyxDQUFDNEQsYUFBYSxDQUFDLENBQUM7VUFDbEMsQ0FBQztVQUNEQyxpQkFBaUJBLENBQUEsRUFBRztZQUNsQixPQUFPOXlCLElBQUksQ0FBQ2l2QixXQUFXLENBQUM2RCxpQkFBaUIsQ0FBQyxDQUFDO1VBQzdDLENBQUM7VUFDRDtVQUNBQyxjQUFjQSxDQUFBLEVBQUc7WUFDZixPQUFPL3lCLElBQUk7VUFDYjtRQUNGLENBQUM7UUFDRCxNQUFNZ3pCLGtCQUFrQixHQUFBMVUsYUFBQTtVQUN0QjtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBLE1BQU0yVSxXQUFXQSxDQUFDQyxTQUFTLEVBQUVDLEtBQUssRUFBRTtZQUNsQztZQUNBO1lBQ0E7WUFDQTtZQUNBO1lBQ0EsSUFBSUQsU0FBUyxHQUFHLENBQUMsSUFBSUMsS0FBSyxFQUFFbnpCLElBQUksQ0FBQ2l2QixXQUFXLENBQUNtRSxjQUFjLENBQUMsQ0FBQztZQUU3RCxJQUFJRCxLQUFLLEVBQUUsTUFBTW56QixJQUFJLENBQUNpdkIsV0FBVyxDQUFDM1ksTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1VBQzlDLENBQUM7VUFFRDtVQUNBO1VBQ0ErYyxNQUFNQSxDQUFDQyxHQUFHLEVBQUU7WUFDVixJQUFJQyxPQUFPLEdBQUdyRCxPQUFPLENBQUNzRCxPQUFPLENBQUNGLEdBQUcsQ0FBQzl6QixFQUFFLENBQUM7WUFDckMsSUFBSTJJLEdBQUcsR0FBR25JLElBQUksQ0FBQ2l2QixXQUFXLENBQUN3RSxLQUFLLENBQUMvMUIsR0FBRyxDQUFDNjFCLE9BQU8sQ0FBQzs7WUFFN0M7WUFDQTtZQUNBO1lBQ0E7O1lBRUE7WUFDQTs7WUFFQTtZQUNBO1lBQ0EsSUFBSXoxQixNQUFNLENBQUNrcUIsUUFBUSxFQUFFO2NBQ25CLElBQUlzTCxHQUFHLENBQUNBLEdBQUcsS0FBSyxPQUFPLElBQUluckIsR0FBRyxFQUFFO2dCQUM5Qm1yQixHQUFHLENBQUNBLEdBQUcsR0FBRyxTQUFTO2NBQ3JCLENBQUMsTUFBTSxJQUFJQSxHQUFHLENBQUNBLEdBQUcsS0FBSyxTQUFTLElBQUksQ0FBQ25yQixHQUFHLEVBQUU7Z0JBQ3hDO2NBQ0YsQ0FBQyxNQUFNLElBQUltckIsR0FBRyxDQUFDQSxHQUFHLEtBQUssU0FBUyxJQUFJLENBQUNuckIsR0FBRyxFQUFFO2dCQUN4Q21yQixHQUFHLENBQUNBLEdBQUcsR0FBRyxPQUFPO2dCQUNqQixNQUFNdHBCLElBQUksR0FBR3NwQixHQUFHLENBQUM5bEIsTUFBTTtnQkFDdkIsS0FBSyxJQUFJNE8sS0FBSyxJQUFJcFMsSUFBSSxFQUFFO2tCQUN0QixNQUFNbkIsS0FBSyxHQUFHbUIsSUFBSSxDQUFDb1MsS0FBSyxDQUFDO2tCQUN6QixJQUFJdlQsS0FBSyxLQUFLLEtBQUssQ0FBQyxFQUFFO29CQUNwQixPQUFPeXFCLEdBQUcsQ0FBQzlsQixNQUFNLENBQUM0TyxLQUFLLENBQUM7a0JBQzFCO2dCQUNGO2NBQ0Y7WUFDRjtZQUNBO1lBQ0E7WUFDQTtZQUNBLElBQUlrWCxHQUFHLENBQUNBLEdBQUcsS0FBSyxTQUFTLEVBQUU7Y0FDekIsSUFBSXpULE9BQU8sR0FBR3lULEdBQUcsQ0FBQ3pULE9BQU87Y0FDekIsSUFBSSxDQUFDQSxPQUFPLEVBQUU7Z0JBQ1osSUFBSTFYLEdBQUcsRUFBRW5JLElBQUksQ0FBQ2l2QixXQUFXLENBQUMzWSxNQUFNLENBQUNpZCxPQUFPLENBQUM7Y0FDM0MsQ0FBQyxNQUFNLElBQUksQ0FBQ3ByQixHQUFHLEVBQUU7Z0JBQ2ZuSSxJQUFJLENBQUNpdkIsV0FBVyxDQUFDeUUsTUFBTSxDQUFDN1QsT0FBTyxDQUFDO2NBQ2xDLENBQUMsTUFBTTtnQkFDTDtnQkFDQTdmLElBQUksQ0FBQ2l2QixXQUFXLENBQUNvRSxNQUFNLENBQUNFLE9BQU8sRUFBRTFULE9BQU8sQ0FBQztjQUMzQztjQUNBO1lBQ0YsQ0FBQyxNQUFNLElBQUl5VCxHQUFHLENBQUNBLEdBQUcsS0FBSyxPQUFPLEVBQUU7Y0FDOUIsSUFBSW5yQixHQUFHLEVBQUU7Z0JBQ1AsTUFBTSxJQUFJM0UsS0FBSyxDQUNiLDREQUNGLENBQUM7Y0FDSDtjQUNBeEQsSUFBSSxDQUFDaXZCLFdBQVcsQ0FBQ3lFLE1BQU0sQ0FBQXBWLGFBQUE7Z0JBQUd0VixHQUFHLEVBQUV1cUI7Y0FBTyxHQUFLRCxHQUFHLENBQUM5bEIsTUFBTSxDQUFFLENBQUM7WUFDMUQsQ0FBQyxNQUFNLElBQUk4bEIsR0FBRyxDQUFDQSxHQUFHLEtBQUssU0FBUyxFQUFFO2NBQ2hDLElBQUksQ0FBQ25yQixHQUFHLEVBQ04sTUFBTSxJQUFJM0UsS0FBSyxDQUNiLHlEQUNGLENBQUM7Y0FDSHhELElBQUksQ0FBQ2l2QixXQUFXLENBQUMzWSxNQUFNLENBQUNpZCxPQUFPLENBQUM7WUFDbEMsQ0FBQyxNQUFNLElBQUlELEdBQUcsQ0FBQ0EsR0FBRyxLQUFLLFNBQVMsRUFBRTtjQUNoQyxJQUFJLENBQUNuckIsR0FBRyxFQUFFLE1BQU0sSUFBSTNFLEtBQUssQ0FBQyx1Q0FBdUMsQ0FBQztjQUNsRSxNQUFNb0osSUFBSSxHQUFHbk4sTUFBTSxDQUFDbU4sSUFBSSxDQUFDMG1CLEdBQUcsQ0FBQzlsQixNQUFNLENBQUM7Y0FDcEMsSUFBSVosSUFBSSxDQUFDckosTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDbkIsSUFBSXlZLFFBQVEsR0FBRyxDQUFDLENBQUM7Z0JBQ2pCcFAsSUFBSSxDQUFDOU4sT0FBTyxDQUFDRyxHQUFHLElBQUk7a0JBQ2xCLE1BQU00SixLQUFLLEdBQUd5cUIsR0FBRyxDQUFDOWxCLE1BQU0sQ0FBQ3ZPLEdBQUcsQ0FBQztrQkFDN0IsSUFBSThOLEtBQUssQ0FBQ3NKLE1BQU0sQ0FBQ2xPLEdBQUcsQ0FBQ2xKLEdBQUcsQ0FBQyxFQUFFNEosS0FBSyxDQUFDLEVBQUU7b0JBQ2pDO2tCQUNGO2tCQUNBLElBQUksT0FBT0EsS0FBSyxLQUFLLFdBQVcsRUFBRTtvQkFDaEMsSUFBSSxDQUFDbVQsUUFBUSxDQUFDdUIsTUFBTSxFQUFFO3NCQUNwQnZCLFFBQVEsQ0FBQ3VCLE1BQU0sR0FBRyxDQUFDLENBQUM7b0JBQ3RCO29CQUNBdkIsUUFBUSxDQUFDdUIsTUFBTSxDQUFDdGUsR0FBRyxDQUFDLEdBQUcsQ0FBQztrQkFDMUIsQ0FBQyxNQUFNO29CQUNMLElBQUksQ0FBQytjLFFBQVEsQ0FBQ3lCLElBQUksRUFBRTtzQkFDbEJ6QixRQUFRLENBQUN5QixJQUFJLEdBQUcsQ0FBQyxDQUFDO29CQUNwQjtvQkFDQXpCLFFBQVEsQ0FBQ3lCLElBQUksQ0FBQ3hlLEdBQUcsQ0FBQyxHQUFHNEosS0FBSztrQkFDNUI7Z0JBQ0YsQ0FBQyxDQUFDO2dCQUNGLElBQUlwSixNQUFNLENBQUNtTixJQUFJLENBQUNvUCxRQUFRLENBQUMsQ0FBQ3pZLE1BQU0sR0FBRyxDQUFDLEVBQUU7a0JBQ3BDdkQsSUFBSSxDQUFDaXZCLFdBQVcsQ0FBQ29FLE1BQU0sQ0FBQ0UsT0FBTyxFQUFFdlgsUUFBUSxDQUFDO2dCQUM1QztjQUNGO1lBQ0YsQ0FBQyxNQUFNO2NBQ0wsTUFBTSxJQUFJeFksS0FBSyxDQUFDLDRDQUE0QyxDQUFDO1lBQy9EO1VBQ0YsQ0FBQztVQUVEO1VBQ0Ftd0IsU0FBU0EsQ0FBQSxFQUFHO1lBQ1YzekIsSUFBSSxDQUFDaXZCLFdBQVcsQ0FBQzJFLHFCQUFxQixDQUFDLENBQUM7VUFDMUMsQ0FBQztVQUVEO1VBQ0FDLE1BQU1BLENBQUNyMEIsRUFBRSxFQUFFO1lBQ1QsT0FBT1EsSUFBSSxDQUFDOHpCLE9BQU8sQ0FBQ3QwQixFQUFFLENBQUM7VUFDekI7UUFBQyxHQUVFb3pCLGtCQUFrQixDQUN0QjtRQUNELE1BQU1tQixrQkFBa0IsR0FBQXpWLGFBQUE7VUFDdEIsTUFBTTJVLFdBQVdBLENBQUNDLFNBQVMsRUFBRUMsS0FBSyxFQUFFO1lBQ2xDLElBQUlELFNBQVMsR0FBRyxDQUFDLElBQUlDLEtBQUssRUFBRW56QixJQUFJLENBQUNpdkIsV0FBVyxDQUFDbUUsY0FBYyxDQUFDLENBQUM7WUFFN0QsSUFBSUQsS0FBSyxFQUFFLE1BQU1uekIsSUFBSSxDQUFDaXZCLFdBQVcsQ0FBQ2hOLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztVQUNuRCxDQUFDO1VBRUQsTUFBTW9SLE1BQU1BLENBQUNDLEdBQUcsRUFBRTtZQUNoQixJQUFJQyxPQUFPLEdBQUdyRCxPQUFPLENBQUNzRCxPQUFPLENBQUNGLEdBQUcsQ0FBQzl6QixFQUFFLENBQUM7WUFDckMsSUFBSTJJLEdBQUcsR0FBR25JLElBQUksQ0FBQ2l2QixXQUFXLENBQUN3RSxLQUFLLENBQUMvMUIsR0FBRyxDQUFDNjFCLE9BQU8sQ0FBQzs7WUFFN0M7WUFDQTtZQUNBO1lBQ0EsSUFBSUQsR0FBRyxDQUFDQSxHQUFHLEtBQUssU0FBUyxFQUFFO2NBQ3pCLElBQUl6VCxPQUFPLEdBQUd5VCxHQUFHLENBQUN6VCxPQUFPO2NBQ3pCLElBQUksQ0FBQ0EsT0FBTyxFQUFFO2dCQUNaLElBQUkxWCxHQUFHLEVBQUUsTUFBTW5JLElBQUksQ0FBQ2l2QixXQUFXLENBQUNoTixXQUFXLENBQUNzUixPQUFPLENBQUM7Y0FDdEQsQ0FBQyxNQUFNLElBQUksQ0FBQ3ByQixHQUFHLEVBQUU7Z0JBQ2YsTUFBTW5JLElBQUksQ0FBQ2l2QixXQUFXLENBQUMzTixXQUFXLENBQUN6QixPQUFPLENBQUM7Y0FDN0MsQ0FBQyxNQUFNO2dCQUNMO2dCQUNBLE1BQU03ZixJQUFJLENBQUNpdkIsV0FBVyxDQUFDeE0sV0FBVyxDQUFDOFEsT0FBTyxFQUFFMVQsT0FBTyxDQUFDO2NBQ3REO2NBQ0E7WUFDRixDQUFDLE1BQU0sSUFBSXlULEdBQUcsQ0FBQ0EsR0FBRyxLQUFLLE9BQU8sRUFBRTtjQUM5QixJQUFJbnJCLEdBQUcsRUFBRTtnQkFDUCxNQUFNLElBQUkzRSxLQUFLLENBQ2IsNERBQ0YsQ0FBQztjQUNIO2NBQ0EsTUFBTXhELElBQUksQ0FBQ2l2QixXQUFXLENBQUMzTixXQUFXLENBQUFoRCxhQUFBO2dCQUFHdFYsR0FBRyxFQUFFdXFCO2NBQU8sR0FBS0QsR0FBRyxDQUFDOWxCLE1BQU0sQ0FBRSxDQUFDO1lBQ3JFLENBQUMsTUFBTSxJQUFJOGxCLEdBQUcsQ0FBQ0EsR0FBRyxLQUFLLFNBQVMsRUFBRTtjQUNoQyxJQUFJLENBQUNuckIsR0FBRyxFQUNOLE1BQU0sSUFBSTNFLEtBQUssQ0FDYix5REFDRixDQUFDO2NBQ0gsTUFBTXhELElBQUksQ0FBQ2l2QixXQUFXLENBQUNoTixXQUFXLENBQUNzUixPQUFPLENBQUM7WUFDN0MsQ0FBQyxNQUFNLElBQUlELEdBQUcsQ0FBQ0EsR0FBRyxLQUFLLFNBQVMsRUFBRTtjQUNoQyxJQUFJLENBQUNuckIsR0FBRyxFQUFFLE1BQU0sSUFBSTNFLEtBQUssQ0FBQyx1Q0FBdUMsQ0FBQztjQUNsRSxNQUFNb0osSUFBSSxHQUFHbk4sTUFBTSxDQUFDbU4sSUFBSSxDQUFDMG1CLEdBQUcsQ0FBQzlsQixNQUFNLENBQUM7Y0FDcEMsSUFBSVosSUFBSSxDQUFDckosTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDbkIsSUFBSXlZLFFBQVEsR0FBRyxDQUFDLENBQUM7Z0JBQ2pCcFAsSUFBSSxDQUFDOU4sT0FBTyxDQUFDRyxHQUFHLElBQUk7a0JBQ2xCLE1BQU00SixLQUFLLEdBQUd5cUIsR0FBRyxDQUFDOWxCLE1BQU0sQ0FBQ3ZPLEdBQUcsQ0FBQztrQkFDN0IsSUFBSThOLEtBQUssQ0FBQ3NKLE1BQU0sQ0FBQ2xPLEdBQUcsQ0FBQ2xKLEdBQUcsQ0FBQyxFQUFFNEosS0FBSyxDQUFDLEVBQUU7b0JBQ2pDO2tCQUNGO2tCQUNBLElBQUksT0FBT0EsS0FBSyxLQUFLLFdBQVcsRUFBRTtvQkFDaEMsSUFBSSxDQUFDbVQsUUFBUSxDQUFDdUIsTUFBTSxFQUFFO3NCQUNwQnZCLFFBQVEsQ0FBQ3VCLE1BQU0sR0FBRyxDQUFDLENBQUM7b0JBQ3RCO29CQUNBdkIsUUFBUSxDQUFDdUIsTUFBTSxDQUFDdGUsR0FBRyxDQUFDLEdBQUcsQ0FBQztrQkFDMUIsQ0FBQyxNQUFNO29CQUNMLElBQUksQ0FBQytjLFFBQVEsQ0FBQ3lCLElBQUksRUFBRTtzQkFDbEJ6QixRQUFRLENBQUN5QixJQUFJLEdBQUcsQ0FBQyxDQUFDO29CQUNwQjtvQkFDQXpCLFFBQVEsQ0FBQ3lCLElBQUksQ0FBQ3hlLEdBQUcsQ0FBQyxHQUFHNEosS0FBSztrQkFDNUI7Z0JBQ0YsQ0FBQyxDQUFDO2dCQUNGLElBQUlwSixNQUFNLENBQUNtTixJQUFJLENBQUNvUCxRQUFRLENBQUMsQ0FBQ3pZLE1BQU0sR0FBRyxDQUFDLEVBQUU7a0JBQ3BDLE1BQU12RCxJQUFJLENBQUNpdkIsV0FBVyxDQUFDeE0sV0FBVyxDQUFDOFEsT0FBTyxFQUFFdlgsUUFBUSxDQUFDO2dCQUN2RDtjQUNGO1lBQ0YsQ0FBQyxNQUFNO2NBQ0wsTUFBTSxJQUFJeFksS0FBSyxDQUFDLDRDQUE0QyxDQUFDO1lBQy9EO1VBQ0YsQ0FBQztVQUVEO1VBQ0EsTUFBTW13QixTQUFTQSxDQUFBLEVBQUc7WUFDaEIsTUFBTTN6QixJQUFJLENBQUNpdkIsV0FBVyxDQUFDK0UscUJBQXFCLENBQUMsQ0FBQztVQUNoRCxDQUFDO1VBRUQ7VUFDQSxNQUFNSCxNQUFNQSxDQUFDcjBCLEVBQUUsRUFBRTtZQUNmLE9BQU9RLElBQUksQ0FBQ2dHLFlBQVksQ0FBQ3hHLEVBQUUsQ0FBQztVQUM5QjtRQUFDLEdBQ0VvekIsa0JBQWtCLENBQ3RCOztRQUdEO1FBQ0E7UUFDQTtRQUNBLElBQUlxQixtQkFBbUI7UUFDdkIsSUFBSW4yQixNQUFNLENBQUNrcUIsUUFBUSxFQUFFO1VBQ25CaU0sbUJBQW1CLEdBQUdqMEIsSUFBSSxDQUFDK3VCLFdBQVcsQ0FBQzJELG1CQUFtQixDQUN4RG5aLElBQUksRUFDSnlaLGtCQUNGLENBQUM7UUFDSCxDQUFDLE1BQU07VUFDTGlCLG1CQUFtQixHQUFHajBCLElBQUksQ0FBQyt1QixXQUFXLENBQUM0RCxtQkFBbUIsQ0FDeERwWixJQUFJLEVBQ0p3YSxrQkFDRixDQUFDO1FBQ0g7UUFFQSxNQUFNbmlCLE9BQU8sNENBQUE5TSxNQUFBLENBQTJDeVUsSUFBSSxPQUFHO1FBQy9ELE1BQU0yYSxPQUFPLEdBQUdBLENBQUEsS0FBTTtVQUNwQm50QixPQUFPLENBQUM4Z0IsSUFBSSxHQUFHOWdCLE9BQU8sQ0FBQzhnQixJQUFJLENBQUNqVyxPQUFPLENBQUMsR0FBRzdLLE9BQU8sQ0FBQ290QixHQUFHLENBQUN2aUIsT0FBTyxDQUFDO1FBQzdELENBQUM7UUFFRCxJQUFJLENBQUNxaUIsbUJBQW1CLEVBQUU7VUFDeEIsT0FBT0MsT0FBTyxDQUFDLENBQUM7UUFDbEI7UUFFQSxRQUFBMUIsb0JBQUEsR0FBT3lCLG1CQUFtQixjQUFBekIsb0JBQUEsd0JBQUFDLHFCQUFBLEdBQW5CRCxvQkFBQSxDQUFxQnZuQixJQUFJLGNBQUF3bkIscUJBQUEsdUJBQXpCQSxxQkFBQSxDQUFBamhCLElBQUEsQ0FBQWdoQixvQkFBQSxFQUE0QjRCLEVBQUUsSUFBSTtVQUN2QyxJQUFJLENBQUNBLEVBQUUsRUFBRTtZQUNQRixPQUFPLENBQUMsQ0FBQztVQUNYO1FBQ0YsQ0FBQyxDQUFDO01BQ0o7SUFDRixDQUFDO0lBQUFwMEIsc0JBQUE7RUFBQSxTQUFBQyxXQUFBO0lBQUEsT0FBQUQsc0JBQUEsQ0FBQUMsV0FBQTtFQUFBO0VBQUFELHNCQUFBO0FBQUE7RUFBQUUsSUFBQTtFQUFBQyxLQUFBO0FBQUEsRzs7Ozs7Ozs7Ozs7Ozs7SUN6UUQsSUFBSXFlLGFBQWE7SUFBQy9nQixNQUFNLENBQUNiLElBQUksQ0FBQyxzQ0FBc0MsRUFBQztNQUFDMkQsT0FBT0EsQ0FBQzFELENBQUMsRUFBQztRQUFDMmhCLGFBQWEsR0FBQzNoQixDQUFDO01BQUE7SUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDO0lBQUMsSUFBSUksb0JBQW9CLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTUEsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFBbEtRLE1BQU0sQ0FBQ2pCLE1BQU0sQ0FBQztNQUFDMHhCLFdBQVcsRUFBQ0EsQ0FBQSxLQUFJQTtJQUFXLENBQUMsQ0FBQztJQUFyQyxNQUFNQSxXQUFXLEdBQUc7TUFDekI7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7TUFDRTNKLElBQUlBLENBQUEsRUFBVTtRQUFBLFNBQUFoWixJQUFBLEdBQUFDLFNBQUEsQ0FBQS9ILE1BQUEsRUFBTmdJLElBQUksT0FBQUMsS0FBQSxDQUFBSCxJQUFBLEdBQUFJLElBQUEsTUFBQUEsSUFBQSxHQUFBSixJQUFBLEVBQUFJLElBQUE7VUFBSkYsSUFBSSxDQUFBRSxJQUFBLElBQUFILFNBQUEsQ0FBQUcsSUFBQTtRQUFBO1FBQ1Y7UUFDQTtRQUNBO1FBQ0EsT0FBTyxJQUFJLENBQUN3akIsV0FBVyxDQUFDNUssSUFBSSxDQUMxQixJQUFJLENBQUNpTCxnQkFBZ0IsQ0FBQy9qQixJQUFJLENBQUMsRUFDM0IsSUFBSSxDQUFDZ2tCLGVBQWUsQ0FBQ2hrQixJQUFJLENBQzNCLENBQUM7TUFDSCxDQUFDO01BRUQ7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7TUFDRXVvQixPQUFPQSxDQUFBLEVBQVU7UUFBQSxTQUFBbFAsS0FBQSxHQUFBdFosU0FBQSxDQUFBL0gsTUFBQSxFQUFOZ0ksSUFBSSxPQUFBQyxLQUFBLENBQUFvWixLQUFBLEdBQUFDLEtBQUEsTUFBQUEsS0FBQSxHQUFBRCxLQUFBLEVBQUFDLEtBQUE7VUFBSnRaLElBQUksQ0FBQXNaLEtBQUEsSUFBQXZaLFNBQUEsQ0FBQXVaLEtBQUE7UUFBQTtRQUNiLE9BQU8sSUFBSSxDQUFDb0ssV0FBVyxDQUFDNkUsT0FBTyxDQUM3QixJQUFJLENBQUN4RSxnQkFBZ0IsQ0FBQy9qQixJQUFJLENBQUMsRUFDM0IsSUFBSSxDQUFDZ2tCLGVBQWUsQ0FBQ2hrQixJQUFJLENBQzNCLENBQUM7TUFDSCxDQUFDO01BR0Q7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTtNQUNBO01BQ0E7TUFDQTs7TUFFQThvQixPQUFPQSxDQUFDbHNCLEdBQUcsRUFBRWhELFFBQVEsRUFBRTtRQUNyQjtRQUNBLElBQUksQ0FBQ2dELEdBQUcsRUFBRTtVQUNSLE1BQU0sSUFBSTNFLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQztRQUNoRDs7UUFHQTtRQUNBMkUsR0FBRyxHQUFHMUksTUFBTSxDQUFDa3RCLE1BQU0sQ0FDakJsdEIsTUFBTSxDQUFDa3lCLGNBQWMsQ0FBQ3hwQixHQUFHLENBQUMsRUFDMUIxSSxNQUFNLENBQUNteUIseUJBQXlCLENBQUN6cEIsR0FBRyxDQUN0QyxDQUFDO1FBRUQsSUFBSSxLQUFLLElBQUlBLEdBQUcsRUFBRTtVQUNoQixJQUNFLENBQUNBLEdBQUcsQ0FBQ2EsR0FBRyxJQUNSLEVBQUUsT0FBT2IsR0FBRyxDQUFDYSxHQUFHLEtBQUssUUFBUSxJQUFJYixHQUFHLENBQUNhLEdBQUcsWUFBWStULEtBQUssQ0FBQ0MsUUFBUSxDQUFDLEVBQ25FO1lBQ0EsTUFBTSxJQUFJeFosS0FBSyxDQUNiLDBFQUNGLENBQUM7VUFDSDtRQUNGLENBQUMsTUFBTTtVQUNMLElBQUlxdUIsVUFBVSxHQUFHLElBQUk7O1VBRXJCO1VBQ0E7VUFDQTtVQUNBLElBQUksSUFBSSxDQUFDL0IsbUJBQW1CLENBQUMsQ0FBQyxFQUFFO1lBQzlCLE1BQU1nQyxTQUFTLEdBQUd2QixHQUFHLENBQUN3Qix3QkFBd0IsQ0FBQ3IwQixHQUFHLENBQUMsQ0FBQztZQUNwRCxJQUFJLENBQUNvMEIsU0FBUyxFQUFFO2NBQ2RELFVBQVUsR0FBRyxLQUFLO1lBQ3BCO1VBQ0Y7VUFFQSxJQUFJQSxVQUFVLEVBQUU7WUFDZDFwQixHQUFHLENBQUNhLEdBQUcsR0FBRyxJQUFJLENBQUM0bEIsVUFBVSxDQUFDLENBQUM7VUFDN0I7UUFDRjs7UUFHQTtRQUNBO1FBQ0EsSUFBSW9ELHFDQUFxQyxHQUFHLFNBQUFBLENBQVNubEIsTUFBTSxFQUFFO1VBQzNELElBQUkvTyxNQUFNLENBQUNrUCxVQUFVLENBQUNILE1BQU0sQ0FBQyxFQUFFLE9BQU9BLE1BQU07VUFFNUMsSUFBSTFFLEdBQUcsQ0FBQ2EsR0FBRyxFQUFFO1lBQ1gsT0FBT2IsR0FBRyxDQUFDYSxHQUFHO1VBQ2hCOztVQUVBO1VBQ0E7VUFDQTtVQUNBYixHQUFHLENBQUNhLEdBQUcsR0FBRzZELE1BQU07VUFFaEIsT0FBT0EsTUFBTTtRQUNmLENBQUM7UUFFRCxNQUFNeW5CLGVBQWUsR0FBR0MsWUFBWSxDQUNsQ3B2QixRQUFRLEVBQ1I2c0IscUNBQ0YsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDbEMsbUJBQW1CLENBQUMsQ0FBQyxFQUFFO1VBQzlCLE1BQU1qakIsTUFBTSxHQUFHLElBQUksQ0FBQzJuQixrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQ3JzQixHQUFHLENBQUMsRUFBRW1zQixlQUFlLENBQUM7VUFDeEUsT0FBT3RDLHFDQUFxQyxDQUFDbmxCLE1BQU0sQ0FBQztRQUN0RDs7UUFFQTtRQUNBO1FBQ0EsSUFBSTtVQUNGO1VBQ0E7VUFDQTtVQUNBLElBQUlBLE1BQU07VUFDVixJQUFJLENBQUMsQ0FBQ3luQixlQUFlLEVBQUU7WUFDckIsSUFBSSxDQUFDckYsV0FBVyxDQUFDeUUsTUFBTSxDQUFDdnJCLEdBQUcsRUFBRW1zQixlQUFlLENBQUM7VUFDL0MsQ0FBQyxNQUFNO1lBQ0w7WUFDQTtZQUNBem5CLE1BQU0sR0FBRyxJQUFJLENBQUNvaUIsV0FBVyxDQUFDeUUsTUFBTSxDQUFDdnJCLEdBQUcsQ0FBQztVQUN2QztVQUVBLE9BQU82cEIscUNBQXFDLENBQUNubEIsTUFBTSxDQUFDO1FBQ3RELENBQUMsQ0FBQyxPQUFPekcsQ0FBQyxFQUFFO1VBQ1YsSUFBSWpCLFFBQVEsRUFBRTtZQUNaQSxRQUFRLENBQUNpQixDQUFDLENBQUM7WUFDWCxPQUFPLElBQUk7VUFDYjtVQUNBLE1BQU1BLENBQUM7UUFDVDtNQUNGLENBQUM7TUFFRDtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7TUFDRXN0QixNQUFNQSxDQUFDdnJCLEdBQUcsRUFBRWhELFFBQVEsRUFBRTtRQUNwQixPQUFPLElBQUksQ0FBQ2t2QixPQUFPLENBQUNsc0IsR0FBRyxFQUFFaEQsUUFBUSxDQUFDO01BQ3BDLENBQUM7TUFFRDtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO01BQ0VrdUIsTUFBTUEsQ0FBQzl6QixRQUFRLEVBQUV5YyxRQUFRLEVBQXlCO1FBQUEsU0FBQXlZLEtBQUEsR0FBQW5wQixTQUFBLENBQUEvSCxNQUFBLEVBQXBCbXhCLGtCQUFrQixPQUFBbHBCLEtBQUEsQ0FBQWlwQixLQUFBLE9BQUFBLEtBQUEsV0FBQUUsS0FBQSxNQUFBQSxLQUFBLEdBQUFGLEtBQUEsRUFBQUUsS0FBQTtVQUFsQkQsa0JBQWtCLENBQUFDLEtBQUEsUUFBQXJwQixTQUFBLENBQUFxcEIsS0FBQTtRQUFBO1FBQzlDLE1BQU14dkIsUUFBUSxHQUFHeXZCLG1CQUFtQixDQUFDRixrQkFBa0IsQ0FBQzs7UUFFeEQ7UUFDQTtRQUNBLE1BQU14b0IsT0FBTyxHQUFBb1MsYUFBQSxLQUFTb1csa0JBQWtCLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFHO1FBQ3RELElBQUk1UyxVQUFVO1FBQ2QsSUFBSTVWLE9BQU8sSUFBSUEsT0FBTyxDQUFDMlcsTUFBTSxFQUFFO1VBQzdCO1VBQ0EsSUFBSTNXLE9BQU8sQ0FBQzRWLFVBQVUsRUFBRTtZQUN0QixJQUNFLEVBQ0UsT0FBTzVWLE9BQU8sQ0FBQzRWLFVBQVUsS0FBSyxRQUFRLElBQ3RDNVYsT0FBTyxDQUFDNFYsVUFBVSxZQUFZL0UsS0FBSyxDQUFDQyxRQUFRLENBQzdDLEVBRUQsTUFBTSxJQUFJeFosS0FBSyxDQUFDLHVDQUF1QyxDQUFDO1lBQzFEc2UsVUFBVSxHQUFHNVYsT0FBTyxDQUFDNFYsVUFBVTtVQUNqQyxDQUFDLE1BQU0sSUFBSSxDQUFDdmlCLFFBQVEsSUFBSSxDQUFDQSxRQUFRLENBQUN5SixHQUFHLEVBQUU7WUFDckM4WSxVQUFVLEdBQUcsSUFBSSxDQUFDOE0sVUFBVSxDQUFDLENBQUM7WUFDOUIxaUIsT0FBTyxDQUFDcVgsV0FBVyxHQUFHLElBQUk7WUFDMUJyWCxPQUFPLENBQUM0VixVQUFVLEdBQUdBLFVBQVU7VUFDakM7UUFDRjtRQUVBdmlCLFFBQVEsR0FBR3dkLEtBQUssQ0FBQ3FCLFVBQVUsQ0FBQ0MsZ0JBQWdCLENBQUM5ZSxRQUFRLEVBQUU7VUFDckRvd0IsVUFBVSxFQUFFN047UUFDZCxDQUFDLENBQUM7UUFFRixNQUFNd1MsZUFBZSxHQUFHQyxZQUFZLENBQUNwdkIsUUFBUSxDQUFDO1FBRTlDLElBQUksSUFBSSxDQUFDMnFCLG1CQUFtQixDQUFDLENBQUMsRUFBRTtVQUM5QixNQUFNdmtCLElBQUksR0FBRyxDQUFDaE0sUUFBUSxFQUFFeWMsUUFBUSxFQUFFOVAsT0FBTyxDQUFDO1VBQzFDLE9BQU8sSUFBSSxDQUFDc29CLGtCQUFrQixDQUFDLFFBQVEsRUFBRWpwQixJQUFJLEVBQUVwRyxRQUFRLENBQUM7UUFDMUQ7O1FBRUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0EsSUFBSTtVQUNGO1VBQ0E7VUFDQTtVQUNBLE9BQU8sSUFBSSxDQUFDOHBCLFdBQVcsQ0FBQ29FLE1BQU0sQ0FDNUI5ekIsUUFBUSxFQUNSeWMsUUFBUSxFQUNSOVAsT0FBTyxFQUNQb29CLGVBQ0YsQ0FBQztRQUNILENBQUMsQ0FBQyxPQUFPbHVCLENBQUMsRUFBRTtVQUNWLElBQUlqQixRQUFRLEVBQUU7WUFDWkEsUUFBUSxDQUFDaUIsQ0FBQyxDQUFDO1lBQ1gsT0FBTyxJQUFJO1VBQ2I7VUFDQSxNQUFNQSxDQUFDO1FBQ1Q7TUFDRixDQUFDO01BRUQ7QUFDRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO01BQ0VrUSxNQUFNQSxDQUFDL1csUUFBUSxFQUFFNEYsUUFBUSxFQUFFO1FBQ3pCNUYsUUFBUSxHQUFHd2QsS0FBSyxDQUFDcUIsVUFBVSxDQUFDQyxnQkFBZ0IsQ0FBQzllLFFBQVEsQ0FBQztRQUV0RCxJQUFJLElBQUksQ0FBQ3V3QixtQkFBbUIsQ0FBQyxDQUFDLEVBQUU7VUFDOUIsT0FBTyxJQUFJLENBQUMwRSxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQ2oxQixRQUFRLENBQUMsRUFBRTRGLFFBQVEsQ0FBQztRQUNoRTs7UUFHQTtRQUNBO1FBQ0EsT0FBTyxJQUFJLENBQUM4cEIsV0FBVyxDQUFDM1ksTUFBTSxDQUFDL1csUUFBUSxDQUFDO01BQzFDLENBQUM7TUFFRDtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7TUFDRXNqQixNQUFNQSxDQUFDdGpCLFFBQVEsRUFBRXljLFFBQVEsRUFBRTlQLE9BQU8sRUFBRS9HLFFBQVEsRUFBRTtRQUM1QyxJQUFJLENBQUNBLFFBQVEsSUFBSSxPQUFPK0csT0FBTyxLQUFLLFVBQVUsRUFBRTtVQUM5Qy9HLFFBQVEsR0FBRytHLE9BQU87VUFDbEJBLE9BQU8sR0FBRyxDQUFDLENBQUM7UUFDZDtRQUVBLE9BQU8sSUFBSSxDQUFDbW5CLE1BQU0sQ0FDaEI5ekIsUUFBUSxFQUNSeWMsUUFBUSxFQUFBc0MsYUFBQSxDQUFBQSxhQUFBLEtBRUhwUyxPQUFPO1VBQ1Z1WCxhQUFhLEVBQUUsSUFBSTtVQUNuQlosTUFBTSxFQUFFO1FBQUksRUFDYixDQUFDO01BQ047SUFDRixDQUFDO0lBRUQ7SUFDQSxTQUFTMFIsWUFBWUEsQ0FBQ3B2QixRQUFRLEVBQUUwdkIsYUFBYSxFQUFFO01BQzdDLE9BQ0UxdkIsUUFBUSxJQUNSLFVBQVM2QixLQUFLLEVBQUU2RixNQUFNLEVBQUU7UUFDdEIsSUFBSTdGLEtBQUssRUFBRTtVQUNUN0IsUUFBUSxDQUFDNkIsS0FBSyxDQUFDO1FBQ2pCLENBQUMsTUFBTSxJQUFJLE9BQU82dEIsYUFBYSxLQUFLLFVBQVUsRUFBRTtVQUM5QzF2QixRQUFRLENBQUM2QixLQUFLLEVBQUU2dEIsYUFBYSxDQUFDaG9CLE1BQU0sQ0FBQyxDQUFDO1FBQ3hDLENBQUMsTUFBTTtVQUNMMUgsUUFBUSxDQUFDNkIsS0FBSyxFQUFFNkYsTUFBTSxDQUFDO1FBQ3pCO01BQ0YsQ0FBQztJQUVMO0lBRUEsU0FBUytuQixtQkFBbUJBLENBQUNycEIsSUFBSSxFQUFFO01BQ2pDO01BQ0E7TUFDQSxJQUNFQSxJQUFJLENBQUNoSSxNQUFNLEtBQ1ZnSSxJQUFJLENBQUNBLElBQUksQ0FBQ2hJLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBS3FILFNBQVMsSUFDbENXLElBQUksQ0FBQ0EsSUFBSSxDQUFDaEksTUFBTSxHQUFHLENBQUMsQ0FBQyxZQUFZMFEsUUFBUSxDQUFDLEVBQzVDO1FBQ0EsT0FBTzFJLElBQUksQ0FBQ2xELEdBQUcsQ0FBQyxDQUFDO01BQ25CO0lBQ0Y7SUFBQ3ZJLHNCQUFBO0VBQUEsU0FBQUMsV0FBQTtJQUFBLE9BQUFELHNCQUFBLENBQUFDLFdBQUE7RUFBQTtFQUFBRCxzQkFBQTtBQUFBO0VBQUFFLElBQUE7RUFBQUMsS0FBQTtBQUFBLEc7Ozs7Ozs7Ozs7O0FDelZEOzs7Ozs7QUFNQThjLEtBQUssQ0FBQytYLG9CQUFvQixHQUFHLFNBQVNBLG9CQUFvQkEsQ0FBRTVvQixPQUFPO0VBQ2pFb0MsS0FBSyxDQUFDcEMsT0FBTyxFQUFFek0sTUFBTSxDQUFDO0VBQ3RCc2QsS0FBSyxDQUFDeUMsa0JBQWtCLEdBQUd0VCxPQUFPO0FBQ3BDLENBQUMsQzs7Ozs7Ozs7Ozs7Ozs7SUNURCxJQUFJb1MsYUFBYTtJQUFDL2dCLE1BQU0sQ0FBQ2IsSUFBSSxDQUFDLHNDQUFzQyxFQUFDO01BQUMyRCxPQUFPQSxDQUFDMUQsQ0FBQyxFQUFDO1FBQUMyaEIsYUFBYSxHQUFDM2hCLENBQUM7TUFBQTtJQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7SUFBQyxJQUFJa04sd0JBQXdCO0lBQUN0TSxNQUFNLENBQUNiLElBQUksQ0FBQyxnREFBZ0QsRUFBQztNQUFDMkQsT0FBT0EsQ0FBQzFELENBQUMsRUFBQztRQUFDa04sd0JBQXdCLEdBQUNsTixDQUFDO01BQUE7SUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDO0lBQUMsSUFBSUksb0JBQW9CLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTUEsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFBQyxNQUFBK00sU0FBQTtJQUF6U3ZNLE1BQU0sQ0FBQ2pCLE1BQU0sQ0FBQztNQUFDd3hCLG1CQUFtQixFQUFDQSxDQUFBLEtBQUlBO0lBQW1CLENBQUMsQ0FBQztJQUFyRCxNQUFNQSxtQkFBbUIsR0FBRzVoQixPQUFPLElBQUk7TUFDNUM7TUFDQSxNQUFBbEMsSUFBQSxHQUFnRGtDLE9BQU8sSUFBSSxDQUFDLENBQUM7UUFBdkQ7VUFBRXNCLE1BQU07VUFBRXZIO1FBQTRCLENBQUMsR0FBQStELElBQUE7UUFBZCtxQixZQUFZLEdBQUFsckIsd0JBQUEsQ0FBQUcsSUFBQSxFQUFBRixTQUFBO01BQzNDO01BQ0E7O01BRUEsT0FBQXdVLGFBQUEsQ0FBQUEsYUFBQSxLQUNLeVcsWUFBWSxHQUNYOXVCLFVBQVUsSUFBSXVILE1BQU0sR0FBRztRQUFFdkgsVUFBVSxFQUFFdUgsTUFBTSxJQUFJdkg7TUFBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRXhFLENBQUM7SUFBQ25HLHNCQUFBO0VBQUEsU0FBQUMsV0FBQTtJQUFBLE9BQUFELHNCQUFBLENBQUFDLFdBQUE7RUFBQTtFQUFBRCxzQkFBQTtBQUFBO0VBQUFFLElBQUE7RUFBQUMsS0FBQTtBQUFBLEc7Ozs7Ozs7Ozs7O0FDUkYxQyxNQUFJLENBQUFqQixNQUFBO0VBQUF5aUIsYUFBd0IsRUFBQUEsQ0FBQSxLQUFBQTtBQUFBO0FBQTVCLElBQUlpVyxtQkFBbUIsR0FBRyxDQUFDO0FBTzNCOzs7OztBQUtNLE1BQU9qVyxhQUFhO0VBZXhCaGUsWUFBWWdQLFdBQStCLEVBQUV0QixTQUFxRCxFQUFFM0Isb0JBQTZCO0lBQUEsS0Fkakk5RCxHQUFHO0lBQUEsS0FDSHFHLFlBQVk7SUFBQSxLQUNadkMsb0JBQW9CO0lBQUEsS0FDcEJqTCxRQUFRO0lBQUEsS0FFRGtNLHVCQUF1QixHQUEwQixNQUFLLENBQUUsQ0FBQztJQUFBLEtBQ3pEYixlQUFlO0lBQUEsS0FFdEJFLE1BQU07SUFBQSxLQUNORCxZQUFZO0lBQUEsS0FDWjhuQixRQUFRO0lBQUEsS0FDUkMsWUFBWTtJQUFBLEtBQ1pDLFFBQVE7SUFxQ1I7OztJQUFBLEtBR0F0MkIsSUFBSSxHQUFHLFlBQVc7TUFDaEIsSUFBSSxJQUFJLENBQUNnRCxRQUFRLEVBQUU7TUFDbkIsSUFBSSxDQUFDQSxRQUFRLEdBQUcsSUFBSTtNQUNwQixNQUFNLElBQUksQ0FBQ3dOLFlBQVksQ0FBQ3RELFlBQVksQ0FBQyxJQUFJLENBQUMvQyxHQUFHLENBQUM7SUFDaEQsQ0FBQztJQXpDQyxJQUFJLENBQUNxRyxZQUFZLEdBQUdVLFdBQVc7SUFFL0JBLFdBQVcsQ0FBQzVFLGFBQWEsRUFBRSxDQUFDck0sT0FBTyxDQUFFeWEsSUFBMkIsSUFBSTtNQUNsRSxJQUFJOUssU0FBUyxDQUFDOEssSUFBSSxDQUFDLEVBQUU7UUFDbkIsSUFBSSxLQUFBelUsTUFBQSxDQUFLeVUsSUFBSSxFQUFvQyxHQUFHOUssU0FBUyxDQUFDOEssSUFBSSxDQUFDO1FBQ25FO01BQ0Y7TUFFQSxJQUFJQSxJQUFJLEtBQUssYUFBYSxJQUFJOUssU0FBUyxDQUFDdUgsS0FBSyxFQUFFO1FBQzdDLElBQUksQ0FBQzdJLFlBQVksR0FBRyxnQkFBZ0IzTixFQUFFLEVBQUVnTyxNQUFNLEVBQUU0bkIsTUFBTTtVQUNwRCxNQUFNM21CLFNBQVMsQ0FBQ3VILEtBQUssQ0FBQ3hXLEVBQUUsRUFBRWdPLE1BQU0sQ0FBQztRQUNuQyxDQUFDO01BQ0g7SUFDRixDQUFDLENBQUM7SUFFRixJQUFJLENBQUMzTCxRQUFRLEdBQUcsS0FBSztJQUNyQixJQUFJLENBQUNtSCxHQUFHLEdBQUdnc0IsbUJBQW1CLEVBQUU7SUFDaEMsSUFBSSxDQUFDbG9CLG9CQUFvQixHQUFHQSxvQkFBb0I7SUFFaEQsSUFBSSxDQUFDSSxlQUFlLEdBQUcsSUFBSXZLLE9BQU8sQ0FBQ2dILE9BQU8sSUFBRztNQUMzQyxNQUFNeUMsS0FBSyxHQUFHQSxDQUFBLEtBQUs7UUFDakJ6QyxPQUFPLEVBQUU7UUFDVCxJQUFJLENBQUN1RCxlQUFlLEdBQUd2SyxPQUFPLENBQUNnSCxPQUFPLEVBQUU7TUFDMUMsQ0FBQztNQUVELE1BQU0wckIsT0FBTyxHQUFHdnVCLFVBQVUsQ0FBQ3NGLEtBQUssRUFBRSxLQUFLLENBQUM7TUFFeEMsSUFBSSxDQUFDMkIsdUJBQXVCLEdBQUcsTUFBSztRQUNsQzNCLEtBQUssRUFBRTtRQUNQdkYsWUFBWSxDQUFDd3VCLE9BQU8sQ0FBQztNQUN2QixDQUFDO0lBQ0gsQ0FBQyxDQUFDO0VBQ0oiLCJmaWxlIjoiL3BhY2thZ2VzL21vbmdvLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgT3Bsb2dIYW5kbGUgfSBmcm9tICcuL29wbG9nX3RhaWxpbmcnO1xuaW1wb3J0IHsgTW9uZ29Db25uZWN0aW9uIH0gZnJvbSAnLi9tb25nb19jb25uZWN0aW9uJztcbmltcG9ydCB7IE9wbG9nT2JzZXJ2ZURyaXZlciB9IGZyb20gJy4vb3Bsb2dfb2JzZXJ2ZV9kcml2ZXInO1xuaW1wb3J0IHsgTW9uZ29EQiB9IGZyb20gJy4vbW9uZ29fY29tbW9uJztcblxuTW9uZ29JbnRlcm5hbHMgPSBnbG9iYWwuTW9uZ29JbnRlcm5hbHMgPSB7fTtcblxuTW9uZ29JbnRlcm5hbHMuX19wYWNrYWdlTmFtZSA9ICdtb25nbyc7XG5cbk1vbmdvSW50ZXJuYWxzLk5wbU1vZHVsZXMgPSB7XG4gIG1vbmdvZGI6IHtcbiAgICB2ZXJzaW9uOiBOcG1Nb2R1bGVNb25nb2RiVmVyc2lvbixcbiAgICBtb2R1bGU6IE1vbmdvREJcbiAgfVxufTtcblxuLy8gT2xkZXIgdmVyc2lvbiBvZiB3aGF0IGlzIG5vdyBhdmFpbGFibGUgdmlhXG4vLyBNb25nb0ludGVybmFscy5OcG1Nb2R1bGVzLm1vbmdvZGIubW9kdWxlLiAgSXQgd2FzIG5ldmVyIGRvY3VtZW50ZWQsIGJ1dFxuLy8gcGVvcGxlIGRvIHVzZSBpdC5cbi8vIFhYWCBDT01QQVQgV0lUSCAxLjAuMy4yXG5Nb25nb0ludGVybmFscy5OcG1Nb2R1bGUgPSBuZXcgUHJveHkoTW9uZ29EQiwge1xuICBnZXQodGFyZ2V0LCBwcm9wZXJ0eUtleSwgcmVjZWl2ZXIpIHtcbiAgICBpZiAocHJvcGVydHlLZXkgPT09ICdPYmplY3RJRCcpIHtcbiAgICAgIE1ldGVvci5kZXByZWNhdGUoXG4gICAgICAgIGBBY2Nlc3NpbmcgJ01vbmdvSW50ZXJuYWxzLk5wbU1vZHVsZS5PYmplY3RJRCcgZGlyZWN0bHkgaXMgZGVwcmVjYXRlZC4gYCArXG4gICAgICAgIGBVc2UgJ01vbmdvSW50ZXJuYWxzLk5wbU1vZHVsZS5PYmplY3RJZCcgaW5zdGVhZC5gXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gUmVmbGVjdC5nZXQodGFyZ2V0LCBwcm9wZXJ0eUtleSwgcmVjZWl2ZXIpO1xuICB9LFxufSk7XG5cbk1vbmdvSW50ZXJuYWxzLk9wbG9nSGFuZGxlID0gT3Bsb2dIYW5kbGU7XG5cbk1vbmdvSW50ZXJuYWxzLkNvbm5lY3Rpb24gPSBNb25nb0Nvbm5lY3Rpb247XG5cbk1vbmdvSW50ZXJuYWxzLk9wbG9nT2JzZXJ2ZURyaXZlciA9IE9wbG9nT2JzZXJ2ZURyaXZlcjtcblxuLy8gVGhpcyBpcyB1c2VkIHRvIGFkZCBvciByZW1vdmUgRUpTT04gZnJvbSB0aGUgYmVnaW5uaW5nIG9mIGV2ZXJ5dGhpbmcgbmVzdGVkXG4vLyBpbnNpZGUgYW4gRUpTT04gY3VzdG9tIHR5cGUuIEl0IHNob3VsZCBvbmx5IGJlIGNhbGxlZCBvbiBwdXJlIEpTT04hXG5cblxuLy8gRW5zdXJlIHRoYXQgRUpTT04uY2xvbmUga2VlcHMgYSBUaW1lc3RhbXAgYXMgYSBUaW1lc3RhbXAgKGluc3RlYWQgb2YganVzdFxuLy8gZG9pbmcgYSBzdHJ1Y3R1cmFsIGNsb25lKS5cbi8vIFhYWCBob3cgb2sgaXMgdGhpcz8gd2hhdCBpZiB0aGVyZSBhcmUgbXVsdGlwbGUgY29waWVzIG9mIE1vbmdvREIgbG9hZGVkP1xuTW9uZ29EQi5UaW1lc3RhbXAucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24gKCkge1xuICAvLyBUaW1lc3RhbXBzIHNob3VsZCBiZSBpbW11dGFibGUuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gTGlzdGVuIGZvciB0aGUgaW52YWxpZGF0aW9uIG1lc3NhZ2VzIHRoYXQgd2lsbCB0cmlnZ2VyIHVzIHRvIHBvbGwgdGhlXG4vLyBkYXRhYmFzZSBmb3IgY2hhbmdlcy4gSWYgdGhpcyBzZWxlY3RvciBzcGVjaWZpZXMgc3BlY2lmaWMgSURzLCBzcGVjaWZ5IHRoZW1cbi8vIGhlcmUsIHNvIHRoYXQgdXBkYXRlcyB0byBkaWZmZXJlbnQgc3BlY2lmaWMgSURzIGRvbid0IGNhdXNlIHVzIHRvIHBvbGwuXG4vLyBsaXN0ZW5DYWxsYmFjayBpcyB0aGUgc2FtZSBraW5kIG9mIChub3RpZmljYXRpb24sIGNvbXBsZXRlKSBjYWxsYmFjayBwYXNzZWRcbi8vIHRvIEludmFsaWRhdGlvbkNyb3NzYmFyLmxpc3Rlbi5cblxuZXhwb3J0IGNvbnN0IGxpc3RlbkFsbCA9IGFzeW5jIGZ1bmN0aW9uIChjdXJzb3JEZXNjcmlwdGlvbiwgbGlzdGVuQ2FsbGJhY2spIHtcbiAgY29uc3QgbGlzdGVuZXJzID0gW107XG4gIGF3YWl0IGZvckVhY2hUcmlnZ2VyKGN1cnNvckRlc2NyaXB0aW9uLCBmdW5jdGlvbiAodHJpZ2dlcikge1xuICAgIGxpc3RlbmVycy5wdXNoKEREUFNlcnZlci5fSW52YWxpZGF0aW9uQ3Jvc3NiYXIubGlzdGVuKFxuICAgICAgdHJpZ2dlciwgbGlzdGVuQ2FsbGJhY2spKTtcbiAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICBzdG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgICBsaXN0ZW5lcnMuZm9yRWFjaChmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICAgICAgbGlzdGVuZXIuc3RvcCgpO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xufTtcblxuZXhwb3J0IGNvbnN0IGZvckVhY2hUcmlnZ2VyID0gYXN5bmMgZnVuY3Rpb24gKGN1cnNvckRlc2NyaXB0aW9uLCB0cmlnZ2VyQ2FsbGJhY2spIHtcbiAgY29uc3Qga2V5ID0ge2NvbGxlY3Rpb246IGN1cnNvckRlc2NyaXB0aW9uLmNvbGxlY3Rpb25OYW1lfTtcbiAgY29uc3Qgc3BlY2lmaWNJZHMgPSBMb2NhbENvbGxlY3Rpb24uX2lkc01hdGNoZWRCeVNlbGVjdG9yKFxuICAgIGN1cnNvckRlc2NyaXB0aW9uLnNlbGVjdG9yKTtcbiAgaWYgKHNwZWNpZmljSWRzKSB7XG4gICAgZm9yIChjb25zdCBpZCBvZiBzcGVjaWZpY0lkcykge1xuICAgICAgYXdhaXQgdHJpZ2dlckNhbGxiYWNrKE9iamVjdC5hc3NpZ24oe2lkOiBpZH0sIGtleSkpO1xuICAgIH1cbiAgICBhd2FpdCB0cmlnZ2VyQ2FsbGJhY2soT2JqZWN0LmFzc2lnbih7ZHJvcENvbGxlY3Rpb246IHRydWUsIGlkOiBudWxsfSwga2V5KSk7XG4gIH0gZWxzZSB7XG4gICAgYXdhaXQgdHJpZ2dlckNhbGxiYWNrKGtleSk7XG4gIH1cbiAgLy8gRXZlcnlvbmUgY2FyZXMgYWJvdXQgdGhlIGRhdGFiYXNlIGJlaW5nIGRyb3BwZWQuXG4gIGF3YWl0IHRyaWdnZXJDYWxsYmFjayh7IGRyb3BEYXRhYmFzZTogdHJ1ZSB9KTtcbn07XG5cblxuXG4vLyBYWFggV2UgcHJvYmFibHkgbmVlZCB0byBmaW5kIGEgYmV0dGVyIHdheSB0byBleHBvc2UgdGhpcy4gUmlnaHQgbm93XG4vLyBpdCdzIG9ubHkgdXNlZCBieSB0ZXN0cywgYnV0IGluIGZhY3QgeW91IG5lZWQgaXQgaW4gbm9ybWFsXG4vLyBvcGVyYXRpb24gdG8gaW50ZXJhY3Qgd2l0aCBjYXBwZWQgY29sbGVjdGlvbnMuXG5Nb25nb0ludGVybmFscy5Nb25nb1RpbWVzdGFtcCA9IE1vbmdvREIuVGltZXN0YW1wO1xuIiwiaW1wb3J0IGlzRW1wdHkgZnJvbSAnbG9kYXNoLmlzZW1wdHknO1xuaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBDdXJzb3JEZXNjcmlwdGlvbiB9IGZyb20gJy4vY3Vyc29yX2Rlc2NyaXB0aW9uJztcbmltcG9ydCB7IE1vbmdvQ29ubmVjdGlvbiB9IGZyb20gJy4vbW9uZ29fY29ubmVjdGlvbic7XG5cbmltcG9ydCB7IE5wbU1vZHVsZU1vbmdvZGIgfSBmcm9tIFwibWV0ZW9yL25wbS1tb25nb1wiO1xuY29uc3QgeyBMb25nIH0gPSBOcG1Nb2R1bGVNb25nb2RiO1xuXG5leHBvcnQgY29uc3QgT1BMT0dfQ09MTEVDVElPTiA9ICdvcGxvZy5ycyc7XG5cbmxldCBUT09fRkFSX0JFSElORCA9ICsocHJvY2Vzcy5lbnYuTUVURU9SX09QTE9HX1RPT19GQVJfQkVISU5EIHx8IDIwMDApO1xuY29uc3QgVEFJTF9USU1FT1VUID0gKyhwcm9jZXNzLmVudi5NRVRFT1JfT1BMT0dfVEFJTF9USU1FT1VUIHx8IDMwMDAwKTtcblxuZXhwb3J0IGludGVyZmFjZSBPcGxvZ0VudHJ5IHtcbiAgb3A6IHN0cmluZztcbiAgbzogYW55O1xuICBvMj86IGFueTtcbiAgdHM6IGFueTtcbiAgbnM6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDYXRjaGluZ1VwUmVzb2x2ZXIge1xuICB0czogYW55O1xuICByZXNvbHZlcjogKCkgPT4gdm9pZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBPcGxvZ1RyaWdnZXIge1xuICBkcm9wQ29sbGVjdGlvbjogYm9vbGVhbjtcbiAgZHJvcERhdGFiYXNlOiBib29sZWFuO1xuICBvcDogT3Bsb2dFbnRyeTtcbiAgY29sbGVjdGlvbj86IHN0cmluZztcbiAgaWQ/OiBzdHJpbmcgfCBudWxsO1xufVxuXG5leHBvcnQgY2xhc3MgT3Bsb2dIYW5kbGUge1xuICBwcml2YXRlIF9vcGxvZ1VybDogc3RyaW5nO1xuICBwdWJsaWMgX2RiTmFtZTogc3RyaW5nO1xuICBwcml2YXRlIF9vcGxvZ0xhc3RFbnRyeUNvbm5lY3Rpb246IE1vbmdvQ29ubmVjdGlvbiB8IG51bGw7XG4gIHByaXZhdGUgX29wbG9nVGFpbENvbm5lY3Rpb246IE1vbmdvQ29ubmVjdGlvbiB8IG51bGw7XG4gIHByaXZhdGUgX29wbG9nT3B0aW9uczoge1xuICAgIGV4Y2x1ZGVDb2xsZWN0aW9ucz86IHN0cmluZ1tdO1xuICAgIGluY2x1ZGVDb2xsZWN0aW9ucz86IHN0cmluZ1tdO1xuICB9O1xuICBwcml2YXRlIF9zdG9wcGVkOiBib29sZWFuO1xuICBwcml2YXRlIF90YWlsSGFuZGxlOiBhbnk7XG4gIHByaXZhdGUgX3JlYWR5UHJvbWlzZVJlc29sdmVyOiAoKCkgPT4gdm9pZCkgfCBudWxsO1xuICBwcml2YXRlIF9yZWFkeVByb21pc2U6IFByb21pc2U8dm9pZD47XG4gIHB1YmxpYyBfY3Jvc3NiYXI6IGFueTtcbiAgcHJpdmF0ZSBfY2F0Y2hpbmdVcFJlc29sdmVyczogQ2F0Y2hpbmdVcFJlc29sdmVyW107XG4gIHByaXZhdGUgX2xhc3RQcm9jZXNzZWRUUzogYW55O1xuICBwcml2YXRlIF9vblNraXBwZWRFbnRyaWVzSG9vazogYW55O1xuICBwcml2YXRlIF9zdGFydFRyYWlsaW5nUHJvbWlzZTogUHJvbWlzZTx2b2lkPjtcbiAgcHJpdmF0ZSBfcmVzb2x2ZVRpbWVvdXQ6IGFueTtcblxuICBwcml2YXRlIF9lbnRyeVF1ZXVlID0gbmV3IE1ldGVvci5fRG91YmxlRW5kZWRRdWV1ZSgpO1xuICBwcml2YXRlIF93b3JrZXJBY3RpdmUgPSBmYWxzZTtcbiAgcHJpdmF0ZSBfd29ya2VyUHJvbWlzZTogUHJvbWlzZTx2b2lkPiB8IG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKG9wbG9nVXJsOiBzdHJpbmcsIGRiTmFtZTogc3RyaW5nKSB7XG4gICAgdGhpcy5fb3Bsb2dVcmwgPSBvcGxvZ1VybDtcbiAgICB0aGlzLl9kYk5hbWUgPSBkYk5hbWU7XG5cbiAgICB0aGlzLl9yZXNvbHZlVGltZW91dCA9IG51bGw7XG4gICAgdGhpcy5fb3Bsb2dMYXN0RW50cnlDb25uZWN0aW9uID0gbnVsbDtcbiAgICB0aGlzLl9vcGxvZ1RhaWxDb25uZWN0aW9uID0gbnVsbDtcbiAgICB0aGlzLl9zdG9wcGVkID0gZmFsc2U7XG4gICAgdGhpcy5fdGFpbEhhbmRsZSA9IG51bGw7XG4gICAgdGhpcy5fcmVhZHlQcm9taXNlUmVzb2x2ZXIgPSBudWxsO1xuICAgIHRoaXMuX3JlYWR5UHJvbWlzZSA9IG5ldyBQcm9taXNlKHIgPT4gdGhpcy5fcmVhZHlQcm9taXNlUmVzb2x2ZXIgPSByKTsgXG4gICAgdGhpcy5fY3Jvc3NiYXIgPSBuZXcgRERQU2VydmVyLl9Dcm9zc2Jhcih7XG4gICAgICBmYWN0UGFja2FnZTogXCJtb25nby1saXZlZGF0YVwiLCBmYWN0TmFtZTogXCJvcGxvZy13YXRjaGVyc1wiXG4gICAgfSk7XG5cbiAgICBjb25zdCBpbmNsdWRlQ29sbGVjdGlvbnMgPVxuICAgICAgTWV0ZW9yLnNldHRpbmdzPy5wYWNrYWdlcz8ubW9uZ28/Lm9wbG9nSW5jbHVkZUNvbGxlY3Rpb25zO1xuICAgIGNvbnN0IGV4Y2x1ZGVDb2xsZWN0aW9ucyA9XG4gICAgICBNZXRlb3Iuc2V0dGluZ3M/LnBhY2thZ2VzPy5tb25nbz8ub3Bsb2dFeGNsdWRlQ29sbGVjdGlvbnM7XG4gICAgaWYgKGluY2x1ZGVDb2xsZWN0aW9ucz8ubGVuZ3RoICYmIGV4Y2x1ZGVDb2xsZWN0aW9ucz8ubGVuZ3RoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIFwiQ2FuJ3QgdXNlIGJvdGggbW9uZ28gb3Bsb2cgc2V0dGluZ3Mgb3Bsb2dJbmNsdWRlQ29sbGVjdGlvbnMgYW5kIG9wbG9nRXhjbHVkZUNvbGxlY3Rpb25zIGF0IHRoZSBzYW1lIHRpbWUuXCJcbiAgICAgICk7XG4gICAgfVxuICAgIHRoaXMuX29wbG9nT3B0aW9ucyA9IHsgaW5jbHVkZUNvbGxlY3Rpb25zLCBleGNsdWRlQ29sbGVjdGlvbnMgfTtcblxuICAgIHRoaXMuX2NhdGNoaW5nVXBSZXNvbHZlcnMgPSBbXTtcbiAgICB0aGlzLl9sYXN0UHJvY2Vzc2VkVFMgPSBudWxsO1xuXG4gICAgdGhpcy5fb25Ta2lwcGVkRW50cmllc0hvb2sgPSBuZXcgSG9vayh7XG4gICAgICBkZWJ1Z1ByaW50RXhjZXB0aW9uczogXCJvblNraXBwZWRFbnRyaWVzIGNhbGxiYWNrXCJcbiAgICB9KTtcblxuICAgIHRoaXMuX3N0YXJ0VHJhaWxpbmdQcm9taXNlID0gdGhpcy5fc3RhcnRUYWlsaW5nKCk7XG4gIH1cblxuICBwcml2YXRlIF9nZXRPcGxvZ1NlbGVjdG9yKGxhc3RQcm9jZXNzZWRUUz86IGFueSk6IGFueSB7XG4gICAgY29uc3Qgb3Bsb2dDcml0ZXJpYTogYW55ID0gW1xuICAgICAge1xuICAgICAgICAkb3I6IFtcbiAgICAgICAgICB7IG9wOiB7ICRpbjogW1wiaVwiLCBcInVcIiwgXCJkXCJdIH0gfSxcbiAgICAgICAgICB7IG9wOiBcImNcIiwgXCJvLmRyb3BcIjogeyAkZXhpc3RzOiB0cnVlIH0gfSxcbiAgICAgICAgICB7IG9wOiBcImNcIiwgXCJvLmRyb3BEYXRhYmFzZVwiOiAxIH0sXG4gICAgICAgICAgeyBvcDogXCJjXCIsIFwiby5hcHBseU9wc1wiOiB7ICRleGlzdHM6IHRydWUgfSB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICBdO1xuXG4gICAgY29uc3QgbnNSZWdleCA9IG5ldyBSZWdFeHAoXG4gICAgICBcIl4oPzpcIiArXG4gICAgICAgIFtcbiAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgTWV0ZW9yLl9lc2NhcGVSZWdFeHAodGhpcy5fZGJOYW1lICsgXCIuXCIpLFxuICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICBNZXRlb3IuX2VzY2FwZVJlZ0V4cChcImFkbWluLiRjbWRcIiksXG4gICAgICAgIF0uam9pbihcInxcIikgK1xuICAgICAgICBcIilcIlxuICAgICk7XG5cbiAgICBpZiAodGhpcy5fb3Bsb2dPcHRpb25zLmV4Y2x1ZGVDb2xsZWN0aW9ucz8ubGVuZ3RoKSB7XG4gICAgICBvcGxvZ0NyaXRlcmlhLnB1c2goe1xuICAgICAgICBuczoge1xuICAgICAgICAgICRyZWdleDogbnNSZWdleCxcbiAgICAgICAgICAkbmluOiB0aGlzLl9vcGxvZ09wdGlvbnMuZXhjbHVkZUNvbGxlY3Rpb25zLm1hcChcbiAgICAgICAgICAgIChjb2xsTmFtZTogc3RyaW5nKSA9PiBgJHt0aGlzLl9kYk5hbWV9LiR7Y29sbE5hbWV9YFxuICAgICAgICAgICksXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuX29wbG9nT3B0aW9ucy5pbmNsdWRlQ29sbGVjdGlvbnM/Lmxlbmd0aCkge1xuICAgICAgb3Bsb2dDcml0ZXJpYS5wdXNoKHtcbiAgICAgICAgJG9yOiBbXG4gICAgICAgICAgeyBuczogL15hZG1pblxcLlxcJGNtZC8gfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBuczoge1xuICAgICAgICAgICAgICAkaW46IHRoaXMuX29wbG9nT3B0aW9ucy5pbmNsdWRlQ29sbGVjdGlvbnMubWFwKFxuICAgICAgICAgICAgICAgIChjb2xsTmFtZTogc3RyaW5nKSA9PiBgJHt0aGlzLl9kYk5hbWV9LiR7Y29sbE5hbWV9YFxuICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9wbG9nQ3JpdGVyaWEucHVzaCh7XG4gICAgICAgIG5zOiBuc1JlZ2V4LFxuICAgICAgfSk7XG4gICAgfVxuICAgIGlmKGxhc3RQcm9jZXNzZWRUUykge1xuICAgICAgb3Bsb2dDcml0ZXJpYS5wdXNoKHtcbiAgICAgICAgdHM6IHsgJGd0OiBsYXN0UHJvY2Vzc2VkVFMgfSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAkYW5kOiBvcGxvZ0NyaXRlcmlhLFxuICAgIH07XG4gIH1cblxuICBhc3luYyBzdG9wKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLl9zdG9wcGVkKSByZXR1cm47XG4gICAgdGhpcy5fc3RvcHBlZCA9IHRydWU7XG4gICAgaWYgKHRoaXMuX3RhaWxIYW5kbGUpIHtcbiAgICAgIGF3YWl0IHRoaXMuX3RhaWxIYW5kbGUuc3RvcCgpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIF9vbk9wbG9nRW50cnkodHJpZ2dlcjogT3Bsb2dUcmlnZ2VyLCBjYWxsYmFjazogRnVuY3Rpb24pOiBQcm9taXNlPHsgc3RvcDogKCkgPT4gUHJvbWlzZTx2b2lkPiB9PiB7XG4gICAgaWYgKHRoaXMuX3N0b3BwZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbGxlZCBvbk9wbG9nRW50cnkgb24gc3RvcHBlZCBoYW5kbGUhXCIpO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMuX3JlYWR5UHJvbWlzZTtcblxuICAgIGNvbnN0IG9yaWdpbmFsQ2FsbGJhY2sgPSBjYWxsYmFjaztcblxuICAgIC8qKlxuICAgICAqIFRoaXMgZGVwZW5kcyBvbiBBc3luY2hyb25vdXNRdWV1ZSB0YXNrcyBiZWluZyB3cmFwcGVkIGluIGBiaW5kRW52aXJvbm1lbnRgIHRvby5cbiAgICAgKlxuICAgICAqIEB0b2RvIENoZWNrIGFmdGVyIHdlIHNpbXBsaWZ5IHRoZSBgYmluZEVudmlyb25tZW50YCBpbXBsZW1lbnRhdGlvbiBpZiB3ZSBjYW4gcmVtb3ZlIHRoZSBzZWNvbmQgd3JhcC5cbiAgICAgKi9cbiAgICBjYWxsYmFjayA9IE1ldGVvci5iaW5kRW52aXJvbm1lbnQoXG4gICAgICBmdW5jdGlvbiAobm90aWZpY2F0aW9uOiBhbnkpIHtcbiAgICAgICAgb3JpZ2luYWxDYWxsYmFjayhub3RpZmljYXRpb24pO1xuICAgICAgfSxcbiAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgTWV0ZW9yLl9kZWJ1ZyhcIkVycm9yIGluIG9wbG9nIGNhbGxiYWNrXCIsIGVycik7XG4gICAgICB9XG4gICAgKTtcblxuICAgIGNvbnN0IGxpc3RlbkhhbmRsZSA9IHRoaXMuX2Nyb3NzYmFyLmxpc3Rlbih0cmlnZ2VyLCBjYWxsYmFjayk7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0b3A6IGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgYXdhaXQgbGlzdGVuSGFuZGxlLnN0b3AoKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgb25PcGxvZ0VudHJ5KHRyaWdnZXI6IE9wbG9nVHJpZ2dlciwgY2FsbGJhY2s6IEZ1bmN0aW9uKTogUHJvbWlzZTx7IHN0b3A6ICgpID0+IFByb21pc2U8dm9pZD4gfT4ge1xuICAgIHJldHVybiB0aGlzLl9vbk9wbG9nRW50cnkodHJpZ2dlciwgY2FsbGJhY2spO1xuICB9XG5cbiAgb25Ta2lwcGVkRW50cmllcyhjYWxsYmFjazogRnVuY3Rpb24pOiB7IHN0b3A6ICgpID0+IHZvaWQgfSB7XG4gICAgaWYgKHRoaXMuX3N0b3BwZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbGxlZCBvblNraXBwZWRFbnRyaWVzIG9uIHN0b3BwZWQgaGFuZGxlIVwiKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX29uU2tpcHBlZEVudHJpZXNIb29rLnJlZ2lzdGVyKGNhbGxiYWNrKTtcbiAgfVxuXG4gIGFzeW5jIF93YWl0VW50aWxDYXVnaHRVcCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5fc3RvcHBlZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FsbGVkIHdhaXRVbnRpbENhdWdodFVwIG9uIHN0b3BwZWQgaGFuZGxlIVwiKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLl9yZWFkeVByb21pc2U7XG5cbiAgICBsZXQgbGFzdEVudHJ5OiBPcGxvZ0VudHJ5IHwgbnVsbCA9IG51bGw7XG5cbiAgICB3aGlsZSAoIXRoaXMuX3N0b3BwZWQpIHtcbiAgICAgIGNvbnN0IG9wbG9nU2VsZWN0b3IgPSB0aGlzLl9nZXRPcGxvZ1NlbGVjdG9yKCk7XG4gICAgICB0cnkge1xuICAgICAgICBsYXN0RW50cnkgPSBhd2FpdCB0aGlzLl9vcGxvZ0xhc3RFbnRyeUNvbm5lY3Rpb24uZmluZE9uZUFzeW5jKFxuICAgICAgICAgIE9QTE9HX0NPTExFQ1RJT04sXG4gICAgICAgICAgb3Bsb2dTZWxlY3RvcixcbiAgICAgICAgICB7IHByb2plY3Rpb246IHsgdHM6IDEgfSwgc29ydDogeyAkbmF0dXJhbDogLTEgfSB9XG4gICAgICAgICk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBNZXRlb3IuX2RlYnVnKFwiR290IGV4Y2VwdGlvbiB3aGlsZSByZWFkaW5nIGxhc3QgZW50cnlcIiwgZSk7XG4gICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgYXdhaXQgTWV0ZW9yLnNsZWVwKDEwMCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3N0b3BwZWQpIHJldHVybjtcblxuICAgIGlmICghbGFzdEVudHJ5KSByZXR1cm47XG5cbiAgICBjb25zdCB0cyA9IGxhc3RFbnRyeS50cztcbiAgICBpZiAoIXRzKSB7XG4gICAgICB0aHJvdyBFcnJvcihcIm9wbG9nIGVudHJ5IHdpdGhvdXQgdHM6IFwiICsgSlNPTi5zdHJpbmdpZnkobGFzdEVudHJ5KSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2xhc3RQcm9jZXNzZWRUUyAmJiB0cy5sZXNzVGhhbk9yRXF1YWwodGhpcy5fbGFzdFByb2Nlc3NlZFRTKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCBpbnNlcnRBZnRlciA9IHRoaXMuX2NhdGNoaW5nVXBSZXNvbHZlcnMubGVuZ3RoO1xuXG4gICAgd2hpbGUgKGluc2VydEFmdGVyIC0gMSA+IDAgJiYgdGhpcy5fY2F0Y2hpbmdVcFJlc29sdmVyc1tpbnNlcnRBZnRlciAtIDFdLnRzLmdyZWF0ZXJUaGFuKHRzKSkge1xuICAgICAgaW5zZXJ0QWZ0ZXItLTtcbiAgICB9XG5cbiAgICBsZXQgcHJvbWlzZVJlc29sdmVyID0gbnVsbDtcblxuICAgIGNvbnN0IHByb21pc2VUb0F3YWl0ID0gbmV3IFByb21pc2UociA9PiBwcm9taXNlUmVzb2x2ZXIgPSByKTtcblxuICAgIGNsZWFyVGltZW91dCh0aGlzLl9yZXNvbHZlVGltZW91dCk7XG5cbiAgICB0aGlzLl9yZXNvbHZlVGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcihcIk1ldGVvcjogb3Bsb2cgY2F0Y2hpbmcgdXAgdG9vayB0b28gbG9uZ1wiLCB7IHRzIH0pO1xuICAgIH0sIDEwMDAwKTtcblxuICAgIHRoaXMuX2NhdGNoaW5nVXBSZXNvbHZlcnMuc3BsaWNlKGluc2VydEFmdGVyLCAwLCB7IHRzLCByZXNvbHZlcjogcHJvbWlzZVJlc29sdmVyISB9KTtcblxuICAgIGF3YWl0IHByb21pc2VUb0F3YWl0O1xuXG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX3Jlc29sdmVUaW1lb3V0KTtcbiAgfVxuXG4gIGFzeW5jIHdhaXRVbnRpbENhdWdodFVwKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiB0aGlzLl93YWl0VW50aWxDYXVnaHRVcCgpO1xuICB9XG5cbiAgYXN5bmMgX3N0YXJ0VGFpbGluZygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBtb25nb2RiVXJpID0gcmVxdWlyZSgnbW9uZ29kYi11cmknKTtcbiAgICBpZiAobW9uZ29kYlVyaS5wYXJzZSh0aGlzLl9vcGxvZ1VybCkuZGF0YWJhc2UgIT09ICdsb2NhbCcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIiRNT05HT19PUExPR19VUkwgbXVzdCBiZSBzZXQgdG8gdGhlICdsb2NhbCcgZGF0YWJhc2Ugb2YgYSBNb25nbyByZXBsaWNhIHNldFwiKTtcbiAgICB9XG5cbiAgICB0aGlzLl9vcGxvZ1RhaWxDb25uZWN0aW9uID0gbmV3IE1vbmdvQ29ubmVjdGlvbihcbiAgICAgIHRoaXMuX29wbG9nVXJsLCB7IG1heFBvb2xTaXplOiAxLCBtaW5Qb29sU2l6ZTogMSB9XG4gICAgKTtcbiAgICB0aGlzLl9vcGxvZ0xhc3RFbnRyeUNvbm5lY3Rpb24gPSBuZXcgTW9uZ29Db25uZWN0aW9uKFxuICAgICAgdGhpcy5fb3Bsb2dVcmwsIHsgbWF4UG9vbFNpemU6IDEsIG1pblBvb2xTaXplOiAxIH1cbiAgICApO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGlzTWFzdGVyRG9jID0gYXdhaXQgdGhpcy5fb3Bsb2dMYXN0RW50cnlDb25uZWN0aW9uIS5kYlxuICAgICAgICAuYWRtaW4oKVxuICAgICAgICAuY29tbWFuZCh7IGlzbWFzdGVyOiAxIH0pO1xuXG4gICAgICBpZiAoIShpc01hc3RlckRvYyAmJiBpc01hc3RlckRvYy5zZXROYW1lKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCIkTU9OR09fT1BMT0dfVVJMIG11c3QgYmUgc2V0IHRvIHRoZSAnbG9jYWwnIGRhdGFiYXNlIG9mIGEgTW9uZ28gcmVwbGljYSBzZXRcIik7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGxhc3RPcGxvZ0VudHJ5ID0gYXdhaXQgdGhpcy5fb3Bsb2dMYXN0RW50cnlDb25uZWN0aW9uLmZpbmRPbmVBc3luYyhcbiAgICAgICAgT1BMT0dfQ09MTEVDVElPTixcbiAgICAgICAge30sXG4gICAgICAgIHsgc29ydDogeyAkbmF0dXJhbDogLTEgfSwgcHJvamVjdGlvbjogeyB0czogMSB9IH1cbiAgICAgICk7XG5cbiAgICAgIGNvbnN0IG9wbG9nU2VsZWN0b3IgPSB0aGlzLl9nZXRPcGxvZ1NlbGVjdG9yKGxhc3RPcGxvZ0VudHJ5Py50cyk7XG4gICAgICBpZiAobGFzdE9wbG9nRW50cnkpIHtcbiAgICAgICAgdGhpcy5fbGFzdFByb2Nlc3NlZFRTID0gbGFzdE9wbG9nRW50cnkudHM7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGN1cnNvckRlc2NyaXB0aW9uID0gbmV3IEN1cnNvckRlc2NyaXB0aW9uKFxuICAgICAgICBPUExPR19DT0xMRUNUSU9OLFxuICAgICAgICBvcGxvZ1NlbGVjdG9yLFxuICAgICAgICB7IHRhaWxhYmxlOiB0cnVlIH1cbiAgICAgICk7XG5cbiAgICAgIHRoaXMuX3RhaWxIYW5kbGUgPSB0aGlzLl9vcGxvZ1RhaWxDb25uZWN0aW9uLnRhaWwoXG4gICAgICAgIGN1cnNvckRlc2NyaXB0aW9uLFxuICAgICAgICAoZG9jOiBhbnkpID0+IHtcbiAgICAgICAgICB0aGlzLl9lbnRyeVF1ZXVlLnB1c2goZG9jKTtcbiAgICAgICAgICB0aGlzLl9tYXliZVN0YXJ0V29ya2VyKCk7XG4gICAgICAgIH0sXG4gICAgICAgIFRBSUxfVElNRU9VVFxuICAgICAgKTtcblxuICAgICAgdGhpcy5fcmVhZHlQcm9taXNlUmVzb2x2ZXIhKCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluIF9zdGFydFRhaWxpbmc6JywgZXJyb3IpO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfbWF5YmVTdGFydFdvcmtlcigpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5fd29ya2VyUHJvbWlzZSkgcmV0dXJuO1xuICAgIHRoaXMuX3dvcmtlckFjdGl2ZSA9IHRydWU7XG5cbiAgICAvLyBDb252ZXJ0IHRvIGEgcHJvcGVyIHByb21pc2UtYmFzZWQgcXVldWUgcHJvY2Vzc29yXG4gICAgdGhpcy5fd29ya2VyUHJvbWlzZSA9IChhc3luYyAoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICB3aGlsZSAoIXRoaXMuX3N0b3BwZWQgJiYgIXRoaXMuX2VudHJ5UXVldWUuaXNFbXB0eSgpKSB7XG4gICAgICAgICAgLy8gQXJlIHdlIHRvbyBmYXIgYmVoaW5kPyBKdXN0IHRlbGwgb3VyIG9ic2VydmVycyB0aGF0IHRoZXkgbmVlZCB0b1xuICAgICAgICAgIC8vIHJlcG9sbCwgYW5kIGRyb3Agb3VyIHF1ZXVlLlxuICAgICAgICAgIGlmICh0aGlzLl9lbnRyeVF1ZXVlLmxlbmd0aCA+IFRPT19GQVJfQkVISU5EKSB7XG4gICAgICAgICAgICBjb25zdCBsYXN0RW50cnkgPSB0aGlzLl9lbnRyeVF1ZXVlLnBvcCgpO1xuICAgICAgICAgICAgdGhpcy5fZW50cnlRdWV1ZS5jbGVhcigpO1xuXG4gICAgICAgICAgICB0aGlzLl9vblNraXBwZWRFbnRyaWVzSG9vay5lYWNoKChjYWxsYmFjazogRnVuY3Rpb24pID0+IHtcbiAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gRnJlZSBhbnkgd2FpdFVudGlsQ2F1Z2h0VXAoKSBjYWxscyB0aGF0IHdlcmUgd2FpdGluZyBmb3IgdXMgdG9cbiAgICAgICAgICAgIC8vIHBhc3Mgc29tZXRoaW5nIHRoYXQgd2UganVzdCBza2lwcGVkLlxuICAgICAgICAgICAgdGhpcy5fc2V0TGFzdFByb2Nlc3NlZFRTKGxhc3RFbnRyeS50cyk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBQcm9jZXNzIG5leHQgYmF0Y2ggZnJvbSB0aGUgcXVldWVcbiAgICAgICAgICBjb25zdCBkb2MgPSB0aGlzLl9lbnRyeVF1ZXVlLnNoaWZ0KCk7XG5cbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgaGFuZGxlRG9jKHRoaXMsIGRvYyk7XG4gICAgICAgICAgICAvLyBQcm9jZXNzIGFueSB3YWl0aW5nIGZlbmNlIGNhbGxiYWNrc1xuICAgICAgICAgICAgaWYgKGRvYy50cykge1xuICAgICAgICAgICAgICB0aGlzLl9zZXRMYXN0UHJvY2Vzc2VkVFMoZG9jLnRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBLZWVwIHByb2Nlc3NpbmcgcXVldWUgZXZlbiBpZiBvbmUgZW50cnkgZmFpbHNcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHByb2Nlc3Npbmcgb3Bsb2cgZW50cnk6JywgZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICB0aGlzLl93b3JrZXJQcm9taXNlID0gbnVsbDtcbiAgICAgICAgdGhpcy5fd29ya2VyQWN0aXZlID0gZmFsc2U7XG4gICAgICB9XG4gICAgfSkoKTtcbiAgfVxuXG4gIF9zZXRMYXN0UHJvY2Vzc2VkVFModHM6IGFueSk6IHZvaWQge1xuICAgIHRoaXMuX2xhc3RQcm9jZXNzZWRUUyA9IHRzO1xuICAgIHdoaWxlICghaXNFbXB0eSh0aGlzLl9jYXRjaGluZ1VwUmVzb2x2ZXJzKSAmJiB0aGlzLl9jYXRjaGluZ1VwUmVzb2x2ZXJzWzBdLnRzLmxlc3NUaGFuT3JFcXVhbCh0aGlzLl9sYXN0UHJvY2Vzc2VkVFMpKSB7XG4gICAgICBjb25zdCBzZXF1ZW5jZXIgPSB0aGlzLl9jYXRjaGluZ1VwUmVzb2x2ZXJzLnNoaWZ0KCkhO1xuICAgICAgc2VxdWVuY2VyLnJlc29sdmVyKCk7XG4gICAgfVxuICB9XG5cbiAgX2RlZmluZVRvb0ZhckJlaGluZCh2YWx1ZTogbnVtYmVyKTogdm9pZCB7XG4gICAgVE9PX0ZBUl9CRUhJTkQgPSB2YWx1ZTtcbiAgfVxuXG4gIF9yZXNldFRvb0ZhckJlaGluZCgpOiB2b2lkIHtcbiAgICBUT09fRkFSX0JFSElORCA9ICsocHJvY2Vzcy5lbnYuTUVURU9SX09QTE9HX1RPT19GQVJfQkVISU5EIHx8IDIwMDApO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpZEZvck9wKG9wOiBPcGxvZ0VudHJ5KTogc3RyaW5nIHtcbiAgaWYgKG9wLm9wID09PSAnZCcgfHwgb3Aub3AgPT09ICdpJykge1xuICAgIHJldHVybiBvcC5vLl9pZDtcbiAgfSBlbHNlIGlmIChvcC5vcCA9PT0gJ3UnKSB7XG4gICAgcmV0dXJuIG9wLm8yLl9pZDtcbiAgfSBlbHNlIGlmIChvcC5vcCA9PT0gJ2MnKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJPcGVyYXRvciAnYycgZG9lc24ndCBzdXBwbHkgYW4gb2JqZWN0IHdpdGggaWQ6IFwiICsgSlNPTi5zdHJpbmdpZnkob3ApKTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBFcnJvcihcIlVua25vd24gb3A6IFwiICsgSlNPTi5zdHJpbmdpZnkob3ApKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVEb2MoaGFuZGxlOiBPcGxvZ0hhbmRsZSwgZG9jOiBPcGxvZ0VudHJ5KTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChkb2MubnMgPT09IFwiYWRtaW4uJGNtZFwiKSB7XG4gICAgaWYgKGRvYy5vLmFwcGx5T3BzKSB7XG4gICAgICAvLyBUaGlzIHdhcyBhIHN1Y2Nlc3NmdWwgdHJhbnNhY3Rpb24sIHNvIHdlIG5lZWQgdG8gYXBwbHkgdGhlXG4gICAgICAvLyBvcGVyYXRpb25zIHRoYXQgd2VyZSBpbnZvbHZlZC5cbiAgICAgIGxldCBuZXh0VGltZXN0YW1wID0gZG9jLnRzO1xuICAgICAgZm9yIChjb25zdCBvcCBvZiBkb2Muby5hcHBseU9wcykge1xuICAgICAgICAvLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL21ldGVvci9tZXRlb3IvaXNzdWVzLzEwNDIwLlxuICAgICAgICBpZiAoIW9wLnRzKSB7XG4gICAgICAgICAgb3AudHMgPSBuZXh0VGltZXN0YW1wO1xuICAgICAgICAgIG5leHRUaW1lc3RhbXAgPSBuZXh0VGltZXN0YW1wLmFkZChMb25nLk9ORSk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgaGFuZGxlRG9jKGhhbmRsZSwgb3ApO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIGNvbW1hbmQgXCIgKyBKU09OLnN0cmluZ2lmeShkb2MpKTtcbiAgfVxuXG4gIGNvbnN0IHRyaWdnZXI6IE9wbG9nVHJpZ2dlciA9IHtcbiAgICBkcm9wQ29sbGVjdGlvbjogZmFsc2UsXG4gICAgZHJvcERhdGFiYXNlOiBmYWxzZSxcbiAgICBvcDogZG9jLFxuICB9O1xuXG4gIGlmICh0eXBlb2YgZG9jLm5zID09PSBcInN0cmluZ1wiICYmIGRvYy5ucy5zdGFydHNXaXRoKGhhbmRsZS5fZGJOYW1lICsgXCIuXCIpKSB7XG4gICAgdHJpZ2dlci5jb2xsZWN0aW9uID0gZG9jLm5zLnNsaWNlKGhhbmRsZS5fZGJOYW1lLmxlbmd0aCArIDEpO1xuICB9XG5cbiAgLy8gSXMgaXQgYSBzcGVjaWFsIGNvbW1hbmQgYW5kIHRoZSBjb2xsZWN0aW9uIG5hbWUgaXMgaGlkZGVuXG4gIC8vIHNvbWV3aGVyZSBpbiBvcGVyYXRvcj9cbiAgaWYgKHRyaWdnZXIuY29sbGVjdGlvbiA9PT0gXCIkY21kXCIpIHtcbiAgICBpZiAoZG9jLm8uZHJvcERhdGFiYXNlKSB7XG4gICAgICBkZWxldGUgdHJpZ2dlci5jb2xsZWN0aW9uO1xuICAgICAgdHJpZ2dlci5kcm9wRGF0YWJhc2UgPSB0cnVlO1xuICAgIH0gZWxzZSBpZiAoXCJkcm9wXCIgaW4gZG9jLm8pIHtcbiAgICAgIHRyaWdnZXIuY29sbGVjdGlvbiA9IGRvYy5vLmRyb3A7XG4gICAgICB0cmlnZ2VyLmRyb3BDb2xsZWN0aW9uID0gdHJ1ZTtcbiAgICAgIHRyaWdnZXIuaWQgPSBudWxsO1xuICAgIH0gZWxzZSBpZiAoXCJjcmVhdGVcIiBpbiBkb2MubyAmJiBcImlkSW5kZXhcIiBpbiBkb2Mubykge1xuICAgICAgLy8gQSBjb2xsZWN0aW9uIGdvdCBpbXBsaWNpdGx5IGNyZWF0ZWQgd2l0aGluIGEgdHJhbnNhY3Rpb24uIFRoZXJlJ3NcbiAgICAgIC8vIG5vIG5lZWQgdG8gZG8gYW55dGhpbmcgYWJvdXQgaXQuXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IEVycm9yKFwiVW5rbm93biBjb21tYW5kIFwiICsgSlNPTi5zdHJpbmdpZnkoZG9jKSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIEFsbCBvdGhlciBvcHMgaGF2ZSBhbiBpZC5cbiAgICB0cmlnZ2VyLmlkID0gaWRGb3JPcChkb2MpO1xuICB9XG5cbiAgYXdhaXQgaGFuZGxlLl9jcm9zc2Jhci5maXJlKHRyaWdnZXIpO1xuXG4gIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0SW1tZWRpYXRlKHJlc29sdmUpKTtcbn0iLCJpbXBvcnQgaXNFbXB0eSBmcm9tIFwibG9kYXNoLmlzZW1wdHlcIjtcbmltcG9ydCB7IE9ic2VydmVIYW5kbGUgfSBmcm9tIFwiLi9vYnNlcnZlX2hhbmRsZVwiO1xuXG5pbnRlcmZhY2UgT2JzZXJ2ZU11bHRpcGxleGVyT3B0aW9ucyB7XG4gIG9yZGVyZWQ6IGJvb2xlYW47XG4gIG9uU3RvcD86ICgpID0+IHZvaWQ7XG59XG5cbmV4cG9ydCB0eXBlIE9ic2VydmVIYW5kbGVDYWxsYmFjayA9XG4gIHwgXCJhZGRlZFwiXG4gIHwgXCJhZGRlZEJlZm9yZVwiXG4gIHwgXCJjaGFuZ2VkXCJcbiAgfCBcIm1vdmVkQmVmb3JlXCJcbiAgfCBcInJlbW92ZWRcIjtcblxuLyoqXG4gKiBBbGxvd3MgbXVsdGlwbGUgaWRlbnRpY2FsIE9ic2VydmVIYW5kbGVzIHRvIGJlIGRyaXZlbiBieSBhIHNpbmdsZSBvYnNlcnZlIGRyaXZlci5cbiAqXG4gKiBUaGlzIG9wdGltaXphdGlvbiBlbnN1cmVzIHRoYXQgbXVsdGlwbGUgaWRlbnRpY2FsIG9ic2VydmF0aW9uc1xuICogZG9uJ3QgcmVzdWx0IGluIGR1cGxpY2F0ZSBkYXRhYmFzZSBxdWVyaWVzLlxuICovXG5leHBvcnQgY2xhc3MgT2JzZXJ2ZU11bHRpcGxleGVyIHtcbiAgcHJpdmF0ZSByZWFkb25seSBfb3JkZXJlZDogYm9vbGVhbjtcbiAgcHJpdmF0ZSByZWFkb25seSBfb25TdG9wOiAoKSA9PiB2b2lkO1xuICBwcml2YXRlIF9xdWV1ZTogYW55O1xuICBwcml2YXRlIF9oYW5kbGVzOiB7IFtrZXk6IHN0cmluZ106IE9ic2VydmVIYW5kbGUgfSB8IG51bGw7XG4gIHByaXZhdGUgX3Jlc29sdmVyOiAoKHZhbHVlPzogdW5rbm93bikgPT4gdm9pZCkgfCBudWxsO1xuICBwcml2YXRlIHJlYWRvbmx5IF9yZWFkeVByb21pc2U6IFByb21pc2U8Ym9vbGVhbiB8IHZvaWQ+O1xuICBwcml2YXRlIF9pc1JlYWR5OiBib29sZWFuO1xuICBwcml2YXRlIF9jYWNoZTogYW55O1xuICBwcml2YXRlIF9hZGRIYW5kbGVUYXNrc1NjaGVkdWxlZEJ1dE5vdFBlcmZvcm1lZDogbnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKHsgb3JkZXJlZCwgb25TdG9wID0gKCkgPT4ge30gfTogT2JzZXJ2ZU11bHRpcGxleGVyT3B0aW9ucykge1xuICAgIGlmIChvcmRlcmVkID09PSB1bmRlZmluZWQpIHRocm93IEVycm9yKFwibXVzdCBzcGVjaWZ5IG9yZGVyZWRcIik7XG5cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgUGFja2FnZVtcImZhY3RzLWJhc2VcIl0gJiZcbiAgICAgIFBhY2thZ2VbXCJmYWN0cy1iYXNlXCJdLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgICAgIFwibW9uZ28tbGl2ZWRhdGFcIixcbiAgICAgICAgXCJvYnNlcnZlLW11bHRpcGxleGVyc1wiLFxuICAgICAgICAxXG4gICAgICApO1xuXG4gICAgdGhpcy5fb3JkZXJlZCA9IG9yZGVyZWQ7XG4gICAgdGhpcy5fb25TdG9wID0gb25TdG9wO1xuICAgIHRoaXMuX3F1ZXVlID0gbmV3IE1ldGVvci5fQXN5bmNocm9ub3VzUXVldWUoKTtcbiAgICB0aGlzLl9oYW5kbGVzID0ge307XG4gICAgdGhpcy5fcmVzb2x2ZXIgPSBudWxsO1xuICAgIHRoaXMuX2lzUmVhZHkgPSBmYWxzZTtcbiAgICB0aGlzLl9yZWFkeVByb21pc2UgPSBuZXcgUHJvbWlzZSgocikgPT4gKHRoaXMuX3Jlc29sdmVyID0gcikpLnRoZW4oXG4gICAgICAoKSA9PiAodGhpcy5faXNSZWFkeSA9IHRydWUpXG4gICAgKTtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgdGhpcy5fY2FjaGUgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9DYWNoaW5nQ2hhbmdlT2JzZXJ2ZXIoeyBvcmRlcmVkIH0pO1xuICAgIHRoaXMuX2FkZEhhbmRsZVRhc2tzU2NoZWR1bGVkQnV0Tm90UGVyZm9ybWVkID0gMDtcblxuICAgIHRoaXMuY2FsbGJhY2tOYW1lcygpLmZvckVhY2goKGNhbGxiYWNrTmFtZSkgPT4ge1xuICAgICAgKHRoaXMgYXMgYW55KVtjYWxsYmFja05hbWVdID0gKC4uLmFyZ3M6IGFueVtdKSA9PiB7XG4gICAgICAgIHRoaXMuX2FwcGx5Q2FsbGJhY2soY2FsbGJhY2tOYW1lLCBhcmdzKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBhZGRIYW5kbGVBbmRTZW5kSW5pdGlhbEFkZHMoaGFuZGxlOiBPYnNlcnZlSGFuZGxlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIHRoaXMuX2FkZEhhbmRsZUFuZFNlbmRJbml0aWFsQWRkcyhoYW5kbGUpO1xuICB9XG5cbiAgYXN5bmMgX2FkZEhhbmRsZUFuZFNlbmRJbml0aWFsQWRkcyhoYW5kbGU6IE9ic2VydmVIYW5kbGUpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICArK3RoaXMuX2FkZEhhbmRsZVRhc2tzU2NoZWR1bGVkQnV0Tm90UGVyZm9ybWVkO1xuXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIFBhY2thZ2VbXCJmYWN0cy1iYXNlXCJdICYmXG4gICAgICBQYWNrYWdlW1wiZmFjdHMtYmFzZVwiXS5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgICAgICBcIm1vbmdvLWxpdmVkYXRhXCIsXG4gICAgICAgIFwib2JzZXJ2ZS1oYW5kbGVzXCIsXG4gICAgICAgIDFcbiAgICAgICk7XG5cbiAgICBhd2FpdCB0aGlzLl9xdWV1ZS5ydW5UYXNrKGFzeW5jICgpID0+IHtcbiAgICAgIHRoaXMuX2hhbmRsZXMhW2hhbmRsZS5faWRdID0gaGFuZGxlO1xuICAgICAgYXdhaXQgdGhpcy5fc2VuZEFkZHMoaGFuZGxlKTtcbiAgICAgIC0tdGhpcy5fYWRkSGFuZGxlVGFza3NTY2hlZHVsZWRCdXROb3RQZXJmb3JtZWQ7XG4gICAgfSk7XG5cbiAgICBhd2FpdCB0aGlzLl9yZWFkeVByb21pc2U7XG4gIH1cblxuICBhc3luYyByZW1vdmVIYW5kbGUoaWQ6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy5fcmVhZHkoKSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IHJlbW92ZSBoYW5kbGVzIHVudGlsIHRoZSBtdWx0aXBsZXggaXMgcmVhZHlcIik7XG5cbiAgICBkZWxldGUgdGhpcy5faGFuZGxlcyFbaWRdO1xuXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIFBhY2thZ2VbXCJmYWN0cy1iYXNlXCJdICYmXG4gICAgICBQYWNrYWdlW1wiZmFjdHMtYmFzZVwiXS5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgICAgICBcIm1vbmdvLWxpdmVkYXRhXCIsXG4gICAgICAgIFwib2JzZXJ2ZS1oYW5kbGVzXCIsXG4gICAgICAgIC0xXG4gICAgICApO1xuXG4gICAgaWYgKFxuICAgICAgaXNFbXB0eSh0aGlzLl9oYW5kbGVzKSAmJlxuICAgICAgdGhpcy5fYWRkSGFuZGxlVGFza3NTY2hlZHVsZWRCdXROb3RQZXJmb3JtZWQgPT09IDBcbiAgICApIHtcbiAgICAgIGF3YWl0IHRoaXMuX3N0b3AoKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBfc3RvcChvcHRpb25zOiB7IGZyb21RdWVyeUVycm9yPzogYm9vbGVhbiB9ID0ge30pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuX3JlYWR5KCkgJiYgIW9wdGlvbnMuZnJvbVF1ZXJ5RXJyb3IpXG4gICAgICB0aHJvdyBFcnJvcihcInN1cnByaXNpbmcgX3N0b3A6IG5vdCByZWFkeVwiKTtcblxuICAgIGF3YWl0IHRoaXMuX29uU3RvcCgpO1xuXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIFBhY2thZ2VbXCJmYWN0cy1iYXNlXCJdICYmXG4gICAgICBQYWNrYWdlW1wiZmFjdHMtYmFzZVwiXS5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgICAgICBcIm1vbmdvLWxpdmVkYXRhXCIsXG4gICAgICAgIFwib2JzZXJ2ZS1tdWx0aXBsZXhlcnNcIixcbiAgICAgICAgLTFcbiAgICAgICk7XG5cbiAgICB0aGlzLl9oYW5kbGVzID0gbnVsbDtcbiAgfVxuXG4gIGFzeW5jIHJlYWR5KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuX3F1ZXVlLnF1ZXVlVGFzaygoKSA9PiB7XG4gICAgICBpZiAodGhpcy5fcmVhZHkoKSlcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJjYW4ndCBtYWtlIE9ic2VydmVNdWx0aXBsZXggcmVhZHkgdHdpY2UhXCIpO1xuXG4gICAgICBpZiAoIXRoaXMuX3Jlc29sdmVyKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgcmVzb2x2ZXJcIik7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX3Jlc29sdmVyKCk7XG4gICAgICB0aGlzLl9pc1JlYWR5ID0gdHJ1ZTtcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIHF1ZXJ5RXJyb3IoZXJyOiBFcnJvcik6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuX3F1ZXVlLnJ1blRhc2soKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuX3JlYWR5KCkpXG4gICAgICAgIHRocm93IEVycm9yKFwiY2FuJ3QgY2xhaW0gcXVlcnkgaGFzIGFuIGVycm9yIGFmdGVyIGl0IHdvcmtlZCFcIik7XG4gICAgICB0aGlzLl9zdG9wKHsgZnJvbVF1ZXJ5RXJyb3I6IHRydWUgfSk7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBvbkZsdXNoKGNiOiAoKSA9PiB2b2lkKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5fcXVldWUucXVldWVUYXNrKGFzeW5jICgpID0+IHtcbiAgICAgIGlmICghdGhpcy5fcmVhZHkoKSlcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJvbmx5IGNhbGwgb25GbHVzaCBvbiBhIG11bHRpcGxleGVyIHRoYXQgd2lsbCBiZSByZWFkeVwiKTtcbiAgICAgIGF3YWl0IGNiKCk7XG4gICAgfSk7XG4gIH1cblxuICBjYWxsYmFja05hbWVzKCk6IE9ic2VydmVIYW5kbGVDYWxsYmFja1tdIHtcbiAgICByZXR1cm4gdGhpcy5fb3JkZXJlZFxuICAgICAgPyBbXCJhZGRlZEJlZm9yZVwiLCBcImNoYW5nZWRcIiwgXCJtb3ZlZEJlZm9yZVwiLCBcInJlbW92ZWRcIl1cbiAgICAgIDogW1wiYWRkZWRcIiwgXCJjaGFuZ2VkXCIsIFwicmVtb3ZlZFwiXTtcbiAgfVxuXG4gIF9yZWFkeSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gISF0aGlzLl9pc1JlYWR5O1xuICB9XG5cbiAgX2FwcGx5Q2FsbGJhY2soY2FsbGJhY2tOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueVtdKSB7XG4gICAgdGhpcy5fcXVldWUucXVldWVUYXNrKGFzeW5jICgpID0+IHtcbiAgICAgIGlmICghdGhpcy5faGFuZGxlcykgcmV0dXJuO1xuXG4gICAgICBhd2FpdCB0aGlzLl9jYWNoZS5hcHBseUNoYW5nZVtjYWxsYmFja05hbWVdLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgaWYgKFxuICAgICAgICAhdGhpcy5fcmVhZHkoKSAmJlxuICAgICAgICBjYWxsYmFja05hbWUgIT09IFwiYWRkZWRcIiAmJlxuICAgICAgICBjYWxsYmFja05hbWUgIT09IFwiYWRkZWRCZWZvcmVcIlxuICAgICAgKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgR290ICR7Y2FsbGJhY2tOYW1lfSBkdXJpbmcgaW5pdGlhbCBhZGRzYCk7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgaGFuZGxlSWQgb2YgT2JqZWN0LmtleXModGhpcy5faGFuZGxlcykpIHtcbiAgICAgICAgY29uc3QgaGFuZGxlID0gdGhpcy5faGFuZGxlcyAmJiB0aGlzLl9oYW5kbGVzW2hhbmRsZUlkXTtcblxuICAgICAgICBpZiAoIWhhbmRsZSkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IGNhbGxiYWNrID0gKGhhbmRsZSBhcyBhbnkpW2BfJHtjYWxsYmFja05hbWV9YF07XG5cbiAgICAgICAgaWYgKCFjYWxsYmFjaykgY29udGludWU7XG5cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gY2FsbGJhY2suYXBwbHkoXG4gICAgICAgICAgbnVsbCxcbiAgICAgICAgICBoYW5kbGUubm9uTXV0YXRpbmdDYWxsYmFja3MgPyBhcmdzIDogRUpTT04uY2xvbmUoYXJncylcbiAgICAgICAgKTtcblxuICAgICAgICBpZiAocmVzdWx0ICYmIE1ldGVvci5faXNQcm9taXNlKHJlc3VsdCkpIHtcbiAgICAgICAgICByZXN1bHQuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgICAgICBgRXJyb3IgaW4gb2JzZXJ2ZUNoYW5nZXMgY2FsbGJhY2sgJHtjYWxsYmFja05hbWV9OmAsXG4gICAgICAgICAgICAgIGVycm9yXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGhhbmRsZS5pbml0aWFsQWRkc1NlbnQudGhlbihyZXN1bHQpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgX3NlbmRBZGRzKGhhbmRsZTogT2JzZXJ2ZUhhbmRsZSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGFkZCA9IHRoaXMuX29yZGVyZWQgPyBoYW5kbGUuX2FkZGVkQmVmb3JlIDogaGFuZGxlLl9hZGRlZDtcbiAgICBpZiAoIWFkZCkgcmV0dXJuO1xuXG4gICAgY29uc3QgYWRkUHJvbWlzZXM6IChQcm9taXNlPHZvaWQ+IHwgdm9pZClbXSA9IFtdO1xuXG4gICAgLy8gbm90ZTogZG9jcyBtYXkgYmUgYW4gX0lkTWFwIG9yIGFuIE9yZGVyZWREaWN0XG4gICAgdGhpcy5fY2FjaGUuZG9jcy5mb3JFYWNoKChkb2M6IGFueSwgaWQ6IHN0cmluZykgPT4ge1xuICAgICAgaWYgKCEoaGFuZGxlLl9pZCBpbiB0aGlzLl9oYW5kbGVzISkpIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJoYW5kbGUgZ290IHJlbW92ZWQgYmVmb3JlIHNlbmRpbmcgaW5pdGlhbCBhZGRzIVwiKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgeyBfaWQsIC4uLmZpZWxkcyB9ID0gaGFuZGxlLm5vbk11dGF0aW5nQ2FsbGJhY2tzXG4gICAgICAgID8gZG9jXG4gICAgICAgIDogRUpTT04uY2xvbmUoZG9jKTtcblxuICAgICAgY29uc3QgcHJvbWlzZSA9IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCByID0gdGhpcy5fb3JkZXJlZCA/IGFkZChpZCwgZmllbGRzLCBudWxsKSA6IGFkZChpZCwgZmllbGRzKTtcbiAgICAgICAgICByZXNvbHZlKHIpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBhZGRQcm9taXNlcy5wdXNoKHByb21pc2UpO1xuICAgIH0pO1xuXG4gICAgYXdhaXQgUHJvbWlzZS5hbGxTZXR0bGVkKGFkZFByb21pc2VzKS50aGVuKChwKSA9PiB7XG4gICAgICBwLmZvckVhY2goKHJlc3VsdCkgPT4ge1xuICAgICAgICBpZiAocmVzdWx0LnN0YXR1cyA9PT0gXCJyZWplY3RlZFwiKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgaW4gYWRkcyBmb3IgaGFuZGxlOiAke3Jlc3VsdC5yZWFzb259YCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgaGFuZGxlLmluaXRpYWxBZGRzU2VudFJlc29sdmVyKCk7XG4gIH1cbn1cbiIsImV4cG9ydCBjbGFzcyBEb2NGZXRjaGVyIHtcbiAgY29uc3RydWN0b3IobW9uZ29Db25uZWN0aW9uKSB7XG4gICAgdGhpcy5fbW9uZ29Db25uZWN0aW9uID0gbW9uZ29Db25uZWN0aW9uO1xuICAgIC8vIE1hcCBmcm9tIG9wIC0+IFtjYWxsYmFja11cbiAgICB0aGlzLl9jYWxsYmFja3NGb3JPcCA9IG5ldyBNYXAoKTtcbiAgfVxuXG4gIC8vIEZldGNoZXMgZG9jdW1lbnQgXCJpZFwiIGZyb20gY29sbGVjdGlvbk5hbWUsIHJldHVybmluZyBpdCBvciBudWxsIGlmIG5vdFxuICAvLyBmb3VuZC5cbiAgLy9cbiAgLy8gSWYgeW91IG1ha2UgbXVsdGlwbGUgY2FsbHMgdG8gZmV0Y2goKSB3aXRoIHRoZSBzYW1lIG9wIHJlZmVyZW5jZSxcbiAgLy8gRG9jRmV0Y2hlciBtYXkgYXNzdW1lIHRoYXQgdGhleSBhbGwgcmV0dXJuIHRoZSBzYW1lIGRvY3VtZW50LiAoSXQgZG9lc1xuICAvLyBub3QgY2hlY2sgdG8gc2VlIGlmIGNvbGxlY3Rpb25OYW1lL2lkIG1hdGNoLilcbiAgLy9cbiAgLy8gWW91IG1heSBhc3N1bWUgdGhhdCBjYWxsYmFjayBpcyBuZXZlciBjYWxsZWQgc3luY2hyb25vdXNseSAoYW5kIGluIGZhY3RcbiAgLy8gT3Bsb2dPYnNlcnZlRHJpdmVyIGRvZXMgc28pLlxuICBhc3luYyBmZXRjaChjb2xsZWN0aW9uTmFtZSwgaWQsIG9wLCBjYWxsYmFjaykge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuXG4gICAgXG4gICAgY2hlY2soY29sbGVjdGlvbk5hbWUsIFN0cmluZyk7XG4gICAgY2hlY2sob3AsIE9iamVjdCk7XG5cblxuICAgIC8vIElmIHRoZXJlJ3MgYWxyZWFkeSBhbiBpbi1wcm9ncmVzcyBmZXRjaCBmb3IgdGhpcyBjYWNoZSBrZXksIHlpZWxkIHVudGlsXG4gICAgLy8gaXQncyBkb25lIGFuZCByZXR1cm4gd2hhdGV2ZXIgaXQgcmV0dXJucy5cbiAgICBpZiAoc2VsZi5fY2FsbGJhY2tzRm9yT3AuaGFzKG9wKSkge1xuICAgICAgc2VsZi5fY2FsbGJhY2tzRm9yT3AuZ2V0KG9wKS5wdXNoKGNhbGxiYWNrKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjYWxsYmFja3MgPSBbY2FsbGJhY2tdO1xuICAgIHNlbGYuX2NhbGxiYWNrc0Zvck9wLnNldChvcCwgY2FsbGJhY2tzKTtcblxuICAgIHRyeSB7XG4gICAgICB2YXIgZG9jID1cbiAgICAgICAgKGF3YWl0IHNlbGYuX21vbmdvQ29ubmVjdGlvbi5maW5kT25lQXN5bmMoY29sbGVjdGlvbk5hbWUsIHtcbiAgICAgICAgICBfaWQ6IGlkLFxuICAgICAgICB9KSkgfHwgbnVsbDtcbiAgICAgIC8vIFJldHVybiBkb2MgdG8gYWxsIHJlbGV2YW50IGNhbGxiYWNrcy4gTm90ZSB0aGF0IHRoaXMgYXJyYXkgY2FuXG4gICAgICAvLyBjb250aW51ZSB0byBncm93IGR1cmluZyBjYWxsYmFjayBleGNlY3V0aW9uLlxuICAgICAgd2hpbGUgKGNhbGxiYWNrcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIC8vIENsb25lIHRoZSBkb2N1bWVudCBzbyB0aGF0IHRoZSB2YXJpb3VzIGNhbGxzIHRvIGZldGNoIGRvbid0IHJldHVyblxuICAgICAgICAvLyBvYmplY3RzIHRoYXQgYXJlIGludGVydHdpbmdsZWQgd2l0aCBlYWNoIG90aGVyLiBDbG9uZSBiZWZvcmVcbiAgICAgICAgLy8gcG9wcGluZyB0aGUgZnV0dXJlLCBzbyB0aGF0IGlmIGNsb25lIHRocm93cywgdGhlIGVycm9yIGdldHMgcGFzc2VkXG4gICAgICAgIC8vIHRvIHRoZSBuZXh0IGNhbGxiYWNrLlxuICAgICAgICBjYWxsYmFja3MucG9wKCkobnVsbCwgRUpTT04uY2xvbmUoZG9jKSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgd2hpbGUgKGNhbGxiYWNrcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNhbGxiYWNrcy5wb3AoKShlKTtcbiAgICAgIH1cbiAgICB9IGZpbmFsbHkge1xuICAgICAgLy8gWFhYIGNvbnNpZGVyIGtlZXBpbmcgdGhlIGRvYyBhcm91bmQgZm9yIGEgcGVyaW9kIG9mIHRpbWUgYmVmb3JlXG4gICAgICAvLyByZW1vdmluZyBmcm9tIHRoZSBjYWNoZVxuICAgICAgc2VsZi5fY2FsbGJhY2tzRm9yT3AuZGVsZXRlKG9wKTtcbiAgICB9XG4gIH1cbn1cbiIsImltcG9ydCB0aHJvdHRsZSBmcm9tICdsb2Rhc2gudGhyb3R0bGUnO1xuaW1wb3J0IHsgbGlzdGVuQWxsIH0gZnJvbSAnLi9tb25nb19kcml2ZXInO1xuaW1wb3J0IHsgT2JzZXJ2ZU11bHRpcGxleGVyIH0gZnJvbSAnLi9vYnNlcnZlX211bHRpcGxleCc7XG5cbmludGVyZmFjZSBQb2xsaW5nT2JzZXJ2ZURyaXZlck9wdGlvbnMge1xuICBjdXJzb3JEZXNjcmlwdGlvbjogYW55O1xuICBtb25nb0hhbmRsZTogYW55O1xuICBvcmRlcmVkOiBib29sZWFuO1xuICBtdWx0aXBsZXhlcjogT2JzZXJ2ZU11bHRpcGxleGVyO1xuICBfdGVzdE9ubHlQb2xsQ2FsbGJhY2s/OiAoKSA9PiB2b2lkO1xufVxuXG5jb25zdCBQT0xMSU5HX1RIUk9UVExFX01TID0gKyhwcm9jZXNzLmVudi5NRVRFT1JfUE9MTElOR19USFJPVFRMRV9NUyB8fCAnJykgfHwgNTA7XG5jb25zdCBQT0xMSU5HX0lOVEVSVkFMX01TID0gKyhwcm9jZXNzLmVudi5NRVRFT1JfUE9MTElOR19JTlRFUlZBTF9NUyB8fCAnJykgfHwgMTAgKiAxMDAwO1xuXG4vKipcbiAqIEBjbGFzcyBQb2xsaW5nT2JzZXJ2ZURyaXZlclxuICpcbiAqIE9uZSBvZiB0d28gb2JzZXJ2ZSBkcml2ZXIgaW1wbGVtZW50YXRpb25zLlxuICpcbiAqIENoYXJhY3RlcmlzdGljczpcbiAqIC0gQ2FjaGVzIHRoZSByZXN1bHRzIG9mIGEgcXVlcnlcbiAqIC0gUmVydW5zIHRoZSBxdWVyeSB3aGVuIG5lY2Vzc2FyeVxuICogLSBTdWl0YWJsZSBmb3IgY2FzZXMgd2hlcmUgb3Bsb2cgdGFpbGluZyBpcyBub3QgYXZhaWxhYmxlIG9yIHByYWN0aWNhbFxuICovXG5leHBvcnQgY2xhc3MgUG9sbGluZ09ic2VydmVEcml2ZXIge1xuICBwcml2YXRlIF9vcHRpb25zOiBQb2xsaW5nT2JzZXJ2ZURyaXZlck9wdGlvbnM7XG4gIHByaXZhdGUgX2N1cnNvckRlc2NyaXB0aW9uOiBhbnk7XG4gIHByaXZhdGUgX21vbmdvSGFuZGxlOiBhbnk7XG4gIHByaXZhdGUgX29yZGVyZWQ6IGJvb2xlYW47XG4gIHByaXZhdGUgX211bHRpcGxleGVyOiBhbnk7XG4gIHByaXZhdGUgX3N0b3BDYWxsYmFja3M6IEFycmF5PCgpID0+IFByb21pc2U8dm9pZD4+O1xuICBwcml2YXRlIF9zdG9wcGVkOiBib29sZWFuO1xuICBwcml2YXRlIF9jdXJzb3I6IGFueTtcbiAgcHJpdmF0ZSBfcmVzdWx0czogYW55O1xuICBwcml2YXRlIF9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQ6IG51bWJlcjtcbiAgcHJpdmF0ZSBfcGVuZGluZ1dyaXRlczogYW55W107XG4gIHByaXZhdGUgX2Vuc3VyZVBvbGxJc1NjaGVkdWxlZDogRnVuY3Rpb247XG4gIHByaXZhdGUgX3Rhc2tRdWV1ZTogYW55O1xuICBwcml2YXRlIF90ZXN0T25seVBvbGxDYWxsYmFjaz86ICgpID0+IHZvaWQ7XG5cbiAgY29uc3RydWN0b3Iob3B0aW9uczogUG9sbGluZ09ic2VydmVEcml2ZXJPcHRpb25zKSB7XG4gICAgdGhpcy5fb3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5fY3Vyc29yRGVzY3JpcHRpb24gPSBvcHRpb25zLmN1cnNvckRlc2NyaXB0aW9uO1xuICAgIHRoaXMuX21vbmdvSGFuZGxlID0gb3B0aW9ucy5tb25nb0hhbmRsZTtcbiAgICB0aGlzLl9vcmRlcmVkID0gb3B0aW9ucy5vcmRlcmVkO1xuICAgIHRoaXMuX211bHRpcGxleGVyID0gb3B0aW9ucy5tdWx0aXBsZXhlcjtcbiAgICB0aGlzLl9zdG9wQ2FsbGJhY2tzID0gW107XG4gICAgdGhpcy5fc3RvcHBlZCA9IGZhbHNlO1xuXG4gICAgdGhpcy5fY3Vyc29yID0gdGhpcy5fbW9uZ29IYW5kbGUuX2NyZWF0ZUFzeW5jaHJvbm91c0N1cnNvcihcbiAgICAgIHRoaXMuX2N1cnNvckRlc2NyaXB0aW9uKTtcblxuICAgIHRoaXMuX3Jlc3VsdHMgPSBudWxsO1xuICAgIHRoaXMuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCA9IDA7XG4gICAgdGhpcy5fcGVuZGluZ1dyaXRlcyA9IFtdO1xuXG4gICAgdGhpcy5fZW5zdXJlUG9sbElzU2NoZWR1bGVkID0gdGhyb3R0bGUoXG4gICAgICB0aGlzLl91bnRocm90dGxlZEVuc3VyZVBvbGxJc1NjaGVkdWxlZC5iaW5kKHRoaXMpLFxuICAgICAgdGhpcy5fY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy5wb2xsaW5nVGhyb3R0bGVNcyB8fCBQT0xMSU5HX1RIUk9UVExFX01TXG4gICAgKTtcblxuICAgIHRoaXMuX3Rhc2tRdWV1ZSA9IG5ldyAoTWV0ZW9yIGFzIGFueSkuX0FzeW5jaHJvbm91c1F1ZXVlKCk7XG4gIH1cblxuICBhc3luYyBfaW5pdCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBvcHRpb25zID0gdGhpcy5fb3B0aW9ucztcbiAgICBjb25zdCBsaXN0ZW5lcnNIYW5kbGUgPSBhd2FpdCBsaXN0ZW5BbGwoXG4gICAgICB0aGlzLl9jdXJzb3JEZXNjcmlwdGlvbixcbiAgICAgIChub3RpZmljYXRpb246IGFueSkgPT4ge1xuICAgICAgICBjb25zdCBmZW5jZSA9IChERFBTZXJ2ZXIgYXMgYW55KS5fZ2V0Q3VycmVudEZlbmNlKCk7XG4gICAgICAgIGlmIChmZW5jZSkge1xuICAgICAgICAgIHRoaXMuX3BlbmRpbmdXcml0ZXMucHVzaChmZW5jZS5iZWdpbldyaXRlKCkpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQgPT09IDApIHtcbiAgICAgICAgICB0aGlzLl9lbnN1cmVQb2xsSXNTY2hlZHVsZWQoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICk7XG5cbiAgICB0aGlzLl9zdG9wQ2FsbGJhY2tzLnB1c2goYXN5bmMgKCkgPT4geyBhd2FpdCBsaXN0ZW5lcnNIYW5kbGUuc3RvcCgpOyB9KTtcblxuICAgIGlmIChvcHRpb25zLl90ZXN0T25seVBvbGxDYWxsYmFjaykge1xuICAgICAgdGhpcy5fdGVzdE9ubHlQb2xsQ2FsbGJhY2sgPSBvcHRpb25zLl90ZXN0T25seVBvbGxDYWxsYmFjaztcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgcG9sbGluZ0ludGVydmFsID1cbiAgICAgICAgdGhpcy5fY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy5wb2xsaW5nSW50ZXJ2YWxNcyB8fFxuICAgICAgICB0aGlzLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLl9wb2xsaW5nSW50ZXJ2YWwgfHxcbiAgICAgICAgUE9MTElOR19JTlRFUlZBTF9NUztcblxuICAgICAgY29uc3QgaW50ZXJ2YWxIYW5kbGUgPSBNZXRlb3Iuc2V0SW50ZXJ2YWwoXG4gICAgICAgIHRoaXMuX2Vuc3VyZVBvbGxJc1NjaGVkdWxlZC5iaW5kKHRoaXMpLFxuICAgICAgICBwb2xsaW5nSW50ZXJ2YWxcbiAgICAgICk7XG5cbiAgICAgIHRoaXMuX3N0b3BDYWxsYmFja3MucHVzaCgoKSA9PiB7XG4gICAgICAgIE1ldGVvci5jbGVhckludGVydmFsKGludGVydmFsSGFuZGxlKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMuX3VudGhyb3R0bGVkRW5zdXJlUG9sbElzU2NoZWR1bGVkKCk7XG5cbiAgICAoUGFja2FnZVsnZmFjdHMtYmFzZSddIGFzIGFueSk/LkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgICBcIm1vbmdvLWxpdmVkYXRhXCIsIFwib2JzZXJ2ZS1kcml2ZXJzLXBvbGxpbmdcIiwgMSk7XG4gIH1cblxuICBhc3luYyBfdW50aHJvdHRsZWRFbnN1cmVQb2xsSXNTY2hlZHVsZWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCA+IDApIHJldHVybjtcbiAgICArK3RoaXMuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZDtcbiAgICBhd2FpdCB0aGlzLl90YXNrUXVldWUucnVuVGFzayhhc3luYyAoKSA9PiB7XG4gICAgICBhd2FpdCB0aGlzLl9wb2xsTW9uZ28oKTtcbiAgICB9KTtcbiAgfVxuXG4gIF9zdXNwZW5kUG9sbGluZygpOiB2b2lkIHtcbiAgICArK3RoaXMuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZDtcbiAgICB0aGlzLl90YXNrUXVldWUucnVuVGFzaygoKSA9PiB7fSk7XG5cbiAgICBpZiAodGhpcy5fcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYF9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQgaXMgJHt0aGlzLl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWR9YCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgX3Jlc3VtZVBvbGxpbmcoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCAhPT0gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBfcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkIGlzICR7dGhpcy5fcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkfWApO1xuICAgIH1cbiAgICBhd2FpdCB0aGlzLl90YXNrUXVldWUucnVuVGFzayhhc3luYyAoKSA9PiB7XG4gICAgICBhd2FpdCB0aGlzLl9wb2xsTW9uZ28oKTtcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIF9wb2xsTW9uZ28oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgLS10aGlzLl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQ7XG5cbiAgICBpZiAodGhpcy5fc3RvcHBlZCkgcmV0dXJuO1xuXG4gICAgbGV0IGZpcnN0ID0gZmFsc2U7XG4gICAgbGV0IG5ld1Jlc3VsdHM7XG4gICAgbGV0IG9sZFJlc3VsdHMgPSB0aGlzLl9yZXN1bHRzO1xuXG4gICAgaWYgKCFvbGRSZXN1bHRzKSB7XG4gICAgICBmaXJzdCA9IHRydWU7XG4gICAgICBvbGRSZXN1bHRzID0gdGhpcy5fb3JkZXJlZCA/IFtdIDogbmV3IChMb2NhbENvbGxlY3Rpb24gYXMgYW55KS5fSWRNYXA7XG4gICAgfVxuXG4gICAgdGhpcy5fdGVzdE9ubHlQb2xsQ2FsbGJhY2s/LigpO1xuXG4gICAgY29uc3Qgd3JpdGVzRm9yQ3ljbGUgPSB0aGlzLl9wZW5kaW5nV3JpdGVzO1xuICAgIHRoaXMuX3BlbmRpbmdXcml0ZXMgPSBbXTtcblxuICAgIHRyeSB7XG4gICAgICBuZXdSZXN1bHRzID0gYXdhaXQgdGhpcy5fY3Vyc29yLmdldFJhd09iamVjdHModGhpcy5fb3JkZXJlZCk7XG4gICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICBpZiAoZmlyc3QgJiYgdHlwZW9mKGUuY29kZSkgPT09ICdudW1iZXInKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuX211bHRpcGxleGVyLnF1ZXJ5RXJyb3IoXG4gICAgICAgICAgbmV3IEVycm9yKFxuICAgICAgICAgICAgYEV4Y2VwdGlvbiB3aGlsZSBwb2xsaW5nIHF1ZXJ5ICR7XG4gICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHRoaXMuX2N1cnNvckRlc2NyaXB0aW9uKVxuICAgICAgICAgICAgfTogJHtlLm1lc3NhZ2V9YFxuICAgICAgICAgIClcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkodGhpcy5fcGVuZGluZ1dyaXRlcywgd3JpdGVzRm9yQ3ljbGUpO1xuICAgICAgTWV0ZW9yLl9kZWJ1ZyhgRXhjZXB0aW9uIHdoaWxlIHBvbGxpbmcgcXVlcnkgJHtcbiAgICAgICAgSlNPTi5zdHJpbmdpZnkodGhpcy5fY3Vyc29yRGVzY3JpcHRpb24pfWAsIGUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5fc3RvcHBlZCkge1xuICAgICAgKExvY2FsQ29sbGVjdGlvbiBhcyBhbnkpLl9kaWZmUXVlcnlDaGFuZ2VzKFxuICAgICAgICB0aGlzLl9vcmRlcmVkLCBvbGRSZXN1bHRzLCBuZXdSZXN1bHRzLCB0aGlzLl9tdWx0aXBsZXhlcik7XG4gICAgfVxuXG4gICAgaWYgKGZpcnN0KSB0aGlzLl9tdWx0aXBsZXhlci5yZWFkeSgpO1xuXG4gICAgdGhpcy5fcmVzdWx0cyA9IG5ld1Jlc3VsdHM7XG5cbiAgICBhd2FpdCB0aGlzLl9tdWx0aXBsZXhlci5vbkZsdXNoKGFzeW5jICgpID0+IHtcbiAgICAgIGZvciAoY29uc3QgdyBvZiB3cml0ZXNGb3JDeWNsZSkge1xuICAgICAgICBhd2FpdCB3LmNvbW1pdHRlZCgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgc3RvcCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLl9zdG9wcGVkID0gdHJ1ZTtcblxuICAgIGZvciAoY29uc3QgY2FsbGJhY2sgb2YgdGhpcy5fc3RvcENhbGxiYWNrcykge1xuICAgICAgYXdhaXQgY2FsbGJhY2soKTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IHcgb2YgdGhpcy5fcGVuZGluZ1dyaXRlcykge1xuICAgICAgYXdhaXQgdy5jb21taXR0ZWQoKTtcbiAgICB9XG5cbiAgICAoUGFja2FnZVsnZmFjdHMtYmFzZSddIGFzIGFueSk/LkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgICBcIm1vbmdvLWxpdmVkYXRhXCIsIFwib2JzZXJ2ZS1kcml2ZXJzLXBvbGxpbmdcIiwgLTEpO1xuICB9XG59IiwiaW1wb3J0IGhhcyBmcm9tICdsb2Rhc2guaGFzJztcbmltcG9ydCBpc0VtcHR5IGZyb20gJ2xvZGFzaC5pc2VtcHR5JztcbmltcG9ydCB7IG9wbG9nVjJWMUNvbnZlcnRlciB9IGZyb20gXCIuL29wbG9nX3YyX2NvbnZlcnRlclwiO1xuaW1wb3J0IHsgY2hlY2ssIE1hdGNoIH0gZnJvbSAnbWV0ZW9yL2NoZWNrJztcbmltcG9ydCB7IEN1cnNvckRlc2NyaXB0aW9uIH0gZnJvbSAnLi9jdXJzb3JfZGVzY3JpcHRpb24nO1xuaW1wb3J0IHsgZm9yRWFjaFRyaWdnZXIsIGxpc3RlbkFsbCB9IGZyb20gJy4vbW9uZ29fZHJpdmVyJztcbmltcG9ydCB7IEN1cnNvciB9IGZyb20gJy4vY3Vyc29yJztcbmltcG9ydCBMb2NhbENvbGxlY3Rpb24gZnJvbSAnbWV0ZW9yL21pbmltb25nby9sb2NhbF9jb2xsZWN0aW9uJztcbmltcG9ydCB7IGlkRm9yT3AgfSBmcm9tICcuL29wbG9nX3RhaWxpbmcnO1xuXG52YXIgUEhBU0UgPSB7XG4gIFFVRVJZSU5HOiBcIlFVRVJZSU5HXCIsXG4gIEZFVENISU5HOiBcIkZFVENISU5HXCIsXG4gIFNURUFEWTogXCJTVEVBRFlcIlxufTtcblxuLy8gRXhjZXB0aW9uIHRocm93biBieSBfbmVlZFRvUG9sbFF1ZXJ5IHdoaWNoIHVucm9sbHMgdGhlIHN0YWNrIHVwIHRvIHRoZVxuLy8gZW5jbG9zaW5nIGNhbGwgdG8gZmluaXNoSWZOZWVkVG9Qb2xsUXVlcnkuXG52YXIgU3dpdGNoZWRUb1F1ZXJ5ID0gZnVuY3Rpb24gKCkge307XG52YXIgZmluaXNoSWZOZWVkVG9Qb2xsUXVlcnkgPSBmdW5jdGlvbiAoZikge1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICBmLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKCEoZSBpbnN0YW5jZW9mIFN3aXRjaGVkVG9RdWVyeSkpXG4gICAgICAgIHRocm93IGU7XG4gICAgfVxuICB9O1xufTtcblxudmFyIGN1cnJlbnRJZCA9IDA7XG5cbi8qKlxuICogQGNsYXNzIE9wbG9nT2JzZXJ2ZURyaXZlclxuICogQW4gYWx0ZXJuYXRpdmUgdG8gUG9sbGluZ09ic2VydmVEcml2ZXIgd2hpY2ggZm9sbG93cyB0aGUgTW9uZ29EQiBvcGVyYXRpb24gbG9nXG4gKiBpbnN0ZWFkIG9mIHJlLXBvbGxpbmcgdGhlIHF1ZXJ5LlxuICpcbiAqIENoYXJhY3RlcmlzdGljczpcbiAqIC0gRm9sbG93cyB0aGUgTW9uZ29EQiBvcGVyYXRpb24gbG9nXG4gKiAtIERpcmVjdGx5IG9ic2VydmVzIGRhdGFiYXNlIGNoYW5nZXNcbiAqIC0gTW9yZSBlZmZpY2llbnQgdGhhbiBwb2xsaW5nIGZvciBtb3N0IHVzZSBjYXNlc1xuICogLSBSZXF1aXJlcyBhY2Nlc3MgdG8gTW9uZ29EQiBvcGxvZ1xuICpcbiAqIEludGVyZmFjZTpcbiAqIC0gQ29uc3RydWN0aW9uIGluaXRpYXRlcyBvYnNlcnZlQ2hhbmdlcyBjYWxsYmFja3MgYW5kIHJlYWR5KCkgaW52b2NhdGlvbiB0byB0aGUgT2JzZXJ2ZU11bHRpcGxleGVyXG4gKiAtIE9ic2VydmF0aW9uIGNhbiBiZSB0ZXJtaW5hdGVkIHZpYSB0aGUgc3RvcCgpIG1ldGhvZFxuICovXG5leHBvcnQgY29uc3QgT3Bsb2dPYnNlcnZlRHJpdmVyID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gIHNlbGYuX3VzZXNPcGxvZyA9IHRydWU7ICAvLyB0ZXN0cyBsb29rIGF0IHRoaXNcblxuICBzZWxmLl9pZCA9IGN1cnJlbnRJZDtcbiAgY3VycmVudElkKys7XG5cbiAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24gPSBvcHRpb25zLmN1cnNvckRlc2NyaXB0aW9uO1xuICBzZWxmLl9tb25nb0hhbmRsZSA9IG9wdGlvbnMubW9uZ29IYW5kbGU7XG4gIHNlbGYuX211bHRpcGxleGVyID0gb3B0aW9ucy5tdWx0aXBsZXhlcjtcblxuICBpZiAob3B0aW9ucy5vcmRlcmVkKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJPcGxvZ09ic2VydmVEcml2ZXIgb25seSBzdXBwb3J0cyB1bm9yZGVyZWQgb2JzZXJ2ZUNoYW5nZXNcIik7XG4gIH1cblxuICBjb25zdCBzb3J0ZXIgPSBvcHRpb25zLnNvcnRlcjtcbiAgLy8gV2UgZG9uJ3Qgc3VwcG9ydCAkbmVhciBhbmQgb3RoZXIgZ2VvLXF1ZXJpZXMgc28gaXQncyBPSyB0byBpbml0aWFsaXplIHRoZVxuICAvLyBjb21wYXJhdG9yIG9ubHkgb25jZSBpbiB0aGUgY29uc3RydWN0b3IuXG4gIGNvbnN0IGNvbXBhcmF0b3IgPSBzb3J0ZXIgJiYgc29ydGVyLmdldENvbXBhcmF0b3IoKTtcblxuICBpZiAob3B0aW9ucy5jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLmxpbWl0KSB7XG4gICAgLy8gVGhlcmUgYXJlIHNldmVyYWwgcHJvcGVydGllcyBvcmRlcmVkIGRyaXZlciBpbXBsZW1lbnRzOlxuICAgIC8vIC0gX2xpbWl0IGlzIGEgcG9zaXRpdmUgbnVtYmVyXG4gICAgLy8gLSBfY29tcGFyYXRvciBpcyBhIGZ1bmN0aW9uLWNvbXBhcmF0b3IgYnkgd2hpY2ggdGhlIHF1ZXJ5IGlzIG9yZGVyZWRcbiAgICAvLyAtIF91bnB1Ymxpc2hlZEJ1ZmZlciBpcyBub24tbnVsbCBNaW4vTWF4IEhlYXAsXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgdGhlIGVtcHR5IGJ1ZmZlciBpbiBTVEVBRFkgcGhhc2UgaW1wbGllcyB0aGF0IHRoZVxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgIGV2ZXJ5dGhpbmcgdGhhdCBtYXRjaGVzIHRoZSBxdWVyaWVzIHNlbGVjdG9yIGZpdHNcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICBpbnRvIHB1Ymxpc2hlZCBzZXQuXG4gICAgLy8gLSBfcHVibGlzaGVkIC0gTWF4IEhlYXAgKGFsc28gaW1wbGVtZW50cyBJZE1hcCBtZXRob2RzKVxuXG4gICAgY29uc3QgaGVhcE9wdGlvbnMgPSB7IElkTWFwOiBMb2NhbENvbGxlY3Rpb24uX0lkTWFwIH07XG4gICAgc2VsZi5fbGltaXQgPSBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLmxpbWl0O1xuICAgIHNlbGYuX2NvbXBhcmF0b3IgPSBjb21wYXJhdG9yO1xuICAgIHNlbGYuX3NvcnRlciA9IHNvcnRlcjtcbiAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlciA9IG5ldyBNaW5NYXhIZWFwKGNvbXBhcmF0b3IsIGhlYXBPcHRpb25zKTtcbiAgICAvLyBXZSBuZWVkIHNvbWV0aGluZyB0aGF0IGNhbiBmaW5kIE1heCB2YWx1ZSBpbiBhZGRpdGlvbiB0byBJZE1hcCBpbnRlcmZhY2VcbiAgICBzZWxmLl9wdWJsaXNoZWQgPSBuZXcgTWF4SGVhcChjb21wYXJhdG9yLCBoZWFwT3B0aW9ucyk7XG4gIH0gZWxzZSB7XG4gICAgc2VsZi5fbGltaXQgPSAwO1xuICAgIHNlbGYuX2NvbXBhcmF0b3IgPSBudWxsO1xuICAgIHNlbGYuX3NvcnRlciA9IG51bGw7XG4gICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIgPSBudWxsO1xuICAgIC8vIE1lbW9yeSBHcm93dGhcbiAgICBzZWxmLl9wdWJsaXNoZWQgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbiAgfVxuXG4gIC8vIEluZGljYXRlcyBpZiBpdCBpcyBzYWZlIHRvIGluc2VydCBhIG5ldyBkb2N1bWVudCBhdCB0aGUgZW5kIG9mIHRoZSBidWZmZXJcbiAgLy8gZm9yIHRoaXMgcXVlcnkuIGkuZS4gaXQgaXMga25vd24gdGhhdCB0aGVyZSBhcmUgbm8gZG9jdW1lbnRzIG1hdGNoaW5nIHRoZVxuICAvLyBzZWxlY3RvciB0aG9zZSBhcmUgbm90IGluIHB1Ymxpc2hlZCBvciBidWZmZXIuXG4gIHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlciA9IGZhbHNlO1xuXG4gIHNlbGYuX3N0b3BwZWQgPSBmYWxzZTtcbiAgc2VsZi5fc3RvcEhhbmRsZXMgPSBbXTtcbiAgc2VsZi5fYWRkU3RvcEhhbmRsZXMgPSBmdW5jdGlvbiAobmV3U3RvcEhhbmRsZXMpIHtcbiAgICBjb25zdCBleHBlY3RlZFBhdHRlcm4gPSBNYXRjaC5PYmplY3RJbmNsdWRpbmcoeyBzdG9wOiBGdW5jdGlvbiB9KTtcbiAgICAvLyBTaW5nbGUgaXRlbSBvciBhcnJheVxuICAgIGNoZWNrKG5ld1N0b3BIYW5kbGVzLCBNYXRjaC5PbmVPZihbZXhwZWN0ZWRQYXR0ZXJuXSwgZXhwZWN0ZWRQYXR0ZXJuKSk7XG4gICAgc2VsZi5fc3RvcEhhbmRsZXMucHVzaChuZXdTdG9wSGFuZGxlcyk7XG4gIH1cblxuICBQYWNrYWdlWydmYWN0cy1iYXNlJ10gJiYgUGFja2FnZVsnZmFjdHMtYmFzZSddLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgXCJtb25nby1saXZlZGF0YVwiLCBcIm9ic2VydmUtZHJpdmVycy1vcGxvZ1wiLCAxKTtcblxuICBzZWxmLl9yZWdpc3RlclBoYXNlQ2hhbmdlKFBIQVNFLlFVRVJZSU5HKTtcblxuICBzZWxmLl9tYXRjaGVyID0gb3B0aW9ucy5tYXRjaGVyO1xuICAvLyB3ZSBhcmUgbm93IHVzaW5nIHByb2plY3Rpb24sIG5vdCBmaWVsZHMgaW4gdGhlIGN1cnNvciBkZXNjcmlwdGlvbiBldmVuIGlmIHlvdSBwYXNzIHtmaWVsZHN9XG4gIC8vIGluIHRoZSBjdXJzb3IgY29uc3RydWN0aW9uXG4gIGNvbnN0IHByb2plY3Rpb24gPSBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLmZpZWxkcyB8fCBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnByb2plY3Rpb24gfHwge307XG4gIHNlbGYuX3Byb2plY3Rpb25GbiA9IExvY2FsQ29sbGVjdGlvbi5fY29tcGlsZVByb2plY3Rpb24ocHJvamVjdGlvbik7XG4gIC8vIFByb2plY3Rpb24gZnVuY3Rpb24sIHJlc3VsdCBvZiBjb21iaW5pbmcgaW1wb3J0YW50IGZpZWxkcyBmb3Igc2VsZWN0b3IgYW5kXG4gIC8vIGV4aXN0aW5nIGZpZWxkcyBwcm9qZWN0aW9uXG4gIHNlbGYuX3NoYXJlZFByb2plY3Rpb24gPSBzZWxmLl9tYXRjaGVyLmNvbWJpbmVJbnRvUHJvamVjdGlvbihwcm9qZWN0aW9uKTtcbiAgaWYgKHNvcnRlcilcbiAgICBzZWxmLl9zaGFyZWRQcm9qZWN0aW9uID0gc29ydGVyLmNvbWJpbmVJbnRvUHJvamVjdGlvbihzZWxmLl9zaGFyZWRQcm9qZWN0aW9uKTtcbiAgc2VsZi5fc2hhcmVkUHJvamVjdGlvbkZuID0gTG9jYWxDb2xsZWN0aW9uLl9jb21waWxlUHJvamVjdGlvbihcbiAgICBzZWxmLl9zaGFyZWRQcm9qZWN0aW9uKTtcblxuICBzZWxmLl9uZWVkVG9GZXRjaCA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuICBzZWxmLl9jdXJyZW50bHlGZXRjaGluZyA9IG51bGw7XG4gIHNlbGYuX2ZldGNoR2VuZXJhdGlvbiA9IDA7XG5cbiAgc2VsZi5fcmVxdWVyeVdoZW5Eb25lVGhpc1F1ZXJ5ID0gZmFsc2U7XG4gIHNlbGYuX3dyaXRlc1RvQ29tbWl0V2hlbldlUmVhY2hTdGVhZHkgPSBbXTtcbiB9O1xuXG5PYmplY3QuYXNzaWduKE9wbG9nT2JzZXJ2ZURyaXZlci5wcm90b3R5cGUsIHtcbiAgX2luaXQ6IGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuXG4gICAgLy8gSWYgdGhlIG9wbG9nIGhhbmRsZSB0ZWxscyB1cyB0aGF0IGl0IHNraXBwZWQgc29tZSBlbnRyaWVzIChiZWNhdXNlIGl0IGdvdFxuICAgIC8vIGJlaGluZCwgc2F5KSwgcmUtcG9sbC5cbiAgICBzZWxmLl9hZGRTdG9wSGFuZGxlcyhzZWxmLl9tb25nb0hhbmRsZS5fb3Bsb2dIYW5kbGUub25Ta2lwcGVkRW50cmllcyhcbiAgICAgIGZpbmlzaElmTmVlZFRvUG9sbFF1ZXJ5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYuX25lZWRUb1BvbGxRdWVyeSgpO1xuICAgICAgfSlcbiAgICApKTtcbiAgICBcbiAgICBhd2FpdCBmb3JFYWNoVHJpZ2dlcihzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbiwgYXN5bmMgZnVuY3Rpb24gKHRyaWdnZXIpIHtcbiAgICAgIHNlbGYuX2FkZFN0b3BIYW5kbGVzKGF3YWl0IHNlbGYuX21vbmdvSGFuZGxlLl9vcGxvZ0hhbmRsZS5vbk9wbG9nRW50cnkoXG4gICAgICAgIHRyaWdnZXIsIGZ1bmN0aW9uIChub3RpZmljYXRpb24pIHtcbiAgICAgICAgICBmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjb25zdCBvcCA9IG5vdGlmaWNhdGlvbi5vcDtcbiAgICAgICAgICAgIGlmIChub3RpZmljYXRpb24uZHJvcENvbGxlY3Rpb24gfHwgbm90aWZpY2F0aW9uLmRyb3BEYXRhYmFzZSkge1xuICAgICAgICAgICAgICAvLyBOb3RlOiB0aGlzIGNhbGwgaXMgbm90IGFsbG93ZWQgdG8gYmxvY2sgb24gYW55dGhpbmcgKGVzcGVjaWFsbHlcbiAgICAgICAgICAgICAgLy8gb24gd2FpdGluZyBmb3Igb3Bsb2cgZW50cmllcyB0byBjYXRjaCB1cCkgYmVjYXVzZSB0aGF0IHdpbGwgYmxvY2tcbiAgICAgICAgICAgICAgLy8gb25PcGxvZ0VudHJ5IVxuICAgICAgICAgICAgICByZXR1cm4gc2VsZi5fbmVlZFRvUG9sbFF1ZXJ5KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBBbGwgb3RoZXIgb3BlcmF0b3JzIHNob3VsZCBiZSBoYW5kbGVkIGRlcGVuZGluZyBvbiBwaGFzZVxuICAgICAgICAgICAgICBpZiAoc2VsZi5fcGhhc2UgPT09IFBIQVNFLlFVRVJZSU5HKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYuX2hhbmRsZU9wbG9nRW50cnlRdWVyeWluZyhvcCk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYuX2hhbmRsZU9wbG9nRW50cnlTdGVhZHlPckZldGNoaW5nKG9wKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pKCk7XG4gICAgICAgIH1cbiAgICAgICkpO1xuICAgIH0pO1xuICBcbiAgICAvLyBYWFggb3JkZXJpbmcgdy5yLnQuIGV2ZXJ5dGhpbmcgZWxzZT9cbiAgICBzZWxmLl9hZGRTdG9wSGFuZGxlcyhhd2FpdCBsaXN0ZW5BbGwoXG4gICAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBJZiB3ZSdyZSBub3QgaW4gYSBwcmUtZmlyZSB3cml0ZSBmZW5jZSwgd2UgZG9uJ3QgaGF2ZSB0byBkbyBhbnl0aGluZy5cbiAgICAgICAgY29uc3QgZmVuY2UgPSBERFBTZXJ2ZXIuX2dldEN1cnJlbnRGZW5jZSgpO1xuICAgICAgICBpZiAoIWZlbmNlIHx8IGZlbmNlLmZpcmVkKVxuICAgICAgICAgIHJldHVybjtcbiAgXG4gICAgICAgIGlmIChmZW5jZS5fb3Bsb2dPYnNlcnZlRHJpdmVycykge1xuICAgICAgICAgIGZlbmNlLl9vcGxvZ09ic2VydmVEcml2ZXJzW3NlbGYuX2lkXSA9IHNlbGY7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gIFxuICAgICAgICBmZW5jZS5fb3Bsb2dPYnNlcnZlRHJpdmVycyA9IHt9O1xuICAgICAgICBmZW5jZS5fb3Bsb2dPYnNlcnZlRHJpdmVyc1tzZWxmLl9pZF0gPSBzZWxmO1xuICBcbiAgICAgICAgZmVuY2Uub25CZWZvcmVGaXJlKGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBjb25zdCBkcml2ZXJzID0gZmVuY2UuX29wbG9nT2JzZXJ2ZURyaXZlcnM7XG4gICAgICAgICAgZGVsZXRlIGZlbmNlLl9vcGxvZ09ic2VydmVEcml2ZXJzO1xuICBcbiAgICAgICAgICAvLyBUaGlzIGZlbmNlIGNhbm5vdCBmaXJlIHVudGlsIHdlJ3ZlIGNhdWdodCB1cCB0byBcInRoaXMgcG9pbnRcIiBpbiB0aGVcbiAgICAgICAgICAvLyBvcGxvZywgYW5kIGFsbCBvYnNlcnZlcnMgbWFkZSBpdCBiYWNrIHRvIHRoZSBzdGVhZHkgc3RhdGUuXG4gICAgICAgICAgYXdhaXQgc2VsZi5fbW9uZ29IYW5kbGUuX29wbG9nSGFuZGxlLndhaXRVbnRpbENhdWdodFVwKCk7XG4gIFxuICAgICAgICAgIGZvciAoY29uc3QgZHJpdmVyIG9mIE9iamVjdC52YWx1ZXMoZHJpdmVycykpIHtcbiAgICAgICAgICAgIGlmIChkcml2ZXIuX3N0b3BwZWQpXG4gICAgICAgICAgICAgIGNvbnRpbnVlO1xuICBcbiAgICAgICAgICAgIGNvbnN0IHdyaXRlID0gYXdhaXQgZmVuY2UuYmVnaW5Xcml0ZSgpO1xuICAgICAgICAgICAgaWYgKGRyaXZlci5fcGhhc2UgPT09IFBIQVNFLlNURUFEWSkge1xuICAgICAgICAgICAgICAvLyBNYWtlIHN1cmUgdGhhdCBhbGwgb2YgdGhlIGNhbGxiYWNrcyBoYXZlIG1hZGUgaXQgdGhyb3VnaCB0aGVcbiAgICAgICAgICAgICAgLy8gbXVsdGlwbGV4ZXIgYW5kIGJlZW4gZGVsaXZlcmVkIHRvIE9ic2VydmVIYW5kbGVzIGJlZm9yZSBjb21taXR0aW5nXG4gICAgICAgICAgICAgIC8vIHdyaXRlcy5cbiAgICAgICAgICAgICAgYXdhaXQgZHJpdmVyLl9tdWx0aXBsZXhlci5vbkZsdXNoKHdyaXRlLmNvbW1pdHRlZCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBkcml2ZXIuX3dyaXRlc1RvQ29tbWl0V2hlbldlUmVhY2hTdGVhZHkucHVzaCh3cml0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICApKTtcbiAgXG4gICAgLy8gV2hlbiBNb25nbyBmYWlscyBvdmVyLCB3ZSBuZWVkIHRvIHJlcG9sbCB0aGUgcXVlcnksIGluIGNhc2Ugd2UgcHJvY2Vzc2VkIGFuXG4gICAgLy8gb3Bsb2cgZW50cnkgdGhhdCBnb3Qgcm9sbGVkIGJhY2suXG4gICAgc2VsZi5fYWRkU3RvcEhhbmRsZXMoc2VsZi5fbW9uZ29IYW5kbGUuX29uRmFpbG92ZXIoZmluaXNoSWZOZWVkVG9Qb2xsUXVlcnkoXG4gICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBzZWxmLl9uZWVkVG9Qb2xsUXVlcnkoKTtcbiAgICAgIH0pKSk7XG4gIFxuICAgIC8vIEdpdmUgX29ic2VydmVDaGFuZ2VzIGEgY2hhbmNlIHRvIGFkZCB0aGUgbmV3IE9ic2VydmVIYW5kbGUgdG8gb3VyXG4gICAgLy8gbXVsdGlwbGV4ZXIsIHNvIHRoYXQgdGhlIGFkZGVkIGNhbGxzIGdldCBzdHJlYW1lZC5cbiAgICByZXR1cm4gc2VsZi5fcnVuSW5pdGlhbFF1ZXJ5KCk7XG4gIH0sXG4gIF9hZGRQdWJsaXNoZWQ6IGZ1bmN0aW9uIChpZCwgZG9jKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBmaWVsZHMgPSBPYmplY3QuYXNzaWduKHt9LCBkb2MpO1xuICAgICAgZGVsZXRlIGZpZWxkcy5faWQ7XG4gICAgICBzZWxmLl9wdWJsaXNoZWQuc2V0KGlkLCBzZWxmLl9zaGFyZWRQcm9qZWN0aW9uRm4oZG9jKSk7XG4gICAgICBzZWxmLl9tdWx0aXBsZXhlci5hZGRlZChpZCwgc2VsZi5fcHJvamVjdGlvbkZuKGZpZWxkcykpO1xuXG4gICAgICAvLyBBZnRlciBhZGRpbmcgdGhpcyBkb2N1bWVudCwgdGhlIHB1Ymxpc2hlZCBzZXQgbWlnaHQgYmUgb3ZlcmZsb3dlZFxuICAgICAgLy8gKGV4Y2VlZGluZyBjYXBhY2l0eSBzcGVjaWZpZWQgYnkgbGltaXQpLiBJZiBzbywgcHVzaCB0aGUgbWF4aW11bVxuICAgICAgLy8gZWxlbWVudCB0byB0aGUgYnVmZmVyLCB3ZSBtaWdodCB3YW50IHRvIHNhdmUgaXQgaW4gbWVtb3J5IHRvIHJlZHVjZSB0aGVcbiAgICAgIC8vIGFtb3VudCBvZiBNb25nbyBsb29rdXBzIGluIHRoZSBmdXR1cmUuXG4gICAgICBpZiAoc2VsZi5fbGltaXQgJiYgc2VsZi5fcHVibGlzaGVkLnNpemUoKSA+IHNlbGYuX2xpbWl0KSB7XG4gICAgICAgIC8vIFhYWCBpbiB0aGVvcnkgdGhlIHNpemUgb2YgcHVibGlzaGVkIGlzIG5vIG1vcmUgdGhhbiBsaW1pdCsxXG4gICAgICAgIGlmIChzZWxmLl9wdWJsaXNoZWQuc2l6ZSgpICE9PSBzZWxmLl9saW1pdCArIDEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBZnRlciBhZGRpbmcgdG8gcHVibGlzaGVkLCBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgIChzZWxmLl9wdWJsaXNoZWQuc2l6ZSgpIC0gc2VsZi5fbGltaXQpICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCIgZG9jdW1lbnRzIGFyZSBvdmVyZmxvd2luZyB0aGUgc2V0XCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG92ZXJmbG93aW5nRG9jSWQgPSBzZWxmLl9wdWJsaXNoZWQubWF4RWxlbWVudElkKCk7XG4gICAgICAgIHZhciBvdmVyZmxvd2luZ0RvYyA9IHNlbGYuX3B1Ymxpc2hlZC5nZXQob3ZlcmZsb3dpbmdEb2NJZCk7XG5cbiAgICAgICAgaWYgKEVKU09OLmVxdWFscyhvdmVyZmxvd2luZ0RvY0lkLCBpZCkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGUgZG9jdW1lbnQganVzdCBhZGRlZCBpcyBvdmVyZmxvd2luZyB0aGUgcHVibGlzaGVkIHNldFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNlbGYuX3B1Ymxpc2hlZC5yZW1vdmUob3ZlcmZsb3dpbmdEb2NJZCk7XG4gICAgICAgIHNlbGYuX211bHRpcGxleGVyLnJlbW92ZWQob3ZlcmZsb3dpbmdEb2NJZCk7XG4gICAgICAgIHNlbGYuX2FkZEJ1ZmZlcmVkKG92ZXJmbG93aW5nRG9jSWQsIG92ZXJmbG93aW5nRG9jKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgX3JlbW92ZVB1Ymxpc2hlZDogZnVuY3Rpb24gKGlkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuX3B1Ymxpc2hlZC5yZW1vdmUoaWQpO1xuICAgICAgc2VsZi5fbXVsdGlwbGV4ZXIucmVtb3ZlZChpZCk7XG4gICAgICBpZiAoISBzZWxmLl9saW1pdCB8fCBzZWxmLl9wdWJsaXNoZWQuc2l6ZSgpID09PSBzZWxmLl9saW1pdClcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICBpZiAoc2VsZi5fcHVibGlzaGVkLnNpemUoKSA+IHNlbGYuX2xpbWl0KVxuICAgICAgICB0aHJvdyBFcnJvcihcInNlbGYuX3B1Ymxpc2hlZCBnb3QgdG9vIGJpZ1wiKTtcblxuICAgICAgLy8gT0ssIHdlIGFyZSBwdWJsaXNoaW5nIGxlc3MgdGhhbiB0aGUgbGltaXQuIE1heWJlIHdlIHNob3VsZCBsb29rIGluIHRoZVxuICAgICAgLy8gYnVmZmVyIHRvIGZpbmQgdGhlIG5leHQgZWxlbWVudCBwYXN0IHdoYXQgd2Ugd2VyZSBwdWJsaXNoaW5nIGJlZm9yZS5cblxuICAgICAgaWYgKCFzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5lbXB0eSgpKSB7XG4gICAgICAgIC8vIFRoZXJlJ3Mgc29tZXRoaW5nIGluIHRoZSBidWZmZXI7IG1vdmUgdGhlIGZpcnN0IHRoaW5nIGluIGl0IHRvXG4gICAgICAgIC8vIF9wdWJsaXNoZWQuXG4gICAgICAgIHZhciBuZXdEb2NJZCA9IHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLm1pbkVsZW1lbnRJZCgpO1xuICAgICAgICB2YXIgbmV3RG9jID0gc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuZ2V0KG5ld0RvY0lkKTtcbiAgICAgICAgc2VsZi5fcmVtb3ZlQnVmZmVyZWQobmV3RG9jSWQpO1xuICAgICAgICBzZWxmLl9hZGRQdWJsaXNoZWQobmV3RG9jSWQsIG5ld0RvYyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gVGhlcmUncyBub3RoaW5nIGluIHRoZSBidWZmZXIuICBUaGlzIGNvdWxkIG1lYW4gb25lIG9mIGEgZmV3IHRoaW5ncy5cblxuICAgICAgLy8gKGEpIFdlIGNvdWxkIGJlIGluIHRoZSBtaWRkbGUgb2YgcmUtcnVubmluZyB0aGUgcXVlcnkgKHNwZWNpZmljYWxseSwgd2VcbiAgICAgIC8vIGNvdWxkIGJlIGluIF9wdWJsaXNoTmV3UmVzdWx0cykuIEluIHRoYXQgY2FzZSwgX3VucHVibGlzaGVkQnVmZmVyIGlzXG4gICAgICAvLyBlbXB0eSBiZWNhdXNlIHdlIGNsZWFyIGl0IGF0IHRoZSBiZWdpbm5pbmcgb2YgX3B1Ymxpc2hOZXdSZXN1bHRzLiBJblxuICAgICAgLy8gdGhpcyBjYXNlLCBvdXIgY2FsbGVyIGFscmVhZHkga25vd3MgdGhlIGVudGlyZSBhbnN3ZXIgdG8gdGhlIHF1ZXJ5IGFuZFxuICAgICAgLy8gd2UgZG9uJ3QgbmVlZCB0byBkbyBhbnl0aGluZyBmYW5jeSBoZXJlLiAgSnVzdCByZXR1cm4uXG4gICAgICBpZiAoc2VsZi5fcGhhc2UgPT09IFBIQVNFLlFVRVJZSU5HKVxuICAgICAgICByZXR1cm47XG5cbiAgICAgIC8vIChiKSBXZSdyZSBwcmV0dHkgY29uZmlkZW50IHRoYXQgdGhlIHVuaW9uIG9mIF9wdWJsaXNoZWQgYW5kXG4gICAgICAvLyBfdW5wdWJsaXNoZWRCdWZmZXIgY29udGFpbiBhbGwgZG9jdW1lbnRzIHRoYXQgbWF0Y2ggc2VsZWN0b3IuIEJlY2F1c2VcbiAgICAgIC8vIF91bnB1Ymxpc2hlZEJ1ZmZlciBpcyBlbXB0eSwgdGhhdCBtZWFucyB3ZSdyZSBjb25maWRlbnQgdGhhdCBfcHVibGlzaGVkXG4gICAgICAvLyBjb250YWlucyBhbGwgZG9jdW1lbnRzIHRoYXQgbWF0Y2ggc2VsZWN0b3IuIFNvIHdlIGhhdmUgbm90aGluZyB0byBkby5cbiAgICAgIGlmIChzZWxmLl9zYWZlQXBwZW5kVG9CdWZmZXIpXG4gICAgICAgIHJldHVybjtcblxuICAgICAgLy8gKGMpIE1heWJlIHRoZXJlIGFyZSBvdGhlciBkb2N1bWVudHMgb3V0IHRoZXJlIHRoYXQgc2hvdWxkIGJlIGluIG91clxuICAgICAgLy8gYnVmZmVyLiBCdXQgaW4gdGhhdCBjYXNlLCB3aGVuIHdlIGVtcHRpZWQgX3VucHVibGlzaGVkQnVmZmVyIGluXG4gICAgICAvLyBfcmVtb3ZlQnVmZmVyZWQsIHdlIHNob3VsZCBoYXZlIGNhbGxlZCBfbmVlZFRvUG9sbFF1ZXJ5LCB3aGljaCB3aWxsXG4gICAgICAvLyBlaXRoZXIgcHV0IHNvbWV0aGluZyBpbiBfdW5wdWJsaXNoZWRCdWZmZXIgb3Igc2V0IF9zYWZlQXBwZW5kVG9CdWZmZXJcbiAgICAgIC8vIChvciBib3RoKSwgYW5kIGl0IHdpbGwgcHV0IHVzIGluIFFVRVJZSU5HIGZvciB0aGF0IHdob2xlIHRpbWUuIFNvIGluXG4gICAgICAvLyBmYWN0LCB3ZSBzaG91bGRuJ3QgYmUgYWJsZSB0byBnZXQgaGVyZS5cblxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQnVmZmVyIGluZXhwbGljYWJseSBlbXB0eVwiKTtcbiAgICB9KTtcbiAgfSxcbiAgX2NoYW5nZVB1Ymxpc2hlZDogZnVuY3Rpb24gKGlkLCBvbGREb2MsIG5ld0RvYykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl9wdWJsaXNoZWQuc2V0KGlkLCBzZWxmLl9zaGFyZWRQcm9qZWN0aW9uRm4obmV3RG9jKSk7XG4gICAgICB2YXIgcHJvamVjdGVkTmV3ID0gc2VsZi5fcHJvamVjdGlvbkZuKG5ld0RvYyk7XG4gICAgICB2YXIgcHJvamVjdGVkT2xkID0gc2VsZi5fcHJvamVjdGlvbkZuKG9sZERvYyk7XG4gICAgICB2YXIgY2hhbmdlZCA9IERpZmZTZXF1ZW5jZS5tYWtlQ2hhbmdlZEZpZWxkcyhcbiAgICAgICAgcHJvamVjdGVkTmV3LCBwcm9qZWN0ZWRPbGQpO1xuICAgICAgaWYgKCFpc0VtcHR5KGNoYW5nZWQpKVxuICAgICAgICBzZWxmLl9tdWx0aXBsZXhlci5jaGFuZ2VkKGlkLCBjaGFuZ2VkKTtcbiAgICB9KTtcbiAgfSxcbiAgX2FkZEJ1ZmZlcmVkOiBmdW5jdGlvbiAoaWQsIGRvYykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zZXQoaWQsIHNlbGYuX3NoYXJlZFByb2plY3Rpb25Gbihkb2MpKTtcblxuICAgICAgLy8gSWYgc29tZXRoaW5nIGlzIG92ZXJmbG93aW5nIHRoZSBidWZmZXIsIHdlIGp1c3QgcmVtb3ZlIGl0IGZyb20gY2FjaGVcbiAgICAgIGlmIChzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkgPiBzZWxmLl9saW1pdCkge1xuICAgICAgICB2YXIgbWF4QnVmZmVyZWRJZCA9IHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLm1heEVsZW1lbnRJZCgpO1xuXG4gICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnJlbW92ZShtYXhCdWZmZXJlZElkKTtcblxuICAgICAgICAvLyBTaW5jZSBzb21ldGhpbmcgbWF0Y2hpbmcgaXMgcmVtb3ZlZCBmcm9tIGNhY2hlIChib3RoIHB1Ymxpc2hlZCBzZXQgYW5kXG4gICAgICAgIC8vIGJ1ZmZlciksIHNldCBmbGFnIHRvIGZhbHNlXG4gICAgICAgIHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlciA9IGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICAvLyBJcyBjYWxsZWQgZWl0aGVyIHRvIHJlbW92ZSB0aGUgZG9jIGNvbXBsZXRlbHkgZnJvbSBtYXRjaGluZyBzZXQgb3IgdG8gbW92ZVxuICAvLyBpdCB0byB0aGUgcHVibGlzaGVkIHNldCBsYXRlci5cbiAgX3JlbW92ZUJ1ZmZlcmVkOiBmdW5jdGlvbiAoaWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIucmVtb3ZlKGlkKTtcbiAgICAgIC8vIFRvIGtlZXAgdGhlIGNvbnRyYWN0IFwiYnVmZmVyIGlzIG5ldmVyIGVtcHR5IGluIFNURUFEWSBwaGFzZSB1bmxlc3MgdGhlXG4gICAgICAvLyBldmVyeXRoaW5nIG1hdGNoaW5nIGZpdHMgaW50byBwdWJsaXNoZWRcIiB0cnVlLCB3ZSBwb2xsIGV2ZXJ5dGhpbmcgYXNcbiAgICAgIC8vIHNvb24gYXMgd2Ugc2VlIHRoZSBidWZmZXIgYmVjb21pbmcgZW1wdHkuXG4gICAgICBpZiAoISBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkgJiYgISBzZWxmLl9zYWZlQXBwZW5kVG9CdWZmZXIpXG4gICAgICAgIHNlbGYuX25lZWRUb1BvbGxRdWVyeSgpO1xuICAgIH0pO1xuICB9LFxuICAvLyBDYWxsZWQgd2hlbiBhIGRvY3VtZW50IGhhcyBqb2luZWQgdGhlIFwiTWF0Y2hpbmdcIiByZXN1bHRzIHNldC5cbiAgLy8gVGFrZXMgcmVzcG9uc2liaWxpdHkgb2Yga2VlcGluZyBfdW5wdWJsaXNoZWRCdWZmZXIgaW4gc3luYyB3aXRoIF9wdWJsaXNoZWRcbiAgLy8gYW5kIHRoZSBlZmZlY3Qgb2YgbGltaXQgZW5mb3JjZWQuXG4gIF9hZGRNYXRjaGluZzogZnVuY3Rpb24gKGRvYykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgaWQgPSBkb2MuX2lkO1xuICAgICAgaWYgKHNlbGYuX3B1Ymxpc2hlZC5oYXMoaWQpKVxuICAgICAgICB0aHJvdyBFcnJvcihcInRyaWVkIHRvIGFkZCBzb21ldGhpbmcgYWxyZWFkeSBwdWJsaXNoZWQgXCIgKyBpZCk7XG4gICAgICBpZiAoc2VsZi5fbGltaXQgJiYgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuaGFzKGlkKSlcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJ0cmllZCB0byBhZGQgc29tZXRoaW5nIGFscmVhZHkgZXhpc3RlZCBpbiBidWZmZXIgXCIgKyBpZCk7XG5cbiAgICAgIHZhciBsaW1pdCA9IHNlbGYuX2xpbWl0O1xuICAgICAgdmFyIGNvbXBhcmF0b3IgPSBzZWxmLl9jb21wYXJhdG9yO1xuICAgICAgdmFyIG1heFB1Ymxpc2hlZCA9IChsaW1pdCAmJiBzZWxmLl9wdWJsaXNoZWQuc2l6ZSgpID4gMCkgP1xuICAgICAgICBzZWxmLl9wdWJsaXNoZWQuZ2V0KHNlbGYuX3B1Ymxpc2hlZC5tYXhFbGVtZW50SWQoKSkgOiBudWxsO1xuICAgICAgdmFyIG1heEJ1ZmZlcmVkID0gKGxpbWl0ICYmIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnNpemUoKSA+IDApXG4gICAgICAgID8gc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuZ2V0KHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLm1heEVsZW1lbnRJZCgpKVxuICAgICAgICA6IG51bGw7XG4gICAgICAvLyBUaGUgcXVlcnkgaXMgdW5saW1pdGVkIG9yIGRpZG4ndCBwdWJsaXNoIGVub3VnaCBkb2N1bWVudHMgeWV0IG9yIHRoZVxuICAgICAgLy8gbmV3IGRvY3VtZW50IHdvdWxkIGZpdCBpbnRvIHB1Ymxpc2hlZCBzZXQgcHVzaGluZyB0aGUgbWF4aW11bSBlbGVtZW50XG4gICAgICAvLyBvdXQsIHRoZW4gd2UgbmVlZCB0byBwdWJsaXNoIHRoZSBkb2MuXG4gICAgICB2YXIgdG9QdWJsaXNoID0gISBsaW1pdCB8fCBzZWxmLl9wdWJsaXNoZWQuc2l6ZSgpIDwgbGltaXQgfHxcbiAgICAgICAgY29tcGFyYXRvcihkb2MsIG1heFB1Ymxpc2hlZCkgPCAwO1xuXG4gICAgICAvLyBPdGhlcndpc2Ugd2UgbWlnaHQgbmVlZCB0byBidWZmZXIgaXQgKG9ubHkgaW4gY2FzZSBvZiBsaW1pdGVkIHF1ZXJ5KS5cbiAgICAgIC8vIEJ1ZmZlcmluZyBpcyBhbGxvd2VkIGlmIHRoZSBidWZmZXIgaXMgbm90IGZpbGxlZCB1cCB5ZXQgYW5kIGFsbFxuICAgICAgLy8gbWF0Y2hpbmcgZG9jcyBhcmUgZWl0aGVyIGluIHRoZSBwdWJsaXNoZWQgc2V0IG9yIGluIHRoZSBidWZmZXIuXG4gICAgICB2YXIgY2FuQXBwZW5kVG9CdWZmZXIgPSAhdG9QdWJsaXNoICYmIHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlciAmJlxuICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkgPCBsaW1pdDtcblxuICAgICAgLy8gT3IgaWYgaXQgaXMgc21hbGwgZW5vdWdoIHRvIGJlIHNhZmVseSBpbnNlcnRlZCB0byB0aGUgbWlkZGxlIG9yIHRoZVxuICAgICAgLy8gYmVnaW5uaW5nIG9mIHRoZSBidWZmZXIuXG4gICAgICB2YXIgY2FuSW5zZXJ0SW50b0J1ZmZlciA9ICF0b1B1Ymxpc2ggJiYgbWF4QnVmZmVyZWQgJiZcbiAgICAgICAgY29tcGFyYXRvcihkb2MsIG1heEJ1ZmZlcmVkKSA8PSAwO1xuXG4gICAgICB2YXIgdG9CdWZmZXIgPSBjYW5BcHBlbmRUb0J1ZmZlciB8fCBjYW5JbnNlcnRJbnRvQnVmZmVyO1xuXG4gICAgICBpZiAodG9QdWJsaXNoKSB7XG4gICAgICAgIHNlbGYuX2FkZFB1Ymxpc2hlZChpZCwgZG9jKTtcbiAgICAgIH0gZWxzZSBpZiAodG9CdWZmZXIpIHtcbiAgICAgICAgc2VsZi5fYWRkQnVmZmVyZWQoaWQsIGRvYyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBkcm9wcGluZyBpdCBhbmQgbm90IHNhdmluZyB0byB0aGUgY2FjaGVcbiAgICAgICAgc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyID0gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIC8vIENhbGxlZCB3aGVuIGEgZG9jdW1lbnQgbGVhdmVzIHRoZSBcIk1hdGNoaW5nXCIgcmVzdWx0cyBzZXQuXG4gIC8vIFRha2VzIHJlc3BvbnNpYmlsaXR5IG9mIGtlZXBpbmcgX3VucHVibGlzaGVkQnVmZmVyIGluIHN5bmMgd2l0aCBfcHVibGlzaGVkXG4gIC8vIGFuZCB0aGUgZWZmZWN0IG9mIGxpbWl0IGVuZm9yY2VkLlxuICBfcmVtb3ZlTWF0Y2hpbmc6IGZ1bmN0aW9uIChpZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoISBzZWxmLl9wdWJsaXNoZWQuaGFzKGlkKSAmJiAhIHNlbGYuX2xpbWl0KVxuICAgICAgICB0aHJvdyBFcnJvcihcInRyaWVkIHRvIHJlbW92ZSBzb21ldGhpbmcgbWF0Y2hpbmcgYnV0IG5vdCBjYWNoZWQgXCIgKyBpZCk7XG5cbiAgICAgIGlmIChzZWxmLl9wdWJsaXNoZWQuaGFzKGlkKSkge1xuICAgICAgICBzZWxmLl9yZW1vdmVQdWJsaXNoZWQoaWQpO1xuICAgICAgfSBlbHNlIGlmIChzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5oYXMoaWQpKSB7XG4gICAgICAgIHNlbGYuX3JlbW92ZUJ1ZmZlcmVkKGlkKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgX2hhbmRsZURvYzogZnVuY3Rpb24gKGlkLCBuZXdEb2MpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIG1hdGNoZXNOb3cgPSBuZXdEb2MgJiYgc2VsZi5fbWF0Y2hlci5kb2N1bWVudE1hdGNoZXMobmV3RG9jKS5yZXN1bHQ7XG5cbiAgICAgIHZhciBwdWJsaXNoZWRCZWZvcmUgPSBzZWxmLl9wdWJsaXNoZWQuaGFzKGlkKTtcbiAgICAgIHZhciBidWZmZXJlZEJlZm9yZSA9IHNlbGYuX2xpbWl0ICYmIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmhhcyhpZCk7XG4gICAgICB2YXIgY2FjaGVkQmVmb3JlID0gcHVibGlzaGVkQmVmb3JlIHx8IGJ1ZmZlcmVkQmVmb3JlO1xuXG4gICAgICBpZiAobWF0Y2hlc05vdyAmJiAhY2FjaGVkQmVmb3JlKSB7XG4gICAgICAgIHNlbGYuX2FkZE1hdGNoaW5nKG5ld0RvYyk7XG4gICAgICB9IGVsc2UgaWYgKGNhY2hlZEJlZm9yZSAmJiAhbWF0Y2hlc05vdykge1xuICAgICAgICBzZWxmLl9yZW1vdmVNYXRjaGluZyhpZCk7XG4gICAgICB9IGVsc2UgaWYgKGNhY2hlZEJlZm9yZSAmJiBtYXRjaGVzTm93KSB7XG4gICAgICAgIHZhciBvbGREb2MgPSBzZWxmLl9wdWJsaXNoZWQuZ2V0KGlkKTtcbiAgICAgICAgdmFyIGNvbXBhcmF0b3IgPSBzZWxmLl9jb21wYXJhdG9yO1xuICAgICAgICB2YXIgbWluQnVmZmVyZWQgPSBzZWxmLl9saW1pdCAmJiBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkgJiZcbiAgICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5nZXQoc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIubWluRWxlbWVudElkKCkpO1xuICAgICAgICB2YXIgbWF4QnVmZmVyZWQ7XG5cbiAgICAgICAgaWYgKHB1Ymxpc2hlZEJlZm9yZSkge1xuICAgICAgICAgIC8vIFVubGltaXRlZCBjYXNlIHdoZXJlIHRoZSBkb2N1bWVudCBzdGF5cyBpbiBwdWJsaXNoZWQgb25jZSBpdFxuICAgICAgICAgIC8vIG1hdGNoZXMgb3IgdGhlIGNhc2Ugd2hlbiB3ZSBkb24ndCBoYXZlIGVub3VnaCBtYXRjaGluZyBkb2NzIHRvXG4gICAgICAgICAgLy8gcHVibGlzaCBvciB0aGUgY2hhbmdlZCBidXQgbWF0Y2hpbmcgZG9jIHdpbGwgc3RheSBpbiBwdWJsaXNoZWRcbiAgICAgICAgICAvLyBhbnl3YXlzLlxuICAgICAgICAgIC8vXG4gICAgICAgICAgLy8gWFhYOiBXZSByZWx5IG9uIHRoZSBlbXB0aW5lc3Mgb2YgYnVmZmVyLiBCZSBzdXJlIHRvIG1haW50YWluIHRoZVxuICAgICAgICAgIC8vIGZhY3QgdGhhdCBidWZmZXIgY2FuJ3QgYmUgZW1wdHkgaWYgdGhlcmUgYXJlIG1hdGNoaW5nIGRvY3VtZW50cyBub3RcbiAgICAgICAgICAvLyBwdWJsaXNoZWQuIE5vdGFibHksIHdlIGRvbid0IHdhbnQgdG8gc2NoZWR1bGUgcmVwb2xsIGFuZCBjb250aW51ZVxuICAgICAgICAgIC8vIHJlbHlpbmcgb24gdGhpcyBwcm9wZXJ0eS5cbiAgICAgICAgICB2YXIgc3RheXNJblB1Ymxpc2hlZCA9ICEgc2VsZi5fbGltaXQgfHxcbiAgICAgICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnNpemUoKSA9PT0gMCB8fFxuICAgICAgICAgICAgY29tcGFyYXRvcihuZXdEb2MsIG1pbkJ1ZmZlcmVkKSA8PSAwO1xuXG4gICAgICAgICAgaWYgKHN0YXlzSW5QdWJsaXNoZWQpIHtcbiAgICAgICAgICAgIHNlbGYuX2NoYW5nZVB1Ymxpc2hlZChpZCwgb2xkRG9jLCBuZXdEb2MpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBhZnRlciB0aGUgY2hhbmdlIGRvYyBkb2Vzbid0IHN0YXkgaW4gdGhlIHB1Ymxpc2hlZCwgcmVtb3ZlIGl0XG4gICAgICAgICAgICBzZWxmLl9yZW1vdmVQdWJsaXNoZWQoaWQpO1xuICAgICAgICAgICAgLy8gYnV0IGl0IGNhbiBtb3ZlIGludG8gYnVmZmVyZWQgbm93LCBjaGVjayBpdFxuICAgICAgICAgICAgbWF4QnVmZmVyZWQgPSBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5nZXQoXG4gICAgICAgICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLm1heEVsZW1lbnRJZCgpKTtcblxuICAgICAgICAgICAgdmFyIHRvQnVmZmVyID0gc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyIHx8XG4gICAgICAgICAgICAgICAgICAobWF4QnVmZmVyZWQgJiYgY29tcGFyYXRvcihuZXdEb2MsIG1heEJ1ZmZlcmVkKSA8PSAwKTtcblxuICAgICAgICAgICAgaWYgKHRvQnVmZmVyKSB7XG4gICAgICAgICAgICAgIHNlbGYuX2FkZEJ1ZmZlcmVkKGlkLCBuZXdEb2MpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gVGhyb3cgYXdheSBmcm9tIGJvdGggcHVibGlzaGVkIHNldCBhbmQgYnVmZmVyXG4gICAgICAgICAgICAgIHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlciA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChidWZmZXJlZEJlZm9yZSkge1xuICAgICAgICAgIG9sZERvYyA9IHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmdldChpZCk7XG4gICAgICAgICAgLy8gcmVtb3ZlIHRoZSBvbGQgdmVyc2lvbiBtYW51YWxseSBpbnN0ZWFkIG9mIHVzaW5nIF9yZW1vdmVCdWZmZXJlZCBzb1xuICAgICAgICAgIC8vIHdlIGRvbid0IHRyaWdnZXIgdGhlIHF1ZXJ5aW5nIGltbWVkaWF0ZWx5LiAgaWYgd2UgZW5kIHRoaXMgYmxvY2tcbiAgICAgICAgICAvLyB3aXRoIHRoZSBidWZmZXIgZW1wdHksIHdlIHdpbGwgbmVlZCB0byB0cmlnZ2VyIHRoZSBxdWVyeSBwb2xsXG4gICAgICAgICAgLy8gbWFudWFsbHkgdG9vLlxuICAgICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnJlbW92ZShpZCk7XG5cbiAgICAgICAgICB2YXIgbWF4UHVibGlzaGVkID0gc2VsZi5fcHVibGlzaGVkLmdldChcbiAgICAgICAgICAgIHNlbGYuX3B1Ymxpc2hlZC5tYXhFbGVtZW50SWQoKSk7XG4gICAgICAgICAgbWF4QnVmZmVyZWQgPSBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkgJiZcbiAgICAgICAgICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5nZXQoXG4gICAgICAgICAgICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5tYXhFbGVtZW50SWQoKSk7XG5cbiAgICAgICAgICAvLyB0aGUgYnVmZmVyZWQgZG9jIHdhcyB1cGRhdGVkLCBpdCBjb3VsZCBtb3ZlIHRvIHB1Ymxpc2hlZFxuICAgICAgICAgIHZhciB0b1B1Ymxpc2ggPSBjb21wYXJhdG9yKG5ld0RvYywgbWF4UHVibGlzaGVkKSA8IDA7XG5cbiAgICAgICAgICAvLyBvciBzdGF5cyBpbiBidWZmZXIgZXZlbiBhZnRlciB0aGUgY2hhbmdlXG4gICAgICAgICAgdmFyIHN0YXlzSW5CdWZmZXIgPSAoISB0b1B1Ymxpc2ggJiYgc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyKSB8fFxuICAgICAgICAgICAgICAgICghdG9QdWJsaXNoICYmIG1heEJ1ZmZlcmVkICYmXG4gICAgICAgICAgICAgICAgIGNvbXBhcmF0b3IobmV3RG9jLCBtYXhCdWZmZXJlZCkgPD0gMCk7XG5cbiAgICAgICAgICBpZiAodG9QdWJsaXNoKSB7XG4gICAgICAgICAgICBzZWxmLl9hZGRQdWJsaXNoZWQoaWQsIG5ld0RvYyk7XG4gICAgICAgICAgfSBlbHNlIGlmIChzdGF5c0luQnVmZmVyKSB7XG4gICAgICAgICAgICAvLyBzdGF5cyBpbiBidWZmZXIgYnV0IGNoYW5nZXNcbiAgICAgICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnNldChpZCwgbmV3RG9jKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVGhyb3cgYXdheSBmcm9tIGJvdGggcHVibGlzaGVkIHNldCBhbmQgYnVmZmVyXG4gICAgICAgICAgICBzZWxmLl9zYWZlQXBwZW5kVG9CdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIC8vIE5vcm1hbGx5IHRoaXMgY2hlY2sgd291bGQgaGF2ZSBiZWVuIGRvbmUgaW4gX3JlbW92ZUJ1ZmZlcmVkIGJ1dFxuICAgICAgICAgICAgLy8gd2UgZGlkbid0IHVzZSBpdCwgc28gd2UgbmVlZCB0byBkbyBpdCBvdXJzZWxmIG5vdy5cbiAgICAgICAgICAgIGlmICghIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnNpemUoKSkge1xuICAgICAgICAgICAgICBzZWxmLl9uZWVkVG9Qb2xsUXVlcnkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiY2FjaGVkQmVmb3JlIGltcGxpZXMgZWl0aGVyIG9mIHB1Ymxpc2hlZEJlZm9yZSBvciBidWZmZXJlZEJlZm9yZSBpcyB0cnVlLlwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICBfZmV0Y2hNb2RpZmllZERvY3VtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLl9yZWdpc3RlclBoYXNlQ2hhbmdlKFBIQVNFLkZFVENISU5HKTtcbiAgICAvLyBEZWZlciwgYmVjYXVzZSBub3RoaW5nIGNhbGxlZCBmcm9tIHRoZSBvcGxvZyBlbnRyeSBoYW5kbGVyIG1heSB5aWVsZCxcbiAgICAvLyBidXQgZmV0Y2goKSB5aWVsZHMuXG4gICAgTWV0ZW9yLmRlZmVyKGZpbmlzaElmTmVlZFRvUG9sbFF1ZXJ5KGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICAgIHdoaWxlICghc2VsZi5fc3RvcHBlZCAmJiAhc2VsZi5fbmVlZFRvRmV0Y2guZW1wdHkoKSkge1xuICAgICAgICBpZiAoc2VsZi5fcGhhc2UgPT09IFBIQVNFLlFVRVJZSU5HKSB7XG4gICAgICAgICAgLy8gV2hpbGUgZmV0Y2hpbmcsIHdlIGRlY2lkZWQgdG8gZ28gaW50byBRVUVSWUlORyBtb2RlLCBhbmQgdGhlbiB3ZVxuICAgICAgICAgIC8vIHNhdyBhbm90aGVyIG9wbG9nIGVudHJ5LCBzbyBfbmVlZFRvRmV0Y2ggaXMgbm90IGVtcHR5LiBCdXQgd2VcbiAgICAgICAgICAvLyBzaG91bGRuJ3QgZmV0Y2ggdGhlc2UgZG9jdW1lbnRzIHVudGlsIEFGVEVSIHRoZSBxdWVyeSBpcyBkb25lLlxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQmVpbmcgaW4gc3RlYWR5IHBoYXNlIGhlcmUgd291bGQgYmUgc3VycHJpc2luZy5cbiAgICAgICAgaWYgKHNlbGYuX3BoYXNlICE9PSBQSEFTRS5GRVRDSElORylcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwaGFzZSBpbiBmZXRjaE1vZGlmaWVkRG9jdW1lbnRzOiBcIiArIHNlbGYuX3BoYXNlKTtcblxuICAgICAgICBzZWxmLl9jdXJyZW50bHlGZXRjaGluZyA9IHNlbGYuX25lZWRUb0ZldGNoO1xuICAgICAgICB2YXIgdGhpc0dlbmVyYXRpb24gPSArK3NlbGYuX2ZldGNoR2VuZXJhdGlvbjtcbiAgICAgICAgc2VsZi5fbmVlZFRvRmV0Y2ggPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcblxuICAgICAgICAvLyBDcmVhdGUgYW4gYXJyYXkgb2YgcHJvbWlzZXMgZm9yIGFsbCB0aGUgZmV0Y2ggb3BlcmF0aW9uc1xuICAgICAgICBjb25zdCBmZXRjaFByb21pc2VzID0gW107XG5cbiAgICAgICAgc2VsZi5fY3VycmVudGx5RmV0Y2hpbmcuZm9yRWFjaChmdW5jdGlvbiAob3AsIGlkKSB7XG4gICAgICAgICAgY29uc3QgZmV0Y2hQcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgc2VsZi5fbW9uZ29IYW5kbGUuX2RvY0ZldGNoZXIuZmV0Y2goXG4gICAgICAgICAgICAgIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLmNvbGxlY3Rpb25OYW1lLFxuICAgICAgICAgICAgICBpZCxcbiAgICAgICAgICAgICAgb3AsXG4gICAgICAgICAgICAgIGZpbmlzaElmTmVlZFRvUG9sbFF1ZXJ5KGZ1bmN0aW9uKGVyciwgZG9jKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgTWV0ZW9yLl9kZWJ1ZygnR290IGV4Y2VwdGlvbiB3aGlsZSBmZXRjaGluZyBkb2N1bWVudHMnLCBlcnIpO1xuICAgICAgICAgICAgICAgICAgLy8gSWYgd2UgZ2V0IGFuIGVycm9yIGZyb20gdGhlIGZldGNoZXIgKGVnLCB0cm91YmxlXG4gICAgICAgICAgICAgICAgICAvLyBjb25uZWN0aW5nIHRvIE1vbmdvKSwgbGV0J3MganVzdCBhYmFuZG9uIHRoZSBmZXRjaCBwaGFzZVxuICAgICAgICAgICAgICAgICAgLy8gYWx0b2dldGhlciBhbmQgZmFsbCBiYWNrIHRvIHBvbGxpbmcuIEl0J3Mgbm90IGxpa2Ugd2UncmVcbiAgICAgICAgICAgICAgICAgIC8vIGdldHRpbmcgbGl2ZSB1cGRhdGVzIGFueXdheS5cbiAgICAgICAgICAgICAgICAgIGlmIChzZWxmLl9waGFzZSAhPT0gUEhBU0UuUVVFUllJTkcpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5fbmVlZFRvUG9sbFF1ZXJ5KCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgICAgIXNlbGYuX3N0b3BwZWQgJiZcbiAgICAgICAgICAgICAgICAgIHNlbGYuX3BoYXNlID09PSBQSEFTRS5GRVRDSElORyAmJlxuICAgICAgICAgICAgICAgICAgc2VsZi5fZmV0Y2hHZW5lcmF0aW9uID09PSB0aGlzR2VuZXJhdGlvblxuICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgLy8gV2UgcmUtY2hlY2sgdGhlIGdlbmVyYXRpb24gaW4gY2FzZSB3ZSd2ZSBoYWQgYW4gZXhwbGljaXRcbiAgICAgICAgICAgICAgICAgIC8vIF9wb2xsUXVlcnkgY2FsbCAoZWcsIGluIGFub3RoZXIgZmliZXIpIHdoaWNoIHNob3VsZFxuICAgICAgICAgICAgICAgICAgLy8gZWZmZWN0aXZlbHkgY2FuY2VsIHRoaXMgcm91bmQgb2YgZmV0Y2hlcy4gIChfcG9sbFF1ZXJ5XG4gICAgICAgICAgICAgICAgICAvLyBpbmNyZW1lbnRzIHRoZSBnZW5lcmF0aW9uLilcbiAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX2hhbmRsZURvYyhpZCwgZG9jKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgKVxuICAgICAgICAgIH0pXG4gICAgICAgICAgZmV0Y2hQcm9taXNlcy5wdXNoKGZldGNoUHJvbWlzZSk7XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBXYWl0IGZvciBhbGwgZmV0Y2ggb3BlcmF0aW9ucyB0byBjb21wbGV0ZVxuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBQcm9taXNlLmFsbFNldHRsZWQoZmV0Y2hQcm9taXNlcyk7XG4gICAgICAgICAgY29uc3QgZXJyb3JzID0gcmVzdWx0c1xuICAgICAgICAgICAgLmZpbHRlcihyZXN1bHQgPT4gcmVzdWx0LnN0YXR1cyA9PT0gJ3JlamVjdGVkJylcbiAgICAgICAgICAgIC5tYXAocmVzdWx0ID0+IHJlc3VsdC5yZWFzb24pO1xuXG4gICAgICAgICAgaWYgKGVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBNZXRlb3IuX2RlYnVnKCdTb21lIGZldGNoIHF1ZXJpZXMgZmFpbGVkOicsIGVycm9ycyk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBNZXRlb3IuX2RlYnVnKCdHb3QgYW4gZXhjZXB0aW9uIGluIGEgZmV0Y2ggcXVlcnknLCBlcnIpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEV4aXQgbm93IGlmIHdlJ3ZlIGhhZCBhIF9wb2xsUXVlcnkgY2FsbCAoaGVyZSBvciBpbiBhbm90aGVyIGZpYmVyKS5cbiAgICAgICAgaWYgKHNlbGYuX3BoYXNlID09PSBQSEFTRS5RVUVSWUlORylcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIHNlbGYuX2N1cnJlbnRseUZldGNoaW5nID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIC8vIFdlJ3JlIGRvbmUgZmV0Y2hpbmcsIHNvIHdlIGNhbiBiZSBzdGVhZHksIHVubGVzcyB3ZSd2ZSBoYWQgYVxuICAgICAgLy8gX3BvbGxRdWVyeSBjYWxsIChoZXJlIG9yIGluIGFub3RoZXIgZmliZXIpLlxuICAgICAgaWYgKHNlbGYuX3BoYXNlICE9PSBQSEFTRS5RVUVSWUlORylcbiAgICAgICAgYXdhaXQgc2VsZi5fYmVTdGVhZHkoKTtcbiAgICB9KSk7XG4gIH0sXG4gIF9iZVN0ZWFkeTogYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLl9yZWdpc3RlclBoYXNlQ2hhbmdlKFBIQVNFLlNURUFEWSk7XG4gICAgdmFyIHdyaXRlcyA9IHNlbGYuX3dyaXRlc1RvQ29tbWl0V2hlbldlUmVhY2hTdGVhZHkgfHwgW107XG4gICAgc2VsZi5fd3JpdGVzVG9Db21taXRXaGVuV2VSZWFjaFN0ZWFkeSA9IFtdO1xuICAgIGF3YWl0IHNlbGYuX211bHRpcGxleGVyLm9uRmx1c2goYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgZm9yIChjb25zdCB3IG9mIHdyaXRlcykge1xuICAgICAgICAgIGF3YWl0IHcuY29tbWl0dGVkKCk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIl9iZVN0ZWFkeSBlcnJvclwiLCB7d3JpdGVzfSwgZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIF9oYW5kbGVPcGxvZ0VudHJ5UXVlcnlpbmc6IGZ1bmN0aW9uIChvcCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl9uZWVkVG9GZXRjaC5zZXQoaWRGb3JPcChvcCksIG9wKTtcbiAgICB9KTtcbiAgfSxcbiAgX2hhbmRsZU9wbG9nRW50cnlTdGVhZHlPckZldGNoaW5nOiBmdW5jdGlvbiAob3ApIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGlkID0gaWRGb3JPcChvcCk7XG4gICAgICAvLyBJZiB3ZSdyZSBhbHJlYWR5IGZldGNoaW5nIHRoaXMgb25lLCBvciBhYm91dCB0bywgd2UgY2FuJ3Qgb3B0aW1pemU7XG4gICAgICAvLyBtYWtlIHN1cmUgdGhhdCB3ZSBmZXRjaCBpdCBhZ2FpbiBpZiBuZWNlc3NhcnkuXG5cbiAgICAgIGlmIChzZWxmLl9waGFzZSA9PT0gUEhBU0UuRkVUQ0hJTkcgJiZcbiAgICAgICAgICAoKHNlbGYuX2N1cnJlbnRseUZldGNoaW5nICYmIHNlbGYuX2N1cnJlbnRseUZldGNoaW5nLmhhcyhpZCkpIHx8XG4gICAgICAgICAgIHNlbGYuX25lZWRUb0ZldGNoLmhhcyhpZCkpKSB7XG4gICAgICAgIHNlbGYuX25lZWRUb0ZldGNoLnNldChpZCwgb3ApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChvcC5vcCA9PT0gJ2QnKSB7XG4gICAgICAgIGlmIChzZWxmLl9wdWJsaXNoZWQuaGFzKGlkKSB8fFxuICAgICAgICAgICAgKHNlbGYuX2xpbWl0ICYmIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmhhcyhpZCkpKVxuICAgICAgICAgIHNlbGYuX3JlbW92ZU1hdGNoaW5nKGlkKTtcbiAgICAgIH0gZWxzZSBpZiAob3Aub3AgPT09ICdpJykge1xuICAgICAgICBpZiAoc2VsZi5fcHVibGlzaGVkLmhhcyhpZCkpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiaW5zZXJ0IGZvdW5kIGZvciBhbHJlYWR5LWV4aXN0aW5nIElEIGluIHB1Ymxpc2hlZFwiKTtcbiAgICAgICAgaWYgKHNlbGYuX3VucHVibGlzaGVkQnVmZmVyICYmIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmhhcyhpZCkpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiaW5zZXJ0IGZvdW5kIGZvciBhbHJlYWR5LWV4aXN0aW5nIElEIGluIGJ1ZmZlclwiKTtcblxuICAgICAgICAvLyBYWFggd2hhdCBpZiBzZWxlY3RvciB5aWVsZHM/ICBmb3Igbm93IGl0IGNhbid0IGJ1dCBsYXRlciBpdCBjb3VsZFxuICAgICAgICAvLyBoYXZlICR3aGVyZVxuICAgICAgICBpZiAoc2VsZi5fbWF0Y2hlci5kb2N1bWVudE1hdGNoZXMob3AubykucmVzdWx0KVxuICAgICAgICAgIHNlbGYuX2FkZE1hdGNoaW5nKG9wLm8pO1xuICAgICAgfSBlbHNlIGlmIChvcC5vcCA9PT0gJ3UnKSB7XG4gICAgICAgIC8vIHdlIGFyZSBtYXBwaW5nIHRoZSBuZXcgb3Bsb2cgZm9ybWF0IG9uIG1vbmdvIDVcbiAgICAgICAgLy8gdG8gd2hhdCB3ZSBrbm93IGJldHRlciwgJHNldFxuICAgICAgICBvcC5vID0gb3Bsb2dWMlYxQ29udmVydGVyKG9wLm8pXG4gICAgICAgIC8vIElzIHRoaXMgYSBtb2RpZmllciAoJHNldC8kdW5zZXQsIHdoaWNoIG1heSByZXF1aXJlIHVzIHRvIHBvbGwgdGhlXG4gICAgICAgIC8vIGRhdGFiYXNlIHRvIGZpZ3VyZSBvdXQgaWYgdGhlIHdob2xlIGRvY3VtZW50IG1hdGNoZXMgdGhlIHNlbGVjdG9yKSBvclxuICAgICAgICAvLyBhIHJlcGxhY2VtZW50IChpbiB3aGljaCBjYXNlIHdlIGNhbiBqdXN0IGRpcmVjdGx5IHJlLWV2YWx1YXRlIHRoZVxuICAgICAgICAvLyBzZWxlY3Rvcik/XG4gICAgICAgIC8vIG9wbG9nIGZvcm1hdCBoYXMgY2hhbmdlZCBvbiBtb25nb2RiIDUsIHdlIGhhdmUgdG8gc3VwcG9ydCBib3RoIG5vd1xuICAgICAgICAvLyBkaWZmIGlzIHRoZSBmb3JtYXQgaW4gTW9uZ28gNSsgKG9wbG9nIHYyKVxuICAgICAgICB2YXIgaXNSZXBsYWNlID0gIWhhcyhvcC5vLCAnJHNldCcpICYmICFoYXMob3AubywgJ2RpZmYnKSAmJiAhaGFzKG9wLm8sICckdW5zZXQnKTtcbiAgICAgICAgLy8gSWYgdGhpcyBtb2RpZmllciBtb2RpZmllcyBzb21ldGhpbmcgaW5zaWRlIGFuIEVKU09OIGN1c3RvbSB0eXBlIChpZSxcbiAgICAgICAgLy8gYW55dGhpbmcgd2l0aCBFSlNPTiQpLCB0aGVuIHdlIGNhbid0IHRyeSB0byB1c2VcbiAgICAgICAgLy8gTG9jYWxDb2xsZWN0aW9uLl9tb2RpZnksIHNpbmNlIHRoYXQganVzdCBtdXRhdGVzIHRoZSBFSlNPTiBlbmNvZGluZyxcbiAgICAgICAgLy8gbm90IHRoZSBhY3R1YWwgb2JqZWN0LlxuICAgICAgICB2YXIgY2FuRGlyZWN0bHlNb2RpZnlEb2MgPVxuICAgICAgICAgICFpc1JlcGxhY2UgJiYgbW9kaWZpZXJDYW5CZURpcmVjdGx5QXBwbGllZChvcC5vKTtcblxuICAgICAgICB2YXIgcHVibGlzaGVkQmVmb3JlID0gc2VsZi5fcHVibGlzaGVkLmhhcyhpZCk7XG4gICAgICAgIHZhciBidWZmZXJlZEJlZm9yZSA9IHNlbGYuX2xpbWl0ICYmIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmhhcyhpZCk7XG5cbiAgICAgICAgaWYgKGlzUmVwbGFjZSkge1xuICAgICAgICAgIHNlbGYuX2hhbmRsZURvYyhpZCwgT2JqZWN0LmFzc2lnbih7X2lkOiBpZH0sIG9wLm8pKTtcbiAgICAgICAgfSBlbHNlIGlmICgocHVibGlzaGVkQmVmb3JlIHx8IGJ1ZmZlcmVkQmVmb3JlKSAmJlxuICAgICAgICAgICAgICAgICAgIGNhbkRpcmVjdGx5TW9kaWZ5RG9jKSB7XG4gICAgICAgICAgLy8gT2ggZ3JlYXQsIHdlIGFjdHVhbGx5IGtub3cgd2hhdCB0aGUgZG9jdW1lbnQgaXMsIHNvIHdlIGNhbiBhcHBseVxuICAgICAgICAgIC8vIHRoaXMgZGlyZWN0bHkuXG4gICAgICAgICAgdmFyIG5ld0RvYyA9IHNlbGYuX3B1Ymxpc2hlZC5oYXMoaWQpXG4gICAgICAgICAgICA/IHNlbGYuX3B1Ymxpc2hlZC5nZXQoaWQpIDogc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuZ2V0KGlkKTtcbiAgICAgICAgICBuZXdEb2MgPSBFSlNPTi5jbG9uZShuZXdEb2MpO1xuXG4gICAgICAgICAgbmV3RG9jLl9pZCA9IGlkO1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBMb2NhbENvbGxlY3Rpb24uX21vZGlmeShuZXdEb2MsIG9wLm8pO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGlmIChlLm5hbWUgIT09IFwiTWluaW1vbmdvRXJyb3JcIilcbiAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIC8vIFdlIGRpZG4ndCB1bmRlcnN0YW5kIHRoZSBtb2RpZmllci4gIFJlLWZldGNoLlxuICAgICAgICAgICAgc2VsZi5fbmVlZFRvRmV0Y2guc2V0KGlkLCBvcCk7XG4gICAgICAgICAgICBpZiAoc2VsZi5fcGhhc2UgPT09IFBIQVNFLlNURUFEWSkge1xuICAgICAgICAgICAgICBzZWxmLl9mZXRjaE1vZGlmaWVkRG9jdW1lbnRzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHNlbGYuX2hhbmRsZURvYyhpZCwgc2VsZi5fc2hhcmVkUHJvamVjdGlvbkZuKG5ld0RvYykpO1xuICAgICAgICB9IGVsc2UgaWYgKCFjYW5EaXJlY3RseU1vZGlmeURvYyB8fFxuICAgICAgICAgICAgICAgICAgIHNlbGYuX21hdGNoZXIuY2FuQmVjb21lVHJ1ZUJ5TW9kaWZpZXIob3AubykgfHxcbiAgICAgICAgICAgICAgICAgICAoc2VsZi5fc29ydGVyICYmIHNlbGYuX3NvcnRlci5hZmZlY3RlZEJ5TW9kaWZpZXIob3AubykpKSB7XG4gICAgICAgICAgc2VsZi5fbmVlZFRvRmV0Y2guc2V0KGlkLCBvcCk7XG4gICAgICAgICAgaWYgKHNlbGYuX3BoYXNlID09PSBQSEFTRS5TVEVBRFkpXG4gICAgICAgICAgICBzZWxmLl9mZXRjaE1vZGlmaWVkRG9jdW1lbnRzKCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IEVycm9yKFwiWFhYIFNVUlBSSVNJTkcgT1BFUkFUSU9OOiBcIiArIG9wKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICBhc3luYyBfcnVuSW5pdGlhbFF1ZXJ5QXN5bmMoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwib3Bsb2cgc3RvcHBlZCBzdXJwcmlzaW5nbHkgZWFybHlcIik7XG5cbiAgICBhd2FpdCBzZWxmLl9ydW5RdWVyeSh7aW5pdGlhbDogdHJ1ZX0pOyAgLy8geWllbGRzXG5cbiAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgIHJldHVybjsgIC8vIGNhbiBoYXBwZW4gb24gcXVlcnlFcnJvclxuXG4gICAgLy8gQWxsb3cgb2JzZXJ2ZUNoYW5nZXMgY2FsbHMgdG8gcmV0dXJuLiAoQWZ0ZXIgdGhpcywgaXQncyBwb3NzaWJsZSBmb3JcbiAgICAvLyBzdG9wKCkgdG8gYmUgY2FsbGVkLilcbiAgICBhd2FpdCBzZWxmLl9tdWx0aXBsZXhlci5yZWFkeSgpO1xuXG4gICAgYXdhaXQgc2VsZi5fZG9uZVF1ZXJ5aW5nKCk7ICAvLyB5aWVsZHNcbiAgfSxcblxuICAvLyBZaWVsZHMhXG4gIF9ydW5Jbml0aWFsUXVlcnk6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fcnVuSW5pdGlhbFF1ZXJ5QXN5bmMoKTtcbiAgfSxcblxuICAvLyBJbiB2YXJpb3VzIGNpcmN1bXN0YW5jZXMsIHdlIG1heSBqdXN0IHdhbnQgdG8gc3RvcCBwcm9jZXNzaW5nIHRoZSBvcGxvZyBhbmRcbiAgLy8gcmUtcnVuIHRoZSBpbml0aWFsIHF1ZXJ5LCBqdXN0IGFzIGlmIHdlIHdlcmUgYSBQb2xsaW5nT2JzZXJ2ZURyaXZlci5cbiAgLy9cbiAgLy8gVGhpcyBmdW5jdGlvbiBtYXkgbm90IGJsb2NrLCBiZWNhdXNlIGl0IGlzIGNhbGxlZCBmcm9tIGFuIG9wbG9nIGVudHJ5XG4gIC8vIGhhbmRsZXIuXG4gIC8vXG4gIC8vIFhYWCBXZSBzaG91bGQgY2FsbCB0aGlzIHdoZW4gd2UgZGV0ZWN0IHRoYXQgd2UndmUgYmVlbiBpbiBGRVRDSElORyBmb3IgXCJ0b29cbiAgLy8gbG9uZ1wiLlxuICAvL1xuICAvLyBYWFggV2Ugc2hvdWxkIGNhbGwgdGhpcyB3aGVuIHdlIGRldGVjdCBNb25nbyBmYWlsb3ZlciAoc2luY2UgdGhhdCBtaWdodFxuICAvLyBtZWFuIHRoYXQgc29tZSBvZiB0aGUgb3Bsb2cgZW50cmllcyB3ZSBoYXZlIHByb2Nlc3NlZCBoYXZlIGJlZW4gcm9sbGVkXG4gIC8vIGJhY2spLiBUaGUgTm9kZSBNb25nbyBkcml2ZXIgaXMgaW4gdGhlIG1pZGRsZSBvZiBhIGJ1bmNoIG9mIGh1Z2VcbiAgLy8gcmVmYWN0b3JpbmdzLCBpbmNsdWRpbmcgdGhlIHdheSB0aGF0IGl0IG5vdGlmaWVzIHlvdSB3aGVuIHByaW1hcnlcbiAgLy8gY2hhbmdlcy4gV2lsbCBwdXQgb2ZmIGltcGxlbWVudGluZyB0aGlzIHVudGlsIGRyaXZlciAxLjQgaXMgb3V0LlxuICBfcG9sbFF1ZXJ5OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgICByZXR1cm47XG5cbiAgICAgIC8vIFlheSwgd2UgZ2V0IHRvIGZvcmdldCBhYm91dCBhbGwgdGhlIHRoaW5ncyB3ZSB0aG91Z2h0IHdlIGhhZCB0byBmZXRjaC5cbiAgICAgIHNlbGYuX25lZWRUb0ZldGNoID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gICAgICBzZWxmLl9jdXJyZW50bHlGZXRjaGluZyA9IG51bGw7XG4gICAgICArK3NlbGYuX2ZldGNoR2VuZXJhdGlvbjsgIC8vIGlnbm9yZSBhbnkgaW4tZmxpZ2h0IGZldGNoZXNcbiAgICAgIHNlbGYuX3JlZ2lzdGVyUGhhc2VDaGFuZ2UoUEhBU0UuUVVFUllJTkcpO1xuXG4gICAgICAvLyBEZWZlciBzbyB0aGF0IHdlIGRvbid0IHlpZWxkLiAgV2UgZG9uJ3QgbmVlZCBmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeVxuICAgICAgLy8gaGVyZSBiZWNhdXNlIFN3aXRjaGVkVG9RdWVyeSBpcyBub3QgdGhyb3duIGluIFFVRVJZSU5HIG1vZGUuXG4gICAgICBNZXRlb3IuZGVmZXIoYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgICAgICBhd2FpdCBzZWxmLl9ydW5RdWVyeSgpO1xuICAgICAgICBhd2FpdCBzZWxmLl9kb25lUXVlcnlpbmcoKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIFlpZWxkcyFcbiAgYXN5bmMgX3J1blF1ZXJ5QXN5bmMob3B0aW9ucykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB2YXIgbmV3UmVzdWx0cywgbmV3QnVmZmVyO1xuXG4gICAgLy8gVGhpcyB3aGlsZSBsb29wIGlzIGp1c3QgdG8gcmV0cnkgZmFpbHVyZXMuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIC8vIElmIHdlJ3ZlIGJlZW4gc3RvcHBlZCwgd2UgZG9uJ3QgaGF2ZSB0byBydW4gYW55dGhpbmcgYW55IG1vcmUuXG4gICAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICBuZXdSZXN1bHRzID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gICAgICBuZXdCdWZmZXIgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcblxuICAgICAgLy8gUXVlcnkgMnggZG9jdW1lbnRzIGFzIHRoZSBoYWxmIGV4Y2x1ZGVkIGZyb20gdGhlIG9yaWdpbmFsIHF1ZXJ5IHdpbGwgZ29cbiAgICAgIC8vIGludG8gdW5wdWJsaXNoZWQgYnVmZmVyIHRvIHJlZHVjZSBhZGRpdGlvbmFsIE1vbmdvIGxvb2t1cHMgaW4gY2FzZXNcbiAgICAgIC8vIHdoZW4gZG9jdW1lbnRzIGFyZSByZW1vdmVkIGZyb20gdGhlIHB1Ymxpc2hlZCBzZXQgYW5kIG5lZWQgYVxuICAgICAgLy8gcmVwbGFjZW1lbnQuXG4gICAgICAvLyBYWFggbmVlZHMgbW9yZSB0aG91Z2h0IG9uIG5vbi16ZXJvIHNraXBcbiAgICAgIC8vIFhYWCAyIGlzIGEgXCJtYWdpYyBudW1iZXJcIiBtZWFuaW5nIHRoZXJlIGlzIGFuIGV4dHJhIGNodW5rIG9mIGRvY3MgZm9yXG4gICAgICAvLyBidWZmZXIgaWYgc3VjaCBpcyBuZWVkZWQuXG4gICAgICB2YXIgY3Vyc29yID0gc2VsZi5fY3Vyc29yRm9yUXVlcnkoeyBsaW1pdDogc2VsZi5fbGltaXQgKiAyIH0pO1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgY3Vyc29yLmZvckVhY2goZnVuY3Rpb24gKGRvYywgaSkgeyAgLy8geWllbGRzXG4gICAgICAgICAgaWYgKCFzZWxmLl9saW1pdCB8fCBpIDwgc2VsZi5fbGltaXQpIHtcbiAgICAgICAgICAgIG5ld1Jlc3VsdHMuc2V0KGRvYy5faWQsIGRvYyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5ld0J1ZmZlci5zZXQoZG9jLl9pZCwgZG9jKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBicmVhaztcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMuaW5pdGlhbCAmJiB0eXBlb2YoZS5jb2RlKSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAvLyBUaGlzIGlzIGFuIGVycm9yIGRvY3VtZW50IHNlbnQgdG8gdXMgYnkgbW9uZ29kLCBub3QgYSBjb25uZWN0aW9uXG4gICAgICAgICAgLy8gZXJyb3IgZ2VuZXJhdGVkIGJ5IHRoZSBjbGllbnQuIEFuZCB3ZSd2ZSBuZXZlciBzZWVuIHRoaXMgcXVlcnkgd29ya1xuICAgICAgICAgIC8vIHN1Y2Nlc3NmdWxseS4gUHJvYmFibHkgaXQncyBhIGJhZCBzZWxlY3RvciBvciBzb21ldGhpbmcsIHNvIHdlXG4gICAgICAgICAgLy8gc2hvdWxkIE5PVCByZXRyeS4gSW5zdGVhZCwgd2Ugc2hvdWxkIGhhbHQgdGhlIG9ic2VydmUgKHdoaWNoIGVuZHNcbiAgICAgICAgICAvLyB1cCBjYWxsaW5nIGBzdG9wYCBvbiB1cykuXG4gICAgICAgICAgYXdhaXQgc2VsZi5fbXVsdGlwbGV4ZXIucXVlcnlFcnJvcihlKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEdXJpbmcgZmFpbG92ZXIgKGVnKSBpZiB3ZSBnZXQgYW4gZXhjZXB0aW9uIHdlIHNob3VsZCBsb2cgYW5kIHJldHJ5XG4gICAgICAgIC8vIGluc3RlYWQgb2YgY3Jhc2hpbmcuXG4gICAgICAgIE1ldGVvci5fZGVidWcoXCJHb3QgZXhjZXB0aW9uIHdoaWxlIHBvbGxpbmcgcXVlcnlcIiwgZSk7XG4gICAgICAgIGF3YWl0IE1ldGVvci5fc2xlZXBGb3JNcygxMDApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgc2VsZi5fcHVibGlzaE5ld1Jlc3VsdHMobmV3UmVzdWx0cywgbmV3QnVmZmVyKTtcbiAgfSxcblxuICAvLyBZaWVsZHMhXG4gIF9ydW5RdWVyeTogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICByZXR1cm4gdGhpcy5fcnVuUXVlcnlBc3luYyhvcHRpb25zKTtcbiAgfSxcblxuICAvLyBUcmFuc2l0aW9ucyB0byBRVUVSWUlORyBhbmQgcnVucyBhbm90aGVyIHF1ZXJ5LCBvciAoaWYgYWxyZWFkeSBpbiBRVUVSWUlORylcbiAgLy8gZW5zdXJlcyB0aGF0IHdlIHdpbGwgcXVlcnkgYWdhaW4gbGF0ZXIuXG4gIC8vXG4gIC8vIFRoaXMgZnVuY3Rpb24gbWF5IG5vdCBibG9jaywgYmVjYXVzZSBpdCBpcyBjYWxsZWQgZnJvbSBhbiBvcGxvZyBlbnRyeVxuICAvLyBoYW5kbGVyLiBIb3dldmVyLCBpZiB3ZSB3ZXJlIG5vdCBhbHJlYWR5IGluIHRoZSBRVUVSWUlORyBwaGFzZSwgaXQgdGhyb3dzXG4gIC8vIGFuIGV4Y2VwdGlvbiB0aGF0IGlzIGNhdWdodCBieSB0aGUgY2xvc2VzdCBzdXJyb3VuZGluZ1xuICAvLyBmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeSBjYWxsOyB0aGlzIGVuc3VyZXMgdGhhdCB3ZSBkb24ndCBjb250aW51ZSBydW5uaW5nXG4gIC8vIGNsb3NlIHRoYXQgd2FzIGRlc2lnbmVkIGZvciBhbm90aGVyIHBoYXNlIGluc2lkZSBQSEFTRS5RVUVSWUlORy5cbiAgLy9cbiAgLy8gKEl0J3MgYWxzbyBuZWNlc3Nhcnkgd2hlbmV2ZXIgbG9naWMgaW4gdGhpcyBmaWxlIHlpZWxkcyB0byBjaGVjayB0aGF0IG90aGVyXG4gIC8vIHBoYXNlcyBoYXZlbid0IHB1dCB1cyBpbnRvIFFVRVJZSU5HIG1vZGUsIHRob3VnaDsgZWcsXG4gIC8vIF9mZXRjaE1vZGlmaWVkRG9jdW1lbnRzIGRvZXMgdGhpcy4pXG4gIF9uZWVkVG9Qb2xsUXVlcnk6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICAgIHJldHVybjtcblxuICAgICAgLy8gSWYgd2UncmUgbm90IGFscmVhZHkgaW4gdGhlIG1pZGRsZSBvZiBhIHF1ZXJ5LCB3ZSBjYW4gcXVlcnkgbm93XG4gICAgICAvLyAocG9zc2libHkgcGF1c2luZyBGRVRDSElORykuXG4gICAgICBpZiAoc2VsZi5fcGhhc2UgIT09IFBIQVNFLlFVRVJZSU5HKSB7XG4gICAgICAgIHNlbGYuX3BvbGxRdWVyeSgpO1xuICAgICAgICB0aHJvdyBuZXcgU3dpdGNoZWRUb1F1ZXJ5O1xuICAgICAgfVxuXG4gICAgICAvLyBXZSdyZSBjdXJyZW50bHkgaW4gUVVFUllJTkcuIFNldCBhIGZsYWcgdG8gZW5zdXJlIHRoYXQgd2UgcnVuIGFub3RoZXJcbiAgICAgIC8vIHF1ZXJ5IHdoZW4gd2UncmUgZG9uZS5cbiAgICAgIHNlbGYuX3JlcXVlcnlXaGVuRG9uZVRoaXNRdWVyeSA9IHRydWU7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gWWllbGRzIVxuICBfZG9uZVF1ZXJ5aW5nOiBhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICByZXR1cm47XG5cbiAgICBhd2FpdCBzZWxmLl9tb25nb0hhbmRsZS5fb3Bsb2dIYW5kbGUud2FpdFVudGlsQ2F1Z2h0VXAoKTtcblxuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgaWYgKHNlbGYuX3BoYXNlICE9PSBQSEFTRS5RVUVSWUlORylcbiAgICAgIHRocm93IEVycm9yKFwiUGhhc2UgdW5leHBlY3RlZGx5IFwiICsgc2VsZi5fcGhhc2UpO1xuXG4gICAgaWYgKHNlbGYuX3JlcXVlcnlXaGVuRG9uZVRoaXNRdWVyeSkge1xuICAgICAgc2VsZi5fcmVxdWVyeVdoZW5Eb25lVGhpc1F1ZXJ5ID0gZmFsc2U7XG4gICAgICBzZWxmLl9wb2xsUXVlcnkoKTtcbiAgICB9IGVsc2UgaWYgKHNlbGYuX25lZWRUb0ZldGNoLmVtcHR5KCkpIHtcbiAgICAgIGF3YWl0IHNlbGYuX2JlU3RlYWR5KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNlbGYuX2ZldGNoTW9kaWZpZWREb2N1bWVudHMoKTtcbiAgICB9XG4gIH0sXG5cbiAgX2N1cnNvckZvclF1ZXJ5OiBmdW5jdGlvbiAob3B0aW9uc092ZXJ3cml0ZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgLy8gVGhlIHF1ZXJ5IHdlIHJ1biBpcyBhbG1vc3QgdGhlIHNhbWUgYXMgdGhlIGN1cnNvciB3ZSBhcmUgb2JzZXJ2aW5nLFxuICAgICAgLy8gd2l0aCBhIGZldyBjaGFuZ2VzLiBXZSBuZWVkIHRvIHJlYWQgYWxsIHRoZSBmaWVsZHMgdGhhdCBhcmUgcmVsZXZhbnQgdG9cbiAgICAgIC8vIHRoZSBzZWxlY3Rvciwgbm90IGp1c3QgdGhlIGZpZWxkcyB3ZSBhcmUgZ29pbmcgdG8gcHVibGlzaCAodGhhdCdzIHRoZVxuICAgICAgLy8gXCJzaGFyZWRcIiBwcm9qZWN0aW9uKS4gQW5kIHdlIGRvbid0IHdhbnQgdG8gYXBwbHkgYW55IHRyYW5zZm9ybSBpbiB0aGVcbiAgICAgIC8vIGN1cnNvciwgYmVjYXVzZSBvYnNlcnZlQ2hhbmdlcyBzaG91bGRuJ3QgdXNlIHRoZSB0cmFuc2Zvcm0uXG4gICAgICB2YXIgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMpO1xuXG4gICAgICAvLyBBbGxvdyB0aGUgY2FsbGVyIHRvIG1vZGlmeSB0aGUgb3B0aW9ucy4gVXNlZnVsIHRvIHNwZWNpZnkgZGlmZmVyZW50XG4gICAgICAvLyBza2lwIGFuZCBsaW1pdCB2YWx1ZXMuXG4gICAgICBPYmplY3QuYXNzaWduKG9wdGlvbnMsIG9wdGlvbnNPdmVyd3JpdGUpO1xuXG4gICAgICBvcHRpb25zLmZpZWxkcyA9IHNlbGYuX3NoYXJlZFByb2plY3Rpb247XG4gICAgICBkZWxldGUgb3B0aW9ucy50cmFuc2Zvcm07XG4gICAgICAvLyBXZSBhcmUgTk9UIGRlZXAgY2xvbmluZyBmaWVsZHMgb3Igc2VsZWN0b3IgaGVyZSwgd2hpY2ggc2hvdWxkIGJlIE9LLlxuICAgICAgdmFyIGRlc2NyaXB0aW9uID0gbmV3IEN1cnNvckRlc2NyaXB0aW9uKFxuICAgICAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5jb2xsZWN0aW9uTmFtZSxcbiAgICAgICAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24uc2VsZWN0b3IsXG4gICAgICAgIG9wdGlvbnMpO1xuICAgICAgcmV0dXJuIG5ldyBDdXJzb3Ioc2VsZi5fbW9uZ29IYW5kbGUsIGRlc2NyaXB0aW9uKTtcbiAgICB9KTtcbiAgfSxcblxuXG4gIC8vIFJlcGxhY2Ugc2VsZi5fcHVibGlzaGVkIHdpdGggbmV3UmVzdWx0cyAoYm90aCBhcmUgSWRNYXBzKSwgaW52b2tpbmcgb2JzZXJ2ZVxuICAvLyBjYWxsYmFja3Mgb24gdGhlIG11bHRpcGxleGVyLlxuICAvLyBSZXBsYWNlIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyIHdpdGggbmV3QnVmZmVyLlxuICAvL1xuICAvLyBYWFggVGhpcyBpcyB2ZXJ5IHNpbWlsYXIgdG8gTG9jYWxDb2xsZWN0aW9uLl9kaWZmUXVlcnlVbm9yZGVyZWRDaGFuZ2VzLiBXZVxuICAvLyBzaG91bGQgcmVhbGx5OiAoYSkgVW5pZnkgSWRNYXAgYW5kIE9yZGVyZWREaWN0IGludG8gVW5vcmRlcmVkL09yZGVyZWREaWN0XG4gIC8vIChiKSBSZXdyaXRlIGRpZmYuanMgdG8gdXNlIHRoZXNlIGNsYXNzZXMgaW5zdGVhZCBvZiBhcnJheXMgYW5kIG9iamVjdHMuXG4gIF9wdWJsaXNoTmV3UmVzdWx0czogZnVuY3Rpb24gKG5ld1Jlc3VsdHMsIG5ld0J1ZmZlcikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIElmIHRoZSBxdWVyeSBpcyBsaW1pdGVkIGFuZCB0aGVyZSBpcyBhIGJ1ZmZlciwgc2h1dCBkb3duIHNvIGl0IGRvZXNuJ3RcbiAgICAgIC8vIHN0YXkgaW4gYSB3YXkuXG4gICAgICBpZiAoc2VsZi5fbGltaXQpIHtcbiAgICAgICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuY2xlYXIoKTtcbiAgICAgIH1cblxuICAgICAgLy8gRmlyc3QgcmVtb3ZlIGFueXRoaW5nIHRoYXQncyBnb25lLiBCZSBjYXJlZnVsIG5vdCB0byBtb2RpZnlcbiAgICAgIC8vIHNlbGYuX3B1Ymxpc2hlZCB3aGlsZSBpdGVyYXRpbmcgb3ZlciBpdC5cbiAgICAgIHZhciBpZHNUb1JlbW92ZSA9IFtdO1xuICAgICAgc2VsZi5fcHVibGlzaGVkLmZvckVhY2goZnVuY3Rpb24gKGRvYywgaWQpIHtcbiAgICAgICAgaWYgKCFuZXdSZXN1bHRzLmhhcyhpZCkpXG4gICAgICAgICAgaWRzVG9SZW1vdmUucHVzaChpZCk7XG4gICAgICB9KTtcbiAgICAgIGlkc1RvUmVtb3ZlLmZvckVhY2goZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgIHNlbGYuX3JlbW92ZVB1Ymxpc2hlZChpZCk7XG4gICAgICB9KTtcblxuICAgICAgLy8gTm93IGRvIGFkZHMgYW5kIGNoYW5nZXMuXG4gICAgICAvLyBJZiBzZWxmIGhhcyBhIGJ1ZmZlciBhbmQgbGltaXQsIHRoZSBuZXcgZmV0Y2hlZCByZXN1bHQgd2lsbCBiZVxuICAgICAgLy8gbGltaXRlZCBjb3JyZWN0bHkgYXMgdGhlIHF1ZXJ5IGhhcyBzb3J0IHNwZWNpZmllci5cbiAgICAgIG5ld1Jlc3VsdHMuZm9yRWFjaChmdW5jdGlvbiAoZG9jLCBpZCkge1xuICAgICAgICBzZWxmLl9oYW5kbGVEb2MoaWQsIGRvYyk7XG4gICAgICB9KTtcblxuICAgICAgLy8gU2FuaXR5LWNoZWNrIHRoYXQgZXZlcnl0aGluZyB3ZSB0cmllZCB0byBwdXQgaW50byBfcHVibGlzaGVkIGVuZGVkIHVwXG4gICAgICAvLyB0aGVyZS5cbiAgICAgIC8vIFhYWCBpZiB0aGlzIGlzIHNsb3csIHJlbW92ZSBpdCBsYXRlclxuICAgICAgaWYgKHNlbGYuX3B1Ymxpc2hlZC5zaXplKCkgIT09IG5ld1Jlc3VsdHMuc2l6ZSgpKSB7XG4gICAgICAgIE1ldGVvci5fZGVidWcoJ1RoZSBNb25nbyBzZXJ2ZXIgYW5kIHRoZSBNZXRlb3IgcXVlcnkgZGlzYWdyZWUgb24gaG93ICcgK1xuICAgICAgICAgICdtYW55IGRvY3VtZW50cyBtYXRjaCB5b3VyIHF1ZXJ5LiBDdXJzb3IgZGVzY3JpcHRpb246ICcsXG4gICAgICAgICAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24pO1xuICAgICAgfVxuICAgICAgXG4gICAgICBzZWxmLl9wdWJsaXNoZWQuZm9yRWFjaChmdW5jdGlvbiAoZG9jLCBpZCkge1xuICAgICAgICBpZiAoIW5ld1Jlc3VsdHMuaGFzKGlkKSlcbiAgICAgICAgICB0aHJvdyBFcnJvcihcIl9wdWJsaXNoZWQgaGFzIGEgZG9jIHRoYXQgbmV3UmVzdWx0cyBkb2Vzbid0OyBcIiArIGlkKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBGaW5hbGx5LCByZXBsYWNlIHRoZSBidWZmZXJcbiAgICAgIG5ld0J1ZmZlci5mb3JFYWNoKGZ1bmN0aW9uIChkb2MsIGlkKSB7XG4gICAgICAgIHNlbGYuX2FkZEJ1ZmZlcmVkKGlkLCBkb2MpO1xuICAgICAgfSk7XG5cbiAgICAgIHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlciA9IG5ld0J1ZmZlci5zaXplKCkgPCBzZWxmLl9saW1pdDtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBUaGlzIHN0b3AgZnVuY3Rpb24gaXMgaW52b2tlZCBmcm9tIHRoZSBvblN0b3Agb2YgdGhlIE9ic2VydmVNdWx0aXBsZXhlciwgc29cbiAgLy8gaXQgc2hvdWxkbid0IGFjdHVhbGx5IGJlIHBvc3NpYmxlIHRvIGNhbGwgaXQgdW50aWwgdGhlIG11bHRpcGxleGVyIGlzXG4gIC8vIHJlYWR5LlxuICAvL1xuICAvLyBJdCdzIGltcG9ydGFudCB0byBjaGVjayBzZWxmLl9zdG9wcGVkIGFmdGVyIGV2ZXJ5IGNhbGwgaW4gdGhpcyBmaWxlIHRoYXRcbiAgLy8gY2FuIHlpZWxkIVxuICBfc3RvcDogYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgcmV0dXJuO1xuICAgIHNlbGYuX3N0b3BwZWQgPSB0cnVlO1xuXG4gICAgLy8gTm90ZTogd2UgKmRvbid0KiB1c2UgbXVsdGlwbGV4ZXIub25GbHVzaCBoZXJlIGJlY2F1c2UgdGhpcyBzdG9wXG4gICAgLy8gY2FsbGJhY2sgaXMgYWN0dWFsbHkgaW52b2tlZCBieSB0aGUgbXVsdGlwbGV4ZXIgaXRzZWxmIHdoZW4gaXQgaGFzXG4gICAgLy8gZGV0ZXJtaW5lZCB0aGF0IHRoZXJlIGFyZSBubyBoYW5kbGVzIGxlZnQuIFNvIG5vdGhpbmcgaXMgYWN0dWFsbHkgZ29pbmdcbiAgICAvLyB0byBnZXQgZmx1c2hlZCAoYW5kIGl0J3MgcHJvYmFibHkgbm90IHZhbGlkIHRvIGNhbGwgbWV0aG9kcyBvbiB0aGVcbiAgICAvLyBkeWluZyBtdWx0aXBsZXhlcikuXG4gICAgZm9yIChjb25zdCB3IG9mIHNlbGYuX3dyaXRlc1RvQ29tbWl0V2hlbldlUmVhY2hTdGVhZHkpIHtcbiAgICAgIGF3YWl0IHcuY29tbWl0dGVkKCk7XG4gICAgfVxuICAgIHNlbGYuX3dyaXRlc1RvQ29tbWl0V2hlbldlUmVhY2hTdGVhZHkgPSBudWxsO1xuXG4gICAgLy8gUHJvYWN0aXZlbHkgZHJvcCByZWZlcmVuY2VzIHRvIHBvdGVudGlhbGx5IGJpZyB0aGluZ3MuXG4gICAgc2VsZi5fcHVibGlzaGVkID0gbnVsbDtcbiAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlciA9IG51bGw7XG4gICAgc2VsZi5fbmVlZFRvRmV0Y2ggPSBudWxsO1xuICAgIHNlbGYuX2N1cnJlbnRseUZldGNoaW5nID0gbnVsbDtcbiAgICBzZWxmLl9vcGxvZ0VudHJ5SGFuZGxlID0gbnVsbDtcbiAgICBzZWxmLl9saXN0ZW5lcnNIYW5kbGUgPSBudWxsO1xuXG4gICAgUGFja2FnZVsnZmFjdHMtYmFzZSddICYmIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXS5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgICAgICBcIm1vbmdvLWxpdmVkYXRhXCIsIFwib2JzZXJ2ZS1kcml2ZXJzLW9wbG9nXCIsIC0xKTtcblxuICAgIGZvciBhd2FpdCAoY29uc3QgaGFuZGxlIG9mIHNlbGYuX3N0b3BIYW5kbGVzKSB7XG4gICAgICBhd2FpdCBoYW5kbGUuc3RvcCgpO1xuICAgIH1cbiAgfSxcbiAgc3RvcDogYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIGF3YWl0IHNlbGYuX3N0b3AoKTtcbiAgfSxcblxuICBfcmVnaXN0ZXJQaGFzZUNoYW5nZTogZnVuY3Rpb24gKHBoYXNlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBub3cgPSBuZXcgRGF0ZTtcblxuICAgICAgaWYgKHNlbGYuX3BoYXNlKSB7XG4gICAgICAgIHZhciB0aW1lRGlmZiA9IG5vdyAtIHNlbGYuX3BoYXNlU3RhcnRUaW1lO1xuICAgICAgICBQYWNrYWdlWydmYWN0cy1iYXNlJ10gJiYgUGFja2FnZVsnZmFjdHMtYmFzZSddLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgICAgICAgXCJtb25nby1saXZlZGF0YVwiLCBcInRpbWUtc3BlbnQtaW4tXCIgKyBzZWxmLl9waGFzZSArIFwiLXBoYXNlXCIsIHRpbWVEaWZmKTtcbiAgICAgIH1cblxuICAgICAgc2VsZi5fcGhhc2UgPSBwaGFzZTtcbiAgICAgIHNlbGYuX3BoYXNlU3RhcnRUaW1lID0gbm93O1xuICAgIH0pO1xuICB9XG59KTtcblxuLy8gRG9lcyBvdXIgb3Bsb2cgdGFpbGluZyBjb2RlIHN1cHBvcnQgdGhpcyBjdXJzb3I/IEZvciBub3csIHdlIGFyZSBiZWluZyB2ZXJ5XG4vLyBjb25zZXJ2YXRpdmUgYW5kIGFsbG93aW5nIG9ubHkgc2ltcGxlIHF1ZXJpZXMgd2l0aCBzaW1wbGUgb3B0aW9ucy5cbi8vIChUaGlzIGlzIGEgXCJzdGF0aWMgbWV0aG9kXCIuKVxuT3Bsb2dPYnNlcnZlRHJpdmVyLmN1cnNvclN1cHBvcnRlZCA9IGZ1bmN0aW9uIChjdXJzb3JEZXNjcmlwdGlvbiwgbWF0Y2hlcikge1xuICAvLyBGaXJzdCwgY2hlY2sgdGhlIG9wdGlvbnMuXG4gIHZhciBvcHRpb25zID0gY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucztcblxuICAvLyBEaWQgdGhlIHVzZXIgc2F5IG5vIGV4cGxpY2l0bHk/XG4gIC8vIHVuZGVyc2NvcmVkIHZlcnNpb24gb2YgdGhlIG9wdGlvbiBpcyBDT01QQVQgd2l0aCAxLjJcbiAgaWYgKG9wdGlvbnMuZGlzYWJsZU9wbG9nIHx8IG9wdGlvbnMuX2Rpc2FibGVPcGxvZylcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgLy8gc2tpcCBpcyBub3Qgc3VwcG9ydGVkOiB0byBzdXBwb3J0IGl0IHdlIHdvdWxkIG5lZWQgdG8ga2VlcCB0cmFjayBvZiBhbGxcbiAgLy8gXCJza2lwcGVkXCIgZG9jdW1lbnRzIG9yIGF0IGxlYXN0IHRoZWlyIGlkcy5cbiAgLy8gbGltaXQgdy9vIGEgc29ydCBzcGVjaWZpZXIgaXMgbm90IHN1cHBvcnRlZDogY3VycmVudCBpbXBsZW1lbnRhdGlvbiBuZWVkcyBhXG4gIC8vIGRldGVybWluaXN0aWMgd2F5IHRvIG9yZGVyIGRvY3VtZW50cy5cbiAgaWYgKG9wdGlvbnMuc2tpcCB8fCAob3B0aW9ucy5saW1pdCAmJiAhb3B0aW9ucy5zb3J0KSkgcmV0dXJuIGZhbHNlO1xuXG4gIC8vIElmIGEgZmllbGRzIHByb2plY3Rpb24gb3B0aW9uIGlzIGdpdmVuIGNoZWNrIGlmIGl0IGlzIHN1cHBvcnRlZCBieVxuICAvLyBtaW5pbW9uZ28gKHNvbWUgb3BlcmF0b3JzIGFyZSBub3Qgc3VwcG9ydGVkKS5cbiAgY29uc3QgZmllbGRzID0gb3B0aW9ucy5maWVsZHMgfHwgb3B0aW9ucy5wcm9qZWN0aW9uO1xuICBpZiAoZmllbGRzKSB7XG4gICAgdHJ5IHtcbiAgICAgIExvY2FsQ29sbGVjdGlvbi5fY2hlY2tTdXBwb3J0ZWRQcm9qZWN0aW9uKGZpZWxkcyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUubmFtZSA9PT0gXCJNaW5pbW9uZ29FcnJvclwiKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gV2UgZG9uJ3QgYWxsb3cgdGhlIGZvbGxvd2luZyBzZWxlY3RvcnM6XG4gIC8vICAgLSAkd2hlcmUgKG5vdCBjb25maWRlbnQgdGhhdCB3ZSBwcm92aWRlIHRoZSBzYW1lIEpTIGVudmlyb25tZW50XG4gIC8vICAgICAgICAgICAgIGFzIE1vbmdvLCBhbmQgY2FuIHlpZWxkISlcbiAgLy8gICAtICRuZWFyIChoYXMgXCJpbnRlcmVzdGluZ1wiIHByb3BlcnRpZXMgaW4gTW9uZ29EQiwgbGlrZSB0aGUgcG9zc2liaWxpdHlcbiAgLy8gICAgICAgICAgICBvZiByZXR1cm5pbmcgYW4gSUQgbXVsdGlwbGUgdGltZXMsIHRob3VnaCBldmVuIHBvbGxpbmcgbWF5YmVcbiAgLy8gICAgICAgICAgICBoYXZlIGEgYnVnIHRoZXJlKVxuICAvLyAgICAgICAgICAgWFhYOiBvbmNlIHdlIHN1cHBvcnQgaXQsIHdlIHdvdWxkIG5lZWQgdG8gdGhpbmsgbW9yZSBvbiBob3cgd2VcbiAgLy8gICAgICAgICAgIGluaXRpYWxpemUgdGhlIGNvbXBhcmF0b3JzIHdoZW4gd2UgY3JlYXRlIHRoZSBkcml2ZXIuXG4gIHJldHVybiAhbWF0Y2hlci5oYXNXaGVyZSgpICYmICFtYXRjaGVyLmhhc0dlb1F1ZXJ5KCk7XG59O1xuXG52YXIgbW9kaWZpZXJDYW5CZURpcmVjdGx5QXBwbGllZCA9IGZ1bmN0aW9uIChtb2RpZmllcikge1xuICByZXR1cm4gT2JqZWN0LmVudHJpZXMobW9kaWZpZXIpLmV2ZXJ5KGZ1bmN0aW9uIChbb3BlcmF0aW9uLCBmaWVsZHNdKSB7XG4gICAgcmV0dXJuIE9iamVjdC5lbnRyaWVzKGZpZWxkcykuZXZlcnkoZnVuY3Rpb24gKFtmaWVsZCwgdmFsdWVdKSB7XG4gICAgICByZXR1cm4gIS9FSlNPTlxcJC8udGVzdChmaWVsZCk7XG4gICAgfSk7XG4gIH0pO1xufTsiLCIvKipcbiAqIENvbnZlcnRlciBtb2R1bGUgZm9yIHRoZSBuZXcgTW9uZ29EQiBPcGxvZyBmb3JtYXQgKD49NS4wKSB0byB0aGUgb25lIHRoYXQgTWV0ZW9yXG4gKiBoYW5kbGVzIHdlbGwsIGkuZS4sIGAkc2V0YCBhbmQgYCR1bnNldGAuIFRoZSBuZXcgZm9ybWF0IGlzIGNvbXBsZXRlbHkgbmV3LFxuICogYW5kIGxvb2tzIGFzIGZvbGxvd3M6XG4gKlxuICogYGBganNcbiAqIHsgJHY6IDIsIGRpZmY6IERpZmYgfVxuICogYGBgXG4gKlxuICogd2hlcmUgYERpZmZgIGlzIGEgcmVjdXJzaXZlIHN0cnVjdHVyZTpcbiAqIGBgYGpzXG4gKiB7XG4gKiAgIC8vIE5lc3RlZCB1cGRhdGVzIChzb21ldGltZXMgYWxzbyByZXByZXNlbnRlZCB3aXRoIGFuIHMtZmllbGQpLlxuICogICAvLyBFeGFtcGxlOiBgeyAkc2V0OiB7ICdmb28uYmFyJzogMSB9IH1gLlxuICogICBpOiB7IDxrZXk+OiA8dmFsdWU+LCAuLi4gfSxcbiAqXG4gKiAgIC8vIFRvcC1sZXZlbCB1cGRhdGVzLlxuICogICAvLyBFeGFtcGxlOiBgeyAkc2V0OiB7IGZvbzogeyBiYXI6IDEgfSB9IH1gLlxuICogICB1OiB7IDxrZXk+OiA8dmFsdWU+LCAuLi4gfSxcbiAqXG4gKiAgIC8vIFVuc2V0cy5cbiAqICAgLy8gRXhhbXBsZTogYHsgJHVuc2V0OiB7IGZvbzogJycgfSB9YC5cbiAqICAgZDogeyA8a2V5PjogZmFsc2UsIC4uLiB9LFxuICpcbiAqICAgLy8gQXJyYXkgb3BlcmF0aW9ucy5cbiAqICAgLy8gRXhhbXBsZTogYHsgJHB1c2g6IHsgZm9vOiAnYmFyJyB9IH1gLlxuICogICBzPGtleT46IHsgYTogdHJ1ZSwgdTxpbmRleD46IDx2YWx1ZT4sIC4uLiB9LFxuICogICAuLi5cbiAqXG4gKiAgIC8vIE5lc3RlZCBvcGVyYXRpb25zIChzb21ldGltZXMgYWxzbyByZXByZXNlbnRlZCBpbiB0aGUgYGlgIGZpZWxkKS5cbiAqICAgLy8gRXhhbXBsZTogYHsgJHNldDogeyAnZm9vLmJhcic6IDEgfSB9YC5cbiAqICAgczxrZXk+OiBEaWZmLFxuICogICAuLi5cbiAqIH1cbiAqIGBgYFxuICpcbiAqIChhbGwgZmllbGRzIGFyZSBvcHRpb25hbClcbiAqL1xuXG5pbXBvcnQgeyBFSlNPTiB9IGZyb20gJ21ldGVvci9lanNvbic7XG5cbmludGVyZmFjZSBPcGxvZ0VudHJ5IHtcbiAgJHY6IG51bWJlcjtcbiAgZGlmZj86IE9wbG9nRGlmZjtcbiAgJHNldD86IFJlY29yZDxzdHJpbmcsIGFueT47XG4gICR1bnNldD86IFJlY29yZDxzdHJpbmcsIHRydWU+O1xufVxuXG5pbnRlcmZhY2UgT3Bsb2dEaWZmIHtcbiAgaT86IFJlY29yZDxzdHJpbmcsIGFueT47XG4gIHU/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xuICBkPzogUmVjb3JkPHN0cmluZywgYm9vbGVhbj47XG4gIFtrZXk6IGBzJHtzdHJpbmd9YF06IEFycmF5T3BlcmF0b3IgfCBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xufVxuXG5pbnRlcmZhY2UgQXJyYXlPcGVyYXRvciB7XG4gIGE6IHRydWU7XG4gIFtrZXk6IGB1JHtudW1iZXJ9YF06IGFueTtcbn1cblxuY29uc3QgYXJyYXlPcGVyYXRvcktleVJlZ2V4ID0gL14oYXxbc3VdXFxkKykkLztcblxuLyoqXG4gKiBDaGVja3MgaWYgYSBmaWVsZCBpcyBhbiBhcnJheSBvcGVyYXRvciBrZXkgb2YgZm9ybSAnYScgb3IgJ3MxJyBvciAndTEnIGV0Y1xuICovXG5mdW5jdGlvbiBpc0FycmF5T3BlcmF0b3JLZXkoZmllbGQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gYXJyYXlPcGVyYXRvcktleVJlZ2V4LnRlc3QoZmllbGQpO1xufVxuXG4vKipcbiAqIFR5cGUgZ3VhcmQgdG8gY2hlY2sgaWYgYW4gb3BlcmF0b3IgaXMgYSB2YWxpZCBhcnJheSBvcGVyYXRvci5cbiAqIEFycmF5IG9wZXJhdG9ycyBoYXZlICdhOiB0cnVlJyBhbmQga2V5cyB0aGF0IG1hdGNoIHRoZSBhcnJheU9wZXJhdG9yS2V5UmVnZXhcbiAqL1xuZnVuY3Rpb24gaXNBcnJheU9wZXJhdG9yKG9wZXJhdG9yOiB1bmtub3duKTogb3BlcmF0b3IgaXMgQXJyYXlPcGVyYXRvciB7XG4gIHJldHVybiAoXG4gICAgb3BlcmF0b3IgIT09IG51bGwgJiZcbiAgICB0eXBlb2Ygb3BlcmF0b3IgPT09ICdvYmplY3QnICYmXG4gICAgJ2EnIGluIG9wZXJhdG9yICYmXG4gICAgKG9wZXJhdG9yIGFzIEFycmF5T3BlcmF0b3IpLmEgPT09IHRydWUgJiZcbiAgICBPYmplY3Qua2V5cyhvcGVyYXRvcikuZXZlcnkoaXNBcnJheU9wZXJhdG9yS2V5KVxuICApO1xufVxuXG4vKipcbiAqIEpvaW5zIHR3byBwYXJ0cyBvZiBhIGZpZWxkIHBhdGggd2l0aCBhIGRvdC5cbiAqIFJldHVybnMgdGhlIGtleSBpdHNlbGYgaWYgcHJlZml4IGlzIGVtcHR5LlxuICovXG5mdW5jdGlvbiBqb2luKHByZWZpeDogc3RyaW5nLCBrZXk6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBwcmVmaXggPyBgJHtwcmVmaXh9LiR7a2V5fWAgOiBrZXk7XG59XG5cbi8qKlxuICogUmVjdXJzaXZlbHkgZmxhdHRlbnMgYW4gb2JqZWN0IGludG8gYSB0YXJnZXQgb2JqZWN0IHdpdGggZG90IG5vdGF0aW9uIHBhdGhzLlxuICogSGFuZGxlcyBzcGVjaWFsIGNhc2VzOlxuICogLSBBcnJheXMgYXJlIGFzc2lnbmVkIGRpcmVjdGx5XG4gKiAtIEN1c3RvbSBFSlNPTiB0eXBlcyBhcmUgcHJlc2VydmVkXG4gKiAtIE1vbmdvLk9iamVjdElEcyBhcmUgcHJlc2VydmVkXG4gKiAtIFBsYWluIG9iamVjdHMgYXJlIHJlY3Vyc2l2ZWx5IGZsYXR0ZW5lZFxuICogLSBFbXB0eSBvYmplY3RzIGFyZSBhc3NpZ25lZCBkaXJlY3RseVxuICovXG5mdW5jdGlvbiBmbGF0dGVuT2JqZWN0SW50byhcbiAgdGFyZ2V0OiBSZWNvcmQ8c3RyaW5nLCBhbnk+LFxuICBzb3VyY2U6IGFueSxcbiAgcHJlZml4OiBzdHJpbmdcbik6IHZvaWQge1xuICBpZiAoXG4gICAgQXJyYXkuaXNBcnJheShzb3VyY2UpIHx8XG4gICAgdHlwZW9mIHNvdXJjZSAhPT0gJ29iamVjdCcgfHxcbiAgICBzb3VyY2UgPT09IG51bGwgfHxcbiAgICBzb3VyY2UgaW5zdGFuY2VvZiBNb25nby5PYmplY3RJRCB8fFxuICAgIEVKU09OLl9pc0N1c3RvbVR5cGUoc291cmNlKVxuICApIHtcbiAgICB0YXJnZXRbcHJlZml4XSA9IHNvdXJjZTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBlbnRyaWVzID0gT2JqZWN0LmVudHJpZXMoc291cmNlKTtcbiAgaWYgKGVudHJpZXMubGVuZ3RoKSB7XG4gICAgZW50cmllcy5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgIGZsYXR0ZW5PYmplY3RJbnRvKHRhcmdldCwgdmFsdWUsIGpvaW4ocHJlZml4LCBrZXkpKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICB0YXJnZXRbcHJlZml4XSA9IHNvdXJjZTtcbiAgfVxufVxuXG4vKipcbiAqIENvbnZlcnRzIGFuIG9wbG9nIGRpZmYgdG8gYSBzZXJpZXMgb2YgJHNldCBhbmQgJHVuc2V0IG9wZXJhdGlvbnMuXG4gKiBIYW5kbGVzIHNldmVyYWwgdHlwZXMgb2Ygb3BlcmF0aW9uczpcbiAqIC0gRGlyZWN0IHVuc2V0cyB2aWEgJ2QnIGZpZWxkXG4gKiAtIE5lc3RlZCBzZXRzIHZpYSAnaScgZmllbGRcbiAqIC0gVG9wLWxldmVsIHNldHMgdmlhICd1JyBmaWVsZFxuICogLSBBcnJheSBvcGVyYXRpb25zIGFuZCBuZXN0ZWQgb2JqZWN0cyB2aWEgJ3MnIHByZWZpeGVkIGZpZWxkc1xuICpcbiAqIFByZXNlcnZlcyB0aGUgc3RydWN0dXJlIG9mIEVKU09OIGN1c3RvbSB0eXBlcyBhbmQgT2JqZWN0SURzIHdoaWxlXG4gKiBmbGF0dGVuaW5nIHBhdGhzIGludG8gZG90IG5vdGF0aW9uIGZvciBNb25nb0RCIHVwZGF0ZXMuXG4gKi9cbmZ1bmN0aW9uIGNvbnZlcnRPcGxvZ0RpZmYoXG4gIG9wbG9nRW50cnk6IE9wbG9nRW50cnksXG4gIGRpZmY6IE9wbG9nRGlmZixcbiAgcHJlZml4ID0gJydcbik6IHZvaWQge1xuICBPYmplY3QuZW50cmllcyhkaWZmKS5mb3JFYWNoKChbZGlmZktleSwgdmFsdWVdKSA9PiB7XG4gICAgaWYgKGRpZmZLZXkgPT09ICdkJykge1xuICAgICAgLy8gSGFuZGxlIGAkdW5zZXRgc1xuICAgICAgb3Bsb2dFbnRyeS4kdW5zZXQgPz89IHt9O1xuICAgICAgT2JqZWN0LmtleXModmFsdWUpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgb3Bsb2dFbnRyeS4kdW5zZXQhW2pvaW4ocHJlZml4LCBrZXkpXSA9IHRydWU7XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKGRpZmZLZXkgPT09ICdpJykge1xuICAgICAgLy8gSGFuZGxlIChwb3RlbnRpYWxseSkgbmVzdGVkIGAkc2V0YHNcbiAgICAgIG9wbG9nRW50cnkuJHNldCA/Pz0ge307XG4gICAgICBmbGF0dGVuT2JqZWN0SW50byhvcGxvZ0VudHJ5LiRzZXQsIHZhbHVlLCBwcmVmaXgpO1xuICAgIH0gZWxzZSBpZiAoZGlmZktleSA9PT0gJ3UnKSB7XG4gICAgICAvLyBIYW5kbGUgZmxhdCBgJHNldGBzXG4gICAgICBvcGxvZ0VudHJ5LiRzZXQgPz89IHt9O1xuICAgICAgT2JqZWN0LmVudHJpZXModmFsdWUpLmZvckVhY2goKFtrZXksIGZpZWxkVmFsdWVdKSA9PiB7XG4gICAgICAgIG9wbG9nRW50cnkuJHNldCFbam9pbihwcmVmaXgsIGtleSldID0gZmllbGRWYWx1ZTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoZGlmZktleS5zdGFydHNXaXRoKCdzJykpIHtcbiAgICAgIC8vIEhhbmRsZSBzLWZpZWxkcyAoYXJyYXkgb3BlcmF0aW9ucyBhbmQgbmVzdGVkIG9iamVjdHMpXG4gICAgICBjb25zdCBrZXkgPSBkaWZmS2V5LnNsaWNlKDEpO1xuICAgICAgaWYgKGlzQXJyYXlPcGVyYXRvcih2YWx1ZSkpIHtcbiAgICAgICAgLy8gQXJyYXkgb3BlcmF0b3JcbiAgICAgICAgT2JqZWN0LmVudHJpZXModmFsdWUpLmZvckVhY2goKFtwb3NpdGlvbiwgZmllbGRWYWx1ZV0pID0+IHtcbiAgICAgICAgICBpZiAocG9zaXRpb24gPT09ICdhJykgcmV0dXJuO1xuXG4gICAgICAgICAgY29uc3QgcG9zaXRpb25LZXkgPSBqb2luKHByZWZpeCwgYCR7a2V5fS4ke3Bvc2l0aW9uLnNsaWNlKDEpfWApO1xuICAgICAgICAgIGlmIChwb3NpdGlvblswXSA9PT0gJ3MnKSB7XG4gICAgICAgICAgICBjb252ZXJ0T3Bsb2dEaWZmKG9wbG9nRW50cnksIGZpZWxkVmFsdWUsIHBvc2l0aW9uS2V5KTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGZpZWxkVmFsdWUgPT09IG51bGwpIHtcbiAgICAgICAgICAgIG9wbG9nRW50cnkuJHVuc2V0ID8/PSB7fTtcbiAgICAgICAgICAgIG9wbG9nRW50cnkuJHVuc2V0W3Bvc2l0aW9uS2V5XSA9IHRydWU7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9wbG9nRW50cnkuJHNldCA/Pz0ge307XG4gICAgICAgICAgICBvcGxvZ0VudHJ5LiRzZXRbcG9zaXRpb25LZXldID0gZmllbGRWYWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChrZXkpIHtcbiAgICAgICAgLy8gTmVzdGVkIG9iamVjdFxuICAgICAgICBjb252ZXJ0T3Bsb2dEaWZmKG9wbG9nRW50cnksIHZhbHVlLCBqb2luKHByZWZpeCwga2V5KSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBhIE1vbmdvREIgdjIgb3Bsb2cgZW50cnkgdG8gdjEgZm9ybWF0LlxuICogUmV0dXJucyB0aGUgb3JpZ2luYWwgZW50cnkgdW5jaGFuZ2VkIGlmIGl0J3Mgbm90IGEgdjIgb3Bsb2cgZW50cnlcbiAqIG9yIGRvZXNuJ3QgY29udGFpbiBhIGRpZmYgZmllbGQuXG4gKlxuICogVGhlIGNvbnZlcnRlZCBlbnRyeSB3aWxsIGNvbnRhaW4gJHNldCBhbmQgJHVuc2V0IG9wZXJhdGlvbnMgdGhhdCBhcmVcbiAqIGVxdWl2YWxlbnQgdG8gdGhlIHYyIGRpZmYgZm9ybWF0LCB3aXRoIHBhdGhzIGZsYXR0ZW5lZCB0byBkb3Qgbm90YXRpb25cbiAqIGFuZCBzcGVjaWFsIGhhbmRsaW5nIGZvciBFSlNPTiBjdXN0b20gdHlwZXMgYW5kIE9iamVjdElEcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG9wbG9nVjJWMUNvbnZlcnRlcihvcGxvZ0VudHJ5OiBPcGxvZ0VudHJ5KTogT3Bsb2dFbnRyeSB7XG4gIGlmIChvcGxvZ0VudHJ5LiR2ICE9PSAyIHx8ICFvcGxvZ0VudHJ5LmRpZmYpIHtcbiAgICByZXR1cm4gb3Bsb2dFbnRyeTtcbiAgfVxuXG4gIGNvbnN0IGNvbnZlcnRlZE9wbG9nRW50cnk6IE9wbG9nRW50cnkgPSB7ICR2OiAyIH07XG4gIGNvbnZlcnRPcGxvZ0RpZmYoY29udmVydGVkT3Bsb2dFbnRyeSwgb3Bsb2dFbnRyeS5kaWZmKTtcbiAgcmV0dXJuIGNvbnZlcnRlZE9wbG9nRW50cnk7XG59IiwiaW50ZXJmYWNlIEN1cnNvck9wdGlvbnMge1xuICBsaW1pdD86IG51bWJlcjtcbiAgc2tpcD86IG51bWJlcjtcbiAgc29ydD86IFJlY29yZDxzdHJpbmcsIDEgfCAtMT47XG4gIGZpZWxkcz86IFJlY29yZDxzdHJpbmcsIDEgfCAwPjtcbiAgcHJvamVjdGlvbj86IFJlY29yZDxzdHJpbmcsIDEgfCAwPjtcbiAgZGlzYWJsZU9wbG9nPzogYm9vbGVhbjtcbiAgX2Rpc2FibGVPcGxvZz86IGJvb2xlYW47XG4gIHRhaWxhYmxlPzogYm9vbGVhbjtcbiAgdHJhbnNmb3JtPzogKGRvYzogYW55KSA9PiBhbnk7XG59XG5cbi8qKlxuICogUmVwcmVzZW50cyB0aGUgYXJndW1lbnRzIHVzZWQgdG8gY29uc3RydWN0IGEgY3Vyc29yLlxuICogVXNlZCBhcyBhIGtleSBmb3IgY3Vyc29yIGRlLWR1cGxpY2F0aW9uLlxuICpcbiAqIEFsbCBwcm9wZXJ0aWVzIG11c3QgYmUgZWl0aGVyOlxuICogLSBKU09OLXN0cmluZ2lmaWFibGUsIG9yXG4gKiAtIE5vdCBhZmZlY3Qgb2JzZXJ2ZUNoYW5nZXMgb3V0cHV0IChlLmcuLCBvcHRpb25zLnRyYW5zZm9ybSBmdW5jdGlvbnMpXG4gKi9cbmV4cG9ydCBjbGFzcyBDdXJzb3JEZXNjcmlwdGlvbiB7XG4gIGNvbGxlY3Rpb25OYW1lOiBzdHJpbmc7XG4gIHNlbGVjdG9yOiBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xuICBvcHRpb25zOiBDdXJzb3JPcHRpb25zO1xuXG4gIGNvbnN0cnVjdG9yKGNvbGxlY3Rpb25OYW1lOiBzdHJpbmcsIHNlbGVjdG9yOiBhbnksIG9wdGlvbnM/OiBDdXJzb3JPcHRpb25zKSB7XG4gICAgdGhpcy5jb2xsZWN0aW9uTmFtZSA9IGNvbGxlY3Rpb25OYW1lO1xuICAgIC8vIEB0cy1pZ25vcmVcbiAgICB0aGlzLnNlbGVjdG9yID0gTW9uZ28uQ29sbGVjdGlvbi5fcmV3cml0ZVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB9XG59IiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBDTElFTlRfT05MWV9NRVRIT0RTLCBnZXRBc3luY01ldGhvZE5hbWUgfSBmcm9tICdtZXRlb3IvbWluaW1vbmdvL2NvbnN0YW50cyc7XG5pbXBvcnQgeyBNaW5pTW9uZ29RdWVyeUVycm9yIH0gZnJvbSAnbWV0ZW9yL21pbmltb25nby9jb21tb24nO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBBc3luY2hyb25vdXNDdXJzb3IgfSBmcm9tICcuL2FzeW5jaHJvbm91c19jdXJzb3InO1xuaW1wb3J0IHsgQ3Vyc29yIH0gZnJvbSAnLi9jdXJzb3InO1xuaW1wb3J0IHsgQ3Vyc29yRGVzY3JpcHRpb24gfSBmcm9tICcuL2N1cnNvcl9kZXNjcmlwdGlvbic7XG5pbXBvcnQgeyBEb2NGZXRjaGVyIH0gZnJvbSAnLi9kb2NfZmV0Y2hlcic7XG5pbXBvcnQgeyBNb25nb0RCLCByZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbywgcmVwbGFjZVR5cGVzLCB0cmFuc2Zvcm1SZXN1bHQgfSBmcm9tICcuL21vbmdvX2NvbW1vbic7XG5pbXBvcnQgeyBPYnNlcnZlSGFuZGxlIH0gZnJvbSAnLi9vYnNlcnZlX2hhbmRsZSc7XG5pbXBvcnQgeyBPYnNlcnZlTXVsdGlwbGV4ZXIgfSBmcm9tICcuL29ic2VydmVfbXVsdGlwbGV4JztcbmltcG9ydCB7IE9wbG9nT2JzZXJ2ZURyaXZlciB9IGZyb20gJy4vb3Bsb2dfb2JzZXJ2ZV9kcml2ZXInO1xuaW1wb3J0IHsgT1BMT0dfQ09MTEVDVElPTiwgT3Bsb2dIYW5kbGUgfSBmcm9tICcuL29wbG9nX3RhaWxpbmcnO1xuaW1wb3J0IHsgUG9sbGluZ09ic2VydmVEcml2ZXIgfSBmcm9tICcuL3BvbGxpbmdfb2JzZXJ2ZV9kcml2ZXInO1xuXG5jb25zdCBGSUxFX0FTU0VUX1NVRkZJWCA9ICdBc3NldCc7XG5jb25zdCBBU1NFVFNfRk9MREVSID0gJ2Fzc2V0cyc7XG5jb25zdCBBUFBfRk9MREVSID0gJ2FwcCc7XG5cbmNvbnN0IG9wbG9nQ29sbGVjdGlvbldhcm5pbmdzID0gW107XG5cbmV4cG9ydCBjb25zdCBNb25nb0Nvbm5lY3Rpb24gPSBmdW5jdGlvbiAodXJsLCBvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHNlbGYuX29ic2VydmVNdWx0aXBsZXhlcnMgPSB7fTtcbiAgc2VsZi5fb25GYWlsb3Zlckhvb2sgPSBuZXcgSG9vaztcblxuICBjb25zdCB1c2VyT3B0aW9ucyA9IHtcbiAgICAuLi4oTW9uZ28uX2Nvbm5lY3Rpb25PcHRpb25zIHx8IHt9KSxcbiAgICAuLi4oTWV0ZW9yLnNldHRpbmdzPy5wYWNrYWdlcz8ubW9uZ28/Lm9wdGlvbnMgfHwge30pXG4gIH07XG5cbiAgdmFyIG1vbmdvT3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe1xuICAgIGlnbm9yZVVuZGVmaW5lZDogdHJ1ZSxcbiAgfSwgdXNlck9wdGlvbnMpO1xuXG5cblxuICAvLyBJbnRlcm5hbGx5IHRoZSBvcGxvZyBjb25uZWN0aW9ucyBzcGVjaWZ5IHRoZWlyIG93biBtYXhQb29sU2l6ZVxuICAvLyB3aGljaCB3ZSBkb24ndCB3YW50IHRvIG92ZXJ3cml0ZSB3aXRoIGFueSB1c2VyIGRlZmluZWQgdmFsdWVcbiAgaWYgKCdtYXhQb29sU2l6ZScgaW4gb3B0aW9ucykge1xuICAgIC8vIElmIHdlIGp1c3Qgc2V0IHRoaXMgZm9yIFwic2VydmVyXCIsIHJlcGxTZXQgd2lsbCBvdmVycmlkZSBpdC4gSWYgd2UganVzdFxuICAgIC8vIHNldCBpdCBmb3IgcmVwbFNldCwgaXQgd2lsbCBiZSBpZ25vcmVkIGlmIHdlJ3JlIG5vdCB1c2luZyBhIHJlcGxTZXQuXG4gICAgbW9uZ29PcHRpb25zLm1heFBvb2xTaXplID0gb3B0aW9ucy5tYXhQb29sU2l6ZTtcbiAgfVxuICBpZiAoJ21pblBvb2xTaXplJyBpbiBvcHRpb25zKSB7XG4gICAgbW9uZ29PcHRpb25zLm1pblBvb2xTaXplID0gb3B0aW9ucy5taW5Qb29sU2l6ZTtcbiAgfVxuXG4gIC8vIFRyYW5zZm9ybSBvcHRpb25zIGxpa2UgXCJ0bHNDQUZpbGVBc3NldFwiOiBcImZpbGVuYW1lLnBlbVwiIGludG9cbiAgLy8gXCJ0bHNDQUZpbGVcIjogXCIvPGZ1bGxwYXRoPi9maWxlbmFtZS5wZW1cIlxuICBPYmplY3QuZW50cmllcyhtb25nb09wdGlvbnMgfHwge30pXG4gICAgLmZpbHRlcigoW2tleV0pID0+IGtleSAmJiBrZXkuZW5kc1dpdGgoRklMRV9BU1NFVF9TVUZGSVgpKVxuICAgIC5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgIGNvbnN0IG9wdGlvbk5hbWUgPSBrZXkucmVwbGFjZShGSUxFX0FTU0VUX1NVRkZJWCwgJycpO1xuICAgICAgbW9uZ29PcHRpb25zW29wdGlvbk5hbWVdID0gcGF0aC5qb2luKEFzc2V0cy5nZXRTZXJ2ZXJEaXIoKSxcbiAgICAgICAgQVNTRVRTX0ZPTERFUiwgQVBQX0ZPTERFUiwgdmFsdWUpO1xuICAgICAgZGVsZXRlIG1vbmdvT3B0aW9uc1trZXldO1xuICAgIH0pO1xuXG4gIHNlbGYuZGIgPSBudWxsO1xuICBzZWxmLl9vcGxvZ0hhbmRsZSA9IG51bGw7XG4gIHNlbGYuX2RvY0ZldGNoZXIgPSBudWxsO1xuXG4gIG1vbmdvT3B0aW9ucy5kcml2ZXJJbmZvID0ge1xuICAgIG5hbWU6ICdNZXRlb3InLFxuICAgIHZlcnNpb246IE1ldGVvci5yZWxlYXNlXG4gIH1cblxuICBzZWxmLmNsaWVudCA9IG5ldyBNb25nb0RCLk1vbmdvQ2xpZW50KHVybCwgbW9uZ29PcHRpb25zKTtcbiAgc2VsZi5kYiA9IHNlbGYuY2xpZW50LmRiKCk7XG5cbiAgc2VsZi5jbGllbnQub24oJ3NlcnZlckRlc2NyaXB0aW9uQ2hhbmdlZCcsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoZXZlbnQgPT4ge1xuICAgIC8vIFdoZW4gdGhlIGNvbm5lY3Rpb24gaXMgbm8gbG9uZ2VyIGFnYWluc3QgdGhlIHByaW1hcnkgbm9kZSwgZXhlY3V0ZSBhbGxcbiAgICAvLyBmYWlsb3ZlciBob29rcy4gVGhpcyBpcyBpbXBvcnRhbnQgZm9yIHRoZSBkcml2ZXIgYXMgaXQgaGFzIHRvIHJlLXBvb2wgdGhlXG4gICAgLy8gcXVlcnkgd2hlbiBpdCBoYXBwZW5zLlxuICAgIGlmIChcbiAgICAgIGV2ZW50LnByZXZpb3VzRGVzY3JpcHRpb24udHlwZSAhPT0gJ1JTUHJpbWFyeScgJiZcbiAgICAgIGV2ZW50Lm5ld0Rlc2NyaXB0aW9uLnR5cGUgPT09ICdSU1ByaW1hcnknXG4gICAgKSB7XG4gICAgICBzZWxmLl9vbkZhaWxvdmVySG9vay5lYWNoKGNhbGxiYWNrID0+IHtcbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KTtcbiAgICB9XG4gIH0pKTtcblxuICBpZiAob3B0aW9ucy5vcGxvZ1VybCAmJiAhIFBhY2thZ2VbJ2Rpc2FibGUtb3Bsb2cnXSkge1xuICAgIHNlbGYuX29wbG9nSGFuZGxlID0gbmV3IE9wbG9nSGFuZGxlKG9wdGlvbnMub3Bsb2dVcmwsIHNlbGYuZGIuZGF0YWJhc2VOYW1lKTtcbiAgICBzZWxmLl9kb2NGZXRjaGVyID0gbmV3IERvY0ZldGNoZXIoc2VsZik7XG4gIH1cblxufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5fY2xvc2UgPSBhc3luYyBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmICghIHNlbGYuZGIpXG4gICAgdGhyb3cgRXJyb3IoXCJjbG9zZSBjYWxsZWQgYmVmb3JlIENvbm5lY3Rpb24gY3JlYXRlZD9cIik7XG5cbiAgLy8gWFhYIHByb2JhYmx5IHVudGVzdGVkXG4gIHZhciBvcGxvZ0hhbmRsZSA9IHNlbGYuX29wbG9nSGFuZGxlO1xuICBzZWxmLl9vcGxvZ0hhbmRsZSA9IG51bGw7XG4gIGlmIChvcGxvZ0hhbmRsZSlcbiAgICBhd2FpdCBvcGxvZ0hhbmRsZS5zdG9wKCk7XG5cbiAgLy8gVXNlIEZ1dHVyZS53cmFwIHNvIHRoYXQgZXJyb3JzIGdldCB0aHJvd24uIFRoaXMgaGFwcGVucyB0b1xuICAvLyB3b3JrIGV2ZW4gb3V0c2lkZSBhIGZpYmVyIHNpbmNlIHRoZSAnY2xvc2UnIG1ldGhvZCBpcyBub3RcbiAgLy8gYWN0dWFsbHkgYXN5bmNocm9ub3VzLlxuICBhd2FpdCBzZWxmLmNsaWVudC5jbG9zZSgpO1xufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuX2Nsb3NlKCk7XG59O1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9zZXRPcGxvZ0hhbmRsZSA9IGZ1bmN0aW9uKG9wbG9nSGFuZGxlKSB7XG4gIHRoaXMuX29wbG9nSGFuZGxlID0gb3Bsb2dIYW5kbGU7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gUmV0dXJucyB0aGUgTW9uZ28gQ29sbGVjdGlvbiBvYmplY3Q7IG1heSB5aWVsZC5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUucmF3Q29sbGVjdGlvbiA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKCEgc2VsZi5kYilcbiAgICB0aHJvdyBFcnJvcihcInJhd0NvbGxlY3Rpb24gY2FsbGVkIGJlZm9yZSBDb25uZWN0aW9uIGNyZWF0ZWQ/XCIpO1xuXG4gIHJldHVybiBzZWxmLmRiLmNvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpO1xufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5jcmVhdGVDYXBwZWRDb2xsZWN0aW9uQXN5bmMgPSBhc3luYyBmdW5jdGlvbiAoXG4gIGNvbGxlY3Rpb25OYW1lLCBieXRlU2l6ZSwgbWF4RG9jdW1lbnRzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAoISBzZWxmLmRiKVxuICAgIHRocm93IEVycm9yKFwiY3JlYXRlQ2FwcGVkQ29sbGVjdGlvbkFzeW5jIGNhbGxlZCBiZWZvcmUgQ29ubmVjdGlvbiBjcmVhdGVkP1wiKTtcblxuXG4gIGF3YWl0IHNlbGYuZGIuY3JlYXRlQ29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSxcbiAgICB7IGNhcHBlZDogdHJ1ZSwgc2l6ZTogYnl0ZVNpemUsIG1heDogbWF4RG9jdW1lbnRzIH0pO1xufTtcblxuLy8gVGhpcyBzaG91bGQgYmUgY2FsbGVkIHN5bmNocm9ub3VzbHkgd2l0aCBhIHdyaXRlLCB0byBjcmVhdGUgYVxuLy8gdHJhbnNhY3Rpb24gb24gdGhlIGN1cnJlbnQgd3JpdGUgZmVuY2UsIGlmIGFueS4gQWZ0ZXIgd2UgY2FuIHJlYWRcbi8vIHRoZSB3cml0ZSwgYW5kIGFmdGVyIG9ic2VydmVycyBoYXZlIGJlZW4gbm90aWZpZWQgKG9yIGF0IGxlYXN0LFxuLy8gYWZ0ZXIgdGhlIG9ic2VydmVyIG5vdGlmaWVycyBoYXZlIGFkZGVkIHRoZW1zZWx2ZXMgdG8gdGhlIHdyaXRlXG4vLyBmZW5jZSksIHlvdSBzaG91bGQgY2FsbCAnY29tbWl0dGVkKCknIG9uIHRoZSBvYmplY3QgcmV0dXJuZWQuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9tYXliZUJlZ2luV3JpdGUgPSBmdW5jdGlvbiAoKSB7XG4gIGNvbnN0IGZlbmNlID0gRERQU2VydmVyLl9nZXRDdXJyZW50RmVuY2UoKTtcbiAgaWYgKGZlbmNlKSB7XG4gICAgcmV0dXJuIGZlbmNlLmJlZ2luV3JpdGUoKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4ge2NvbW1pdHRlZDogZnVuY3Rpb24gKCkge319O1xuICB9XG59O1xuXG4vLyBJbnRlcm5hbCBpbnRlcmZhY2U6IGFkZHMgYSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgd2hlbiB0aGUgTW9uZ28gcHJpbWFyeVxuLy8gY2hhbmdlcy4gUmV0dXJucyBhIHN0b3AgaGFuZGxlLlxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5fb25GYWlsb3ZlciA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICByZXR1cm4gdGhpcy5fb25GYWlsb3Zlckhvb2sucmVnaXN0ZXIoY2FsbGJhY2spO1xufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5pbnNlcnRBc3luYyA9IGFzeW5jIGZ1bmN0aW9uIChjb2xsZWN0aW9uX25hbWUsIGRvY3VtZW50KSB7XG4gIGNvbnN0IHNlbGYgPSB0aGlzO1xuXG4gIGlmIChjb2xsZWN0aW9uX25hbWUgPT09IFwiX19fbWV0ZW9yX2ZhaWx1cmVfdGVzdF9jb2xsZWN0aW9uXCIpIHtcbiAgICBjb25zdCBlID0gbmV3IEVycm9yKFwiRmFpbHVyZSB0ZXN0XCIpO1xuICAgIGUuX2V4cGVjdGVkQnlUZXN0ID0gdHJ1ZTtcbiAgICB0aHJvdyBlO1xuICB9XG5cbiAgaWYgKCEoTG9jYWxDb2xsZWN0aW9uLl9pc1BsYWluT2JqZWN0KGRvY3VtZW50KSAmJlxuICAgICFFSlNPTi5faXNDdXN0b21UeXBlKGRvY3VtZW50KSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJPbmx5IHBsYWluIG9iamVjdHMgbWF5IGJlIGluc2VydGVkIGludG8gTW9uZ29EQlwiKTtcbiAgfVxuXG4gIHZhciB3cml0ZSA9IHNlbGYuX21heWJlQmVnaW5Xcml0ZSgpO1xuICB2YXIgcmVmcmVzaCA9IGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICBhd2FpdCBNZXRlb3IucmVmcmVzaCh7Y29sbGVjdGlvbjogY29sbGVjdGlvbl9uYW1lLCBpZDogZG9jdW1lbnQuX2lkIH0pO1xuICB9O1xuICByZXR1cm4gc2VsZi5yYXdDb2xsZWN0aW9uKGNvbGxlY3Rpb25fbmFtZSkuaW5zZXJ0T25lKFxuICAgIHJlcGxhY2VUeXBlcyhkb2N1bWVudCwgcmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28pLFxuICAgIHtcbiAgICAgIHNhZmU6IHRydWUsXG4gICAgfVxuICApLnRoZW4oYXN5bmMgKHtpbnNlcnRlZElkfSkgPT4ge1xuICAgIGF3YWl0IHJlZnJlc2goKTtcbiAgICBhd2FpdCB3cml0ZS5jb21taXR0ZWQoKTtcbiAgICByZXR1cm4gaW5zZXJ0ZWRJZDtcbiAgfSkuY2F0Y2goYXN5bmMgZSA9PiB7XG4gICAgYXdhaXQgd3JpdGUuY29tbWl0dGVkKCk7XG4gICAgdGhyb3cgZTtcbiAgfSk7XG59O1xuXG5cbi8vIENhdXNlIHF1ZXJpZXMgdGhhdCBtYXkgYmUgYWZmZWN0ZWQgYnkgdGhlIHNlbGVjdG9yIHRvIHBvbGwgaW4gdGhpcyB3cml0ZVxuLy8gZmVuY2UuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9yZWZyZXNoID0gYXN5bmMgZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBzZWxlY3Rvcikge1xuICB2YXIgcmVmcmVzaEtleSA9IHtjb2xsZWN0aW9uOiBjb2xsZWN0aW9uTmFtZX07XG4gIC8vIElmIHdlIGtub3cgd2hpY2ggZG9jdW1lbnRzIHdlJ3JlIHJlbW92aW5nLCBkb24ndCBwb2xsIHF1ZXJpZXMgdGhhdCBhcmVcbiAgLy8gc3BlY2lmaWMgdG8gb3RoZXIgZG9jdW1lbnRzLiAoTm90ZSB0aGF0IG11bHRpcGxlIG5vdGlmaWNhdGlvbnMgaGVyZSBzaG91bGRcbiAgLy8gbm90IGNhdXNlIG11bHRpcGxlIHBvbGxzLCBzaW5jZSBhbGwgb3VyIGxpc3RlbmVyIGlzIGRvaW5nIGlzIGVucXVldWVpbmcgYVxuICAvLyBwb2xsLilcbiAgdmFyIHNwZWNpZmljSWRzID0gTG9jYWxDb2xsZWN0aW9uLl9pZHNNYXRjaGVkQnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gIGlmIChzcGVjaWZpY0lkcykge1xuICAgIGZvciAoY29uc3QgaWQgb2Ygc3BlY2lmaWNJZHMpIHtcbiAgICAgIGF3YWl0IE1ldGVvci5yZWZyZXNoKE9iamVjdC5hc3NpZ24oe2lkOiBpZH0sIHJlZnJlc2hLZXkpKTtcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIGF3YWl0IE1ldGVvci5yZWZyZXNoKHJlZnJlc2hLZXkpO1xuICB9XG59O1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLnJlbW92ZUFzeW5jID0gYXN5bmMgZnVuY3Rpb24gKGNvbGxlY3Rpb25fbmFtZSwgc2VsZWN0b3IpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmIChjb2xsZWN0aW9uX25hbWUgPT09IFwiX19fbWV0ZW9yX2ZhaWx1cmVfdGVzdF9jb2xsZWN0aW9uXCIpIHtcbiAgICB2YXIgZSA9IG5ldyBFcnJvcihcIkZhaWx1cmUgdGVzdFwiKTtcbiAgICBlLl9leHBlY3RlZEJ5VGVzdCA9IHRydWU7XG4gICAgdGhyb3cgZTtcbiAgfVxuXG4gIHZhciB3cml0ZSA9IHNlbGYuX21heWJlQmVnaW5Xcml0ZSgpO1xuICB2YXIgcmVmcmVzaCA9IGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICBhd2FpdCBzZWxmLl9yZWZyZXNoKGNvbGxlY3Rpb25fbmFtZSwgc2VsZWN0b3IpO1xuICB9O1xuXG4gIHJldHVybiBzZWxmLnJhd0NvbGxlY3Rpb24oY29sbGVjdGlvbl9uYW1lKVxuICAgIC5kZWxldGVNYW55KHJlcGxhY2VUeXBlcyhzZWxlY3RvciwgcmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28pLCB7XG4gICAgICBzYWZlOiB0cnVlLFxuICAgIH0pXG4gICAgLnRoZW4oYXN5bmMgKHsgZGVsZXRlZENvdW50IH0pID0+IHtcbiAgICAgIGF3YWl0IHJlZnJlc2goKTtcbiAgICAgIGF3YWl0IHdyaXRlLmNvbW1pdHRlZCgpO1xuICAgICAgcmV0dXJuIHRyYW5zZm9ybVJlc3VsdCh7IHJlc3VsdCA6IHttb2RpZmllZENvdW50IDogZGVsZXRlZENvdW50fSB9KS5udW1iZXJBZmZlY3RlZDtcbiAgICB9KS5jYXRjaChhc3luYyAoZXJyKSA9PiB7XG4gICAgICBhd2FpdCB3cml0ZS5jb21taXR0ZWQoKTtcbiAgICAgIHRocm93IGVycjtcbiAgICB9KTtcbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuZHJvcENvbGxlY3Rpb25Bc3luYyA9IGFzeW5jIGZ1bmN0aW9uKGNvbGxlY3Rpb25OYW1lKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuXG4gIHZhciB3cml0ZSA9IHNlbGYuX21heWJlQmVnaW5Xcml0ZSgpO1xuICB2YXIgcmVmcmVzaCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBNZXRlb3IucmVmcmVzaCh7XG4gICAgICBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uTmFtZSxcbiAgICAgIGlkOiBudWxsLFxuICAgICAgZHJvcENvbGxlY3Rpb246IHRydWUsXG4gICAgfSk7XG4gIH07XG5cbiAgcmV0dXJuIHNlbGZcbiAgICAucmF3Q29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSlcbiAgICAuZHJvcCgpXG4gICAgLnRoZW4oYXN5bmMgcmVzdWx0ID0+IHtcbiAgICAgIGF3YWl0IHJlZnJlc2goKTtcbiAgICAgIGF3YWl0IHdyaXRlLmNvbW1pdHRlZCgpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9KVxuICAgIC5jYXRjaChhc3luYyBlID0+IHtcbiAgICAgIGF3YWl0IHdyaXRlLmNvbW1pdHRlZCgpO1xuICAgICAgdGhyb3cgZTtcbiAgICB9KTtcbn07XG5cbi8vIEZvciB0ZXN0aW5nIG9ubHkuICBTbGlnaHRseSBiZXR0ZXIgdGhhbiBgYy5yYXdEYXRhYmFzZSgpLmRyb3BEYXRhYmFzZSgpYFxuLy8gYmVjYXVzZSBpdCBsZXRzIHRoZSB0ZXN0J3MgZmVuY2Ugd2FpdCBmb3IgaXQgdG8gYmUgY29tcGxldGUuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLmRyb3BEYXRhYmFzZUFzeW5jID0gYXN5bmMgZnVuY3Rpb24gKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdmFyIHdyaXRlID0gc2VsZi5fbWF5YmVCZWdpbldyaXRlKCk7XG4gIHZhciByZWZyZXNoID0gYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgIGF3YWl0IE1ldGVvci5yZWZyZXNoKHsgZHJvcERhdGFiYXNlOiB0cnVlIH0pO1xuICB9O1xuXG4gIHRyeSB7XG4gICAgYXdhaXQgc2VsZi5kYi5fZHJvcERhdGFiYXNlKCk7XG4gICAgYXdhaXQgcmVmcmVzaCgpO1xuICAgIGF3YWl0IHdyaXRlLmNvbW1pdHRlZCgpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgYXdhaXQgd3JpdGUuY29tbWl0dGVkKCk7XG4gICAgdGhyb3cgZTtcbiAgfVxufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS51cGRhdGVBc3luYyA9IGFzeW5jIGZ1bmN0aW9uIChjb2xsZWN0aW9uX25hbWUsIHNlbGVjdG9yLCBtb2QsIG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmIChjb2xsZWN0aW9uX25hbWUgPT09IFwiX19fbWV0ZW9yX2ZhaWx1cmVfdGVzdF9jb2xsZWN0aW9uXCIpIHtcbiAgICB2YXIgZSA9IG5ldyBFcnJvcihcIkZhaWx1cmUgdGVzdFwiKTtcbiAgICBlLl9leHBlY3RlZEJ5VGVzdCA9IHRydWU7XG4gICAgdGhyb3cgZTtcbiAgfVxuXG4gIC8vIGV4cGxpY2l0IHNhZmV0eSBjaGVjay4gbnVsbCBhbmQgdW5kZWZpbmVkIGNhbiBjcmFzaCB0aGUgbW9uZ29cbiAgLy8gZHJpdmVyLiBBbHRob3VnaCB0aGUgbm9kZSBkcml2ZXIgYW5kIG1pbmltb25nbyBkbyAnc3VwcG9ydCdcbiAgLy8gbm9uLW9iamVjdCBtb2RpZmllciBpbiB0aGF0IHRoZXkgZG9uJ3QgY3Jhc2gsIHRoZXkgYXJlIG5vdFxuICAvLyBtZWFuaW5nZnVsIG9wZXJhdGlvbnMgYW5kIGRvIG5vdCBkbyBhbnl0aGluZy4gRGVmZW5zaXZlbHkgdGhyb3cgYW5cbiAgLy8gZXJyb3IgaGVyZS5cbiAgaWYgKCFtb2QgfHwgdHlwZW9mIG1vZCAhPT0gJ29iamVjdCcpIHtcbiAgICBjb25zdCBlcnJvciA9IG5ldyBFcnJvcihcIkludmFsaWQgbW9kaWZpZXIuIE1vZGlmaWVyIG11c3QgYmUgYW4gb2JqZWN0LlwiKTtcblxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgaWYgKCEoTG9jYWxDb2xsZWN0aW9uLl9pc1BsYWluT2JqZWN0KG1vZCkgJiYgIUVKU09OLl9pc0N1c3RvbVR5cGUobW9kKSkpIHtcbiAgICBjb25zdCBlcnJvciA9IG5ldyBFcnJvcihcbiAgICAgIFwiT25seSBwbGFpbiBvYmplY3RzIG1heSBiZSB1c2VkIGFzIHJlcGxhY2VtZW50XCIgK1xuICAgICAgXCIgZG9jdW1lbnRzIGluIE1vbmdvREJcIik7XG5cbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxuXG4gIGlmICghb3B0aW9ucykgb3B0aW9ucyA9IHt9O1xuXG4gIHZhciB3cml0ZSA9IHNlbGYuX21heWJlQmVnaW5Xcml0ZSgpO1xuICB2YXIgcmVmcmVzaCA9IGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICBhd2FpdCBzZWxmLl9yZWZyZXNoKGNvbGxlY3Rpb25fbmFtZSwgc2VsZWN0b3IpO1xuICB9O1xuXG4gIHZhciBjb2xsZWN0aW9uID0gc2VsZi5yYXdDb2xsZWN0aW9uKGNvbGxlY3Rpb25fbmFtZSk7XG4gIHZhciBtb25nb09wdHMgPSB7c2FmZTogdHJ1ZX07XG4gIC8vIEFkZCBzdXBwb3J0IGZvciBmaWx0ZXJlZCBwb3NpdGlvbmFsIG9wZXJhdG9yXG4gIGlmIChvcHRpb25zLmFycmF5RmlsdGVycyAhPT0gdW5kZWZpbmVkKSBtb25nb09wdHMuYXJyYXlGaWx0ZXJzID0gb3B0aW9ucy5hcnJheUZpbHRlcnM7XG4gIC8vIGV4cGxpY3RseSBlbnVtZXJhdGUgb3B0aW9ucyB0aGF0IG1pbmltb25nbyBzdXBwb3J0c1xuICBpZiAob3B0aW9ucy51cHNlcnQpIG1vbmdvT3B0cy51cHNlcnQgPSB0cnVlO1xuICBpZiAob3B0aW9ucy5tdWx0aSkgbW9uZ29PcHRzLm11bHRpID0gdHJ1ZTtcbiAgLy8gTGV0cyB5b3UgZ2V0IGEgbW9yZSBtb3JlIGZ1bGwgcmVzdWx0IGZyb20gTW9uZ29EQi4gVXNlIHdpdGggY2F1dGlvbjpcbiAgLy8gbWlnaHQgbm90IHdvcmsgd2l0aCBDLnVwc2VydCAoYXMgb3Bwb3NlZCB0byBDLnVwZGF0ZSh7dXBzZXJ0OnRydWV9KSBvclxuICAvLyB3aXRoIHNpbXVsYXRlZCB1cHNlcnQuXG4gIGlmIChvcHRpb25zLmZ1bGxSZXN1bHQpIG1vbmdvT3B0cy5mdWxsUmVzdWx0ID0gdHJ1ZTtcblxuICB2YXIgbW9uZ29TZWxlY3RvciA9IHJlcGxhY2VUeXBlcyhzZWxlY3RvciwgcmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28pO1xuICB2YXIgbW9uZ29Nb2QgPSByZXBsYWNlVHlwZXMobW9kLCByZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbyk7XG5cbiAgdmFyIGlzTW9kaWZ5ID0gTG9jYWxDb2xsZWN0aW9uLl9pc01vZGlmaWNhdGlvbk1vZChtb25nb01vZCk7XG5cbiAgaWYgKG9wdGlvbnMuX2ZvcmJpZFJlcGxhY2UgJiYgIWlzTW9kaWZ5KSB7XG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcihcIkludmFsaWQgbW9kaWZpZXIuIFJlcGxhY2VtZW50cyBhcmUgZm9yYmlkZGVuLlwiKTtcbiAgICB0aHJvdyBlcnI7XG4gIH1cblxuICAvLyBXZSd2ZSBhbHJlYWR5IHJ1biByZXBsYWNlVHlwZXMvcmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28gb25cbiAgLy8gc2VsZWN0b3IgYW5kIG1vZC4gIFdlIGFzc3VtZSBpdCBkb2Vzbid0IG1hdHRlciwgYXMgZmFyIGFzXG4gIC8vIHRoZSBiZWhhdmlvciBvZiBtb2RpZmllcnMgaXMgY29uY2VybmVkLCB3aGV0aGVyIGBfbW9kaWZ5YFxuICAvLyBpcyBydW4gb24gRUpTT04gb3Igb24gbW9uZ28tY29udmVydGVkIEVKU09OLlxuXG4gIC8vIFJ1biB0aGlzIGNvZGUgdXAgZnJvbnQgc28gdGhhdCBpdCBmYWlscyBmYXN0IGlmIHNvbWVvbmUgdXNlc1xuICAvLyBhIE1vbmdvIHVwZGF0ZSBvcGVyYXRvciB3ZSBkb24ndCBzdXBwb3J0LlxuICBsZXQga25vd25JZDtcbiAgaWYgKG9wdGlvbnMudXBzZXJ0KSB7XG4gICAgdHJ5IHtcbiAgICAgIGxldCBuZXdEb2MgPSBMb2NhbENvbGxlY3Rpb24uX2NyZWF0ZVVwc2VydERvY3VtZW50KHNlbGVjdG9yLCBtb2QpO1xuICAgICAga25vd25JZCA9IG5ld0RvYy5faWQ7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICB9XG4gIGlmIChvcHRpb25zLnVwc2VydCAmJlxuICAgICEgaXNNb2RpZnkgJiZcbiAgICAhIGtub3duSWQgJiZcbiAgICBvcHRpb25zLmluc2VydGVkSWQgJiZcbiAgICAhIChvcHRpb25zLmluc2VydGVkSWQgaW5zdGFuY2VvZiBNb25nby5PYmplY3RJRCAmJlxuICAgICAgb3B0aW9ucy5nZW5lcmF0ZWRJZCkpIHtcbiAgICAvLyBJbiBjYXNlIG9mIGFuIHVwc2VydCB3aXRoIGEgcmVwbGFjZW1lbnQsIHdoZXJlIHRoZXJlIGlzIG5vIF9pZCBkZWZpbmVkXG4gICAgLy8gaW4gZWl0aGVyIHRoZSBxdWVyeSBvciB0aGUgcmVwbGFjZW1lbnQgZG9jLCBtb25nbyB3aWxsIGdlbmVyYXRlIGFuIGlkIGl0c2VsZi5cbiAgICAvLyBUaGVyZWZvcmUgd2UgbmVlZCB0aGlzIHNwZWNpYWwgc3RyYXRlZ3kgaWYgd2Ugd2FudCB0byBjb250cm9sIHRoZSBpZCBvdXJzZWx2ZXMuXG5cbiAgICAvLyBXZSBkb24ndCBuZWVkIHRvIGRvIHRoaXMgd2hlbjpcbiAgICAvLyAtIFRoaXMgaXMgbm90IGEgcmVwbGFjZW1lbnQsIHNvIHdlIGNhbiBhZGQgYW4gX2lkIHRvICRzZXRPbkluc2VydFxuICAgIC8vIC0gVGhlIGlkIGlzIGRlZmluZWQgYnkgcXVlcnkgb3IgbW9kIHdlIGNhbiBqdXN0IGFkZCBpdCB0byB0aGUgcmVwbGFjZW1lbnQgZG9jXG4gICAgLy8gLSBUaGUgdXNlciBkaWQgbm90IHNwZWNpZnkgYW55IGlkIHByZWZlcmVuY2UgYW5kIHRoZSBpZCBpcyBhIE1vbmdvIE9iamVjdElkLFxuICAgIC8vICAgICB0aGVuIHdlIGNhbiBqdXN0IGxldCBNb25nbyBnZW5lcmF0ZSB0aGUgaWRcbiAgICByZXR1cm4gYXdhaXQgc2ltdWxhdGVVcHNlcnRXaXRoSW5zZXJ0ZWRJZChjb2xsZWN0aW9uLCBtb25nb1NlbGVjdG9yLCBtb25nb01vZCwgb3B0aW9ucylcbiAgICAgIC50aGVuKGFzeW5jIHJlc3VsdCA9PiB7XG4gICAgICAgIGF3YWl0IHJlZnJlc2goKTtcbiAgICAgICAgYXdhaXQgd3JpdGUuY29tbWl0dGVkKCk7XG4gICAgICAgIGlmIChyZXN1bHQgJiYgISBvcHRpb25zLl9yZXR1cm5PYmplY3QpIHtcbiAgICAgICAgICByZXR1cm4gcmVzdWx0Lm51bWJlckFmZmVjdGVkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIGlmIChvcHRpb25zLnVwc2VydCAmJiAha25vd25JZCAmJiBvcHRpb25zLmluc2VydGVkSWQgJiYgaXNNb2RpZnkpIHtcbiAgICAgIGlmICghbW9uZ29Nb2QuaGFzT3duUHJvcGVydHkoJyRzZXRPbkluc2VydCcpKSB7XG4gICAgICAgIG1vbmdvTW9kLiRzZXRPbkluc2VydCA9IHt9O1xuICAgICAgfVxuICAgICAga25vd25JZCA9IG9wdGlvbnMuaW5zZXJ0ZWRJZDtcbiAgICAgIE9iamVjdC5hc3NpZ24obW9uZ29Nb2QuJHNldE9uSW5zZXJ0LCByZXBsYWNlVHlwZXMoe19pZDogb3B0aW9ucy5pbnNlcnRlZElkfSwgcmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28pKTtcbiAgICB9XG5cbiAgICBjb25zdCBzdHJpbmdzID0gT2JqZWN0LmtleXMobW9uZ29Nb2QpLmZpbHRlcigoa2V5KSA9PiAha2V5LnN0YXJ0c1dpdGgoXCIkXCIpKTtcbiAgICBsZXQgdXBkYXRlTWV0aG9kID0gc3RyaW5ncy5sZW5ndGggPiAwID8gJ3JlcGxhY2VPbmUnIDogJ3VwZGF0ZU1hbnknO1xuICAgIHVwZGF0ZU1ldGhvZCA9XG4gICAgICB1cGRhdGVNZXRob2QgPT09ICd1cGRhdGVNYW55JyAmJiAhbW9uZ29PcHRzLm11bHRpXG4gICAgICAgID8gJ3VwZGF0ZU9uZSdcbiAgICAgICAgOiB1cGRhdGVNZXRob2Q7XG4gICAgcmV0dXJuIGNvbGxlY3Rpb25bdXBkYXRlTWV0aG9kXVxuICAgICAgLmJpbmQoY29sbGVjdGlvbikobW9uZ29TZWxlY3RvciwgbW9uZ29Nb2QsIG1vbmdvT3B0cylcbiAgICAgIC50aGVuKGFzeW5jIHJlc3VsdCA9PiB7XG4gICAgICAgIHZhciBtZXRlb3JSZXN1bHQgPSB0cmFuc2Zvcm1SZXN1bHQoe3Jlc3VsdH0pO1xuICAgICAgICBpZiAobWV0ZW9yUmVzdWx0ICYmIG9wdGlvbnMuX3JldHVybk9iamVjdCkge1xuICAgICAgICAgIC8vIElmIHRoaXMgd2FzIGFuIHVwc2VydEFzeW5jKCkgY2FsbCwgYW5kIHdlIGVuZGVkIHVwXG4gICAgICAgICAgLy8gaW5zZXJ0aW5nIGEgbmV3IGRvYyBhbmQgd2Uga25vdyBpdHMgaWQsIHRoZW5cbiAgICAgICAgICAvLyByZXR1cm4gdGhhdCBpZCBhcyB3ZWxsLlxuICAgICAgICAgIGlmIChvcHRpb25zLnVwc2VydCAmJiBtZXRlb3JSZXN1bHQuaW5zZXJ0ZWRJZCkge1xuICAgICAgICAgICAgaWYgKGtub3duSWQpIHtcbiAgICAgICAgICAgICAgbWV0ZW9yUmVzdWx0Lmluc2VydGVkSWQgPSBrbm93bklkO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtZXRlb3JSZXN1bHQuaW5zZXJ0ZWRJZCBpbnN0YW5jZW9mIE1vbmdvREIuT2JqZWN0SWQpIHtcbiAgICAgICAgICAgICAgbWV0ZW9yUmVzdWx0Lmluc2VydGVkSWQgPSBuZXcgTW9uZ28uT2JqZWN0SUQobWV0ZW9yUmVzdWx0Lmluc2VydGVkSWQudG9IZXhTdHJpbmcoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGF3YWl0IHJlZnJlc2goKTtcbiAgICAgICAgICBhd2FpdCB3cml0ZS5jb21taXR0ZWQoKTtcbiAgICAgICAgICByZXR1cm4gbWV0ZW9yUmVzdWx0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF3YWl0IHJlZnJlc2goKTtcbiAgICAgICAgICBhd2FpdCB3cml0ZS5jb21taXR0ZWQoKTtcbiAgICAgICAgICByZXR1cm4gbWV0ZW9yUmVzdWx0Lm51bWJlckFmZmVjdGVkO1xuICAgICAgICB9XG4gICAgICB9KS5jYXRjaChhc3luYyAoZXJyKSA9PiB7XG4gICAgICAgIGF3YWl0IHdyaXRlLmNvbW1pdHRlZCgpO1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9KTtcbiAgfVxufTtcblxuLy8gZXhwb3NlZCBmb3IgdGVzdGluZ1xuTW9uZ29Db25uZWN0aW9uLl9pc0Nhbm5vdENoYW5nZUlkRXJyb3IgPSBmdW5jdGlvbiAoZXJyKSB7XG5cbiAgLy8gTW9uZ28gMy4yLiogcmV0dXJucyBlcnJvciBhcyBuZXh0IE9iamVjdDpcbiAgLy8ge25hbWU6IFN0cmluZywgY29kZTogTnVtYmVyLCBlcnJtc2c6IFN0cmluZ31cbiAgLy8gT2xkZXIgTW9uZ28gcmV0dXJuczpcbiAgLy8ge25hbWU6IFN0cmluZywgY29kZTogTnVtYmVyLCBlcnI6IFN0cmluZ31cbiAgdmFyIGVycm9yID0gZXJyLmVycm1zZyB8fCBlcnIuZXJyO1xuXG4gIC8vIFdlIGRvbid0IHVzZSB0aGUgZXJyb3IgY29kZSBoZXJlXG4gIC8vIGJlY2F1c2UgdGhlIGVycm9yIGNvZGUgd2Ugb2JzZXJ2ZWQgaXQgcHJvZHVjaW5nICgxNjgzNykgYXBwZWFycyB0byBiZVxuICAvLyBhIGZhciBtb3JlIGdlbmVyaWMgZXJyb3IgY29kZSBiYXNlZCBvbiBleGFtaW5pbmcgdGhlIHNvdXJjZS5cbiAgaWYgKGVycm9yLmluZGV4T2YoJ1RoZSBfaWQgZmllbGQgY2Fubm90IGJlIGNoYW5nZWQnKSA9PT0gMFxuICAgIHx8IGVycm9yLmluZGV4T2YoXCJ0aGUgKGltbXV0YWJsZSkgZmllbGQgJ19pZCcgd2FzIGZvdW5kIHRvIGhhdmUgYmVlbiBhbHRlcmVkIHRvIF9pZFwiKSAhPT0gLTEpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn07XG5cbi8vIFhYWCBNb25nb0Nvbm5lY3Rpb24udXBzZXJ0QXN5bmMoKSBkb2VzIG5vdCByZXR1cm4gdGhlIGlkIG9mIHRoZSBpbnNlcnRlZCBkb2N1bWVudFxuLy8gdW5sZXNzIHlvdSBzZXQgaXQgZXhwbGljaXRseSBpbiB0aGUgc2VsZWN0b3Igb3IgbW9kaWZpZXIgKGFzIGEgcmVwbGFjZW1lbnRcbi8vIGRvYykuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLnVwc2VydEFzeW5jID0gYXN5bmMgZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBzZWxlY3RvciwgbW9kLCBvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuXG5cbiAgaWYgKHR5cGVvZiBvcHRpb25zID09PSBcImZ1bmN0aW9uXCIgJiYgISBjYWxsYmFjaykge1xuICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICBvcHRpb25zID0ge307XG4gIH1cblxuICByZXR1cm4gc2VsZi51cGRhdGVBc3luYyhjb2xsZWN0aW9uTmFtZSwgc2VsZWN0b3IsIG1vZCxcbiAgICBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zLCB7XG4gICAgICB1cHNlcnQ6IHRydWUsXG4gICAgICBfcmV0dXJuT2JqZWN0OiB0cnVlXG4gICAgfSkpO1xufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5maW5kID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBzZWxlY3Rvciwgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpXG4gICAgc2VsZWN0b3IgPSB7fTtcblxuICByZXR1cm4gbmV3IEN1cnNvcihcbiAgICBzZWxmLCBuZXcgQ3Vyc29yRGVzY3JpcHRpb24oY29sbGVjdGlvbk5hbWUsIHNlbGVjdG9yLCBvcHRpb25zKSk7XG59O1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLmZpbmRPbmVBc3luYyA9IGFzeW5jIGZ1bmN0aW9uIChjb2xsZWN0aW9uX25hbWUsIHNlbGVjdG9yLCBvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICBzZWxlY3RvciA9IHt9O1xuICB9XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIG9wdGlvbnMubGltaXQgPSAxO1xuXG4gIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBzZWxmLmZpbmQoY29sbGVjdGlvbl9uYW1lLCBzZWxlY3Rvciwgb3B0aW9ucykuZmV0Y2goKTtcblxuICByZXR1cm4gcmVzdWx0c1swXTtcbn07XG5cbi8vIFdlJ2xsIGFjdHVhbGx5IGRlc2lnbiBhbiBpbmRleCBBUEkgbGF0ZXIuIEZvciBub3csIHdlIGp1c3QgcGFzcyB0aHJvdWdoIHRvXG4vLyBNb25nbydzLCBidXQgbWFrZSBpdCBzeW5jaHJvbm91cy5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuY3JlYXRlSW5kZXhBc3luYyA9IGFzeW5jIGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSwgaW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgLy8gV2UgZXhwZWN0IHRoaXMgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHN0YXJ0dXAsIG5vdCBmcm9tIHdpdGhpbiBhIG1ldGhvZCxcbiAgLy8gc28gd2UgZG9uJ3QgaW50ZXJhY3Qgd2l0aCB0aGUgd3JpdGUgZmVuY2UuXG4gIHZhciBjb2xsZWN0aW9uID0gc2VsZi5yYXdDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKTtcbiAgYXdhaXQgY29sbGVjdGlvbi5jcmVhdGVJbmRleChpbmRleCwgb3B0aW9ucyk7XG59O1xuXG4vLyBqdXN0IHRvIGJlIGNvbnNpc3RlbnQgd2l0aCB0aGUgb3RoZXIgbWV0aG9kc1xuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5jcmVhdGVJbmRleCA9XG4gIE1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuY3JlYXRlSW5kZXhBc3luYztcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5jb3VudERvY3VtZW50cyA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSwgLi4uYXJncykge1xuICBhcmdzID0gYXJncy5tYXAoYXJnID0+IHJlcGxhY2VUeXBlcyhhcmcsIHJlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvKSk7XG4gIGNvbnN0IGNvbGxlY3Rpb24gPSB0aGlzLnJhd0NvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpO1xuICByZXR1cm4gY29sbGVjdGlvbi5jb3VudERvY3VtZW50cyguLi5hcmdzKTtcbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuZXN0aW1hdGVkRG9jdW1lbnRDb3VudCA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSwgLi4uYXJncykge1xuICBhcmdzID0gYXJncy5tYXAoYXJnID0+IHJlcGxhY2VUeXBlcyhhcmcsIHJlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvKSk7XG4gIGNvbnN0IGNvbGxlY3Rpb24gPSB0aGlzLnJhd0NvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpO1xuICByZXR1cm4gY29sbGVjdGlvbi5lc3RpbWF0ZWREb2N1bWVudENvdW50KC4uLmFyZ3MpO1xufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5lbnN1cmVJbmRleEFzeW5jID0gTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5jcmVhdGVJbmRleEFzeW5jO1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLmRyb3BJbmRleEFzeW5jID0gYXN5bmMgZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBpbmRleCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cblxuICAvLyBUaGlzIGZ1bmN0aW9uIGlzIG9ubHkgdXNlZCBieSB0ZXN0IGNvZGUsIG5vdCB3aXRoaW4gYSBtZXRob2QsIHNvIHdlIGRvbid0XG4gIC8vIGludGVyYWN0IHdpdGggdGhlIHdyaXRlIGZlbmNlLlxuICB2YXIgY29sbGVjdGlvbiA9IHNlbGYucmF3Q29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSk7XG4gIHZhciBpbmRleE5hbWUgPSAgYXdhaXQgY29sbGVjdGlvbi5kcm9wSW5kZXgoaW5kZXgpO1xufTtcblxuXG5DTElFTlRfT05MWV9NRVRIT0RTLmZvckVhY2goZnVuY3Rpb24gKG0pIHtcbiAgTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZVttXSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgJHttfSArICBpcyBub3QgYXZhaWxhYmxlIG9uIHRoZSBzZXJ2ZXIuIFBsZWFzZSB1c2UgJHtnZXRBc3luY01ldGhvZE5hbWUoXG4gICAgICAgIG1cbiAgICAgICl9KCkgaW5zdGVhZC5gXG4gICAgKTtcbiAgfTtcbn0pO1xuXG5cbnZhciBOVU1fT1BUSU1JU1RJQ19UUklFUyA9IDM7XG5cblxuXG52YXIgc2ltdWxhdGVVcHNlcnRXaXRoSW5zZXJ0ZWRJZCA9IGFzeW5jIGZ1bmN0aW9uIChjb2xsZWN0aW9uLCBzZWxlY3RvciwgbW9kLCBvcHRpb25zKSB7XG4gIC8vIFNUUkFURUdZOiBGaXJzdCB0cnkgZG9pbmcgYW4gdXBzZXJ0IHdpdGggYSBnZW5lcmF0ZWQgSUQuXG4gIC8vIElmIHRoaXMgdGhyb3dzIGFuIGVycm9yIGFib3V0IGNoYW5naW5nIHRoZSBJRCBvbiBhbiBleGlzdGluZyBkb2N1bWVudFxuICAvLyB0aGVuIHdpdGhvdXQgYWZmZWN0aW5nIHRoZSBkYXRhYmFzZSwgd2Uga25vdyB3ZSBzaG91bGQgcHJvYmFibHkgdHJ5XG4gIC8vIGFuIHVwZGF0ZSB3aXRob3V0IHRoZSBnZW5lcmF0ZWQgSUQuIElmIGl0IGFmZmVjdGVkIDAgZG9jdW1lbnRzLFxuICAvLyB0aGVuIHdpdGhvdXQgYWZmZWN0aW5nIHRoZSBkYXRhYmFzZSwgd2UgdGhlIGRvY3VtZW50IHRoYXQgZmlyc3RcbiAgLy8gZ2F2ZSB0aGUgZXJyb3IgaXMgcHJvYmFibHkgcmVtb3ZlZCBhbmQgd2UgbmVlZCB0byB0cnkgYW4gaW5zZXJ0IGFnYWluXG4gIC8vIFdlIGdvIGJhY2sgdG8gc3RlcCBvbmUgYW5kIHJlcGVhdC5cbiAgLy8gTGlrZSBhbGwgXCJvcHRpbWlzdGljIHdyaXRlXCIgc2NoZW1lcywgd2UgcmVseSBvbiB0aGUgZmFjdCB0aGF0IGl0J3NcbiAgLy8gdW5saWtlbHkgb3VyIHdyaXRlcyB3aWxsIGNvbnRpbnVlIHRvIGJlIGludGVyZmVyZWQgd2l0aCB1bmRlciBub3JtYWxcbiAgLy8gY2lyY3Vtc3RhbmNlcyAodGhvdWdoIHN1ZmZpY2llbnRseSBoZWF2eSBjb250ZW50aW9uIHdpdGggd3JpdGVyc1xuICAvLyBkaXNhZ3JlZWluZyBvbiB0aGUgZXhpc3RlbmNlIG9mIGFuIG9iamVjdCB3aWxsIGNhdXNlIHdyaXRlcyB0byBmYWlsXG4gIC8vIGluIHRoZW9yeSkuXG5cbiAgdmFyIGluc2VydGVkSWQgPSBvcHRpb25zLmluc2VydGVkSWQ7IC8vIG11c3QgZXhpc3RcbiAgdmFyIG1vbmdvT3B0c0ZvclVwZGF0ZSA9IHtcbiAgICBzYWZlOiB0cnVlLFxuICAgIG11bHRpOiBvcHRpb25zLm11bHRpXG4gIH07XG4gIHZhciBtb25nb09wdHNGb3JJbnNlcnQgPSB7XG4gICAgc2FmZTogdHJ1ZSxcbiAgICB1cHNlcnQ6IHRydWVcbiAgfTtcblxuICB2YXIgcmVwbGFjZW1lbnRXaXRoSWQgPSBPYmplY3QuYXNzaWduKFxuICAgIHJlcGxhY2VUeXBlcyh7X2lkOiBpbnNlcnRlZElkfSwgcmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28pLFxuICAgIG1vZCk7XG5cbiAgdmFyIHRyaWVzID0gTlVNX09QVElNSVNUSUNfVFJJRVM7XG5cbiAgdmFyIGRvVXBkYXRlID0gYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgIHRyaWVzLS07XG4gICAgaWYgKCEgdHJpZXMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlVwc2VydCBmYWlsZWQgYWZ0ZXIgXCIgKyBOVU1fT1BUSU1JU1RJQ19UUklFUyArIFwiIHRyaWVzLlwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IG1ldGhvZCA9IGNvbGxlY3Rpb24udXBkYXRlTWFueTtcbiAgICAgIGlmKCFPYmplY3Qua2V5cyhtb2QpLnNvbWUoa2V5ID0+IGtleS5zdGFydHNXaXRoKFwiJFwiKSkpe1xuICAgICAgICBtZXRob2QgPSBjb2xsZWN0aW9uLnJlcGxhY2VPbmUuYmluZChjb2xsZWN0aW9uKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBtZXRob2QoXG4gICAgICAgIHNlbGVjdG9yLFxuICAgICAgICBtb2QsXG4gICAgICAgIG1vbmdvT3B0c0ZvclVwZGF0ZSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgICBpZiAocmVzdWx0ICYmIChyZXN1bHQubW9kaWZpZWRDb3VudCB8fCByZXN1bHQudXBzZXJ0ZWRDb3VudCkpIHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbnVtYmVyQWZmZWN0ZWQ6IHJlc3VsdC5tb2RpZmllZENvdW50IHx8IHJlc3VsdC51cHNlcnRlZENvdW50LFxuICAgICAgICAgICAgaW5zZXJ0ZWRJZDogcmVzdWx0LnVwc2VydGVkSWQgfHwgdW5kZWZpbmVkLFxuICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGRvQ29uZGl0aW9uYWxJbnNlcnQoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xuXG4gIHZhciBkb0NvbmRpdGlvbmFsSW5zZXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGNvbGxlY3Rpb24ucmVwbGFjZU9uZShzZWxlY3RvciwgcmVwbGFjZW1lbnRXaXRoSWQsIG1vbmdvT3B0c0Zvckluc2VydClcbiAgICAgIC50aGVuKHJlc3VsdCA9PiAoe1xuICAgICAgICBudW1iZXJBZmZlY3RlZDogcmVzdWx0LnVwc2VydGVkQ291bnQsXG4gICAgICAgIGluc2VydGVkSWQ6IHJlc3VsdC51cHNlcnRlZElkLFxuICAgICAgfSkpLmNhdGNoKGVyciA9PiB7XG4gICAgICAgIGlmIChNb25nb0Nvbm5lY3Rpb24uX2lzQ2Fubm90Q2hhbmdlSWRFcnJvcihlcnIpKSB7XG4gICAgICAgICAgcmV0dXJuIGRvVXBkYXRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICB9O1xuICByZXR1cm4gZG9VcGRhdGUoKTtcbn07XG5cbi8vIG9ic2VydmVDaGFuZ2VzIGZvciB0YWlsYWJsZSBjdXJzb3JzIG9uIGNhcHBlZCBjb2xsZWN0aW9ucy5cbi8vXG4vLyBTb21lIGRpZmZlcmVuY2VzIGZyb20gbm9ybWFsIGN1cnNvcnM6XG4vLyAgIC0gV2lsbCBuZXZlciBwcm9kdWNlIGFueXRoaW5nIG90aGVyIHRoYW4gJ2FkZGVkJyBvciAnYWRkZWRCZWZvcmUnLiBJZiB5b3Vcbi8vICAgICBkbyB1cGRhdGUgYSBkb2N1bWVudCB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gcHJvZHVjZWQsIHRoaXMgd2lsbCBub3Qgbm90aWNlXG4vLyAgICAgaXQuXG4vLyAgIC0gSWYgeW91IGRpc2Nvbm5lY3QgYW5kIHJlY29ubmVjdCBmcm9tIE1vbmdvLCBpdCB3aWxsIGVzc2VudGlhbGx5IHJlc3RhcnRcbi8vICAgICB0aGUgcXVlcnksIHdoaWNoIHdpbGwgbGVhZCB0byBkdXBsaWNhdGUgcmVzdWx0cy4gVGhpcyBpcyBwcmV0dHkgYmFkLFxuLy8gICAgIGJ1dCBpZiB5b3UgaW5jbHVkZSBhIGZpZWxkIGNhbGxlZCAndHMnIHdoaWNoIGlzIGluc2VydGVkIGFzXG4vLyAgICAgbmV3IE1vbmdvSW50ZXJuYWxzLk1vbmdvVGltZXN0YW1wKDAsIDApICh3aGljaCBpcyBpbml0aWFsaXplZCB0byB0aGVcbi8vICAgICBjdXJyZW50IE1vbmdvLXN0eWxlIHRpbWVzdGFtcCksIHdlJ2xsIGJlIGFibGUgdG8gZmluZCB0aGUgcGxhY2UgdG9cbi8vICAgICByZXN0YXJ0IHByb3Blcmx5LiAoVGhpcyBmaWVsZCBpcyBzcGVjaWZpY2FsbHkgdW5kZXJzdG9vZCBieSBNb25nbyB3aXRoIGFuXG4vLyAgICAgb3B0aW1pemF0aW9uIHdoaWNoIGFsbG93cyBpdCB0byBmaW5kIHRoZSByaWdodCBwbGFjZSB0byBzdGFydCB3aXRob3V0XG4vLyAgICAgYW4gaW5kZXggb24gdHMuIEl0J3MgaG93IHRoZSBvcGxvZyB3b3Jrcy4pXG4vLyAgIC0gTm8gY2FsbGJhY2tzIGFyZSB0cmlnZ2VyZWQgc3luY2hyb25vdXNseSB3aXRoIHRoZSBjYWxsICh0aGVyZSdzIG5vXG4vLyAgICAgZGlmZmVyZW50aWF0aW9uIGJldHdlZW4gXCJpbml0aWFsIGRhdGFcIiBhbmQgXCJsYXRlciBjaGFuZ2VzXCI7IGV2ZXJ5dGhpbmdcbi8vICAgICB0aGF0IG1hdGNoZXMgdGhlIHF1ZXJ5IGdldHMgc2VudCBhc3luY2hyb25vdXNseSkuXG4vLyAgIC0gRGUtZHVwbGljYXRpb24gaXMgbm90IGltcGxlbWVudGVkLlxuLy8gICAtIERvZXMgbm90IHlldCBpbnRlcmFjdCB3aXRoIHRoZSB3cml0ZSBmZW5jZS4gUHJvYmFibHksIHRoaXMgc2hvdWxkIHdvcmsgYnlcbi8vICAgICBpZ25vcmluZyByZW1vdmVzICh3aGljaCBkb24ndCB3b3JrIG9uIGNhcHBlZCBjb2xsZWN0aW9ucykgYW5kIHVwZGF0ZXNcbi8vICAgICAod2hpY2ggZG9uJ3QgYWZmZWN0IHRhaWxhYmxlIGN1cnNvcnMpLCBhbmQganVzdCBrZWVwaW5nIHRyYWNrIG9mIHRoZSBJRFxuLy8gICAgIG9mIHRoZSBpbnNlcnRlZCBvYmplY3QsIGFuZCBjbG9zaW5nIHRoZSB3cml0ZSBmZW5jZSBvbmNlIHlvdSBnZXQgdG8gdGhhdFxuLy8gICAgIElEIChvciB0aW1lc3RhbXA/KS4gIFRoaXMgZG9lc24ndCB3b3JrIHdlbGwgaWYgdGhlIGRvY3VtZW50IGRvZXNuJ3QgbWF0Y2hcbi8vICAgICB0aGUgcXVlcnksIHRob3VnaC4gIE9uIHRoZSBvdGhlciBoYW5kLCB0aGUgd3JpdGUgZmVuY2UgY2FuIGNsb3NlXG4vLyAgICAgaW1tZWRpYXRlbHkgaWYgaXQgZG9lcyBub3QgbWF0Y2ggdGhlIHF1ZXJ5LiBTbyBpZiB3ZSB0cnVzdCBtaW5pbW9uZ29cbi8vICAgICBlbm91Z2ggdG8gYWNjdXJhdGVseSBldmFsdWF0ZSB0aGUgcXVlcnkgYWdhaW5zdCB0aGUgd3JpdGUgZmVuY2UsIHdlXG4vLyAgICAgc2hvdWxkIGJlIGFibGUgdG8gZG8gdGhpcy4uLiAgT2YgY291cnNlLCBtaW5pbW9uZ28gZG9lc24ndCBldmVuIHN1cHBvcnRcbi8vICAgICBNb25nbyBUaW1lc3RhbXBzIHlldC5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX29ic2VydmVDaGFuZ2VzVGFpbGFibGUgPSBmdW5jdGlvbiAoXG4gIGN1cnNvckRlc2NyaXB0aW9uLCBvcmRlcmVkLCBjYWxsYmFja3MpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIC8vIFRhaWxhYmxlIGN1cnNvcnMgb25seSBldmVyIGNhbGwgYWRkZWQvYWRkZWRCZWZvcmUgY2FsbGJhY2tzLCBzbyBpdCdzIGFuXG4gIC8vIGVycm9yIGlmIHlvdSBkaWRuJ3QgcHJvdmlkZSB0aGVtLlxuICBpZiAoKG9yZGVyZWQgJiYgIWNhbGxiYWNrcy5hZGRlZEJlZm9yZSkgfHxcbiAgICAoIW9yZGVyZWQgJiYgIWNhbGxiYWNrcy5hZGRlZCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBvYnNlcnZlIGFuIFwiICsgKG9yZGVyZWQgPyBcIm9yZGVyZWRcIiA6IFwidW5vcmRlcmVkXCIpXG4gICAgICArIFwiIHRhaWxhYmxlIGN1cnNvciB3aXRob3V0IGEgXCJcbiAgICAgICsgKG9yZGVyZWQgPyBcImFkZGVkQmVmb3JlXCIgOiBcImFkZGVkXCIpICsgXCIgY2FsbGJhY2tcIik7XG4gIH1cblxuICByZXR1cm4gc2VsZi50YWlsKGN1cnNvckRlc2NyaXB0aW9uLCBmdW5jdGlvbiAoZG9jKSB7XG4gICAgdmFyIGlkID0gZG9jLl9pZDtcbiAgICBkZWxldGUgZG9jLl9pZDtcbiAgICAvLyBUaGUgdHMgaXMgYW4gaW1wbGVtZW50YXRpb24gZGV0YWlsLiBIaWRlIGl0LlxuICAgIGRlbGV0ZSBkb2MudHM7XG4gICAgaWYgKG9yZGVyZWQpIHtcbiAgICAgIGNhbGxiYWNrcy5hZGRlZEJlZm9yZShpZCwgZG9jLCBudWxsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FsbGJhY2tzLmFkZGVkKGlkLCBkb2MpO1xuICAgIH1cbiAgfSk7XG59O1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9jcmVhdGVBc3luY2hyb25vdXNDdXJzb3IgPSBmdW5jdGlvbihcbiAgY3Vyc29yRGVzY3JpcHRpb24sIG9wdGlvbnMgPSB7fSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGNvbnN0IHsgc2VsZkZvckl0ZXJhdGlvbiwgdXNlVHJhbnNmb3JtIH0gPSBvcHRpb25zO1xuICBvcHRpb25zID0geyBzZWxmRm9ySXRlcmF0aW9uLCB1c2VUcmFuc2Zvcm0gfTtcblxuICB2YXIgY29sbGVjdGlvbiA9IHNlbGYucmF3Q29sbGVjdGlvbihjdXJzb3JEZXNjcmlwdGlvbi5jb2xsZWN0aW9uTmFtZSk7XG4gIHZhciBjdXJzb3JPcHRpb25zID0gY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucztcbiAgdmFyIG1vbmdvT3B0aW9ucyA9IHtcbiAgICBzb3J0OiBjdXJzb3JPcHRpb25zLnNvcnQsXG4gICAgbGltaXQ6IGN1cnNvck9wdGlvbnMubGltaXQsXG4gICAgc2tpcDogY3Vyc29yT3B0aW9ucy5za2lwLFxuICAgIHByb2plY3Rpb246IGN1cnNvck9wdGlvbnMuZmllbGRzIHx8IGN1cnNvck9wdGlvbnMucHJvamVjdGlvbixcbiAgICByZWFkUHJlZmVyZW5jZTogY3Vyc29yT3B0aW9ucy5yZWFkUHJlZmVyZW5jZSxcbiAgfTtcblxuICAvLyBEbyB3ZSB3YW50IGEgdGFpbGFibGUgY3Vyc29yICh3aGljaCBvbmx5IHdvcmtzIG9uIGNhcHBlZCBjb2xsZWN0aW9ucyk/XG4gIGlmIChjdXJzb3JPcHRpb25zLnRhaWxhYmxlKSB7XG4gICAgbW9uZ29PcHRpb25zLm51bWJlck9mUmV0cmllcyA9IC0xO1xuICB9XG5cbiAgdmFyIGRiQ3Vyc29yID0gY29sbGVjdGlvbi5maW5kKFxuICAgIHJlcGxhY2VUeXBlcyhjdXJzb3JEZXNjcmlwdGlvbi5zZWxlY3RvciwgcmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28pLFxuICAgIG1vbmdvT3B0aW9ucyk7XG5cbiAgLy8gRG8gd2Ugd2FudCBhIHRhaWxhYmxlIGN1cnNvciAod2hpY2ggb25seSB3b3JrcyBvbiBjYXBwZWQgY29sbGVjdGlvbnMpP1xuICBpZiAoY3Vyc29yT3B0aW9ucy50YWlsYWJsZSkge1xuICAgIC8vIFdlIHdhbnQgYSB0YWlsYWJsZSBjdXJzb3IuLi5cbiAgICBkYkN1cnNvci5hZGRDdXJzb3JGbGFnKFwidGFpbGFibGVcIiwgdHJ1ZSlcbiAgICAvLyAuLi4gYW5kIGZvciB0aGUgc2VydmVyIHRvIHdhaXQgYSBiaXQgaWYgYW55IGdldE1vcmUgaGFzIG5vIGRhdGEgKHJhdGhlclxuICAgIC8vIHRoYW4gbWFraW5nIHVzIHB1dCB0aGUgcmVsZXZhbnQgc2xlZXBzIGluIHRoZSBjbGllbnQpLi4uXG4gICAgZGJDdXJzb3IuYWRkQ3Vyc29yRmxhZyhcImF3YWl0RGF0YVwiLCB0cnVlKVxuXG4gICAgLy8gQW5kIGlmIHRoaXMgaXMgb24gdGhlIG9wbG9nIGNvbGxlY3Rpb24gYW5kIHRoZSBjdXJzb3Igc3BlY2lmaWVzIGEgJ3RzJyxcbiAgICAvLyB0aGVuIHNldCB0aGUgdW5kb2N1bWVudGVkIG9wbG9nIHJlcGxheSBmbGFnLCB3aGljaCBkb2VzIGEgc3BlY2lhbCBzY2FuIHRvXG4gICAgLy8gZmluZCB0aGUgZmlyc3QgZG9jdW1lbnQgKGluc3RlYWQgb2YgY3JlYXRpbmcgYW4gaW5kZXggb24gdHMpLiBUaGlzIGlzIGFcbiAgICAvLyB2ZXJ5IGhhcmQtY29kZWQgTW9uZ28gZmxhZyB3aGljaCBvbmx5IHdvcmtzIG9uIHRoZSBvcGxvZyBjb2xsZWN0aW9uIGFuZFxuICAgIC8vIG9ubHkgd29ya3Mgd2l0aCB0aGUgdHMgZmllbGQuXG4gICAgaWYgKGN1cnNvckRlc2NyaXB0aW9uLmNvbGxlY3Rpb25OYW1lID09PSBPUExPR19DT0xMRUNUSU9OICYmXG4gICAgICBjdXJzb3JEZXNjcmlwdGlvbi5zZWxlY3Rvci50cykge1xuICAgICAgZGJDdXJzb3IuYWRkQ3Vyc29yRmxhZyhcIm9wbG9nUmVwbGF5XCIsIHRydWUpXG4gICAgfVxuICB9XG5cbiAgaWYgKHR5cGVvZiBjdXJzb3JPcHRpb25zLm1heFRpbWVNcyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBkYkN1cnNvciA9IGRiQ3Vyc29yLm1heFRpbWVNUyhjdXJzb3JPcHRpb25zLm1heFRpbWVNcyk7XG4gIH1cbiAgaWYgKHR5cGVvZiBjdXJzb3JPcHRpb25zLmhpbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgZGJDdXJzb3IgPSBkYkN1cnNvci5oaW50KGN1cnNvck9wdGlvbnMuaGludCk7XG4gIH1cblxuICByZXR1cm4gbmV3IEFzeW5jaHJvbm91c0N1cnNvcihkYkN1cnNvciwgY3Vyc29yRGVzY3JpcHRpb24sIG9wdGlvbnMsIGNvbGxlY3Rpb24pO1xufTtcblxuLy8gVGFpbHMgdGhlIGN1cnNvciBkZXNjcmliZWQgYnkgY3Vyc29yRGVzY3JpcHRpb24sIG1vc3QgbGlrZWx5IG9uIHRoZVxuLy8gb3Bsb2cuIENhbGxzIGRvY0NhbGxiYWNrIHdpdGggZWFjaCBkb2N1bWVudCBmb3VuZC4gSWdub3JlcyBlcnJvcnMgYW5kIGp1c3Rcbi8vIHJlc3RhcnRzIHRoZSB0YWlsIG9uIGVycm9yLlxuLy9cbi8vIElmIHRpbWVvdXRNUyBpcyBzZXQsIHRoZW4gaWYgd2UgZG9uJ3QgZ2V0IGEgbmV3IGRvY3VtZW50IGV2ZXJ5IHRpbWVvdXRNUyxcbi8vIGtpbGwgYW5kIHJlc3RhcnQgdGhlIGN1cnNvci4gVGhpcyBpcyBwcmltYXJpbHkgYSB3b3JrYXJvdW5kIGZvciAjODU5OC5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUudGFpbCA9IGZ1bmN0aW9uIChjdXJzb3JEZXNjcmlwdGlvbiwgZG9jQ2FsbGJhY2ssIHRpbWVvdXRNUykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICghY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy50YWlsYWJsZSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4gb25seSB0YWlsIGEgdGFpbGFibGUgY3Vyc29yXCIpO1xuXG4gIHZhciBjdXJzb3IgPSBzZWxmLl9jcmVhdGVBc3luY2hyb25vdXNDdXJzb3IoY3Vyc29yRGVzY3JpcHRpb24pO1xuXG4gIHZhciBzdG9wcGVkID0gZmFsc2U7XG4gIHZhciBsYXN0VFM7XG5cbiAgTWV0ZW9yLmRlZmVyKGFzeW5jIGZ1bmN0aW9uIGxvb3AoKSB7XG4gICAgdmFyIGRvYyA9IG51bGw7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGlmIChzdG9wcGVkKVxuICAgICAgICByZXR1cm47XG4gICAgICB0cnkge1xuICAgICAgICBkb2MgPSBhd2FpdCBjdXJzb3IuX25leHRPYmplY3RQcm9taXNlV2l0aFRpbWVvdXQodGltZW91dE1TKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAvLyBXZSBzaG91bGQgbm90IGlnbm9yZSBlcnJvcnMgaGVyZSB1bmxlc3Mgd2Ugd2FudCB0byBzcGVuZCBhIGxvdCBvZiB0aW1lIGRlYnVnZ2luZ1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgIC8vIFRoZXJlJ3Mgbm8gZ29vZCB3YXkgdG8gZmlndXJlIG91dCBpZiB0aGlzIHdhcyBhY3R1YWxseSBhbiBlcnJvciBmcm9tXG4gICAgICAgIC8vIE1vbmdvLCBvciBqdXN0IGNsaWVudC1zaWRlIChpbmNsdWRpbmcgb3VyIG93biB0aW1lb3V0IGVycm9yKS4gQWhcbiAgICAgICAgLy8gd2VsbC4gQnV0IGVpdGhlciB3YXksIHdlIG5lZWQgdG8gcmV0cnkgdGhlIGN1cnNvciAodW5sZXNzIHRoZSBmYWlsdXJlXG4gICAgICAgIC8vIHdhcyBiZWNhdXNlIHRoZSBvYnNlcnZlIGdvdCBzdG9wcGVkKS5cbiAgICAgICAgZG9jID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIC8vIFNpbmNlIHdlIGF3YWl0ZWQgYSBwcm9taXNlIGFib3ZlLCB3ZSBuZWVkIHRvIGNoZWNrIGFnYWluIHRvIHNlZSBpZlxuICAgICAgLy8gd2UndmUgYmVlbiBzdG9wcGVkIGJlZm9yZSBjYWxsaW5nIHRoZSBjYWxsYmFjay5cbiAgICAgIGlmIChzdG9wcGVkKVxuICAgICAgICByZXR1cm47XG4gICAgICBpZiAoZG9jKSB7XG4gICAgICAgIC8vIElmIGEgdGFpbGFibGUgY3Vyc29yIGNvbnRhaW5zIGEgXCJ0c1wiIGZpZWxkLCB1c2UgaXQgdG8gcmVjcmVhdGUgdGhlXG4gICAgICAgIC8vIGN1cnNvciBvbiBlcnJvci4gKFwidHNcIiBpcyBhIHN0YW5kYXJkIHRoYXQgTW9uZ28gdXNlcyBpbnRlcm5hbGx5IGZvclxuICAgICAgICAvLyB0aGUgb3Bsb2csIGFuZCB0aGVyZSdzIGEgc3BlY2lhbCBmbGFnIHRoYXQgbGV0cyB5b3UgZG8gYmluYXJ5IHNlYXJjaFxuICAgICAgICAvLyBvbiBpdCBpbnN0ZWFkIG9mIG5lZWRpbmcgdG8gdXNlIGFuIGluZGV4LilcbiAgICAgICAgbGFzdFRTID0gZG9jLnRzO1xuICAgICAgICBkb2NDYWxsYmFjayhkb2MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIG5ld1NlbGVjdG9yID0gT2JqZWN0LmFzc2lnbih7fSwgY3Vyc29yRGVzY3JpcHRpb24uc2VsZWN0b3IpO1xuICAgICAgICBpZiAobGFzdFRTKSB7XG4gICAgICAgICAgbmV3U2VsZWN0b3IudHMgPSB7JGd0OiBsYXN0VFN9O1xuICAgICAgICB9XG4gICAgICAgIGN1cnNvciA9IHNlbGYuX2NyZWF0ZUFzeW5jaHJvbm91c0N1cnNvcihuZXcgQ3Vyc29yRGVzY3JpcHRpb24oXG4gICAgICAgICAgY3Vyc29yRGVzY3JpcHRpb24uY29sbGVjdGlvbk5hbWUsXG4gICAgICAgICAgbmV3U2VsZWN0b3IsXG4gICAgICAgICAgY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucykpO1xuICAgICAgICAvLyBNb25nbyBmYWlsb3ZlciB0YWtlcyBtYW55IHNlY29uZHMuICBSZXRyeSBpbiBhIGJpdC4gIChXaXRob3V0IHRoaXNcbiAgICAgICAgLy8gc2V0VGltZW91dCwgd2UgcGVnIHRoZSBDUFUgYXQgMTAwJSBhbmQgbmV2ZXIgbm90aWNlIHRoZSBhY3R1YWxcbiAgICAgICAgLy8gZmFpbG92ZXIuXG4gICAgICAgIHNldFRpbWVvdXQobG9vcCwgMTAwKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4ge1xuICAgIHN0b3A6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHN0b3BwZWQgPSB0cnVlO1xuICAgICAgY3Vyc29yLmNsb3NlKCk7XG4gICAgfVxuICB9O1xufTtcblxuT2JqZWN0LmFzc2lnbihNb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLCB7XG4gIF9vYnNlcnZlQ2hhbmdlczogYXN5bmMgZnVuY3Rpb24gKFxuICAgIGN1cnNvckRlc2NyaXB0aW9uLCBvcmRlcmVkLCBjYWxsYmFja3MsIG5vbk11dGF0aW5nQ2FsbGJhY2tzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGNvbnN0IGNvbGxlY3Rpb25OYW1lID0gY3Vyc29yRGVzY3JpcHRpb24uY29sbGVjdGlvbk5hbWU7XG5cbiAgICBpZiAoY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy50YWlsYWJsZSkge1xuICAgICAgcmV0dXJuIHNlbGYuX29ic2VydmVDaGFuZ2VzVGFpbGFibGUoY3Vyc29yRGVzY3JpcHRpb24sIG9yZGVyZWQsIGNhbGxiYWNrcyk7XG4gICAgfVxuXG4gICAgLy8gWW91IG1heSBub3QgZmlsdGVyIG91dCBfaWQgd2hlbiBvYnNlcnZpbmcgY2hhbmdlcywgYmVjYXVzZSB0aGUgaWQgaXMgYSBjb3JlXG4gICAgLy8gcGFydCBvZiB0aGUgb2JzZXJ2ZUNoYW5nZXMgQVBJLlxuICAgIGNvbnN0IGZpZWxkc09wdGlvbnMgPSBjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnByb2plY3Rpb24gfHwgY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy5maWVsZHM7XG4gICAgaWYgKGZpZWxkc09wdGlvbnMgJiZcbiAgICAgIChmaWVsZHNPcHRpb25zLl9pZCA9PT0gMCB8fFxuICAgICAgICBmaWVsZHNPcHRpb25zLl9pZCA9PT0gZmFsc2UpKSB7XG4gICAgICB0aHJvdyBFcnJvcihcIllvdSBtYXkgbm90IG9ic2VydmUgYSBjdXJzb3Igd2l0aCB7ZmllbGRzOiB7X2lkOiAwfX1cIik7XG4gICAgfVxuXG4gICAgdmFyIG9ic2VydmVLZXkgPSBFSlNPTi5zdHJpbmdpZnkoXG4gICAgICBPYmplY3QuYXNzaWduKHtvcmRlcmVkOiBvcmRlcmVkfSwgY3Vyc29yRGVzY3JpcHRpb24pKTtcblxuICAgIHZhciBtdWx0aXBsZXhlciwgb2JzZXJ2ZURyaXZlcjtcbiAgICB2YXIgZmlyc3RIYW5kbGUgPSBmYWxzZTtcblxuICAgIC8vIEZpbmQgYSBtYXRjaGluZyBPYnNlcnZlTXVsdGlwbGV4ZXIsIG9yIGNyZWF0ZSBhIG5ldyBvbmUuIFRoaXMgbmV4dCBibG9jayBpc1xuICAgIC8vIGd1YXJhbnRlZWQgdG8gbm90IHlpZWxkIChhbmQgaXQgZG9lc24ndCBjYWxsIGFueXRoaW5nIHRoYXQgY2FuIG9ic2VydmUgYVxuICAgIC8vIG5ldyBxdWVyeSksIHNvIG5vIG90aGVyIGNhbGxzIHRvIHRoaXMgZnVuY3Rpb24gY2FuIGludGVybGVhdmUgd2l0aCBpdC5cbiAgICBpZiAob2JzZXJ2ZUtleSBpbiBzZWxmLl9vYnNlcnZlTXVsdGlwbGV4ZXJzKSB7XG4gICAgICBtdWx0aXBsZXhlciA9IHNlbGYuX29ic2VydmVNdWx0aXBsZXhlcnNbb2JzZXJ2ZUtleV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGZpcnN0SGFuZGxlID0gdHJ1ZTtcbiAgICAgIC8vIENyZWF0ZSBhIG5ldyBPYnNlcnZlTXVsdGlwbGV4ZXIuXG4gICAgICBtdWx0aXBsZXhlciA9IG5ldyBPYnNlcnZlTXVsdGlwbGV4ZXIoe1xuICAgICAgICBvcmRlcmVkOiBvcmRlcmVkLFxuICAgICAgICBvblN0b3A6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBkZWxldGUgc2VsZi5fb2JzZXJ2ZU11bHRpcGxleGVyc1tvYnNlcnZlS2V5XTtcbiAgICAgICAgICByZXR1cm4gb2JzZXJ2ZURyaXZlci5zdG9wKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHZhciBvYnNlcnZlSGFuZGxlID0gbmV3IE9ic2VydmVIYW5kbGUobXVsdGlwbGV4ZXIsXG4gICAgICBjYWxsYmFja3MsXG4gICAgICBub25NdXRhdGluZ0NhbGxiYWNrcyxcbiAgICApO1xuXG4gICAgY29uc3Qgb3Bsb2dPcHRpb25zID0gc2VsZj8uX29wbG9nSGFuZGxlPy5fb3Bsb2dPcHRpb25zIHx8IHt9O1xuICAgIGNvbnN0IHsgaW5jbHVkZUNvbGxlY3Rpb25zLCBleGNsdWRlQ29sbGVjdGlvbnMgfSA9IG9wbG9nT3B0aW9ucztcbiAgICBpZiAoZmlyc3RIYW5kbGUpIHtcblxuICAgICAgdmFyIG1hdGNoZXIsIHNvcnRlcjtcbiAgICAgIHZhciBjYW5Vc2VPcGxvZyA9IFtcbiAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIC8vIEF0IGEgYmFyZSBtaW5pbXVtLCB1c2luZyB0aGUgb3Bsb2cgcmVxdWlyZXMgdXMgdG8gaGF2ZSBhbiBvcGxvZywgdG9cbiAgICAgICAgICAvLyB3YW50IHVub3JkZXJlZCBjYWxsYmFja3MsIGFuZCB0byBub3Qgd2FudCBhIGNhbGxiYWNrIG9uIHRoZSBwb2xsc1xuICAgICAgICAgIC8vIHRoYXQgd29uJ3QgaGFwcGVuLlxuICAgICAgICAgIHJldHVybiBzZWxmLl9vcGxvZ0hhbmRsZSAmJiAhb3JkZXJlZCAmJlxuICAgICAgICAgICAgIWNhbGxiYWNrcy5fdGVzdE9ubHlQb2xsQ2FsbGJhY2s7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAvLyBXZSBhbHNvIG5lZWQgdG8gY2hlY2ssIGlmIHRoZSBjb2xsZWN0aW9uIG9mIHRoaXMgQ3Vyc29yIGlzIGFjdHVhbGx5IGJlaW5nIFwid2F0Y2hlZFwiIGJ5IHRoZSBPcGxvZyBoYW5kbGVcbiAgICAgICAgICAvLyBpZiBub3QsIHdlIGhhdmUgdG8gZmFsbGJhY2sgdG8gbG9uZyBwb2xsaW5nXG4gICAgICAgICAgaWYgKGV4Y2x1ZGVDb2xsZWN0aW9ucz8ubGVuZ3RoICYmIGV4Y2x1ZGVDb2xsZWN0aW9ucy5pbmNsdWRlcyhjb2xsZWN0aW9uTmFtZSkpIHtcbiAgICAgICAgICAgIGlmICghb3Bsb2dDb2xsZWN0aW9uV2FybmluZ3MuaW5jbHVkZXMoY29sbGVjdGlvbk5hbWUpKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUud2FybihgTWV0ZW9yLnNldHRpbmdzLnBhY2thZ2VzLm1vbmdvLm9wbG9nRXhjbHVkZUNvbGxlY3Rpb25zIGluY2x1ZGVzIHRoZSBjb2xsZWN0aW9uICR7Y29sbGVjdGlvbk5hbWV9IC0geW91ciBzdWJzY3JpcHRpb25zIHdpbGwgb25seSB1c2UgbG9uZyBwb2xsaW5nIWApO1xuICAgICAgICAgICAgICBvcGxvZ0NvbGxlY3Rpb25XYXJuaW5ncy5wdXNoKGNvbGxlY3Rpb25OYW1lKTsgLy8gd2Ugb25seSB3YW50IHRvIHNob3cgdGhlIHdhcm5pbmdzIG9uY2UgcGVyIGNvbGxlY3Rpb24hXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpbmNsdWRlQ29sbGVjdGlvbnM/Lmxlbmd0aCAmJiAhaW5jbHVkZUNvbGxlY3Rpb25zLmluY2x1ZGVzKGNvbGxlY3Rpb25OYW1lKSkge1xuICAgICAgICAgICAgaWYgKCFvcGxvZ0NvbGxlY3Rpb25XYXJuaW5ncy5pbmNsdWRlcyhjb2xsZWN0aW9uTmFtZSkpIHtcbiAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBNZXRlb3Iuc2V0dGluZ3MucGFja2FnZXMubW9uZ28ub3Bsb2dJbmNsdWRlQ29sbGVjdGlvbnMgZG9lcyBub3QgaW5jbHVkZSB0aGUgY29sbGVjdGlvbiAke2NvbGxlY3Rpb25OYW1lfSAtIHlvdXIgc3Vic2NyaXB0aW9ucyB3aWxsIG9ubHkgdXNlIGxvbmcgcG9sbGluZyFgKTtcbiAgICAgICAgICAgICAgb3Bsb2dDb2xsZWN0aW9uV2FybmluZ3MucHVzaChjb2xsZWN0aW9uTmFtZSk7IC8vIHdlIG9ubHkgd2FudCB0byBzaG93IHRoZSB3YXJuaW5ncyBvbmNlIHBlciBjb2xsZWN0aW9uIVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIC8vIFdlIG5lZWQgdG8gYmUgYWJsZSB0byBjb21waWxlIHRoZSBzZWxlY3Rvci4gRmFsbCBiYWNrIHRvIHBvbGxpbmcgZm9yXG4gICAgICAgICAgLy8gc29tZSBuZXdmYW5nbGVkICRzZWxlY3RvciB0aGF0IG1pbmltb25nbyBkb2Vzbid0IHN1cHBvcnQgeWV0LlxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBtYXRjaGVyID0gbmV3IE1pbmltb25nby5NYXRjaGVyKGN1cnNvckRlc2NyaXB0aW9uLnNlbGVjdG9yKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIC8vIFhYWCBtYWtlIGFsbCBjb21waWxhdGlvbiBlcnJvcnMgTWluaW1vbmdvRXJyb3Igb3Igc29tZXRoaW5nXG4gICAgICAgICAgICAvLyAgICAgc28gdGhhdCB0aGlzIGRvZXNuJ3QgaWdub3JlIHVucmVsYXRlZCBleGNlcHRpb25zXG4gICAgICAgICAgICBpZiAoTWV0ZW9yLmlzQ2xpZW50ICYmIGUgaW5zdGFuY2VvZiBNaW5pTW9uZ29RdWVyeUVycm9yKSB7XG4gICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgLy8gLi4uIGFuZCB0aGUgc2VsZWN0b3IgaXRzZWxmIG5lZWRzIHRvIHN1cHBvcnQgb3Bsb2cuXG4gICAgICAgICAgcmV0dXJuIE9wbG9nT2JzZXJ2ZURyaXZlci5jdXJzb3JTdXBwb3J0ZWQoY3Vyc29yRGVzY3JpcHRpb24sIG1hdGNoZXIpO1xuICAgICAgICB9LFxuICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgLy8gQW5kIHdlIG5lZWQgdG8gYmUgYWJsZSB0byBjb21waWxlIHRoZSBzb3J0LCBpZiBhbnkuICBlZywgY2FuJ3QgYmVcbiAgICAgICAgICAvLyB7JG5hdHVyYWw6IDF9LlxuICAgICAgICAgIGlmICghY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy5zb3J0KVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHNvcnRlciA9IG5ldyBNaW5pbW9uZ28uU29ydGVyKGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMuc29ydCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvLyBYWFggbWFrZSBhbGwgY29tcGlsYXRpb24gZXJyb3JzIE1pbmltb25nb0Vycm9yIG9yIHNvbWV0aGluZ1xuICAgICAgICAgICAgLy8gICAgIHNvIHRoYXQgdGhpcyBkb2Vzbid0IGlnbm9yZSB1bnJlbGF0ZWQgZXhjZXB0aW9uc1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgXS5ldmVyeShmID0+IGYoKSk7ICAvLyBpbnZva2UgZWFjaCBmdW5jdGlvbiBhbmQgY2hlY2sgaWYgYWxsIHJldHVybiB0cnVlXG5cbiAgICAgIHZhciBkcml2ZXJDbGFzcyA9IGNhblVzZU9wbG9nID8gT3Bsb2dPYnNlcnZlRHJpdmVyIDogUG9sbGluZ09ic2VydmVEcml2ZXI7XG4gICAgICBvYnNlcnZlRHJpdmVyID0gbmV3IGRyaXZlckNsYXNzKHtcbiAgICAgICAgY3Vyc29yRGVzY3JpcHRpb246IGN1cnNvckRlc2NyaXB0aW9uLFxuICAgICAgICBtb25nb0hhbmRsZTogc2VsZixcbiAgICAgICAgbXVsdGlwbGV4ZXI6IG11bHRpcGxleGVyLFxuICAgICAgICBvcmRlcmVkOiBvcmRlcmVkLFxuICAgICAgICBtYXRjaGVyOiBtYXRjaGVyLCAgLy8gaWdub3JlZCBieSBwb2xsaW5nXG4gICAgICAgIHNvcnRlcjogc29ydGVyLCAgLy8gaWdub3JlZCBieSBwb2xsaW5nXG4gICAgICAgIF90ZXN0T25seVBvbGxDYWxsYmFjazogY2FsbGJhY2tzLl90ZXN0T25seVBvbGxDYWxsYmFja1xuICAgICAgfSk7XG5cbiAgICAgIGlmIChvYnNlcnZlRHJpdmVyLl9pbml0KSB7XG4gICAgICAgIGF3YWl0IG9ic2VydmVEcml2ZXIuX2luaXQoKTtcbiAgICAgIH1cblxuICAgICAgLy8gVGhpcyBmaWVsZCBpcyBvbmx5IHNldCBmb3IgdXNlIGluIHRlc3RzLlxuICAgICAgbXVsdGlwbGV4ZXIuX29ic2VydmVEcml2ZXIgPSBvYnNlcnZlRHJpdmVyO1xuICAgIH1cbiAgICBzZWxmLl9vYnNlcnZlTXVsdGlwbGV4ZXJzW29ic2VydmVLZXldID0gbXVsdGlwbGV4ZXI7XG4gICAgLy8gQmxvY2tzIHVudGlsIHRoZSBpbml0aWFsIGFkZHMgaGF2ZSBiZWVuIHNlbnQuXG4gICAgYXdhaXQgbXVsdGlwbGV4ZXIuYWRkSGFuZGxlQW5kU2VuZEluaXRpYWxBZGRzKG9ic2VydmVIYW5kbGUpO1xuXG4gICAgcmV0dXJuIG9ic2VydmVIYW5kbGU7XG4gIH0sXG5cbn0pO1xuIiwiaW1wb3J0IGNsb25lIGZyb20gJ2xvZGFzaC5jbG9uZSdcblxuLyoqIEB0eXBlIHtpbXBvcnQoJ21vbmdvZGInKX0gKi9cbmV4cG9ydCBjb25zdCBNb25nb0RCID0gT2JqZWN0LmFzc2lnbihOcG1Nb2R1bGVNb25nb2RiLCB7XG4gIE9iamVjdElEOiBOcG1Nb2R1bGVNb25nb2RiLk9iamVjdElkLFxufSk7XG5cbi8vIFRoZSB3cml0ZSBtZXRob2RzIGJsb2NrIHVudGlsIHRoZSBkYXRhYmFzZSBoYXMgY29uZmlybWVkIHRoZSB3cml0ZSAoaXQgbWF5XG4vLyBub3QgYmUgcmVwbGljYXRlZCBvciBzdGFibGUgb24gZGlzaywgYnV0IG9uZSBzZXJ2ZXIgaGFzIGNvbmZpcm1lZCBpdCkgaWYgbm9cbi8vIGNhbGxiYWNrIGlzIHByb3ZpZGVkLiBJZiBhIGNhbGxiYWNrIGlzIHByb3ZpZGVkLCB0aGVuIHRoZXkgY2FsbCB0aGUgY2FsbGJhY2tcbi8vIHdoZW4gdGhlIHdyaXRlIGlzIGNvbmZpcm1lZC4gVGhleSByZXR1cm4gbm90aGluZyBvbiBzdWNjZXNzLCBhbmQgcmFpc2UgYW5cbi8vIGV4Y2VwdGlvbiBvbiBmYWlsdXJlLlxuLy9cbi8vIEFmdGVyIG1ha2luZyBhIHdyaXRlICh3aXRoIGluc2VydCwgdXBkYXRlLCByZW1vdmUpLCBvYnNlcnZlcnMgYXJlXG4vLyBub3RpZmllZCBhc3luY2hyb25vdXNseS4gSWYgeW91IHdhbnQgdG8gcmVjZWl2ZSBhIGNhbGxiYWNrIG9uY2UgYWxsXG4vLyBvZiB0aGUgb2JzZXJ2ZXIgbm90aWZpY2F0aW9ucyBoYXZlIGxhbmRlZCBmb3IgeW91ciB3cml0ZSwgZG8gdGhlXG4vLyB3cml0ZXMgaW5zaWRlIGEgd3JpdGUgZmVuY2UgKHNldCBERFBTZXJ2ZXIuX0N1cnJlbnRXcml0ZUZlbmNlIHRvIGEgbmV3XG4vLyBfV3JpdGVGZW5jZSwgYW5kIHRoZW4gc2V0IGEgY2FsbGJhY2sgb24gdGhlIHdyaXRlIGZlbmNlLilcbi8vXG4vLyBTaW5jZSBvdXIgZXhlY3V0aW9uIGVudmlyb25tZW50IGlzIHNpbmdsZS10aHJlYWRlZCwgdGhpcyBpc1xuLy8gd2VsbC1kZWZpbmVkIC0tIGEgd3JpdGUgXCJoYXMgYmVlbiBtYWRlXCIgaWYgaXQncyByZXR1cm5lZCwgYW5kIGFuXG4vLyBvYnNlcnZlciBcImhhcyBiZWVuIG5vdGlmaWVkXCIgaWYgaXRzIGNhbGxiYWNrIGhhcyByZXR1cm5lZC5cblxuZXhwb3J0IGNvbnN0IHdyaXRlQ2FsbGJhY2sgPSBmdW5jdGlvbiAod3JpdGUsIHJlZnJlc2gsIGNhbGxiYWNrKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoZXJyLCByZXN1bHQpIHtcbiAgICBpZiAoISBlcnIpIHtcbiAgICAgIC8vIFhYWCBXZSBkb24ndCBoYXZlIHRvIHJ1biB0aGlzIG9uIGVycm9yLCByaWdodD9cbiAgICAgIHRyeSB7XG4gICAgICAgIHJlZnJlc2goKTtcbiAgICAgIH0gY2F0Y2ggKHJlZnJlc2hFcnIpIHtcbiAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgY2FsbGJhY2socmVmcmVzaEVycik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IHJlZnJlc2hFcnI7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgd3JpdGUuY29tbWl0dGVkKCk7XG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFjayhlcnIsIHJlc3VsdCk7XG4gICAgfSBlbHNlIGlmIChlcnIpIHtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gIH07XG59O1xuXG5cbmV4cG9ydCBjb25zdCB0cmFuc2Zvcm1SZXN1bHQgPSBmdW5jdGlvbiAoZHJpdmVyUmVzdWx0KSB7XG4gIHZhciBtZXRlb3JSZXN1bHQgPSB7IG51bWJlckFmZmVjdGVkOiAwIH07XG4gIGlmIChkcml2ZXJSZXN1bHQpIHtcbiAgICB2YXIgbW9uZ29SZXN1bHQgPSBkcml2ZXJSZXN1bHQucmVzdWx0O1xuICAgIC8vIE9uIHVwZGF0ZXMgd2l0aCB1cHNlcnQ6dHJ1ZSwgdGhlIGluc2VydGVkIHZhbHVlcyBjb21lIGFzIGEgbGlzdCBvZlxuICAgIC8vIHVwc2VydGVkIHZhbHVlcyAtLSBldmVuIHdpdGggb3B0aW9ucy5tdWx0aSwgd2hlbiB0aGUgdXBzZXJ0IGRvZXMgaW5zZXJ0LFxuICAgIC8vIGl0IG9ubHkgaW5zZXJ0cyBvbmUgZWxlbWVudC5cbiAgICBpZiAobW9uZ29SZXN1bHQudXBzZXJ0ZWRDb3VudCkge1xuICAgICAgbWV0ZW9yUmVzdWx0Lm51bWJlckFmZmVjdGVkID0gbW9uZ29SZXN1bHQudXBzZXJ0ZWRDb3VudDtcblxuICAgICAgaWYgKG1vbmdvUmVzdWx0LnVwc2VydGVkSWQpIHtcbiAgICAgICAgbWV0ZW9yUmVzdWx0Lmluc2VydGVkSWQgPSBtb25nb1Jlc3VsdC51cHNlcnRlZElkO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBuIHdhcyB1c2VkIGJlZm9yZSBNb25nbyA1LjAsIGluIE1vbmdvIDUuMCB3ZSBhcmUgbm90IHJlY2VpdmluZyB0aGlzIG5cbiAgICAgIC8vIGZpZWxkIGFuZCBzbyB3ZSBhcmUgdXNpbmcgbW9kaWZpZWRDb3VudCBpbnN0ZWFkXG4gICAgICBtZXRlb3JSZXN1bHQubnVtYmVyQWZmZWN0ZWQgPSBtb25nb1Jlc3VsdC5uIHx8IG1vbmdvUmVzdWx0Lm1hdGNoZWRDb3VudCB8fCBtb25nb1Jlc3VsdC5tb2RpZmllZENvdW50O1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBtZXRlb3JSZXN1bHQ7XG59O1xuXG5leHBvcnQgY29uc3QgcmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28gPSBmdW5jdGlvbiAoZG9jdW1lbnQpIHtcbiAgaWYgKEVKU09OLmlzQmluYXJ5KGRvY3VtZW50KSkge1xuICAgIC8vIFRoaXMgZG9lcyBtb3JlIGNvcGllcyB0aGFuIHdlJ2QgbGlrZSwgYnV0IGlzIG5lY2Vzc2FyeSBiZWNhdXNlXG4gICAgLy8gTW9uZ29EQi5CU09OIG9ubHkgbG9va3MgbGlrZSBpdCB0YWtlcyBhIFVpbnQ4QXJyYXkgKGFuZCBkb2Vzbid0IGFjdHVhbGx5XG4gICAgLy8gc2VyaWFsaXplIGl0IGNvcnJlY3RseSkuXG4gICAgcmV0dXJuIG5ldyBNb25nb0RCLkJpbmFyeShCdWZmZXIuZnJvbShkb2N1bWVudCkpO1xuICB9XG4gIGlmIChkb2N1bWVudCBpbnN0YW5jZW9mIE1vbmdvREIuQmluYXJ5KSB7XG4gICAgcmV0dXJuIGRvY3VtZW50O1xuICB9XG4gIGlmIChkb2N1bWVudCBpbnN0YW5jZW9mIE1vbmdvLk9iamVjdElEKSB7XG4gICAgcmV0dXJuIG5ldyBNb25nb0RCLk9iamVjdElkKGRvY3VtZW50LnRvSGV4U3RyaW5nKCkpO1xuICB9XG4gIGlmIChkb2N1bWVudCBpbnN0YW5jZW9mIE1vbmdvREIuT2JqZWN0SWQpIHtcbiAgICByZXR1cm4gbmV3IE1vbmdvREIuT2JqZWN0SWQoZG9jdW1lbnQudG9IZXhTdHJpbmcoKSk7XG4gIH1cbiAgaWYgKGRvY3VtZW50IGluc3RhbmNlb2YgTW9uZ29EQi5UaW1lc3RhbXApIHtcbiAgICAvLyBGb3Igbm93LCB0aGUgTWV0ZW9yIHJlcHJlc2VudGF0aW9uIG9mIGEgTW9uZ28gdGltZXN0YW1wIHR5cGUgKG5vdCBhIGRhdGUhXG4gICAgLy8gdGhpcyBpcyBhIHdlaXJkIGludGVybmFsIHRoaW5nIHVzZWQgaW4gdGhlIG9wbG9nISkgaXMgdGhlIHNhbWUgYXMgdGhlXG4gICAgLy8gTW9uZ28gcmVwcmVzZW50YXRpb24uIFdlIG5lZWQgdG8gZG8gdGhpcyBleHBsaWNpdGx5IG9yIGVsc2Ugd2Ugd291bGQgZG8gYVxuICAgIC8vIHN0cnVjdHVyYWwgY2xvbmUgYW5kIGxvc2UgdGhlIHByb3RvdHlwZS5cbiAgICByZXR1cm4gZG9jdW1lbnQ7XG4gIH1cbiAgaWYgKGRvY3VtZW50IGluc3RhbmNlb2YgRGVjaW1hbCkge1xuICAgIHJldHVybiBNb25nb0RCLkRlY2ltYWwxMjguZnJvbVN0cmluZyhkb2N1bWVudC50b1N0cmluZygpKTtcbiAgfVxuICBpZiAoRUpTT04uX2lzQ3VzdG9tVHlwZShkb2N1bWVudCkpIHtcbiAgICByZXR1cm4gcmVwbGFjZU5hbWVzKG1ha2VNb25nb0xlZ2FsLCBFSlNPTi50b0pTT05WYWx1ZShkb2N1bWVudCkpO1xuICB9XG4gIC8vIEl0IGlzIG5vdCBvcmRpbmFyaWx5IHBvc3NpYmxlIHRvIHN0aWNrIGRvbGxhci1zaWduIGtleXMgaW50byBtb25nb1xuICAvLyBzbyB3ZSBkb24ndCBib3RoZXIgY2hlY2tpbmcgZm9yIHRoaW5ncyB0aGF0IG5lZWQgZXNjYXBpbmcgYXQgdGhpcyB0aW1lLlxuICByZXR1cm4gdW5kZWZpbmVkO1xufTtcblxuZXhwb3J0IGNvbnN0IHJlcGxhY2VUeXBlcyA9IGZ1bmN0aW9uIChkb2N1bWVudCwgYXRvbVRyYW5zZm9ybWVyKSB7XG4gIGlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICdvYmplY3QnIHx8IGRvY3VtZW50ID09PSBudWxsKVxuICAgIHJldHVybiBkb2N1bWVudDtcblxuICB2YXIgcmVwbGFjZWRUb3BMZXZlbEF0b20gPSBhdG9tVHJhbnNmb3JtZXIoZG9jdW1lbnQpO1xuICBpZiAocmVwbGFjZWRUb3BMZXZlbEF0b20gIT09IHVuZGVmaW5lZClcbiAgICByZXR1cm4gcmVwbGFjZWRUb3BMZXZlbEF0b207XG5cbiAgdmFyIHJldCA9IGRvY3VtZW50O1xuICBPYmplY3QuZW50cmllcyhkb2N1bWVudCkuZm9yRWFjaChmdW5jdGlvbiAoW2tleSwgdmFsXSkge1xuICAgIHZhciB2YWxSZXBsYWNlZCA9IHJlcGxhY2VUeXBlcyh2YWwsIGF0b21UcmFuc2Zvcm1lcik7XG4gICAgaWYgKHZhbCAhPT0gdmFsUmVwbGFjZWQpIHtcbiAgICAgIC8vIExhenkgY2xvbmUuIFNoYWxsb3cgY29weS5cbiAgICAgIGlmIChyZXQgPT09IGRvY3VtZW50KVxuICAgICAgICByZXQgPSBjbG9uZShkb2N1bWVudCk7XG4gICAgICByZXRba2V5XSA9IHZhbFJlcGxhY2VkO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5leHBvcnQgY29uc3QgcmVwbGFjZU1vbmdvQXRvbVdpdGhNZXRlb3IgPSBmdW5jdGlvbiAoZG9jdW1lbnQpIHtcbiAgaWYgKGRvY3VtZW50IGluc3RhbmNlb2YgTW9uZ29EQi5CaW5hcnkpIHtcbiAgICAvLyBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHlcbiAgICBpZiAoZG9jdW1lbnQuc3ViX3R5cGUgIT09IDApIHtcbiAgICAgIHJldHVybiBkb2N1bWVudDtcbiAgICB9XG4gICAgdmFyIGJ1ZmZlciA9IGRvY3VtZW50LnZhbHVlKHRydWUpO1xuICAgIHJldHVybiBuZXcgVWludDhBcnJheShidWZmZXIpO1xuICB9XG4gIGlmIChkb2N1bWVudCBpbnN0YW5jZW9mIE1vbmdvREIuT2JqZWN0SWQpIHtcbiAgICByZXR1cm4gbmV3IE1vbmdvLk9iamVjdElEKGRvY3VtZW50LnRvSGV4U3RyaW5nKCkpO1xuICB9XG4gIGlmIChkb2N1bWVudCBpbnN0YW5jZW9mIE1vbmdvREIuRGVjaW1hbDEyOCkge1xuICAgIHJldHVybiBEZWNpbWFsKGRvY3VtZW50LnRvU3RyaW5nKCkpO1xuICB9XG4gIGlmIChkb2N1bWVudFtcIkVKU09OJHR5cGVcIl0gJiYgZG9jdW1lbnRbXCJFSlNPTiR2YWx1ZVwiXSAmJiBPYmplY3Qua2V5cyhkb2N1bWVudCkubGVuZ3RoID09PSAyKSB7XG4gICAgcmV0dXJuIEVKU09OLmZyb21KU09OVmFsdWUocmVwbGFjZU5hbWVzKHVubWFrZU1vbmdvTGVnYWwsIGRvY3VtZW50KSk7XG4gIH1cbiAgaWYgKGRvY3VtZW50IGluc3RhbmNlb2YgTW9uZ29EQi5UaW1lc3RhbXApIHtcbiAgICAvLyBGb3Igbm93LCB0aGUgTWV0ZW9yIHJlcHJlc2VudGF0aW9uIG9mIGEgTW9uZ28gdGltZXN0YW1wIHR5cGUgKG5vdCBhIGRhdGUhXG4gICAgLy8gdGhpcyBpcyBhIHdlaXJkIGludGVybmFsIHRoaW5nIHVzZWQgaW4gdGhlIG9wbG9nISkgaXMgdGhlIHNhbWUgYXMgdGhlXG4gICAgLy8gTW9uZ28gcmVwcmVzZW50YXRpb24uIFdlIG5lZWQgdG8gZG8gdGhpcyBleHBsaWNpdGx5IG9yIGVsc2Ugd2Ugd291bGQgZG8gYVxuICAgIC8vIHN0cnVjdHVyYWwgY2xvbmUgYW5kIGxvc2UgdGhlIHByb3RvdHlwZS5cbiAgICByZXR1cm4gZG9jdW1lbnQ7XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn07XG5cbmNvbnN0IG1ha2VNb25nb0xlZ2FsID0gbmFtZSA9PiBcIkVKU09OXCIgKyBuYW1lO1xuY29uc3QgdW5tYWtlTW9uZ29MZWdhbCA9IG5hbWUgPT4gbmFtZS5zdWJzdHIoNSk7XG5cbmV4cG9ydCBmdW5jdGlvbiByZXBsYWNlTmFtZXMoZmlsdGVyLCB0aGluZykge1xuICBpZiAodHlwZW9mIHRoaW5nID09PSBcIm9iamVjdFwiICYmIHRoaW5nICE9PSBudWxsKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodGhpbmcpKSB7XG4gICAgICByZXR1cm4gdGhpbmcubWFwKHJlcGxhY2VOYW1lcy5iaW5kKG51bGwsIGZpbHRlcikpO1xuICAgIH1cbiAgICB2YXIgcmV0ID0ge307XG4gICAgT2JqZWN0LmVudHJpZXModGhpbmcpLmZvckVhY2goZnVuY3Rpb24gKFtrZXksIHZhbHVlXSkge1xuICAgICAgcmV0W2ZpbHRlcihrZXkpXSA9IHJlcGxhY2VOYW1lcyhmaWx0ZXIsIHZhbHVlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmV0O1xuICB9XG4gIHJldHVybiB0aGluZztcbn1cbiIsImltcG9ydCBMb2NhbENvbGxlY3Rpb24gZnJvbSAnbWV0ZW9yL21pbmltb25nby9sb2NhbF9jb2xsZWN0aW9uJztcbmltcG9ydCB7IHJlcGxhY2VNb25nb0F0b21XaXRoTWV0ZW9yLCByZXBsYWNlVHlwZXMgfSBmcm9tICcuL21vbmdvX2NvbW1vbic7XG5cbi8qKlxuICogVGhpcyBpcyBqdXN0IGEgbGlnaHQgd3JhcHBlciBmb3IgdGhlIGN1cnNvci4gVGhlIGdvYWwgaGVyZSBpcyB0byBlbnN1cmUgY29tcGF0aWJpbGl0eSBldmVuIGlmXG4gKiB0aGVyZSBhcmUgYnJlYWtpbmcgY2hhbmdlcyBvbiB0aGUgTW9uZ29EQiBkcml2ZXIuXG4gKlxuICogVGhpcyBpcyBhbiBpbnRlcm5hbCBpbXBsZW1lbnRhdGlvbiBkZXRhaWwgYW5kIGlzIGNyZWF0ZWQgbGF6aWx5IGJ5IHRoZSBtYWluIEN1cnNvciBjbGFzcy5cbiAqL1xuZXhwb3J0IGNsYXNzIEFzeW5jaHJvbm91c0N1cnNvciB7XG4gIF9jbG9zaW5nID0gZmFsc2U7XG4gIF9wZW5kaW5nTmV4dCA9IG51bGw7XG4gIGNvbnN0cnVjdG9yKGRiQ3Vyc29yLCBjdXJzb3JEZXNjcmlwdGlvbiwgb3B0aW9ucykge1xuICAgIHRoaXMuX2RiQ3Vyc29yID0gZGJDdXJzb3I7XG4gICAgdGhpcy5fY3Vyc29yRGVzY3JpcHRpb24gPSBjdXJzb3JEZXNjcmlwdGlvbjtcblxuICAgIHRoaXMuX3NlbGZGb3JJdGVyYXRpb24gPSBvcHRpb25zLnNlbGZGb3JJdGVyYXRpb24gfHwgdGhpcztcbiAgICBpZiAob3B0aW9ucy51c2VUcmFuc2Zvcm0gJiYgY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy50cmFuc2Zvcm0pIHtcbiAgICAgIHRoaXMuX3RyYW5zZm9ybSA9IExvY2FsQ29sbGVjdGlvbi53cmFwVHJhbnNmb3JtKFxuICAgICAgICBjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnRyYW5zZm9ybSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3RyYW5zZm9ybSA9IG51bGw7XG4gICAgfVxuXG4gICAgdGhpcy5fdmlzaXRlZElkcyA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuICB9XG5cbiAgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpIHtcbiAgICB2YXIgY3Vyc29yID0gdGhpcztcbiAgICByZXR1cm4ge1xuICAgICAgYXN5bmMgbmV4dCgpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBhd2FpdCBjdXJzb3IuX25leHRPYmplY3RQcm9taXNlKCk7XG4gICAgICAgIHJldHVybiB7IGRvbmU6ICF2YWx1ZSwgdmFsdWUgfTtcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIC8vIFJldHVybnMgYSBQcm9taXNlIGZvciB0aGUgbmV4dCBvYmplY3QgZnJvbSB0aGUgdW5kZXJseWluZyBjdXJzb3IgKGJlZm9yZVxuICAvLyB0aGUgTW9uZ28tPk1ldGVvciB0eXBlIHJlcGxhY2VtZW50KS5cbiAgYXN5bmMgX3Jhd05leHRPYmplY3RQcm9taXNlKCkge1xuICAgIGlmICh0aGlzLl9jbG9zaW5nKSB7XG4gICAgICAvLyBQcmV2ZW50IG5leHQoKSBhZnRlciBjbG9zZSBpcyBjYWxsZWRcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgdGhpcy5fcGVuZGluZ05leHQgPSB0aGlzLl9kYkN1cnNvci5uZXh0KCk7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLl9wZW5kaW5nTmV4dDtcbiAgICAgIHRoaXMuX3BlbmRpbmdOZXh0ID0gbnVsbDtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5fcGVuZGluZ05leHQgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8vIFJldHVybnMgYSBQcm9taXNlIGZvciB0aGUgbmV4dCBvYmplY3QgZnJvbSB0aGUgY3Vyc29yLCBza2lwcGluZyB0aG9zZSB3aG9zZVxuICAvLyBJRHMgd2UndmUgYWxyZWFkeSBzZWVuIGFuZCByZXBsYWNpbmcgTW9uZ28gYXRvbXMgd2l0aCBNZXRlb3IgYXRvbXMuXG4gIGFzeW5jIF9uZXh0T2JqZWN0UHJvbWlzZSAoKSB7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHZhciBkb2MgPSBhd2FpdCB0aGlzLl9yYXdOZXh0T2JqZWN0UHJvbWlzZSgpO1xuXG4gICAgICBpZiAoIWRvYykgcmV0dXJuIG51bGw7XG4gICAgICBkb2MgPSByZXBsYWNlVHlwZXMoZG9jLCByZXBsYWNlTW9uZ29BdG9tV2l0aE1ldGVvcik7XG5cbiAgICAgIGlmICghdGhpcy5fY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy50YWlsYWJsZSAmJiAnX2lkJyBpbiBkb2MpIHtcbiAgICAgICAgLy8gRGlkIE1vbmdvIGdpdmUgdXMgZHVwbGljYXRlIGRvY3VtZW50cyBpbiB0aGUgc2FtZSBjdXJzb3I/IElmIHNvLFxuICAgICAgICAvLyBpZ25vcmUgdGhpcyBvbmUuIChEbyB0aGlzIGJlZm9yZSB0aGUgdHJhbnNmb3JtLCBzaW5jZSB0cmFuc2Zvcm0gbWlnaHRcbiAgICAgICAgLy8gcmV0dXJuIHNvbWUgdW5yZWxhdGVkIHZhbHVlLikgV2UgZG9uJ3QgZG8gdGhpcyBmb3IgdGFpbGFibGUgY3Vyc29ycyxcbiAgICAgICAgLy8gYmVjYXVzZSB3ZSB3YW50IHRvIG1haW50YWluIE8oMSkgbWVtb3J5IHVzYWdlLiBBbmQgaWYgdGhlcmUgaXNuJ3QgX2lkXG4gICAgICAgIC8vIGZvciBzb21lIHJlYXNvbiAobWF5YmUgaXQncyB0aGUgb3Bsb2cpLCB0aGVuIHdlIGRvbid0IGRvIHRoaXMgZWl0aGVyLlxuICAgICAgICAvLyAoQmUgY2FyZWZ1bCB0byBkbyB0aGlzIGZvciBmYWxzZXkgYnV0IGV4aXN0aW5nIF9pZCwgdGhvdWdoLilcbiAgICAgICAgaWYgKHRoaXMuX3Zpc2l0ZWRJZHMuaGFzKGRvYy5faWQpKSBjb250aW51ZTtcbiAgICAgICAgdGhpcy5fdmlzaXRlZElkcy5zZXQoZG9jLl9pZCwgdHJ1ZSk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLl90cmFuc2Zvcm0pXG4gICAgICAgIGRvYyA9IHRoaXMuX3RyYW5zZm9ybShkb2MpO1xuXG4gICAgICByZXR1cm4gZG9jO1xuICAgIH1cbiAgfVxuXG4gIC8vIFJldHVybnMgYSBwcm9taXNlIHdoaWNoIGlzIHJlc29sdmVkIHdpdGggdGhlIG5leHQgb2JqZWN0IChsaWtlIHdpdGhcbiAgLy8gX25leHRPYmplY3RQcm9taXNlKSBvciByZWplY3RlZCBpZiB0aGUgY3Vyc29yIGRvZXNuJ3QgcmV0dXJuIHdpdGhpblxuICAvLyB0aW1lb3V0TVMgbXMuXG4gIF9uZXh0T2JqZWN0UHJvbWlzZVdpdGhUaW1lb3V0KHRpbWVvdXRNUykge1xuICAgIGNvbnN0IG5leHRPYmplY3RQcm9taXNlID0gdGhpcy5fbmV4dE9iamVjdFByb21pc2UoKTtcbiAgICBpZiAoIXRpbWVvdXRNUykge1xuICAgICAgcmV0dXJuIG5leHRPYmplY3RQcm9taXNlO1xuICAgIH1cblxuICAgIGNvbnN0IHRpbWVvdXRQcm9taXNlID0gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAvLyBPbiB0aW1lb3V0LCBjbG9zZSB0aGUgY3Vyc29yLlxuICAgICAgY29uc3QgdGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHJlc29sdmUodGhpcy5jbG9zZSgpKTtcbiAgICAgIH0sIHRpbWVvdXRNUyk7XG5cbiAgICAgIC8vIElmIHRoZSBgX25leHRPYmplY3RQcm9taXNlYCByZXR1cm5lZCBmaXJzdCwgY2FuY2VsIHRoZSB0aW1lb3V0LlxuICAgICAgbmV4dE9iamVjdFByb21pc2UuZmluYWxseSgoKSA9PiB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gUHJvbWlzZS5yYWNlKFtuZXh0T2JqZWN0UHJvbWlzZSwgdGltZW91dFByb21pc2VdKTtcbiAgfVxuXG4gIGFzeW5jIGZvckVhY2goY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAvLyBHZXQgYmFjayB0byB0aGUgYmVnaW5uaW5nLlxuICAgIHRoaXMuX3Jld2luZCgpO1xuXG4gICAgbGV0IGlkeCA9IDA7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGNvbnN0IGRvYyA9IGF3YWl0IHRoaXMuX25leHRPYmplY3RQcm9taXNlKCk7XG4gICAgICBpZiAoIWRvYykgcmV0dXJuO1xuICAgICAgYXdhaXQgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCBkb2MsIGlkeCsrLCB0aGlzLl9zZWxmRm9ySXRlcmF0aW9uKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBtYXAoY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICBjb25zdCByZXN1bHRzID0gW107XG4gICAgYXdhaXQgdGhpcy5mb3JFYWNoKGFzeW5jIChkb2MsIGluZGV4KSA9PiB7XG4gICAgICByZXN1bHRzLnB1c2goYXdhaXQgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCBkb2MsIGluZGV4LCB0aGlzLl9zZWxmRm9ySXRlcmF0aW9uKSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfVxuXG4gIF9yZXdpbmQoKSB7XG4gICAgLy8ga25vd24gdG8gYmUgc3luY2hyb25vdXNcbiAgICB0aGlzLl9kYkN1cnNvci5yZXdpbmQoKTtcblxuICAgIHRoaXMuX3Zpc2l0ZWRJZHMgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbiAgfVxuXG4gIC8vIE1vc3RseSB1c2FibGUgZm9yIHRhaWxhYmxlIGN1cnNvcnMuXG4gIGFzeW5jIGNsb3NlKCkge1xuICAgIHRoaXMuX2Nsb3NpbmcgPSB0cnVlO1xuICAgIC8vIElmIHRoZXJlJ3MgYSBwZW5kaW5nIG5leHQoKSwgd2FpdCBmb3IgaXQgdG8gZmluaXNoIG9yIGFib3J0XG4gICAgaWYgKHRoaXMuX3BlbmRpbmdOZXh0KSB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCB0aGlzLl9wZW5kaW5nTmV4dDtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gaWdub3JlXG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuX2RiQ3Vyc29yLmNsb3NlKCk7XG4gIH1cblxuICBmZXRjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAoZG9jID0+IGRvYyk7XG4gIH1cblxuICAvKipcbiAgICogRklYTUU6IChub2RlOjM0NjgwKSBbTU9OR09EQiBEUklWRVJdIFdhcm5pbmc6IGN1cnNvci5jb3VudCBpcyBkZXByZWNhdGVkIGFuZCB3aWxsIGJlXG4gICAqICByZW1vdmVkIGluIHRoZSBuZXh0IG1ham9yIHZlcnNpb24sIHBsZWFzZSB1c2UgYGNvbGxlY3Rpb24uZXN0aW1hdGVkRG9jdW1lbnRDb3VudGAgb3JcbiAgICogIGBjb2xsZWN0aW9uLmNvdW50RG9jdW1lbnRzYCBpbnN0ZWFkLlxuICAgKi9cbiAgY291bnQoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2RiQ3Vyc29yLmNvdW50KCk7XG4gIH1cblxuICAvLyBUaGlzIG1ldGhvZCBpcyBOT1Qgd3JhcHBlZCBpbiBDdXJzb3IuXG4gIGFzeW5jIGdldFJhd09iamVjdHMob3JkZXJlZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAob3JkZXJlZCkge1xuICAgICAgcmV0dXJuIHNlbGYuZmV0Y2goKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHJlc3VsdHMgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbiAgICAgIGF3YWl0IHNlbGYuZm9yRWFjaChmdW5jdGlvbiAoZG9jKSB7XG4gICAgICAgIHJlc3VsdHMuc2V0KGRvYy5faWQsIGRvYyk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHRzO1xuICAgIH1cbiAgfVxufSIsImltcG9ydCB7IEFTWU5DX0NVUlNPUl9NRVRIT0RTLCBnZXRBc3luY01ldGhvZE5hbWUgfSBmcm9tICdtZXRlb3IvbWluaW1vbmdvL2NvbnN0YW50cyc7XG5pbXBvcnQgeyByZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbywgcmVwbGFjZVR5cGVzIH0gZnJvbSAnLi9tb25nb19jb21tb24nO1xuaW1wb3J0IExvY2FsQ29sbGVjdGlvbiBmcm9tICdtZXRlb3IvbWluaW1vbmdvL2xvY2FsX2NvbGxlY3Rpb24nO1xuaW1wb3J0IHsgQ3Vyc29yRGVzY3JpcHRpb24gfSBmcm9tICcuL2N1cnNvcl9kZXNjcmlwdGlvbic7XG5pbXBvcnQgeyBPYnNlcnZlQ2FsbGJhY2tzLCBPYnNlcnZlQ2hhbmdlc0NhbGxiYWNrcyB9IGZyb20gJy4vdHlwZXMnO1xuXG5pbnRlcmZhY2UgTW9uZ29JbnRlcmZhY2Uge1xuICByYXdDb2xsZWN0aW9uOiAoY29sbGVjdGlvbk5hbWU6IHN0cmluZykgPT4gYW55O1xuICBfY3JlYXRlQXN5bmNocm9ub3VzQ3Vyc29yOiAoY3Vyc29yRGVzY3JpcHRpb246IEN1cnNvckRlc2NyaXB0aW9uLCBvcHRpb25zOiBDdXJzb3JPcHRpb25zKSA9PiBhbnk7XG4gIF9vYnNlcnZlQ2hhbmdlczogKGN1cnNvckRlc2NyaXB0aW9uOiBDdXJzb3JEZXNjcmlwdGlvbiwgb3JkZXJlZDogYm9vbGVhbiwgY2FsbGJhY2tzOiBhbnksIG5vbk11dGF0aW5nQ2FsbGJhY2tzPzogYm9vbGVhbikgPT4gYW55O1xufVxuXG5pbnRlcmZhY2UgQ3Vyc29yT3B0aW9ucyB7XG4gIHNlbGZGb3JJdGVyYXRpb246IEN1cnNvcjxhbnk+O1xuICB1c2VUcmFuc2Zvcm06IGJvb2xlYW47XG59XG5cbi8qKlxuICogQGNsYXNzIEN1cnNvclxuICpcbiAqIFRoZSBtYWluIGN1cnNvciBvYmplY3QgcmV0dXJuZWQgZnJvbSBmaW5kKCksIGltcGxlbWVudGluZyB0aGUgZG9jdW1lbnRlZFxuICogTW9uZ28uQ29sbGVjdGlvbiBjdXJzb3IgQVBJLlxuICpcbiAqIFdyYXBzIGEgQ3Vyc29yRGVzY3JpcHRpb24gYW5kIGxhemlseSBjcmVhdGVzIGFuIEFzeW5jaHJvbm91c0N1cnNvclxuICogKG9ubHkgY29udGFjdHMgTW9uZ29EQiB3aGVuIG1ldGhvZHMgbGlrZSBmZXRjaCBvciBmb3JFYWNoIGFyZSBjYWxsZWQpLlxuICovXG5leHBvcnQgY2xhc3MgQ3Vyc29yPFQsIFUgPSBUPiB7XG4gIHB1YmxpYyBfbW9uZ286IE1vbmdvSW50ZXJmYWNlO1xuICBwdWJsaWMgX2N1cnNvckRlc2NyaXB0aW9uOiBDdXJzb3JEZXNjcmlwdGlvbjtcbiAgcHVibGljIF9zeW5jaHJvbm91c0N1cnNvcjogYW55IHwgbnVsbDtcblxuICBjb25zdHJ1Y3Rvcihtb25nbzogTW9uZ29JbnRlcmZhY2UsIGN1cnNvckRlc2NyaXB0aW9uOiBDdXJzb3JEZXNjcmlwdGlvbikge1xuICAgIHRoaXMuX21vbmdvID0gbW9uZ287XG4gICAgdGhpcy5fY3Vyc29yRGVzY3JpcHRpb24gPSBjdXJzb3JEZXNjcmlwdGlvbjtcbiAgICB0aGlzLl9zeW5jaHJvbm91c0N1cnNvciA9IG51bGw7XG4gIH1cblxuICBhc3luYyBjb3VudEFzeW5jKCk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgY29sbGVjdGlvbiA9IHRoaXMuX21vbmdvLnJhd0NvbGxlY3Rpb24odGhpcy5fY3Vyc29yRGVzY3JpcHRpb24uY29sbGVjdGlvbk5hbWUpO1xuICAgIHJldHVybiBhd2FpdCBjb2xsZWN0aW9uLmNvdW50RG9jdW1lbnRzKFxuICAgICAgcmVwbGFjZVR5cGVzKHRoaXMuX2N1cnNvckRlc2NyaXB0aW9uLnNlbGVjdG9yLCByZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbyksXG4gICAgICByZXBsYWNlVHlwZXModGhpcy5fY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucywgcmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28pLFxuICAgICk7XG4gIH1cblxuICBjb3VudCgpOiBuZXZlciB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgXCJjb3VudCgpIGlzIG5vdCBhdmFpbGFibGUgb24gdGhlIHNlcnZlci4gUGxlYXNlIHVzZSBjb3VudEFzeW5jKCkgaW5zdGVhZC5cIlxuICAgICk7XG4gIH1cblxuICBnZXRUcmFuc2Zvcm0oKTogKChkb2M6IGFueSkgPT4gYW55KSB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMudHJhbnNmb3JtO1xuICB9XG5cbiAgX3B1Ymxpc2hDdXJzb3Ioc3ViOiBhbnkpOiBhbnkge1xuICAgIGNvbnN0IGNvbGxlY3Rpb24gPSB0aGlzLl9jdXJzb3JEZXNjcmlwdGlvbi5jb2xsZWN0aW9uTmFtZTtcbiAgICByZXR1cm4gTW9uZ28uQ29sbGVjdGlvbi5fcHVibGlzaEN1cnNvcih0aGlzLCBzdWIsIGNvbGxlY3Rpb24pO1xuICB9XG5cbiAgX2dldENvbGxlY3Rpb25OYW1lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX2N1cnNvckRlc2NyaXB0aW9uLmNvbGxlY3Rpb25OYW1lO1xuICB9XG5cbiAgb2JzZXJ2ZShjYWxsYmFja3M6IE9ic2VydmVDYWxsYmFja3M8VT4pOiBhbnkge1xuICAgIHJldHVybiBMb2NhbENvbGxlY3Rpb24uX29ic2VydmVGcm9tT2JzZXJ2ZUNoYW5nZXModGhpcywgY2FsbGJhY2tzKTtcbiAgfVxuXG4gIGFzeW5jIG9ic2VydmVBc3luYyhjYWxsYmFja3M6IE9ic2VydmVDYWxsYmFja3M8VT4pOiBQcm9taXNlPGFueT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHJlc29sdmUodGhpcy5vYnNlcnZlKGNhbGxiYWNrcykpKTtcbiAgfVxuXG4gIG9ic2VydmVDaGFuZ2VzKGNhbGxiYWNrczogT2JzZXJ2ZUNoYW5nZXNDYWxsYmFja3M8VT4sIG9wdGlvbnM6IHsgbm9uTXV0YXRpbmdDYWxsYmFja3M/OiBib29sZWFuIH0gPSB7fSk6IGFueSB7XG4gICAgY29uc3Qgb3JkZXJlZCA9IExvY2FsQ29sbGVjdGlvbi5fb2JzZXJ2ZUNoYW5nZXNDYWxsYmFja3NBcmVPcmRlcmVkKGNhbGxiYWNrcyk7XG4gICAgcmV0dXJuIHRoaXMuX21vbmdvLl9vYnNlcnZlQ2hhbmdlcyhcbiAgICAgIHRoaXMuX2N1cnNvckRlc2NyaXB0aW9uLFxuICAgICAgb3JkZXJlZCxcbiAgICAgIGNhbGxiYWNrcyxcbiAgICAgIG9wdGlvbnMubm9uTXV0YXRpbmdDYWxsYmFja3NcbiAgICApO1xuICB9XG5cbiAgYXN5bmMgb2JzZXJ2ZUNoYW5nZXNBc3luYyhjYWxsYmFja3M6IE9ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzPFU+LCBvcHRpb25zOiB7IG5vbk11dGF0aW5nQ2FsbGJhY2tzPzogYm9vbGVhbiB9ID0ge30pOiBQcm9taXNlPGFueT4ge1xuICAgIHJldHVybiB0aGlzLm9ic2VydmVDaGFuZ2VzKGNhbGxiYWNrcywgb3B0aW9ucyk7XG4gIH1cbn1cblxuLy8gQWRkIGN1cnNvciBtZXRob2RzIGR5bmFtaWNhbGx5XG5bLi4uQVNZTkNfQ1VSU09SX01FVEhPRFMsIFN5bWJvbC5pdGVyYXRvciwgU3ltYm9sLmFzeW5jSXRlcmF0b3JdLmZvckVhY2gobWV0aG9kTmFtZSA9PiB7XG4gIGlmIChtZXRob2ROYW1lID09PSAnY291bnQnKSByZXR1cm47XG5cbiAgKEN1cnNvci5wcm90b3R5cGUgYXMgYW55KVttZXRob2ROYW1lXSA9IGZ1bmN0aW9uKHRoaXM6IEN1cnNvcjxhbnk+LCAuLi5hcmdzOiBhbnlbXSk6IGFueSB7XG4gICAgY29uc3QgY3Vyc29yID0gc2V0dXBBc3luY2hyb25vdXNDdXJzb3IodGhpcywgbWV0aG9kTmFtZSk7XG4gICAgcmV0dXJuIGN1cnNvclttZXRob2ROYW1lXSguLi5hcmdzKTtcbiAgfTtcblxuICBpZiAobWV0aG9kTmFtZSA9PT0gU3ltYm9sLml0ZXJhdG9yIHx8IG1ldGhvZE5hbWUgPT09IFN5bWJvbC5hc3luY0l0ZXJhdG9yKSByZXR1cm47XG5cbiAgY29uc3QgbWV0aG9kTmFtZUFzeW5jID0gZ2V0QXN5bmNNZXRob2ROYW1lKG1ldGhvZE5hbWUpO1xuXG4gIChDdXJzb3IucHJvdG90eXBlIGFzIGFueSlbbWV0aG9kTmFtZUFzeW5jXSA9IGZ1bmN0aW9uKHRoaXM6IEN1cnNvcjxhbnk+LCAuLi5hcmdzOiBhbnlbXSk6IFByb21pc2U8YW55PiB7XG4gICAgcmV0dXJuIHRoaXNbbWV0aG9kTmFtZV0oLi4uYXJncyk7XG4gIH07XG59KTtcblxuZnVuY3Rpb24gc2V0dXBBc3luY2hyb25vdXNDdXJzb3IoY3Vyc29yOiBDdXJzb3I8YW55PiwgbWV0aG9kOiBzdHJpbmcgfCBzeW1ib2wpOiBhbnkge1xuICBpZiAoY3Vyc29yLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnRhaWxhYmxlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgY2FsbCAke1N0cmluZyhtZXRob2QpfSBvbiBhIHRhaWxhYmxlIGN1cnNvcmApO1xuICB9XG5cbiAgaWYgKCFjdXJzb3IuX3N5bmNocm9ub3VzQ3Vyc29yKSB7XG4gICAgY3Vyc29yLl9zeW5jaHJvbm91c0N1cnNvciA9IGN1cnNvci5fbW9uZ28uX2NyZWF0ZUFzeW5jaHJvbm91c0N1cnNvcihcbiAgICAgIGN1cnNvci5fY3Vyc29yRGVzY3JpcHRpb24sXG4gICAgICB7XG4gICAgICAgIHNlbGZGb3JJdGVyYXRpb246IGN1cnNvcixcbiAgICAgICAgdXNlVHJhbnNmb3JtOiB0cnVlLFxuICAgICAgfVxuICAgICk7XG4gIH1cblxuICByZXR1cm4gY3Vyc29yLl9zeW5jaHJvbm91c0N1cnNvcjtcbn0iLCIvLyBzaW5nbGV0b25cbmV4cG9ydCBjb25zdCBMb2NhbENvbGxlY3Rpb25Ecml2ZXIgPSBuZXcgKGNsYXNzIExvY2FsQ29sbGVjdGlvbkRyaXZlciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMubm9Db25uQ29sbGVjdGlvbnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICB9XG5cbiAgb3BlbihuYW1lLCBjb25uKSB7XG4gICAgaWYgKCEgbmFtZSkge1xuICAgICAgcmV0dXJuIG5ldyBMb2NhbENvbGxlY3Rpb247XG4gICAgfVxuXG4gICAgaWYgKCEgY29ubikge1xuICAgICAgcmV0dXJuIGVuc3VyZUNvbGxlY3Rpb24obmFtZSwgdGhpcy5ub0Nvbm5Db2xsZWN0aW9ucyk7XG4gICAgfVxuXG4gICAgaWYgKCEgY29ubi5fbW9uZ29fbGl2ZWRhdGFfY29sbGVjdGlvbnMpIHtcbiAgICAgIGNvbm4uX21vbmdvX2xpdmVkYXRhX2NvbGxlY3Rpb25zID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICB9XG5cbiAgICAvLyBYWFggaXMgdGhlcmUgYSB3YXkgdG8ga2VlcCB0cmFjayBvZiBhIGNvbm5lY3Rpb24ncyBjb2xsZWN0aW9ucyB3aXRob3V0XG4gICAgLy8gZGFuZ2xpbmcgaXQgb2ZmIHRoZSBjb25uZWN0aW9uIG9iamVjdD9cbiAgICByZXR1cm4gZW5zdXJlQ29sbGVjdGlvbihuYW1lLCBjb25uLl9tb25nb19saXZlZGF0YV9jb2xsZWN0aW9ucyk7XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBlbnN1cmVDb2xsZWN0aW9uKG5hbWUsIGNvbGxlY3Rpb25zKSB7XG4gIHJldHVybiAobmFtZSBpbiBjb2xsZWN0aW9ucylcbiAgICA/IGNvbGxlY3Rpb25zW25hbWVdXG4gICAgOiBjb2xsZWN0aW9uc1tuYW1lXSA9IG5ldyBMb2NhbENvbGxlY3Rpb24obmFtZSk7XG59XG4iLCJpbXBvcnQgb25jZSBmcm9tICdsb2Rhc2gub25jZSc7XG5pbXBvcnQge1xuICBBU1lOQ19DT0xMRUNUSU9OX01FVEhPRFMsXG4gIGdldEFzeW5jTWV0aG9kTmFtZSxcbiAgQ0xJRU5UX09OTFlfTUVUSE9EU1xufSBmcm9tIFwibWV0ZW9yL21pbmltb25nby9jb25zdGFudHNcIjtcbmltcG9ydCB7IE1vbmdvQ29ubmVjdGlvbiB9IGZyb20gJy4vbW9uZ29fY29ubmVjdGlvbic7XG5cbi8vIERlZmluZSBpbnRlcmZhY2VzIGFuZCB0eXBlc1xuaW50ZXJmYWNlIElDb25uZWN0aW9uT3B0aW9ucyB7XG4gIG9wbG9nVXJsPzogc3RyaW5nO1xuICBba2V5OiBzdHJpbmddOiB1bmtub3duOyAgLy8gQ2hhbmdlZCBmcm9tICdhbnknIHRvICd1bmtub3duJyBmb3IgYmV0dGVyIHR5cGUgc2FmZXR5XG59XG5cbmludGVyZmFjZSBJTW9uZ29JbnRlcm5hbHMge1xuICBSZW1vdGVDb2xsZWN0aW9uRHJpdmVyOiB0eXBlb2YgUmVtb3RlQ29sbGVjdGlvbkRyaXZlcjtcbiAgZGVmYXVsdFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXI6ICgpID0+IFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXI7XG59XG5cbi8vIE1vcmUgc3BlY2lmaWMgdHlwaW5nIGZvciBjb2xsZWN0aW9uIG1ldGhvZHNcbnR5cGUgTW9uZ29NZXRob2RGdW5jdGlvbiA9ICguLi5hcmdzOiB1bmtub3duW10pID0+IHVua25vd247XG5pbnRlcmZhY2UgSUNvbGxlY3Rpb25NZXRob2RzIHtcbiAgW2tleTogc3RyaW5nXTogTW9uZ29NZXRob2RGdW5jdGlvbjtcbn1cblxuLy8gVHlwZSBmb3IgTW9uZ29Db25uZWN0aW9uXG5pbnRlcmZhY2UgSU1vbmdvQ2xpZW50IHtcbiAgY29ubmVjdDogKCkgPT4gUHJvbWlzZTx2b2lkPjtcbn1cblxuaW50ZXJmYWNlIElNb25nb0Nvbm5lY3Rpb24ge1xuICBjbGllbnQ6IElNb25nb0NsaWVudDtcbiAgW2tleTogc3RyaW5nXTogTW9uZ29NZXRob2RGdW5jdGlvbiB8IElNb25nb0NsaWVudDtcbn1cblxuZGVjbGFyZSBnbG9iYWwge1xuICBuYW1lc3BhY2UgTm9kZUpTIHtcbiAgICBpbnRlcmZhY2UgUHJvY2Vzc0VudiB7XG4gICAgICBNT05HT19VUkw6IHN0cmluZztcbiAgICAgIE1PTkdPX09QTE9HX1VSTD86IHN0cmluZztcbiAgICB9XG4gIH1cblxuICBjb25zdCBNb25nb0ludGVybmFsczogSU1vbmdvSW50ZXJuYWxzO1xuICBjb25zdCBNZXRlb3I6IHtcbiAgICBzdGFydHVwOiAoY2FsbGJhY2s6ICgpID0+IFByb21pc2U8dm9pZD4pID0+IHZvaWQ7XG4gIH07XG59XG5cbmNsYXNzIFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIge1xuICBwcml2YXRlIHJlYWRvbmx5IG1vbmdvOiBNb25nb0Nvbm5lY3Rpb247XG5cbiAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgUkVNT1RFX0NPTExFQ1RJT05fTUVUSE9EUyA9IFtcbiAgICAnY3JlYXRlQ2FwcGVkQ29sbGVjdGlvbkFzeW5jJyxcbiAgICAnZHJvcEluZGV4QXN5bmMnLFxuICAgICdlbnN1cmVJbmRleEFzeW5jJyxcbiAgICAnY3JlYXRlSW5kZXhBc3luYycsXG4gICAgJ2NvdW50RG9jdW1lbnRzJyxcbiAgICAnZHJvcENvbGxlY3Rpb25Bc3luYycsXG4gICAgJ2VzdGltYXRlZERvY3VtZW50Q291bnQnLFxuICAgICdmaW5kJyxcbiAgICAnZmluZE9uZUFzeW5jJyxcbiAgICAnaW5zZXJ0QXN5bmMnLFxuICAgICdyYXdDb2xsZWN0aW9uJyxcbiAgICAncmVtb3ZlQXN5bmMnLFxuICAgICd1cGRhdGVBc3luYycsXG4gICAgJ3Vwc2VydEFzeW5jJyxcbiAgXSBhcyBjb25zdDtcblxuICBjb25zdHJ1Y3Rvcihtb25nb1VybDogc3RyaW5nLCBvcHRpb25zOiBJQ29ubmVjdGlvbk9wdGlvbnMpIHtcbiAgICB0aGlzLm1vbmdvID0gbmV3IE1vbmdvQ29ubmVjdGlvbihtb25nb1VybCwgb3B0aW9ucyk7XG4gIH1cblxuICBwdWJsaWMgb3BlbihuYW1lOiBzdHJpbmcpOiBJQ29sbGVjdGlvbk1ldGhvZHMge1xuICAgIGNvbnN0IHJldDogSUNvbGxlY3Rpb25NZXRob2RzID0ge307XG5cbiAgICAvLyBIYW5kbGUgcmVtb3RlIGNvbGxlY3Rpb24gbWV0aG9kc1xuICAgIFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIuUkVNT1RFX0NPTExFQ1RJT05fTUVUSE9EUy5mb3JFYWNoKChtZXRob2QpID0+IHtcbiAgICAgIC8vIFR5cGUgYXNzZXJ0aW9uIG5lZWRlZCBiZWNhdXNlIHdlIGtub3cgdGhlc2UgbWV0aG9kcyBleGlzdCBvbiBNb25nb0Nvbm5lY3Rpb25cbiAgICAgIGNvbnN0IG1vbmdvTWV0aG9kID0gdGhpcy5tb25nb1ttZXRob2RdIGFzIE1vbmdvTWV0aG9kRnVuY3Rpb247XG4gICAgICByZXRbbWV0aG9kXSA9IG1vbmdvTWV0aG9kLmJpbmQodGhpcy5tb25nbywgbmFtZSk7XG5cbiAgICAgIGlmICghQVNZTkNfQ09MTEVDVElPTl9NRVRIT0RTLmluY2x1ZGVzKG1ldGhvZCkpIHJldHVybjtcblxuICAgICAgY29uc3QgYXN5bmNNZXRob2ROYW1lID0gZ2V0QXN5bmNNZXRob2ROYW1lKG1ldGhvZCk7XG4gICAgICByZXRbYXN5bmNNZXRob2ROYW1lXSA9ICguLi5hcmdzOiB1bmtub3duW10pID0+IHJldFttZXRob2RdKC4uLmFyZ3MpO1xuICAgIH0pO1xuXG4gICAgLy8gSGFuZGxlIGNsaWVudC1vbmx5IG1ldGhvZHNcbiAgICBDTElFTlRfT05MWV9NRVRIT0RTLmZvckVhY2goKG1ldGhvZCkgPT4ge1xuICAgICAgcmV0W21ldGhvZF0gPSAoLi4uYXJnczogdW5rbm93bltdKTogbmV2ZXIgPT4ge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYCR7bWV0aG9kfSBpcyBub3QgYXZhaWxhYmxlIG9uIHRoZSBzZXJ2ZXIuIFBsZWFzZSB1c2UgJHtnZXRBc3luY01ldGhvZE5hbWUoXG4gICAgICAgICAgICBtZXRob2RcbiAgICAgICAgICApfSgpIGluc3RlYWQuYFxuICAgICAgICApO1xuICAgICAgfTtcbiAgICB9KTtcblxuICAgIHJldHVybiByZXQ7XG4gIH1cbn1cblxuLy8gQXNzaWduIHRoZSBjbGFzcyB0byBNb25nb0ludGVybmFsc1xuTW9uZ29JbnRlcm5hbHMuUmVtb3RlQ29sbGVjdGlvbkRyaXZlciA9IFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXI7XG5cbi8vIENyZWF0ZSB0aGUgc2luZ2xldG9uIFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIgb25seSBvbiBkZW1hbmRcbk1vbmdvSW50ZXJuYWxzLmRlZmF1bHRSZW1vdGVDb2xsZWN0aW9uRHJpdmVyID0gb25jZSgoKTogUmVtb3RlQ29sbGVjdGlvbkRyaXZlciA9PiB7XG4gIGNvbnN0IGNvbm5lY3Rpb25PcHRpb25zOiBJQ29ubmVjdGlvbk9wdGlvbnMgPSB7fTtcbiAgY29uc3QgbW9uZ29VcmwgPSBwcm9jZXNzLmVudi5NT05HT19VUkw7XG5cbiAgaWYgKCFtb25nb1VybCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk1PTkdPX1VSTCBtdXN0IGJlIHNldCBpbiBlbnZpcm9ubWVudFwiKTtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLmVudi5NT05HT19PUExPR19VUkwpIHtcbiAgICBjb25uZWN0aW9uT3B0aW9ucy5vcGxvZ1VybCA9IHByb2Nlc3MuZW52Lk1PTkdPX09QTE9HX1VSTDtcbiAgfVxuXG4gIGNvbnN0IGRyaXZlciA9IG5ldyBSZW1vdGVDb2xsZWN0aW9uRHJpdmVyKG1vbmdvVXJsLCBjb25uZWN0aW9uT3B0aW9ucyk7XG5cbiAgLy8gSW5pdGlhbGl6ZSBkYXRhYmFzZSBjb25uZWN0aW9uIG9uIHN0YXJ0dXBcbiAgTWV0ZW9yLnN0YXJ0dXAoYXN5bmMgKCk6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgIGF3YWl0IGRyaXZlci5tb25nby5jbGllbnQuY29ubmVjdCgpO1xuICB9KTtcblxuICByZXR1cm4gZHJpdmVyO1xufSk7XG5cbmV4cG9ydCB7IFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIsIElDb25uZWN0aW9uT3B0aW9ucywgSUNvbGxlY3Rpb25NZXRob2RzIH07IiwiaW1wb3J0IHsgbm9ybWFsaXplUHJvamVjdGlvbiB9IGZyb20gXCIuLi9tb25nb191dGlsc1wiO1xuaW1wb3J0IHsgQXN5bmNNZXRob2RzIH0gZnJvbSAnLi9tZXRob2RzX2FzeW5jJztcbmltcG9ydCB7IFN5bmNNZXRob2RzIH0gZnJvbSAnLi9tZXRob2RzX3N5bmMnO1xuaW1wb3J0IHsgSW5kZXhNZXRob2RzIH0gZnJvbSAnLi9tZXRob2RzX2luZGV4JztcbmltcG9ydCB7XG4gIElEX0dFTkVSQVRPUlMsXG4gIG5vcm1hbGl6ZU9wdGlvbnMsXG4gIHNldHVwQXV0b3B1Ymxpc2gsXG4gIHNldHVwQ29ubmVjdGlvbixcbiAgc2V0dXBEcml2ZXIsXG4gIHNldHVwTXV0YXRpb25NZXRob2RzLFxuICB2YWxpZGF0ZUNvbGxlY3Rpb25OYW1lXG59IGZyb20gJy4vY29sbGVjdGlvbl91dGlscyc7XG5pbXBvcnQgeyBSZXBsaWNhdGlvbk1ldGhvZHMgfSBmcm9tICcuL21ldGhvZHNfcmVwbGljYXRpb24nO1xuXG4vKipcbiAqIEBzdW1tYXJ5IE5hbWVzcGFjZSBmb3IgTW9uZ29EQi1yZWxhdGVkIGl0ZW1zXG4gKiBAbmFtZXNwYWNlXG4gKi9cbk1vbmdvID0ge307XG5cbi8qKlxuICogQHN1bW1hcnkgQ29uc3RydWN0b3IgZm9yIGEgQ29sbGVjdGlvblxuICogQGxvY3VzIEFueXdoZXJlXG4gKiBAaW5zdGFuY2VuYW1lIGNvbGxlY3Rpb25cbiAqIEBjbGFzc1xuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIGNvbGxlY3Rpb24uICBJZiBudWxsLCBjcmVhdGVzIGFuIHVubWFuYWdlZCAodW5zeW5jaHJvbml6ZWQpIGxvY2FsIGNvbGxlY3Rpb24uXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucy5jb25uZWN0aW9uIFRoZSBzZXJ2ZXIgY29ubmVjdGlvbiB0aGF0IHdpbGwgbWFuYWdlIHRoaXMgY29sbGVjdGlvbi4gVXNlcyB0aGUgZGVmYXVsdCBjb25uZWN0aW9uIGlmIG5vdCBzcGVjaWZpZWQuICBQYXNzIHRoZSByZXR1cm4gdmFsdWUgb2YgY2FsbGluZyBbYEREUC5jb25uZWN0YF0oI0REUC1jb25uZWN0KSB0byBzcGVjaWZ5IGEgZGlmZmVyZW50IHNlcnZlci4gUGFzcyBgbnVsbGAgdG8gc3BlY2lmeSBubyBjb25uZWN0aW9uLiBVbm1hbmFnZWQgKGBuYW1lYCBpcyBudWxsKSBjb2xsZWN0aW9ucyBjYW5ub3Qgc3BlY2lmeSBhIGNvbm5lY3Rpb24uXG4gKiBAcGFyYW0ge1N0cmluZ30gb3B0aW9ucy5pZEdlbmVyYXRpb24gVGhlIG1ldGhvZCBvZiBnZW5lcmF0aW5nIHRoZSBgX2lkYCBmaWVsZHMgb2YgbmV3IGRvY3VtZW50cyBpbiB0aGlzIGNvbGxlY3Rpb24uICBQb3NzaWJsZSB2YWx1ZXM6XG5cbiAtICoqYCdTVFJJTkcnYCoqOiByYW5kb20gc3RyaW5nc1xuIC0gKipgJ01PTkdPJ2AqKjogIHJhbmRvbSBbYE1vbmdvLk9iamVjdElEYF0oI21vbmdvX29iamVjdF9pZCkgdmFsdWVzXG5cblRoZSBkZWZhdWx0IGlkIGdlbmVyYXRpb24gdGVjaG5pcXVlIGlzIGAnU1RSSU5HJ2AuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBvcHRpb25zLnRyYW5zZm9ybSBBbiBvcHRpb25hbCB0cmFuc2Zvcm1hdGlvbiBmdW5jdGlvbi4gRG9jdW1lbnRzIHdpbGwgYmUgcGFzc2VkIHRocm91Z2ggdGhpcyBmdW5jdGlvbiBiZWZvcmUgYmVpbmcgcmV0dXJuZWQgZnJvbSBgZmV0Y2hgIG9yIGBmaW5kT25lQXN5bmNgLCBhbmQgYmVmb3JlIGJlaW5nIHBhc3NlZCB0byBjYWxsYmFja3Mgb2YgYG9ic2VydmVgLCBgbWFwYCwgYGZvckVhY2hgLCBgYWxsb3dgLCBhbmQgYGRlbnlgLiBUcmFuc2Zvcm1zIGFyZSAqbm90KiBhcHBsaWVkIGZvciB0aGUgY2FsbGJhY2tzIG9mIGBvYnNlcnZlQ2hhbmdlc2Agb3IgdG8gY3Vyc29ycyByZXR1cm5lZCBmcm9tIHB1Ymxpc2ggZnVuY3Rpb25zLlxuICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLmRlZmluZU11dGF0aW9uTWV0aG9kcyBTZXQgdG8gYGZhbHNlYCB0byBza2lwIHNldHRpbmcgdXAgdGhlIG11dGF0aW9uIG1ldGhvZHMgdGhhdCBlbmFibGUgaW5zZXJ0L3VwZGF0ZS9yZW1vdmUgZnJvbSBjbGllbnQgY29kZS4gRGVmYXVsdCBgdHJ1ZWAuXG4gKi9cbi8vIE1haW4gQ29sbGVjdGlvbiBjb25zdHJ1Y3RvclxuTW9uZ28uQ29sbGVjdGlvbiA9IGZ1bmN0aW9uIENvbGxlY3Rpb24obmFtZSwgb3B0aW9ucykge1xuICBuYW1lID0gdmFsaWRhdGVDb2xsZWN0aW9uTmFtZShuYW1lKTtcblxuICBvcHRpb25zID0gbm9ybWFsaXplT3B0aW9ucyhvcHRpb25zKTtcblxuICB0aGlzLl9tYWtlTmV3SUQgPSBJRF9HRU5FUkFUT1JTW29wdGlvbnMuaWRHZW5lcmF0aW9uXT8uKG5hbWUpO1xuXG4gIHRoaXMuX3RyYW5zZm9ybSA9IExvY2FsQ29sbGVjdGlvbi53cmFwVHJhbnNmb3JtKG9wdGlvbnMudHJhbnNmb3JtKTtcbiAgdGhpcy5yZXNvbHZlclR5cGUgPSBvcHRpb25zLnJlc29sdmVyVHlwZTtcblxuICB0aGlzLl9jb25uZWN0aW9uID0gc2V0dXBDb25uZWN0aW9uKG5hbWUsIG9wdGlvbnMpO1xuXG4gIGNvbnN0IGRyaXZlciA9IHNldHVwRHJpdmVyKG5hbWUsIHRoaXMuX2Nvbm5lY3Rpb24sIG9wdGlvbnMpO1xuICB0aGlzLl9kcml2ZXIgPSBkcml2ZXI7XG5cbiAgdGhpcy5fY29sbGVjdGlvbiA9IGRyaXZlci5vcGVuKG5hbWUsIHRoaXMuX2Nvbm5lY3Rpb24pO1xuICB0aGlzLl9uYW1lID0gbmFtZTtcblxuICB0aGlzLl9zZXR0aW5nVXBSZXBsaWNhdGlvblByb21pc2UgPSB0aGlzLl9tYXliZVNldFVwUmVwbGljYXRpb24obmFtZSwgb3B0aW9ucyk7XG5cbiAgc2V0dXBNdXRhdGlvbk1ldGhvZHModGhpcywgbmFtZSwgb3B0aW9ucyk7XG5cbiAgc2V0dXBBdXRvcHVibGlzaCh0aGlzLCBuYW1lLCBvcHRpb25zKTtcblxuICBNb25nby5fY29sbGVjdGlvbnMuc2V0KG5hbWUsIHRoaXMpO1xufTtcblxuT2JqZWN0LmFzc2lnbihNb25nby5Db2xsZWN0aW9uLnByb3RvdHlwZSwge1xuICBfZ2V0RmluZFNlbGVjdG9yKGFyZ3MpIHtcbiAgICBpZiAoYXJncy5sZW5ndGggPT0gMCkgcmV0dXJuIHt9O1xuICAgIGVsc2UgcmV0dXJuIGFyZ3NbMF07XG4gIH0sXG5cbiAgX2dldEZpbmRPcHRpb25zKGFyZ3MpIHtcbiAgICBjb25zdCBbLCBvcHRpb25zXSA9IGFyZ3MgfHwgW107XG4gICAgY29uc3QgbmV3T3B0aW9ucyA9IG5vcm1hbGl6ZVByb2plY3Rpb24ob3B0aW9ucyk7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKGFyZ3MubGVuZ3RoIDwgMikge1xuICAgICAgcmV0dXJuIHsgdHJhbnNmb3JtOiBzZWxmLl90cmFuc2Zvcm0gfTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2hlY2soXG4gICAgICAgIG5ld09wdGlvbnMsXG4gICAgICAgIE1hdGNoLk9wdGlvbmFsKFxuICAgICAgICAgIE1hdGNoLk9iamVjdEluY2x1ZGluZyh7XG4gICAgICAgICAgICBwcm9qZWN0aW9uOiBNYXRjaC5PcHRpb25hbChNYXRjaC5PbmVPZihPYmplY3QsIHVuZGVmaW5lZCkpLFxuICAgICAgICAgICAgc29ydDogTWF0Y2guT3B0aW9uYWwoXG4gICAgICAgICAgICAgIE1hdGNoLk9uZU9mKE9iamVjdCwgQXJyYXksIEZ1bmN0aW9uLCB1bmRlZmluZWQpXG4gICAgICAgICAgICApLFxuICAgICAgICAgICAgbGltaXQ6IE1hdGNoLk9wdGlvbmFsKE1hdGNoLk9uZU9mKE51bWJlciwgdW5kZWZpbmVkKSksXG4gICAgICAgICAgICBza2lwOiBNYXRjaC5PcHRpb25hbChNYXRjaC5PbmVPZihOdW1iZXIsIHVuZGVmaW5lZCkpLFxuICAgICAgICAgIH0pXG4gICAgICAgIClcbiAgICAgICk7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRyYW5zZm9ybTogc2VsZi5fdHJhbnNmb3JtLFxuICAgICAgICAuLi5uZXdPcHRpb25zLFxuICAgICAgfTtcbiAgICB9XG4gIH0sXG59KTtcblxuT2JqZWN0LmFzc2lnbihNb25nby5Db2xsZWN0aW9uLCB7XG4gIGFzeW5jIF9wdWJsaXNoQ3Vyc29yKGN1cnNvciwgc3ViLCBjb2xsZWN0aW9uKSB7XG4gICAgdmFyIG9ic2VydmVIYW5kbGUgPSBhd2FpdCBjdXJzb3Iub2JzZXJ2ZUNoYW5nZXMoXG4gICAgICAgIHtcbiAgICAgICAgICBhZGRlZDogZnVuY3Rpb24oaWQsIGZpZWxkcykge1xuICAgICAgICAgICAgc3ViLmFkZGVkKGNvbGxlY3Rpb24sIGlkLCBmaWVsZHMpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgY2hhbmdlZDogZnVuY3Rpb24oaWQsIGZpZWxkcykge1xuICAgICAgICAgICAgc3ViLmNoYW5nZWQoY29sbGVjdGlvbiwgaWQsIGZpZWxkcyk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICByZW1vdmVkOiBmdW5jdGlvbihpZCkge1xuICAgICAgICAgICAgc3ViLnJlbW92ZWQoY29sbGVjdGlvbiwgaWQpO1xuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIC8vIFB1YmxpY2F0aW9ucyBkb24ndCBtdXRhdGUgdGhlIGRvY3VtZW50c1xuICAgICAgICAvLyBUaGlzIGlzIHRlc3RlZCBieSB0aGUgYGxpdmVkYXRhIC0gcHVibGlzaCBjYWxsYmFja3MgY2xvbmVgIHRlc3RcbiAgICAgICAgeyBub25NdXRhdGluZ0NhbGxiYWNrczogdHJ1ZSB9XG4gICAgKTtcblxuICAgIC8vIFdlIGRvbid0IGNhbGwgc3ViLnJlYWR5KCkgaGVyZTogaXQgZ2V0cyBjYWxsZWQgaW4gbGl2ZWRhdGFfc2VydmVyLCBhZnRlclxuICAgIC8vIHBvc3NpYmx5IGNhbGxpbmcgX3B1Ymxpc2hDdXJzb3Igb24gbXVsdGlwbGUgcmV0dXJuZWQgY3Vyc29ycy5cblxuICAgIC8vIHJlZ2lzdGVyIHN0b3AgY2FsbGJhY2sgKGV4cGVjdHMgbGFtYmRhIHcvIG5vIGFyZ3MpLlxuICAgIHN1Yi5vblN0b3AoYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gYXdhaXQgb2JzZXJ2ZUhhbmRsZS5zdG9wKCk7XG4gICAgfSk7XG5cbiAgICAvLyByZXR1cm4gdGhlIG9ic2VydmVIYW5kbGUgaW4gY2FzZSBpdCBuZWVkcyB0byBiZSBzdG9wcGVkIGVhcmx5XG4gICAgcmV0dXJuIG9ic2VydmVIYW5kbGU7XG4gIH0sXG5cbiAgLy8gcHJvdGVjdCBhZ2FpbnN0IGRhbmdlcm91cyBzZWxlY3RvcnMuICBmYWxzZXkgYW5kIHtfaWQ6IGZhbHNleX0gYXJlIGJvdGhcbiAgLy8gbGlrZWx5IHByb2dyYW1tZXIgZXJyb3IsIGFuZCBub3Qgd2hhdCB5b3Ugd2FudCwgcGFydGljdWxhcmx5IGZvciBkZXN0cnVjdGl2ZVxuICAvLyBvcGVyYXRpb25zLiBJZiBhIGZhbHNleSBfaWQgaXMgc2VudCBpbiwgYSBuZXcgc3RyaW5nIF9pZCB3aWxsIGJlXG4gIC8vIGdlbmVyYXRlZCBhbmQgcmV0dXJuZWQ7IGlmIGEgZmFsbGJhY2tJZCBpcyBwcm92aWRlZCwgaXQgd2lsbCBiZSByZXR1cm5lZFxuICAvLyBpbnN0ZWFkLlxuICBfcmV3cml0ZVNlbGVjdG9yKHNlbGVjdG9yLCB7IGZhbGxiYWNrSWQgfSA9IHt9KSB7XG4gICAgLy8gc2hvcnRoYW5kIC0tIHNjYWxhcnMgbWF0Y2ggX2lkXG4gICAgaWYgKExvY2FsQ29sbGVjdGlvbi5fc2VsZWN0b3JJc0lkKHNlbGVjdG9yKSkgc2VsZWN0b3IgPSB7IF9pZDogc2VsZWN0b3IgfTtcblxuICAgIGlmIChBcnJheS5pc0FycmF5KHNlbGVjdG9yKSkge1xuICAgICAgLy8gVGhpcyBpcyBjb25zaXN0ZW50IHdpdGggdGhlIE1vbmdvIGNvbnNvbGUgaXRzZWxmOyBpZiB3ZSBkb24ndCBkbyB0aGlzXG4gICAgICAvLyBjaGVjayBwYXNzaW5nIGFuIGVtcHR5IGFycmF5IGVuZHMgdXAgc2VsZWN0aW5nIGFsbCBpdGVtc1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTW9uZ28gc2VsZWN0b3IgY2FuJ3QgYmUgYW4gYXJyYXkuXCIpO1xuICAgIH1cblxuICAgIGlmICghc2VsZWN0b3IgfHwgKCdfaWQnIGluIHNlbGVjdG9yICYmICFzZWxlY3Rvci5faWQpKSB7XG4gICAgICAvLyBjYW4ndCBtYXRjaCBhbnl0aGluZ1xuICAgICAgcmV0dXJuIHsgX2lkOiBmYWxsYmFja0lkIHx8IFJhbmRvbS5pZCgpIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHNlbGVjdG9yO1xuICB9LFxufSk7XG5cbk9iamVjdC5hc3NpZ24oTW9uZ28uQ29sbGVjdGlvbi5wcm90b3R5cGUsIFJlcGxpY2F0aW9uTWV0aG9kcywgU3luY01ldGhvZHMsIEFzeW5jTWV0aG9kcywgSW5kZXhNZXRob2RzKTtcblxuT2JqZWN0LmFzc2lnbihNb25nby5Db2xsZWN0aW9uLnByb3RvdHlwZSwge1xuICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBjb2xsZWN0aW9uIGlzIHNpbXBseSBhIG1pbmltb25nbyByZXByZXNlbnRhdGlvbiBvZiBhIHJlYWxcbiAgLy8gZGF0YWJhc2Ugb24gYW5vdGhlciBzZXJ2ZXJcbiAgX2lzUmVtb3RlQ29sbGVjdGlvbigpIHtcbiAgICAvLyBYWFggc2VlICNNZXRlb3JTZXJ2ZXJOdWxsXG4gICAgcmV0dXJuIHRoaXMuX2Nvbm5lY3Rpb24gJiYgdGhpcy5fY29ubmVjdGlvbiAhPT0gTWV0ZW9yLnNlcnZlcjtcbiAgfSxcblxuICBhc3luYyBkcm9wQ29sbGVjdGlvbkFzeW5jKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoIXNlbGYuX2NvbGxlY3Rpb24uZHJvcENvbGxlY3Rpb25Bc3luYylcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2FuIG9ubHkgY2FsbCBkcm9wQ29sbGVjdGlvbkFzeW5jIG9uIHNlcnZlciBjb2xsZWN0aW9ucycpO1xuICAgYXdhaXQgc2VsZi5fY29sbGVjdGlvbi5kcm9wQ29sbGVjdGlvbkFzeW5jKCk7XG4gIH0sXG5cbiAgYXN5bmMgY3JlYXRlQ2FwcGVkQ29sbGVjdGlvbkFzeW5jKGJ5dGVTaXplLCBtYXhEb2N1bWVudHMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCEgYXdhaXQgc2VsZi5fY29sbGVjdGlvbi5jcmVhdGVDYXBwZWRDb2xsZWN0aW9uQXN5bmMpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdDYW4gb25seSBjYWxsIGNyZWF0ZUNhcHBlZENvbGxlY3Rpb25Bc3luYyBvbiBzZXJ2ZXIgY29sbGVjdGlvbnMnXG4gICAgICApO1xuICAgIGF3YWl0IHNlbGYuX2NvbGxlY3Rpb24uY3JlYXRlQ2FwcGVkQ29sbGVjdGlvbkFzeW5jKGJ5dGVTaXplLCBtYXhEb2N1bWVudHMpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIHRoZSBbYENvbGxlY3Rpb25gXShodHRwOi8vbW9uZ29kYi5naXRodWIuaW8vbm9kZS1tb25nb2RiLW5hdGl2ZS8zLjAvYXBpL0NvbGxlY3Rpb24uaHRtbCkgb2JqZWN0IGNvcnJlc3BvbmRpbmcgdG8gdGhpcyBjb2xsZWN0aW9uIGZyb20gdGhlIFtucG0gYG1vbmdvZGJgIGRyaXZlciBtb2R1bGVdKGh0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlL21vbmdvZGIpIHdoaWNoIGlzIHdyYXBwZWQgYnkgYE1vbmdvLkNvbGxlY3Rpb25gLlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJvZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKi9cbiAgcmF3Q29sbGVjdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCFzZWxmLl9jb2xsZWN0aW9uLnJhd0NvbGxlY3Rpb24pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2FuIG9ubHkgY2FsbCByYXdDb2xsZWN0aW9uIG9uIHNlcnZlciBjb2xsZWN0aW9ucycpO1xuICAgIH1cbiAgICByZXR1cm4gc2VsZi5fY29sbGVjdGlvbi5yYXdDb2xsZWN0aW9uKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFJldHVybnMgdGhlIFtgRGJgXShodHRwOi8vbW9uZ29kYi5naXRodWIuaW8vbm9kZS1tb25nb2RiLW5hdGl2ZS8zLjAvYXBpL0RiLmh0bWwpIG9iamVjdCBjb3JyZXNwb25kaW5nIHRvIHRoaXMgY29sbGVjdGlvbidzIGRhdGFiYXNlIGNvbm5lY3Rpb24gZnJvbSB0aGUgW25wbSBgbW9uZ29kYmAgZHJpdmVyIG1vZHVsZV0oaHR0cHM6Ly93d3cubnBtanMuY29tL3BhY2thZ2UvbW9uZ29kYikgd2hpY2ggaXMgd3JhcHBlZCBieSBgTW9uZ28uQ29sbGVjdGlvbmAuXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlcm9mIE1vbmdvLkNvbGxlY3Rpb25cbiAgICogQGluc3RhbmNlXG4gICAqL1xuICByYXdEYXRhYmFzZSgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCEoc2VsZi5fZHJpdmVyLm1vbmdvICYmIHNlbGYuX2RyaXZlci5tb25nby5kYikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2FuIG9ubHkgY2FsbCByYXdEYXRhYmFzZSBvbiBzZXJ2ZXIgY29sbGVjdGlvbnMnKTtcbiAgICB9XG4gICAgcmV0dXJuIHNlbGYuX2RyaXZlci5tb25nby5kYjtcbiAgfSxcbn0pO1xuXG5PYmplY3QuYXNzaWduKE1vbmdvLCB7XG4gIC8qKlxuICAgKiBAc3VtbWFyeSBSZXRyaWV2ZSBhIE1ldGVvciBjb2xsZWN0aW9uIGluc3RhbmNlIGJ5IG5hbWUuIE9ubHkgY29sbGVjdGlvbnMgZGVmaW5lZCB3aXRoIFtgbmV3IE1vbmdvLkNvbGxlY3Rpb24oLi4uKWBdKCNjb2xsZWN0aW9ucykgYXJlIGF2YWlsYWJsZSB3aXRoIHRoaXMgbWV0aG9kLiBGb3IgcGxhaW4gTW9uZ29EQiBjb2xsZWN0aW9ucywgeW91J2xsIHdhbnQgdG8gbG9vayBhdCBbYHJhd0RhdGFiYXNlKClgXSgjTW9uZ28tQ29sbGVjdGlvbi1yYXdEYXRhYmFzZSkuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyb2YgTW9uZ29cbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBOYW1lIG9mIHlvdXIgY29sbGVjdGlvbiBhcyBpdCB3YXMgZGVmaW5lZCB3aXRoIGBuZXcgTW9uZ28uQ29sbGVjdGlvbigpYC5cbiAgICogQHJldHVybnMge01vbmdvLkNvbGxlY3Rpb24gfCB1bmRlZmluZWR9XG4gICAqL1xuICBnZXRDb2xsZWN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5fY29sbGVjdGlvbnMuZ2V0KG5hbWUpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBBIHJlY29yZCBvZiBhbGwgZGVmaW5lZCBNb25nby5Db2xsZWN0aW9uIGluc3RhbmNlcywgaW5kZXhlZCBieSBjb2xsZWN0aW9uIG5hbWUuXG4gICAqIEB0eXBlIHtNYXA8c3RyaW5nLCBNb25nby5Db2xsZWN0aW9uPn1cbiAgICogQG1lbWJlcm9mIE1vbmdvXG4gICAqIEBwcm90ZWN0ZWRcbiAgICovXG4gIF9jb2xsZWN0aW9uczogbmV3IE1hcCgpLFxufSlcblxuXG5cbi8qKlxuICogQHN1bW1hcnkgQ3JlYXRlIGEgTW9uZ28tc3R5bGUgYE9iamVjdElEYC4gIElmIHlvdSBkb24ndCBzcGVjaWZ5IGEgYGhleFN0cmluZ2AsIHRoZSBgT2JqZWN0SURgIHdpbGwgYmUgZ2VuZXJhdGVkIHJhbmRvbWx5IChub3QgdXNpbmcgTW9uZ29EQidzIElEIGNvbnN0cnVjdGlvbiBydWxlcykuXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBjbGFzc1xuICogQHBhcmFtIHtTdHJpbmd9IFtoZXhTdHJpbmddIE9wdGlvbmFsLiAgVGhlIDI0LWNoYXJhY3RlciBoZXhhZGVjaW1hbCBjb250ZW50cyBvZiB0aGUgT2JqZWN0SUQgdG8gY3JlYXRlXG4gKi9cbk1vbmdvLk9iamVjdElEID0gTW9uZ29JRC5PYmplY3RJRDtcblxuLyoqXG4gKiBAc3VtbWFyeSBUbyBjcmVhdGUgYSBjdXJzb3IsIHVzZSBmaW5kLiBUbyBhY2Nlc3MgdGhlIGRvY3VtZW50cyBpbiBhIGN1cnNvciwgdXNlIGZvckVhY2gsIG1hcCwgb3IgZmV0Y2guXG4gKiBAY2xhc3NcbiAqIEBpbnN0YW5jZU5hbWUgY3Vyc29yXG4gKi9cbk1vbmdvLkN1cnNvciA9IExvY2FsQ29sbGVjdGlvbi5DdXJzb3I7XG5cbi8qKlxuICogQGRlcHJlY2F0ZWQgaW4gMC45LjFcbiAqL1xuTW9uZ28uQ29sbGVjdGlvbi5DdXJzb3IgPSBNb25nby5DdXJzb3I7XG5cbi8qKlxuICogQGRlcHJlY2F0ZWQgaW4gMC45LjFcbiAqL1xuTW9uZ28uQ29sbGVjdGlvbi5PYmplY3RJRCA9IE1vbmdvLk9iamVjdElEO1xuXG4vKipcbiAqIEBkZXByZWNhdGVkIGluIDAuOS4xXG4gKi9cbk1ldGVvci5Db2xsZWN0aW9uID0gTW9uZ28uQ29sbGVjdGlvbjtcblxuXG4vLyBBbGxvdyBkZW55IHN0dWZmIGlzIG5vdyBpbiB0aGUgYWxsb3ctZGVueSBwYWNrYWdlXG5PYmplY3QuYXNzaWduKE1vbmdvLkNvbGxlY3Rpb24ucHJvdG90eXBlLCBBbGxvd0RlbnkuQ29sbGVjdGlvblByb3RvdHlwZSk7XG4iLCJleHBvcnQgY29uc3QgSURfR0VORVJBVE9SUyA9IHtcbiAgTU9OR08obmFtZSkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGNvbnN0IHNyYyA9IG5hbWUgPyBERFAucmFuZG9tU3RyZWFtKCcvY29sbGVjdGlvbi8nICsgbmFtZSkgOiBSYW5kb20uaW5zZWN1cmU7XG4gICAgICByZXR1cm4gbmV3IE1vbmdvLk9iamVjdElEKHNyYy5oZXhTdHJpbmcoMjQpKTtcbiAgICB9XG4gIH0sXG4gIFNUUklORyhuYW1lKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgY29uc3Qgc3JjID0gbmFtZSA/IEREUC5yYW5kb21TdHJlYW0oJy9jb2xsZWN0aW9uLycgKyBuYW1lKSA6IFJhbmRvbS5pbnNlY3VyZTtcbiAgICAgIHJldHVybiBzcmMuaWQoKTtcbiAgICB9XG4gIH1cbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cENvbm5lY3Rpb24obmFtZSwgb3B0aW9ucykge1xuICBpZiAoIW5hbWUgfHwgb3B0aW9ucy5jb25uZWN0aW9uID09PSBudWxsKSByZXR1cm4gbnVsbDtcbiAgaWYgKG9wdGlvbnMuY29ubmVjdGlvbikgcmV0dXJuIG9wdGlvbnMuY29ubmVjdGlvbjtcbiAgcmV0dXJuIE1ldGVvci5pc0NsaWVudCA/IE1ldGVvci5jb25uZWN0aW9uIDogTWV0ZW9yLnNlcnZlcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldHVwRHJpdmVyKG5hbWUsIGNvbm5lY3Rpb24sIG9wdGlvbnMpIHtcbiAgaWYgKG9wdGlvbnMuX2RyaXZlcikgcmV0dXJuIG9wdGlvbnMuX2RyaXZlcjtcblxuICBpZiAobmFtZSAmJlxuICAgIGNvbm5lY3Rpb24gPT09IE1ldGVvci5zZXJ2ZXIgJiZcbiAgICB0eXBlb2YgTW9uZ29JbnRlcm5hbHMgIT09ICd1bmRlZmluZWQnICYmXG4gICAgTW9uZ29JbnRlcm5hbHMuZGVmYXVsdFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIpIHtcbiAgICByZXR1cm4gTW9uZ29JbnRlcm5hbHMuZGVmYXVsdFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIoKTtcbiAgfVxuXG4gIGNvbnN0IHsgTG9jYWxDb2xsZWN0aW9uRHJpdmVyIH0gPSByZXF1aXJlKCcuLi9sb2NhbF9jb2xsZWN0aW9uX2RyaXZlci5qcycpO1xuICByZXR1cm4gTG9jYWxDb2xsZWN0aW9uRHJpdmVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBBdXRvcHVibGlzaChjb2xsZWN0aW9uLCBuYW1lLCBvcHRpb25zKSB7XG4gIGlmIChQYWNrYWdlLmF1dG9wdWJsaXNoICYmXG4gICAgIW9wdGlvbnMuX3ByZXZlbnRBdXRvcHVibGlzaCAmJlxuICAgIGNvbGxlY3Rpb24uX2Nvbm5lY3Rpb24gJiZcbiAgICBjb2xsZWN0aW9uLl9jb25uZWN0aW9uLnB1Ymxpc2gpIHtcbiAgICBjb2xsZWN0aW9uLl9jb25uZWN0aW9uLnB1Ymxpc2gobnVsbCwgKCkgPT4gY29sbGVjdGlvbi5maW5kKCksIHtcbiAgICAgIGlzX2F1dG86IHRydWVcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBNdXRhdGlvbk1ldGhvZHMoY29sbGVjdGlvbiwgbmFtZSwgb3B0aW9ucykge1xuICBpZiAob3B0aW9ucy5kZWZpbmVNdXRhdGlvbk1ldGhvZHMgPT09IGZhbHNlKSByZXR1cm47XG5cbiAgdHJ5IHtcbiAgICBjb2xsZWN0aW9uLl9kZWZpbmVNdXRhdGlvbk1ldGhvZHMoe1xuICAgICAgdXNlRXhpc3Rpbmc6IG9wdGlvbnMuX3N1cHByZXNzU2FtZU5hbWVFcnJvciA9PT0gdHJ1ZVxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChlcnJvci5tZXNzYWdlID09PSBgQSBtZXRob2QgbmFtZWQgJy8ke25hbWV9L2luc2VydEFzeW5jJyBpcyBhbHJlYWR5IGRlZmluZWRgKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZXJlIGlzIGFscmVhZHkgYSBjb2xsZWN0aW9uIG5hbWVkIFwiJHtuYW1lfVwiYCk7XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUNvbGxlY3Rpb25OYW1lKG5hbWUpIHtcbiAgaWYgKCFuYW1lICYmIG5hbWUgIT09IG51bGwpIHtcbiAgICBNZXRlb3IuX2RlYnVnKFxuICAgICAgJ1dhcm5pbmc6IGNyZWF0aW5nIGFub255bW91cyBjb2xsZWN0aW9uLiBJdCB3aWxsIG5vdCBiZSAnICtcbiAgICAgICdzYXZlZCBvciBzeW5jaHJvbml6ZWQgb3ZlciB0aGUgbmV0d29yay4gKFBhc3MgbnVsbCBmb3IgJyArXG4gICAgICAndGhlIGNvbGxlY3Rpb24gbmFtZSB0byB0dXJuIG9mZiB0aGlzIHdhcm5pbmcuKSdcbiAgICApO1xuICAgIG5hbWUgPSBudWxsO1xuICB9XG5cbiAgaWYgKG5hbWUgIT09IG51bGwgJiYgdHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgJ0ZpcnN0IGFyZ3VtZW50IHRvIG5ldyBNb25nby5Db2xsZWN0aW9uIG11c3QgYmUgYSBzdHJpbmcgb3IgbnVsbCdcbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIG5hbWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVPcHRpb25zKG9wdGlvbnMpIHtcbiAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5tZXRob2RzKSB7XG4gICAgLy8gQmFja3dhcmRzIGNvbXBhdGliaWxpdHkgaGFjayB3aXRoIG9yaWdpbmFsIHNpZ25hdHVyZVxuICAgIG9wdGlvbnMgPSB7IGNvbm5lY3Rpb246IG9wdGlvbnMgfTtcbiAgfVxuICAvLyBCYWNrd2FyZHMgY29tcGF0aWJpbGl0eTogXCJjb25uZWN0aW9uXCIgdXNlZCB0byBiZSBjYWxsZWQgXCJtYW5hZ2VyXCIuXG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMubWFuYWdlciAmJiAhb3B0aW9ucy5jb25uZWN0aW9uKSB7XG4gICAgb3B0aW9ucy5jb25uZWN0aW9uID0gb3B0aW9ucy5tYW5hZ2VyO1xuICB9XG5cbiAgY29uc3QgY2xlYW5lZE9wdGlvbnMgPSBPYmplY3QuZnJvbUVudHJpZXMoXG4gICAgT2JqZWN0LmVudHJpZXMob3B0aW9ucyB8fCB7fSkuZmlsdGVyKChbXywgdl0pID0+IHYgIT09IHVuZGVmaW5lZCksXG4gICk7XG5cbiAgLy8gMikgU3ByZWFkIGRlZmF1bHRzIGZpcnN0LCB0aGVuIG9ubHkgdGhlIGRlZmluZWQgb3ZlcnJpZGVzXG4gIHJldHVybiB7XG4gICAgY29ubmVjdGlvbjogdW5kZWZpbmVkLFxuICAgIGlkR2VuZXJhdGlvbjogJ1NUUklORycsXG4gICAgdHJhbnNmb3JtOiBudWxsLFxuICAgIF9kcml2ZXI6IHVuZGVmaW5lZCxcbiAgICBfcHJldmVudEF1dG9wdWJsaXNoOiBmYWxzZSxcbiAgICAuLi5jbGVhbmVkT3B0aW9ucyxcbiAgfTtcbn1cbiIsImV4cG9ydCBjb25zdCBBc3luY01ldGhvZHMgPSB7XG4gIC8qKlxuICAgKiBAc3VtbWFyeSBGaW5kcyB0aGUgZmlyc3QgZG9jdW1lbnQgdGhhdCBtYXRjaGVzIHRoZSBzZWxlY3RvciwgYXMgb3JkZXJlZCBieSBzb3J0IGFuZCBza2lwIG9wdGlvbnMuIFJldHVybnMgYHVuZGVmaW5lZGAgaWYgbm8gbWF0Y2hpbmcgZG9jdW1lbnQgaXMgZm91bmQuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWV0aG9kIGZpbmRPbmVBc3luY1xuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtNb25nb1NlbGVjdG9yfSBbc2VsZWN0b3JdIEEgcXVlcnkgZGVzY3JpYmluZyB0aGUgZG9jdW1lbnRzIHRvIGZpbmRcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICAgKiBAcGFyYW0ge01vbmdvU29ydFNwZWNpZmllcn0gb3B0aW9ucy5zb3J0IFNvcnQgb3JkZXIgKGRlZmF1bHQ6IG5hdHVyYWwgb3JkZXIpXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRpb25zLnNraXAgTnVtYmVyIG9mIHJlc3VsdHMgdG8gc2tpcCBhdCB0aGUgYmVnaW5uaW5nXG4gICAqIEBwYXJhbSB7TW9uZ29GaWVsZFNwZWNpZmllcn0gb3B0aW9ucy5maWVsZHMgRGljdGlvbmFyeSBvZiBmaWVsZHMgdG8gcmV0dXJuIG9yIGV4Y2x1ZGUuXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5yZWFjdGl2ZSAoQ2xpZW50IG9ubHkpIERlZmF1bHQgdHJ1ZTsgcGFzcyBmYWxzZSB0byBkaXNhYmxlIHJlYWN0aXZpdHlcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gb3B0aW9ucy50cmFuc2Zvcm0gT3ZlcnJpZGVzIGB0cmFuc2Zvcm1gIG9uIHRoZSBbYENvbGxlY3Rpb25gXSgjY29sbGVjdGlvbnMpIGZvciB0aGlzIGN1cnNvci4gIFBhc3MgYG51bGxgIHRvIGRpc2FibGUgdHJhbnNmb3JtYXRpb24uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRpb25zLnJlYWRQcmVmZXJlbmNlIChTZXJ2ZXIgb25seSkgU3BlY2lmaWVzIGEgY3VzdG9tIE1vbmdvREIgW2ByZWFkUHJlZmVyZW5jZWBdKGh0dHBzOi8vZG9jcy5tb25nb2RiLmNvbS9tYW51YWwvY29yZS9yZWFkLXByZWZlcmVuY2UpIGZvciBmZXRjaGluZyB0aGUgZG9jdW1lbnQuIFBvc3NpYmxlIHZhbHVlcyBhcmUgYHByaW1hcnlgLCBgcHJpbWFyeVByZWZlcnJlZGAsIGBzZWNvbmRhcnlgLCBgc2Vjb25kYXJ5UHJlZmVycmVkYCBhbmQgYG5lYXJlc3RgLlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgZmluZE9uZUFzeW5jKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy5fY29sbGVjdGlvbi5maW5kT25lQXN5bmMoXG4gICAgICB0aGlzLl9nZXRGaW5kU2VsZWN0b3IoYXJncyksXG4gICAgICB0aGlzLl9nZXRGaW5kT3B0aW9ucyhhcmdzKVxuICAgICk7XG4gIH0sXG5cbiAgX2luc2VydEFzeW5jKGRvYywgb3B0aW9ucyA9IHt9KSB7XG4gICAgLy8gTWFrZSBzdXJlIHdlIHdlcmUgcGFzc2VkIGEgZG9jdW1lbnQgdG8gaW5zZXJ0XG4gICAgaWYgKCFkb2MpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignaW5zZXJ0IHJlcXVpcmVzIGFuIGFyZ3VtZW50Jyk7XG4gICAgfVxuXG4gICAgLy8gTWFrZSBhIHNoYWxsb3cgY2xvbmUgb2YgdGhlIGRvY3VtZW50LCBwcmVzZXJ2aW5nIGl0cyBwcm90b3R5cGUuXG4gICAgZG9jID0gT2JqZWN0LmNyZWF0ZShcbiAgICAgIE9iamVjdC5nZXRQcm90b3R5cGVPZihkb2MpLFxuICAgICAgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnMoZG9jKVxuICAgICk7XG5cbiAgICBpZiAoJ19pZCcgaW4gZG9jKSB7XG4gICAgICBpZiAoXG4gICAgICAgICFkb2MuX2lkIHx8XG4gICAgICAgICEodHlwZW9mIGRvYy5faWQgPT09ICdzdHJpbmcnIHx8IGRvYy5faWQgaW5zdGFuY2VvZiBNb25nby5PYmplY3RJRClcbiAgICAgICkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ01ldGVvciByZXF1aXJlcyBkb2N1bWVudCBfaWQgZmllbGRzIHRvIGJlIG5vbi1lbXB0eSBzdHJpbmdzIG9yIE9iamVjdElEcydcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IGdlbmVyYXRlSWQgPSB0cnVlO1xuXG4gICAgICAvLyBEb24ndCBnZW5lcmF0ZSB0aGUgaWQgaWYgd2UncmUgdGhlIGNsaWVudCBhbmQgdGhlICdvdXRlcm1vc3QnIGNhbGxcbiAgICAgIC8vIFRoaXMgb3B0aW1pemF0aW9uIHNhdmVzIHVzIHBhc3NpbmcgYm90aCB0aGUgcmFuZG9tU2VlZCBhbmQgdGhlIGlkXG4gICAgICAvLyBQYXNzaW5nIGJvdGggaXMgcmVkdW5kYW50LlxuICAgICAgaWYgKHRoaXMuX2lzUmVtb3RlQ29sbGVjdGlvbigpKSB7XG4gICAgICAgIGNvbnN0IGVuY2xvc2luZyA9IEREUC5fQ3VycmVudE1ldGhvZEludm9jYXRpb24uZ2V0KCk7XG4gICAgICAgIGlmICghZW5jbG9zaW5nKSB7XG4gICAgICAgICAgZ2VuZXJhdGVJZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChnZW5lcmF0ZUlkKSB7XG4gICAgICAgIGRvYy5faWQgPSB0aGlzLl9tYWtlTmV3SUQoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBPbiBpbnNlcnRzLCBhbHdheXMgcmV0dXJuIHRoZSBpZCB0aGF0IHdlIGdlbmVyYXRlZDsgb24gYWxsIG90aGVyXG4gICAgLy8gb3BlcmF0aW9ucywganVzdCByZXR1cm4gdGhlIHJlc3VsdCBmcm9tIHRoZSBjb2xsZWN0aW9uLlxuICAgIHZhciBjaG9vc2VSZXR1cm5WYWx1ZUZyb21Db2xsZWN0aW9uUmVzdWx0ID0gZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICBpZiAoTWV0ZW9yLl9pc1Byb21pc2UocmVzdWx0KSkgcmV0dXJuIHJlc3VsdDtcblxuICAgICAgaWYgKGRvYy5faWQpIHtcbiAgICAgICAgcmV0dXJuIGRvYy5faWQ7XG4gICAgICB9XG5cbiAgICAgIC8vIFhYWCB3aGF0IGlzIHRoaXMgZm9yPz9cbiAgICAgIC8vIEl0J3Mgc29tZSBpdGVyYWN0aW9uIGJldHdlZW4gdGhlIGNhbGxiYWNrIHRvIF9jYWxsTXV0YXRvck1ldGhvZCBhbmRcbiAgICAgIC8vIHRoZSByZXR1cm4gdmFsdWUgY29udmVyc2lvblxuICAgICAgZG9jLl9pZCA9IHJlc3VsdDtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuXG4gICAgaWYgKHRoaXMuX2lzUmVtb3RlQ29sbGVjdGlvbigpKSB7XG4gICAgICBjb25zdCBwcm9taXNlID0gdGhpcy5fY2FsbE11dGF0b3JNZXRob2RBc3luYygnaW5zZXJ0QXN5bmMnLCBbZG9jXSwgb3B0aW9ucyk7XG4gICAgICBwcm9taXNlLnRoZW4oY2hvb3NlUmV0dXJuVmFsdWVGcm9tQ29sbGVjdGlvblJlc3VsdCk7XG4gICAgICBwcm9taXNlLnN0dWJQcm9taXNlID0gcHJvbWlzZS5zdHViUHJvbWlzZS50aGVuKGNob29zZVJldHVyblZhbHVlRnJvbUNvbGxlY3Rpb25SZXN1bHQpO1xuICAgICAgcHJvbWlzZS5zZXJ2ZXJQcm9taXNlID0gcHJvbWlzZS5zZXJ2ZXJQcm9taXNlLnRoZW4oY2hvb3NlUmV0dXJuVmFsdWVGcm9tQ29sbGVjdGlvblJlc3VsdCk7XG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9XG5cbiAgICAvLyBpdCdzIG15IGNvbGxlY3Rpb24uICBkZXNjZW5kIGludG8gdGhlIGNvbGxlY3Rpb24gb2JqZWN0XG4gICAgLy8gYW5kIHByb3BhZ2F0ZSBhbnkgZXhjZXB0aW9uLlxuICAgIHJldHVybiB0aGlzLl9jb2xsZWN0aW9uLmluc2VydEFzeW5jKGRvYylcbiAgICAgIC50aGVuKGNob29zZVJldHVyblZhbHVlRnJvbUNvbGxlY3Rpb25SZXN1bHQpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBJbnNlcnQgYSBkb2N1bWVudCBpbiB0aGUgY29sbGVjdGlvbi4gIFJldHVybnMgYSBwcm9taXNlIHRoYXQgd2lsbCByZXR1cm4gdGhlIGRvY3VtZW50J3MgdW5pcXVlIF9pZCB3aGVuIHNvbHZlZC5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgIGluc2VydFxuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtPYmplY3R9IGRvYyBUaGUgZG9jdW1lbnQgdG8gaW5zZXJ0LiBNYXkgbm90IHlldCBoYXZlIGFuIF9pZCBhdHRyaWJ1dGUsIGluIHdoaWNoIGNhc2UgTWV0ZW9yIHdpbGwgZ2VuZXJhdGUgb25lIGZvciB5b3UuXG4gICAqL1xuICBpbnNlcnRBc3luYyhkb2MsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gdGhpcy5faW5zZXJ0QXN5bmMoZG9jLCBvcHRpb25zKTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBNb2RpZnkgb25lIG9yIG1vcmUgZG9jdW1lbnRzIGluIHRoZSBjb2xsZWN0aW9uLiBSZXR1cm5zIHRoZSBudW1iZXIgb2YgbWF0Y2hlZCBkb2N1bWVudHMuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWV0aG9kIHVwZGF0ZVxuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtNb25nb1NlbGVjdG9yfSBzZWxlY3RvciBTcGVjaWZpZXMgd2hpY2ggZG9jdW1lbnRzIHRvIG1vZGlmeVxuICAgKiBAcGFyYW0ge01vbmdvTW9kaWZpZXJ9IG1vZGlmaWVyIFNwZWNpZmllcyBob3cgdG8gbW9kaWZ5IHRoZSBkb2N1bWVudHNcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMubXVsdGkgVHJ1ZSB0byBtb2RpZnkgYWxsIG1hdGNoaW5nIGRvY3VtZW50czsgZmFsc2UgdG8gb25seSBtb2RpZnkgb25lIG9mIHRoZSBtYXRjaGluZyBkb2N1bWVudHMgKHRoZSBkZWZhdWx0KS5cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLnVwc2VydCBUcnVlIHRvIGluc2VydCBhIGRvY3VtZW50IGlmIG5vIG1hdGNoaW5nIGRvY3VtZW50cyBhcmUgZm91bmQuXG4gICAqIEBwYXJhbSB7QXJyYXl9IG9wdGlvbnMuYXJyYXlGaWx0ZXJzIE9wdGlvbmFsLiBVc2VkIGluIGNvbWJpbmF0aW9uIHdpdGggTW9uZ29EQiBbZmlsdGVyZWQgcG9zaXRpb25hbCBvcGVyYXRvcl0oaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL21hbnVhbC9yZWZlcmVuY2Uvb3BlcmF0b3IvdXBkYXRlL3Bvc2l0aW9uYWwtZmlsdGVyZWQvKSB0byBzcGVjaWZ5IHdoaWNoIGVsZW1lbnRzIHRvIG1vZGlmeSBpbiBhbiBhcnJheSBmaWVsZC5cbiAgICovXG4gIHVwZGF0ZUFzeW5jKHNlbGVjdG9yLCBtb2RpZmllciwgLi4ub3B0aW9uc0FuZENhbGxiYWNrKSB7XG5cbiAgICAvLyBXZSd2ZSBhbHJlYWR5IHBvcHBlZCBvZmYgdGhlIGNhbGxiYWNrLCBzbyB3ZSBhcmUgbGVmdCB3aXRoIGFuIGFycmF5XG4gICAgLy8gb2Ygb25lIG9yIHplcm8gaXRlbXNcbiAgICBjb25zdCBvcHRpb25zID0geyAuLi4ob3B0aW9uc0FuZENhbGxiYWNrWzBdIHx8IG51bGwpIH07XG4gICAgbGV0IGluc2VydGVkSWQ7XG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy51cHNlcnQpIHtcbiAgICAgIC8vIHNldCBgaW5zZXJ0ZWRJZGAgaWYgYWJzZW50LiAgYGluc2VydGVkSWRgIGlzIGEgTWV0ZW9yIGV4dGVuc2lvbi5cbiAgICAgIGlmIChvcHRpb25zLmluc2VydGVkSWQpIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgICEoXG4gICAgICAgICAgICB0eXBlb2Ygb3B0aW9ucy5pbnNlcnRlZElkID09PSAnc3RyaW5nJyB8fFxuICAgICAgICAgICAgb3B0aW9ucy5pbnNlcnRlZElkIGluc3RhbmNlb2YgTW9uZ28uT2JqZWN0SURcbiAgICAgICAgICApXG4gICAgICAgIClcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2luc2VydGVkSWQgbXVzdCBiZSBzdHJpbmcgb3IgT2JqZWN0SUQnKTtcbiAgICAgICAgaW5zZXJ0ZWRJZCA9IG9wdGlvbnMuaW5zZXJ0ZWRJZDtcbiAgICAgIH0gZWxzZSBpZiAoIXNlbGVjdG9yIHx8ICFzZWxlY3Rvci5faWQpIHtcbiAgICAgICAgaW5zZXJ0ZWRJZCA9IHRoaXMuX21ha2VOZXdJRCgpO1xuICAgICAgICBvcHRpb25zLmdlbmVyYXRlZElkID0gdHJ1ZTtcbiAgICAgICAgb3B0aW9ucy5pbnNlcnRlZElkID0gaW5zZXJ0ZWRJZDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBzZWxlY3RvciA9IE1vbmdvLkNvbGxlY3Rpb24uX3Jld3JpdGVTZWxlY3RvcihzZWxlY3Rvciwge1xuICAgICAgZmFsbGJhY2tJZDogaW5zZXJ0ZWRJZCxcbiAgICB9KTtcblxuICAgIGlmICh0aGlzLl9pc1JlbW90ZUNvbGxlY3Rpb24oKSkge1xuICAgICAgY29uc3QgYXJncyA9IFtzZWxlY3RvciwgbW9kaWZpZXIsIG9wdGlvbnNdO1xuXG4gICAgICByZXR1cm4gdGhpcy5fY2FsbE11dGF0b3JNZXRob2RBc3luYygndXBkYXRlQXN5bmMnLCBhcmdzLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvLyBpdCdzIG15IGNvbGxlY3Rpb24uICBkZXNjZW5kIGludG8gdGhlIGNvbGxlY3Rpb24gb2JqZWN0XG4gICAgLy8gYW5kIHByb3BhZ2F0ZSBhbnkgZXhjZXB0aW9uLlxuICAgIC8vIElmIHRoZSB1c2VyIHByb3ZpZGVkIGEgY2FsbGJhY2sgYW5kIHRoZSBjb2xsZWN0aW9uIGltcGxlbWVudHMgdGhpc1xuICAgIC8vIG9wZXJhdGlvbiBhc3luY2hyb25vdXNseSwgdGhlbiBxdWVyeVJldCB3aWxsIGJlIHVuZGVmaW5lZCwgYW5kIHRoZVxuICAgIC8vIHJlc3VsdCB3aWxsIGJlIHJldHVybmVkIHRocm91Z2ggdGhlIGNhbGxiYWNrIGluc3RlYWQuXG5cbiAgICByZXR1cm4gdGhpcy5fY29sbGVjdGlvbi51cGRhdGVBc3luYyhcbiAgICAgIHNlbGVjdG9yLFxuICAgICAgbW9kaWZpZXIsXG4gICAgICBvcHRpb25zXG4gICAgKTtcbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgQXN5bmNocm9ub3VzbHkgcmVtb3ZlcyBkb2N1bWVudHMgZnJvbSB0aGUgY29sbGVjdGlvbi5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgcmVtb3ZlXG4gICAqIEBtZW1iZXJvZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge01vbmdvU2VsZWN0b3J9IHNlbGVjdG9yIFNwZWNpZmllcyB3aGljaCBkb2N1bWVudHMgdG8gcmVtb3ZlXG4gICAqL1xuICByZW1vdmVBc3luYyhzZWxlY3Rvciwgb3B0aW9ucyA9IHt9KSB7XG4gICAgc2VsZWN0b3IgPSBNb25nby5Db2xsZWN0aW9uLl9yZXdyaXRlU2VsZWN0b3Ioc2VsZWN0b3IpO1xuXG4gICAgaWYgKHRoaXMuX2lzUmVtb3RlQ29sbGVjdGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5fY2FsbE11dGF0b3JNZXRob2RBc3luYygncmVtb3ZlQXN5bmMnLCBbc2VsZWN0b3JdLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvLyBpdCdzIG15IGNvbGxlY3Rpb24uICBkZXNjZW5kIGludG8gdGhlIGNvbGxlY3Rpb24xIG9iamVjdFxuICAgIC8vIGFuZCBwcm9wYWdhdGUgYW55IGV4Y2VwdGlvbi5cbiAgICByZXR1cm4gdGhpcy5fY29sbGVjdGlvbi5yZW1vdmVBc3luYyhzZWxlY3Rvcik7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IEFzeW5jaHJvbm91c2x5IG1vZGlmaWVzIG9uZSBvciBtb3JlIGRvY3VtZW50cyBpbiB0aGUgY29sbGVjdGlvbiwgb3IgaW5zZXJ0IG9uZSBpZiBubyBtYXRjaGluZyBkb2N1bWVudHMgd2VyZSBmb3VuZC4gUmV0dXJucyBhbiBvYmplY3Qgd2l0aCBrZXlzIGBudW1iZXJBZmZlY3RlZGAgKHRoZSBudW1iZXIgb2YgZG9jdW1lbnRzIG1vZGlmaWVkKSAgYW5kIGBpbnNlcnRlZElkYCAodGhlIHVuaXF1ZSBfaWQgb2YgdGhlIGRvY3VtZW50IHRoYXQgd2FzIGluc2VydGVkLCBpZiBhbnkpLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1ldGhvZCB1cHNlcnRcbiAgICogQG1lbWJlcm9mIE1vbmdvLkNvbGxlY3Rpb25cbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7TW9uZ29TZWxlY3Rvcn0gc2VsZWN0b3IgU3BlY2lmaWVzIHdoaWNoIGRvY3VtZW50cyB0byBtb2RpZnlcbiAgICogQHBhcmFtIHtNb25nb01vZGlmaWVyfSBtb2RpZmllciBTcGVjaWZpZXMgaG93IHRvIG1vZGlmeSB0aGUgZG9jdW1lbnRzXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLm11bHRpIFRydWUgdG8gbW9kaWZ5IGFsbCBtYXRjaGluZyBkb2N1bWVudHM7IGZhbHNlIHRvIG9ubHkgbW9kaWZ5IG9uZSBvZiB0aGUgbWF0Y2hpbmcgZG9jdW1lbnRzICh0aGUgZGVmYXVsdCkuXG4gICAqL1xuICBhc3luYyB1cHNlcnRBc3luYyhzZWxlY3RvciwgbW9kaWZpZXIsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gdGhpcy51cGRhdGVBc3luYyhcbiAgICAgIHNlbGVjdG9yLFxuICAgICAgbW9kaWZpZXIsXG4gICAgICB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIF9yZXR1cm5PYmplY3Q6IHRydWUsXG4gICAgICAgIHVwc2VydDogdHJ1ZSxcbiAgICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBHZXRzIHRoZSBudW1iZXIgb2YgZG9jdW1lbnRzIG1hdGNoaW5nIHRoZSBmaWx0ZXIuIEZvciBhIGZhc3QgY291bnQgb2YgdGhlIHRvdGFsIGRvY3VtZW50cyBpbiBhIGNvbGxlY3Rpb24gc2VlIGBlc3RpbWF0ZWREb2N1bWVudENvdW50YC5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgY291bnREb2N1bWVudHNcbiAgICogQG1lbWJlcm9mIE1vbmdvLkNvbGxlY3Rpb25cbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7TW9uZ29TZWxlY3Rvcn0gW3NlbGVjdG9yXSBBIHF1ZXJ5IGRlc2NyaWJpbmcgdGhlIGRvY3VtZW50cyB0byBjb3VudFxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIEFsbCBvcHRpb25zIGFyZSBsaXN0ZWQgaW4gW01vbmdvREIgZG9jdW1lbnRhdGlvbl0oaHR0cHM6Ly9tb25nb2RiLmdpdGh1Yi5pby9ub2RlLW1vbmdvZGItbmF0aXZlLzQuMTEvaW50ZXJmYWNlcy9Db3VudERvY3VtZW50c09wdGlvbnMuaHRtbCkuIFBsZWFzZSBub3RlIHRoYXQgbm90IGFsbCBvZiB0aGVtIGFyZSBhdmFpbGFibGUgb24gdGhlIGNsaWVudC5cbiAgICogQHJldHVybnMge1Byb21pc2U8bnVtYmVyPn1cbiAgICovXG4gIGNvdW50RG9jdW1lbnRzKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy5fY29sbGVjdGlvbi5jb3VudERvY3VtZW50cyguLi5hcmdzKTtcbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgR2V0cyBhbiBlc3RpbWF0ZSBvZiB0aGUgY291bnQgb2YgZG9jdW1lbnRzIGluIGEgY29sbGVjdGlvbiB1c2luZyBjb2xsZWN0aW9uIG1ldGFkYXRhLiBGb3IgYW4gZXhhY3QgY291bnQgb2YgdGhlIGRvY3VtZW50cyBpbiBhIGNvbGxlY3Rpb24gc2VlIGBjb3VudERvY3VtZW50c2AuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWV0aG9kIGVzdGltYXRlZERvY3VtZW50Q291bnRcbiAgICogQG1lbWJlcm9mIE1vbmdvLkNvbGxlY3Rpb25cbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gQWxsIG9wdGlvbnMgYXJlIGxpc3RlZCBpbiBbTW9uZ29EQiBkb2N1bWVudGF0aW9uXShodHRwczovL21vbmdvZGIuZ2l0aHViLmlvL25vZGUtbW9uZ29kYi1uYXRpdmUvNC4xMS9pbnRlcmZhY2VzL0VzdGltYXRlZERvY3VtZW50Q291bnRPcHRpb25zLmh0bWwpLiBQbGVhc2Ugbm90ZSB0aGF0IG5vdCBhbGwgb2YgdGhlbSBhcmUgYXZhaWxhYmxlIG9uIHRoZSBjbGllbnQuXG4gICAqIEByZXR1cm5zIHtQcm9taXNlPG51bWJlcj59XG4gICAqL1xuICBlc3RpbWF0ZWREb2N1bWVudENvdW50KC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy5fY29sbGVjdGlvbi5lc3RpbWF0ZWREb2N1bWVudENvdW50KC4uLmFyZ3MpO1xuICB9LFxufSIsImltcG9ydCB7IExvZyB9IGZyb20gJ21ldGVvci9sb2dnaW5nJztcblxuZXhwb3J0IGNvbnN0IEluZGV4TWV0aG9kcyA9IHtcbiAgLy8gV2UnbGwgYWN0dWFsbHkgZGVzaWduIGFuIGluZGV4IEFQSSBsYXRlci4gRm9yIG5vdywgd2UganVzdCBwYXNzIHRocm91Z2ggdG9cbiAgLy8gTW9uZ28ncywgYnV0IG1ha2UgaXQgc3luY2hyb25vdXMuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBBc3luY2hyb25vdXNseSBjcmVhdGVzIHRoZSBzcGVjaWZpZWQgaW5kZXggb24gdGhlIGNvbGxlY3Rpb24uXG4gICAqIEBsb2N1cyBzZXJ2ZXJcbiAgICogQG1ldGhvZCBlbnN1cmVJbmRleEFzeW5jXG4gICAqIEBkZXByZWNhdGVkIGluIDMuMFxuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtPYmplY3R9IGluZGV4IEEgZG9jdW1lbnQgdGhhdCBjb250YWlucyB0aGUgZmllbGQgYW5kIHZhbHVlIHBhaXJzIHdoZXJlIHRoZSBmaWVsZCBpcyB0aGUgaW5kZXgga2V5IGFuZCB0aGUgdmFsdWUgZGVzY3JpYmVzIHRoZSB0eXBlIG9mIGluZGV4IGZvciB0aGF0IGZpZWxkLiBGb3IgYW4gYXNjZW5kaW5nIGluZGV4IG9uIGEgZmllbGQsIHNwZWNpZnkgYSB2YWx1ZSBvZiBgMWA7IGZvciBkZXNjZW5kaW5nIGluZGV4LCBzcGVjaWZ5IGEgdmFsdWUgb2YgYC0xYC4gVXNlIGB0ZXh0YCBmb3IgdGV4dCBpbmRleGVzLlxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIEFsbCBvcHRpb25zIGFyZSBsaXN0ZWQgaW4gW01vbmdvREIgZG9jdW1lbnRhdGlvbl0oaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL21hbnVhbC9yZWZlcmVuY2UvbWV0aG9kL2RiLmNvbGxlY3Rpb24uY3JlYXRlSW5kZXgvI29wdGlvbnMpXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRpb25zLm5hbWUgTmFtZSBvZiB0aGUgaW5kZXhcbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLnVuaXF1ZSBEZWZpbmUgdGhhdCB0aGUgaW5kZXggdmFsdWVzIG11c3QgYmUgdW5pcXVlLCBtb3JlIGF0IFtNb25nb0RCIGRvY3VtZW50YXRpb25dKGh0dHBzOi8vZG9jcy5tb25nb2RiLmNvbS9tYW51YWwvY29yZS9pbmRleC11bmlxdWUvKVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMuc3BhcnNlIERlZmluZSB0aGF0IHRoZSBpbmRleCBpcyBzcGFyc2UsIG1vcmUgYXQgW01vbmdvREIgZG9jdW1lbnRhdGlvbl0oaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL21hbnVhbC9jb3JlL2luZGV4LXNwYXJzZS8pXG4gICAqL1xuICBhc3luYyBlbnN1cmVJbmRleEFzeW5jKGluZGV4LCBvcHRpb25zKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICghc2VsZi5fY29sbGVjdGlvbi5lbnN1cmVJbmRleEFzeW5jIHx8ICFzZWxmLl9jb2xsZWN0aW9uLmNyZWF0ZUluZGV4QXN5bmMpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbiBvbmx5IGNhbGwgY3JlYXRlSW5kZXhBc3luYyBvbiBzZXJ2ZXIgY29sbGVjdGlvbnMnKTtcbiAgICBpZiAoc2VsZi5fY29sbGVjdGlvbi5jcmVhdGVJbmRleEFzeW5jKSB7XG4gICAgICBhd2FpdCBzZWxmLl9jb2xsZWN0aW9uLmNyZWF0ZUluZGV4QXN5bmMoaW5kZXgsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBMb2cuZGVidWcoYGVuc3VyZUluZGV4QXN5bmMgaGFzIGJlZW4gZGVwcmVjYXRlZCwgcGxlYXNlIHVzZSB0aGUgbmV3ICdjcmVhdGVJbmRleEFzeW5jJyBpbnN0ZWFkJHsgb3B0aW9ucz8ubmFtZSA/IGAsIGluZGV4IG5hbWU6ICR7IG9wdGlvbnMubmFtZSB9YCA6IGAsIGluZGV4OiAkeyBKU09OLnN0cmluZ2lmeShpbmRleCkgfWAgfWApXG4gICAgICBhd2FpdCBzZWxmLl9jb2xsZWN0aW9uLmVuc3VyZUluZGV4QXN5bmMoaW5kZXgsIG9wdGlvbnMpO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgQXN5bmNocm9ub3VzbHkgY3JlYXRlcyB0aGUgc3BlY2lmaWVkIGluZGV4IG9uIHRoZSBjb2xsZWN0aW9uLlxuICAgKiBAbG9jdXMgc2VydmVyXG4gICAqIEBtZXRob2QgY3JlYXRlSW5kZXhBc3luY1xuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtPYmplY3R9IGluZGV4IEEgZG9jdW1lbnQgdGhhdCBjb250YWlucyB0aGUgZmllbGQgYW5kIHZhbHVlIHBhaXJzIHdoZXJlIHRoZSBmaWVsZCBpcyB0aGUgaW5kZXgga2V5IGFuZCB0aGUgdmFsdWUgZGVzY3JpYmVzIHRoZSB0eXBlIG9mIGluZGV4IGZvciB0aGF0IGZpZWxkLiBGb3IgYW4gYXNjZW5kaW5nIGluZGV4IG9uIGEgZmllbGQsIHNwZWNpZnkgYSB2YWx1ZSBvZiBgMWA7IGZvciBkZXNjZW5kaW5nIGluZGV4LCBzcGVjaWZ5IGEgdmFsdWUgb2YgYC0xYC4gVXNlIGB0ZXh0YCBmb3IgdGV4dCBpbmRleGVzLlxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIEFsbCBvcHRpb25zIGFyZSBsaXN0ZWQgaW4gW01vbmdvREIgZG9jdW1lbnRhdGlvbl0oaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL21hbnVhbC9yZWZlcmVuY2UvbWV0aG9kL2RiLmNvbGxlY3Rpb24uY3JlYXRlSW5kZXgvI29wdGlvbnMpXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRpb25zLm5hbWUgTmFtZSBvZiB0aGUgaW5kZXhcbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLnVuaXF1ZSBEZWZpbmUgdGhhdCB0aGUgaW5kZXggdmFsdWVzIG11c3QgYmUgdW5pcXVlLCBtb3JlIGF0IFtNb25nb0RCIGRvY3VtZW50YXRpb25dKGh0dHBzOi8vZG9jcy5tb25nb2RiLmNvbS9tYW51YWwvY29yZS9pbmRleC11bmlxdWUvKVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMuc3BhcnNlIERlZmluZSB0aGF0IHRoZSBpbmRleCBpcyBzcGFyc2UsIG1vcmUgYXQgW01vbmdvREIgZG9jdW1lbnRhdGlvbl0oaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL21hbnVhbC9jb3JlL2luZGV4LXNwYXJzZS8pXG4gICAqL1xuICBhc3luYyBjcmVhdGVJbmRleEFzeW5jKGluZGV4LCBvcHRpb25zKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICghc2VsZi5fY29sbGVjdGlvbi5jcmVhdGVJbmRleEFzeW5jKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW4gb25seSBjYWxsIGNyZWF0ZUluZGV4QXN5bmMgb24gc2VydmVyIGNvbGxlY3Rpb25zJyk7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgc2VsZi5fY29sbGVjdGlvbi5jcmVhdGVJbmRleEFzeW5jKGluZGV4LCBvcHRpb25zKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoXG4gICAgICAgIGUubWVzc2FnZS5pbmNsdWRlcyhcbiAgICAgICAgICAnQW4gZXF1aXZhbGVudCBpbmRleCBhbHJlYWR5IGV4aXN0cyB3aXRoIHRoZSBzYW1lIG5hbWUgYnV0IGRpZmZlcmVudCBvcHRpb25zLidcbiAgICAgICAgKSAmJlxuICAgICAgICBNZXRlb3Iuc2V0dGluZ3M/LnBhY2thZ2VzPy5tb25nbz8ucmVDcmVhdGVJbmRleE9uT3B0aW9uTWlzbWF0Y2hcbiAgICAgICkge1xuICAgICAgICBMb2cuaW5mbyhgUmUtY3JlYXRpbmcgaW5kZXggJHsgaW5kZXggfSBmb3IgJHsgc2VsZi5fbmFtZSB9IGR1ZSB0byBvcHRpb25zIG1pc21hdGNoLmApO1xuICAgICAgICBhd2FpdCBzZWxmLl9jb2xsZWN0aW9uLmRyb3BJbmRleEFzeW5jKGluZGV4KTtcbiAgICAgICAgYXdhaXQgc2VsZi5fY29sbGVjdGlvbi5jcmVhdGVJbmRleEFzeW5jKGluZGV4LCBvcHRpb25zKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoYEFuIGVycm9yIG9jY3VycmVkIHdoZW4gY3JlYXRpbmcgYW4gaW5kZXggZm9yIGNvbGxlY3Rpb24gXCIkeyBzZWxmLl9uYW1lIH06ICR7IGUubWVzc2FnZSB9YCk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBBc3luY2hyb25vdXNseSBjcmVhdGVzIHRoZSBzcGVjaWZpZWQgaW5kZXggb24gdGhlIGNvbGxlY3Rpb24uXG4gICAqIEBsb2N1cyBzZXJ2ZXJcbiAgICogQG1ldGhvZCBjcmVhdGVJbmRleFxuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtPYmplY3R9IGluZGV4IEEgZG9jdW1lbnQgdGhhdCBjb250YWlucyB0aGUgZmllbGQgYW5kIHZhbHVlIHBhaXJzIHdoZXJlIHRoZSBmaWVsZCBpcyB0aGUgaW5kZXgga2V5IGFuZCB0aGUgdmFsdWUgZGVzY3JpYmVzIHRoZSB0eXBlIG9mIGluZGV4IGZvciB0aGF0IGZpZWxkLiBGb3IgYW4gYXNjZW5kaW5nIGluZGV4IG9uIGEgZmllbGQsIHNwZWNpZnkgYSB2YWx1ZSBvZiBgMWA7IGZvciBkZXNjZW5kaW5nIGluZGV4LCBzcGVjaWZ5IGEgdmFsdWUgb2YgYC0xYC4gVXNlIGB0ZXh0YCBmb3IgdGV4dCBpbmRleGVzLlxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIEFsbCBvcHRpb25zIGFyZSBsaXN0ZWQgaW4gW01vbmdvREIgZG9jdW1lbnRhdGlvbl0oaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL21hbnVhbC9yZWZlcmVuY2UvbWV0aG9kL2RiLmNvbGxlY3Rpb24uY3JlYXRlSW5kZXgvI29wdGlvbnMpXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRpb25zLm5hbWUgTmFtZSBvZiB0aGUgaW5kZXhcbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLnVuaXF1ZSBEZWZpbmUgdGhhdCB0aGUgaW5kZXggdmFsdWVzIG11c3QgYmUgdW5pcXVlLCBtb3JlIGF0IFtNb25nb0RCIGRvY3VtZW50YXRpb25dKGh0dHBzOi8vZG9jcy5tb25nb2RiLmNvbS9tYW51YWwvY29yZS9pbmRleC11bmlxdWUvKVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMuc3BhcnNlIERlZmluZSB0aGF0IHRoZSBpbmRleCBpcyBzcGFyc2UsIG1vcmUgYXQgW01vbmdvREIgZG9jdW1lbnRhdGlvbl0oaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL21hbnVhbC9jb3JlL2luZGV4LXNwYXJzZS8pXG4gICAqL1xuICBjcmVhdGVJbmRleChpbmRleCwgb3B0aW9ucyl7XG4gICAgcmV0dXJuIHRoaXMuY3JlYXRlSW5kZXhBc3luYyhpbmRleCwgb3B0aW9ucyk7XG4gIH0sXG5cbiAgYXN5bmMgZHJvcEluZGV4QXN5bmMoaW5kZXgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCFzZWxmLl9jb2xsZWN0aW9uLmRyb3BJbmRleEFzeW5jKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW4gb25seSBjYWxsIGRyb3BJbmRleEFzeW5jIG9uIHNlcnZlciBjb2xsZWN0aW9ucycpO1xuICAgIGF3YWl0IHNlbGYuX2NvbGxlY3Rpb24uZHJvcEluZGV4QXN5bmMoaW5kZXgpO1xuICB9LFxufVxuIiwiZXhwb3J0IGNvbnN0IFJlcGxpY2F0aW9uTWV0aG9kcyA9IHtcbiAgYXN5bmMgX21heWJlU2V0VXBSZXBsaWNhdGlvbihuYW1lKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgaWYgKFxuICAgICAgIShcbiAgICAgICAgc2VsZi5fY29ubmVjdGlvbiAmJlxuICAgICAgICBzZWxmLl9jb25uZWN0aW9uLnJlZ2lzdGVyU3RvcmVDbGllbnQgJiZcbiAgICAgICAgc2VsZi5fY29ubmVjdGlvbi5yZWdpc3RlclN0b3JlU2VydmVyXG4gICAgICApXG4gICAgKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG5cbiAgICBjb25zdCB3cmFwcGVkU3RvcmVDb21tb24gPSB7XG4gICAgICAvLyBDYWxsZWQgYXJvdW5kIG1ldGhvZCBzdHViIGludm9jYXRpb25zIHRvIGNhcHR1cmUgdGhlIG9yaWdpbmFsIHZlcnNpb25zXG4gICAgICAvLyBvZiBtb2RpZmllZCBkb2N1bWVudHMuXG4gICAgICBzYXZlT3JpZ2luYWxzKCkge1xuICAgICAgICBzZWxmLl9jb2xsZWN0aW9uLnNhdmVPcmlnaW5hbHMoKTtcbiAgICAgIH0sXG4gICAgICByZXRyaWV2ZU9yaWdpbmFscygpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYuX2NvbGxlY3Rpb24ucmV0cmlldmVPcmlnaW5hbHMoKTtcbiAgICAgIH0sXG4gICAgICAvLyBUbyBiZSBhYmxlIHRvIGdldCBiYWNrIHRvIHRoZSBjb2xsZWN0aW9uIGZyb20gdGhlIHN0b3JlLlxuICAgICAgX2dldENvbGxlY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgfSxcbiAgICB9O1xuICAgIGNvbnN0IHdyYXBwZWRTdG9yZUNsaWVudCA9IHtcbiAgICAgIC8vIENhbGxlZCBhdCB0aGUgYmVnaW5uaW5nIG9mIGEgYmF0Y2ggb2YgdXBkYXRlcy4gYmF0Y2hTaXplIGlzIHRoZSBudW1iZXJcbiAgICAgIC8vIG9mIHVwZGF0ZSBjYWxscyB0byBleHBlY3QuXG4gICAgICAvL1xuICAgICAgLy8gWFhYIFRoaXMgaW50ZXJmYWNlIGlzIHByZXR0eSBqYW5reS4gcmVzZXQgcHJvYmFibHkgb3VnaHQgdG8gZ28gYmFjayB0b1xuICAgICAgLy8gYmVpbmcgaXRzIG93biBmdW5jdGlvbiwgYW5kIGNhbGxlcnMgc2hvdWxkbid0IGhhdmUgdG8gY2FsY3VsYXRlXG4gICAgICAvLyBiYXRjaFNpemUuIFRoZSBvcHRpbWl6YXRpb24gb2Ygbm90IGNhbGxpbmcgcGF1c2UvcmVtb3ZlIHNob3VsZCBiZVxuICAgICAgLy8gZGVsYXllZCB1bnRpbCBsYXRlcjogdGhlIGZpcnN0IGNhbGwgdG8gdXBkYXRlKCkgc2hvdWxkIGJ1ZmZlciBpdHNcbiAgICAgIC8vIG1lc3NhZ2UsIGFuZCB0aGVuIHdlIGNhbiBlaXRoZXIgZGlyZWN0bHkgYXBwbHkgaXQgYXQgZW5kVXBkYXRlIHRpbWUgaWZcbiAgICAgIC8vIGl0IHdhcyB0aGUgb25seSB1cGRhdGUsIG9yIGRvIHBhdXNlT2JzZXJ2ZXJzL2FwcGx5L2FwcGx5IGF0IHRoZSBuZXh0XG4gICAgICAvLyB1cGRhdGUoKSBpZiB0aGVyZSdzIGFub3RoZXIgb25lLlxuICAgICAgYXN5bmMgYmVnaW5VcGRhdGUoYmF0Y2hTaXplLCByZXNldCkge1xuICAgICAgICAvLyBwYXVzZSBvYnNlcnZlcnMgc28gdXNlcnMgZG9uJ3Qgc2VlIGZsaWNrZXIgd2hlbiB1cGRhdGluZyBzZXZlcmFsXG4gICAgICAgIC8vIG9iamVjdHMgYXQgb25jZSAoaW5jbHVkaW5nIHRoZSBwb3N0LXJlY29ubmVjdCByZXNldC1hbmQtcmVhcHBseVxuICAgICAgICAvLyBzdGFnZSksIGFuZCBzbyB0aGF0IGEgcmUtc29ydGluZyBvZiBhIHF1ZXJ5IGNhbiB0YWtlIGFkdmFudGFnZSBvZiB0aGVcbiAgICAgICAgLy8gZnVsbCBfZGlmZlF1ZXJ5IG1vdmVkIGNhbGN1bGF0aW9uIGluc3RlYWQgb2YgYXBwbHlpbmcgY2hhbmdlIG9uZSBhdCBhXG4gICAgICAgIC8vIHRpbWUuXG4gICAgICAgIGlmIChiYXRjaFNpemUgPiAxIHx8IHJlc2V0KSBzZWxmLl9jb2xsZWN0aW9uLnBhdXNlT2JzZXJ2ZXJzKCk7XG5cbiAgICAgICAgaWYgKHJlc2V0KSBhd2FpdCBzZWxmLl9jb2xsZWN0aW9uLnJlbW92ZSh7fSk7XG4gICAgICB9LFxuXG4gICAgICAvLyBBcHBseSBhbiB1cGRhdGUuXG4gICAgICAvLyBYWFggYmV0dGVyIHNwZWNpZnkgdGhpcyBpbnRlcmZhY2UgKG5vdCBpbiB0ZXJtcyBvZiBhIHdpcmUgbWVzc2FnZSk/XG4gICAgICB1cGRhdGUobXNnKSB7XG4gICAgICAgIHZhciBtb25nb0lkID0gTW9uZ29JRC5pZFBhcnNlKG1zZy5pZCk7XG4gICAgICAgIHZhciBkb2MgPSBzZWxmLl9jb2xsZWN0aW9uLl9kb2NzLmdldChtb25nb0lkKTtcblxuICAgICAgICAvL1doZW4gdGhlIHNlcnZlcidzIG1lcmdlYm94IGlzIGRpc2FibGVkIGZvciBhIGNvbGxlY3Rpb24sIHRoZSBjbGllbnQgbXVzdCBncmFjZWZ1bGx5IGhhbmRsZSBpdCB3aGVuOlxuICAgICAgICAvLyAqV2UgcmVjZWl2ZSBhbiBhZGRlZCBtZXNzYWdlIGZvciBhIGRvY3VtZW50IHRoYXQgaXMgYWxyZWFkeSB0aGVyZS4gSW5zdGVhZCwgaXQgd2lsbCBiZSBjaGFuZ2VkXG4gICAgICAgIC8vICpXZSByZWVpdmUgYSBjaGFuZ2UgbWVzc2FnZSBmb3IgYSBkb2N1bWVudCB0aGF0IGlzIG5vdCB0aGVyZS4gSW5zdGVhZCwgaXQgd2lsbCBiZSBhZGRlZFxuICAgICAgICAvLyAqV2UgcmVjZWl2ZSBhIHJlbW92ZWQgbWVzc3NhZ2UgZm9yIGEgZG9jdW1lbnQgdGhhdCBpcyBub3QgdGhlcmUuIEluc3RlYWQsIG5vdGluZyB3aWwgaGFwcGVuLlxuXG4gICAgICAgIC8vQ29kZSBpcyBkZXJpdmVkIGZyb20gY2xpZW50LXNpZGUgY29kZSBvcmlnaW5hbGx5IGluIHBlZXJsaWJyYXJ5OmNvbnRyb2wtbWVyZ2Vib3hcbiAgICAgICAgLy9odHRwczovL2dpdGh1Yi5jb20vcGVlcmxpYnJhcnkvbWV0ZW9yLWNvbnRyb2wtbWVyZ2Vib3gvYmxvYi9tYXN0ZXIvY2xpZW50LmNvZmZlZVxuXG4gICAgICAgIC8vRm9yIG1vcmUgaW5mb3JtYXRpb24sIHJlZmVyIHRvIGRpc2N1c3Npb24gXCJJbml0aWFsIHN1cHBvcnQgZm9yIHB1YmxpY2F0aW9uIHN0cmF0ZWdpZXMgaW4gbGl2ZWRhdGEgc2VydmVyXCI6XG4gICAgICAgIC8vaHR0cHM6Ly9naXRodWIuY29tL21ldGVvci9tZXRlb3IvcHVsbC8xMTE1MVxuICAgICAgICBpZiAoTWV0ZW9yLmlzQ2xpZW50KSB7XG4gICAgICAgICAgaWYgKG1zZy5tc2cgPT09ICdhZGRlZCcgJiYgZG9jKSB7XG4gICAgICAgICAgICBtc2cubXNnID0gJ2NoYW5nZWQnO1xuICAgICAgICAgIH0gZWxzZSBpZiAobXNnLm1zZyA9PT0gJ3JlbW92ZWQnICYmICFkb2MpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1zZy5tc2cgPT09ICdjaGFuZ2VkJyAmJiAhZG9jKSB7XG4gICAgICAgICAgICBtc2cubXNnID0gJ2FkZGVkJztcbiAgICAgICAgICAgIGNvbnN0IF9yZWYgPSBtc2cuZmllbGRzO1xuICAgICAgICAgICAgZm9yIChsZXQgZmllbGQgaW4gX3JlZikge1xuICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IF9yZWZbZmllbGRdO1xuICAgICAgICAgICAgICBpZiAodmFsdWUgPT09IHZvaWQgMCkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBtc2cuZmllbGRzW2ZpZWxkXTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBJcyB0aGlzIGEgXCJyZXBsYWNlIHRoZSB3aG9sZSBkb2NcIiBtZXNzYWdlIGNvbWluZyBmcm9tIHRoZSBxdWllc2NlbmNlXG4gICAgICAgIC8vIG9mIG1ldGhvZCB3cml0ZXMgdG8gYW4gb2JqZWN0PyAoTm90ZSB0aGF0ICd1bmRlZmluZWQnIGlzIGEgdmFsaWRcbiAgICAgICAgLy8gdmFsdWUgbWVhbmluZyBcInJlbW92ZSBpdFwiLilcbiAgICAgICAgaWYgKG1zZy5tc2cgPT09ICdyZXBsYWNlJykge1xuICAgICAgICAgIHZhciByZXBsYWNlID0gbXNnLnJlcGxhY2U7XG4gICAgICAgICAgaWYgKCFyZXBsYWNlKSB7XG4gICAgICAgICAgICBpZiAoZG9jKSBzZWxmLl9jb2xsZWN0aW9uLnJlbW92ZShtb25nb0lkKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKCFkb2MpIHtcbiAgICAgICAgICAgIHNlbGYuX2NvbGxlY3Rpb24uaW5zZXJ0KHJlcGxhY2UpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBYWFggY2hlY2sgdGhhdCByZXBsYWNlIGhhcyBubyAkIG9wc1xuICAgICAgICAgICAgc2VsZi5fY29sbGVjdGlvbi51cGRhdGUobW9uZ29JZCwgcmVwbGFjZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIGlmIChtc2cubXNnID09PSAnYWRkZWQnKSB7XG4gICAgICAgICAgaWYgKGRvYykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICAnRXhwZWN0ZWQgbm90IHRvIGZpbmQgYSBkb2N1bWVudCBhbHJlYWR5IHByZXNlbnQgZm9yIGFuIGFkZCdcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHNlbGYuX2NvbGxlY3Rpb24uaW5zZXJ0KHsgX2lkOiBtb25nb0lkLCAuLi5tc2cuZmllbGRzIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKG1zZy5tc2cgPT09ICdyZW1vdmVkJykge1xuICAgICAgICAgIGlmICghZG9jKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICAnRXhwZWN0ZWQgdG8gZmluZCBhIGRvY3VtZW50IGFscmVhZHkgcHJlc2VudCBmb3IgcmVtb3ZlZCdcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgc2VsZi5fY29sbGVjdGlvbi5yZW1vdmUobW9uZ29JZCk7XG4gICAgICAgIH0gZWxzZSBpZiAobXNnLm1zZyA9PT0gJ2NoYW5nZWQnKSB7XG4gICAgICAgICAgaWYgKCFkb2MpIHRocm93IG5ldyBFcnJvcignRXhwZWN0ZWQgdG8gZmluZCBhIGRvY3VtZW50IHRvIGNoYW5nZScpO1xuICAgICAgICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhtc2cuZmllbGRzKTtcbiAgICAgICAgICBpZiAoa2V5cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB2YXIgbW9kaWZpZXIgPSB7fTtcbiAgICAgICAgICAgIGtleXMuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IG1zZy5maWVsZHNba2V5XTtcbiAgICAgICAgICAgICAgaWYgKEVKU09OLmVxdWFscyhkb2Nba2V5XSwgdmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFtb2RpZmllci4kdW5zZXQpIHtcbiAgICAgICAgICAgICAgICAgIG1vZGlmaWVyLiR1bnNldCA9IHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBtb2RpZmllci4kdW5zZXRba2V5XSA9IDE7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCFtb2RpZmllci4kc2V0KSB7XG4gICAgICAgICAgICAgICAgICBtb2RpZmllci4kc2V0ID0ge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG1vZGlmaWVyLiRzZXRba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChPYmplY3Qua2V5cyhtb2RpZmllcikubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICBzZWxmLl9jb2xsZWN0aW9uLnVwZGF0ZShtb25nb0lkLCBtb2RpZmllcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkkgZG9uJ3Qga25vdyBob3cgdG8gZGVhbCB3aXRoIHRoaXMgbWVzc2FnZVwiKTtcbiAgICAgICAgfVxuICAgICAgfSxcblxuICAgICAgLy8gQ2FsbGVkIGF0IHRoZSBlbmQgb2YgYSBiYXRjaCBvZiB1cGRhdGVzLmxpdmVkYXRhX2Nvbm5lY3Rpb24uanM6MTI4N1xuICAgICAgZW5kVXBkYXRlKCkge1xuICAgICAgICBzZWxmLl9jb2xsZWN0aW9uLnJlc3VtZU9ic2VydmVyc0NsaWVudCgpO1xuICAgICAgfSxcblxuICAgICAgLy8gVXNlZCB0byBwcmVzZXJ2ZSBjdXJyZW50IHZlcnNpb25zIG9mIGRvY3VtZW50cyBhY3Jvc3MgYSBzdG9yZSByZXNldC5cbiAgICAgIGdldERvYyhpZCkge1xuICAgICAgICByZXR1cm4gc2VsZi5maW5kT25lKGlkKTtcbiAgICAgIH0sXG5cbiAgICAgIC4uLndyYXBwZWRTdG9yZUNvbW1vbixcbiAgICB9O1xuICAgIGNvbnN0IHdyYXBwZWRTdG9yZVNlcnZlciA9IHtcbiAgICAgIGFzeW5jIGJlZ2luVXBkYXRlKGJhdGNoU2l6ZSwgcmVzZXQpIHtcbiAgICAgICAgaWYgKGJhdGNoU2l6ZSA+IDEgfHwgcmVzZXQpIHNlbGYuX2NvbGxlY3Rpb24ucGF1c2VPYnNlcnZlcnMoKTtcblxuICAgICAgICBpZiAocmVzZXQpIGF3YWl0IHNlbGYuX2NvbGxlY3Rpb24ucmVtb3ZlQXN5bmMoe30pO1xuICAgICAgfSxcblxuICAgICAgYXN5bmMgdXBkYXRlKG1zZykge1xuICAgICAgICB2YXIgbW9uZ29JZCA9IE1vbmdvSUQuaWRQYXJzZShtc2cuaWQpO1xuICAgICAgICB2YXIgZG9jID0gc2VsZi5fY29sbGVjdGlvbi5fZG9jcy5nZXQobW9uZ29JZCk7XG5cbiAgICAgICAgLy8gSXMgdGhpcyBhIFwicmVwbGFjZSB0aGUgd2hvbGUgZG9jXCIgbWVzc2FnZSBjb21pbmcgZnJvbSB0aGUgcXVpZXNjZW5jZVxuICAgICAgICAvLyBvZiBtZXRob2Qgd3JpdGVzIHRvIGFuIG9iamVjdD8gKE5vdGUgdGhhdCAndW5kZWZpbmVkJyBpcyBhIHZhbGlkXG4gICAgICAgIC8vIHZhbHVlIG1lYW5pbmcgXCJyZW1vdmUgaXRcIi4pXG4gICAgICAgIGlmIChtc2cubXNnID09PSAncmVwbGFjZScpIHtcbiAgICAgICAgICB2YXIgcmVwbGFjZSA9IG1zZy5yZXBsYWNlO1xuICAgICAgICAgIGlmICghcmVwbGFjZSkge1xuICAgICAgICAgICAgaWYgKGRvYykgYXdhaXQgc2VsZi5fY29sbGVjdGlvbi5yZW1vdmVBc3luYyhtb25nb0lkKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKCFkb2MpIHtcbiAgICAgICAgICAgIGF3YWl0IHNlbGYuX2NvbGxlY3Rpb24uaW5zZXJ0QXN5bmMocmVwbGFjZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFhYWCBjaGVjayB0aGF0IHJlcGxhY2UgaGFzIG5vICQgb3BzXG4gICAgICAgICAgICBhd2FpdCBzZWxmLl9jb2xsZWN0aW9uLnVwZGF0ZUFzeW5jKG1vbmdvSWQsIHJlcGxhY2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSBpZiAobXNnLm1zZyA9PT0gJ2FkZGVkJykge1xuICAgICAgICAgIGlmIChkb2MpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgJ0V4cGVjdGVkIG5vdCB0byBmaW5kIGEgZG9jdW1lbnQgYWxyZWFkeSBwcmVzZW50IGZvciBhbiBhZGQnXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBhd2FpdCBzZWxmLl9jb2xsZWN0aW9uLmluc2VydEFzeW5jKHsgX2lkOiBtb25nb0lkLCAuLi5tc2cuZmllbGRzIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKG1zZy5tc2cgPT09ICdyZW1vdmVkJykge1xuICAgICAgICAgIGlmICghZG9jKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICAnRXhwZWN0ZWQgdG8gZmluZCBhIGRvY3VtZW50IGFscmVhZHkgcHJlc2VudCBmb3IgcmVtb3ZlZCdcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgYXdhaXQgc2VsZi5fY29sbGVjdGlvbi5yZW1vdmVBc3luYyhtb25nb0lkKTtcbiAgICAgICAgfSBlbHNlIGlmIChtc2cubXNnID09PSAnY2hhbmdlZCcpIHtcbiAgICAgICAgICBpZiAoIWRvYykgdGhyb3cgbmV3IEVycm9yKCdFeHBlY3RlZCB0byBmaW5kIGEgZG9jdW1lbnQgdG8gY2hhbmdlJyk7XG4gICAgICAgICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKG1zZy5maWVsZHMpO1xuICAgICAgICAgIGlmIChrZXlzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHZhciBtb2RpZmllciA9IHt9O1xuICAgICAgICAgICAga2V5cy5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gbXNnLmZpZWxkc1trZXldO1xuICAgICAgICAgICAgICBpZiAoRUpTT04uZXF1YWxzKGRvY1trZXldLCB2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW1vZGlmaWVyLiR1bnNldCkge1xuICAgICAgICAgICAgICAgICAgbW9kaWZpZXIuJHVuc2V0ID0ge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG1vZGlmaWVyLiR1bnNldFtrZXldID0gMTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIW1vZGlmaWVyLiRzZXQpIHtcbiAgICAgICAgICAgICAgICAgIG1vZGlmaWVyLiRzZXQgPSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbW9kaWZpZXIuJHNldFtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKE9iamVjdC5rZXlzKG1vZGlmaWVyKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgIGF3YWl0IHNlbGYuX2NvbGxlY3Rpb24udXBkYXRlQXN5bmMobW9uZ29JZCwgbW9kaWZpZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJIGRvbid0IGtub3cgaG93IHRvIGRlYWwgd2l0aCB0aGlzIG1lc3NhZ2VcIik7XG4gICAgICAgIH1cbiAgICAgIH0sXG5cbiAgICAgIC8vIENhbGxlZCBhdCB0aGUgZW5kIG9mIGEgYmF0Y2ggb2YgdXBkYXRlcy5cbiAgICAgIGFzeW5jIGVuZFVwZGF0ZSgpIHtcbiAgICAgICAgYXdhaXQgc2VsZi5fY29sbGVjdGlvbi5yZXN1bWVPYnNlcnZlcnNTZXJ2ZXIoKTtcbiAgICAgIH0sXG5cbiAgICAgIC8vIFVzZWQgdG8gcHJlc2VydmUgY3VycmVudCB2ZXJzaW9ucyBvZiBkb2N1bWVudHMgYWNyb3NzIGEgc3RvcmUgcmVzZXQuXG4gICAgICBhc3luYyBnZXREb2MoaWQpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYuZmluZE9uZUFzeW5jKGlkKTtcbiAgICAgIH0sXG4gICAgICAuLi53cmFwcGVkU3RvcmVDb21tb24sXG4gICAgfTtcblxuXG4gICAgLy8gT0ssIHdlJ3JlIGdvaW5nIHRvIGJlIGEgc2xhdmUsIHJlcGxpY2F0aW5nIHNvbWUgcmVtb3RlXG4gICAgLy8gZGF0YWJhc2UsIGV4Y2VwdCBwb3NzaWJseSB3aXRoIHNvbWUgdGVtcG9yYXJ5IGRpdmVyZ2VuY2Ugd2hpbGVcbiAgICAvLyB3ZSBoYXZlIHVuYWNrbm93bGVkZ2VkIFJQQydzLlxuICAgIGxldCByZWdpc3RlclN0b3JlUmVzdWx0O1xuICAgIGlmIChNZXRlb3IuaXNDbGllbnQpIHtcbiAgICAgIHJlZ2lzdGVyU3RvcmVSZXN1bHQgPSBzZWxmLl9jb25uZWN0aW9uLnJlZ2lzdGVyU3RvcmVDbGllbnQoXG4gICAgICAgIG5hbWUsXG4gICAgICAgIHdyYXBwZWRTdG9yZUNsaWVudFxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVnaXN0ZXJTdG9yZVJlc3VsdCA9IHNlbGYuX2Nvbm5lY3Rpb24ucmVnaXN0ZXJTdG9yZVNlcnZlcihcbiAgICAgICAgbmFtZSxcbiAgICAgICAgd3JhcHBlZFN0b3JlU2VydmVyXG4gICAgICApO1xuICAgIH1cblxuICAgIGNvbnN0IG1lc3NhZ2UgPSBgVGhlcmUgaXMgYWxyZWFkeSBhIGNvbGxlY3Rpb24gbmFtZWQgXCIke25hbWV9XCJgO1xuICAgIGNvbnN0IGxvZ1dhcm4gPSAoKSA9PiB7XG4gICAgICBjb25zb2xlLndhcm4gPyBjb25zb2xlLndhcm4obWVzc2FnZSkgOiBjb25zb2xlLmxvZyhtZXNzYWdlKTtcbiAgICB9O1xuXG4gICAgaWYgKCFyZWdpc3RlclN0b3JlUmVzdWx0KSB7XG4gICAgICByZXR1cm4gbG9nV2FybigpO1xuICAgIH1cblxuICAgIHJldHVybiByZWdpc3RlclN0b3JlUmVzdWx0Py50aGVuPy4ob2sgPT4ge1xuICAgICAgaWYgKCFvaykge1xuICAgICAgICBsb2dXYXJuKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG59IiwiZXhwb3J0IGNvbnN0IFN5bmNNZXRob2RzID0ge1xuICAvKipcbiAgICogQHN1bW1hcnkgRmluZCB0aGUgZG9jdW1lbnRzIGluIGEgY29sbGVjdGlvbiB0aGF0IG1hdGNoIHRoZSBzZWxlY3Rvci5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgZmluZFxuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtNb25nb1NlbGVjdG9yfSBbc2VsZWN0b3JdIEEgcXVlcnkgZGVzY3JpYmluZyB0aGUgZG9jdW1lbnRzIHRvIGZpbmRcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICAgKiBAcGFyYW0ge01vbmdvU29ydFNwZWNpZmllcn0gb3B0aW9ucy5zb3J0IFNvcnQgb3JkZXIgKGRlZmF1bHQ6IG5hdHVyYWwgb3JkZXIpXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRpb25zLnNraXAgTnVtYmVyIG9mIHJlc3VsdHMgdG8gc2tpcCBhdCB0aGUgYmVnaW5uaW5nXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRpb25zLmxpbWl0IE1heGltdW0gbnVtYmVyIG9mIHJlc3VsdHMgdG8gcmV0dXJuXG4gICAqIEBwYXJhbSB7TW9uZ29GaWVsZFNwZWNpZmllcn0gb3B0aW9ucy5maWVsZHMgRGljdGlvbmFyeSBvZiBmaWVsZHMgdG8gcmV0dXJuIG9yIGV4Y2x1ZGUuXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5yZWFjdGl2ZSAoQ2xpZW50IG9ubHkpIERlZmF1bHQgYHRydWVgOyBwYXNzIGBmYWxzZWAgdG8gZGlzYWJsZSByZWFjdGl2aXR5XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IG9wdGlvbnMudHJhbnNmb3JtIE92ZXJyaWRlcyBgdHJhbnNmb3JtYCBvbiB0aGUgIFtgQ29sbGVjdGlvbmBdKCNjb2xsZWN0aW9ucykgZm9yIHRoaXMgY3Vyc29yLiAgUGFzcyBgbnVsbGAgdG8gZGlzYWJsZSB0cmFuc2Zvcm1hdGlvbi5cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLmRpc2FibGVPcGxvZyAoU2VydmVyIG9ubHkpIFBhc3MgdHJ1ZSB0byBkaXNhYmxlIG9wbG9nLXRhaWxpbmcgb24gdGhpcyBxdWVyeS4gVGhpcyBhZmZlY3RzIHRoZSB3YXkgc2VydmVyIHByb2Nlc3NlcyBjYWxscyB0byBgb2JzZXJ2ZWAgb24gdGhpcyBxdWVyeS4gRGlzYWJsaW5nIHRoZSBvcGxvZyBjYW4gYmUgdXNlZnVsIHdoZW4gd29ya2luZyB3aXRoIGRhdGEgdGhhdCB1cGRhdGVzIGluIGxhcmdlIGJhdGNoZXMuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRpb25zLnBvbGxpbmdJbnRlcnZhbE1zIChTZXJ2ZXIgb25seSkgV2hlbiBvcGxvZyBpcyBkaXNhYmxlZCAodGhyb3VnaCB0aGUgdXNlIG9mIGBkaXNhYmxlT3Bsb2dgIG9yIHdoZW4gb3RoZXJ3aXNlIG5vdCBhdmFpbGFibGUpLCB0aGUgZnJlcXVlbmN5IChpbiBtaWxsaXNlY29uZHMpIG9mIGhvdyBvZnRlbiB0byBwb2xsIHRoaXMgcXVlcnkgd2hlbiBvYnNlcnZpbmcgb24gdGhlIHNlcnZlci4gRGVmYXVsdHMgdG8gMTAwMDBtcyAoMTAgc2Vjb25kcykuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRpb25zLnBvbGxpbmdUaHJvdHRsZU1zIChTZXJ2ZXIgb25seSkgV2hlbiBvcGxvZyBpcyBkaXNhYmxlZCAodGhyb3VnaCB0aGUgdXNlIG9mIGBkaXNhYmxlT3Bsb2dgIG9yIHdoZW4gb3RoZXJ3aXNlIG5vdCBhdmFpbGFibGUpLCB0aGUgbWluaW11bSB0aW1lIChpbiBtaWxsaXNlY29uZHMpIHRvIGFsbG93IGJldHdlZW4gcmUtcG9sbGluZyB3aGVuIG9ic2VydmluZyBvbiB0aGUgc2VydmVyLiBJbmNyZWFzaW5nIHRoaXMgd2lsbCBzYXZlIENQVSBhbmQgbW9uZ28gbG9hZCBhdCB0aGUgZXhwZW5zZSBvZiBzbG93ZXIgdXBkYXRlcyB0byB1c2Vycy4gRGVjcmVhc2luZyB0aGlzIGlzIG5vdCByZWNvbW1lbmRlZC4gRGVmYXVsdHMgdG8gNTBtcy5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdGlvbnMubWF4VGltZU1zIChTZXJ2ZXIgb25seSkgSWYgc2V0LCBpbnN0cnVjdHMgTW9uZ29EQiB0byBzZXQgYSB0aW1lIGxpbWl0IGZvciB0aGlzIGN1cnNvcidzIG9wZXJhdGlvbnMuIElmIHRoZSBvcGVyYXRpb24gcmVhY2hlcyB0aGUgc3BlY2lmaWVkIHRpbWUgbGltaXQgKGluIG1pbGxpc2Vjb25kcykgd2l0aG91dCB0aGUgaGF2aW5nIGJlZW4gY29tcGxldGVkLCBhbiBleGNlcHRpb24gd2lsbCBiZSB0aHJvd24uIFVzZWZ1bCB0byBwcmV2ZW50IGFuIChhY2NpZGVudGFsIG9yIG1hbGljaW91cykgdW5vcHRpbWl6ZWQgcXVlcnkgZnJvbSBjYXVzaW5nIGEgZnVsbCBjb2xsZWN0aW9uIHNjYW4gdGhhdCB3b3VsZCBkaXNydXB0IG90aGVyIGRhdGFiYXNlIHVzZXJzLCBhdCB0aGUgZXhwZW5zZSBvZiBuZWVkaW5nIHRvIGhhbmRsZSB0aGUgcmVzdWx0aW5nIGVycm9yLlxuICAgKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IG9wdGlvbnMuaGludCAoU2VydmVyIG9ubHkpIE92ZXJyaWRlcyBNb25nb0RCJ3MgZGVmYXVsdCBpbmRleCBzZWxlY3Rpb24gYW5kIHF1ZXJ5IG9wdGltaXphdGlvbiBwcm9jZXNzLiBTcGVjaWZ5IGFuIGluZGV4IHRvIGZvcmNlIGl0cyB1c2UsIGVpdGhlciBieSBpdHMgbmFtZSBvciBpbmRleCBzcGVjaWZpY2F0aW9uLiBZb3UgY2FuIGFsc28gc3BlY2lmeSBgeyAkbmF0dXJhbCA6IDEgfWAgdG8gZm9yY2UgYSBmb3J3YXJkcyBjb2xsZWN0aW9uIHNjYW4sIG9yIGB7ICRuYXR1cmFsIDogLTEgfWAgZm9yIGEgcmV2ZXJzZSBjb2xsZWN0aW9uIHNjYW4uIFNldHRpbmcgdGhpcyBpcyBvbmx5IHJlY29tbWVuZGVkIGZvciBhZHZhbmNlZCB1c2Vycy5cbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdGlvbnMucmVhZFByZWZlcmVuY2UgKFNlcnZlciBvbmx5KSBTcGVjaWZpZXMgYSBjdXN0b20gTW9uZ29EQiBbYHJlYWRQcmVmZXJlbmNlYF0oaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL21hbnVhbC9jb3JlL3JlYWQtcHJlZmVyZW5jZSkgZm9yIHRoaXMgcGFydGljdWxhciBjdXJzb3IuIFBvc3NpYmxlIHZhbHVlcyBhcmUgYHByaW1hcnlgLCBgcHJpbWFyeVByZWZlcnJlZGAsIGBzZWNvbmRhcnlgLCBgc2Vjb25kYXJ5UHJlZmVycmVkYCBhbmQgYG5lYXJlc3RgLlxuICAgKiBAcmV0dXJucyB7TW9uZ28uQ3Vyc29yfVxuICAgKi9cbiAgZmluZCguLi5hcmdzKSB7XG4gICAgLy8gQ29sbGVjdGlvbi5maW5kKCkgKHJldHVybiBhbGwgZG9jcykgYmVoYXZlcyBkaWZmZXJlbnRseVxuICAgIC8vIGZyb20gQ29sbGVjdGlvbi5maW5kKHVuZGVmaW5lZCkgKHJldHVybiAwIGRvY3MpLiAgc28gYmVcbiAgICAvLyBjYXJlZnVsIGFib3V0IHRoZSBsZW5ndGggb2YgYXJndW1lbnRzLlxuICAgIHJldHVybiB0aGlzLl9jb2xsZWN0aW9uLmZpbmQoXG4gICAgICB0aGlzLl9nZXRGaW5kU2VsZWN0b3IoYXJncyksXG4gICAgICB0aGlzLl9nZXRGaW5kT3B0aW9ucyhhcmdzKVxuICAgICk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IEZpbmRzIHRoZSBmaXJzdCBkb2N1bWVudCB0aGF0IG1hdGNoZXMgdGhlIHNlbGVjdG9yLCBhcyBvcmRlcmVkIGJ5IHNvcnQgYW5kIHNraXAgb3B0aW9ucy4gUmV0dXJucyBgdW5kZWZpbmVkYCBpZiBubyBtYXRjaGluZyBkb2N1bWVudCBpcyBmb3VuZC5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgZmluZE9uZVxuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtNb25nb1NlbGVjdG9yfSBbc2VsZWN0b3JdIEEgcXVlcnkgZGVzY3JpYmluZyB0aGUgZG9jdW1lbnRzIHRvIGZpbmRcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICAgKiBAcGFyYW0ge01vbmdvU29ydFNwZWNpZmllcn0gb3B0aW9ucy5zb3J0IFNvcnQgb3JkZXIgKGRlZmF1bHQ6IG5hdHVyYWwgb3JkZXIpXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRpb25zLnNraXAgTnVtYmVyIG9mIHJlc3VsdHMgdG8gc2tpcCBhdCB0aGUgYmVnaW5uaW5nXG4gICAqIEBwYXJhbSB7TW9uZ29GaWVsZFNwZWNpZmllcn0gb3B0aW9ucy5maWVsZHMgRGljdGlvbmFyeSBvZiBmaWVsZHMgdG8gcmV0dXJuIG9yIGV4Y2x1ZGUuXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5yZWFjdGl2ZSAoQ2xpZW50IG9ubHkpIERlZmF1bHQgdHJ1ZTsgcGFzcyBmYWxzZSB0byBkaXNhYmxlIHJlYWN0aXZpdHlcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gb3B0aW9ucy50cmFuc2Zvcm0gT3ZlcnJpZGVzIGB0cmFuc2Zvcm1gIG9uIHRoZSBbYENvbGxlY3Rpb25gXSgjY29sbGVjdGlvbnMpIGZvciB0aGlzIGN1cnNvci4gIFBhc3MgYG51bGxgIHRvIGRpc2FibGUgdHJhbnNmb3JtYXRpb24uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRpb25zLnJlYWRQcmVmZXJlbmNlIChTZXJ2ZXIgb25seSkgU3BlY2lmaWVzIGEgY3VzdG9tIE1vbmdvREIgW2ByZWFkUHJlZmVyZW5jZWBdKGh0dHBzOi8vZG9jcy5tb25nb2RiLmNvbS9tYW51YWwvY29yZS9yZWFkLXByZWZlcmVuY2UpIGZvciBmZXRjaGluZyB0aGUgZG9jdW1lbnQuIFBvc3NpYmxlIHZhbHVlcyBhcmUgYHByaW1hcnlgLCBgcHJpbWFyeVByZWZlcnJlZGAsIGBzZWNvbmRhcnlgLCBgc2Vjb25kYXJ5UHJlZmVycmVkYCBhbmQgYG5lYXJlc3RgLlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgZmluZE9uZSguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NvbGxlY3Rpb24uZmluZE9uZShcbiAgICAgIHRoaXMuX2dldEZpbmRTZWxlY3RvcihhcmdzKSxcbiAgICAgIHRoaXMuX2dldEZpbmRPcHRpb25zKGFyZ3MpXG4gICAgKTtcbiAgfSxcblxuXG4gIC8vICdpbnNlcnQnIGltbWVkaWF0ZWx5IHJldHVybnMgdGhlIGluc2VydGVkIGRvY3VtZW50J3MgbmV3IF9pZC5cbiAgLy8gVGhlIG90aGVycyByZXR1cm4gdmFsdWVzIGltbWVkaWF0ZWx5IGlmIHlvdSBhcmUgaW4gYSBzdHViLCBhbiBpbi1tZW1vcnlcbiAgLy8gdW5tYW5hZ2VkIGNvbGxlY3Rpb24sIG9yIGEgbW9uZ28tYmFja2VkIGNvbGxlY3Rpb24gYW5kIHlvdSBkb24ndCBwYXNzIGFcbiAgLy8gY2FsbGJhY2suICd1cGRhdGUnIGFuZCAncmVtb3ZlJyByZXR1cm4gdGhlIG51bWJlciBvZiBhZmZlY3RlZFxuICAvLyBkb2N1bWVudHMuICd1cHNlcnQnIHJldHVybnMgYW4gb2JqZWN0IHdpdGgga2V5cyAnbnVtYmVyQWZmZWN0ZWQnIGFuZCwgaWYgYW5cbiAgLy8gaW5zZXJ0IGhhcHBlbmVkLCAnaW5zZXJ0ZWRJZCcuXG4gIC8vXG4gIC8vIE90aGVyd2lzZSwgdGhlIHNlbWFudGljcyBhcmUgZXhhY3RseSBsaWtlIG90aGVyIG1ldGhvZHM6IHRoZXkgdGFrZVxuICAvLyBhIGNhbGxiYWNrIGFzIGFuIG9wdGlvbmFsIGxhc3QgYXJndW1lbnQ7IGlmIG5vIGNhbGxiYWNrIGlzXG4gIC8vIHByb3ZpZGVkLCB0aGV5IGJsb2NrIHVudGlsIHRoZSBvcGVyYXRpb24gaXMgY29tcGxldGUsIGFuZCB0aHJvdyBhblxuICAvLyBleGNlcHRpb24gaWYgaXQgZmFpbHM7IGlmIGEgY2FsbGJhY2sgaXMgcHJvdmlkZWQsIHRoZW4gdGhleSBkb24ndFxuICAvLyBuZWNlc3NhcmlseSBibG9jaywgYW5kIHRoZXkgY2FsbCB0aGUgY2FsbGJhY2sgd2hlbiB0aGV5IGZpbmlzaCB3aXRoIGVycm9yIGFuZFxuICAvLyByZXN1bHQgYXJndW1lbnRzLiAgKFRoZSBpbnNlcnQgbWV0aG9kIHByb3ZpZGVzIHRoZSBkb2N1bWVudCBJRCBhcyBpdHMgcmVzdWx0O1xuICAvLyB1cGRhdGUgYW5kIHJlbW92ZSBwcm92aWRlIHRoZSBudW1iZXIgb2YgYWZmZWN0ZWQgZG9jcyBhcyB0aGUgcmVzdWx0OyB1cHNlcnRcbiAgLy8gcHJvdmlkZXMgYW4gb2JqZWN0IHdpdGggbnVtYmVyQWZmZWN0ZWQgYW5kIG1heWJlIGluc2VydGVkSWQuKVxuICAvL1xuICAvLyBPbiB0aGUgY2xpZW50LCBibG9ja2luZyBpcyBpbXBvc3NpYmxlLCBzbyBpZiBhIGNhbGxiYWNrXG4gIC8vIGlzbid0IHByb3ZpZGVkLCB0aGV5IGp1c3QgcmV0dXJuIGltbWVkaWF0ZWx5IGFuZCBhbnkgZXJyb3JcbiAgLy8gaW5mb3JtYXRpb24gaXMgbG9zdC5cbiAgLy9cbiAgLy8gVGhlcmUncyBvbmUgbW9yZSB0d2Vhay4gT24gdGhlIGNsaWVudCwgaWYgeW91IGRvbid0IHByb3ZpZGUgYVxuICAvLyBjYWxsYmFjaywgdGhlbiBpZiB0aGVyZSBpcyBhbiBlcnJvciwgYSBtZXNzYWdlIHdpbGwgYmUgbG9nZ2VkIHdpdGhcbiAgLy8gTWV0ZW9yLl9kZWJ1Zy5cbiAgLy9cbiAgLy8gVGhlIGludGVudCAodGhvdWdoIHRoaXMgaXMgYWN0dWFsbHkgZGV0ZXJtaW5lZCBieSB0aGUgdW5kZXJseWluZ1xuICAvLyBkcml2ZXJzKSBpcyB0aGF0IHRoZSBvcGVyYXRpb25zIHNob3VsZCBiZSBkb25lIHN5bmNocm9ub3VzbHksIG5vdFxuICAvLyBnZW5lcmF0aW5nIHRoZWlyIHJlc3VsdCB1bnRpbCB0aGUgZGF0YWJhc2UgaGFzIGFja25vd2xlZGdlZFxuICAvLyB0aGVtLiBJbiB0aGUgZnV0dXJlIG1heWJlIHdlIHNob3VsZCBwcm92aWRlIGEgZmxhZyB0byB0dXJuIHRoaXNcbiAgLy8gb2ZmLlxuXG4gIF9pbnNlcnQoZG9jLCBjYWxsYmFjaykge1xuICAgIC8vIE1ha2Ugc3VyZSB3ZSB3ZXJlIHBhc3NlZCBhIGRvY3VtZW50IHRvIGluc2VydFxuICAgIGlmICghZG9jKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2luc2VydCByZXF1aXJlcyBhbiBhcmd1bWVudCcpO1xuICAgIH1cblxuXG4gICAgLy8gTWFrZSBhIHNoYWxsb3cgY2xvbmUgb2YgdGhlIGRvY3VtZW50LCBwcmVzZXJ2aW5nIGl0cyBwcm90b3R5cGUuXG4gICAgZG9jID0gT2JqZWN0LmNyZWF0ZShcbiAgICAgIE9iamVjdC5nZXRQcm90b3R5cGVPZihkb2MpLFxuICAgICAgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnMoZG9jKVxuICAgICk7XG5cbiAgICBpZiAoJ19pZCcgaW4gZG9jKSB7XG4gICAgICBpZiAoXG4gICAgICAgICFkb2MuX2lkIHx8XG4gICAgICAgICEodHlwZW9mIGRvYy5faWQgPT09ICdzdHJpbmcnIHx8IGRvYy5faWQgaW5zdGFuY2VvZiBNb25nby5PYmplY3RJRClcbiAgICAgICkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ01ldGVvciByZXF1aXJlcyBkb2N1bWVudCBfaWQgZmllbGRzIHRvIGJlIG5vbi1lbXB0eSBzdHJpbmdzIG9yIE9iamVjdElEcydcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IGdlbmVyYXRlSWQgPSB0cnVlO1xuXG4gICAgICAvLyBEb24ndCBnZW5lcmF0ZSB0aGUgaWQgaWYgd2UncmUgdGhlIGNsaWVudCBhbmQgdGhlICdvdXRlcm1vc3QnIGNhbGxcbiAgICAgIC8vIFRoaXMgb3B0aW1pemF0aW9uIHNhdmVzIHVzIHBhc3NpbmcgYm90aCB0aGUgcmFuZG9tU2VlZCBhbmQgdGhlIGlkXG4gICAgICAvLyBQYXNzaW5nIGJvdGggaXMgcmVkdW5kYW50LlxuICAgICAgaWYgKHRoaXMuX2lzUmVtb3RlQ29sbGVjdGlvbigpKSB7XG4gICAgICAgIGNvbnN0IGVuY2xvc2luZyA9IEREUC5fQ3VycmVudE1ldGhvZEludm9jYXRpb24uZ2V0KCk7XG4gICAgICAgIGlmICghZW5jbG9zaW5nKSB7XG4gICAgICAgICAgZ2VuZXJhdGVJZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChnZW5lcmF0ZUlkKSB7XG4gICAgICAgIGRvYy5faWQgPSB0aGlzLl9tYWtlTmV3SUQoKTtcbiAgICAgIH1cbiAgICB9XG5cblxuICAgIC8vIE9uIGluc2VydHMsIGFsd2F5cyByZXR1cm4gdGhlIGlkIHRoYXQgd2UgZ2VuZXJhdGVkOyBvbiBhbGwgb3RoZXJcbiAgICAvLyBvcGVyYXRpb25zLCBqdXN0IHJldHVybiB0aGUgcmVzdWx0IGZyb20gdGhlIGNvbGxlY3Rpb24uXG4gICAgdmFyIGNob29zZVJldHVyblZhbHVlRnJvbUNvbGxlY3Rpb25SZXN1bHQgPSBmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgIGlmIChNZXRlb3IuX2lzUHJvbWlzZShyZXN1bHQpKSByZXR1cm4gcmVzdWx0O1xuXG4gICAgICBpZiAoZG9jLl9pZCkge1xuICAgICAgICByZXR1cm4gZG9jLl9pZDtcbiAgICAgIH1cblxuICAgICAgLy8gWFhYIHdoYXQgaXMgdGhpcyBmb3I/P1xuICAgICAgLy8gSXQncyBzb21lIGl0ZXJhY3Rpb24gYmV0d2VlbiB0aGUgY2FsbGJhY2sgdG8gX2NhbGxNdXRhdG9yTWV0aG9kIGFuZFxuICAgICAgLy8gdGhlIHJldHVybiB2YWx1ZSBjb252ZXJzaW9uXG4gICAgICBkb2MuX2lkID0gcmVzdWx0O1xuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICBjb25zdCB3cmFwcGVkQ2FsbGJhY2sgPSB3cmFwQ2FsbGJhY2soXG4gICAgICBjYWxsYmFjayxcbiAgICAgIGNob29zZVJldHVyblZhbHVlRnJvbUNvbGxlY3Rpb25SZXN1bHRcbiAgICApO1xuXG4gICAgaWYgKHRoaXMuX2lzUmVtb3RlQ29sbGVjdGlvbigpKSB7XG4gICAgICBjb25zdCByZXN1bHQgPSB0aGlzLl9jYWxsTXV0YXRvck1ldGhvZCgnaW5zZXJ0JywgW2RvY10sIHdyYXBwZWRDYWxsYmFjayk7XG4gICAgICByZXR1cm4gY2hvb3NlUmV0dXJuVmFsdWVGcm9tQ29sbGVjdGlvblJlc3VsdChyZXN1bHQpO1xuICAgIH1cblxuICAgIC8vIGl0J3MgbXkgY29sbGVjdGlvbi4gIGRlc2NlbmQgaW50byB0aGUgY29sbGVjdGlvbiBvYmplY3RcbiAgICAvLyBhbmQgcHJvcGFnYXRlIGFueSBleGNlcHRpb24uXG4gICAgdHJ5IHtcbiAgICAgIC8vIElmIHRoZSB1c2VyIHByb3ZpZGVkIGEgY2FsbGJhY2sgYW5kIHRoZSBjb2xsZWN0aW9uIGltcGxlbWVudHMgdGhpc1xuICAgICAgLy8gb3BlcmF0aW9uIGFzeW5jaHJvbm91c2x5LCB0aGVuIHF1ZXJ5UmV0IHdpbGwgYmUgdW5kZWZpbmVkLCBhbmQgdGhlXG4gICAgICAvLyByZXN1bHQgd2lsbCBiZSByZXR1cm5lZCB0aHJvdWdoIHRoZSBjYWxsYmFjayBpbnN0ZWFkLlxuICAgICAgbGV0IHJlc3VsdDtcbiAgICAgIGlmICghIXdyYXBwZWRDYWxsYmFjaykge1xuICAgICAgICB0aGlzLl9jb2xsZWN0aW9uLmluc2VydChkb2MsIHdyYXBwZWRDYWxsYmFjayk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBJZiB3ZSBkb24ndCBoYXZlIHRoZSBjYWxsYmFjaywgd2UgYXNzdW1lIHRoZSB1c2VyIGlzIHVzaW5nIHRoZSBwcm9taXNlLlxuICAgICAgICAvLyBXZSBjYW4ndCBqdXN0IHBhc3MgdGhpcy5fY29sbGVjdGlvbi5pbnNlcnQgdG8gdGhlIHByb21pc2lmeSBiZWNhdXNlIGl0IHdvdWxkIGxvc2UgdGhlIGNvbnRleHQuXG4gICAgICAgIHJlc3VsdCA9IHRoaXMuX2NvbGxlY3Rpb24uaW5zZXJ0KGRvYyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBjaG9vc2VSZXR1cm5WYWx1ZUZyb21Db2xsZWN0aW9uUmVzdWx0KHJlc3VsdCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrKGUpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBJbnNlcnQgYSBkb2N1bWVudCBpbiB0aGUgY29sbGVjdGlvbi4gIFJldHVybnMgaXRzIHVuaXF1ZSBfaWQuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWV0aG9kICBpbnNlcnRcbiAgICogQG1lbWJlcm9mIE1vbmdvLkNvbGxlY3Rpb25cbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgVGhlIGRvY3VtZW50IHRvIGluc2VydC4gTWF5IG5vdCB5ZXQgaGF2ZSBhbiBfaWQgYXR0cmlidXRlLCBpbiB3aGljaCBjYXNlIE1ldGVvciB3aWxsIGdlbmVyYXRlIG9uZSBmb3IgeW91LlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIE9wdGlvbmFsLiAgSWYgcHJlc2VudCwgY2FsbGVkIHdpdGggYW4gZXJyb3Igb2JqZWN0IGFzIHRoZSBmaXJzdCBhcmd1bWVudCBhbmQsIGlmIG5vIGVycm9yLCB0aGUgX2lkIGFzIHRoZSBzZWNvbmQuXG4gICAqL1xuICBpbnNlcnQoZG9jLCBjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLl9pbnNlcnQoZG9jLCBjYWxsYmFjayk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IEFzeW5jaHJvbm91c2x5IG1vZGlmaWVzIG9uZSBvciBtb3JlIGRvY3VtZW50cyBpbiB0aGUgY29sbGVjdGlvbi4gUmV0dXJucyB0aGUgbnVtYmVyIG9mIG1hdGNoZWQgZG9jdW1lbnRzLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1ldGhvZCB1cGRhdGVcbiAgICogQG1lbWJlcm9mIE1vbmdvLkNvbGxlY3Rpb25cbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7TW9uZ29TZWxlY3Rvcn0gc2VsZWN0b3IgU3BlY2lmaWVzIHdoaWNoIGRvY3VtZW50cyB0byBtb2RpZnlcbiAgICogQHBhcmFtIHtNb25nb01vZGlmaWVyfSBtb2RpZmllciBTcGVjaWZpZXMgaG93IHRvIG1vZGlmeSB0aGUgZG9jdW1lbnRzXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLm11bHRpIFRydWUgdG8gbW9kaWZ5IGFsbCBtYXRjaGluZyBkb2N1bWVudHM7IGZhbHNlIHRvIG9ubHkgbW9kaWZ5IG9uZSBvZiB0aGUgbWF0Y2hpbmcgZG9jdW1lbnRzICh0aGUgZGVmYXVsdCkuXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy51cHNlcnQgVHJ1ZSB0byBpbnNlcnQgYSBkb2N1bWVudCBpZiBubyBtYXRjaGluZyBkb2N1bWVudHMgYXJlIGZvdW5kLlxuICAgKiBAcGFyYW0ge0FycmF5fSBvcHRpb25zLmFycmF5RmlsdGVycyBPcHRpb25hbC4gVXNlZCBpbiBjb21iaW5hdGlvbiB3aXRoIE1vbmdvREIgW2ZpbHRlcmVkIHBvc2l0aW9uYWwgb3BlcmF0b3JdKGh0dHBzOi8vZG9jcy5tb25nb2RiLmNvbS9tYW51YWwvcmVmZXJlbmNlL29wZXJhdG9yL3VwZGF0ZS9wb3NpdGlvbmFsLWZpbHRlcmVkLykgdG8gc3BlY2lmeSB3aGljaCBlbGVtZW50cyB0byBtb2RpZnkgaW4gYW4gYXJyYXkgZmllbGQuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gT3B0aW9uYWwuICBJZiBwcmVzZW50LCBjYWxsZWQgd2l0aCBhbiBlcnJvciBvYmplY3QgYXMgdGhlIGZpcnN0IGFyZ3VtZW50IGFuZCwgaWYgbm8gZXJyb3IsIHRoZSBudW1iZXIgb2YgYWZmZWN0ZWQgZG9jdW1lbnRzIGFzIHRoZSBzZWNvbmQuXG4gICAqL1xuICB1cGRhdGUoc2VsZWN0b3IsIG1vZGlmaWVyLCAuLi5vcHRpb25zQW5kQ2FsbGJhY2spIHtcbiAgICBjb25zdCBjYWxsYmFjayA9IHBvcENhbGxiYWNrRnJvbUFyZ3Mob3B0aW9uc0FuZENhbGxiYWNrKTtcblxuICAgIC8vIFdlJ3ZlIGFscmVhZHkgcG9wcGVkIG9mZiB0aGUgY2FsbGJhY2ssIHNvIHdlIGFyZSBsZWZ0IHdpdGggYW4gYXJyYXlcbiAgICAvLyBvZiBvbmUgb3IgemVybyBpdGVtc1xuICAgIGNvbnN0IG9wdGlvbnMgPSB7IC4uLihvcHRpb25zQW5kQ2FsbGJhY2tbMF0gfHwgbnVsbCkgfTtcbiAgICBsZXQgaW5zZXJ0ZWRJZDtcbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLnVwc2VydCkge1xuICAgICAgLy8gc2V0IGBpbnNlcnRlZElkYCBpZiBhYnNlbnQuICBgaW5zZXJ0ZWRJZGAgaXMgYSBNZXRlb3IgZXh0ZW5zaW9uLlxuICAgICAgaWYgKG9wdGlvbnMuaW5zZXJ0ZWRJZCkge1xuICAgICAgICBpZiAoXG4gICAgICAgICAgIShcbiAgICAgICAgICAgIHR5cGVvZiBvcHRpb25zLmluc2VydGVkSWQgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICAgICBvcHRpb25zLmluc2VydGVkSWQgaW5zdGFuY2VvZiBNb25nby5PYmplY3RJRFxuICAgICAgICAgIClcbiAgICAgICAgKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignaW5zZXJ0ZWRJZCBtdXN0IGJlIHN0cmluZyBvciBPYmplY3RJRCcpO1xuICAgICAgICBpbnNlcnRlZElkID0gb3B0aW9ucy5pbnNlcnRlZElkO1xuICAgICAgfSBlbHNlIGlmICghc2VsZWN0b3IgfHwgIXNlbGVjdG9yLl9pZCkge1xuICAgICAgICBpbnNlcnRlZElkID0gdGhpcy5fbWFrZU5ld0lEKCk7XG4gICAgICAgIG9wdGlvbnMuZ2VuZXJhdGVkSWQgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLmluc2VydGVkSWQgPSBpbnNlcnRlZElkO1xuICAgICAgfVxuICAgIH1cblxuICAgIHNlbGVjdG9yID0gTW9uZ28uQ29sbGVjdGlvbi5fcmV3cml0ZVNlbGVjdG9yKHNlbGVjdG9yLCB7XG4gICAgICBmYWxsYmFja0lkOiBpbnNlcnRlZElkLFxuICAgIH0pO1xuXG4gICAgY29uc3Qgd3JhcHBlZENhbGxiYWNrID0gd3JhcENhbGxiYWNrKGNhbGxiYWNrKTtcblxuICAgIGlmICh0aGlzLl9pc1JlbW90ZUNvbGxlY3Rpb24oKSkge1xuICAgICAgY29uc3QgYXJncyA9IFtzZWxlY3RvciwgbW9kaWZpZXIsIG9wdGlvbnNdO1xuICAgICAgcmV0dXJuIHRoaXMuX2NhbGxNdXRhdG9yTWV0aG9kKCd1cGRhdGUnLCBhcmdzLCBjYWxsYmFjayk7XG4gICAgfVxuXG4gICAgLy8gaXQncyBteSBjb2xsZWN0aW9uLiAgZGVzY2VuZCBpbnRvIHRoZSBjb2xsZWN0aW9uIG9iamVjdFxuICAgIC8vIGFuZCBwcm9wYWdhdGUgYW55IGV4Y2VwdGlvbi5cbiAgICAvLyBJZiB0aGUgdXNlciBwcm92aWRlZCBhIGNhbGxiYWNrIGFuZCB0aGUgY29sbGVjdGlvbiBpbXBsZW1lbnRzIHRoaXNcbiAgICAvLyBvcGVyYXRpb24gYXN5bmNocm9ub3VzbHksIHRoZW4gcXVlcnlSZXQgd2lsbCBiZSB1bmRlZmluZWQsIGFuZCB0aGVcbiAgICAvLyByZXN1bHQgd2lsbCBiZSByZXR1cm5lZCB0aHJvdWdoIHRoZSBjYWxsYmFjayBpbnN0ZWFkLlxuICAgIC8vY29uc29sZS5sb2coe2NhbGxiYWNrLCBvcHRpb25zLCBzZWxlY3RvciwgbW9kaWZpZXIsIGNvbGw6IHRoaXMuX2NvbGxlY3Rpb259KTtcbiAgICB0cnkge1xuICAgICAgLy8gSWYgdGhlIHVzZXIgcHJvdmlkZWQgYSBjYWxsYmFjayBhbmQgdGhlIGNvbGxlY3Rpb24gaW1wbGVtZW50cyB0aGlzXG4gICAgICAvLyBvcGVyYXRpb24gYXN5bmNocm9ub3VzbHksIHRoZW4gcXVlcnlSZXQgd2lsbCBiZSB1bmRlZmluZWQsIGFuZCB0aGVcbiAgICAgIC8vIHJlc3VsdCB3aWxsIGJlIHJldHVybmVkIHRocm91Z2ggdGhlIGNhbGxiYWNrIGluc3RlYWQuXG4gICAgICByZXR1cm4gdGhpcy5fY29sbGVjdGlvbi51cGRhdGUoXG4gICAgICAgIHNlbGVjdG9yLFxuICAgICAgICBtb2RpZmllcixcbiAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgd3JhcHBlZENhbGxiYWNrXG4gICAgICApO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayhlKTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgUmVtb3ZlIGRvY3VtZW50cyBmcm9tIHRoZSBjb2xsZWN0aW9uXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWV0aG9kIHJlbW92ZVxuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtNb25nb1NlbGVjdG9yfSBzZWxlY3RvciBTcGVjaWZpZXMgd2hpY2ggZG9jdW1lbnRzIHRvIHJlbW92ZVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIE9wdGlvbmFsLiAgSWYgcHJlc2VudCwgY2FsbGVkIHdpdGggYW4gZXJyb3Igb2JqZWN0IGFzIHRoZSBmaXJzdCBhcmd1bWVudCBhbmQsIGlmIG5vIGVycm9yLCB0aGUgbnVtYmVyIG9mIGFmZmVjdGVkIGRvY3VtZW50cyBhcyB0aGUgc2Vjb25kLlxuICAgKi9cbiAgcmVtb3ZlKHNlbGVjdG9yLCBjYWxsYmFjaykge1xuICAgIHNlbGVjdG9yID0gTW9uZ28uQ29sbGVjdGlvbi5fcmV3cml0ZVNlbGVjdG9yKHNlbGVjdG9yKTtcblxuICAgIGlmICh0aGlzLl9pc1JlbW90ZUNvbGxlY3Rpb24oKSkge1xuICAgICAgcmV0dXJuIHRoaXMuX2NhbGxNdXRhdG9yTWV0aG9kKCdyZW1vdmUnLCBbc2VsZWN0b3JdLCBjYWxsYmFjayk7XG4gICAgfVxuXG5cbiAgICAvLyBpdCdzIG15IGNvbGxlY3Rpb24uICBkZXNjZW5kIGludG8gdGhlIGNvbGxlY3Rpb24xIG9iamVjdFxuICAgIC8vIGFuZCBwcm9wYWdhdGUgYW55IGV4Y2VwdGlvbi5cbiAgICByZXR1cm4gdGhpcy5fY29sbGVjdGlvbi5yZW1vdmUoc2VsZWN0b3IpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBBc3luY2hyb25vdXNseSBtb2RpZmllcyBvbmUgb3IgbW9yZSBkb2N1bWVudHMgaW4gdGhlIGNvbGxlY3Rpb24sIG9yIGluc2VydCBvbmUgaWYgbm8gbWF0Y2hpbmcgZG9jdW1lbnRzIHdlcmUgZm91bmQuIFJldHVybnMgYW4gb2JqZWN0IHdpdGgga2V5cyBgbnVtYmVyQWZmZWN0ZWRgICh0aGUgbnVtYmVyIG9mIGRvY3VtZW50cyBtb2RpZmllZCkgIGFuZCBgaW5zZXJ0ZWRJZGAgKHRoZSB1bmlxdWUgX2lkIG9mIHRoZSBkb2N1bWVudCB0aGF0IHdhcyBpbnNlcnRlZCwgaWYgYW55KS5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgdXBzZXJ0XG4gICAqIEBtZW1iZXJvZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge01vbmdvU2VsZWN0b3J9IHNlbGVjdG9yIFNwZWNpZmllcyB3aGljaCBkb2N1bWVudHMgdG8gbW9kaWZ5XG4gICAqIEBwYXJhbSB7TW9uZ29Nb2RpZmllcn0gbW9kaWZpZXIgU3BlY2lmaWVzIGhvdyB0byBtb2RpZnkgdGhlIGRvY3VtZW50c1xuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5tdWx0aSBUcnVlIHRvIG1vZGlmeSBhbGwgbWF0Y2hpbmcgZG9jdW1lbnRzOyBmYWxzZSB0byBvbmx5IG1vZGlmeSBvbmUgb2YgdGhlIG1hdGNoaW5nIGRvY3VtZW50cyAodGhlIGRlZmF1bHQpLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIE9wdGlvbmFsLiAgSWYgcHJlc2VudCwgY2FsbGVkIHdpdGggYW4gZXJyb3Igb2JqZWN0IGFzIHRoZSBmaXJzdCBhcmd1bWVudCBhbmQsIGlmIG5vIGVycm9yLCB0aGUgbnVtYmVyIG9mIGFmZmVjdGVkIGRvY3VtZW50cyBhcyB0aGUgc2Vjb25kLlxuICAgKi9cbiAgdXBzZXJ0KHNlbGVjdG9yLCBtb2RpZmllciwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBpZiAoIWNhbGxiYWNrICYmIHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICBvcHRpb25zID0ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMudXBkYXRlKFxuICAgICAgc2VsZWN0b3IsXG4gICAgICBtb2RpZmllcixcbiAgICAgIHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgX3JldHVybk9iamVjdDogdHJ1ZSxcbiAgICAgICAgdXBzZXJ0OiB0cnVlLFxuICAgICAgfSk7XG4gIH0sXG59XG5cbi8vIENvbnZlcnQgdGhlIGNhbGxiYWNrIHRvIG5vdCByZXR1cm4gYSByZXN1bHQgaWYgdGhlcmUgaXMgYW4gZXJyb3JcbmZ1bmN0aW9uIHdyYXBDYWxsYmFjayhjYWxsYmFjaywgY29udmVydFJlc3VsdCkge1xuICByZXR1cm4gKFxuICAgIGNhbGxiYWNrICYmXG4gICAgZnVuY3Rpb24oZXJyb3IsIHJlc3VsdCkge1xuICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgIGNhbGxiYWNrKGVycm9yKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGNvbnZlcnRSZXN1bHQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIGNvbnZlcnRSZXN1bHQocmVzdWx0KSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjYWxsYmFjayhlcnJvciwgcmVzdWx0KTtcbiAgICAgIH1cbiAgICB9XG4gICk7XG59XG5cbmZ1bmN0aW9uIHBvcENhbGxiYWNrRnJvbUFyZ3MoYXJncykge1xuICAvLyBQdWxsIG9mZiBhbnkgY2FsbGJhY2sgKG9yIHBlcmhhcHMgYSAnY2FsbGJhY2snIHZhcmlhYmxlIHRoYXQgd2FzIHBhc3NlZFxuICAvLyBpbiB1bmRlZmluZWQsIGxpa2UgaG93ICd1cHNlcnQnIGRvZXMgaXQpLlxuICBpZiAoXG4gICAgYXJncy5sZW5ndGggJiZcbiAgICAoYXJnc1thcmdzLmxlbmd0aCAtIDFdID09PSB1bmRlZmluZWQgfHxcbiAgICAgIGFyZ3NbYXJncy5sZW5ndGggLSAxXSBpbnN0YW5jZW9mIEZ1bmN0aW9uKVxuICApIHtcbiAgICByZXR1cm4gYXJncy5wb3AoKTtcbiAgfVxufVxuIiwiLyoqXG4gKiBAc3VtbWFyeSBBbGxvd3MgZm9yIHVzZXIgc3BlY2lmaWVkIGNvbm5lY3Rpb24gb3B0aW9uc1xuICogQGV4YW1wbGUgaHR0cDovL21vbmdvZGIuZ2l0aHViLmlvL25vZGUtbW9uZ29kYi1uYXRpdmUvMy4wL3JlZmVyZW5jZS9jb25uZWN0aW5nL2Nvbm5lY3Rpb24tc2V0dGluZ3MvXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBVc2VyIHNwZWNpZmllZCBNb25nbyBjb25uZWN0aW9uIG9wdGlvbnNcbiAqL1xuTW9uZ28uc2V0Q29ubmVjdGlvbk9wdGlvbnMgPSBmdW5jdGlvbiBzZXRDb25uZWN0aW9uT3B0aW9ucyAob3B0aW9ucykge1xuICBjaGVjayhvcHRpb25zLCBPYmplY3QpO1xuICBNb25nby5fY29ubmVjdGlvbk9wdGlvbnMgPSBvcHRpb25zO1xufTsiLCJleHBvcnQgY29uc3Qgbm9ybWFsaXplUHJvamVjdGlvbiA9IG9wdGlvbnMgPT4ge1xuICAvLyB0cmFuc2Zvcm0gZmllbGRzIGtleSBpbiBwcm9qZWN0aW9uXG4gIGNvbnN0IHsgZmllbGRzLCBwcm9qZWN0aW9uLCAuLi5vdGhlck9wdGlvbnMgfSA9IG9wdGlvbnMgfHwge307XG4gIC8vIFRPRE86IGVuYWJsZSB0aGlzIGNvbW1lbnQgd2hlbiBkZXByZWNhdGluZyB0aGUgZmllbGRzIG9wdGlvblxuICAvLyBMb2cuZGVidWcoYGZpZWxkcyBvcHRpb24gaGFzIGJlZW4gZGVwcmVjYXRlZCwgcGxlYXNlIHVzZSB0aGUgbmV3ICdwcm9qZWN0aW9uJyBpbnN0ZWFkYClcblxuICByZXR1cm4ge1xuICAgIC4uLm90aGVyT3B0aW9ucyxcbiAgICAuLi4ocHJvamVjdGlvbiB8fCBmaWVsZHMgPyB7IHByb2plY3Rpb246IGZpZWxkcyB8fCBwcm9qZWN0aW9uIH0gOiB7fSksXG4gIH07XG59O1xuIiwiaW1wb3J0IHsgT2JzZXJ2ZUhhbmRsZUNhbGxiYWNrLCBPYnNlcnZlTXVsdGlwbGV4ZXIgfSBmcm9tICcuL29ic2VydmVfbXVsdGlwbGV4JztcblxubGV0IG5leHRPYnNlcnZlSGFuZGxlSWQgPSAxO1xuXG5leHBvcnQgdHlwZSBPYnNlcnZlSGFuZGxlQ2FsbGJhY2tJbnRlcm5hbCA9ICdfYWRkZWQnIHwgJ19hZGRlZEJlZm9yZScgfCAnX2NoYW5nZWQnIHwgJ19tb3ZlZEJlZm9yZScgfCAnX3JlbW92ZWQnO1xuXG5cbmV4cG9ydCB0eXBlIENhbGxiYWNrPFQgPSBhbnk+ID0gKC4uLmFyZ3M6IFRbXSkgPT4gUHJvbWlzZTx2b2lkPiB8IHZvaWQ7XG5cbi8qKlxuICogVGhlIFwib2JzZXJ2ZSBoYW5kbGVcIiByZXR1cm5lZCBmcm9tIG9ic2VydmVDaGFuZ2VzLlxuICogQ29udGFpbnMgYSByZWZlcmVuY2UgdG8gYW4gT2JzZXJ2ZU11bHRpcGxleGVyLlxuICogVXNlZCB0byBzdG9wIG9ic2VydmF0aW9uIGFuZCBjbGVhbiB1cCByZXNvdXJjZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBPYnNlcnZlSGFuZGxlPFQgPSBhbnk+IHtcbiAgX2lkOiBudW1iZXI7XG4gIF9tdWx0aXBsZXhlcjogT2JzZXJ2ZU11bHRpcGxleGVyO1xuICBub25NdXRhdGluZ0NhbGxiYWNrczogYm9vbGVhbjtcbiAgX3N0b3BwZWQ6IGJvb2xlYW47XG5cbiAgcHVibGljIGluaXRpYWxBZGRzU2VudFJlc29sdmVyOiAodmFsdWU6IHZvaWQpID0+IHZvaWQgPSAoKSA9PiB7fTtcbiAgcHVibGljIGluaXRpYWxBZGRzU2VudDogUHJvbWlzZTx2b2lkPlxuXG4gIF9hZGRlZD86IENhbGxiYWNrPFQ+O1xuICBfYWRkZWRCZWZvcmU/OiBDYWxsYmFjazxUPjtcbiAgX2NoYW5nZWQ/OiBDYWxsYmFjazxUPjtcbiAgX21vdmVkQmVmb3JlPzogQ2FsbGJhY2s8VD47XG4gIF9yZW1vdmVkPzogQ2FsbGJhY2s8VD47XG5cbiAgY29uc3RydWN0b3IobXVsdGlwbGV4ZXI6IE9ic2VydmVNdWx0aXBsZXhlciwgY2FsbGJhY2tzOiBSZWNvcmQ8T2JzZXJ2ZUhhbmRsZUNhbGxiYWNrLCBDYWxsYmFjazxUPj4sIG5vbk11dGF0aW5nQ2FsbGJhY2tzOiBib29sZWFuKSB7XG4gICAgdGhpcy5fbXVsdGlwbGV4ZXIgPSBtdWx0aXBsZXhlcjtcblxuICAgIG11bHRpcGxleGVyLmNhbGxiYWNrTmFtZXMoKS5mb3JFYWNoKChuYW1lOiBPYnNlcnZlSGFuZGxlQ2FsbGJhY2spID0+IHtcbiAgICAgIGlmIChjYWxsYmFja3NbbmFtZV0pIHtcbiAgICAgICAgdGhpc1tgXyR7bmFtZX1gIGFzIE9ic2VydmVIYW5kbGVDYWxsYmFja0ludGVybmFsXSA9IGNhbGxiYWNrc1tuYW1lXTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAobmFtZSA9PT0gXCJhZGRlZEJlZm9yZVwiICYmIGNhbGxiYWNrcy5hZGRlZCkge1xuICAgICAgICB0aGlzLl9hZGRlZEJlZm9yZSA9IGFzeW5jIGZ1bmN0aW9uIChpZCwgZmllbGRzLCBiZWZvcmUpIHtcbiAgICAgICAgICBhd2FpdCBjYWxsYmFja3MuYWRkZWQoaWQsIGZpZWxkcyk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLl9zdG9wcGVkID0gZmFsc2U7XG4gICAgdGhpcy5faWQgPSBuZXh0T2JzZXJ2ZUhhbmRsZUlkKys7XG4gICAgdGhpcy5ub25NdXRhdGluZ0NhbGxiYWNrcyA9IG5vbk11dGF0aW5nQ2FsbGJhY2tzO1xuXG4gICAgdGhpcy5pbml0aWFsQWRkc1NlbnQgPSBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgIGNvbnN0IHJlYWR5ID0gKCkgPT4ge1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbEFkZHNTZW50ID0gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHRpbWVvdXQgPSBzZXRUaW1lb3V0KHJlYWR5LCAzMDAwMClcblxuICAgICAgdGhpcy5pbml0aWFsQWRkc1NlbnRSZXNvbHZlciA9ICgpID0+IHtcbiAgICAgICAgcmVhZHkoKTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVc2luZyBwcm9wZXJ0eSBzeW50YXggYW5kIGFycm93IGZ1bmN0aW9uIHN5bnRheCB0byBhdm9pZCBiaW5kaW5nIHRoZSB3cm9uZyBjb250ZXh0IG9uIGNhbGxiYWNrcy5cbiAgICovXG4gIHN0b3AgPSBhc3luYyAoKSA9PiB7XG4gICAgaWYgKHRoaXMuX3N0b3BwZWQpIHJldHVybjtcbiAgICB0aGlzLl9zdG9wcGVkID0gdHJ1ZTtcbiAgICBhd2FpdCB0aGlzLl9tdWx0aXBsZXhlci5yZW1vdmVIYW5kbGUodGhpcy5faWQpO1xuICB9XG59Il19
