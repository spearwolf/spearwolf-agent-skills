// Tap and swipe inside the iOS Simulator, driven over SSH.
//
//   osascript -l JavaScript sim_input.js tap   X Y [cssWidth]
//   osascript -l JavaScript sim_input.js swipe X1 Y1 X2 Y2 [steps] [delay] [cssWidth]
//
// Coordinates are CSS points of the simulated device (iPhone 17: 402 x 874),
// the same space `devicePixelRatio` divides screenshot pixels into.
// Where the device screen sits on the mac desktop is read from the
// accessibility tree, so the window may be anywhere and at any scale.
//
// Needs Accessibility for the SSH login: System Settings → Privacy & Security
// → Accessibility → add /usr/libexec/sshd-keygen-wrapper. Without it every
// call dies with "-1719".

ObjC.import('CoreGraphics');
ObjC.import('Foundation');

var DEFAULT_CSS_WIDTH = 402; // iPhone 17

function deviceScreen() {
  var win = Application('System Events').processes['Simulator'].windows[0];
  var els = win.uiElements();
  for (var i = 0; i < els.length; i++) {
    var sub;
    try { sub = els[i].subrole(); } catch (e) { continue; }
    if (sub === 'iOSContentGroup') {
      var p = els[i].position(), s = els[i].size();
      return { x: p[0], y: p[1], w: s[0], h: s[1] };
    }
  }
  throw new Error('iOSContentGroup not found — is the Simulator window open?');
}

function sleep(s) { $.NSThread.sleepForTimeInterval(s); }

function post(type, x, y) {
  $.CGEventPost(0, $.CGEventCreateMouseEvent($(), type, $.CGPointMake(x, y), 0));
}

var DOWN = 1, UP = 2, DRAG = 6, MOVE = 5;

function mapper(cssWidth) {
  var d = deviceScreen();
  var k = d.w / cssWidth;
  return function (x, y) { return [d.x + x * k, d.y + y * k]; };
}

function tap(x, y, cssWidth) {
  var m = mapper(cssWidth), p = m(x, y);
  post(MOVE, p[0], p[1]); sleep(0.05);
  post(DOWN, p[0], p[1]); sleep(0.08);
  post(UP, p[0], p[1]);
}

// A flick fast enough to carry momentum — that is what makes iOS Safari
// collapse its toolbar. A slow drag scrolls but leaves the toolbar expanded.
function swipe(x1, y1, x2, y2, steps, delay, cssWidth) {
  var m = mapper(cssWidth), a = m(x1, y1), b = m(x2, y2);
  post(MOVE, a[0], a[1]); sleep(0.05);
  post(DOWN, a[0], a[1]); sleep(0.05);
  for (var i = 1; i <= steps; i++) {
    post(DRAG, a[0] + (b[0] - a[0]) * i / steps, a[1] + (b[1] - a[1]) * i / steps);
    sleep(delay);
  }
  post(UP, b[0], b[1]);
}

function run(argv) {
  var cmd = argv[0], n = argv.slice(1).map(Number);
  if (cmd === 'tap') tap(n[0], n[1], n[2] || DEFAULT_CSS_WIDTH);
  else if (cmd === 'swipe')
    swipe(n[0], n[1], n[2], n[3], n[4] || 12, n[5] || 0.005, n[6] || DEFAULT_CSS_WIDTH);
  else return 'usage: tap X Y [cssWidth] | swipe X1 Y1 X2 Y2 [steps] [delay] [cssWidth]';
  return 'ok';
}
