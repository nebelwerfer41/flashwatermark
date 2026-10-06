[Catalog](https://nebelwerfer41.github.io/) · [Repository](https://github.com/nebelwerfer41/flashwatermark)

# FlashWatermark Web

Create personalized, watermarked copies of one or more PDF files entirely in
your web browser.

## Features

- Select or drag in multiple source PDFs.
- Paste names or import them from `.txt` files.
- Adjust watermark position, rotation, opacity, gray level, and font size.
- Automatically fit each watermark to the page.
- Download one ZIP with a separate folder for every watermark name.
- Keep PDFs and names private: all processing happens locally in the browser.

## Use locally

Open `index.html` in a modern browser. An internet connection is needed when
the page loads because `pdf-lib` and `JSZip` are loaded from jsDelivr.

## GitHub Pages

This repository is ready to publish directly from the root of the `main`
branch with GitHub Pages. No build command or server is required.

## Libraries

- [pdf-lib](https://pdf-lib.js.org/) for PDF editing
- [JSZip](https://stuk.github.io/jszip/) for ZIP creation

## License

[MIT](LICENSE). Copies and derivative works must retain the copyright notice and license text. Dependencies and third-party materials retain their own licenses.
