ffscale
=======

A CLI wrapping ffmpeg to upscale/downscale videos.

Goals
-----

* Skip the file if the output already exists.
* Easily downscale videos into 720p.

Installation
------------

### Install ffmpeg

This CLI depends on ffmpeg:
https://ffmpeg.org/

Make sure `ffmpeg` and `ffprobe` commands are available.

### Install ffscale

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

# use --short-side instead of --height
ffscale --output output.mp4 --short-side 720 input.mp4

# upscale
ffscale --output output.mp4 --height 1080 --direction up input.mp4

# output to a different directory
ffscale --output "{dir}720/{name}{ext}" --height 720 input.mp4
```

Full documentation:
https://github.com/eight04/ffscale/blob/master/index.mjs#L12


Changelog
---------

* 0.1.0 (Mar 4, 2024)

  - Initial release.
