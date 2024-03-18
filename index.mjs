#!/usr/bin/env node

import * as path from "node:path";
import * as fs from "node:fs/promises";

import neodoc from "neodoc";
import fg from "fast-glob";
import {$} from "execa";
import format from "python-format-js";

const docs = `
A CLI wrapping ffmpeg to upscale/downscale videos.

usage: ffscale [--version] [--help] 
               [--width <length>] [--height <length>]
               [--short-side <length>] [--long-side <length>]
               [--output <string_fmt>] [--overwrite]
               [--direction <direction>]
               <file>...

options:
  -w, --width <length>       Scale by width.
  -h, --height <length>      Scale by height.
  -s, --short-side <length>  Scale by the short side.
  -l, --long-side <length>   Scale by the long side.

  -o, --output <string_fmt>  Python formatted string for output filename.
                             Note that 'dir' always ends with a slash.
                             [default: "{dir}{name}_ffscale{ext}"]

  --overwrite                Overwrite the destination file.
  --direction <direction>    Could be "down", "up", or "both". [default: "down"]
  <file>                     Glob pattern. Files to convert.

<length> can be an integer (in px), or a percentage.

The CLI tries to maintain the aspect ratio if only one side is specified.
`;

const args = neodoc.run(docs);
for (const pattern of args["<file>"]) {
  for await (const file of fg.stream(pattern, {onlyFiles: true})) {
    console.log(`Processing ${file}`);

    const raw = await $`ffprobe ${file} -of json -show_streams -show_error`.catch(err => err);
    const data = JSON.parse(raw.stdout);
    if (data.error) {
      if (/invalid data/i.test(data.error.string)) {
        console.log("Skipping non-video file.")
        continue;
      }
      throw new Error(`ffprobe error: ${data.error.string}`);
    }

    const video = data.streams.find(s => s.width && s.bit_rate);
    if (!video) {
      console.log("Skipping non-video file.")
      continue;
    }

    let targetWidth, targetHeight;
    if (args["--width"]) {
      targetWidth = calc(video.width, args["--width"]);
    }
    if (args["--height"]) {
      targetHeight = calc(video.height, args["--height"]);
    }
    if (args["--short-side"]) {
      if (video.width < video.height) {
        targetWidth = calc(video.width, args["--short-side"]);
      } else {
        targetHeight = calc(video.height, args["--short-side"]);
      }
    }
    if (args["--long-side"]) {
      if (video.width > video.height) {
        targetWidth = calc(video.width, args["--long-side"]);
      } else {
        targetHeight = calc(video.height, args["--long-side"]);
      }
    }
    if (!targetWidth && !targetHeight) {
      throw new Error("No target size specified.");
    }
    if (!targetWidth) {
      targetWidth = Math.round(targetHeight * video.width / video.height);
    }
    if (!targetHeight) {
      targetHeight = Math.round(targetWidth * video.height / video.width);
    }

    if (video.codec_name === "h264") {
      // some codec don't like odd dimensions
      targetWidth = targetWidth - targetWidth % 2;
      targetHeight = targetHeight - targetHeight % 2;
    }

    if (args["--direction"] === "down") {
      if (targetWidth >= video.width || targetHeight >= video.height) {
        console.log("Skipping upscaling.")
        continue;
      }
    }
    if (args["--direction"] === "up") {
      if (targetWidth <= video.width || targetHeight <= video.height) {
        console.log("Skipping downscaling.")
        continue;
      }
    }
    const output = format(args["--output"], {
      dir: path.dirname(file) + "/",
      name: path.basename(file, path.extname(file)),
      ext: path.extname(file),
    });

    if (!args["--overwrite"]) {
      const stat = await fs.stat(output).catch(() => false);
      if (stat && stat.size) {
        console.log("Skipping existing file.");
        continue;
      }
    }

    await $({stdio: "inherit", verbose: true})`ffmpeg -i ${file} -vf scale=${targetWidth}:${targetHeight} -c:a copy -y -hide_banner ${output}`;
  }
}

function calc(length, value) {
  if (value.endsWith?.("%")) {
    return Math.round(length * Number(value.slice(0, -1)) / 100);
  }
  return Number(value);
}
