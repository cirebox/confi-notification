Package["core-runtime"].queue("null",function () {/* Imports for global scope */

MongoInternals = Package.mongo.MongoInternals;
Mongo = Package.mongo.Mongo;
ReactiveVar = Package['reactive-var'].ReactiveVar;
Tracker = Package.tracker.Tracker;
Deps = Package.tracker.Deps;
ECMAScript = Package.ecmascript.ECMAScript;
DDPRateLimiter = Package['ddp-rate-limiter'].DDPRateLimiter;
WebApp = Package.webapp.WebApp;
WebAppInternals = Package.webapp.WebAppInternals;
main = Package.webapp.main;
Meteor = Package.meteor.Meteor;
global = Package.meteor.global;
meteorEnv = Package.meteor.meteorEnv;
EmitterPromise = Package.meteor.EmitterPromise;
DDP = Package['ddp-client'].DDP;
DDPServer = Package['ddp-server'].DDPServer;
LaunchScreen = Package['launch-screen'].LaunchScreen;
meteorInstall = Package.modules.meteorInstall;
Promise = Package.promise.Promise;
Autoupdate = Package.autoupdate.Autoupdate;

var require = meteorInstall({"server":{"main.ts":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                        //
// server/main.ts                                                                         //
//                                                                                        //
////////////////////////////////////////////////////////////////////////////////////////////
                                                                                          //
!module.wrapAsync(async function (module, __reifyWaitForDeps__, __reify_async_result__) {
  "use strict";
  try {
    let Meteor;
    module.link("meteor/meteor", {
      Meteor(v) {
        Meteor = v;
      }
    }, 0);
    module.link("../domain/entities/Notification");
    module.link("../api/methods/notificationMethods");
    module.link("../api/publications/notificationPublications");
    module.link("../infrastructure/database/indexes");
    module.link("../infrastructure/security/rateLimiting");
    module.link("../infrastructure/security/headers");
    if (__reifyWaitForDeps__()) (await __reifyWaitForDeps__())();
    Meteor.startup(() => {
      var _Meteor$settings$priv;
      console.log('🚀 Servidor iniciado');
      console.log("\u2713 MongoDB: ".concat(((_Meteor$settings$priv = Meteor.settings.private) === null || _Meteor$settings$priv === void 0 ? void 0 : _Meteor$settings$priv.MONGO_URL) || 'padrão'));
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
////////////////////////////////////////////////////////////////////////////////////////////

}}},{
  "extensions": [
    ".js",
    ".json",
    ".ts",
    ".mjs"
  ]
});


/* Exports */
return {
  require: require,
  eagerModulePaths: [
    "/server/main.ts"
  ]
}});

//# sourceURL=meteor://💻app/app/app.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL21haW4udHMiXSwibmFtZXMiOlsiTWV0ZW9yIiwibW9kdWxlIiwibGluayIsInYiLCJfX3JlaWZ5V2FpdEZvckRlcHNfXyIsInN0YXJ0dXAiLCJfTWV0ZW9yJHNldHRpbmdzJHByaXYiLCJjb25zb2xlIiwibG9nIiwiY29uY2F0Iiwic2V0dGluZ3MiLCJwcml2YXRlIiwiTU9OR09fVVJMIiwiX19yZWlmeV9hc3luY19yZXN1bHRfXyIsIl9yZWlmeUVycm9yIiwic2VsZiIsImFzeW5jIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBQUEsSUFBQUEsTUFBUztJQUFBQyxNQUFRLENBQUFDLElBQUEsQ0FBTSxlQUFlLEVBQUM7TUFBQUYsT0FBQUcsQ0FBQTtRQUFBSCxNQUFBLEdBQUFHLENBQUE7TUFBQTtJQUFBO0lBQUFGLE1BQUEsQ0FBQUMsSUFBQTtJQUFBRCxNQUFBLENBQUFDLElBQUE7SUFBQUQsTUFBQSxDQUFBQyxJQUFBO0lBQUFELE1BQUEsQ0FBQUMsSUFBQTtJQUFBRCxNQUFBLENBQUFDLElBQUE7SUFBQUQsTUFBQSxDQUFBQyxJQUFBO0lBQUEsSUFBQUUsb0JBQUEsV0FBQUEsb0JBQUE7SUFRdkNKLE1BQU0sQ0FBQ0ssT0FBTyxDQUFDLE1BQUs7TUFBQSxJQUFBQyxxQkFBQTtNQUNsQkMsT0FBTyxDQUFDQyxHQUFHLENBQUMsc0JBQXNCLENBQUM7TUFDbkNELE9BQU8sQ0FBQ0MsR0FBRyxvQkFBQUMsTUFBQSxDQUFlLEVBQUFILHFCQUFBLEdBQUFOLE1BQU0sQ0FBQ1UsUUFBUSxDQUFDQyxPQUFPLGNBQUFMLHFCQUFBLHVCQUF2QkEscUJBQUEsQ0FBeUJNLFNBQVMsS0FBSSxRQUFRLENBQUUsQ0FBQztJQUM3RSxDQUFDLENBQUM7SUFBQ0Msc0JBQUE7RUFBQSxTQUFBQyxXQUFBO0lBQUEsT0FBQUQsc0JBQUEsQ0FBQUMsV0FBQTtFQUFBO0VBQUFELHNCQUFBO0FBQUE7RUFBQUUsSUFBQTtFQUFBQyxLQUFBO0FBQUEsRyIsImZpbGUiOiIvYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgJy4uL2RvbWFpbi9lbnRpdGllcy9Ob3RpZmljYXRpb24nO1xuaW1wb3J0ICcuLi9hcGkvbWV0aG9kcy9ub3RpZmljYXRpb25NZXRob2RzJztcbmltcG9ydCAnLi4vYXBpL3B1YmxpY2F0aW9ucy9ub3RpZmljYXRpb25QdWJsaWNhdGlvbnMnO1xuaW1wb3J0ICcuLi9pbmZyYXN0cnVjdHVyZS9kYXRhYmFzZS9pbmRleGVzJztcbmltcG9ydCAnLi4vaW5mcmFzdHJ1Y3R1cmUvc2VjdXJpdHkvcmF0ZUxpbWl0aW5nJztcbmltcG9ydCAnLi4vaW5mcmFzdHJ1Y3R1cmUvc2VjdXJpdHkvaGVhZGVycyc7XG5cbk1ldGVvci5zdGFydHVwKCgpID0+IHtcbiAgY29uc29sZS5sb2coJ/CfmoAgU2Vydmlkb3IgaW5pY2lhZG8nKTtcbiAgY29uc29sZS5sb2coYOKckyBNb25nb0RCOiAke01ldGVvci5zZXR0aW5ncy5wcml2YXRlPy5NT05HT19VUkwgfHwgJ3BhZHLDo28nfWApO1xufSk7XG4iXX0=
