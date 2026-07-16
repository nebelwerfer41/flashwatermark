"use strict";

const elements = {
  form: document.querySelector("#watermark-form"),
  pdfInput: document.querySelector("#pdf-files"),
  pdfDropZone: document.querySelector("#pdf-drop-zone"),
  pdfSummary: document.querySelector("#pdf-summary"),
  pdfList: document.querySelector("#pdf-list"),
  nameFileInput: document.querySelector("#name-files"),
  names: document.querySelector("#names"),
  nameCount: document.querySelector("#name-count"),
  outputSummary: document.querySelector("#output-summary"),
  position: document.querySelector("#position"),
  rotation: document.querySelector("#rotation"),
  opacity: document.querySelector("#opacity"),
  opacityValue: document.querySelector("#opacity-value"),
  solid: document.querySelector("#solid"),
  grayField: document.querySelector("#gray-field"),
  gray: document.querySelector("#gray"),
  grayValue: document.querySelector("#gray-value"),
  autoFontSize: document.querySelector("#auto-font-size"),
  fontSizeField: document.querySelector("#font-size-field"),
  fontSize: document.querySelector("#font-size"),
  generateButton: document.querySelector("#generate-button"),
  progressPanel: document.querySelector("#progress-panel"),
  progress: document.querySelector("#progress"),
  progressLabel: document.querySelector("#progress-label"),
  progressPercent: document.querySelector("#progress-percent"),
  message: document.querySelector("#message"),
};

let pdfFiles = [];

function getNames() {
  const uniqueNames = new Map();
  for (const line of elements.names.value.split(/\r?\n/)) {
    const name = line.trim();
    if (name && !uniqueNames.has(name)) {
      uniqueNames.set(name, name);
    }
  }
  return [...uniqueNames.values()].sort((a, b) => a.localeCompare(b));
}

function sanitizeFilenameComponent(value) {
  return value.trim().replace(/[^A-Za-z0-9._-]+/g, "_") || "name";
}

function sanitizeFolderComponent(value) {
  const component = sanitizeFilenameComponent(value);
  return component === "." || component === ".." ? "name" : component;
}

function sourceStem(filename) {
  return filename.replace(/\.pdf$/i, "");
}

function uniqueFilename(filename, usedFilenames) {
  if (!usedFilenames.has(filename)) {
    usedFilenames.add(filename);
    return filename;
  }
  const extensionIndex = filename.toLowerCase().lastIndexOf(".pdf");
  const stem = extensionIndex >= 0 ? filename.slice(0, extensionIndex) : filename;
  const extension = extensionIndex >= 0 ? filename.slice(extensionIndex) : "";
  let counter = 2;
  let candidate = `${stem}_${counter}${extension}`;
  while (usedFilenames.has(candidate)) {
    counter += 1;
    candidate = `${stem}_${counter}${extension}`;
  }
  usedFilenames.add(candidate);
  return candidate;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; value >= 1024 && index < units.length; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${unit}`;
}

function isPdf(file) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function setPdfFiles(files) {
  const seen = new Set();
  pdfFiles = [...files]
    .filter(isPdf)
    .filter((file) => {
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  elements.pdfSummary.textContent = pdfFiles.length
    ? `${pdfFiles.length} PDF${pdfFiles.length === 1 ? "" : "s"} selected`
    : "PDF files only";
  elements.pdfList.replaceChildren(
    ...pdfFiles.map((file) => {
      const row = document.createElement("div");
      row.className = "file-item";
      const filename = document.createElement("span");
      filename.textContent = file.name;
      const size = document.createElement("span");
      size.textContent = formatBytes(file.size);
      row.append(filename, size);
      return row;
    }),
  );
  updateCounts();
}

function updateCounts() {
  const nameTotal = getNames().length;
  const outputTotal = nameTotal * pdfFiles.length;
  elements.nameCount.textContent = `${nameTotal} name${nameTotal === 1 ? "" : "s"}`;
  if (!nameTotal || !pdfFiles.length) {
    elements.outputSummary.textContent = "Add PDFs and names to see the output count.";
    return;
  }
  elements.outputSummary.textContent = `${outputTotal} personalized PDF${outputTotal === 1 ? "" : "s"} will be organized in ${nameTotal} watermark folder${nameTotal === 1 ? "" : "s"}.`;
}

function setProgress(completed, total, label) {
  const percent = total ? Math.round((completed / total) * 100) : 0;
  elements.progress.value = percent;
  elements.progressLabel.textContent = label;
  elements.progressPercent.textContent = `${percent}%`;
}

function estimateAutoFontSize(text, width, height, font, rotationDegrees) {
  const textWidth = font.widthOfTextAtSize(text, 1);
  const textHeight = font.heightAtSize(1, { descender: true });
  const angle = (rotationDegrees * Math.PI) / 180;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  const rotatedWidth = textWidth * cos + textHeight * sin;
  const rotatedHeight = textWidth * sin + textHeight * cos;
  if (rotatedWidth <= 0 || rotatedHeight <= 0) return 1;
  return Math.max(1, Math.min((width * 0.8) / rotatedWidth, (height * 0.8) / rotatedHeight));
}

function watermarkCoordinates(position, pageWidth, pageHeight, textWidth, textHeight, angleDegrees) {
  const margin = 36;
  const angle = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const centerOffsetX = (textWidth / 2) * cos - (textHeight / 2) * sin;
  const centerOffsetY = (textWidth / 2) * sin + (textHeight / 2) * cos;

  if (position === "center") {
    return {
      x: pageWidth / 2 - centerOffsetX,
      y: pageHeight / 2 - centerOffsetY,
    };
  }

  const corners = [
    { x: 0, y: 0 },
    { x: textWidth * cos, y: textWidth * sin },
    { x: -textHeight * sin, y: textHeight * cos },
    { x: textWidth * cos - textHeight * sin, y: textWidth * sin + textHeight * cos },
  ];
  const minX = Math.min(...corners.map((point) => point.x));
  const maxX = Math.max(...corners.map((point) => point.x));
  const minY = Math.min(...corners.map((point) => point.y));
  const maxY = Math.max(...corners.map((point) => point.y));
  const left = position.endsWith("left");
  const top = position.startsWith("top");
  return {
    x: left ? margin - minX : pageWidth - margin - maxX,
    y: top ? pageHeight - margin - maxY : margin - minY,
  };
}

async function createWatermarkedPdf(sourceBytes, name, settings) {
  const { PDFDocument, StandardFonts, degrees, grayscale, rgb } = PDFLib;
  const document = await PDFDocument.load(sourceBytes);
  const font = await document.embedFont(StandardFonts.HelveticaBold);

  for (const page of document.getPages()) {
    const { width, height } = page.getSize();
    const fontSize = settings.autoFontSize
      ? estimateAutoFontSize(name, width, height, font, settings.rotation)
      : settings.fontSize;
    const textWidth = font.widthOfTextAtSize(name, fontSize);
    const textHeight = font.heightAtSize(fontSize, { descender: true });
    const { x, y } = watermarkCoordinates(
      settings.position,
      width,
      height,
      textWidth,
      textHeight,
      settings.rotation,
    );
    page.drawText(name, {
      x,
      y,
      size: fontSize,
      font,
      rotate: degrees(settings.rotation),
      color: settings.solid ? grayscale(settings.gray) : rgb(0, 0, 0),
      opacity: settings.solid ? 1 : settings.opacity,
    });
  }

  return document.save({ useObjectStreams: true });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function friendlyError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/encrypted/i.test(message)) {
    return "One of the PDFs is password-protected. Remove its password and try again.";
  }
  if (/WinAnsi|encode/i.test(message)) {
    return "A name contains characters unsupported by the built-in PDF font. Try Latin letters and common punctuation.";
  }
  return message || "The PDFs could not be generated.";
}

async function generate(event) {
  event.preventDefault();
  elements.message.classList.remove("error");
  elements.message.textContent = "";

  if (!window.PDFLib || !window.JSZip) {
    elements.message.classList.add("error");
    elements.message.textContent = "The PDF libraries did not load. Check your internet connection and refresh the page.";
    return;
  }

  const names = getNames();
  if (!pdfFiles.length || !names.length) {
    elements.message.classList.add("error");
    elements.message.textContent = "Select at least one PDF and enter at least one name.";
    return;
  }

  const settings = {
    position: elements.position.value,
    rotation: Number(elements.rotation.value),
    opacity: Number(elements.opacity.value),
    solid: elements.solid.checked,
    gray: Number(elements.gray.value),
    autoFontSize: elements.autoFontSize.checked,
    fontSize: Number(elements.fontSize.value),
  };
  if (!Number.isFinite(settings.rotation) || !Number.isFinite(settings.fontSize) || settings.fontSize < 1) {
    elements.message.classList.add("error");
    elements.message.textContent = "Enter a valid rotation and a font size of at least 1 pt.";
    return;
  }

  const originalButtonText = elements.generateButton.querySelector("span").textContent;
  elements.generateButton.disabled = true;
  elements.generateButton.querySelector("span").textContent = "Generating…";
  elements.progressPanel.hidden = false;
  setProgress(0, names.length * pdfFiles.length, "Reading source PDFs…");

  try {
    const zip = new JSZip();
    const usedFolderNames = new Set();
    const folderNames = new Map();
    const usedFilenamesByFolder = new Map();
    for (const name of names) {
      const folderName = uniqueFilename(sanitizeFolderComponent(name), usedFolderNames);
      folderNames.set(name, folderName);
      usedFilenamesByFolder.set(folderName, new Set());
    }
    const total = names.length * pdfFiles.length;
    let completed = 0;
    for (const pdfFile of pdfFiles) {
      const sourceBytes = await pdfFile.arrayBuffer();
      for (const name of names) {
        setProgress(completed, total, `Creating ${name} — ${pdfFile.name}`);
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const outputBytes = await createWatermarkedPdf(sourceBytes, name, settings);
        const folderName = folderNames.get(name);
        const desiredName = `${sanitizeFilenameComponent(name)}__${sanitizeFilenameComponent(sourceStem(pdfFile.name))}.pdf`;
        const outputName = uniqueFilename(desiredName, usedFilenamesByFolder.get(folderName));
        zip.file(`${folderName}/${outputName}`, outputBytes);
        completed += 1;
        setProgress(completed, total, `Created ${completed} of ${total}`);
      }
    }

    elements.progressLabel.textContent = "Compressing ZIP…";
    const zipBlob = await zip.generateAsync(
      { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
      ({ percent }) => {
        elements.progress.value = percent;
        elements.progressPercent.textContent = `${Math.round(percent)}%`;
      },
    );
    downloadBlob(zipBlob, "flashwatermark-output.zip");
    setProgress(total, total, "Download ready");
    elements.message.textContent = `Done — generated ${total} personalized PDF${total === 1 ? "" : "s"}.`;
  } catch (error) {
    console.error(error);
    elements.message.classList.add("error");
    elements.message.textContent = friendlyError(error);
  } finally {
    elements.generateButton.disabled = false;
    elements.generateButton.querySelector("span").textContent = originalButtonText;
  }
}

elements.pdfInput.addEventListener("change", () => setPdfFiles(elements.pdfInput.files));
elements.pdfDropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  elements.pdfDropZone.classList.add("is-dragging");
});
elements.pdfDropZone.addEventListener("dragleave", () => {
  elements.pdfDropZone.classList.remove("is-dragging");
});
elements.pdfDropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  elements.pdfDropZone.classList.remove("is-dragging");
  setPdfFiles(event.dataTransfer.files);
});
elements.nameFileInput.addEventListener("change", async () => {
  const contents = await Promise.all([...elements.nameFileInput.files].map((file) => file.text()));
  const prefix = elements.names.value.trim() ? `${elements.names.value.trim()}\n` : "";
  elements.names.value = `${prefix}${contents.join("\n")}`;
  updateCounts();
  elements.nameFileInput.value = "";
});
elements.names.addEventListener("input", updateCounts);
elements.opacity.addEventListener("input", () => {
  elements.opacityValue.value = `${Math.round(Number(elements.opacity.value) * 100)}%`;
});
elements.gray.addEventListener("input", () => {
  elements.grayValue.value = `${Math.round(Number(elements.gray.value) * 100)}%`;
});
elements.solid.addEventListener("change", () => {
  elements.grayField.hidden = !elements.solid.checked;
  elements.opacity.closest("label").hidden = elements.solid.checked;
});
elements.autoFontSize.addEventListener("change", () => {
  elements.fontSizeField.hidden = elements.autoFontSize.checked;
});
elements.form.addEventListener("submit", generate);

updateCounts();
