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

// Add styles for the image list and color picker
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
        
        uvCtx.translate(uvCanvas.width / 2, uvCanvas.height / 2);
        uvCtx.rotate(transform.rotation * Math.PI / 180);
        uvCtx.scale(scale, scale);
        uvCtx.translate(transform.x * (uvCanvas.width / scale), transform.y * (uvCanvas.height / scale));
        
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
        
        textureCtx.translate(textureCanvas.width / 2, textureCanvas.height / 2);
        textureCtx.rotate(transform.rotation * Math.PI / 180);
        textureCtx.scale(scale, scale);
        textureCtx.translate(transform.x * (textureCanvas.width / scale), transform.y * (textureCanvas.height / scale));
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
                roughness: 0.5,
                metalness: 0.1,
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
                    roughness: 0.5,
                    metalness: 0.1,
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

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

animate(); 