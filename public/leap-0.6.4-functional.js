
/*!
 * LeapJS v0.6.4 - Real Leap Motion Client via WebSocket
 * https://developer.leapmotion.com/
 */
(function() {
  var Leap = {};
  (function(exports) {
    var root = exports;

    function loop(callback) {
      var ws = new WebSocket('ws://127.0.0.1:6437/v6.json');
      ws.onmessage = function(event) {
        var data = JSON.parse(event.data);
        if (data.hands && data.hands.length > 0) {
          callback(data);
        }
      };
      return {
        disconnect: () => ws.close()
      };
    }

    root.Leap = {
      loop: loop,
      Controller: function () {
        console.warn("Leap.Controller no está implementado en esta versión simplificada.");
        return {
          connect: () => {},
          disconnect: () => {},
          on: () => {}
        };
      }
    };
  })(typeof window === 'undefined' ? this : window);
})();
