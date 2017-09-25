/*
ISC License:
Copyright (c) 2004-2010 by Internet Systems Consortium, Inc. ("ISC")
Copyright (c) 1995-2003 by Internet Software Consortium

Permission to use, copy, modify, and/or distribute this software for
any purpose with or without fee is hereby granted, provided that the
above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND ISC DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL ISC BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE
OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
*/

(function(global) {

require('es6-promise').polyfill();
require('isomorphic-fetch');
var extend = require('object-extend');

var conditions = [];
var failNextCall = false;

var statusTexts = {
   100: "Continue",
   101: "Switching Protocols",
   102: "Processing",
   200: "OK",
   201: "Created",
   202: "Accepted",
   203: "Non-Authoritative Information",
   204: "No Content",
   205: "Reset Content",
   206: "Partial Content",
   207: "Multi-Status",
   208: "Already Reported",
   226: "IM Used",
   300: "Multiple Choices",
   301: "Moved Permanently",
   302: "Found",
   303: "See Other",
   304: "Not Modified",
   305: "Use Proxy",
   306: "Unused)",
   307: "Temporary Redirect",
   308: "Permanent Redirect",
   400: "Bad Request",
   401: "Unauthorized",
   402: "Payment Required",
   403: "Forbidden",
   404: "Not Found",
   405: "Method Not Allowed",
   406: "Not Acceptable",
   407: "Proxy Authentication Required",
   408: "Request Timeout",
   409: "Conflict",
   410: "Gone",
   411: "Length Required",
   412: "Precondition Failed",
   413: "Payload Too Large",
   414: "URI Too Long",
   415: "Unsupported Media Type",
   416: "Range Not Satisfiable",
   417: "Expectation Failed",
   421: "Misdirected Request",
   422: "Unprocessable Entity",
   423: "Locked",
   424: "Failed Dependency",
   425: "Unassigned",
   426: "Upgrade Required",
   427: "Unassigned",
   428: "Precondition Required",
   429: "Too Many Requests",
   430: "Unassigned",
   431: "Request Header Fields Too Large",
   451: "Unavailable For Legal Reasons",
   500: "Internal Server Error",
   501: "Not Implemented",
   502: "Bad Gateway",
   503: "Service Unavailable",
   504: "Gateway Timeout",
   505: "HTTP Version Not Supported",
   506: "Variant Also Negotiates",
   507: "Insufficient Storage",
   508: "Loop Detected",
   509: "Unassigned",
   510: "Not Extended",
   511: "Network Authentication Required"
};

global.fetch = function(uri, options) {

   var options = extend({
      method: 'GET',
      headers: null,
   }, options || {});

   if (uri instanceof Request) {
        options = uri;
        uri = uri.url;

        if (!options.method) {
            options.method = 'GET'
        }
    }
   
   return new Promise(function(resolve, reject) {

      if(failNextCall) {

         failNextCall = false;
         return reject("as requested");
      }

      for (var ii = 0; ii < conditions.length; ii++) {

         var criteria = conditions[ii];

         // Compare methods
         if(criteria.method == options.method && criteria.uri == uri) {

            // Compare headers
            for(var jj=0; jj<criteria.headers.length; jj++) {
               var expectedHeader = criteria.headers[jj];

               if(!options.headers || !options.headers.has(expectedHeader.header)
                     || options.headers.get(expectedHeader.header) != expectedHeader.value) {

                  if(expectedHeader.elseResponse) {

                     return resolve(new Response("", {
                        status: expectedHeader.elseResponse.status,
                        statusText: expectedHeader.elseResponse.statusText
                     }));

                  }

                  return resolve(new Response("", {
                     status: 404,
                     statusText: statusTexts[404]
                  }));

               }
            }

            return resolve(new Response(criteria.response.jsonData, {
               status: criteria.response.status,
               statusText: statusTexts[criteria.response.status] || "Unassigned",
               headers: criteria.response.headers
            }));

         }
      }

      return resolve(new Response("", {
         status: 404,
         statusText: statusTexts[404]
      }));

   });
}


module.exports = {

   when: function(method, uri) {

      var condition = {

         method: method,
         uri: uri,
         headers: [],
         response: null,


         withExpectedHeader: function(header, value) {

            condition.headers.push({
               header: header,
               value: value,
               elseResponse: null
            });

            return condition;
         },


         otherwiseRespondWith: function(status, statusText) {

            if(condition.headers.length > 0) {
               condition.headers[condition.headers.length-1].elseResponse = {
                  status: status,
                  statusText: statusText,
               };
               return condition;
            }
            throw "no preceding header set";
         },


         respondWith: function(status, data, headers) {

            condition.response = {
               status: status,
               statusText: statusTexts[status] || "Unassigned",
               jsonData: data,
               headers: headers
            };

            conditions.push(condition);

            return true;
         }
      };

      return condition;
   },


   failNextCall: function () {

      failNextCall = true;
   },

   cleanUp: function () {

      conditions = [];
   }
};


})(typeof window === 'undefined' ? this : window);
