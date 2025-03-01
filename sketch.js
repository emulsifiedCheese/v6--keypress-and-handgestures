const vidW = 200,
  vidH = 140; //video dimensions

const touchThreshold = 50;

let snapshotImage;
let isSnapshot = false;

let redThreshold,
  greenThreshold,
  blueThreshold,
  hsvThreshold,
  ycbcrThreshold,
  blurIntensitySlider,
  pixelateIntensitySlider;
let redThresholdValue,
  greenThresholdValue,
  blueThresholdValue,
  hsvThresholdValue,
  ycbcrThresholdValue,
  blurIntensityValue,
  pixelateIntensityValue;

//face detection
let video, handpose, detector;
let predictions = [];
let processedImage;
let faceImg;

let activeEffects = {
  grayscale: false,
  blur: false,
  pixelate: false,
  hsv: false,
};

let filterStatusLabels = [];

let frameRateP;

function setupFPSCounter() {
  push();
  frameRateP = createP("FPS: 0");
  frameRateP.style("font-size", "12px").style("color", "#00ff00 ");
  frameRateP.position(vidW * 2.9, 0);
  setInterval(() => {
    frameRateP.html("FPS: " + Math.round(frameRate()));
  }, 500);
  pop();
}

function createLabel(text, x, y, size = "15px") {
  return createP(text)
    .position(x, y)
    .style("font-size", size)
    .style("color", "#000000");
}

function labelMaker() {
  //create labels for each image
  const labels = [
    ["Original:", 0.1, 0],
    ["Greyscale & Increased Brightness:", 1.1, 0, "13px"],
    ["Red Channel:", 0.1, vidH],
    ["Green Channel:", 1.1, vidH],
    ["Blue Channel:", 2.1, vidH],
    ["Red Threshold:", 0.1, 2 * vidH],
    ["Green Threshold:", 1.1, 2 * vidH],
    ["Blue Threshold:", 2.1, 2 * vidH],
    ["Controller:", 0.1, 3 * vidH],
    ["HSV:", 1.1, 3 * vidH],
    ["YCbCr:", 2.1, 3 * vidH],
    ["Processed Image:", 0.1, 4 * vidH],
    ["HSV Threshold:", 1.1, 4 * vidH],
    ["YCbCr Threshold:", 2.1, 4 * vidH],
  ];

  labels.forEach(([text, xMult, y, size]) => {
    createLabel(text, vidW * xMult, y, size);
  });
}

function nameInfo() {
  //create labels for name and student ID
  const info = [
    ["Name: Ryan Aw", 0],
    ["Student ID: 240662206", 20],
    ["Goldsmiths, University of London", 40],
    ["BSc Computer Science", 60],
    ["CM2030 – Graphics Programming", 80],
    ["Final Coursework: An image processing application", 100],
  ];

  info.forEach(([text, y]) => {
    createLabel(text, vidW * 3.5, y, "16px");
  });
}

function instructions() {
  //create labels for instructions and active effects
  createLabel("Instructions:", vidW * 3.5, 120, "18px");

  const instructions = [
    "Press spacebar to take a snapshot, ESC to clear snapshot",
    "Hold down 1 or touch thumb to index to greyscale image",
    "Hold down 2 or touch thumb to pinkie to blur face",
    "Hold down 3 or touch thumb to ring to pixelate face",
    "Hold down 4 or hold palm out to apply HSV",
  ];

  instructions.forEach((text, i) => {
    createLabel(text, vidW * 3.5, 140 + i * 20, "16px");
  });

  createLabel("Active Effects:", vidW * 3.5, 250, "18px");

  const indicators = [
    "Grayscale filter: ",
    "Pixelate filter: ",
    "Blur filter: ",
    "HSV filter: ",
  ];

  indicators.forEach((text, i) => {
    createLabel(text, vidW * 3.5, 275 + i * 20, "16px");
    let statusLabel = createLabel(
      "Not Applied",
      vidW * 3.5 + 120,
      275 + i * 20,
      "16px"
    );
    statusLabel.style("color", "#FF0000"); //red if filter not applied
    filterStatusLabels[i] = statusLabel;
  });
}

function createSliderWithLabel(label, x, y, defaultValue = 128) {
  //create sliders for thresholding
  createP(label).position(x, y);
  const slider = createSlider(0, 255, defaultValue, 1);
  slider.position(x + 70, y + 15);
  const value = createP(defaultValue).position(x + 200, y);
  return { slider, value };
}

function slidersSetup() {
  //create sliders for thresholding
  const sliders = {
    red: createSliderWithLabel("Red:", vidW * 0.1, height),
    green: createSliderWithLabel("Green:", vidW * 0.1, height + 20),
    blue: createSliderWithLabel("Blue:", vidW * 0.1, height + 40),
    hsv: createSliderWithLabel("HSV:", 250, height),
    ycbcr: createSliderWithLabel("YCbCr:", 250, height + 20),
  };

  redThreshold = sliders.red.slider;
  greenThreshold = sliders.green.slider;
  blueThreshold = sliders.blue.slider;
  hsvThreshold = sliders.hsv.slider;
  ycbcrThreshold = sliders.ycbcr.slider;

  redThresholdValue = sliders.red.value;
  greenThresholdValue = sliders.green.value;
  blueThresholdValue = sliders.blue.value;
  hsvThresholdValue = sliders.hsv.value;
  ycbcrThresholdValue = sliders.ycbcr.value;

  createP("Blurring:").position(vidW * 0.1, height + 60);
  createP("Pixelation:").position(vidW * 0.1, height + 80);

  blurIntensitySlider = createSlider(1, 30, 15, 1).position(
    //blurring radius 1-30, not 0 to avoid no effect
    vidW * 0.1 + 70,
    height + 75
  );
  pixelateIntensitySlider = createSlider(5, 20, 5, 1).position(
    //pixelation block size 5-20, not 0 to avoid no effect
    vidW * 0.1 + 70,
    height + 95
  );

  blurIntensityValue = createP(blurIntensitySlider.value()).position(
    vidW * 0.1 + 200,
    height + 60
  );
  pixelateIntensityValue = createP(pixelateIntensitySlider.value()).position(
    vidW * 0.1 + 200,
    height + 80
  );
}

function keyPressed() {
  if (keyCode === 32) {
    //spacebar
    snapshotImage = video.get();
    isSnapshot = true;
  } else if (keyCode === 27) {
    //escape key
    isSnapshot = false;
    snapshotImage = null;
  }
}

function keyPressedControls() {
  activeEffects.grayscale = false;
  activeEffects.blur = false;
  activeEffects.pixelate = false;
  activeEffects.hsv = false;

  if (keyIsDown(49)) {
    // key 1
    activeEffects.grayscale = true;
    makeGray();
  }
  if (keyIsDown(50)) {
    // key 2
    activeEffects.pixelate = true;
    makeBlur();
  }
  if (keyIsDown(51)) {
    // key 3
    activeEffects.blur = true;
    makePixel();
  }
  if (keyIsDown(52)) {
    // key 4
    activeEffects.hsv = true;
    makeHSV();
  }
}
//img processing funcs
function rgbToGray(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b; //luminosity method, 0.299R + 0.587G + 0.114B
}

function rgbToHsv(r, g, b) {
  //convert rgb to 0-1 range
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h,
    s,
    v = max;

  const d = max - min;
  s = max === 0 ? 0 : d / max; //calculate saturation using min max val

  if (max === min) {
    h = 0;
  } else {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0); //calculate hue based on max red value
        break;
      case g:
        h = (b - r) / d + 2; //calculate hue based on max green value
        break;
      case b:
        h = (r - g) / d + 4; //calculate hue based on max blue value
        break;
    }
    h /= 6; //convert hue to 0-1 scale
  }
  return { h: h * 255, s: s * 255, v: v * 255 }; //convert back to 0-255 range
}

function rgbToYcbcr(r, g, b) {
  //convert rgb to 0-1 range and apply YCbCr conversion
  const Y = 0.299 * r + 0.587 * g + 0.114 * b; //y is 0.299R + 0.587G + 0.114B
  const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b; //cb is based on rgb values, 128 - 0.168736R - 0.331264G + 0.5B
  const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b; //cr is based on rgb values, 128 + 0.5R - 0.418688G - 0.081312B
  return { Y, Cb, Cr };
}

function applyBlur(pixels, width, x, y, radius) {
  let red = 0,
    green = 0,
    blue = 0;
  let count = 0;
  let gaussianKernel = [];

  //gaussian kernel
  for (let i = -radius; i <= radius; ++i) {
    for (let j = -radius; j <= radius; ++j) {
      let distance = Math.sqrt(i * i + j * j);
      let weight = Math.exp(-(distance * distance) / (2 * radius * radius)); //gaussian function
      gaussianKernel.push({ dx: j, dy: i, weight: weight }); //store kernel values in gaussianKernel array
    }
  }

  for (let k = 0; k < gaussianKernel.length; ++k) {
    let px = x + gaussianKernel[k].dx; //get pixel x and y values
    let py = y + gaussianKernel[k].dy;

    if (px >= 0 && px < width && py >= 0 && py < pixels.length / (4 * width)) {
      //check if pixel is within bounds of image
      let idx = (py * width + px) * 4;
      red += pixels[idx] * gaussianKernel[k].weight;
      green += pixels[idx + 1] * gaussianKernel[k].weight;
      blue += pixels[idx + 2] * gaussianKernel[k].weight;
      count += gaussianKernel[k].weight;
    }
  }

  return [
    Math.round(red / count),
    Math.round(green / count),
    Math.round(blue / count),
  ]; //return blurred pixel values
}

function makeGray() {
  for (let i = 0; i < processedImage.pixels.length; i += 4) {
    //iterate through pixels in image
    let r = processedImage.pixels[i]; //get rgb values
    let g = processedImage.pixels[i + 1];
    let b = processedImage.pixels[i + 2];
    let gray = rgbToGray(r, g, b); //convert to grayscale
    processedImage.pixels[i] = gray; //update pixel values to grayscale
    processedImage.pixels[i + 1] = gray;
    processedImage.pixels[i + 2] = gray;
  }
}

function makeBlur() {
  let faces = detector.detect(processedImage.canvas); //detect faces in image using detection model

  for (var i = 0; i < faces.length; ++i) {
    //iterate through faces detected in image
    var face = faces[i]; //get face
    if (face[4] > 4) {
      //confidence threshold
      let faceX = Math.floor(face[0]); //face rect coords
      let faceY = Math.floor(face[1]);
      let faceWidth = Math.floor(face[2]); //face width and height
      let faceHeight = Math.floor(face[3]);

      for (let y = faceY; y < faceY + faceHeight; ++y) {
        //iterate through face pixels to apply blur first
        for (let x = faceX; x < faceX + faceWidth; ++x) {
          if (
            x >= 0 && //check if pixel is within bounds of image
            x < processedImage.width &&
            y >= 0 &&
            y < processedImage.height
          ) {
            let [r, g, b] = applyBlur(
              processedImage.pixels,
              processedImage.width,
              x,
              y,
              blurIntensitySlider.value() //default 15, otherwise slider value
            );

            let index = (y * processedImage.width + x) * 4; //update pixel values
            processedImage.pixels[index] = r;
            processedImage.pixels[index + 1] = g;
            processedImage.pixels[index + 2] = b;
            processedImage.pixels[index + 3] = 255;
          }
        }
      }
    }
  }
}

function makePixel() {
  let faces = detector.detect(processedImage.canvas);

  for (var i = 0; i < faces.length; ++i) {
    var face = faces[i];
    if (face[4] > 4) {
      //check confidence threshold
      let faceX = Math.floor(face[0]); //face rect coords
      let faceY = Math.floor(face[1]);
      let faceWidth = Math.floor(face[2]); //face width and height
      let faceHeight = Math.floor(face[3]);

      for (let y = faceY; y < faceY + faceHeight; ++y) {
        //first iterate through face pixels to greyscale
        //iterate through face pixels to pixelate
        for (let x = faceX; x < faceX + faceWidth; ++x) {
          let index = (y * processedImage.width + x) * 4; //get pixel index in image to assign to rgb values
          let r = processedImage.pixels[index];
          let g = processedImage.pixels[index + 1];
          let b = processedImage.pixels[index + 2];
          let gray = rgbToGray(r, g, b); //convert pixel to grayscale
          processedImage.pixels[index] = gray;
          processedImage.pixels[index + 1] = gray;
          processedImage.pixels[index + 2] = gray;
        }
      }
      //secondly, split detected face into 5x5 blocks and calculate avg intensity for each block
      const blockSize = pixelateIntensitySlider.value(); //block size for pixelation, default 5 otherwise slider value
      for (let y = faceY; y < faceY + faceHeight; y += blockSize) {
        //iterate through face pixels to pixelate
        for (let x = faceX; x < faceX + faceWidth; x += blockSize) {
          let avgIntensity = 0;
          let count = 0;

          //calculate avg intensity for block
          for (
            let by = 0;
            by < blockSize && y + by < faceY + faceHeight;
            ++by
          ) {
            for (
              let bx = 0;
              bx < blockSize && x + bx < faceX + faceWidth;
              ++bx
            ) {
              let c = processedImage.get(x + bx, y + by);
              avgIntensity += brightness(c);
              ++count;
            }
          }
          avgIntensity = Math.floor(avgIntensity / count);

          for (
            let by = 0;
            by < blockSize && y + by < faceY + faceHeight;
            ++by
          ) {
            for (
              let bx = 0;
              bx < blockSize && x + bx < faceX + faceWidth;
              ++bx
            ) {
              //iterate through block pixels to pixelate
              processedImage.set(x + bx, y + by, color(avgIntensity));
            }
          }
        }
      }
    }
  }
}

function makeHSV() {
  for (let y = 0; y < processedImage.height; ++y) {
    //iterate through pixels in image
    for (let x = 0; x < processedImage.width; ++x) {
      let index = (x + y * processedImage.width) * 4;
      let r = processedImage.pixels[index] / 255; //convert to 0-1 range
      let g = processedImage.pixels[index + 1] / 255;
      let b = processedImage.pixels[index + 2] / 255;

      let max = Math.max(r, g, b); //get minmax values of rgb
      let min = Math.min(r, g, b);
      let h,
        s,
        v = max;

      let d = max - min;
      s = max === 0 ? 0 : d / max; //calculate saturation, if max is 0, set to 0, else d/max

      if (max === min) {
        h = 0;
      } else {
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0); //calculate hue based on max red value
            break;
          case g:
            h = (b - r) / d + 2; //calculate hue based on max green value
            break;
          case b:
            h = (r - g) / d + 4; //calculate hue based on max blue value
            break;
        }
        h /= 6; //convert hue to 0-1 scale
      }
      processedImage.pixels[index] = h * 255; //update pixel values to hsv
      processedImage.pixels[index + 1] = s * 255;
      processedImage.pixels[index + 2] = v * 255;
    }
  }
}

function setup() {
  createCanvas(vidW * 3, vidH * 5);
  video = createCapture(VIDEO);
  video.size(vidW, vidH);
  video.hide();

  detector = new objectdetect.detector(
    vidW,
    vidH,
    1.2,
    objectdetect.frontalface
  );
  faceImg = createImage(vidW, vidH);

  slidersSetup();
  labelMaker();
  nameInfo();
  instructions();
  setupFPSCounter();

  const resetButton = createButton("Reset Thresholds");
  resetButton.position(250, height + 55);
  resetButton.mousePressed(resetThresholds); //reset thresholds button sets all sliders to 128

  handpose = ml5.handpose(video, { flipHorizontal: true }, () =>
    console.log("Handpose model ready")
  ); //load and log handpose model message
  handpose.on("predict", (results) => (predictions = results));

  pixelDensity(1);
}

function drawHandSkeleton() {
  let scaleX = vidW / 640;
  let scaleY = vidH / 480;

  for (let i = 0; i < predictions.length; ++i) {
    const hand = predictions[i];
    const landmarks = hand.landmarks;

    push();
    translate(60, 0); //additional alignment to hand
    scale(-scaleX, scaleY); //flip horizontally

    const connections = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [5, 6],
      [6, 7],
      [7, 8],
      [5, 9],
      [9, 10],
      [9, 13],
      [13, 17],
      [10, 11],
      [11, 12],
      [13, 14],
      [14, 15],
      [15, 16],
      [17, 18],
      [18, 19],
      [19, 20],
      [0, 5],
      [0, 17],
      [0, 9],
      [0, 13],
    ];

    stroke(0, 255, 0, 200); //green skeleton
    strokeWeight(2 / scaleX);
    for (let connection of connections) {
      let start = landmarks[connection[0]];
      let end = landmarks[connection[1]];
      line(start[0], start[1], end[0], end[1]);
    }

    for (let j = 0; j < landmarks.length; ++j) {
      const joint = landmarks[j];
      fill(255, 0, 0, 200); //red joints
      noStroke();
      ellipse(joint[0], joint[1], 4 / scaleX, 4 / scaleY);
    }
    pop();
  }
}

function handKeyControls() {
  if (predictions.length > 0) {
    const hand = predictions[0];
    const landmarks = hand.landmarks;

    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const pinkyTip = landmarks[20];
    const ringTip = landmarks[16];

    const thumbIndex = dist(thumbTip[0], thumbTip[1], indexTip[0], indexTip[1]);
    const thumbPinkie = dist(
      thumbTip[0],
      thumbTip[1],
      pinkyTip[0],
      pinkyTip[1]
    );
    const indexMiddle = dist(
      indexTip[0],
      indexTip[1],
      middleTip[0],
      middleTip[1]
    );
    const thumbRing = dist(thumbTip[0], thumbTip[1], ringTip[0], ringTip[1]);

    let touchThreshold = 50; //min dist for touch to be detected

    if (thumbIndex < touchThreshold) {
      activeEffects.grayscale = true; //set grayscale to true
      console.log("thumbIndex greyscale"); //log grayscale filter applied
      makeGray();
    } else if (thumbPinkie < touchThreshold) {
      activeEffects.blur = true; //set blur to true
      console.log("thumbPinkie blur"); //log blur filter applied
      makeBlur();
      processedImage.updatePixels();
    } else if (thumbRing < touchThreshold) {
      activeEffects.pixelate = true; //set pixelate to true
      console.log("thumbRing pixelate"); //log pixelate filter applied
      makePixel();
      processedImage.updatePixels();
    } else if (indexMiddle < touchThreshold) {
      activeEffects.hsv = true; //set hsv to true
      console.log("palmOut hsv"); //log hsv filter applied
      makeHSV();
    } else {
      activeEffects.grayscale = false; //set all effects to false if no hand pose detected
      activeEffects.blur = false;
      activeEffects.pixelate = false;
      activeEffects.hsv = false;
    }
  }
}

function draw() {
  let sourceImage = isSnapshot ? snapshotImage : video; //if snapshot taken, use snapshot image, else use live video feed
  //first row
  //FIRST IMAGE
  translate(vidW, 0);
  scale(-1, 1);
  image(sourceImage, 0, 0, vidW, vidH);

  push();
  //SECOND IMAGE
  translate(-vidW, 0);
  let grayedBrightImage = sourceImage.get();
  grayedBrightImage.loadPixels();

  for (let y = 0; y < grayedBrightImage.height; ++y) {
    for (let x = 0; x < grayedBrightImage.width; ++x) {
      let index = (x + y * grayedBrightImage.width) * 4; //get pixel index
      let r = grayedBrightImage.pixels[index]; //red
      let g = grayedBrightImage.pixels[index + 1]; //green
      let b = grayedBrightImage.pixels[index + 2]; //blue
      let grayValue = rgbToGray(r, g, b); //luminosity method to grayscale using rgbToGray function
      let brightenedValue = min(grayValue * 1.2, 255); //brighten grayscale image by 20%, capped at 255

      grayedBrightImage.pixels[index] = brightenedValue; //new red
      grayedBrightImage.pixels[index + 1] = brightenedValue; //new green
      grayedBrightImage.pixels[index + 2] = brightenedValue; //new blue
      grayedBrightImage.pixels[index + 3] = 255; //full opacity
    }
  }
  grayedBrightImage.updatePixels();
  image(grayedBrightImage, 0, 0, vidW, vidH);
  pop();

  //second row
  translate(0, vidH);
  let channelImage = sourceImage.get(); //get source image
  channelImage.loadPixels();
  let redChannelImage = sourceImage.get(); //get rgb channel images
  let greenChannelImage = sourceImage.get();
  let blueChannelImage = sourceImage.get();
  redChannelImage.loadPixels();
  greenChannelImage.loadPixels();
  blueChannelImage.loadPixels();

  for (let y = 0; y < channelImage.height; ++y) {
    for (let x = 0; x < channelImage.width; ++x) {
      let index = (x + y * channelImage.width) * 4;

      let r = channelImage.pixels[index]; //red
      let g = channelImage.pixels[index + 1]; //green
      let b = channelImage.pixels[index + 2]; //blue

      //red channel
      redChannelImage.pixels[index] = r;
      redChannelImage.pixels[index + 1] = 0; //green channel set to 0
      redChannelImage.pixels[index + 2] = 0; //blue channel set to 0
      redChannelImage.pixels[index + 3] = 255; //red at full opacity

      //green channel
      greenChannelImage.pixels[index] = 0; //red channel set to 0
      greenChannelImage.pixels[index + 1] = g;
      greenChannelImage.pixels[index + 2] = 0; //blue channel set to 0
      greenChannelImage.pixels[index + 3] = 255; //green at full opacity

      //blue channel
      blueChannelImage.pixels[index] = 0; //red channel set to 0
      blueChannelImage.pixels[index + 1] = 0; //green channel set to 0
      blueChannelImage.pixels[index + 2] = b;
      blueChannelImage.pixels[index + 3] = 255; //blue at full opacity
    }
  }

  redChannelImage.updatePixels();
  greenChannelImage.updatePixels();
  blueChannelImage.updatePixels();

  //RED CHANNEL
  image(redChannelImage, 0, 0, vidW, vidH);

  push();
  translate(-vidW, 0);
  //GREEN CHANNEL
  image(greenChannelImage, 0, 0, vidW, vidH);
  pop();

  push();
  translate(-(2 * vidW), 0);
  image(blueChannelImage, 0, 0, vidW, vidH);
  pop();

  //third row
  translate(0, vidH);
  //THRESHOLDING RGB CHANNELS
  let thresholdedRedChannel = sourceImage.get(); //get source images
  let thresholdedGreenChannel = sourceImage.get();
  let thresholdedBlueChannel = sourceImage.get();
  thresholdedRedChannel.loadPixels();
  thresholdedGreenChannel.loadPixels();
  thresholdedBlueChannel.loadPixels();

  for (let y = 0; y < channelImage.height; ++y) {
    for (let x = 0; x < channelImage.width; ++x) {
      let index = (x + y * channelImage.width) * 4;

      let r = channelImage.pixels[index];
      let g = channelImage.pixels[index + 1];
      let b = channelImage.pixels[index + 2];

      thresholdedRedChannel.pixels[index] = r > redThreshold.value() ? 255 : 0; //if red value > threshold, set to 255, else 0
      thresholdedRedChannel.pixels[index + 1] = 0; //green set to 0
      thresholdedRedChannel.pixels[index + 2] = 0; //blue set to 0
      thresholdedRedChannel.pixels[index + 3] = 255; //full opacity

      thresholdedGreenChannel.pixels[index] = 0; //red set to 0
      thresholdedGreenChannel.pixels[index + 1] = //if green value > threshold, set to 255, else 0
        g > greenThreshold.value() ? 255 : 0;
      thresholdedGreenChannel.pixels[index + 2] = 0; //blue set to 0
      thresholdedGreenChannel.pixels[index + 3] = 255; //full opacity

      thresholdedBlueChannel.pixels[index] = 0; //red set to 0
      thresholdedBlueChannel.pixels[index + 1] = 0; //green set to 0
      thresholdedBlueChannel.pixels[index + 2] =
        b > blueThreshold.value() ? 255 : 0; //if blue value > threshold, set to 255, else 0
      thresholdedBlueChannel.pixels[index + 3] = 255; //full opacity
    }
  }

  thresholdedRedChannel.updatePixels();
  thresholdedGreenChannel.updatePixels();
  thresholdedBlueChannel.updatePixels();
  redThresholdValue.html(redThreshold.value()); //to update the value of the slider
  greenThresholdValue.html(greenThreshold.value());
  blueThresholdValue.html(blueThreshold.value());

  //THRESHOLDED RED CHANNEL
  image(thresholdedRedChannel, 0, 0, vidW, vidH);

  push();
  translate(-vidW, 0);
  //THRESHOLDED GREEN CHANNEL
  image(thresholdedGreenChannel, 0, 0, vidW, vidH);
  pop();

  push();
  translate(-(2 * vidW), 0);
  //THRESHOLDED BLUE CHANNEL
  image(thresholdedBlueChannel, 0, 0, vidW, vidH);
  pop();

  //fourth row
  translate(0, vidH);
  //ORIGINAL IMAGE, always live video feed with hand skeleton
  push();
  image(video, 0, 0, vidW, vidH);
  video.loadPixels(); //buffer to update video feed
  pop();
  drawHandSkeleton();

  push();
  translate(-vidW, 0);
  //HSV CONVERSION
  let hsvImage = sourceImage.get();
  hsvImage.loadPixels();
  for (let y = 0; y < hsvImage.height; ++y) {
    for (let x = 0; x < hsvImage.width; ++x) {
      let index = (x + y * hsvImage.width) * 4;
      let r = hsvImage.pixels[index]; //convert red to 0-1 scale
      let g = hsvImage.pixels[index + 1]; //convert green to 0-1 scale
      let b = hsvImage.pixels[index + 2]; //convert blue to 0-1 scale

      const { h, s, v } = rgbToHsv(r, g, b); //use rgbToHsv function to convert rgb to hsv
      hsvImage.pixels[index] = h; //update pixel values to hsv
      hsvImage.pixels[index + 1] = s;
      hsvImage.pixels[index + 2] = v;
    }
  }
  hsvImage.updatePixels();
  image(hsvImage, 0, 0, vidW, vidH);
  pop();

  push();
  translate(-(2 * vidW), 0);
  //YCbCr CONVERSION
  let ycbcrImage = sourceImage.get();
  ycbcrImage.loadPixels();
  for (let y = 0; y < ycbcrImage.height; ++y) {
    for (let x = 0; x < ycbcrImage.width; ++x) {
      let index = (x + y * ycbcrImage.width) * 4;
      let red = ycbcrImage.pixels[index];
      let green = ycbcrImage.pixels[index + 1];
      let blue = ycbcrImage.pixels[index + 2];
      let Y = 0.299 * red + 0.587 * green + 0.114 * blue; //convert to YCbCr
      let Cb = 128 - 0.168736 * red - 0.331264 * green + 0.5 * blue; //Cb
      let Cr = 128 + 0.5 * red - 0.418688 * green - 0.081312 * blue; //Cr

      ycbcrImage.pixels[index] = Y; //update Y
      ycbcrImage.pixels[index + 1] = Cb; //update Cb
      ycbcrImage.pixels[index + 2] = Cr; //update Cr
    }
  }
  ycbcrImage.updatePixels();
  image(ycbcrImage, 0, 0, vidW, vidH);
  pop();

  //fifth row
  ///////////////////////////
  translate(0, vidH);

  processedImage = sourceImage.get();
  processedImage.loadPixels();

  let faces = detector.detect(processedImage.canvas);

  handKeyControls();
  keyPressedControls();
  //display processed image
  processedImage.updatePixels();
  image(processedImage, 0, 0, vidW, vidH);
  push();
  strokeWeight(2);
  stroke(255, 0, 0);
  noFill();
  for (var i = 0; i < faces.length; ++i) {
    var face = faces[i];
    if (face[4] > 4) {
      rect(face[0], face[1], face[2], face[3]);
    }
  }

  ///////////////////////////

  translate(-vidW, 0);
  //HSV THRESHOLDING
  hsvThresholdValue.html(hsvThreshold.value());
  let thresholdedHSV = sourceImage.get();
  thresholdedHSV.loadPixels();

  for (let y = 0; y < thresholdedHSV.height; ++y) {
    //process pixels for HSV conversion
    for (let x = 0; x < thresholdedHSV.width; ++x) {
      let index = (x + y * thresholdedHSV.width) * 4;
      let r = thresholdedHSV.pixels[index] / 255; //rgb to 0-1 range
      let g = thresholdedHSV.pixels[index + 1] / 255;
      let b = thresholdedHSV.pixels[index + 2] / 255;

      let max = Math.max(r, g, b); //min max rgb values
      let min = Math.min(r, g, b);
      let h,
        s,
        v = max;

      let d = max - min;
      s = max === 0 ? 0 : d / max; //saturation

      if (max === min) {
        h = 0; //hue
      } else {
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          case b:
            h = (r - g) / d + 4;
            break;
        }
        h /= 6;
      }

      h = h * 255 > hsvThreshold.value() ? h : 0;
      s = s * 255 > hsvThreshold.value() ? s : 0;
      v = v * 255 > hsvThreshold.value() ? v : 0;

      thresholdedHSV.pixels[index] = h * 255;
      thresholdedHSV.pixels[index + 1] = s * 255;
      thresholdedHSV.pixels[index + 2] = v * 255;
    }
  }
  thresholdedHSV.updatePixels();
  image(thresholdedHSV, 0, 0, vidW, vidH);
  hsvThresholdValue.html(hsvThreshold.value());
  pop();

  push();
  translate(-(2 * vidW), 0);
  //YCbCr THRESHOLDING
  ycbcrThresholdValue.html(ycbcrThreshold.value());
  let thresholdedYCbCr = sourceImage.get();
  thresholdedYCbCr.loadPixels();

  for (let y = 0; y < thresholdedYCbCr.height; ++y) {
    for (let x = 0; x < thresholdedYCbCr.width; ++x) {
      let index = (x + y * thresholdedYCbCr.width) * 4;
      let r = thresholdedYCbCr.pixels[index];
      let g = thresholdedYCbCr.pixels[index + 1];
      let b = thresholdedYCbCr.pixels[index + 2];

      const { Y, Cb, Cr } = rgbToYcbcr(r, g, b);

      let thresholdedY = Y > ycbcrThreshold.value() ? Y : 0;
      let thresholdedCb = Cb > ycbcrThreshold.value() ? Cb : 0;
      let thresholdedCr = Cr > ycbcrThreshold.value() ? Cr : 0;

      thresholdedYCbCr.pixels[index] = thresholdedY;
      thresholdedYCbCr.pixels[index + 1] = thresholdedCb;
      thresholdedYCbCr.pixels[index + 2] = thresholdedCr;
    }
  }
  thresholdedYCbCr.updatePixels();
  image(thresholdedYCbCr, 0, 0, vidW, vidH);
  ycbcrThresholdValue.html(ycbcrThreshold.value());
  pop();

  blurIntensityValue.html(blurIntensitySlider.value());
  pixelateIntensityValue.html(pixelateIntensitySlider.value());

  updateFilterStatus();
}

function resetThresholds() {
  //reset all sliders to 128, blur 15, pixelate 5
  redThreshold.value(128);
  greenThreshold.value(128);
  blueThreshold.value(128);
  hsvThreshold.value(128);
  ycbcrThreshold.value(128);
  blurIntensitySlider.value(15);
  pixelateIntensitySlider.value(5);
}

function updateFilterStatus() {
  const effects = [
    activeEffects.grayscale,
    activeEffects.pixelate,
    activeEffects.blur,
    activeEffects.hsv,
  ];

  effects.forEach((isActive, i) => {
    filterStatusLabels[i].html(isActive ? "Active" : "Not Active"); //update filter status label
    filterStatusLabels[i].style("color", isActive ? "#00FF00" : "#FF0000"); //green if filter applied, red if not
  });
}
