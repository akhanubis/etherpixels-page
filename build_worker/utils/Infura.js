'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _web = require('web3');

var _web2 = _interopRequireDefault(_web);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var ProviderEngine = require('web3-provider-engine');
var ZeroClientProvider = require('./ZeroClientProvider.js');

var Infura = function () {
  var get = function get() {
    return new _web2.default(ZeroClientProvider({
      static: {
        eth_syncing: false,
        web3_clientVersion: 'ZeroClientProvider'
      },
      pollingInterval: 99999999, // not interested in polling for new blocks
      rpcUrl: 'https://ropsten.infura.io/' + process.env.REACT_APP_INFURA_API_KEY,
      // account mgmt
      getAccounts: function getAccounts(cb) {
        return cb(null, []);
      }
    }));
  };

  return {
    get: get
  };
}();

exports.default = Infura;
