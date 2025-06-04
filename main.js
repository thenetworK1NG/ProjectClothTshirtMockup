import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 3);

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

// Add styles for the image list
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
        stretchWidthSlider.value = transform.stretchWidth || 1;
        stretchHeightSlider.value = transform.stretchHeight || 1;
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
    } else {
        // Reset sliders when no image is selected
        posXSlider.value = 0;
        posYSlider.value = 0;
        scaleSlider.value = 1;
        rotationSlider.value = 0;
    }
    
    updateTexture();
    drawUVEditor();
}

// UV Editor controls
const duplicateBtn = document.getElementById('duplicate-btn');

// Get all the sliders
const posXSlider = document.getElementById('pos-x');
const posYSlider = document.getElementById('pos-y');
const scaleSlider = document.getElementById('scale');
const rotationSlider = document.getElementById('rotation');
const stretchWidthSlider = document.getElementById('stretch-width');
const stretchHeightSlider = document.getElementById('stretch-height');

// Initialize all slider controls
[posXSlider, posYSlider, scaleSlider, rotationSlider, stretchWidthSlider, stretchHeightSlider].forEach(slider => {
    slider.addEventListener('input', () => {
        if (selectedImageIndex >= 0 && images[selectedImageIndex]) {
            const image = images[selectedImageIndex];
            switch(slider.id) {
                case 'pos-x':
                    image.transform.x = parseFloat(slider.value);
                    break;
                case 'pos-y':
                    image.transform.y = parseFloat(slider.value);
                    break;
                case 'scale':
                    image.transform.scale = parseFloat(slider.value);
                    break;
                case 'rotation':
                    image.transform.rotation = parseFloat(slider.value);
                    break;
                case 'stretch-width':
                    image.transform.stretchWidth = parseFloat(slider.value);
                    break;
                case 'stretch-height':
                    image.transform.stretchHeight = parseFloat(slider.value);
                    break;
            }
            updateTexture();
            drawUVEditor();
        }
    });
});

// Duplicate button functionality
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

// UV Editor mouse interaction
let isDragging = false;
let lastMousePos = { x: 0, y: 0 };
let dragStartTransform = null;
let dragStartMousePos = { x: 0, y: 0 };

uvCanvas.addEventListener('mousedown', (e) => {
    if (!images.length || selectedImageIndex < 0) return;
    
    const rect = uvCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    isDragging = true;
    lastMousePos = { x: mouseX, y: mouseY };
    dragStartMousePos = { x: mouseX, y: mouseY };
    dragStartTransform = { ...images[selectedImageIndex].transform };
});

window.addEventListener('mousemove', (e) => {
    if (!isDragging || !images.length || selectedImageIndex < 0) return;
    
    const rect = uvCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate the movement in canvas coordinates
    const dx = mouseX - lastMousePos.x;
    const dy = mouseY - lastMousePos.y;
    
    // Convert canvas movement to UV space movement
    const uvDx = dx / uvCanvas.width;
    const uvDy = dy / uvCanvas.height;
    
    // Update position with smooth movement
    images[selectedImageIndex].transform.x = dragStartTransform.x + (mouseX - dragStartMousePos.x) / uvCanvas.width;
    images[selectedImageIndex].transform.y = dragStartTransform.y + (mouseY - dragStartMousePos.y) / uvCanvas.height;
    
    // Update sliders to reflect the changes
    posXSlider.value = images[selectedImageIndex].transform.x;
    posYSlider.value = images[selectedImageIndex].transform.y;
    
    lastMousePos = { x: mouseX, y: mouseY };
    updateTexture();
    drawUVEditor();
});

window.addEventListener('mouseup', () => {
    isDragging = false;
    dragStartTransform = null;
    dragStartMousePos = { x: 0, y: 0 };
});

// Add mouseleave handler to stop dragging if mouse leaves the window
window.addEventListener('mouseleave', () => {
    isDragging = false;
    dragStartTransform = null;
    dragStartMousePos = { x: 0, y: 0 };
});

function resizeUVCanvas() {
    const container = uvCanvas.parentElement;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calculate dimensions maintaining the UV aspect ratio
    let width, height;
    if (containerWidth / containerHeight > uvAspectRatio) {
        height = containerHeight * 0.9; // Use 90% of container height
        width = height * uvAspectRatio;
    } else {
        width = containerWidth * 0.9; // Use 90% of container width
        height = width / uvAspectRatio;
    }
    
    // Ensure minimum size
    const minSize = 200;
    if (width < minSize) {
        width = minSize;
        height = width / uvAspectRatio;
    }
    if (height < minSize) {
        height = minSize;
        width = height * uvAspectRatio;
    }
    
    uvCanvas.width = width;
    uvCanvas.height = height;
    
    // Center the canvas in the container
    uvCanvas.style.position = 'absolute';
    uvCanvas.style.left = '50%';
    uvCanvas.style.top = '50%';
    uvCanvas.style.transform = 'translate(-50%, -50%)';
    
    // Update the overlay to match canvas size
    uvOverlay.style.width = width + 'px';
    uvOverlay.style.height = height + 'px';
    uvOverlay.style.left = '50%';
    uvOverlay.style.top = '50%';
    uvOverlay.style.transform = 'translate(-50%, -50%)';
    
    // Redraw the UV editor
    drawUVEditor();
}

function drawUVEditor() {
    if (!templateImage) return;
    
    // Clear the canvas
    uvCtx.clearRect(0, 0, uvCanvas.width, uvCanvas.height);
    
    // Draw template with proper centering
    const scale = Math.min(
        uvCanvas.width / templateImage.width,
        uvCanvas.height / templateImage.height
    );
    
    const scaledWidth = templateImage.width * scale;
    const scaledHeight = templateImage.height * scale;
    
    const x = (uvCanvas.width - scaledWidth) / 2;
    const y = (uvCanvas.height - scaledHeight) / 2;
    
    uvCtx.drawImage(templateImage, x, y, scaledWidth, scaledHeight);
    
    // Draw all images with proper scaling and stretching
    images.forEach((imgData, index) => {
        const { image, transform } = imgData;
        uvCtx.save();
        
        // Calculate the scale to fit the image within the UV space
        const imageAspect = image.width / image.height;
        const baseScale = Math.min(
            scaledWidth / image.width,
            scaledHeight / image.height
        ) * transform.scale;
        
        // Apply stretch factors
        const finalWidth = image.width * (transform.stretchWidth || 1);
        const finalHeight = image.height * (transform.stretchHeight || 1);
        
        // Calculate the center position in canvas coordinates
        const centerX = x + (transform.x + 0.5) * scaledWidth;
        const centerY = y + (transform.y + 0.5) * scaledHeight;
        
        // Apply transformations in the correct order
        uvCtx.translate(centerX, centerY);
        uvCtx.rotate(transform.rotation * Math.PI / 180);
        uvCtx.scale(baseScale * (transform.stretchWidth || 1), baseScale * (transform.stretchHeight || 1));
        
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

// Update the updateTexture function to properly handle layer visibility
function updateTexture() {
    if (!tshirtModel) return;
    
    // Create two separate canvases - one for shirt color and one for images
    const shirtCanvas = document.createElement('canvas');
    shirtCanvas.width = templateImage.width;
    shirtCanvas.height = templateImage.height;
    const shirtCtx = shirtCanvas.getContext('2d');
    
    const imageCanvas = document.createElement('canvas');
    imageCanvas.width = templateImage.width;
    imageCanvas.height = templateImage.height;
    const imageCtx = imageCanvas.getContext('2d');
    
    // Fill shirt canvas with shirt color
    shirtCtx.fillStyle = currentShirtColor;
    shirtCtx.fillRect(0, 0, shirtCanvas.width, shirtCanvas.height);
    
    // Clear image canvas with transparent background
    imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
    
    // Draw visible images in order
    images.forEach(({ image, transform }, index) => {
        // Check if layer is visible (default to true if not set)
        if (layerVisibility.get(index) !== false) {
            imageCtx.save();
            
            // Calculate the scale to fit the image within the UV space
            const imageAspect = image.width / image.height;
            const baseScale = Math.min(
                imageCanvas.width / image.width,
                imageCanvas.height / image.height
            ) * transform.scale;
            
            // Calculate the center position in canvas coordinates
            const centerX = (transform.x + 0.5) * imageCanvas.width;
            const centerY = (transform.y + 0.5) * imageCanvas.height;
            
            // Apply transformations in the correct order
            imageCtx.translate(centerX, centerY);
            imageCtx.rotate(transform.rotation * Math.PI / 180);
            
            // Apply stretch factors
            const stretchWidth = transform.stretchWidth || 1;
            const stretchHeight = transform.stretchHeight || 1;
            imageCtx.scale(baseScale * stretchWidth, baseScale * stretchHeight);
            
            // Draw the image
            imageCtx.drawImage(image, 
                -image.width / 2, 
                -image.height / 2, 
                image.width, 
                image.height
            );
            
            imageCtx.restore();
        }
    });
    
    // Create textures
    const shirtTexture = new THREE.CanvasTexture(shirtCanvas);
    shirtTexture.flipY = true;
    shirtTexture.encoding = THREE.sRGBEncoding;
    shirtTexture.needsUpdate = true;
    
    const imageTexture = new THREE.CanvasTexture(imageCanvas);
    imageTexture.flipY = true;
    imageTexture.encoding = THREE.sRGBEncoding;
    imageTexture.needsUpdate = true;
    
    // Apply to model
    tshirtModel.traverse((child) => {
        if (child.isMesh) {
            // Dispose of old materials and textures
            if (child.material) {
                if (child.material.map) {
                    child.material.map.dispose();
                }
                if (child.material.emissiveMap) {
                    child.material.emissiveMap.dispose();
                }
                child.material.dispose();
            }
            
            let material;
            
            if (currentLightingMode === 'standard') {
                // Create a combined texture for standard mode
                const combinedCanvas = document.createElement('canvas');
                combinedCanvas.width = templateImage.width;
                combinedCanvas.height = templateImage.height;
                const combinedCtx = combinedCanvas.getContext('2d');
                
                // Draw shirt color first
                combinedCtx.fillStyle = currentShirtColor;
                combinedCtx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);
                
                // Draw images on top
                combinedCtx.drawImage(imageCanvas, 0, 0);
                
                const combinedTexture = new THREE.CanvasTexture(combinedCanvas);
                combinedTexture.flipY = true;
                combinedTexture.encoding = THREE.sRGBEncoding;
                combinedTexture.needsUpdate = true;
                
                // Use standard material with the combined texture
                material = new THREE.MeshStandardMaterial({
                    map: combinedTexture,
                    roughness: 0.9,
                    metalness: 0.0,
                    side: THREE.DoubleSide,
                    transparent: true,
                    alphaTest: 0.1
                });
            } else {
                // Use custom shader material for unlit images
                material = new THREE.ShaderMaterial({
                    uniforms: {
                        shirtTexture: { value: shirtTexture },
                        imageTexture: { value: imageTexture },
                        shirtColor: { value: new THREE.Color(currentShirtColor) }
                    },
                    vertexShader: `
                        varying vec2 vUv;
                        varying vec3 vNormal;
                        varying vec3 vViewPosition;
                        
                        void main() {
                            vUv = uv;
                            vNormal = normalize(normalMatrix * normal);
                            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                            vViewPosition = -mvPosition.xyz;
                            gl_Position = projectionMatrix * mvPosition;
                        }
                    `,
                    fragmentShader: `
                        uniform sampler2D shirtTexture;
                        uniform sampler2D imageTexture;
                        uniform vec3 shirtColor;
                        
                        varying vec2 vUv;
                        varying vec3 vNormal;
                        varying vec3 vViewPosition;
                        
                        void main() {
                            // Get the shirt color with lighting
                            vec4 shirtColor = texture2D(shirtTexture, vUv);
                            
                            // Get the image color (unaffected by lighting)
                            vec4 imageColor = texture2D(imageTexture, vUv);
                            
                            // Calculate lighting for the shirt
                            vec3 normal = normalize(vNormal);
                            vec3 viewDir = normalize(vViewPosition);
                            float diffuse = max(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0);
                            vec3 litShirtColor = shirtColor.rgb * (diffuse * 0.7 + 0.3); // Add some ambient light
                            
                            // Mix the lit shirt color with the unlit image color based on image alpha
                            vec3 finalColor = mix(litShirtColor, imageColor.rgb, imageColor.a);
                            
                            gl_FragColor = vec4(finalColor, 1.0);
                        }
                    `,
                    side: THREE.DoubleSide,
                    transparent: true
                });
            }
            
            child.material = material;
            child.material.needsUpdate = true;
        }
    });
}

// Update lighting setup
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Front light - update initial intensity to 2.0
const frontLight = new THREE.DirectionalLight(0xffffff, 2.0);
frontLight.position.set(5, 5, 5);
frontLight.name = 'frontLight';
scene.add(frontLight);

// Back light - update initial intensity to 2.0
const backLight = new THREE.DirectionalLight(0xffffff, 2.0);
backLight.position.set(-5, 3, -5);
backLight.name = 'backLight';
scene.add(backLight);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = true;
controls.minDistance = 1;
controls.maxDistance = 8;
controls.maxPolarAngle = Math.PI / 2;
controls.rotateSpeed = 0.5;
controls.panSpeed = 0.5;
controls.zoomSpeed = 0.8;
controls.enableZoom = true; // Enable mouse wheel zooming

// Update keyboard movement speed for better control
const KEYBOARD_MOVE_SPEED = 0.1; // Reduced from 0.2 for smoother movement

// Update keyboard control variables
const keys = {
    'w': false,
    'a': false,
    's': false,
    'd': false,
    '+': false,
    '-': false,
    'e': false,
    'q': false
};

// Add zoom control variables
const ZOOM_SPEED = 0.05;
const ZOOM_SMOOTHING = 0.1;
let targetZoom = 3; // Default camera distance
let currentZoom = 3;

// Add rotation speed constant
const MODEL_ROTATION_SPEED = 0.05; // radians per frame

// Update the keyboard event listeners
window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key.toLowerCase())) {
        keys[e.key.toLowerCase()] = true;
    }
    // Handle plus and minus keys
    if (e.key === '+' || e.key === '=') {
        targetZoom = Math.max(1, targetZoom - ZOOM_SPEED);
    } else if (e.key === '-' || e.key === '_') {
        targetZoom = Math.min(8, targetZoom + ZOOM_SPEED);
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key.toLowerCase())) {
        keys[e.key.toLowerCase()] = false;
    }
});

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
        
        // Position the model at the center
        tshirtModel.position.set(0, 0, 0);
        
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
        
        // Update controls target to model center
        controls.target.set(0, 0, 0);
        controls.update();
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

// Add to global variables at the top with other variables
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let recordingStartTime = 0;
let RECORDING_DURATION = 5000; // 5 seconds
let ROTATION_SPEED = 0.5; // degrees per frame
let VIDEO_BITRATE = 5000000; // 5 Mbps
let isManualDuration = false; // Add this line for manual recording duration
let isPreviewRotating = false; // Add this for preview rotation

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
        <div class="view-options">
            <button class="view-options-btn">⋮</button>
            <div class="view-options-menu">
                <button id="toggle-fullscreen" class="view-option">
                    <span class="option-icon">⛶</span>
                    Toggle Fullscreen
                </button>
            </div>
        </div>
        <button class="minimize-btn">−</button>
    </div>
    <div class="render-panel-content">
        <div class="render-controls">
            <div class="control-group">
                <label>Preview Rotation</label>
                <div class="preview-rotation-controls">
                    <button id="preview-rotation" class="preview-btn">
                        <span class="preview-icon">🔄</span>
                        Start Preview
                    </button>
                    <div class="preview-speed-control">
                        <label>Preview Speed</label>
                        <input type="range" id="preview-speed-slider" min="0.1" max="2" value="0.5" step="0.1">
                        <div class="value-display">
                            <span>0.1°/frame</span>
                            <span id="preview-speed-value">0.5°/frame</span>
                            <span>2°/frame</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="control-group">
                <label>Camera Movement</label>
                <div class="camera-controls">
                    <button id="record-camera" class="camera-btn">
                        <span class="camera-icon">🎥</span>
                        Record Camera Path
                    </button>
                    <button id="replay-camera" class="camera-btn" disabled>
                        <span class="camera-icon">▶️</span>
                        Replay Camera Path
                    </button>
                    <button id="clear-camera" class="camera-btn" disabled>
                        <span class="camera-icon">🗑️</span>
                        Clear Path
                    </button>
                    <div class="camera-status" id="camera-status"></div>
                </div>
            </div>
            <div class="control-group">
                <label>Screenshot</label>
                <div class="screenshot-controls">
                    <button id="take-screenshot" class="screenshot-btn">
                        <span class="screenshot-icon">📸</span>
                        Take Screenshot
                    </button>
                </div>
            </div>
            <div class="control-group">
                <label>Recording Duration</label>
                <div class="duration-controls">
                    <div class="duration-mode">
                        <label>
                            <input type="radio" name="duration-mode" value="auto" checked>
                            Auto Duration
                        </label>
                        <label>
                            <input type="radio" name="duration-mode" value="manual">
                            Manual Stop
                        </label>
                    </div>
                    <div class="auto-duration-controls">
                        <input type="range" id="duration-slider" min="3" max="30" value="5" step="1">
                        <div class="value-display">
                            <span>3s</span>
                <span id="duration-value">5s</span>
                            <span>30s</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="control-group">
                <label>Rotation Settings</label>
                <div class="rotation-toggle">
                    <input type="checkbox" id="enable-rotation" checked>
                    <label for="enable-rotation">Enable Rotation</label>
                </div>
                <div class="rotation-speed-control">
                <label>Rotation Speed</label>
                <input type="range" id="rotation-slider" min="0.1" max="2" value="0.5" step="0.1">
                    <div class="value-display">
                        <span>0.1°/frame</span>
                <span id="rotation-value">0.5°/frame</span>
                        <span>2°/frame</span>
                    </div>
                </div>
            </div>
            <div class="control-group">
                <label>Video Quality</label>
                <select id="quality-select">
                    <option value="low">Low (2 Mbps) - Faster Export</option>
                    <option value="medium" selected>Medium (5 Mbps) - Balanced</option>
                    <option value="high">High (8 Mbps) - Best Quality</option>
                </select>
            </div>
            <button id="render-btn" class="render-button">
                <span class="render-icon"></span>
                Start Recording
            </button>
        </div>
    </div>
`;

// Create the scene panel
const scenePanel = document.createElement('div');
scenePanel.className = 'render-panel scene-panel';
scenePanel.innerHTML = `
    <div class="render-panel-header">
        <h3>Scene</h3>
        <button class="minimize-btn">−</button>
    </div>
    <div class="render-panel-content">
        <div class="render-controls">
            <div class="control-group lighting-control">
                <label>Lighting</label>
                <div class="light-controls">
                    <div class="light-group">
                        <h4>Lighting Mode</h4>
                        <div class="lighting-mode-toggle">
                            <label>
                                <input type="radio" name="lighting-mode" value="standard" checked>
                                Standard (Images Affected by Light)
                            </label>
                            <label>
                                <input type="radio" name="lighting-mode" value="custom">
                                Custom (Images Unaffected by Light)
                            </label>
                        </div>
                    </div>
                    <div class="light-group">
                        <h4>Front Light</h4>
                        <div class="light-input">
                            <label>Intensity</label>
                            <input type="range" id="front-light-intensity" min="0" max="4" value="2.0" step="0.1">
                            <span id="front-light-value">2.0</span>
                        </div>
                        <div class="light-input">
                            <label>Color</label>
                            <input type="color" id="front-light-color" value="#ffffff">
                        </div>
                    </div>
                    <div class="light-group">
                        <h4>Back Light</h4>
                        <div class="light-input">
                            <label>Intensity</label>
                            <input type="range" id="back-light-intensity" min="0" max="4" value="2.0" step="0.1">
                            <span id="back-light-value">2.0</span>
                        </div>
                        <div class="light-input">
                            <label>Color</label>
                            <input type="color" id="back-light-color" value="#ffffff">
                        </div>
                    </div>
                    <div class="light-group">
                        <h4>Ambient Light</h4>
                        <div class="light-input">
                            <label>Intensity</label>
                            <input type="range" id="ambient-light-intensity" min="0" max="1" value="0.5" step="0.1">
                            <span id="ambient-light-value">0.5</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="control-group background-control">
                <label>Background Image</label>
                <div class="background-drop-zone" id="background-drop-zone">
                    <div class="drop-zone-content">
                        <span class="drop-icon">📁</span>
                        <div>
                            <div class="drop-text">Drop your image here</div>
                            <div class="drop-subtext">or click to browse files</div>
                        </div>
                    </div>
                    <input type="file" id="background-input" accept="image/*" style="display: none;">
                </div>
                <div class="background-preview" id="background-preview" style="display: none;">
                    <img id="preview-image" src="" alt="Background preview">
                    <button class="remove-background" id="remove-background" title="Remove background">×</button>
                </div>
                <button id="clear-background" class="clear-background-btn" disabled>Remove Background</button>
            </div>
            <div class="control-group">
                <label>Background Size</label>
                <div class="size-controls">
                    <div class="size-input">
                        <label>Width</label>
                        <input type="number" id="bg-width" min="1" max="100" value="20" step="1">
                    </div>
                    <div class="size-input">
                        <label>Height</label>
                        <input type="number" id="bg-height" min="1" max="100" value="20" step="1">
                    </div>
                </div>
            </div>
            <div class="control-group">
                <label>Background Position</label>
                <div class="position-controls">
                    <div class="position-input">
                        <label>X</label>
                        <input type="range" id="bg-pos-x" min="-10" max="10" value="0" step="0.1">
                        <span id="bg-pos-x-value">0</span>
                    </div>
                    <div class="position-input">
                        <label>Y</label>
                        <input type="range" id="bg-pos-y" min="-10" max="10" value="0" step="0.1">
                        <span id="bg-pos-y-value">0</span>
                    </div>
                    <div class="position-input">
                        <label>Z</label>
                        <input type="range" id="bg-pos-z" min="-20" max="0" value="-5" step="0.1">
                        <span id="bg-pos-z-value">-5</span>
                    </div>
                </div>
            </div>
            <div class="control-group">
                <label>Background Rotation</label>
                <div class="rotation-controls">
                    <div class="rotation-input">
                        <label>X</label>
                        <input type="range" id="bg-rot-x" min="-180" max="180" value="0" step="1">
                        <span id="bg-rot-x-value">0°</span>
                    </div>
                    <div class="rotation-input">
                        <label>Y</label>
                        <input type="range" id="bg-rot-y" min="-180" max="180" value="0" step="1">
                        <span id="bg-rot-y-value">0°</span>
                    </div>
                    <div class="rotation-input">
                        <label>Z</label>
                        <input type="range" id="bg-rot-z" min="-180" max="180" value="0" step="1">
                        <span id="bg-rot-z-value">0°</span>
                    </div>
                </div>
            </div>
            <div class="control-group">
                <label>Background Brightness</label>
                <input type="range" id="brightness-slider" min="0" max="200" value="100" step="1">
                <span id="brightness-value">100%</span>
            </div>
        </div>
    </div>
`;

// Create the shirt panel
const shirtPanel = document.createElement('div');
shirtPanel.className = 'render-panel shirt-panel';
shirtPanel.innerHTML = `
    <div class="render-panel-header">
        <h3>Shirt</h3>
        <button class="minimize-btn">−</button>
    </div>
    <div class="render-panel-content">
        <div class="render-controls">
            <div class="control-group">
                <label>Shirt Color</label>
                <div class="color-picker-wrapper">
                    <input type="color" id="shirt-color" value="#ffffff">
                    <div class="color-presets">
                        <button class="color-preset" style="background: #ffffff" data-color="#ffffff"></button>
                        <button class="color-preset" style="background: #000000" data-color="#000000"></button>
                        <button class="color-preset" style="background: #ff0000" data-color="#ff0000"></button>
                        <button class="color-preset" style="background: #0000ff" data-color="#0000ff"></button>
                        <button class="color-preset" style="background: #00ff00" data-color="#00ff00"></button>
                        <button class="color-preset" style="background: #ffff00" data-color="#ffff00"></button>
                        <button class="color-preset" style="background: #ff00ff" data-color="#ff00ff"></button>
                        <button class="color-preset" style="background: #808080" data-color="#808080"></button>
                    </div>
                </div>
            </div>
            <div class="control-group">
                <label>Templates</label>
                <div class="template-grid">
                    ${Array.from({length: 32}, (_, i) => `
                        <div class="template-item" data-template="${i + 1}.png">
                            <img src="templates/${i + 1}.png" alt="Template ${i + 1}">
                            <div class="template-preview"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    </div>
`;

// Add styles for the template grid and preview
const renderStyles = document.createElement('style');
renderStyles.textContent = `
    .render-panel, .scene-panel, .camera-info-panel {
        position: fixed;
        background: white;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        overflow: hidden;
        transition: transform 0.3s ease;
        display: flex;
        flex-direction: column;
    }

    .render-panel {
        bottom: 20px;
        left: 20px;
        width: 300px;
        max-height: 80vh;
    }

    .scene-panel {
        bottom: 20px;
        left: 340px;
        width: 300px;
        max-height: 80vh;
    }

    .camera-info-panel {
        bottom: 20px;
        right: 20px;
        width: 200px;
    }
    
    .render-panel.minimized,
    .scene-panel.minimized,
    .camera-info-panel.minimized {
        transform: translateY(calc(100% - 40px));
    }
    
    .render-panel-header,
    .scene-panel .render-panel-header,
    .camera-info-header {
        background: #2c3e50;
        color: white;
        padding: 12px 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: move;
        flex-shrink: 0;
        user-select: none;
    }
    
    .render-panel-header h3,
    .scene-panel .render-panel-header h3,
    .camera-info-header span {
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
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s ease;
    }

    .minimize-btn:hover {
        background-color: rgba(255, 255, 255, 0.1);
    }
    
    .render-panel-content,
    .scene-panel .render-panel-content,
    .camera-info-content {
        padding: 15px;
        overflow-y: auto;
        flex-grow: 1;
    }

    .lighting-control {
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid #eee;
    }
    
    .light-controls {
        display: flex;
        flex-direction: column;
        gap: 15px;
    }
    
    .light-group {
        background: #f8f8f8;
        padding: 10px;
        border-radius: 6px;
    }
    
    .light-group h4 {
        margin: 0 0 10px 0;
        font-size: 14px;
        color: #333;
    }
    
    .light-input {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
    }
    
    .light-input:last-child {
        margin-bottom: 0;
    }
    
    .light-input label {
        min-width: 60px;
        margin: 0;
        font-size: 13px;
    }
    
    .light-input input[type="range"] {
        flex: 1;
        margin: 0;
    }
    
    .light-input input[type="color"] {
        width: 40px;
        height: 24px;
        padding: 0;
        border: 1px solid #ddd;
        border-radius: 4px;
    }
    
    .light-input span {
        min-width: 40px;
        text-align: right;
        font-size: 12px;
    }

    .background-drop-zone {
        border: 2px dashed #3498db;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
        background: #f8f9fa;
        transition: all 0.3s ease;
        cursor: pointer;
        margin: 10px 0;
    }

    .background-drop-zone:hover {
        background: #e9ecef;
        border-color: #2980b9;
    }

    .background-drop-zone.dragover {
        background: #e3f2fd;
        border-color: #2196f3;
        border-style: solid;
        transform: scale(1.02);
    }

    .drop-zone-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
    }

    .drop-icon {
        font-size: 32px;
        color: #3498db;
        background: #e3f2fd;
        width: 64px;
        height: 64px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
    }

    .background-drop-zone:hover .drop-icon {
        transform: scale(1.1);
        background: #bbdefb;
    }

    .drop-text {
        color: #2c3e50;
        font-size: 14px;
        font-weight: 500;
    }

    .drop-subtext {
        color: #7f8c8d;
        font-size: 12px;
        margin-top: 4px;
    }

    .background-preview {
        position: relative;
        margin: 10px 0;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .background-preview img {
        width: 100%;
        height: auto;
        display: block;
        border-radius: 8px;
    }

    .remove-background {
        position: absolute;
        top: 8px;
        right: 8px;
        background: rgba(231, 76, 60, 0.9);
        color: white;
        border: none;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        transition: all 0.2s ease;
    }

    .remove-background:hover {
        background: #c0392b;
        transform: scale(1.1);
    }

    .clear-background-btn {
        width: 100%;
        padding: 10px;
        background: #e74c3c;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.3s ease;
        margin-top: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }

    .clear-background-btn:hover:not(:disabled) {
        background: #c0392b;
    }

    .clear-background-btn:disabled {
        background: #bdc3c7;
        cursor: not-allowed;
        opacity: 0.7;
    }

    .clear-background-btn::before {
        content: "🗑️";
        font-size: 16px;
    }

    .render-controls {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }
    
    .control-group {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 15px;
        border: 1px solid #e9ecef;
    }
    
    .control-group label {
        display: block;
        color: #2c3e50;
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 12px;
    }
    
    .control-group input[type="range"] {
        width: 100%;
        height: 6px;
        background: #e9ecef;
        border-radius: 3px;
        outline: none;
        -webkit-appearance: none;
        margin: 10px 0;
    }
    
    .control-group input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        background: #3498db;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .control-group input[type="range"]::-webkit-slider-thumb:hover {
        background: #2980b9;
        transform: scale(1.1);
    }
    
    .control-group select {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        background: white;
        color: #2c3e50;
        font-size: 14px;
        cursor: pointer;
        outline: none;
        transition: all 0.2s ease;
    }

    .control-group select:hover {
        border-color: #3498db;
    }

    .control-group select:focus {
        border-color: #3498db;
        box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
    }

    .value-display {
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #7f8c8d;
        font-size: 13px;
        margin-top: 4px;
    }
    
    .render-button {
        width: 100%;
        padding: 12px;
        background: #2ecc71;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.3s ease;
        margin-top: 10px;
    }
    
    .render-button:hover {
        background: #27ae60;
        transform: translateY(-1px);
    }
    
    .render-button.recording {
        background: #e74c3c;
        animation: pulse 1.5s infinite;
    }

    .render-button.recording:hover {
        background: #c0392b;
    }
    
    .render-icon {
        width: 16px;
        height: 16px;
        background: white;
        border-radius: 50%;
        position: relative;
    }
    
    .render-button.recording .render-icon {
        background: #e74c3c;
        border-radius: 2px;
    }
    
    .shirt-panel {
        bottom: 20px;
        left: 660px; /* Positioned next to the scene panel */
        width: 300px;
        max-height: 80vh;
    }

    .color-picker-wrapper {
        display: flex;
        flex-direction: column;
        gap: 15px;
        padding: 10px 0;
    }

    #shirt-color {
        width: 100%;
        height: 40px;
        padding: 0;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    #shirt-color:hover {
        border-color: #3498db;
    }

    #shirt-color::-webkit-color-swatch-wrapper {
        padding: 0;
    }

    #shirt-color::-webkit-color-swatch {
        border: none;
        border-radius: 6px;
    }
    
    .color-presets {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        padding: 5px 0;
    }
    
    .color-preset {
        width: 100%;
        aspect-ratio: 1;
        border: 2px solid #e9ecef;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        padding: 0;
    }

    .color-preset:hover {
        transform: scale(1.1);
        border-color: #3498db;
    }

    .color-preset.active {
        border-color: #3498db;
        box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
    }

    .rotation-toggle {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 15px;
        padding: 8px;
        background: #f8f9fa;
        border-radius: 6px;
    }

    .rotation-toggle input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
    }

    .rotation-toggle label {
        margin: 0;
        cursor: pointer;
        user-select: none;
    }

    .rotation-speed-control {
        opacity: 1;
        transition: opacity 0.3s ease;
    }

    .rotation-speed-control.disabled {
        opacity: 0.5;
        pointer-events: none;
    }

    .camera-controls {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 10px;
    }

    .camera-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.3s ease;
        background: #3498db;
        color: white;
    }

    .camera-btn:hover:not(:disabled) {
        background: #2980b9;
        transform: translateY(-1px);
    }

    .camera-btn:disabled {
        background: #bdc3c7;
        cursor: not-allowed;
        opacity: 0.7;
    }

    .camera-btn.recording {
        background: #e74c3c;
        animation: pulse 1.5s infinite;
    }
    
    .camera-btn.replaying {
        background: #2ecc71;
    }

    .camera-icon {
        font-size: 16px;
    }

    .camera-status {
        text-align: center;
        font-size: 13px;
        color: #666;
        margin-top: 5px;
        min-height: 20px;
    }

    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }

    .screenshot-controls {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 10px;
    }

    .screenshot-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.3s ease;
        background: #9b59b6;
        color: white;
    }

    .screenshot-btn:hover {
        background: #8e44ad;
        transform: translateY(-1px);
    }

    .screenshot-btn:active {
        transform: translateY(0);
    }

    .screenshot-icon {
        font-size: 16px;
    }

    .screenshot-flash {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: white;
        opacity: 0;
        pointer-events: none;
        z-index: 9999;
        transition: opacity 0.1s ease;
    }
    
    .screenshot-flash.active {
        opacity: 0.8;
        transition: opacity 0.2s ease;
    }

    .duration-controls {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    
    .duration-mode {
        display: flex;
        gap: 15px;
        padding: 8px;
        background: #f8f9fa;
        border-radius: 6px;
        font-size: 13px;
    }
    
    .duration-mode label {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        user-select: none;
    }

    .duration-mode input[type="radio"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
    }

    .auto-duration-controls {
        opacity: 1;
        transition: opacity 0.3s ease;
    }

    .auto-duration-controls.hidden {
        opacity: 0.5;
        pointer-events: none;
    }

    .preview-rotation-controls {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .preview-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.3s ease;
        background: #9b59b6;
        color: white;
    }
    
    .preview-btn:hover {
        background: #8e44ad;
        transform: translateY(-1px);
    }

    .preview-btn.active {
        background: #e74c3c;
        animation: pulse 1.5s infinite;
    }

    .preview-btn.active:hover {
        background: #c0392b;
    }

    .preview-icon {
        font-size: 16px;
    }
    
    .preview-speed-control {
        opacity: 1;
        transition: opacity 0.3s ease;
    }
    
    .preview-speed-control.disabled {
        opacity: 0.5;
        pointer-events: none;
    }

    .view-options {
        position: relative;
        margin-right: 10px;
    }
    
    .view-options-btn {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0 5px;
        line-height: 1;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s ease;
    }

    .view-options-btn:hover {
        background-color: rgba(255, 255, 255, 0.1);
    }

    .view-options-menu {
        position: absolute;
        top: 100%;
        right: 0;
        background: white;
        border-radius: 6px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        padding: 5px;
        min-width: 150px;
        display: none;
        z-index: 1001;
    }
    
    .view-options-menu.active {
        display: block;
    }

    .view-option {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 8px 12px;
        border: none;
        background: none;
        color: #2c3e50;
        font-size: 14px;
        text-align: left;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s ease;
    }
    
    .view-option:hover {
        background: #f8f9fa;
    }

    .view-option .option-icon {
        font-size: 16px;
    }

    .view-option.active {
        background: #e3f2fd;
        color: #1976d2;
    }

    /* Add styles for when UI is hidden */
    body.ui-hidden .render-panel,
    body.ui-hidden .scene-panel,
    body.ui-hidden .shirt-panel,
    body.ui-hidden .camera-info-panel,
    body.ui-hidden .uv-editor,
    body.ui-hidden .drop-zone {
        display: none !important;
    }

    body.ui-hidden #canvas-container {
        width: 100vw !important;
        height: 100vh !important;
        margin: 0 !important;
        padding: 0 !important;
    }
    
    body.ui-hidden canvas {
        width: 100vw !important;
        height: 100vh !important;
    }

    .template-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-top: 10px;
        max-height: 300px;
        overflow-y: auto;
        padding: 5px;
    }

    .template-item {
        position: relative;
        aspect-ratio: 1;
        border: 2px solid #e9ecef;
        border-radius: 6px;
        cursor: pointer;
        overflow: hidden;
        transition: all 0.2s ease;
    }

    .template-item:hover {
        border-color: #3498db;
        transform: scale(1.05);
    }

    .template-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .template-preview {
        position: fixed;
        width: 200px;
        height: 200px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        padding: 10px;
        z-index: 1000;
        display: none;
        pointer-events: none;
        border: 2px solid #3498db;
    }

    .template-preview img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }

    .template-item:hover .template-preview {
        display: block;
    }

    .uv-controls button {
        padding: 6px 12px;
        margin: 0 2px;
        border: 1px solid #ddd;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .uv-controls button:hover {
        background: #f0f0f0;
    }

    .uv-controls button.active {
        background: #3498db;
        color: white;
        border-color: #2980b9;
    }

    .property-group {
        margin: 10px 0;
        padding: 10px;
        background: #f8f9fa;
        border-radius: 6px;
    }

    .property-group label {
        display: block;
        margin: 8px 0;
        color: #2c3e50;
        font-size: 14px;
    }

    .property-group input[type="range"] {
        width: 100%;
        margin: 5px 0;
    }

    .lighting-mode-toggle {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 8px;
        background: #f8f9fa;
        border-radius: 6px;
        margin-bottom: 10px;
    }
    
    .lighting-mode-toggle label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        user-select: none;
        font-size: 13px;
        color: #2c3e50;
    }
    
    .lighting-mode-toggle input[type="radio"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
    }
    
    .lighting-mode-toggle label:hover {
        color: #3498db;
    }

    .uv-controls {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 8px;
        background: #f8f9fa;
        border-radius: 6px;
        margin-top: 10px;
    }

    .property-group {
        margin: 4px 0;
        padding: 6px;
        background: #f8f9fa;
        border-radius: 4px;
    }

    .property-group label {
        display: block;
        margin: 4px 0;
        color: #2c3e50;
        font-size: 12px;
        font-weight: 500;
    }

    .property-group input[type="range"] {
        width: 100%;
        margin: 2px 0;
        height: 4px;
    }

    .property-group input[type="range"]::-webkit-slider-thumb {
        width: 14px;
        height: 14px;
    }

    .uv-editor {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 300px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        display: flex;
        flex-direction: column;
        max-height: calc(100vh - 40px);
    }

    .uv-editor-header {
        padding: 8px 12px;
        background: #2c3e50;
        color: white;
        border-radius: 8px 8px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .uv-editor-content {
        padding: 8px;
        overflow-y: auto;
        flex-grow: 1;
        max-height: calc(100vh - 400px);
    }

    .uv-controls button {
        padding: 4px 8px;
        margin: 0 2px;
        border: 1px solid #ddd;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s ease;
    }

    .uv-controls button:hover {
        background: #f0f0f0;
    }

    .uv-controls button.active {
        background: #3498db;
        color: white;
        border-color: #2980b9;
    }

    .value-display {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: #666;
        margin-top: 2px;
    }

    .uv-editor-footer {
        padding: 8px;
        border-top: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .uv-editor-footer button {
        padding: 4px 8px;
        font-size: 12px;
    }
`;

document.head.appendChild(renderStyles);
document.body.appendChild(renderPanel);
document.body.appendChild(scenePanel);
document.body.appendChild(shirtPanel);

// Keep only the minimize functionality
function setupPanelMinimize(panel) {
    const minimizeBtn = panel.querySelector('.minimize-btn');
    if (!minimizeBtn) return;

    // Remove any existing click listeners
    const newMinimizeBtn = minimizeBtn.cloneNode(true);
    minimizeBtn.parentNode.replaceChild(newMinimizeBtn, minimizeBtn);

    newMinimizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('minimized');
        newMinimizeBtn.textContent = panel.classList.contains('minimized') ? '+' : '−';
        
        // Store the minimized state
        const panelType = panel.classList.contains('scene-panel') ? 'scene' : 'render';
        localStorage.setItem(`${panelType}_panel_minimized`, panel.classList.contains('minimized'));
    });

    // Restore minimized state from localStorage
    const panelType = panel.classList.contains('scene-panel') ? 'scene' : 'render';
    const isMinimized = localStorage.getItem(`${panelType}_panel_minimized`) === 'true';
    if (isMinimized) {
        panel.classList.add('minimized');
        newMinimizeBtn.textContent = '+';
    }
}

// Setup minimize functionality for all panels
document.addEventListener('DOMContentLoaded', () => {
    setupPanelMinimize(renderPanel);
    setupPanelMinimize(scenePanel);
    setupPanelMinimize(shirtPanel);
});

// Remove any old minimize button event listeners
const oldMinimizeBtns = document.querySelectorAll('.minimize-btn');
oldMinimizeBtns.forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
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

// Update the startRecording function to handle manual duration
function startRecording() {
    if (isRecording) {
        // Stop recording if already recording
        mediaRecorder.stop();
        return;
    }
    
    // Stop preview rotation if active
    if (isPreviewRotating) {
        isPreviewRotating = false;
        const previewBtn = document.getElementById('preview-rotation');
        if (previewBtn) {
            previewBtn.classList.remove('active');
            previewBtn.innerHTML = '<span class="preview-icon">🔄</span>Start Preview';
        }
    }
    
    // Store the current camera position and target
    const originalCameraPosition = camera.position.clone();
    const originalCameraTarget = controls.target.clone();
    
    // Reset model rotation before starting
    if (tshirtModel) {
        tshirtModel.rotation.y = 0;
    }
    
    // Get the current rotation state
    enableRotation = document.getElementById('enable-rotation').checked;
    
    // Get the duration mode
    isManualDuration = document.querySelector('input[name="duration-mode"][value="manual"]').checked;
    
    recordedChunks = [];
    isRecording = true;
    recordingStartTime = Date.now();
    
    renderBtn.classList.add('recording');
    renderBtn.innerHTML = '<span class="render-icon"></span>Stop Recording';
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
        
        // Restore camera position and target
        camera.position.copy(originalCameraPosition);
        controls.target.copy(originalCameraTarget);
        controls.update();
        
        // Reset model rotation
        if (tshirtModel) {
            tshirtModel.rotation.y = 0;
        }
    };
    
    mediaRecorder.start();
    animateRecording();
}

// Update the animateRecording function to handle manual duration
function animateRecording() {
    if (!isRecording) return;
    
    const elapsed = Date.now() - recordingStartTime;
    
    if (!isManualDuration) {
        const remaining = Math.ceil((RECORDING_DURATION - elapsed) / 1000);
    recordingStatus.textContent = `Recording... ${remaining}s remaining`;
    
        // Check if recording should stop based on duration
    if (elapsed >= RECORDING_DURATION) {
        mediaRecorder.stop();
        return;
    }
    } else {
        recordingStatus.textContent = `Recording... ${(elapsed / 1000).toFixed(1)}s`;
    }
    
    requestAnimationFrame(animateRecording);
}

// Add event listeners for duration mode
document.addEventListener('DOMContentLoaded', () => {
    const durationModeInputs = document.querySelectorAll('input[name="duration-mode"]');
    const autoDurationControls = document.querySelector('.auto-duration-controls');
    
    durationModeInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            isManualDuration = e.target.value === 'manual';
            if (autoDurationControls) {
                autoDurationControls.classList.toggle('hidden', isManualDuration);
            }
        });
    });
});

// Update the click handler
renderBtn.addEventListener('click', () => {
        startRecording();
});

// Add after the scene panel creation but before the animate function
// const cameraInfoPanel = document.createElement('div');
// cameraInfoPanel.className = 'camera-info-panel';
// cameraInfoPanel.innerHTML = `
//     <div class="camera-info-header">
//         <span>Camera Info</span>
//         <button class="minimize-btn">−</button>
//     </div>
//     <div class="camera-info-content">
//         <div class="info-group">
//             <label>Position:</label>
//             <div class="coords">
//                 <span>X: <span id="cam-pos-x">0.00</span></span>
//                 <span>Y: <span id="cam-pos-y">0.00</span></span>
//                 <span>Z: <span id="cam-pos-z">0.00</span></span>
//             </div>
//         </div>
//         <div class="info-group">
//             <label>Target:</label>
//             <div class="coords">
//                 <span>X: <span id="cam-target-x">0.00</span></span>
//                 <span>Y: <span id="cam-target-y">0.00</span></span>
//                 <span>Z: <span id="cam-target-z">0.00</span></span>
//             </div>
//         </div>
//     </div>
// `;

// // Add styles for the camera info panel
// const cameraInfoStyles = document.createElement('style');
// cameraInfoStyles.textContent = `
//     .camera-info-panel {
//         position: fixed;
//         bottom: 20px;
//         right: 20px;
//         width: 200px;
//         background: rgba(255, 255, 255, 0.9);
//         border-radius: 8px;
//         box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
//         font-family: monospace;
//         font-size: 12px;
//         z-index: 1000;
//         transition: transform 0.3s ease;
//     }
//     
//     .camera-info-panel.minimized {
//         transform: translateY(calc(100% - 30px));
//     }
//     
//     .camera-info-header {
//         background: #2c3e50;
//         color: white;
//         padding: 8px 12px;
//         display: flex;
//         justify-content: space-between;
//         align-items: center;
//         border-radius: 8px 8px 0 0;
//         cursor: move;
//     }
//     
//     .camera-info-header span {
//         font-weight: 500;
//     }
//     
//     .camera-info-header .minimize-btn {
//         background: none;
//         border: none;
//         color: white;
//         font-size: 16px;
//         cursor: pointer;
//         padding: 0 5px;
//         line-height: 1;
//     }
//     
//     .camera-info-content {
//         padding: 10px;
//     }
//     
//     .info-group {
//         margin-bottom: 8px;
//     }
//     
//     .info-group label {
//         display: block;
//         color: #666;
//         margin-bottom: 4px;
//     }
//     
//     .coords {
//         display: grid;
//         grid-template-columns: repeat(3, 1fr);
//         gap: 4px;
//     }
//     
//     .coords span {
//         color: #333;
//     }
// `;

// // document.head.appendChild(cameraInfoStyles);
// // document.body.appendChild(cameraInfoPanel);

// Update the animate function to handle preview rotation
function animate() {
    requestAnimationFrame(animate);
    
    // Handle model rotation with E and Q keys
    if (tshirtModel && !isPreviewRotating && !isRecording) {
        if (keys['e']) {
            tshirtModel.rotation.y += MODEL_ROTATION_SPEED;
        }
        if (keys['q']) {
            tshirtModel.rotation.y -= MODEL_ROTATION_SPEED;
        }
    }
    
    // Handle preview rotation
    if (isPreviewRotating && tshirtModel) {
        const previewSpeedSlider = document.getElementById('preview-speed-slider');
        const previewSpeed = parseFloat(previewSpeedSlider.value);
        tshirtModel.rotation.y += previewSpeed * (Math.PI / 180);
    }
    
    // Only disable keyboard movement during replay, allow it during recording
    if (!isReplayingCamera) {
        const moveX = (keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0);
        const moveY = (keys['w'] ? 1 : 0) - (keys['s'] ? 1 : 0);
        
        if (moveX !== 0 || moveY !== 0) {
            const right = new THREE.Vector3();
            const up = new THREE.Vector3();
            camera.getWorldDirection(right);
            right.cross(camera.up).normalize();
            up.copy(camera.up).normalize();
            
            const moveVector = new THREE.Vector3();
            moveVector.addScaledVector(right, moveX * KEYBOARD_MOVE_SPEED);
            moveVector.addScaledVector(up, moveY * KEYBOARD_MOVE_SPEED);
            
            const damping = 0.1;
            camera.position.addScaledVector(moveVector, damping);
            controls.target.addScaledVector(moveVector, damping);
        }
    }
    
    // Only rotate if recording AND rotation is enabled (keep this separate from preview rotation)
    if (isRecording && enableRotation && tshirtModel && !isPreviewRotating) {
        tshirtModel.rotation.y += ROTATION_SPEED * (Math.PI / 180);
    }
    
    controls.update();
    renderer.render(scene, camera);
}

// Update the resetCamera function to reset zoom values
function resetCamera() {
    camera.position.set(0, 0, 3);
    controls.target.set(0, 0, 0);
    targetZoom = 3;
    currentZoom = 3;
    controls.update();
}

// Add a reset camera button to the render panel
const resetCameraBtn = document.createElement('button');
resetCameraBtn.className = 'reset-camera-btn';
resetCameraBtn.innerHTML = 'Reset Camera';
resetCameraBtn.style.cssText = `
    width: 100%;
    background: #3498db;
    color: white;
    border: none;
    padding: 8px;
    border-radius: 4px;
    cursor: pointer;
    margin-top: 10px;
    font-size: 14px;
    transition: background 0.3s ease;
`;
resetCameraBtn.addEventListener('mouseover', () => {
    resetCameraBtn.style.background = '#2980b9';
});
resetCameraBtn.addEventListener('mouseout', () => {
    resetCameraBtn.style.background = '#3498db';
});
resetCameraBtn.addEventListener('click', resetCamera);

// Add the reset button to the render panel
document.querySelector('.render-panel-content .render-controls').appendChild(resetCameraBtn);

// Add to global variables at the top
let backgroundImage = null;
let backgroundTexture = null;
let backgroundSize = { width: 20, height: 20 };
let backgroundPosition = { x: 0, y: 0, z: -5 };
let backgroundRotation = { x: 0, y: 0, z: 0 };

// Add background handling functions
function handleBackgroundImage(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            // Create texture
            if (backgroundTexture) {
                backgroundTexture.dispose();
            }
            backgroundTexture = new THREE.Texture(img);
            backgroundTexture.needsUpdate = true;
            backgroundTexture.encoding = THREE.sRGBEncoding;
            
            // Create a plane geometry for the background
            const planeGeometry = new THREE.PlaneGeometry(backgroundSize.width, backgroundSize.height);
            const planeMaterial = new THREE.MeshBasicMaterial({
                map: backgroundTexture,
                transparent: true,
                opacity: backgroundBrightness / 100,
                side: THREE.DoubleSide
            });
            
            // Remove existing background if any
            if (scene.getObjectByName('backgroundPlane')) {
                scene.remove(scene.getObjectByName('backgroundPlane'));
            }
            
            // Create and add the background plane
            const backgroundPlane = new THREE.Mesh(planeGeometry, planeMaterial);
            backgroundPlane.name = 'backgroundPlane';
            backgroundPlane.position.set(
                backgroundPosition.x,
                backgroundPosition.y,
                backgroundPosition.z
            );
            backgroundPlane.rotation.set(
                backgroundRotation.x * (Math.PI / 180),
                backgroundRotation.y * (Math.PI / 180),
                backgroundRotation.z * (Math.PI / 180)
            );
            scene.add(backgroundPlane);
            
            // Update UI
            document.getElementById('preview-image').src = e.target.result;
            document.getElementById('background-preview').style.display = 'block';
            document.getElementById('background-drop-zone').style.display = 'none';
            document.getElementById('clear-background').disabled = false;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function removeBackground() {
    // Remove the background plane from the scene
    const backgroundPlane = scene.getObjectByName('backgroundPlane');
    if (backgroundPlane) {
        scene.remove(backgroundPlane);
        if (backgroundPlane.material) {
            backgroundPlane.material.dispose();
        }
        if (backgroundPlane.geometry) {
            backgroundPlane.geometry.dispose();
        }
    }
    
    if (backgroundTexture) {
        backgroundTexture.dispose();
        backgroundTexture = null;
    }
    
    // Reset scene background to default color
    scene.background = new THREE.Color(0xf0f0f0);
    backgroundImage = null;
    backgroundBrightness = 100;
    backgroundSize = { width: 20, height: 20 };
    backgroundPosition = { x: 0, y: 0, z: -5 };
    backgroundRotation = { x: 0, y: 0, z: 0 };
    
    // Reset controls
    brightnessSlider.value = 100;
    brightnessValue.textContent = '100%';
    bgWidthInput.value = 20;
    bgHeightInput.value = 20;
    bgPosXInput.value = 0;
    bgPosYInput.value = 0;
    bgPosZInput.value = -5;
    bgPosXValue.textContent = '0';
    bgPosYValue.textContent = '0';
    bgPosZValue.textContent = '-5';
    bgRotXInput.value = 0;
    bgRotYInput.value = 0;
    bgRotZInput.value = 0;
    bgRotXValue.textContent = '0°';
    bgRotYValue.textContent = '0°';
    bgRotZValue.textContent = '0°';
    
    // Update UI
    document.getElementById('background-preview').style.display = 'none';
    document.getElementById('background-drop-zone').style.display = 'flex';
    document.getElementById('preview-image').src = '';
    document.getElementById('clear-background').disabled = true;
}

// Add event listeners for background controls
const backgroundDropZone = document.getElementById('background-drop-zone');
const backgroundInput = document.getElementById('background-input');
const removeBackgroundBtn = document.getElementById('remove-background');

backgroundDropZone.addEventListener('click', () => {
    backgroundInput.click();
});

backgroundInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleBackgroundImage(file);
});

backgroundDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    backgroundDropZone.classList.add('dragover');
});

backgroundDropZone.addEventListener('dragleave', () => {
    backgroundDropZone.classList.remove('dragover');
});

backgroundDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    backgroundDropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleBackgroundImage(file);
});

removeBackgroundBtn.addEventListener('click', removeBackground);

// Add brightness control functionality
let backgroundBrightness = 100;
const brightnessSlider = document.getElementById('brightness-slider');
const brightnessValue = document.getElementById('brightness-value');

function updateBackgroundBrightness() {
    const backgroundPlane = scene.getObjectByName('backgroundPlane');
    if (backgroundPlane && backgroundPlane.material) {
        backgroundPlane.material.opacity = backgroundBrightness / 100;
        backgroundPlane.material.needsUpdate = true;
    }
}

brightnessSlider.addEventListener('input', () => {
    backgroundBrightness = parseInt(brightnessSlider.value);
    brightnessValue.textContent = `${backgroundBrightness}%`;
    updateBackgroundBrightness();
});

// Add event listeners for the new controls
const bgWidthInput = document.getElementById('bg-width');
const bgHeightInput = document.getElementById('bg-height');
const bgPosXInput = document.getElementById('bg-pos-x');
const bgPosYInput = document.getElementById('bg-pos-y');
const bgPosZInput = document.getElementById('bg-pos-z');
const bgPosXValue = document.getElementById('bg-pos-x-value');
const bgPosYValue = document.getElementById('bg-pos-y-value');
const bgPosZValue = document.getElementById('bg-pos-z-value');
const bgRotXInput = document.getElementById('bg-rot-x');
const bgRotYInput = document.getElementById('bg-rot-y');
const bgRotZInput = document.getElementById('bg-rot-z');
const bgRotXValue = document.getElementById('bg-rot-x-value');
const bgRotYValue = document.getElementById('bg-rot-y-value');
const bgRotZValue = document.getElementById('bg-rot-z-value');

function updateBackgroundSize() {
    const backgroundPlane = scene.getObjectByName('backgroundPlane');
    if (backgroundPlane) {
        // Update geometry
        const newGeometry = new THREE.PlaneGeometry(backgroundSize.width, backgroundSize.height);
        backgroundPlane.geometry.dispose();
        backgroundPlane.geometry = newGeometry;
    }
}

function updateBackgroundPosition() {
    const backgroundPlane = scene.getObjectByName('backgroundPlane');
    if (backgroundPlane) {
        backgroundPlane.position.set(
            backgroundPosition.x,
            backgroundPosition.y,
            backgroundPosition.z
        );
    }
}

function updateBackgroundRotation() {
    const backgroundPlane = scene.getObjectByName('backgroundPlane');
    if (backgroundPlane) {
        backgroundPlane.rotation.set(
            backgroundRotation.x * (Math.PI / 180),
            backgroundRotation.y * (Math.PI / 180),
            backgroundRotation.z * (Math.PI / 180)
        );
    }
}

bgWidthInput.addEventListener('change', () => {
    backgroundSize.width = parseFloat(bgWidthInput.value);
    updateBackgroundSize();
});

bgHeightInput.addEventListener('change', () => {
    backgroundSize.height = parseFloat(bgHeightInput.value);
    updateBackgroundSize();
});

bgPosXInput.addEventListener('input', () => {
    backgroundPosition.x = parseFloat(bgPosXInput.value);
    bgPosXValue.textContent = backgroundPosition.x.toFixed(1);
    updateBackgroundPosition();
});

bgPosYInput.addEventListener('input', () => {
    backgroundPosition.y = parseFloat(bgPosYInput.value);
    bgPosYValue.textContent = backgroundPosition.y.toFixed(1);
    updateBackgroundPosition();
});

bgPosZInput.addEventListener('input', () => {
    backgroundPosition.z = parseFloat(bgPosZInput.value);
    bgPosZValue.textContent = backgroundPosition.z.toFixed(1);
    updateBackgroundPosition();
});

bgRotXInput.addEventListener('input', () => {
    backgroundRotation.x = parseFloat(bgRotXInput.value);
    bgRotXValue.textContent = `${backgroundRotation.x}°`;
    updateBackgroundRotation();
});

bgRotYInput.addEventListener('input', () => {
    backgroundRotation.y = parseFloat(bgRotYInput.value);
    bgRotYValue.textContent = `${backgroundRotation.y}°`;
    updateBackgroundRotation();
});

bgRotZInput.addEventListener('input', () => {
    backgroundRotation.z = parseFloat(bgRotZInput.value);
    bgRotZValue.textContent = `${backgroundRotation.z}°`;
    updateBackgroundRotation();
});

// Add event listener for the clear background button
document.getElementById('clear-background').addEventListener('click', removeBackground);

// Add lighting control event listeners
const frontLightIntensity = document.getElementById('front-light-intensity');
const frontLightColor = document.getElementById('front-light-color');
const frontLightValue = document.getElementById('front-light-value');
const backLightIntensity = document.getElementById('back-light-intensity');
const backLightColor = document.getElementById('back-light-color');
const backLightValue = document.getElementById('back-light-value');
const ambientLightIntensity = document.getElementById('ambient-light-intensity');
const ambientLightValue = document.getElementById('ambient-light-value');

function updateFrontLight() {
    const intensity = parseFloat(frontLightIntensity.value);
    const color = new THREE.Color(frontLightColor.value);
    frontLight.intensity = intensity;
    frontLight.color = color;
    frontLightValue.textContent = intensity.toFixed(1);
}

function updateBackLight() {
    const intensity = parseFloat(backLightIntensity.value);
    const color = new THREE.Color(backLightColor.value);
    backLight.intensity = intensity;
    backLight.color = color;
    backLightValue.textContent = intensity.toFixed(1);
}

function updateAmbientLight() {
    const intensity = parseFloat(ambientLightIntensity.value);
    ambientLight.intensity = intensity;
    ambientLightValue.textContent = intensity.toFixed(1);
}

frontLightIntensity.addEventListener('input', updateFrontLight);
frontLightColor.addEventListener('input', updateFrontLight);
backLightIntensity.addEventListener('input', updateBackLight);
backLightColor.addEventListener('input', updateBackLight);
ambientLightIntensity.addEventListener('input', updateAmbientLight);

// Add event listeners for the color presets
document.querySelectorAll('.color-preset').forEach(preset => {
    preset.addEventListener('click', () => {
        const color = preset.dataset.color;
        const colorPicker = document.getElementById('shirt-color');
        colorPicker.value = color;
        currentShirtColor = color;
        updateTexture();
        
        // Update active state
        document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
        preset.classList.add('active');
    });
});

// Add event listener for the color picker
const colorPicker = document.getElementById('shirt-color');
if (colorPicker) {
    colorPicker.addEventListener('input', (e) => {
        currentShirtColor = e.target.value;
        updateTexture();
        
        // Update active state of presets
        document.querySelectorAll('.color-preset').forEach(preset => {
            preset.classList.toggle('active', preset.dataset.color === currentShirtColor);
        });
    });
}

// Set initial active state for the white preset
const whitePreset = document.querySelector('.color-preset[data-color="#ffffff"]');
if (whitePreset) {
    whitePreset.classList.add('active');
}

// Add event listener for the rotation toggle
document.addEventListener('DOMContentLoaded', () => {
    const rotationToggle = document.getElementById('enable-rotation');
    const rotationSpeedControl = document.querySelector('.rotation-speed-control');
    
    if (rotationToggle) {
        rotationToggle.addEventListener('change', (e) => {
            enableRotation = e.target.checked;
            rotationSpeedControl.classList.toggle('disabled', !enableRotation);
        });
    }
});

// Add to the global variables at the top
let enableRotation = true;

// Add wheel event listener for zooming
renderer.domElement.addEventListener('wheel', (event) => {
    // Calculate zoom direction and amount
    const zoomDirection = event.deltaY > 0 ? 1 : -1;
    const zoomAmount = ZOOM_SPEED * 2; // Make wheel zoom a bit faster than keyboard
    
    // Update target zoom
    targetZoom = Math.max(1, Math.min(8, targetZoom + zoomDirection * zoomAmount));
    
    // Prevent default scroll behavior
    event.preventDefault();
}, { passive: false });

// Add to global variables at the top
let isRecordingCamera = false;
let cameraPath = [];
let isReplayingCamera = false;
let replayStartTime = 0;
let cameraRecordingDuration = 0;
const CAMERA_SAMPLE_RATE = 100; // Sample camera position every 100ms

// Add camera recording and replay functions
function startCameraRecording() {
    if (isRecordingCamera) {
        stopCameraRecording();
        return;
    }

    isRecordingCamera = true;
    cameraPath = [];
    cameraRecordingDuration = 0;
    const recordBtn = document.getElementById('record-camera');
    const replayBtn = document.getElementById('replay-camera');
    const clearBtn = document.getElementById('clear-camera');
    const status = document.getElementById('camera-status');

    recordBtn.classList.add('recording');
    recordBtn.innerHTML = '<span class="camera-icon">⏹️</span>Stop Recording';
    replayBtn.disabled = true;
    clearBtn.disabled = true;
    status.textContent = 'Recording camera path...';

    // Store initial camera state
    const initialState = {
        position: camera.position.clone(),
        target: controls.target.clone(),
        zoom: currentZoom
    };
    cameraPath.push({ ...initialState, time: 0 });

    // Start recording loop
    const recordInterval = setInterval(() => {
        if (!isRecordingCamera) {
            clearInterval(recordInterval);
            return;
        }

        cameraRecordingDuration += CAMERA_SAMPLE_RATE;
        cameraPath.push({
            position: camera.position.clone(),
            target: controls.target.clone(),
            zoom: currentZoom,
            time: cameraRecordingDuration
        });

        status.textContent = `Recording... ${(cameraRecordingDuration / 1000).toFixed(1)}s`;
    }, CAMERA_SAMPLE_RATE);
}

function stopCameraRecording() {
    isRecordingCamera = false;
    const recordBtn = document.getElementById('record-camera');
    const replayBtn = document.getElementById('replay-camera');
    const clearBtn = document.getElementById('clear-camera');
    const status = document.getElementById('camera-status');

    recordBtn.classList.remove('recording');
    recordBtn.innerHTML = '<span class="camera-icon">🎥</span>Record Camera Path';
    replayBtn.disabled = false;
    clearBtn.disabled = false;
    status.textContent = `Camera path recorded (${(cameraRecordingDuration / 1000).toFixed(1)}s)`;
}

function replayCameraPath() {
    if (isReplayingCamera || cameraPath.length === 0) return;

    isReplayingCamera = true;
    replayStartTime = Date.now();
    const replayBtn = document.getElementById('replay-camera');
    const recordBtn = document.getElementById('record-camera');
    const clearBtn = document.getElementById('clear-camera');
    const status = document.getElementById('camera-status');

    replayBtn.classList.add('replaying');
    replayBtn.innerHTML = '<span class="camera-icon">⏹️</span>Stop Replay';
    recordBtn.disabled = true;
    clearBtn.disabled = true;
    status.textContent = 'Replaying camera path...';

    // Store original camera state for when replay ends
    const originalState = {
        position: camera.position.clone(),
        target: controls.target.clone(),
        zoom: currentZoom
    };

    // Start replay animation
    function animateReplay() {
        if (!isReplayingCamera) return;

        const elapsed = Date.now() - replayStartTime;
        const progress = Math.min(elapsed / cameraRecordingDuration, 1);

        if (progress >= 1) {
            stopCameraReplay();
            return;
        }

        // Find the two keyframes to interpolate between
        let nextFrame = cameraPath.find(frame => frame.time > elapsed);
        let prevFrame = cameraPath[cameraPath.indexOf(nextFrame) - 1];

        if (nextFrame && prevFrame) {
            const frameProgress = (elapsed - prevFrame.time) / (nextFrame.time - prevFrame.time);
            
            // Interpolate position
            camera.position.lerpVectors(prevFrame.position, nextFrame.position, frameProgress);
            
            // Interpolate target
            controls.target.lerpVectors(prevFrame.target, nextFrame.target, frameProgress);
            
            // Interpolate zoom
            targetZoom = prevFrame.zoom + (nextFrame.zoom - prevFrame.zoom) * frameProgress;
        }

        status.textContent = `Replaying... ${(progress * 100).toFixed(0)}%`;
        requestAnimationFrame(animateReplay);
    }

    animateReplay();
}

function stopCameraReplay() {
    isReplayingCamera = false;
    const replayBtn = document.getElementById('replay-camera');
    const recordBtn = document.getElementById('record-camera');
    const clearBtn = document.getElementById('clear-camera');
    const status = document.getElementById('camera-status');

    replayBtn.classList.remove('replaying');
    replayBtn.innerHTML = '<span class="camera-icon">▶️</span>Replay Camera Path';
    recordBtn.disabled = false;
    clearBtn.disabled = false;
    status.textContent = `Camera path ready (${(cameraRecordingDuration / 1000).toFixed(1)}s)`;
}

function clearCameraPath() {
    cameraPath = [];
    cameraRecordingDuration = 0;
    const replayBtn = document.getElementById('replay-camera');
    const clearBtn = document.getElementById('clear-camera');
    const status = document.getElementById('camera-status');

    replayBtn.disabled = true;
    clearBtn.disabled = true;
    status.textContent = 'No camera path recorded';
}

// Add event listeners for camera controls
document.addEventListener('DOMContentLoaded', () => {
    const recordBtn = document.getElementById('record-camera');
    const replayBtn = document.getElementById('replay-camera');
    const clearBtn = document.getElementById('clear-camera');

    if (recordBtn) {
        recordBtn.addEventListener('click', () => {
            if (isRecordingCamera) {
                stopCameraRecording();
            } else {
                startCameraRecording();
            }
        });
    }

    if (replayBtn) {
        replayBtn.addEventListener('click', () => {
            if (isReplayingCamera) {
                stopCameraReplay();
            } else {
                replayCameraPath();
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', clearCameraPath);
    }
});

// Add screenshot functionality
function takeScreenshot() {
    // Create flash effect
    const flash = document.createElement('div');
    flash.className = 'screenshot-flash';
    document.body.appendChild(flash);

    // Trigger flash effect
    requestAnimationFrame(() => {
        flash.classList.add('active');
        
        // Wait for flash to be visible
        setTimeout(() => {
            // Capture the screenshot
            renderer.render(scene, camera);
            const screenshot = renderer.domElement.toDataURL('image/png');
            
            // Create download link
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            link.download = `tshirt-screenshot-${timestamp}.png`;
            link.href = screenshot;
            link.click();

            // Remove flash effect
            flash.classList.remove('active');
            setTimeout(() => {
                document.body.removeChild(flash);
            }, 200);
        }, 50);
    });
}

// Add event listener for screenshot button
document.addEventListener('DOMContentLoaded', () => {
    const screenshotBtn = document.getElementById('take-screenshot');
    if (screenshotBtn) {
        screenshotBtn.addEventListener('click', takeScreenshot);
    }
});

// Add event listeners for preview rotation
document.addEventListener('DOMContentLoaded', () => {
    const previewBtn = document.getElementById('preview-rotation');
    const previewSpeedSlider = document.getElementById('preview-speed-slider');
    const previewSpeedValue = document.getElementById('preview-speed-value');
    let previewRotationSpeed = 0.5;

    if (previewBtn) {
        previewBtn.addEventListener('click', () => {
            isPreviewRotating = !isPreviewRotating;
            previewBtn.classList.toggle('active');
            previewBtn.innerHTML = isPreviewRotating ? 
                '<span class="preview-icon">⏹️</span>Stop Preview' : 
                '<span class="preview-icon">🔄</span>Start Preview';
        });
    }

    if (previewSpeedSlider) {
        previewSpeedSlider.addEventListener('input', () => {
            previewRotationSpeed = parseFloat(previewSpeedSlider.value);
            previewSpeedValue.textContent = `${previewSpeedSlider.value}°/frame`;
        });
    }
});

// Add event listeners for view options
document.addEventListener('DOMContentLoaded', () => {
    const viewOptionsBtn = document.querySelector('.view-options-btn');
    const viewOptionsMenu = document.querySelector('.view-options-menu');
    const toggleFullscreenBtn = document.getElementById('toggle-fullscreen');

    // Toggle menu visibility
    if (viewOptionsBtn && viewOptionsMenu) {
        viewOptionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            viewOptionsMenu.classList.toggle('active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!viewOptionsMenu.contains(e.target) && !viewOptionsBtn.contains(e.target)) {
                viewOptionsMenu.classList.remove('active');
            }
        });
    }

    // Toggle fullscreen
    if (toggleFullscreenBtn) {
        toggleFullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable fullscreen: ${err.message}`);
                });
            } else {
                document.exitFullscreen();
            }
            viewOptionsMenu.classList.remove('active');
        });
    }

    // Handle fullscreen change
    document.addEventListener('fullscreenchange', () => {
        if (toggleFullscreenBtn) {
            toggleFullscreenBtn.classList.toggle('active', !!document.fullscreenElement);
            toggleFullscreenBtn.innerHTML = document.fullscreenElement ? 
                '<span class="option-icon">⛶</span>Exit Fullscreen' : 
                '<span class="option-icon">⛶</span>Toggle Fullscreen';
        }
    });
});

// Make sure to call animate at the end of the file
animate(); 

// Update template handling
document.addEventListener('DOMContentLoaded', () => {
    // ... existing DOMContentLoaded code ...

    // Remove the old template selector code and add new template grid handling
    const templateItems = document.querySelectorAll('.template-item');
    templateItems.forEach(item => {
        item.addEventListener('click', async () => {
            const templatePath = item.dataset.template;
            try {
                const response = await fetch(`templates/${templatePath}`);
                const blob = await response.blob();
                const imageUrl = URL.createObjectURL(blob);
                
                // Create a new image element
                const img = new Image();
                img.onload = () => {
                    // Add the template as a new image to the shirt
                    const newImage = {
                        image: img,
                        url: imageUrl,
                        transform: {
                            x: 0,
                            y: 0,
                            scale: 1,
                            rotation: 0
                        }
                    };
                    
                    // Add to images array instead of replacing
                    images.push(newImage);
                    selectedImageIndex = images.length - 1;
                    
                    // Update UI
                    addImageToList(newImage, selectedImageIndex);
                    
                    // Reset sliders
                    posXSlider.value = 0;
                    posYSlider.value = 0;
                    scaleSlider.value = 1;
                    rotationSlider.value = 0;
                    
                    updateTexture();
                    drawUVEditor();
                };
                img.src = imageUrl;
            } catch (error) {
                console.error('Error loading template:', error);
                alert('Failed to load template image. Please try again.');
            }
        });

        // Add preview positioning
        item.addEventListener('mousemove', (e) => {
            const preview = item.querySelector('.template-preview');
            if (preview) {
                const rect = item.getBoundingClientRect();
                const x = e.clientX;
                const y = e.clientY;
                
                // Position preview to the right of the cursor
                preview.style.left = `${x + 20}px`;
                preview.style.top = `${y - 100}px`;
            }
        });
    });
});

// Add to global variables at the top
let currentLightingMode = 'standard';

// Add event listener for lighting mode toggle
document.addEventListener('DOMContentLoaded', () => {
    const lightingModeInputs = document.querySelectorAll('input[name="lighting-mode"]');
    lightingModeInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            currentLightingMode = e.target.value;
            updateTexture();
        });
    });
});

// Create the textures panel
const texturesPanel = document.createElement('div');
texturesPanel.className = 'render-panel textures-panel';
texturesPanel.innerHTML = `
    <div class="render-panel-header">
        <h3>Layers</h3>
        <button class="minimize-btn">−</button>
    </div>
    <div class="render-panel-content">
        <div class="render-controls">
            <div class="control-group">
                <div class="layers-header">
                    <span>Layer Name</span>
                    <span>Visibility</span>
                </div>
                <div class="layers-list" id="layers-list">
                    <!-- Layers will be added here dynamically -->
                </div>
            </div>
        </div>
    </div>
`;

// Add the textures panel to the document
document.body.appendChild(texturesPanel);

// Add styles for the textures panel
const texturesStyles = document.createElement('style');
texturesStyles.textContent = `
    .textures-panel {
        bottom: 20px;
        left: 980px;
        width: 300px;
        max-height: 80vh;
    }

    .layers-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: #2c3e50;
        color: white;
        font-size: 12px;
        font-weight: 500;
        border-radius: 6px 6px 0 0;
    }

    .layers-list {
        max-height: 300px;
        overflow-y: auto;
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-top: none;
        border-radius: 0 0 6px 6px;
    }

    .layer-item {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        background: white;
        border-bottom: 1px solid #e9ecef;
        cursor: pointer;
        user-select: none;
        transition: all 0.2s ease;
        position: relative;
    }

    .layer-item:last-child {
        border-bottom: none;
    }

    .layer-item.selected {
        background: #e3f2fd;
        border-left: 3px solid #3498db;
    }

    .layer-item.selected::after {
        content: "✎";
        position: absolute;
        right: 8px;
        color: #3498db;
        font-size: 14px;
    }

    .layer-item .layer-preview {
        width: 40px;
        height: 40px;
        border: 2px solid transparent;
        border-radius: 4px;
        margin-right: 12px;
        overflow: hidden;
        flex-shrink: 0;
        transition: all 0.2s ease;
    }

    .layer-item.selected .layer-preview {
        border-color: #3498db;
        box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
    }

    .layer-item .layer-name {
        font-size: 13px;
        color: #2c3e50;
        margin-bottom: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: normal;
        transition: all 0.2s ease;
    }

    .layer-item.selected .layer-name {
        font-weight: 500;
        color: #3498db;
    }

    .layer-item:hover {
        background: #f8f9fa;
    }

    .layer-item.selected:hover {
        background: #e3f2fd;
    }

    .layer-status {
        font-size: 11px;
        color: #95a5a6;
        margin-top: 2px;
    }

    .layer-item.selected .layer-status {
        color: #3498db;
    }

    .layer-item.dragging {
        opacity: 0.5;
        background: #f8f9fa;
    }

    .layer-item .layer-info {
        flex-grow: 1;
        min-width: 0;
    }

    .layer-item .layer-controls {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .layer-visibility {
        width: 16px;
        height: 16px;
        border: none;
        background: none;
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #666;
        transition: color 0.2s ease;
    }

    .layer-visibility:hover {
        color: #3498db;
    }

    .layer-visibility.hidden {
        color: #95a5a6;
    }

    .layer-remove {
        width: 16px;
        height: 16px;
        border: none;
        background: none;
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #e74c3c;
        opacity: 0;
        transition: all 0.2s ease;
    }

    .layer-item:hover .layer-remove {
        opacity: 1;
    }

    .layer-remove:hover {
        color: #c0392b;
        transform: scale(1.1);
    }

    .layer-drag-handle {
        width: 16px;
        height: 16px;
        margin-right: 8px;
        cursor: move;
        color: #95a5a6;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .layer-drag-handle::before {
        content: "⋮⋮";
        font-size: 12px;
        letter-spacing: -2px;
    }
`;

document.head.appendChild(texturesStyles);

// Add layer visibility tracking
let layerVisibility = new Map();

// Function to update the layers list
function updateLayersList() {
    const layersList = document.getElementById('layers-list');
    layersList.innerHTML = '';
    
    // Create layers in reverse order (top layer first)
    for (let i = images.length - 1; i >= 0; i--) {
        const imgData = images[i];
        const item = document.createElement('div');
        item.className = 'layer-item';
        item.draggable = true;
        item.dataset.index = i;
        
        if (i === selectedImageIndex) {
            item.classList.add('selected');
        }

        // Initialize visibility if not set
        if (!layerVisibility.has(i)) {
            layerVisibility.set(i, true);
        }

        // Create drag handle
        const dragHandle = document.createElement('div');
        dragHandle.className = 'layer-drag-handle';
        item.appendChild(dragHandle);

        // Create preview
        const preview = document.createElement('div');
        preview.className = 'layer-preview';
        const img = document.createElement('img');
        img.src = imgData.url;
        preview.appendChild(img);
        item.appendChild(preview);

        // Create layer info
        const info = document.createElement('div');
        info.className = 'layer-info';
        
        const name = document.createElement('div');
        name.className = 'layer-name';
        // Get filename from URL or use default name
        const fileName = imgData.url.split('/').pop().split('.')[0] || `Layer ${i + 1}`;
        name.textContent = fileName;
        info.appendChild(name);

        // Add layer status
        const status = document.createElement('div');
        status.className = 'layer-status';
        const transform = imgData.transform;
        status.textContent = `Scale: ${transform.scale.toFixed(1)}x | Rot: ${transform.rotation.toFixed(0)}°`;
        info.appendChild(status);

        const controls = document.createElement('div');
        controls.className = 'layer-controls';

        // Add visibility toggle
        const visibilityBtn = document.createElement('button');
        visibilityBtn.className = `layer-visibility ${layerVisibility.get(i) ? '' : 'hidden'}`;
        visibilityBtn.innerHTML = layerVisibility.get(i) ? '👁️' : '👁️‍🗨️';
        visibilityBtn.title = layerVisibility.get(i) ? 'Hide Layer' : 'Show Layer';
        visibilityBtn.onclick = (e) => {
            e.stopPropagation();
            layerVisibility.set(i, !layerVisibility.get(i));
            visibilityBtn.classList.toggle('hidden');
            visibilityBtn.innerHTML = layerVisibility.get(i) ? '👁️' : '👁️‍🗨️';
            visibilityBtn.title = layerVisibility.get(i) ? 'Hide Layer' : 'Show Layer';
            updateTexture();
        };
        controls.appendChild(visibilityBtn);

        // Add remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'layer-remove';
        removeBtn.textContent = '×';
        removeBtn.title = 'Remove Layer';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to remove this layer?')) {
                removeImage(i);
            }
        };
        controls.appendChild(removeBtn);

        info.appendChild(controls);
        item.appendChild(info);

        // Add click handler for selection
        item.onclick = (e) => {
            // Don't select if clicking controls
            if (e.target.closest('.layer-controls')) return;
            
            // Update selected index
            selectedImageIndex = i;
            
            // Update transform controls
            const transform = imgData.transform;
            posXSlider.value = transform.x;
            posYSlider.value = transform.y;
            scaleSlider.value = transform.scale;
            rotationSlider.value = transform.rotation;
            stretchWidthSlider.value = transform.stretchWidth || 1;
            stretchHeightSlider.value = transform.stretchHeight || 1;
            
            // Update UV editor
            updateTexture();
            drawUVEditor();
            
            // Update layers list to reflect new selection
            updateLayersList();
        };

        // Add drag and drop handlers
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', i);
            item.classList.add('dragging');
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingItem = document.querySelector('.layer-item.dragging');
            if (draggingItem && draggingItem !== item) {
                const rect = item.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                if (e.clientY < midY) {
                    item.parentNode.insertBefore(draggingItem, item);
                } else {
                    item.parentNode.insertBefore(draggingItem, item.nextSibling);
                }
            }
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const toIndex = images.length - 1 - Array.from(layersList.children).indexOf(item);
            
            if (fromIndex !== toIndex) {
                // Reorder the images array
                const [movedImage] = images.splice(fromIndex, 1);
                images.splice(toIndex, 0, movedImage);
                
                // Update selected index if needed
                if (selectedImageIndex === fromIndex) {
                    selectedImageIndex = toIndex;
                } else if (selectedImageIndex > fromIndex && selectedImageIndex <= toIndex) {
                    selectedImageIndex--;
                } else if (selectedImageIndex < fromIndex && selectedImageIndex >= toIndex) {
                    selectedImageIndex++;
                }
                
                // Update visibility map
                const newVisibility = new Map();
                images.forEach((_, index) => {
                    newVisibility.set(index, layerVisibility.get(index) ?? true);
                });
                layerVisibility = newVisibility;
                
                updateTexture();
                updateLayersList();
            }
        });

        layersList.appendChild(item);
    }
}

// Update the updateTexture function to respect layer visibility
const originalUpdateTexture = updateTexture;
updateTexture = function() {
    if (!tshirtModel) return;
    
    // Create two separate canvases - one for shirt color and one for images
    const shirtCanvas = document.createElement('canvas');
    shirtCanvas.width = templateImage.width;
    shirtCanvas.height = templateImage.height;
    const shirtCtx = shirtCanvas.getContext('2d');
    
    const imageCanvas = document.createElement('canvas');
    imageCanvas.width = templateImage.width;
    imageCanvas.height = templateImage.height;
    const imageCtx = imageCanvas.getContext('2d');
    
    // Fill shirt canvas with shirt color
    shirtCtx.fillStyle = currentShirtColor;
    shirtCtx.fillRect(0, 0, shirtCanvas.width, shirtCanvas.height);
    
    // Clear image canvas with transparent background
    imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
    
    // Draw visible images in order
    images.forEach(({ image, transform }, index) => {
        // Check if layer is visible (default to true if not set)
        if (layerVisibility.get(index) !== false) {
            imageCtx.save();
            
            // Calculate the scale to fit the image within the UV space
            const imageAspect = image.width / image.height;
            const baseScale = Math.min(
                imageCanvas.width / image.width,
                imageCanvas.height / image.height
            ) * transform.scale;
            
            // Calculate the center position in canvas coordinates
            const centerX = (transform.x + 0.5) * imageCanvas.width;
            const centerY = (transform.y + 0.5) * imageCanvas.height;
            
            // Apply transformations in the correct order
            imageCtx.translate(centerX, centerY);
            imageCtx.rotate(transform.rotation * Math.PI / 180);
            
            // Apply stretch factors
            const stretchWidth = transform.stretchWidth || 1;
            const stretchHeight = transform.stretchHeight || 1;
            imageCtx.scale(baseScale * stretchWidth, baseScale * stretchHeight);
            
            // Draw the image
            imageCtx.drawImage(image, 
                -image.width / 2, 
                -image.height / 2, 
                image.width, 
                image.height
            );
            
            imageCtx.restore();
        }
    });
    
    // Create textures
    const shirtTexture = new THREE.CanvasTexture(shirtCanvas);
    shirtTexture.flipY = true;
    shirtTexture.encoding = THREE.sRGBEncoding;
    shirtTexture.needsUpdate = true;
    
    const imageTexture = new THREE.CanvasTexture(imageCanvas);
    imageTexture.flipY = true;
    imageTexture.encoding = THREE.sRGBEncoding;
    imageTexture.needsUpdate = true;
    
    // Apply to model
    tshirtModel.traverse((child) => {
        if (child.isMesh) {
            // Dispose of old materials and textures
            if (child.material) {
                if (child.material.map) {
                    child.material.map.dispose();
                }
                if (child.material.emissiveMap) {
                    child.material.emissiveMap.dispose();
                }
                child.material.dispose();
            }
            
            let material;
            
            if (currentLightingMode === 'standard') {
                // Create a combined texture for standard mode
                const combinedCanvas = document.createElement('canvas');
                combinedCanvas.width = templateImage.width;
                combinedCanvas.height = templateImage.height;
                const combinedCtx = combinedCanvas.getContext('2d');
                
                // Draw shirt color first
                combinedCtx.fillStyle = currentShirtColor;
                combinedCtx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);
                
                // Draw images on top
                combinedCtx.drawImage(imageCanvas, 0, 0);
                
                const combinedTexture = new THREE.CanvasTexture(combinedCanvas);
                combinedTexture.flipY = true;
                combinedTexture.encoding = THREE.sRGBEncoding;
                combinedTexture.needsUpdate = true;
                
                // Use standard material with the combined texture
                material = new THREE.MeshStandardMaterial({
                    map: combinedTexture,
                    roughness: 0.9,
                    metalness: 0.0,
                    side: THREE.DoubleSide,
                    transparent: true,
                    alphaTest: 0.1
                });
            } else {
                // Use custom shader material for unlit images
                material = new THREE.ShaderMaterial({
                    uniforms: {
                        shirtTexture: { value: shirtTexture },
                        imageTexture: { value: imageTexture },
                        shirtColor: { value: new THREE.Color(currentShirtColor) }
                    },
                    vertexShader: `
                        varying vec2 vUv;
                        varying vec3 vNormal;
                        varying vec3 vViewPosition;
                        
                        void main() {
                            vUv = uv;
                            vNormal = normalize(normalMatrix * normal);
                            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                            vViewPosition = -mvPosition.xyz;
                            gl_Position = projectionMatrix * mvPosition;
                        }
                    `,
                    fragmentShader: `
                        uniform sampler2D shirtTexture;
                        uniform sampler2D imageTexture;
                        uniform vec3 shirtColor;
                        
                        varying vec2 vUv;
                        varying vec3 vNormal;
                        varying vec3 vViewPosition;
                        
                        void main() {
                            // Get the shirt color with lighting
                            vec4 shirtColor = texture2D(shirtTexture, vUv);
                            
                            // Get the image color (unaffected by lighting)
                            vec4 imageColor = texture2D(imageTexture, vUv);
                            
                            // Calculate lighting for the shirt
                            vec3 normal = normalize(vNormal);
                            vec3 viewDir = normalize(vViewPosition);
                            float diffuse = max(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0);
                            vec3 litShirtColor = shirtColor.rgb * (diffuse * 0.7 + 0.3); // Add some ambient light
                            
                            // Mix the lit shirt color with the unlit image color based on image alpha
                            vec3 finalColor = mix(litShirtColor, imageColor.rgb, imageColor.a);
                            
                            gl_FragColor = vec4(finalColor, 1.0);
                        }
                    `,
                    side: THREE.DoubleSide,
                    transparent: true
                });
            }
            
            child.material = material;
            child.material.needsUpdate = true;
        }
    });
}

// Update the existing functions to also update layers list
const originalAddImageToList = addImageToList;
addImageToList = function(image, index) {
    originalAddImageToList(image, index);
    updateLayersList();
};

const originalRemoveImage = removeImage;
removeImage = function(index) {
    originalRemoveImage(index);
    updateLayersList();
};

const originalSelectImage = selectImage;
selectImage = function(index) {
    originalSelectImage(index);
    
    // Update transform controls
    if (index >= 0 && images[index]) {
        const transform = images[index].transform;
        posXSlider.value = transform.x;
        posYSlider.value = transform.y;
        scaleSlider.value = transform.scale;
        rotationSlider.value = transform.rotation;
        stretchWidthSlider.value = transform.stretchWidth || 1;
        stretchHeightSlider.value = transform.stretchHeight || 1;
    }
    
    updateLayersList();
    drawUVEditor();
};

// Setup minimize functionality for the textures panel
setupPanelMinimize(texturesPanel);
setupPanelMinimize(texturesPanel);