# Handwritten Cree OCR (Optical Character Recognition)

This project aims to be a basic form of OCR software for handwritten Cree trained on the [handwritten Cree dataset](https://github.com/GHSam/handwritten-Cree).

[Demo is available here](https://samclarke.net/ocreer/) (this page is ~13 MiB so may be expensive to view on a mobile).

There are currently a few limitations with the software:
* The image need to be fairly clean, it doesn't currently handle background noise well
* Lined/ruled paper is currently not supported. If given limed paper it will likely produce garbage.
* It requires images to be rotated roughly right (it can handle a few degrees out but if it's too far out the accuracy will decrease)
* It assumes everything in the image is syllabics (if this is not the case, the area contianing syllabics can be manually selected)

## License

This project is open source and licensed under the MIT license.
