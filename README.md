ffscale
=======

[![test](https://github.com/eight04/ffscale/actions/workflows/test.yml/badge.svg)](https://github.com/eight04/ffscale/actions/workflows/test.yml)

A CLI wrapping ffmpeg to upscale/downscale videos.

Goals
-----

* Skip the file if the output already exists.
* Easily downscale videos into 720p.

Installation
------------

### ffmpeg

This CLI depends on ffmpeg:
https://ffmpeg.org/

Make sure `ffmpeg` and `ffprobe` commands are available.

### ffscale

```
npm install -g ffscale
```

Usage examples
--------------

```sh
# basic
ffscale --output output.mp4 --height 720 input.mp4

# glob input, non-video files are skipped automatically
ffscale --output output.mp4 --height 720 *

# use percentage
ffscale --output output.mp4 --height 50% input.mp4

# use --short-side instead of --height
ffscale --output output.mp4 --short-side 720 input.mp4

# upscale
ffscale --output output.mp4 --height 1080 --direction up input.mp4

# output to a different directory
ffscale --output "{dir}720/{name}{ext}" --height 720 input.mp4

# shorthand
ffscale -s 720 *
```

Full documentation:
https://github.com/eight04/ffscale/blob/master/index.mjs#L12


Changelog
---------

* 0.1.2 (Mar 29, 2024)

  - Fix: detect videos by `codec_type` instead of `bit_rate`.

* 0.1.1 (Mar 18, 2024)

  - Fix: avoid odd dimensions.
  - Fix: overwrite empty files.
  - Fix: improve performance.

* 0.1.0 (Mar 4, 2024)

  - Initial release.
