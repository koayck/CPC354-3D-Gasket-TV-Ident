"use strict";

var canvas;
var canvasWidth = 1.0; // Assuming normalized device coordinates (-1 to 1)
var canvasHeight = 1.0;
var vertices;
var gl;

var points = [];
var colors = [];

var NumTimesToSubdivide = 3;

// Initialization state
var animationPhase = 0;
var rotationBy180Choice = 0;
var rotationInfChoice = -1;
var rotationAngle = 0;
var rotationAngleX = 0;
var rotationAngleY = 0;
var rotationAngleZ = 0;
var scaleValue = 1.0;
var position = vec3(0.0, 0.0, 0.0);
var velocity = vec3(0.01, 0.01, 0.0);
var translation = vec3(0.0, 0.0, 0.0);
var isAnimating = false;
var isRotatingBy180 = false;
var isRotatingInf = false;
var animationSpeed = 5; // debug

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

function resetAnimation() {
  position = vec3(0.0, 0.0, 0.0);
  velocity = vec3(0.05, 0.05, 0.0);
  animationPhase = 0; // debug
  rotationAngle = 0;
  rotationAngleX = 0;
  rotationAngleY = 0;
  rotationAngleZ = 0;
  scaleValue = 1.0;
  translation = vec3(0.0, 0.0, 0.0);

  // Reset infinite rotation
  isRotatingInf = false;
  resetRadioButtons();
}

function resetRadioButtons() {
  const radioButtons = document.querySelectorAll('input[name="rotateInf"]');
  radioButtons.forEach((radio) => {
    radio.checked = false; // Uncheck each radio button
  });
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
        isRotatingInf = true;
        console.log("Starting animation");
        document
        .getElementById("animationButton")
        .classList.add("bg-red-500", "hover:bg-red-600");
        
        document.getElementById("animationIcon").classList.remove("fa-play");
        document.getElementById("animationIcon").classList.add("fa-pause");
      } else {
        isRotatingInf = false;
        console.log("Stopping animation");
        document
          .getElementById("animationButton")
          .classList.remove("bg-red-500", "hover:bg-red-600");

        document.getElementById("animationIcon").classList.add("fa-play");
        document.getElementById("animationIcon").classList.remove("fa-pause");
      }
    });

  document
    .getElementById("resetAnimation")
    .addEventListener("click", function () {
      console.log("Restarting animation");
      resetAnimation();
    });

  // Rotation controls
  document.getElementById("rotateX180").addEventListener("click", function () {
    rotationBy180Choice = 0;
    isRotatingBy180 = true;
  });

  document.getElementById("rotateY180").addEventListener("click", function () {
    rotationBy180Choice = 1;
    isRotatingBy180 = true;
  });

  document.getElementById("rotateZ180").addEventListener("click", function () {
    rotationBy180Choice = 2;
    isRotatingBy180 = true;
  });

  document.getElementById("rotateXInf").addEventListener("click", function () {
    rotationInfChoice = 0;
    isRotatingInf = true;
  });

  document.getElementById("rotateYInf").addEventListener("click", function () {
    rotationInfChoice = 1;
    isRotatingInf = true;
  });

  document.getElementById("rotateZInf").addEventListener("click", function () {
    rotationInfChoice = 2;
    isRotatingInf = true;
  });

  document.getElementById("ouiiaa").addEventListener("click", function () {
    rotationInfChoice = 3;
    isRotatingInf = true;
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

  // console.log("Animation Phase:", animationPhase);
  // console.log("Rotation Angle:", rotationAngle);
  // console.log("Scale Value:", scaleValue);
  // console.log("Translation:", translation);

  const speed = animationSpeed / 10; // debug

  switch (animationPhase) {
    case 0: // Rotate right 180 degrees
      rotationAngleY += speed * 2;
      if (rotationAngleY >= 180) {
        rotationAngleY = 180;
        animationPhase = 1;
      }
      break;

    case 1: // Rotate back to center
      rotationAngleY -= speed * 2;
      if (rotationAngleY <= 0) {
        rotationAngleY = 0;
        animationPhase = 2;
      }
      break;

    case 2: // Rotate left 180 degrees
      rotationAngleY -= speed * 2;
      if (rotationAngleY <= -180) {
        rotationAngleY = -180;
        animationPhase = 3;
      }
      break;

    case 3: // Rotate back to center
      rotationAngleY += speed * 2;
      if (rotationAngleY >= 0) {
        rotationAngleY = 0;
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
        modelViewMatrix,
        translation
      );
      // // console.log(
      // // "🚀 ~ updateAnimation ~ transformedVertices:",
      // // transformedVertices
      // // );

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

var initialOscillationTime = 240; // Initial duration of oscillation before reset (in frames)
var extendedOscillationTime = 320; // Extended duration for the second rotation phase
var oscillationTime = initialOscillationTime; // Current oscillation time (starts with initial value)
var oscillationCounter = 0; // Counter for oscillation frames
var isPaused = false; // Tracks if the object is in the pause phase
var pauseCounter = 0; // Counter for pause frames
var initialPauseDuration = 170; // Duration of the first pause (in frames)
var extendedPauseDuration = 130; // Duration of the second pause (in frames)
var pauseDuration = initialPauseDuration; // Current pause duration
var pauseCount = 0; // Counts how many times the pause has occurred
var pauseLimit = 2; // The limit on the number of pauses
var rotationSpeed = 2; // Initial rotation speed
var isNightClubMode = false; // Tracks if night club mode is active

// Global variables for managing subdivisions
let minSubdivision = 0; // Minimum number of subdivisions
let maxSubdivision = 10; // Maximum number of subdivisions
let subdivisionDirection = 1; // Controls oscillation direction (+1 or -1)
let subdivisionDelay = 100; // Number of frames to wait before changing subdivision
let subdivisionCounter = 0; // Counter to track frames for oscillation


function oscillateSubdivision() {
  // Increment subdivisionCounter each frame
  subdivisionCounter++;

  // Change subdivision only when subdivisionCounter reaches subdivisionDelay
  if (subdivisionCounter >= subdivisionDelay) {
    subdivisionCounter = 0; // Reset the counter

    // Change the number of subdivisions based on direction
    NumTimesToSubdivide += subdivisionDirection;

    // Reverse direction if the limits are reached
    if (NumTimesToSubdivide >= maxSubdivision || NumTimesToSubdivide <= minSubdivision) {
      subdivisionDirection *= -1; // Reverse direction
    }

    // Regenerate the gasket with the new number of subdivisions
    generateGasket();
  }
}

function rotationInf() {  
  if (!isRotatingInf) return;

  switch (rotationInfChoice) {
    case 0:
      rotationAngleX = (rotationAngleX + 2) % 360;
      break;
    case 1:
      rotationAngleY = (rotationAngleY + 2) % 360;
      break;
    case 2:
      rotationAngleZ = (rotationAngleZ + 2) % 360;
      break;
    case 3:
      // Parameters for oscillation
      const amplitude = 0.08; // Controls the height of oscillation
      const frequency = 0.04; // Controls the speed of oscillation

      if (isPaused) {
        // Increment pause counter during the pause phase
        pauseCounter++;
    
        if (pauseCounter >= pauseDuration) {
          // End the pause phase after reaching the pause duration
          isPaused = false;
          pauseCounter = 0;
          pauseCount++; // Increment the pause count
    
          // Adjust settings based on pause count
          if (pauseCount === 1) {
            // After the first pause, set up for the second rotation phase
            oscillationTime = extendedOscillationTime;
            pauseDuration = extendedPauseDuration; // Extend the second pause duration
          } else if (pauseCount === 2) {
            // After the second pause, increase the rotation speed and activate night club mode
            rotationSpeed = 8; // Faster rotation after the second pause
            isNightClubMode = true; // Activate night club mode
          }
        }
      } else {
        if (oscillationCounter < oscillationTime) {
          // Perform oscillation (up and down movement)
          translation[1] = amplitude * Math.sin(rotationAngleY * frequency);
    
          // Rotate continuously around the y-axis with variable speed
          rotationAngleY = (rotationAngleY + rotationSpeed) % 360;
    
          // Increment the oscillation counter
          oscillationCounter++;
        } else {
          // Reset after the oscillation time has elapsed
          translation = vec3(0.0, 0.0, 0.0); // Reset position to the origin
          rotationAngleY = 0; // Reset rotation angle
    
          // Set pause phase if pause count is less than the limit
          if (pauseCount < pauseLimit) {
            isPaused = true;
          }
    
          // Reset the oscillation counter to restart the process after the pause
          oscillationCounter = 0;
        }
    
        // Change canvas background color in night club mode
        if (isNightClubMode) {
          changeCanvasColor();
        }
      }
      break;
  }
}

// Define an array of bright colors (red, green, yellow, blue)
const colorCycle = [
  [1.0, 0.0, 0.0], // Red
  [0.0, 1.0, 0.0], // Green
  [1.0, 1.0, 0.0], // Yellow
  [0.0, 0.0, 1.0], // Blue
  [1.0, 0.0, 1.0], // Blue
];

let colorIndex = 0; // Index to keep track of the current color
let frameDelay = 10; // Number of frames to wait before changing color
let delayCounter = 0; // Counter to track frames

function changeCanvasColor() {
  // Increment delay counter each frame
  delayCounter++;

  // Only change color when delayCounter reaches frameDelay
  if (delayCounter >= frameDelay) {
    // Reset delayCounter
    delayCounter = 0;

    // Set the color from the colorCycle array based on colorIndex
    const [r, g, b] = colorCycle[colorIndex];

    // Apply the color to the WebGL canvas background
    gl.clearColor(r, g, b, 0.90);

    // Increment colorIndex to cycle to the next color
    colorIndex = (colorIndex + 1) % colorCycle.length; // Loops back to 0 at the end
  }
}
function rotationBy180() {
  if (!isRotatingBy180) return;

  // console.log("🚀 ~ rotation ~ rotationChoice:", rotationChoice);

  switch (rotationBy180Choice) {
    case 0: // Rotate around x-axis 90 degrees
      rotationAngleX = (rotationAngleX + 2) % 360;
      if (rotationAngleX % 180 === 0) {
        isRotatingBy180 = false;
      }
      break;

    case 1: // Rotate around y-axis 90 degrees
      rotationAngleY = (rotationAngleY + 2) % 360;
      if (rotationAngleY % 180 === 0) {
        isRotatingBy180 = false;
      }
      break;

    case 2: // Rotate around z-axis 90 degrees
      rotationAngleZ = (rotationAngleZ + 2) % 360;
      if (rotationAngleZ % 180 === 0) {
        isRotatingBy180 = false;
      }
      // // console.log("🚀 ~ rotation ~ rotationAngleZ:", rotationAngleZ);
      break;
  }
}

function applyTransformations(
  vertices,
  scaleMatrix,
  rotationMatrix,
  translation
) {
  return vertices.map((vertex) => {
    // Step 1. Scaling
    let scaledVertex = mult(scaleMatrix, vec4(vertex));

    // Step 2. Rotation
    let rotatedVertex = mult(rotationMatrix, scaledVertex);
    // // console.log("🚀 ~ returnvertices.map ~ rotatedVertex:", rotatedVertex);

    // Step 3. Translation
    let transformedVertex = vec3(
      rotatedVertex[0] + translation[0],
      rotatedVertex[1] + translation[1],
      rotatedVertex[2] + 0.0
    );

    // let test = mat4();
    // test = mult(test, translate(translation[0], translation[1], 0.0));
    // test = mult(test, rotate(rotationAngle, [0, 1, 0]));
    // test = mult(test, rotationMatrix);

    // // console.log("🚀 ~ returnvertices.map ~ test:", test);
    // // console.log("🚀 ~ returnvertices.map ~ modelview:", modelViewMatrix);

    return transformedVertex;
  });
}

function render() {
  // Request the next animation frame
  requestAnimationFrame(render);

  if (isNightClubMode) {
    changeCanvasColor(); // For color change effect
    oscillateSubdivision(); // For subdivision oscillation
  }

  // Clear the canvas before drawing next frame
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Create transformation matrices
  modelViewMatrix = mat4();

  // Extra functionalities
  rotationBy180();
  rotationInf();

  // Update the animation based on current animation phase
  updateAnimation();

  // Step 1: Scaling
  scaleMatrix = scale(scaleValue, scaleValue, scaleValue);

  // Step 2: Rotation
  // Apply rotation around the x, y, and z axes
  let rotationXMatrix = rotate(rotationAngleX, [1, 0, 0]);
  let rotationYMatrix = rotate(rotationAngleY, [0, 1, 0]);
  let rotationZMatrix = rotate(rotationAngleZ, [0, 0, 1]);

  // Combine the rotation matrices
  combinedRotationMatrix = mult(
    rotationZMatrix,
    mult(rotationYMatrix, rotationXMatrix)
  );

  // Apply the combined rotation to the modelViewMatrix
  modelViewMatrix = mult(modelViewMatrix, combinedRotationMatrix);

  // Step 3: translation
  modelViewMatrix = mult(
    modelViewMatrix,
    translate(translation[0], translation[1], 0.0)
  );

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
