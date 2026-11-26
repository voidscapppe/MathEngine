
"use strict";

/* =========================================
   MATHENGINE v0.2.0
   Mathematical Computing Laboratory
   ========================================= */

const $ = id => document.getElementById(id);

const colors = [
    "#58a6ff",
    "#a78bfa",
    "#3fb950",
    "#f2cc60",
    "#ff7b72",
    "#39c5cf",
    "#ff9bce",
    "#ffa657"
];


/* =========================================
   1. EXPRESSION PARSER
   ========================================= */

const mathFunctions = {
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    sinh: Math.sinh,
    cosh: Math.cosh,
    tanh: Math.tanh,
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    abs: Math.abs,
    exp: Math.exp,
    ln: Math.log,
    log: Math.log,
    log10: Math.log10,
    floor: Math.floor,
    ceil: Math.ceil,
    sign: Math.sign,
    sec: x => 1 / Math.cos(x),
    csc: x => 1 / Math.sin(x),
    cot: x => 1 / Math.tan(x)
};

function compile(source, variables = ["x"]) {

    source = source.trim()
        .replace(/π/g, "pi")
        .replace(/−/g, "-")
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/²/g, "^2")
        .replace(/³/g, "^3")
        .replace(/\*\*/g, "^");

    if (!source || source.length > 250) {
        throw new Error("Enter an expression of 1–250 characters.");
    }

    const tokens = [];

    let index = 0;

    while (index < source.length) {

        const rest = source.slice(index);

        if (/^\s/.test(rest)) {
            index++;
            continue;
        }

        const match = rest.match(
            /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|^[A-Za-z][A-Za-z0-9_]*|^[+\-*/^()]/
        );

        if (!match) {
            throw new Error("Unsupported character: " + rest[0]);
        }

        tokens.push(match[0]);
        index += match[0].length;
    }

    let position = 0;

    const peek = () => tokens[position];
    const take = () => tokens[position++];

    const isNumber = token =>
        token !== undefined && /^(?:\d|\.)/.test(token);

    const isName = token =>
        token !== undefined && /^[A-Za-z]/.test(token);

    function atom() {

        const token = take();

        if (isNumber(token)) {
            const value = Number(token);

            if (!Number.isFinite(value)) {
                throw new Error("Number is too large.");
            }

            return () => value;
        }

        if (token === "(") {

            const expression = addition();

            if (take() !== ")") {
                throw new Error("Missing closing parenthesis.");
            }

            return expression;
        }

        if (isName(token)) {

            const name = token.toLowerCase();

            if (
                Object.prototype.hasOwnProperty.call(
                    mathFunctions, name
                )
            ) {

                if (take() !== "(") {
                    throw new Error("Use " + name + "(...)");
                }

                const argument = addition();

                if (take() !== ")") {
                    throw new Error("Missing closing parenthesis.");
                }

                return scope =>
                    mathFunctions[name](argument(scope));
            }

            if (name === "pi") {
                return () => Math.PI;
            }

            if (name === "e") {
                return () => Math.E;
            }

            if (variables.includes(name)) {
                return scope => scope[name];
            }

            throw new Error("Unknown symbol: " + token);
        }

        throw new Error("Expected a number or expression.");
    }

    function power() {

        let left = atom();

        if (peek() === "^") {

            take();

            const a = left;
            const b = unary();

            left = scope => Math.pow(a(scope), b(scope));
        }

        return left;
    }

    function unary() {

        if (peek() === "+") {
            take();
            return unary();
        }

        if (peek() === "-") {

            take();

            const expression = unary();

            return scope => -expression(scope);
        }

        return power();
    }

    function multiplication() {

        let left = unary();

        while (
            peek() === "*" ||
            peek() === "/" ||
            peek() === "(" ||
            isName(peek())
        ) {

            const operator =
                peek() === "*" || peek() === "/"
                    ? take()
                    : "*";

            const a = left;
            const b = unary();

            left = operator === "*"
                ? scope => a(scope) * b(scope)
                : scope => a(scope) / b(scope);
        }

        return left;
    }

    function addition() {

        let left = multiplication();

        while (peek() === "+" || peek() === "-") {

            const operator = take();

            const a = left;
            const b = multiplication();

            left = operator === "+"
                ? scope => a(scope) + b(scope)
                : scope => a(scope) - b(scope);
        }

        return left;
    }

    const expression = addition();

    if (position !== tokens.length) {
        throw new Error("Unexpected token: " + peek());
    }

    return scope => {

        const result = expression(scope);

        return Number.isFinite(result) ? result : NaN;
    };
}


/* =========================================
   2. GENERAL MATHEMATICAL FUNCTIONS
   ========================================= */

function number(id) {

    const element = $(id);
    const value = Number(element.value);

    if (element.value.trim() === "" ||
        !Number.isFinite(value)) {

        throw new Error("Invalid number: " + id);
    }

    return value;
}

function checkBounds(a, b) {

    if (!(a < b) || !Number.isFinite(b - a) || b - a > 100000) {
        throw new Error("Invalid range. Lower bound must be smaller.");
    }
}

function range(a, b, count) {

    return Array.from(
        { length: count },
        (_, i) => a + (b - a) * i / (count - 1)
    );
}

function format(value) {

    if (!Number.isFinite(value)) {
        return "Undefined";
    }

    if (Math.abs(value) < 1e-10) {
        return "0";
    }

    return Number(value.toPrecision(8)).toString();
}

function display(id, text, error = false) {

    const element = $(id);

    if (!element) return;

    element.textContent = text;
    element.classList.toggle("error", error);
}

function safe(id, callback) {

    return async (...args) => {

        try {
            await callback(...args);
        }

        catch (error) {
            display(id, "Error: " + error.message, true);
        }
    };
}

function derivative(f, x) {

    const h = 0.00001 * Math.max(1, Math.abs(x));

    return (f(x + h) - f(x - h)) / (2 * h);
}

function simpson(f, a, b, n = 2000) {

    if (a === b) return 0;

    if (n % 2 !== 0) n++;

    const h = (b - a) / n;

    let sum = f(a) + f(b);

    for (let i = 1; i < n; i++) {

        const x = a + i * h;

        sum += (i % 2 === 0 ? 2 : 4) * f(x);
    }

    const result = sum * h / 3;

    if (!Number.isFinite(result)) {
        throw new Error("Non-finite integral samples.");
    }

    return result;
}


/* =========================================
   3. PLOTLY SETTINGS
   ========================================= */

const axisStyle = {
    gridcolor: "#30363d",
    zerolinecolor: "#8b949e",
    color: "#a4afbd",
    automargin: true
};

const plotLayout = {
    paper_bgcolor: "#161b22",
    plot_bgcolor: "#0d1117",

    font: {
        color: "#e6edf3",
        family: "Arial"
    },

    margin: {
        l: 55,
        r: 20,
        t: 35,
        b: 50
    },

    legend: {
        orientation: "h",
        y: 1.08
    }
};

const plotConfig = {
    responsive: true,
    scrollZoom: true,
    displaylogo: false,

    toImageButtonOptions: {
        format: "png",
        filename: "MathEngine",
        scale: 2
    }
};

function requirePlotly() {

    if (!window.Plotly) {
        throw new Error(
            "Plotly failed to load. Check your internet connection."
        );
    }
}

function lineTrace(x, y, name, color, dash = "solid") {

    return {
        x: x,
        y: y,
        name: name,
        type: "scatter",
        mode: "lines",
        connectgaps: false,

        line: {
            color: color,
            width: 2.5,
            dash: dash
        }
    };
}

function sceneLayout() {

    const axis = {
        ...axisStyle,
        backgroundcolor: "#0d1117",
        showbackground: true
    };

    return {
        ...plotLayout,

        margin: {
            l: 0,
            r: 0,
            t: 20,
            b: 0
        },

        scene: {

            xaxis: {
                ...axis,
                title: "x"
            },

            yaxis: {
                ...axis,
                title: "y"
            },

            zaxis: {
                ...axis,
                title: "z"
            },

            aspectmode: "auto",

            camera: {
                eye: {
                    x: 1.6,
                    y: 1.6,
                    z: 1.1
                }
            }
        }
    };
}


/* =========================================
   4. 2D GRAPHING ENGINE
   ========================================= */

let activeFunctions = [];
let lastRange = null;

function cleanGraph(values, span) {

    return values.map((value, i) => {

        if (!Number.isFinite(value) ||
            Math.abs(value) > 1e10) {

            return null;
        }

        if (
            i > 0 &&
            Number.isFinite(values[i - 1]) &&
            Math.abs(value - values[i - 1]) > span * 5
        ) {
            return null;
        }

        return value;
    });
}

async function plot2D() {

    requirePlotly();

    const mode = $("graphMode").value;

    const expressions = $("functionInput").value
        .split("\n")
        .map(value => value.trim())
        .filter(Boolean);

    if (expressions.length === 0 ||
        expressions.length > 8) {

        throw new Error("Enter between one and eight expressions.");
    }

    const xmin = number("xmin");
    const xmax = number("xmax");
    const ymin = number("ymin");
    const ymax = number("ymax");
    const tmin = number("tmin");
    const tmax = number("tmax");

    checkBounds(xmin, xmax);
    checkBounds(ymin, ymax);
    checkBounds(tmin, tmax);

    const traces = [];
    const functions = [];

    if (mode === "parametric") {

        if (expressions.length !== 2) {
            throw new Error("Enter x(t) and y(t) on separate lines.");
        }

        const fx = compile(expressions[0], ["t"]);
        const fy = compile(expressions[1], ["t"]);

        const t = range(tmin, tmax, 1600);

        const x = t.map(t => fx({ t }));
        const y = t.map(t => fy({ t }));

        traces.push(
            lineTrace(x, y, "Parametric curve", colors[0])
        );
    }

    else if (mode === "polar") {

        expressions.forEach((expression, index) => {

            const f = compile(expression, ["t"]);
            const t = range(tmin, tmax, 1600);

            const x = t.map(t =>
                f({ t }) * Math.cos(t)
            );

            const y = t.map(t =>
                f({ t }) * Math.sin(t)
            );

            traces.push(
                lineTrace(x, y, "r = " + expression, colors[index])
            );
        });
    }

    else {

        expressions.forEach((expression, index) => {

            const compiled = compile(expression, ["x"]);
            const f = x => compiled({ x });

            const x = range(xmin, xmax, 2001);

            const y = cleanGraph(
                x.map(f),
                ymax - ymin
            );

            functions.push({
                expression,
                f
            });

            traces.push(
                lineTrace(x, y, expression, colors[index])
            );
        });
    }

    const valid = traces.some(trace =>
        trace.y.some((y, i) =>
            Number.isFinite(y) &&
            Number.isFinite(trace.x[i])
        )
    );

    if (!valid) {
        throw new Error("No finite real-valued graph points.");
    }

    await Plotly.react("graphPlot", traces, {

        ...plotLayout,

        xaxis: {
            ...axisStyle,
            title: "x",
            range: [xmin, xmax]
        },

        yaxis: {
            ...axisStyle,
            title: "y",
            range: [ymin, ymax]
        },

        dragmode: "pan"

    }, plotConfig);

    activeFunctions = functions;

    lastRange = {
        xmin, xmax, ymin, ymax
    };

    $("activeFunction").replaceChildren();

    activeFunctions.forEach((item, index) => {

        const option = document.createElement("option");

        option.value = index;
        option.textContent = item.expression;

        $("activeFunction").appendChild(option);
    });

    display("analysisResults", "Results will appear here.");

    display(
        "graphStatus",
        "Graph created. Drag to pan and scroll to zoom."
    );
}


/* =========================================
   5. NUMERICAL ROOT FINDER
   ========================================= */

function findRoots(f, a, b) {

    const roots = [];
    const n = 2000;
    const step = (b - a) / n;

    function accept(x) {

        const value = f(x);

        if (
            Number.isFinite(value) &&
            Math.abs(value) < 0.000001 &&
            !roots.some(root => Math.abs(root - x) < step * 0.5)
        ) {

            roots.push(x);
        }
    }

    let left = a;
    let fl = f(a);

    accept(a);

    for (let i = 1; i <= n; i++) {

        const right = a + i * step;
        const fr = f(right);

        if (Number.isFinite(fr)) {

            if (Math.abs(fr) < 0.0000001) {
                accept(right);
            }

            if (Number.isFinite(fl) && fl * fr < 0) {

                let l = left;
                let r = right;
                let vl = fl;

                for (let j = 0; j < 45; j++) {

                    const middle = (l + r) / 2;
                    const fm = f(middle);

                    if (!Number.isFinite(fm)) break;

                    if (vl * fm <= 0) {
                        r = middle;
                    }

                    else {
                        l = middle;
                        vl = fm;
                    }
                }

                accept((l + r) / 2);
            }

            if (
                i < n &&
                Math.abs(fr) < Math.abs(fl) &&
                Math.abs(fr) < Math.abs(f(right + step))
            ) {

                let x = right;

                for (let j = 0; j < 15; j++) {

                    const d = derivative(f, x);

                    if (!Number.isFinite(d) ||
                        Math.abs(d) < 1e-12) break;

                    const next = x - f(x) / d;

                    if (next < left || next > right + step) break;

                    x = next;
                }

                accept(x);
            }
        }

        left = right;
        fl = fr;
    }

    return roots.sort((a, b) => a - b).slice(0, 30);
}


/* =========================================
   6. 2D CALCULUS TOOLS
   ========================================= */

async function analyze2D(operation) {

    const selected = $("activeFunction").value;

    if (!lastRange ||
        selected === "" ||
        !activeFunctions[Number(selected)]) {

        throw new Error("Plot a Cartesian function first.");
    }

    const index = Number(selected);
    const f = activeFunctions[index].f;

    const x0 = number("pointX");

    const { xmin, xmax, ymin, ymax } = lastRange;

    const x = range(xmin, xmax, 1600);

    const value = f(x0);
    const slope = derivative(f, x0);

    let result = "";

    if (operation === "evaluate") {

        if (!Number.isFinite(value)) {
            throw new Error("Function is undefined at this point.");
        }

        result =
            "x = " + format(x0) + "\n" +
            "f(x) = " + format(value);

        await Plotly.addTraces("graphPlot", {

            x: [x0],
            y: [value],
            type: "scatter",
            mode: "markers",
            name: "Selected Point",

            marker: {
                color: "#f2cc60",
                size: 10
            }
        });
    }

    if (operation === "derivative") {

        const y = cleanGraph(
            x.map(x => derivative(f, x)),
            ymax - ymin
        );

        await Plotly.addTraces(
            "graphPlot",
            lineTrace(x, y, "f'(x)", "#f2cc60", "dash")
        );

        result = "Approximate derivative\n" +
                 "f'(" + format(x0) + ") = " + format(slope);
    }

    if (operation === "tangent") {

        const h = 1e-5 * Math.max(1, Math.abs(x0));

        const left = (value - f(x0 - h)) / h;
        const right = (f(x0 + h) - value) / h;

        if (
            ![value, slope, left, right].every(Number.isFinite) ||
            Math.abs(left - right) >
            0.05 * Math.max(1, Math.abs(left), Math.abs(right))
        ) {

            throw new Error("No reliable tangent at this point.");
        }

        const y = x.map(x =>
            value + slope * (x - x0)
        );

        await Plotly.addTraces(
            "graphPlot",
            lineTrace(x, y, "Tangent", "#ff7b72", "dash")
        );

        result =
            "Tangent Line\n" +
            "Slope ≈ " + format(slope) + "\n" +
            "y ≈ " + format(value) +
            " + " + format(slope) +
            " * (x - " + format(x0) + ")";
    }

    if (operation === "integral") {

        const a = number("intA");
        const b = number("intB");

        checkBounds(a, b);

        const coarse = simpson(f, a, b, 2000);
        const fine = simpson(f, a, b, 4000);

        const ix = range(a, b, 1000);
        const iy = ix.map(f);

        if (!iy.every(Number.isFinite)) {
            throw new Error("Non-finite integration samples.");
        }

        await Plotly.addTraces("graphPlot", {

            ...lineTrace(ix, iy, "Integral", "#3fb950"),

            fill: "tozeroy",
            fillcolor: "rgba(63, 185, 80, 0.25)"
        });

        result =
            "Definite Integral\n" +
            "Lower bound: " + format(a) + "\n" +
            "Upper bound: " + format(b) + "\n" +
            "Result ≈ " + format(fine) + "\n" +
            "Refinement difference: " +
                format(Math.abs(fine - coarse)) + "\n" +
            "Method: Simpson's Rule";
    }

    if (operation === "roots") {

        const roots = findRoots(f, xmin, xmax);

        if (roots.length) {

            await Plotly.addTraces("graphPlot", {

                x: roots,
                y: roots.map(f),
                type: "scatter",
                mode: "markers",
                name: "Approximate Zeros",

                marker: {
                    color: "#f2cc60",
                    size: 10
                }
            });
        }

        result = roots.length
            ? "Approximate zeros (up to 30):\n" +
              roots.map(x => "x = " + format(x)).join("\n")
            : "No roots detected in the selected range.";
    }

    if (operation === "intersections") {

        const other = activeFunctions.find(
            (_, i) => i !== index
        );

        if (!other) {
            throw new Error("Plot at least two functions.");
        }

        const roots = findRoots(
            x => f(x) - other.f(x),
            xmin,
            xmax
        );

        if (roots.length) {

            await Plotly.addTraces("graphPlot", {

                x: roots,
                y: roots.map(f),
                type: "scatter",
                mode: "markers",
                name: "Intersections",

                marker: {
                    color: "#ff7b72",
                    size: 10
                }
            });
        }

        result = "Comparison with " + other.expression + "\n" +
            (roots.length
                ? roots.map(x =>
                    "(" + format(x) + ", " + format(f(x)) + ")"
                  ).join("\n")
                : "No intersections detected.");
    }

    display("analysisResults", result);
}


/* =========================================
   7. CALCULUS III SURFACE ENGINE
   ========================================= */

function surfaceFunction() {

    const compiled = compile(
        $("surfaceExpr").value,
        ["x", "y"]
    );

    return (x, y) => compiled({ x, y });
}

async function plotSurface(extraTraces = []) {

    requirePlotly();

    const f = surfaceFunction();

    const xmin = number("sxmin");
    const xmax = number("sxmax");
    const ymin = number("symin");
    const ymax = number("symax");

    checkBounds(xmin, xmax);
    checkBounds(ymin, ymax);

    const resolution = number("resolution");

    if (!Number.isInteger(resolution) ||
        resolution < 20 ||
        resolution > 100) {

        throw new Error("Resolution must be an integer from 20 to 100.");
    }

    const x = range(xmin, xmax, resolution);
    const y = range(ymin, ymax, resolution);

    const z = y.map(y =>
        x.map(x => {

            const value = f(x, y);

            return Number.isFinite(value) &&
                   Math.abs(value) < 1e12
                ? value
                : null;
        })
    );

    if (!z.some(row => row.some(Number.isFinite))) {
        throw new Error("No real surface points in this region.");
    }

    const surface = {

        type: "surface",

        x: x,
        y: y,
        z: z,

        colorscale: $("colorscale").value,

        contours: {

            z: {

                show: $("contours").checked,
                usecolormap: true,

                project: {
                    z: true
                }
            }
        },

        colorbar: {
            title: {
                text: "z"
            }
        }
    };

    await Plotly.react(
        "surfacePlot",
        [surface, ...extraTraces],
        sceneLayout(),
        plotConfig
    );

    display("surfaceStatus", "Surface plotted successfully.");
}


/* =========================================
   8. PARTIAL DERIVATIVES AND HESSIAN
   ========================================= */

function partialDerivatives(f, x, y) {

    const h = 0.0001 *
        Math.max(1, Math.abs(x), Math.abs(y));

    const value = f(x, y);

    const fx =
        (f(x + h, y) - f(x - h, y)) / (2 * h);

    const fy =
        (f(x, y + h) - f(x, y - h)) / (2 * h);

    const fxx =
        (f(x + h, y) - 2 * value + f(x - h, y))
        / (h * h);

    const fyy =
        (f(x, y + h) - 2 * value + f(x, y - h))
        / (h * h);

    const fxy = (

        f(x + h, y + h) -
        f(x + h, y - h) -
        f(x - h, y + h) +
        f(x - h, y - h)

    ) / (4 * h * h);

    if (![value, fx, fy, fxx, fyy, fxy]
        .every(Number.isFinite)) {

        throw new Error("Derivatives are undefined near this point.");
    }

    const determinant = fxx * fyy - fxy * fxy;

    return {
        value,
        fx,
        fy,
        fxx,
        fyy,
        fxy,
        determinant
    };
}

async function analyzeSurface(showPlane = false) {

    const f = surfaceFunction();

    const x = number("px");
    const y = number("py");

    const ux = number("ux");
    const uy = number("uy");

    const length = Math.hypot(ux, uy);

    if (length === 0) {
        throw new Error("Direction vector cannot be zero.");
    }

    const p = partialDerivatives(f, x, y);

    const gradient = Math.hypot(p.fx, p.fy);

    const directional =
        (p.fx * ux + p.fy * uy) / length;

    let classification = "Not a stationary point";

    if (gradient < 0.0001) {

        if (p.determinant > 0.000001 && p.fxx > 0) {
            classification = "Local Minimum (numerical test)";
        }

        else if (p.determinant > 0.000001 && p.fxx < 0) {
            classification = "Local Maximum (numerical test)";
        }

        else if (p.determinant < -0.000001) {
            classification = "Saddle Point (numerical test)";
        }

        else {
            classification = "Inconclusive Hessian test";
        }
    }

    const result =

        "POINT ANALYSIS\n\n" +

        "f(x,y) = " + format(p.value) + "\n\n" +

        "PARTIAL DERIVATIVES\n" +
        "∂f/∂x ≈ " + format(p.fx) + "\n" +
        "∂f/∂y ≈ " + format(p.fy) + "\n\n" +

        "GRADIENT\n" +
        "∇f ≈ (" + format(p.fx) +
            ", " + format(p.fy) + ")\n" +

        "|∇f| ≈ " + format(gradient) + "\n" +

        "Directional derivative ≈ " +
            format(directional) + "\n\n" +

        "SECOND ORDER DERIVATIVES\n" +
        "fxx ≈ " + format(p.fxx) + "\n" +
        "fyy ≈ " + format(p.fyy) + "\n" +
        "fxy ≈ " + format(p.fxy) + "\n\n" +

        "HESSIAN DETERMINANT\n" +
        "D ≈ " + format(p.determinant) + "\n" +

        "Classification: " + classification + "\n\n" +

        "TANGENT PLANE\n" +
        "z ≈ " + format(p.value) +
        " + " + format(p.fx) +
        "(x - " + format(x) + ")" +
        " + " + format(p.fy) +
        "(y - " + format(y) + ")";

    if (showPlane) {

        const xx = range(x - 2, x + 2, 20);
        const yy = range(y - 2, y + 2, 20);

        const zz = yy.map(b =>
            xx.map(a =>

                p.value +
                p.fx * (a - x) +
                p.fy * (b - y)
            )
        );

        await plotSurface([

            {
                type: "surface",
                x: xx,
                y: yy,
                z: zz,

                opacity: 0.6,
                showscale: false,
                name: "Tangent Plane",

                colorscale: [
                    [0, "#f2cc60"],
                    [1, "#f2cc60"]
                ]
            },

            {
                type: "scatter3d",
                mode: "markers",

                x: [x],
                y: [y],
                z: [p.value],

                name: "Selected Point",

                marker: {
                    color: "#ff7b72",
                    size: 6
                }
            }

        ]);
    }

    display("pointResults", result);
}


/* =========================================
   9. DOUBLE INTEGRALS
   ========================================= */

function doubleIntegral() {

    const f = surfaceFunction();

    const a = number("ixa");
    const b = number("ixb");
    const c = number("iya");
    const d = number("iyb");

    checkBounds(a, b);
    checkBounds(c, d);

    const n = number("intN");

    if (!Number.isInteger(n) || n < 10 || n > 200) {
        throw new Error("Subdivisions must be between 10 and 200.");
    }

    function midpoint(count) {

        const dx = (b - a) / count;
        const dy = (d - c) / count;

        let sum = 0;

        for (let i = 0; i < count; i++) {

            for (let j = 0; j < count; j++) {

                const x = a + (i + 0.5) * dx;
                const y = c + (j + 0.5) * dy;

                const value = f(x, y);

                if (!Number.isFinite(value)) {
                    throw new Error("Function undefined inside region.");
                }

                sum += value * dx * dy;
            }
        }

        return sum;
    }

    const coarse = midpoint(n);
    const fine = midpoint(n * 2);

    if (!Number.isFinite(fine)) {
        throw new Error("Integral overflow.");
    }

    display(

        "integralResults",

        "DOUBLE INTEGRAL\n\n" +

        "x ∈ [" + a + ", " + b + "]\n" +
        "y ∈ [" + c + ", " + d + "]\n\n" +

        "Result ≈ " + format(fine) + "\n" +

        "Rectangle area = " +
            format((b - a) * (d - c)) + "\n" +

        "Refinement difference = " +
            format(Math.abs(fine - coarse)) + "\n\n" +

        "Method: Two-dimensional Midpoint Rule"
    );
}


/* =========================================
   10. VECTOR FIELDS, DIVERGENCE AND CURL
   ========================================= */

async function plotVectorField() {

    requirePlotly();

    const variables = ["x", "y", "z"];

    const P = compile($("vecP").value, variables);
    const Q = compile($("vecQ").value, variables);
    const R = compile($("vecR").value, variables);

    const x0 = number("vx");
    const y0 = number("vy");
    const z0 = number("vz");

    const point = {
        x: x0,
        y: y0,
        z: z0
    };

    const h = 0.0001 * Math.max(
        1, Math.abs(x0), Math.abs(y0), Math.abs(z0)
    );

    function diff(f, variable) {

        const a = {
            ...point,
            [variable]: point[variable] + h
        };

        const b = {
            ...point,
            [variable]: point[variable] - h
        };

        return (f(a) - f(b)) / (2 * h);
    }

    const field = [
        P(point),
        Q(point),
        R(point)
    ];

    const divergence =

        diff(P, "x") +
        diff(Q, "y") +
        diff(R, "z");

    const curl = [

        diff(R, "y") - diff(Q, "z"),

        diff(P, "z") - diff(R, "x"),

        diff(Q, "x") - diff(P, "y")
    ];

    if (![...field, divergence, ...curl]
        .every(Number.isFinite)) {

        throw new Error("Field or derivative is undefined.");
    }

    const data = {

        x: [],
        y: [],
        z: [],

        u: [],
        v: [],
        w: []
    };

    const coordinates = range(-2, 2, 5);

    for (const x of coordinates) {

        for (const y of coordinates) {

            for (const z of coordinates) {

                const scope = { x, y, z };

                const u = P(scope);
                const v = Q(scope);
                const w = R(scope);

                if (![u, v, w].every(Number.isFinite) ||
                    Math.hypot(u, v, w) > 1e6) {

                    continue;
                }

                data.x.push(x);
                data.y.push(y);
                data.z.push(z);

                data.u.push(u);
                data.v.push(v);
                data.w.push(w);
            }
        }
    }

    if (data.x.length === 0) {
        throw new Error("No finite vector samples.");
    }

    await Plotly.react("vectorPlot", [

        {
            type: "cone",

            ...data,

            colorscale: "Viridis",

            sizemode: "absolute",
            sizeref: 0.5,

            anchor: "tail"
        }

    ], sceneLayout(), plotConfig);

    display(

        "vectorResults",

        "VECTOR FIELD\n\n" +

        "F = (" + field.map(format).join(", ") + ")\n\n" +

        "Divergence ≈ " + format(divergence) + "\n\n" +

        "Curl ≈ (" + curl.map(format).join(", ") + ")"
    );
}


/* =========================================
   11. INITIALIZE 2D GRAPH PAGE
   ========================================= */

if ($("graphPlot")) {

    $("plotButton").addEventListener(
        "click",
        safe("graphStatus", plot2D)
    );

    $("examples").addEventListener(
        "change",
        safe("graphStatus", async () => {

            const value = $("examples").value;

            if (value) {

                $("graphMode").value = "cartesian";

                $("functionLabel").textContent =
                    "Functions f(x), one per line";

                $("functionInput").value = value;

                await plot2D();
            }
        })
    );

    $("graphMode").addEventListener(
        "change",
        safe("graphStatus", async () => {

            const mode = $("graphMode").value;

            if (mode === "cartesian") {

                $("functionLabel").textContent =
                    "Functions f(x), one per line";

                $("functionInput").value =
                    "sin(x)\ncos(x)";
            }

            if (mode === "polar") {

                $("functionLabel").textContent =
                    "Polar functions r(t), one per line";

                $("functionInput").value =
                    "2*cos(5*t)";
            }

            if (mode === "parametric") {

                $("functionLabel").textContent =
                    "Enter x(t) and y(t) on separate lines";

                $("functionInput").value =
                    "3*cos(3*t)\n3*sin(2*t)";
            }

            await plot2D();
        })
    );

    $("resetGraph").addEventListener(
        "click",
        safe("graphStatus", async () => {

            $("graphMode").value = "cartesian";

            $("functionLabel").textContent =
                "Functions f(x), one per line";

            $("functionInput").value = "sin(x)\ncos(x)";

            $("xmin").value = -10;
            $("xmax").value = 10;
            $("ymin").value = -5;
            $("ymax").value = 5;

            $("tmin").value = 0;
            $("tmax").value = 2 * Math.PI;

            $("examples").value = "";

            await plot2D();
        })
    );

    document.querySelectorAll("[data-operation]")
        .forEach(button => {

            button.addEventListener(
                "click",
                safe("analysisResults", () =>
                    analyze2D(button.dataset.operation)
                )
            );
        });

    safe("graphStatus", plot2D)();
}


/* =========================================
   12. INITIALIZE CALCULUS III PAGE
   ========================================= */

if ($("surfacePlot")) {

    $("surfaceButton").addEventListener(
        "click",
        safe("surfaceStatus", () => plotSurface())
    );

    $("surfaceExample").addEventListener(
        "change",
        safe("surfaceStatus", async () => {

            if ($("surfaceExample").value) {

                $("surfaceExpr").value =
                    $("surfaceExample").value;

                await plotSurface();
            }
        })
    );

    $("pointButton").addEventListener(
        "click",
        safe("pointResults", () => analyzeSurface(false))
    );

    $("planeButton").addEventListener(
        "click",
        safe("pointResults", () => analyzeSurface(true))
    );

    $("integrateButton").addEventListener(
        "click",
        safe("integralResults", doubleIntegral)
    );

    $("vectorButton").addEventListener(
        "click",
        safe("vectorResults", plotVectorField)
    );

    safe("surfaceStatus", () => plotSurface())();

    safe("vectorResults", plotVectorField)();
}
