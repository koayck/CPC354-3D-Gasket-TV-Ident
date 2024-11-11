"use strict";

var canvas;
var canvasWidth = 1.0; // Assuming normalized device coordinates (-1 to 1)
var canvasHeight = 1.0;
var vertices;
var gl;

var points = [];
var colors = [];

var NumTimesToSubdivide = 3;

// Initialnimation state
var animationPhase = 0;
var rotationChoice = 0;
var rotationAngle = 0;
var rotationAngleX = 0;
var rotationAngleY = 0;
var rotationAngleZ = 0;
var scaleValue = 1.0;
var position = vec3(0.0, 0.0, 0.0);
var velocity = vec3(0.01, 0.01, 0.0);
var translation = vec3(0.0, 0.0, 0.0);
var isAnimating = false;
var isRotating = false;
var animationSpeed = 5;

// Matrices
var modelViewMatrix;
var scaleMatrix;
var combinedRotationMatrix;
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

  // Step 4. Generate initial gasket
  generateGasket();

  // Step 5. Create buffers and set up buffers
  setupBuffers(program);

  // Step 6. Start render loop
  render();
};

function initializeAnimation() {
  position = vec3(0.0, 0.0, 0.0);
  velocity = vec3(0.05, 0.05, 0.0);
  animationPhase = 4;
  rotationAngle = 0;
  rotationAngleX = 0;
  rotationAngleY = 0;
  rotationAngleZ = 0;
  scaleValue = 1.0;
  translation = vec3(0.0, 0.0, 0.0);
}

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
    .getElementById("animationButton")
    .addEventListener("click", function () {
      isAnimating = !isAnimating;
      if (isAnimating) {
        console.log("Starting animation");
        document.getElementById("animationButton").textContent =
          "Pause Animation";
      } else {
        console.log("Stopping animation");
        document.getElementById("animationButton").textContent =
          "Start Animation";
      }
    });

  document
    .getElementById("restartAnimation")
    .addEventListener("click", function () {
      console.log("Restarting animation");
      initializeAnimation();
    });

  // Rotation controls
  document.getElementById("rotateX").addEventListener("click", function () {
    rotationChoice = 0;
    isRotating = true;
  });

  document.getElementById("rotateY").addEventListener("click", function () {
    rotationChoice = 1;
    isRotating = true;
  });

  document.getElementById("rotateZ").addEventListener("click", function () {
    rotationChoice = 2;
    isRotating = true;
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
  vertices = [
    vec3(0.0, 0.0, -0.5),
    vec3(0.0, 0.4714, 0.1667),
    vec3(-0.4082, -0.2357, 0.1667),
    vec3(0.4082, -0.2357, 0.1667),
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

    case 5: // Move around and bounce
      // Update position based on velocity and speed
      position[0] += velocity[0] * speed;
      position[1] += velocity[1] * speed;

      // Update translation based on position
      translation[0] = position[0];
      translation[1] = position[1];
      
      
      // Get the current transformed vertices
      var transformedVertices = applyTransformations(
        vertices,
        scaleMatrix,
        combinedRotationMatrix,
        translation
      );
      console.log("🚀 ~ updateAnimation ~ transformedVertices:", transformedVertices)
      
      // Check for collisions with canvas borders using vertices and bounce
      var collisionX = false;
      var collisionY = false;
      
      for (var i = 0; i < transformedVertices.length; i++) {
        var vertex = transformedVertices[i];
        
        if (vertex[0] >= canvasWidth || vertex[0] <= -canvasWidth) {
          collisionX = true;
        }
        if (vertex[1] >= canvasHeight || vertex[1] <= -canvasHeight) {
          collisionY = true;
        }
      }
      
      if (collisionX) {
        velocity[0] = -velocity[0];
      }
      if (collisionY) {
        velocity[1] = -velocity[1];
      }
      
      break;
  }
}

function rotation() {
  if (!isRotating) return;

  switch (rotationChoice) {
    case 0: // Rotate around x-axis 90 degrees
      rotationAngleX = (rotationAngleX + 2) % 360;
      if (rotationAngleX % 90 === 0) {
        isRotating = false;
      }
      break;

    case 1: // Rotate around y-axis 90 degrees
      rotationAngleY = (rotationAngleY + 2) % 360;
      if (rotationAngleY % 90 === 0) {
        isRotating = false;
      }
      break;

    case 2: // Rotate around z-axis 90 degrees
      rotationAngleZ = (rotationAngleZ + 2) % 360;
      if (rotationAngleZ % 90 === 0) {
        isRotating = false;
      }
      console.log("🚀 ~ rotation ~ rotationAngleZ:", rotationAngleZ)
      break;
  }
}

function applyTransformations(vertices, scaleMatrix, rotationMatrix, translation) {
  return vertices.map((vertex) => {
    // Apply scaling
    let scaledVertex = mult(scaleMatrix, vec4(vertex));
    
    // Apply rotation
    let rotatedVertex = mult(rotationMatrix, scaledVertex);
    console.log("🚀 ~ returnvertices.map ~ rotatedVertex:", rotatedVertex)
    
    // Apply translation
    let transformedVertex = vec3(
      rotatedVertex[0] + translation[0],
      rotatedVertex[1] + translation[1],
      rotatedVertex[2] + 0.0
    );
    
    
    let test = mat4();
    test = mult(test, translate(translation[0], translation[1], 0.0));
    test = mult(test, rotate(rotationAngle, [0, 1, 0]));
    test = mult(test, rotationMatrix);

    console.log("🚀 ~ returnvertices.map ~ test:", test)
    console.log("🚀 ~ returnvertices.map ~ modelview:", modelViewMatrix)

    return transformedVertex;
  });
}

function render() {
  // Request the next animation frame
  requestAnimationFrame(render);

  // Clear the canvas before drawing next frame
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Update the animation based on current animation phase
  updateAnimation();
  rotation();

  // Create transformation matrices
  modelViewMatrix = mat4();

  // Apply translation
  modelViewMatrix = mult(
    modelViewMatrix,
    translate(translation[0], translation[1], 0.0)
  );

  modelViewMatrix = mult(modelViewMatrix, rotate(rotationAngle, [0, 1, 0]));

  // Apply rotation around the x, y, and z axes
  let rotationXMatrix = rotateX(rotationAngleX);
  let rotationYMatrix = rotateY(rotationAngleY);
  let rotationZMatrix = rotateZ(rotationAngleZ);
  
  // Combine the rotation matrices
  combinedRotationMatrix = mult(
    rotationZMatrix,
    mult(rotationYMatrix, rotationXMatrix)
  );

  // Apply the combined rotation to the modelViewMatrix
  modelViewMatrix = mult(modelViewMatrix, combinedRotationMatrix);

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
