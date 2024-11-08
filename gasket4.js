"use strict";

var canvas;
var gl;

var points = [];
var colors = [];

var NumTimesToSubdivide = 3;

// Initialnimation state
var animationPhase = 0;
var rotationAngle = 0;
var scaleValue = 1.0;
var translation = vec3(0.0, 0.0, 0.0);
var isAnimating = false;
var animationSpeed = 5;

// Matrices
var modelViewMatrix;
var scaleMatrix;
var modelViewMatrixLoc;
var scaleMatrixLoc;

// Color settings
var baseColors = [
  vec3(1.0, 0.0, 0.0), // red
  vec3(0.0, 1.0, 0.0), // green
  vec3(0.0, 0.0, 1.0), // blue
  vec3(0.0, 0.0, 0.0), // black
];

window.onload = function init() {
  // 1. Get WebGL context
  canvas = document.getElementById("gl-canvas");
  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    alert("WebGL isn't available");
  }

  // Initialize UI controls
  initializeControls();

  // Configure WebGL
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  // Step 2. Initialize shaders
  var program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  // Step 3. Get uniform location for transformation matrices (defined in vertex shader in index.html)
  modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
  scaleMatrixLoc = gl.getUniformLocation(program, "scaleMatrix");

  // Step 4. Create buffers and set up buffers
  setupBuffers(program);

  // Step 5. Generate initial gasket
  generateGasket();

  // Step 6. Start render loop
  render();
};

function initializeControls() {
  // Subdivisions slider
  document
    .getElementById("subdivisions")
    .addEventListener("input", function (e) {
      NumTimesToSubdivide = parseInt(e.target.value);
      document.getElementById("subdivisionsValue").textContent =
        NumTimesToSubdivide;
      generateGasket();
    });

  // Speed slider
  document.getElementById("speed").addEventListener("input", function (e) {
    animationSpeed = parseInt(e.target.value);
    document.getElementById("speedValue").textContent = animationSpeed;
  });

  // Color inputs
  for (let i = 1; i <= 4; i++) {
    document
      .getElementById(`color${i}`)
      .addEventListener("input", function (e) {
        const color = hexToRgb(e.target.value);
        baseColors[i - 1] = vec3(color.r / 255, color.g / 255, color.b / 255);
        generateGasket();
      });
  }

  // Animation controls
  document
    .getElementById("startAnimation")
    .addEventListener("click", function () {
      console.log("Starting animation");
      isAnimating = true;
      animationPhase = 0;
      rotationAngle = 0;
      scaleValue = 1.0;
      translation = vec3(0.0, 0.0, 0.0);
    });

  document
    .getElementById("stopAnimation")
    .addEventListener("click", function () {
      console.log("Stopping animation");
      isAnimating = false;
    });
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function generateGasket() {
  points = [];
  colors = [];

  // Define the initial vertices of the tetrahedron
  var vertices = [
    vec3(0.0, 0.0, -1.0),
    vec3(0.0, 0.9428, 0.3333),
    vec3(-0.8165, -0.4714, 0.3333),
    vec3(0.8165, -0.4714, 0.3333),
  ];

  // Recursively divide the tetrahedron to create the gasket
  divideTetra(
    vertices[0],
    vertices[1],
    vertices[2],
    vertices[3],
    NumTimesToSubdivide
  );

  // Update buffers

  // Vertex Buffer (vBuffer) - stores the positions of all points
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

  // Color Buffer (cBuffer) - stores the colors of all points
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
}

var vBuffer, cBuffer;

function setupBuffers(program) {
  // Create and set up vertex buffer
  vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

  var vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);

  // Create and set up color buffer
  cBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

  var vColor = gl.getAttribLocation(program, "vColor");
  gl.vertexAttribPointer(vColor, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vColor);
}

function updateAnimation() {
  if (!isAnimating) return;

  console.log("Animation Phase:", animationPhase);
  console.log("Rotation Angle:", rotationAngle);
  console.log("Scale Value:", scaleValue);
  console.log("Translation:", translation);

  const speed = animationSpeed / 100;

  switch (animationPhase) {
    case 0: // Rotate right 180 degrees
      rotationAngle += speed * 2;
      if (rotationAngle >= 180) {
        rotationAngle = 180;
        animationPhase = 1;
      }
      break;

    case 1: // Rotate back to center
      rotationAngle -= speed * 2;
      if (rotationAngle <= 0) {
        rotationAngle = 0;
        animationPhase = 2;
      }
      break;

    case 2: // Rotate left 180 degrees
      rotationAngle -= speed * 2;
      if (rotationAngle <= -180) {
        rotationAngle = -180;
        animationPhase = 3;
      }
      break;

    case 3: // Rotate back to center
      rotationAngle += speed * 2;
      if (rotationAngle >= 0) {
        rotationAngle = 0;
        animationPhase = 4;
      }
      break;

    case 4: // Scale up
      scaleValue += speed * 0.02;
      if (scaleValue >= 1.5) {
        scaleValue = 1.5;
        animationPhase = 5;
      }
      break;

    case 5: // Move around
      const time = Date.now() / 1000;
      translation[0] = 0.2 * Math.sin(time * speed);
      translation[1] = 0.2 * Math.cos(time * speed);
      break;
  }
}

function render() {
  // Request the next animation frame
  requestAnimationFrame(render);

  // Clear the canvas before drawing next frame
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Update the animation based on current animation phase
  updateAnimation();

  // Create transformation matrices
  modelViewMatrix = mat4();

  // Apply translation
  modelViewMatrix = mult(
    modelViewMatrix,
    translate(translation[0], translation[1], 0.0)
  );

  // Apply rotation around the y-axis
  modelViewMatrix = mult(modelViewMatrix, rotate(rotationAngle, [0, 1, 0]));

  scaleMatrix = scale(scaleValue, scaleValue, scaleValue);

  // Send matrices to shaders
  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
  gl.uniformMatrix4fv(scaleMatrixLoc, false, flatten(scaleMatrix));

  gl.drawArrays(gl.TRIANGLES, 0, points.length);
}

function triangle(a, b, c, color) {
  // add colors and vertices for one triangle
  colors.push(baseColors[color]);
  points.push(a);
  colors.push(baseColors[color]);
  points.push(b);
  colors.push(baseColors[color]);
  points.push(c);
}

function tetra(a, b, c, d) {
  // tetrahedron with each side using
  // a different color

  triangle(a, c, b, 0);
  triangle(a, c, d, 1);
  triangle(a, b, d, 2);
  triangle(b, c, d, 3);
}

function divideTetra(a, b, c, d, count) {
  // check for end of recursion

  if (count === 0) {
    tetra(a, b, c, d);
  }

  // find midpoints of sides
  // divide four smaller tetrahedra
  else {
    var ab = mix(a, b, 0.5);
    var ac = mix(a, c, 0.5);
    var ad = mix(a, d, 0.5);
    var bc = mix(b, c, 0.5);
    var bd = mix(b, d, 0.5);
    var cd = mix(c, d, 0.5);

    --count;

    divideTetra(a, ab, ac, ad, count);
    divideTetra(ab, b, bc, bd, count);
    divideTetra(ac, bc, c, cd, count);
    divideTetra(ad, bd, cd, d, count);
  }
}
