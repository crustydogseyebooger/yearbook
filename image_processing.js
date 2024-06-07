import assert from "assert";
import { exec } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

import { PNG } from "pngjs";
import tmp from "tmp";

const IMAGES_FOLDER = path.resolve(process.cwd(), "images");
const IMAGE_GALLERY = fs.readdirSync(IMAGES_FOLDER).map(p => path.join(IMAGES_FOLDER, p));

export const COLORS = {
  WHITE: [255, 255, 255],
  BLACK: [0, 0, 0],
  RED: [255, 0, 0],
  GREEN: [0, 255, 0],
  BLUE: [0, 0, 255],
  AQUA: [0, 255, 255],
  YELLOW: [255, 255, 0],
  MAGENTA: [255, 0, 255],
};

export class Image {
  /**
   * Loads an image from the preselected gallery of images into memory as an `Image` object.
   * If no name is given, this function selects one at random.
   * @param name The name of the image from the gallery
   * @returns An image in the gallery as an Image object.
   */
  static loadImageFromGallery(name) {
    return name
      ? Image.loadImageFromFile(path.resolve(IMAGES_FOLDER, name + ".png"))
      : Image.loadImageFromFile(IMAGE_GALLERY[Math.floor(Math.random() * IMAGE_GALLERY.length)]);
  }

  /**
   * Loads an image from the file system into memory as an `Image` object.
   * @param image Path to a PNG, JPG, JPEG file
   * @returns The file represented as an `Image` object.
   */
  static loadImageFromFile(filePath) {
    assert(filePath.endsWith(".png"), "[image_processing.js] Only `.png` files are supported.");

    if (!fs.existsSync(filePath)) {
      throw new Error(`Unable to locate file: \`${filePath}\``);
    }
    fs.accessSync(filePath, fs.constants.R_OK);

    const png = PNG.sync.read(fs.readFileSync(filePath));
    return new Image(png.width, png.height, Uint8ClampedArray.from(png.data));
  }

  /**
   * Creates a new image and sets each pixel to a default color.
   * @param width The width of the image
   * @param height The height of the image
   * @param fillColor The color to set each pixel as
   */
  static create(width, height, fillColor){
    return new Image(
      width,
      height,
      Uint8ClampedArray.from(
        {
          length: width * height * 4,
        },
        (_, i) => (i % 4 < 3 ? fillColor[i % 4] : 255)
      )
    );
  }

    width;
    height;
    data;
    rowSize;

  /**
   * Constructs a new `Image` object. Use `Image.create` to generate an actual image
   * @param width The images width
   * @param height The images height
   * @param data The pixel data of the image
   */
  constructor(width, height, data) {
    this.width = width;
    this.height = height;
    this.data = data;

    this.rowSize = this.width * 4;
  }

  /**
   * Returns the color of the pixel at the specified location.
   * @param x The horizontal coordinate from the origin (top, left)
   * @param y The vertical coordinate from the origin (top, left)
   * @returns The color of the pixel at (x, y)
   */
  getPixel(x, y) {
    // this.assertCoordinatesInBounds(x, y);
    const offset = this.getOffset(x, y);

    return [this.data[offset], this.data[offset + 1], this.data[offset + 2]];
  }

  /**
   * Updates the color of a pixel in the image.
   * @param x The horizontal coordinate of the pixel
   * @param y The vertical coordinate of the pixel
   * @param color The new color of the pixel
   */
  setPixel(x, y, color) {
    // this.assertCoordinatesInBounds(x, y);

    const offset = this.getOffset(x, y);

    this.data[offset] = color[0];
    this.data[offset + 1] = color[1];
    this.data[offset + 2] = color[2];
  }

  /**
   * Create a copy of the current state of the image.
   */
  copy() {
    return new Image(this.width, this.height, Uint8ClampedArray.from(this.data));
  }

  /**
   * Write the current state of the image to the file system.
   * All images are saved under the current working directory (cwd) under the path `./images_out/*.png`.
   * @param fileName The name of the image
   */
  save(fileName) {
    assert.match(
      fileName,
      /^(?!.{256,})(?!(aux|clock\$|con|nul|prn|com[1-9]|lpt[1-9])(?:$|\.))[^ ][ .\w-$()+=[\];#@~,&amp;']+[^. ]$/i,
      "[image_processing.js] Invalid file name."
    );
    const root = process.cwd();
    const images_out = path.resolve(root, "images_out");
    if (!fs.existsSync(images_out)) {
      fs.mkdirSync(images_out);
    }
    this.saveToPath(path.resolve(images_out, fileName + ".png"));
  }

  /**
   * Attempts to display a preview of the image in VSCode or an image viewer
   * @param label A prefix for the file's name
   */
  show(label = "image_processing.js") {
    const temp = tmp.fileSync({
      prefix: label,
      postfix: ".png",
    });

    this.saveToPath(temp.name);

    if (os.platform() === "darwin") {
      // macOS
      exec(`open ${temp.name}`);
    } else {
      // if code is not in $PATH, this will not work
      exec(`code --reuse-window ${temp.name}`);
    }
  }

  /**
   * Writes an image to a specified path in the file system
   * @param filePath A file name
   */
  saveToPath(filePath) {
    const png = new PNG({
      width: this.width,
      height: this.height,
    });

    png.data = Buffer.from(this.data.buffer);
    fs.writeFileSync(filePath, PNG.sync.write(png));
  }

  /**
   * A list of all colors in the image
   * @returns An array of the images colors
   */
  pixels() {
    const pixels = [];

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        pixels.push(this.getPixel(x, y));
      }
    }

    return pixels;
  }

  /**
   * A list of all coordinates in the image
   * @returns A two dimensional array of the images pairwise x and y coordinates
   */
    coordinates() {
        const coords = [];
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                coords.push([x, y]);
            }
        }
    return coords;
  }

  getOffset(x, y) {
    return y * this.rowSize + x * 4;
  }

}

function saturateGreen(img){
    const copyImg = img.copy();
    for (let x = 0; x < copyImg.width; ++x) {
      for (let y = 0; y < copyImg.height; ++y) {
        const pixel = copyImg.getPixel(x, y);
        copyImg.setPixel(x, y, [pixel[0], 255, pixel[2]]);
      }
    }
    return copyImg;
}

function toAverage(img){
    const copyImg = img.copy();
    const avg = getAverage(img);
    for (let x = 0; x < copyImg.width; ++x) {
        for (let y = 0; y < copyImg.height; ++y) {
          const pixel = copyImg.getPixel(x, y);
          copyImg.setPixel(x, y, avg);
        }
      }
      return copyImg;
}

function getAverage(img){
    const copyImg = img.copy();
    let count = 0;
    let avg = [0,0,0];

    for (let x = 0; x < copyImg.width; ++x) {
        for (let y = 0; y < copyImg.height; ++y) {
          const pixel = copyImg.getPixel(x, y);
          avg[0] += pixel[0];
          avg[1] += pixel[1];
          avg[2] += pixel[2];
          count +=1;
        }
        count +=1;
      }
    
    return [Math.floor(avg[0]/count),Math.floor(avg[1]/count),Math.floor(avg[2]/count)];
}


const im = Image.loadImageFromFile("images/notable_builds/joe_utopia.png");
console.log(getAverage(im));

const avg = toAverage(im);
avg.save("joe_utopia_average");

console.log(im.width/1.5,im.height/1.5);


