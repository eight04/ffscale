#!/usr/bin/env node

import * as path from "node:path";
import * as fs from "node:fs/promises";

import neodoc from "neodoc";
import fg from "fast-glob";
import {$} from "execa";
import format from "python-format-js";

const docs = `
A CLI wrapping ffmpeg to upscale/downscale videos.

usage: ffscale [--version] [--help] [--verbose]
               [--width <length>] [--height <length>]
               [--short-side <length>] [--long-side <length>]
               [--output <string_fmt>] [--overwrite]
               [--direction <direction>]
               <file>...

options:
  -v, --verbose              Show detail information.
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

<length> can be zero. In this case, the video track will be removed completely.

The CLI tries to maintain the aspect ratio if only one side is specified.
`;

// The output quality is so bad for these files
const INVALID_EXTENSION = [".gif", ".jpg"];

const args = neodoc.run(docs);
for (const pattern of args["<file>"]) {
  for await (const file of fg.stream(pattern, {onlyFiles: true})) {
    console.log(`Processing ${file}`);

    const fileContext = {
      dir: path.dirname(file) + "/",
      name: path.basename(file, path.extname(file)),
      ext: path.extname(file),
    };

    if (INVALID_EXTENSION.includes(fileContext.ext)) {
      console.log("Skipping unsupported extension.")
      continue;
    }

    const raw = await $({verbose: args["--verbose"]})`ffprobe ${file} -of json -show_streams -show_error`.catch(err => err);
    const data = JSON.parse(raw.stdout);
    if (args["--verbose"]) {
      console.log(data);
    }
    if (data.error) {
      if (/invalid data/i.test(data.error.string)) {
        console.log("Skipping non-video file.")
        continue;
      }
      throw new Error(`ffprobe error: ${data.error.string}`);
    }

    const video = data.streams.find(s => s.width && s.codec_type === "video");
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
    if (targetWidth || targetHeight) {
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
    }

    // TODO: add an audio_codec->ext map?

    const output = format(args["--output"], fileContext);

    if (!args["--overwrite"]) {
      const stat = await fs.stat(output).catch(() => false);
      if (stat && stat.size) {
        console.log("Skipping existing file.");
        continue;
      }
    }

    const videoArgs = targetWidth && targetHeight ? ["-vf", `scale=${targetWidth}:${targetHeight}`] : "-vn";
    await $({stdio: "inherit", verbose: true})`ffmpeg -i ${file} ${videoArgs} -c:a copy -y -hide_banner ${output}`;
  }
}

function calc(length, value) {
  if (value.endsWith?.("%")) {
    return Math.round(length * Number(value.slice(0, -1)) / 100);
  }
  return Number(value);
}
