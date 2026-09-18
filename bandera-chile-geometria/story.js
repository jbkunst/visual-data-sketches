<script>
(function () {
  "use strict";

  var root = document.getElementById("flag-story");
  if (!root) return;

  var NS = "http://www.w3.org/2000/svg";
  var XNS = "http://www.w3.org/1999/xhtml";
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

  var scenes = [
    {
      step: "Paso 1 de 18",
      title: "Partimos de un trazo",
      text: "Trazamos un segmento horizontal \\(\\overline{AB}\\) de longitud cualquiera. Lo tomamos como unidad y no necesitamos fijar centímetros.",
      note: "Este es el único dato libre de toda la construcción: desde aquí solo copiaremos longitudes, levantaremos perpendiculares y construiremos intersecciones.",
      formula: "\\[AB=1\\]",
      hot: ["AB", "A", "B", "lA", "lB"],
      duration: 4300
    },
    {
      step: "Paso 2 de 18 · perpendicular en A",
      title: "Lo primero es levantar la perpendicular",
      text: "Con centro en \\(A\\) marcamos dos puntos auxiliares \\(U\\) y \\(V\\) sobre la recta \\(AB\\), a la misma distancia de \\(A\\). Desde \\(U\\) y \\(V\\) trazamos arcos iguales que se cortan en \\(X\\).",
      note: "Como \\(AU=AV\\) y \\(XU=XV\\), tanto \\(A\\) como \\(X\\) son equidistantes de \\(U\\) y \\(V\\). Por eso la recta \\(AX\\) es perpendicular a \\(AB\\).",
      formula: "\\[AU=AV,\\quad XU=XV\\;\\Longrightarrow\\;AX\\perp AB\\]",
      hot: ["perpMarkCircle", "U", "V", "perpArcL", "perpArcR", "X", "perpLine"],
      delays: {U:350,V:350,perpArcL:850,perpArcR:1450,X:2050,perpLine:2500},
      duration: 5200
    },
    {
      step: "Paso 2 de 18 · AP = AB/2",
      title: "Ahora construimos la mitad",
      text: "Con arcos de igual radio desde \\(A\\) y \\(B\\) hallamos el punto medio \\(M\\) de \\(AB\\). Abrimos el compás a \\(AM\\) y llevamos esa distancia sobre la perpendicular recién construida: allí queda \\(P\\).",
      note: "No medimos \\(AB/2\\): el punto medio lo determina la geometría y el compás transfiere exactamente esa longitud.",
      formula: "\\[AM=MB=AP=\\frac{AB}{2}\\]",
      hot: ["midArcA1", "midArcB1", "midArcA2", "midArcB2", "midGuide", "M", "lM", "halfC", "AP", "P", "lP"],
      delays: {midArcB1:450,midArcA2:850,midArcB2:1250,midGuide:1650,M:2050,lM:2050,halfC:2550,AP:3150,P:3850,lP:3850},
      duration: 5900
    },
    {
      step: "Paso 3 de 18",
      title: "La diagonal PB determina Q",
      text: "Unimos \\(P\\) con \\(B\\). Luego prolongamos la perpendicular por \\(P\\) y, con el compás abierto a \\(PB\\), marcamos sobre ella el punto \\(Q\\) de modo que \\(PQ=PB\\).",
      note: "Este paso es importante: la nueva longitud no es arbitraria. Sale de la diagonal del triángulo rectángulo \\(APB\\). Su significado aparecerá al final.",
      formula: "\\[PQ=PB,\\qquad AQ=AP+PQ\\]",
      hot: ["PB", "pqArc", "AQguide", "Q", "lQ"],
      delays: {pqArc:950,AQguide:1650,Q:2350,lQ:2350},
      duration: 5400
    },
    {
      step: "Paso 4 de 18",
      title: "Llevamos AQ a la horizontal",
      text: "Prolongamos \\(AB\\). Con centro en \\(A\\) y radio \\(AQ\\) marcamos \\(B'\\); después, con el mismo radio pero centro en \\(B\\), marcamos \\(B''\\).",
      note: "El video hace exactamente dos copias consecutivas de la misma longitud: \\(AB'=AQ\\) y \\(BB''=AQ\\).",
      formula: "\\[AB'=BB''=AQ\\]",
      hot: ["baseRay", "aqCircleA", "Bp", "lBp", "aqCircleB", "Bpp", "lBpp"],
      delays: {aqCircleA:650,Bp:1400,lBp:1400,aqCircleB:2100,Bpp:2850,lBpp:2850},
      duration: 5000
    },
    {
      step: "Paso 5 de 18",
      title: "Las dos circunferencias fijan R",
      text: "Conservamos la circunferencia de centro \\(A\\) y radio \\(AQ\\). Trazamos otra con centro en \\(B'\\) y radio \\(AB\\). Su intersección superior es \\(R\\).",
      note: "Otra vez, el punto no se ubica a ojo: queda determinado por dos distancias ya construidas.",
      formula: "\\[AR=AQ,\\qquad B'R=AB\\]",
      hot: ["aqCircleA", "rCircle", "R", "lR"],
      delays: {rCircle:750,R:1650,lR:1650},
      duration: 4400
    },
    {
      step: "Paso 6 de 18",
      title: "El rayo AR fija la altura",
      text: "Trazamos \\(AR\\). Su encuentro con la perpendicular a \\(AB\\) levantada por \\(B\\) define el punto \\(C\\).",
      note: "La altura del campo izquierdo no se decide a ojo: queda determinada por lo construido antes.",
      formula: "\\[C=AR\\cap(B\\perp AB)\\]",
      hot: ["AR", "BC", "C", "lC"],
      duration: 4400
    },
    {
      step: "Paso 7 de 18",
      title: "Cerramos el rectángulo ABCD",
      text: "Por \\(C\\) trazamos una perpendicular a \\(BC\\). Esta horizontal corta la recta \\(AQ\\) en \\(D\\).",
      note: "Ya tenemos el rectángulo que contendrá la estrella.",
      formula: "\\[AB\\parallel CD,\\qquad AD\\parallel BC\\]",
      hot: ["DC", "D", "lD", "AD"],
      duration: 3500
    },
    {
      step: "Paso 8 de 18",
      title: "Las diagonales encuentran el centro",
      text: "Trazamos \\(AC\\) y \\(BD\\). Su intersección es \\(O\\), el centro del rectángulo.",
      note: "A partir de este punto organizaremos las direcciones que forman la estrella.",
      formula: "\\[O=AC\\cap BD\\]",
      hot: ["AC", "BD", "O", "lO"],
      duration: 4000
    },
    {
      step: "Paso 9 de 18",
      title: "Trazamos la horizontal central",
      text: "Por \\(O\\) trazamos una paralela a \\(AB\\). Sus intersecciones con \\(AD\\) y \\(BC\\) son \\(S_1\\) y \\(S_2\\).",
      note: "Con las diagonales ya tenemos varias de las direcciones que después cortarán la circunferencia de la estrella.",
      formula: "\\[S_1O\\parallel AB\\parallel OS_2\\]",
      hot: ["centerH", "S1", "S2", "lS1", "lS2"],
      duration: 3800
    },
    {
      step: "Paso 10 de 18",
      title: "Copiamos dos ángulos de 36°",
      text: "Reflejamos \\(\\angle AOS_1\\) sobre el lado \\(AO\\) y repetimos el procedimiento con \\(\\angle BOS_2\\). Los nuevos lados cortan \\(AB\\) en \\(T_1\\) y \\(T_2\\).",
      note: "Este es un paso clave. El rectángulo fue construido para que esos ángulos sean de \\(36^\\circ\\), y copiarlos con regla y compás evita medirlos con transportador.",
      formula: "\\[\\angle AOS_1=\\angle BOS_2=36^\\circ\\]",
      hot: ["OT1", "OT2", "angL", "angR", "T1", "T2", "lT1", "lT2", "l36a", "l36b"],
      duration: 6500
    },
    {
      step: "Paso 11 de 18",
      title: "Prolongamos las nuevas direcciones",
      text: "Extendemos \\(T_1O\\) y \\(T_2O\\) hasta el lado superior \\(CD\\). Allí obtenemos \\(T_3\\) y \\(T_4\\).",
      note: "El centro queda rodeado por diez semirrectas consecutivas separadas en pasos de \\(36^\\circ\\).",
      formula: "\\[T_3,O,T_1\\text{ colineales},\\qquad T_4,O,T_2\\text{ colineales}\\]",
      hot: ["T1T3", "T2T4", "T3", "T4", "lT3", "lT4"],
      duration: 3700
    },
    {
      step: "Paso 12 de 18",
      title: "Marcamos Q₁ sobre la diagonal",
      text: "Sobre \\(AC\\) buscamos \\(Q_1\\) de modo que \\(AQ_1\\) sea igual a la altura \\(AD\\).",
      note: "Otra vez no medimos: copiamos con el compás una longitud que ya existe.",
      formula: "\\[AQ_1=AD\\]",
      hot: ["adCircle", "Q1", "lQ1", "AQ1"],
      duration: 4300
    },
    {
      step: "Paso 13 de 18",
      title: "Una paralela determina Q₂",
      text: "Unimos \\(B'\\) con \\(Q_1\\). Por \\(B\\) trazamos una paralela a \\(B'Q_1\\); donde corta a \\(AC\\) aparece \\(Q_2\\).",
      note: "La paralela también es constructible con regla y compás copiando el ángulo correspondiente.",
      formula: "\\[BQ_2\\parallel B'Q_1\\]",
      hot: ["BpQ1", "BQ2", "Q2", "lQ2"],
      duration: 5000
    },
    {
      step: "Paso 14 de 18",
      title: "Fijamos el tamaño de la estrella",
      text: "Hallamos el punto medio \\(Q_3\\) de \\(AQ_2\\). Con centro en \\(O\\) y radio de longitud \\(AQ_3\\), trazamos una circunferencia.",
      note: "Las diez direcciones que pasan por \\(O\\) cortan esta circunferencia en \\(R_1,\\ldots,R_{10}\\).",
      formula: "\\[r_\\star=AQ_3=\\frac{AQ_2}{2}\\]",
      hot: ["Q3", "lQ3", "starCircle", "R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10", "lR2", "lR4", "lR6", "lR8", "lR10"],
      duration: 6200
    },
    {
      step: "Paso 15 de 18",
      title: "Los cinco vértices quedan a 72°",
      text: "Tomamos \\(R_2,R_4,R_6,R_8,R_{10}\\): son cinco puntos alternados de los diez anteriores, por lo que los vértices consecutivos del pentágono quedan separados por \\(72^\\circ\\).",
      note: "Una vez entendido ese primer salto angular, el resto es repetición. Para formar el pentagrama unimos \\(R_2\\to R_6\\to R_{10}\\to R_4\\to R_8\\to R_2\\).",
      formula: "\\[2\\times36^\\circ=72^\\circ\\]",
      hot: ["star", "l72"],
      duration: 5200
    },
    {
      step: "Paso 16 de 18",
      title: "Extendemos el paño superior",
      text: "Prolongamos \\(DC\\) hacia la derecha y marcamos \\(P_1\\) de modo que \\(DP_1\\) tenga la misma longitud que \\(AB''\\).",
      note: "La nueva longitud reutiliza exactamente la construcción hecha sobre la base.",
      formula: "\\[DP_1=AB''\\]",
      hot: ["topExt", "P1", "lP1"],
      duration: 3300
    },
    {
      step: "Paso 17 de 18",
      title: "Duplicamos la altura hacia abajo",
      text: "Unimos \\(P_1\\) con \\(B''\\) y prolongamos ese trazo hasta \\(P_2\\), copiando la misma longitud al otro lado de \\(B''\\).",
      note: "Aquí ya no aparece una idea geométrica nueva: repetimos una longitud sobre una misma recta.",
      formula: "\\[P_1B''=B''P_2\\]",
      hot: ["rightVert", "P2", "lP2", "Bpp", "lBpp"],
      duration: 3100
    },
    {
      step: "Paso 18 de 18",
      title: "Cerramos el rectángulo inferior",
      text: "Por \\(P_2\\) trazamos una perpendicular a \\(P_1P_2\\). Su encuentro con la prolongación de \\(DA\\) es \\(P_3\\).",
      note: "Con esto quedan definidos los tres campos de la bandera.",
      formula: "\\[P_2P_3\\perp P_1P_2\\]",
      hot: ["bottom", "leftLower", "midExt", "P3", "lP3"],
      duration: 3400
    },
    {
      step: "Resultado geométrico",
      title: "La construcción se convierte en bandera",
      text: "El rectángulo \\(ABCD\\) forma el campo azul; a su derecha queda el campo blanco y debajo aparece el campo rojo. La estrella blanca usa los cinco vértices alternados construidos alrededor de \\(O\\).",
      note: "Las líneas auxiliares permanecen apenas visibles para que el resultado conserve memoria de su construcción.",
      formula: "",
      hot: ["blueFill", "whiteFill", "redFill", "whiteStar"],
      duration: 3900
    },
    {
      step: "Lectura final",
      title: "Ahora revelamos la razón áurea",
      text: "La proporción áurea estuvo escondida desde el paso 3. Como \\(AP=AB/2\\) y \\(PQ=PB\\), la longitud \\(AQ\\) resulta ser \\(\\varphi\\,AB\\). Esa misma relación reaparece en el campo blanco y en el diámetro de la estrella.",
      note: "La gracia es verla después de haber construido todo: \\(\\varphi\\) no se impuso como una medida externa, apareció a partir de las relaciones geométricas.",
      formula: "\\[\\frac{AQ}{AB}=\\varphi,\\qquad \\frac{BB''}{AB}=\\varphi,\\qquad \\frac{AD}{d_\\star}=\\varphi\\]",
      hot: ["AB", "AQguide", "Q", "lQ", "blueDim", "whiteDim", "starDiam", "AD", "starCircle"],
      duration: 6800
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
        '<p class="note"></p>' +
        '<div class="formula"></div>' +
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
    viewBox: "0 0 820 560",
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
  point("V", V, 1, 1);
  path("perpArcL", screenArc(U, perpRadius, 30, 86), "compass", 1, 1);
  path("perpArcR", screenArc(V, perpRadius, 94, 150), "compass", 1, 1);
  point("X", X, 1, 1);
  line("perpLine", [0, -0.10], [0, 0.80], "guide", 1, 2);

  // Paso 2b: midpoint of AB, then transfer AM onto the perpendicular to get P.
  path("midArcA1", screenArc(A, midpointRadius, 24, 70), "compass", 2, 2);
  path("midArcB1", screenArc(B, midpointRadius, 110, 156), "compass", 2, 2);
  path("midArcA2", screenArc(A, midpointRadius, -70, -24), "compass", 2, 2);
  path("midArcB2", screenArc(B, midpointRadius, 204, 250), "compass", 2, 2);
  line("midGuide", [0.5, -midpointY - 0.06], [0.5, midpointY + 0.06], "guide", 2, 2);
  point("M", M, 2, 2);
  mathLabel("lM", M, "M", -7, 10, 2, 2);
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
  var introduced = {};
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

  function animateStroke(node) {
    if (!node.getTotalLength) return;
    try {
      var length = node.getTotalLength();
      if (!Number.isFinite(length) || length <= 0) return;
      node.style.strokeDasharray = length + " " + length;
      node.style.strokeDashoffset = length;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          node.style.transition =
            "stroke-dashoffset .85s cubic-bezier(.2,.75,.25,1), opacity .38s ease, stroke .38s ease, stroke-width .38s ease";
          node.style.strokeDashoffset = 0;
          setTimeout(function () {
            node.style.strokeDasharray = "";
            node.style.strokeDashoffset = "";
            node.style.transition = "";
          }, 900);
        });
      });
    } catch (_) {}
  }

  function go(next) {
    index = Math.max(0, Math.min(scenes.length - 1, next));
    var scene = scenes[index];
    var hot = {};
    scene.hot.forEach(function (id) { hot[id] = true; });

    ui.step.textContent = scene.step;
    ui.title.textContent = scene.title;
    ui.text.innerHTML = scene.text;
    ui.note.innerHTML = scene.note;
    ui.formula.innerHTML = scene.formula;
    typeset(ui.formula);

    var token = ++runToken;
    var delays = scene.delays || {};

    Object.keys(items).forEach(function (id) {
      var item = items[id];
      var node = item.node;
      var on = alive(index, item);

      function showItem() {
        if (token !== runToken) return;
        node.classList.remove("off");
        node.classList.add("on");
        node.classList.toggle("hot", !!hot[id]);

        if (!introduced[id]) {
          introduced[id] = true;
          if (node.classList.contains("geo")) animateStroke(node);
        }
      }

      if (!on) {
        node.classList.add("off");
        node.classList.remove("on");
        node.classList.remove("hot");
        return;
      }

      var delay = Number(delays[id] || 0);
      if (delay > 0 && !introduced[id]) {
        node.classList.add("off");
        node.classList.remove("on");
        node.classList.remove("hot");
        setTimeout(showItem, delay);
      } else {
        showItem();
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
    }, scenes[index].duration);
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
