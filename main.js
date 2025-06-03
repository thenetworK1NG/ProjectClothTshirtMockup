import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('canvas-container').appendChild(renderer.domElement);

// Track multiple images
let images = []; // Array to store all uploaded images and their transforms
let selectedImageIndex = -1; // Currently selected image index

// UV Editor setup
const uvCanvas = document.getElementById('uv-canvas');
const uvCtx = uvCanvas.getContext('2d');
const uvOverlay = document.getElementById('uv-overlay');
let templateImage = null;
let uvAspectRatio = 1; // Will be set based on the model's UV mapping

// Load template image
const templateImg = new Image();
templateImg.onload = () => {
    templateImage = templateImg;
    // Calculate the aspect ratio based on the template
    uvAspectRatio = templateImage.width / templateImage.height;
    resizeUVCanvas();
    drawUVEditor();
};
templateImg.src = 'template.png';

// Add image list container to the UV editor
const imageList = document.createElement('div');
imageList.className = 'image-list';
document.querySelector('.uv-editor-header').appendChild(imageList);

// Add color picker to the UI
const colorPicker = document.createElement('div');
colorPicker.className = 'color-picker-container';
colorPicker.innerHTML = `
    <label for="shirt-color">Shirt Color:</label>
    <input type="color" id="shirt-color" value="#ffffff">
`;
document.querySelector('.uv-editor-header').appendChild(colorPicker);

// Add record button to the UI
const recordButton = document.createElement('button');
recordButton.id = 'record-btn';
recordButton.className = 'record-button';
recordButton.innerHTML = `
    <span class="record-icon"></span>
    Record Video
`;
document.querySelector('.uv-editor-header').appendChild(recordButton);

// Add styles for the image list, color picker, and record button
const style = document.createElement('style');
style.textContent = `
    .image-list {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin-top: 5px;
        max-height: 150px;
        overflow-y: auto;
        z-index: 1000;
    }
    .image-item {
        display: flex;
        align-items: center;
        padding: 5px;
        border-bottom: 1px solid #eee;
        cursor: pointer;
    }
    .image-item:hover {
        background: #f5f5f5;
    }
    .image-item.selected {
        background: #e3f2fd;
    }
    .image-item img {
        width: 40px;
        height: 40px;
        object-fit: contain;
        margin-right: 10px;
    }
    .image-item .remove-btn {
        margin-left: auto;
        padding: 2px 6px;
        background: #ff4444;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
    }
    .image-item .remove-btn:hover {
        background: #cc0000;
    }
    .color-picker-container {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 10px;
        padding: 5px;
        background: #f5f5f5;
        border-radius: 4px;
    }
    .color-picker-container label {
        font-size: 14px;
        color: #333;
    }
    #shirt-color {
        width: 50px;
        height: 30px;
        padding: 0;
        border: 1px solid #ddd;
        border-radius: 4px;
        cursor: pointer;
    }
    #shirt-color::-webkit-color-swatch-wrapper {
        padding: 0;
    }
    #shirt-color::-webkit-color-swatch {
        border: none;
        border-radius: 2px;
    }
    .record-button {
        background: #e74c3c;
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        transition: all 0.3s ease;
    }
    .record-button:hover {
        background: #c0392b;
    }
    .record-button.recording {
        background: #c0392b;
        animation: pulse 1.5s infinite;
    }
    .record-icon {
        width: 12px;
        height: 12px;
        background: white;
        border-radius: 50%;
    }
    .record-button.recording .record-icon {
        background: #e74c3c;
        border-radius: 2px;
    }
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
    .recording-status {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        font-size: 14px;
        display: none;
        z-index: 1000;
    }
`;
document.head.appendChild(style);

function addImageToList(image, index) {
    const item = document.createElement('div');
    item.className = 'image-item';
    if (index === selectedImageIndex) {
        item.classList.add('selected');
    }
    
    const img = document.createElement('img');
    img.src = image.url;
    item.appendChild(img);
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '×';
    removeBtn.onclick = (e) => {
        e.stopPropagation();
        removeImage(index);
    };
    item.appendChild(removeBtn);
    
    item.onclick = () => selectImage(index);
    imageList.appendChild(item);
}

function selectImage(index) {
    selectedImageIndex = index;
    // Update UI
    document.querySelectorAll('.image-item').forEach((item, i) => {
        item.classList.toggle('selected', i === index);
    });
    
    // Update transform controls
    if (index >= 0 && images[index]) {
        const transform = images[index].transform;
        posXSlider.value = transform.x;
        posYSlider.value = transform.y;
        scaleSlider.value = transform.scale;
        rotationSlider.value = transform.rotation;
    }
    
    drawUVEditor();
}

function removeImage(index) {
    images.splice(index, 1);
    if (selectedImageIndex === index) {
        selectedImageIndex = images.length > 0 ? 0 : -1;
    } else if (selectedImageIndex > index) {
        selectedImageIndex--;
    }
    
    // Update UI
    imageList.innerHTML = '';
    images.forEach((img, i) => addImageToList(img, i));
    
    // Update transform controls
    if (selectedImageIndex >= 0) {
        const transform = images[selectedImageIndex].transform;
        posXSlider.value = transform.x;
        posYSlider.value = transform.y;
        scaleSlider.value = transform.scale;
        rotationSlider.value = transform.rotation;
    }
    
    updateTexture();
    drawUVEditor();
}

// UV Editor controls
const moveBtn = document.getElementById('move-btn');
const scaleBtn = document.getElementById('scale-btn');
const rotateBtn = document.getElementById('rotate-btn');
let currentMode = 'move';

[moveBtn, scaleBtn, rotateBtn].forEach(btn => {
    btn.addEventListener('click', () => {
        [moveBtn, scaleBtn, rotateBtn].forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.id.replace('-btn', '');
    });
});

// Duplicate button functionality
const duplicateBtn = document.getElementById('duplicate-btn');
duplicateBtn.addEventListener('click', () => {
    if (selectedImageIndex >= 0 && images[selectedImageIndex]) {
        const selectedImage = images[selectedImageIndex];
        const newImage = {
            image: selectedImage.image, // Copy the actual image object
            url: selectedImage.url,
            transform: {
                x: selectedImage.transform.x + 0.1, // Offset slightly to make it visible
                y: selectedImage.transform.y + 0.1,
                scale: selectedImage.transform.scale,
                rotation: selectedImage.transform.rotation
            }
        };
        
        images.push(newImage);
        selectedImageIndex = images.length - 1; // Select the new image
        
        // Update UI
        imageList.innerHTML = '';
        images.forEach((img, i) => addImageToList(img, i));
        
        // Update transform controls
        const transform = newImage.transform;
        posXSlider.value = transform.x;
        posYSlider.value = transform.y;
        scaleSlider.value = transform.scale;
        rotationSlider.value = transform.rotation;
        
        updateTexture();
        drawUVEditor();
    }
});

// UV Editor sliders
const posXSlider = document.getElementById('pos-x');
const posYSlider = document.getElementById('pos-y');
const scaleSlider = document.getElementById('scale');
const rotationSlider = document.getElementById('rotation');

[posXSlider, posYSlider, scaleSlider, rotationSlider].forEach(slider => {
    slider.addEventListener('input', () => {
        if (selectedImageIndex >= 0 && images[selectedImageIndex]) {
            const image = images[selectedImageIndex];
            image.transform.x = parseFloat(posXSlider.value);
            image.transform.y = parseFloat(posYSlider.value);
            image.transform.scale = parseFloat(scaleSlider.value);
            image.transform.rotation = parseFloat(rotationSlider.value);
            updateTexture();
            drawUVEditor();
        }
    });
});

// UV Editor mouse interaction
let isDragging = false;
let lastMousePos = { x: 0, y: 0 };

uvCanvas.addEventListener('mousedown', (e) => {
    if (!images.length) return;
    isDragging = true;
    lastMousePos = { x: e.clientX, y: e.clientY };
});

window.addEventListener('mousemove', (e) => {
    if (!isDragging || !images.length) return;
    
    const dx = (e.clientX - lastMousePos.x) / uvCanvas.width;
    const dy = (e.clientY - lastMousePos.y) / uvCanvas.height;
    
    switch (currentMode) {
        case 'move':
            images[selectedImageIndex].transform.x += dx;
            images[selectedImageIndex].transform.y += dy;
            posXSlider.value = images[selectedImageIndex].transform.x;
            posYSlider.value = images[selectedImageIndex].transform.y;
            break;
        case 'scale':
            const scaleDelta = (dx + dy) * 2;
            images[selectedImageIndex].transform.scale = Math.max(0.1, Math.min(2, images[selectedImageIndex].transform.scale + scaleDelta));
            scaleSlider.value = images[selectedImageIndex].transform.scale;
            break;
        case 'rotate':
            images[selectedImageIndex].transform.rotation += (dx + dy) * 180;
            rotationSlider.value = images[selectedImageIndex].transform.rotation;
            break;
    }
    
    lastMousePos = { x: e.clientX, y: e.clientY };
    updateTexture();
    drawUVEditor();
});

window.addEventListener('mouseup', () => {
    isDragging = false;
});

function resizeUVCanvas() {
    const container = uvCanvas.parentElement;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calculate dimensions maintaining the UV aspect ratio
    let width, height;
    if (containerWidth / containerHeight > uvAspectRatio) {
        height = containerHeight;
        width = height * uvAspectRatio;
    } else {
        width = containerWidth;
        height = width / uvAspectRatio;
    }
    
    uvCanvas.width = width;
    uvCanvas.height = height;
    
    // Center the canvas in the container
    uvCanvas.style.position = 'absolute';
    uvCanvas.style.left = `${(containerWidth - width) / 2}px`;
    uvCanvas.style.top = `${(containerHeight - height) / 2}px`;
}

function drawUVEditor() {
    if (!templateImage) return;
    
    // Clear the canvas
    uvCtx.clearRect(0, 0, uvCanvas.width, uvCanvas.height);
    
    // Draw template
    uvCtx.drawImage(templateImage, 0, 0, uvCanvas.width, uvCanvas.height);
    
    // Draw all images
    images.forEach((imgData, index) => {
        const { image, transform } = imgData;
        uvCtx.save();
        
        // Calculate the scale to fit the image within the UV space
        const imageAspect = image.width / image.height;
        const scale = Math.min(
            uvCanvas.width / image.width,
            uvCanvas.height / image.height
        ) * transform.scale;
        
        // Calculate the center position in canvas coordinates
        const centerX = (transform.x + 0.5) * uvCanvas.width;
        const centerY = (transform.y + 0.5) * uvCanvas.height;
        
        // Apply transformations in the correct order
        uvCtx.translate(centerX, centerY);
        uvCtx.rotate(transform.rotation * Math.PI / 180);
        uvCtx.scale(scale, scale);
        
        // Draw selection highlight for selected image
        if (index === selectedImageIndex) {
            uvCtx.strokeStyle = '#2196F3';
            uvCtx.lineWidth = 2;
            uvCtx.strokeRect(
                -image.width / 2 - 5,
                -image.height / 2 - 5,
                image.width + 10,
                image.height + 10
            );
        }
        
        uvCtx.drawImage(image, 
            -image.width / 2, 
            -image.height / 2, 
            image.width, 
            image.height
        );
        uvCtx.restore();
    });
}

// Track the current shirt color
let currentShirtColor = '#ffffff';

// Add color change handler
document.getElementById('shirt-color').addEventListener('input', (e) => {
    currentShirtColor = e.target.value;
    updateTexture();
});

function updateTexture() {
    if (!tshirtModel || images.length === 0) return;
    
    // Create a canvas for the final texture
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = templateImage.width;
    textureCanvas.height = templateImage.height;
    const textureCtx = textureCanvas.getContext('2d');
    
    // Clear the canvas with the selected shirt color
    textureCtx.fillStyle = currentShirtColor;
    textureCtx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
    
    // Draw all images
    images.forEach(({ image, transform }) => {
        textureCtx.save();
        
        // Calculate the scale to fit the image within the UV space
        const imageAspect = image.width / image.height;
        const scale = Math.min(
            textureCanvas.width / image.width,
            textureCanvas.height / image.height
        ) * transform.scale;
        
        // Calculate the center position in canvas coordinates
        const centerX = (transform.x + 0.5) * textureCanvas.width;
        const centerY = (transform.y + 0.5) * textureCanvas.height;
        
        // Apply transformations in the correct order
        textureCtx.translate(centerX, centerY);
        textureCtx.rotate(transform.rotation * Math.PI / 180);
        textureCtx.scale(scale, scale);
        
        textureCtx.drawImage(image, 
            -image.width / 2, 
            -image.height / 2, 
            image.width, 
            image.height
        );
        textureCtx.restore();
    });
    
    // Create and update texture
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.flipY = true;
    texture.encoding = THREE.sRGBEncoding;
    texture.needsUpdate = true;
    
    // Apply to model
    tshirtModel.traverse((child) => {
        if (child.isMesh) {
            const material = new THREE.MeshStandardMaterial({
                map: texture,
                color: new THREE.Color(currentShirtColor),
                roughness: 0.9,
                metalness: 0.0,
                side: THREE.DoubleSide,
                transparent: true,
                alphaTest: 0.5
            });
            child.material = material;
            child.material.needsUpdate = true;
        }
    });
}

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 3;
controls.maxDistance = 10;
controls.maxPolarAngle = Math.PI / 2;

let tshirtModel = null;

// Loading manager
const loadingManager = new THREE.LoadingManager();
loadingManager.onLoad = () => {
    console.log('Loading complete!');
    document.querySelector('.loading-screen').classList.add('hidden');
};

loadingManager.onError = (url) => {
    console.error('Error loading:', url);
    document.querySelector('.loading-screen p').textContent = 'Error loading model. Check console for details.';
};

// Load the 3D model
const loader = new GLTFLoader(loadingManager);
console.log('Starting to load model...');
loader.load(
    'Tshirt.glb',
    (gltf) => {
        console.log('Model loaded successfully:', gltf);
        tshirtModel = gltf.scene;
        
        // Center the model
        const box = new THREE.Box3().setFromObject(tshirtModel);
        const center = box.getCenter(new THREE.Vector3());
        tshirtModel.position.sub(center);
        
        // Scale the model if needed
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        tshirtModel.scale.multiplyScalar(scale);
        
        // Flip UV coordinates
        tshirtModel.traverse((child) => {
            if (child.isMesh && child.geometry.attributes.uv) {
                const uvs = child.geometry.attributes.uv;
                const newUvs = new Float32Array(uvs.count * 2);
                
                // Copy and flip UVs vertically
                for (let i = 0; i < uvs.count; i++) {
                    newUvs[i * 2] = uvs.getX(i);
                    newUvs[i * 2 + 1] = 1 - uvs.getY(i);
                }
                
                child.geometry.setAttribute('uv', new THREE.BufferAttribute(newUvs, 2));
                child.geometry.attributes.uv.needsUpdate = true;
                
                // Create a new material with the current shirt color
                child.material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(currentShirtColor),
                    roughness: 0.9,
                    metalness: 0.0,
                    side: THREE.DoubleSide
                });
            }
        });
        
        scene.add(tshirtModel);
        console.log('Model added to scene');
    },
    (xhr) => {
        const percent = (xhr.loaded / xhr.total * 100).toFixed(2);
        console.log(`${percent}% loaded`);
        document.querySelector('.loading-screen p').textContent = `Loading 3D Model... ${percent}%`;
    },
    (error) => {
        console.error('An error happened while loading the model:', error);
        document.querySelector('.loading-screen p').textContent = 'Error loading model. Check console for details.';
    }
);

// Image upload handling
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

function handleImageUpload(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            if (!tshirtModel) {
                alert('Please wait for the 3D model to load');
                return;
            }
            
            // Add new image to the list
            const newImage = {
                image: img,
                url: e.target.result,
                transform: {
                    x: 0,
                    y: 0,
                    scale: 1,
                    rotation: 0
                }
            };
            
            images.push(newImage);
            selectedImageIndex = images.length - 1;
            
            // Reset sliders
            posXSlider.value = 0;
            posYSlider.value = 0;
            scaleSlider.value = 1;
            rotationSlider.value = 0;
            
            // Update UI
            addImageToList(newImage, selectedImageIndex);
            
            updateTexture();
            drawUVEditor();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Drag and drop handlers
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
});

// Click to upload
dropZone.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleImageUpload(file);
});

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    resizeUVCanvas();
    drawUVEditor();
});

// Remove the old recording variables and move them to the top with other global variables
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let recordingStartTime = 0;
let RECORDING_DURATION = 5000; // 5 seconds
let ROTATION_SPEED = 0.5; // degrees per frame
let VIDEO_BITRATE = 5000000; // 5 Mbps
let isDraggingPanel = false; // Renamed to avoid conflict
let dragOffset = { x: 0, y: 0 };

// Add after the existing UI elements but before the render panel
const recordingStatus = document.createElement('div');
recordingStatus.className = 'recording-status';
recordingStatus.style.display = 'none';
document.body.appendChild(recordingStatus);

// Add the render panel
const renderPanel = document.createElement('div');
renderPanel.className = 'render-panel';
renderPanel.innerHTML = `
    <div class="render-panel-header">
        <h3>Render Controls</h3>
        <button class="minimize-btn">−</button>
    </div>
    <div class="render-panel-content">
        <div class="render-controls">
            <div class="control-group">
                <label>Duration (seconds)</label>
                <input type="range" id="duration-slider" min="3" max="15" value="5" step="1">
                <span id="duration-value">5s</span>
            </div>
            <div class="control-group">
                <label>Rotation Speed</label>
                <input type="range" id="rotation-slider" min="0.1" max="2" value="0.5" step="0.1">
                <span id="rotation-value">0.5°/frame</span>
            </div>
            <div class="control-group">
                <label>Quality</label>
                <select id="quality-select">
                    <option value="low">Low (2 Mbps)</option>
                    <option value="medium" selected>Medium (5 Mbps)</option>
                    <option value="high">High (8 Mbps)</option>
                </select>
            </div>
            <button id="render-btn" class="render-button">
                <span class="render-icon"></span>
                Start Recording
            </button>
        </div>
    </div>
`;

// Add styles for the render panel
const renderStyles = document.createElement('style');
renderStyles.textContent = `
    .render-panel {
        position: fixed;
        bottom: 20px;
        left: 20px;
        width: 300px;
        background: white;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        overflow: hidden;
        transition: transform 0.3s ease;
    }
    
    .render-panel.minimized {
        transform: translateY(calc(100% - 40px));
    }
    
    .render-panel-header {
        background: #2c3e50;
        color: white;
        padding: 12px 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: move;
    }
    
    .render-panel-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
    }
    
    .minimize-btn {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0 5px;
        line-height: 1;
    }
    
    .render-panel-content {
        padding: 15px;
    }
    
    .control-group {
        margin-bottom: 15px;
    }
    
    .control-group label {
        display: block;
        margin-bottom: 5px;
        color: #666;
        font-size: 14px;
    }
    
    .control-group input[type="range"] {
        width: 100%;
        margin: 5px 0;
    }
    
    .control-group span {
        display: block;
        text-align: right;
        color: #666;
        font-size: 12px;
    }
    
    .control-group select {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
    }
    
    .render-button {
        width: 100%;
        background: #e74c3c;
        color: white;
        border: none;
        padding: 12px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 14px;
        transition: all 0.3s ease;
    }
    
    .render-button:hover {
        background: #c0392b;
    }
    
    .render-button.recording {
        background: #c0392b;
        animation: pulse 1.5s infinite;
    }
    
    .render-icon {
        width: 12px;
        height: 12px;
        background: white;
        border-radius: 50%;
    }
    
    .render-button.recording .render-icon {
        background: #e74c3c;
        border-radius: 2px;
    }
    
    .recording-status {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        font-size: 14px;
        z-index: 1001;
        pointer-events: none;
        user-select: none;
    }
`;

document.head.appendChild(renderStyles);
document.body.appendChild(renderPanel);

// Update the panel dragging code
renderPanel.querySelector('.render-panel-header').addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('minimize-btn')) return;
    
    isDraggingPanel = true;
    const rect = renderPanel.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
});

window.addEventListener('mousemove', (e) => {
    if (!isDraggingPanel) return;
    
    const x = e.clientX - dragOffset.x;
    const y = e.clientY - dragOffset.y;
    
    renderPanel.style.left = `${x}px`;
    renderPanel.style.bottom = 'auto';
    renderPanel.style.top = `${y}px`;
});

window.addEventListener('mouseup', () => {
    isDraggingPanel = false;
});

// Minimize/maximize functionality
const minimizeBtn = renderPanel.querySelector('.minimize-btn');
minimizeBtn.addEventListener('click', () => {
    renderPanel.classList.toggle('minimized');
    minimizeBtn.textContent = renderPanel.classList.contains('minimized') ? '+' : '−';
});

// Remove the duplicate variable declarations and keep only the event listeners
const durationSlider = document.getElementById('duration-slider');
const durationValue = document.getElementById('duration-value');
const rotationSpeedSlider = document.getElementById('rotation-slider'); // Renamed to avoid conflict
const rotationValue = document.getElementById('rotation-value');
const qualitySelect = document.getElementById('quality-select');
const renderBtn = document.getElementById('render-btn');

durationSlider.addEventListener('input', () => {
    RECORDING_DURATION = durationSlider.value * 1000;
    durationValue.textContent = `${durationSlider.value}s`;
});

rotationSpeedSlider.addEventListener('input', () => {
    ROTATION_SPEED = parseFloat(rotationSpeedSlider.value);
    rotationValue.textContent = `${rotationSpeedSlider.value}°/frame`;
});

qualitySelect.addEventListener('change', () => {
    switch (qualitySelect.value) {
        case 'low':
            VIDEO_BITRATE = 2000000;
            break;
        case 'medium':
            VIDEO_BITRATE = 5000000;
            break;
        case 'high':
            VIDEO_BITRATE = 8000000;
            break;
    }
});

// Update the startRecording function
function startRecording() {
    if (isRecording) return;
    
    recordedChunks = [];
    isRecording = true;
    recordingStartTime = Date.now();
    
    renderBtn.classList.add('recording');
    renderBtn.textContent = 'Recording...';
    recordingStatus.style.display = 'block';
    recordingStatus.textContent = 'Recording...';
    
    const stream = renderer.domElement.captureStream(30);
    
    mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: VIDEO_BITRATE
    });
    
    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };
    
    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tshirt-render.webm';
        a.click();
        
        URL.revokeObjectURL(url);
        isRecording = false;
        renderBtn.classList.remove('recording');
        renderBtn.innerHTML = '<span class="render-icon"></span>Start Recording';
        recordingStatus.style.display = 'none';
        
        // Reset model rotation
        if (tshirtModel) {
            tshirtModel.rotation.y = 0;
        }
        
        camera.position.set(0, 0, 5);
        camera.lookAt(0, 0, 0);
        controls.reset();
    };
    
    mediaRecorder.start();
    animateRecording();
}

function animateRecording() {
    if (!isRecording) return;
    
    const elapsed = Date.now() - recordingStartTime;
    const remaining = Math.ceil((RECORDING_DURATION - elapsed) / 1000);
    
    // Update recording status
    recordingStatus.textContent = `Recording... ${remaining}s remaining`;
    
    // Check if recording should stop
    if (elapsed >= RECORDING_DURATION) {
        mediaRecorder.stop();
        return;
    }
    
    // Rotate the model
    if (tshirtModel) {
        tshirtModel.rotation.y += ROTATION_SPEED * (Math.PI / 180);
    }
    
    requestAnimationFrame(animateRecording);
}

// Update the click handler
renderBtn.addEventListener('click', () => {
    if (!isRecording) {
        startRecording();
    }
});

// Modify the animate function to not rotate during recording
function animate() {
    requestAnimationFrame(animate);
    
    // Only update controls if not recording
    if (!isRecording) {
        controls.update();
    }
    
    renderer.render(scene, camera);
}

animate(); 