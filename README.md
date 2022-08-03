# Handwritten Cree OCR (Optical Character Recognition)

<p align="center">
<img src="https://github.com/GHsam/handwritten-Cree-OCR/blob/master/screenshot.png?raw=true" width="600" alt="Screenshot of Cree OCR">
</p>

This project aims to be a basic form of OCR software for handwritten Cree trained on the [handwritten Cree dataset](https://github.com/GHSam/handwritten-Cree).

It is [available here](https://samclarke.net/ocreer/) (warning: this page is ~13 MiB).

A demo image to try it out with is [available here](https://github.com/GHSam/handwritten-Cree-OCR/raw/master/demo.png).


### Limitations

There are currently a few limitations with the software:
* The image need to be fairly clean, it doesn't currently handle background noise well
* Lined/ruled paper is currently not supported. If given limed paper it will likely produce garbage.
* It requires images to be rotated roughly right (it can handle a few degrees out but if it's too far out the accuracy will decrease)
* It assumes everything in the image is syllabics (if this is not the case, the area contianing syllabics can be manually selected)

## License

This project is open source and licensed under the MIT license.
