<script>
(function () {
  "use strict";

  var root = document.getElementById("flag-story");
  if (!root) return;

  var NS = "http://www.w3.org/2000/svg";
  var XNS = "http://www.w3.org/1999/xhtml";
  var MOTION_SCALE = 1.25;
  var DRAW_MS = 850 * MOTION_SCALE;
  var phi = (1 + Math.sqrt(5)) / 2;
  var h = Math.tan(Math.PI / 5);
  var sin36 = Math.sin(Math.PI / 5);

  var A = [0, 0];
  var B = [1, 0];
  var M = [0.5, 0];
  var P = [0, 0.5];
  var Q = [0, phi];
  var Bp = [phi, 0];
  var Bpp = [phi * phi, 0];
  var R = [phi * phi / 2, Math.sin(2 * Math.PI / 5)];
  var C = [1, h];
  var D = [0, h];
  var O = [0.5, h / 2];
  var S1 = [0, h / 2];
  var S2 = [1, h / 2];
  var T1 = [1 / (phi * phi), 0];
  var T2 = [1 / phi, 0];
  var T3 = [1 / phi, h];
  var T4 = [1 / (phi * phi), h];
  var Q1 = [sin36, h * sin36];

  // Auxiliary points used only to show the first constructions explicitly.
  var U = [-0.38, 0];
  var V = [0.38, 0];
  var perpRadius = 0.72;
  var X = [0, Math.sqrt(perpRadius * perpRadius - 0.38 * 0.38)];
  var midpointRadius = 0.66;
  var midpointY = Math.sqrt(midpointRadius * midpointRadius - 0.5 * 0.5);

  function lineIntersection(p1, p2, p3, p4) {
    var x1 = p1[0], y1 = p1[1], x2 = p2[0], y2 = p2[1];
    var x3 = p3[0], y3 = p3[1], x4 = p4[0], y4 = p4[1];
    var den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    var px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / den;
    var py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / den;
    return [px, py];
  }

  var vQ1 = [Q1[0] - Bp[0], Q1[1] - Bp[1]];
  var Q2 = lineIntersection(
    B,
    [B[0] + vQ1[0], B[1] + vQ1[1]],
    A,
    C
  );
  var Q3 = [Q2[0] / 2, Q2[1] / 2];
  var starR = Math.hypot(Q3[0], Q3[1]);

  var P1 = [phi * phi, h];
  var P2 = [phi * phi, -h];
  var P3 = [0, -h];

  function rayPoint(target, radius) {
    var vx = target[0] - O[0];
    var vy = target[1] - O[1];
    var d = Math.hypot(vx, vy);
    return [O[0] + vx / d * radius, O[1] + vy / d * radius];
  }

  var Rpts = [
    rayPoint(S2, starR),
    rayPoint(C, starR),
    rayPoint(T3, starR),
    rayPoint(T4, starR),
    rayPoint(D, starR),
    rayPoint(S1, starR),
    rayPoint(A, starR),
    rayPoint(T1, starR),
    rayPoint(T2, starR),
    rayPoint(B, starR)
  ];

  var cameras = {
    core: [0, 105, 430, 390],
    upper: [48, 2, 602, 395],
    full: [48, 0, 610, 520],
    flag: [74, 175, 570, 335]
  };

  var scenes = [
    {
      step: "Paso 1",
      title: "Partimos de un trazo",
      text: "Sea \\(AB\\) un trazo horizontal de largo cualquiera. Lo consideramos nuestra unidad de medición.",
      note: "Este es el único dato libre. Todo lo que sigue se obtiene copiando longitudes, trazando rectas, perpendiculares y circunferencias.",
      formula: "\\[AB=1\\]",
      hot: ["AB", "A", "B", "lA", "lB"],
      camera: "core",
      duration: 4300
    },
    {
      step: "Paso 2",
      title: "Levantamos la perpendicular y ubicamos \\(P\\)",
      text: "Levante la perpendicular a \\(AB\\) en \\(A\\) y sobre esta marque \\(P\\), de modo que \\(AP=AB/2\\).",
      note: "\\(U\\) y \\(V\\) son puntos auxiliares para construir \\(X\\) y levantar la perpendicular por \\(A\\). Luego, como \\(M\\) es el punto medio de \\(AB\\), la longitud \\(AM\\) se transfiere sobre esa perpendicular para encontrar \\(P\\).",
      formula: "\\[AP=AM=\\frac{AB}{2}\\]",
      hot: ["perpMarkCircle", "U", "lU", "V", "lV", "perpArcL", "perpArcR", "X", "lX", "perpLine", "midArcA1", "midArcB1", "midArcA2", "midArcB2", "midGuide", "M", "lM", "AM", "halfC", "AP", "P", "lP"],
      delays: {
        U: 300, lU: 300, V: 300, lV: 300,
        perpArcL: 700, perpArcR: 1200, X: 1700, lX: 1700, perpLine: 2050,
        midArcA1: 2650, midArcB1: 3050, midArcA2: 3450, midArcB2: 3850,
        midGuide: 4250, M: 4550, lM: 4550, AM: 4550,
        halfC: 5000, AP: 5450, P: 6000, lP: 6000
      },
      identity: ["AB", "A", "B", "lA", "lB", "AM", "M", "lM", "AP", "P", "lP"],
      settleDelay: 6350,
      camera: "core",
      duration: 7200
    },
    {
      step: "Paso 3",
      title: "Prolongamos \\(AP\\) hasta \\(Q\\)",
      text: "Unimos \\(P\\) con \\(B\\). Sobre la prolongación de \\(AP\\) marcamos \\(Q\\) de modo que la nueva longitud \\(PQ\\) sea exactamente igual a \\(PB\\).",
      note: "Aquí aparece una longitud especial. No la nombramos todavía: al final veremos por qué \\(AQ\\) contiene la razón áurea.",
      formula: "\\[PQ=PB\\]",
      hot: ["PB", "pqArc", "AQguide", "Q", "lQ"],
      delays: { pqArc: 900, AQguide: 1500, Q: 2250, lQ: 2250 },
      camera: "upper",
      duration: 5200
    },
    {
      step: "Paso 4",
      title: "Copiamos \\(AQ\\) sobre la horizontal",
      text: "Sobre la extensión de \\(AB\\) marcamos \\(B'\\) y \\(B''\\) copiando dos veces la longitud \\(AQ\\): primero desde \\(A\\) y luego desde \\(B\\).",
      note: "No aparece una nueva medida: el compás transporta la misma longitud ya construida.",
      formula: "\\[AB'=BB''=AQ\\]",
      hot: ["baseRay", "aqCircleA", "Bp", "lBp", "aqCircleB", "Bpp", "lBpp"],
      delays: { aqCircleA: 550, Bp: 1250, lBp: 1250, aqCircleB: 1900, Bpp: 2650, lBpp: 2650 },
      camera: "upper",
      duration: 4600
    },
    {
      step: "Paso 5",
      title: "Dos circunferencias determinan \\(R\\)",
      text: "Trazamos la circunferencia de centro \\(A\\) y radio \\(AQ\\), y la circunferencia de centro \\(B'\\) y radio \\(AB\\). Su intersección sobre la recta \\(AB\\) es \\(R\\).",
      note: "El punto \\(R\\) queda fijado por dos distancias construidas previamente.",
      formula: "\\[AR=AQ,\\qquad B'R=AB\\]",
      hot: ["aqCircleA", "rCircle", "R", "lR"],
      delays: { rCircle: 650, R: 1500, lR: 1500 },
      camera: "upper",
      duration: 4100
    },
    {
      step: "Paso 6",
      title: "La recta \\(AR\\) fija \\(C\\)",
      text: "Trazamos \\(AR\\). En \\(B\\) levantamos la perpendicular a \\(AB\\); su intersección con \\(AR\\) define \\(C\\).",
      note: "La altura del campo izquierdo queda determinada por la construcción anterior.",
      formula: "\\[C=AR\\cap(B\\perp AB)\\]",
      hot: ["AR", "BC", "C", "lC"],
      camera: "upper",
      duration: 4000
    },
    {
      step: "Paso 7",
      title: "Cerramos el rectángulo \\(ABCD\\)",
      text: "Por \\(C\\) trazamos la perpendicular a \\(BC\\). Su intersección con la recta \\(AQ\\) define \\(D\\).",
      note: "Con \\(A,B,C,D\\) queda construido el rectángulo donde se desarrollará la estrella.",
      formula: "\\[D=AQ\\cap(C\\perp BC)\\]",
      hot: ["DC", "D", "lD", "AD"],
      camera: "upper",
      duration: 3500
    },
    {
      step: "Paso 8",
      title: "Las diagonales encuentran \\(O\\)",
      text: "Unimos \\(A\\) con \\(C\\) y \\(B\\) con \\(D\\). El punto donde ambas diagonales se cortan es \\(O\\).",
      note: "Este centro será el vértice común de las direcciones que organizan la estrella.",
      formula: "\\[O=AC\\cap BD\\]",
      hot: ["AC", "BD", "O", "lO"],
      camera: "upper",
      duration: 3800
    },
    {
      step: "Paso 9",
      title: "Trazamos la paralela por \\(O\\)",
      text: "Por \\(O\\) trazamos una paralela a \\(AB\\) y \\(CD\\). Llamamos \\(S_1\\) y \\(S_2\\) a sus intersecciones con \\(AD\\) y \\(BC\\).",
      note: "La horizontal central se suma a las dos diagonales ya construidas.",
      formula: "\\[S_1O\\parallel AB\\parallel OS_2\\]",
      hot: ["centerH", "S1", "S2", "lS1", "lS2"],
      camera: "upper",
      duration: 3700
    },
    {
      step: "Paso 10",
      title: "Copiamos dos ángulos",
      text: "Copiamos \\(\\angle AOS_1\\) sobre el lado \\(AO\\) y llamamos \\(T_1\\) al corte del lado libre con \\(AB\\). Repetimos con \\(\\angle BOS_2\\) para obtener \\(T_2\\).",
      note: "En esta construcción esos ángulos valen \\(36^\\circ\\). Este es uno de los pasos geométricos clave.",
      formula: "\\[\\angle AOS_1=\\angle BOS_2=36^\\circ\\]",
      hot: ["OT1", "OT2", "angL", "angR", "T1", "T2", "lT1", "lT2", "l36a", "l36b"],
      camera: "upper",
      duration: 6200
    },
    {
      step: "Paso 11",
      title: "Prolongamos hasta \\(T_3\\) y \\(T_4\\)",
      text: "Prolongamos las rectas \\(T_1O\\) y \\(T_2O\\) hasta que corten \\(CD\\). Esos puntos son \\(T_3\\) y \\(T_4\\).",
      note: "Ya tenemos cinco rectas que pasan por \\(O\\), es decir, diez semirrectas consecutivas.",
      formula: "\\[T_3,O,T_1\\text{ colineales},\\qquad T_4,O,T_2\\text{ colineales}\\]",
      hot: ["T1T3", "T2T4", "T3", "T4", "lT3", "lT4"],
      camera: "upper",
      duration: 3600
    },
    {
      step: "Paso 12",
      title: "Marcamos \\(Q_1\\) sobre \\(AC\\)",
      text: "Sobre la diagonal \\(AC\\) marcamos \\(Q_1\\) de modo que \\(AQ_1\\) sea igual a \\(AD\\).",
      note: "Nuevamente usamos el compás para copiar una longitud que ya existe.",
      formula: "\\[AQ_1=AD\\]",
      hot: ["adCircle", "Q1", "lQ1", "AQ1"],
      camera: "upper",
      duration: 4000
    },
    {
      step: "Paso 13",
      title: "Una paralela determina \\(Q_2\\)",
      text: "Unimos \\(B'\\) con \\(Q_1\\). Luego trazamos por \\(B\\) una paralela a \\(B'Q_1\\); donde esta corta a \\(AC\\) obtenemos \\(Q_2\\).",
      note: "La paralela también puede construirse copiando el ángulo correspondiente.",
      formula: "\\[BQ_2\\parallel B'Q_1\\]",
      hot: ["BpQ1", "BQ2", "Q2", "lQ2"],
      camera: "upper",
      duration: 4600
    },
    {
      step: "Paso 14",
      title: "La circunferencia fija diez puntos",
      text: "Marcamos el punto medio \\(Q_3\\) de \\(AQ_2\\). Con centro en \\(O\\) y radio \\(AQ_3\\) trazamos una circunferencia, que corta las diez semirrectas en \\(R_1,\\ldots,R_{10}\\).",
      note: "La estrella ya está completamente determinada; falta escoger cinco de esos diez puntos.",
      formula: "\\[r_\\star=AQ_3=\\frac{AQ_2}{2}\\]",
      hot: ["Q3", "lQ3", "starCircle", "R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10", "lR2", "lR4", "lR6", "lR8", "lR10"],
      camera: "upper",
      duration: 5900
    },
    {
      step: "Paso 15",
      title: "Unimos los cinco vértices de la estrella",
      text: "Unimos \\(R_2\\) con \\(R_6\\), luego \\(R_6\\) con \\(R_{10}\\), después \\(R_{10}\\) con \\(R_4\\), \\(R_4\\) con \\(R_8\\), y finalmente \\(R_8\\) con \\(R_2\\).",
      note: "Los cinco vértices exteriores están separados por \\(72^\\circ\\). Una vez hecho el primer salto, el resto es repetición.",
      formula: "\\[R_2\\to R_6\\to R_{10}\\to R_4\\to R_8\\to R_2\\]",
      hot: ["star", "l72"],
      camera: "upper",
      duration: 5000
    },
    {
      step: "Paso 16",
      title: "Extendemos \\(DC\\) hasta \\(P_1\\)",
      text: "Prolongamos \\(DC\\) hacia la derecha y marcamos \\(P_1\\) de modo que \\(DP_1=AB''\\).",
      note: "Aquí comenzamos a abrir el encuadre porque la construcción sale del bloque de la estrella.",
      formula: "\\[DP_1=AB''\\]",
      hot: ["topExt", "P1", "lP1"],
      camera: "full",
      duration: 3400
    },
    {
      step: "Paso 17",
      title: "Prolongamos \\(P_1B''\\) hasta \\(P_2\\)",
      text: "Unimos \\(P_1\\) con \\(B''\\) y prolongamos el trazo. Sobre esa prolongación marcamos \\(P_2\\) de modo que \\(P_1B''=B''P_2\\).",
      note: "El paño completo ya empieza a hacerse visible.",
      formula: "\\[P_1B''=B''P_2\\]",
      hot: ["rightVert", "P2", "lP2", "Bpp", "lBpp"],
      camera: "full",
      duration: 3400
    },
    {
      step: "Paso 18",
      title: "Cerramos el paño",
      text: "En \\(P_2\\) trazamos la perpendicular a \\(P_1P_2\\) y la intersectamos con la prolongación de \\(DA\\). Así obtenemos \\(P_3\\).",
      note: "Al terminar el paso, retiramos visualmente las ayudas y coloreamos los tres campos y la estrella.",
      formula: "\\[P_2P_3\\perp P_1P_2\\]",
      hot: ["bottom", "leftLower", "midExt", "P3", "lP3", "blueFill", "whiteFill", "redFill", "whiteStar"],
      delays: {
        blueFill: 3000, whiteFill: 3000, redFill: 3000, whiteStar: 3400
      },
      camera: "full",
      final: {
        delay: 4100,
        camera: "flag",
        title: "Coloreamos la Bandera de la Independencia",
        text: "Pintamos de rojo el rectángulo \\(AB''P_2P_3\\), de blanco el rectángulo \\(BB''P_1C\\) y la estrella, y de azul el rectángulo \\(ABCD\\) menos la estrella.",
        note: "Y ahora sí podemos volver al paso 3: como \\(AP=AB/2\\) y \\(PQ=PB\\), la longitud \\(AQ\\) resulta ser \\(\\varphi\\) veces \\(AB\\).",
        formula: "\\[\\frac{AQ}{AB}=\\frac12+\\sqrt{1+\\frac14}=\\frac{1+\\sqrt5}{2}=\\varphi\\]"
      },
      duration: 7600
    }
  ];

  root.innerHTML =
    '<div class="shell">' +
      '<header class="head">' +
        '<span>Geometría · regla y compás</span>' +
        '<span class="source">Inspirado en el video original · construcción de 18 pasos</span>' +
      '</header>' +
      '<section class="copy">' +
        '<p class="step"></p>' +
        '<h1></h1>' +
        '<p class="txt"></p>' +
        '<div class="formula"></div>' +
        '<p class="note"></p>' +
      '</section>' +
      '<section class="graphic" aria-live="polite"></section>' +
      '<footer class="nav">' +
        '<button class="prev" aria-label="Paso anterior">←</button>' +
        '<button class="play" aria-label="Reproducir">▶</button>' +
        '<div class="dots"></div>' +
        '<span class="count"></span>' +
        '<button class="next" aria-label="Paso siguiente">→</button>' +
      '</footer>' +
    '</div>';

  function q(selector) {
    return root.querySelector(selector);
  }

  var ui = {
    step: q(".step"),
    title: q("h1"),
    text: q(".txt"),
    note: q(".note"),
    formula: q(".formula"),
    graphic: q(".graphic"),
    dots: q(".dots"),
    count: q(".count"),
    prev: q(".prev"),
    play: q(".play"),
    next: q(".next")
  };

  function svgEl(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (key) {
      n.setAttribute(key, attrs[key]);
    });
    return n;
  }

  var svg = svgEl("svg", {
    viewBox: cameras.core.join(" "),
    role: "img",
    "aria-label": "Construcción geométrica de la Bandera de la Independencia"
  });

  var fillLayer = svgEl("g", {});
  var geoLayer = svgEl("g", {});
  var labelLayer = svgEl("g", {});
  svg.appendChild(fillLayer);
  svg.appendChild(geoLayer);
  svg.appendChild(labelLayer);
  ui.graphic.appendChild(svg);

  var currentView = cameras.core.slice();
  var cameraToken = 0;

  function setCamera(name, duration) {
    var target = cameras[name] || cameras.core;
    var start = currentView.slice();
    var token = ++cameraToken;
    var started = performance.now();
    var ms = (duration == null ? 850 : duration) * MOTION_SCALE;

    function tick(now) {
      if (token !== cameraToken) return;
      var t = Math.min(1, (now - started) / ms);
      var eased = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;

      currentView = start.map(function (value, i) {
        return value + (target[i] - value) * eased;
      });

      svg.setAttribute("viewBox", currentView.join(" "));
      if (t < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  var scale = 195;
  var origin = [105, 350];

  function screen(p) {
    return [origin[0] + scale * p[0], origin[1] - scale * p[1]];
  }

  var items = {};

  function add(id, node, from, to, layer) {
    (layer || geoLayer).appendChild(node);
    items[id] = { node: node, from: from || 0, to: to == null ? null : to };
    return node;
  }

  function line(id, p1, p2, classes, from, to) {
    var a = screen(p1);
    var b = screen(p2);
    return add(id, svgEl("line", {
      x1: a[0], y1: a[1], x2: b[0], y2: b[1],
      "class": "geo " + classes + " off"
    }), from, to, geoLayer);
  }

  function circle(id, c, r, classes, from, to) {
    var a = screen(c);
    return add(id, svgEl("circle", {
      cx: a[0], cy: a[1], r: r * scale,
      "class": "geo " + classes + " off"
    }), from, to, geoLayer);
  }

  function path(id, d, classes, from, to, layer) {
    return add(id, svgEl("path", {
      d: d,
      "class": classes.indexOf("flag-fill") >= 0 ? classes + " off" : "geo " + classes + " off"
    }), from, to, layer || geoLayer);
  }

  function point(id, p, from, to) {
    var a = screen(p);
    return add(id, svgEl("circle", {
      cx: a[0], cy: a[1], r: 4.1,
      "class": "pt off"
    }), from, to, labelLayer);
  }

  function polygon(id, pts, classes, from, to, layer) {
    var d = pts.map(function (p, i) {
      var a = screen(p);
      return (i ? "L " : "M ") + a[0].toFixed(2) + " " + a[1].toFixed(2);
    }).join(" ") + " Z";
    return path(id, d, classes, from, to, layer);
  }

  function mathLabel(id, p, tex, dx, dy, from, to, extra) {
    var a = screen(p);
    var fo = svgEl("foreignObject", {
      x: a[0] + dx,
      y: a[1] + dy,
      width: 110,
      height: 34,
      "class": "m-label " + (extra || "") + " off"
    });
    var div = document.createElementNS(XNS, "div");
    div.innerHTML = "\\(" + tex + "\\)";
    fo.appendChild(div);
    return add(id, fo, from, to, labelLayer);
  }

  function dist(a, b) {
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
  }

  function screenArc(center, r, a1, a2) {
    var c = screen(center);
    var rr = r * scale;
    var rad = function (d) { return d * Math.PI / 180; };
    var p1 = [c[0] + rr * Math.cos(rad(a1)), c[1] - rr * Math.sin(rad(a1))];
    var p2 = [c[0] + rr * Math.cos(rad(a2)), c[1] - rr * Math.sin(rad(a2))];
    var large = Math.abs(a2 - a1) > 180 ? 1 : 0;
    var sweep = a2 > a1 ? 0 : 1;
    return "M " + p1[0] + " " + p1[1] +
      " A " + rr + " " + rr + " 0 " + large + " " + sweep + " " + p2[0] + " " + p2[1];
  }

  line("AB", A, B, "main", 0, 20);
  point("A", A, 0, 20);
  point("B", B, 0, 20);
  mathLabel("lA", A, "A", -20, 9, 0, 20);
  mathLabel("lB", B, "B", 10, 9, 0, 20);

  // Paso 2a: perpendicular por A. First mark U and V symmetrically,
  // then intersect two equal-radius arcs and join their intersection with A.
  circle("perpMarkCircle", A, 0.38, "compass", 1, 1);
  point("U", U, 1, 1);
  mathLabel("lU", U, "U", -18, 8, 1, 1);
  point("V", V, 1, 1);
  mathLabel("lV", V, "V", 8, 8, 1, 1);
  path("perpArcL", screenArc(U, perpRadius, 30, 86), "compass", 1, 1);
  path("perpArcR", screenArc(V, perpRadius, 94, 150), "compass", 1, 1);
  point("X", X, 1, 1);
  mathLabel("lX", X, "X", 9, -18, 1, 1);
  line("perpLine", [0, -0.10], [0, 0.80], "guide", 1, 2);

  // Paso 2b: midpoint of AB, then transfer AM onto the perpendicular to get P.
  path("midArcA1", screenArc(A, midpointRadius, 24, 70), "compass", 2, 2);
  path("midArcB1", screenArc(B, midpointRadius, 110, 156), "compass", 2, 2);
  path("midArcA2", screenArc(A, midpointRadius, -70, -24), "compass", 2, 2);
  path("midArcB2", screenArc(B, midpointRadius, 204, 250), "compass", 2, 2);
  line("midGuide", [0.5, -midpointY - 0.06], [0.5, midpointY + 0.06], "guide", 2, 2);
  point("M", M, 2, 2);
  mathLabel("lM", M, "M", -7, 10, 2, 2);
  line("AM", A, M, "main identity-line", 2, 2);
  circle("halfC", A, 0.5, "compass", 2, 2);
  line("AP", A, P, "main", 2, 4);
  point("P", P, 2, 4);
  mathLabel("lP", P, "P", 10, -19, 2, 4);

  // Paso 3: use PB as the radius and extend the perpendicular only now.
  line("PB", P, B, "guide", 3, 3);
  path("pqArc", screenArc(P, dist(P, B), 70, 110), "compass", 3, 3);
  line("AQguide", A, [0, phi + 0.12], "guide", 3, 20);
  point("Q", Q, 3, 20);
  mathLabel("lQ", Q, "Q", 10, -20, 3, 20);

  // Paso 4: copy AQ twice along the horizontal extension.
  line("baseRay", A, [phi * phi + 0.15, 0], "guide", 4, 18);
  circle("aqCircleA", A, phi, "compass", 4, 5);
  point("Bp", Bp, 4, 13);
  mathLabel("lBp", Bp, "B'", -8, 10, 4, 13);
  circle("aqCircleB", B, phi, "compass", 4, 4);
  point("Bpp", Bpp, 4, 20);
  mathLabel("lBpp", Bpp, "B''", -9, 10, 4, 20);

  // Paso 5: intersection of the two prescribed circles.
  circle("rCircle", Bp, 1, "compass", 5, 5);
  point("R", R, 5, 6);
  mathLabel("lR", R, "R", 10, -18, 5, 6);

  line("AR", A, R, "guide", 6, 6);
  line("BC", B, C, "main", 6, 20);
  point("C", C, 6, 20);
  mathLabel("lC", C, "C", 10, -18, 6, 20);

  line("DC", D, C, "main", 7, 20);
  line("AD", A, D, "main", 7, 20);
  point("D", D, 7, 20);
  mathLabel("lD", D, "D", -22, -18, 7, 20);

  line("AC", A, C, "guide", 8, 20);
  line("BD", B, D, "guide", 8, 20);
  point("O", O, 8, 20);
  mathLabel("lO", O, "O", 9, -17, 8, 20);

  line("centerH", S1, S2, "guide", 9, 20);
  point("S1", S1, 9, 11);
  point("S2", S2, 9, 11);
  mathLabel("lS1", S1, "S_1", -33, -15, 9, 11);
  mathLabel("lS2", S2, "S_2", 9, -15, 9, 11);

  line("OT1", O, T1, "guide", 10, 10);
  line("OT2", O, T2, "guide", 10, 10);
  path("angL", screenArc(O, 0.14, 180, 216), "main accent", 10, 10);
  path("angR", screenArc(O, 0.14, -36, 0), "main accent", 10, 10);
  point("T1", T1, 10, 11);
  point("T2", T2, 10, 11);
  mathLabel("lT1", T1, "T_1", -20, 10, 10, 11);
  mathLabel("lT2", T2, "T_2", 8, 10, 10, 11);
  mathLabel("l36a", [0.17, h / 2 - 0.015], "36^\\circ", 0, -20, 10, 10, "accent");
  mathLabel("l36b", [0.71, h / 2 - 0.015], "36^\\circ", 0, -20, 10, 10, "accent");

  line("T1T3", T1, T3, "guide", 11, 20);
  line("T2T4", T2, T4, "guide", 11, 20);
  point("T3", T3, 11, 14);
  point("T4", T4, 11, 14);
  mathLabel("lT3", T3, "T_3", 8, -18, 11, 14);
  mathLabel("lT4", T4, "T_4", -30, -18, 11, 14);

  circle("adCircle", A, h, "compass", 12, 12);
  line("AQ1", A, Q1, "main", 12, 12);
  point("Q1", Q1, 12, 14);
  mathLabel("lQ1", Q1, "Q_1", 10, -18, 12, 14);

  line("BpQ1", Bp, Q1, "guide", 13, 13);
  line("BQ2", B, Q2, "guide", 13, 13);
  point("Q2", Q2, 13, 14);
  mathLabel("lQ2", Q2, "Q_2", -34, 9, 13, 14);

  point("Q3", Q3, 14, 14);
  mathLabel("lQ3", Q3, "Q_3", -36, 8, 14, 14);
  circle("starCircle", O, starR, "compass", 14, 20);

  Rpts.forEach(function (p, i) {
    point("R" + (i + 1), p, 14, 15);
  });

  [2, 4, 6, 8, 10].forEach(function (i) {
    var dx = i === 6 ? -38 : 8;
    var dy = i === 8 ? 8 : -20;
    mathLabel("lR" + i, Rpts[i - 1], "R_{" + i + "}", dx, dy, 14, 15);
  });

  polygon("star", [Rpts[1], Rpts[5], Rpts[9], Rpts[3], Rpts[7]], "star-line", 15, 20, geoLayer);
  mathLabel("l72", O, "72^\\circ", 62, -68, 15, 15, "accent");

  line("topExt", D, P1, "main", 16, 20);
  point("P1", P1, 16, 20);
  mathLabel("lP1", P1, "P_1", 9, -18, 16, 18);

  line("rightVert", P1, P2, "main", 17, 20);
  point("P2", P2, 17, 20);
  mathLabel("lP2", P2, "P_2", 9, 8, 17, 18);

  line("bottom", P3, P2, "main", 18, 20);
  line("leftLower", A, P3, "main", 18, 20);
  line("midExt", B, Bpp, "main", 18, 20);
  point("P3", P3, 18, 20);
  mathLabel("lP3", P3, "P_3", -30, 8, 18, 18);

  polygon("blueFill", [A, B, C, D], "flag-fill blue", 19, 20, fillLayer);
  polygon("whiteFill", [B, Bpp, P1, C], "flag-fill white", 19, 20, fillLayer);
  polygon("redFill", [P3, P2, Bpp, A], "flag-fill red", 19, 20, fillLayer);
  polygon("whiteStar", [Rpts[1], Rpts[5], Rpts[9], Rpts[3], Rpts[7]], "flag-fill star-white", 19, 20, fillLayer);

  line("blueDim", [0, h + 0.12], [1, h + 0.12], "dimension", 20, 20);
  line("whiteDim", [1, h + 0.12], [phi * phi, h + 0.12], "dimension", 20, 20);
  line("starDiam", [O[0] - starR, O[1]], [O[0] + starR, O[1]], "dimension", 20, 20);

  Object.keys(items).forEach(function (id) {
    var item = items[id];

    function shiftIndex(value) {
      if (value == null) return null;
      if (value === 2) return 1;
      if (value >= 3 && value <= 18) return value - 1;
      if (value >= 19) return 17;
      return value;
    }

    item.from = shiftIndex(item.from);
    item.to = shiftIndex(item.to);

    if (id === "blueDim" || id === "whiteDim" || id === "starDiam") {
      item.from = 99;
      item.to = 99;
    }
  });

  var dots = scenes.map(function (scene, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", "Ir a " + scene.step);
    b.addEventListener("click", function () {
      setPlaying(false);
      go(i);
    });
    ui.dots.appendChild(b);
    return b;
  });

  var index = 0;
  var playing = false;
  var timer = null;
  var runToken = 0;

  function alive(i, item) {
    return i >= item.from && (item.to == null || i <= item.to);
  }

  function typeset(node) {
    if (window.MathJax && window.MathJax.typesetPromise) {
      return window.MathJax.typesetPromise([node]).catch(function () {});
    }
    return Promise.resolve();
  }

  function clearMath(node) {
    if (window.MathJax && window.MathJax.typesetClear) {
      try {
        window.MathJax.typesetClear([node]);
      } catch (_) {}
    }
  }

  function setMathHtml(node, html) {
    clearMath(node);
    node.innerHTML = html;
    return typeset(node);
  }

  function setSceneCopy(scene) {
    ui.step.textContent = scene.step;
    return Promise.all([
      setMathHtml(ui.title, scene.title),
      setMathHtml(ui.text, scene.text),
      setMathHtml(ui.note, scene.note),
      setMathHtml(ui.formula, scene.formula)
    ]);
  }

  function animateStroke(node, token) {
    var tag = node.tagName.toLowerCase();
    var easing = "cubic-bezier(.2,.75,.25,1)";

    if (tag === "line") {
      var x1 = Number(node.getAttribute("x1"));
      var y1 = Number(node.getAttribute("y1"));
      var x2 = Number(node.getAttribute("x2"));
      var y2 = Number(node.getAttribute("y2"));

      node.dataset.finalX2 = x2;
      node.dataset.finalY2 = y2;
      node.setAttribute("x2", x1);
      node.setAttribute("y2", y1);

      var started = performance.now();

      function tick(now) {
        if (token !== runToken) return;
        var t = Math.min(1, (now - started) / DRAW_MS);
        var eased = 1 - Math.pow(1 - t, 3);
        node.setAttribute("x2", x1 + (x2 - x1) * eased);
        node.setAttribute("y2", y1 + (y2 - y1) * eased);
        if (t < 1) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
      return;
    }

    var computed = window.getComputedStyle(node);
    var dash = computed.strokeDasharray;
    var isDashed = dash && dash !== "none" && dash !== "0px";

    if (isDashed || tag === "circle") {
      if (node.animate) {
        node.animate(
          [{ opacity: 0 }, { opacity: 1 }],
          { duration: DRAW_MS, easing: easing }
        );
      }
      return;
    }

    if (!node.getTotalLength) return;

    try {
      var length = node.getTotalLength();
      if (!Number.isFinite(length) || length <= 0) return;

      node.style.strokeDasharray = length + " " + length;
      node.style.strokeDashoffset = length;
      node.getBoundingClientRect();
      node.style.transition = "stroke-dashoffset " + (DRAW_MS / 1000) + "s " + easing;
      node.style.strokeDashoffset = 0;

      setTimeout(function () {
        if (token !== runToken) return;
        node.style.transition = "none";
        node.style.strokeDasharray = "";
        node.style.strokeDashoffset = "";
        requestAnimationFrame(function () {
          if (token === runToken) node.style.transition = "";
        });
      }, DRAW_MS + 40);
    } catch (_) {}
  }

  function go(next) {
    index = Math.max(0, Math.min(scenes.length - 1, next));
    var scene = scenes[index];
    var hot = {};
    scene.hot.forEach(function (id) { hot[id] = true; });

    setSceneCopy(scene);

    svg.classList.remove("final-clean");
    Object.keys(items).forEach(function (id) {
      items[id].node.classList.remove("settled-dim");
      items[id].node.classList.remove("identity-hot");
    });
    setCamera(scene.camera || "core", 900);

    var token = ++runToken;
    var delays = scene.delays || {};

    if (scene.identity && scene.settleDelay != null) {
      setTimeout(function () {
        if (token !== runToken) return;
        var identity = {};
        scene.identity.forEach(function (id) { identity[id] = true; });

        scene.hot.forEach(function (id) {
          var item = items[id];
          if (!item || !alive(index, item)) return;
          item.node.classList.remove("hot");
          item.node.classList.toggle("identity-hot", !!identity[id]);
          item.node.classList.toggle("settled-dim", !identity[id]);
        });

        scene.identity.forEach(function (id) {
          if (!items[id] || !alive(index, items[id])) return;
          items[id].node.classList.add("identity-hot");
          items[id].node.classList.remove("settled-dim");
        });
      }, scene.settleDelay * MOTION_SCALE);
    }

    if (scene.final) {
      setTimeout(function () {
        if (token !== runToken) return;
        svg.classList.add("final-clean");
        setCamera(scene.final.camera || "flag", 1150);
        Promise.all([
          setMathHtml(ui.title, scene.final.title),
          setMathHtml(ui.text, scene.final.text),
          setMathHtml(ui.note, scene.final.note),
          setMathHtml(ui.formula, scene.final.formula)
        ]);
      }, scene.final.delay * MOTION_SCALE);
    }

    Object.keys(items).forEach(function (id) {
      var item = items[id];
      var node = item.node;
      var on = alive(index, item);
      var replay = on && !!hot[id];
      var delay = Number(delays[id] || 0) * MOTION_SCALE;

      function resetVisualState() {
        if (node.getAnimations) {
          node.getAnimations().forEach(function (animation) {
            animation.cancel();
          });
        }
        if (node.dataset.finalX2 != null) {
          node.setAttribute("x2", node.dataset.finalX2);
          node.setAttribute("y2", node.dataset.finalY2);
        }
        node.style.opacity = "";
        node.style.transition = "";
        node.style.strokeDasharray = "";
        node.style.strokeDashoffset = "";
        node.classList.add("off");
        node.classList.remove("on");
        node.classList.remove("hot");
        node.classList.remove("settled-dim");
        node.classList.remove("identity-hot");
      }

      function showItem() {
        if (token !== runToken) return;

        node.classList.remove("off");
        node.classList.add("on");
        node.classList.toggle("hot", replay);

        if (replay && node.classList.contains("geo")) {
          animateStroke(node, token);
        }
      }

      if (!on) {
        resetVisualState();
        return;
      }

      // Elements from previous steps remain visible but muted.
      // Elements belonging to the active step are reset and replayed every visit.
      if (!replay) {
        showItem();
        return;
      }

      resetVisualState();

      if (delay > 0) {
        setTimeout(showItem, delay);
      } else if (node.classList.contains("geo")) {
        showItem();
      } else {
        requestAnimationFrame(function () {
          if (token !== runToken) return;
          showItem();
        });
      }
    });

    dots.forEach(function (dot, i) {
      dot.classList.toggle("cur", i === index);
    });

    ui.count.textContent = (index + 1) + " / " + scenes.length;
    ui.prev.disabled = index === 0;
    ui.next.disabled = index === scenes.length - 1;

    if (playing) schedule();
  }

  function schedule() {
    clearTimeout(timer);
    if (!playing) return;

    if (index === scenes.length - 1) {
      setPlaying(false);
      return;
    }

    timer = setTimeout(function () {
      go(index + 1);
    }, scenes[index].duration * MOTION_SCALE);
  }

  function setPlaying(value) {
    playing = value;
    clearTimeout(timer);
    ui.play.textContent = value ? "Ⅱ" : "▶";
    ui.play.setAttribute("aria-label", value ? "Pausar" : "Reproducir");

    if (value) {
      if (index === scenes.length - 1) go(0);
      schedule();
    }
  }

  ui.prev.addEventListener("click", function () {
    setPlaying(false);
    go(index - 1);
  });

  ui.next.addEventListener("click", function () {
    setPlaying(false);
    go(index + 1);
  });

  ui.play.addEventListener("click", function () {
    setPlaying(!playing);
  });

  window.addEventListener("keydown", function (event) {
    if (event.key === "ArrowRight") {
      setPlaying(false);
      go(index + 1);
    }
    if (event.key === "ArrowLeft") {
      setPlaying(false);
      go(index - 1);
    }
  });

  typeset(root).finally(function () {
    go(0);
  });
})();
</script>
