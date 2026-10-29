
const imageInput = document.getElementById("imageInput");
const previewBox = document.getElementById("previewBox");
const inspectBtn = document.getElementById("inspectBtn");
const objectType = document.getElementById("objectType");
const resultBox = document.getElementById("result");
const historyBody = document.getElementById("history");

let selectedImage = null;
let imageURL = null;
let inspections = [];

let total = 0;
let passed = 0;
let failed = 0;

imageInput.addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Please select a valid image.");
    return;
  }

  selectedImage = file;

  if (imageURL) URL.revokeObjectURL(imageURL);
  imageURL = URL.createObjectURL(file);

  previewBox.innerHTML = "";

  const img = document.createElement("img");
  img.src = imageURL;
  img.alt = "Uploaded image";
  previewBox.appendChild(img);

  inspectBtn.disabled = false;
  inspectBtn.textContent = "Run AI Inspection";

  resultBox.className = "result";
  resultBox.innerHTML = `
    <h3>Image Ready</h3>
    <p>Click Run AI Inspection.</p>
  `;
});

inspectBtn.addEventListener("click", async function () {
  if (!selectedImage) {
    alert("Please upload an image.");
    return;
  }

  inspectBtn.disabled = true;
  inspectBtn.textContent = "AI Inspecting...";

  resultBox.className = "result";
  resultBox.textContent = "AI is analyzing your image...";

  const formData = new FormData();
  formData.append("image", selectedImage);

  try {
    const response = await fetch("/api/inspect", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Inspection failed");
    }

    const objects = data.objects || [];

    resultBox.replaceChildren();

    const heading = document.createElement("h3");
    heading.textContent = "AI Object Detection Completed";

    const count = document.createElement("p");
    count.textContent = `Objects detected: ${data.object_count}`;

    resultBox.append(heading, count);

    objects.forEach(function (obj) {
      const p = document.createElement("p");
      p.textContent =
        `${obj.name} — Confidence: ${obj.confidence}%`;
      resultBox.appendChild(p);
    });

    const warning = document.createElement("p");
    warning.textContent = data.defect_model_ready
      ? "Defect model is configured. Check its predictions."
      : "Defect detection model not configured. Quality status cannot be determined.";

    resultBox.appendChild(warning);

    if (data.annotated_image) {
      const img = document.createElement("img");
      img.src = data.annotated_image;
      img.alt = "AI detected objects";
      img.style.maxWidth = "100%";
      img.style.marginTop = "15px";
      resultBox.appendChild(img);
    }

    total++;
    document.getElementById("total").textContent = total;

    // Object detection alone cannot establish OK/Defective.
    const status = "Not determined";

    inspections.unshift({
      time: new Date().toLocaleTimeString(),
      object: objectType.value,
      status: status
    });

    renderHistory();

  } catch (error) {
    resultBox.className = "result defect";
    resultBox.textContent = "Error: " + error.message;
  } finally {
    inspectBtn.disabled = false;
    inspectBtn.textContent = "Run AI Inspection";
  }
});

function renderHistory() {
  historyBody.replaceChildren();

  if (inspections.length === 0) {
    const row = historyBody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 4;
    cell.textContent = "No inspections yet";
    return;
  }

  inspections.forEach(function (item) {
    const row = historyBody.insertRow();

    row.insertCell().textContent = item.time;
    row.insertCell().textContent = item.object;
    row.insertCell().textContent = item.status;
    row.insertCell().textContent = "YOLO AI";
  });
}

document.getElementById("clearBtn").addEventListener("click", function () {
  inspections = [];
  renderHistory();
});

renderHistory();
